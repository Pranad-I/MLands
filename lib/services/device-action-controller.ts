import type { Device, SecurityAlert } from '@/lib/store';

class DeviceActionController {
  findUnknownDevice(devices: Device[]) {
    return devices.find((device) => device.status === 'Unknown');
  }

  findUnknownDeviceForBlock(devices: Device[]) {
    return devices.find((device) => device.status === 'Unknown' && device.risk === 'High')
      ?? this.findUnknownDevice(devices);
  }

  findHighRiskDeviceForQuarantine(devices: Device[]) {
    return devices.find((device) => device.risk === 'High' && device.status !== 'Quarantined' && device.status !== 'Blocked');
  }

  findApprovedDeviceToMarkUnknown(devices: Device[]) {
    return devices.find((device) => device.status === 'Approved');
  }

  findDeviceForAlert(alert: SecurityAlert, devices: Device[]) {
    const normalizedDevice = alert.device.toLowerCase();
    return devices.find((device) => normalizedDevice.includes(device.name.toLowerCase()) || alert.device.includes(device.ipAddress));
  }
}

export const deviceActionController = new DeviceActionController();
