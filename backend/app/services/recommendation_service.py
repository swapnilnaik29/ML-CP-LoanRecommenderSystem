"""
LoanIQ Recommendation Service
Evaluates product eligibility and invokes category-specific calibrated ML models to rank products by approval probability.
"""

import json
import uuid
from datetime import datetime
from typing import Dict, Any, List, Optional
from backend.app.database import get_db_connection
from backend.app.services.applicant_service import get_applicant_by_id
from backend.app.services.eligibility_service import get_all_products, evaluate_product_eligibility
from ml.model_service import predict_approval_probability, calculate_monthly_emi


def discover_recommendations(
    applicant_id: str,
    loan_type: str,
    requested_amount: float,
    desired_tenure_months: int,
    category_details: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Executes complete loan discovery workflow:
    1. Loads applicant profile from SQLite.
    2. Retrieves products for the specified loan category.
    3. Evaluates hard eligibility rules for each product.
    4. For eligible products, prepares feature row and queries trained ML model for lender approval probability.
    5. Sorts eligible products by approval probability descending.
    6. Persists application and recommendation audit logs in SQLite.
    """
    loan_type_clean = loan_type.lower().strip()
    applicant = get_applicant_by_id(applicant_id)
    if not applicant:
        raise ValueError(f"Applicant {applicant_id} does not exist.")

    if requested_amount <= 0:
        raise ValueError("Requested loan amount must be positive.")
    if desired_tenure_months <= 0:
        raise ValueError("Desired tenure months must be positive.")

    products = get_all_products(loan_type=loan_type_clean)
    if not products:
        raise ValueError(f"No products configured for category '{loan_type_clean}'.")

    # Generate application ID
    app_uuid = uuid.uuid4().hex[:8].upper()
    application_id = f"APP_{loan_type_clean.upper()}_{app_uuid}"

    eligible_recommendations = []
    ineligible_products = []
    db_records_to_save = []

    for product in products:
        eligibility = evaluate_product_eligibility(product, applicant, requested_amount)
        product_id = product["product_id"]
        product_name = product["product_name"]

        avg_interest_rate = (product["interest_rate_min"] + product["interest_rate_max"]) / 2.0
        # Calculate monthly EMI for this product
        monthly_emi = calculate_monthly_emi(requested_amount, avg_interest_rate, desired_tenure_months)

        if eligibility["is_eligible"]:
            # Build feature dictionary for ML model
            feature_dict = {
                # Common applicant features
                "age": applicant["age"],
                "monthly_income": applicant["monthly_income_inr"],
                "employment_type": applicant["employment_type"],
                "employment_experience_years": applicant["employment_experience_years"],
                "credit_score": applicant["credit_score"],
                "existing_emi": applicant["existing_emi_inr"],
                "existing_active_loans": applicant["existing_active_loans"],
                "monthly_household_expenses": applicant["monthly_household_expenses_inr"],
                "average_bank_balance": applicant["average_bank_balance_inr"],
                "dependents": applicant["dependents"],
                # Common product/request features
                "loan_amount": requested_amount,
                "tenure_months": desired_tenure_months,
                "interest_rate_annual": avg_interest_rate,
                "monthly_emi": monthly_emi,
                "product_id": product_id,
                "product_name": product_name,
                "min_credit_score_required": product["min_credit_score"],
                "credit_score_eligible": 1,
                "min_age_required": product["min_age"],
                "max_age_allowed": product["max_age"],
                "age_eligible": 1,
                "min_loan_amount_allowed": product["min_loan_amount"],
                "max_loan_amount_allowed": product["max_loan_amount"],
                "loan_amount_eligible": 1,
            }

            # Add category-specific features from category_details
            feature_dict.update(category_details)

            # Predict approval probability with ML model
            try:
                prob, model_version = predict_approval_probability(loan_type_clean, feature_dict)
            except Exception as e:
                # Log error and provide fallback probability with clear flag
                prob = 0.50
                model_version = f"Inference Error: {str(e)}"

            total_payment = round(monthly_emi * desired_tenure_months, 2)
            total_interest = round(total_payment - requested_amount, 2)

            rec_item = {
                "product_id": product_id,
                "product_name": product_name,
                "loan_type": product["loan_type"],
                "interest_rate_range": f"{product['interest_rate_min']}% - {product['interest_rate_max']}%",
                "interest_rate_annual": avg_interest_rate,
                "tenure_range_months": f"{product['min_tenure_months']} - {product['max_tenure_months']} months",
                "min_loan_amount": product["min_loan_amount"],
                "max_loan_amount": product["max_loan_amount"],
                "estimated_monthly_emi": monthly_emi,
                "estimated_total_interest": total_interest,
                "estimated_total_payment": total_payment,
                "predicted_approval_probability": round(prob, 4),
                "approval_percentage": f"{prob * 100:.1f}%",
                "is_eligible": True,
                "eligibility_reasons": eligibility["rules"],
                "model_version": model_version,
                "processing_fee_est": f"₹{max(1000, round(requested_amount * 0.0075)):,}"
            }
            eligible_recommendations.append(rec_item)

            db_records_to_save.append({
                "product_id": product_id,
                "is_eligible": 1,
                "reasons_json": json.dumps(eligibility["rules"]),
                "probability": prob,
                "estimated_emi": monthly_emi,
                "model_version": model_version
            })
        else:
            ineligible_item = {
                "product_id": product_id,
                "product_name": product_name,
                "loan_type": product["loan_type"],
                "interest_rate_range": f"{product['interest_rate_min']}% - {product['interest_rate_max']}%",
                "min_loan_amount": product["min_loan_amount"],
                "max_loan_amount": product["max_loan_amount"],
                "is_eligible": False,
                "failed_reasons": eligibility["failed_reasons"],
                "eligibility_reasons": eligibility["rules"]
            }
            ineligible_products.append(ineligible_item)

            db_records_to_save.append({
                "product_id": product_id,
                "is_eligible": 0,
                "reasons_json": json.dumps(eligibility["rules"]),
                "probability": None,
                "estimated_emi": monthly_emi,
                "model_version": "N/A (Ineligible)"
            })

    # Sort eligible recommendations descending by approval probability
    eligible_recommendations.sort(key=lambda x: x["predicted_approval_probability"], reverse=True)

    # Save to SQLite
    conn = get_db_connection()
    with conn:
        conn.execute("""
            INSERT INTO loan_applications (
                application_id, applicant_id, loan_type,
                requested_amount, desired_tenure_months,
                category_details_json
            ) VALUES (?, ?, ?, ?, ?, ?)
        """, (
            application_id, applicant_id, loan_type_clean,
            requested_amount, desired_tenure_months,
            json.dumps(category_details)
        ))

        for rec in db_records_to_save:
            conn.execute("""
                INSERT INTO loan_recommendations (
                    application_id, product_id, is_eligible,
                    eligibility_reasons_json, predicted_approval_probability,
                    estimated_emi, model_version
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                application_id, rec["product_id"], rec["is_eligible"],
                rec["reasons_json"], rec["probability"],
                rec["estimated_emi"], rec["model_version"]
            ))
    conn.close()

    return {
        "application_id": application_id,
        "loan_type": loan_type_clean,
        "requested_amount": requested_amount,
        "desired_tenure_months": desired_tenure_months,
        "applicant_id": applicant_id,
        "applicant_name": applicant["full_name"],
        "credit_score": applicant["credit_score"],
        "eligible_recommendations": eligible_recommendations,
        "ineligible_products": ineligible_products,
        "total_eligible": len(eligible_recommendations),
        "total_ineligible": len(ineligible_products),
        "disclaimer": "Approval probabilities are statistical estimates from machine-learning models trained on synthetic benchmark data. They do not constitute a credit guarantee or financial advice."
    }
