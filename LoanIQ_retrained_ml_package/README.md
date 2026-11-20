# LoanIQ V2 – Eight-Algorithm ML Package

## Package contents
- Four category datasets: Car, Home, Education and Personal (1,200 rows each).
- Exactly four executed Jupyter notebooks, one for each category.
- Eight-algorithm comparison table in each notebook and matching CSV report.
- Four saved scikit-learn-compatible preprocessing/model pipelines.
- Per-category metrics JSON, feature schemas and EDA graphs.
- Applicant and existing-loan data, product catalogue and product configuration.
- Consolidated selected-model summary and Antigravity integration prompt.

## Algorithms compared in every notebook
1. Dummy
2. Logistic Regression
3. Decision Tree
4. Random Forest
5. HistGradientBoosting
6. CatBoost
7. XGBoost
8. MLP

The table includes Accuracy, Precision, Recall, F1-Score, ROC-AUC, PR-AUC, Log Loss and Time (s), following the supplied reference screenshot. Each algorithm uses a fixed baseline configuration. There is no hyperparameter tuning, GridSearchCV or RandomizedSearchCV.

CatBoost and XGBoost are configured for GPU when CUDA is available. In the environment used to execute these notebooks, CUDA was not available, so they ran in CPU fallback mode. The notebook labels make this explicit; GPU execution is not claimed.

## Four notebooks
- `notebooks/car_loan_model.ipynb`
- `notebooks/home_loan_model.ipynb`
- `notebooks/education_loan_model.ipynb`
- `notebooks/personal_loan_model.ipynb`

Each notebook includes:
1. Student-style explanation and comments.
2. Dataset loading and inspection.
3. EDA tables: missing values, numeric summaries, categorical frequencies, class balance and product approval rates.
4. EDA graphs: target distribution, product approval rate, numeric histograms, boxplots and correlation heatmap.
5. Feature preparation and stratified train/test split.
6. Training of the eight fixed baseline algorithms.
7. Full metrics comparison table and ROC-AUC graph.
8. Confusion matrix and classification report for the selected model.
9. Saving the selected pipeline and comparison reports.
10. Conclusion and synthetic-data limitations.

## Main reports
For each category:
- `reports/<category>_eight_algorithm_comparison.csv`
- `reports/<category>_model_metrics.json`
- `reports/<category>_feature_schema.json`
- `reports/eda/<category>/` (saved graphs)

## Install dependencies
```bash
pip install pandas numpy matplotlib seaborn scikit-learn joblib jupyter catboost xgboost torch
```

## Run
Extract the package, open Jupyter from the package root, then run each category notebook from top to bottom.

## Important limitations
Datasets and labels are synthetic. Metrics describe performance on the generated data and do not demonstrate real-world lender approval accuracy. The test split is used to compare and select models, so its reported score is not an independent final estimate. For a rigorous study, use a validation split for selection and reserve the test set for final evaluation.
