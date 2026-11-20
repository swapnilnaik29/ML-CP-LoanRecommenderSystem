"""
LoanIQ ML Model Inference Service
Loads and serves calibrated classifiers and retrained benchmark models for:
- Car, Home, Education, and Personal loan approval probability
Supports both V1 (calibrated ensembles) and V2 (retrained 8-algorithm benchmark models).
"""

import os
import sys
import json
import logging
from pathlib import Path
from typing import Dict, Any, Tuple

# 1. Patch pickle unpickling compatibility for scikit-learn _loss module
try:
    import sklearn._loss
    import sklearn._loss.loss
    sys.modules['_loss'] = sklearn._loss.loss
except Exception:
    pass

# 2. Register CatBoostSklearnWrapper in __main__ so joblib unpickles V2 CatBoost pipelines
from sklearn.base import BaseEstimator, ClassifierMixin

class CatBoostSklearnWrapper(ClassifierMixin, BaseEstimator):
    def __init__(self, iterations=300, depth=6, learning_rate=0.05, task_type='CPU', random_seed=42):
        self.iterations = iterations
        self.depth = depth
        self.learning_rate = learning_rate
        self.task_type = task_type
        self.random_seed = random_seed

    def fit(self, X, y=None):
        return self

    def predict(self, X):
        return self.model_.predict(X).astype(int).ravel()

    def predict_proba(self, X):
        return self.model_.predict_proba(X)

    def __sklearn_is_fitted__(self):
        return hasattr(self, 'model_')

setattr(sys.modules['__main__'], 'CatBoostSklearnWrapper', CatBoostSklearnWrapper)

import joblib
import pandas as pd
import numpy as np

logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parent
ARTIFACTS_DIR = BASE_DIR / "artifacts"
SCHEMAS_DIR = BASE_DIR / "schemas"
V2_PACKAGE_DIR = BASE_DIR.parent / "LoanIQ_retrained_ml_package"

# Cache loaded models and schemas
_MODELS_CACHE = {}
_SCHEMAS_V1_CACHE = None
_SCHEMAS_V2_CACHE = {}


def load_v1_schemas() -> Dict[str, Any]:
    global _SCHEMAS_V1_CACHE
    if _SCHEMAS_V1_CACHE is None:
        schema_file = SCHEMAS_DIR / "feature_schemas.json"
        if not schema_file.exists():
            schema_file = BASE_DIR.parent / "ml" / "schemas" / "feature_schemas.json"
        with open(schema_file, "r") as f:
            _SCHEMAS_V1_CACHE = json.load(f)
    return _SCHEMAS_V1_CACHE


SUPPORTED_CATEGORIES = ("car", "home", "education", "personal")


def load_v2_schema(loan_type: str) -> Dict[str, Any]:
    loan_type = loan_type.lower().strip()
    if loan_type not in SUPPORTED_CATEGORIES:
        raise ValueError(f"Unsupported loan category: {loan_type}")
    if loan_type in _SCHEMAS_V2_CACHE:
        return _SCHEMAS_V2_CACHE[loan_type]

    schema_file = V2_PACKAGE_DIR / "reports" / f"{loan_type}_feature_schema.json"
    if not schema_file.exists():
        raise FileNotFoundError(f"V2 Feature schema not found for {loan_type} at {schema_file}")

    with open(schema_file, "r") as f:
        schema = json.load(f)
    _SCHEMAS_V2_CACHE[loan_type] = schema
    return schema


def get_model(loan_type: str, version: str = "v1"):
    loan_type = loan_type.lower().strip()
    version = (version or "v1").lower().strip()
    cache_key = (version, loan_type)

    if cache_key in _MODELS_CACHE:
        return _MODELS_CACHE[cache_key]

    if version in ("v2", "2"):
        artifact_name = f"{loan_type}_loan_approval_model.joblib"
        model_path = V2_PACKAGE_DIR / "models" / artifact_name
        if not model_path.exists():
            raise FileNotFoundError(f"V2 model artifact not found for {loan_type} at {model_path}")
    else:
        artifact_name = f"{loan_type}_loan_approval_model.joblib"
        model_path = ARTIFACTS_DIR / artifact_name
        if not model_path.exists():
            model_path = BASE_DIR.parent / "ml" / "artifacts" / artifact_name
        if not model_path.exists():
            raise FileNotFoundError(f"V1 model artifact not found for {loan_type} at {model_path}")

    logger.info(f"Loading {version.upper()} ML model for {loan_type} from {model_path}")
    model = joblib.load(str(model_path))
    _MODELS_CACHE[cache_key] = model
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


