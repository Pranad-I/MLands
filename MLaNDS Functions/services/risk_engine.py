"""Deterministic weighted risk engine using polymorphic analysers."""
from models.risk import RiskLevel,RiskEvidence,RiskAssessment
from services.analyser import RuleBasedRiskAnalyser
class RiskCalculator:
    """Converts security evidence into a deterministic score."""
    def calculate(self,device,new_device=False,changed=False):
        score=0; evidence=[]
        if device.status=="PENDING": score+=30; evidence.append(RiskEvidence("Device is awaiting approval.",30))
        elif device.status=="UNAUTHORISED": score+=60; evidence.append(RiskEvidence("Device is unauthorised.",60))
        if device.vendor=="Unknown Vendor": score+=15; evidence.append(RiskEvidence("Manufacturer could not be identified.",15))
        if device.hostname=="Unknown": score+=10; evidence.append(RiskEvidence("Hostname could not be resolved.",10))
        if device.name=="Unknown Device": score+=10; evidence.append(RiskEvidence("Device is not registered.",10))
        if new_device: score+=15; evidence.append(RiskEvidence("Device was detected for the first time.",15))
        if changed: score+=15; evidence.append(RiskEvidence("Device identity changed.",15))
        level=RiskLevel.CRITICAL if score>=80 else RiskLevel.HIGH if score>=60 else RiskLevel.MEDIUM if score>=30 else RiskLevel.LOW
        return level,score,evidence
class RiskEngine:
    """Composes a calculator with interchangeable analyser objects."""
    def __init__(self,calculator,analysers): self.calculator=calculator; self.analysers=list(analysers)
    def assess(self,device,new_device=False,changed=False):
        baseline,score,evidence=self.calculator.calculate(device,new_device,changed); ai=None
        for analyser in self.analysers:
            try: ai=analyser.analyse(device,baseline,score,evidence); break
            except Exception as e: print(f"[WARNING] {type(analyser).__name__}: {e}")
        if ai is None: ai=RuleBasedRiskAnalyser().analyse(device,baseline,score,evidence)
        return RiskAssessment(device,baseline,max(baseline,ai.risk),score,evidence,ai,new_device,changed)
