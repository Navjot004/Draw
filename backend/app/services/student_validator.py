import hashlib
import re
from typing import List, Tuple, Dict, Any

class ValidationResult:
    def __init__(
        self,
        eligible: List[Dict[str, str]],
        invalid: List[Dict[str, Any]],
        duplicates: List[Dict[str, Any]],
        pool_hash: str,
        total_fetched: int
    ):
        self.eligible = eligible
        self.invalid = invalid
        self.duplicates = duplicates
        self.pool_hash = pool_hash
        self.total_fetched = total_fetched

    @property
    def eligible_count(self) -> int:
        return len(self.eligible)

    @property
    def invalid_count(self) -> int:
        return len(self.invalid)

    @property
    def duplicate_count(self) -> int:
        return sum(d["occurrences"] for d in self.duplicates)


def normalize_reg_no(raw_reg: str) -> str:
    """
    Trim whitespace, normalize internal spacing, but preserve leading zeros.
    Example: ' 004123 ' -> '004123'
    Example: 'reg-24-cs-01' -> 'REG-24-CS-01'
    """
    cleaned = raw_reg.strip()
    return cleaned.upper()


def validate_student_records(raw_records: List[Tuple[Any, Any]]) -> ValidationResult:
    """
    Validates a list of (raw_name, raw_reg_no) pairs:
    1. Trims whitespace.
    2. Rejects blank names or blank reg numbers.
    3. Normalizes registration numbers consistently without losing leading zeros.
    4. Detects duplicates case-insensitively. Does NOT silently pick one;
       flags all conflicting records and excludes them from the eligible pool.
    5. Calculates deterministic SHA-256 hash of eligible records.
    """
    total_fetched = len(raw_records)
    valid_candidates: List[Dict[str, str]] = []
    invalid_records: List[Dict[str, Any]] = []

    # Map normalized_reg -> list of candidate records
    reg_buckets: Dict[str, List[Dict[str, str]]] = {}

    for idx, row in enumerate(raw_records):
        raw_name = str(row[0]) if len(row) > 0 and row[0] is not None else ""
        raw_reg = str(row[1]) if len(row) > 1 and row[1] is not None else ""

        name_trimmed = raw_name.strip()
        reg_trimmed = raw_reg.strip()

        # Rule: Reject blank student names
        if not name_trimmed:
            invalid_records.append({
                "row_index": idx + 1,
                "raw_name": raw_name,
                "raw_reg_no": raw_reg,
                "reason": "Missing or blank student name"
            })
            continue

        # Rule: Reject blank registration numbers
        if not reg_trimmed:
            invalid_records.append({
                "row_index": idx + 1,
                "raw_name": raw_name,
                "raw_reg_no": raw_reg,
                "reason": "Missing or blank registration number"
            })
            continue

        # Normalize registration number
        normalized_reg = normalize_reg_no(reg_trimmed)
        candidate = {
            "name": name_trimmed,
            "reg_no": normalized_reg,
            "row_index": idx + 1
        }

        if normalized_reg not in reg_buckets:
            reg_buckets[normalized_reg] = []
        reg_buckets[normalized_reg].append(candidate)

    # Separate eligible unique records from duplicate records
    eligible_students: List[Dict[str, str]] = []
    duplicate_records: List[Dict[str, Any]] = []

    for norm_reg, records in reg_buckets.items():
        if len(records) == 1:
            eligible_students.append({
                "name": records[0]["name"],
                "reg_no": records[0]["reg_no"]
            })
        else:
            duplicate_records.append({
                "reg_no": norm_reg,
                "occurrences": len(records),
                "names": [r["name"] for r in records],
                "row_indices": [r["row_index"] for r in records]
            })

    # Sort eligible students deterministically by reg_no then name
    eligible_students.sort(key=lambda s: (s["reg_no"], s["name"]))

    # Deterministic SHA-256 pool hash
    hasher = hashlib.sha256()
    for student in eligible_students:
        hasher.update(f"{student['reg_no']}:{student['name']}\n".encode("utf-8"))
    pool_hash = hasher.hexdigest()

    return ValidationResult(
        eligible=eligible_students,
        invalid=invalid_records,
        duplicates=duplicate_records,
        pool_hash=pool_hash,
        total_fetched=total_fetched
    )
