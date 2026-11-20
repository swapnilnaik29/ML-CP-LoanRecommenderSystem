# LoanIQ — Project Implementation Specification

## 1. Your role and objective

Act as a senior full-stack engineer, UI/UX designer, database designer, and applied machine-learning engineer. Implement **LoanIQ**, a professional college-project loan recommendation and optimisation platform.

The project root contains:
- `loan_applicant_users_100.csv` — synthetic applicant master data.
- `existing_loans_100_users.csv` — synthetic existing-loan account data. The filename may differ slightly (for example, `existing_loan_100_users.csv`); inspect the root and use the actual file.
- `loan ML project - complete zip` — archive containing the four loan-category datasets, executed model notebooks, trained model artifacts, metrics, and product configuration. Inspect the archive before using it.
- `karzbazar - main folder` — existing application/UI. **This is the primary UI and codebase reference. Modify and extend this project rather than creating an unrelated replacement.** First inspect its actual folder name and contents.

Do not assume files, columns, model filenames, framework versions, or paths. Inspect them. Preserve useful existing code and UI components. Do not overwrite source data or trained models.

## 2. Product identity and design direction

- Rename the application and all user-facing branding to **LoanIQ**.
- Use a Paytm-inspired visual direction: clean white surfaces, Paytm-like blue as the primary brand colour, restrained complementary cyan accents, clear typography, accessible contrast, subtle borders/shadows, and consistent spacing.
- Do not copy Paytm logos, proprietary assets, or claim affiliation with Paytm.
- Make the interface look like a polished, credible financial technology product suitable for a professional college demonstration.
- Ensure responsive layouts for desktop, tablet, and mobile.
- Keep navigation, forms, tables, cards, dialogs, validation messages, and charts visually consistent.
- Retain the useful layout, interaction patterns, and components from the existing `karzbazar` application wherever practical. Improve them where needed; do not discard the existing UI without a clear technical reason.

## 3. Core user journeys

### 3.1 New user registration and applicant profile

A new user must complete an applicant-details form before using personalised loan discovery.

Collect and validate the fields supported by the supplied applicant dataset and application requirements, including:
- Full name
- PAN lookup identifier
- Age
- Monthly income
- Employment type
- Employment experience
- Credit score
- Existing monthly EMI
- Number of existing active loans
- Monthly household expenses
- Average bank balance
- Number of dependents

Requirements:
- Use PAN as a unique lookup identifier for this synthetic college-project dataset, but do not present it as real identity verification.
- Validate required fields, numeric ranges, formats, duplicate PAN values, and sensible cross-field constraints.
- Do not silently fabricate missing applicant information.
- After successful registration, save the applicant in SQLite and take the user to their dashboard.
- Provide a profile view and an edit flow.
- Clearly label the supplied sample records as synthetic/demo data.

### 3.2 Dashboard

Create a dashboard that gives the user a useful overview:
- Applicant summary
- Existing active loans and total monthly EMI
- Loan discovery entry point
- Loan optimiser entry point
- Loan comparison entry point
- Relevant application/recommendation summary, where data exists

Use real database values and actual model outputs. Do not hardcode dashboard statistics.

### 3.3 Discover loans — personalised recommendation

When the user clicks **Discover Loans**, do not immediately show recommendations. First collect the additional information required for the selected loan type.

Support four loan categories:
1. Car loan
2. Home loan
3. Education loan
4. Personal loan

For each category, show a dedicated form containing the relevant common applicant fields (prefill these from the saved profile) and category-specific fields. Inspect the actual feature columns used by the corresponding trained model and dataset in the supplied ML project. The form must collect every required model input, including category-specific fields, without asking the user to re-enter profile information unnecessarily.

Examples of category-specific information to consider, subject to the actual model schema:
- Car loan: vehicle price/value, down payment, new/used vehicle, vehicle type, requested amount, desired tenure.
- Home loan: property value, down payment, property type, property location/type where supported, requested amount, desired tenure.
- Education loan: course level/type, institution/course details where supported, study location, course cost, requested amount, desired tenure.
- Personal loan: loan purpose, requested amount, desired tenure, and other fields present in the model schema.

Do not invent model features. Use the actual feature names and types discovered from the notebooks, CSVs, and configuration.

