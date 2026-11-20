"""
LoanIQ Backend Application Server Runner
"""

import sys
from pathlib import Path

# Set project root in path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from backend.app import create_app

app = create_app()

if __name__ == "__main__":
    print("Starting LoanIQ Backend API Server on http://127.0.0.1:5000 ...")
    app.run(host="127.0.0.1", port=5000, debug=True)
