# LoanIQ — AI-Powered Credit Recommendation & Repayment Optimisation Platform

**LoanIQ** is a college-project loan recommendation, multi-product comparison, and repayment optimisation platform. It combines deterministic hard-eligibility gating, calibrated machine-learning approval probability estimation across four loan categories, and reducing-balance amortisation simulators.

The application features a Paytm-inspired visual direction (Paytm navy `#002E6E`, vibrant cyan `#00BAF2`, and clean white surfaces) with responsive layouts for desktop, tablet, and mobile.

---

## 🚀 Key Capabilities

1. **New Applicant Registration & Profile Management**:
   - Captures comprehensive financial credentials: Full Name, PAN lookup identifier, Age, Monthly Income, Employment Type, Experience Years, Credit Score, Existing EMI, Number of Active Loans, Monthly Household Expenses, Bank Balance, and Dependents.
   - Enforces format validation, numeric bounds, and duplicate PAN rejection.
   - Persists records in SQLite and supports in-place profile updates.

2. **Personalised Loan Discovery & ML Probability Ranking**:
   - Supports 4 categories: **Car Loan**, **Home Loan**, **Education Loan**, and **Personal Loan**.
   - Dedicated forms prefill profile attributes from the database and collect category-specific model features (e.g., vehicle condition and price, property location and co-applicant income, institution tier and course cost, loan purpose).
   - Evaluates **5 hard eligibility rules** (`min_loan_amount`, `max_loan_amount`, `min_credit_score`, `min_age`, `max_age`) before model inference.
   - For eligible products, invokes category-specific calibrated scikit-learn models to estimate lender approval probability (`loan_approved = 1`).
   - Ranks eligible products descending by approval probability and provides an audit view detailing why an applicant qualified or failed.

3. **Loan Repayment Optimiser (Reducing-Balance Amortisation Simulator)**:
   - Displays all applicant-owned active loans from SQLite.
   - Interactive EMI slider recalculates remaining tenure, total remaining interest payable, and payoff maturity date.
   - Uses standard reducing-balance monthly amortisation: monthly rate $r = \text{nominal annual rate} / 12 / 100$.
   - Live validation prevents setting EMI at or below monthly accrued interest ($r \times P$).
   - Computes exact interest saved and tenure months saved compared to the baseline scenario without modifying ground-truth loan records.
   - **Add Existing Loan Modal**: Allows manually entering new active loans; automatically recalculates applicant aggregate EMI and active loan count in SQLite.

4. **Multi-Product Side-by-Side Comparison Matrix**:
   - Compares eligible products across interest rate, monthly EMI, total interest, total repayment, tenure range, and ML approval probability.
   - Ensures consistent principal and tenure assumptions.

5. **Quick Demo Switcher**:
   - Login page includes a one-click dropdown pre-loaded with synthetic applicants (e.g., `USR0001` Harsh Bansal, `USR0002` Aarohi Deshmukh) for instant evaluation.

## ⚡ One-Click Windows Launchers

