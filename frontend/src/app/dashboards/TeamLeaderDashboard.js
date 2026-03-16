import { useEffect, useMemo, useState } from 'react';
import { Box, Grid, Typography, Paper, Chip, Divider, Stack } from '@mui/material';
import { Assignment, CheckCircle, Folder, TrendingUp, People } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { DashboardCard } from '../components/DashboardCard';
import { fetchProjects, fetchTasks, fetchUsers } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#4CAF50', '#FF9800', '#F44336', '#2196F3'];

const buildTaskProgressData = (tasks) => {
  const now = new Date();
  const weeks = [0, 1, 2, 3].map((index) => ({
    week: `Week ${index + 1}`,
    completed: 0,
    pending: 0,
  }));

  tasks.forEach((task) => {
    if (!task.createdAt) return;
    const created = new Date(task.createdAt);
    const diffDays = Math.floor((now - created) / (1000 * 60 * 60 * 24));
    const weekIndex = Math.min(3, Math.max(0, 3 - Math.floor(diffDays / 7)));
    if (task.status === 'completed') {
      weeks[weekIndex].completed += 1;
    } else {
      weeks[weekIndex].pending += 1;
    }
  });

  return weeks;
};

const formatDateDMY = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

export function TeamLeaderDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        const [projectsData, tasksData, usersData] = await Promise.all([
          fetchProjects({ page: 1, limit: 200 }),
          fetchTasks({ page: 1, limit: 200 }),
          fetchUsers({ page: 1, limit: 200 }),
        ]);
        if (!isMounted) return;

        const normalizedUsers = (usersData || []).map((userItem) => ({
          ...userItem,
          id: userItem.id || userItem._id,
        }));

        const usersById = new Map(
          normalizedUsers.map((userItem) => [String(userItem.id), userItem])
        );

        const completedProjectIds = new Set(
          (projectsData || [])
            .filter((project) => project?.status === 'completed' || Number(project?.progress || 0) >= 100)
            .map((project) => String(project.id || project._id))
        );

        const memberMap = new Map();

        (projectsData || []).forEach((project) => {
          const projectId = String(project.id || project._id);
          if (completedProjectIds.has(projectId)) return;

          (project.teamMembers || []).forEach((member) => {
            const memberId = member?._id || member?.id || member;
            if (!memberId) return;
            const lookup = usersById.get(String(memberId));
            const name = member?.name || lookup?.name;
            if (!name) return;
            memberMap.set(String(memberId), {
              id: String(memberId),
              name,
              email: member?.email || lookup?.email || '',
              status: lookup?.status || member?.status,
            });
          });
        });

        (tasksData || []).forEach((task) => {
          if (completedProjectIds.has(String(task.projectId))) return;

          const memberId = task.assignedTo;
          if (!memberId) return;
          const lookup = usersById.get(String(memberId));
          const name = task.assignedToName || lookup?.name;
          if (!name) return;
          memberMap.set(String(memberId), {
            id: String(memberId),
            name,
            email: task.assignedToEmail || lookup?.email || '',
            status: lookup?.status,
          });
        });

        const activeMembers = Array.from(memberMap.values()).filter(
          (member) => member.status !== 'inactive'
        );

        setProjects(projectsData || []);
        setTasks(tasksData || []);
        setTeamMembers(activeMembers);
      } catch {
        if (!isMounted) return;
        setProjects([]);
        setTasks([]);
        setTeamMembers([]);
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
  const myTasks = tasks;
  const myTeamMembers = teamMembers;

  const completedTasks = myTasks.filter((task) => task.status === 'completed').length;
  const onReviewTasks = myTasks.filter((task) => ['on_review', 'submitted'].includes(task.status)).length;
  const taskProgressData = useMemo(() => buildTaskProgressData(myTasks), [myTasks]);

  const taskStatusData = [
    { name: 'Completed', value: myTasks.filter((task) => task.status === 'completed').length },
    { name: 'On Review', value: onReviewTasks },
    { name: 'Changes Requested', value: myTasks.filter((task) => task.status === 'changes_requested').length },
    { name: 'Assigned', value: myTasks.filter((task) => task.status === 'assigned').length },
  ];
  const taskStatusChartData = taskStatusData.filter((item) => item.value > 0);

  const projectWorkDetails = useMemo(() => {
    const usersById = new Map(
      myTeamMembers.map((member) => [String(member.id || member._id), member])
    );

    return myProjects.map((project) => {
      const projectId = project.id || project._id;
      const projectTasks = myTasks.filter((task) => String(task.projectId) === String(projectId));
      const isProjectCompleted = project.status === 'completed' || Number(project.progress || 0) >= 100;

      const memberMap = new Map();

      (project.teamMembers || []).forEach((member) => {
        const memberId = member?._id || member?.id || member;
        const lookup = usersById.get(String(memberId));
        const memberName = member?.name || lookup?.name;
        const memberEmail = member?.email || lookup?.email;
        if (!memberId || !memberName) return;
        memberMap.set(String(memberId), {
          id: String(memberId),
          name: memberName,
          email: memberEmail || '',
        });
      });

      projectTasks.forEach((task) => {
        const memberId = task.assignedTo;
        const lookup = usersById.get(String(memberId));
        const memberName = task.assignedToName || lookup?.name;
        const memberEmail = task.assignedToEmail || lookup?.email;
        if (!memberId || !memberName) return;
        memberMap.set(String(memberId), {
          id: String(memberId),
          name: memberName,
          email: memberEmail || '',
        });
      });

      return {
        id: projectId,
        name: project.name,
        status: project.status,
        progress: project.progress || 0,
        startDate: project.startDate,
        endDate: project.endDate,
        members: isProjectCompleted ? [] : Array.from(memberMap.values()),
        totalTasks: projectTasks.length,
        completedTasks: projectTasks.filter((task) => task.status === 'completed').length,
        onReviewTasks: projectTasks.filter((task) => ['on_review', 'submitted'].includes(task.status)).length,
        openTasks: projectTasks.filter((task) => ['assigned', 'changes_requested'].includes(task.status)).length,
      };
    });
  }, [myProjects, myTasks, myTeamMembers]);

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: 600 }}>
        Team Leader Dashboard
      </Typography>

      {/* KPI Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <DashboardCard
            title="My Team Members"
            value={myTeamMembers.length}
            icon={<People sx={{ fontSize: 32, color: '#2196F3' }} />}
            color="#2196F3"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <DashboardCard
            title="My Projects"
            value={myProjects.length}
            icon={<Folder sx={{ fontSize: 32, color: '#1976D2' }} />}
            color="#1976D2"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <DashboardCard
            title="Total Tasks"
            value={myTasks.length}
            icon={<Assignment sx={{ fontSize: 32, color: '#FF9800' }} />}
            color="#FF9800"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <DashboardCard
            title="Completed Tasks"
            value={completedTasks}
            icon={<CheckCircle sx={{ fontSize: 32, color: '#4CAF50' }} />}
            color="#4CAF50"
          />
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper sx={{ p: 3, boxShadow: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
              Task Progress Over Time
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={taskProgressData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="completed" stroke="#4CAF50" strokeWidth={2} name="Completed" />
                <Line type="monotone" dataKey="pending" stroke="#FF9800" strokeWidth={2} name="Open" />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 3, boxShadow: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
              Task Status Distribution
            </Typography>
            {taskStatusChartData.length === 0 ? (
              <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography color="text.secondary">No task status data</Typography>
              </Box>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={taskStatusChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {taskStatusChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Grid>
      </Grid>

      <Paper sx={{ p: 3, boxShadow: 2, mt: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
          Project Team & Work Details
        </Typography>

        {projectWorkDetails.length === 0 ? (
          <Typography color="text.secondary">No projects found.</Typography>
        ) : (
          <Stack spacing={2} divider={<Divider flexItem />}>
            {projectWorkDetails.map((project) => (
              <Box
                key={project.id}
                role="button"
                tabIndex={0}
                onClick={() => navigate('/leader/tasks')}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    navigate('/leader/tasks');
                  }
                }}
                sx={{
                  cursor: 'pointer',
                  borderRadius: 1,
                  p: 1,
                  '&:hover': { bgcolor: 'action.hover' },
                  '&:focus-visible': {
                    outline: '2px solid',
                    outlineColor: 'primary.main',
                  },
                }}
              >
                <Grid container spacing={1} sx={{ mb: 1 }}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      {project.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {formatDateDMY(project.startDate)} - {formatDateDMY(project.endDate)}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }} sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' }, alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <Chip label={`Status: ${project.status || 'active'}`} size="small" />
                    <Chip label={`Progress: ${project.progress}%`} size="small" color="primary" />
                    <Chip label={`Tasks: ${project.totalTasks}`} size="small" />
                    <Chip label={`Completed: ${project.completedTasks}`} size="small" color="success" />
                    <Chip label={`On Review: ${project.onReviewTasks}`} size="small" color="warning" />
                    <Chip label={`Open: ${project.openTasks}`} size="small" color="default" />
                  </Grid>
                </Grid>

                <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                  Working members ({project.members.length})
                </Typography>
                {project.members.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">No members assigned yet.</Typography>
                ) : (
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {project.members.map((member) => (
                      <Chip
                        key={member.id}
                        label={member.email ? `${member.name} (${member.email})` : member.name}
                        variant="outlined"
                        size="small"
                      />
                    ))}
                  </Box>
                )}
              </Box>
            ))}
          </Stack>
        )}
      </Paper>
    </Box>
  );
}
