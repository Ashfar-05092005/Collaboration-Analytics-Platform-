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
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Tabs,
   Tab,
} from '@mui/material';
import { Add } from '@mui/icons-material';
import { awardPoints, fetchPointTransactions, fetchUsers } from '../services/api';
import { UserActivityPanel } from '../components/UserActivityPanel';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'sonner';

export function AdminPoints() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [openUserDetailsDialog, setOpenUserDetailsDialog] = useState(false);
  const [openHistoryPanel, setOpenHistoryPanel] = useState(false);
  const [historyUserId, setHistoryUserId] = useState('');
  const [selectedUserForDetails, setSelectedUserForDetails] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [formData, setFormData] = useState({
    toUserId: '',
    points: 0,
    reason: '',
  });

  useEffect(() => {
    let isMounted = true;
    const loadUsers = async () => {
      try {
        const [data, txData] = await Promise.all([
          fetchUsers({ page: 1, limit: 200 }),
          fetchPointTransactions({ page: 1, limit: 200 }),
        ]);
        if (!isMounted) return;
        const normalized = (data || []).map((userItem) => ({
          ...userItem,
          id: userItem.id || userItem._id,
        }));
        setUsers(normalized);
        setTransactions(txData || []);
      } catch {
        if (!isMounted) return;
        setUsers([]);
        setTransactions([]);
      }
    };

    loadUsers();
    return () => {
      isMounted = false;
    };
  }, []);

  const teamLeaders = users.filter((userItem) => userItem.role === 'teamLeader' && userItem.status === 'active');
  const teamMembers = users.filter((userItem) => userItem.role === 'teamMember' && userItem.status === 'active');
  const displayedUsers = tabValue === 0 ? teamLeaders : teamMembers;
  const displayedUserIds = new Set(displayedUsers.map((userItem) => String(userItem.id)));
  const filteredTransactions = transactions.filter((transaction) => {
    const toUserId = transaction.toUser?._id || transaction.toUser?.id || transaction.toUser;
    return displayedUserIds.has(String(toUserId));
  });

  const handleUserClick = (userItem) => {
    setSelectedUserForDetails(userItem);
    setOpenUserDetailsDialog(true);
  };

  const handleOpenHistory = (userId) => {
    setHistoryUserId(userId);
    setOpenHistoryPanel(true);
  };

  const userTransactions = selectedUserForDetails
    ? transactions.filter((tx) => {
        const toUserId = tx.toUser?._id || tx.toUser?.id || tx.toUser;
        return String(toUserId) === String(selectedUserForDetails.id);
      })
    : [];

  const handleAssignPoints = () => {
    if (!formData.toUserId || formData.points <= 0 || !formData.reason) {
      toast.error('Please fill in all fields');
      return;
    }

    const toUser = users.find((userItem) => String(userItem.id) === String(formData.toUserId));
    if (!toUser) return;

    awardPoints({ toUserId: toUser.id, points: formData.points, reason: formData.reason })
      .then(() => Promise.all([
        fetchUsers({ page: 1, limit: 200 }),
        fetchPointTransactions({ page: 1, limit: 200 }),
      ]))
      .then(([usersData, txData]) => {
        const normalized = (usersData || []).map((userItem) => ({
          ...userItem,
          id: userItem.id || userItem._id,
        }));
        setUsers(normalized);
        setTransactions(txData || []);
        setOpenDialog(false);
        setFormData({ toUserId: '', points: 0, reason: '' });
        toast.success(`${formData.points} points assigned to ${toUser.name}`);
      })
      .catch(() => {
        toast.error('Failed to assign points');
      });
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          Point Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setOpenDialog(true)}
        >
          Assign Points
        </Button>
      </Box>

      <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)} sx={{ mb: 3 }}>
        <Tab label={`Team Leaders (${teamLeaders.length})`} />
        <Tab label={`Team Members (${teamMembers.length})`} />
      </Tabs>

      {/* Users Overview */}
      <Paper sx={{ p: 3, mb: 3, boxShadow: 2 }}>
        <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
          {tabValue === 0 ? 'Team Leaders' : 'Team Members'} Points
        </Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#F5F7FA' }}>
                <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Points Available</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {displayedUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">No users found</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                displayedUsers.map((userItem) => (
                  <TableRow
                    key={userItem.id}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => handleUserClick(userItem)}
                  >
                    <TableCell>
                      <Button size="small" variant="text" onClick={(event) => { event.stopPropagation(); handleOpenHistory(userItem.id); }}>
                        {userItem.name}
                      </Button>
                    </TableCell>
                    <TableCell>{userItem.email}</TableCell>
                    <TableCell>
                      <Chip label={userItem.points || 0} color="primary" />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={userItem.status}
                        size="small"
                        color={userItem.status === 'active' ? 'success' : 'default'}
                        sx={{ textTransform: 'capitalize' }}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Transaction History */}
      <Paper sx={{ p: 3, boxShadow: 2 }}>
        <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
          {tabValue === 0 ? 'Team Leaders' : 'Team Members'} Transaction History
        </Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#F5F7FA' }}>
                <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>From</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>To</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Points</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Reason</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">No transactions found</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredTransactions.map((transaction) => {
                  const fromName = transaction.fromUser?.name || transaction.fromUserName || 'System';
                  const toName = transaction.toUser?.name || transaction.toUserName;
                  return (
                    <TableRow key={transaction._id || transaction.id} hover>
                      <TableCell>{new Date(transaction.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>{fromName}</TableCell>
                      <TableCell>{toName}</TableCell>
                      <TableCell>
                        <Chip label={`+${transaction.points}`} color="success" size="small" />
                      </TableCell>
                      <TableCell>{transaction.reason}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Assign Points Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Assign Points to Team Leader</DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="normal">
            <InputLabel>Team Leader *</InputLabel>
            <Select
              value={formData.toUserId}
              label="Team Leader *"
              onChange={(e) => setFormData({ ...formData, toUserId: e.target.value })}
            >
              <MenuItem value="">Select Team Leader</MenuItem>
              {teamLeaders.map((leader) => (
                <MenuItem key={leader.id} value={leader.id}>
                  {leader.name} (Current: {leader.points || 0} points)
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label="Points *"
            type="number"
            value={formData.points}
            onChange={(e) => setFormData({ ...formData, points: Number(e.target.value) })}
            margin="normal"
            inputProps={{ min: 1 }}
          />
          <TextField
            fullWidth
            label="Reason *"
            multiline
            rows={3}
            value={formData.reason}
            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
            margin="normal"
            placeholder="Why are you assigning these points?"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleAssignPoints} variant="contained">
            Assign Points
          </Button>
        </DialogActions>
      </Dialog>

      {/* User Points Details Dialog */}
      <Dialog
        open={openUserDetailsDialog}
        onClose={() => setOpenUserDetailsDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedUserForDetails?.name} - Points History
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Total Points: <Chip label={selectedUserForDetails?.points || 0} color="primary" sx={{ ml: 1 }} />
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Email: {selectedUserForDetails?.email}
            </Typography>
          </Box>
          <Typography variant="h6" sx={{ mb: 2, mt: 3 }}>
            Points Received
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: '#F5F7FA' }}>
                  <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>From</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Points</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Reason</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {userTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">No transactions found</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  userTransactions.map((transaction) => {
                    const fromName = transaction.fromUser?.name || transaction.fromUserName || 'System';
                    return (
                      <TableRow key={transaction._id || transaction.id} hover>
                        <TableCell>
                          {new Date(transaction.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{fromName}</TableCell>
                        <TableCell>
                          <Chip label={`+${transaction.points}`} color="success" size="small" />
                        </TableCell>
                        <TableCell>{transaction.reason}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenUserDetailsDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <UserActivityPanel
        open={openHistoryPanel}
        onClose={() => setOpenHistoryPanel(false)}
        userId={historyUserId}
      />
    </Box>
  );
}

