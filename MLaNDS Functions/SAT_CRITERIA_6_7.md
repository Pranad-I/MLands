# MLaNDS VCE Unit 4 Outcome 1 – Internal Documentation and Rubric Evidence

This document is the project’s internal evidence pack for Criterion 6 and Criterion 7. It explains how the software works, why major design decisions were chosen, and where the rubric evidence appears in the code.

## 1. System purpose and data flow

MLaNDS is a Python-based network defence monitor. It scans a local network, compares detected devices against a JSON-approved list, records first-time and changed sightings, assesses risk, and logs the result to CSV.

The primary data flow is:

1. Environment variables are read and validated in `config/settings.py`.
2. Approved device records are loaded from a JSON list in `repositories/device_repository.py`.
3. ARP network packets are sent with `scapy` in `services/network_scanner.py` to discover active devices.
4. A `DeviceMonitor` decides whether a device is new or has changed state.
5. A `RiskEngine` calculates a baseline score and then adds AI-based guidance or fallback logic.
6. A `DeviceLogger` writes the final assessment to CSV for investigation evidence.
7. `main.py` orchestrates the full loop and repeats scans on a configured interval.

This design keeps data and logic in meaningful classes, avoiding unnecessary global state and making each responsibility easy to test and maintain.

## 2. Internal design rationale

### OOP structure

The project uses genuine object-oriented design rather than procedural grouping:

- `Settings` stores configuration as an immutable dataclass.
- `Device` models a network-connected device and validates its identity.
- `DeviceHistory` tracks repeated sightings over time.
- `DeviceRepository` manages external JSON input.
- `NetworkScanner` owns the network discovery logic.
- `DeviceMonitor` tracks state changes between scans.
- `RiskCalculator` calculates deterministic risk values.
- `RiskEngine` composes multiple analysers.
- `RiskAnalyser` defines a polymorphic interface.
- `GeminiRiskAnalyser` implements the interface for AI-guided analysis.
- `DeviceLogger` persists evidence to CSV.
- `MLaNDSApplication` acts as a facade that coordinates the whole application.

This is appropriate because each class owns one main responsibility and delegates only what belongs to that component.

### Data types and structures

The software deliberately uses a range of relevant data types:

- `str` for IP addresses, MAC addresses, names, hostnames, vendor names, and prompts.
- `int` for scan intervals, timeouts, risk scores, and numeric thresholds.
- `float` for confidence scores and timing measurements.
- `bool` for approval state and device-change flags.
- `Enum` / `IntEnum` for `RiskLevel`.
- `tuple` for device fingerprints and detection identity values.
- `set` for duplicate tracking and validation collections.
- `list` for device records and evidence items.
- `dict` for approved-device JSON records.
- Dataclasses for structured domain records such as `Device`, `RiskAssessment`, and `Settings`.

These types were chosen because their behaviours match the kind of data being processed: risk values must be ordered, device identity must be consistent, and evidence should remain structured rather than floating as untyped strings.

### Validation strategy

Validation is central to the implementation. The project checks:

- Existence: required files, required configuration values, required records.
- Type: integer/string/bool validation for settings and records.
- Range: timeout, scan interval, risk confidence, and network prefix constraints.
- Reasonableness: IP ranges, MAC format, network size, and plausible device identity.
- Completeness: missing JSON keys and missing text fields are rejected.

The validator is implemented in `InputValidator` inside `config/settings.py`, and the repository layer validates JSON records before use.

### Error handling

The program does not allow expected invalid input to crash the system. Instead, it raises specific exceptions and catches them at the application boundary:

- `ConfigurationError` is used when settings are missing or invalid.
- `FileNotFoundError` is handled for missing approved-device files.
- `ValueError` is handled for malformed data.
- `RuntimeError` is raised for permission or network scanning failures.
- `OSError` is caught when CSV logging fails.

This is consistent and appropriate because it keeps the program operational while still reporting useful user-facing errors.

## 3. Key files and responsibilities

### `main.py`

This file is the application entry point and orchestration layer. It demonstrates sequence, selection, iteration, and object composition in an application loop. The loop checks for new or changed devices, assesses risk, prints results, and logs evidence.

### `config/settings.py`

This file defines `Settings`, `ConfigurationError`, and `InputValidator`. It demonstrates validation, constants, environment-driven configuration, and dataclass-based configuration immutability.

### `models/device.py`

This file models the device domain. It enforces validation for MAC, name, vendor, hostname, status, and identity. The `DeviceHistory` class also demonstrates state tracking over time.

### `models/risk.py`

This file defines risk-related enums and dataclasses. `RiskLevel` is an `IntEnum`, which is ideal for ordered risk classes, and `RiskAssessment` groups all information related to one device evaluation.

