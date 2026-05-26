import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from './stores/authStore';
import { LoginPage } from './pages/LoginPage';
import { SignUpPage } from './pages/SignUpPage';
import { AuthCallbackPage } from './pages/AuthCallbackPage';
import { SetupPage } from './pages/SetupPage';
import { DashboardPage } from './pages/DashboardPage';
import { ArtifactsPage } from './pages/ArtifactsPage';
import { MatrixPage } from './pages/MatrixPage';
import { DiagnosticsPage } from './pages/DiagnosticsPage';
import { FacultyDashboardPage } from './pages/FacultyDashboardPage';
import { GroupDetailPage } from './pages/GroupDetailPage';

interface ProtectedRouteProps {
  readonly children: React.ReactNode;
  readonly requiredRole?: 'STUDENT' | 'FACULTY';
}

function BootSpinner() {
  return (
    <div className="min-h-screen min-h-dvh flex items-center justify-center bg-[#0a0f1e]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-2 border-white/20 border-t-[#F59E0B] rounded-full animate-spin" />
        <p className="text-white/40 text-sm">Loading…</p>
      </div>
    </div>
  );
}

function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { isAuthenticated, user, isLoading } = useAuthStore();
  if (isLoading) return <BootSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to={user?.role === 'FACULTY' ? '/faculty' : '/setup'} replace />;
  }
  return <>{children}</>;
}

function DefaultRedirect() {
  const { isAuthenticated, user, groupId } = useAuthStore();
  let to = '/login';
  if (isAuthenticated) {
    if (user?.role === 'FACULTY') to = '/faculty';
    else if (groupId) to = '/dashboard';
    else to = '/setup';
  }
  return <Navigate to={to} replace />;
}

function studentRedirect(groupId: string | null) {
  return groupId ? '/dashboard' : '/setup';
}

function isOAuthReturnPath(pathname: string, hash: string): boolean {
  return (
    (pathname === '/login' || pathname === '/signup' || pathname.startsWith('/auth/callback'))
    && (hash.includes('access_token') || hash.includes('error'))
  );
}

function AppRoutes() {
  const { isAuthenticated, isLoading, user, groupId, initFromSession } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    const skipInit =
      location.pathname.startsWith('/auth/callback')
      || isOAuthReturnPath(location.pathname, location.hash);
    if (!skipInit) {
      initFromSession();
    }
  }, [location.pathname, location.hash, initFromSession]);

  const oauthReturn = isOAuthReturnPath(location.pathname, location.hash);
  const isPublicRoute = ['/login', '/signup'].includes(location.pathname);
  const showBootSpinner =
    isLoading
    && !oauthReturn
    && !location.pathname.startsWith('/auth/callback')
    && isPublicRoute;

  if (showBootSpinner) {
    return <BootSpinner />;
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated
          ? <Navigate to={user?.role === 'FACULTY' ? '/faculty' : studentRedirect(groupId)} replace />
          : <LoginPage />}
      />

      <Route
        path="/signup"
        element={isAuthenticated
          ? <Navigate to={user?.role === 'FACULTY' ? '/faculty' : studentRedirect(groupId)} replace />
          : <SignUpPage />}
      />

      <Route path="/auth/callback" element={<AuthCallbackPage />} />

      <Route path="/dashboard" element={<ProtectedRoute requiredRole="STUDENT"><DashboardPage /></ProtectedRoute>} />
      <Route path="/setup" element={<ProtectedRoute requiredRole="STUDENT"><SetupPage /></ProtectedRoute>} />
      <Route path="/artifacts" element={<ProtectedRoute requiredRole="STUDENT"><ArtifactsPage /></ProtectedRoute>} />
      <Route path="/matrix" element={<ProtectedRoute requiredRole="STUDENT"><MatrixPage /></ProtectedRoute>} />
      <Route path="/diagnostics" element={<ProtectedRoute requiredRole="STUDENT"><DiagnosticsPage /></ProtectedRoute>} />

      <Route path="/faculty" element={<ProtectedRoute requiredRole="FACULTY"><FacultyDashboardPage /></ProtectedRoute>} />
      <Route path="/faculty/group/:id" element={<ProtectedRoute requiredRole="FACULTY"><GroupDetailPage /></ProtectedRoute>} />

      <Route path="*" element={<DefaultRedirect />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
