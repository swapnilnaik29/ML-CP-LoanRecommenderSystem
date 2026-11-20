"""
LoanIQ Existing Loan Service
Manages existing user loans, manual loan entry, and aggregate recalculation.
"""

import math
from datetime import datetime, date
from typing import Dict, Any, List, Optional
from backend.app.database import get_db_connection


def calculate_monthly_emi(principal: float, annual_rate_pct: float, tenure_months: int) -> float:
    if principal <= 0 or tenure_months <= 0:
        return 0.0
    r = (annual_rate_pct / 100.0) / 12.0
    if r == 0:
        return round(principal / tenure_months, 2)
    emi = principal * r * ((1 + r) ** tenure_months) / (((1 + r) ** tenure_months) - 1)
    return round(emi, 2)


def get_loans_for_applicant(applicant_id: str, version: str = "v2") -> List[Dict[str, Any]]:
    conn = get_db_connection(version)
    rows = conn.execute("""
        SELECT * FROM existing_loans
        WHERE applicant_id = ?
        ORDER BY status ASC, remaining_loan_amount_inr DESC
    """, (applicant_id,)).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def recalculate_applicant_aggregates(applicant_id: str, version: str = "v2"):
    """
    Recalculates total EMI and active loan count from active loans
    and updates the applicant record in SQLite.
    """
    conn = get_db_connection(version)
    with conn:
        row = conn.execute("""
            SELECT COUNT(*) as active_count, COALESCE(SUM(emi_inr), 0) as total_emi
            FROM existing_loans
            WHERE applicant_id = ? AND LOWER(status) = 'active'
        """, (applicant_id,)).fetchone()

        active_count = int(row["active_count"])
        total_emi = float(row["total_emi"])

        conn.execute("""
            UPDATE applicants
            SET existing_active_loans = ?, existing_emi_inr = ?, updated_at = CURRENT_TIMESTAMP
            WHERE applicant_id = ?
        """, (active_count, total_emi, applicant_id))
    conn.close()


def add_existing_loan(applicant_id: str, data: Dict[str, Any], version: str = "v2") -> Dict[str, Any]:
    conn = get_db_connection(version)
    app_row = conn.execute("SELECT * FROM applicants WHERE applicant_id = ?", (applicant_id,)).fetchone()
    if not app_row:
        conn.close()
        raise ValueError(f"Applicant {applicant_id} does not exist in database {version}.")

    pan_number = app_row["pan_number"]

    # Generate loan account ID
    loan_count_row = conn.execute("SELECT COUNT(*) FROM existing_loans WHERE applicant_id = ?", (applicant_id,)).fetchone()
    count = loan_count_row[0] + 1
    # Format e.g. LN000103
    num_part = applicant_id.replace("USR", "")
    loan_account_id = f"LN{num_part}{count:02d}"

    loan_type = str(data.get("loan_type", "Personal")).strip().capitalize()
    valid_types = ["Car", "Home", "Education", "Personal"]
    if loan_type not in valid_types:
        loan_type = "Personal"

    try:
        loan_amount = float(data.get("loan_amount_inr", 0))
        interest_rate = float(data.get("annual_interest_rate_pct", 10.0))
        original_tenure = int(data.get("original_tenure_months", 36))
        remaining_amount = float(data.get("remaining_loan_amount_inr", loan_amount))
        remaining_tenure = int(data.get("remaining_tenure_months", original_tenure))
    except (ValueError, TypeError) as e:
        conn.close()
        raise ValueError(f"Invalid numeric input for loan: {str(e)}")

    if loan_amount <= 0:
        conn.close()
        raise ValueError("Loan amount must be greater than zero.")
    if interest_rate <= 0 or interest_rate > 50:
        conn.close()
        raise ValueError("Annual interest rate must be between 0.1% and 50%.")
    if original_tenure <= 0:
        conn.close()
        raise ValueError("Original tenure must be greater than zero.")
    if remaining_amount < 0 or remaining_amount > loan_amount:
        conn.close()
        raise ValueError("Remaining balance must be between 0 and original loan amount.")
    if remaining_tenure < 0:
        conn.close()
        raise ValueError("Remaining tenure cannot be negative.")

    # Calculate or validate EMI
    given_emi = data.get("emi_inr")
    if given_emi and float(given_emi) > 0:
        emi_inr = float(given_emi)
    else:
        emi_inr = calculate_monthly_emi(loan_amount, interest_rate, original_tenure)

    loan_start_date = str(data.get("loan_start_date", date.today().isoformat())).strip()
    status = str(data.get("status", "active")).strip().lower()

    # Calculate estimated maturity date if not provided
    maturity_date = str(data.get("maturity_date", "")).strip()
    if not maturity_date:
        today = date.today()
        # Add remaining_tenure months
        total_months = today.month + remaining_tenure
        new_year = today.year + (total_months - 1) // 12
        new_month = ((total_months - 1) % 12) + 1
        new_day = min(today.day, 28)
        maturity_date = date(new_year, new_month, new_day).isoformat()

    min_emi_allowed = float(data.get("min_emi_allowed_inr", max(500, round(emi_inr * 0.2))))
    max_emi_allowed = float(data.get("max_emi_allowed_inr", max(10000, round(emi_inr * 3.0))))
    remaining_years = round(remaining_tenure / 12.0, 2)

    with conn:
        conn.execute("""
            INSERT INTO existing_loans (
                loan_account_id, applicant_id, pan_number,
                loan_type, loan_amount_inr, annual_interest_rate_pct,
                original_tenure_months, loan_start_date, emi_inr,
                min_emi_allowed_inr, max_emi_allowed_inr,
                remaining_loan_amount_inr, remaining_tenure_months,
                remaining_tenure_years, maturity_date, status, snapshot_date
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            loan_account_id, applicant_id, pan_number,
            loan_type, loan_amount, interest_rate,
            original_tenure, loan_start_date, emi_inr,
            min_emi_allowed, max_emi_allowed,
            remaining_amount, remaining_tenure,
            remaining_years, maturity_date, status, date.today().isoformat()
        ))
    conn.close()

    # Reconcile applicant totals
    recalculate_applicant_aggregates(applicant_id, version=version)

    # Return created loan
    conn = get_db_connection(version)
    created = conn.execute("SELECT * FROM existing_loans WHERE loan_account_id = ?", (loan_account_id,)).fetchone()
    conn.close()
    return dict(created)


def get_loan_by_account_id(loan_account_id: str, version: str = "v2") -> Optional[Dict[str, Any]]:
    conn = get_db_connection(version)
    row = conn.execute("SELECT * FROM existing_loans WHERE loan_account_id = ?", (loan_account_id,)).fetchone()
    conn.close()
    if row:
        return dict(row)
    return None
