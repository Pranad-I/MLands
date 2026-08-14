'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  Search, Menu, ShieldAlert, Timer, Cog, CheckCircle2, Eye, RefreshCcw, Ban, Clock,
} from 'lucide-react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { Sidebar } from '@/components/Sidebar';
import { AdminMenu } from '@/components/AdminMenu';
import { NotificationBell } from '@/components/NotificationBell';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAppData, type QuarantinedDevice, type RiskLevel } from '@/lib/store';

const riskBadge: Record<RiskLevel, string> = {
  None: 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30',
  Low: 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30',
  Medium: 'bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/30',
  High: 'bg-red-50 text-red-600 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/30',
};

function formatDuration(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function StatCard({ label, value, sub, icon: Icon, bg, text }: {
  label: string; value: string | number; sub: string; icon: React.ElementType; bg: string; text: string;
}) {
  return (
    <div className={`hover-lift rounded-xl border p-4 ${bg}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
          <p className={`mt-1 text-2xl font-bold ${text}`}>{value}</p>
          <p className="mt-0.5 text-[11px] text-slate-400">{sub}</p>
        </div>
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${text} bg-white/60 dark:bg-slate-900/40`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

export function QuarantineDashboard() {
  const { quarantine, releaseFromQuarantine, blockPermanently, extendQuarantine } = useAppData();
  const [collapsed, setCollapsed] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [releasedToday, setReleasedToday] = useState(1);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return quarantine;
    return quarantine.filter((d) => d.name.toLowerCase().includes(q) || d.ipAddress.includes(q));
  }, [quarantine, query]);

  const selected: QuarantinedDevice | null = useMemo(
    () => quarantine.find((d) => d.id === selectedId) ?? quarantine[0] ?? null,
    [quarantine, selectedId],
  );

  const stats = useMemo(() => {
    const highRisk = quarantine.filter((d) => d.risk === 'High').length;
    const longest = quarantine.reduce((max, d) => Math.max(max, d.minutesQuarantined), 0);
    const autoToday = quarantine.filter((d) => d.autoQuarantined).length;
    return { total: quarantine.length, highRisk, longest: formatDuration(longest), autoToday };
  }, [quarantine]);

  const overviewData = useMemo(() => {
    const high = quarantine.filter((d) => d.risk === 'High').length;
    const medium = quarantine.filter((d) => d.risk === 'Medium').length;
    const low = quarantine.filter((d) => d.risk === 'Low' || d.risk === 'None').length;
    return [
      { name: 'High Risk', value: high, color: '#dc2626' },
      { name: 'Medium Risk', value: medium, color: '#d97706' },
      { name: 'Low Risk', value: low, color: '#16a34a' },
    ].filter((d) => d.value > 0);
  }, [quarantine]);

  function handleRelease(id: string) {
    releaseFromQuarantine(id);
    setReleasedToday((c) => c + 1);
    setSelectedId(null);
    toast.success('Device released from quarantine');
  }

  function handleBlock(id: string) {
    blockPermanently(id);
    setSelectedId(null);
    toast.success('Device permanently blocked');
  }

  function handleExtend(id: string) {
    extendQuarantine(id);
    toast.success('Quarantine period extended');
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
            <h1 className="text-sm font-bold text-slate-700 dark:text-slate-200">Quarantine Control</h1>
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
            <div className="stagger-children grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
              <StatCard label="Quarantined Devices" value={stats.total} sub="currently isolated" icon={ShieldAlert} bg="border-red-100 bg-red-50/60 dark:border-red-500/20 dark:bg-red-500/5" text="text-red-600 dark:text-red-400" />
              <StatCard label="High Risk Devices" value={stats.highRisk} sub="require attention" icon={ShieldAlert} bg="border-amber-100 bg-amber-50/60 dark:border-amber-500/20 dark:bg-amber-500/5" text="text-amber-600 dark:text-amber-400" />
              <StatCard label="Quarantine Since" value={stats.longest} sub="longest isolation time" icon={Clock} bg="border-purple-100 bg-purple-50/60 dark:border-purple-500/20 dark:bg-purple-500/5" text="text-purple-600 dark:text-purple-400" />
              <StatCard label="Auto-Quarantined Today" value={stats.autoToday} sub="devices" icon={Cog} bg="border-blue-100 bg-blue-50/60 dark:border-blue-500/20 dark:bg-blue-500/5" text="text-blue-600 dark:text-blue-400" />
              <StatCard label="Released Today" value={releasedToday} sub="device" icon={CheckCircle2} bg="border-emerald-100 bg-emerald-50/60 dark:border-emerald-500/20 dark:bg-emerald-500/5" text="text-emerald-600 dark:text-emerald-400" />
            </div>

            <div className="stagger-children grid grid-cols-1 gap-4 xl:grid-cols-[1.7fr_1fr]">
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between border-b border-slate-100 p-4 dark:border-slate-800">
                  <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200">Quarantined Devices</h2>
                  <div className="relative flex items-center">
                    <Search className="absolute left-2.5 h-3.5 w-3.5 text-slate-400" />
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search quarantined devices..."
                      className="h-8 w-56 rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-3 text-xs text-slate-600 outline-none placeholder:text-slate-400 focus:border-blue-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-[1.2fr_1fr_1fr_0.8fr_0.9fr_0.6fr] gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2 text-[11px] font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400">
                  <span>Device Name</span>
                  <span>Reason</span>
                  <span>IP / MAC</span>
                  <span>Risk</span>
                  <span>Quarantined Since</span>
                  <span className="text-right">Actions</span>
                </div>
                {filtered.length === 0 && (
                  <div className="px-4 py-10 text-center text-xs text-slate-400">No devices are currently quarantined.</div>
                )}
                {filtered.map((d) => (
                  <div
                    key={d.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedId(d.id)}
                    onKeyDown={(e) => { if (e.key === 'Enter') setSelectedId(d.id); }}
                    className={`grid w-full cursor-pointer grid-cols-[1.2fr_1fr_1fr_0.8fr_0.9fr_0.6fr] items-center gap-2 border-b border-slate-50 px-4 py-3 text-left text-xs last:border-b-0 hover:bg-slate-50/60 dark:border-slate-800/60 dark:hover:bg-slate-800/40 ${selected?.id === d.id ? 'bg-blue-50/60 dark:bg-blue-500/5' : ''}`}
                  >
                    <span className="truncate font-medium text-slate-700 dark:text-slate-200">{d.name}</span>
                    <span className="truncate text-slate-500 dark:text-slate-400">{d.reason}</span>
                    <span className="truncate text-slate-400">{d.ipAddress}</span>
                    <span><span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium ${riskBadge[d.risk]}`}>{d.risk}</span></span>
                    <span className="text-slate-400">{d.quarantinedAt} ({formatDuration(d.minutesQuarantined)})</span>
                    <span className="flex justify-end gap-1.5">
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelectedId(d.id); }}
                        className="flex h-6 w-6 items-center justify-center rounded-md border border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-400"
                        title="View details"
                      >
                        <Eye className="h-3 w-3" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleRelease(d.id); }}
                        className="flex h-6 w-6 items-center justify-center rounded-md border border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400"
                        title="Release from quarantine"
                      >
                        <RefreshCcw className="h-3 w-3" />
                      </button>
                    </span>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <h2 className="mb-3 text-sm font-bold text-slate-700 dark:text-slate-200">Device Details</h2>
                {!selected ? (
                  <p className="py-8 text-center text-xs text-slate-400">No device selected.</p>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-red-50 dark:bg-red-500/10">
                        <ShieldAlert className="h-5 w-5 text-red-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-800 dark:text-slate-100">{selected.name}</p>
                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium ${riskBadge[selected.risk]}`}>{selected.risk} Risk</span>
                      </div>
                    </div>
                    <div className="space-y-2 border-t border-slate-100 pt-3 text-xs dark:border-slate-800">
                      <div className="flex justify-between"><span className="text-slate-400">IP Address</span><span className="font-medium text-slate-700 dark:text-slate-200">{selected.ipAddress}</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">MAC Address</span><span className="font-medium text-slate-700 dark:text-slate-200">{selected.macAddress}</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">Reason</span><span className="text-right font-medium text-slate-700 dark:text-slate-200">{selected.reason}</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">Quarantined Since</span><span className="font-medium text-slate-700 dark:text-slate-200">{selected.quarantinedAt} ({formatDuration(selected.minutesQuarantined)})</span></div>
                      {selected.autoReleaseIn && (
                        <div className="flex justify-between"><span className="text-slate-400">Auto-release in</span><span className="font-medium text-amber-600 dark:text-amber-400">{selected.autoReleaseIn}</span></div>
                      )}
                      <div className="flex justify-between"><span className="text-slate-400">Status</span><span className="flex items-center gap-1 font-medium text-red-600 dark:text-red-400"><span className="h-1.5 w-1.5 rounded-full bg-red-500" /> Isolated</span></div>
                    </div>

                    <div className="space-y-1.5 border-t border-slate-100 pt-3 dark:border-slate-800">
                      <button onClick={() => handleRelease(selected.id)} className="flex w-full items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-left text-xs font-semibold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Release from Quarantine
                      </button>
                      {selected.autoReleaseIn && (
                        <button onClick={() => handleExtend(selected.id)} className="flex w-full items-center gap-2 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-left text-xs font-semibold text-amber-700 hover:bg-amber-100 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400">
                          <Timer className="h-3.5 w-3.5" /> Extend Quarantine
                        </button>
                      )}
                      <button onClick={() => handleBlock(selected.id)} className="flex w-full items-center gap-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-left text-xs font-semibold text-red-700 hover:bg-red-100 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
                        <Ban className="h-3.5 w-3.5" /> Block Device Permanently
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.7fr_1fr]">
              <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <h2 className="mb-3 text-sm font-bold text-slate-700 dark:text-slate-200">Quarantine History (Today)</h2>
                <div className="space-y-3">
                  {quarantine.map((d) => (
                    <div key={d.id} className="flex items-center gap-3 text-xs">
                      <span className="h-2 w-2 shrink-0 rounded-full bg-red-500" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-slate-700 dark:text-slate-200">
                          <span className="font-medium">Device quarantined</span> — {d.name} ({d.ipAddress}) · {d.reason}
                        </p>
                      </div>
                      <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium ${riskBadge[d.risk]}`}>{d.risk}</span>
                    </div>
                  ))}
                  {quarantine.length === 0 && <p className="py-4 text-center text-xs text-slate-400">No quarantine activity yet today.</p>}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <h2 className="mb-3 text-sm font-bold text-slate-700 dark:text-slate-200">Quarantine Overview</h2>
                {overviewData.length === 0 ? (
                  <p className="py-10 text-center text-xs text-slate-400">Nothing quarantined right now.</p>
                ) : (
                  <div className="flex items-center gap-4">
                    <div className="h-[140px] w-[140px] shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={overviewData} dataKey="value" nameKey="name" innerRadius={40} outerRadius={64} paddingAngle={3} startAngle={90} endAngle={-270}>
                            {overviewData.map((e) => <Cell key={e.name} fill={e.color} />)}
                          </Pie>
                          <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex flex-col gap-2">
                      {overviewData.map((e) => (
                        <div key={e.name} className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: e.color }} />
                          {e.name} ({e.value})
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 dark:border-blue-500/20 dark:bg-blue-500/10">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Quarantined devices are isolated and have limited network access until reviewed by an administrator.
              </p>
            </div>
          </div>
        </motion.main>
      </div>
    </div>
  );
}