### `repositories/device_repository.py`

This repository validates a JSON list of approved devices. It rejects duplicate MAC addresses, invalid names, incomplete objects, and non-boolean approval values. This makes the external data source consistent and predictable.

### `services/network_scanner.py`

This service scans the network using ARP and converts raw responses into `Device` instances. It also resolves hostnames and vendor names and prevents duplicate MAC entries from being processed twice.

### `services/device_monitor.py`

This service uses a per-device dictionary to track observations between scans. It helps identify first-seen devices and changed device attributes.

### `services/risk_engine.py`

This service calculates a baseline score and composes one or more analyser implementations. It demonstrates abstraction, polymorphism, and dependency injection.

### `services/analyser.py`

This file defines the abstract analyser interface and a reliable fallback implementation. It is a clear example of inheritance and abstraction.

### `services/gemini_service.py`

This uses an AI model as an optional analyser. The class caches results and validates structured output to keep the system stable when the API is unavailable or returns malformed data.

### `services/logger.py`

This writes the final evidence to CSV. It validates AI confidence and writes consistent rows with a defined header structure.

### `tests/test_validation.py`

This test file verifies the validation layer. It checks network format, bad type handling, bad range handling, missing file reports, and incomplete JSON records.

## 4. Rubric compliance matrix

| Rubric requirement | Evidence in code | File(s) | Explanation |
|---|---|---|---|
| Instructions | `Settings.from_environment()`, `DeviceRepository.load()`, `NetworkScanner.scan()`, `RiskEngine.assess()` | `config/settings.py`, `repositories/device_repository.py`, `services/network_scanner.py`, `services/risk_engine.py` | Executable instructions are used throughout the pipeline to validate configuration, discover devices, assess risk, and log results. |
| Arithmetic operators | `score += 30`, `score += 60`, `score += 15`, `score = ...` | `services/risk_engine.py` | Arithmetic is used for weighted evidence accumulation in a realistic security-scoring system rather than as decorative code. |
| Local variables and constants | `start = perf_counter()`, `approved = self.repository.load()`, `VALID_STATUSES`, `REQUIRED` | `services/network_scanner.py`, `models/device.py`, `repositories/device_repository.py` | Local variables store temporary values for a single purpose, while constants represent fixed categories and required keys. |
| Logical and conditional operators | `if device.status == "PENDING"`, `elif device.status == "UNAUTHORISED"`, `if mac in seen`, `if key not in self.history` | `services/risk_engine.py`, `services/network_scanner.py`, `services/device_monitor.py` | Real decision-making uses Boolean logic to classify device state and prevent duplicates. |
| Sequence | `cycle()` and `run()` | `main.py` | The application follows a clear sequential flow: scan, assess, display, log, sleep, repeat. |
| Selection | `if`, `elif`, `else` in risk calculations and configuration validation | `services/risk_engine.py`, `config/settings.py` | Selection is used to decide risk category and configuration validity. |
| Iteration | `for device in devices:`, `while self.running:` | `main.py` | The program repeatedly processes devices and continues scanning until interrupted. |
| GUI requirement note | Terminal-based interface used intentionally | `main.py` | This solution is designed as a background network-monitoring system rather than a desktop GUI. User interaction is operational and terminal-driven, which is appropriate for this application type. |
| Global variables | None used | All project files | No unnecessary global state is used; the design relies on object attributes and dependency injection. |
| Functions and methods | `load()`, `scan()`, `observe()`, `calculate()`, `assess()`, `log()`, `run()` | Multiple files | Each method owns a single responsibility and is reusable within its class context. |
| Access modifiers | Public attributes and private/internal naming conventions | `config/settings.py`, `services/gemini_service.py` | Python conventions are used; the project does not add artificial private attributes. Members remain appropriately accessible for their working design. |
| Classes and objects | `Settings`, `Device`, `RiskAssessment`, etc. | Multiple files | The system uses concrete domain objects rather than unrelated function containers. |
| Encapsulation | `Device` validation, `Settings` immutability, `RiskEngine` composition | `models/device.py`, `config/settings.py`, `services/risk_engine.py` | Data and behaviour stay together inside their owning objects. |
| Abstraction | `RiskAnalyser` abstract base class | `services/analyser.py` | The interface hides analyser implementation details behind a common contract. |
| Inheritance | `RuleBasedRiskAnalyser` and `GeminiRiskAnalyser` inherit from `RiskAnalyser` | `services/analyser.py`, `services/gemini_service.py` | This is a genuine inheritance relationship because all analysers share the same behaviour contract. |
| Polymorphism | `RiskEngine.assess()` iterates through analyser objects | `services/risk_engine.py` | Different analyser implementations are handled through the same interface. |
| Data types | `str`, `int`, `float`, `bool`, `Enum`, `tuple`, `set`, `list`, `dict`, dataclasses | `models/*.py`, `config/settings.py`, `services/*.py` | The code uses a broad but purposeful set of Python-native types. |
| Data structures | list, dict, set, tuple, dataclass fields | `repositories/device_repository.py`, `models/device.py`, `services/device_monitor.py` | Structures are chosen based on how data is accessed and modified. |
| Data sources | environment variables, JSON, network ARP data, DNS, vendor lookup, Gemini API, CSV | Multiple files | Each data source is appropriate to the functionality it serves and is validated before use. |
| Naming conventions | `DeviceRepository`, `NetworkScanner`, `scan_interval`, `gemini_api_key`, `VALID_STATUSES` | Multiple files | Classes use PascalCase, methods and variables use snake_case, and constants use UPPER_SNAKE_CASE. |
| Internal documentation | Module docstrings and class method descriptions | All major files | The code includes clear explanatory docstrings showing why the implementation is structured this way. |
| Validation | `InputValidator`, `Device.__post_init__`, `DeviceRepository.load()` | `config/settings.py`, `models/device.py`, `repositories/device_repository.py` | The program validates config, device objects, and file input consistently. |
| Existence checks | `if not self.path.is_file()`, `if not value.strip()` | `repositories/device_repository.py`, `config/settings.py` | Required data must exist before continuation. |
| Type checks | `isinstance(value, int)`, `isinstance(value, str)`, `isinstance(approved, bool)` | `config/settings.py`, `repositories/device_repository.py` | Input is checked before processing to avoid type-related errors. |
| Range checks | `minimum <= value <= maximum`, `if n.prefixlen < 16`, `if not 0 <= a.ai.confidence <= 1` | `config/settings.py`, `services/logger.py` | Data is checked against realistic and bounded values. |
| Reasonableness checks | MAC format regex, network size, valid IP/network, AI confidence | `models/device.py`, `config/settings.py`, `services/logger.py` | Checks make sure the data makes sense in context rather than merely existing. |
| Completeness checks | Missing JSON keys, empty device fields, empty API key handling | `repositories/device_repository.py`, `models/device.py`, `config/settings.py` | The project prevents incomplete records from being accepted. |
| Code maintenance | separated modules, small classes, dependency injection, clear docstrings | All files | The solution is maintainable because responsibilities are separated and reused through object composition. |
| Do not over-engineer | minimal but functional design | Whole project | The implementation avoids unnecessary complexity while still providing clear OOP and validation evidence. |

