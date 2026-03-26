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
  IconButton,
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
  Tabs,
  Tab,
} from '@mui/material';
import { Edit, Block, PersonAdd, CheckCircle, Cancel, Delete, Search } from '@mui/icons-material';
import { fetchUsers, updateStatus, updateRole, updatePoints, deleteUser } from '../services/api';
import { UserActivityPanel } from '../components/UserActivityPanel';
import { toast } from 'sonner';

export function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [openPendingDialog, setOpenPendingDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [editRole, setEditRole] = useState('teamMember');
  const [editPoints, setEditPoints] = useState(0);
  const [activeRoleTab, setActiveRoleTab] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [openHistoryPanel, setOpenHistoryPanel] = useState(false);
  const [historyUserId, setHistoryUserId] = useState('');
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    role: 'teamMember',
  });

  useEffect(() => {
    const load = async () => {
      try {
        const list = await fetchUsers({ page: 1, limit: 100 });
        const normalized = (list || []).map(u => ({
          id: u._id || u.id,
          userCode: u.userCode,
          name: u.name,
          email: u.email,
          role: u.role,
          status: u.status,
          points: u.points || 0,
        }));
        setUsers(normalized);
      } catch (err) {
        toast.error(err.message || 'Failed to load users');
      }
    };
    load();
  }, []);

  const pendingUsers = users.filter(u => u.status === 'pending');
  const activeUsers = users.filter(u => u.status === 'active' || u.status === 'inactive');
  const activeAdmins = activeUsers.filter(u => u.role === 'admin');
  const activeLeaders = activeUsers.filter(u => u.role === 'teamLeader');
  const activeMembers = activeUsers.filter(u => u.role === 'teamMember');
  const activeRoleUsers =
    activeRoleTab === 1 ? activeAdmins :
    activeRoleTab === 2 ? activeLeaders :
    activeRoleTab === 3 ? activeMembers :
    activeUsers;
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredUsers = normalizedQuery
    ? activeRoleUsers.filter((user) => {
        const code = String(user.userCode || '').toLowerCase();
        const name = String(user.name || '').toLowerCase();
        const email = String(user.email || '').toLowerCase();
        return code.includes(normalizedQuery) || name.includes(normalizedQuery) || email.includes(normalizedQuery);
      })
    : activeRoleUsers;

  const handleApproveUser = async (userId) => {
    try {
      await updateStatus(userId, 'active');
      setUsers(prev => prev.map(u => (u.id === userId ? { ...u, status: 'active' } : u)));
      toast.success('User approved successfully');
    } catch (err) {
      toast.error(err.message || 'Failed to approve user');
    }
  };

  const handleRejectUser = async (userId) => {
    try {
      await updateStatus(userId, 'inactive');
      setUsers(prev => prev.filter(u => u.id !== userId));
      toast.success('User rejected successfully');
    } catch (err) {
      toast.error(err.message || 'Failed to reject user');
    }
  };

  const handleToggleStatus = async (userId) => {
    const current = users.find(u => u.id === userId);
    const next = current?.status === 'active' ? 'inactive' : 'active';
    try {
      await updateStatus(userId, next);
      setUsers(prev => prev.map(u => (u.id === userId ? { ...u, status: next } : u)));
      toast.success('User status updated');
    } catch (err) {
      toast.error(err.message || 'Failed to update status');
    }
  };

  const openEditDialog = (user) => {
    setSelectedUser(user);
    setEditRole(user.role === 'admin' ? 'admin' : user.role);
    setEditPoints(user.points || 0);
    setOpenEdit(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedUser) return;
    try {
      // Role change (only between teamMember/teamLeader)
      if (selectedUser.role !== editRole && editRole !== 'admin') {
        await updateRole(selectedUser.id, editRole);
      }
      // Points adjustment: positive adds, negative subtracts
      const delta = Number(editPoints);
      if (Number.isFinite(delta)) {
        await updatePoints(selectedUser.id, { delta });
      }
      // Update local state reflecting delta and preventing negatives
      setUsers(prev => prev.map(u => {
        if (u.id !== selectedUser.id) return u;
        const curr = u.points || 0;
        const next = Number.isFinite(delta) ? Math.max(0, curr + delta) : curr;
        return { ...u, role: editRole, points: next };
      }));
      toast.success('User updated');
      setOpenEdit(false);
      setSelectedUser(null);
    } catch (err) {
      toast.error(err.message || 'Failed to update user');
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    try {
      await deleteUser(selectedUser.id);
      setUsers(prev => prev.filter(u => u.id !== selectedUser.id));
      toast.success('User deleted');
      setOpenEdit(false);
      setSelectedUser(null);
    } catch (err) {
      toast.error(err.message || 'Unable to delete user');
    }
  };

  const handleAddUser = () => {
    if (!newUser.name || !newUser.email) {
      toast.error('Please fill in all fields');
      return;
    }

    const user = {
      id: users.length + 1,
      ...newUser,
      status: 'active',
      points: 0,
    };

    setUsers([...users, user]);
    setOpenDialog(false);
    setNewUser({ name: '', email: '', role: 'teamMember' });
    toast.success('User added successfully');
  };

  const handleOpenHistory = (userId) => {
    setHistoryUserId(userId);
    setOpenHistoryPanel(true);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          User Management
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            size="small"
            placeholder="Search users"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <Button
            variant="outlined"
            startIcon={<Search />}
            onClick={() => setSearchQuery(searchInput)}
          >
            Search
          </Button>
          <Button
            variant="contained"
            startIcon={<PersonAdd />}
            onClick={() => setOpenDialog(true)}
          >
            Add User
          </Button>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Tabs
          value={activeRoleTab}
          onChange={(_, newValue) => setActiveRoleTab(newValue)}
          sx={{ mb: 0 }}
        >
          <Tab label={`All (${activeUsers.length})`} />
          <Tab label={`Admins (${activeAdmins.length})`} />
          <Tab label={`Team Leaders (${activeLeaders.length})`} />
          <Tab label={`Team Members (${activeMembers.length})`} />
        </Tabs>

        <Button
          variant="outlined"
          color="warning"
          onClick={() => setOpenPendingDialog(true)}
          sx={{ minWidth: 260 }}
        >
          Pending Approval ({pendingUsers.length})
        </Button>
      </Box>

      <TableContainer component={Paper} sx={{ boxShadow: 2 }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#F5F7FA' }}>
              <TableCell sx={{ fontWeight: 600 }}>User Code</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Role</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Points</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredUsers.map((user) => (
              <TableRow key={user.id} hover>
                <TableCell>{user.userCode || '-'}</TableCell>
                <TableCell>
                  <Button size="small" variant="text" onClick={() => handleOpenHistory(user.id)}>
                    {user.name}
                  </Button>
                </TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Chip
                    label={user.role}
                    size="small"
                    color={
                      user.role === 'admin' ? 'error' :
                      user.role === 'teamLeader' ? 'primary' : 'default'
                    }
                    sx={{ textTransform: 'capitalize' }}
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={user.status}
                    size="small"
                    color={
                      user.status === 'active' ? 'success' : 
                      user.status === 'pending' ? 'warning' : 'default'
                    }
                    sx={{ textTransform: 'capitalize' }}
                  />
                </TableCell>
                <TableCell>{user.points || 0}</TableCell>
                <TableCell>
                  {user.role === 'admin' ? (
                    <Chip label="Locked" size="small" color="default" />
                  ) : (
                    <>
                      <IconButton size="small" color="primary" onClick={() => openEditDialog(user)} title="Edit">
                        <Edit fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleToggleStatus(user.id)}
                        title="Toggle Status"
                      >
                        <Block fontSize="small" />
                      </IconButton>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add User Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New User</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Name"
            value={newUser.name}
            onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Email"
            type="email"
            value={newUser.email}
            onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
            margin="normal"
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>Role</InputLabel>
            <Select
              value={newUser.role}
              label="Role"
              onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
            >
              <MenuItem value="teamMember">Team Member</MenuItem>
              <MenuItem value="teamLeader">Team Leader</MenuItem>
              <MenuItem value="admin">Admin</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleAddUser} variant="contained">
            Add User
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={openEdit} onClose={() => setOpenEdit(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit User</DialogTitle>
        <DialogContent>
          {selectedUser && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <Typography variant="subtitle2">{selectedUser.name} ({selectedUser.email})</Typography>
              <FormControl fullWidth>
                <InputLabel>Role</InputLabel>
                <Select
                  value={editRole}
                  label="Role"
                  onChange={(e) => setEditRole(e.target.value)}
                >
                  <MenuItem value="teamMember">Team Member</MenuItem>
                  <MenuItem value="teamLeader">Team Leader</MenuItem>
                  <MenuItem value="admin" disabled>Admin</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label="Points"
                type="number"
                value={editPoints}
                placeholder="Positive adds, negative subtracts"
                onChange={(e) => setEditPoints(e.target.value)}
              />
              {/* Points Operation removed */}
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" color="error" gutterBottom>Danger Zone</Typography>
                <Button color="error" variant="outlined" startIcon={<Delete />} onClick={handleDeleteUser}>
                  Remove User
                </Button>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEdit(false)}>Cancel</Button>
          <Button onClick={handleSaveEdit} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>

      {/* Pending Approval Dialog */}
      <Dialog open={openPendingDialog} onClose={() => setOpenPendingDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Pending Approval ({pendingUsers.length})</DialogTitle>
        <DialogContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: '#F5F7FA' }}>
                  <TableCell sx={{ fontWeight: 600 }}>User Code</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Role</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pendingUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">No pending approvals</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  pendingUsers.map((user) => (
                    <TableRow key={user.id} hover>
                      <TableCell>{user.userCode || '-'}</TableCell>
                      <TableCell>{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Chip
                          label={user.role}
                          size="small"
                          color={
                            user.role === 'admin' ? 'error' :
                            user.role === 'teamLeader' ? 'primary' : 'default'
                          }
                          sx={{ textTransform: 'capitalize' }}
                        />
                      </TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          color="success"
                          onClick={() => handleApproveUser(user.id)}
                          title="Approve"
                        >
                          <CheckCircle fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleRejectUser(user.id)}
                          title="Reject"
                        >
                          <Cancel fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPendingDialog(false)}>Close</Button>
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
