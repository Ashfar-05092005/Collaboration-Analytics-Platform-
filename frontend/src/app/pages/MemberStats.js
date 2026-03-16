import { useEffect, useState } from 'react';
import { Box, Typography, Paper, Grid } from '@mui/material';
import { fetchTasks } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

const COLORS = ['#4CAF50', '#FF9800', '#F44336', '#2196F3'];

export function MemberStats() {
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

  const taskStatusData = [
    { name: 'Completed', value: myTasks.filter((task) => task.status === 'completed').length },
    { name: 'On Review', value: myTasks.filter((task) => ['on_review', 'submitted'].includes(task.status)).length },
    { name: 'Changes Requested', value: myTasks.filter((task) => task.status === 'changes_requested').length },
    { name: 'Assigned', value: myTasks.filter((task) => task.status === 'assigned').length },
  ];

  const taskPriorityData = [
    { priority: 'High', count: myTasks.filter((task) => task.priority === 'high').length },
    { priority: 'Medium', count: myTasks.filter((task) => task.priority === 'medium').length },
    { priority: 'Low', count: myTasks.filter((task) => task.priority === 'low').length },
  ];

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: 600 }}>
        My Statistics
      </Typography>

      <Grid container spacing={3}>
        {/* Task Status Distribution */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3, boxShadow: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
              My Task Status
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={taskStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent, value }) => (value > 0 ? `${name}: ${(percent * 100).toFixed(0)}%` : '')}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {taskStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Task Priority Distribution */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3, boxShadow: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
              Tasks by Priority
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={taskPriorityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="priority" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#1976D2" name="Task Count" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Performance Summary */}
        <Grid size={{ xs: 12 }}>
          <Paper sx={{ p: 3, boxShadow: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
              Performance Summary
            </Typography>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: '#F5F7FA', borderRadius: 2 }}>
                  <Typography variant="h3" sx={{ fontWeight: 600, color: '#1976D2' }}>
                    {myTasks.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Total Tasks
                  </Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: '#F5F7FA', borderRadius: 2 }}>
                  <Typography variant="h3" sx={{ fontWeight: 600, color: '#4CAF50' }}>
                    {myTasks.filter(t => t.status === 'completed').length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Completed
                  </Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: '#F5F7FA', borderRadius: 2 }}>
                  <Typography variant="h3" sx={{ fontWeight: 600, color: '#FF9800' }}>
                    {myTasks.filter(t => ['on_review', 'submitted'].includes(t.status)).length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    On Review
                  </Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: '#F5F7FA', borderRadius: 2 }}>
                  <Typography variant="h3" sx={{ fontWeight: 600, color: '#9C27B0' }}>
                    {myTasks.length > 0 ? ((myTasks.filter(t => t.status === 'completed').length / myTasks.length) * 100).toFixed(0) : 0}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Success Rate
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
