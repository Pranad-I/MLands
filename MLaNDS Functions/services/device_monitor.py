"""Tracks device history across repeated scans."""
from datetime import datetime
from models.device import DeviceHistory
class DeviceMonitor:
    def __init__(self): self.history={}
    def observe(self,device):
        now=datetime.now(); key=device.identity_key()
        if key not in self.history:
            self.history[key]=DeviceHistory(key,now,now,1,device.fingerprint()); return True,False
        return False,self.history[key].record(device,now)
