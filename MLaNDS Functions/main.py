"""MLaNDS entry point. Retains continuous scan, display and CSV logging."""
import time
from config.settings import Settings,ConfigurationError
from repositories.device_repository import DeviceRepository
from services.network_scanner import NetworkScanner
from services.device_monitor import DeviceMonitor
from services.risk_engine import RiskCalculator,RiskEngine
from services.gemini_service import GeminiRiskAnalyser
from services.logger import DeviceLogger
class MLaNDSApplication:
    """Facade/controller composed from independent OOP services."""
    def __init__(self,settings):
        repo=DeviceRepository(settings.devices_file); self.settings=settings; self.scanner=NetworkScanner(settings.network,settings.scan_timeout,repo); self.monitor=DeviceMonitor(); self.engine=RiskEngine(RiskCalculator(),[GeminiRiskAnalyser(settings.gemini_api_key,settings.gemini_model)]); self.logger=DeviceLogger(settings.log_file); self.running=False
    @staticmethod
    def display(a):
        d=a.device; print("\n"+"-"*65); print(f"[{a.final_risk.name}] {d.name}"); print(f"IP: {d.ip}\nMAC: {d.mac}\nVendor: {d.vendor}\nHost: {d.hostname}\nStatus: {d.status}\nRisk score: {a.score}\nBaseline: {a.baseline_risk.name}\nAI: {a.ai.explanation}\nRecommendation: {a.ai.recommendation}"); print("-"*65)
    def cycle(self):
        try: devices=self.scanner.scan()
        except (RuntimeError,FileNotFoundError,ValueError) as e: print(f"[ERROR] {e}"); return
        for d in devices:
            new,changed=self.monitor.observe(d); a=self.engine.assess(d,new,changed); self.display(a)
            try:self.logger.log(a)
            except OSError as e:print(f"[ERROR] {e}")
    def run(self):
        self.running=True; print("="*65); print("MLaNDS - INTELLIGENT NETWORK DEFENCE SYSTEM"); print(f"Network: {self.settings.network}"); print(f"Interval: {self.settings.scan_interval}s"); print("="*65)
        try:
            while self.running:self.cycle(); print(f"Rescanning in {self.settings.scan_interval} seconds..."); time.sleep(self.settings.scan_interval)
        except KeyboardInterrupt: print("\nMLaNDS stopped by user.")
        finally:self.running=False
def main():
    try:s=Settings.from_environment()
    except ConfigurationError as e: print(f"[CONFIGURATION ERROR] {e}"); return
    MLaNDSApplication(s).run()
if __name__=="__main__":main()
