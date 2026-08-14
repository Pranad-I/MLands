'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search, Menu, Download, Calendar, ChevronRight,
} from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { AdminMenu } from '@/components/AdminMenu';
import { NotificationBell } from '@/components/NotificationBell';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAppData, type EventType, type RiskLevel, type LogEntry } from '@/lib/store';
import { csvExportService } from '@/lib/services/csv-export-service';

const PAGE_SIZE = 7;

const eventBadge: Record<EventType, string> = {
  ALERT: 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400',
  WARNING: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
  INFO: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400',
};

const riskBadge: Record<RiskLevel, string> = {
  None: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
  Low: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
  Medium: 'bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400',
  High: 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400',
};

export function ActivityLogDashboard() {
  const { logs } = useAppData();
  const [collapsed, setCollapsed] = useState(false);
  const [query, setQuery] = useState('');
  const [eventFilter, setEventFilter] = useState<EventType | 'All'>('All');
  const [dateFilter, setDateFilter] = useState('');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    return logs.filter((l) => {
      const matchesEvent = eventFilter === 'All' || l.eventType === eventFilter;
      const q = query.trim().toLowerCase();
      const matchesQuery = !q
        || l.device.toLowerCase().includes(q)
        || l.ipAddress.includes(q)
        || l.details.toLowerCase().includes(q);
      return matchesEvent && matchesQuery;
    });
  }, [logs, query, eventFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const clampedPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((clampedPage - 1) * PAGE_SIZE, clampedPage * PAGE_SIZE);

  const pageNumbers = useMemo(() => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const nums = new Set([1, 2, 3, totalPages]);
    return Array.from(nums).sort((a, b) => a - b);
  }, [totalPages]);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5 py-3 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <button onClick={() => setCollapsed((v) => !v)} aria-label="Toggle sidebar" className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <Menu className="h-4 w-4 cursor-pointer" />
            </button>
            <h1 className="text-sm font-bold text-slate-700 dark:text-slate-200">Activity Log</h1>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <NotificationBell />
            <AdminMenu />
          </div>
        </header>

        <motion.main
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="flex-1 overflow-y-auto px-5 py-4"
        >
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex flex-1 items-center sm:flex-none">
                <Search className="absolute left-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setPage(1); }}
                  placeholder="Search logs..."
                  className="h-9 w-full min-w-[200px] rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-xs text-slate-600 outline-none placeholder:text-slate-400 focus:border-blue-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 sm:w-64"
                />
              </div>
              <select
                value={eventFilter}
                onChange={(e) => { setEventFilter(e.target.value as EventType | 'All'); setPage(1); }}
                className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-600 outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                <option value="All">All Events</option>
                <option value="ALERT">Alert</option>
                <option value="WARNING">Warning</option>
                <option value="INFO">Info</option>
              </select>
              <div className="relative flex items-center">
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="h-9 rounded-lg border border-slate-200 bg-white px-3 pr-8 text-xs text-slate-600 outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                />
                <Calendar className="pointer-events-none absolute right-2.5 h-3.5 w-3.5 text-slate-400" />
              </div>
              <button
                onClick={() => csvExportService.exportRows(
                  'activity-log',
                  ['Time', 'Event Type', 'Description', 'IP Address', 'Device', 'Risk Level'],
                  filtered.map((r) => [r.timestamp, r.eventType, r.details, r.ipAddress, r.device, r.risk]),
                )}
                className="ml-auto flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <Download className="h-3.5 w-3.5" /> Export
              </button>
            </div>

            <div className="stagger-rows overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              <div className="grid grid-cols-[0.8fr_0.8fr_1.8fr_1fr_1.2fr_0.8fr] gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2.5 text-[11px] font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400">
                <span>Time</span>
                <span>Event Type</span>
                <span>Description</span>
                <span>IP Address</span>
                <span>Device</span>
                <span>Risk Level</span>
              </div>
              {pageItems.length === 0 && (
                <div className="px-4 py-10 text-center text-xs text-slate-400">No log entries match your search or filters.</div>
              )}
              {pageItems.map((l) => (
                <div key={l.id} className="grid grid-cols-[0.8fr_0.8fr_1.8fr_1fr_1.2fr_0.8fr] items-center gap-2 border-b border-slate-50 px-4 py-3 text-xs last:border-b-0 hover:bg-slate-50/60 dark:border-slate-800/60 dark:hover:bg-slate-800/40">
                  <span className="text-slate-500 dark:text-slate-400">{l.timestamp}</span>
                  <span>
                    <span className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold ${eventBadge[l.eventType]}`}>{l.eventType}</span>
                  </span>
                  <span className="truncate text-slate-700 dark:text-slate-200">{l.details}</span>
                  <span className="text-slate-500 dark:text-slate-400">{l.ipAddress}</span>
                  <span className="truncate text-slate-500 dark:text-slate-400">{l.device}</span>
                  <span>
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${riskBadge[l.risk]}`}>{l.risk}</span>
                  </span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-400">
                Showing {filtered.length === 0 ? 0 : (clampedPage - 1) * PAGE_SIZE + 1} to {Math.min(clampedPage * PAGE_SIZE, filtered.length)} of {filtered.length} logs
              </p>
              <div className="flex items-center gap-1">
                {pageNumbers.map((p, i) => (
                  <span key={p} className="flex items-center">
                    {i > 0 && p - pageNumbers[i - 1] > 1 && <span className="px-1 text-xs text-slate-400">…</span>}
                    <button
                      onClick={() => setPage(p)}
                      className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-medium ${
                        p === clampedPage
                          ? 'bg-blue-600 text-white'
                          : 'border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400'
                      }`}
                    >
                      {p}
                    </button>
                  </span>
                ))}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={clampedPage >= totalPages}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </motion.main>
      </div>
    </div>
  );
}
