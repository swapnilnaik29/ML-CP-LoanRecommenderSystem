"""
LoanIQ V2 Database Seeding Script
Idempotently initializes and seeds instance/loaniq_v2.db with:
- 16 V2 loan products from LoanIQ_retrained_ml_package/data/products/loan_products_config.json
- 100 synthetic applicants from LoanIQ_retrained_ml_package/data/users/loan_applicant_users_100.csv
- 131 synthetic existing loans from LoanIQ_retrained_ml_package/data/users/existing_loans_100_users.csv
"""

import sys
import json
import shutil
import hashlib
import pandas as pd
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from backend.app.database import get_db_connection, init_db


def hash_password(password: str) -> str:
    salt = "loaniq_secure_salt_2026"
    return hashlib.sha256((salt + password).encode("utf-8")).hexdigest()


def seed_v2_database():
    v2_dir = BASE_DIR / "LoanIQ_retrained_ml_package"
    products_json = v2_dir / "data" / "products" / "loan_products_config.json"
    applicants_csv = v2_dir / "data" / "users" / "loan_applicant_users_100.csv"
    loans_csv = v2_dir / "data" / "users" / "existing_loans_100_users.csv"

    if not products_json.exists():
        raise FileNotFoundError(f"V2 Products JSON not found: {products_json}")
    if not applicants_csv.exists():
        raise FileNotFoundError(f"V2 Applicants CSV not found: {applicants_csv}")
    if not loans_csv.exists():
        raise FileNotFoundError(f"V2 Loans CSV not found: {loans_csv}")

    print("Initializing isolated V2 database at: instance/loaniq_v2.db")
    init_db("v2")
    conn = get_db_connection("v2")

    # 1. Seed V2 Loan Products
    print(f"Reading V2 products from: {products_json}")
    with open(products_json, "r") as f:
        prod_data = json.load(f)
    products = prod_data.get("products", [])

    prod_count = 0
    with conn:
        for p in products:
            loan_type = p["loan_type"].capitalize()
            annual_rate = float(p.get("annual_interest_rate_pct", 10.0))
            min_amt = float(p.get("min_amount_inr", 100000))
            max_amt = float(p.get("max_amount_inr", 1000000))
            min_score = int(p.get("min_credit_score", 650))
            min_age = int(p.get("min_age", 21))
            max_age = int(p.get("max_age", 65))
            max_tenure = int(p.get("max_tenure_months", 60))
            min_emi = float(p.get("min_emi_inr", 1000))
            max_emi = float(p.get("max_emi_inr", 50000))
            approval_rate = float(p.get("design_approval_rate", 0.5))

            conn.execute("""
                INSERT INTO loan_products (
                    product_id, loan_type, product_name,
                    min_loan_amount, max_loan_amount,
                    min_credit_score, min_age, max_age,
                    interest_rate_min, interest_rate_max,
                    min_tenure_months, max_tenure_months,
                    annual_interest_rate_pct, min_emi_inr, max_emi_inr,
                    design_approval_rate
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(product_id) DO UPDATE SET
                    loan_type = excluded.loan_type,
                    product_name = excluded.product_name,
                    min_loan_amount = excluded.min_loan_amount,
                    max_loan_amount = excluded.max_loan_amount,
                    min_credit_score = excluded.min_credit_score,
                    min_age = excluded.min_age,
                    max_age = excluded.max_age,
                    interest_rate_min = excluded.interest_rate_min,
                    interest_rate_max = excluded.interest_rate_max,
                    min_tenure_months = excluded.min_tenure_months,
                    max_tenure_months = excluded.max_tenure_months,
                    annual_interest_rate_pct = excluded.annual_interest_rate_pct,
                    min_emi_inr = excluded.min_emi_inr,
                    max_emi_inr = excluded.max_emi_inr,
                    design_approval_rate = excluded.design_approval_rate;
            """, (
                p["product_id"], loan_type, p["product_name"],
                min_amt, max_amt,
                min_score, min_age, max_age,
                annual_rate, annual_rate,
                12, max_tenure,
                annual_rate, min_emi, max_emi,
                approval_rate
            ))
            prod_count += 1
    print(f"Seeded {prod_count} V2 loan products successfully.")

    # 2. Reconcile and Seed Applicants and Existing Loans
    print(f"Reading V2 applicants from: {applicants_csv}")
    app_df = pd.read_csv(applicants_csv)
    print(f"Reading V2 existing loans from: {loans_csv}")
    loans_df = pd.read_csv(loans_csv)

    # Reconcile aggregates
    active_loans = loans_df[loans_df["status"].str.lower() == "active"]
    loan_aggregates = active_loans.groupby("applicant_id").agg(
        reconciled_loan_count=("loan_account_id", "count"),
        reconciled_total_emi=("emi_inr", "sum")
    ).reset_index()

    merged = pd.merge(app_df, loan_aggregates, on="applicant_id", how="left")
    merged["reconciled_loan_count"] = merged["reconciled_loan_count"].fillna(0).astype(int)
    merged["reconciled_total_emi"] = merged["reconciled_total_emi"].fillna(0.0).astype(float)

    default_pwd_hash = hash_password("demo1234")

    with conn:
        # Seed applicants
        app_count = 0
        for _, row in merged.iterrows():
            first_name = row["full_name"].split()[0].lower()
            email = f"{first_name}.{row['applicant_id'].lower()}@demo.loaniq.in"
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
                    email = excluded.email;
            """, (
                row["applicant_id"], row["pan_number"], row["full_name"], int(row["age"]),
                float(row["monthly_income_inr"]), row["employment_type"],
                int(row["employment_experience_years"]), int(row["credit_score"]),
                actual_emi, actual_loans,
                float(row["monthly_household_expenses_inr"]),
                float(row["average_bank_balance_inr"]), int(row["dependents"]),
                email, default_pwd_hash
            ))
            app_count += 1
        print(f"Seeded {app_count} V2 applicants.")

        # Seed existing loans
        loan_count = 0
        for _, row in loans_df.iterrows():
            emi = float(row["emi_inr"])
            min_emi = round(max(500.0, emi * 0.4), -2)
            max_emi = round(emi * 3.0, -2)

            conn.execute("""
                INSERT INTO existing_loans (
                    loan_account_id, applicant_id, pan_number, loan_type,
                    loan_amount_inr, annual_interest_rate_pct,
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
                row["loan_account_id"], row["applicant_id"], row["pan_number"], row["loan_type"],
                float(row["loan_amount_inr"]), float(row["annual_interest_rate_pct"]),
                int(row["original_tenure_months"]), str(row["loan_start_date"]), emi,
                min_emi, max_emi,
                float(row["remaining_loan_amount_inr"]), int(row["remaining_tenure_months"]),
                float(row["remaining_tenure_years"]), str(row["maturity_date"]),
                str(row["status"]).capitalize(), str(row.get("snapshot_date", ""))
            ))
            loan_count += 1
        print(f"Seeded {loan_count} V2 existing loans.")

    conn.close()
    legacy_path = BASE_DIR / "instance" / "loaniq.db"
    try:
        shutil.copyfile(BASE_DIR / "instance" / "loaniq_v2.db", legacy_path)
        print(f"Synchronized V2 database to legacy instance path: {legacy_path}")
    except Exception as e:
        print(f"Notice: legacy mirror copy skipped: {e}")
    print("V2 Database successfully initialized and seeded!")


if __name__ == "__main__":
    seed_v2_database()
