import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
} from '@mui/material';
import { Add, ReportProblem } from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { EmptyState } from '../components/EmptyState';
import { reportIssue, fetchIssues } from '../services/api';
import { fetchTasks } from '../services/api';
import { toast } from 'sonner';

export function MemberIssues() {
  const { user } = useAuth();
  const [issues, setIssues] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [newIssue, setNewIssue] = useState({
    title: '',
    description: '',
    priority: 'medium',
    category: 'technical',
    taskId: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [issuesData, tasksData] = await Promise.all([
        fetchIssues({ page: 1, limit: 200, reportedBy: user?.id || user?._id }),
        fetchTasks({ page: 1, limit: 200, assignedTo: user?.id || user?._id }),
      ]);
      setIssues(issuesData || []);
      setTasks(tasksData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const myIssues = issues.filter(i => i.reportedBy === user?.id);
  const myTasks = tasks.filter(t => t.assignedTo === user?.id);

  const handleReportIssue = async () => {
    if (!newIssue.title || !newIssue.description) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const payload = {
        title: newIssue.title,
        description: newIssue.description,
        priority: newIssue.priority,
        category: newIssue.category,
        taskId: newIssue.taskId || null,
      };

      const createdIssue = await reportIssue(payload);
      setIssues([...issues, createdIssue]);
      setOpenDialog(false);
      setNewIssue({ title: '', description: '', priority: 'medium', category: 'technical', taskId: '' });
      toast.success('Issue reported successfully. Your Team Leader has been notified.');
    } catch (error) {
      console.error('Error reporting issue:', error);
      toast.error('Failed to report issue');
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return 'warning';
      case 'in-review': return 'info';
      case 'escalated': return 'error';
      case 'resolved': return 'success';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          My Issues
        </Typography>
        <Button
          variant="contained"
          color="error"
          startIcon={<Add />}
          onClick={() => setOpenDialog(true)}
        >
          Report Issue
        </Button>
      </Box>

      {myIssues.length === 0 ? (
        <EmptyState
          title="No Issues Reported"
          message="Report an issue if you encounter any problems"
          icon={<ReportProblem sx={{ fontSize: 64, color: 'text.secondary', opacity: 0.5 }} />}
        />
      ) : (
        <TableContainer component={Paper} sx={{ boxShadow: 2 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Title</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Task</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Category</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Priority</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Reported Date</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {myIssues.map((issue) => (
                <TableRow key={issue.id} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {issue.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {issue.description}
                    </Typography>
                  </TableCell>
                  <TableCell>{issue.taskName || 'N/A'}</TableCell>
                  <TableCell>
                    <Chip label={issue.category} size="small" sx={{ textTransform: 'capitalize' }} />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={issue.priority}
                      size="small"
                      color={getPriorityColor(issue.priority)}
                      sx={{ textTransform: 'capitalize' }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={issue.status}
                      size="small"
                      color={getStatusColor(issue.status)}
                      sx={{ textTransform: 'capitalize' }}
                    />
                  </TableCell>
                  <TableCell>{new Date(issue.createdAt).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Report Issue Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Report an Issue</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Issue Title *"
            value={newIssue.title}
            onChange={(e) => setNewIssue({ ...newIssue, title: e.target.value })}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Description *"
            multiline
            rows={4}
            value={newIssue.description}
            onChange={(e) => setNewIssue({ ...newIssue, description: e.target.value })}
            margin="normal"
          />
          <TextField
            fullWidth
            select
            label="Related Task"
            value={newIssue.taskId}
            onChange={(e) => setNewIssue({ ...newIssue, taskId: e.target.value })}
            margin="normal"
          >
            <MenuItem value="">None</MenuItem>
            {myTasks.map((task) => (
              <MenuItem key={task.id} value={task.id}>
                {task.title}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            fullWidth
            select
            label="Category *"
            value={newIssue.category}
            onChange={(e) => setNewIssue({ ...newIssue, category: e.target.value })}
            margin="normal"
          >
            <MenuItem value="technical">Technical</MenuItem>
            <MenuItem value="resource">Resource</MenuItem>
            <MenuItem value="communication">Communication</MenuItem>
            <MenuItem value="other">Other</MenuItem>
          </TextField>
          <TextField
            fullWidth
            select
            label="Priority *"
            value={newIssue.priority}
            onChange={(e) => setNewIssue({ ...newIssue, priority: e.target.value })}
            margin="normal"
          >
            <MenuItem value="low">Low</MenuItem>
            <MenuItem value="medium">Medium</MenuItem>
            <MenuItem value="high">High</MenuItem>
            <MenuItem value="critical">Critical</MenuItem>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleReportIssue} variant="contained" color="error">
            Report Issue
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

