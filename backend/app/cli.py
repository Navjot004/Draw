import sys
import argparse
from app.database.session import SessionLocal, init_db
from app.models.organizer import Organizer
from app.core.security import hash_password
from app.services.sheets_service import SheetsService
from app.services.student_validator import validate_student_records
from app.models.student_pool import StudentPoolSnapshot
import json
from datetime import datetime, timezone

def create_organizer(email: str, password: str, role: str = "organizer"):
    init_db()
    db = SessionLocal()
    try:
        email_clean = email.lower().strip()
        existing = db.query(Organizer).filter(Organizer.email == email_clean).first()
        if existing:
            print(f"[ERROR] Organizer with email '{email_clean}' already exists!")
            return False

        organizer = Organizer(
            email=email_clean,
            password_hash=hash_password(password),
            role=role
        )
        db.add(organizer)
        db.commit()
        db.refresh(organizer)
        print(f"[SUCCESS] Organizer '{email_clean}' created successfully with role '{role}' (ID: {organizer.id}).")
        return True
    finally:
        db.close()

def list_organizers():
    init_db()
    db = SessionLocal()
    try:
        organizers = db.query(Organizer).all()
        print(f"\n--- Registered Organizers ({len(organizers)}) ---")
        for o in organizers:
            print(f"- {o.email} | Role: {o.role} | ID: {o.id} | Created: {o.created_at}")
        print("------------------------------------------\n")
    finally:
        db.close()

def main():
    parser = argparse.ArgumentParser(description="Mystery Name Shuffle Administrative CLI")
    subparsers = parser.add_subparsers(dest="command", help="Command to run")

    # create-organizer
    create_parser = subparsers.add_parser("create-organizer", help="Create a new organizer account")
    create_parser.add_argument("--email", required=True, help="Organizer email address")
    create_parser.add_argument("--password", required=True, help="Organizer password")
    create_parser.add_argument("--role", default="organizer", help="Role (admin or organizer)")

    # list-organizers
    subparsers.add_parser("list-organizers", help="List registered organizers")

    args = parser.parse_args()

    if args.command == "create-organizer":
        create_organizer(args.email, args.password, args.role)
    elif args.command == "list-organizers":
        list_organizers()
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
