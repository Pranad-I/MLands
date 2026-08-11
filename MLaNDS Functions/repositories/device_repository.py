"""JSON repository with complete external-input validation."""
import json
from pathlib import Path
class DeviceRepository:
    REQUIRED=frozenset({"mac","name","approved"})
    def __init__(self,path): self.path=Path(path)
    def load(self):
        if not self.path.is_file(): raise FileNotFoundError(f"Approved-device file does not exist: {self.path}")
        try:
            data=json.loads(self.path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as e: raise ValueError(f"Invalid JSON: {e}") from e
        if not isinstance(data,list): raise ValueError("devices.json root must be a list")
        out=[]; seen=set()
        for i,x in enumerate(data,1):
            if not isinstance(x,dict): raise ValueError(f"Entry {i} must be an object")
            missing=self.REQUIRED-x.keys()
            if missing: raise ValueError(f"Entry {i} incomplete: missing {sorted(missing)}")
            mac=str(x["mac"]).strip().upper(); name=str(x["name"]).strip(); approved=x["approved"]
            parts=mac.split(":")
            if len(parts)!=6 or any(len(p)!=2 or any(c not in "0123456789ABCDEF" for c in p) for p in parts): raise ValueError(f"Entry {i} has invalid MAC")
            if not name or not isinstance(approved,bool): raise ValueError(f"Entry {i} has invalid name/approved value")
            if mac in seen: raise ValueError(f"Duplicate MAC: {mac}")
            seen.add(mac); out.append({"mac":mac,"name":name,"approved":approved})
        return out
