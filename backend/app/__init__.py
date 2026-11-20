"""
LoanIQ Flask Application Factory
Serves both REST API endpoints (/api/*) and static HTML/CSS/JS frontend
"""

import os
from pathlib import Path
from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
from backend.app.database import init_db
from backend.app.routes.auth_routes import auth_bp
from backend.app.routes.applicant_routes import applicant_bp
from backend.app.routes.product_routes import product_bp
from backend.app.routes.loan_routes import loan_bp
from backend.app.routes.recommendation_routes import rec_bp
from backend.app.routes.optimizer_routes import optimizer_bp


def create_app():
    BASE_DIR = Path(__file__).resolve().parent.parent.parent
    frontend_dir = BASE_DIR / "frontend"

    app = Flask(__name__, static_folder=str(frontend_dir), static_url_path="")
    CORS(app, resources={r"/*": {"origins": "*"}})

    # Ensure DB is initialized
    init_db()

    # Register API blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(applicant_bp)
    app.register_blueprint(product_bp)
    app.register_blueprint(loan_bp)
    app.register_blueprint(rec_bp)
    app.register_blueprint(optimizer_bp)

    @app.route("/api/health", methods=["GET"])
    def health():
        return jsonify({
            "status": "healthy",
            "app": "LoanIQ",
            "version": "1.0.0"
        }), 200

    # Serve static frontend directly
    @app.route("/", methods=["GET"])
    def serve_index():
        return send_from_directory(str(frontend_dir), "index.html")

    @app.route("/<path:path>", methods=["GET"])
    def serve_static(path):
        target = frontend_dir / path
        if target.exists() and target.is_file():
            return send_from_directory(str(frontend_dir), path)
        return send_from_directory(str(frontend_dir), "index.html")

    return app
