import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // PKCE exchange is handled explicitly in authStore.initFromSession to avoid
    // racing with detectSessionInUrl (which causes "code already redeemed" errors).
    detectSessionInUrl: false,
    persistSession: true,
    autoRefreshToken: true,
    flowType: 'pkce',
  },
});
