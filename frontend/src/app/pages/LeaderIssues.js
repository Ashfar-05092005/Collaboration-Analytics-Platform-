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
  MenuItem,
  CircularProgress,
} from '@mui/material';
import { ReportProblem, ArrowUpward } from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { EmptyState } from '../components/EmptyState';
import { fetchIssues, updateIssueStatus, resolveIssue, escalateIssue } from '../services/api';
import { toast } from 'sonner';

export function LeaderIssues() {
  const { user } = useAuth();
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [openResolveDialog, setOpenResolveDialog] = useState(false);
  const [openEscalateDialog, setOpenEscalateDialog] = useState(false);
  const [resolution, setResolution] = useState('');
  const [escalationReason, setEscalationReason] = useState('');

  useEffect(() => {
    loadIssues();
  }, []);

  const loadIssues = async () => {
    try {
      setLoading(true);
      const data = await fetchIssues({ forTeamLeader: true, page: 1, limit: 200 });
      setIssues(data || []);
    } catch (error) {
      console.error('Error loading issues:', error);
      toast.error('Failed to load issues');
    } finally {
      setLoading(false);
    }
  };

  // Filter issues assigned to this team leader
  const myTeamIssues = issues;

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

  const handleEscalate = async () => {
    if (!escalationReason) {
      toast.error('Please provide an escalation reason');
      return;
    }

    try {
      await escalateIssue(selectedIssue.id, escalationReason);
      setIssues(issues.map(i =>
        i.id === selectedIssue?.id
          ? { ...i, status: 'escalated', escalatedToAdmin: true, resolution: escalationReason }
          : i
      ));
      setOpenEscalateDialog(false);
      setEscalationReason('');
      setSelectedIssue(null);
      toast.warning('Issue escalated to Admin successfully');
    } catch (error) {
      console.error('Error escalating issue:', error);
      toast.error('Failed to escalate issue');
    }
  };

  const handleInReview = async (issue) => {
    try {
      await updateIssueStatus(issue.id, 'in-review');
      setIssues(issues.map(i =>
        i.id === issue.id
          ? { ...i, status: 'in-review' }
          : i
      ));
      toast.info('Issue marked as in review');
    } catch (error) {
      console.error('Error updating issue status:', error);
      toast.error('Failed to update issue status');
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
        Team Issues Management
      </Typography>

      {myTeamIssues.length === 0 ? (
        <EmptyState
          title="No Issues Reported"
          message="Your team has not reported any issues yet"
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
              {myTeamIssues.map((issue) => (
                <TableRow key={issue.id} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {issue.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {issue.description}
                    </Typography>
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
                    <Box sx={{ display: 'flex', gap: 1, flexDirection: 'column' }}>
                      {issue.status === 'open' && (
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => handleInReview(issue)}
                        >
                          Start Review
                        </Button>
                      )}
                      {(issue.status === 'open' || issue.status === 'in-review') && (
                        <>
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
                          <Button
                            size="small"
                            variant="contained"
                            color="error"
                            startIcon={<ArrowUpward />}
                            onClick={() => {
                              setSelectedIssue(issue);
                              setOpenEscalateDialog(true);
                            }}
                          >
                            Escalate to Admin
                          </Button>
                        </>
                      )}
                    </Box>
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

      {/* Escalate Dialog */}
      <Dialog open={openEscalateDialog} onClose={() => setOpenEscalateDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Escalate Issue to Admin</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Issue: {selectedIssue?.title}
          </Typography>
          <Typography variant="body2" color="error" sx={{ mb: 2 }}>
            This issue will be escalated to the Admin for further action.
          </Typography>
          <TextField
            fullWidth
            label="Escalation Reason *"
            multiline
            rows={4}
            value={escalationReason}
            onChange={(e) => setEscalationReason(e.target.value)}
            margin="normal"
            placeholder="Explain why this issue needs admin attention..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEscalateDialog(false)}>Cancel</Button>
          <Button onClick={handleEscalate} variant="contained" color="error">
            Escalate to Admin
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

