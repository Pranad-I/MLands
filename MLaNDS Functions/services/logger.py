"""CSV logger for recorded network assessments.

This component provides the system's audit trail. It stores risk evaluations in a
plain CSV file so the project has a persistent evidence source separate from the
live network scan. This is appropriate because a network security tool needs a
traceable record of what was observed and how it was classified.
"""

import csv
from datetime import datetime
from pathlib import Path


class DeviceLogger:
    """Writes each device assessment to a CSV file with consistent column names."""

    HEADERS = [
        "Timestamp",
        "IP Address",
        "MAC Address",
        "Vendor",
        "Hostname",
        "Device Name",
        "Status",
        "Risk Score",
        "Baseline Risk",
        "Final Risk",
        "New Device",
        "Changed",
        "AI Available",
        "AI Cached",
        "AI Confidence",
        "AI Explanation",
        "AI Evidence",
        "Recommendation",
    ]

    def __init__(self, path):
        """Store the log path but defer file access until a log record is written."""
        self.path = Path(path)

    def log(self, assessment):
        """Write a single assessment to CSV with validation of required values."""
        if not assessment.device.mac:
            raise ValueError("MAC is required")
        if not 0 <= assessment.ai.confidence <= 1:
            raise ValueError("AI confidence must be 0-1")

        exists = self.path.is_file() and self.path.stat().st_size > 0
        row = [
            datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            assessment.device.ip,
            assessment.device.mac,
            assessment.device.vendor,
            assessment.device.hostname,
            assessment.device.name,
            assessment.device.status,
            assessment.score,
            assessment.baseline_risk.name,
            assessment.final_risk.name,
            assessment.new_device,
            assessment.changed,
            assessment.ai.available,
            assessment.ai.cached,
            f"{assessment.ai.confidence:.3f}",
            assessment.ai.explanation,
            "; ".join(assessment.ai.evidence),
            assessment.ai.recommendation,
        ]

        try:
            with self.path.open("a", newline="", encoding="utf-8") as file_object:
                writer = csv.writer(file_object)
                if not exists:
                    writer.writerow(self.HEADERS)
                writer.writerow(row)
        except OSError as error:
            raise OSError(f"Could not write log: {error}") from error
