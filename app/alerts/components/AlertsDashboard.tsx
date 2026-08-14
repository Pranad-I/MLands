'use client';

import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Search, Menu, ShieldAlert, AlertTriangle, Info, CheckCircle2, HelpCircle, Filter, Download, Eye, Settings2, ChevronRight, Bell,
} from 'lucide-react';
import {
  CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { Sidebar } from '@/components/Sidebar';
import { AdminMenu } from '@/components/AdminMenu';
import { NotificationBell } from '@/components/NotificationBell';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAppData, type AlertType, type Severity, type SecurityAlert } from '@/lib/store';
import { deviceActionController } from '@/lib/services/device-action-controller';

const priorityLabel: Record<Severity, string> = { Critical: 'High', Warning: 'Medium', Info: 'Low' };
const priorityColor: Record<Severity, string> = {
  Critical: 'bg-red-50 text-red-600 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/30',
  Warning: 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30',
  Info: 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/30',
};
const severityIcon: Record<Severity, React.ElementType> = { Critical: ShieldAlert, Warning: AlertTriangle, Info: Info };
const severityDot: Record<Severity, string> = { Critical: '#dc2626', Warning: '#d97706', Info: '#2563eb' };

const alertTypes: AlertType[] = ['Multiple Failed Logins', 'New Device Detected', 'Unusual Data Transfer', 'Port Scan Detected', 'Malicious Traffic', 'Policy Violation'];

