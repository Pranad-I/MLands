import {
  LayoutDashboard,
  Monitor,
  ClipboardList,
  Shield,
  Activity,
  AlertOctagon,
  Bell,
  Settings,
  Info,
  Wifi,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "@/components/Link";
import { usePathname } from "@/lib/router-compat";
import { useAppData } from "@/lib/store";

type SidebarProps = {
  collapsed?: boolean;
  onToggle?: () => void;
};

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Devices", icon: Monitor, href: "/devices" },
  { label: "Access Requests", icon: ClipboardList, href: "/access-requests" },
  { label: "Access Control", icon: Shield, href: "/access-control" },
  { label: "Activity Logs", icon: Activity, href: "/activity-log" },
  { label: "Quarantine", icon: AlertOctagon, href: "/quarantine" },
  { label: "Alerts", icon: Bell, href: "/alerts" },
  { label: "Settings", icon: Settings, href: "/settings" },
  { label: "About", icon: Info, href: "/about" },
];

const connectedNodes = [
  { name: "Pi 5 (Controller)", status: "Online" },
  { name: "Pi 3 (Scanner)", status: "Online" },
  { name: "Pi Zero W (Portal)", status: "Online" },
];

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
  const activeAlerts = alerts.filter((a) => a.status === "Active").length;
  const online = devices.filter((d) => d.status !== "Blocked").length;
  const uptime = now
    ? `${Math.floor(((now.getTime() / 1000) % 86400) / 3600)}h ${Math.floor(((now.getTime() / 1000) % 3600) / 60)}m`
    : "—";
  const lastScan = now ? now.toLocaleTimeString() : "—";

  return (
    <aside
      className={`flex h-full flex-col bg-[#020f1f] text-white shrink-0 transition-[width] duration-300 ease-in-out ${
        collapsed ? "w-20" : "w-44"
      }`}
    >
      <header
        className={`flex items-start gap-2 border-b border-[#0d1f35] px-3 pt-3 pb-2 ${collapsed ? "justify-center" : ""}`}
      >
        <div className="mt-0.5 flex h-9 w-8 items-center justify-center rounded bg-[#1a3a6e]">
          <Shield className="h-[18px] w-[18px] text-[#4d8aff]" />
        </div>
        <div
          className={`min-w-0 overflow-hidden transition-all duration-300 ${collapsed ? "max-w-0 opacity-0" : "max-w-[10rem] opacity-100"}`}
        >
          <p className="text-[10px] font-normal leading-tight text-[#8e929b]">
            Intelligent Multi-Layer
          </p>
          <p className="mt-0.5 text-[8px] font-light leading-tight text-[#6d717b]">
            Network Defence System
          </p>
        </div>
      </header>

      <nav className={`mt-1 flex flex-col px-1 flex-1 ${collapsed ? "items-stretch" : ""}`}>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const badge = item.label === "Alerts" ? activeAlerts : 0;
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`group flex items-center rounded px-2.5 py-2 text-[9px] transition-colors ${
                isActive
                  ? "bg-[#0d2040] text-[#7da5fb] font-bold"
                  : "text-[#757982] hover:text-[#a0a4ae] hover:bg-[#0a1a2e]"
              }`}
              title={collapsed ? item.label : undefined}
            >
              <Icon
                className={`h-3.5 w-3.5 shrink-0 ${isActive ? "text-[#7da5fb]" : "text-[#555a66]"}`}
              />
              <span
                className={`flex-1 overflow-hidden truncate transition-all duration-300 ${collapsed ? "max-w-0 opacity-0" : "max-w-[8rem] opacity-100"}`}
              >
                {item.label}
              </span>
              {badge ? (
                <span
                  className={`flex h-[15px] w-[15px] shrink-0 items-center justify-center rounded-full bg-[#d9253a] text-[6.5px] font-bold text-white transition-all duration-300 ${collapsed ? "scale-0 opacity-0" : "scale-100 opacity-100"}`}
                >
                  {badge}
                </span>
              ) : null}
              <div
                className={`h-4 w-0.5 shrink-0 rounded-full bg-[#4d8aff] transition-all duration-300 ${isActive ? "opacity-100" : "opacity-0"} ${collapsed ? "hidden" : ""}`}
              />
            </Link>
          );
        })}
      </nav>

      <div
        className={`mx-2 mb-0 overflow-hidden rounded-t bg-[#0a1627] transition-all duration-300 ${collapsed ? "max-h-0 opacity-0" : "max-h-40 opacity-100"}`}
      >
        <div className="px-2 pb-2 pt-2.5">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#22c55e] opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#136e33]" />
            </span>
            <span className="text-[7px] font-light text-[#7d818b]">System Status</span>
          </div>
          <p className="text-[6px] font-light text-[#136e33] mb-1">
            {activeAlerts > 0
              ? `Monitoring · ${activeAlerts} active alert${activeAlerts > 1 ? "s" : ""}`
              : "Active"}
          </p>
          <p className="text-[6px] font-light text-[#565e71] tabular-nums">Uptime: {uptime}</p>
          <p className="text-[6px] font-light text-[#555e72] mt-0.5 tabular-nums">
            Last Scan: {lastScan}
          </p>
          <p className="text-[6px] font-light text-[#555e72] mt-0.5">
            {online} devices online · {quarantine.length} quarantined
          </p>
        </div>
      </div>

      <div className="h-px bg-[#091321] mx-2" />

      <div
        className={`mx-2 mb-0 overflow-hidden bg-[#0a1627] transition-all duration-300 ${collapsed ? "max-h-0 opacity-0" : "max-h-40 opacity-100"}`}
      >
        <div className="px-2 pb-2.5 pt-2">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Wifi className="h-2 w-2 text-[#797e88]" />
            <span className="text-[7px] font-light text-[#797e88]">Connected Nodes</span>
          </div>
          {connectedNodes.map((node) => (
            <div key={node.name} className="flex items-center justify-between mb-1">
              <span className="text-[6px] font-light text-[#6c707b] truncate mr-1">
                {node.name}
              </span>
              <span className="text-[6px] font-normal text-[#137036] shrink-0">{node.status}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 bg-[#011126]" />
    </aside>
  );
}
