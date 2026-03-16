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
  ButtonGroup,
} from '@mui/material';
import { useAuth } from '../hooks/useAuth';
import { EmptyState } from '../components/EmptyState';
import { Assignment } from '@mui/icons-material';
import { toast } from 'sonner';
import { fetchTasks, updateTaskStatus } from '../services/api';

export function MemberTasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const loadTasks = async () => {
      try {
        setLoading(true);
        const tasksData = await fetchTasks({ page: 1, limit: 200, assignedTo: user?.id || user?._id });
        if (isMounted) {
          setTasks(tasksData || []);
        }
      } catch (error) {
        if (isMounted) {
          toast.error(error.message || 'Failed to load tasks');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadTasks();
    return () => {
      isMounted = false;
    };
  }, []);

  const userId = user?.id || user?._id;
  const myTasks = tasks.filter(t => t.assignedTo === userId || !userId);

  const normalizeStatus = (status) => (status === 'pending' ? 'assigned' : status);

  const handleStatusUpdate = async (taskId, newStatus) => {
    try {
      const updated = await updateTaskStatus(taskId, newStatus);
      setTasks(prev => prev.map(t => (t._id === taskId || t.id === taskId ? updated : t)));
      toast.success('Task status updated successfully');
    } catch (error) {
      toast.error(error.message || 'Failed to update status');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'success';
      case 'on_review': return 'info';
      case 'changes_requested': return 'warning';
      case 'assigned': return 'default';
      case 'submitted': return 'info';
      case 'pending': return 'default';
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

  if (!loading && myTasks.length === 0) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: 600 }}>
          My Tasks
        </Typography>
        <EmptyState
          title="No Tasks Assigned"
          message="You don't have any tasks assigned yet"
          icon={<Assignment sx={{ fontSize: 64, color: 'text.secondary', opacity: 0.5 }} />}
        />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: 600 }}>
        My Tasks
      </Typography>

      {loading && (
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Loading tasks...
        </Typography>
      )}

      <TableContainer component={Paper} sx={{ boxShadow: 2 }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#F5F7FA' }}>
              <TableCell sx={{ fontWeight: 600 }}>Task</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Project</TableCell>
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
                  {task.status === 'changes_requested' && task.reviewComment && (
                    <Typography variant="caption" color="error" sx={{ display: 'block' }}>
                      {task.reviewComment}
                    </Typography>
                  )}
                </TableCell>
                <TableCell>{task.projectName || task.project?.name || ''}</TableCell>
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
                    label={normalizeStatus(task.status)}
                    size="small"
                    color={getStatusColor(normalizeStatus(task.status))}
                    sx={{ textTransform: 'capitalize' }}
                  />
                </TableCell>
                <TableCell>
                  {new Date(task.dueDate).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <ButtonGroup size="small" variant="outlined">
                    {(['assigned', 'changes_requested', 'pending'].includes(task.status)) && (
                      <Button onClick={() => handleStatusUpdate(task._id || task.id, 'on_review')}>
                        Submit
                      </Button>
                    )}
                  </ButtonGroup>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

