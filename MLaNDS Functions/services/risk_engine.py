"""Risk calculation and assessment engine.

This module is the decision-making core of the application. It calculates a
baseline security score from evidence such as unauthorised devices, unknown
vendors, unknown hostnames, and first-time detections. It then composes the
score with one or more analyser objects that implement a common interface.

This is a strong example of composition, polymorphism, and maintainability
because the calculation logic remains stable while different analysers can be
swapped in without rewriting the assessment pipeline.
"""

from models.risk import RiskAssessment, RiskEvidence, RiskLevel
from services.analyser import RuleBasedRiskAnalyser


class RiskCalculator:
    """Creates a weighted numeric risk score from device evidence."""

    def calculate(self, device, new_device=False, changed=False):
        """Return a risk level, total score, and list of evidence items."""
        score = 0
        evidence = []

        if device.status == "PENDING":
            score += 30
            evidence.append(RiskEvidence("Device is awaiting approval.", 30))
        elif device.status == "UNAUTHORISED":
            score += 60
            evidence.append(RiskEvidence("Device is unauthorised.", 60))

        if device.vendor == "Unknown Vendor":
            score += 15
            evidence.append(RiskEvidence("Manufacturer could not be identified.", 15))
        if device.hostname == "Unknown":
            score += 10
            evidence.append(RiskEvidence("Hostname could not be resolved.", 10))
        if device.name == "Unknown Device":
            score += 10
            evidence.append(RiskEvidence("Device is not registered.", 10))
        if new_device:
            score += 15
            evidence.append(RiskEvidence("Device was detected for the first time.", 15))
        if changed:
            score += 15
            evidence.append(RiskEvidence("Device identity changed.", 15))

        if score >= 80:
            level = RiskLevel.CRITICAL
        elif score >= 60:
            level = RiskLevel.HIGH
        elif score >= 30:
            level = RiskLevel.MEDIUM
        else:
            level = RiskLevel.LOW

        return level, score, evidence


class RiskEngine:
    """Applies the calculator and then enriches the result with analyser output."""

    def __init__(self, calculator, analysers):
        """Store a calculator object and one or more analyser implementations."""
        self.calculator = calculator
        self.analysers = list(analysers)

    def assess(self, device, new_device=False, changed=False):
        """Calculate a baseline score and then choose the most appropriate analyser."""
        baseline, score, evidence = self.calculator.calculate(device, new_device, changed)
        ai = None

        for analyser in self.analysers:
            try:
                ai = analyser.analyse(device, baseline, score, evidence)
                break
            except Exception as error:
                print(f"[WARNING] {type(analyser).__name__}: {error}")

        if ai is None:
            ai = RuleBasedRiskAnalyser().analyse(device, baseline, score, evidence)

        return RiskAssessment(
            device,
            baseline,
            max(baseline, ai.risk),
            score,
            evidence,
            ai,
            new_device,
            changed,
        )
