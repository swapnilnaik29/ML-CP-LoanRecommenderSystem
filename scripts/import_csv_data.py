"""
Import applicants and existing loans from CSV files into SQLite database.
Ensures idempotency, transactional integrity, and aggregate reconciliation.
"""

import sys
import hashlib
import pandas as pd
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from backend.app.database import get_db_connection, init_db


def hash_password(password: str) -> str:
    """Creates a secure sha256 hash with salt for storage."""
    salt = "loaniq_secure_salt_2026"
    return hashlib.sha256((salt + password).encode("utf-8")).hexdigest()


def import_csv_data(applicants_csv: Path = None, loans_csv: Path = None):
    init_db()

    if applicants_csv is None:
        applicants_csv = BASE_DIR / "data" / "raw" / "loan_applicant_users_100.csv"
        if not applicants_csv.exists():
            applicants_csv = BASE_DIR / "loan_applicant_users_100.csv"

    if loans_csv is None:
        loans_csv = BASE_DIR / "data" / "raw" / "existing_loans_100_users.csv"
        if not loans_csv.exists():
            loans_csv = BASE_DIR / "existing_loans_100_users.csv"

    if not applicants_csv.exists():
        raise FileNotFoundError(f"Applicant CSV not found: {applicants_csv}")
    if not loans_csv.exists():
        raise FileNotFoundError(f"Existing loans CSV not found: {loans_csv}")

    print(f"Reading applicants from: {applicants_csv}")
    app_df = pd.read_csv(applicants_csv)
    print(f"Reading existing loans from: {loans_csv}")
    loans_df = pd.read_csv(loans_csv)

    # Reconcile applicant aggregates from loan records
    active_loans = loans_df[loans_df["status"].str.lower() == "active"]
    loan_aggregates = active_loans.groupby("applicant_id").agg(
        reconciled_loan_count=("loan_account_id", "count"),
        reconciled_total_emi=("emi_inr", "sum")
    ).reset_index()

    merged = pd.merge(app_df, loan_aggregates, on="applicant_id", how="left")
    merged["reconciled_loan_count"] = merged["reconciled_loan_count"].fillna(0).astype(int)
    merged["reconciled_total_emi"] = merged["reconciled_total_emi"].fillna(0.0).astype(float)

    # Check for discrepancies and log them
    discrepancies = merged[
        (merged["existing_active_loans"] != merged["reconciled_loan_count"]) |
        (abs(merged["existing_emi_inr"] - merged["reconciled_total_emi"]) > 1.0)
    ]
    if len(discrepancies) > 0:
        print(f"Notice: Found {len(discrepancies)} discrepancies between applicant summary and loan items.")
        print("Using loan-level records as ground truth source for aggregate reconciliation.")
    else:
        print("Aggregate reconciliation check passed: applicant summaries match loan-level ground truth 100%.")

    conn = get_db_connection()
    default_pwd_hash = hash_password("demo1234")

    try:
        with conn:
            # 1. Insert/Update Applicants
            app_count = 0
            for _, row in merged.iterrows():
                # Derive email if not present
                first_name = row['full_name'].split()[0].lower()
                email = f"{first_name}.{row['applicant_id'].lower()}@demo.loaniq.in"
                # Use reconciled values as ground truth
                actual_emi = float(row["reconciled_total_emi"])
                actual_loans = int(row["reconciled_loan_count"])

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
                    ON CONFLICT(applicant_id) DO UPDATE SET
                        pan_number = excluded.pan_number,
                        full_name = excluded.full_name,
                        age = excluded.age,
                        monthly_income_inr = excluded.monthly_income_inr,
                        employment_type = excluded.employment_type,
                        employment_experience_years = excluded.employment_experience_years,
                        credit_score = excluded.credit_score,
                        existing_emi_inr = excluded.existing_emi_inr,
                        existing_active_loans = excluded.existing_active_loans,
                        monthly_household_expenses_inr = excluded.monthly_household_expenses_inr,
                        average_bank_balance_inr = excluded.average_bank_balance_inr,
                        dependents = excluded.dependents,
                        email = excluded.email,
                        updated_at = CURRENT_TIMESTAMP;
                """, (
                    str(row["applicant_id"]),
                    str(row["pan_number"]),
                    str(row["full_name"]),
                    int(row["age"]),
                    float(row["monthly_income_inr"]),
                    str(row["employment_type"]).lower().replace(" ", "_"),
                    int(row["employment_experience_years"]),
                    int(row["credit_score"]),
                    actual_emi,
                    actual_loans,
                    float(row["monthly_household_expenses_inr"]),
                    float(row["average_bank_balance_inr"]),
                    int(row["dependents"]),
                    email,
                    default_pwd_hash
                ))
                app_count += 1

            # 2. Insert/Update Existing Loans
            loan_count = 0
            for _, row in loans_df.iterrows():
                conn.execute("""
                    INSERT INTO existing_loans (
                        loan_account_id, applicant_id, pan_number,
                        loan_type, loan_amount_inr, annual_interest_rate_pct,
                        original_tenure_months, loan_start_date, emi_inr,
                        min_emi_allowed_inr, max_emi_allowed_inr,
                        remaining_loan_amount_inr, remaining_tenure_months,
                        remaining_tenure_years, maturity_date, status, snapshot_date
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(loan_account_id) DO UPDATE SET
                        applicant_id = excluded.applicant_id,
                        pan_number = excluded.pan_number,
                        loan_type = excluded.loan_type,
                        loan_amount_inr = excluded.loan_amount_inr,
                        annual_interest_rate_pct = excluded.annual_interest_rate_pct,
                        original_tenure_months = excluded.original_tenure_months,
                        loan_start_date = excluded.loan_start_date,
                        emi_inr = excluded.emi_inr,
                        min_emi_allowed_inr = excluded.min_emi_allowed_inr,
                        max_emi_allowed_inr = excluded.max_emi_allowed_inr,
                        remaining_loan_amount_inr = excluded.remaining_loan_amount_inr,
                        remaining_tenure_months = excluded.remaining_tenure_months,
                        remaining_tenure_years = excluded.remaining_tenure_years,
                        maturity_date = excluded.maturity_date,
                        status = excluded.status,
                        snapshot_date = excluded.snapshot_date;
                """, (
                    str(row["loan_account_id"]),
                    str(row["applicant_id"]),
                    str(row["pan_number"]),
                    str(row["loan_type"]).capitalize(),
                    float(row["loan_amount_inr"]),
                    float(row["annual_interest_rate_pct"]),
                    int(row["original_tenure_months"]),
                    str(row["loan_start_date"]),
                    float(row["emi_inr"]),
                    float(row.get("min_emi_allowed_inr", 500)),
                    float(row.get("max_emi_allowed_inr", 100000)),
                    float(row["remaining_loan_amount_inr"]),
                    int(row["remaining_tenure_months"]),
                    float(row.get("remaining_tenure_years", round(row["remaining_tenure_months"] / 12.0, 2))),
                    str(row["maturity_date"]),
                    str(row["status"]).lower(),
                    str(row.get("snapshot_date", ""))
                ))
                loan_count += 1

        print(f"Successfully imported {app_count} applicants and {loan_count} existing loans.")
    finally:
        conn.close()


if __name__ == "__main__":
    import_csv_data()
