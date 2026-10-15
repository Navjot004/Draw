import io
import csv
import logging
from typing import List, Tuple, Optional, Any
import openpyxl

logger = logging.getLogger(__name__)

NAME_KEYWORDS = [
    "student name", "participant name", "candidate name", "full name", "person name",
    "name", "student", "participant", "candidate", "attendee", "person", "names"
]

REG_KEYWORDS = [
    "registration number", "registration no", "reg number", "reg no", "reg_no",
    "regno", "roll no", "roll number", "student id", "student_id", "enrollment no",
    "enrollment number", "admission no", "ticket no", "id number", "id", "reg",
    "serial no", "sr no", "sno", "s.no"
]


def clean_cell_value(val: Any) -> str:
    if val is None:
        return ""
    if isinstance(val, float) and val.is_integer():
        return str(int(val))
    return str(val).strip()


class ExcelService:
    @staticmethod
    def parse_file(file_bytes: bytes, filename: str) -> Tuple[List[Tuple[str, str]], Optional[str]]:
        """
        Parses an uploaded Excel (.xlsx) or CSV/text file containing participant names.
        Returns: (records: List[(name, reg_no)], error_message: Optional[str])
        """
        lower_filename = filename.lower()
        if lower_filename.endswith(".xlsx"):
            return ExcelService._parse_xlsx(file_bytes)
        elif lower_filename.endswith((".csv", ".txt", ".tsv")):
            return ExcelService._parse_csv_or_text(file_bytes)
        elif lower_filename.endswith(".xls"):
            return [], "Old Excel format (.xls) is not supported. Please save/export as .xlsx or .csv and upload again."
        else:
            # Try parsing as xlsx first, then fallback to csv
            try:
                return ExcelService._parse_xlsx(file_bytes)
            except Exception:
                return ExcelService._parse_csv_or_text(file_bytes)

    @staticmethod
    def _parse_xlsx(file_bytes: bytes) -> Tuple[List[Tuple[str, str]], Optional[str]]:
        try:
            wb = openpyxl.load_workbook(filename=io.BytesIO(file_bytes), read_only=True, data_only=True)
            sheet = wb.active
            if sheet is None:
                return [], "The Excel workbook has no active sheet."

            raw_rows: List[List[str]] = []
            for row in sheet.iter_rows(values_only=True):
                # Convert row cells to cleaned strings
                cleaned_row = [clean_cell_value(cell) for cell in row]
                # Keep if row has at least one non-empty cell
                if any(cleaned_row):
                    raw_rows.append(cleaned_row)

            wb.close()
            return ExcelService._extract_records_from_matrix(raw_rows)
        except Exception as e:
            logger.error(f"Error parsing .xlsx file: {e}", exc_info=True)
            return [], f"Failed to parse Excel (.xlsx) file: {str(e)}"

    @staticmethod
    def _parse_csv_or_text(file_bytes: bytes) -> Tuple[List[Tuple[str, str]], Optional[str]]:
        # Attempt standard encodings: utf-8-sig (with BOM), utf-8, latin-1
        text_content = None
        for enc in ["utf-8-sig", "utf-8", "latin-1", "cp1252"]:
            try:
                text_content = file_bytes.decode(enc)
                break
            except UnicodeDecodeError:
                continue

        if text_content is None:
            return [], "Unable to decode text file. Please ensure it is saved in UTF-8 or standard CSV format."

        try:
            # Detect delimiter (comma vs tab vs semicolon)
            sample = text_content[:2048]
            delimiter = ","
            if "\t" in sample and sample.count("\t") > sample.count(","):
                delimiter = "\t"
            elif ";" in sample and sample.count(";") > sample.count(","):
                delimiter = ";"

            reader = csv.reader(io.StringIO(text_content), delimiter=delimiter)
            raw_rows: List[List[str]] = []
            for row in reader:
                cleaned_row = [clean_cell_value(cell) for cell in row]
                if any(cleaned_row):
                    raw_rows.append(cleaned_row)

            return ExcelService._extract_records_from_matrix(raw_rows)
        except Exception as e:
            logger.error(f"Error parsing CSV/text file: {e}", exc_info=True)
            return [], f"Failed to parse CSV file: {str(e)}"

    @staticmethod
    def _extract_records_from_matrix(rows: List[List[str]]) -> Tuple[List[Tuple[str, str]], Optional[str]]:
        if not rows:
            return [], "The uploaded file contains no data rows."

        # Analyze first row for headers
        header_candidate = [cell.lower().strip() for cell in rows[0]]
        name_idx = -1
        reg_idx = -1

        for idx, col_name in enumerate(header_candidate):
            if name_idx == -1 and any(kw == col_name or kw in col_name for kw in NAME_KEYWORDS):
                name_idx = idx
            if reg_idx == -1 and any(kw == col_name or kw in col_name for kw in REG_KEYWORDS):
                reg_idx = idx

        has_header = (name_idx != -1 or reg_idx != -1)

        data_rows = rows[1:] if has_header else rows

        if not data_rows:
            return [], "The uploaded file only contains a header row with no participant data."

        num_cols = max(len(r) for r in data_rows)

        # Determine column mappings if not found in header
        if not has_header:
            if num_cols == 1:
                name_idx = 0
                reg_idx = -1  # Will auto-generate registration numbers
            elif num_cols >= 2:
                # Check heuristic: if col 0 has letters/spaces and col 1 has alphanumeric IDs
                first_row = data_rows[0]
                col0 = first_row[0] if len(first_row) > 0 else ""
                col1 = first_row[1] if len(first_row) > 1 else ""

                # If col 0 looks like ID (e.g. numeric/alphanumeric with digits) and col 1 is text with spaces
                if any(c.isdigit() for c in col0) and not any(c.isdigit() for c in col1) and " " in col1:
                    reg_idx = 0
                    name_idx = 1
                else:
                    name_idx = 0
                    reg_idx = 1
        else:
            # If header had only name or only reg
            if name_idx == -1 and reg_idx != -1:
                # Reg was found, name is the other column
                name_idx = 0 if reg_idx != 0 else 1
            elif name_idx != -1 and reg_idx == -1:
                # Name was found; if there's another column, use it as reg
                other_col = 0 if name_idx != 0 else 1
                if num_cols > 1:
                    reg_idx = other_col
                else:
                    reg_idx = -1

        records: List[Tuple[str, str]] = []
        seq_counter = 1

        for row in data_rows:
            name_val = row[name_idx] if 0 <= name_idx < len(row) else ""
            if reg_idx != -1 and 0 <= reg_idx < len(row):
                reg_val = row[reg_idx]
            else:
                reg_val = ""

            name_val = name_val.strip()
            reg_val = reg_val.strip()

            # If reg_val is missing but name_val is present, generate a clean ID
            # so the organizer isn't blocked if their sheet only has names!
            if name_val and not reg_val:
                reg_val = f"P-{seq_counter:04d}"

            records.append((name_val, reg_val))
            seq_counter += 1

        return records, None
