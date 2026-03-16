import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Divider,
  Drawer,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { fetchUserHistory } from '../services/api';

const statusColor = (status) => {
  if (status === 'Completed') return 'success';
  if (status === 'In Progress') return 'warning';
  return 'default';
};

export function UserActivityPanel({ open, onClose, userId }) {
  const [tabValue, setTabValue] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState(null);

  useEffect(() => {
    if (!open || !userId) return;

    let isMounted = true;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await fetchUserHistory(userId, {
          status: statusFilter,
          fromDate,
          toDate,
        });
        if (!isMounted) return;
        setHistory(data || null);
      } catch (err) {
        if (!isMounted) return;
        setHistory(null);
        setError(err.message || 'Failed to load user activity');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      isMounted = false;
    };
  }, [open, userId, statusFilter, fromDate, toDate]);

  useEffect(() => {
    if (!open) {
      setTabValue(0);
      setStatusFilter('');
      setFromDate('');
      setToDate('');
      setError('');
      setHistory(null);
    }
  }, [open]);

  const userInfo = history?.user;
  const workHistory = history?.workHistory || [];
  const reviews = history?.reviews || [];
  const timeline = useMemo(() => {
    const items = history?.activityTimeline || [];
    return [...items].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  }, [history?.activityTimeline]);

  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: { xs: '100%', sm: 760 } } }}>
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 600, mb: 0.5 }}>
          User Activity History
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Work history, timeline, and reviews for the selected user
        </Typography>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : null}

        {!loading && error ? <Alert severity="error">{error}</Alert> : null}

        {!loading && !error && userInfo ? (
          <>
            <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary">Name</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>{userInfo.name}</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary">Role</Typography>
                  <Typography variant="body1" sx={{ textTransform: 'capitalize' }}>{userInfo.role}</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary">Team</Typography>
                  <Typography variant="body1">{userInfo.team}</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary">Email</Typography>
                  <Typography variant="body1">{userInfo.email}</Typography>
                </Grid>
              </Grid>
            </Paper>

            <Tabs value={tabValue} onChange={(_, value) => setTabValue(value)} sx={{ mb: 2 }}>
              <Tab label="Work History" />
              <Tab label="Reviews" />
            </Tabs>

            {tabValue === 0 ? (
              <>
                <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
                    Filter Tasks
                  </Typography>
                  <Grid container spacing={1.5}>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Status</InputLabel>
                        <Select
                          value={statusFilter}
                          label="Status"
                          onChange={(event) => setStatusFilter(event.target.value)}
                        >
                          <MenuItem value="">All</MenuItem>
                          <MenuItem value="pending">Pending</MenuItem>
                          <MenuItem value="in_progress">In Progress</MenuItem>
                          <MenuItem value="completed">Completed</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <TextField
                        fullWidth
                        size="small"
                        type="date"
                        label="From"
                        InputLabelProps={{ shrink: true }}
                        value={fromDate}
                        onChange={(event) => setFromDate(event.target.value)}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <TextField
                        fullWidth
                        size="small"
                        type="date"
                        label="To"
                        InputLabelProps={{ shrink: true }}
                        value={toDate}
                        onChange={(event) => setToDate(event.target.value)}
                      />
                    </Grid>
                  </Grid>
                </Paper>

                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Work History</Typography>
                <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: '#F5F7FA' }}>
                        <TableCell sx={{ fontWeight: 600 }}>Task Name</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Project Name</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Start Date</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Completion Date</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {workHistory.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} align="center">
                            <Typography color="text.secondary" sx={{ py: 2 }}>
                              No tasks found for selected filters
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        workHistory.map((item) => (
                          <TableRow key={item.taskId} hover>
                            <TableCell>{item.taskName}</TableCell>
                            <TableCell>{item.projectName}</TableCell>
                            <TableCell>
                              <Chip size="small" label={item.status} color={statusColor(item.status)} />
                            </TableCell>
                            <TableCell>{new Date(item.startDate).toLocaleDateString()}</TableCell>
                            <TableCell>
                              {item.completionDate ? new Date(item.completionDate).toLocaleDateString() : '-'}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>

                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Activity Timeline</Typography>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  {timeline.length === 0 ? (
                    <Typography color="text.secondary">No activity logs found</Typography>
                  ) : (
                    timeline.map((event, index) => (
                      <Box key={event.id} sx={{ pb: 1.25 }}>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {event.action}: {event.taskName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(event.createdAt).toLocaleString()}
                        </Typography>
                        {index < timeline.length - 1 ? <Divider sx={{ mt: 1.25 }} /> : null}
                      </Box>
                    ))
                  )}
                </Paper>
              </>
            ) : (
              <>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Performance Reviews</Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: '#F5F7FA' }}>
                        <TableCell sx={{ fontWeight: 600 }}>Reviewer Name</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Rating (1-5)</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Feedback comment</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {reviews.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} align="center">
                            <Typography color="text.secondary" sx={{ py: 2 }}>
                              No review records found
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        reviews.map((review) => (
                          <TableRow key={review.id} hover>
                            <TableCell>{review.reviewerName}</TableCell>
                            <TableCell>{new Date(review.date).toLocaleDateString()}</TableCell>
                            <TableCell>{review.rating}</TableCell>
                            <TableCell>{review.feedbackComment}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            )}
          </>
        ) : null}
      </Box>
    </Drawer>
  );
}
