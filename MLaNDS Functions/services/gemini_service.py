"""AI-powered risk analyser built on the Gemini API.

This module demonstrates polymorphism by implementing the shared `RiskAnalyser`
interface while providing an optional advanced analysis service. It also shows a
realistic use of caching, data validation, and model-structured output.

The `GeminiOutput` model is important because it validates the response from the
external API before the application accepts it as risk evidence. This prevents
malformed AI output from causing downstream errors and gives the project clear
validation evidence.
"""

import time
from dataclasses import dataclass

from google import genai
from pydantic import BaseModel, Field

from models.risk import AIAnalysis, RiskLevel
from services.analyser import RiskAnalyser


class GeminiOutput(BaseModel):
    """Expected structured JSON response for Gemini-based analysis."""

    risk: str
    confidence: float = Field(ge=0, le=1)
    explanation: str
    evidence: list[str]
    recommendation: str


@dataclass
class CacheEntry:
    """Stores a cached AI analysis result with a timestamp."""

    timestamp: float
    result: AIAnalysis


class GeminiRiskAnalyser(RiskAnalyser):
    """Uses structured Gemini output and short-lived caching for AI analysis."""

    def __init__(self, api_key, model="gemini-2.5-flash", cache_ttl=900):
        """Create a Gemini client only when an API key exists."""
        self.client = genai.Client(api_key=api_key) if api_key else None
        self.model = model
        self.cache_ttl = cache_ttl
        self.cache = {}

    def analyse(self, device, baseline, score, evidence):
        """Return AI guidance for a device or raise an error when unavailable."""
        if not self.client:
            raise RuntimeError("Gemini is not configured")

        key = (device.fingerprint(), int(baseline), score)
        cached_result = self.cache.get(key)

        if cached_result and time.time() - cached_result.timestamp < self.cache_ttl:
            result = cached_result.result
            return AIAnalysis(
                result.risk,
                result.confidence,
                result.explanation,
                result.evidence,
                result.recommendation,
                True,
                True,
            )

        prompt = f'''You are the defensive AI component of MLaNDS. Analyse only supplied evidence; never invent facts or claim certainty of maliciousness. Never downgrade the baseline risk.\nIP={device.ip}\nMAC={device.mac}\nVendor={device.vendor}\nHostname={device.hostname}\nName={device.name}\nStatus={device.status}\nBaseline={baseline.name}\nScore={score}\nEvidence={[(item.reason, item.points) for item in evidence]}'''

        response = self.client.models.generate_content(
            model=self.model,
            contents=prompt,
            config={
                "response_mime_type": "application/json",
                "response_schema": GeminiOutput,
                "temperature": 0.2,
            },
        )

        output = GeminiOutput.model_validate_json(response.text)
        risk = max(baseline, RiskLevel.from_text(output.risk))

        result = AIAnalysis(
            risk,
            output.confidence,
            output.explanation.strip(),
            [item.strip() for item in output.evidence if item.strip()],
            output.recommendation.strip(),
            True,
            False,
        )
        self.cache[key] = CacheEntry(time.time(), result)
        return result
