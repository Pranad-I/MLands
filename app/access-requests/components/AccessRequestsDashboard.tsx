'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search, Menu, Shield, CheckCircle, XCircle, AlertTriangle, Clock, Monitor, Smartphone, Laptop, Tv, Printer, HelpCircle, RefreshCw, Wifi,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
} from 'recharts';
import { Sidebar } from '@/components/Sidebar';
import { ThemeToggle } from '@/components/ThemeToggle';
import { AdminMenu } from '@/components/AdminMenu';
import { NotificationBell } from '@/components/NotificationBell';
import { fetcher, resolveRequest, type DashboardDTO, type AccessRequestDTO } from '@/lib/api';

// ── helpers ────────────────────────────────────────────────────────────────

function riskColor(level: string) {
  if (level === 'High') return { bg: 'bg-red-50 dark:bg-red-500/10', border: 'border-red-200 dark:border-red-500/30', text: 'text-red-600 dark:text-red-400', dot: '#dc2626' };
  if (level === 'Medium') return { bg: 'bg-amber-50 dark:bg-amber-500/10', border: 'border-amber-200 dark:border-amber-500/30', text: 'text-amber-600 dark:text-amber-400', dot: '#d97706' };
  return { bg: 'bg-emerald-50 dark:bg-emerald-500/10', border: 'border-emerald-200 dark:border-emerald-500/30', text: 'text-emerald-600 dark:text-emerald-400', dot: '#16a34a' };
}

function statusColor(status: string) {
  if (status === 'Approved') return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30';
  if (status === 'Denied') return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/30';
  if (status === 'Quarantined') return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30';
  return 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-700/40 dark:text-slate-300 dark:border-slate-600';
}

