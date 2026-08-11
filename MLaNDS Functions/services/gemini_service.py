"""Gemini implementation of the polymorphic RiskAnalyser interface."""
import time
from dataclasses import dataclass
from google import genai
from pydantic import BaseModel,Field
from models.risk import AIAnalysis,RiskLevel
from services.analyser import RiskAnalyser
class GeminiOutput(BaseModel):
    risk:str; confidence:float=Field(ge=0,le=1); explanation:str; evidence:list[str]; recommendation:str
@dataclass
class CacheEntry: timestamp:float; result:AIAnalysis
class GeminiRiskAnalyser(RiskAnalyser):
    """Uses structured Gemini output, validation and short-lived caching."""
    def __init__(self,api_key,model="gemini-2.5-flash",cache_ttl=900):
        self.client=genai.Client(api_key=api_key) if api_key else None; self.model=model; self.cache_ttl=cache_ttl; self.cache={}
    def analyse(self,device,baseline,score,evidence):
        if not self.client: raise RuntimeError("Gemini is not configured")
        key=(device.fingerprint(),int(baseline),score); c=self.cache.get(key)
        if c and time.time()-c.timestamp<self.cache_ttl:
            r=c.result; return AIAnalysis(r.risk,r.confidence,r.explanation,r.evidence,r.recommendation,True,True)
        prompt=f'''You are the defensive AI component of MLaNDS. Analyse only supplied evidence; never invent facts or claim certainty of maliciousness. Never downgrade the baseline risk.\nIP={device.ip}\nMAC={device.mac}\nVendor={device.vendor}\nHostname={device.hostname}\nName={device.name}\nStatus={device.status}\nBaseline={baseline.name}\nScore={score}\nEvidence={[(e.reason,e.points) for e in evidence]}'''
        response=self.client.models.generate_content(model=self.model,contents=prompt,config={"response_mime_type":"application/json","response_schema":GeminiOutput,"temperature":0.2})
        o=GeminiOutput.model_validate_json(response.text); risk=max(baseline,RiskLevel.from_text(o.risk))
        r=AIAnalysis(risk,o.confidence,o.explanation.strip(),[x.strip() for x in o.evidence if x.strip()],o.recommendation.strip(),True,False); self.cache[key]=CacheEntry(time.time(),r); return r
