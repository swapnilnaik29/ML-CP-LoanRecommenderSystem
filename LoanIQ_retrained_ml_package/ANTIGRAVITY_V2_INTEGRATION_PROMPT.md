# Antigravity Prompt – Integrate Updated LoanIQ V2 ML Package

I am providing the existing LoanIQ application folder and the updated `LoanIQ_retrained_ml_package.zip`. Integrate the V2 assets into the existing application. Preserve the existing UI, backend features and V1 implementation; do not rebuild the application.

## 1. V2 models
Use the four saved pipelines:
- `models/car_loan_approval_model.joblib`
- `models/home_loan_approval_model.joblib`
- `models/education_loan_approval_model.joblib`
- `models/personal_loan_approval_model.joblib`

Each is a complete preprocessing + classifier pipeline. Load it with joblib and pass a pandas DataFrame whose columns and order match the category's `reports/<category>_feature_schema.json` `feature_columns`. Do not preprocess a second time.

## 2. Eight-algorithm training comparison
Each of the four executed notebooks compares exactly these eight baseline algorithms:
1. Dummy
2. Logistic Regression
3. Decision Tree
4. Random Forest
5. HistGradientBoosting
6. CatBoost
7. XGBoost
8. MLP

The comparison metrics are Accuracy, Precision, Recall, F1-Score, ROC-AUC, PR-AUC, Log Loss and Time (s). No hyperparameter tuning was performed. The notebooks and reports are project documentation; do not retrain these models during normal application startup.

CatBoost and XGBoost were configured to use GPU when CUDA was available. The package execution environment had no available CUDA GPU, so the included executed results use CPU fallback for those two models. Do not describe those saved runs as GPU-trained.

## 3. V1/V2 version switch
Add a visible selector to the main dashboard:
- V1 – Original
- V2 – Retrained

Preserve V1 assets and behaviour. Use independent SQLite databases:
- `loaniq_v1.db`
- `loaniq_v2.db`

Seed V2 using:
- `data/users/loan_applicant_users_100.csv`
- `data/users/existing_loans_100_users.csv`

Use V2 product catalogue/configuration from `data/products/`.

Switching versions must change the active database, models, feature schemas and product configuration together. Refresh dashboard metrics, applicant data, loan discovery, recommendations, comparisons and optimiser. Never merge V1 and V2 records.

Use request-scoped or session-scoped version resolution; do not use a mutable global active-version variable that can leak data across users or concurrent requests.

## 4. V2 inference
For every discovery request:
1. Resolve selected version.
2. Retrieve applicant information from that version's database.
3. Collect category-specific application inputs.
4. Apply hard eligibility rules separately from ML scoring.
5. Select the matching category-specific model and feature schema.
6. Build the input DataFrame with exact schema columns and order.
7. Call `predict_proba()` and obtain the positive-class probability.
8. Rank only eligible products by estimated probability.

Never use the wrong category model. Never pass application IDs, PAN-like identifiers, names or other personal identifiers as model features. Never return random probabilities as a fallback. Treat probabilities as estimates, not guarantees.

## 5. Data and UI
Use V2 applicant, existing-loan and product data only when V2 is active. All dashboard values and optimiser calculations must come from the selected version's database. Retain the current LoanIQ design and do not add Paytm branding or imply official affiliation.

## 6. Tests
Test:
- V1 assets and records remain unchanged.
- V2 loads the correct four pipelines.
- Feature names/order match each schema.
- Each category calls only its matching model.
- Version switching changes DB/model/config atomically.
- No applicant or loan records leak between versions.
- Dashboard, discovery, comparison and optimiser all use selected version.
- Missing models and invalid inputs return clear errors.

## 7. Deliverables
Provide the updated application, database initialization and idempotent seeding scripts, version manager, model inference integration, tests, dependency updates and README. Verify switching V1 → V2 → V1. Do not overwrite or delete V1 assets.

The datasets are synthetic. Do not claim real-world lending accuracy.
