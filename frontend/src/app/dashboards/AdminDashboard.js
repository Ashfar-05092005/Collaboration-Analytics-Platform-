import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Grid,
  Typography,
  Paper,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  LinearProgress,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import { People, Group, Folder, TrendingUp } from '@mui/icons-material';
import CloseIcon from '@mui/icons-material/Close';
import { DashboardCard } from '../components/DashboardCard';
import { awardPoints, fetchProjects, fetchUsers } from '../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';

const buildUserActivityData = (users) => {
  const now = new Date();
  const months = [
    new Date(now.getFullYear(), now.getMonth() - 1, 1),
    new Date(now.getFullYear(), now.getMonth(), 1),
  ];

  return months.map((monthDate) => {
    const label = monthDate.toLocaleString('en-US', { month: 'short' });
    const month = monthDate.getMonth();
    const year = monthDate.getFullYear();
    const monthUsers = users.filter((user) => {
      if (!user.createdAt) return false;
      const created = new Date(user.createdAt);
      return created.getMonth() === month && created.getFullYear() === year;
    });

    return {
      month: label,
      active: monthUsers.filter((user) => user.status === 'active').length,
      inactive: monthUsers.filter((user) => user.status === 'inactive').length,
    };
  });
};

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString();
};

const formatProjectDisplayId = (rawId, fallbackNumber) => {
  if (typeof rawId === 'string' && rawId.trim()) {
    const cleaned = rawId.trim().toUpperCase();
    const prefixed = cleaned.match(/^(?:PRJ|PR)(\d+)$/);
    if (prefixed) {
      return `PR${String(Number(prefixed[1])).padStart(3, '0')}`;
    }

    const numeric = cleaned.match(/(\d+)/);
    if (numeric) {
      return `PR${String(Number(numeric[1])).padStart(3, '0')}`;
    }
  }

  if (Number.isFinite(fallbackNumber) && fallbackNumber > 0) {
    return `PR${String(fallbackNumber).padStart(3, '0')}`;
  }

  return '-';
};

