import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tabs,
  Tab,
  CircularProgress,
} from '@mui/material';
import { ReportProblem } from '@mui/icons-material';
import { EmptyState } from '../components/EmptyState';
import { fetchIssues, resolveIssue } from '../services/api';
import { toast } from 'sonner';

export function AdminIssues() {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [openResolveDialog, setOpenResolveDialog] = useState(false);
  const [resolution, setResolution] = useState('');
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    loadIssues();
  }, []);

  const loadIssues = async () => {
    try {
      setLoading(true);
      const data = await fetchIssues({ page: 1, limit: 200 });
      setIssues(data || []);
    } catch (error) {
      console.error('Error loading issues:', error);
      toast.error('Failed to load issues');
    } finally {
      setLoading(false);
    }
  };

  // Filter escalated issues
  const escalatedIssues = issues.filter(i => i.escalatedToAdmin);
  const allIssues = issues;

  const currentIssues = tabValue === 0 ? escalatedIssues : allIssues;

  const handleResolve = async () => {
    if (!resolution) {
      toast.error('Please provide a resolution');
      return;
    }

    try {
      await resolveIssue(selectedIssue.id, resolution);
      setIssues(issues.map(i =>
        i.id === selectedIssue?.id
          ? { ...i, status: 'resolved', resolution, resolvedAt: new Date() }
          : i
      ));
      setOpenResolveDialog(false);
      setResolution('');
      setSelectedIssue(null);
      toast.success('Issue resolved successfully');
    } catch (error) {
      console.error('Error resolving issue:', error);
      toast.error('Failed to resolve issue');
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
      <Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: 600 }}>
        Issues Management
      </Typography>

      <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)} sx={{ mb: 3 }}>
        <Tab label={`Escalated Issues (${escalatedIssues.length})`} />
        <Tab label={`All Issues (${allIssues.length})`} />
      </Tabs>

      {currentIssues.length === 0 ? (
        <EmptyState
          title="No Issues"
          message={tabValue === 0 ? 'No escalated issues at the moment' : 'No issues reported yet'}
          icon={<ReportProblem sx={{ fontSize: 64, color: 'text.secondary', opacity: 0.5 }} />}
        />
      ) : (
        <TableContainer component={Paper} sx={{ boxShadow: 2 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Title</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Reported By</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Task</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Category</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Priority</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {currentIssues.map((issue) => (
                <TableRow key={issue.id} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {issue.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {issue.description}
                    </Typography>
                    {issue.escalatedToAdmin && issue.resolution && (
                      <Typography variant="caption" display="block" color="warning.main" sx={{ mt: 0.5 }}>
                        Escalation Reason: {issue.resolution}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>{issue.reportedByName}</TableCell>
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
                  <TableCell>
                    {issue.status !== 'resolved' && (
                      <Button
                        size="small"
                        variant="contained"
                        color="success"
                        onClick={() => {
                          setSelectedIssue(issue);
                          setOpenResolveDialog(true);
                        }}
                      >
                        Resolve
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Resolve Dialog */}
      <Dialog open={openResolveDialog} onClose={() => setOpenResolveDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Resolve Issue</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Issue: {selectedIssue?.title}
          </Typography>
          <TextField
            fullWidth
            label="Resolution *"
            multiline
            rows={4}
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
            margin="normal"
            placeholder="Describe how the issue was resolved..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenResolveDialog(false)}>Cancel</Button>
          <Button onClick={handleResolve} variant="contained" color="success">
            Mark as Resolved
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

