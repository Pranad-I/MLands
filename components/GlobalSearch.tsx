'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, Monitor, ShieldAlert, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAppData } from '@/lib/store';

/**
 * GlobalSearch is a header search box with a live dropdown of results,
 * used on the Dashboard and About pages (the pages that don't already
 * have their own page-specific search/filter box). As the user types, it
 * simultaneously searches three different kinds of data — devices,
 * alerts, and static page names — and groups the matches by type in the
 * dropdown, since these are conceptually different kinds of results a
 * user might be looking for from one search box.
 *
 * Not every dashboard page uses this component: pages like Access
 * Control and Access Requests have their own local search state that
 * filters an on-page table directly (a different, page-specific
 * behaviour), so GlobalSearch is reserved for pages that need a general
 * "find anything" entry point rather than an in-place table filter.
 */

type GlobalSearchProps = {
  placeholder?: string;
  className?: string;
};

// Static list of page destinations GlobalSearch can jump to directly.
// Defined as plain data outside the component (rather than, say, derived
// from systemMetadataService's nav items) because this is a fixed list of
// jump targets for search purposes specifically, independent of whatever
// the sidebar happens to show.
const pageShortcuts = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Devices', href: '/devices' },
  { label: 'Access Requests', href: '/access-requests' },
  { label: 'Access Control', href: '/access-control' },
  { label: 'Activity Logs', href: '/activity-log' },
  { label: 'Quarantine', href: '/quarantine' },
  { label: 'Alerts', href: '/alerts' },
  { label: 'Settings', href: '/settings' },
  { label: 'About', href: '/about' },
];

export function GlobalSearch({ placeholder = 'Search devices...', className = '' }: GlobalSearchProps) {
  const { devices, alerts } = useAppData();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  // wrapRef lets the click-away handler below check whether a click landed
  // inside this component (input + dropdown) or genuinely outside it, so
  // the dropdown can be closed on outside clicks without also closing
  // itself the moment the user clicks a result inside it.
  const wrapRef = useRef<HTMLDivElement | null>(null);

  // Registers a document-wide mousedown listener once on mount to detect
  // clicks outside this component and close the dropdown. Using
  // mousedown (rather than click) means the dropdown closes as soon as
  // the outside press begins, matching how most native dropdown/menu
  // UIs behave. The listener is removed on unmount to avoid leaking a
  // document-level handler if this component is removed from the page.
  useEffect(() => {
    function onClickAway(event: MouseEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickAway);
    return () => document.removeEventListener('mousedown', onClickAway);
  }, []);

  // Normalised (trimmed, lowercased) query used for all matching below,
  // computed once per render rather than repeating query.trim().toLowerCase()
  // inside every filter callback.
  const q = query.trim().toLowerCase();

  // Recomputes the three result buckets only when the query or underlying
  // data actually changes (useMemo), rather than on every render — this
  // component re-renders on every keystroke via setQuery, so without
  // memoisation the three .filter() passes below would otherwise re-run
  // even on renders where neither the query nor the data changed (e.g. a
  // parent re-render).
  const results = useMemo(() => {
    if (!q) return { devices: [], alerts: [], pages: [] };
    return {
      // Devices are matched against a combined string of several fields
      // (name, IP, MAC, status) so a search for "192.168" or "quarantined"
      // works just as well as searching by device name.
      devices: devices
        .filter((d) => `${d.name} ${d.ipAddress} ${d.macAddress} ${d.status}`.toLowerCase().includes(q))
        .slice(0, 4),
      alerts: alerts.filter((a) => `${a.title} ${a.device}`.toLowerCase().includes(q)).slice(0, 3),
      pages: pageShortcuts.filter((p) => p.label.toLowerCase().includes(q)).slice(0, 3),
    };
  }, [q, devices, alerts]);

  // Each result bucket is capped (.slice(0, 4) / .slice(0, 3) above) so
  // the dropdown never grows unbounded for a broad query — this is a
  // "quick jump" affordance, not a full search-results page, so showing
  // only the first few matches per category keeps it usable.
  const empty = !results.devices.length && !results.alerts.length && !results.pages.length;

  // Centralises what happens when any result (device, alert, or page) is
  // selected: close the dropdown, clear the query so the box is ready for
  // a fresh search next time it's opened, and navigate. Defined once here
  // rather than repeating these three steps in every onClick handler below.
  function go(href: string) {
    setOpen(false);
    setQuery('');
    router.push(href);
  }

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          // Submitting the form directly (e.g. pressing Enter) sends the
          // user to the Devices page with their raw query in the ?q=
          // parameter, where DevicesDashboard reads it back out to
          // pre-fill its own local search box. This gives a sensible
          // "just search everything on Devices" fallback for a query
          // that doesn't exactly match anything in the dropdown's three
          // buckets above.
          if (q) go(`/devices?q=${encodeURIComponent(query.trim())}`);
        }}
        className="relative flex items-center"
      >
        <Search className="absolute left-2.5 h-3.5 w-3.5 text-slate-400" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          aria-label="Search"
          className="h-8 w-48 rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-3 text-xs text-slate-600 outline-none transition-all duration-200 placeholder:text-slate-400 focus:w-60 focus:border-blue-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
        />
      </form>

      {/*
        Dropdown only renders while open is true AND there's a non-empty
        query — an empty query would otherwise show an empty-looking
        dropdown with nothing useful in it. AnimatePresence handles the
        exit animation when either condition flips back to false.

        Results are grouped into three labelled sections (Devices, Alerts,
        Pages) rather than one flat list, since mixing device names with
        alert titles and page names in a single unlabelled list would make
        it hard for the user to tell what kind of result they're looking
        at. Each section header is only rendered when that bucket has at
        least one match, so an empty category doesn't show a heading with
        nothing underneath it.
      */}
      <AnimatePresence>
        {open && q ? (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="absolute right-0 top-10 z-50 w-72 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900"
          >
            {empty ? (
              <p className="px-3 py-4 text-center text-[11px] text-slate-400">
                No matches for “{query.trim()}”
              </p>
            ) : (
              <div className="max-h-80 overflow-y-auto py-1">
                {results.devices.length > 0 && (
                  <p className="px-3 pb-1 pt-2 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                    Devices
                  </p>
                )}
                {results.devices.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => go(`/devices?q=${encodeURIComponent(d.name)}`)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <Monitor className="h-3.5 w-3.5 shrink-0 text-blue-500" />
                    <span className="min-w-0 flex-1 truncate text-xs text-slate-700 dark:text-slate-200">
                      {d.name}
                    </span>
                    <span className="text-[10px] text-slate-400">{d.ipAddress}</span>
                  </button>
                ))}

                {results.alerts.length > 0 && (
                  <p className="px-3 pb-1 pt-2 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                    Alerts
                  </p>
                )}
                {results.alerts.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => go('/alerts')}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                    <span className="min-w-0 flex-1 truncate text-xs text-slate-700 dark:text-slate-200">
                      {a.title}
                    </span>
                  </button>
                ))}

                {results.pages.length > 0 && (
                  <p className="px-3 pb-1 pt-2 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                    Pages
                  </p>
                )}
                {results.pages.map((p) => (
                  <button
                    key={p.href}
                    onClick={() => go(p.href)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <span className="text-xs text-slate-700 dark:text-slate-200">{p.label}</span>
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
