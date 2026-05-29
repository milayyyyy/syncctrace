import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { AuthPageLayout } from '../components/shared/AuthPageLayout';
import { GoogleAuthButton } from '../components/shared/GoogleAuthButton';
import { AuthOAuthSpinner } from '../components/shared/AuthOAuthSpinner';

export const LoginPage: React.FC = () => {
  const { signInWithGoogle, authError, clearAuthError, initFromSession } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [oauthProcessing, setOauthProcessing] = useState(
    () => globalThis.location.hash.includes('access_token')
      || globalThis.location.hash.includes('error')
      || globalThis.location.search.includes('code=')
      || globalThis.location.search.includes('error'),
  );
  const navigate = useNavigate();

  useEffect(() => {
    const hash = globalThis.location.hash;
    const search = globalThis.location.search;
    const isOAuthReturn =
      hash.includes('access_token')
      || hash.includes('error')
      || search.includes('code=')
      || search.includes('error');
    if (!isOAuthReturn) return;

    setOauthProcessing(true);
    initFromSession().then(() => {
      const state = useAuthStore.getState();
      globalThis.history.replaceState(null, '', '/login');
      if (state.isAuthenticated) {
        if (state.user?.role === 'FACULTY') {
          navigate('/faculty', { replace: true });
        } else if (state.groupId) {
          navigate('/dashboard', { replace: true });
        } else {
          navigate('/setup', { replace: true });
        }
      } else {
        setOauthProcessing(false);
        if (state.authError) {
          setError(state.authError);
          clearAuthError();
        }
      }
    });
  }, [initFromSession, navigate, clearAuthError]);

  useEffect(() => {
    if (authError) {
      setError(authError);
      clearAuthError();
    }
  }, [authError, clearAuthError]);

  if (oauthProcessing) {
    return <AuthOAuthSpinner message="Signing you in…" />;
  }

  const handleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
      const state = useAuthStore.getState();
      if (state.authRedirectTo === '/signup') {
        navigate('/signup', { replace: true });
      } else if (state.authError) {
        setError(state.authError);
        clearAuthError();
      } else if (state.isAuthenticated) {
        navigate(state.user?.role === 'FACULTY' ? '/faculty' : '/setup', { replace: true });
      }
    } catch {
      setError('Failed to start sign-in. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthPageLayout>
      <div className="mb-10">
        <h3 className="text-lg font-bold text-gray-900 mb-3">Welcome back</h3>
        <p className="text-sm text-gray-500 leading-relaxed">
          Sign in with your Google account to continue your academic traceability audits.
        </p>
      </div>

      <GoogleAuthButton
        label="Sign in with Google"
        loadingLabel="Signing in…"
        isLoading={isLoading}
        onClick={handleSignIn}
      />

      {error && (
        <div className="flex items-start gap-3 mt-5 p-4 rounded-lg bg-red-50 border border-red-200">
          <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 leading-snug">{error}</p>
        </div>
      )}

      <p className="text-center text-sm text-gray-500 mt-8">
        Don&apos;t have an account?{' '}
        <Link to="/signup" className="text-[#D97706] font-semibold hover:underline">Sign up</Link>
      </p>
    </AuthPageLayout>
  );
};
