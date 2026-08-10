'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Eye, Settings2, Monitor, Smartphone, Laptop, Tv, Printer, HelpCircle,
  Search, SlidersHorizontal, Download, ChevronRight, X, Check, Ban, ShieldAlert,
} from 'lucide-react';
import { useAppData, type Device, type DeviceStatus } from '@/lib/store';
import { csvExportService } from '@/lib/services/csv-export-service';

function statusStyle(status: DeviceStatus) {
  switch (status) {
    case 'Approved': return 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30';
    case 'Blocked': return 'bg-red-50 text-red-600 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/30';
    case 'Quarantined': return 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30';
    default: return 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-700/40 dark:text-slate-300 dark:border-slate-600';
  }
}

function riskStyle(risk: string) {
  switch (risk) {
    case 'Low': return 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30';
    case 'Medium': return 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30';
    case 'High': return 'bg-red-50 text-red-600 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/30';
    default: return 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-700/40 dark:text-slate-300 dark:border-slate-600';
  }
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

type Props = { devices: Device[] };
const PAGE_SIZE = 8;

export function ManagedDevicesTable({ devices }: Props) {
  const { updateDeviceStatus } = useAppData();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<DeviceStatus | 'All'>('All');
  const [viewDevice, setViewDevice] = useState<Device | null>(null);
  const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null);

  const filtered = useMemo(() => devices.filter((d) => {
    const matchesSearch = d.name.toLowerCase().includes(search.toLowerCase())
      || d.ipAddress.includes(search)
      || d.macAddress.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'All' || d.status === statusFilter;
    return matchesSearch && matchesStatus;
  }), [devices, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function act(id: string, status: DeviceStatus, label: string) {
    updateDeviceStatus(id, status);
    setMenuOpenFor(null);
    toast.success(label);
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2 rounded-lg bg-white p-2 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-xs font-semibold text-slate-600 dark:text-slate-300">Managed Devices</h3>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search devices..."
              className="h-7 w-32 rounded border border-slate-200 bg-white pl-6 pr-2 text-[11px] text-slate-600 outline-none placeholder:text-slate-400 focus:border-blue-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            />
          </div>
          <div className="relative">
            <button
              onClick={() => setShowFilters((v) => !v)}
              className="flex h-7 items-center gap-1 rounded border border-slate-200 bg-slate-50 px-2 text-[11px] font-medium text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              <SlidersHorizontal className="h-3 w-3" /> Filters
            </button>
            {showFilters && (
              <div className="absolute right-0 top-8 z-10 w-40 rounded-lg border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-700 dark:bg-slate-800">
                {(['All', 'Approved', 'Blocked', 'Quarantined', 'Unknown'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => { setStatusFilter(s); setPage(1); setShowFilters(false); }}
                    className={`block w-full rounded px-2 py-1.5 text-left text-[11px] ${statusFilter === s ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700'}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => csvExportService.exportRows(
              'managed-devices',
              ['Device Name', 'IP Address', 'MAC Address', 'Status', 'Risk Level', 'First Seen', 'Last Seen'],
              filtered.map((d) => [d.name, d.ipAddress, d.macAddress, d.status, d.risk, d.firstSeen, d.lastSeen]),
            )}
            className="flex h-7 items-center gap-1 rounded border border-slate-200 bg-white px-2 text-[11px] font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Download className="h-3 w-3" /> Export
          </button>
        </div>
      </div>

      <div className="rounded-lg bg-white dark:bg-slate-900">
        <div className="border-b border-slate-100 px-3 py-2 dark:border-slate-800">
          <div className="grid grid-cols-[1.4fr_1fr_1.2fr_.75fr_.7fr_.8fr_.8fr_.5fr] gap-2 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
            <div>Device Name</div>
            <div>IP Address</div>
            <div>MAC Address</div>
            <div>Status</div>
            <div>Risk Level</div>
            <div>First Seen</div>
            <div>Last Seen</div>
            <div>Actions</div>
          </div>
        </div>

        {paged.length === 0 && (
          <div className="px-3 py-8 text-center text-[11px] text-slate-400">No devices match your search or filters.</div>
        )}

        <div>
          {paged.map((device, i) => (
            <div
              key={device.id}
              className={`grid grid-cols-[1.4fr_1fr_1.2fr_.75fr_.7fr_.8fr_.8fr_.5fr] items-center gap-2 px-3 py-2 text-[11px] ${i < paged.length - 1 ? 'border-b border-slate-50 dark:border-slate-800/60' : ''} hover:bg-slate-50/60 dark:hover:bg-slate-800/40`}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <DeviceIcon type={device.type} />
                <span className="truncate text-slate-600 dark:text-slate-300">{device.name}</span>
              </div>
              <div className="text-slate-500 dark:text-slate-400">{device.ipAddress}</div>
              <div className="truncate text-slate-500 dark:text-slate-400">{device.macAddress}</div>
              <div>
                <span className={`inline-flex items-center justify-center rounded border px-1.5 py-0.5 text-[9px] font-medium ${statusStyle(device.status)}`}>
                  {device.status}
                </span>
              </div>
              <div>
                <span className={`inline-flex items-center justify-center rounded border px-1.5 py-0.5 text-[9px] font-medium ${riskStyle(device.risk)}`}>
                  {device.risk}
                </span>
              </div>
              <div className="text-slate-400">{device.firstSeen}</div>
              <div className="text-slate-400">{device.lastSeen}</div>
              <div className="relative flex items-center gap-2">
                <button onClick={() => setViewDevice(device)} className="text-slate-400 hover:text-blue-500" title="View details">
                  <Eye className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => setMenuOpenFor(menuOpenFor === device.id ? null : device.id)} className="text-slate-400 hover:text-blue-500" title="Manage device">
                  <Settings2 className="h-3.5 w-3.5" />
                </button>
                {menuOpenFor === device.id && (
                  <div className="absolute right-0 top-6 z-10 w-32 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
                    <button onClick={() => act(device.id, 'Approved', 'Device approved')} className="flex w-full items-center gap-1.5 px-2.5 py-1.5 text-left text-[11px] text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700">
                      <Check className="h-3 w-3 text-emerald-500" /> Approve
                    </button>
                    <button onClick={() => act(device.id, 'Quarantined', 'Device quarantined')} className="flex w-full items-center gap-1.5 px-2.5 py-1.5 text-left text-[11px] text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700">
                      <ShieldAlert className="h-3 w-3 text-amber-500" /> Quarantine
                    </button>
                    <button onClick={() => act(device.id, 'Blocked', 'Device blocked')} className="flex w-full items-center gap-1.5 px-2.5 py-1.5 text-left text-[11px] text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10">
                      <Ban className="h-3 w-3" /> Block
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between px-3 py-2">
          <p className="text-[10px] text-slate-400">
            Showing {filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} devices
          </p>
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(totalPages, 3) }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`flex h-6 w-6 items-center justify-center rounded text-[10px] font-medium ${
                  page === p
                    ? 'bg-blue-600 text-white'
                    : 'border border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400'
                }`}
              >
                {p}
              </button>
            ))}
            {totalPages > 3 && (
              <button
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                className="flex h-6 w-6 items-center justify-center rounded border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
              >
                <ChevronRight className="h-3 w-3 text-slate-400" />
              </button>
            )}
          </div>
        </div>
      </div>

      {viewDevice && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-900/40 px-4" onClick={() => setViewDevice(null)}>
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">Device Details</h2>
              <button onClick={() => setViewDevice(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-slate-400">Name</span><span className="font-medium text-slate-700 dark:text-slate-200">{viewDevice.name}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">IP Address</span><span className="font-medium text-slate-700 dark:text-slate-200">{viewDevice.ipAddress}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">MAC Address</span><span className="font-medium text-slate-700 dark:text-slate-200">{viewDevice.macAddress}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Status</span><span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${statusStyle(viewDevice.status)}`}>{viewDevice.status}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Risk</span><span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${riskStyle(viewDevice.risk)}`}>{viewDevice.risk}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">First Seen</span><span className="font-medium text-slate-700 dark:text-slate-200">{viewDevice.firstSeen}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Last Seen</span><span className="font-medium text-slate-700 dark:text-slate-200">{viewDevice.lastSeen}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Data Usage</span><span className="font-medium text-slate-700 dark:text-slate-200">{viewDevice.dataUsageGb} GB</span></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
