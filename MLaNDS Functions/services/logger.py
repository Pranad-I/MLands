"""Validated CSV persistence service."""
import csv
from pathlib import Path
from datetime import datetime
class DeviceLogger:
    HEADERS=["Timestamp","IP Address","MAC Address","Vendor","Hostname","Device Name","Status","Risk Score","Baseline Risk","Final Risk","New Device","Changed","AI Available","AI Cached","AI Confidence","AI Explanation","AI Evidence","Recommendation"]
    def __init__(self,path): self.path=Path(path)
    def log(self,a):
        if not a.device.mac: raise ValueError("MAC is required")
        if not 0<=a.ai.confidence<=1: raise ValueError("AI confidence must be 0-1")
        exists=self.path.is_file() and self.path.stat().st_size>0
        row=[datetime.now().strftime("%Y-%m-%d %H:%M:%S"),a.device.ip,a.device.mac,a.device.vendor,a.device.hostname,a.device.name,a.device.status,a.score,a.baseline_risk.name,a.final_risk.name,a.new_device,a.changed,a.ai.available,a.ai.cached,f"{a.ai.confidence:.3f}",a.ai.explanation,"; ".join(a.ai.evidence),a.ai.recommendation]
        try:
            with self.path.open("a",newline="",encoding="utf-8") as f:
                w=csv.writer(f)
                if not exists:w.writerow(self.HEADERS)
                w.writerow(row)
        except OSError as e: raise OSError(f"Could not write log: {e}") from e
