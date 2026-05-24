import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AlertCircle, Activity, GraduationCap, BookOpen, ArrowDown, ArrowRight } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import type { Role } from '../types';

export const SignUpPage: React.FC = () => {
  const { selectedRole, setSelectedRole, signUpWithGoogle, authError, clearAuthError } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (authError) {
      setError(authError);
      clearAuthError();
    }
  }, [authError, clearAuthError]);

  const handleSignUp = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await signUpWithGoogle();
      const state = useAuthStore.getState();
      if (state.authError) {
        setError(state.authError);
        clearAuthError();
      } else if (state.isAuthenticated) {
        navigate(state.user?.role === 'FACULTY' ? '/faculty' : '/setup', { replace: true });
      }
    } catch {
      setError('Failed to start sign-up. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const roles: { value: Role; icon: React.ReactNode; label: string; description: string }[] = [
    {
      value: 'STUDENT',
      icon: <GraduationCap size={24} />,
      label: 'Student',
      description: 'Submit artifacts & track traceability',
    },
    {
      value: 'FACULTY',
      icon: <BookOpen size={24} />,
      label: 'Adviser',
      description: 'Review audits & monitor groups',
    },
  ];

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Left — branding */}
      <div className="hidden lg:flex flex-col w-1/2 bg-[#0a0f1e] text-white px-14 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_20%_20%,rgba(30,58,138,0.25)_0%,transparent_60%)]" />
          <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(ellipse_at_80%_80%,rgba(124,58,237,0.12)_0%,transparent_60%)]" />
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        </div>

        <div className="relative flex flex-col items-start gap-3 max-w-md my-auto py-6">
          <div className="inline-flex items-center gap-2 bg-white/[0.06] border border-white/[0.09] rounded-full px-4 py-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] shrink-0" />
            <span className="text-[10.5px] font-semibold text-white/50 uppercase tracking-[0.12em]">Academic Traceability Platform</span>
          </div>

          <div className="space-y-2">
            <h1 className="text-[2rem] font-extrabold leading-[1.1] tracking-tight">
              Intelligent<br />
              <span className="text-[#F59E0B]">Traceability</span><br />
              Auditing
            </h1>
            <p className="text-[13px] text-white/50 leading-relaxed max-w-xs">
              Automate sequential traceability, continuity verification, and audit reporting for capstone projects.
            </p>
          </div>

          <div className="w-12 h-px bg-white/10" />

          <div className="w-full rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4 backdrop-blur-sm shadow-xl transition-all duration-300 hover:border-amber-400/20 hover:shadow-amber-500/[0.02]">
            <p className="text-[10px] text-white/30 uppercase tracking-[0.14em] font-semibold mb-2">Traceability Flow</p>
            <div className="flex flex-col items-center gap-0.5">
              <div className="px-6 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white text-[11px] font-bold tracking-wide shadow-lg shadow-amber-900/30 hover:scale-105 transition-transform duration-200 cursor-default">PROPOSAL</div>
              <ArrowDown size={12} className="text-white/20 animate-bounce mt-1 mb-1" />
              <div className="px-6 py-1.5 rounded-xl bg-white/[0.07] border border-white/[0.08] text-white/70 text-[11px] font-semibold tracking-wide hover:border-white/20 hover:text-white transition-all duration-200 cursor-default">SRS</div>
              <ArrowDown size={12} className="text-white/20 animate-bounce mt-1 mb-1" />
              <div className="flex items-center gap-1.5">
                <div className="px-4 py-1.5 rounded-xl bg-white/[0.07] border border-white/[0.08] text-white/70 text-[11px] font-semibold hover:border-white/20 hover:text-white transition-all duration-200 cursor-default">SDD</div>
                <ArrowRight size={11} className="text-white/20" />
                <div className="px-4 py-1.5 rounded-xl bg-white/[0.07] border border-white/[0.08] text-white/60 text-[11px] font-semibold hover:border-white/20 hover:text-white transition-all duration-200 cursor-default">SPMP</div>
                <ArrowRight size={11} className="text-white/20" />
                <div className="px-4 py-1.5 rounded-xl bg-white/[0.07] border border-white/[0.08] text-white/70 text-[11px] font-semibold hover:border-white/20 hover:text-white transition-all duration-200 cursor-default">STD</div>
              </div>
              <ArrowDown size={12} className="text-white/20 animate-bounce mt-1 mb-1" />
              <div className="px-6 py-1.5 rounded-xl bg-[#00f2fe]/10 border border-[#00f2fe]/20 text-[#00f2fe] text-[11px] font-semibold tracking-wide hover:bg-[#00f2fe]/20 transition-all duration-200 cursor-default">SOURCE CODE</div>
            </div>
          </div>
          <p className="text-[11px] text-white/20 tracking-wide mt-2">SyncTrace · AI-Powered Academic Traceability</p>
        </div>
      </div>

      {/* Right — sign-up form */}
      <div className="flex-1 flex items-center justify-center bg-white px-8 overflow-hidden">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#F59E0B] to-[#D97706] flex items-center justify-center">
              <Activity size={18} className="text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900">SyncTrace</span>
          </div>

          {/* Logo */}
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#F59E0B] to-[#D97706] flex items-center justify-center shadow-md">
              <Activity size={22} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">SyncTrace</h2>
              <p className="text-xs text-gray-400 uppercase tracking-widest">Academic Audit</p>
            </div>
          </div>

          <div className="h-px bg-gray-100 mb-8" />

          <p className="text-[11px] text-gray-400 uppercase tracking-[0.08em] font-bold mb-4">
            Select your role to continue
          </p>

          {/* Role selector */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {roles.map((role) => {
              const active = selectedRole === role.value;
              return (
                <button
                  key={role.value}
                  onClick={() => setSelectedRole(role.value)}
                  className={`relative flex flex-col items-start p-4 rounded-2xl border text-left transition-all duration-300 transform ${
                    active
                      ? 'border-amber-400/80 bg-gradient-to-br from-amber-50 to-orange-50/35 ring-2 ring-amber-300/30 shadow-md scale-[1.03]'
                      : 'border-gray-100 bg-white hover:border-gray-200 hover:bg-slate-50 hover:scale-[1.01]'
                  }`}
                >
                  {active && (
                    <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center animate-pulse">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2.5 transition-all ${
                      active ? 'bg-amber-100/80 text-[#D97706] shadow-sm' : 'bg-slate-100 text-gray-400'
                    }`}
                  >
                    {role.icon}
                  </div>
                  <p className={`text-[13px] font-bold ${active ? 'text-gray-900 font-extrabold' : 'text-gray-700'}`}>
                    {role.label}
                  </p>
                  <p className="text-[11.5px] text-gray-400 mt-0.5 leading-snug font-medium">{role.description}</p>
                </button>
              );
            })}
          </div>

          {/* Sign up button */}
          <button
            onClick={handleSignUp}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#0d1224] to-[#1e293b] text-white text-[13px] font-semibold hover:from-[#111827] hover:to-[#0f172a] hover:scale-[1.01] active:scale-[0.99] transition-all duration-150 disabled:opacity-70 disabled:cursor-not-allowed shadow-md hover:shadow-xl hover:shadow-gray-200"
          >
            {isLoading ? (
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            {isLoading ? 'Signing up…' : 'Sign up with Google'}
          </button>

          {error && (
            <div className="flex items-start gap-2.5 mt-3 p-3 rounded-lg bg-red-50 border border-red-200">
              <AlertCircle size={15} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs text-red-700 leading-snug">{error}</p>
            </div>
          )}

          <p className="text-center text-[12px] text-gray-400 mt-5">
            Already have an account?{' '}
            <Link to="/login" className="text-[#D97706] font-semibold hover:underline">Sign in</Link>
          </p>

          <p className="text-center text-xs text-gray-400 mt-4">
            SyncTrace · AI-Powered Academic Traceability
          </p>
        </div>
      </div>
    </div>
  );
};
