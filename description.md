# LoanIQ: Intelligent Credit Recommendation & Repayment Optimisation Platform
## Comprehensive Technical Specifications, Architecture & Multi-Version ML Documentation (V1 & V2)

---

## 1. Executive Project Overview

**LoanIQ** is an institutional-grade fintech decision platform designed to solve two core inefficiencies in modern retail lending:
1. **Opaque and Inefficient Loan Discovery**: Retail borrowers are frequently subjected to fragmented, opaque loan options without clear visibility into lender-specific underwriting criteria, interest rate ranges, or realistic approval odds.
2. **Suboptimal Debt Repayment Structuring**: Borrowers often default to standard amortisation terms without understanding the compound interest penalties of long tenures or the exponential interest savings achievable through modest monthly prepayment increments.

LoanIQ addresses these challenges through a dual-engine architecture:
- **Intelligent Multi-Category Loan Discovery**: Combines deterministic hard-eligibility gating (regulatory and institutional risk bounds) with category-specific machine learning pipelines that output well-calibrated approval probabilities across 16 real-world banking products.
- **Reducing-Balance Repayment Optimiser**: An interactive mathematical simulation engine built on reducing-balance amortisation physics, allowing borrowers to adjust their monthly EMI between safe lower boundaries (accrued interest threshold) and upper disposable income ceilings, instantly calculating tenure compression and total interest savings.

The platform is engineered across two distinct, isolated platform versions:
- **Version 1 (`v1`)**: The foundation architecture utilizing tuned, calibrated ensemble pipelines (`Random Forest`, `Hist Gradient Boosting`) trained on initial synthetic borrower distributions (`USR0001`–`USR0100`) and isolated in `loaniq_v1.db`.
- **Version 2 (`v2`)**: The retrained benchmark architecture evaluated against an 8-algorithm competitive suite (`CatBoost CPU`, `Logistic Regression`, `Random Forest`, `HistGradientBoosting`, `XGBoost`, `Decision Tree`, `MLP`, `Dummy`) on zero-PII schemas (`APP0001`–`APP0100`) and isolated in `loaniq_v2.db`.

---

## 2. System Architecture & Technical Specifications

### 2.1 End-to-End System Topology

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           LoanIQ Web Client (SPA)                           │
│     Pure HTML5 • CSS3 Modern Fintech Design System • Vanilla ES6 JavaScript  │
│        Zero Build Dependencies • Responsive Mobile & Desktop Layout         │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                         RESTful HTTP / JSON Requests
                    Headers: X-LoanIQ-Version: v1 | v2
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Flask Application Server (WSGI)                      │
│            Request-Scoped Version Resolver & Dual-Model Manager             │
├──────────────────────────────────────┬──────────────────────────────────────┤
│  Routing & Controller Layer          │  Business Logic & Amortisation Engine │
│  • /api/auth/login, /demo-users      │  • Reducing-Balance Math formulas    │
│  • /api/applicants/profile           │  • Dynamic EMI bounds computation     │
│  • /api/loans/discover, /compare     │  • Tenure reduction & interest saved │
│  • /api/loans/optimise               │  • 5 Deterministic Hard Gates Engine │
└──────────────────┬───────────────────┴───────────────────┬──────────────────┘
                   │                                       │
                   ▼                                       ▼
