'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, CheckCircle2, ShieldAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAppData } from '@/lib/store';

/**
 * NotificationBell replaces the old static bell icon (previously just an
 * <svg> with a hardcoded badge number) with a functional notification
 * centre: a live count of active alerts, a dropdown preview of them, and
 * quick actions to resolve one or all of them without leaving the current
 * page. It reads directly from the shared store (useAppData) so its
 * badge count and list always match the real current alert state,
 * wherever in the app it's rendered.
 *
 * This component is intentionally self-contained (owns its own open/
 * closed state and click-away handling) so any page's header can drop it
 * in without also having to manage a notifications-open flag itself.
 */
export function NotificationBell({ className = '' }: { className?: string }) {
  const { alerts, setAlertStatus, resolveAllAlerts } = useAppData();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  // Used by the click-away handler below to tell clicks inside this
  // component (the bell button + its dropdown) apart from clicks
  // anywhere else on the page.
  const wrapRef = useRef<HTMLDivElement | null>(null);

  // Active alerts are recalculated on every render directly from the
  // store rather than cached in local state — alerts is already the
  // single source of truth (from useAppData), so deriving `active` here
  // avoids a second, potentially-stale copy of the same information.
  const active = alerts.filter((a) => a.status === 'Active');

  // Closes the dropdown when the user clicks anywhere outside this
  // component. Registered once on mount and cleaned up on unmount, same
  // pattern as GlobalSearch's click-away handling.
  useEffect(() => {
    function onClickAway(event: MouseEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickAway);
    return () => document.removeEventListener('mousedown', onClickAway);
  }, []);

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <motion.button
        type="button"
        onClick={() => setOpen((v) => !v)}
        whileTap={{ scale: 0.9 }}
        aria-label={`Notifications (${active.length} active)`}
        className="relative flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
      >
        {/*
          The bell icon gently "rings" (a small rotate wiggle) on a loop
          only while there's at least one active alert, pausing for 4
          seconds between wiggles (repeatDelay) so it's a subtle ambient
          cue rather than a constantly-distracting animation. When there
          are no active alerts, rotate is fixed at 0 and the animation
          doesn't repeat, so the icon sits still.
        */}
        <motion.span
          animate={active.length > 0 ? { rotate: [0, -12, 10, -6, 0] } : { rotate: 0 }}
          transition={{ duration: 0.9, repeat: active.length > 0 ? Infinity : 0, repeatDelay: 4 }}
          className="inline-flex"
        >
          <Bell className="h-5 w-5" />
        </motion.span>
        {/*
          Red count badge, shown only when there's at least one active
          alert (AnimatePresence handles it mounting/unmounting with a
          scale animation rather than abruptly appearing/disappearing).
        */}
        <AnimatePresence>
          {active.length > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute right-0 top-0 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[7px] font-bold text-white"
            >
              {active.length}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="absolute right-0 top-10 z-50 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2 dark:border-slate-800">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Notifications</p>
              {/* "Resolve all" is only shown when there's something to
                  resolve — hiding it when active.length is 0 avoids
                  offering an action that would have no effect. */}
              {active.length > 0 && (
                <button
                  onClick={resolveAllAlerts}
                  className="text-[10px] font-semibold text-blue-600 hover:underline"
                >
                  Resolve all
                </button>
              )}
            </div>

            <div className="max-h-72 overflow-y-auto">
              {active.length === 0 ? (
                // Empty state: reassures the user there's nothing to act
                // on right now, rather than showing a blank dropdown that
                // could look broken.
                <div className="flex flex-col items-center gap-1 px-3 py-6 text-center">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  <p className="text-[11px] text-slate-400">You're all caught up.</p>
                </div>
              ) : (
                // Each active alert gets its own row with a per-item
                // "Resolve" button, so the user can clear individual
                // alerts without having to visit the full Alerts page or
                // resolve everything at once via "Resolve all" above.
                // The `i * 0.04` stagger delay makes rows appear in a
                // quick top-to-bottom cascade rather than all at once.
                active.map((a, i) => (
                  <motion.div
                    key={a.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="flex items-start gap-2 border-b border-slate-50 px-3 py-2.5 last:border-0 dark:border-slate-800"
                  >
                    {/* Icon colour reflects severity so the most urgent
                        alerts are visually distinguishable at a glance,
                        without the user needing to read every title. */}
                    <ShieldAlert
                      className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${
                        a.severity === 'Critical'
                          ? 'text-red-500'
                          : a.severity === 'Warning'
                            ? 'text-amber-500'
                            : 'text-blue-500'
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-slate-700 dark:text-slate-200">
                        {a.title}
                      </p>
                      <p className="truncate text-[10px] text-slate-400">
                        {a.device} · {a.timestamp}
                      </p>
                    </div>
                    <button
                      onClick={() => setAlertStatus(a.id, 'Resolved')}
                      className="shrink-0 rounded border border-slate-200 px-1.5 py-0.5 text-[9px] font-semibold text-slate-500 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                    >
                      Resolve
                    </button>
                  </motion.div>
                ))
              )}
            </div>

            {/* Footer link to the full Alerts page, for anything beyond
                the quick preview/actions this dropdown offers. Closes
                the dropdown before navigating so it doesn't stay open in
                the background on the destination page. */}
            <button
              onClick={() => {
                setOpen(false);
                router.push('/alerts');
              }}
              className="w-full border-t border-slate-100 px-3 py-2 text-[11px] font-semibold text-blue-600 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
            >
              View all alerts
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
