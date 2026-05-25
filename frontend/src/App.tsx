import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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

function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuthStore();
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

function App() {
  const { isAuthenticated, isLoading, user, groupId, initFromSession } = useAuthStore();

  // Restore session on app load — skip on the OAuth callback route
  // (AuthCallbackPage owns initFromSession during that flow)
  useEffect(() => {
    if (!globalThis.location.pathname.startsWith('/auth/callback')) {
      initFromSession();
    }
  }, []);

  // Show a full-screen spinner while resolving the session.
  // This prevents the login page from flashing for users with an existing session.
  if (isLoading && !globalThis.location.pathname.startsWith('/auth/callback')) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#0a0f1e]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-white/20 border-t-[#F59E0B] rounded-full animate-spin" />
          <p className="text-white/40 text-sm">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
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

        {/* OAuth callback */}
        <Route path="/auth/callback" element={<AuthCallbackPage />} />

        {/* Student routes */}
        <Route path="/dashboard" element={<ProtectedRoute requiredRole="STUDENT"><DashboardPage /></ProtectedRoute>} />
        <Route path="/setup" element={<ProtectedRoute requiredRole="STUDENT"><SetupPage /></ProtectedRoute>} />
        <Route path="/artifacts" element={<ProtectedRoute requiredRole="STUDENT"><ArtifactsPage /></ProtectedRoute>} />
        <Route path="/matrix" element={<ProtectedRoute requiredRole="STUDENT"><MatrixPage /></ProtectedRoute>} />
        <Route path="/diagnostics" element={<ProtectedRoute requiredRole="STUDENT"><DiagnosticsPage /></ProtectedRoute>} />

        {/* Faculty routes */}
        <Route path="/faculty" element={<ProtectedRoute requiredRole="FACULTY"><FacultyDashboardPage /></ProtectedRoute>} />
        <Route path="/faculty/group/:id" element={<ProtectedRoute requiredRole="FACULTY"><GroupDetailPage /></ProtectedRoute>} />

        {/* Default redirect */}
        <Route path="*" element={<DefaultRedirect />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
