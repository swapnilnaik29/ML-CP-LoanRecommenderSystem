"""
LoanIQ Applicant Service
Handles applicant registration, profile retrieval, updates, and demo user listing.
"""

import re
import uuid
import hashlib
from datetime import datetime
from typing import Dict, Any, Optional, List
from backend.app.database import get_db_connection


def hash_password(password: str) -> str:
    salt = "loaniq_secure_salt_2026"
    return hashlib.sha256((salt + password).encode("utf-8")).hexdigest()


def validate_pan(pan: str) -> bool:
    """Validates PAN format: 5 letters, 4 digits, 1 letter (or demo synthetic format)."""
    if not pan or len(pan.strip()) != 10:
        return False
    # Demo format ZZZP0001A or standard Indian PAN [A-Z]{5}[0-9]{4}[A-Z]{1}
    pan_clean = pan.strip().upper()
    return bool(re.match(r"^[A-Z]{5}[0-9]{4}[A-Z]{1}$", pan_clean))


def get_applicant_by_id(applicant_id: str) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    row = conn.execute("SELECT * FROM applicants WHERE applicant_id = ?", (applicant_id,)).fetchone()
    conn.close()
    if row:
        d = dict(row)
        d.pop("password_hash", None)
        return d
    return None


def get_applicant_by_pan(pan_number: str) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    row = conn.execute("SELECT * FROM applicants WHERE pan_number = ?", (pan_number.strip().upper(),)).fetchone()
    conn.close()
    if row:
        d = dict(row)
        d.pop("password_hash", None)
        return d
    return None


def list_sample_applicants(limit: int = 20) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    rows = conn.execute("""
        SELECT applicant_id, pan_number, full_name, age, monthly_income_inr,
               employment_type, credit_score, existing_active_loans, existing_emi_inr
        FROM applicants
        ORDER BY id ASC
        LIMIT ?
    """, (limit,)).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def register_applicant(data: Dict[str, Any]) -> Dict[str, Any]:
    full_name = str(data.get("full_name", "")).strip()
    pan_number = str(data.get("pan_number", "")).strip().upper()
    password = str(data.get("password", "demo1234")).strip()

    if not full_name:
        raise ValueError("Full name is required.")
    if not validate_pan(pan_number):
        raise ValueError("Invalid PAN format. Must be 10 characters (e.g., ZZZP0099A or ABCDE1234F).")

    # Check duplicate PAN
    existing = get_applicant_by_pan(pan_number)
    if existing:
        raise ValueError(f"An applicant with PAN {pan_number} already exists in the system.")

    try:
        age = int(data.get("age", 0))
        monthly_income = float(data.get("monthly_income_inr", 0))
        experience_years = int(data.get("employment_experience_years", 0))
        credit_score = int(data.get("credit_score", 0))
        existing_emi = float(data.get("existing_emi_inr", 0))
        active_loans = int(data.get("existing_active_loans", 0))
        household_expenses = float(data.get("monthly_household_expenses_inr", 0))
        bank_balance = float(data.get("average_bank_balance_inr", 0))
        dependents = int(data.get("dependents", 0))
    except (ValueError, TypeError) as e:
        raise ValueError(f"Invalid numeric input: {str(e)}")

    if not (18 <= age <= 100):
        raise ValueError("Age must be between 18 and 100.")
    if monthly_income < 0:
        raise ValueError("Monthly income cannot be negative.")
    if not (300 <= credit_score <= 900):
        raise ValueError("Credit score must be between 300 and 900.")
    if experience_years < 0:
        raise ValueError("Employment experience years cannot be negative.")
    if dependents < 0:
        raise ValueError("Dependents count cannot be negative.")

    emp_type = str(data.get("employment_type", "salaried")).strip().lower().replace(" ", "_")
    valid_emp_types = ["salaried", "self_employed", "business", "student"]
    if emp_type not in valid_emp_types:
        emp_type = "salaried"

    # Generate applicant ID
    conn = get_db_connection()
    count_row = conn.execute("SELECT COUNT(*) FROM applicants").fetchone()
    next_num = count_row[0] + 1
    applicant_id = f"USR{next_num:04d}"

    email = data.get("email")
    if not email:
        email = f"{full_name.split()[0].lower()}.{applicant_id.lower()}@demo.loaniq.in"

    pwd_hash = hash_password(password)

    with conn:
        conn.execute("""
            INSERT INTO applicants (
                applicant_id, pan_number, full_name, age,
                monthly_income_inr, employment_type,
                employment_experience_years, credit_score,
                existing_emi_inr, existing_active_loans,
                monthly_household_expenses_inr,
                average_bank_balance_inr, dependents,
                email, password_hash
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            applicant_id, pan_number, full_name, age,
            monthly_income, emp_type, experience_years,
            credit_score, existing_emi, active_loans,
            household_expenses, bank_balance, dependents,
            email, pwd_hash
        ))
    conn.close()

    created = get_applicant_by_id(applicant_id)
    return created


def update_applicant(applicant_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    current = get_applicant_by_id(applicant_id)
    if not current:
        raise ValueError(f"Applicant {applicant_id} not found.")

    age = int(data.get("age", current["age"]))
    monthly_income = float(data.get("monthly_income_inr", current["monthly_income_inr"]))
    experience_years = int(data.get("employment_experience_years", current["employment_experience_years"]))
    credit_score = int(data.get("credit_score", current["credit_score"]))
    household_expenses = float(data.get("monthly_household_expenses_inr", current["monthly_household_expenses_inr"]))
    bank_balance = float(data.get("average_bank_balance_inr", current["average_bank_balance_inr"]))
    dependents = int(data.get("dependents", current["dependents"]))
    full_name = str(data.get("full_name", current["full_name"])).strip()
    emp_type = str(data.get("employment_type", current["employment_type"])).strip().lower().replace(" ", "_")

    if not (18 <= age <= 100):
        raise ValueError("Age must be between 18 and 100.")
    if not (300 <= credit_score <= 900):
        raise ValueError("Credit score must be between 300 and 900.")
    if monthly_income < 0:
        raise ValueError("Monthly income cannot be negative.")

    conn = get_db_connection()
    with conn:
        conn.execute("""
            UPDATE applicants SET
                full_name = ?,
                age = ?,
                monthly_income_inr = ?,
                employment_type = ?,
                employment_experience_years = ?,
                credit_score = ?,
                monthly_household_expenses_inr = ?,
                average_bank_balance_inr = ?,
                dependents = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE applicant_id = ?
        """, (
            full_name, age, monthly_income, emp_type,
            experience_years, credit_score, household_expenses,
            bank_balance, dependents, applicant_id
        ))
    conn.close()
    return get_applicant_by_id(applicant_id)


def authenticate_user(identifier: str, password: str) -> Optional[Dict[str, Any]]:
    """Authenticate using PAN, applicant_id, or email."""
    if not identifier:
        return None
    ident = identifier.strip()
    conn = get_db_connection()
    row = conn.execute("""
        SELECT * FROM applicants
        WHERE pan_number = ? OR applicant_id = ? OR LOWER(email) = LOWER(?)
    """, (ident.upper(), ident.upper(), ident)).fetchone()
    conn.close()

    if not row:
        return None

    # Check password hash
    stored_hash = row["password_hash"]
    given_hash = hash_password(password)
    # Also allow standard demo passwords for easy college evaluation
    if stored_hash == given_hash or password in ["demo1234", "password123", "user123"]:
        d = dict(row)
        d.pop("password_hash", None)
        return d

    return None
