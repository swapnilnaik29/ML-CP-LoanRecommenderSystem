"""
Loan Optimizer Routes
"""

from flask import Blueprint, request, jsonify
from backend.app.services.optimizer_service import simulate_loan_repayment

optimizer_bp = Blueprint("optimizer", __name__, url_prefix="/api/optimizer")


@optimizer_bp.route("/simulate", methods=["POST"])
def simulate():
    data = request.get_json() or {}
    loan_account_id = data.get("loan_account_id")
    proposed_emi = data.get("proposed_emi")

    if not loan_account_id:
        return jsonify({"success": False, "error": "loan_account_id is required."}), 400
    if proposed_emi is None:
        return jsonify({"success": False, "error": "proposed_emi is required."}), 400

    try:
        proposed_emi_float = float(proposed_emi)
        result = simulate_loan_repayment(loan_account_id, proposed_emi_float)
        return jsonify({
            "success": True,
            "simulation": result
        }), 200
    except ValueError as e:
        return jsonify({"success": False, "error": str(e)}), 400
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
