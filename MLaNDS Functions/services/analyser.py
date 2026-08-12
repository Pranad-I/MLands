"""Abstract analyser interface and fallback implementation.

This module demonstrates the appropriate use of abstraction and inheritance.
`RiskAnalyser` defines the required behaviour for any risk-analysis component,
while `RuleBasedRiskAnalyser` provides a deterministic fallback if AI analysis is
not available. This allows the project to use polymorphism without forcing a
single implementation to be the only valid one.
"""

from abc import ABC, abstractmethod

from models.risk import AIAnalysis, RiskLevel


class RiskAnalyser(ABC):
    """Common contract for all risk-analysis implementations."""

    @abstractmethod
    def analyse(self, device, baseline, score, evidence):
        """Return an AIAnalysis record after evaluating a device."""
        raise NotImplementedError


class RuleBasedRiskAnalyser(RiskAnalyser):
    """Fallback analyser used when a richer AI analyser is unavailable."""

    def analyse(self, device, baseline, score, evidence):
        """Create a deterministic recommendation based on the baseline risk level."""
        recommendation = {
            RiskLevel.LOW: "Continue normal monitoring.",
            RiskLevel.MEDIUM: "Verify the device identity.",
            RiskLevel.HIGH: "Investigate and consider restricting access.",
            RiskLevel.CRITICAL: "Restrict or quarantine and investigate immediately.",
        }[baseline]

        return AIAnalysis(
            baseline,
            1.0,
            "Deterministic fallback used.",
            [item.reason for item in evidence],
            recommendation,
            False,
            False,
        )
