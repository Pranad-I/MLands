"""Risk data structures and ordered risk levels."""
from dataclasses import dataclass,field
from enum import IntEnum
from models.device import Device
class RiskLevel(IntEnum):
    LOW=1; MEDIUM=2; HIGH=3; CRITICAL=4
    @classmethod
    def from_text(cls,value):
        try:return cls[value.strip().upper()]
        except (KeyError,AttributeError): raise ValueError(f"Invalid risk: {value!r}")
@dataclass(frozen=True)
class RiskEvidence: reason:str; points:int
@dataclass(frozen=True)
class AIAnalysis:
    risk:RiskLevel; confidence:float; explanation:str; evidence:list[str]; recommendation:str; available:bool=True; cached:bool=False
@dataclass(frozen=True)
class RiskAssessment:
    device:Device; baseline_risk:RiskLevel; final_risk:RiskLevel; score:int; evidence:list[RiskEvidence]=field(default_factory=list); ai:AIAnalysis|None=None; new_device:bool=False; changed:bool=False
