/**
 * Authentication hook for the MLaNDS app.
 *
 * This hook wraps Supabase session state so the rest of the application can
 * access a predictable `session`, `user`, and `loading` state. The logic is
 * intentionally small and reusable, which keeps route protection and account UI
 * simple while still supporting real authentication when configured.
 */
'use client';

import { useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from './supabase';

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session ?? null);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession ?? null);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    setSession(null);
  }

  const user: User | null = (session?.user as User | undefined) ?? null;

  return { session, user, loading, signOut, isSupabaseConfigured };
}