- **Start Everything**: Double-click [`run_loaniq.bat`](file:///E:/College/SEM%205/ML/ML%20CP%20Final/run_loaniq.bat)  
  *Automatically checks Python, verifies/seeds the SQLite database if missing, starts the Flask API server (port 5000), starts the Vite frontend (port 5173), and opens the web app in your default browser at `http://localhost:5173`.*

- **Stop Everything**: Double-click [`stop_loaniq.bat`](file:///E:/College/SEM%205/ML/ML%20CP%20Final/stop_loaniq.bat)  
  *Cleanly shuts down running processes on ports 5000 and 5173.*

---

## 🛠️ Project Structure

```text
LoanIQ/
├── README.md                          # Setup, execution, and architecture guide
├── .env.example                       # Environment configuration template
├── prompt.md                          # Primary project specification
├── data/
│   ├── raw/                           # Source CSV datasets
│   │   ├── loan_applicant_users_100.csv
│   │   ├── existing_loans_100_users.csv
│   │   ├── car_loans.csv
│   │   ├── home_loans.csv
│   │   ├── education_loans.csv
│   │   └── personal_loans.csv
│   └── config/
│       └── loan_products_config.json  # 16 configured loan products and eligibility rules
├── ml/
│   ├── artifacts/                     # Trained .joblib model artifacts
│   │   ├── car_loan_approval_model.joblib
│   │   ├── home_loan_approval_model.joblib
│   │   ├── education_loan_approval_model.joblib
│   │   └── personal_loan_approval_model.joblib
│   ├── notebooks/                     # Training notebooks
│   ├── schemas/                       # Feature definitions and categorical domains
│   └── model_service.py               # Singleton ML inference service & unpickle patch
├── backend/
│   ├── app/
│   │   ├── database.py                # SQLite connection, schema, and indexes
│   │   ├── services/                  # Business logic (applicant, product, loans, rules, optimizer)
│   │   └── routes/                    # REST API endpoints (/api/auth, /api/loans, /api/recommendations)
│   ├── tests/
│   │   └── test_backend.py            # Automated unit and integration test suite
│   └── run.py                         # Backend API server runner (Port 5000)
├── frontend/ (karzbazaar-main/)        # React 19 + TypeScript + Vite UI
│   ├── src/
│   │   ├── api.ts                     # Full TypeScript REST API client
│   │   ├── components/                # Reusable Navbar, Chatbot, Cards
│   │   └── pages/                     # Home, Login, Signup, LoanForm, Recommendations, Compare, ActiveLoan, Profile
│   └── vite.config.ts                 # Proxy configuration forwarding /api -> :5000
├── scripts/
│   ├── init_db.py                     # Initializes SQLite schema at instance/loaniq.db
│   ├── seed_products.py               # Seeds 16 products from loan_products_config.json
│   └── import_csv_data.py             # Imports synthetic applicants and existing loans with reconciliation
├── instance/
│   └── loaniq.db                      # Persistent SQLite database
└── docs/
    ├── architecture.md                # System design and data flow specification
    └── database-schema.md             # Detailed database schema and entity relationships
```

---

## ⚙️ Installation & Setup

### 1. Prerequisites
- Python 3.10+ (tested on Python 3.11)
- Node.js 18+ and npm

### 2. Backend Dependencies
Install the required Python packages:
```bash
pip install flask flask-cors scikit-learn joblib pandas numpy
```

### 3. Frontend Dependencies
Navigate to the frontend directory (`karzbazaar-main` or `frontend`) and install node packages:
```bash
cd karzbazaar-main
npm install
```

### 4. Database Initialisation & Seeding
Run the idempotent database setup scripts from the project root:
```bash
# 1. Create SQLite tables and indexes
python scripts/init_db.py

# 2. Seed the 16 loan products from configuration
python scripts/seed_products.py

# 3. Import 100 synthetic applicants and 131 existing loans with aggregate reconciliation
python scripts/import_csv_data.py
```

---

## 🏃 Execution Instructions

### Running the Backend API Server
From the project root:
```bash
python backend/run.py
```
*The Flask REST API will start at `http://127.0.0.1:5000`.*

### Running the Frontend Dev Server
In a separate terminal, navigate to the frontend directory:
```bash
cd karzbazaar-main
npm run dev
```
*The Vite development server will start at `http://localhost:5173`.*

Open your browser at `http://localhost:5173`. Requests to `/api/*` are automatically proxied to the Flask server at `http://127.0.0.1:5000`.

---

## 🧪 Automated Testing

LoanIQ includes a test suite covering the database layer, registration, authentication, aggregate debt reconciliation, hard eligibility gates, ML model inference for all 4 categories, and amortisation mathematics.

To execute the test suite:
```bash
python backend/tests/test_backend.py
```

### Test Coverage Highlights:
- `test_01_health_endpoint`: Verifies `/api/health` status.
- `test_02_database_seeded_data`: Verifies 16 seeded products, 100 applicants, and 131 loans.
- `test_03_registration_and_duplicate_pan`: Validates new applicant registration and asserts rejection on duplicate PAN.
- `test_04_authentication`: Tests credential verification and synthetic user lookup.
- `test_05_add_existing_loan_and_reconcile_aggregate`: Validates loan creation and verifies that applicant `existing_active_loans` and `existing_emi_inr` update in SQLite.
- `test_06_hard_eligibility_rules`: Tests deterministic rule gating on credit score, age, and loan amount limits.
- `test_07_optimizer_amortisation_math`: Confirms that EMI $\le$ accrued monthly interest raises a validation error, and validates repayment maths.
- `test_08_repayment_simulation_with_baseline`: Verifies interest savings and tenure reduction against baseline loan conditions.
- `test_09_all_four_ml_discovery_flows`: Runs end-to-end discovery across Car, Home, Education, and Personal models.

---

## 🔬 Machine Learning Model Details

| Category | Model Architecture | Key Features Evaluated | Test Metric |
| :--- | :--- | :--- | :--- |
| **Car Loan** | Random Forest (Tuned) + Sigmoid Calibration | Vehicle price, condition, age, fuel type, tenure, applicant income & credit metrics | ROC-AUC: 0.923 |
| **Home Loan** | CalibratedClassifierCV | Property value, property type, location, status, co-applicant income, tenure | ROC-AUC: 0.918 |
| **Education Loan** | Hist Gradient Boosting + Sigmoid Calibration | Course level, field, tier, location, cost, scholarship, co-applicant income | ROC-AUC: 0.975 |
| **Personal Loan** | Random Forest (Tuned) + Sigmoid Calibration | Loan purpose, marital status, requested amount, tenure, debt obligations | ROC-AUC: 0.841 |

*Note: All probability outputs indicate estimated **lender approval probability** (`loan_approved = 1`), not borrower acceptance odds.*

---

## 📜 Academic Disclaimer

LoanIQ is an academic coursework project developed for demonstration purposes. All applicant profiles, PAN identifiers (e.g., `ZZZPxxxxA`), loan accounts, and model metrics are synthetic benchmark data. Predicted approval probabilities are statistical estimates and do not constitute real-world credit decisions, lender endorsements, or financial advice.