┌──────────────────────────────────────┐  ┌───────────────────────────────────┐
│     Machine Learning Inference Engine│  │     Data Persistence Layer        │
│  • Scikit-learn 1.4+ / CatBoost CPU  │  │  • Independent SQLite Databases   │
│  • Zero-PII Feature Alignment Matrix │  │    - loaniq_v1.db (USR0001-0100)  │
│  • 4 Category-Specific Pipelines     │  │    - loaniq_v2.db (APP0001-0100)  │
│  • predict_proba() Output Scoring    │  │  • SQLAlchemy 2.0 ORM Mappings    │
└──────────────────────────────────────┘  └───────────────────────────────────┘
```

### 2.2 Core Technical Specifications

| Component | Technical Specification | Rationale & Architectural Choice |
| :--- | :--- | :--- |
| **Backend Framework** | Python 3.11+, Flask 3.0.0, Werkzeug 3.0 | Lightweight, low-overhead microframework allowing sub-millisecond route dispatch and modular blueprint architecture. |
| **ORM / Data Access** | SQLAlchemy 2.0+, SQLite3 | Strict relational integrity with foreign keys, zero database daemon setup, and complete filesystem isolation between versions. |
| **ML Inference Engine**| Scikit-learn 1.4+, CatBoost 1.2+, Joblib | Serialized `.joblib` end-to-end pipelines combining feature imputers, standardizers, categorical encoders, and trained estimators. |
| **Frontend Framework**| Pure HTML5, Modern CSS3, Vanilla ES6 JavaScript | Zero Node.js/npm dependencies, instantaneous cold-start load times (<100ms), 100% portable on static hosting or CDN. |
| **Financial Math Engine** | Pure Python & ES6 reducing-balance amortisation | Exact banking formulas matching Reserve Bank of India (RBI) and global retail banking standards. |
| **Production WSGI** | Gunicorn 21.2+ with threaded worker model | Concurrent request handling suitable for Render, Railway, AWS ECS, or Docker containers. |

### 2.3 Strict Zero-PII Security Shield

In compliance with financial data privacy best practices, both V1 and V2 models operate under a **Strict Zero-PII Policy**:
- **Excluded Attributes**: Customer names, permanent account numbers (PAN), tax identifiers, contact numbers, email addresses, and system primary keys (`applicant_id`, `user_id`) are stripped *before* constructing model feature tensors.
- **Permitted Predictors**: Only verifiable credit risk indicators (CIBIL score, age, disposable income, existing EMIs, active loan count, average bank balance, employment experience, loan-to-value ratios) are ingested into the machine learning pipelines.

---

## 3. Version 1 (V1) Platform & Model Architecture

### 3.1 V1 System Overview & Data Foundation
- **Database**: `instance/loaniq_v1.db`
- **Customer Profiles**: 100 Synthetic Applicants (`USR0001` through `USR0100`).
- **Active Borrowing Records**: 135 Active Loan Accounts with initial schedules.
- **Product Configuration**: 16 Retail Banking Products (4 Car, 4 Home, 4 Education, 4 Personal) across public sector banks, private institutions, and non-banking financial companies (NBFCs).

### 3.2 V1 Preprocessing & Calibration Pipeline Architecture
In Version 1, models were constructed using scikit-learn `Pipeline` and `ColumnTransformer` objects:
- **Numerical Features**: Missing values imputed via `SimpleImputer(strategy='median')` followed by variance normalization with `StandardScaler()`.
- **Categorical Features**: Handled via `OneHotEncoder(handle_unknown='ignore', sparse_output=False)`.
- **Probability Calibration**: To convert arbitrary ensemble tree margins into true empirical probabilities, pipelines were wrapped in `CalibratedClassifierCV(method='sigmoid', cv=5)` or tuned with tight regularization to minimize Brier score loss.

### 3.3 V1 Model Performance Across All 4 Categories

The table below summarizes the evaluated test set metrics and cross-validation comparisons for the selected V1 models:

| Loan Category | Selected Model Architecture | Test Accuracy | Test Precision | Test Recall | Test F1-Score | Test ROC-AUC | Test PR-AUC | Test Brier Score |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Car Loan** | **Random Forest (Tuned)** | **86.50%** | 89.26% | 92.36% | **0.9078** | **0.9232** | 0.9693 | 0.1043 |
| **Home Loan** | **Random Forest (Tuned)** | **85.00%** | 90.77% | 86.76% | **0.8872** | **0.9267** | 0.9618 | 0.1017 |
| **Education Loan** | **Hist Gradient Boosting** | **93.00%** | 93.65% | 95.16% | **0.9440** | **0.9750** | 0.9815 | 0.0530 |
| **Personal Loan** | **Random Forest (Tuned)** | **74.50%** | 75.21% | 80.00% | **0.7753** | **0.8408** | 0.8598 | 0.1616 |

#### Cross-Validation Benchmark Suite (V1 5-Fold Stratified CV)

| Category | Model Evaluated | CV Mean ROC-AUC | CV Std ROC-AUC | CV Mean PR-AUC | CV Mean F1 | Status |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| **Car** | **Random Forest (Tuned)** | **0.8784** | 0.0152 | 0.9436 | 0.8782 | **Selected Model** |
| Car | Hist Gradient Boosting | 0.8810 | 0.0161 | 0.9459 | 0.8820 | Competing Benchmark |
| Car | Logistic Regression | 0.8769 | 0.0204 | 0.9460 | 0.8462 | Baseline Linear |
| Car | Extra Trees | 0.8614 | 0.0346 | 0.9382 | 0.8698 | Tree Ensemble |
| Car | Dummy Baseline | 0.5000 | 0.0000 | 0.7200 | 0.8372 | Null Classifier |
| **Home** | **Random Forest (Tuned)** | **0.9092** | 0.0094 | 0.9509 | 0.8903 | **Selected Model** |
| Home | Hist Gradient Boosting | 0.9185 | 0.0118 | 0.9560 | 0.8957 | Competing Benchmark |
| Home | Logistic Regression | 0.9150 | 0.0227 | 0.9563 | 0.8759 | Baseline Linear |
| Home | Extra Trees | 0.8955 | 0.0118 | 0.9402 | 0.8700 | Tree Ensemble |
| Home | Dummy Baseline | 0.5000 | 0.0000 | 0.6800 | 0.8095 | Null Classifier |
| **Education** | **Hist Gradient Boosting** | **0.9664** | 0.0068 | 0.9775 | 0.9259 | **Selected Model** |
| Education | Random Forest | 0.9565 | 0.0063 | 0.9708 | 0.9113 | Competing Benchmark |
| Education | Logistic Regression | 0.9470 | 0.0107 | 0.9651 | 0.8974 | Baseline Linear |
| Education | Extra Trees | 0.9333 | 0.0047 | 0.9588 | 0.8915 | Tree Ensemble |
| Education | Dummy Baseline | 0.5000 | 0.0000 | 0.6200 | 0.7654 | Null Classifier |
| **Personal** | **Random Forest (Tuned)** | **0.8785** | 0.0105 | 0.8923 | 0.8125 | **Selected Model** |
| Personal | Logistic Regression | 0.8869 | 0.0088 | 0.9006 | 0.8095 | High Precision Alt |
| Personal | Hist Gradient Boosting | 0.8798 | 0.0124 | 0.8917 | 0.8214 | Competing Benchmark |
| Personal | Extra Trees | 0.8600 | 0.0169 | 0.8831 | 0.7828 | Tree Ensemble |
| Personal | Dummy Baseline | 0.5000 | 0.0000 | 0.5500 | 0.7097 | Null Classifier |

---

## 4. Version 2 (V2) Platform & 8-Algorithm Benchmark Suite

### 4.1 V2 System Overview & Enhanced Dataset Design
- **Database**: `instance/loaniq_v2.db`
- **Customer Profiles**: 100 Re-engineered Applicants (`APP0001` through `APP0100`).
- **Data Topology Improvements**:
  - Each category comprises **1,200 application records** (300 per product) generated with product-specific mathematical intercepts.
  - Realistic multi-factor interactions: income-to-instalment ratios (FOIR), loan-to-value (LTV), collateral indicators, and co-applicant joint income dynamics.
  - Strict decoupling: the target variable `loan_approved` is derived via a multi-variate logistic risk function where product bounds and applicant financials interact non-linearly, rather than being a trivial duplicate of eligibility flags.

### 4.2 The 8-Algorithm Competitive Benchmark
In Version 2, every loan category was systematically benchmarked across **8 standard algorithms**:
1. **Dummy Baseline**: Stratified / Most-Frequent baseline defining chance level ($AUC = 0.500$).
2. **Logistic Regression (L2 Regularized)**: Highly interpretable linear log-odds classifier with L2 penalty.
3. **Decision Tree**: Standard CART classifier modeling unconstrained recursive splits.
4. **Random Forest**: Bagged ensemble of decorrelated decision trees reducing variance.
5. **HistGradientBoosting**: Histogram-binned gradient boosting inspired by LightGBM.
6. **CatBoost (CPU Fallback)**: Advanced symmetric decision tree boosting with ordered categorical target encoding.
7. **XGBoost (CPU Fallback)**: Scalable extreme gradient boosted tree framework.
8. **Multi-Layer Perceptron (MLP)**: Feedforward neural network with backpropagation.

### 4.3 V2 Selected Model Summary & Performance Metrics

| Loan Category | Selected Model Architecture | Accuracy | Precision | Recall | F1-Score | ROC-AUC | PR-AUC | Log Loss | Inference Latency |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Car Loan** | **CatBoost (CPU Fallback)** | **80.00%** | 83.33% | 90.91% | **0.8696** | **0.8352** | 0.9356 | 0.4407 | ~0.408 s |
| **Home Loan** | **CatBoost (CPU Fallback)** | **79.58%** | 78.23% | 87.12% | **0.8244** | **0.8880** | 0.8980 | 0.4180 | ~0.411 s |
| **Education Loan** | **Logistic Regression** | **85.83%** | 86.73% | 95.51% | **0.9091** | **0.8943** | 0.9587 | 0.3412 | **~0.034 s** |
| **Personal Loan** | **Logistic Regression** | **80.00%** | 85.48% | 88.33% | **0.8689** | **0.8349** | 0.9415 | 0.4158 | **~0.033 s** |

*(Note: In the package execution environment without CUDA hardware, CatBoost operated in verified CPU fallback mode. Metrics reflect honest CPU-trained benchmark performance).*

### 4.4 Comprehensive 5-Algorithm Detailed Cross-Validation Comparison (V2)

The systematic 5-fold cross-validation results across the top 5 model architectures in V2 are detailed below:

#### Car Loan Category Comparison (V2)
| Model Architecture | CV ROC-AUC (Mean ± Std) | CV Accuracy (Mean ± Std) | CV Precision | CV Recall | CV F1-Score | CV PR-AUC | Selection Assessment |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **CatBoost / Gradient Boosting** | **0.8466 ± 0.0247** | **80.21% ± 0.96%** | 81.47% | 94.62% | **0.8754** | **0.9359** | **Selected Best Performer** |
| Logistic Regression | 0.8409 ± 0.0198 | 75.21% ± 2.31% | 89.51% | 75.07% | 0.8164 | 0.9321 | High precision, lower recall |
| Random Forest | 0.8354 ± 0.0203 | 79.79% ± 2.14% | 83.17% | 90.94% | 0.8686 | 0.9289 | Strong ensemble candidate |
| Hist Gradient Boosting | 0.8168 ± 0.0175 | 78.44% ± 2.09% | 82.81% | 89.24% | 0.8587 | 0.9181 | Stable histogram boosting |
| Extra Trees | 0.8151 ± 0.0126 | 76.56% ± 1.35% | 84.94% | 82.86% | 0.8384 | 0.9256 | High randomization |
| Dummy Baseline | 0.5000 ± 0.0000 | 73.54% ± 0.15% | 73.54% | 100.0% | 0.8475 | 0.7354 | Baseline |

#### Home Loan Category Comparison (V2)
| Model Architecture | CV ROC-AUC (Mean ± Std) | CV Accuracy (Mean ± Std) | CV Precision | CV Recall | CV F1-Score | CV PR-AUC | Selection Assessment |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **CatBoost / Random Forest** | **0.8729 ± 0.0098** | **79.48% ± 0.89%** | 78.98% | 85.63% | **0.8214** | **0.8919** | **Selected Best Performer** |
| Logistic Regression | 0.8731 ± 0.0072 | 78.85% ± 1.03% | 80.11% | 82.03% | 0.8101 | 0.8834 | Highly competitive linear fit |
| Gradient Boosting | 0.8715 ± 0.0130 | 78.96% ± 0.74% | 77.96% | 86.19% | 0.8185 | 0.8880 | Balanced tree boosting |
| Hist Gradient Boosting | 0.8646 ± 0.0049 | 78.96% ± 1.15% | 79.12% | 84.12% | 0.8151 | 0.8838 | Low variance across folds |
| Extra Trees | 0.8525 ± 0.0053 | 76.88% ± 0.92% | 76.63% | 83.55% | 0.7992 | 0.8778 | Underperforms random forest |
| Dummy Baseline | 0.5000 ± 0.0000 | 55.10% ± 0.15% | 55.10% | 100.0% | 0.7105 | 0.5510 | Baseline |

#### Education Loan Category Comparison (V2)
| Model Architecture | CV ROC-AUC (Mean ± Std) | CV Accuracy (Mean ± Std) | CV Precision | CV Recall | CV F1-Score | CV PR-AUC | Selection Assessment |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **Logistic Regression** | **0.8826 ± 0.0136** | **80.63% ± 0.77%** | **92.33%** | 80.67% | **0.8610** | **0.9512** | **Selected Model (Superior Precision)** |
| Gradient Boosting | 0.8660 ± 0.0099 | 82.71% ± 1.41% | 84.86% | 93.42% | 0.8893 | 0.9432 | High recall alternative |
| Hist Gradient Boosting | 0.8477 ± 0.0123 | 83.02% ± 0.53% | 85.94% | 92.30% | 0.8899 | 0.9348 | Fast tree boosting |
| Random Forest | 0.8452 ± 0.0164 | 82.60% ± 1.41% | 87.04% | 90.06% | 0.8849 | 0.9277 | Good ensemble benchmark |
| Extra Trees | 0.8367 ± 0.0150 | 80.21% ± 1.41% | 88.01% | 85.01% | 0.8647 | 0.9275 | Moderate performance |
| Dummy Baseline | 0.5000 ± 0.0000 | 74.38% ± 0.00% | 74.38% | 100.0% | 0.8530 | 0.7438 | Baseline |

#### Personal Loan Category Comparison (V2)
| Model Architecture | CV ROC-AUC (Mean ± Std) | CV Accuracy (Mean ± Std) | CV Precision | CV Recall | CV F1-Score | CV PR-AUC | Selection Assessment |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **Logistic Regression** | **0.8182 ± 0.0115** | **74.69% ± 0.92%** | **89.29%** | 75.45% | **0.8171** | **0.9231** | **Selected Model (Top ROC-AUC & Precision)**|
| Gradient Boosting | 0.7967 ± 0.0288 | 78.13% ± 1.17% | 81.16% | 92.37% | 0.8639 | 0.9129 | Lower ROC-AUC |
| Random Forest | 0.7951 ± 0.0158 | 77.92% ± 0.97% | 82.77% | 89.18% | 0.8585 | 0.9108 | Higher tree variance |
| Hist Gradient Boosting | 0.7814 ± 0.0303 | 78.54% ± 1.95% | 82.61% | 90.57% | 0.8639 | 0.9043 | High fold variance |
| Extra Trees | 0.7679 ± 0.0139 | 74.90% ± 1.21% | 85.01% | 80.86% | 0.8288 | 0.9055 | Suboptimal ROC |
| Dummy Baseline | 0.5000 ± 0.0000 | 75.10% ± 0.15% | 75.10% | 100.0% | 0.8578 | 0.7510 | Baseline |

---

## 5. Comprehensive Cross-Version Model Comparison Tables (V1 vs V2)

Below is the side-by-side technical breakdown across all four loan categories, comparing Version 1 and Version 2 implementation parameters, dimensions, and outcomes.

### 5.1 Category 1: Car Loan Comparison
| Metric / Attribute | Version 1 (V1) | Version 2 (V2) | Comparison & Key Differences |
| :--- | :--- | :--- | :--- |
| **Selected Algorithm** | **Random Forest (Tuned)** | **CatBoost (CPU Fallback)** | V2 transitions to gradient boosting with ordered target encoding for complex vehicle/employment categoricals. |
| **Feature Dimensionality** | 29 Total (23 Num + 6 Cat) | 28 Strict Columns Schema | V2 strips internal helper flags and strictly binds to `reports/car_feature_schema.json`. |
| **Vehicle Features** | Vehicle price, vehicle age, type, fuel | Vehicle price, down payment, condition, type | V2 includes down payment for direct Loan-to-Value (LTV) calculation. |
| **ROC-AUC** | **0.9232** (Test) | **0.8352** (Test) / **0.8466** (CV) | V1 had tighter synthetic bounds; V2 introduces realistic edge-case variance across 1,200 rows. |
| **Precision / Recall** | 89.26% / 92.36% | 83.33% / 90.91% | Both versions maintain high recall (>90%) to avoid erroneously rejecting qualified car buyers. |
| **Inference Time** | ~45 ms | ~408 ms | V2 CatBoost CPU execution includes tree evaluation across full depth; highly robust. |
| **Database Binding** | `loaniq_v1.db` | `loaniq_v2.db` | Strictly segregated; V1 reads `USR` tables, V2 reads `APP` tables. |

### 5.2 Category 2: Home Loan Comparison
| Metric / Attribute | Version 1 (V1) | Version 2 (V2) | Comparison & Key Differences |
| :--- | :--- | :--- | :--- |
| **Selected Algorithm** | **Random Forest (Tuned)** | **CatBoost (CPU Fallback)** | V2 leverages CatBoost's superior handling of geographic tiering and property type interactions. |
| **Feature Dimensionality** | 31 Total (25 Num + 6 Cat) | 28 Strict Columns Schema | V2 enforces standardized feature count while preserving property value and down payment. |
| **Property Features** | Value, age, location, status | Property value, down payment, type, city tier | V2 formalizes `city_tier` (Tier 1/2/3) and explicit down payment. |
| **ROC-AUC** | **0.9267** (Test) | **0.8880** (Test) / **0.8729** (CV) | V2 maintains excellent discrimination across multi-decade high-ticket mortgage applications. |
| **Precision / Recall** | 90.77% / 86.76% | 78.23% / 87.12% | V2 prioritizes borrower qualification detection (87.12% recall). |
| **Inference Time** | ~48 ms | ~411 ms | Both models return sub-second responses, well within production SLA thresholds (<500ms). |
| **Database Binding** | `loaniq_v1.db` | `loaniq_v2.db` | Independent schema isolation. |

### 5.3 Category 3: Education Loan Comparison
| Metric / Attribute | Version 1 (V1) | Version 2 (V2) | Comparison & Key Differences |
| :--- | :--- | :--- | :--- |
| **Selected Algorithm** | **Hist Gradient Boosting** | **Logistic Regression** | V2 selects L2-regularized Logistic Regression due to superior precision and zero overfitting. |
| **Feature Dimensionality** | 34 Total (26 Num + 8 Cat) | 28 Strict Columns Schema | V2 consolidates course and collateral attributes into a clean, reproducible vector. |
| **Academic Features** | Course duration, cost, field, tier, scholarship | Course cost, course level, destination, collateral | V2 emphasizes study destination (Domestic vs Overseas) and tangible collateral backing. |
| **ROC-AUC** | **0.9750** (Test) | **0.8943** (Test) / **0.8826** (CV) | V1 achieved near-perfect separation on synthetic splits; V2 reflects realistic lender risk margins. |
| **Precision / Recall** | 93.65% / 95.16% | 86.73% / 95.51% | High recall preserved (95.51%); lenders capture nearly all viable student profiles. |
| **Inference Time** | ~25 ms | **~34 ms** | Extremely fast inference; matrix dot-product allows instant client recommendations. |
| **Database Binding** | `loaniq_v1.db` | `loaniq_v2.db` | Strict version-scoped isolation. |

### 5.4 Category 4: Personal Loan Comparison
| Metric / Attribute | Version 1 (V1) | Version 2 (V2) | Comparison & Key Differences |
| :--- | :--- | :--- | :--- |
| **Selected Algorithm** | **Random Forest (Tuned)** | **Logistic Regression** | Unsecured personal lending exhibits strong monotonic risk with credit score and FOIR; linear log-odds excels. |
| **Feature Dimensionality** | 26 Total (21 Num + 5 Cat) | 26 Strict Columns Schema | Exact matching dimensionality; clean zero-PII feature vectors. |
| **Unsecured Features**| Loan purpose, marital status | Loan purpose, co-applicant presence | V2 substitutes marital status with financial co-applicant backing. |
| **ROC-AUC** | **0.8408** (Test) | **0.8349** (Test) / **0.8182** (CV) | Highly consistent discrimination (~0.83-0.84 ROC-AUC) across both platform generations. |
| **Precision / Recall** | 75.21% / 80.00% | 85.48% / 88.33% | **V2 achieves significantly higher precision (+10.27%) and recall (+8.33%)**. |
| **Inference Time** | ~38 ms | **~33 ms** | Near-instant evaluation (<35 ms) ideal for high-volume consumer mobile applications. |
| **Database Binding** | `loaniq_v1.db` | `loaniq_v2.db` | Completely separate applicant master tables. |

---

## 6. Detailed Model Selection Rationale

In financial credit risk modeling, model selection is governed by a multi-objective trade-off between **discriminative power (ROC-AUC / PR-AUC)**, **calibration fidelity (Brier score / Log Loss)**, **regulatory explainability**, and **operational latency**.

### 6.1 Why CatBoost (CPU Fallback) Was Chosen for Car & Home Loans
1. **Handling Heterogeneous Categoricals Without Cardinality Explosion**:
   - Car and Home lending incorporate multi-level categorical predictors (`vehicle_type`, `vehicle_condition`, `property_type`, `city_tier`). Traditional one-hot encoding expands dimensionality dramatically, leading to sparse feature spaces and tree branch starvation.
   - CatBoost utilizes **Ordered Target Statistics** to encode categorical variables on-the-fly during training without target leakage, preserving high statistical efficiency.
2. **Symmetric (Oblivious) Trees as Built-In Regularization**:
   - CatBoost builds symmetric decision trees where the same splitting criterion is evaluated across an entire tree depth level. This structural constraint serves as powerful structural regularization, preventing over-indexing on idiosyncratic synthetic borrower clusters.
3. **Robust Non-Linear Boundary Modeling**:
   - In vehicle and mortgage underwriting, loan-to-value (LTV) and household debt burden (FOIR) interact non-linearly with property/vehicle asset values. Tree-based boosting maps these complex hyperplanes far more effectively than linear hyperplanes without manual feature engineering.

### 6.2 Why Logistic Regression Was Chosen for Education & Personal Loans
1. **Monotonic Risk Gradients & The Law of Unsecured Credit**:
   - In personal lending and education finance, risk is strictly monotonic: as credit score and disposable income rise, probability of default drops strictly monotonically; as requested loan-to-income increases, risk climbs monotonically.
   - Unconstrained non-linear trees frequently create non-monotonic "step artifacts" (e.g., predicting an applicant with a 752 CIBIL has lower approval odds than one with 748 due to arbitrary leaf splits). Logistic Regression enforces strictly monotonic log-odds, ensuring consistent, defensible underwriting decisions.
2. **Superior Precision on Cross-Validation**:
   - In the V2 Education benchmark, Logistic Regression delivered **92.33% CV Precision**, substantially exceeding Gradient Boosting (84.86%) and HistGradientBoosting (85.94%).
   - In Personal loans, Logistic Regression delivered **89.29% CV Precision** and the highest CV ROC-AUC (0.8182).
3. **Instantaneous Production Latency & Low Memory Footprint**:
   - Logistic Regression inference consists of a standardized matrix dot product followed by a sigmoid activation:
     $$P(y=1|\mathbf{x}) = \frac{1}{1 + e^{-(\mathbf{w}^T \mathbf{x} + b)}}$$
   - Execution time is **~33 ms**, consuming negligible RAM and CPU cycles. This makes it exceptionally resilient on resource-constrained cloud servers (such as Render free/starter tiers) during traffic spikes.
4. **Regulatory Transparency & Adverse Action Reporting**:
   - Banking compliance frameworks require financial institutions to issue explicit "Adverse Action Notices" when a loan is rejected. Because Logistic Regression coefficients directly represent odds ratios ($\exp(\beta_j)$), attributing the exact negative factor (e.g., debt burden coefficient weight) is mathematically transparent.

---

## 7. Deterministic Underwriting Rules Engine (Hard Eligibility Gating)

Before any candidate loan product is scored by the machine learning estimators, it must pass **5 Deterministic Hard Eligibility Gates**. This architectural separation guarantees that ML models never waste computation on legally or institutionally ineligible applicants, and ensures regulatory compliance.

```
Incoming Applicant Request + Product Rules
                     │
                     ▼
       ┌───────────────────────────┐
       │ Gate 1: Credit Score Gate │  ── Fail ──> Ineligible: "Credit score below minimum (xxx < yyy)"
       └─────────────┬─────────────┘
                     │ Pass
                     ▼
       ┌───────────────────────────┐
       │    Gate 2: Age Boundary   │  ── Fail ──> Ineligible: "Age outside permissible bounds (min-max)"
       └─────────────┬─────────────┘
                     │ Pass
                     ▼
       ┌───────────────────────────┐
       │ Gate 3: Principal Limits  │  ── Fail ──> Ineligible: "Requested amount exceeds limits (min-max)"
       └─────────────┬─────────────┘
                     │ Pass
                     ▼
       ┌───────────────────────────┐
       │ Gate 4: FOIR / Debt Cap   │  ── Fail ──> Ineligible: "Total EMI exceeds allowable income ratio"
       └─────────────┬─────────────┘
                     │ Pass
                     ▼
       ┌───────────────────────────┐
       │ Gate 5: Product Criteria  │  ── Fail ──> Ineligible: "Category specific criteria unsatisfied"
       └─────────────┬─────────────┘
                     │ Pass
                     ▼
       ┌───────────────────────────┐
       │   Candidate Eligible!     │
       │ Send to ML Approval Model │
       └───────────────────────────┘
