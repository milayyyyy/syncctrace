import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { cleanOAuthUrl, isOAuthReturn } from '../lib/oauth';

/** Handle Google OAuth redirect (PKCE code or hash tokens) on login/signup pages. */
export function useOAuthReturn(cleanPath: '/login' | '/signup') {
  const navigate = useNavigate();
  const { initFromSession, clearAuthError } = useAuthStore();
  const [oauthProcessing, setOauthProcessing] = useState(isOAuthReturn);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOAuthReturn()) return;

    setOauthProcessing(true);
    initFromSession().then(() => {
      const state = useAuthStore.getState();
      cleanOAuthUrl(cleanPath);

      if (state.isAuthenticated) {
        if (state.user?.role === 'FACULTY') {
          navigate('/faculty', { replace: true });
        } else if (state.groupId) {
          navigate('/dashboard', { replace: true });
        } else {
          navigate('/setup', { replace: true });
        }
        return;
      }

      setOauthProcessing(false);
      if (state.authError) {
        setError(state.authError);
        clearAuthError();
      }
      if (state.authRedirectTo && state.authRedirectTo !== cleanPath) {
        navigate(state.authRedirectTo, { replace: true });
      }
    });
  }, [initFromSession, navigate, clearAuthError, cleanPath]);

  return { oauthProcessing, error, setError };
}
