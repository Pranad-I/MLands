"""Repository responsible for loading approved-device records from JSON.

This is the project’s primary file-based data source. The repository validates
that the JSON file exists, contains a list, and each entry has the required
fields before the rest of the system uses it. This is an important part of the
project because a malformed or incomplete approved-device list would otherwise
under-mine the risk logic.
"""

import json
from pathlib import Path


class DeviceRepository:
    """Loads and validates known approved devices from a JSON file."""

    REQUIRED = frozenset({"mac", "name", "approved"})

    def __init__(self, path):
        """Store the repository path without immediately processing data."""
        self.path = Path(path)

    def load(self):
        """Read and validate the JSON list of approved devices.

        The method checks for file existence, JSON correctness, list structure,
        required keys, MAC format, unique identifiers, boolean approval status,
        and non-empty names. Returning a cleaned list keeps the rest of the
        application simple and consistent while making validation evidence clear.
        """
        if not self.path.is_file():
            raise FileNotFoundError(f"Approved-device file does not exist: {self.path}")

        try:
            data = json.loads(self.path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as error:
            raise ValueError(f"Invalid JSON: {error}") from error

        if not isinstance(data, list):
            raise ValueError("devices.json root must be a list")

        approved_devices = []
        seen_macs = set()

        for index, entry in enumerate(data, 1):
            if not isinstance(entry, dict):
                raise ValueError(f"Entry {index} must be an object")

            missing_fields = self.REQUIRED - entry.keys()
            if missing_fields:
                raise ValueError(f"Entry {index} incomplete: missing {sorted(missing_fields)}")

            mac = str(entry["mac"]).strip().upper()
            name = str(entry["name"]).strip()
            approved = entry["approved"]

            parts = mac.split(":")
            if len(parts) != 6 or any(
                len(part) != 2 or any(character not in "0123456789ABCDEF" for character in part)
                for part in parts
            ):
                raise ValueError(f"Entry {index} has invalid MAC")

            if not name or not isinstance(approved, bool):
                raise ValueError(f"Entry {index} has invalid name/approved value")
            if mac in seen_macs:
                raise ValueError(f"Duplicate MAC: {mac}")

            seen_macs.add(mac)
            approved_devices.append({"mac": mac, "name": name, "approved": approved})

        return approved_devices
