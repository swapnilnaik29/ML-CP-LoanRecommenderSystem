"""
Loan Products Routes
"""

from flask import Blueprint, request, jsonify
from backend.app.services.eligibility_service import get_all_products, get_product_by_id

product_bp = Blueprint("products", __name__, url_prefix="/api/products")


@product_bp.route("", methods=["GET"])
def list_products():
    loan_type = request.args.get("loan_type")
    products = get_all_products(loan_type=loan_type)
    return jsonify({
        "success": True,
        "count": len(products),
        "products": products
    }), 200


@product_bp.route("/<product_id>", methods=["GET"])
def get_product(product_id):
    prod = get_product_by_id(product_id)
    if not prod:
        return jsonify({"success": False, "error": "Product not found."}), 404
    return jsonify({"success": True, "product": prod}), 200
