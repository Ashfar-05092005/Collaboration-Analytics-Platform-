import { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Typography, Paper, Grid, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { fetchAnalyticsDashboard } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { useLocation } from 'react-router-dom';
import { LoadingSpinner } from '../components/LoadingSpinner';

const COLORS = ['#4CAF50', '#FF9800', '#F44336', '#2196F3'];

const EMPTY_DASHBOARD = {
  teamContribution: [],
  teamPerformance: [],
  tasksByPriority: [
    { priority: 'Critical', count: 0 },
    { priority: 'High', count: 0 },
    { priority: 'Medium', count: 0 },
    { priority: 'Low', count: 0 },
  ],
  issueStats: {
    total: 0,
    open: 0,
    inReview: 0,
    escalated: 0,
    resolved: 0,
    resolutionRate: 0,
  },
  memberPerformance: [],
  taskCompletionRate: [],
  projectStatus: [],
};

export function Analytics() {
  const { user } = useAuth();
  const location = useLocation();

  const [dashboard, setDashboard] = useState(EMPTY_DASHBOARD);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await fetchAnalyticsDashboard();
        console.log('[analytics] dashboard response', response);

        if (!isMounted) return;

        setDashboard({
          ...EMPTY_DASHBOARD,
          ...response,
          teamContribution: Array.isArray(response?.teamContribution) ? response.teamContribution : [],
          teamPerformance: Array.isArray(response?.teamPerformance) ? response.teamPerformance : [],
          tasksByPriority: Array.isArray(response?.tasksByPriority)
            ? response.tasksByPriority
            : EMPTY_DASHBOARD.tasksByPriority,
          issueStats: {
            ...EMPTY_DASHBOARD.issueStats,
            ...(response?.issueStats || {}),
          },
          memberPerformance: Array.isArray(response?.memberPerformance) ? response.memberPerformance : [],
          taskCompletionRate: Array.isArray(response?.taskCompletionRate) ? response.taskCompletionRate : [],
          projectStatus: Array.isArray(response?.projectStatus) ? response.projectStatus : [],
        });
      } catch (err) {
        console.error('[analytics] failed to load dashboard', err);
        if (!isMounted) return;
        setDashboard(EMPTY_DASHBOARD);
        setError(err?.message || 'Failed to load analytics data');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    if (user?.role) {
      loadData();
    } else if (isMounted) {
      setLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [user?.role]);

  const taskCompletionRate = useMemo(
    () => (Array.isArray(dashboard.taskCompletionRate) ? dashboard.taskCompletionRate : []),
    [dashboard.taskCompletionRate]
  );

  const projectStatus = useMemo(
    () => (Array.isArray(dashboard.projectStatus) ? dashboard.projectStatus : []),
    [dashboard.projectStatus]
  );

  const teamMemberPerformanceData = useMemo(
    () => (Array.isArray(dashboard.memberPerformance) ? dashboard.memberPerformance : []),
    [dashboard.memberPerformance]
  );

  const teamPerformance = useMemo(
    () => (Array.isArray(dashboard.teamPerformance) ? dashboard.teamPerformance : []),
    [dashboard.teamPerformance]
  );

  const tasksByPriority = useMemo(
    () => (Array.isArray(dashboard.tasksByPriority) ? dashboard.tasksByPriority : EMPTY_DASHBOARD.tasksByPriority),
    [dashboard.tasksByPriority]
  );

  const issueStats = {
    ...EMPTY_DASHBOARD.issueStats,
    ...(dashboard.issueStats || {}),
  };

  const allContributionScoresZero =
    teamMemberPerformanceData.length > 0 && teamMemberPerformanceData.every((member) => Number(member?.score || 0) === 0);

  const deletedProjectName =
    user?.role === 'admin' && location.state?.fromNotificationType === 'project_deleted'
      ? location.state?.highlightDeletedProject
      : '';

  if (loading) {
    return <LoadingSpinner message="Loading analytics dashboard..." />;
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: 600 }}>
        Analytics Dashboard {user?.role === 'teamLeader' && '- My Team'}
      </Typography>

      {error ? (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      ) : null}

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
            {teamMemberPerformanceData.length === 0 ? (
              <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography color="text.secondary">No team member data available.</Typography>
              </Box>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={teamMemberPerformanceData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 100]} />
                    <YAxis dataKey="name" type="category" />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="score" fill="#2196F3" name="Contribution Score" minPointSize={3} />
                  </BarChart>
                </ResponsiveContainer>
                {allContributionScoresZero ? (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Scores are currently 0% because no tasks are marked completed yet.
                  </Typography>
                ) : null}
              </>
            )}
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
                  {teamPerformance.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        No team performance data available.
                      </TableCell>
                    </TableRow>
                  ) : teamPerformance.map((member) => {
                    const rating = member.contributionScore >= 90 ? 'Excellent' : 
                                   member.contributionScore >= 80 ? 'Good' : 
                                   member.contributionScore >= 70 ? 'Average' : 'Needs Improvement';
                    const ratingColor = member.contributionScore >= 90 ? '#4CAF50' : 
                                        member.contributionScore >= 80 ? '#2196F3' : 
                                        member.contributionScore >= 70 ? '#FF9800' : '#F44336';

                    return (
                      <TableRow key={member.userId} hover>
                        <TableCell>{member.userName || 'Unknown'}</TableCell>
                        <TableCell align="right">{member.tasksCompleted || 0}</TableCell>
                        <TableCell align="right">{member.tasksInProgress || 0}</TableCell>
                        <TableCell align="right">{member.contributionScore || 0}%</TableCell>
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
                    {issueStats.resolutionRate || 0}%
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
