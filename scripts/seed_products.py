"""
Seed loan products into SQLite from loan_products_config.json
Idempotent insertion / update.
"""

import sys
import json
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from backend.app.database import get_db_connection, init_db


def seed_products(config_path: Path = None):
    init_db()
    if config_path is None:
        config_path = BASE_DIR / "data" / "config" / "loan_products_config.json"
        if not config_path.exists():
            config_path = BASE_DIR / "loan_products_config.json"

    if not config_path.exists():
        raise FileNotFoundError(f"Configuration file not found: {config_path}")

    with open(config_path, "r") as f:
        data = json.load(f)

    products = data.get("products", [])
    conn = get_db_connection()
    count = 0
    with conn:
        for p in products:
            conn.execute("""
                INSERT INTO loan_products (
                    product_id, loan_type, product_name,
                    min_loan_amount, max_loan_amount,
                    min_credit_score, min_age, max_age,
                    interest_rate_min, interest_rate_max,
                    min_tenure_months, max_tenure_months
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(product_id) DO UPDATE SET
                    loan_type = excluded.loan_type,
                    product_name = excluded.product_name,
                    min_loan_amount = excluded.min_loan_amount,
                    max_loan_amount = excluded.max_loan_amount,
                    min_credit_score = excluded.min_credit_score,
                    min_age = excluded.min_age,
                    max_age = excluded.max_age,
                    interest_rate_min = excluded.interest_rate_min,
                    interest_rate_max = excluded.interest_rate_max,
                    min_tenure_months = excluded.min_tenure_months,
                    max_tenure_months = excluded.max_tenure_months;
            """, (
                p["product_id"], p["loan_type"], p["product_name"],
                float(p["min_loan_amount"]), float(p["max_loan_amount"]),
                int(p["min_credit_score"]), int(p["min_age"]), int(p["max_age"]),
                float(p["interest_rate_min"]), float(p["interest_rate_max"]),
                int(p["min_tenure_months"]), int(p["max_tenure_months"])
            ))
            count += 1
    conn.close()
    print(f"Successfully seeded {count} loan products.")


if __name__ == "__main__":
    seed_products()
