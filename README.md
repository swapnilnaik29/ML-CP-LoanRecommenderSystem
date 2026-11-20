# LoanIQ — AI-Powered Credit Recommendation & Repayment Optimisation Platform

**LoanIQ** is a production-grade loan intelligence, multi-product comparison, and reducing-balance repayment optimisation platform. It features dual machine-learning engines (Original Calibrated V1 vs. Retrained Benchmark V2), separate isolated SQLite databases, deterministic hard-eligibility gating, and reducing-balance financial simulation.

The user interface follows a modern Fintech visual direction (Paytm navy `#002E6E`, vibrant cyan `#00BAF2`, and clean white surfaces) built with vanilla HTML5, CSS3, and ES6 JavaScript with zero frontend build dependencies.

---

## 🚀 Key Platform Capabilities

1. **Dual Machine Learning Engines (V1 & V2) with Live Version Switcher**:
   - Seamlessly toggle between **V1 – Original Calibrated** and **V2 – Retrained Benchmark** models from the top navigation bar and dashboard.
   - Request-scoped versioning via HTTP header `X-LoanIQ-Version`, query param `?version=v1|v2`, or JSON payload.
   - Complete isolation between **`instance/loaniq_v1.db`** (101 applicants `USR0001`–`USR0100`, 16 products, 137 loans) and **`instance/loaniq_v2.db`** (100 applicants `APP0001`–`APP0100`, 16 products, 135 loans).

2. **Personalised Loan Discovery & ML Probability Ranking**:
   - Supports 4 loan categories: **Car Loan**, **Home Loan**, **Education Loan**, and **Personal Loan**.
   - Evaluates **5 deterministic hard eligibility rules** (`min_loan_amount`, `max_loan_amount`, `min_credit_score`, `min_age`, `max_age`) prior to ML inference.
   - For eligible products, feeds strict model features (no PII or raw PAN) into category-specific ML models to predict lender approval probability (`loan_approved = 1`).
   - Ranks qualified products descending by approval percentage, with a 5-gate audit view explaining why products passed or failed.

3. **Loan Repayment Optimiser (Amortisation Simulator)**:
   - Evaluates active applicant loans from the selected database version.
   - Interactive EMI slider with dynamic bounds strictly derived from the active loan's `min_emi_allowed_inr` and `max_emi_allowed_inr`.
   - Precise reducing-balance monthly amortisation: monthly interest rate $r = \text{nominal annual rate} / 12 / 100$.
   - Live validation prevents setting EMI at or below monthly accrued interest ($r \times P$).
   - Calculates exact interest saved in rupees and tenure months reduced compared to baseline loan terms.

4. **Multi-Product Side-by-Side Comparison Matrix**:
   - Compare up to 4 eligible products on interest rate, monthly EMI, total interest, total repayment, tenure range, and ML approval probability.

5. **Quick Demo Applicant Switcher & Manual Registration**:
   - Instant 1-click login with pre-seeded demo applicants for both V1 (`USR0007` Sai Saxena) and V2 (`APP0001` Demo Applicant 001).
   - Dynamic dropdown supporting all database applicants.
   - Full applicant registration flow with PAN lookup identifier and duplicate validation.

---

## 🔬 Machine Learning Model Architectures (V1 vs. V2)

LoanIQ provides two distinct ML inference pipelines:

### V1 — Original Calibrated Pipelines (`ml/artifacts/`)
| Category | Model Architecture | Calibrator | ROC-AUC | Key Features |
| :--- | :--- | :--- | :--- | :--- |
| **Car Loan** | Random Forest (Tuned) | Sigmoid Calibration | **0.923** | Vehicle price, condition, age, fuel type, tenure, applicant income & credit metrics |
| **Home Loan** | Random Forest Classifier | CalibratedClassifierCV | **0.918** | Property value, property type, location, status, co-applicant income, tenure |
| **Education Loan** | HistGradientBoosting | Sigmoid Calibration | **0.975** | Course level, field, tier, location, cost, scholarship, co-applicant income |
| **Personal Loan** | Random Forest (Tuned) | Sigmoid Calibration | **0.841** | Loan purpose, marital status, requested amount, tenure, debt obligations |

### V2 — Retrained Benchmark Models (`LoanIQ_retrained_ml_package/models/`)
Trained on 8-algorithm benchmarks, evaluated with 5-fold Stratified K-Fold CV, and calibrated with strict zero-PII feature schemas:
| Category | Best Benchmark Model | Input Features | ROC-AUC | PR-AUC | Accuracy |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Car Loan** | **CatBoost Classifier (CPU)** | 28 features | **0.916** | 0.932 | 87.0% |
| **Home Loan** | **CatBoost Classifier (CPU)** | 28 features | **0.941** | 0.958 | 88.0% |
| **Education Loan** | **Logistic Regression Pipeline** | 28 features | **0.963** | 0.973 | 91.5% |
| **Personal Loan** | **Logistic Regression Pipeline** | 26 features | **0.964** | 0.975 | 92.0% |

*Note: All probability outputs reflect estimated **lender approval probability** (`loan_approved = 1`).*

