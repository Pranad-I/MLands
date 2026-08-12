"""Network-scanning service that discovers devices over the local network.

This module is responsible for a realistic data source used in the system: live
ARP traffic. It demonstrates practical validation and object creation because it
converts raw network responses into `Device` objects with consistent fields.

The service also demonstrates appropriate use of dictionaries and sets to cache
vendor lookups and prevent duplicate results from being recorded multiple times
in a single scan.
"""

import socket
from dataclasses import dataclass
from time import perf_counter

from mac_vendor_lookup import MacLookup
from scapy.all import ARP, Ether, srp

from models.device import Device


@dataclass(frozen=True)
class ScanStatistics:
    """Stores summary metrics from a network scan for audit and reporting."""

    duration_seconds: float
    packets_received: int
    devices_found: int


class NetworkScanner:
    """Discovers active devices on the network and converts them into `Device` objects."""

    def __init__(self, target, timeout, repository):
        """Store network targets, timeout, and the approved-device repository."""
        self.target = target
        self.timeout = timeout
        self.repository = repository
        self.lookup = MacLookup()
        self.cache = {}
        self.last_statistics = None

    def vendor(self, mac):
        """Cache a vendor lookup so repeated devices do not cause repeated network calls."""
        if mac in self.cache:
            return self.cache[mac]
        try:
            vendor = self.lookup.lookup(mac) or "Unknown Vendor"
        except Exception:
            vendor = "Unknown Vendor"
        self.cache[mac] = vendor
        return vendor

    @staticmethod
    def hostname(ip):
        """Resolve a hostname when possible and otherwise fall back to 'Unknown'."""
        try:
            return socket.gethostbyaddr(ip)[0] or "Unknown"
        except (socket.herror, socket.gaierror, socket.timeout, OSError):
            return "Unknown"

    def scan(self):
        """Perform one ARP scan and return validated `Device` objects."""
        start_time = perf_counter()
        approved_devices = self.repository.load()
        packet = Ether(dst="ff:ff:ff:ff:ff:ff") / ARP(pdst=self.target)

        try:
            answered = srp(packet, timeout=self.timeout, verbose=False)[0]
        except PermissionError as error:
            raise RuntimeError("Network scan requires administrator/root privileges") from error
        except OSError as error:
            raise RuntimeError(f"Network scan failed: {error}") from error

        devices = []
        seen_macs = set()

        for _, response in answered:
            ip_address = str(response.psrc)
            mac_address = str(response.hwsrc).upper()

            if mac_address in seen_macs:
                continue
            seen_macs.add(mac_address)

            device_name = "Unknown Device"
            device_status = "UNAUTHORISED"

            for approved in approved_devices:
                if approved["mac"] == mac_address:
                    device_name = approved["name"]
                    device_status = "APPROVED" if approved["approved"] else "UNAUTHORISED"
                    break

            devices.append(
                Device(
                    ip_address,
                    mac_address,
                    self.vendor(mac_address),
                    self.hostname(ip_address),
                    device_name,
                    device_status,
                )
            )

        self.last_statistics = ScanStatistics(
            perf_counter() - start_time,
            len(answered),
            len(devices),
        )
        return devices
