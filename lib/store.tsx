'use client';

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

/**
 * Central in-memory store for demo dashboards.
 *
 * The provider manages shared state for:
 * - managed devices
 * - alert triage data
 * - quarantine records
 * - activity logs
 *
 * Mutations in one page update all other pages immediately via React Context.
 */
export type DeviceType = 'phone' | 'laptop' | 'computer' | 'tv' | 'printer' | 'other';
export type DeviceStatus = 'Approved' | 'Blocked' | 'Quarantined' | 'Unknown';
export type RiskLevel = 'None' | 'Low' | 'Medium' | 'High';

export type Device = {
  id: string;
  name: string;
  type: DeviceType;
  ipAddress: string;
  macAddress: string;
  status: DeviceStatus;
  risk: RiskLevel;
  dataUsageGb: number;
  firstSeen: string;
  lastSeen: string;
};

export type Severity = 'Critical' | 'Warning' | 'Info';
export type AlertStatus = 'Active' | 'Resolved' | 'Dismissed';
export type AlertType =
  | 'Multiple Failed Logins' | 'New Device Detected' | 'Unusual Data Transfer'
  | 'Port Scan Detected' | 'Malicious Traffic' | 'Policy Violation' | 'System';

export type SecurityAlert = {
  id: string;
  title: string;
  description: string;
  device: string;
  alertType: AlertType;
  severity: Severity;
  status: AlertStatus;
  timestamp: string;
  minutesAgo: number;
};

export type QuarantinedDevice = {
  id: string;
  name: string;
  type: DeviceType;
  ipAddress: string;
  macAddress: string;
  reason: string;
  risk: RiskLevel;
  quarantinedAt: string;
  minutesQuarantined: number;
  autoQuarantined: boolean;
  autoReleaseIn: string | null;
};

export type EventType = 'ALERT' | 'WARNING' | 'INFO';

export type LogEntry = {
  id: string;
  device: string;
  ipAddress: string;
  action: DeviceStatus;
  eventType: EventType;
  risk: RiskLevel;
  performedBy: string;
  details: string;
  timestamp: string;
};

const seedDevices: Device[] = [
  { id: 'd1', firstSeen: '17/05/2026 09:12 AM', name: 'Admin-PC', type: 'computer', ipAddress: '192.168.1.10', macAddress: 'AA:BB:CC:DD:EE:01', status: 'Approved', risk: 'None', dataUsageGb: 9.4, lastSeen: 'Just now' },
  { id: 'd2', firstSeen: '16/05/2026 08:55 AM', name: 'iPhone 14', type: 'phone', ipAddress: '192.168.1.11', macAddress: 'AA:BB:CC:DD:EE:02', status: 'Approved', risk: 'Low', dataUsageGb: 4.2, lastSeen: '2 min ago' },
  { id: 'd3', firstSeen: '17/05/2026 09:45 AM', name: 'Laptop-Student', type: 'laptop', ipAddress: '192.168.1.12', macAddress: 'AA:BB:CC:DD:EE:03', status: 'Approved', risk: 'Low', dataUsageGb: 6.1, lastSeen: '5 min ago' },
  { id: 'd4', firstSeen: '18/05/2026 09:01 AM', name: 'Unknown Device', type: 'other', ipAddress: '192.168.1.45', macAddress: 'AA:BB:CC:DD:EE:44', status: 'Unknown', risk: 'High', dataUsageGb: 0.1, lastSeen: '1 hr ago' },
  { id: 'd5', firstSeen: '17/05/2026 08:30 AM', name: 'Smart TV', type: 'tv', ipAddress: '192.168.1.23', macAddress: 'AA:BB:CC:DD:EE:05', status: 'Approved', risk: 'None', dataUsageGb: 18.7, lastSeen: '10 min ago' },
  { id: 'd6', firstSeen: '17/05/2026 09:20 AM', name: 'Unknown Device', type: 'laptop', ipAddress: '192.168.1.77', macAddress: 'AA:BB:CC:DD:EE:77', status: 'Unknown', risk: 'Medium', dataUsageGb: 1.3, lastSeen: '34 min ago' },
  { id: 'd7', firstSeen: '17/05/2026 09:12 AM', name: 'Printer', type: 'printer', ipAddress: '192.168.1.25', macAddress: 'AA:BB:CC:DD:EE:06', status: 'Approved', risk: 'None', dataUsageGb: 0.4, lastSeen: '20 min ago' },
  { id: 'd8', firstSeen: '17/05/2026 07:55 AM', name: 'Unknown Device', type: 'other', ipAddress: '192.168.1.88', macAddress: 'AA:BB:CC:DD:EE:88', status: 'Unknown', risk: 'Low', dataUsageGb: 0.02, lastSeen: '2 hrs ago' },
];

