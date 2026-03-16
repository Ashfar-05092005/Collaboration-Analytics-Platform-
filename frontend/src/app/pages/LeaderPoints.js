import { useEffect, useMemo, useState } from 'react';
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
  Alert,
} from '@mui/material';
import { Add } from '@mui/icons-material';
import { fetchPointTransactions, fetchTeams, fetchUsers, getUser, transferPoints } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { UserActivityPanel } from '../components/UserActivityPanel';
import { toast } from 'sonner';

export function LeaderPoints() {
  const { user, updateUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [openHistoryPanel, setOpenHistoryPanel] = useState(false);
  const [historyUserId, setHistoryUserId] = useState('');
  const [formData, setFormData] = useState({
    toUserId: '',
    points: 0,
    reason: '',
  });

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        const [usersData, teamsData, leaderData, txData] = await Promise.all([
          fetchUsers({ page: 1, limit: 200 }),
          fetchTeams({ page: 1, limit: 200 }),
          getUser(user?.id),
          fetchPointTransactions({ page: 1, limit: 200 }),
        ]);
        if (!isMounted) return;
        const normalizedUsers = (usersData || []).map((userItem) => ({
          ...userItem,
          id: userItem.id || userItem._id,
        }));
        if (leaderData) {
          const leaderId = leaderData.id || leaderData._id;
          const exists = normalizedUsers.some((userItem) => String(userItem.id) === String(leaderId));
          if (!exists) {
            normalizedUsers.push({ ...leaderData, id: leaderId });
          }
        }
        setUsers(normalizedUsers);
        setTeams(teamsData || []);
        setTransactions(txData || []);
      } catch {
        if (!isMounted) return;
        setUsers([]);
        setTeams([]);
        setTransactions([]);
      }
    };

    if (user?.id) {
      loadData();
    }

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  const leaderTeams = useMemo(
    () => teams.filter((team) => String(team.leader) === String(user?.id)),
    [teams, user?.id]
  );
  const memberIds = useMemo(
    () => leaderTeams.flatMap((team) => team.members || []).map(String),
    [leaderTeams]
  );

  const teamMembers = users.filter(
    (userItem) => memberIds.includes(String(userItem.id)) && userItem.status === 'active'
  );
  const leaderRecord = users.find((userItem) => String(userItem.id) === String(user?.id));
  const myPoints = leaderRecord?.points || 0;
  const myTransactions = transactions.filter((transaction) => {
    const fromId = transaction.fromUser?._id || transaction.fromUser?.id || transaction.fromUserId;
    const toId = transaction.toUser?._id || transaction.toUser?.id || transaction.toUserId;
    return String(fromId) === String(user?.id) || String(toId) === String(user?.id);
  });

  const handleAssignPoints = () => {
    if (!user?.id) {
      toast.error('User not available');
      return;
    }
    if (!formData.toUserId || formData.points <= 0 || !formData.reason) {
      toast.error('Please fill in all fields');
      return;
    }

    if (formData.points > myPoints) {
      toast.error('Insufficient points. You only have ' + myPoints + ' points available.');
      return;
    }

    const toUser = users.find((userItem) => String(userItem.id) === String(formData.toUserId));
    if (!toUser) return;

    transferPoints({ toUserId: toUser.id, points: formData.points, reason: formData.reason })
      .then(() => Promise.all([
        fetchUsers({ page: 1, limit: 200 }),
        fetchPointTransactions({ page: 1, limit: 200 }),
        getUser(user?.id),
      ]))
      .then(([usersData, txData, leaderData]) => {
        const normalizedUsers = (usersData || []).map((userItem) => ({
          ...userItem,
          id: userItem.id || userItem._id,
        }));
        setUsers(normalizedUsers);
        setTransactions(txData || []);
        if (leaderData) {
          const leaderId = leaderData.id || leaderData._id;
          updateUser({ ...leaderData, id: leaderId });
        }
        setOpenDialog(false);
        setFormData({ toUserId: '', points: 0, reason: '' });
        toast.success(`${formData.points} points assigned to ${toUser.name}`);
      })
      .catch(() => {
        toast.error('Failed to distribute points');
      });
  };

  const handleOpenHistory = (memberId) => {
    setHistoryUserId(memberId);
    setOpenHistoryPanel(true);
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
          disabled={myPoints <= 0}
        >
          Distribute Points
        </Button>
      </Box>

      {/* Points Summary */}
      <Paper sx={{ p: 3, mb: 3, boxShadow: 2, bgcolor: '#E3F2FD' }}>
        <Typography variant="h6" gutterBottom>
          Your Available Points
        </Typography>
        <Typography variant="h3" sx={{ fontWeight: 600, color: '#1976D2' }}>
          {myPoints}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Distribute these points to your team members
        </Typography>
      </Paper>

      {/* Team Members Overview */}
      <Paper sx={{ p: 3, mb: 3, boxShadow: 2 }}>
        <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
          Team Members Points
        </Typography>
        {teamMembers.length === 0 ? (
          <Alert severity="info">No team members assigned to you yet.</Alert>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: '#F5F7FA' }}>
                  <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Points Earned</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {teamMembers.map((member) => (
                  <TableRow key={member.id} hover>
                    <TableCell>
                      <Button size="small" variant="text" onClick={() => handleOpenHistory(member.id)}>
                        {member.name}
                      </Button>
                    </TableCell>
                    <TableCell>{member.email}</TableCell>
                    <TableCell>
                      <Chip label={member.points || 0} color="primary" />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={member.status}
                        size="small"
                        color={member.status === 'active' ? 'success' : 'default'}
                        sx={{ textTransform: 'capitalize' }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Transaction History */}
      <Paper sx={{ p: 3, boxShadow: 2 }}>
        <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
          Transaction History
        </Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#F5F7FA' }}>
                <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>From/To</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Points</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Reason</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {myTransactions.map((transaction) => {
                const toId = transaction.toUser?._id || transaction.toUser?.id || transaction.toUserId;
                const fromName = transaction.fromUser?.name || transaction.fromUserName;
                const toName = transaction.toUser?.name || transaction.toUserName;
                const isReceived = String(toId) === String(user?.id);
                return (
                  <TableRow key={transaction._id || transaction.id} hover>
                    <TableCell>{new Date(transaction.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Chip
                        label={isReceived ? 'Received' : 'Distributed'}
                        size="small"
                        color={isReceived ? 'success' : 'warning'}
                      />
                    </TableCell>
                    <TableCell>
                      {isReceived ? fromName : toName}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={`${isReceived ? '+' : '-'}${transaction.points}`}
                        color={isReceived ? 'success' : 'warning'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{transaction.reason}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Assign Points Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Distribute Points to Team Member</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Available Points: {myPoints}
          </Alert>
          <FormControl fullWidth margin="normal">
            <InputLabel>Team Member *</InputLabel>
            <Select
              value={formData.toUserId}
              label="Team Member *"
              onChange={(e) => setFormData({ ...formData, toUserId: e.target.value })}
            >
              <MenuItem value="">Select Team Member</MenuItem>
              {teamMembers.map((member) => (
                <MenuItem key={member.id} value={member.id}>
                  {member.name} (Current: {member.points || 0} points)
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
            inputProps={{ min: 1, max: myPoints }}
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
            Distribute Points
          </Button>
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

