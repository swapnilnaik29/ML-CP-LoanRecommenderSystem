"""
Loan Optimizer Routes
"""

from flask import Blueprint, request, jsonify
from backend.app.database import resolve_version_from_request
from backend.app.services.optimizer_service import simulate_loan_repayment

optimizer_bp = Blueprint("optimizer", __name__, url_prefix="/api/optimizer")


@optimizer_bp.route("/simulate", methods=["POST"])
def simulate():
    data = request.get_json() or {}
    version = resolve_version_from_request(request)
    loan_account_id = data.get("loan_account_id")
    proposed_emi = data.get("proposed_emi")
    lump_sum_payment = data.get("lump_sum_payment", 0.0)

    if not loan_account_id:
        return jsonify({"success": False, "error": "loan_account_id is required."}), 400
    if proposed_emi is None:
        return jsonify({"success": False, "error": "proposed_emi is required."}), 400

    try:
        proposed_emi_float = float(proposed_emi)
        lump_sum_float = float(lump_sum_payment or 0.0)
        result = simulate_loan_repayment(
            loan_account_id, 
            proposed_emi_float, 
            lump_sum_payment=lump_sum_float, 
            version=version
        )
        return jsonify({
            "success": True,
            "version": version,
            "simulation": result
        }), 200
    except ValueError as e:
        return jsonify({"success": False, "error": str(e)}), 400
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