const seedAlerts: SecurityAlert[] = [
  { id: 'a1', title: 'Multiple Failed Logins', description: '5 failed login attempts detected', device: 'Unknown Device (192.168.1.200)', alertType: 'Multiple Failed Logins', severity: 'Critical', status: 'Active', timestamp: '18/05/2026 10:23:11 AM', minutesAgo: 2 },
  { id: 'a2', title: 'Unusual Data Transfer', description: 'High data transfer volume detected', device: 'Unknown Device (192.168.1.145)', alertType: 'Unusual Data Transfer', severity: 'Warning', status: 'Active', timestamp: '18/05/2026 10:18:12 AM', minutesAgo: 7 },
  { id: 'a3', title: 'New Device Detected', description: 'New device connected to network', device: 'Laptop-Student (192.168.1.50)', alertType: 'New Device Detected', severity: 'Warning', status: 'Resolved', timestamp: '18/05/2026 10:15:09 AM', minutesAgo: 10 },
  { id: 'a4', title: 'Port Scan Detected', description: 'Port scanning activity detected', device: 'Unknown Device (192.168.1.90)', alertType: 'Port Scan Detected', severity: 'Info', status: 'Active', timestamp: '18/05/2026 10:11:50 AM', minutesAgo: 13 },
  { id: 'a5', title: 'Malicious Traffic', description: 'Potential malicious traffic blocked', device: 'Unknown Device (192.168.1.120)', alertType: 'Malicious Traffic', severity: 'Critical', status: 'Resolved', timestamp: '18/05/2026 09:58:43 AM', minutesAgo: 26 },
  { id: 'a6', title: 'Policy Violation', description: 'Device attempted restricted access', device: 'Smart TV (192.168.1.33)', alertType: 'Policy Violation', severity: 'Info', status: 'Resolved', timestamp: '18/05/2026 09:45:22 AM', minutesAgo: 39 },
  { id: 'a7', title: 'Unusual Access Time', description: 'Access attempt outside normal hours', device: 'iPhone 14 (192.168.1.77)', alertType: 'Policy Violation', severity: 'Info', status: 'Resolved', timestamp: '18/05/2026 09:20:05 AM', minutesAgo: 64 },
];

const seedQuarantine: QuarantinedDevice[] = [
  { id: 'q1', name: 'Unknown Device', type: 'other', ipAddress: '192.168.1.88', macAddress: 'AA:BB:CC:DD:EE:88', reason: 'Multiple failed access attempts', risk: 'High', quarantinedAt: '10:21 AM', minutesQuarantined: 155, autoQuarantined: true, autoReleaseIn: '2h 5m' },
  { id: 'q2', name: 'Suspicious Device', type: 'other', ipAddress: '192.168.1.77', macAddress: 'AA:BB:CC:DD:EE:77', reason: 'Unusual connection time', risk: 'Medium', quarantinedAt: '10:45 AM', minutesQuarantined: 131, autoQuarantined: true, autoReleaseIn: '1h 40m' },
  { id: 'q3', name: 'Unknown Device', type: 'other', ipAddress: '192.168.1.45', macAddress: 'AA:BB:CC:DD:EE:44', reason: 'Not in trusted list', risk: 'High', quarantinedAt: '11:02 AM', minutesQuarantined: 114, autoQuarantined: false, autoReleaseIn: null },
  { id: 'q4', name: 'Unknown Device', type: 'other', ipAddress: '192.168.1.50', macAddress: 'AA:BB:CC:DD:EE:50', reason: 'Port scanning attempt detected', risk: 'Medium', quarantinedAt: '11:18 AM', minutesQuarantined: 98, autoQuarantined: true, autoReleaseIn: '3h 12m' },
];

