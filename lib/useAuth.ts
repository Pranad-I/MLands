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
  const [authReachable, setAuthReachable] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    let active = true;

    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!active) return;
        setSession(data.session ?? null);
      } catch {
        if (!active) return;
        setSession(null);
        setAuthReachable(false);
      } finally {
        if (active) setLoading(false);
      }
    })();

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

  return { session, user, loading, signOut, isSupabaseConfigured: isSupabaseConfigured && authReachable };
}
