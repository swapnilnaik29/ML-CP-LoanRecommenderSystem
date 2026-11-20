# LoanIQ 2.0 — AI-Powered Credit Recommendation & Repayment Optimisation Platform

**LoanIQ 2.0** is an intelligent loan recommendation, multi-product comparison, and reducing-balance repayment optimisation platform. It is powered by retrained 8-algorithm benchmark machine learning models (CatBoost CPU and Logistic Regression pipelines) trained on clean, zero-PII feature schemas, with deterministic hard-eligibility gating and accurate reducing-balance financial mathematics.

The application features a modern Fintech visual direction (Paytm navy `#002E6E`, vibrant cyan `#00BAF2`, and clean white surfaces) built with pure HTML5, CSS3, and ES6 JavaScript with zero frontend build dependencies.

---

## 🌿 Git Branches

- **`v1`**: Holds the original Version 1 platform (calibrated Random Forest and HistGradientBoosting ensembles, `loaniq_v1.db` with `USR0001`–`USR0100`).
- **`v2` / `main`**: Holds the updated Version 2 platform (retrained CatBoost and Logistic Regression benchmark models, `loaniq_v2.db` with `APP0001`–`APP0100`, updated feature discovery forms, and Render deployment configuration).

---

## 🚀 Key Platform Capabilities

1. **Retrained Benchmark Machine Learning Engine**:
   - Evaluated across 8 competing algorithms using 5-fold Stratified K-Fold CV.
   - Zero-PII compliance: applicant PAN and identifiers are strictly excluded from estimators.
   - Dedicated estimators per loan category:
     - **Car Loan**: CatBoost Classifier (CPU fallback) — **ROC-AUC: 0.916**, PR-AUC: 0.932
     - **Home Loan**: CatBoost Classifier (CPU fallback) — **ROC-AUC: 0.941**, PR-AUC: 0.958
     - **Education Loan**: Logistic Regression Pipeline — **ROC-AUC: 0.963**, PR-AUC: 0.973
     - **Personal Loan**: Logistic Regression Pipeline — **ROC-AUC: 0.964**, PR-AUC: 0.975

2. **Personalised Loan Discovery & ML Probability Ranking**:
   - Supports 4 categories: **Car Loan**, **Home Loan**, **Education Loan**, and **Personal Loan**.
   - Evaluates **5 deterministic hard eligibility rules** (`min_loan_amount`, `max_loan_amount`, `min_credit_score`, `min_age`, `max_age`) prior to ML inference.
   - Forms collect exact category-specific features:
     - **Car**: Vehicle price, down payment, condition (New/Used), type (Sedan/Hatchback/SUV/Two-wheeler).
     - **Home**: Property value, down payment, property type (Apartment/House/Under construction), city tier (Tier 1/2/3).
     - **Education**: Course cost, level (Undergraduate/Postgraduate/Doctoral), destination (India/Abroad), collateral (Yes/No).
     - **Personal**: Loan purpose (Home improvement/Debt consolidation/Medical/Wedding/Travel/Other), co-applicant (Yes/No).
   - Ranks qualified products descending by approval percentage, with a 5-gate audit view explaining why products passed or failed.

3. **Loan Repayment Optimiser (Amortisation Simulator)**:
   - Evaluates active applicant loans from SQLite.
   - Interactive EMI slider with dynamic bounds strictly derived from the active loan's `min_emi_allowed_inr` and `max_emi_allowed_inr`.
   - Precise reducing-balance monthly amortisation: monthly interest rate $r = \text{nominal annual rate} / 12 / 100$.
   - Live validation prevents setting EMI at or below monthly accrued interest ($r \times P$).
   - Calculates exact interest saved in rupees and tenure months reduced compared to baseline loan terms.

4. **Multi-Product Side-by-Side Comparison Matrix**:
   - Compare up to 4 eligible products on interest rate, monthly EMI, total interest, total repayment, tenure range, and ML approval probability.

5. **Multi-Demo Applicant Sign-In & Live Switcher**:
   - Instant 1-click login with pre-seeded benchmark applicants:
     - `APP0001` — Prime Salaried (CIBIL 766)
     - `APP0009` — Super-Prime (CIBIL 801)
     - `APP0004` — High Income (₹80k • 2 Active Loans • CIBIL 693)
     - `APP0003` — Business Profile (CIBIL 688)
     - `APP0008` — Student Profile (CIBIL 666)
     - `APP0007` — Young Self-Employed (Age 24 • CIBIL 672)
   - Live dropdown switchers on the Landing page, Login page, Dashboard header, and Top Navigation user menu.

---

## ⚡ Local Setup & Execution