const seedLogs: LogEntry[] = [
  { id: 'l1', device: 'Unknown Device', ipAddress: '192.168.1.45', action: 'Unknown', eventType: 'ALERT', risk: 'High', performedBy: 'System', details: 'High risk device detected', timestamp: '10:21:15 AM' },
  { id: 'l2', device: 'Unknown Device', ipAddress: '192.168.1.77', action: 'Unknown', eventType: 'WARNING', risk: 'Medium', performedBy: 'System', details: 'New unknown device connected', timestamp: '10:19:42 AM' },
  { id: 'l3', device: 'Smart TV', ipAddress: '192.168.1.23', action: 'Approved', eventType: 'INFO', risk: 'None', performedBy: 'Admin', details: 'Device approved by administrator', timestamp: '10:18:04 AM' },
  { id: 'l4', device: 'Unknown Device', ipAddress: '192.168.1.50', action: 'Unknown', eventType: 'INFO', risk: 'Low', performedBy: 'System', details: 'Device disconnected', timestamp: '10:16:33 AM' },
  { id: 'l5', device: 'System', ipAddress: '-', action: 'Approved', eventType: 'INFO', risk: 'None', performedBy: 'System', details: 'System scan completed', timestamp: '10:15:10 AM' },
  { id: 'l6', device: 'Unknown Device', ipAddress: '192.168.1.77', action: 'Unknown', eventType: 'WARNING', risk: 'Medium', performedBy: 'System', details: 'Multiple failed access attempts', timestamp: '10:14:05 AM' },
  { id: 'l7', device: 'Unknown Device', ipAddress: '192.168.1.88', action: 'Unknown', eventType: 'INFO', risk: 'Low', performedBy: 'System', details: 'Device access request submitted', timestamp: '10:12:30 AM' },
];

function timestampNow() {
  return new Date().toLocaleString('en-GB', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true,
  });
}

function eventTypeFor(status: DeviceStatus): EventType {
  if (status === 'Blocked' || status === 'Quarantined') return 'ALERT';
  if (status === 'Unknown') return 'WARNING';
  return 'INFO';
}

type AppDataContextValue = {
  devices: Device[];
  alerts: SecurityAlert[];
  quarantine: QuarantinedDevice[];
  logs: LogEntry[];
  updateDeviceStatus: (id: string, status: DeviceStatus, by?: string) => void;
  addDevice: (device: Omit<Device, 'id' | 'lastSeen'>) => void;
  removeDevice: (id: string) => void;
  scanNetwork: () => Device | null;
  setAlertStatus: (id: string, status: AlertStatus) => void;
  resolveAllAlerts: () => void;
  releaseFromQuarantine: (id: string) => void;
  blockPermanently: (id: string) => void;
  extendQuarantine: (id: string) => void;
};

const AppDataContext = createContext<AppDataContextValue | null>(null);