```

1. **Gate 1: Minimum Credit Score (CIBIL)**:
   $$\text{Applicant Credit Score} \ge \text{Product Minimum Credit Score}$$
2. **Gate 2: Age Boundary Gate**:
   $$\text{Product Min Age} \le \text{Applicant Age} \le \text{Product Max Age}$$
3. **Gate 3: Principal Amount Bounds**:
   $$\text{Product Min Amount} \le \text{Requested Amount} \le \text{Product Max Amount}$$
4. **Gate 4: Fixed Obligation to Income Ratio (FOIR)**:
   $$\text{FOIR} = \frac{\text{Existing Monthly EMIs} + \text{Proposed New EMI}}{\text{Net Monthly Income}} \le \text{Max FOIR Threshold (Typically 60\%–70\%)}$$
5. **Gate 5: Product-Specific Feasibility**:
   - Car Loans: Requested amount $\le \text{Vehicle Price} - \text{Down Payment}$.
   - Home Loans: Requested amount $\le 85\% \times \text{Property Value}$.

Only products passing all 5 gates are ranked by the ML model's estimated approval probability ($P_{\text{approval}}$). Ineligible products are cleanly displayed in the user interface under an expandable "Ineligible Offers" tab with the exact reason for rejection.

---

## 8. Reducing-Balance Repayment Optimiser Mathematical Specifications

The LoanIQ Repayment Optimiser is an interactive financial simulation engine that demonstrates the power of accelerated debt amortization.

### 8.1 The Standard Reducing-Balance Monthly EMI Formula
The monthly Equated Monthly Instalment (EMI) $E$ on an initial principal $P$ at an annual interest rate $R$ (with monthly rate $r = \frac{R}{12 \times 100}$) over $n$ months is:

$$E = P \cdot \frac{r(1+r)^n}{(1+r)^n - 1}$$

### 8.2 Amortisation Schedule Recurrence Relations
For any active repayment month $k \in \{1, 2, \dots, n\}$:
1. **Accrued Interest for Month $k$**:
   $$I_k = B_{k-1} \cdot r$$
2. **Principal Amortized in Month $k$**:
   $$P_k = E_k - I_k = E_k - (B_{k-1} \cdot r)$$
3. **Remaining Outstanding Balance after Month $k$**:
   $$B_k = B_{k-1} - P_k = B_{k-1}(1+r) - E_k$$
   *(where $B_0 = P$ is the starting loan balance).*

### 8.3 Dynamic Slider Boundaries ($EMI_{\min}$ vs $EMI_{\max}$)
To prevent invalid financial simulations, the user-facing slider dynamically calculates mathematical boundaries:
- **Minimum Safe Boundary ($EMI_{\min}$)**:
  Must strictly exceed the single-month accrued interest to avoid negative amortisation:
  $$EMI_{\min} = \max\left(\text{Loan Minimum Allowed}, \lceil B_0 \cdot r \rceil + 100\right)$$
- **Maximum Safe Boundary ($EMI_{\max}$)**:
  Capped to prevent unserviceable cash flow obligations:
  $$EMI_{\max} = \min\left(\text{Loan Maximum Allowed}, \text{Current Disposable Income}\right)$$

### 8.4 Accelerated Payoff Tenure & Interest Saved Computation
When a borrower increases their monthly payment to a proposed higher EMI $E_{\text{proposed}} > E_{\text{baseline}}$:
1. **New Remaining Tenure in Months ($n_{\text{new}}$)**:
   $$n_{\text{new}} = \left\lceil \frac{\ln\left(\frac{E_{\text{proposed}}}{E_{\text{proposed}} - B_0 \cdot r}\right)}{\ln(1 + r)} \right\rceil$$
2. **Tenure Compression (Months Saved)**:
   $$\Delta n = n_{\text{baseline}} - n_{\text{new}}$$
3. **Total Cumulative Interest Saved ($\Delta I$)**:
   $$\Delta I = \text{Total Interest}_{\text{baseline}} - \text{Total Interest}_{\text{proposed}}$$
   $$\Delta I = \left(\sum_{k=1}^{n_{\text{baseline}}} I_{k,\text{base}}\right) - \left(\sum_{j=1}^{n_{\text{new}}} I_{j,\text{prop}}\right)$$

The user interface dynamically displays whether the selected payment results in **"Extra Monthly Prepayment"** (yielding massive long-term interest savings) or **"Immediate Monthly Cash Relief"** (providing short-term budget flexibility).

---

## 9. Deployment & Operational Runbook

### 9.1 Local Development Quick-Start

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/swapnilnaik29/ML-CP-LoanRecommenderSystem.git
   cd ML-CP-LoanRecommenderSystem
   ```

