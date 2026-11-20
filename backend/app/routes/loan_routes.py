"""
Existing Loans Routes
"""

from flask import Blueprint, request, jsonify
from backend.app.database import resolve_version_from_request
from backend.app.services.existing_loan_service import get_loans_for_applicant, add_existing_loan

loan_bp = Blueprint("loans", __name__, url_prefix="/api/loans")


@loan_bp.route("/applicant/<applicant_id>", methods=["GET"])
def list_user_loans(applicant_id):
    version = resolve_version_from_request(request)
    loans = get_loans_for_applicant(applicant_id, version=version)
    return jsonify({
        "success": True,
        "version": version,
        "count": len(loans),
        "loans": loans
    }), 200


@loan_bp.route("/add", methods=["POST"])
def add_loan():
    data = request.get_json() or {}
    version = resolve_version_from_request(request)
    applicant_id = data.get("applicant_id")
    if not applicant_id:
        return jsonify({"success": False, "error": "applicant_id is required."}), 400

    try:
        new_loan = add_existing_loan(applicant_id, data, version=version)
        return jsonify({
            "success": True,
            "message": "Existing loan added and applicant aggregates updated.",
            "version": version,
            "loan": new_loan
        }), 201
    except ValueError as e:
        return jsonify({"success": False, "error": str(e)}), 400
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
