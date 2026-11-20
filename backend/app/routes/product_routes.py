"""
Loan Products Routes
"""

from flask import Blueprint, request, jsonify
from backend.app.database import resolve_version_from_request
from backend.app.services.eligibility_service import get_all_products, get_product_by_id

product_bp = Blueprint("products", __name__, url_prefix="/api/products")


@product_bp.route("", methods=["GET"])
def list_products():
    version = resolve_version_from_request(request)
    loan_type = request.args.get("loan_type")
    products = get_all_products(loan_type=loan_type, version=version)
    return jsonify({
        "success": True,
        "version": version,
        "count": len(products),
        "products": products
    }), 200


@product_bp.route("/<product_id>", methods=["GET"])
def get_product(product_id):
    version = resolve_version_from_request(request)
    prod = get_product_by_id(product_id, version=version)
    if not prod:
        return jsonify({"success": False, "error": f"Product not found in database {version}."}), 404
    return jsonify({
        "success": True,
        "version": version,
        "product": prod
    }), 200
