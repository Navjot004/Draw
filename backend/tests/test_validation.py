import time
import pytest
from app.services.student_validator import validate_student_records, normalize_reg_no
from app.services.demo_data import generate_demo_students

def test_reject_blank_student_name():
    records = [
        ("", "REG001"),
        ("   ", "REG002"),
        ("Valid Name", "REG003")
    ]
    res = validate_student_records(records)
    assert res.eligible_count == 1
    assert res.invalid_count == 2
    assert res.eligible[0]["name"] == "Valid Name"
    reasons = [inv["reason"] for inv in res.invalid]
    assert all("name" in r.lower() for r in reasons)

def test_reject_blank_registration_number():
    records = [
        ("Alice", ""),
        ("Bob", "   "),
        ("Charlie", "00412")
    ]
    res = validate_student_records(records)
    assert res.eligible_count == 1
    assert res.invalid_count == 2
    assert res.eligible[0]["name"] == "Charlie"
    assert res.eligible[0]["reg_no"] == "00412"

def test_preserve_leading_zeros():
    records = [
        ("Student A", "000123"),
        ("Student B", " 000456 "),
        ("Student C", "009999")
    ]
    res = validate_student_records(records)
    assert res.eligible_count == 3
    assert res.eligible[0]["reg_no"] == "000123"
    assert res.eligible[1]["reg_no"] == "000456"
    assert res.eligible[2]["reg_no"] == "009999"

def test_trim_whitespace():
    records = [
        ("  Jane Doe  ", "  REG999  ")
    ]
    res = validate_student_records(records)
    assert res.eligible_count == 1
    assert res.eligible[0]["name"] == "Jane Doe"
    assert res.eligible[0]["reg_no"] == "REG999"

def test_duplicate_registration_numbers_case_insensitive():
    records = [
        ("Alice Smith", "REG2024CS001"),
        ("Bob Jones", "reg2024cs001"),  # Lowercase duplicate
        ("Charlie Brown", "REG2024CS002")  # Unique
    ]
    res = validate_student_records(records)
    # The duplicate should be flagged and BOTH records excluded from eligible pool
    assert res.eligible_count == 1
    assert res.eligible[0]["name"] == "Charlie Brown"
    assert len(res.duplicates) == 1
    assert res.duplicates[0]["reg_no"] == "REG2024CS001"
    assert res.duplicates[0]["occurrences"] == 2
    assert "Alice Smith" in res.duplicates[0]["names"]
    assert "Bob Jones" in res.duplicates[0]["names"]

def test_empty_participant_list():
    res = validate_student_records([])
    assert res.eligible_count == 0
    assert res.invalid_count == 0
    assert res.total_fetched == 0
    assert len(res.pool_hash) == 64

def test_deterministic_pool_hash():
    records1 = [
        ("Bob", "REG002"),
        ("Alice", "REG001")
    ]
    records2 = [
        ("Alice", "REG001"),
        ("Bob", "REG002")
    ]
    # Even if order in sheet is reversed, deterministic sorting yields identical hash
    res1 = validate_student_records(records1)
    res2 = validate_student_records(records2)
    assert res1.pool_hash == res2.pool_hash

def test_large_participant_pool_performance():
    raw_data = generate_demo_students(6250)
    assert len(raw_data) >= 6000

    start_time = time.time()
    res = validate_student_records(raw_data)
    duration = time.time() - start_time

    assert res.total_fetched >= 6000
    assert res.eligible_count >= 5900
    assert res.invalid_count > 0
    assert len(res.duplicates) > 0
    # Validation of 6,000+ records must be fast (< 250ms)
    assert duration < 0.25, f"Validation took too long: {duration:.4f}s"
