"""
Recommendation & Discovery Routes
"""

from flask import Blueprint, request, jsonify
from backend.app.services.recommendation_service import discover_recommendations

rec_bp = Blueprint("recommendations", __name__, url_prefix="/api/recommendations")


@rec_bp.route("/discover", methods=["POST"])
def discover():
    data = request.get_json() or {}
    applicant_id = data.get("applicant_id")
    loan_type = data.get("loan_type")

    if not applicant_id:
        return jsonify({"success": False, "error": "applicant_id is required."}), 400
    if not loan_type:
        return jsonify({"success": False, "error": "loan_type is required ('car', 'home', 'education', or 'personal')."}), 400

    try:
        requested_amount = float(data.get("requested_amount", 0))
        desired_tenure = int(data.get("desired_tenure_months", 36))
    except (ValueError, TypeError) as e:
        return jsonify({"success": False, "error": "Invalid requested amount or tenure."}), 400

    category_details = data.get("category_details", {})

    try:
        results = discover_recommendations(
            applicant_id=applicant_id,
            loan_type=loan_type,
            requested_amount=requested_amount,
            desired_tenure_months=desired_tenure,
            category_details=category_details
        )
        return jsonify({
            "success": True,
            "data": results
        }), 200
    except ValueError as e:
        return jsonify({"success": False, "error": str(e)}), 400
    except Exception as e:
        return jsonify({"success": False, "error": f"Recommendation error: {str(e)}"}), 500