### 1-Click Windows Launchers
- **Start Everything**: Double-click [`run_loaniq.bat`](file:///E:/College/SEM%205/ML/ML%20CP%20Final/run_loaniq.bat)  
  *Verifies Python, auto-seeds SQLite database if missing, starts the Flask API backend (port 5000), starts the frontend server (port 5173), and opens `http://localhost:5173` in your default browser.*
- **Stop Everything**: Double-click [`stop_loaniq.bat`](file:///E:/College/SEM%205/ML/ML%20CP%20Final/stop_loaniq.bat)  
  *Cleanly shuts down all processes running on ports 5000 and 5173.*

### Manual Command-Line Startup
```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Seed database
python scripts/seed_v2.py

# 3. Start Flask API server (serves both API and frontend)
python backend/run.py
```
Open your browser at `http://localhost:5000` (or `http://localhost:5173`).

---

## 🧪 Automated Testing

Run the test suites:
```bash
python -m unittest backend.tests.test_v2_integration backend.tests.test_backend
```

---

## 🌐 Deploying LoanIQ to Render (Step-by-Step Guide)

You can deploy LoanIQ to **Render** as a single, unified Web Service on the Free Tier:

### Step 1: Sign up & Connect GitHub
1. Go to [https://render.com](https://render.com) and create an account (or sign in with GitHub).
2. Click **New +** → **Web Service**.
3. Select your repository: `swapnilnaik29/ML-CP-LoanRecommenderSystem`.
4. Choose the **`main`** (or **`v2`**) branch.

### Step 2: Configure the Web Service
Fill in the following settings in the Render dashboard:
- **Name**: `loaniq` (or any custom name)
- **Region**: Oregon (US West) or Frankfurt (EU) (whichever is closest)
- **Runtime**: `Python 3`
- **Build Command**:
  ```bash
  pip install -r requirements.txt && python scripts/seed_v2.py
  ```
- **Start Command**:
  ```bash
  gunicorn "backend.app:create_app()" --bind 0.0.0.0:$PORT --workers 2 --timeout 120
  ```
- **Instance Type**: `Free`

### Step 3: Add Environment Variables
Under **Environment Variables**, add:
- `PYTHON_VERSION`: `3.11.9`
- `FLASK_ENV`: `production`

### Step 4: Click "Create Web Service"
- Render will pull your repository, install packages from `requirements.txt`, initialize the SQLite database via `python scripts/seed_v2.py`, and launch the Gunicorn WSGI server.
- Once deployment finishes (typically 2–3 minutes), your live URL will be ready:  
  `https://loaniq.onrender.com` (or your chosen service name).
- The web app will load both the frontend and the REST API from this single URL with zero CORS configuration required.

---

## 🛠️ Project Structure

```text
LoanIQ/
├── requirements.txt                       # Production pip dependencies
├── Procfile                               # Render/Heroku process configuration
├── render.yaml                            # Render Infrastructure-as-Code blueprint
├── run_loaniq.bat                          # One-click Windows startup script
├── stop_loaniq.bat                         # One-click Windows shutdown script
├── README.md                              # Complete system documentation
├── instance/
│   └── loaniq_v2.db                       # SQLite DB (100 applicants APP0001-100, 16 products)
├── backend/
│   ├── run.py                             # Local Flask API runner
│   ├── app/
│   │   ├── __init__.py                    # Flask app factory (serves REST API and static frontend)
│   │   ├── database.py                    # SQLite connection & schema management
│   │   ├── routes/                        # REST API routes (auth, applicant, loans, products, optimizer, recommendations)
│   │   └── services/                      # Business logic (eligibility, repayment optimizer, recommendations)
│   └── tests/
│       ├── test_v2_integration.py         # V2 pipeline, schema & inference tests
│       └── test_backend.py                # Core backend tests
├── ml/
│   └── model_service.py                   # ML service + CatBoost unpickling adapter
├── LoanIQ_retrained_ml_package/           # Retrained V2 artifacts & reports
│   ├── models/                            # Retrained pipelines (CatBoost CPU, Logistic Regression)
│   ├── reports/                           # Feature schemas, benchmark metrics & calibration plots
│   └── data/                              # Benchmark product configs and user datasets
├── frontend/                              # Pure HTML5 / CSS3 / ES6 JavaScript UI
│   ├── index.html                         # Single-page interface with V2 discovery forms
│   ├── css/style.css                      # Modern Fintech styling & responsive layout
│   └── js/
│       ├── api.js                         # Production-aware API client
│       └── app.js                         # Application state controller & router
└── scripts/
    └── seed_v2.py                         # Idempotent SQLite database seeding script
```

---

## 📜 Academic Disclaimer

LoanIQ is an academic coursework implementation. All applicant profiles, PAN identifiers (e.g., `ZZZPxxxxA`), loan accounts, and model outputs use synthetic benchmark data. Predicted approval probabilities are statistical estimates and do not constitute real-world credit decisions, lender endorsements, or financial advice.
