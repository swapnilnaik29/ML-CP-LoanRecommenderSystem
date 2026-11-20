# LoanIQ — System Architecture Documentation

## 1. System Overview

**LoanIQ** is an AI-powered personal credit recommendation, loan discovery, multi-product comparison, and repayment optimisation platform. It combines deterministic hard-eligibility rule gating with category-specific calibrated scikit-learn machine learning pipelines and mathematical reducing-balance amortisation simulators.

```
                    ┌───────────────────────────────────────────┐
                    │          LoanIQ React Frontend            │
                    │   (Vite + React 19 + TypeScript + TW)     │
                    │      Paytm-Inspired Blue/Cyan Theme       │
                    └─────────────────────┬─────────────────────┘
                                          │
                                   HTTP / REST JSON
                                (Proxy: /api -> :5000)
                                          │
                                          ▼
                    ┌───────────────────────────────────────────┐
                    │           Flask Application Core          │
                    │   (Auth, Applicant, Loans, Optimizer,     │
                    │         Recommendation Endpoints)         │
                    └───────┬───────────────────────────┬───────┘
                            │                           │
                            ▼                           ▼
        ┌───────────────────────────────┐   ┌───────────────────────────┐
        │       SQLite Database         │   │   ML Model Inference      │
        │      (instance/loaniq.db)     │   │   (ml/model_service.py)   │
        │ - applicants                  │   │ - Car: Calibrated RF      │
        │ - loan_products (16 seeded)   │   │ - Home: Calibrated Model  │
        │ - existing_loans (131 seeded) │   │ - Education: HistGradBoost│
        │ - loan_applications           │   │ - Personal: Calibrated RF │
        │ - loan_recommendations        │   │ - Pickle _loss compat     │
        └───────────────────────────────┘   └───────────────────────────┘
```

## 2. Layered Component Architecture

### 2.1 Presentation Layer (`karzbazaar-main/` & `frontend/`)
- **Technology Stack**: React 19, TypeScript, Vite 7, Tailwind CSS, Lucide React icons.
- **Visual Identity**: Paytm-inspired fintech UI (`#002E6E` primary navy, `#00BAF2` cyan accents, `#F8FAFC` clean white/slate surfaces).
- **Core User Journeys**:
  - `Login.tsx`: Multi-identifier sign in (PAN / Applicant ID / Email) + interactive Quick Demo Switcher with synthetic applicants.
  - `Signup.tsx`: Full applicant registration flow capturing 12+ profile fields with PAN validation.
  - `Home.tsx`: Dynamic dashboard showing applicant summary, active loans, debt ratio, and service entry points.
  - `LoanForm.tsx`: Category-specific discovery form (Car, Home, Education, Personal) prefilling profile fields from SQLite.
  - `Recommendations.tsx`: Ranked eligible products by ML approval probability and audit view for failed hard rules.
  - `Compare.tsx`: Multi-attribute side-by-side comparison matrix with consistent assumptions.
  - `ActiveLoan.tsx`: Dedicated Loan Optimiser with interactive reducing-balance EMI slider, interest savings calculations, and manual "Add Existing Loan" modal.
  - `Profile.tsx`: Complete profile view with inline edit and SQLite persistence.
  - `EMICalculator.tsx`: General reducing-balance loan calculator.
  - `Chatbot.tsx`: LoanIQ intelligent financial assistant.

### 2.2 Backend Service Layer (`backend/app/`)
- **Technology Stack**: Python 3.11, Flask 3.1, Flask-CORS.
- **Service Modules**:
  - `applicant_service.py`: Registration, authentication (salted SHA-256), profile updates, duplicate PAN rejection.
  - `existing_loan_service.py`: Loan management, manual loan addition, and aggregate debt/EMI reconciliation.
  - `eligibility_service.py`: Evaluates the 5 deterministic hard eligibility rules from `loan_products_config.json`.
  - `recommendation_service.py`: Orchestrates discovery, hard rule evaluation, ML inference, ranking, and audit logging.
  - `optimizer_service.py`: Hand-calculated month-by-month reducing-balance amortisation simulator and baseline comparison.

### 2.3 Machine Learning Inference Engine (`ml/`)
- **Artifacts**: 4 category-specific calibrated pipelines loaded once into memory cache:
  - `car_loan_approval_model.joblib`: Random Forest Classifier with sigmoid calibration.
  - `home_loan_approval_model.joblib`: Calibrated Classifier CV.
  - `education_loan_approval_model.joblib`: Hist Gradient Boosting Classifier with sigmoid calibration.
  - `personal_loan_approval_model.joblib`: Random Forest Classifier with sigmoid calibration.
- **Runtime Compatibility**: Dynamic `sys.modules['_loss'] = sklearn._loss.loss` patch resolving scikit-learn unpickling differences.
- **Feature Sanitization**: Automatic mapping and normalization of categorical variables to ensure exact matches with training distributions.

### 2.4 Persistence Layer (`instance/loaniq.db`)
- Normalized SQLite database with foreign keys, indexes, and transactional idempotency.
- Seeding scripts (`scripts/seed_products.py`, `scripts/import_csv_data.py`) reconcile aggregate debt against individual loan records.

## 3. Security & Academic Disclaimers
- Passwords stored as salted SHA-256 hashes; PAN is never used as an authentication secret.
- SQL operations use parameterized queries preventing SQL injection.
- Approval probabilities are statistical estimates from models trained on synthetic benchmark data for academic coursework experimentation and do not represent real-world credit decisions.
