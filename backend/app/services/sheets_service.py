import os
import json
import logging
from typing import List, Tuple, Dict, Any, Optional
from app.core.config import settings
from app.services.demo_data import generate_demo_students

logger = logging.getLogger(__name__)

class SheetsService:
    @staticmethod
    def is_google_sheets_configured() -> bool:
        if settings.FORCE_DEMO_MODE:
            return False
        has_sheet_id = bool(settings.GOOGLE_SHEET_ID)
        has_creds = bool(settings.GOOGLE_SERVICE_ACCOUNT_FILE and os.path.exists(settings.GOOGLE_SERVICE_ACCOUNT_FILE)) or bool(settings.GOOGLE_SERVICE_ACCOUNT_INFO)
        return has_sheet_id and has_creds

    @staticmethod
    def fetch_students_raw() -> Tuple[List[Tuple[str, str]], str, Optional[str]]:
        """
        Fetches student rows from Google Sheets or demo dataset.
        Returns: (records, source_name, error_message_if_any)
        """
        if not SheetsService.is_google_sheets_configured():
            logger.info("Google Sheets not configured. Using realistic demo dataset with 6000+ students.")
            demo_data = generate_demo_students(settings.DEMO_STUDENTS_COUNT)
            return demo_data, "demo_mode", None

        try:
            from google.oauth2 import service_account
            from googleapiclient.discovery import build

            scopes = ["https://www.googleapis.com/auth/spreadsheets.readonly"]

            if settings.GOOGLE_SERVICE_ACCOUNT_FILE and os.path.exists(settings.GOOGLE_SERVICE_ACCOUNT_FILE):
                creds = service_account.Credentials.from_service_account_file(
                    settings.GOOGLE_SERVICE_ACCOUNT_FILE, scopes=scopes
                )
            elif settings.GOOGLE_SERVICE_ACCOUNT_INFO:
                info = json.loads(settings.GOOGLE_SERVICE_ACCOUNT_INFO)
                creds = service_account.Credentials.from_service_account_info(
                    info, scopes=scopes
                )
            else:
                raise ValueError("Missing Google Service Account credentials")

            service = build("sheets", "v4", credentials=creds)
            sheet = service.spreadsheets()

            result = sheet.values().get(
                spreadsheetId=settings.GOOGLE_SHEET_ID,
                range=settings.GOOGLE_SHEET_RANGE
            ).execute()

            values = result.get("values", [])
            if not values:
                return [], "google_sheets", "Spreadsheet is empty or specified range has no rows."

            # Header row column discovery
            header = [str(col).strip().lower() for col in values[0]]
            name_idx = -1
            reg_idx = -1

            # Match variations of column names
            name_keywords = ["student name", "name", "full name", "participant name", "candidate"]
            reg_keywords = ["registration number", "reg no", "reg number", "reg_no", "roll no", "roll number", "student id", "id", "regno"]

            for idx, col in enumerate(header):
                if name_idx == -1 and any(kw in col for kw in name_keywords):
                    name_idx = idx
                if reg_idx == -1 and any(kw in col for kw in reg_keywords):
                    reg_idx = idx

            # Fallback to column 0 for name and column 1 for reg if not identified
            if name_idx == -1:
                name_idx = 0
            if reg_idx == -1:
                reg_idx = 1 if len(header) > 1 else 0

            # Extract data rows (skipping header)
            records: List[Tuple[str, str]] = []
            for row in values[1:]:
                name_val = row[name_idx] if len(row) > name_idx else ""
                reg_val = row[reg_idx] if len(row) > reg_idx else ""
                records.append((str(name_val), str(reg_val)))

            return records, "google_sheets", None

        except Exception as e:
            logger.error(f"Error fetching from Google Sheets API: {e}", exc_info=True)
            # Graceful fallback to demo mode with error notification
            demo_data = generate_demo_students(settings.DEMO_STUDENTS_COUNT)
            return demo_data, "demo_mode_fallback", f"Google Sheets API Error: {str(e)}. Fallback to demo mode."
