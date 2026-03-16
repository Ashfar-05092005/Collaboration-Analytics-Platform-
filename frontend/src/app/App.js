import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { Toaster } from 'sonner';
import { AuthProvider } from './hooks/useAuth';
import { MenuProvider } from './hooks/useMenu';
import { useAuth } from './hooks/useAuth';
import { LoadingSpinner } from './components/LoadingSpinner';

const Login = lazy(() => import('./pages/Login').then((module) => ({ default: module.Login })));
const Register = lazy(() => import('./pages/Register').then((module) => ({ default: module.Register })));
const DashboardLayout = lazy(() => import('./components/DashboardLayout').then((module) => ({ default: module.DashboardLayout })));
const ProtectedRoute = lazy(() => import('./components/ProtectedRoute').then((module) => ({ default: module.ProtectedRoute })));
const AdminDashboard = lazy(() => import('./dashboards/AdminDashboard').then((module) => ({ default: module.AdminDashboard })));
const TeamLeaderDashboard = lazy(() => import('./dashboards/TeamLeaderDashboard').then((module) => ({ default: module.TeamLeaderDashboard })));
const TeamMemberDashboard = lazy(() => import('./dashboards/TeamMemberDashboard').then((module) => ({ default: module.TeamMemberDashboard })));
const AdminUsers = lazy(() => import('./pages/AdminUsers').then((module) => ({ default: module.AdminUsers })));
const AdminIssues = lazy(() => import('./pages/AdminIssues').then((module) => ({ default: module.AdminIssues })));
const AdminPoints = lazy(() => import('./pages/AdminPoints').then((module) => ({ default: module.AdminPoints })));
const LeaderProjects = lazy(() => import('./pages/LeaderProjects').then((module) => ({ default: module.LeaderProjects })));
const LeaderTasks = lazy(() => import('./pages/LeaderTasks').then((module) => ({ default: module.LeaderTasks })));
const LeaderIssues = lazy(() => import('./pages/LeaderIssues').then((module) => ({ default: module.LeaderIssues })));
const LeaderPoints = lazy(() => import('./pages/LeaderPoints').then((module) => ({ default: module.LeaderPoints })));
const MemberTasks = lazy(() => import('./pages/MemberTasks').then((module) => ({ default: module.MemberTasks })));
const MemberIssues = lazy(() => import('./pages/MemberIssues').then((module) => ({ default: module.MemberIssues })));
const Analytics = lazy(() => import('./pages/Analytics').then((module) => ({ default: module.Analytics })));
const MemberStats = lazy(() => import('./pages/MemberStats').then((module) => ({ default: module.MemberStats })));

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976D2',
    },
    secondary: {
      main: '#424242',
    },
    success: {
      main: '#4CAF50',
    },
  },
  typography: {
    fontFamily: 'Roboto, sans-serif',
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 500,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
  },
});

function DashboardRouter() {
  const { user } = useAuth();

  if (user?.role === 'admin') {
    return <AdminDashboard />;
  }

  if (user?.role === 'teamLeader') {
    return <TeamLeaderDashboard />;
  }

  return <TeamMemberDashboard />;
}

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <AuthProvider>
          <MenuProvider>
            <Suspense fallback={<LoadingSpinner />}>
              <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Protected Routes */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <DashboardLayout />
                  </ProtectedRoute>
                }
              >
                {/* Dashboard - Role-based redirect */}
                <Route path="dashboard" element={<DashboardRouter />} />

                {/* Admin Routes */}
                <Route
                  path="admin/users"
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <AdminUsers />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="admin/points"
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <AdminPoints />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="admin/issues"
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <AdminIssues />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="admin/analytics"
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <Analytics />
                    </ProtectedRoute>
                  }
                />

                {/* Team Leader Routes */}
                <Route
                  path="leader/projects"
                  element={
                    <ProtectedRoute allowedRoles={['teamLeader']}>
                      <LeaderProjects />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="leader/tasks"
                  element={
                    <ProtectedRoute allowedRoles={['teamLeader']}>
                      <LeaderTasks />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="leader/points"
                  element={
                    <ProtectedRoute allowedRoles={['teamLeader']}>
                      <LeaderPoints />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="leader/issues"
                  element={
                    <ProtectedRoute allowedRoles={['teamLeader']}>
                      <LeaderIssues />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="leader/analytics"
                  element={
                    <ProtectedRoute allowedRoles={['teamLeader']}>
                      <Analytics />
                    </ProtectedRoute>
                  }
                />

                {/* Team Member Routes */}
                <Route
                  path="member/tasks"
                  element={
                    <ProtectedRoute allowedRoles={['teamMember']}>
                      <MemberTasks />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="member/issues"
                  element={
                    <ProtectedRoute allowedRoles={['teamMember']}>
                      <MemberIssues />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="member/stats"
                  element={
                    <ProtectedRoute allowedRoles={['teamMember']}>
                      <MemberStats />
                    </ProtectedRoute>
                  }
                />

                {/* Default redirect */}
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
              </Route>

              {/* Catch all - redirect to login */}
              <Route path="*" element={<Navigate to="/login" replace />} />
              </Routes>
            </Suspense>
          </MenuProvider>
          <Toaster position="top-right" richColors />
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
