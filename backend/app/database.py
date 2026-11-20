"""
LoanIQ Database Management
SQLite connection, initialization, and helper functions.
"""

import os
import sqlite3
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DB_DIR = BASE_DIR / "instance"
DB_PATH_V1 = DB_DIR / "loaniq_v1.db"
DB_PATH_V2 = DB_DIR / "loaniq_v2.db"
LEGACY_DB_PATH = DB_DIR / "loaniq.db"


def resolve_version_from_request(req=None) -> str:
    """
    Request-scoped version resolution.
    Inspects:
    1. Header: X-LoanIQ-Version
    2. Query param: ?version=v1|v2
    3. JSON body: {"version": "v1"|"v2"}
    Defaults to 'v1'. Does not use shared mutable globals.
    """
    if not req:
        return "v1"
    try:
        # 1. Header
        hdr = req.headers.get("X-LoanIQ-Version")
        if hdr and hdr.lower().strip() in ("v2", "2"):
            return "v2"
        # 2. Query parameter
        q = req.args.get("version")
        if q and q.lower().strip() in ("v2", "2"):
            return "v2"
        # 3. JSON payload
        if req.is_json:
            data = req.get_json(silent=True) or {}
            b = data.get("version")
            if b and str(b).lower().strip() in ("v2", "2"):
                return "v2"
    except Exception:
        pass
    return "v1"


def get_db_path(version: str = "v1") -> Path:
    DB_DIR.mkdir(parents=True, exist_ok=True)
    v = (version or "v1").lower().strip()
    if v in ("v2", "2"):
        return DB_PATH_V2
    if DB_PATH_V1.exists():
        return DB_PATH_V1
    return LEGACY_DB_PATH


def get_db_connection(version: str = "v1") -> sqlite3.Connection:
    path = get_db_path(version)
    conn = sqlite3.connect(str(path))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn


SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS applicants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    applicant_id TEXT UNIQUE NOT NULL,
    pan_number TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    age INTEGER NOT NULL,
    monthly_income_inr REAL NOT NULL,
    employment_type TEXT NOT NULL,
    employment_experience_years INTEGER NOT NULL,
    credit_score INTEGER NOT NULL,
    existing_emi_inr REAL NOT NULL DEFAULT 0,
    existing_active_loans INTEGER NOT NULL DEFAULT 0,
    monthly_household_expenses_inr REAL NOT NULL,
    average_bank_balance_inr REAL NOT NULL,
    dependents INTEGER NOT NULL DEFAULT 0,
    email TEXT,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS loan_products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id TEXT UNIQUE NOT NULL,
    loan_type TEXT NOT NULL,
    product_name TEXT NOT NULL,
    min_loan_amount REAL NOT NULL,
    max_loan_amount REAL NOT NULL,
    min_credit_score INTEGER NOT NULL,
    min_age INTEGER NOT NULL,
    max_age INTEGER NOT NULL,
    interest_rate_min REAL NOT NULL,
    interest_rate_max REAL NOT NULL,
    min_tenure_months INTEGER NOT NULL,
    max_tenure_months INTEGER NOT NULL,
    annual_interest_rate_pct REAL,
    min_emi_inr REAL,
    max_emi_inr REAL,
    design_approval_rate REAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS existing_loans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    loan_account_id TEXT UNIQUE NOT NULL,
    applicant_id TEXT NOT NULL,
    pan_number TEXT NOT NULL,
    loan_type TEXT NOT NULL,
    loan_amount_inr REAL NOT NULL,
    annual_interest_rate_pct REAL NOT NULL,
    original_tenure_months INTEGER NOT NULL,
    loan_start_date TEXT NOT NULL,
    emi_inr REAL NOT NULL,
    min_emi_allowed_inr REAL DEFAULT 500,
    max_emi_allowed_inr REAL DEFAULT 100000,
    remaining_loan_amount_inr REAL NOT NULL,
    remaining_tenure_months INTEGER NOT NULL,
    remaining_tenure_years REAL,
    maturity_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    snapshot_date TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (applicant_id) REFERENCES applicants(applicant_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS loan_applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    application_id TEXT UNIQUE NOT NULL,
    applicant_id TEXT NOT NULL,
    loan_type TEXT NOT NULL,
    requested_amount REAL NOT NULL,
    desired_tenure_months INTEGER NOT NULL,
    category_details_json TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (applicant_id) REFERENCES applicants(applicant_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS loan_recommendations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    application_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    is_eligible INTEGER NOT NULL,
    eligibility_reasons_json TEXT,
    predicted_approval_probability REAL,
    estimated_emi REAL,
    model_version TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (application_id) REFERENCES loan_applications(application_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES loan_products(product_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_applicants_pan ON applicants(pan_number);
CREATE INDEX IF NOT EXISTS idx_applicants_applicant_id ON applicants(applicant_id);
CREATE INDEX IF NOT EXISTS idx_loans_applicant_id ON existing_loans(applicant_id);
CREATE INDEX IF NOT EXISTS idx_loans_status ON existing_loans(status);
CREATE INDEX IF NOT EXISTS idx_products_type ON loan_products(loan_type);
CREATE INDEX IF NOT EXISTS idx_recs_app ON loan_recommendations(application_id);
"""


def init_db(version: str = "v1"):
    conn = get_db_connection(version)
    with conn:
        conn.executescript(SCHEMA_SQL)
    conn.close()
