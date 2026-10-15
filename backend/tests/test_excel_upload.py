import io
import openpyxl
import pytest
from app.services.excel_service import ExcelService


def test_excel_service_parse_xlsx():
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.append(["Student Name", "Roll Number"])
    ws.append(["Rahul Sharma", "2026-CS-001"])
    ws.append(["Pooja Verma", "2026-CS-002"])
    ws.append(["  ", "  "])  # Blank row to test filtering
    ws.append(["Amit Singh", "2026-CS-003"])

    bio = io.BytesIO()
    wb.save(bio)
    bio.seek(0)

    records, error = ExcelService.parse_file(bio.getvalue(), "students.xlsx")
    assert error is None
    assert len(records) == 3
    assert records[0] == ("Rahul Sharma", "2026-CS-001")
    assert records[1] == ("Pooja Verma", "2026-CS-002")
    assert records[2] == ("Amit Singh", "2026-CS-003")


def test_excel_service_parse_csv():
    csv_content = "Name,Registration No\nSneha Roy,REG-991\nVikram Malhotra,REG-992\n"
    records, error = ExcelService.parse_file(csv_content.encode("utf-8"), "participants.csv")
    assert error is None
    assert len(records) == 2
    assert records[0] == ("Sneha Roy", "REG-991")
    assert records[1] == ("Vikram Malhotra", "REG-992")


def test_excel_service_single_column_names_only():
    # Only names, no registration column - should auto-generate clean IDs
    csv_content = "John Doe\nJane Smith\nAlice Cooper\n"
    records, error = ExcelService.parse_file(csv_content.encode("utf-8"), "names.txt")
    assert error is None
    assert len(records) == 3
    assert records[0][0] == "John Doe"
    assert records[0][1] == "P-0001"
    assert records[1][0] == "Jane Smith"
    assert records[1][1] == "P-0002"


def test_api_upload_excel(client, auth_headers):
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.append(["Name", "Roll No"])
    for i in range(1, 15):
        ws.append([f"Participant {i}", f"TICKET-{i:03d}"])

    bio = io.BytesIO()
    wb.save(bio)
    bio.seek(0)

    res = client.post(
        "/api/students/upload",
        headers=auth_headers,
        files={"file": ("event_names.xlsx", bio.getvalue(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["total_fetched"] == 14
    assert data["eligible_count"] == 14
    assert data["source"] == "excel:event_names.xlsx"
    assert len(data["pool_hash"]) == 64

    # Status check
    status_res = client.get("/api/students/status", headers=auth_headers)
    assert status_res.status_code == 200
    st = status_res.json()
    assert st["is_ready"] is True
    assert st["total_eligible"] == 14
    assert st["file_name"] == "event_names.xlsx"
    assert "Excel" in st["source_label"]


def test_api_download_template(client, auth_headers):
    res = client.get("/api/students/template", headers=auth_headers)
    assert res.status_code == 200
    assert "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" in res.headers["content-type"]
    assert len(res.content) > 100
