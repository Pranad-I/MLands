"""Executable validation tests for Criterion 7 evidence."""
import json,tempfile,unittest
from pathlib import Path
from config.settings import InputValidator,ConfigurationError
from repositories.device_repository import DeviceRepository
class ValidationTests(unittest.TestCase):
    def test_network(self): self.assertEqual(InputValidator.network("192.168.1.0/24"),"192.168.1.0/24")
    def test_bad_network(self):
        with self.assertRaises(ConfigurationError):InputValidator.network("bad")
    def test_bad_type(self):
        with self.assertRaises(ConfigurationError):InputValidator.integer("30","interval",5,3600)
    def test_bad_range(self):
        with self.assertRaises(ConfigurationError):InputValidator.integer(2,"interval",5,3600)
    def test_missing_file(self):
        with self.assertRaises(FileNotFoundError):DeviceRepository("missing.json").load()
    def test_incomplete_json(self):
        with tempfile.TemporaryDirectory() as d:
            p=Path(d)/"d.json"; p.write_text(json.dumps([{"mac":"AA:BB:CC:DD:EE:FF"}]))
            with self.assertRaises(ValueError):DeviceRepository(str(p)).load()
if __name__=="__main__":unittest.main()
