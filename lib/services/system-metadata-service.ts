import {
  Activity,
  AlertOctagon,
  Bell,
  ClipboardList,
  Info,
  LayoutDashboard,
  Monitor,
  Settings,
  Shield,
} from 'lucide-react';
import { AboutPageInfo, ConnectedNode, NavigationItem } from '@/lib/models/system-models';

/**
 * SystemMetadataService centralises the static, rarely-changing descriptive
 * data used across the shell UI (sidebar navigation, connected hardware
 * nodes, and the About page). This data describes the *shape* of the
 * system (what pages exist, what physical devices make up the deployment)
 * rather than live application state, so it lives here instead of in the
 * shared store (lib/store.tsx), which holds data that changes at runtime
 * (devices, alerts, access requests, etc.).
 *
 * Kept as a class (rather than plain exported constants/functions) so that
 * each getter can independently construct fresh model instances on every
 * call. This matters for objects like NavigationItem/ConnectedNode/
 * AboutPageInfo, which wrap lucide-react icon components — returning new
 * instances avoids any risk of shared mutable state being altered by one
 * consumer and leaking into another, even though in practice this data is
 * read-only today.
 */
class SystemMetadataService {
  /**
   * Builds the sidebar's navigation entries. Order here determines the
   * order rendered in Sidebar.tsx.
   *
   * NOTE ON THE ALERTS BADGE: the '2' passed into the Alerts NavigationItem
   * below is a static fallback value only. Sidebar.tsx does not use it —
   * it computes the live badge count itself from the shared store
   * (alerts.filter(a => a.status === 'Active').length) so the number
   * shown always reflects the actual current alert count rather than
   * this hardcoded figure. The static value is left here as the intended
   * default for the NavigationItem model shape, not as the source of
   * truth for the badge that's actually displayed.
   */
  getSidebarNavigationItems() {
    return [
      new NavigationItem('Dashboard', LayoutDashboard, '/dashboard'),
      new NavigationItem('Devices', Monitor, '/devices'),
      new NavigationItem('Access Requests', ClipboardList, '/access-requests'),
      new NavigationItem('Access Control', Shield, '/access-control'),
      new NavigationItem('Activity Logs', Activity, '/activity-log'),
      new NavigationItem('Quarantine', AlertOctagon, '/quarantine'),
      new NavigationItem('Alerts', Bell, '/alerts', 2),
      new NavigationItem('Settings', Settings, '/settings'),
      new NavigationItem('About', Info, '/about'),
    ];
  }

  /**
   * Describes the physical Raspberry Pi devices that make up an MLaNDS
   * deployment, shown in the sidebar's "Connected Nodes" panel. This is
   * descriptive/marketing-style metadata about the hardware architecture,
   * not live telemetry — Sidebar.tsx renders each node's status as
   * "Online" unconditionally rather than polling these devices, since
   * there's currently no live health-check data source for them.
   */
  getSidebarConnectedNodes() {
    return [
      new ConnectedNode('Pi 5 (Controller)', 'Primary network controller'),
      new ConnectedNode('Pi 3 (Scanner)', 'Continuous network scanner'),
      new ConnectedNode('Pi Zero W (Portal)', 'Captive portal'),
    ];
  }

  /**
   * Assembles the static content shown on the About page: product name,
   * version, description, tech stack, and hardware summary. Grouped into
   * a single AboutPageInfo object (rather than several loose exports) so
   * the About page component can request one cohesive value instead of
   * assembling unrelated pieces of text itself.
   */
  getAboutPageInfo() {
    return new AboutPageInfo(
      'Intelligent Multi-Layer Network Defence System',
      'Version 8.8 · MLaNDS',
      'A home and small-office network security console for reviewing device access requests, monitoring connected devices, responding to alerts, and quarantining suspicious traffic in real time.',
      ['Next.js 13 (App Router)', 'TypeScript', 'Tailwind CSS', 'Supabase', 'Recharts', 'Radix UI', 'lucide-react'],
      [
        new ConnectedNode('Pi 3 (Scanner, Controller)', 'Continuously scans the network for new and existing devices. Runs the core decision engine and dashboard API.'),
        new ConnectedNode('Pi Zero W (Portal)', 'Serves the captive portal for quarantined and guest devices.'),
      ],
    );
  }
}

// Exported as a single shared instance (singleton) rather than the class
// itself, since this service is stateless and there is never a reason to
// have more than one — consumers just call systemMetadataService.method()
// directly without needing to instantiate it themselves.
export const systemMetadataService = new SystemMetadataService();
