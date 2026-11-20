"""
LoanIQ Product & Hard Eligibility Services
Evaluates deterministic product eligibility rules according to loan_products_config.json.
"""

from typing import Dict, Any, List, Optional
from backend.app.database import get_db_connection


def get_all_products(loan_type: Optional[str] = None, version: str = "v2") -> List[Dict[str, Any]]:
    conn = get_db_connection(version)
    if loan_type:
        rows = conn.execute("""
            SELECT * FROM loan_products
            WHERE LOWER(loan_type) = LOWER(?)
            ORDER BY min_credit_score ASC, interest_rate_min ASC
        """, (loan_type.strip(),)).fetchall()
    else:
        rows = conn.execute("""
            SELECT * FROM loan_products
            ORDER BY loan_type ASC, min_credit_score ASC
        """).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_product_by_id(product_id: str, version: str = "v2") -> Optional[Dict[str, Any]]:
    conn = get_db_connection(version)
    row = conn.execute("SELECT * FROM loan_products WHERE product_id = ?", (product_id,)).fetchone()
    conn.close()
    if row:
        return dict(row)
    return None


def evaluate_product_eligibility(product: Dict[str, Any], applicant: Dict[str, Any], requested_amount: float) -> Dict[str, Any]:
    """
    Evaluates the 5 deterministic hard eligibility rules:
    1. loan_amount >= product.min_loan_amount
    2. loan_amount <= product.max_loan_amount
    3. credit_score >= product.min_credit_score
    4. age >= product.min_age
    5. age <= product.max_age
    """
    age = int(applicant["age"])
    credit_score = int(applicant["credit_score"])
    min_amount = float(product["min_loan_amount"])
    max_amount = float(product["max_loan_amount"])
    min_score = int(product["min_credit_score"])
    min_age = int(product["min_age"])
    max_age = int(product["max_age"])

    rule1 = requested_amount >= min_amount
    rule2 = requested_amount <= max_amount
    rule3 = credit_score >= min_score
    rule4 = age >= min_age
    rule5 = age <= max_age

    all_passed = rule1 and rule2 and rule3 and rule4 and rule5

    rules_detail = [
        {
            "rule": "min_loan_amount",
            "description": f"Loan amount must be at least ₹{min_amount:,.0f}",
            "passed": rule1,
            "actual": requested_amount,
            "threshold": min_amount
        },
        {
            "rule": "max_loan_amount",
            "description": f"Loan amount must not exceed ₹{max_amount:,.0f}",
            "passed": rule2,
            "actual": requested_amount,
            "threshold": max_amount
        },
        {
            "rule": "min_credit_score",
            "description": f"Credit score must be at least {min_score}",
            "passed": rule3,
            "actual": credit_score,
            "threshold": min_score
        },
        {
            "rule": "min_age",
            "description": f"Applicant age must be at least {min_age} years",
            "passed": rule4,
            "actual": age,
            "threshold": min_age
        },
        {
            "rule": "max_age",
            "description": f"Applicant age must not exceed {max_age} years",
            "passed": rule5,
            "actual": age,
            "threshold": max_age
        }
    ]

    failed_reasons = [r["description"] for r in rules_detail if not r["passed"]]

    return {
        "is_eligible": all_passed,
        "rules": rules_detail,
        "failed_reasons": failed_reasons
    }
