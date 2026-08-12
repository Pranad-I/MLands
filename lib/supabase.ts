/**
 * Supabase client configuration and fallback behaviour for MLaNDS.
 *
 * This file keeps the project resilient when environment credentials are missing.
 * Instead of crashing, the app exposes a lightweight fallback client so the UI
 * can still load demo data and keep the experience usable during setup or
 * testing.
 */
import { createClient, type Session } from '@supabase/supabase-js';

function createFallbackQuery() {
  const query = {
    select: () => query,
    order: () => query,
    limit: () => query,
    then: (resolve: (value: { data: null; error: null }) => unknown) =>
      Promise.resolve({ data: null, error: null }).then(resolve),
  };

  return query;
}

const NOT_CONFIGURED_ERROR = {
  message: 'Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local to enable accounts.',
  name: 'SupabaseNotConfiguredError',
  status: 500,
} as const;

function createFallbackSupabase() {
  let listeners: Array<(event: string, session: Session | null) => void> = [];

  return {
    from: () => createFallbackQuery(),
    auth: {
      signUp: async () => ({ data: { user: null, session: null }, error: NOT_CONFIGURED_ERROR }),
      signInWithPassword: async () => ({ data: { user: null, session: null }, error: NOT_CONFIGURED_ERROR }),
      signOut: async () => ({ error: null }),
      resetPasswordForEmail: async () => ({ data: {}, error: NOT_CONFIGURED_ERROR }),
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange: (callback: (event: string, session: Session | null) => void) => {
        listeners.push(callback);
        return { data: { subscription: { unsubscribe: () => { listeners = listeners.filter((l) => l !== callback); } } } };
      },
    },
  };
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : createFallbackSupabase();

export type Device = {
  id: string;
  name: string;
  device_type: string;
  ip_address: string;
  mac_address: string;
  status: 'Approved' | 'Blocked' | 'Quarantined' | 'Unknown';
  risk_level: 'Low' | 'Medium' | 'High';
  first_seen: string;
  last_seen: string;
  data_usage_gb: number;
};

export type AccessLog = {
  id: string;
  device_name: string;
  device_ip: string;
  action: string;
  performed_by: string;
  details: string;
  created_at: string;
};

export type NetworkActivity = {
  id: string;
  hour_label: string;
  connections: number;
  approvals: number;
  blocks: number;
  quarantines: number;
  unknowns: number;
};

export type Profile = {
  id: string;
  full_name: string;
  email: string;
  accepted_terms: boolean;
  accepted_terms_at: string | null;
  created_at: string;
};
