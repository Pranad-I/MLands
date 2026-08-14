import type { Device, SecurityAlert } from '@/lib/store';

/**
 * DeviceActionController answers a recurring question across several
 * dashboard pages (Access Control, Alerts, Devices): "which specific
 * device should this quick-action button target?"
 *
 * Several pages have single-click shortcut buttons (e.g. "block a device",
 * "quarantine the riskiest device") that act on one representative device
 * rather than asking the user to pick one first. Each method below encodes
 * the selection rule for one such shortcut. This logic was pulled out of
 * the page components and into one shared controller so that:
 *   1. The "which device counts as X" rule is defined once, not duplicated
 *      (with the risk of drifting out of sync) across every page that
 *      offers a similar shortcut.
 *   2. Page components stay focused on rendering and user interaction,
 *      not on searching/filtering the device list themselves.
 *
 * This is a plain query layer over in-memory arrays (no side effects) —
 * each method returns either a matching Device or undefined, and the
 * caller decides what to do with the result (e.g. show a toast if nothing
 * matched).
 */
class DeviceActionController {
  /** Finds any device still awaiting classification, used by shortcuts
   * that just need "an" unknown device to act on (e.g. a demo/quick-approve
   * button) without caring which specific one. */
  findUnknownDevice(devices: Device[]) {
    return devices.find((device) => device.status === 'Unknown');
  }

  /**
   * Finds the best candidate device for a "block" shortcut. Prefers an
   * unknown device that is also flagged High risk, since blocking is the
   * most consequential action and should default to the most obviously
   * dangerous candidate first. Falls back to any unknown device (via
   * findUnknownDevice) if no high-risk unknown device currently exists,
   * so the shortcut still has something sensible to act on.
   */
  findUnknownDeviceForBlock(devices: Device[]) {
    return devices.find((device) => device.status === 'Unknown' && device.risk === 'High')
      ?? this.findUnknownDevice(devices);
  }

  /** Finds a High-risk device that isn't already quarantined or blocked,
   * for the "quarantine" shortcut — deliberately excludes devices that are
   * already contained so the action always has a real effect. */
  findHighRiskDeviceForQuarantine(devices: Device[]) {
    return devices.find((device) => device.risk === 'High' && device.status !== 'Quarantined' && device.status !== 'Blocked');
  }

  /** Finds an already-Approved device to revert to Unknown, used by demo/
   * testing shortcuts that need to simulate a device losing its trusted
   * status. */
  findApprovedDeviceToMarkUnknown(devices: Device[]) {
    return devices.find((device) => device.status === 'Approved');
  }

  /**
   * Resolves a SecurityAlert back to the Device it refers to, so alert
   * detail views can offer device-specific actions (e.g. "block this
   * device") directly from an alert.
   *
   * Alerts store the related device only as free-text (alert.device,
   * e.g. "Unknown Device (192.168.1.145)") rather than a device ID, since
   * the store's mock alert data was generated independently of the device
   * list. Matching is therefore done heuristically: first by checking
   * whether the alert's device text contains the device's name, then by
   * checking whether it contains the device's IP address. This is a
   * best-effort match rather than a guaranteed one — if neither text
   * fragment appears, the method returns undefined and callers should
   * handle that (e.g. disabling the device-specific action button).
   */
  findDeviceForAlert(alert: SecurityAlert, devices: Device[]) {
    const normalizedDevice = alert.device.toLowerCase();
    return devices.find((device) => normalizedDevice.includes(device.name.toLowerCase()) || alert.device.includes(device.ipAddress));
  }
}

// Singleton export: this controller holds no per-instance state, so one
// shared instance is created here and imported wherever needed, rather
// than every consumer constructing their own.
export const deviceActionController = new DeviceActionController();