// Deterministic labels used to simulate discovery of unknown devices during scans.
const scanCandidates: Array<{ name: string; type: DeviceType }> = [
  { name: 'Unknown Device', type: 'other' },
  { name: 'Unregistered Sensor', type: 'other' },
  { name: 'Guest Phone', type: 'phone' },
  { name: 'New Laptop', type: 'laptop' },
];

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [devices, setDevices] = useState<Device[]>(seedDevices);
  const [alerts, setAlerts] = useState<SecurityAlert[]>(seedAlerts);
  const [quarantine, setQuarantine] = useState<QuarantinedDevice[]>(seedQuarantine);
  const [logs, setLogs] = useState<LogEntry[]>(seedLogs);

  /**
   * Appends an audit record for operator and system actions.
   */
  function logAction(device: string, ipAddress: string, action: DeviceStatus, details: string, performedBy = 'Admin', risk: RiskLevel = 'None') {
    setLogs((prev) => [
      { id: `l${Date.now()}`, device, ipAddress, action, eventType: eventTypeFor(action), risk, performedBy, details, timestamp: timestampNow() },
      ...prev,
    ]);
  }

  function updateDeviceStatus(id: string, status: DeviceStatus, by = 'Admin') {
    setDevices((prev) => prev.map((device) => {
      if (device.id !== id) return device;
      logAction(device.name, device.ipAddress, status, `Status changed to ${status} by ${by}.`, by, device.risk);
      return { ...device, status };
    }));

    if (status === 'Quarantined') {
      setDevices((prev) => {
        const targetDevice = prev.find((device) => device.id === id);
        if (targetDevice) {
          setQuarantine((previousQuarantine) => [
            { id: `q${Date.now()}`, name: targetDevice.name, type: targetDevice.type, ipAddress: targetDevice.ipAddress, macAddress: targetDevice.macAddress, reason: 'Manually quarantined from the Devices page.', risk: targetDevice.risk === 'None' ? 'Medium' : targetDevice.risk, quarantinedAt: 'Just now', minutesQuarantined: 0, autoQuarantined: false, autoReleaseIn: null },
            ...previousQuarantine,
          ]);
        }
        return prev;
      });
    }
  }

  function addDevice(device: Omit<Device, 'id' | 'lastSeen'>) {
    const newDevice: Device = { ...device, id: `d${Date.now()}`, firstSeen: 'Just now', lastSeen: 'Just now' };
    setDevices((prev) => [newDevice, ...prev]);
    logAction(newDevice.name, newDevice.ipAddress, 'Unknown', 'New device detected on the network.', 'System', newDevice.risk);
  }

  function removeDevice(id: string) {
    setDevices((prev) => {
      const targetDevice = prev.find((device) => device.id === id);
      if (targetDevice) logAction(targetDevice.name, targetDevice.ipAddress, 'Blocked', 'Device removed from managed device list.', 'Admin', targetDevice.risk);
      return prev.filter((device) => device.id !== id);
    });
  }

  function scanNetwork(): Device | null {
    // Simulates a network scan turning up a new, not-yet-classified device.
    const candidateDevice = scanCandidates[Math.floor(Math.random() * scanCandidates.length)];
    const hostOctet = 100 + Math.floor(Math.random() * 150);
    const newDevice: Device = {
      id: `d${Date.now()}`,
      name: candidateDevice.name,
      type: candidateDevice.type,
      ipAddress: `192.168.1.${hostOctet}`,
      macAddress: `AA:BB:CC:DD:${hostOctet.toString(16).toUpperCase().padStart(2, '0')}:${Math.floor(Math.random() * 90 + 10)}`,
      status: 'Unknown',
      risk: Math.random() > 0.5 ? 'High' : 'Medium',
      dataUsageGb: Math.round(Math.random() * 20) / 10,
      firstSeen: 'Just now',
      lastSeen: 'Just now',
    };
    setDevices((prev) => [newDevice, ...prev]);
    logAction(newDevice.name, newDevice.ipAddress, 'Unknown', 'Detected during manual network scan.', 'System', newDevice.risk);
    return newDevice;
  }

  function setAlertStatus(id: string, status: AlertStatus) {
    setAlerts((prev) => prev.map((alert) => (alert.id === id ? { ...alert, status } : alert)));
  }

  function resolveAllAlerts() {
    setAlerts((prev) => prev.map((alert) => (alert.status === 'Active' ? { ...alert, status: 'Resolved' } : alert)));
  }

  function releaseFromQuarantine(id: string) {
    setQuarantine((prev) => {
      const quarantinedDevice = prev.find((device) => device.id === id);
      if (quarantinedDevice) {
        logAction(quarantinedDevice.name, quarantinedDevice.ipAddress, 'Approved', 'Released from quarantine back onto the network.', 'Admin', quarantinedDevice.risk);
        setDevices((devicesState) => devicesState.map((device) => (device.name === quarantinedDevice.name ? { ...device, status: 'Approved' } : device)));
      }
      return prev.filter((device) => device.id !== id);
    });
  }

  function blockPermanently(id: string) {
    setQuarantine((prev) => {
      const quarantinedDevice = prev.find((device) => device.id === id);
      if (quarantinedDevice) {
        logAction(quarantinedDevice.name, quarantinedDevice.ipAddress, 'Blocked', 'Permanently blocked from quarantine.', 'Admin', quarantinedDevice.risk);
        setDevices((devicesState) => devicesState.map((device) => (device.name === quarantinedDevice.name ? { ...device, status: 'Blocked' } : device)));
      }
      return prev.filter((device) => device.id !== id);
    });
  }

  function extendQuarantine(id: string) {
    setQuarantine((prev) => prev.map((device) => (device.id === id ? { ...device, autoReleaseIn: '6h 0m' } : device)));
  }

  const value = useMemo<AppDataContextValue>(() => ({
    devices, alerts, quarantine, logs,
    updateDeviceStatus, addDevice, removeDevice, scanNetwork,
    setAlertStatus, resolveAllAlerts,
    releaseFromQuarantine, blockPermanently, extendQuarantine,
  }), [devices, alerts, quarantine, logs]);

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const contextValue = useContext(AppDataContext);
  if (!contextValue) throw new Error('useAppData must be used within an AppDataProvider');
  return contextValue;
}