After submission:
- Apply the configured hard eligibility rules for each loan product first.
- Only eligible products should be ranked as eligible recommendations. Ineligible products may be shown separately with clear reasons, if useful.
- For each eligible product, call the matching category-specific trained model and obtain the acceptance/approval probability.
- Sort eligible loan products by predicted approval probability, highest first.
- Show probability as a percentage with a clear explanation that it is a model estimate, not a guarantee of lender approval.
- Show product details: lender/product name, eligible amount range, interest rate, tenure range, fees/other available terms, and key eligibility reasons. Use only values found in the product configuration/database; do not fabricate lenders, rates, or fees.
- Let the user inspect why a product passed or failed the configured hard eligibility rules.
- Save the submitted application and recommendation results in SQLite, including model version/reference and timestamp where practical.

Important distinction: the target in the supplied ML project is **loan approval by the lender** (`loan_approved`), not whether the borrower accepts an offer. Keep the UI wording consistent with this definition. Call the result “estimated approval probability” or “predicted lender approval probability”, not a guaranteed acceptance rate.

### 3.4 Loan optimiser — existing loan repayment simulator

Create a dedicated **Loan Optimiser** page.

The user should see all their existing active loans, with each loan displayed separately. Show:
- Loan category
- Original principal
- Annual interest rate
- Original tenure
- Current EMI
- Remaining principal/balance
- Remaining tenure
- Maturity date
- Loan status

For each loan, provide an interactive EMI slider. The user can change the proposed EMI and immediately see the estimated effect on:
- Remaining repayment tenure
- Total remaining interest payable
- Total remaining repayment amount
- Interest saved or additional interest compared with the current EMI
- Estimated new payoff/maturity date

Simulation requirements:
- Recalculate from the outstanding principal, annual interest rate, and proposed EMI.
- Use a standard monthly reducing-balance amortisation calculation, with monthly rate = annual nominal rate / 12 / 100.
- For a fixed EMI, calculate the number of months required to repay the outstanding balance. Account for the final smaller payment.
- Validate that EMI is greater than the monthly interest accrued; otherwise explain that the EMI will not amortise the loan.
- Enforce any sensible minimum/maximum slider bounds, but do not confuse product EMI limits with lender-approved contractual limits. If the dataset contains illustrative EMI bounds, label them as simulation bounds.
- Compare the slider scenario with the current-loan baseline.
- Update the figures live as the slider changes; do not require a page reload.
- Clearly label all outputs as estimates. Actual lender foreclosure/prepayment charges, rate resets, taxes, and contractual terms may change the outcome.
- The simulation must not update the user's actual loan record unless the user explicitly chooses a separate save/update action. By default, slider changes are temporary scenarios.

Provide a form to **Add Existing Loan** manually. The user should be able to enter:
- Loan category
- Original loan amount
- Annual interest rate
- Original tenure
- Loan start date
- Current EMI
- Current outstanding balance
- Remaining tenure or maturity date
- Status

Validate the values and calculate any safely derivable field. Save the new loan against the logged-in applicant in SQLite. Recalculate the applicant's total EMI and active-loan count from the loan records rather than trusting user-entered aggregate values.

### 3.5 Loan comparison tool

Create a **Compare Loans** page where the user can compare eligible loan products side by side.

Requirements:
- Use the applicant's saved profile and the relevant loan-discovery application details.
- Show only products that pass the hard eligibility checks in the main eligible comparison view.
- Allow the user to select multiple eligible products (at least two) for comparison.
- Compare relevant attributes such as interest rate, eligible loan amount, tenure, EMI estimate, total repayment estimate, fees/charges if available, and predicted approval probability.
- Keep assumptions consistent across products: use the same requested principal and comparable tenure assumptions where the product terms permit.
- Clearly distinguish product facts from calculated estimates.
- Provide a clear table or responsive comparison cards and highlight differences without misleading visual emphasis.
- If fewer than two products are eligible, explain why and do not fabricate comparison options.
- Allow the user to navigate back to the ranked recommendations.

## 4. Machine-learning integration

Inspect the supplied archive and identify the four trained model files, their expected feature schemas, preprocessing pipelines, calibration approach, and product configuration.

Expected model categories:
- Car loan
- Home loan
- Education loan
- Personal loan