function StatCard({ label, value, sub, icon: Icon, bg, text }: {
  label: string; value: number; sub: string; icon: React.ElementType; bg: string; text: string;
}) {
  return (
    <div className={`hover-lift rounded-xl border p-4 ${bg}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
          <p className={`mt-1 text-2xl font-bold ${text}`}>{value}</p>
          <p className="mt-0.5 text-[11px] text-slate-400">{sub}</p>
        </div>
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg bg-white/60 dark:bg-slate-900/40 ${text}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

export function AlertsDashboard() {
  const { alerts, devices, setAlertStatus, resolveAllAlerts, updateDeviceStatus } = useAppData();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<'All' | 'High' | 'Medium' | 'Low' | 'Resolved'>('All');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [viewAlert, setViewAlert] = useState<SecurityAlert | null>(null);
  // statusFilter/filterOpen back the Filter button in the toolbar below.
  // Previously that button rendered with no onClick handler and no
  // backing state at all — visually present but entirely inert. These
  // two pieces of state make it a genuine control: statusFilter holds
  // the currently chosen status ('All' | 'Active' | 'Resolved') and
  // filterOpen tracks whether its dropdown menu is currently showing.
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Resolved'>('All');
  const [filterOpen, setFilterOpen] = useState(false);

  const counts = useMemo(() => ({
    all: alerts.length,
    high: alerts.filter((a) => a.severity === 'Critical').length,
    medium: alerts.filter((a) => a.severity === 'Warning').length,
    low: alerts.filter((a) => a.severity === 'Info').length,
    resolved: alerts.filter((a) => a.status === 'Resolved').length,
    unresolved: alerts.filter((a) => a.status === 'Active').length,
  }), [alerts]);

  const tabs = [
    { label: 'All', value: 'All' as const, count: counts.all },
    { label: 'High', value: 'High' as const, count: counts.high },
    { label: 'Medium', value: 'Medium' as const, count: counts.medium },
    { label: 'Low', value: 'Low' as const, count: counts.low },
    { label: 'Resolved', value: 'Resolved' as const, count: counts.resolved },
  ];

  // Combines three independent filters — the severity/resolved tab, the
  // free-text search box, and statusFilter — into the final list of
  // alerts shown and exported. matchesStatus (comparing against
  // statusFilter) is the piece that previously didn't exist: before this
  // fix, the Filter button had nothing wired to it, so this function
  // only ever considered tab and query, meaning the status filter had no
  // way to actually narrow the results even if the UI had implied it
  // could. All three conditions must hold (matchesTab && matchesQuery &&
  // matchesStatus) for an alert to appear.
  const filtered = useMemo(() => {
    return alerts.filter((a) => {
      const matchesTab = tab === 'All'
        || (tab === 'High' && a.severity === 'Critical')
        || (tab === 'Medium' && a.severity === 'Warning')
        || (tab === 'Low' && a.severity === 'Info')
        || (tab === 'Resolved' && a.status === 'Resolved');
      const q = query.trim().toLowerCase();
      const matchesQuery = !q || a.title.toLowerCase().includes(q) || a.device.toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'All' || a.status === statusFilter;
      return matchesTab && matchesQuery && matchesStatus;
    });
  }, [alerts, tab, query, statusFilter]);

  /**
   * Builds a CSV of the currently filtered alerts and triggers a browser
   * download. This function is the actual implementation behind the
   * Export button in the toolbar.
   *
   * Previously, the Export button's onClick was wired to
   * resolveAllAlerts (the same function used by the "Resolve all"
   * action elsewhere) rather than to any export logic — so clicking
   * "Export" silently marked every alert as resolved instead of
   * downloading anything. exportCsv() replaces that mis-wired handler
   * with a genuine CSV export, deliberately scoped to `filtered` (not
   * the full `alerts` array) so exporting respects whatever tab/search/
   * status filter the user currently has applied — exporting "what I'm
   * currently looking at" rather than always exporting everything
   * regardless of the active view.
   *
   * The CSV-building logic here duplicates what csvExportService.exportRows
   * already does elsewhere in the codebase (lib/services/csv-export-service.ts).
   * It was written inline as the minimal, targeted fix for the mis-wired
   * button described above, rather than refactored to call the shared
   * service — see the NOTE in csv-export-service.ts for more on this.
   */
  function exportCsv() {
    const rows = [
      ['Time', 'Title', 'Device', 'Type', 'Severity', 'Status'],
      ...filtered.map((a) => [a.timestamp, a.title, a.device, a.alertType, a.severity, a.status]),
    ];
    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `mlands-alerts-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filtered.length} alert${filtered.length === 1 ? '' : 's'}`);
  }

  const selected: SecurityAlert | null = useMemo(
    () => alerts.find((a) => a.id === selectedId)
      ?? alerts.find((a) => a.status === 'Active')
      ?? alerts[0]
      ?? null,
    [alerts, selectedId],
  );

  const recentAlerts = useMemo(() => [...alerts].sort((a, b) => a.minutesAgo - b.minutesAgo).slice(0, 5), [alerts]);

  const typeBreakdown = useMemo(() => {
    const total = alerts.length || 1;
    return alertTypes
      .map((t) => ({ type: t, count: alerts.filter((a) => a.alertType === t).length }))
      .filter((t) => t.count > 0)
      .sort((a, b) => b.count - a.count)
      .map((t) => ({ ...t, pct: Math.round((t.count / total) * 100) }));
  }, [alerts]);

  const trendData = useMemo(() => {
    const days = ['-6d', '-5d', '-4d', '-3d', '-2d', '-1d', 'Today'];
    return days.map((d, i) => {
      const jitter = (n: number) => Math.max(0, n + Math.round(Math.sin(i + n) * 2));
      return i === days.length - 1
        ? { day: d, High: counts.high, Medium: counts.medium, Low: counts.low, Resolved: counts.resolved }
        : { day: d, High: jitter(counts.high), Medium: jitter(counts.medium), Low: jitter(counts.low), Resolved: jitter(counts.resolved) };
    });
  }, [counts]);

  const donutData = [
    { name: 'High Priority', value: counts.high, color: '#dc2626' },
    { name: 'Medium Priority', value: counts.medium, color: '#d97706' },
    { name: 'Low Priority', value: counts.low, color: '#eab308' },
    { name: 'Resolved', value: counts.resolved, color: '#16a34a' },
  ].filter((d) => d.value > 0);

  function handleAcknowledge() {
    if (!selected) return;
    setAlertStatus(selected.id, 'Dismissed');
    toast.success('Alert acknowledged');
  }
  function handleResolve() {
    if (!selected) return;
    setAlertStatus(selected.id, 'Resolved');
    toast.success('Alert marked as resolved');
  }
  function handleBlockDevice() {
    if (!selected) return;
    const device = deviceActionController.findDeviceForAlert(selected, devices);
    if (!device) { toast.error('No matching managed device found'); return; }
    updateDeviceStatus(device.id, 'Blocked');
    toast.success(`${device.name} blocked`);
  }
  function handleQuarantineDevice() {
    if (!selected) return;
    const device = deviceActionController.findDeviceForAlert(selected, devices);
    if (!device) { toast.error('No matching managed device found'); return; }
    updateDeviceStatus(device.id, 'Quarantined');
    toast.success(`${device.name} quarantined`);
  }

  const actionRows = [
    { label: 'Acknowledge Alert', desc: 'Mark an alert as acknowledged', icon: CheckCircle2, color: 'text-blue-600 bg-blue-50 dark:bg-blue-500/10 dark:text-blue-400', onClick: handleAcknowledge },
    { label: 'Resolve Alert', desc: 'Mark an alert as resolved', icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400', onClick: handleResolve },
    { label: 'Block Device', desc: 'Block device from accessing the network', icon: ShieldAlert, color: 'text-red-600 bg-red-50 dark:bg-red-500/10 dark:text-red-400', onClick: handleBlockDevice },
    { label: 'Quarantine Device', desc: 'Move device to quarantine', icon: AlertTriangle, color: 'text-amber-600 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400', onClick: handleQuarantineDevice },
    { label: 'View Alert Logs', desc: 'View all alert logs and history', icon: HelpCircle, color: 'text-purple-600 bg-purple-50 dark:bg-purple-500/10 dark:text-purple-400', onClick: () => router.push('/activity-log') },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5 py-3 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <button onClick={() => setCollapsed((v) => !v)} aria-label="Toggle sidebar" className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <Menu className="h-4 w-4 cursor-pointer" />
            </button>
            <h1 className="text-sm font-bold text-slate-700 dark:text-slate-200">Alerts</h1>
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
            <div className="stagger-children grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
              <StatCard label="Total Alerts (Today)" value={counts.all} sub="+16% vs yesterday" icon={Bell} bg="border-blue-100 bg-blue-50/60 dark:border-blue-500/20 dark:bg-blue-500/5" text="text-blue-600 dark:text-blue-400" />
              <StatCard label="High Priority" value={counts.high} sub={`${counts.all ? Math.round((counts.high / counts.all) * 100) : 0}%`} icon={ShieldAlert} bg="border-red-100 bg-red-50/60 dark:border-red-500/20 dark:bg-red-500/5" text="text-red-600 dark:text-red-400" />
              <StatCard label="Medium Priority" value={counts.medium} sub={`${counts.all ? Math.round((counts.medium / counts.all) * 100) : 0}%`} icon={AlertTriangle} bg="border-amber-100 bg-amber-50/60 dark:border-amber-500/20 dark:bg-amber-500/5" text="text-amber-600 dark:text-amber-400" />
              <StatCard label="Low Priority" value={counts.low} sub={`${counts.all ? Math.round((counts.low / counts.all) * 100) : 0}%`} icon={Info} bg="border-yellow-100 bg-yellow-50/60 dark:border-yellow-500/20 dark:bg-yellow-500/5" text="text-yellow-600 dark:text-yellow-400" />
              <StatCard label="Resolved (Today)" value={counts.resolved} sub="+20% vs yesterday" icon={CheckCircle2} bg="border-emerald-100 bg-emerald-50/60 dark:border-emerald-500/20 dark:bg-emerald-500/5" text="text-emerald-600 dark:text-emerald-400" />
              <StatCard label="Unresolved" value={counts.unresolved} sub={`${counts.all ? Math.round((counts.unresolved / counts.all) * 100) : 0}%`} icon={HelpCircle} bg="border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50" text="text-slate-600 dark:text-slate-400" />
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.7fr_1fr]">
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 p-4 dark:border-slate-800">
                  <div className="flex flex-wrap gap-1.5">
                    {tabs.map((t) => (
                      <button
                        key={t.value}
                        onClick={() => setTab(t.value)}
                        className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                          tab === t.value
                            ? 'border-blue-600 bg-blue-600 text-white'
                            : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800'
                        }`}
                      >
                        {t.label} ({t.count})
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative flex items-center">
                      <Search className="absolute left-2.5 h-3.5 w-3.5 text-slate-400" />
                      <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search alerts..."
                        className="h-8 w-40 rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-3 text-xs text-slate-600 outline-none placeholder:text-slate-400 focus:border-blue-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                      />
                    </div>
                    {/*
                      Filter button + dropdown: the button itself changes
                      colour (filled blue vs. plain outline) depending on
                      whether statusFilter is anything other than 'All',
                      giving a visual cue that a filter is currently
                      active even when the dropdown itself is closed.
                      Clicking an option sets statusFilter and closes the
                      dropdown in the same click, rather than requiring a
                      separate "apply" step. 'Active' is displayed to the
                      user as "Unresolved" (clearer wording for this
                      context) while the underlying value stored in
                      statusFilter stays 'Active' to match the Alert
                      type's actual status field.
                    */}
                    <div className="relative">
                      <button
                        onClick={() => setFilterOpen((v) => !v)}
                        title="Filter by status"
                        className={`flex h-8 items-center gap-1 rounded-lg border px-2.5 text-xs transition-colors ${
                          statusFilter === 'All'
                            ? 'border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800'
                            : 'border-blue-600 bg-blue-600 text-white'
                        }`}
                      >
                        <Filter className="h-3.5 w-3.5" />
                      </button>
                      <AnimatePresence>
                        {filterOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: -6, scale: 0.97 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -6, scale: 0.97 }}
                            transition={{ duration: 0.15 }}
                            className="absolute right-0 top-9 z-40 w-36 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900"
                          >
                            {(['All', 'Active', 'Resolved'] as const).map((option) => (
                              <button
                                key={option}
                                onClick={() => {
                                  setStatusFilter(option);
                                  setFilterOpen(false);
                                }}
                                className={`block w-full px-3 py-1.5 text-left text-xs transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 ${
                                  statusFilter === option
                                    ? 'font-semibold text-blue-600'
                                    : 'text-slate-600 dark:text-slate-300'
                                }`}
                              >
                                {option === 'Active' ? 'Unresolved' : option}
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <button
                      onClick={exportCsv}
                      className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 text-xs font-medium text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                    >
                      <Download className="h-3.5 w-3.5" /> Export
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-[0.8fr_1.4fr_1fr_0.6fr_0.8fr_0.6fr] gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2 text-[11px] font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400">
                  <span>Time</span>
                  <span>Device / Type</span>
                  <span>Description</span>
                  <span>Priority</span>
                  <span>Status</span>
                  <span className="text-right">Actions</span>
                </div>
                {filtered.length === 0 && (
                  <div className="px-4 py-10 text-center text-xs text-slate-400">No alerts match your search or filter.</div>
                )}
                {filtered.map((a) => {
                  const Icon = severityIcon[a.severity];
                  return (
                    <div
                      key={a.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedId(a.id)}
                      onKeyDown={(e) => { if (e.key === 'Enter') setSelectedId(a.id); }}
                      className={`grid w-full cursor-pointer grid-cols-[0.8fr_1.4fr_1fr_0.6fr_0.8fr_0.6fr] items-center gap-2 border-b border-slate-50 px-4 py-3 text-left text-xs last:border-b-0 hover:bg-slate-50/60 dark:border-slate-800/60 dark:hover:bg-slate-800/40 ${selected?.id === a.id ? 'bg-blue-50/60 dark:bg-blue-500/5' : ''}`}
                    >
                      <span className="text-slate-400">{a.timestamp.split(' ').slice(-2).join(' ')}</span>
                      <span className="flex min-w-0 items-center gap-1.5">
                        <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: severityDot[a.severity] }} />
                        <span className="truncate font-medium text-slate-700 dark:text-slate-200">{a.title}</span>
                      </span>
                      <span className="truncate text-slate-500 dark:text-slate-400">{a.description}</span>
                      <span><span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium ${priorityColor[a.severity]}`}>{priorityLabel[a.severity]}</span></span>
                      <span className={a.status === 'Active' ? 'text-red-500' : 'text-emerald-600'}>{a.status === 'Active' ? 'Unresolved' : 'Resolved'}</span>
                      <span className="flex justify-end gap-1.5">
                        <button
                          onClick={(e) => { e.stopPropagation(); setViewAlert(a); }}
                          className="flex h-6 w-6 items-center justify-center rounded-md border border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-400"
                          title="View details"
                        >
                          <Eye className="h-3 w-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setAlertStatus(a.id, a.status === 'Active' ? 'Resolved' : 'Active');
                            toast.success(a.status === 'Active' ? 'Alert resolved' : 'Alert reopened');
                          }}
                          className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          title={a.status === 'Active' ? 'Quick resolve' : 'Reopen alert'}
                        >
                          <Settings2 className="h-3 w-3" />
                        </button>
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-col gap-4">
                <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                  <h2 className="mb-2 text-sm font-bold text-slate-700 dark:text-slate-200">Alerts Overview (Today)</h2>
                  <div className="relative flex items-center justify-center">
                    <div className="h-[150px] w-[150px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={donutData} dataKey="value" nameKey="name" innerRadius={44} outerRadius={68} paddingAngle={2} startAngle={90} endAngle={-270}>
                            {donutData.map((d) => <Cell key={d.name} fill={d.color} />)}
                          </Pie>
                          <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="pointer-events-none absolute flex flex-col items-center">
                      <span className="text-xl font-bold text-slate-800 dark:text-slate-100">{counts.all}</span>
                      <span className="text-[10px] text-slate-400">Total Alerts</span>
                    </div>
                  </div>
                  <div className="mt-2 space-y-1.5">
                    {donutData.map((d) => (
                      <div key={d.name} className="flex items-center justify-between text-[11px]">
                        <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} />{d.name}</span>
                        <span className="font-medium text-slate-600 dark:text-slate-300">{d.value} ({counts.all ? Math.round((d.value / counts.all) * 100) : 0}%)</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                  <h2 className="mb-3 text-sm font-bold text-slate-700 dark:text-slate-200">Alerts by Type (Today)</h2>
                  <div className="space-y-2.5">
                    {typeBreakdown.map((t) => (
                      <div key={t.type}>
                        <div className="mb-1 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                          <span>{t.type}</span>
                          <span className="font-medium text-slate-600 dark:text-slate-300">{t.count} ({t.pct}%)</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                          <div className="h-full rounded-full bg-blue-500" style={{ width: `${t.pct}%` }} />
                        </div>
                      </div>
                    ))}
                    {typeBreakdown.length === 0 && <p className="text-center text-xs text-slate-400">No alerts yet.</p>}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <h2 className="mb-3 text-sm font-bold text-slate-700 dark:text-slate-200">Recent Alerts</h2>
                <div className="space-y-3">
                  {recentAlerts.map((a) => {
                    const Icon = severityIcon[a.severity];
                    return (
                      <div key={a.id} className="flex items-center gap-2.5 text-xs">
                        <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: severityDot[a.severity] }} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-slate-700 dark:text-slate-200">{a.title}</p>
                          <p className="truncate text-[11px] text-slate-400">{a.device}</p>
                        </div>
                        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium ${priorityColor[a.severity]}`}>{priorityLabel[a.severity]}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <h2 className="mb-3 text-sm font-bold text-slate-700 dark:text-slate-200">Alerts Trend (Last 7 Days)</h2>
                <div className="h-[180px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={20} allowDecimals={false} />
                      <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 11 }} />
                      <Line type="monotone" dataKey="High" stroke="#dc2626" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="Medium" stroke="#d97706" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="Low" stroke="#eab308" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="Resolved" stroke="#16a34a" strokeWidth={2} dot={false} />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <h2 className="mb-2 text-sm font-bold text-slate-700 dark:text-slate-200">Alert Actions</h2>
                {selected && (
                  <p className="mb-2 truncate text-[11px] text-slate-400">Acting on: <span className="font-medium text-slate-500 dark:text-slate-300">{selected.title}</span></p>
                )}
                <div className="space-y-1">
                  {actionRows.map((row) => (
                    <button
                      key={row.label}
                      onClick={row.onClick}
                      className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60"
                    >
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${row.color}`}>
                        <row.icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-slate-700 dark:text-slate-200">{row.label}</p>
                        <p className="truncate text-[10px] text-slate-400">{row.desc}</p>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 dark:border-blue-500/20 dark:bg-blue-500/10">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Alerts help you identify and respond to potential security threats in real time. Configure alert settings on the Settings page.
              </p>
            </div>
          </div>
        </motion.main>
      </div>

      {viewAlert && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-900/40 px-4" onClick={() => setViewAlert(null)}>
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">Alert Details</h2>
              <button onClick={() => setViewAlert(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">✕</button>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-slate-400">Title</span><span className="text-right font-medium text-slate-700 dark:text-slate-200">{viewAlert.title}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Device</span><span className="text-right font-medium text-slate-700 dark:text-slate-200">{viewAlert.device}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Type</span><span className="font-medium text-slate-700 dark:text-slate-200">{viewAlert.alertType}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Priority</span><span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${priorityColor[viewAlert.severity]}`}>{priorityLabel[viewAlert.severity]}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Status</span><span className={viewAlert.status === 'Active' ? 'font-medium text-red-500' : 'font-medium text-emerald-600'}>{viewAlert.status === 'Active' ? 'Unresolved' : viewAlert.status}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Timestamp</span><span className="font-medium text-slate-700 dark:text-slate-200">{viewAlert.timestamp}</span></div>
              <div className="border-t border-slate-100 pt-2 text-slate-600 dark:border-slate-800 dark:text-slate-300">{viewAlert.description}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
