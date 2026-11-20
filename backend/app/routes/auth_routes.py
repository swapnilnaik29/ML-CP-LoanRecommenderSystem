"""
Authentication & Demo User Routes
"""

from flask import Blueprint, request, jsonify
from backend.app.database import resolve_version_from_request
from backend.app.services.applicant_service import (
    register_applicant, authenticate_user, list_sample_applicants, get_applicant_by_id
)

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json() or {}
    version = resolve_version_from_request(request)
    try:
        applicant = register_applicant(data, version=version)
        return jsonify({
            "success": True,
            "message": "Applicant registered successfully.",
            "version": version,
            "applicant": applicant,
            "data": applicant
        }), 201
    except ValueError as e:
        return jsonify({"success": False, "error": str(e)}), 400
    except Exception as e:
        return jsonify({"success": False, "error": f"Internal server error: {str(e)}"}), 500


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    version = resolve_version_from_request(request)
    identifier = data.get("identifier") or data.get("username") or data.get("pan_number")
    password = data.get("password", "")

    if not identifier:
        return jsonify({"success": False, "error": "PAN number, applicant ID, or email is required."}), 400

    applicant = authenticate_user(identifier, password, version=version)
    if applicant:
        return jsonify({
            "success": True,
            "message": "Login successful.",
            "version": version,
            "applicant": applicant,
            "data": applicant
        }), 200
    else:
        return jsonify({"success": False, "error": "Invalid identifier or password."}), 401


@auth_bp.route("/sample-users", methods=["GET"])
def sample_users():
    """Returns sample users from the selected version SQLite database for easy demo logins."""
    version = resolve_version_from_request(request)
    limit = int(request.args.get("limit", 20))
    users = list_sample_applicants(limit=limit, version=version)
    return jsonify({
        "success": True,
        "version": version,
        "sample_users": users
    }), 200
