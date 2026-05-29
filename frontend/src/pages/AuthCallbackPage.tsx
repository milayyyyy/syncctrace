import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { cleanOAuthUrl } from '../lib/oauth';
import { AuthOAuthSpinner } from '../components/shared/AuthOAuthSpinner';

function studentRedirect(groupId: string | null): string {
  return groupId ? '/dashboard' : '/setup';
}

/** Single entry point for Google OAuth PKCE callback — avoids double code exchange on /login. */
export const AuthCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const { initFromSession } = useAuthStore();
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current) return;
    handledRef.current = true;

    initFromSession().then(() => {
      const state = useAuthStore.getState();
      cleanOAuthUrl('/auth/callback');

      if (state.isAuthenticated) {
        if (state.user?.role === 'FACULTY') {
          navigate('/faculty', { replace: true });
        } else {
          navigate(studentRedirect(state.groupId), { replace: true });
        }
        return;
      }

      navigate(state.authRedirectTo || '/login', { replace: true });
    });
  }, [initFromSession, navigate]);

  return <AuthOAuthSpinner message="Signing you in…" />;
};
