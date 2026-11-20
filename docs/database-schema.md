# LoanIQ — SQLite Database Schema Documentation

The LoanIQ platform uses SQLite 3 for relational persistence. The database is located at `instance/loaniq.db`. Foreign key constraints are enforced (`PRAGMA foreign_keys = ON;`).

---

## 1. Table Definitions

### 1.1 `applicants`
Stores master applicant information and credit profile attributes.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Internal record surrogate ID |
| `applicant_id` | TEXT | UNIQUE NOT NULL | User identifier (e.g. `USR0001`) |
| `pan_number` | TEXT | UNIQUE NOT NULL | Synthetic PAN lookup identifier (e.g. `ZZZP0001A`) |
| `full_name` | TEXT | NOT NULL | Full legal name of applicant |
| `age` | INTEGER | NOT NULL | Applicant age (18 - 100) |
| `monthly_income_inr` | REAL | NOT NULL | Gross monthly income in INR |
| `employment_type` | TEXT | NOT NULL | `salaried`, `self_employed`, `business`, `student` |
| `employment_experience_years` | INTEGER | NOT NULL | Total years of employment experience |
| `credit_score` | INTEGER | NOT NULL | CIBIL/Credit score (300 - 900) |
| `existing_emi_inr` | REAL | NOT NULL DEFAULT 0 | Reconciled total monthly EMI from active loans |
| `existing_active_loans` | INTEGER | NOT NULL DEFAULT 0 | Reconciled count of active loan accounts |
| `monthly_household_expenses_inr`| REAL | NOT NULL | Estimated monthly household expenditures |
| `average_bank_balance_inr` | REAL | NOT NULL | Average end-of-month bank balance |
| `dependents` | INTEGER | NOT NULL DEFAULT 0 | Number of financial dependents |
| `email` | TEXT | NULLABLE | Contact email |
| `password_hash` | TEXT | NOT NULL | Salted SHA-256 password hash |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Registration timestamp |
| `updated_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Last profile modification timestamp |

---

### 1.2 `loan_products`
Contains the 16 configured loan products seeded from `loan_products_config.json`.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Internal surrogate ID |
| `product_id` | TEXT | UNIQUE NOT NULL | Product code (e.g. `CAR01`, `HOME02`, `EDU01`) |
| `loan_type` | TEXT | NOT NULL | Category: `car`, `home`, `education`, `personal` |
| `product_name` | TEXT | NOT NULL | Product title (e.g. `Standard Car Loan`) |
| `min_loan_amount` | REAL | NOT NULL | Minimum borrowing limit in INR |
| `max_loan_amount` | REAL | NOT NULL | Maximum borrowing limit in INR |
| `min_credit_score` | INTEGER | NOT NULL | Minimum credit score threshold for hard rule |
| `min_age` | INTEGER | NOT NULL | Minimum eligible age for hard rule |
| `max_age` | INTEGER | NOT NULL | Maximum eligible age for hard rule |
| `interest_rate_min`| REAL | NOT NULL | Minimum annual interest rate (%) |
| `interest_rate_max`| REAL | NOT NULL | Maximum annual interest rate (%) |
| `min_tenure_months`| INTEGER | NOT NULL | Minimum supported tenure in months |
| `max_tenure_months`| INTEGER | NOT NULL | Maximum supported tenure in months |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Seeding timestamp |

---

### 1.3 `existing_loans`
Tracks applicant active and closed loans. Reconciled against applicant aggregate debt.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Internal surrogate ID |
| `loan_account_id` | TEXT | UNIQUE NOT NULL | Account identifier (e.g. `LN000101`) |
| `applicant_id` | TEXT | NOT NULL | Foreign key -> `applicants(applicant_id)` |
| `pan_number` | TEXT | NOT NULL | Applicant PAN identifier |
| `loan_type` | TEXT | NOT NULL | Category (`Car`, `Home`, `Education`, `Personal`) |
| `loan_amount_inr` | REAL | NOT NULL | Original sanctioned principal amount |
| `annual_interest_rate_pct` | REAL | NOT NULL | Contractual annual nominal interest rate (%) |
| `original_tenure_months` | INTEGER | NOT NULL | Initial agreed tenure in months |
| `loan_start_date` | TEXT | NOT NULL | Disbursal date (`YYYY-MM-DD`) |
| `emi_inr` | REAL | NOT NULL | Current monthly installment in INR |
| `min_emi_allowed_inr` | REAL | DEFAULT 500 | Lower simulation slider bound |
| `max_emi_allowed_inr` | REAL | DEFAULT 100000 | Upper simulation slider bound |
| `remaining_loan_amount_inr` | REAL | NOT NULL | Current outstanding balance |
| `remaining_tenure_months` | INTEGER | NOT NULL | Estimated remaining repayment months |
| `remaining_tenure_years` | REAL | NULLABLE | Remaining tenure in years |
| `maturity_date` | TEXT | NOT NULL | Estimated maturity/payoff date |
| `status` | TEXT | NOT NULL DEFAULT 'active' | `active` or `closed` |
| `snapshot_date` | TEXT | NULLABLE | Balance assessment date |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Record creation timestamp |

---

### 1.4 `loan_applications`
Audit record of submitted loan discovery requests.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Internal surrogate ID |
| `application_id` | TEXT | UNIQUE NOT NULL | Unique code (e.g. `APP_CAR_A1B2C3D4`) |
| `applicant_id` | TEXT | NOT NULL | Foreign key -> `applicants(applicant_id)` |
| `loan_type` | TEXT | NOT NULL | `car`, `home`, `education`, `personal` |
| `requested_amount` | REAL | NOT NULL | User requested loan principal |
| `desired_tenure_months`| INTEGER | NOT NULL | User requested tenure in months |
| `category_details_json`| TEXT | NOT NULL | JSON string of category-specific features |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Submission timestamp |

---

### 1.5 `loan_recommendations`
Logs generated recommendation results per product evaluated during discovery.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Internal surrogate ID |
| `application_id` | TEXT | NOT NULL | Foreign key -> `loan_applications(application_id)` |
| `product_id` | TEXT | NOT NULL | Foreign key -> `loan_products(product_id)` |
| `is_eligible` | INTEGER | NOT NULL | 1 if all 5 hard rules passed, 0 otherwise |
| `eligibility_reasons_json`| TEXT | NULLABLE | Detailed breakdown of passed/failed rules |
| `predicted_approval_probability`| REAL | NULLABLE | Positive class ML probability (0.0 to 1.0) |
| `estimated_emi` | REAL | NULLABLE | Calculated monthly installment |
| `model_version` | TEXT | NULLABLE | Identifier of ML pipeline artifact used |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Generation timestamp |

---

## 2. Indexes

- `idx_applicants_pan`: Index on `applicants(pan_number)` for fast identity lookup.
- `idx_applicants_applicant_id`: Index on `applicants(applicant_id)`.
- `idx_loans_applicant_id`: Index on `existing_loans(applicant_id)` for quick portfolio queries.
- `idx_loans_status`: Index on `existing_loans(status)` for filtering active debt.
- `idx_products_type`: Index on `loan_products(loan_type)` for category filtering.
- `idx_recs_app`: Index on `loan_recommendations(application_id)` for application audits.
