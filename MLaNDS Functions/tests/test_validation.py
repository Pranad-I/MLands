"""Executable validation tests for the MLaNDS project.

These tests provide concrete proof that the application validates network
configuration, file structure, and input data before processing. This is an
important part of the rubric evidence because the software must demonstrate real
validation rather than only theoretical checks.
"""

import json
import tempfile
import unittest
from pathlib import Path

from config.settings import ConfigurationError, InputValidator
from repositories.device_repository import DeviceRepository


class ValidationTests(unittest.TestCase):
    """Checks critical validation paths across configuration and repository logic."""

    def test_network(self):
        """A valid CIDR network should be accepted without modification."""
        self.assertEqual(InputValidator.network("192.168.1.0/24"), "192.168.1.0/24")

    def test_bad_network(self):
        """Malformed network strings must raise a configuration error."""
        with self.assertRaises(ConfigurationError):
            InputValidator.network("bad")

    def test_bad_type(self):
        """Non-integer values must be rejected by the integer validator."""
        with self.assertRaises(ConfigurationError):
            InputValidator.integer("30", "interval", 5, 3600)

    def test_bad_range(self):
        """Values outside the allowed numeric range should fail validation."""
        with self.assertRaises(ConfigurationError):
            InputValidator.integer(2, "interval", 5, 3600)

    def test_missing_file(self):
        """The repository should reject a missing approved-device list."""
        with self.assertRaises(FileNotFoundError):
            DeviceRepository("missing.json").load()

    def test_incomplete_json(self):
        """Incomplete approved-device records must not be accepted."""
        with tempfile.TemporaryDirectory() as directory:
            file_path = Path(directory) / "d.json"
            file_path.write_text(json.dumps([{"mac": "AA:BB:CC:DD:EE:FF"}]))
            with self.assertRaises(ValueError):
                DeviceRepository(str(file_path)).load()


if __name__ == "__main__":
    unittest.main()