2. **Set Up Python Virtual Environment**:
   ```bash
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```

3. **Install Dependencies**:
   ```bash
   pip install -r backend/requirements.txt
   ```

4. **Initialize & Seed Dual Databases**:
   ```bash
   # Initializes loaniq_v1.db and loaniq_v2.db idempotently
   python backend/seed.py
   ```

5. **Run the Full Test Suite**:
   ```bash
   python -m unittest discover -s backend/tests -p "test_*.py" -v
   ```

6. **Launch Full-Stack Server**:
   ```bash
   # Starts the unified Flask application serving backend APIs and frontend static files
   python backend/run.py
   ```
   Open your browser to: **`http://localhost:5000`**

---

### 9.2 Render Cloud Deployment Guide

The platform is fully pre-configured for one-click deployment on [Render](https://render.com):

1. **Repository Settings**:
   - Create a new **Web Service** on Render and connect your GitHub repository:
     `https://github.com/swapnilnaik29/ML-CP-LoanRecommenderSystem`
   - **Branch**: Select `v2` (or `main`).
   - **Environment**: `Python 3`.

2. **Build and Start Commands**:
   - **Build Command**:
     ```bash
     pip install -r requirements.txt && python scripts/seed_v2.py
     ```
   - **Start Command**:
     ```bash
     gunicorn backend.run:app --bind 0.0.0.0:$PORT --workers 1 --threads 4 --timeout 120
     ```

3. **Advanced Settings on Render**:
   - **Health Check Path**: `/api/health`
   - **Port**: Leave blank (Render automatically binds to `$PORT` = `10000`)
   - **Environment Variables**:
     - `PYTHON_VERSION`: `3.11.9`
     - `FLASK_ENV`: `production`
     - `PYTHONUNBUFFERED`: `true`

---

## 10. Summary & Authorship

- **Project Title**: LoanIQ — Institutional Credit Recommendation & Repayment Simulation Platform
- **Academic Course**: Machine Learning Course Project (SEM 5)
- **Repository**: [swapnilnaik29/ML-CP-LoanRecommenderSystem](https://github.com/swapnilnaik29/ML-CP-LoanRecommenderSystem)
- **Active Git Branches**:
  - `v1`: Original Calibrated Ensembles (`Random Forest`, `HistGradientBoosting`, `loaniq_v1.db`)
  - `v2`: Retrained 8-Algorithm Benchmark Suite (`CatBoost CPU`, `Logistic Regression`, `loaniq_v2.db`)
  - `main`: Production release branch (aligned with `v2`).
