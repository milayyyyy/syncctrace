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
type ApiError = { response?: { status?: number; data?: { error?: string; role?: Role } } };

function asApiError(err: unknown): ApiError {
  return typeof err === 'object' && err !== null ? err as ApiError : {};
}

/** OAuth return URL - always use the site the user is on (never a build-time localhost URL). */
function oauthRedirectUrl(role: Role | null = null): string {
  const path = role ? '/signup' : '/login';
  const url = new URL(path, globalThis.location.origin);
  if (role) url.searchParams.set('pending_role', role);
  return url.toString();
}

function pendingRoleFromOAuthRedirect(): Role | null {
  const params = new URLSearchParams(globalThis.location.search);
  const role = params.get('pending_role');
  return role === 'STUDENT' || role === 'FACULTY' ? role : null;
}
async function exchangeOAuthCodeIfPresent(): Promise<void> {
  const params = new URLSearchParams(globalThis.location.search);
  const oauthError = params.get('error');
  if (oauthError) {
    throw new Error(params.get('error_description') ?? oauthError);
  }
  const code = params.get('code');
  if (!code) return;

  const { data: { session: existing } } = await supabase.auth.getSession();
  if (existing) return;

  const { error } = await supabase.auth.exchangeCodeForSession(globalThis.location.href);
  if (error) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) return;
    throw error;
  }
}

/** Supabase implicit OAuth returns tokens in the URL hash (#access_token=...). */
async function recoverSessionFromUrlHash(): Promise<void> {
  const hash = globalThis.location.hash.replace(/^#/, '');
  if (!hash.includes('access_token=')) return;

  const params = new URLSearchParams(hash);
  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');
  if (!access_token || !refresh_token) {
    throw new Error('Incomplete OAuth response from Google.');
  }

  const { data: { session: existing } } = await supabase.auth.getSession();
  if (existing) return;

  const { error } = await supabase.auth.setSession({ access_token, refresh_token });
  if (error) throw error;
}

function apiErrorMessage(err: ApiError, fallback: string): string {
  const data = err.response?.data;
  if (typeof data?.error === 'string' && data.error.length > 0) return data.error;
  return fallback;
}

/** In-flight guard: prevents concurrent duplicate initFromSession calls (e.g. React StrictMode). */
let initInFlight: Promise<void> | null = null;

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

function isMissingUserError(err: ApiError): boolean {
  return err?.response?.status === 404 && err?.response?.data?.error === 'User not found';
}

/** Handle known auth errors from initFromSession; returns true if handled. */
async function handleInitError(err: unknown, pendingRole: Role | null, setState: StoreSetter): Promise<boolean> {
  const apiErr = asApiError(err);
  const status = apiErr.response?.status;
  if (status === 404 && !isMissingUserError(apiErr)) {
    setState({
      isLoading: false,
      authError: 'Could not reach the server. Try again in a moment.',
      authRedirectTo: '/login',
    });
    return true;
  }
  if (isMissingUserError(apiErr)) {
    await supabase.auth.signOut();
    setState({ isLoading: false, authError: 'No account found. Please sign up first.', authRedirectTo: '/signup' });
    return true;
  }
  if (status === 403 && apiErr.response?.data?.error === 'ROLE_MISMATCH') {
    const actualRole: Role = apiErr.response.data.role ?? 'STUDENT';
    const label = actualRole === 'STUDENT' ? 'Student' : 'Adviser';
    await supabase.auth.signOut();
    setState({ isLoading: false, authError: `Account already registered as ${label}. Please sign in instead.`, authRedirectTo: '/login' });
    return true;
  }
  if (status === 401) {
    await supabase.auth.signOut();
    setState({
      isLoading: false,
      authError: 'Your session expired. Please sign in again.',
      authRedirectTo: '/login',
    });
    return true;
  }
  if (status === 500 || status === 503) {
    setState({
      isLoading: false,
      authError: apiErrorMessage(apiErr, 'Server error during sign-in. Please try again.'),
      authRedirectTo: '/login',
    });
    return true;
  }
  if (pendingRole) await supabase.auth.signOut();
  setState({
    isLoading: false,
    authError: apiErrorMessage(apiErr, 'Sign-in failed. Please try again.'),
    authRedirectTo: '/login',
  });
  return true;
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
        await loadUserGroup(set);
      } catch (err: unknown) {
        const apiErr = asApiError(err);
        if (isMissingUserError(apiErr)) {
          await supabase.auth.signOut();
          set({ authRedirectTo: '/signup', authError: 'No account found. Please sign up first.' });
        } else if (apiErr.response?.status === 401) {
          await supabase.auth.signOut();
          set({ authError: 'Your session expired. Please sign in again.' });
        } else {
          set({ authError: apiErrorMessage(apiErr, 'Sign-in failed. Please try again.') });
        }
      }
      return;
    }
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: oauthRedirectUrl() },
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
      } catch (err: unknown) {
        if (!isMissingUserError(asApiError(err))) {
          set({ authError: 'Sign-up failed. Please try again.' });
          return;
        }
        await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: oauthRedirectUrl(selectedRole) },
        });
      }
      return;
    }
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: oauthRedirectUrl(selectedRole) },
    });
  },

  initFromSession: async () => {
    // Deduplicate concurrent calls (React StrictMode fires effects twice in dev)
    if (initInFlight) return initInFlight;
    if (get().isAuthenticated) {
      set({ isLoading: false });
      return;
    }

    let resolve!: () => void;
    initInFlight = new Promise<void>((r) => { resolve = r; });
    set({ isLoading: true });

    try {
      await exchangeOAuthCodeIfPresent();
      await recoverSessionFromUrlHash();
    } catch (err: unknown) {
      set({
        isLoading: false,
        authError: err instanceof Error ? err.message : 'Could not complete Google sign-in.',
        authRedirectTo: '/login',
      });
      initInFlight = null;
      resolve();
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      set({ isLoading: false });
      initInFlight = null;
      resolve();
      return;
    }
    const pendingRole = pendingRoleFromOAuthRedirect();

    try {
      const res = await fetchUserProfile(session, pendingRole);
      const user: User = res.data.user;
      set({ user, isAuthenticated: true, isLoading: false, authError: null, authRedirectTo: '/login' });
      await loadUserGroup(set);
    } catch (err: unknown) {
      await handleInitError(err, pendingRole, set);
    } finally {
      if (get().isLoading) set({ isLoading: false });
    }
    initInFlight = null;
    resolve();
  },

  logout: async () => {
    await supabase.auth.signOut();
    initInFlight = null;
    set({ user: null, isAuthenticated: false, selectedRole: 'STUDENT', isLoading: false, groupId: null, authRedirectTo: '/login' });
  },
}));
