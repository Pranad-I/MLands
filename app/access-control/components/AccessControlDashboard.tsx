'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Bell, Search, Menu, CheckCircle2, Ban, ShieldAlert, HelpCircle, Monitor, Smartphone, Laptop, Tv, Printer, ArrowUpRight, Info,
} from 'lucide-react';
import { useAppData, type Device } from '@/lib/store';
import { Sidebar } from '@/components/Sidebar';
import { AdminMenu } from '@/components/AdminMenu';
import { ThemeToggle } from '@/components/ThemeToggle';
import { DeviceOverviewChart } from './DeviceOverviewChart';
import { NetworkActivityChart, type ActivityPoint } from './NetworkActivityChart';
import { ManagedDevicesTable } from './ManagedDevicesTable';
import { deviceActionController } from '@/lib/services/device-action-controller';

function StatCard({ title, value, subtitle, bg, border, icon: Icon, iconBg }: {
  title: string; value: string | number; subtitle: string;
  bg: string; border: string; icon: React.ElementType; iconBg: string;
}) {
  return (
    <div className={`rounded-lg border ${border} ${bg} p-3.5 flex items-start justify-between min-h-[76px]`}>
      <div className="space-y-0.5">
        <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400">{title}</p>
        <p className="text-lg font-bold text-slate-700 dark:text-slate-100">{value}</p>
        <p className="text-[10px] text-slate-400">{subtitle}</p>
      </div>
      <div className={`flex h-8 w-8 items-center justify-center rounded-full ${iconBg} shrink-0`}>
        <Icon className="h-4 w-4" />
      </div>
    </div>
  );
}

function DeviceIcon({ type }: { type: string }) {
  const cls = 'h-4 w-4 text-slate-400 shrink-0';
  switch (type) {
    case 'phone': return <Smartphone className={cls} />;
    case 'laptop': return <Laptop className={cls} />;
    case 'tv': return <Tv className={cls} />;
    case 'printer': return <Printer className={cls} />;
    case 'computer': return <Monitor className={cls} />;
    default: return <HelpCircle className={cls} />;
  }
}

