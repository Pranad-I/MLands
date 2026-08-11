"""Abstract risk-analyser interface and deterministic polymorphic fallback."""
from abc import ABC,abstractmethod
from models.risk import AIAnalysis,RiskLevel
class RiskAnalyser(ABC):
    @abstractmethod
    def analyse(self,device,baseline,score,evidence): raise NotImplementedError
class RuleBasedRiskAnalyser(RiskAnalyser):
    """Interchangeable analyser used when Gemini is unavailable."""
    def analyse(self,device,baseline,score,evidence):
        rec={RiskLevel.LOW:"Continue normal monitoring.",RiskLevel.MEDIUM:"Verify the device identity.",RiskLevel.HIGH:"Investigate and consider restricting access.",RiskLevel.CRITICAL:"Restrict or quarantine and investigate immediately."}[baseline]
        return AIAnalysis(baseline,1.0,"Deterministic fallback used.",[e.reason for e in evidence],rec,False,False)
