/**
 * Global provider composition for the MLaNDS application.
 *
 * The app combines multiple concerns here: theme management, authentication
 * gating, and shared in-memory application data. This is a good composition
 * pattern because each provider owns one responsibility while the rest of the UI
 * remains focused on rendering screens and interactions.
 */
'use client';

import type { ReactNode } from 'react';
import { ThemeProvider } from 'next-themes';
import { AppDataProvider } from '@/lib/store';
import { AuthGate } from '@/components/AuthGate';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
      <AuthGate>
        <AppDataProvider>{children}</AppDataProvider>
      </AuthGate>
    </ThemeProvider>
  );
}
