"""Risk-level enums and structured risk-assessment records.

The project needs a clear, ordered hierarchy for risk severity because the
system compares baseline risk with AI or fallback recommendations. Using an
`IntEnum` makes the categories comparable and keeps the scoring logic readable
without creating arbitrary strings that would be harder to validate.

The dataclasses also structure the evidence and assessment output so each
analysis step can carry metadata such as explanations, confidence scores, and
recommendations without losing type safety.
"""

from dataclasses import dataclass, field
from enum import IntEnum

from models.device import Device


class RiskLevel(IntEnum):
    """Ordered risk categories used to compare severity and determine urgency."""

    LOW = 1
    MEDIUM = 2
    HIGH = 3
    CRITICAL = 4

    @classmethod
    def from_text(cls, value):
        """Convert a text label such as 'HIGH' into the matching enum value."""
        try:
            return cls[value.strip().upper()]
        except (KeyError, AttributeError) as error:
            raise ValueError(f"Invalid risk: {value!r}") from error


@dataclass(frozen=True)
class RiskEvidence:
    """A single reason that contributes to the final risk score."""

    reason: str
    points: int


@dataclass(frozen=True)
class AIAnalysis:
    """Structured output from a risk analyser, including AI guidance."""

    risk: RiskLevel
    confidence: float
    explanation: str
    evidence: list[str]
    recommendation: str
    available: bool = True
    cached: bool = False


@dataclass(frozen=True)
class RiskAssessment:
    """Complete analysis for one device in one monitoring cycle."""

    device: Device
    baseline_risk: RiskLevel
    final_risk: RiskLevel
    score: int
    evidence: list[RiskEvidence] = field(default_factory=list)
    ai: AIAnalysis | None = None
    new_device: bool = False
    changed: bool = False
