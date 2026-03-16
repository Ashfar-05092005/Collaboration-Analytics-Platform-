import { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Typography, Paper, Grid, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { fetchIssues, fetchProjects, fetchTasks, fetchUsers } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { useLocation } from 'react-router-dom';

const COLORS = ['#4CAF50', '#FF9800', '#F44336', '#2196F3'];

const buildTaskCompletionRate = (tasks) => {
  const now = new Date();
  const months = [
    new Date(now.getFullYear(), now.getMonth() - 1, 1),
    new Date(now.getFullYear(), now.getMonth(), 1),
  ];

  return months.map((monthDate) => {
    const label = monthDate.toLocaleString('en-US', { month: 'short' });
    const month = monthDate.getMonth();
    const year = monthDate.getFullYear();
    const monthTasks = tasks.filter((task) => {
      if (!task.createdAt) return false;
      const created = new Date(task.createdAt);
      return created.getMonth() === month && created.getFullYear() === year;
    });
    const completed = monthTasks.filter((task) => task.status === 'completed').length;
    return { month: label, completed, total: monthTasks.length };
  });
};

const buildProjectStatusData = (projects) => {
  const counts = projects.reduce((acc, project) => {
    const status = project.status || 'unknown';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});
  return Object.entries(counts).map(([name, value]) => ({ name, value }));
};

const buildTasksByPriority = (tasks) => {
  const priorities = ['high', 'medium', 'low'];
  return priorities.map((priority) => ({
    priority: priority.charAt(0).toUpperCase() + priority.slice(1),
    count: tasks.filter((task) => task.priority === priority).length,
  }));
};

const buildTeamPerformance = (tasks, users) => {
  const userMap = new Map(users.map((user) => [String(user.id || user._id), user]));
  const grouped = tasks.reduce((acc, task) => {
    const userId = String(task.assignedTo && task.assignedTo._id ? task.assignedTo._id : task.assignedTo || '');
    if (!userId) return acc;
    if (!acc[userId]) {
      acc[userId] = { tasksCompleted: 0, tasksInProgress: 0, tasksTotal: 0 };
    }
    acc[userId].tasksTotal += 1;
    if (task.status === 'completed') acc[userId].tasksCompleted += 1;
    if (['on_review', 'submitted', 'changes_requested', 'assigned'].includes(task.status)) {
      acc[userId].tasksInProgress += 1;
    }
    return acc;
  }, {});

  return Object.entries(grouped).map(([userId, stats]) => {
    const user = userMap.get(userId);
    const score = stats.tasksTotal > 0 ? Math.round((stats.tasksCompleted / stats.tasksTotal) * 100) : 0;
    return {
      userId,
      userName: user?.name || 'Unknown',
      tasksCompleted: stats.tasksCompleted,
      tasksInProgress: stats.tasksInProgress,
      contributionScore: score,
    };
  });
};

export function Analytics() {
  const { user } = useAuth();
  const location = useLocation();

  const [tasks, setTasks] = useState([]);
  const [issues, setIssues] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        const [tasksData, issuesData, projectsData, usersData] = await Promise.all([
          fetchTasks({ page: 1, limit: 500 }),
          fetchIssues(user?.role === 'teamLeader'
            ? { forTeamLeader: 'true', page: 1, limit: 500 }
            : { page: 1, limit: 500 }
          ),
          fetchProjects({ page: 1, limit: 200 }),
          fetchUsers({ page: 1, limit: 500 }),
        ]);
        if (!isMounted) return;
        const normalizedUsers = (usersData || []).map((userItem) => ({
          ...userItem,
          id: userItem.id || userItem._id,
        }));
        setTasks(tasksData || []);
        setIssues(issuesData || []);
        setProjects(projectsData || []);
        setUsers(normalizedUsers);
      } catch {
        if (!isMounted) return;
        setTasks([]);
        setIssues([]);
        setProjects([]);
        setUsers([]);
      }
    };

    if (user?.role) {
      loadData();
    }

    return () => {
      isMounted = false;
    };
  }, [user?.role]);

  const filteredTasks = tasks;
  const filteredIssues = issues;
  const filteredTeamPerformance = useMemo(
    () => buildTeamPerformance(filteredTasks, users),
    [filteredTasks, users]
  );

  const taskCompletionRate = useMemo(
    () => buildTaskCompletionRate(filteredTasks),
    [filteredTasks]
  );
  const projectStatus = useMemo(
    () => buildProjectStatusData(projects),
    [projects]
  );
  const tasksByPriority = useMemo(
    () => buildTasksByPriority(filteredTasks),
    [filteredTasks]
  );

  // Calculate team member performance data
  const teamMemberPerformanceData = filteredTeamPerformance.map((member) => ({
    name: member.userName.split(' ')[0],
    completed: member.tasksCompleted,
    inProgress: member.tasksInProgress,
    score: member.contributionScore,
  }));

  // Calculate issue statistics
  const issueStats = {
    total: filteredIssues.length,
    open: filteredIssues.filter((issue) => issue.status === 'open').length,
    inReview: filteredIssues.filter((issue) => issue.status === 'in-review').length,
    escalated: filteredIssues.filter((issue) => issue.status === 'escalated').length,
    resolved: filteredIssues.filter((issue) => issue.status === 'resolved').length,
  };

  const deletedProjectName =
    user?.role === 'admin' && location.state?.fromNotificationType === 'project_deleted'
      ? location.state?.highlightDeletedProject
      : '';

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: 600 }}>
        Analytics Dashboard {user?.role === 'teamLeader' && '- My Team'}
      </Typography>

      {deletedProjectName ? (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Deleted project notification: {deletedProjectName}
        </Alert>
      ) : null}

      <Grid container spacing={3}>
        {/* Task Completion Rate */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3, boxShadow: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
              Task Completion Rate
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={taskCompletionRate}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="completed" fill="#4CAF50" name="Completed" />
                <Bar dataKey="total" fill="#E0E0E0" name="Total" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Project Status */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3, boxShadow: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
              Project Status Distribution
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={projectStatus}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {projectStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Team Member Performance Chart */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3, boxShadow: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
              Team Member Performance
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={teamMemberPerformanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="completed" fill="#4CAF50" name="Completed Tasks" />
                <Bar dataKey="inProgress" fill="#FF9800" name="On Review" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Contribution Score Chart */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3, boxShadow: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
              Team Contribution Score
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={teamMemberPerformanceData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 100]} />
                <YAxis dataKey="name" type="category" />
                <Tooltip />
                <Legend />
                <Bar dataKey="score" fill="#2196F3" name="Contribution Score" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Team Performance Table */}
        <Grid size={{ xs: 12 }}>
          <Paper sx={{ p: 3, boxShadow: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
              Detailed Team Performance
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Team Member</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">Tasks Completed</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">Tasks On Review</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">Contribution Score</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">Performance Rating</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredTeamPerformance.map((member) => {
                    const rating = member.contributionScore >= 90 ? 'Excellent' : 
                                   member.contributionScore >= 80 ? 'Good' : 
                                   member.contributionScore >= 70 ? 'Average' : 'Needs Improvement';
                    const ratingColor = member.contributionScore >= 90 ? '#4CAF50' : 
                                        member.contributionScore >= 80 ? '#2196F3' : 
                                        member.contributionScore >= 70 ? '#FF9800' : '#F44336';

                    return (
                      <TableRow key={member.userId} hover>
                        <TableCell>{member.userName}</TableCell>
                        <TableCell align="right">{member.tasksCompleted}</TableCell>
                        <TableCell align="right">{member.tasksInProgress}</TableCell>
                        <TableCell align="right">{member.contributionScore}%</TableCell>
                        <TableCell align="right">
                          <Typography sx={{ color: ratingColor, fontWeight: 600 }}>
                            {rating}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* Issue Statistics */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3, boxShadow: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
              Issue Management Statistics
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 6, sm: 4 }}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: '#F5F7FA', borderRadius: 2 }}>
                  <Typography variant="h3" sx={{ fontWeight: 600, color: '#1976D2' }}>
                    {issueStats.total}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Total Issues
                  </Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 6, sm: 4 }}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: '#F5F7FA', borderRadius: 2 }}>
                  <Typography variant="h3" sx={{ fontWeight: 600, color: '#FF9800' }}>
                    {issueStats.open}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Open
                  </Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 6, sm: 4 }}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: '#F5F7FA', borderRadius: 2 }}>
                  <Typography variant="h3" sx={{ fontWeight: 600, color: '#2196F3' }}>
                    {issueStats.inReview}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    In Review
                  </Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 6, sm: 4 }}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: '#F5F7FA', borderRadius: 2 }}>
                  <Typography variant="h3" sx={{ fontWeight: 600, color: '#F44336' }}>
                    {issueStats.escalated}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Escalated
                  </Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 6, sm: 4 }}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: '#F5F7FA', borderRadius: 2 }}>
                  <Typography variant="h3" sx={{ fontWeight: 600, color: '#4CAF50' }}>
                    {issueStats.resolved}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Resolved
                  </Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 6, sm: 4 }}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: '#F5F7FA', borderRadius: 2 }}>
                  <Typography variant="h3" sx={{ fontWeight: 600, color: '#9C27B0' }}>
                    {issueStats.total > 0 ? Math.round((issueStats.resolved / issueStats.total) * 100) : 0}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Resolution Rate
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Tasks by Priority */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3, boxShadow: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
              Tasks by Priority
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={tasksByPriority} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="priority" type="category" />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#1976D2" name="Task Count" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