function RiskBadge({ level }: { level: string }) {
  const c = riskColor(level);
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${c.bg} ${c.border} ${c.text}`}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: c.dot }} />
      {level}
    </span>
  );
}

function StatCard({ label, value, sub, icon: Icon, accent }: {
  label: string; value: number | string; sub?: string;
  icon: React.ElementType; accent: string;
}) {
  return (
    <div className="hover-lift rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-1 text-2xl font-bold text-slate-800 dark:text-slate-100">{value}</p>
          {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
        </div>
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${accent}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

// ── Request card (pending list) ────────────────────────────────────────────

function RequestCard({
  req, onAction, compact = false,
}: {
  req: AccessRequestDTO;
  onAction: (id: string, a: 'approve' | 'deny' | 'quarantine') => void;
  compact?: boolean;
}) {
  const c = riskColor(req.riskLevel);
  return (
    <div className={`rounded-xl border bg-white p-4 dark:bg-slate-900 ${compact ? '' : 'shadow-sm'} ${c.border}`}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-slate-800 text-sm dark:text-slate-100">{req.device.name}</p>
            <RiskBadge level={req.riskLevel} />
            <span className="text-[10px] font-bold tabular-nums text-slate-500 dark:text-slate-400">
              Score: {req.riskScore}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-slate-400">
            {req.device.ipAddress} · {req.device.macAddress} · {req.device.platform}
          </p>
          <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
            <Clock className="h-3 w-3" /> {req.requestedAt}
          </p>
        </div>
      </div>

      <div className="mb-3 space-y-1">
        {req.riskFactors.map((f, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: riskColor(f.level).dot }} />
            <span className="text-[11px] text-slate-600 dark:text-slate-300">{f.label}</span>
            <span className={`ml-auto text-[10px] font-medium ${riskColor(f.level).text}`}>{f.level}</span>
          </div>
        ))}
      </div>

      {req.status === 'Pending' && (
        <div className="flex gap-2">
          <button
            onClick={() => onAction(req.id, 'approve')}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700"
          >
            <CheckCircle className="h-3.5 w-3.5" /> Approve
          </button>
          <button
            onClick={() => onAction(req.id, 'quarantine')}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-amber-600"
          >
            <AlertTriangle className="h-3.5 w-3.5" /> Quarantine
          </button>
          <button
            onClick={() => onAction(req.id, 'deny')}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-700"
          >
            <XCircle className="h-3.5 w-3.5" /> Deny
          </button>
        </div>
      )}

      {req.status !== 'Pending' && (
        <div className="flex items-center justify-end">
          <span className={`rounded-full border px-3 py-0.5 text-xs font-semibold ${statusColor(req.status)}`}>
            {req.status}
          </span>
        </div>
      )}
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────

export function AccessRequestsDashboard() {
  const [data, setData] = useState<DashboardDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    try {
      const d = await fetcher('/api/access-control/dashboard');
      setData(d);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAction = async (requestId: string, action: 'approve' | 'deny' | 'quarantine') => {
    setActing(requestId);
    try {
      const updated = await resolveRequest(requestId, action);
      setData(updated);
    } finally {
      setActing(null);
    }
  };

  const segData = data?.segmentation.map((s) => ({ name: s.label, value: s.deviceCount, color: s.color })) ?? [];

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((value) => !value)} />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-3 shrink-0 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <button onClick={() => setCollapsed((value) => !value)} aria-label="Toggle sidebar" className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <Menu className="h-4 w-4 cursor-pointer" />
            </button>
            <h1 className="text-sm font-bold text-slate-700 dark:text-slate-200">Access Requests</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative flex items-center">
              <Search className="absolute left-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search devices..."
                className="h-8 w-48 rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-3 text-xs text-slate-600 placeholder:text-slate-400 outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              />
            </div>
            <ThemeToggle />
            <button
              onClick={load}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 transition-colors dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800"
              title="Refresh"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
            <NotificationBell />
            <AdminMenu />
          </div>
        </header>

        {/* Content */}
        <motion.main
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="flex-1 overflow-y-auto"
        >
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <RefreshCw className="h-6 w-6 animate-spin text-blue-500" />
                <p className="text-sm text-slate-500">Loading dashboard…</p>
              </div>
            </div>
          ) : !data ? null : (
            <div className="space-y-4 px-5 py-4">
              {/* Summary stats */}
              <div className="stagger-children grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
                <StatCard label="Pending Requests" value={data.summary.pendingRequests} sub="awaiting decision" icon={Clock} accent="bg-amber-100 text-amber-600" />
                <StatCard label="Approved Today" value={data.summary.approvedToday} icon={CheckCircle} accent="bg-emerald-100 text-emerald-600" />
                <StatCard label="Denied Today" value={data.summary.deniedToday} icon={XCircle} accent="bg-red-100 text-red-600" />
                <StatCard label="Quarantined" value={data.summary.quarantinedDevices} icon={AlertTriangle} accent="bg-orange-100 text-orange-600" />
                <StatCard label="Total Controlled" value={data.summary.totalControlled} sub="all-time" icon={Shield} accent="bg-blue-100 text-blue-600" />
              </div>

              {/* Decision panel + segmentation */}
              <div className="stagger-children grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                {/* Decision panel */}
                <div>
                  <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Immediate Decision Required
                  </h2>
                  {data.decision ? (
                    <div className="relative overflow-hidden rounded-xl border-2 border-red-200 bg-red-50 p-4 shadow-sm dark:border-red-500/30 dark:bg-red-500/10">
                      <div className="mb-1 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                        <span className="text-xs font-bold uppercase tracking-wide text-red-600 dark:text-red-400">Highest Risk — Act Now</span>
                      </div>
                      <RequestCard req={data.decision} onAction={handleAction} />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-emerald-300 bg-emerald-50 p-8 text-center dark:border-emerald-500/30 dark:bg-emerald-500/10">
                      <CheckCircle className="mb-2 h-8 w-8 text-emerald-400" />
                      <p className="font-semibold text-emerald-700 dark:text-emerald-400">All clear</p>
                      <p className="text-xs text-emerald-500 dark:text-emerald-400/80">No pending requests require attention</p>
                    </div>
                  )}
                </div>

                {/* Network segmentation */}
                <div className="space-y-4">
                  <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                    <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Network Segmentation
                    </h2>
                    <div className="grid grid-cols-[1fr_auto] gap-4 items-center">
                      <div className="h-36">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={segData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} dataKey="value" strokeWidth={0}>
                              {segData.map((entry, i) => (
                                <Cell key={i} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip contentStyle={{ fontSize: 11 }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="space-y-2">
                        {data.segmentation.map((s) => (
                          <div key={s.key} className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: s.color }} />
                            <span className="text-xs text-slate-600 dark:text-slate-300 w-32">{s.label}</span>
                            <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">{s.deviceCount}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* System status + nodes */}
                  <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">System</h2>
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        {data.systemStatus.state}
                      </span>
                    </div>
                    <p className="mb-3 text-[11px] text-slate-400">Last scan: {data.systemStatus.lastScan}</p>
                    <div className="space-y-2">
                      {data.nodes.map((node) => (
                        <div key={node.name} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Wifi className="h-3.5 w-3.5 text-slate-400" />
                            <div>
                              <p className="text-xs font-medium text-slate-700 dark:text-slate-200">{node.name}</p>
                              <p className="text-[10px] text-slate-400">{node.role}</p>
                            </div>
                          </div>
                          <span className={`text-[10px] font-semibold ${node.online ? 'text-emerald-600' : 'text-red-500'}`}>
                            {node.online ? 'Online' : 'Offline'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Pending requests list + trusted devices */}
              <div className="stagger-children grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                {/* Pending requests */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Pending Requests ({data.pendingRequests.length})
                    </h2>
                  </div>
                  <div className="space-y-3">
                    {data.pendingRequests.length === 0 ? (
                      <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-xs text-slate-400 dark:border-slate-700">
                        No pending requests
                      </p>
                    ) : (
                      data.pendingRequests.map((req) => (
                        <div key={req.id} className={acting === req.id ? 'pointer-events-none opacity-60' : ''}>
                          <RequestCard req={req} onAction={handleAction} compact />
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Trusted devices */}
                <div>
                  <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Trusted Devices ({data.trustedDevices.length})
                  </h2>
                  <div className="rounded-xl border border-slate-200 bg-white overflow-hidden dark:border-slate-800 dark:bg-slate-900">
                    <div className="grid grid-cols-[auto_1fr_auto_auto] gap-3 border-b border-slate-100 px-4 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:border-slate-800">
                      <div />
                      <div>Device</div>
                      <div>IP</div>
                      <div>Added</div>
                    </div>
                    <div className="divide-y divide-slate-50 dark:divide-slate-800 max-h-80 overflow-y-auto scroll-thin">
                      {data.trustedDevices.filter((d) => {
                        const q = search.trim().toLowerCase();
                        if (!q) return true;
                        return d.name.toLowerCase().includes(q) || d.ipAddress.includes(q) || d.macAddress.toLowerCase().includes(q);
                      }).map((d) => {
                        let Icon = HelpCircle;
                        const p = d.platform.toLowerCase();
                        if (p.includes('windows') || p.includes('pc')) Icon = Monitor;
                        else if (p.includes('apple') || p.includes('iphone') || p.includes('mac')) Icon = Smartphone;
                        else if (p.includes('android tv')) Icon = Tv;
                        else if (p.includes('android')) Icon = Smartphone;
                        else if (p.includes('iot') || p.includes('printer')) Icon = Printer;
                        else if (p.includes('linux')) Icon = Laptop;
                        return (
                          <div key={d.id} className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-3 px-4 py-2.5">
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-500/10">
                              <Icon className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400" />
                            </div>
                            <div>
                              <p className="text-xs font-medium text-slate-700 dark:text-slate-200">{d.name}</p>
                              <p className="text-[10px] text-slate-400">{d.macAddress} · {d.platform}</p>
                            </div>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{d.ipAddress}</p>
                            <p className="text-[10px] text-slate-400">{d.addedOn}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Access History */}
              <div>
                <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Access History</h2>
                <div className="rounded-xl border border-slate-200 bg-white overflow-hidden dark:border-slate-800 dark:bg-slate-900">
                  <div className="grid grid-cols-[auto_1fr_auto_auto] gap-4 border-b border-slate-100 px-4 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:border-slate-800">
                    <div>Time</div>
                    <div>Device</div>
                    <div>Action</div>
                    <div>Risk</div>
                  </div>
                  <div className="divide-y divide-slate-50 dark:divide-slate-800">
                    {data.history.slice(0, 8).map((entry) => (
                      <div key={entry.id} className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-4 px-4 py-2.5">
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 w-16">
                          <Clock className="h-3 w-3" /> {entry.timestamp}
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300">{entry.deviceLabel}</p>
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${statusColor(
                          entry.action.includes('approved') ? 'Approved'
                          : entry.action.includes('denied') ? 'Denied'
                          : entry.action.includes('quarantined') ? 'Quarantined'
                          : 'Pending'
                        )}`}>
                          {entry.action}
                        </span>
                        <RiskBadge level={entry.riskLevel} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.main>
      </div>
    </div>
  );
}
