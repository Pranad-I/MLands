/**
 * Route protection for the MLaNDS application.
 *
 * This component enforces the sign-in flow by redirecting unauthenticated users
 * away from protected pages and preventing authenticated users from revisiting
 * the public login/signup screens. It also provides a graceful fallback when the
 * Supabase environment is not configured so the demo remains usable out of the
 * box.
 */
'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2, Shield } from 'lucide-react';
import { useAuth } from '@/lib/useAuth';

const PUBLIC_ROUTES = ['/login', '/signup'];

export function AuthGate({ children }: { children: ReactNode }) {
  const { session, loading, isSupabaseConfigured } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [redirecting, setRedirecting] = useState(false);

  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

  useEffect(() => {
    if (loading || !isSupabaseConfigured) return;

    if (!session && !isPublicRoute) {
      setRedirecting(true);
      router.replace('/login');
      return;
    }
    if (session && isPublicRoute) {
      setRedirecting(true);
      router.replace('/dashboard');
      return;
    }
    setRedirecting(false);
  }, [loading, session, isPublicRoute, isSupabaseConfigured, router]);

  // While Supabase isn't configured, let the demo run freely on local sample data.
  if (!isSupabaseConfigured) return <>{children}</>;

  if (loading || redirecting) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center">
            <Shield className="h-6 w-6 text-blue-400" />
            <Loader2 className="absolute h-10 w-10 animate-spin text-blue-500/40" />
          </div>
          <p className="text-xs text-slate-400">Checking your session…</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
