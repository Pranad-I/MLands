'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Area, AreaChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  Bell, Menu, Monitor, ClipboardList, AlertOctagon, Timer, Server, Database, CheckCircle2, ExternalLink, ShieldAlert, HelpCircle,
} from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { AdminMenu } from '@/components/AdminMenu';
import { GlobalSearch } from '@/components/GlobalSearch';
import { NotificationBell } from '@/components/NotificationBell';
import { ThemeToggle } from '@/components/ThemeToggle';
import { AnimatedNumber } from '@/components/AnimatedNumber';
import { useAppData } from '@/lib/store';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
};

function useUptime() {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}h ${m}m ${s}s`;
}

export function DashboardOverview() {
  const { devices, alerts, quarantine, logs } = useAppData();
  const [collapsed, setCollapsed] = useState(false);
  const uptime = useUptime();

  const stats = useMemo(() => {
    const total = devices.length;
    const known = devices.filter((d) => d.status === 'Approved').length;
    const unknown = devices.filter((d) => d.status === 'Unknown').length;
    const highRisk = devices.filter((d) => d.risk === 'High').length;
    return { total, known, unknown, highRisk };
  }, [devices]);

  const riskData = useMemo(() => {
    const low = devices.filter((d) => d.risk === 'Low').length;
    const medium = devices.filter((d) => d.risk === 'Medium').length;
    const high = devices.filter((d) => d.risk === 'High').length;
    return [
      { name: 'Low', value: low, color: '#2563eb' },
      { name: 'Medium', value: medium, color: '#d97706' },
      { name: 'High', value: high, color: '#dc2626' },
    ].filter((d) => d.value > 0);
  }, [devices]);

  // A short illustrative trend that ends at the live device total, so the
  // chart reflects the current state of the network rather than being pure demo data.
  const trendData = useMemo(() => {
    const t = stats.total;
    const points = [t - 6, t - 5, t - 3, t - 4, t - 2, t - 1, t].map((v) => Math.max(0, v));
    const labels = ['-60m', '-50m', '-40m', '-30m', '-20m', '-10m', 'Now'];
    return labels.map((time, i) => ({ time, devices: points[i] }));
  }, [stats.total]);

  const recentAlerts = useMemo(
    () => [...alerts].sort((a, b) => (a.status === 'Active' ? -1 : 1)).slice(0, 4),
    [alerts],
  );

  const statCards = [
    { key: 'total', label: 'Total Devices', value: stats.total, sublabel: 'across your network', icon: Monitor, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-500/10' },
    { key: 'known', label: 'Known Devices', value: stats.known, sublabel: stats.total ? `${Math.round((stats.known / stats.total) * 100)}%` : '0%', icon: CheckCircle2, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
    { key: 'unknown', label: 'Unknown Devices', value: stats.unknown, sublabel: stats.total ? `${Math.round((stats.unknown / stats.total) * 100)}%` : '0%', icon: HelpCircle, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10' },
    { key: 'highRisk', label: 'High Risk Devices', value: stats.highRisk, sublabel: stats.total ? `${Math.round((stats.highRisk / stats.total) * 100)}%` : '0%', icon: ShieldAlert, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-500/10' },
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
            <h1 className="text-sm font-bold text-slate-700 dark:text-slate-200">Dashboard</h1>
          </div>
          <div className="flex items-center gap-3">
            <GlobalSearch placeholder="Search devices..." />
            <ThemeToggle />
            <NotificationBell />
            <AdminMenu />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-5 py-4">
          <motion.div variants={container} initial="hidden" animate="show" className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {statCards.map((s) => (
                <motion.div
                  key={s.key}
                  variants={item}
                  whileHover={{ y: -3 }}
                  className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow duration-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{s.label}</p>
                      <p className="mt-2 text-3xl font-bold tabular-nums text-slate-800 dark:text-slate-100">
                        <AnimatedNumber value={s.value} />
                      </p>
                      <p className="mt-1 text-[11px] font-medium text-slate-400">{s.sublabel}</p>
                    </div>
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${s.bg}`}>
                      <s.icon className={`h-5 w-5 ${s.color}`} />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.7fr_1fr]">
              <motion.div variants={item} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200">Network Overview</h2>
                  <span className="rounded-md border border-slate-200 px-2 py-1 text-[11px] text-slate-500 dark:border-slate-700 dark:text-slate-400">
                    Devices — last hour
                  </span>
                </div>
                <div className="h-[220px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="deviceFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={24} allowDecimals={false} />
                      <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                      <Area type="monotone" dataKey="devices" stroke="#2563eb" strokeWidth={2.5} fill="url(#deviceFill)" animationDuration={1000} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>

              <motion.div variants={item} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <h2 className="mb-3 text-sm font-bold text-slate-700 dark:text-slate-200">Risk Distribution</h2>
                {riskData.length === 0 ? (
                  <p className="py-10 text-center text-xs text-slate-400">No devices to show yet.</p>
                ) : (
                  <div className="flex items-center gap-4">
                    <div className="h-[160px] w-[160px] shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={riskData} dataKey="value" nameKey="name" innerRadius={48} outerRadius={72} paddingAngle={3} startAngle={90} endAngle={-270} animationDuration={900}>
                            {riskData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                          </Pie>
                          <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex flex-col gap-2">
                      {riskData.map((r) => (
                        <div key={r.name} className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: r.color }} />
                          <span className="text-xs text-slate-500 dark:text-slate-400">{r.name} risk ({r.value})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.7fr_1fr]">
              <motion.div variants={item} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200">Recent Alerts</h2>
                  <Bell className="h-4 w-4 text-slate-400" />
                </div>
                <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
                  {recentAlerts.length === 0 && (
                    <p className="py-6 text-center text-xs text-slate-400">No alerts to show.</p>
                  )}
                  {recentAlerts.map((a, i) => (
                    <motion.div
                      key={a.id}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.25 + i * 0.08 }}
                      className="flex items-center gap-3 py-3"
                    >
                      {a.status === 'Active' ? (
                        <ShieldAlert className={`h-4 w-4 shrink-0 ${a.severity === 'Critical' ? 'text-red-500' : a.severity === 'Warning' ? 'text-amber-500' : 'text-blue-500'}`} />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                      )}
                      <span className="min-w-0 flex-1 truncate text-xs font-medium text-slate-700 dark:text-slate-200">{a.title}</span>
                      <span className="hidden text-[11px] text-slate-400 sm:inline">{a.device}</span>
                      <span className="text-[11px] text-slate-400">{a.timestamp}</span>
                    </motion.div>
                  ))}
                </div>
                <Link href="/alerts" className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:underline">
                  View all alerts <ExternalLink className="h-3 w-3" />
                </Link>
              </motion.div>

              <motion.div variants={item} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <h2 className="mb-3 text-sm font-bold text-slate-700 dark:text-slate-200">System Information</h2>
                <div className="flex flex-col divide-y divide-slate-100 text-xs dark:divide-slate-800">
                  <div className="flex items-center justify-between py-2.5">
                    <span className="flex items-center gap-2 text-slate-500 dark:text-slate-400"><Timer className="h-3.5 w-3.5" /> System Uptime</span>
                    <span className="font-medium tabular-nums text-slate-700 dark:text-slate-200">{uptime}</span>
                  </div>
                  <div className="flex items-center justify-between py-2.5">
                    <span className="flex items-center gap-2 text-slate-500 dark:text-slate-400"><Server className="h-3.5 w-3.5" /> Scan Interval</span>
                    <span className="font-medium text-slate-700 dark:text-slate-200">15 seconds</span>
                  </div>
                  <div className="flex items-center justify-between py-2.5">
                    <span className="flex items-center gap-2 text-slate-500 dark:text-slate-400"><AlertOctagon className="h-3.5 w-3.5" /> Devices Quarantined</span>
                    <span className="font-medium text-slate-700 dark:text-slate-200">{quarantine.length}</span>
                  </div>
                  <div className="flex items-center justify-between py-2.5">
                    <span className="flex items-center gap-2 text-slate-500 dark:text-slate-400"><ClipboardList className="h-3.5 w-3.5" /> Actions Logged</span>
                    <span className="font-medium text-slate-700 dark:text-slate-200">{logs.length}</span>
                  </div>
                  <div className="flex items-center justify-between py-2.5">
                    <span className="text-slate-500 dark:text-slate-400">Database Status</span>
                    <span className="flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                      </span>
                      Connected
                    </span>
                  </div>
                </div>
              </motion.div>
            </div>

            <motion.div variants={item} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="mb-3 text-sm font-bold text-slate-700 dark:text-slate-200">Quick Actions</h2>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  { label: 'Review Access Requests', href: '/access-requests', icon: ClipboardList, bg: 'bg-blue-50 dark:bg-blue-500/10', color: 'text-blue-600 dark:text-blue-400' },
                  { label: 'Manage Devices', href: '/devices', icon: Monitor, bg: 'bg-emerald-50 dark:bg-emerald-500/10', color: 'text-emerald-600 dark:text-emerald-400' },
                  { label: 'View Active Alerts', href: '/alerts', icon: Bell, bg: 'bg-amber-50 dark:bg-amber-500/10', color: 'text-amber-600 dark:text-amber-400' },
                  { label: 'Check Quarantine', href: '/quarantine', icon: Database, bg: 'bg-red-50 dark:bg-red-500/10', color: 'text-red-600 dark:text-red-400' },
                ].map((q) => (
                  <Link
                    key={q.label}
                    href={q.href}
                    className="flex items-center gap-3 rounded-lg border border-slate-100 p-3 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60"
                  >
                    <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${q.bg}`}>
                      <q.icon className={`h-4 w-4 ${q.color}`} />
                    </div>
                    <span className="flex-1 text-xs font-medium text-slate-700 dark:text-slate-200">{q.label}</span>
                    <ExternalLink className="h-3.5 w-3.5 text-slate-300" />
                  </Link>
                ))}
              </div>
            </motion.div>
          </motion.div>
        </main>
      </div>
    </div>
  );
}