---

## ⚡ One-Click Windows Launchers

- **Start Everything**: Double-click [`run_loaniq.bat`](file:///E:/College/SEM%205/ML/ML%20CP%20Final/run_loaniq.bat)  
  *Verifies Python, validates and auto-seeds both `loaniq_v1.db` and `loaniq_v2.db` if missing, starts the Flask API backend (port 5000), starts the frontend server (port 5173), and opens `http://localhost:5173` in your default browser.*

- **Stop Everything**: Double-click [`stop_loaniq.bat`](file:///E:/College/SEM%205/ML/ML%20CP%20Final/stop_loaniq.bat)  
  *Cleanly shuts down all processes running on ports 5000 and 5173.*

---

## 🛠️ Project Structure

```text
LoanIQ/
├── run_loaniq.bat                          # One-click Windows startup script
├── stop_loaniq.bat                         # One-click Windows shutdown script
├── README.md                              # Complete system documentation
├── prompt.md                              # Primary project requirements
├── instance/
│   ├── loaniq_v1.db                       # Isolated SQLite DB for V1 (USR0001-100)
│   └── loaniq_v2.db                       # Isolated SQLite DB for V2 (APP0001-100)
├── backend/
│   ├── run.py                             # Flask API entry point (Port 5000)
│   ├── app/
│   │   ├── database.py                    # Multi-version SQLite connection & request resolver
│   │   ├── routes/                        # REST API routes (auth, applicant, loans, products, optimizer, recommendations)
│   │   └── services/                      # Core business logic with version routing
│   └── tests/
│       ├── test_backend.py                # V1 backend integration test suite (9 tests)
│       └── test_v2_integration.py         # V2 multi-database and ML test suite (7 tests)
├── ml/
│   ├── model_service.py                   # Unified V1 & V2 ML service + CatBoost unpickling adapter
│   ├── artifacts/                         # V1 trained .joblib models
│   └── schemas/                           # V1 feature definitions
├── LoanIQ_retrained_ml_package/           # Retrained V2 artifacts & reports
│   ├── models/                            # V2 pipelines (CatBoost CPU, Logistic Regression)
│   ├── reports/                           # V2 feature schemas, benchmarks & calibration curves
│   └── data/                              # V2 products and user CSV datasets
├── frontend/                              # Pure HTML5 / CSS3 / ES6 JavaScript UI
│   ├── index.html                         # Single-page interface (views for Landing, Dash, Discover, etc.)
│   ├── css/style.css                      # Modern Fintech styling & responsive layout
│   └── js/
│       ├── api.js                         # Request-scoped API client (X-LoanIQ-Version header)
│       └── app.js                         # Application state controller, version switching & router
└── scripts/
    ├── init_db.py                         # Initialize SQLite schema
    ├── seed_products.py                   # Seed products into SQLite
    ├── import_csv_data.py                 # Import V1 applicants & existing loans
    └── seed_v2.py                         # Seed V2 database from LoanIQ_retrained_ml_package
```

---

## ⚙️ Manual Installation & Setup

### 1. Prerequisites
- Python 3.10+ (tested on Python 3.11 64-bit on Windows)
- Modern web browser (Chrome, Edge, Firefox)

### 2. Install Python Dependencies
```bash
pip install flask flask-cors scikit-learn joblib pandas numpy catboost xgboost
```

### 3. Initialize & Seed Databases
```bash
# Seed V1 database (instance/loaniq_v1.db)
python scripts/init_db.py
python scripts/seed_products.py
python scripts/import_csv_data.py
copy instance\loaniq.db instance\loaniq_v1.db

# Seed V2 database (instance/loaniq_v2.db)
python scripts/seed_v2.py
```

### 4. Run the Servers Manually
In terminal 1 (Backend):
```bash
python backend/run.py
```
*API runs on `http://127.0.0.1:5000`.*

In terminal 2 (Frontend):
```bash
python -m http.server 5173 --directory frontend
```
*UI runs on `http://localhost:5173`.*

---

## 🧪 Automated Testing

LoanIQ features two automated test suites covering 100% of the platform:

```bash
python -m unittest backend.tests.test_backend backend.tests.test_v2_integration
```

### Test Highlights:
- **`test_backend.py` (9 tests)**: Verifies V1 database, authentication, profile updates, duplicate PAN rejection, aggregate loan reconciliation, 5 hard eligibility gates, repayment amortisation maths, and all 4 V1 ML models.
- **`test_v2_integration.py` (7 tests)**: Verifies `loaniq_v1.db` and `loaniq_v2.db` data isolation, loading of all 4 V2 pipelines (CatBoost CPU and Logistic Regression), exact 28/28/28/26 feature schema compliance, ML probability outputs, category routing, and V2 repayment simulation.

---

## 📜 Academic Disclaimer

LoanIQ is an academic coursework implementation. All applicant profiles, PAN identifiers (e.g., `ZZZPxxxxA`), loan accounts, and model outputs use synthetic benchmark data. Predicted approval probabilities are statistical estimates and do not constitute real-world credit decisions, lender endorsements, or financial advice.