def predict_approval_probability(
    loan_type: str,
    raw_features: Dict[str, Any],
    version: str = "v1"
) -> Tuple[float, str]:
    """
    Computes predicted lender approval probability for a given loan type and feature dictionary.
    Supports both V1 and V2 models according to the active version.
    Returns: (probability_float, model_version_string)
    """
    loan_type = loan_type.lower().strip()
    version = (version or "v1").lower().strip()

    if version in ("v2", "2"):
        return _predict_v2(loan_type, raw_features)
    else:
        return _predict_v1(loan_type, raw_features)


def _predict_v1(loan_type: str, raw_features: Dict[str, Any]) -> Tuple[float, str]:
    schemas = load_v1_schemas()
    if loan_type not in schemas:
        raise ValueError(f"Unsupported loan category: {loan_type}")

    model = get_model(loan_type, version="v1")
    schema = schemas[loan_type]
    num_features = schema["num_features"]
    cat_features = schema["cat_features"]
    all_features = num_features + cat_features

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
                str_val = str(val).strip()
                if feat != "product_id" and feat != "product_name":
                    normalized_cat = str_val.lower().replace(" ", "_").replace("-", "_")
                    valid_cats = schema.get("valid_categories", {}).get(feat)
                    if valid_cats:
                        if normalized_cat in valid_cats:
                            str_val = normalized_cat
                        elif str_val in valid_cats:
                            pass
                        else:
                            matched = None
                            for vc in valid_cats:
                                if vc.lower() == str_val.lower() or vc.lower() == normalized_cat:
                                    matched = vc
                                    break
                            str_val = matched if matched else str_val
                row_dict[feat] = str_val

    if missing_features:
        raise ValueError(f"Missing required model features for {loan_type}: {', '.join(missing_features)}")

    df = pd.DataFrame([row_dict])[all_features]
    probabilities = model.predict_proba(df)
    prob_approved = float(probabilities[0, 1])
    model_version = f"{loan_type.capitalize()} Loan Calibrated Model v1.0"
    return prob_approved, model_version


def _predict_v2(loan_type: str, raw_features: Dict[str, Any]) -> Tuple[float, str]:
    schema = load_v2_schema(loan_type)
    model = get_model(loan_type, version="v2")
    feature_columns = schema["feature_columns"]
    categorical_features = schema.get("categorical_features", [])
    numeric_features = schema.get("numeric_features", [])

    row_dict = {}
    missing_features = []

    for feat in feature_columns:
        if feat not in raw_features or raw_features[feat] is None:
            missing_features.append(feat)
        else:
            val = raw_features[feat]
            if feat in numeric_features:
                try:
                    row_dict[feat] = float(val)
                except (ValueError, TypeError):
                    raise ValueError(f"Feature '{feat}' must be numeric, got {val}")
            else:
                row_dict[feat] = str(val).strip()

    if missing_features:
        raise ValueError(f"Missing required V2 model features for {loan_type}: {', '.join(missing_features)}")

    # Pass exact columns in exact schema order to complete sklearn pipeline
    df = pd.DataFrame([row_dict])[feature_columns]
    probabilities = model.predict_proba(df)
    prob_approved = float(probabilities[0, 1])

    selected_algo = schema.get("selected_model", "Retrained Benchmark")
    model_version = f"{loan_type.capitalize()} Retrained Model v2.0 ({selected_algo})"
    return prob_approved, model_version


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    print("Testing ML Model Service across V1 and V2...")
    for lt in ["car", "home", "education", "personal"]:
        m1 = get_model(lt, version="v1")
        m2 = get_model(lt, version="v2")
        print(f"Loaded {lt.upper()}: V1={type(m1).__name__}, V2={type(m2).__name__}")
    print("All V1 and V2 models loaded successfully!")
