'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import {
  Search, Menu, RefreshCw, Eye, Settings2, Check, Ban, X, Monitor, Smartphone, Laptop, Tv, Printer, HelpCircle, ChevronRight,
} from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { AdminMenu } from '@/components/AdminMenu';
import { NotificationBell } from '@/components/NotificationBell';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAppData, type DeviceType, type DeviceStatus, type RiskLevel, type Device } from '@/lib/store';

const PAGE_SIZE = 8;

const deviceIcon: Record<DeviceType, React.ElementType> = {
  phone: Smartphone, laptop: Laptop, computer: Monitor, tv: Tv, printer: Printer, other: HelpCircle,
};

const riskStyles: Record<RiskLevel, string> = {
  None: 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30',
  Low: 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30',
  Medium: 'bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/30',
  High: 'bg-red-50 text-red-600 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/30',
};

// Known/Unknown badge, derived from the richer internal status
function statusBadge(status: DeviceStatus) {
  if (status === 'Approved') return { label: 'Known', className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30' };
  if (status === 'Blocked') return { label: 'Blocked', className: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-700/40 dark:text-slate-300 dark:border-slate-600' };
  if (status === 'Quarantined') return { label: 'Quarantined', className: 'bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/30' };
  return { label: 'Unknown', className: 'bg-red-50 text-red-600 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/30' };
}

export function DevicesDashboard() {
  const { devices, updateDeviceStatus, scanNetwork } = useAppData();
  const searchParams = useSearchParams();
  const [collapsed, setCollapsed] = useState(false);
  // query's initial value is read from the ?q= URL parameter (falling
  // back to an empty string if absent). This is what makes GlobalSearch's
  // "jump to Devices with this search term" links actually work — when
  // GlobalSearch navigates to e.g. /devices?q=printer, this line picks
  // that value up on mount so the local search box here starts already
  // filtered, instead of landing on an unfiltered device list and
  // forcing the user to retype their search. Once mounted, query behaves
  // as ordinary local state (searchParams is only consulted for this one
  // initial value, not re-read on every render).
  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  const [statusFilter, setStatusFilter] = useState<DeviceStatus | 'All'>('All');
  const [riskFilter, setRiskFilter] = useState<RiskLevel | 'All'>('All');
  const [page, setPage] = useState(1);
  const [scanning, setScanning] = useState(false);
  const [viewDevice, setViewDevice] = useState<Device | null>(null);
  const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return devices.filter((d) => {
      const matchesStatus = statusFilter === 'All' || d.status === statusFilter;
      const matchesRisk = riskFilter === 'All' || d.risk === riskFilter;
      const q = query.trim().toLowerCase();
      const matchesQuery = !q
        || d.name.toLowerCase().includes(q)
        || d.ipAddress.includes(q)
        || d.macAddress.toLowerCase().includes(q);
      return matchesStatus && matchesRisk && matchesQuery;
    });
  }, [devices, statusFilter, riskFilter, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const clampedPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((clampedPage - 1) * PAGE_SIZE, clampedPage * PAGE_SIZE);

  function handleScan() {
    setScanning(true);
    setTimeout(() => {
      const found = scanNetwork();
      setScanning(false);
      if (found) {
        toast.success('Network scan complete', {
          description: `Discovered a new device: ${found.name} (${found.ipAddress}).`,
        });
      }
    }, 1200);
  }

  function approve(id: string) {
    updateDeviceStatus(id, 'Approved');
    setMenuOpenFor(null);
    toast.success('Device approved');
  }

  function block(id: string) {
    updateDeviceStatus(id, 'Blocked');
    setMenuOpenFor(null);
    toast.success('Device blocked');
  }

  function quarantine(id: string) {
    updateDeviceStatus(id, 'Quarantined');
    setMenuOpenFor(null);
    toast.success('Device quarantined');
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5 py-3 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <button onClick={() => setCollapsed((v) => !v)} aria-label="Toggle sidebar" className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <Menu className="h-4 w-4 cursor-pointer" />
            </button>
            <h1 className="text-sm font-bold text-slate-700 dark:text-slate-200">Devices</h1>
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
                  placeholder="Search devices..."
                  className="h-9 w-full min-w-[200px] rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-xs text-slate-600 outline-none placeholder:text-slate-400 focus:border-blue-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 sm:w-64"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value as DeviceStatus | 'All'); setPage(1); }}
                className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-600 outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                <option value="All">All Statuses</option>
                <option value="Approved">Known</option>
                <option value="Unknown">Unknown</option>
                <option value="Blocked">Blocked</option>
                <option value="Quarantined">Quarantined</option>
              </select>
              <select
                value={riskFilter}
                onChange={(e) => { setRiskFilter(e.target.value as RiskLevel | 'All'); setPage(1); }}
                className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-600 outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                <option value="All">All Risk Levels</option>
                <option value="None">None</option>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
              <button
                onClick={handleScan}
                disabled={scanning}
                className="ml-auto flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 text-xs font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${scanning ? 'animate-spin' : ''}`} />
                {scanning ? 'Scanning…' : 'Scan Network'}
              </button>
            </div>

            <div className="stagger-rows overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              <div className="grid grid-cols-[1.4fr_1fr_1.2fr_0.8fr_0.9fr_0.8fr] gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2.5 text-[11px] font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400">
                <span>Device Name</span>
                <span>IP Address</span>
                <span>MAC Address</span>
                <span>Risk Level</span>
                <span>Status</span>
                <span className="text-right">Actions</span>
              </div>
              {pageItems.length === 0 && (
                <div className="px-4 py-10 text-center text-xs text-slate-400">No devices match your search or filters.</div>
              )}
              {pageItems.map((d) => {
                const Icon = deviceIcon[d.type];
                const badge = statusBadge(d.status);
                return (
                  <div key={d.id} className="grid grid-cols-[1.4fr_1fr_1.2fr_0.8fr_0.9fr_0.8fr] items-center gap-2 border-b border-slate-50 px-4 py-3 text-xs last:border-b-0 hover:bg-slate-50/60 dark:border-slate-800/60 dark:hover:bg-slate-800/40">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
                        <Icon className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                      </div>
                      <span className="truncate font-medium text-slate-700 dark:text-slate-200">{d.name}</span>
                    </div>
                    <span className="text-slate-500 dark:text-slate-400">{d.ipAddress}</span>
                    <span className="truncate text-slate-500 dark:text-slate-400">{d.macAddress}</span>
                    <span>
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium ${riskStyles[d.risk]}`}>{d.risk}</span>
                    </span>
                    <span>
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium ${badge.className}`}>{badge.label}</span>
                    </span>
                    <span className="relative flex justify-end gap-1.5">
                      <button
                        onClick={() => setViewDevice(d)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-400"
                        title="View details"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      {d.status === 'Unknown' ? (
                        d.risk === 'High' ? (
                          <button onClick={() => block(d.id)} className="flex h-7 w-7 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400" title="Block device">
                            <Ban className="h-3.5 w-3.5" />
                          </button>
                        ) : (
                          <button onClick={() => approve(d.id)} className="flex h-7 w-7 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400" title="Approve device">
                            <Check className="h-3.5 w-3.5" />
                          </button>
                        )
                      ) : (
                        <button
                          onClick={() => setMenuOpenFor(menuOpenFor === d.id ? null : d.id)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          title="Manage device"
                        >
                          <Settings2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {menuOpenFor === d.id && (
                        <div className="absolute right-0 top-8 z-10 w-40 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
                          <button onClick={() => quarantine(d.id)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700">
                            Quarantine
                          </button>
                          <button onClick={() => block(d.id)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10">
                            Block
                          </button>
                        </div>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-400">
                Showing {filtered.length === 0 ? 0 : (clampedPage - 1) * PAGE_SIZE + 1} to {Math.min(clampedPage * PAGE_SIZE, filtered.length)} of {filtered.length} devices
              </p>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-medium ${
                      p === clampedPage
                        ? 'bg-blue-600 text-white'
                        : 'border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400'
                    }`}
                  >
                    {p}
                  </button>
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

      {viewDevice && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-900/40 px-4" onClick={() => setViewDevice(null)}>
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">Device Details</h2>
              <button onClick={() => setViewDevice(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-slate-400">Name</span><span className="font-medium text-slate-700 dark:text-slate-200">{viewDevice.name}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">IP Address</span><span className="font-medium text-slate-700 dark:text-slate-200">{viewDevice.ipAddress}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">MAC Address</span><span className="font-medium text-slate-700 dark:text-slate-200">{viewDevice.macAddress}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Risk Level</span><span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${riskStyles[viewDevice.risk]}`}>{viewDevice.risk}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Status</span><span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${statusBadge(viewDevice.status).className}`}>{statusBadge(viewDevice.status).label}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Data Usage</span><span className="font-medium text-slate-700 dark:text-slate-200">{viewDevice.dataUsageGb} GB</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Last Seen</span><span className="font-medium text-slate-700 dark:text-slate-200">{viewDevice.lastSeen}</span></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
