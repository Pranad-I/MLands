"""Tracks device observations across repeated scans.

This class is responsible for determining whether a device is new or has changed
state since it was last seen. It uses a dictionary keyed by MAC address so each
device can maintain its own history without any global state. This is a clear
example of encapsulation and maintainable object design.
"""

from datetime import datetime

from models.device import DeviceHistory


class DeviceMonitor:
    """Tracks first-time sightings and identity changes for each device."""

    def __init__(self):
        """Store per-device history in an instance-level dictionary."""
        self.history = {}

    def observe(self, device):
        """Return whether a device is new and whether its fingerprint changed."""
        now = datetime.now()
        key = device.identity_key()

        if key not in self.history:
            self.history[key] = DeviceHistory(key, now, now, 1, device.fingerprint())
            return True, False

        return False, self.history[key].record(device, now)
