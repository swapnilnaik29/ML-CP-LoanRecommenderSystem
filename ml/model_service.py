"""
LoanIQ ML Model Inference Service
Loads and serves calibrated classifiers for Car, Home, Education, and Personal loan approval probability.
"""

import os
import sys
import json
import logging
from pathlib import Path
from typing import Dict, Any, Tuple

# Patch pickle unpickling compatibility for scikit-learn _loss module
try:
    import sklearn._loss
    import sklearn._loss.loss
    sys.modules['_loss'] = sklearn._loss.loss
except Exception as e:
    pass

import joblib
import pandas as pd
import numpy as np

logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parent
ARTIFACTS_DIR = BASE_DIR / "artifacts"
SCHEMAS_DIR = BASE_DIR / "schemas"

# Cache loaded models
_MODELS_CACHE = {}
_SCHEMAS_CACHE = None


def load_schemas() -> Dict[str, Any]:
    global _SCHEMAS_CACHE
    if _SCHEMAS_CACHE is None:
        schema_file = SCHEMAS_DIR / "feature_schemas.json"
        if not schema_file.exists():
            # Fallback path if run from project root
            schema_file = BASE_DIR.parent / "ml" / "schemas" / "feature_schemas.json"
        with open(schema_file, "r") as f:
            _SCHEMAS_CACHE = json.load(f)
    return _SCHEMAS_CACHE


def get_model(loan_type: str):
    loan_type = loan_type.lower().strip()
    if loan_type in _MODELS_CACHE:
        return _MODELS_CACHE[loan_type]

    artifact_name = f"{loan_type}_loan_approval_model.joblib"
    model_path = ARTIFACTS_DIR / artifact_name
    if not model_path.exists():
        model_path = BASE_DIR.parent / artifact_name
    if not model_path.exists():
        model_path = BASE_DIR.parent / "ml" / "artifacts" / artifact_name

    if not model_path.exists():
        raise FileNotFoundError(f"Trained model artifact not found for loan type: {loan_type} at {model_path}")

    logger.info(f"Loading ML model for {loan_type} from {model_path}")
    model = joblib.load(str(model_path))
    _MODELS_CACHE[loan_type] = model
    return model


def calculate_monthly_emi(principal: float, annual_rate_pct: float, tenure_months: int) -> float:
    """Calculates standard reducing-balance monthly EMI."""
    if principal <= 0 or tenure_months <= 0:
        return 0.0
    r = (annual_rate_pct / 100.0) / 12.0
    if r == 0:
        return round(principal / tenure_months, 2)
    emi = principal * r * ((1 + r) ** tenure_months) / (((1 + r) ** tenure_months) - 1)
    return round(emi, 2)


def predict_approval_probability(loan_type: str, raw_features: Dict[str, Any]) -> Tuple[float, str]:
    """
    Computes predicted lender approval probability for a given loan type and feature dictionary.
    Returns: (probability_float, model_version_string)
    """
    loan_type = loan_type.lower().strip()
    schemas = load_schemas()
    if loan_type not in schemas:
        raise ValueError(f"Unsupported loan category: {loan_type}")

    model = get_model(loan_type)
    schema = schemas[loan_type]
    num_features = schema["num_features"]
    cat_features = schema["cat_features"]
    all_features = num_features + cat_features

    # Build row dictionary with strict validation and sanitization
    row_dict = {}
    missing_features = []

    for feat in all_features:
        if feat not in raw_features or raw_features[feat] is None:
            missing_features.append(feat)
        else:
            val = raw_features[feat]
            if feat in num_features:
                try:
                    row_dict[feat] = float(val)
                except (ValueError, TypeError):
                    raise ValueError(f"Feature '{feat}' must be numeric, got {val}")
            else:
                # Normalize string categories to match model training categories
                str_val = str(val).strip()
                if feat != "product_id" and feat != "product_name":
                    # Lowercase and underscore normalization for categorical terms
                    # e.g., 'Salaried' -> 'salaried', 'Ready to Move' -> 'ready_to_move'
                    normalized_cat = str_val.lower().replace(" ", "_").replace("-", "_")
                    # Check if normalized value is in valid categories if schema knows it
                    valid_cats = schema.get("valid_categories", {}).get(feat)
                    if valid_cats:
                        if normalized_cat in valid_cats:
                            str_val = normalized_cat
                        elif str_val in valid_cats:
                            pass
                        else:
                            # Try to match case-insensitively
                            matched = None
                            for vc in valid_cats:
                                if vc.lower() == str_val.lower() or vc.lower() == normalized_cat:
                                    matched = vc
                                    break
                            str_val = matched if matched else str_val
                row_dict[feat] = str_val

    if missing_features:
        raise ValueError(f"Missing required model features for {loan_type}: {', '.join(missing_features)}")

    # Create DataFrame with exact column order
    df = pd.DataFrame([row_dict])[all_features]

    # Predict probability for positive class (loan_approved = 1)
    probabilities = model.predict_proba(df)
    prob_approved = float(probabilities[0, 1])

    # Model info / version
    model_version = f"{loan_type.capitalize()} Loan Calibrated Model v1.0"

    return prob_approved, model_version


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    print("Testing ML Model Service...")
    # Load all 4 models and test
    for lt in ["car", "home", "education", "personal"]:
        m = get_model(lt)
        print(f"Loaded {lt} successfully: {type(m)}")
    print("All models loaded cleanly.")
