import { useEffect, useState } from 'react';
import {
  AppBar,
  Avatar,
  Badge,
  Box,
  Chip,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Popover,
  Toolbar,
  Typography,
  useTheme,
} from '@mui/material';
import {
  AccountCircle,
  Assignment as AssignmentIcon,
  BarChart as BarChartIcon,
  Close,
  Dashboard as DashboardIcon,
  Folder as FolderIcon,
  Logout as LogoutIcon,
  Menu as MenuIcon,
  Notifications,
  People as PeopleIcon,
  ReportProblem as ReportProblemIcon,
  Stars as StarsIcon,
} from '@mui/icons-material';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useMenu } from '../hooks/useMenu';
import { deleteNotification, fetchNotifications, markNotificationRead } from '../services/api';

const drawerExpandedWidth = 240;
const drawerCollapsedWidth = 72;

function Navbar() {
  const { toggleMenu } = useMenu();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);
  const [notifAnchorEl, setNotifAnchorEl] = useState(null);

  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!user?.id) {
      setNotifications([]);
      return;
    }
    fetchNotifications({ page: 1, limit: 50 })
      .then((items) => setNotifications(items || []))
      .catch(() => setNotifications([]));
  }, [user?.id]);

  const userNotifications = notifications;
  const unreadCount = userNotifications.filter((notification) => !notification.read).length;

  const getDeletedProjectName = (notif) => {
    if (notif?.type !== 'project_deleted' || typeof notif?.message !== 'string') {
      return '';
    }
    const marker = ' was deleted by ';
    const markerIndex = notif.message.indexOf(marker);
    if (markerIndex <= 0) {
      return '';
    }
    return notif.message.slice(0, markerIndex).trim();
  };

  const handleProfileMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationClick = (event) => {
    setNotifAnchorEl(event.currentTarget);
    if (user?.id) {
      fetchNotifications({ page: 1, limit: 50 })
        .then((items) => setNotifications(items || []))
        .catch(() => setNotifications([]));
    }
  };

  const handleNotificationClose = () => {
    setNotifAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    handleMenuClose();
    navigate('/login');
  };

  const handleNotificationItemClick = (notifId) => {
    markNotificationRead(notifId)
      .then(() => fetchNotifications({ page: 1, limit: 50 }))
      .then((items) => setNotifications(items || []))
      .finally(handleNotificationClose);
  };

  const handleNotificationDismiss = (event, notifId) => {
    event.stopPropagation();
    deleteNotification(notifId)
      .then(() => fetchNotifications({ page: 1, limit: 50 }))
      .then((items) => setNotifications(items || []))
      .catch(() => undefined);
  };

  const handleDeletedProjectChipClick = (event, notif) => {
    event.stopPropagation();
    const notifId = notif?._id || notif?.id;
    const deletedProjectName = getDeletedProjectName(notif);
    if (notifId) {
      markNotificationRead(notifId)
        .then(() => fetchNotifications({ page: 1, limit: 50 }))
        .then((items) => setNotifications(items || []))
        .finally(() => {
          handleNotificationClose();
          navigate('/admin/analytics', {
            state: {
              highlightDeletedProject: deletedProjectName,
              fromNotificationType: notif.type,
            },
          });
        });
      return;
    }

    handleNotificationClose();
    navigate('/admin/analytics', {
      state: {
        highlightDeletedProject: deletedProjectName,
        fromNotificationType: notif?.type,
      },
    });
  };

  return (
    <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, bgcolor: '#1976D2' }}>
      <Toolbar>
        <IconButton
          color="inherit"
          edge="start"
          onClick={toggleMenu}
          aria-label="Toggle menu"
          sx={{ mr: 2, display: { sm: 'block' } }}
        >
          <MenuIcon />
        </IconButton>

        <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
          Collaboration Analytics Platform
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton color="inherit" onClick={handleNotificationClick}>
            <Badge badgeContent={unreadCount} color="error">
              <Notifications />
            </Badge>
          </IconButton>
          <Typography variant="body1">{user?.name}</Typography>
          <IconButton onClick={handleProfileMenuOpen} color="inherit">
            <Avatar sx={{ width: 32, height: 32, bgcolor: '#424242' }}>
              <AccountCircle />
            </Avatar>
          </IconButton>
        </Box>

        <Popover
          open={Boolean(notifAnchorEl)}
          anchorEl={notifAnchorEl}
          onClose={handleNotificationClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
        >
          <Box sx={{ width: 350, maxHeight: 400, overflow: 'auto' }}>
            <Typography variant="h6" sx={{ p: 2, fontWeight: 600 }}>
              Notifications
            </Typography>
            <Divider />
            {userNotifications.length === 0 ? (
              <ListItem>
                <ListItemText primary="No notifications" secondary="You're all caught up!" />
              </ListItem>
            ) : (
              <List>
                {userNotifications.map((notif) => (
                  <ListItem
                    key={notif._id || notif.id}
                    button
                    onClick={() => handleNotificationItemClick(notif._id || notif.id)}
                    secondaryAction={
                      <IconButton
                        edge="end"
                        size="small"
                        color="error"
                        onClick={(event) => handleNotificationDismiss(event, notif._id || notif.id)}
                        aria-label="Dismiss notification"
                      >
                        <Close fontSize="small" />
                      </IconButton>
                    }
                    sx={{
                      bgcolor: notif.read ? 'transparent' : 'rgba(25, 118, 210, 0.08)',
                      '&:hover': {
                        bgcolor: notif.read ? 'rgba(0, 0, 0, 0.04)' : 'rgba(25, 118, 210, 0.12)',
                      },
                    }}
                  >
                    <ListItemText
                      primary={notif.title}
                      secondary={
                        <>
                          {user?.role === 'admin' && notif.type === 'project_deleted' && getDeletedProjectName(notif) ? (
                            <Box sx={{ mb: 0.75 }}>
                              <Chip
                                size="small"
                                color="warning"
                                label={getDeletedProjectName(notif)}
                                sx={{ fontWeight: 600 }}
                                onClick={(event) => handleDeletedProjectChipClick(event, notif)}
                              />
                            </Box>
                          ) : null}
                          <Typography variant="body2" color="text.secondary">
                            {notif.message}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(notif.createdAt).toLocaleDateString()}
                          </Typography>
                        </>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
        </Popover>

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
        >
          <MenuItem disabled>
            <Typography variant="body2">{user?.email}</Typography>
          </MenuItem>
          <MenuItem disabled>
            <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
              Role: {user?.role}
            </Typography>
          </MenuItem>
          <MenuItem disabled>
            <Typography variant="body2">Points: {user?.points || 0}</Typography>
          </MenuItem>
          <MenuItem onClick={handleLogout}>Logout</MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
}

function Sidebar() {
  const { isMobile, isDesktopOpen, isMobileOpen, closeMobileMenu } = useMenu();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isExpanded = isMobile || isDesktopOpen;

  const handleNavigation = (path) => {
    navigate(path);
    if (isMobile) {
      closeMobileMenu();
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    if (isMobile) {
      closeMobileMenu();
    }
  };

  const getMenuItems = () => {
    const commonItems = [{ text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' }];

    if (user?.role === 'admin') {
      return [
        ...commonItems,
        { text: 'Users', icon: <PeopleIcon />, path: '/admin/users' },
        { text: 'Points', icon: <StarsIcon />, path: '/admin/points' },
        { text: 'Issues', icon: <ReportProblemIcon />, path: '/admin/issues' },
        { text: 'Analytics', icon: <BarChartIcon />, path: '/admin/analytics' },
      ];
    }

    if (user?.role === 'teamLeader') {
      return [
        ...commonItems,
        { text: 'Projects', icon: <FolderIcon />, path: '/leader/projects' },
        { text: 'Tasks', icon: <AssignmentIcon />, path: '/leader/tasks' },
        { text: 'Points', icon: <StarsIcon />, path: '/leader/points' },
        { text: 'Issues', icon: <ReportProblemIcon />, path: '/leader/issues' },
        { text: 'Analytics', icon: <BarChartIcon />, path: '/leader/analytics' },
      ];
    }

    return [
      ...commonItems,
      { text: 'My Tasks', icon: <AssignmentIcon />, path: '/member/tasks' },
      { text: 'My Issues', icon: <ReportProblemIcon />, path: '/member/issues' },
      { text: 'My Stats', icon: <BarChartIcon />, path: '/member/stats' },
    ];
  };

  const menuItems = getMenuItems();
  const drawer = (
    <Box>
      <Toolbar />
      <Divider />
      <List>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => handleNavigation(item.path)}
              aria-label={item.text}
              sx={{
                justifyContent: isExpanded ? 'flex-start' : 'center',
                px: isExpanded ? 2 : 1.5,
                '&.Mui-selected': {
                  bgcolor: 'rgba(25, 118, 210, 0.12)',
                  '&:hover': {
                    bgcolor: 'rgba(25, 118, 210, 0.2)',
                  },
                },
              }}
            >
              <ListItemIcon
                sx={{
                  color: location.pathname === item.path ? '#1976D2' : 'inherit',
                  minWidth: 0,
                  mr: isExpanded ? 2 : 0,
                  justifyContent: 'center',
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.text}
                primaryTypographyProps={{ noWrap: true }}
                sx={{
                  opacity: isExpanded ? 1 : 0,
                  maxWidth: isExpanded ? 'none' : 0,
                  overflow: 'hidden',
                  transition: (theme) => theme.transitions.create(['opacity', 'max-width'], {
                    duration: theme.transitions.duration.shorter,
                  }),
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      <Divider />
      <List>
        <ListItem disablePadding>
          <ListItemButton
            onClick={handleLogout}
            aria-label="Logout"
            sx={{ justifyContent: isExpanded ? 'flex-start' : 'center', px: isExpanded ? 2 : 1.5 }}
          >
            <ListItemIcon sx={{ minWidth: 0, mr: isExpanded ? 2 : 0, justifyContent: 'center' }}>
              <LogoutIcon />
            </ListItemIcon>
            <ListItemText
              primary="Logout"
              primaryTypographyProps={{ noWrap: true }}
              sx={{
                opacity: isExpanded ? 1 : 0,
                maxWidth: isExpanded ? 'none' : 0,
                overflow: 'hidden',
                transition: (theme) => theme.transitions.create(['opacity', 'max-width'], {
                  duration: theme.transitions.duration.shorter,
                }),
              }}
            />
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  );

  return (
    <Box
      component="nav"
      sx={{
        width: { sm: isDesktopOpen ? drawerExpandedWidth : drawerCollapsedWidth },
        flexShrink: { sm: 0 },
      }}
    >
      <Drawer
        variant="temporary"
        open={isMobileOpen}
        onClose={closeMobileMenu}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', sm: 'none' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: drawerExpandedWidth,
          },
        }}
      >
        {drawer}
      </Drawer>

      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', sm: 'block' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: isDesktopOpen ? drawerExpandedWidth : drawerCollapsedWidth,
            overflowX: 'hidden',
            transition: (theme) => theme.transitions.create('width', {
              duration: theme.transitions.duration.shorter,
            }),
          },
        }}
      >
        {drawer}
      </Drawer>
    </Box>
  );
}

export function DashboardLayout() {
  const theme = useTheme();
  const { isDesktopOpen } = useMenu();
  const desktopWidth = isDesktopOpen ? drawerExpandedWidth : drawerCollapsedWidth;
  const desktopMainWidth = `calc(100% - ${desktopWidth}px)`;

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#F5F7FA' }}>
      <Navbar />
      <Sidebar />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: desktopMainWidth },
          transition: theme.transitions.create('width', {
            duration: theme.transitions.duration.shorter,
          }),
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
}

