import axios from 'axios';
import { supabase } from '../lib/supabase';

/** API paths in this app already start with `/api/...`. */
function resolveApiBaseUrl(): string {
  const configured = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
  if (configured?.startsWith('http')) {
    // Strip trailing /api so paths like /api/auth/me do not become /api/api/auth/me.
    return configured.replace(/\/api\/?$/, '').replace(/\/$/, '');
  }
  if (import.meta.env.PROD) {
    // Production backend is deployed separately on Vercel.
    return 'https://synctrace-backend.vercel.app';
  }
  return 'http://localhost:4000';
}

export const api = axios.create({
  baseURL: resolveApiBaseUrl(),
  timeout: 30000,
});

// Attach fresh Supabase access token to every request
api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
});
