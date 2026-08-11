"""Device domain objects with encapsulated identity and validation."""
from dataclasses import dataclass
import re
MAC=re.compile(r"^(?:[0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$")
VALID_STATUSES=frozenset({"APPROVED","PENDING","UNAUTHORISED"})
@dataclass
class Device:
    """A validated network-device record."""
    ip:str; mac:str; vendor:str="Unknown Vendor"; hostname:str="Unknown"; name:str="Unknown Device"; status:str="UNAUTHORISED"
    def __post_init__(self):
        self.ip=self.ip.strip(); self.mac=self.mac.strip().upper(); self.vendor=self.vendor.strip(); self.hostname=self.hostname.strip(); self.name=self.name.strip(); self.status=self.status.strip().upper()
        if not self.ip: raise ValueError("IP cannot be empty")
        if not MAC.fullmatch(self.mac): raise ValueError(f"Invalid MAC: {self.mac}")
        if not self.vendor or not self.hostname or not self.name: raise ValueError("Device text fields cannot be empty")
        if self.status not in VALID_STATUSES: raise ValueError(f"Invalid status: {self.status}")
    def identity_key(self): return self.mac
    def fingerprint(self): return (self.ip,self.mac,self.vendor,self.hostname,self.status)
    @property
    def is_unknown(self): return self.vendor=="Unknown Vendor" and self.hostname=="Unknown"
@dataclass
class DeviceHistory:
    """Tracks first/last seen times and repeated observations."""
    mac:str; first_seen:object; last_seen:object; sightings:int=1; previous_fingerprint:tuple|None=None
    def record(self,device,timestamp):
        changed=self.previous_fingerprint is not None and self.previous_fingerprint!=device.fingerprint(); self.last_seen=timestamp; self.sightings+=1; self.previous_fingerprint=device.fingerprint(); return changed
