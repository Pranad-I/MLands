'use client';

import { useEffect, useState } from 'react';
import {
  Shield,
  Wifi,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { systemMetadataService } from '@/lib/services/system-metadata-service';
import { useAppData } from '@/lib/store';

/**
 * Sidebar.tsx renders the persistent left-hand navigation shown on every
 * page: branding header, nav links, a live "System Status" panel, and a
 * "Connected Nodes" panel listing the physical hardware.
 *
 * This component reads live application state from the shared store
 * (useAppData) so the alert badge and device counts always reflect the
 * current state of the app, rather than the static placeholder values
 * returned by systemMetadataService (see the NOTE in that service's
 * getSidebarNavigationItems for why the static badge value is
 * intentionally unused here).
 */

type SidebarProps = {
  collapsed?: boolean;
  onToggle?: () => void;
};

// navItems and connectedNodes are computed once at module load rather than
// inside the component body. Both come from systemMetadataService, which
// returns static data that never changes at runtime (see that service's
// documentation), so there's no reason to recompute them on every render
// or every time a new Sidebar instance mounts.
const navItems = systemMetadataService.getSidebarNavigationItems();
const connectedNodes = systemMetadataService.getSidebarConnectedNodes();

/**
 * useLiveClock is a small custom hook that re-renders its caller once per
 * second with the current Date. It exists as its own hook (rather than
 * inline state + effect in Sidebar itself) so the "tick every second"
 * behaviour is self-contained and easy to reuse if another component
 * later needs the same live-updating clock.
 *
 * The state starts as null and is set to the real Date only inside the
 * effect (not directly in useState's initialiser). This is deliberate:
 * Next.js renders this component once on the server and once on the
 * client, and `new Date()` would produce two different timestamps in
 * those two environments, causing a hydration mismatch warning. Starting
 * from null and only setting a real value client-side (inside useEffect,
 * which never runs during server rendering) avoids that mismatch — the
 * Sidebar just shows '—' for uptime/last-scan for one frame before the
 * first real tick arrives.
 */
function useLiveClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export function Sidebar({ collapsed = false, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const { alerts, devices, quarantine } = useAppData();
  const now = useLiveClock();

  // Active alert count drives the red badge shown next to the "Alerts"
  // nav item, computed live from the store instead of the static badge
  // value in systemMetadataService so it always matches the alerts a
  // user would actually see on the Alerts page.
  const activeAlerts = alerts.filter((a) => a.status === 'Active').length;

  // "Online" here is approximated as "not Blocked" — the store's Device
  // type doesn't currently track a genuine connectivity/heartbeat status,
  // so any device that hasn't been explicitly blocked is treated as
  // currently reachable on the network.
  const online = devices.filter((d) => d.status !== 'Blocked').length;

  // NOTE ON "UPTIME": this value is derived from the current time of day
  // (milliseconds since midnight, converted to h/m), not from a genuine
  // application start timestamp. There is currently no persisted "app
  // started at" reference to measure real uptime against, so this is a
  // presentational stand-in that changes over the course of a day rather
  // than a literal measure of how long the system has been running. It
  // is documented here rather than left ambiguous so this limitation is
  // clear to anyone reading or extending this component later.
  const uptime = now
    ? `${Math.floor((now.getTime() / 1000) % 86400 / 3600)}h ${Math.floor((now.getTime() / 1000) % 3600 / 60)}m`
    : '—';

  // "Last Scan" likewise stands in for a genuine last-network-scan
  // timestamp (which would come from a real scanning subsystem); here it
  // simply reflects the current time via the live clock, giving the
  // status panel a sense of activity without a real scan event to report.
  const lastScan = now ? now.toLocaleTimeString() : '—';

  return (
    <aside
      className={`flex h-full flex-col bg-[#020f1f] text-white shrink-0 transition-[width] duration-300 ease-in-out ${
        collapsed ? 'w-20' : 'w-44'
      }`}
    >
      <header className={`flex items-start gap-2 border-b border-[#0d1f35] px-3 pt-3 pb-2 ${collapsed ? 'justify-center' : ''}`}>
        <div className="mt-0.5 flex h-9 w-8 items-center justify-center rounded bg-[#1a3a6e]">
          <Shield className="h-[18px] w-[18px] text-[#4d8aff]" />
        </div>
        <div className={`min-w-0 overflow-hidden transition-all duration-300 ${collapsed ? 'max-w-0 opacity-0' : 'max-w-[10rem] opacity-100'}`}>
          <p className="text-[10px] font-normal leading-tight text-[#8e929b]">
            Intelligent Multi-Layer
          </p>
          <p className="mt-0.5 text-[8px] font-light leading-tight text-[#6d717b]">
            Network Defence System
          </p>
        </div>
      </header>

      <nav className={`mt-1 flex flex-col px-1 flex-1 ${collapsed ? 'items-stretch' : ''}`}>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          // Only the Alerts item ever shows a live badge; every other nav
          // item's badge is forced to 0 (hidden) since none of the other
          // pages currently have a "count of things needing attention"
          // concept worth surfacing in the nav.
          const badge = item.label === 'Alerts' ? activeAlerts : 0;

          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`group flex items-center rounded px-2.5 py-2 text-[9px] transition-colors ${
                isActive
                  ? 'bg-[#0d2040] text-[#7da5fb] font-bold'
                  : 'text-[#757982] hover:text-[#a0a4ae] hover:bg-[#0a1a2e]'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <Icon
                className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-[#7da5fb]' : 'text-[#555a66]'}`}
              />
              <span
                className={`flex-1 overflow-hidden truncate transition-all duration-300 ${collapsed ? 'max-w-0 opacity-0' : 'max-w-[8rem] opacity-100'}`}
              >
                {item.label}
              </span>
              {badge ? (
                <span
                  className={`flex h-[15px] w-[15px] shrink-0 items-center justify-center rounded-full bg-[#d9253a] text-[6.5px] font-bold text-white transition-all duration-300 ${collapsed ? 'scale-0 opacity-0' : 'scale-100 opacity-100'}`}
                >
                  {badge}
                </span>
              ) : null}
              <div
                className={`h-4 w-0.5 shrink-0 rounded-full bg-[#4d8aff] transition-all duration-300 ${isActive ? 'opacity-100' : 'opacity-0'} ${collapsed ? 'hidden' : ''}`}
              />
            </Link>
          );
        })}
      </nav>

      {/*
        System Status panel: a pulsing green dot plus the live-computed
        values above (activeAlerts, uptime, lastScan, online, quarantine
        count). The two nested spans forming the dot use Tailwind's
        animate-ping utility on an absolutely-positioned duplicate to
        create the "pulsing ring" effect, while the second, non-animated
        span underneath renders the solid dot itself — animate-ping alone
        would make the dot fade to fully transparent at the end of each
        cycle, which the solid span underneath prevents.
      */}
      <div className={`mx-2 mb-0 overflow-hidden rounded-t bg-[#0a1627] transition-all duration-300 ${collapsed ? 'max-h-0 opacity-0' : 'max-h-40 opacity-100'}`}>
        <div className="px-2 pb-2 pt-2.5">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#22c55e] opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#136e33]" />
            </span>
            <span className="text-[7px] font-light text-[#7d818b]">System Status</span>
          </div>
          <p className="text-[6px] font-light text-[#136e33] mb-1">
            {activeAlerts > 0 ? `Monitoring · ${activeAlerts} active alert${activeAlerts > 1 ? 's' : ''}` : 'Active'}
          </p>
          <p className="text-[6px] font-light text-[#565e71] tabular-nums">Uptime: {uptime}</p>
          <p className="text-[6px] font-light text-[#555e72] mt-0.5 tabular-nums">Last Scan: {lastScan}</p>
          <p className="text-[6px] font-light text-[#555e72] mt-0.5">
            {online} devices online · {quarantine.length} quarantined
          </p>
        </div>
      </div>

      <div className="h-px bg-[#091321] mx-2" />

      {/*
        Connected Nodes panel: lists the physical hardware from
        systemMetadataService.getSidebarConnectedNodes(). Every node's
        status is hardcoded to "Online" here rather than reflecting a real
        health check, because there is currently no data source that
        reports live connectivity for these devices (see the NOTE in
        getSidebarConnectedNodes in system-metadata-service.ts).
      */}
      <div className={`mx-2 mb-0 overflow-hidden bg-[#0a1627] transition-all duration-300 ${collapsed ? 'max-h-0 opacity-0' : 'max-h-40 opacity-100'}`}>
        <div className="px-2 pb-2.5 pt-2">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Wifi className="h-2 w-2 text-[#797e88]" />
            <span className="text-[7px] font-light text-[#797e88]">Connected Nodes</span>
          </div>
          {connectedNodes.map((node) => (
            <div key={node.name} className="flex items-center justify-between mb-1">
              <span className="text-[6px] font-light text-[#6c707b] truncate mr-1">{node.name}</span>
              <span className="text-[6px] font-normal text-[#137036] shrink-0">Online</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 bg-[#011126]" />
    </aside>
  );
}