Integration rules:
- Reuse the trained artifacts and their existing preprocessing pipelines. Do not retrain or replace them without a clear reason.
- Ensure inference receives the exact feature names and compatible types expected by each model.
- Do not use applicant IDs, PAN, names, or other identifiers as model features.
- Do not send missing, guessed, or defaulted values to the model without explicitly handling them.
- Validate model input and handle inference errors gracefully.
- Return a probability for the positive class (`loan_approved = 1`) using the model's supported probability interface.
- Keep eligibility-rule evaluation separate from ML probability prediction. A high probability must not override a failed hard eligibility rule.
- Add a small service/API layer for model loading and inference. Load models once where practical rather than on every request.
- Record which model produced each prediction and expose a useful error if a model artifact is missing or incompatible.
- Never claim the synthetic model metrics represent real-world lender performance. Include a visible demo/model disclaimer.

The archive may contain a ZIP with notebooks, CSV datasets, JSON configuration, `.joblib` model files, and metrics. Inspect and use the actual artifacts; do not assume the archive has already been extracted.

## 5. SQLite database

Use SQLite as the persistent database for applicant/user data, loan products, existing loans, applications, and recommendation history.

Design a normalised schema with suitable primary keys, foreign keys, unique constraints, indexes, and timestamps. At minimum consider these tables:
- `users` or `applicants`
- `loan_products`
- `existing_loans`
- `loan_applications`
- `loan_recommendations` or `prediction_results`

Requirements:
- Store applicant records and loan products in SQLite.
- Seed the product table from the supplied product configuration, after inspecting its real schema.
- Import the supplied synthetic applicant and existing-loan CSVs through a repeatable seed/import script.
- Preserve the PAN-to-applicant and applicant-to-loan relationships.
- Ensure each existing loan is linked to the correct applicant.
- Reconcile aggregate `existing_emi_inr` and `existing_active_loans` against loan-level records when importing. Treat loan-level records as the source of truth and report discrepancies rather than silently ignoring them.
- Make database initialisation and seeding idempotent: rerunning the process must not create duplicate users, products, or loans.
- Use transactions and rollback on import failures.
- Keep raw CSVs and model artifacts as source assets; SQLite is the runtime source of truth after successful import.
- Do not store passwords in plaintext. If authentication is implemented, hash passwords using an established password-hashing method. Never use PAN as a password or authentication secret.
- Keep database credentials/secrets (if any) in environment variables; do not commit secrets.

## 6. Suggested project organisation

Adapt this to the existing framework rather than forcing a framework migration. Keep responsibilities separated. A possible structure is:

```text
LoanIQ/
├── README.md
├── .env.example
├── .gitignore
├── prompt.md
├── data/
│   ├── raw/
│   │   ├── loan_applicant_users_100.csv
│   │   └── existing_loans_100_users.csv
│   ├── config/
│   │   └── loan_products_config.json
│   └── processed/
├── ml/
│   ├── artifacts/
│   │   ├── car_loan_approval_model.joblib
│   │   ├── home_loan_approval_model.joblib
│   │   ├── education_loan_approval_model.joblib
│   │   └── personal_loan_approval_model.joblib
│   ├── notebooks/
│   ├── schemas/
│   └── model_service.py
├── backend/
│   ├── app/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── models/
│   │   ├── schemas/
│   │   └── database/
│   └── tests/
├── frontend/
│   ├── components/
│   ├── pages/
│   ├── services/
│   └── styles/
├── scripts/
│   ├── init_db.py
│   ├── seed_products.py
│   └── import_csv_data.py
├── instance/
│   └── loaniq.db
└── docs/
    ├── architecture.md
    └── database-schema.md
```

This is a suggested separation of concerns, not a mandate to replace the current stack. If the existing `karzbazar` project has a working structure, adapt it incrementally and document the final structure.

## 7. UX and validation requirements

- Use clear page titles, navigation labels, empty states, loading states, success/error feedback, and confirmation dialogs for destructive actions.
- Forms must have labels, helper text, required-field indicators, inline validation, and sensible defaults only where justified.
- Prefill known applicant details from the database.
- Do not ask the user for the same information repeatedly.
- Make every visible button and control functional. Do not leave placeholder buttons or dead links.
- Use accessible contrast, keyboard navigation, and readable tables.
- Provide clear states for no existing loans, no eligible products, incomplete profile, missing model, and database/import errors.
- Avoid fake live lender integrations. This is a local college project unless real integrations already exist in the codebase.

