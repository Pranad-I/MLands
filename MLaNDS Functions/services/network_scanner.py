"""ARP network-discovery service; Scapy details are isolated here."""
import socket
from dataclasses import dataclass
from time import perf_counter
from mac_vendor_lookup import MacLookup
from scapy.all import ARP,Ether,srp
from models.device import Device
@dataclass(frozen=True)
class ScanStatistics: duration_seconds:float; packets_received:int; devices_found:int
class NetworkScanner:
    """Discovers devices and converts raw replies into Device objects."""
    def __init__(self,target,timeout,repository): self.target=target; self.timeout=timeout; self.repository=repository; self.lookup=MacLookup(); self.cache={}; self.last_statistics=None
    def vendor(self,mac):
        if mac in self.cache:return self.cache[mac]
        try:v=self.lookup.lookup(mac) or "Unknown Vendor"
        except Exception:v="Unknown Vendor"
        self.cache[mac]=v; return v
    @staticmethod
    def hostname(ip):
        try:return socket.gethostbyaddr(ip)[0] or "Unknown"
        except (socket.herror,socket.gaierror,socket.timeout,OSError):return "Unknown"
    def scan(self):
        start=perf_counter(); approved=self.repository.load(); packet=Ether(dst="ff:ff:ff:ff:ff:ff")/ARP(pdst=self.target)
        try: answered=srp(packet,timeout=self.timeout,verbose=False)[0]
        except PermissionError as e: raise RuntimeError("Network scan requires administrator/root privileges") from e
        except OSError as e: raise RuntimeError(f"Network scan failed: {e}") from e
        devices=[]; seen=set()
        for _,r in answered:
            ip=str(r.psrc); mac=str(r.hwsrc).upper()
            if mac in seen: continue
            seen.add(mac); name="Unknown Device"; status="UNAUTHORISED"
            for x in approved:
                if x["mac"]==mac: name=x["name"]; status="APPROVED" if x["approved"] else "UNAUTHORISED"; break
            devices.append(Device(ip,mac,self.vendor(mac),self.hostname(ip),name,status))
        self.last_statistics=ScanStatistics(perf_counter()-start,len(answered),len(devices)); return devices
