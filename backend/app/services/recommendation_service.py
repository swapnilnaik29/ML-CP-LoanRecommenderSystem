"""
LoanIQ Recommendation Service
Evaluates product eligibility and invokes category-specific calibrated ML models (V1 or V2)
to rank products by predicted lender approval probability.
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
    category_details: Dict[str, Any],
    version: str = "v2"
) -> Dict[str, Any]:
    """
    Executes complete loan discovery workflow:
    1. Loads applicant profile from active version SQLite database.
    2. Retrieves products for the specified loan category.
    3. Evaluates hard eligibility rules for each product.
    4. For eligible products, prepares feature row matching active version schema (V1 or V2).
    5. Queries trained ML model for lender approval probability.
    6. Sorts eligible products by approval probability descending.
    7. Persists application and recommendation audit logs in SQLite.
    """
    version_clean = (version or "v1").lower().strip()
    is_v2 = version_clean in ("v2", "2")
    loan_type_clean = loan_type.lower().strip()

    applicant = get_applicant_by_id(applicant_id, version=version_clean)
    if not applicant:
        raise ValueError(f"Applicant {applicant_id} does not exist in database {version_clean}.")

    if requested_amount <= 0:
        raise ValueError("Requested loan amount must be positive.")
    if desired_tenure_months <= 0:
        raise ValueError("Desired tenure months must be positive.")

    products = get_all_products(loan_type=loan_type_clean, version=version_clean)
    if not products:
        raise ValueError(f"No products configured for category '{loan_type_clean}' in database {version_clean}.")

    app_uuid = uuid.uuid4().hex[:8].upper()
    v_prefix = "V2" if is_v2 else "V1"
    application_id = f"APP_{v_prefix}_{loan_type_clean.upper()}_{app_uuid}"

    eligible_recommendations = []
    ineligible_products = []
    db_records_to_save = []

    for product in products:
        eligibility = evaluate_product_eligibility(product, applicant, requested_amount)
        product_id = product["product_id"]
        product_name = product["product_name"]

        # Calculate interest rate and EMI
        if product.get("annual_interest_rate_pct"):
            avg_interest_rate = float(product["annual_interest_rate_pct"])
        else:
            avg_interest_rate = (float(product["interest_rate_min"]) + float(product["interest_rate_max"])) / 2.0

        monthly_emi = calculate_monthly_emi(requested_amount, avg_interest_rate, desired_tenure_months)

        if eligibility["is_eligible"]:
            if is_v2:
                # Build V2 feature dictionary matching reports/<category>_feature_schema.json
                # Title case for loan_type
                loan_type_title = loan_type_clean.capitalize()
                emp_type_raw = str(applicant["employment_type"]).replace("_", " ").title()
                if "Self" in emp_type_raw:
                    emp_type_clean = "Self-employed"
                elif "Salaried" in emp_type_raw:
                    emp_type_clean = "Salaried"
                elif "Business" in emp_type_raw:
                    emp_type_clean = "Business"
                else:
                    emp_type_clean = "Salaried"

                feature_dict = {
                    "product_id": product_id,
                    "loan_type": loan_type_title,
                    "applicant_age": int(applicant["age"]),
                    "monthly_income_inr": float(applicant["monthly_income_inr"]),
                    "employment_type": emp_type_clean,
                    "employment_experience_years": int(applicant["employment_experience_years"]),
                    "credit_score": int(applicant["credit_score"]),
                    "existing_emi_inr": float(applicant["existing_emi_inr"]),
                    "existing_active_loans": int(applicant["existing_active_loans"]),
                    "monthly_household_expenses_inr": float(applicant["monthly_household_expenses_inr"]),
                    "average_bank_balance_inr": float(applicant["average_bank_balance_inr"]),
                    "dependents": int(applicant["dependents"]),
                    "requested_loan_amount_inr": float(requested_amount),
                    "requested_tenure_months": int(desired_tenure_months),
                    "product_min_amount_inr": float(product["min_loan_amount"]),
                    "product_max_amount_inr": float(product["max_loan_amount"]),
                    "product_min_credit_score": int(product["min_credit_score"]),
                    "product_min_age": int(product["min_age"]),
                    "product_max_age": int(product["max_age"]),
                    "product_interest_rate_pct": float(avg_interest_rate),
                    "age_eligible": 1,
                    "credit_eligible": 1,
                    "amount_eligible": 1,
                    "hard_eligible": 1
                }

                # Add category-specific attributes with V2 schema naming
                if loan_type_clean == "car":
                    veh_price = float(category_details.get("vehicle_price") or category_details.get("vehicle_price_inr") or (requested_amount * 1.25))
                    dp = float(category_details.get("down_payment") or category_details.get("down_payment_inr") or max(0.0, veh_price - requested_amount))
                    veh_cond = str(category_details.get("vehicle_condition", "New")).title()
                    veh_type = str(category_details.get("vehicle_type", "Sedan")).title()
                    if veh_type not in ["Two-wheeler", "Sedan", "Hatchback", "SUV"]:
                        veh_type = "Sedan"
                    feature_dict["vehicle_price_inr"] = veh_price
                    feature_dict["down_payment_inr"] = dp
                    feature_dict["vehicle_condition"] = veh_cond
                    feature_dict["vehicle_type"] = veh_type

                elif loan_type_clean == "home":
                    prop_val = float(category_details.get("property_value") or category_details.get("property_value_inr") or (requested_amount * 1.25))
                    dp = float(category_details.get("down_payment") or category_details.get("down_payment_inr") or max(0.0, prop_val - requested_amount))
                    prop_type = str(category_details.get("property_type", "Apartment")).title()
                    if "House" in prop_type:
                        prop_type = "Independent house"
                    elif "Construction" in prop_type:
                        prop_type = "Under construction"
                    else:
                        prop_type = "Apartment"
                    city_tier = str(category_details.get("city_tier") or category_details.get("property_location") or "Tier 1").strip()
                    if "urban" in city_tier.lower() or "1" in city_tier:
                        city_tier = "Tier 1"
                    elif "semi" in city_tier.lower() or "2" in city_tier:
                        city_tier = "Tier 2"
                    else:
                        city_tier = "Tier 3"
                    feature_dict["property_value_inr"] = prop_val
                    feature_dict["down_payment_inr"] = dp
                    feature_dict["property_type"] = prop_type
                    feature_dict["city_tier"] = city_tier

                elif loan_type_clean == "education":
                    course_cost = float(category_details.get("course_cost") or category_details.get("total_course_cost") or requested_amount)
                    course_level = str(category_details.get("course_level", "Undergraduate")).title()
                    if "Doctor" in course_level:
                        course_level = "Doctoral"
                    elif "Post" in course_level:
                        course_level = "Postgraduate"
                    else:
                        course_level = "Undergraduate"
                    dest = str(category_details.get("study_destination") or category_details.get("study_location") or "India").title()
                    if "Abroad" in dest:
                        dest = "Abroad"
                    else:
                        dest = "India"
                    collateral = str(category_details.get("collateral_available") or category_details.get("collateral") or "No").capitalize()
                    feature_dict["course_cost_inr"] = course_cost
                    feature_dict["course_level"] = course_level
                    feature_dict["study_destination"] = dest
                    feature_dict["collateral_available"] = collateral if collateral in ["Yes", "No"] else "No"

                elif loan_type_clean == "personal":
                    purpose = str(category_details.get("loan_purpose", "Other")).replace("_", " ").title()
                    if "Consolidation" in purpose:
                        purpose = "Debt consolidation"
                    elif "Wedding" in purpose:
                        purpose = "Wedding"
                    elif "Medical" in purpose:
                        purpose = "Medical"
                    elif "Travel" in purpose:
                        purpose = "Travel"
                    elif "Home" in purpose:
                        purpose = "Home improvement"
                    else:
                        purpose = "Other"
                    co_app = str(category_details.get("co_applicant", "No")).capitalize()
                    feature_dict["loan_purpose"] = purpose
                    feature_dict["co_applicant"] = co_app if co_app in ["Yes", "No"] else "No"

            else:
                # Build V1 feature dictionary matching ml/schemas/feature_schemas.json
                feature_dict = {
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
                feature_dict.update(category_details)

            # Predict approval probability with ML model (V1 or V2)
            try:
                prob, model_version = predict_approval_probability(loan_type_clean, feature_dict, version=version_clean)
            except Exception as e:
                prob = 0.50
                model_version = f"Inference Warning: {str(e)}"

            total_payment = round(monthly_emi * desired_tenure_months, 2)
            total_interest = round(total_payment - requested_amount, 2)

            rec_item = {
                "product_id": product_id,
                "product_name": product_name,
                "loan_type": product["loan_type"],
                "interest_rate_range": f"{product.get('interest_rate_min', avg_interest_rate)}% - {product.get('interest_rate_max', avg_interest_rate)}%",
                "interest_rate_annual": avg_interest_rate,
                "tenure_range_months": f"{product.get('min_tenure_months', 12)} - {product['max_tenure_months']} months",
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
                "interest_rate_range": f"{product.get('interest_rate_min', avg_interest_rate)}% - {product.get('interest_rate_max', avg_interest_rate)}%",
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

    # Save to active SQLite database
    conn = get_db_connection(version_clean)
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
        "model_version_used": f"V2 Retrained Package" if is_v2 else "V1 Original Calibrated",
        "database_used": f"loaniq_{version_clean}.db",
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
