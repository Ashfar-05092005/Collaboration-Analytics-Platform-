import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Divider,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Alert,
} from '@mui/material';
import { Add, Folder, Close } from '@mui/icons-material';
import {
  createProject,
  fetchProjects,
  fetchTasks,
  fetchTeams,
  fetchUsers,
  removeTeamMemberFromTeam,
  updateProject,
  deleteProject,
} from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { EmptyState } from '../components/EmptyState';
import { toast } from 'sonner';

export function LeaderProjects() {
  const { user } = useAuth();
  const leaderUserId = user?.id || user?._id;
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [openDetailsDialog, setOpenDetailsDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [removingMemberId, setRemovingMemberId] = useState(null);
  const [editDescription, setEditDescription] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isDeletingProject, setIsDeletingProject] = useState(false);
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    endDate: '',
  });

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        const [projectsData, tasksData, teamsData, usersData] = await Promise.all([
          fetchProjects({ page: 1, limit: 200 }),
          fetchTasks({ page: 1, limit: 500 }),
          fetchTeams({ page: 1, limit: 200 }),
          fetchUsers({ page: 1, limit: 500 }),
        ]);
        if (!isMounted) return;
        const normalizedUsers = (usersData || []).map((userItem) => ({
          ...userItem,
          id: userItem.id || userItem._id,
        }));
        setProjects(projectsData || []);
        setTasks(tasksData || []);
        setTeams(teamsData || []);
        setUsers(normalizedUsers);
      } catch {
        if (!isMounted) return;
        setProjects([]);
        setTasks([]);
        setTeams([]);
        setUsers([]);
      }
    };

    if (user?.id) {
      loadData();
    }

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  const myProjects = projects;

  const getProjectId = (project) => project?._id || project?.id;
  const getMemberId = (member) => (typeof member === 'string' ? member : member?._id || member?.id);
  const getTaskProjectId = (task) => task?.projectId?._id || task?.projectId?.id || task?.projectId;
  const getTeamMemberId = (member) => (typeof member === 'string' ? member : member?._id || member?.id || member);

  const leaderTeams = teams.filter((team) => {
    const teamLeaderId = team?.leader?._id || team?.leader?.id || team?.leader;
    return String(teamLeaderId) === String(leaderUserId);
  });
  const leaderTeamMemberIds = new Set(
    leaderTeams.flatMap((team) => (team?.members || []).map((memberId) => String(getTeamMemberId(memberId))))
  );

  const getProjectMembers = (project) => {
    if (!project) return [];

    const usersById = new Map(users.map((userItem) => [String(userItem.id || userItem._id), userItem]));
    const membersMap = new Map();

    leaderTeamMemberIds.forEach((memberId) => {
      const lookup = usersById.get(String(memberId));
      if (!lookup) return;
      membersMap.set(String(memberId), {
        id: String(memberId),
        name: lookup.name || 'Member',
        email: lookup.email || 'No email',
        fromProject: false,
      });
    });

    (project.teamMembers || []).forEach((member) => {
      const memberId = getMemberId(member);
      if (!memberId) return;
      const lookup = usersById.get(String(memberId));
      membersMap.set(String(memberId), {
        id: String(memberId),
        name: member?.name || lookup?.name || 'Member',
        email: member?.email || lookup?.email || 'No email',
        fromProject: true,
      });
    });

    const projectId = String(getProjectId(project));
    tasks
      .filter((task) => String(getTaskProjectId(task)) === projectId)
      .forEach((task) => {
        const memberId = task?.assignedTo?._id || task?.assignedTo?.id || task?.assignedTo;
        if (!memberId) return;
        const lookup = usersById.get(String(memberId));
        const existing = membersMap.get(String(memberId));
        membersMap.set(String(memberId), {
          id: String(memberId),
          name: existing?.name || task?.assignedToName || lookup?.name || 'Member',
          email: existing?.email || task?.assignedToEmail || lookup?.email || 'No email',
          fromProject: existing?.fromProject || false,
        });
      });

    return Array.from(membersMap.values());
  };

  const handleAddProject = () => {
    if (!newProject.name || !newProject.description || !newProject.endDate) {
      toast.error('Please fill in all fields');
      return;
    }

    const payload = {
      ...newProject,
      teamLeader: user?.id,
      startDate: new Date().toISOString().split('T')[0],
    };

    createProject(payload)
      .then((created) => {
        setProjects((prev) => [created, ...prev]);
        setOpenDialog(false);
        setNewProject({ name: '', description: '', endDate: '' });
        toast.success('Project created successfully');
      })
      .catch(() => {
        toast.error('Failed to create project');
      });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'primary';
      case 'completed': return 'success';
      case 'on-hold': return 'warning';
      default: return 'default';
    }
  };

  const handleOpenDetails = (project) => {
    setSelectedProject(project);
    setOpenDetailsDialog(true);
  };

  const handleOpenEdit = (project) => {
    setSelectedProject(project);
    setEditDescription(project?.description || '');
    setOpenEditDialog(true);
  };

  const handleRemoveMember = async (memberId) => {
    if (!selectedProject) return;

    const projectId = getProjectId(selectedProject);
    const currentMembers = Array.isArray(selectedProject.teamMembers) ? selectedProject.teamMembers : [];
    const updatedMembers = currentMembers.filter((member) => getMemberId(member) !== memberId);
    const updatedMemberIds = updatedMembers.map(getMemberId).filter(Boolean);
    const isDirectProjectMember = currentMembers.some(
      (member) => String(getMemberId(member)) === String(memberId)
    );
    const memberBelongsToLeaderTeam = leaderTeams.some((team) =>
      (team?.members || []).map((member) => String(getTeamMemberId(member))).includes(String(memberId))
    );

    if (!isDirectProjectMember && !memberBelongsToLeaderTeam) {
      toast.error('This user is assigned via tasks. Reassign or remove their tasks first.');
      return;
    }

    const memberName = getProjectMembers(selectedProject).find((member) => String(member.id) === String(memberId))?.name;
    const confirmed = window.confirm(`Remove ${memberName || 'this member'}?`);
    if (!confirmed) return;

    let removalReason = '';
    if (memberBelongsToLeaderTeam) {
      removalReason = (window.prompt(`Reason for removing ${memberName || 'this member'}:`) || '').trim();
      if (!removalReason) {
        toast.error('Removal reason is required');
        return;
      }
    }

    setRemovingMemberId(memberId);
    try {
      if (isDirectProjectMember) {
        await updateProject(projectId, { teamMembers: updatedMemberIds });
      }

      if (memberBelongsToLeaderTeam) {
        const targetTeam = leaderTeams.find((team) =>
          (team?.members || []).map((member) => String(getTeamMemberId(member))).includes(String(memberId))
        );
        if (targetTeam?._id || targetTeam?.id) {
          await removeTeamMemberFromTeam(targetTeam._id || targetTeam.id, memberId, removalReason);
          setTeams((prev) =>
            prev.map((team) => {
              const teamId = team._id || team.id;
              if (String(teamId) !== String(targetTeam._id || targetTeam.id)) return team;
              return {
                ...team,
                members: (team.members || []).filter((id) => String(getTeamMemberId(id)) !== String(memberId)),
              };
            })
          );
        }
      }

      setSelectedProject((prev) => (prev ? { ...prev, teamMembers: updatedMembers } : prev));
      setProjects((prev) =>
        prev.map((project) =>
          getProjectId(project) === projectId ? { ...project, teamMembers: updatedMembers } : project
        )
      );
      if (memberBelongsToLeaderTeam) {
        toast.success('Team member removed successfully');
      } else {
        toast.success('Member removed from project');
      }
    } catch {
      toast.error('Failed to remove member');
    } finally {
      setRemovingMemberId(null);
    }
  };

  const handleSaveProjectEdit = async () => {
    if (!selectedProject) return;

    const projectId = getProjectId(selectedProject);
    const trimmedDescription = editDescription.trim();

    setIsSavingEdit(true);
    try {
      await updateProject(projectId, { description: trimmedDescription });
      setSelectedProject((prev) => (prev ? { ...prev, description: trimmedDescription } : prev));
      setProjects((prev) =>
        prev.map((project) =>
          getProjectId(project) === projectId ? { ...project, description: trimmedDescription } : project
        )
      );
      toast.success('Project description updated');
    } catch {
      toast.error('Failed to update project description');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!selectedProject) return;

    const projectId = getProjectId(selectedProject);
    const confirmed = window.confirm(`Delete project \"${selectedProject.name}\"? This action cannot be undone.`);
    if (!confirmed) return;

    setIsDeletingProject(true);
    try {
      await deleteProject(projectId);
      setProjects((prev) => prev.filter((project) => getProjectId(project) !== projectId));
      setOpenEditDialog(false);
      setOpenDetailsDialog(false);
      setSelectedProject(null);
      toast.success('Project deleted successfully');
    } catch {
      toast.error('Failed to delete project');
    } finally {
      setIsDeletingProject(false);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          My Projects
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setOpenDialog(true)}
        >
          New Project
        </Button>
      </Box>

      {myProjects.length === 0 ? (
        <EmptyState
          title="No Projects Yet"
          message="Create your first project to get started"
          icon={<Folder sx={{ fontSize: 64, color: 'text.secondary', opacity: 0.5 }} />}
        />
      ) : (
        <Grid container spacing={3}>
          {myProjects.map((project) => (
            <Grid size={{ xs: 12, md: 6 }} key={project.id || project._id}>
              <Card sx={{ boxShadow: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {project.name}
                    </Typography>
                    <Chip
                      label={project.status}
                      size="small"
                      color={getStatusColor(project.status)}
                      sx={{ textTransform: 'capitalize' }}
                    />
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {project.description}
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        Progress
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {project.progress || 0}%
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={project.progress || 0}
                      sx={{ height: 6, borderRadius: 3 }}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Typography variant="caption" color="text.secondary">
                      Start: {project.startDate ? new Date(project.startDate).toLocaleDateString() : '-'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      End: {project.endDate ? new Date(project.endDate).toLocaleDateString() : '-'}
                    </Typography>
                  </Box>
                </CardContent>
                <CardActions>
                  <Button size="small" onClick={() => handleOpenDetails(project)}>View Details</Button>
                  <Button size="small" onClick={() => handleOpenEdit(project)}>Edit</Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Add Project Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Project</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Project Name"
            value={newProject.name}
            onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Description"
            multiline
            rows={3}
            value={newProject.description}
            onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
            margin="normal"
          />
          <TextField
            fullWidth
            label="End Date"
            type="date"
            value={newProject.endDate}
            onChange={(e) => setNewProject({ ...newProject, endDate: e.target.value })}
            margin="normal"
            InputLabelProps={{ shrink: true }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleAddProject} variant="contained">
            Create Project
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={openDetailsDialog}
        onClose={() => setOpenDetailsDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Project Details</DialogTitle>
        <DialogContent dividers>
          {selectedProject && (
            <Box sx={{ display: 'grid', gap: 1.5 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {selectedProject.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {selectedProject.description || 'No description'}
              </Typography>
              <Divider />
              <Typography variant="body2">
                <strong>Status:</strong> {selectedProject.status || '-'}
              </Typography>
              <Typography variant="body2">
                <strong>Progress:</strong> {selectedProject.progress || 0}%
              </Typography>
              <Typography variant="body2">
                <strong>Start Date:</strong>{' '}
                {selectedProject.startDate ? new Date(selectedProject.startDate).toLocaleDateString() : '-'}
              </Typography>
              <Typography variant="body2">
                <strong>End Date:</strong>{' '}
                {selectedProject.endDate ? new Date(selectedProject.endDate).toLocaleDateString() : '-'}
              </Typography>
              <Typography variant="body2">
                <strong>Team Leader:</strong> {selectedProject.teamLeader?.name || '-'}
              </Typography>
              <Typography variant="body2">
                <strong>Members:</strong> {getProjectMembers(selectedProject).length}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDetailsDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={openEditDialog}
        onClose={() => {
          setOpenEditDialog(false);
          setRemovingMemberId(null);
          setIsSavingEdit(false);
          setIsDeletingProject(false);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit Project</DialogTitle>
        <DialogContent dividers>
          {selectedProject && (
            <>
              {(() => {
                const projectMembers = getProjectMembers(selectedProject);
                const directMemberIds = new Set((selectedProject.teamMembers || []).map((member) => String(getMemberId(member))));

                return (
                  <>
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                {selectedProject.name}
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                sx={{ mb: 2 }}
              />
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Team Members
              </Typography>
              {projectMembers.length > 0 ? (
                <List disablePadding>
                  {projectMembers.map((member) => {
                    const memberId = member.id;
                    const isDirectMember = directMemberIds.has(String(memberId));
                    return (
                      <ListItem
                        key={memberId}
                        divider
                      >
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                              <Typography variant="body1">{member?.name || 'Member'}</Typography>
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleRemoveMember(memberId)}
                                disabled={removingMemberId === memberId || isDeletingProject}
                                title="Remove member"
                              >
                                <Close fontSize="small" />
                              </IconButton>
                            </Box>
                          }
                          secondary={isDirectMember ? (member?.email || 'No email') : `${member?.email || 'No email'} • Added via task assignment`}
                        />
                      </ListItem>
                    );
                  })}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No members assigned to this project.
                </Typography>
              )}
              <Alert severity="warning" sx={{ mt: 2 }}>
                Deleting this project will notify admin users.
              </Alert>
                  </>
                );
              })()}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            color="error"
            onClick={handleDeleteProject}
            disabled={isDeletingProject || isSavingEdit}
          >
            Delete Project
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveProjectEdit}
            disabled={isSavingEdit || isDeletingProject}
          >
            Save Description
          </Button>
          <Button
            onClick={() => {
              setOpenEditDialog(false);
              setRemovingMemberId(null);
              setIsSavingEdit(false);
              setIsDeletingProject(false);
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