export function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [pointsToAssign, setPointsToAssign] = useState(0);
  const [pointsReason, setPointsReason] = useState('');
  const [isAssigningPoints, setIsAssigningPoints] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        const [usersData, projectsData] = await Promise.all([
          fetchUsers({ page: 1, limit: 200 }),
          fetchProjects({ page: 1, limit: 200 }),
        ]);
        if (!isMounted) return;
        setUsers(usersData || []);
        setProjects(projectsData || []);
      } catch {
        if (!isMounted) return;
        setUsers([]);
        setProjects([]);
      }
    };

    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  const userActivityData = useMemo(() => buildUserActivityData(users), [users]);
  const totalUsers = users.length;
  const activeUsers = users.filter((user) => user.status === 'active').length;
  const totalProjects = projects.length;
  const ongoingProjects = projects.filter((project) => project.status === 'active');
  const activeProjects = ongoingProjects.length;
  const projectOrderMap = useMemo(() => {
    const ordered = [...projects].sort((a, b) => {
      const aDate = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bDate = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
      return aDate - bDate;
    });

    const map = new Map();
    ordered.forEach((project, index) => {
      const key = String(project?._id || project?.id || '');
      if (key) {
        map.set(key, index + 1);
      }
    });
    return map;
  }, [projects]);

  const getProjectDisplayId = (project) => {
    const key = String(project?._id || project?.id || '');
    const fallbackNumber = key ? projectOrderMap.get(key) : undefined;
    return formatProjectDisplayId(project?.projectId || project?.code, fallbackNumber);
  };

  const handleCloseProjectDialog = () => {
    setSelectedProject(null);
    setPointsToAssign(0);
    setPointsReason('');
  };

  const handleAssignLeaderPoints = async () => {
    const leaderId = selectedProject?.teamLeader?._id || selectedProject?.teamLeader?.id;
    if (!leaderId) {
      toast.error('Team leader not found for this project');
      return;
    }
    if (!pointsToAssign || pointsToAssign <= 0 || !pointsReason.trim()) {
      toast.error('Enter valid points and reason');
      return;
    }

    try {
      setIsAssigningPoints(true);
      await awardPoints({
        toUserId: leaderId,
        points: Number(pointsToAssign),
        reason: pointsReason.trim(),
      });
      toast.success(`Assigned ${pointsToAssign} points to team leader`);
      setPointsToAssign(0);
      setPointsReason('');
    } catch {
      toast.error('Failed to assign points');
    } finally {
      setIsAssigningPoints(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: 600 }}>
        Admin Dashboard
      </Typography>

      {/* KPI Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <DashboardCard
            title="Total Users"
            value={totalUsers}
            icon={<People sx={{ fontSize: 32, color: '#1976D2' }} />}
            color="#1976D2"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <DashboardCard
            title="Active Users"
            value={activeUsers}
            icon={<TrendingUp sx={{ fontSize: 32, color: '#4CAF50' }} />}
            color="#4CAF50"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <DashboardCard
            title="Total Projects"
            value={totalProjects}
            icon={<Folder sx={{ fontSize: 32, color: '#FF9800' }} />}
            color="#FF9800"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <DashboardCard
            title="Active Projects"
            value={activeProjects}
            icon={<Group sx={{ fontSize: 32, color: '#9C27B0' }} />}
            color="#9C27B0"
          />
        </Grid>
      </Grid>

     
      <Grid container spacing={3} sx={{ mt: 1 }}>
        <Grid size={{ xs: 12 }}>
          <Paper sx={{ p: 3, boxShadow: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
              Ongoing Projects ({activeProjects})
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Project ID</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Project</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Progress</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {ongoingProjects.map((project) => (
                    <TableRow
                      key={project._id || project.id}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => setSelectedProject(project)}
                    >
                      <TableCell>{getProjectDisplayId(project)}</TableCell>
                      <TableCell>{project.name}</TableCell>
                      <TableCell>{project.status}</TableCell>
                      <TableCell>{project.progress ?? 0}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>
        {/* Charts */}
      <Grid container spacing={3} sx={{ mt: '0.5cm' }}>
        <Grid size={{ xs: 12 }}>
          <Paper sx={{ p: 3, boxShadow: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
              User Activity Trends
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={userActivityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="active" fill="#4CAF50" name="Active Users" />
                <Bar dataKey="inactive" fill="#F44336" name="Inactive Users" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      <Dialog
        open={Boolean(selectedProject)}
        onClose={handleCloseProjectDialog}
        maxWidth="md"
        fullWidth
      >
        {selectedProject && (
          <>
            <DialogTitle sx={{ pb: 1, pr: 6 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Project Details
              </Typography>
              <IconButton
                aria-label="close"
                onClick={handleCloseProjectDialog}
                sx={{ position: 'absolute', right: 12, top: 12 }}
              >
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent sx={{ pt: 1 }}>
            <Card sx={{ boxShadow: 'none' }}>
              <CardContent sx={{ p: 3 }}>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      label="Project ID"
                      value={getProjectDisplayId(selectedProject)}
                      InputProps={{ readOnly: true }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      label="Name"
                      value={selectedProject.name || '-'}
                      InputProps={{ readOnly: true }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth
                      multiline
                      minRows={3}
                      label="Description"
                      value={selectedProject.description || '-'}
                      InputProps={{ readOnly: true }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Status
                    </Typography>
                    <Chip
                      label={selectedProject.status || '-'}
                      color={selectedProject.status === 'active' ? 'primary' : 'default'}
                      sx={{ textTransform: 'capitalize' }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Team Leader
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {selectedProject.teamLeader?.name || '-'}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Progress ({selectedProject.progress ?? 0}%)
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={Math.max(0, Math.min(100, selectedProject.progress ?? 0))}
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      label="Start Date"
                      value={formatDate(selectedProject.startDate)}
                      InputProps={{ readOnly: true }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      label="End Date"
                      value={formatDate(selectedProject.endDate)}
                      InputProps={{ readOnly: true }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <Typography variant="subtitle1" sx={{ mt: 1, mb: 1, fontWeight: 600 }}>
                      Assign Points to Team Leader
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Points"
                      value={pointsToAssign}
                      onChange={(e) => setPointsToAssign(Number(e.target.value))}
                      inputProps={{ min: 1 }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 5 }}>
                    <TextField
                      fullWidth
                      label="Reason"
                      value={pointsReason}
                      onChange={(e) => setPointsReason(e.target.value)}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 3 }}>
                    <Button
                      fullWidth
                      variant="contained"
                      sx={{ height: '56px' }}
                      onClick={handleAssignLeaderPoints}
                      disabled={isAssigningPoints}
                    >
                      {isAssigningPoints ? 'Assigning...' : 'Assign'}
                    </Button>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
            </DialogContent>
          </>
        )}
      </Dialog>
    </Box>
  );
}
