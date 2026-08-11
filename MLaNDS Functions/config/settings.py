"""Validated configuration and input-validation layer for MLaNDS."""
from dataclasses import dataclass
from ipaddress import ip_network
from pathlib import Path
import os

class ConfigurationError(ValueError):
    """Raised when configuration is missing, malformed, unreasonable or incomplete."""

class InputValidator:
    """Centralises existence, type, range, format and completeness checks."""
    @staticmethod
    def text(value, name):
        if not isinstance(value, str) or not value.strip():
            raise ConfigurationError(f"{name} must be non-empty text")
        return value.strip()
    @staticmethod
    def network(value):
        value=InputValidator.text(value,"network")
        try: n=ip_network(value, strict=False)
        except ValueError as e: raise ConfigurationError(f"Invalid network: {value}") from e
        if n.prefixlen < 16: raise ConfigurationError("Network is unreasonably large")
        return str(n)
    @staticmethod
    def integer(value,name,minimum,maximum):
        if isinstance(value,bool) or not isinstance(value,int): raise ConfigurationError(f"{name} must be an integer")
        if not minimum <= value <= maximum: raise ConfigurationError(f"{name} must be {minimum}-{maximum}")
        return value
    @staticmethod
    def path(value,name):
        value=InputValidator.text(value,name)
        if Path(value).is_dir(): raise ConfigurationError(f"{name} must be a file path")
        return value
    @staticmethod
    def api_key(value):
        if value in (None,""): return None
        value=InputValidator.text(value,"GEMINI_API_KEY")
        if len(value)<10: raise ConfigurationError("GEMINI_API_KEY appears incomplete")
        return value

@dataclass(frozen=True)
class Settings:
    """Immutable settings; strings, integers and optional AI credentials are explicit data types."""
    network:str="192.168.68.0/22"; devices_file:str="devices.json"; log_file:str="log.csv"
    scan_interval:int=30; scan_timeout:int=3; gemini_api_key:str|None=None; gemini_model:str="gemini-2.5-flash"
    def validate(self):
        InputValidator.network(self.network); InputValidator.path(self.devices_file,"devices_file"); InputValidator.path(self.log_file,"log_file")
        InputValidator.integer(self.scan_interval,"scan_interval",5,3600); InputValidator.integer(self.scan_timeout,"scan_timeout",1,30); InputValidator.api_key(self.gemini_api_key); InputValidator.text(self.gemini_model,"gemini_model"); return self
    @classmethod
    def from_environment(cls):
        try: interval=int(os.getenv("MLANDS_SCAN_INTERVAL","30")); timeout=int(os.getenv("MLANDS_SCAN_TIMEOUT","3"))
        except ValueError as e: raise ConfigurationError("Scan interval/timeout must be integers") from e
        return cls(os.getenv("MLANDS_NETWORK","192.168.68.0/22"),os.getenv("MLANDS_DEVICES_FILE","devices.json"),os.getenv("MLANDS_LOG_FILE","log.csv"),interval,timeout,os.getenv("GEMINI_API_KEY"),os.getenv("GEMINI_MODEL","gemini-2.5-flash")).validate()
