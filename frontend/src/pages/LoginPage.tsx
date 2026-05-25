import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AlertCircle, Activity, ArrowDown, ArrowRight } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { TraceabilityFlowDiagram } from '../components/shared/TraceabilityFlowDiagram';

export const LoginPage: React.FC = () => {
  const { signInWithGoogle, authError, clearAuthError } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Show the auth error returned after OAuth (e.g. role mismatch) and then clear it
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
    <div className="h-screen flex overflow-hidden">
      {/* Left — branding */}
      <div className="hidden lg:flex flex-col w-1/2 bg-[#0a0f1e] text-white px-14 relative overflow-y-auto scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {/* Background glows */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_20%_20%,rgba(30,58,138,0.25)_0%,transparent_60%)]" />
          <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(ellipse_at_80%_80%,rgba(124,58,237,0.12)_0%,transparent_60%)]" />
          {/* Grid pattern */}
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        </div>

        {/* Content — my-auto centers vertically in the flex column */}
        <div className="w-full max-w-[520px] my-auto py-8">
          {/* Badge */}
          <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-brand-gold/30 bg-brand-gold/10 px-4 py-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-brand-gold" />
            <span className="text-[11px] font-semibold tracking-[0.15em] text-brand-gold/90 uppercase">
              Academic Traceability Platform
            </span>
          </div>

          {/* Heading */}
          <h1 className="text-[clamp(2rem,3vw,2.75rem)] font-bold leading-[1.1] text-white">
            Intelligent
            <br />
            <span className="text-brand-gold">Traceability</span>
            <br />
            Auditing
          </h1>

          <p className="mt-3 text-sm leading-relaxed text-white/50 max-w-lg">
            Automate sequential traceability, continuity verification, and audit
            reporting for capstone projects.
          </p>

          {/* Divider */}
          <div className="my-5 h-px bg-gradient-to-r from-brand-gold/30 to-transparent" />

          {/* Flow diagram */}
          <TraceabilityFlowDiagram />
        </div>
      </div>

      {/* Right — login form */}
      <div className="flex-1 flex items-center justify-center bg-white px-6 sm:px-8 lg:px-12 overflow-hidden">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-12">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#F59E0B] to-[#D97706] flex items-center justify-center">
              <Activity size={20} className="text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900">SyncTrace</span>
          </div>

          {/* Logo */}
          <div className="flex items-center gap-4 mb-10">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#F59E0B] to-[#D97706] flex items-center justify-center shadow-md flex-shrink-0">
              <Activity size={26} className="text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">SyncTrace</h2>
              <p className="text-xs text-gray-500 uppercase tracking-widest font-medium">Academic Audit</p>
            </div>
          </div>

          <div className="h-px bg-gray-200 mb-10" />

          <div className="mb-10">
            <h3 className="text-lg font-bold text-gray-900 mb-3">Welcome back</h3>
            <p className="text-sm text-gray-500 leading-relaxed">Sign in with your Google account to continue your academic traceability audits.</p>
          </div>

          {/* Sign in button */}
          <button
            onClick={handleSignIn}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 py-4 px-4 rounded-xl bg-gradient-to-r from-[#0d1224] to-[#1e293b] text-white text-sm font-semibold hover:from-[#111827] hover:to-[#0f172a] hover:scale-[1.01] active:scale-[0.99] transition-all duration-150 disabled:opacity-70 disabled:cursor-not-allowed shadow-md hover:shadow-lg hover:shadow-gray-300"
          >
            {isLoading ? (
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            {isLoading ? 'Signing in…' : 'Sign in with Google'}
          </button>

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

          <p className="text-center text-xs text-gray-400 mt-6">
            SyncTrace · AI-Powered Academic Traceability
          </p>
        </div>
      </div>
    </div>
  );
};