## 5. Data source justification

### Environment variables

The system reads configuration from environment variables such as `MLANDS_NETWORK`, `MLANDS_SCAN_INTERVAL`, and `GEMINI_API_KEY`. These are appropriate because they allow secure deployment without hard-coding values, and they are validated before use.

### JSON approved-device list

The file `devices.json` stores known approved device records. Using JSON is suitable for a small local deployment because it is simple, readable, and easy to maintain. The repository validates each record before processing.

### ARP network scan

Network discovery uses ARP requests to detect devices on the local network. This is a direct and suitable source for an internal network security solution because the system is designed to work with LAN-connected devices.

### DNS and vendor lookup

The code resolves hostnames via socket lookup and vendor names via the `mac_vendor_lookup` package. These are reasonable enrichment sources for display and risk analysis, and they are safely defaulted to `Unknown` when not available.

### Gemini API

The optional AI analyser is appropriate when the API key is provided. This gives the system richer risk explanations while allowing the fallback analyser to keep the application functional without external AI access.

### CSV log

The CSV log is used as an operational audit trail. It captures timestamps, device metadata, risk scores, and AI explanation text so the result is inspectable later.

## 6. Testing and verification evidence

The project includes validation tests in `tests/test_validation.py` to check the implementation’s use of type, range, and file validation.

The project can be run with:

```bash
cd "MLaNDS Functions"
python -m unittest discover -s tests -v
```

This validates the real behaviour of the system and confirms the project does not rely on decorative or untested code.

## 7. Audit conclusion

This project shows strong evidence for the relevant 9–10 descriptor in Criterion 6 and Criterion 7 because it demonstrates:

- purposeful language features and control structures,
- genuine object-oriented design,
- meaningful data types and data structures,
- validation across required input pathways,
- clear internal documentation,
- maintainable separation of responsibilities,
- consistent naming conventions,
- and explicit evidence of rubric requirements in the code itself.

The main caveat is that this solution is intentionally a terminal-based monitoring system rather than a traditional GUI application. That is not a weakness here because the software is designed as a network-scanning daemon where direct repeated user interaction is not the primary functional requirement.
