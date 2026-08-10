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

class SystemMetadataService {
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

  getSidebarConnectedNodes() {
    return [
      new ConnectedNode('Pi 5 (Controller)', 'Primary network controller'),
      new ConnectedNode('Pi 3 (Scanner)', 'Continuous network scanner'),
      new ConnectedNode('Pi Zero W (Portal)', 'Captive portal'),
    ];
  }

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

export const systemMetadataService = new SystemMetadataService();
