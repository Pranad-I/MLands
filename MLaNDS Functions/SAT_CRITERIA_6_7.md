# Criteria 6 and 7 implementation evidence

This version is designed specifically around the VCE Software Development Unit 4 Outcome 1 Criteria 6 and 7 indicators.

## Criterion 6
- Classes/objects: Device, DeviceHistory, RiskAssessment, DeviceRepository, NetworkScanner, DeviceMonitor, RiskCalculator, RiskEngine, GeminiRiskAnalyser, DeviceLogger, Settings, InputValidator, MLaNDSApplication.
- OOP: encapsulation, abstraction, inheritance through the abstract RiskAnalyser, polymorphism through interchangeable analysers, and composition/dependency injection.
- Data types: str, int, float, bool, Enum/IntEnum, datetime and dataclass records.
- Structures: list, dict, set, tuple, dataclasses.
- Sources: ARP/network data, JSON approved-device data, CSV history, DNS, vendor database and optional Gemini API.

## Criterion 7
- Naming: PascalCase classes, snake_case methods/variables, UPPER_SNAKE_CASE constants.
- Documentation: module/class/method docstrings and this evidence guide explain functionality, data and code structures.
- Validation: existence, type, range, format, reasonableness and completeness checks are implemented.
- Maintainability: models/services/repository/configuration are separated, with dependency injection and a polymorphic interface.
- Tests: `python -m unittest discover -s tests -v` tests network format, type/range validation, missing files and incomplete JSON.

## Important
A codebase cannot literally guarantee a 10/10 mark. The rubric also assesses evidence presented by the student. Use this implementation together with your documented debugging, alpha-testing, maintenance and evidence screenshots.
