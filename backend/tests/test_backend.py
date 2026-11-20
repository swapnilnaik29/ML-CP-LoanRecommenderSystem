"""
Comprehensive Automated Tests for LoanIQ Backend
Tests database persistence, applicant registration, authentication,
existing loan management, aggregate reconciliation, hard eligibility rules,
ML inference on all 4 models, and repayment optimiser amortisation mathematics.
"""

import sys
import unittest
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(BASE_DIR))

from backend.app import create_app
from backend.app.database import get_db_connection
from backend.app.services.applicant_service import register_applicant, authenticate_user, get_applicant_by_id
from backend.app.services.existing_loan_service import get_loans_for_applicant, add_existing_loan
from backend.app.services.eligibility_service import get_all_products, evaluate_product_eligibility
from backend.app.services.optimizer_service import calculate_amortisation_schedule, simulate_loan_repayment
from backend.app.services.recommendation_service import discover_recommendations


class LoanIQBackendTests(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.app = create_app()
        cls.client = cls.app.test_client()

    def test_01_health_endpoint(self):
        res = self.client.get("/api/health")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data["app"], "LoanIQ")
        self.assertEqual(data["status"], "healthy")

    def test_02_database_seeded_data(self):
        conn = get_db_connection()
        prod_count = conn.execute("SELECT COUNT(*) FROM loan_products").fetchone()[0]
        app_count = conn.execute("SELECT COUNT(*) FROM applicants").fetchone()[0]
        loan_count = conn.execute("SELECT COUNT(*) FROM existing_loans").fetchone()[0]
        conn.close()

        self.assertEqual(prod_count, 16, "Must have exactly 16 seeded products")
        self.assertGreaterEqual(app_count, 100, "Must have at least 100 imported applicants")
        self.assertGreaterEqual(loan_count, 131, "Must have at least 131 imported loans")

    def test_03_registration_and_duplicate_pan(self):
        test_pan = "TESTP9999Z"
        reg_data = {
            "full_name": "Test User LoanIQ",
            "pan_number": test_pan,
            "age": 30,
            "monthly_income_inr": 75000,
            "employment_type": "salaried",
            "employment_experience_years": 6,
            "credit_score": 750,
            "existing_emi_inr": 0,
            "existing_active_loans": 0,
            "monthly_household_expenses_inr": 25000,
            "average_bank_balance_inr": 150000,
            "dependents": 1,
            "password": "securePassword123"
        }

        # Check if already exists from prior run and clean if needed
        conn = get_db_connection()
        conn.execute("DELETE FROM applicants WHERE pan_number = ?", (test_pan,))
        conn.commit()
        conn.close()

        # First registration should succeed
        app = register_applicant(reg_data)
        self.assertIsNotNone(app)
        self.assertEqual(app["pan_number"], test_pan)

        # Second registration with same PAN must fail
        with self.assertRaises(ValueError):
            register_applicant(reg_data)

    def test_04_authentication(self):
        # Authenticate using synthetic demo user USR0001
        user = authenticate_user("USR0001", "demo1234")
        self.assertIsNotNone(user)
        self.assertEqual(user["applicant_id"], "USR0001")

        # Authenticate using PAN
        user_by_pan = authenticate_user("ZZZP0001A", "demo1234")
        self.assertIsNotNone(user_by_pan)
        self.assertEqual(user_by_pan["applicant_id"], "USR0001")

        # Invalid password
        bad_user = authenticate_user("USR0001", "wrong_password_999")
        self.assertIsNone(bad_user)

    def test_05_add_existing_loan_and_reconcile_aggregate(self):
        # Fetch initial state for USR0001
        initial_app = get_applicant_by_id("USR0001")
        initial_loans_count = initial_app["existing_active_loans"]
        initial_total_emi = initial_app["existing_emi_inr"]

        # Add a new active loan
        new_loan = add_existing_loan("USR0001", {
            "loan_type": "Personal",
            "loan_amount_inr": 50000,
            "annual_interest_rate_pct": 12.0,
            "original_tenure_months": 12,
            "emi_inr": 4442.44,
            "remaining_loan_amount_inr": 40000,
            "remaining_tenure_months": 10,
            "status": "active"
        })

        self.assertIsNotNone(new_loan)
        self.assertEqual(new_loan["applicant_id"], "USR0001")

        # Re-check applicant aggregate in SQLite
        updated_app = get_applicant_by_id("USR0001")
        self.assertEqual(updated_app["existing_active_loans"], initial_loans_count + 1)
        self.assertAlmostEqual(updated_app["existing_emi_inr"], initial_total_emi + 4442.44, places=1)

    def test_06_hard_eligibility_rules(self):
        products = get_all_products(loan_type="car")
        car_product = [p for p in products if p["product_id"] == "CAR01"][0]  # min: 100k, max: 800k, min_score: 650, min_age: 21, max_age: 60

        # Scenario A: Eligible applicant
        applicant_ok = {"age": 30, "credit_score": 700}
        res_ok = evaluate_product_eligibility(car_product, applicant_ok, requested_amount=300000)
        self.assertTrue(res_ok["is_eligible"])
        self.assertEqual(len(res_ok["failed_reasons"]), 0)

        # Scenario B: Amount exceeds max
        res_high_amount = evaluate_product_eligibility(car_product, applicant_ok, requested_amount=1000000)
        self.assertFalse(res_high_amount["is_eligible"])
        self.assertIn("max_loan_amount", [r["rule"] for r in res_high_amount["rules"] if not r["passed"]])

        # Scenario C: Credit score too low
        applicant_low_score = {"age": 30, "credit_score": 600}
        res_low_score = evaluate_product_eligibility(car_product, applicant_low_score, requested_amount=300000)
        self.assertFalse(res_low_score["is_eligible"])
        self.assertIn("min_credit_score", [r["rule"] for r in res_low_score["rules"] if not r["passed"]])

    def test_07_optimizer_amortisation_math(self):
        # Principal = 100,000, Annual Rate = 12%, Monthly rate = 1%
        # Accrued monthly interest = 1,000
        # If proposed EMI <= 1,000: must raise ValueError
        with self.assertRaises(ValueError):
            calculate_amortisation_schedule(principal=100000, annual_rate_pct=12.0, monthly_emi=1000)

        with self.assertRaises(ValueError):
            calculate_amortisation_schedule(principal=100000, annual_rate_pct=12.0, monthly_emi=800)

        # Proposed EMI = 10,000 (standard 11-month payoff)
        sched = calculate_amortisation_schedule(principal=100000, annual_rate_pct=12.0, monthly_emi=10000)
        self.assertGreater(sched["months_to_payoff"], 0)
        self.assertLessEqual(sched["months_to_payoff"], 12)
        self.assertGreater(sched["total_interest_payable"], 0)
        self.assertAlmostEqual(sched["total_repayment_amount"], 100000 + sched["total_interest_payable"], places=2)

    def test_08_repayment_simulation_with_baseline(self):
        conn = get_db_connection()
        loan = conn.execute("SELECT * FROM existing_loans WHERE remaining_loan_amount_inr > 10000 LIMIT 1").fetchone()
        conn.close()
        self.assertIsNotNone(loan)

        loan_id = loan["loan_account_id"]
        current_emi = float(loan["emi_inr"])
        proposed_higher_emi = current_emi + 2000

        sim = simulate_loan_repayment(loan_id, proposed_higher_emi)
        self.assertEqual(sim["loan_account_id"], loan_id)
        self.assertIn("baseline", sim)
        self.assertIn("proposed", sim)
        self.assertIn("savings", sim)
        # Higher EMI should reduce remaining tenure and save interest
        self.assertGreater(sim["savings"]["interest_saved"], 0)
        self.assertGreaterEqual(sim["savings"]["tenure_months_saved"], 0)

    def test_09_all_four_ml_discovery_flows(self):
        # Use USR0001 (credit score 633, age 40)
        # Update credit score temporarily to 750 for broad eligibility testing
        conn = get_db_connection()
        conn.execute("UPDATE applicants SET credit_score = 750 WHERE applicant_id = 'USR0001'")
        conn.commit()
        conn.close()

        # 1. Car Loan Discovery
        car_res = discover_recommendations(
            applicant_id="USR0001",
            loan_type="car",
            requested_amount=400000,
            desired_tenure_months=36,
            category_details={
                "vehicle_price": 500000,
                "vehicle_age_years": 1,
                "vehicle_type": "sedan",
                "vehicle_condition": "new",
                "fuel_type": "petrol"
            }
        )
        self.assertGreater(car_res["total_eligible"], 0)
        top_car = car_res["eligible_recommendations"][0]
        self.assertIn("predicted_approval_probability", top_car)
        self.assertGreaterEqual(top_car["predicted_approval_probability"], 0.0)
        self.assertLessEqual(top_car["predicted_approval_probability"], 1.0)

        # 2. Home Loan Discovery
        home_res = discover_recommendations(
            applicant_id="USR0001",
            loan_type="home",
            requested_amount=2500000,
            desired_tenure_months=120,
            category_details={
                "property_value": 3500000,
                "property_age_years": 2,
                "co_applicant": 1,
                "co_applicant_monthly_income": 40000,
                "property_type": "apartment",
                "property_location": "urban",
                "property_status": "ready_to_move"
            }
        )
        self.assertGreater(home_res["total_eligible"], 0)
        top_home = home_res["eligible_recommendations"][0]
        self.assertIn("predicted_approval_probability", top_home)

        # 3. Education Loan Discovery
        edu_res = discover_recommendations(
            applicant_id="USR0001",
            loan_type="education",
            requested_amount=800000,
            desired_tenure_months=60,
            category_details={
                "course_duration_years": 2,
                "total_course_cost": 1000000,
                "scholarship_amount": 100000,
                "co_applicant": 1,
                "co_applicant_monthly_income": 30000,
                "course_level": "postgraduate",
                "course_field": "engineering",
                "institution_type": "private",
                "institution_tier": "tier_1",
                "study_location": "India"
            }
        )
        self.assertGreater(edu_res["total_eligible"], 0)
        top_edu = edu_res["eligible_recommendations"][0]
        self.assertIn("predicted_approval_probability", top_edu)

        # 4. Personal Loan Discovery
        per_res = discover_recommendations(
            applicant_id="USR0001",
            loan_type="personal",
            requested_amount=200000,
            desired_tenure_months=24,
            category_details={
                "loan_purpose": "home_renovation",
                "marital_status": "married"
            }
        )
        self.assertGreater(per_res["total_eligible"], 0)
        top_per = per_res["eligible_recommendations"][0]
        self.assertIn("predicted_approval_probability", top_per)


if __name__ == "__main__":
    unittest.main()
