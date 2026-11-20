"""
Applicant & Profile Routes
"""

from flask import Blueprint, request, jsonify
from backend.app.database import resolve_version_from_request
from backend.app.services.applicant_service import get_applicant_by_id, update_applicant
from backend.app.services.existing_loan_service import get_loans_for_applicant

applicant_bp = Blueprint("applicant", __name__, url_prefix="/api/applicant")


@applicant_bp.route("/<applicant_id>", methods=["GET"])
def get_profile(applicant_id):
    version = resolve_version_from_request(request)
    applicant = get_applicant_by_id(applicant_id, version=version)
    if not applicant:
        return jsonify({"success": False, "error": f"Applicant not found in database {version}."}), 404
    return jsonify({
        "success": True,
        "version": version,
        "applicant": applicant
    }), 200


@applicant_bp.route("/<applicant_id>/update", methods=["PUT", "POST"])
def update_profile(applicant_id):
    data = request.get_json() or {}
    version = resolve_version_from_request(request)
    try:
        updated = update_applicant(applicant_id, data, version=version)
        return jsonify({
            "success": True,
            "message": "Applicant profile updated successfully.",
            "version": version,
            "applicant": updated
        }), 200
    except ValueError as e:
        return jsonify({"success": False, "error": str(e)}), 400
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@applicant_bp.route("/<applicant_id>/dashboard", methods=["GET"])
def get_dashboard(applicant_id):
    version = resolve_version_from_request(request)
    applicant = get_applicant_by_id(applicant_id, version=version)
    if not applicant:
        return jsonify({"success": False, "error": f"Applicant not found in database {version}."}), 404

    loans = get_loans_for_applicant(applicant_id, version=version)
    active_loans = [l for l in loans if l["status"].lower() == "active"]

    total_active_emi = sum(float(l["emi_inr"]) for l in active_loans)
    total_remaining_principal = sum(float(l["remaining_loan_amount_inr"]) for l in active_loans)

    return jsonify({
        "success": True,
        "version": version,
        "dashboard": {
            "applicant": applicant,
            "total_active_loans": len(active_loans),
            "total_monthly_emi": total_active_emi,
            "total_remaining_principal": total_remaining_principal,
            "active_loans": active_loans
        }
    }), 200
