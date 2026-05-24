import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import type { User, Role } from '../types';
import { supabase } from '../lib/supabase';
import { api } from '../services/api';

interface AuthState {
  user: User | null;
  selectedRole: Role;
  isAuthenticated: boolean;
  isLoading: boolean;
  groupId: string | null;
  authError: string | null;
  /** After an OAuth callback error, where to redirect: '/login' or '/signup'. */
  authRedirectTo: string;
  setGroupId: (id: string | null) => void;
  setSelectedRole: (role: Role) => void;
  clearAuthError: () => void;
  /** Login — authenticates an existing account; no role selection needed. */
  signInWithGoogle: () => Promise<void>;
  /** Sign up — creates a new account with the currently selected role. */
  signUpWithGoogle: () => Promise<void>;
  initFromSession: () => Promise<void>;
  logout: () => Promise<void>;
}

type StoreSetter = (s: Partial<AuthState>) => void;

/** Load the first group for the signed-in user (non-fatal, best-effort). */
async function loadUserGroup(setState: StoreSetter): Promise<void> {
  try {
    const groupRes = await api.get('/api/projects');
    const groups: Array<{ id: string }> = groupRes.data.groups;
    if (groups.length > 0) setState({ groupId: groups[0].id });
  } catch { /* non-fatal */ }
}



/** Fetch or create the backend user record after an OAuth callback. */
async function fetchUserProfile(session: Session, pendingRole: Role | null) {
  if (!pendingRole) return api.get('/api/auth/me');
  const sbUser = session.user;
  return api.post('/api/auth/sync', {
    role: pendingRole,
    name: sbUser.user_metadata?.full_name ?? sbUser.email?.split('@')[0] ?? 'User',
    avatarUrl: sbUser.user_metadata?.avatar_url ?? null,
  });
}



export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  selectedRole: 'STUDENT',
  isAuthenticated: false,
  isLoading: true,
  groupId: null,
  authError: null,
  authRedirectTo: '/login',

  setGroupId: (id) => set({ groupId: id }),
  setSelectedRole: (role) => set({ selectedRole: role }),
  clearAuthError: () => set({ authError: null }),

  signInWithGoogle: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      try {
        const res = await api.get('/api/auth/me');
        const user: User = res.data.user;
        set({ user, isAuthenticated: true, isLoading: false, authError: null, authRedirectTo: '/login' });
        loadUserGroup(set);
      } catch (err: any) {
        if (err?.response?.status === 404) {
          // Supabase account exists but no app account — send to sign up
          set({ authRedirectTo: '/signup' });
        } else {
          set({ authError: 'Sign-in failed. Please try again.' });
        }
      }
      return;
    }
    // No session — OAuth without a pending_role (login flow, existing accounts only)
    localStorage.removeItem('pending_role');
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
  },

  signUpWithGoogle: async () => {
    const { selectedRole } = get();
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      try {
        const res = await api.get('/api/auth/me');
        const existingUser: User = res.data.user;
        if (existingUser.role === selectedRole) {
          // Same role — just log them in
          set({ user: existingUser, isAuthenticated: true, isLoading: false, authError: null, authRedirectTo: '/login' });
          loadUserGroup(set);
        } else {
          const label = existingUser.role === 'STUDENT' ? 'Student' : 'Adviser';
          set({ authError: `Account already registered as ${label}. Please sign in instead.` });
        }
      } catch (err: any) {
        if (err?.response?.status !== 404) {
          set({ authError: 'Sign-up failed. Please try again.' });
          return;
        }
        // 404 = no backend account yet — create one via OAuth
        localStorage.setItem('pending_role', selectedRole);
        await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: `${location.origin}/auth/callback` },
        });
      }
      return;
    }
    // No session — OAuth to register a new account
    localStorage.setItem('pending_role', selectedRole);
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
  },

  initFromSession: async () => {
    set({ isLoading: true });

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { set({ isLoading: false }); return; }

    const pendingRole = localStorage.getItem('pending_role') as Role | null;
    localStorage.removeItem('pending_role');

    try {
      const res = await fetchUserProfile(session, pendingRole);
      const user: User = res.data.user;
      set({ user, isAuthenticated: true, isLoading: false, authError: null, authRedirectTo: '/login' });
      loadUserGroup(set);
    } catch (err: any) {
      const status = err?.response?.status;

      // Login flow: authenticated with Google but no app account — redirect to sign up
      if (status === 404) {
        await supabase.auth.signOut();
        set({ isLoading: false, authError: 'No account found. Please sign up first.', authRedirectTo: '/signup' });
        return;
      }

      // Sign-up flow: account already exists with a different role
      if (status === 403 && err?.response?.data?.error === 'ROLE_MISMATCH') {
        const actualRole: Role = err.response.data.role as Role;
        const label = actualRole === 'STUDENT' ? 'Student' : 'Adviser';
        await supabase.auth.signOut();
        set({
          isLoading: false,
          authError: `Account already registered as ${label}. Please sign in instead.`,
          authRedirectTo: '/login',
        });
        return;
      }

      // Unexpected error — clean up
      if (pendingRole) await supabase.auth.signOut();
      set({ isLoading: false, authRedirectTo: '/login' });
    }
  },

  logout: async () => {
    await supabase.auth.signOut();
    set({ user: null, isAuthenticated: false, selectedRole: 'STUDENT', isLoading: false, groupId: null, authRedirectTo: '/login' });
  },
}));

