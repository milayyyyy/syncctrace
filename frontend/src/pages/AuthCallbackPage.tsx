import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

export const AuthCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const { initFromSession } = useAuthStore();

  useEffect(() => {
    initFromSession().then(() => {
      const state = useAuthStore.getState();
      if (state.isAuthenticated) {
        navigate(state.user?.role === 'FACULTY' ? '/faculty' : '/setup', { replace: true });
      } else {
        // initFromSession resolved without authenticating (e.g. 404 or role mismatch)
        navigate(state.authRedirectTo || '/login', { replace: true });
      }
    });
  }, []);

  return (
    <div className="h-screen flex items-center justify-center bg-[#0a0f1e]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-2 border-white/20 border-t-[#F59E0B] rounded-full animate-spin" />
        <p className="text-white/40 text-sm">Signing you in…</p>
      </div>
    </div>
  );
};
