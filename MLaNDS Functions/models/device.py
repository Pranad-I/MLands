"""Device model and device-history tracking for network monitoring.

This module defines the core domain objects that represent a discovered device on
an internal network. The design uses dataclasses because the software works with
structured records that need a small number of validated fields and predictable
behaviour. The validation in `Device.__post_init__` is important because the
network scan and risk calculations depend on device identity being reliable.

The `DeviceHistory` object demonstrates how the project tracks repeated sightings
across multiple scans, which is necessary for identifying new devices and
changes in state without relying on global variables.
"""

import re
from dataclasses import dataclass

MAC = re.compile(r"^(?:[0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$")
VALID_STATUSES = frozenset({"APPROVED", "PENDING", "UNAUTHORISED"})


@dataclass
class Device:
    """Represents a single device discovered on the network.

    A Device instance stores the most important identity and status data needed
    for risk classification. Each field is validated at construction to prevent
    malformed data from reaching later stages of the program.
    """

    ip: str
    mac: str
    vendor: str = "Unknown Vendor"
    hostname: str = "Unknown"
    name: str = "Unknown Device"
    status: str = "UNAUTHORISED"

    def __post_init__(self):
        """Normalise and validate device attributes after instantiation."""
        self.ip = self.ip.strip()
        self.mac = self.mac.strip().upper()
        self.vendor = self.vendor.strip()
        self.hostname = self.hostname.strip()
        self.name = self.name.strip()
        self.status = self.status.strip().upper()

        if not self.ip:
            raise ValueError("IP cannot be empty")
        if not MAC.fullmatch(self.mac):
            raise ValueError(f"Invalid MAC: {self.mac}")
        if not self.vendor or not self.hostname or not self.name:
            raise ValueError("Device text fields cannot be empty")
        if self.status not in VALID_STATUSES:
            raise ValueError(f"Invalid status: {self.status}")

    def identity_key(self):
        """Return a stable identifier used to track a device across scans."""
        return self.mac

    def fingerprint(self):
        """Capture the current visible identity for change detection."""
        return (self.ip, self.mac, self.vendor, self.hostname, self.status)

    @property
    def is_unknown(self):
        """Return True when the device cannot be confidently identified."""
        return self.vendor == "Unknown Vendor" and self.hostname == "Unknown"


@dataclass
class DeviceHistory:
    """Tracks the observation history for one device across multiple scans.

    The previous fingerprint field allows the monitor to determine whether the
    device changed in a meaningful way, which is used as risk evidence.
    """

    mac: str
    first_seen: object
    last_seen: object
    sightings: int = 1
    previous_fingerprint: tuple | None = None

    def record(self, device, timestamp):
        """Update the history and return True when the fingerprint has changed."""
        changed = (
            self.previous_fingerprint is not None
            and self.previous_fingerprint != device.fingerprint()
        )
        self.last_seen = timestamp
        self.sightings += 1
        self.previous_fingerprint = device.fingerprint()
        return changed
