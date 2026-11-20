"""
Initialize the LoanIQ SQLite Database
"""

import sys
from pathlib import Path

# Add project root to sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from backend.app.database import init_db, get_db_path


def main():
    print(f"Initializing database at: {get_db_path()}")
    init_db()
    print("Database tables and indexes created successfully.")


if __name__ == "__main__":
    main()