function ActionBadge({ action }: { action: string }) {
  const styles: Record<string, string> = {
    Approved: 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30',
    Blocked: 'bg-red-50 text-red-600 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/30',
    Quarantined: 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30',
    Unknown: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-700/40 dark:text-slate-300 dark:border-slate-600',
  };
  return (
    <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[9px] font-medium ${styles[action] ?? styles.Unknown}`}>
      {action}
    </span>
  );
}

export function AccessControlDashboard() {
  const { devices, logs, updateDeviceStatus } = useAppData();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [headerSearch, setHeaderSearch] = useState('');

  const approved = devices.filter((d) => d.status === 'Approved').length;
  const blocked = devices.filter((d) => d.status === 'Blocked').length;
  const quarantined = devices.filter((d) => d.status === 'Quarantined').length;
  const unknown = devices.filter((d) => d.status === 'Unknown').length;
  const total = devices.length;

  const filteredDevices = useMemo(() => {
    const q = headerSearch.trim().toLowerCase();
    if (!q) return devices;
    return devices.filter((d) => d.name.toLowerCase().includes(q) || d.ipAddress.includes(q) || d.macAddress.toLowerCase().includes(q));
  }, [devices, headerSearch]);

  const topDevices = useMemo(
    () => [...devices].filter((d) => d.dataUsageGb > 0).sort((a, b) => b.dataUsageGb - a.dataUsageGb).slice(0, 5),
    [devices],
  );
  const maxUsage = topDevices[0]?.dataUsageGb || 1;

  const recentLogs = useMemo(() => logs.slice(0, 5), [logs]);

  const riskLegend = useMemo(() => {
    const high = devices.filter((d) => d.risk === 'High').length;
    const medium = devices.filter((d) => d.risk === 'Medium').length;
    const low = devices.filter((d) => d.risk === 'Low').length;
    const none = devices.filter((d) => d.risk === 'None').length;
    const t = total || 1;
    return [
      { label: 'High Risk', color: '#f53b47', count: high, percent: `${Math.round((high / t) * 100)}%` },
      { label: 'Medium Risk', color: '#f59e0b', count: medium, percent: `${Math.round((medium / t) * 100)}%` },
      { label: 'Low Risk', color: '#35c25b', count: low, percent: `${Math.round((low / t) * 100)}%` },
      { label: 'No Risk', color: '#8b5cf6', count: none, percent: `${Math.round((none / t) * 100)}%` },
    ];
  }, [devices, total]);

  const activityData: ActivityPoint[] = useMemo(() => {
    // A short illustrative series that ends at the live counts, so the chart
    // reflects the current state of the network rather than static demo data.
    const labels = ['-20h', '-16h', '-12h', '-8h', '-4h', 'Now'];
    return labels.map((label, i) => {
      const isLast = i === labels.length - 1;
      const scale = isLast ? 1 : 0.5 + (i / labels.length) * 0.5;
      return {
        hour_label: label,
        connections: Math.round(total * scale) || (isLast ? total : 0),
        approvals: Math.round(approved * scale),
        blocks: Math.round(blocked * scale),
        quarantines: Math.round(quarantined * scale),
        unknowns: Math.round(unknown * scale),
      };
    });
  }, [total, approved, blocked, quarantined, unknown]);

  function approveNext() {
    const target = deviceActionController.findUnknownDevice(devices);
    if (!target) { toast.info('No devices are awaiting approval'); return; }
    updateDeviceStatus(target.id, 'Approved');
    toast.success(`${target.name} approved`);
  }
  function blockNext() {
    const target = deviceActionController.findUnknownDeviceForBlock(devices);
    if (!target) { toast.info('No unresolved devices to block'); return; }
    updateDeviceStatus(target.id, 'Blocked');
    toast.success(`${target.name} blocked`);
  }
  function quarantineNext() {
    const target = deviceActionController.findHighRiskDeviceForQuarantine(devices);
    if (!target) { toast.info('No high-risk devices to quarantine'); return; }
    updateDeviceStatus(target.id, 'Quarantined');
    toast.success(`${target.name} quarantined`);
  }
  function markUnknown() {
    const target = deviceActionController.findApprovedDeviceToMarkUnknown(devices);
    if (!target) { toast.info('No approved devices to flag'); return; }
    updateDeviceStatus(target.id, 'Unknown');
    toast.success(`${target.name} flagged for further monitoring`);
  }

  const quickActions = [
    { title: 'Approve Device', desc: 'Allow full access to the network', Icon: CheckCircle2, bg: 'bg-emerald-50 dark:bg-emerald-500/10', iconColor: 'text-emerald-500 dark:text-emerald-400', titleColor: 'text-emerald-600 dark:text-emerald-400', onClick: approveNext },
    { title: 'Block Device', desc: 'Deny access and block connections', Icon: Ban, bg: 'bg-red-50 dark:bg-red-500/10', iconColor: 'text-red-500 dark:text-red-400', titleColor: 'text-red-600 dark:text-red-400', onClick: blockNext },
    { title: 'Quarantine Device', desc: 'Restrict device to limited access', Icon: ShieldAlert, bg: 'bg-amber-50 dark:bg-amber-500/10', iconColor: 'text-amber-500 dark:text-amber-400', titleColor: 'text-amber-600 dark:text-amber-400', onClick: quarantineNext },
    { title: 'Mark as Unknown', desc: 'Flag device for further monitoring', Icon: HelpCircle, bg: 'bg-purple-50 dark:bg-purple-500/10', iconColor: 'text-purple-500 dark:text-purple-400', titleColor: 'text-purple-600 dark:text-purple-400', onClick: markUnknown },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((value) => !value)} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2.5 shrink-0 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <button onClick={() => setCollapsed((value) => !value)} aria-label="Toggle sidebar" className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <Menu className="h-4 w-4 cursor-pointer" />
            </button>
            <h1 className="text-sm font-bold text-slate-700 dark:text-slate-200">Access Control</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative flex items-center">
              <Search className="absolute left-2 h-3 w-3 text-slate-400" />
              <input
                value={headerSearch}
                onChange={(e) => setHeaderSearch(e.target.value)}
                placeholder="Search devices..."
                className="h-7 w-40 rounded border border-slate-200 bg-slate-50 pl-6 pr-2 text-[11px] text-slate-600 placeholder:text-slate-400 outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              />
            </div>
            <ThemeToggle />
            <div className="relative">
              <Bell className="h-4 w-4 text-slate-500 dark:text-slate-400" />
              <span className="absolute -right-1 -top-1 flex h-3 w-3 items-center justify-center rounded-full bg-red-500 text-[7px] font-bold text-white">{unknown}</span>
            </div>
            <AdminMenu />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="space-y-3 px-4 py-3">
            <section className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
              <StatCard title="Total Devices" value={total} subtitle="connected" bg="bg-blue-50 dark:bg-blue-500/5" border="border-blue-100 dark:border-blue-500/20" icon={Monitor} iconBg="bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400" />
              <StatCard title="Approved Devices" value={approved} subtitle={`${total > 0 ? ((approved / total) * 100).toFixed(1) : 0}%`} bg="bg-emerald-50 dark:bg-emerald-500/5" border="border-emerald-100 dark:border-emerald-500/20" icon={CheckCircle2} iconBg="bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400" />
              <StatCard title="Blocked Devices" value={blocked} subtitle={`${total > 0 ? ((blocked / total) * 100).toFixed(1) : 0}%`} bg="bg-red-50 dark:bg-red-500/5" border="border-red-100 dark:border-red-500/20" icon={Ban} iconBg="bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400" />
              <StatCard title="Quarantined Devices" value={quarantined} subtitle={`${total > 0 ? ((quarantined / total) * 100).toFixed(1) : 0}%`} bg="bg-amber-50 dark:bg-amber-500/5" border="border-amber-100 dark:border-amber-500/20" icon={ShieldAlert} iconBg="bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400" />
              <StatCard title="Unknown Devices" value={unknown} subtitle={`${total > 0 ? ((unknown / total) * 100).toFixed(1) : 0}%`} bg="bg-purple-50 dark:bg-purple-500/5" border="border-purple-100 dark:border-purple-500/20" icon={HelpCircle} iconBg="bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400" />
              <StatCard title="Actions Logged (Today)" value={logs.length} subtitle="total events" bg="bg-blue-50 dark:bg-blue-500/5" border="border-blue-100 dark:border-blue-500/20" icon={ArrowUpRight} iconBg="bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400" />
            </section>

            <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
              <ManagedDevicesTable devices={filteredDevices} />

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-slate-100 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                    <h3 className="mb-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">Device Overview</h3>
                    <DeviceOverviewChart approved={approved} blocked={blocked} quarantined={quarantined} unknown={unknown} total={total} />
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                    <h3 className="mb-3 text-[11px] font-semibold text-slate-500 dark:text-slate-400">Risk Level Distribution</h3>
                    <div className="space-y-3">
                      {riskLegend.map((item) => (
                        <div key={item.label} className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                            <span className="text-[10px] text-slate-500 dark:text-slate-400">{item.label}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-medium text-slate-600 dark:text-slate-300">{item.count}</span>
                            <span className="text-[10px] text-slate-400">({item.percent})</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="rounded-lg border border-slate-100 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Network Activity (Last 24 Hours)</h3>
                  </div>
                  <NetworkActivityChart
                    data={activityData}
                    legendCounts={{ connections: total, approvals: approved, blocks: blocked, quarantines: quarantined, unknowns: unknown }}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,.75fr)_minmax(0,.9fr)]">
              <div className="rounded-lg bg-white dark:bg-slate-900">
                <div className="mb-2 flex items-center justify-between px-2 pt-2">
                  <h3 className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Recent Access Control Actions</h3>
                  <button onClick={() => router.push('/activity-log')} className="text-[10px] font-medium text-blue-500 hover:underline">View all logs</button>
                </div>
                <div className="rounded-md">
                  <div className="grid grid-cols-[1.5fr_.8fr_.5fr_.9fr_1fr] gap-2 border-b border-slate-100 px-3 py-1.5 text-[9px] font-semibold text-slate-500 dark:border-slate-800 dark:text-slate-400">
                    {['Device', 'Action', 'By', 'Date & Time', 'Details'].map((l) => <div key={l}>{l}</div>)}
                  </div>
                  {recentLogs.length === 0 && <p className="px-3 py-4 text-center text-[10px] text-slate-400">No actions logged yet.</p>}
                  {recentLogs.map((log, i) => (
                    <div key={log.id} className={`grid grid-cols-[1.5fr_.8fr_.5fr_.9fr_1fr] items-center gap-2 px-3 py-1.5 ${i < recentLogs.length - 1 ? 'border-b border-slate-50 dark:border-slate-800/60' : ''}`}>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{log.device} ({log.ipAddress})</div>
                      <div><ActionBadge action={log.action} /></div>
                      <div className="text-[10px] text-slate-400">{log.performedBy}</div>
                      <div className="text-[10px] text-slate-400">{log.timestamp}</div>
                      <div className="text-[10px] text-slate-400 truncate">{log.details}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-slate-100 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Top Active Devices (Today)</h3>
                  <button onClick={() => router.push('/devices')} className="flex items-center gap-1 text-[10px] font-medium text-blue-500 hover:underline">
                    View all <ArrowUpRight className="h-2.5 w-2.5" />
                  </button>
                </div>
                <div className="space-y-3">
                  {topDevices.length === 0 && <p className="text-center text-[10px] text-slate-400">No device activity yet.</p>}
                  {topDevices.map((d) => (
                    <div key={d.id} className="flex items-center gap-2">
                      <DeviceIcon type={d.type} />
                      <div className="flex-1 min-w-0">
                        <div className="mb-0.5 flex items-center justify-between">
                          <span className="truncate text-[10px] text-slate-600 dark:text-slate-300">{d.name}</span>
                          <span className="ml-1 shrink-0 text-[10px] text-slate-400">{d.dataUsageGb} GB</span>
                        </div>
                        <div className="h-1 w-full rounded-full bg-slate-100 dark:bg-slate-800">
                          <div className="h-full rounded-full bg-blue-500" style={{ width: `${(d.dataUsageGb / maxUsage) * 100}%` }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg bg-white p-3 dark:bg-slate-900">
                <h3 className="mb-3 text-[11px] font-semibold text-slate-500 dark:text-slate-400">Access Control Quick Actions</h3>
                <div className="grid grid-cols-2 gap-2">
                  {quickActions.map((qa) => {
                    const Icon = qa.Icon;
                    return (
                      <button key={qa.title} onClick={qa.onClick} className={`flex min-h-[60px] items-center gap-2 rounded-lg p-2.5 text-left transition-opacity hover:opacity-80 ${qa.bg}`}>
                        <Icon className={`h-5 w-5 shrink-0 ${qa.iconColor}`} />
                        <div>
                          <div className={`text-[10px] font-semibold ${qa.titleColor}`}>{qa.title}</div>
                          <div className="text-[9px] leading-snug text-slate-400">{qa.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <footer className="flex items-center gap-3 rounded-lg bg-blue-50 px-3 py-2 dark:bg-blue-500/10">
              <Info className="h-3.5 w-3.5 shrink-0 text-blue-500" />
              <p className="text-[10px] text-blue-700 dark:text-blue-300">
                Access control lets you manage, monitor, and update the status of every device connected to your network.
              </p>
            </footer>
          </div>
        </main>
      </div>
    </div>
  );
}