## 8. Security, privacy, and responsible presentation

- Treat supplied PAN-like identifiers and applicant data as synthetic demo data.
- Never describe the app as connected to government PAN verification, banks, credit bureaus, or real lenders unless an actual verified integration exists.
- Do not expose one applicant's data to another applicant.
- Use parameterised SQL queries or a safe ORM.
- Validate and sanitise all user input on the server, not only in the browser.
- Keep secrets out of source control.
- Add disclaimers that approval probabilities are generated by models trained on synthetic data and are not financial advice or a real lender decision.
- Avoid discriminatory or unsupported claims. Explain that predictions are limited by synthetic training data and should not be used for real credit decisions.

## 9. Testing and acceptance criteria

Implement tests and manually verify the complete flows.

### Applicant and database
- A new applicant can register and the profile persists after restarting the application.
- Duplicate PAN identifiers are rejected.
- Imported applicant and loan records preserve their relationships.
- Re-running seed scripts does not duplicate records.
- Applicant loan count and total EMI match the active loan records.

### Loan discovery
- Each of the four loan types has its own form.
- Each form collects all required model features.
- The matching model is used for the selected loan category.
- Hard eligibility rules are evaluated separately from probability prediction.
- Eligible products are sorted by approval probability in descending order.
- Missing model features produce validation errors rather than fabricated predictions.

### Loan optimiser
- All applicant-owned existing loans are displayed.
- Adding an existing loan persists it and updates aggregate EMI/count.
- Changing the EMI slider updates estimated remaining tenure and interest.
- EMI at or below monthly interest is rejected with a clear explanation.
- The baseline scenario remains unchanged when the user moves the slider.
- Scenario calculations are tested against hand-calculated amortisation examples.

### Comparison
- Only eligible products appear in the eligible comparison selection.
- At least two products can be compared when available.
- EMI and total repayment calculations use consistent assumptions.
- Fewer than two eligible products produces a useful explanation.

### Quality
- No dead buttons, broken routes, uncaught routine errors, or hardcoded demo metrics in production UI.
- Responsive UI works at common desktop and mobile widths.
- README explains setup, dependencies, database initialisation, CSV import, model artifact placement, run commands, and tests.
- Provide a concise architecture and database schema document.

## 10. Implementation workflow — follow this order

1. **Inspect first.** List the root files and inspect the existing `karzbazar` project, its framework, routes, UI components, styles, and current data flow. Inspect the ZIP contents and all CSV/JSON schemas. Do not start by replacing the UI.
2. **Report findings briefly.** Identify the existing stack, reusable UI pieces, actual model artifacts, feature schemas, and any missing/inconsistent files.
3. **Plan the changes.** Map current files to the proposed LoanIQ modules. Preserve working functionality.
4. **Build the database layer.** Create schema, migrations/initialisation, and idempotent seed/import scripts. Validate relationships and aggregate reconciliation.
5. **Build backend services.** Add applicant, product, existing-loan, eligibility, recommendation, prediction, and EMI-simulation services/API routes.
6. **Integrate models.** Test each model with a valid sample row built from its actual schema before wiring it into the UI.
7. **Implement frontend journeys.** Update the existing UI into LoanIQ and implement registration, dashboard, discovery forms/results, optimiser, add-loan form, and comparison.
8. **Test end to end.** Run automated tests and exercise every user journey. Fix errors rather than hiding them.
9. **Document and deliver.** Update README, architecture, database schema, and setup instructions. State exactly what is implemented, what was tested, and any limitations.

## 11. Non-negotiable constraints

- The existing `karzbazar` UI is the design and implementation starting point.
- The product name everywhere must be **LoanIQ**.
- Use a Paytm-inspired blue/cyan/white theme without copying protected branding.
- Persist users/applicants, loan products, and user loan/application data in SQLite.
- Reuse the four supplied category-specific trained models and their real feature schemas.
- The main discovery ranking is based on estimated lender approval probability, but only after hard eligibility filtering.
- The optimiser must calculate the effect of a changed EMI on remaining interest and tenure using amortisation maths.
- Users must be able to add their own existing loans.
- New users must complete the applicant details form.
- Each loan discovery flow must collect the required category-specific inputs.
- Do not invent data, model features, lenders, product terms, or integrations.
- Do not stop after producing a plan or mockup. Implement, run, test, and fix the application.
