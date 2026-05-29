import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { AuthPageLayout } from '../components/shared/AuthPageLayout';
import { GoogleAuthButton } from '../components/shared/GoogleAuthButton';

export const LoginPage: React.FC = () => {
  const { signInWithGoogle, authError, clearAuthError } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (authError) {
      setError(authError);
      clearAuthError();
    }
  }, [authError, clearAuthError]);

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
