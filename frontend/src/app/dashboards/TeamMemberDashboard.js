import { useEffect, useState } from 'react';
import { Box, Grid, Typography, Paper, LinearProgress } from '@mui/material';
import { Assignment, CheckCircle, TrendingUp, Schedule } from '@mui/icons-material';
import { DashboardCard } from '../components/DashboardCard';
import { fetchTasks } from '../services/api';
import { useAuth } from '../hooks/useAuth';

export function TeamMemberDashboard() {
  const { user } = useAuth();

  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    let isMounted = true;
    const loadTasks = async () => {
      try {
        const data = await fetchTasks({ page: 1, limit: 200 });
        if (!isMounted) return;
        setTasks(data || []);
      } catch {
        if (!isMounted) return;
        setTasks([]);
      }
    };

    if (user?.id) {
      loadTasks();
    }

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  const myTasks = tasks;

  const completedTasks = myTasks.filter((task) => task.status === 'completed').length;
  const onReviewTasks = myTasks.filter((task) => ['on_review', 'submitted'].includes(task.status)).length;
  const assignedTasks = myTasks.filter((task) => task.status === 'assigned').length;

  const completionRate = myTasks.length > 0 ? (completedTasks / myTasks.length) * 100 : 0;

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: 600 }}>
        My Dashboard
      </Typography>

      {/* KPI Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <DashboardCard
            title="Total Tasks"
            value={myTasks.length}
            icon={<Assignment sx={{ fontSize: 32, color: '#1976D2' }} />}
            color="#1976D2"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <DashboardCard
            title="Completed"
            value={completedTasks}
            icon={<CheckCircle sx={{ fontSize: 32, color: '#4CAF50' }} />}
            color="#4CAF50"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <DashboardCard
            title="On Review"
            value={onReviewTasks}
            icon={<TrendingUp sx={{ fontSize: 32, color: '#FF9800' }} />}
            color="#FF9800"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <DashboardCard
            title="Assigned"
            value={assignedTasks}
            icon={<Schedule sx={{ fontSize: 32, color: '#9C27B0' }} />}
            color="#9C27B0"
          />
        </Grid>
      </Grid>

      {/* Performance Stats */}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12 }}>
          <Paper sx={{ p: 3, boxShadow: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
              My Performance
            </Typography>

            <Box sx={{ mb: 4 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Task Completion Rate
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {completionRate.toFixed(0)}%
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={completionRate}
                sx={{ height: 8, borderRadius: 4, bgcolor: '#E0E0E0' }}
              />
            </Box>

            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 4 }}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: '#F5F7FA', borderRadius: 2 }}>
                  <Typography variant="h3" sx={{ fontWeight: 600, color: '#4CAF50' }}>
                    {completedTasks}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Tasks Completed
                  </Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: '#F5F7FA', borderRadius: 2 }}>
                  <Typography variant="h3" sx={{ fontWeight: 600, color: '#FF9800' }}>
                    {onReviewTasks}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Currently In Review
                  </Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: '#F5F7FA', borderRadius: 2 }}>
                  <Typography variant="h3" sx={{ fontWeight: 600, color: '#1976D2' }}>
                    {myTasks.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Total Assigned
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
