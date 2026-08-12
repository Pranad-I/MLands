/**
 * Root application layout for the MLaNDS dashboard.
 *
 * This file defines the global document shell, applies the brand metadata, and
 * mounts the shared providers for routing, theme state, and authentication. The
 * design keeps layout concerns separate from business logic so the user
 * interface remains maintainable and consistent across pages.
 */
import './globals.css';
import type { Metadata } from 'next';
import { Toaster } from '@/components/ui/sonner';
import { Providers } from '@/components/providers';

export const metadata: Metadata = {
  title: {
    default: 'MLaNDS — Intelligent Multi-Layer Network Defence System',
    template: '%s · MLaNDS',
  },
  description:
    'Monitor devices, review access requests, and respond to security alerts across your network in real time.',
  icons: {
    icon: '/SVG.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Loaded at runtime (not build time) so the build never depends on
            network access to Google Fonts. Falls back gracefully via the
            font stacks defined in globals.css if unavailable. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@100..900&family=Orbitron:wght@400;700;900&family=Audiowide&display=swap"
        />
      </head>
      <body className="font-sans antialiased bg-background text-foreground">
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
