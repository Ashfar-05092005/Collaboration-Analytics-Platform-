import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { Add } from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'sonner';
import {
  createTask,
  fetchTasks,
  fetchTeams,
  updateTask,
  updateProject,
  updateTaskStatus,
  fetchProjects,
  fetchUsers,
  removeTeamMemberFromTeam,
} from '../services/api';

export function LeaderTasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [teams, setTeams] = useState([]);
  const [allTeamMembers, setAllTeamMembers] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewMode, setReviewMode] = useState('request');
  const [rejectAction, setRejectAction] = useState('');
  const [reassignTo, setReassignTo] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [reviewRating, setReviewRating] = useState(3);
  const [reviewTask, setReviewTask] = useState(null);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    projectId: '',
    assignedTo: '',
    priority: 'medium',
    dueDate: '',
  });

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        setLoading(true);
        const [tasksData, projectsData, teamsData, usersData] = await Promise.all([
          fetchTasks({ page: 1, limit: 200 }),
          fetchProjects({ page: 1, limit: 200 }),
          fetchTeams({ page: 1, limit: 200 }),
          fetchUsers({ role: 'teamMember', status: 'active', page: 1, limit: 200 }),
        ]);

        if (!isMounted) return;
        const normalizedUsers = (usersData || []).map((userItem) => ({
          ...userItem,
          id: userItem.id || userItem._id,
        }));
        const leaderId = String(user?.id || user?._id || '');
        const leaderTeams = (teamsData || []).filter((team) => {
          const teamLeaderId = team?.leader?._id || team?.leader?.id || team?.leader;
          return String(teamLeaderId) === leaderId;
        });
        const leaderTeamMemberIds = new Set(
          leaderTeams.flatMap((team) => (team?.members || []).map((member) => String(member?._id || member?.id || member)))
        );
        const scopedTeamMembers = normalizedUsers.filter((userItem) =>
          leaderTeamMemberIds.has(String(userItem.id))
        );

        setTasks(tasksData || []);
        setProjects(projectsData || []);
        setTeams(teamsData || []);
        setAllTeamMembers(normalizedUsers);
        setTeamMembers(scopedTeamMembers.length > 0 ? scopedTeamMembers : normalizedUsers);
      } catch (error) {
        if (isMounted) {
          toast.error(error.message || 'Failed to load task data');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadData();
    return () => {
      isMounted = false;
    };
  }, [user?.id, user?._id]);

  const userId = String(user?.id || user?._id || '');
  const myTasks = tasks.filter((task) => {
    if (!userId) return true;
    return String(task.createdBy) === userId;
  });
  const myProjects = projects.filter((project) => {
    if (!userId) return true;
    const leaderId = project?.teamLeader?._id || project?.teamLeader?.id || project?.teamLeader;
    return String(leaderId) === userId;
  });

  const handleAddTask = async () => {
    if (!newTask.title || !newTask.projectId || !newTask.assignedTo || !newTask.dueDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const task = await createTask({
        ...newTask,
        projectId: newTask.projectId,
        assignedTo: newTask.assignedTo,
      });
      setTasks(prev => [task, ...prev]);
      setOpenDialog(false);
      setNewTask({
        title: '',
        description: '',
        projectId: '',
        assignedTo: '',
        priority: 'medium',
        dueDate: '',
      });
      toast.success('Task assigned successfully');
    } catch (error) {
      toast.error(error.message || 'Failed to assign task');
    }
  };

  const handleOpenReview = (task, mode = 'request') => {
    setReviewTask(task);
    setReviewComment('');
    setReviewRating(mode === 'approve' ? 5 : 3);
    setReviewMode(mode);
    setRejectAction(mode === 'reject' ? '' : '');
    setReassignTo('');
    setReviewDialogOpen(true);
  };

  const getUserId = (userLike) => userLike?._id || userLike?.id || userLike;

  const getLeaderTeams = () => {
    const leaderId = String(user?.id || user?._id || '');
    return teams.filter((team) => {
      const teamLeaderId = team?.leader?._id || team?.leader?.id || team?.leader;
      return String(teamLeaderId) === leaderId;
    });
  };

  const handleSubmitReview = async () => {
    if (!reviewTask) return;
    if (!reviewComment.trim()) {
      toast.error('Please provide review comments');
      return;
    }
    if (reviewMode === 'reject' && !rejectAction) {
      toast.error('Please choose Reassign task or Remove user from team');
      return;
    }

    try {
      const taskId = reviewTask._id || reviewTask.id;
      const taskAssigneeId = String(getUserId(reviewTask.assignedTo));
      let updatedTask;

      if (reviewMode === 'approve') {
        updatedTask = await updateTaskStatus(taskId, 'completed', reviewComment.trim(), Number(reviewRating));
      } else {
        updatedTask = await updateTaskStatus(taskId, 'changes_requested', reviewComment.trim(), Number(reviewRating));
      }
      const leaderId = user?.id || user?._id;

      if (reviewMode === 'reject' && rejectAction === 'reassign') {
        if (!reassignTo) {
          throw new Error('Please choose a member to reassign');
        }
        updatedTask = await updateTask(taskId, { assignedTo: reassignTo });
      }

      if (reviewMode === 'reject' && rejectAction === 'remove_user') {
        if (!leaderId) {
          throw new Error('Leader account not available for reassignment');
        }

        updatedTask = await updateTask(taskId, { assignedTo: leaderId });

        const leaderTeams = getLeaderTeams();
        const targetTeam = leaderTeams.find((team) =>
          (team?.members || []).map((member) => String(getUserId(member))).includes(taskAssigneeId)
        );
        if (targetTeam?._id || targetTeam?.id) {
          await removeTeamMemberFromTeam(targetTeam._id || targetTeam.id, taskAssigneeId, reviewComment.trim());
          setTeams((prev) =>
            prev.map((team) => {
              const teamId = team._id || team.id;
              if (String(teamId) !== String(targetTeam._id || targetTeam.id)) return team;
              return {
                ...team,
                members: (team.members || []).filter((member) => String(getUserId(member)) !== taskAssigneeId),
              };
            })
          );
        }

        const currentProjectId = String(reviewTask?.projectId?._id || reviewTask?.projectId?.id || reviewTask?.projectId || '');
        const targetProject = (projects || []).find(
          (project) => String(project._id || project.id) === currentProjectId
        );

        if (targetProject) {
          const nextProjectMembers = (targetProject.teamMembers || []).filter(
            (member) => String(getUserId(member)) !== taskAssigneeId
          );
          await updateProject(targetProject._id || targetProject.id, {
            teamMembers: nextProjectMembers.map((member) => getUserId(member)),
          });
          setProjects((prev) =>
            prev.map((project) => {
              const projectId = project._id || project.id;
              if (String(projectId) !== String(targetProject._id || targetProject.id)) return project;
              return { ...project, teamMembers: nextProjectMembers };
            })
          );
        }

        setTeamMembers((prev) => prev.filter((member) => String(member._id || member.id) !== taskAssigneeId));
      }

      setTasks(prev => prev.map(t => (t._id === taskId || t.id === taskId ? updatedTask : t)));
      setReviewDialogOpen(false);
      setReviewTask(null);
      setReviewComment('');
      setReviewRating(3);
      setRejectAction('');
      setReassignTo('');
      if (reviewMode === 'approve') {
        toast.success('Task approved');
      } else if (reviewMode === 'reject') {
        if (rejectAction === 'reassign') {
          toast.success('Work rejected and task reassigned');
        } else if (rejectAction === 'remove_user') {
          toast.success('Work rejected, task moved to leader, and user removed');
        } else {
          toast.success('Work rejected');
        }
      } else {
        toast.success('Changes requested');
      }
    } catch (error) {
      toast.error(error.message || 'Failed to submit review');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'success';
      case 'on_review': return 'info';
      case 'changes_requested': return 'warning';
      case 'assigned': return 'default';
      case 'submitted': return 'info';
      default: return 'default';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'default';
    }
  };

  const isReviewSubmitDisabled =
    (reviewMode !== 'approve' && !reviewComment.trim()) ||
    !reviewRating ||
    (reviewMode === 'reject' &&
      (!rejectAction || (rejectAction === 'reassign' && !reassignTo)));

  if (loading) {
    return (
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 600, mb: 3 }}>
          Task Management
        </Typography>
        <Typography color="text.secondary">Loading tasks...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          Task Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setOpenDialog(true)}
        >
          Assign Task
        </Button>
      </Box>

      <TableContainer component={Paper} sx={{ boxShadow: 2 }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#F5F7FA' }}>
              <TableCell sx={{ fontWeight: 600 }}>Task</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Project</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Assigned To</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Priority</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Due Date</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {myTasks.map((task) => (
              <TableRow key={task._id || task.id} hover>
                <TableCell>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {task.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {task.description}
                  </Typography>
                </TableCell>
                <TableCell>{task.projectName || task.project?.name || ''}</TableCell>
                <TableCell>{task.assignedToName || task.assignedTo?.name || ''}</TableCell>
                <TableCell>
                  <Chip
                    label={task.priority}
                    size="small"
                    color={getPriorityColor(task.priority)}
                    sx={{ textTransform: 'capitalize' }}
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={task.status}
                    size="small"
                    color={getStatusColor(task.status)}
                    sx={{ textTransform: 'capitalize' }}
                  />
                </TableCell>
                <TableCell>{new Date(task.dueDate).toLocaleDateString()}</TableCell>
                <TableCell>
                  {task.status === 'on_review' && (
                    <Box sx={{ display: 'flex', gap: '1cm' }}>
                      <Button color="success" variant="outlined" onClick={() => handleOpenReview(task, 'approve')}>
                        Approve
                      </Button>
                      <Button color="warning" variant="outlined" onClick={() => handleOpenReview(task, 'request')}>
                        Request Changes
                      </Button>
                      <Button color="error" variant="outlined" onClick={() => handleOpenReview(task, 'reject')}>
                        Reject Work
                      </Button>
                    </Box>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Assign New Task</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Task Title"
            value={newTask.title}
            onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Description"
            multiline
            rows={2}
            value={newTask.description}
            onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
            margin="normal"
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>Project</InputLabel>
            <Select
              value={newTask.projectId}
              label="Project"
              onChange={(e) => setNewTask({ ...newTask, projectId: e.target.value })}
            >
              {myProjects.map(project => (
                <MenuItem key={project._id || project.id} value={project._id || project.id}>
                  {project.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth margin="normal">
            <InputLabel>Assign To</InputLabel>
            <Select
              value={newTask.assignedTo}
              label="Assign To"
              onChange={(e) => setNewTask({ ...newTask, assignedTo: e.target.value })}
            >
              {teamMembers.map(member => (
                <MenuItem key={member._id || member.id} value={member._id || member.id}>
                  {member.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth margin="normal">
            <InputLabel>Priority</InputLabel>
            <Select
              value={newTask.priority}
              label="Priority"
              onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
            >
              <MenuItem value="low">Low</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="high">High</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label="Due Date"
            type="date"
            value={newTask.dueDate}
            onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
            margin="normal"
            InputLabelProps={{ shrink: true }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleAddTask} variant="contained">Assign</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={reviewDialogOpen} onClose={() => setReviewDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {reviewMode === 'approve' ? 'Approve Work' : reviewMode === 'reject' ? 'Reject Work' : 'Request Changes'}
        </DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="normal">
            <InputLabel>Rating (1-5)</InputLabel>
            <Select
              value={reviewRating}
              label="Rating (1-5)"
              onChange={(e) => setReviewRating(Number(e.target.value))}
            >
              <MenuItem value={1}>1</MenuItem>
              <MenuItem value={2}>2</MenuItem>
              <MenuItem value={3}>3</MenuItem>
              <MenuItem value={4}>4</MenuItem>
              <MenuItem value={5}>5</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label={reviewMode === 'approve' ? 'Approval Comment (Optional)' : reviewMode === 'reject' ? 'Rejection Reason' : 'Review Comments'}
            value={reviewComment}
            onChange={(e) => setReviewComment(e.target.value)}
            margin="normal"
            multiline
            rows={3}
          />
          {reviewMode === 'reject' ? (
            <>
              <FormControl fullWidth margin="normal">
                <InputLabel>After Rejection</InputLabel>
                <Select
                  value={rejectAction}
                  label="After Rejection"
                  onChange={(e) => {
                    setRejectAction(e.target.value);
                    if (e.target.value !== 'reassign' && e.target.value !== 'remove_user') {
                      setReassignTo('');
                    }
                  }}
                >
                  <MenuItem value="" disabled>Select action</MenuItem>
                  <MenuItem value="reassign">Reassign task</MenuItem>
                  <MenuItem value="remove_user">Remove user from team</MenuItem>
                </Select>
              </FormControl>

              {rejectAction === 'reassign' ? (
                <FormControl fullWidth margin="normal">
                  <InputLabel>Reassign Task To</InputLabel>
                  <Select
                    value={reassignTo}
                    label="Reassign Task To"
                    onChange={(e) => setReassignTo(e.target.value)}
                  >
                    {(teamMembers.length > 0 ? teamMembers : allTeamMembers)
                      .filter((member) => String(member._id || member.id) !== String(getUserId(reviewTask?.assignedTo)))
                      .map((member) => (
                        <MenuItem key={member._id || member.id} value={member._id || member.id}>
                          {member.name}
                        </MenuItem>
                      ))}
                  </Select>
                </FormControl>
              ) : null}
            </>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setReviewDialogOpen(false);
              setReviewTask(null);
              setReviewComment('');
              setReviewRating(3);
              setRejectAction('');
              setReassignTo('');
            }}
          >
            Decline
          </Button>
          <Button
            onClick={handleSubmitReview}
            variant="contained"
            color={reviewMode === 'approve' ? 'success' : reviewMode === 'reject' ? 'error' : 'warning'}
            disabled={isReviewSubmitDisabled}
          >
            {reviewMode === 'approve' ? 'Approve Work' : reviewMode === 'reject' ? 'Reject Work' : 'Request Changes'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
