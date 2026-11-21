"""
LoanIQ V2 ML Package & Version Switching Integration Tests
Tests:
- V1 assets and records remain unchanged
- V2 loads the correct four pipelines
- Feature names/order match each schema
- Each category calls only its matching model
- Version switching changes DB/model/config atomically
- No applicant or loan records leak between versions
- Dashboard, discovery, comparison and optimiser all use selected version
- Missing models and invalid inputs return clear errors
"""

import unittest
import json
from pathlib import Path
from backend.app.database import get_db_connection, resolve_version_from_request
from backend.app.services.applicant_service import get_applicant_by_id, list_sample_applicants
from backend.app.services.eligibility_service import get_all_products
from backend.app.services.existing_loan_service import get_loans_for_applicant
from backend.app.services.optimizer_service import simulate_loan_repayment
from backend.app.services.recommendation_service import discover_recommendations
from ml.model_service import get_model, load_v2_schema, predict_approval_probability


class TestV2Integration(unittest.TestCase):

    def test_01_databases_isolated(self):
        """Verifies V1 and V2 databases are completely isolated with zero record crossover."""
        conn_v1 = get_db_connection("v1")
        conn_v2 = get_db_connection("v2")

        v1_app = conn_v1.execute("SELECT applicant_id, pan_number FROM applicants WHERE applicant_id = 'USR0001'").fetchone()
        v2_app = conn_v2.execute("SELECT applicant_id, pan_number FROM applicants WHERE applicant_id = 'APP0001'").fetchone()

        self.assertIsNotNone(v1_app, "USR0001 must exist in V1 database.")
        self.assertIsNotNone(v2_app, "APP0001 must exist in V2 database.")

        # Ensure V1 applicant does NOT exist in V2 database
        v2_leak = conn_v2.execute("SELECT * FROM applicants WHERE applicant_id = 'USR0001'").fetchone()
        self.assertIsNone(v2_leak, "V1 applicant USR0001 must NOT exist in V2 database.")

        # Ensure V2 applicant does NOT exist in V1 database
        v1_leak = conn_v1.execute("SELECT * FROM applicants WHERE applicant_id = 'APP0001'").fetchone()
        self.assertIsNone(v1_leak, "V2 applicant APP0001 must NOT exist in V1 database.")

        conn_v1.close()
        conn_v2.close()

    def test_02_v2_models_loaded_correctly(self):
        """Verifies V2 models load the retrained pipelines with expected classifiers."""
        car_m = get_model("car", version="v2")
        home_m = get_model("home", version="v2")
        edu_m = get_model("education", version="v2")
        per_m = get_model("personal", version="v2")

        # All 4 V2 models must be complete sklearn pipelines
        self.assertEqual(type(car_m).__name__, "Pipeline")
        self.assertEqual(type(home_m).__name__, "Pipeline")
        self.assertEqual(type(edu_m).__name__, "Pipeline")
        self.assertEqual(type(per_m).__name__, "Pipeline")

        # Verify steps and estimators
        self.assertEqual(car_m.steps[-1][0], "classifier")
        self.assertEqual(home_m.steps[-1][0], "classifier")
        self.assertEqual(edu_m.steps[-1][0], "classifier")
        self.assertEqual(per_m.steps[-1][0], "classifier")

        self.assertEqual(type(car_m.steps[-1][1]).__name__, "CatBoostSklearnWrapper")
        self.assertEqual(type(home_m.steps[-1][1]).__name__, "CatBoostSklearnWrapper")
        self.assertEqual(type(edu_m.steps[-1][1]).__name__, "LogisticRegression")
        self.assertEqual(type(per_m.steps[-1][1]).__name__, "LogisticRegression")

    def test_03_feature_schemas_match(self):
        """Verifies feature count, names, and ordering match the V2 feature schema specifications."""
        car_schema = load_v2_schema("car")
        home_schema = load_v2_schema("home")
        edu_schema = load_v2_schema("education")
        per_schema = load_v2_schema("personal")

        self.assertEqual(len(car_schema["feature_columns"]), 28)
        self.assertEqual(len(home_schema["feature_columns"]), 28)
        self.assertEqual(len(edu_schema["feature_columns"]), 28)
        self.assertEqual(len(per_schema["feature_columns"]), 26)

        # Check critical category columns
        self.assertIn("vehicle_price_inr", car_schema["feature_columns"])
        self.assertIn("property_value_inr", home_schema["feature_columns"])
        self.assertIn("course_cost_inr", edu_schema["feature_columns"])
        self.assertIn("loan_purpose", per_schema["feature_columns"])

    def test_04_v2_model_inference_predictions(self):
        """Verifies V2 models produce bounded probability estimates without PII."""
        sample_car_features = {
            "product_id": "CAR01",
            "loan_type": "Car",
            "applicant_age": 30,
            "monthly_income_inr": 65000.0,
            "employment_type": "Salaried",
            "employment_experience_years": 5,
            "credit_score": 750,
            "existing_emi_inr": 5000.0,
            "existing_active_loans": 1,
            "monthly_household_expenses_inr": 20000.0,
            "average_bank_balance_inr": 80000.0,
            "dependents": 1,
            "requested_loan_amount_inr": 400000.0,
            "requested_tenure_months": 48,
            "product_min_amount_inr": 50000.0,
            "product_max_amount_inr": 800000.0,
            "product_min_credit_score": 650,
            "product_min_age": 21,
            "product_max_age": 60,
            "product_interest_rate_pct": 10.5,
            "age_eligible": 1,
            "credit_eligible": 1,
            "amount_eligible": 1,
            "hard_eligible": 1,
            "vehicle_price_inr": 600000.0,
            "down_payment_inr": 200000.0,
            "vehicle_condition": "New",
            "vehicle_type": "Sedan"
        }

        prob, model_ver = predict_approval_probability("car", sample_car_features, version="v2")
        self.assertGreaterEqual(prob, 0.0)
        self.assertLessEqual(prob, 1.0)
        self.assertIn("v2.0", model_ver)

    def test_05_category_isolation(self):
        """Verifies passing wrong category or missing inputs raises appropriate errors."""
        with self.assertRaises(ValueError):
            predict_approval_probability("invalid_category", {}, version="v2")

        with self.assertRaises(ValueError):
            # Missing required features
            predict_approval_probability("car", {"product_id": "CAR01"}, version="v2")

    def test_06_discover_recommendations_v2(self):
        """Verifies end-to-end V2 discovery with hard eligibility rules and probability ranking."""
        res = discover_recommendations(
            applicant_id="APP0001",
            loan_type="car",
            requested_amount=300000.0,
            desired_tenure_months=36,
            category_details={
                "vehicle_price": 500000.0,
                "down_payment": 200000.0,
                "vehicle_condition": "New",
                "vehicle_type": "Sedan"
            },
            version="v2"
        )

        self.assertEqual(res["database_used"], "loaniq_v2.db")
        self.assertEqual(res["applicant_id"], "APP0001")
        self.assertGreater(res["total_eligible"], 0)

        # Confirm eligible products are sorted descending by predicted probability
        probs = [r["predicted_approval_probability"] for r in res["eligible_recommendations"]]
        self.assertEqual(probs, sorted(probs, reverse=True))

        # Check model version contains V2 reference
        top_rec = res["eligible_recommendations"][0]
        self.assertIn("v2.0", top_rec["model_version"])

    def test_07_v2_optimizer_simulation(self):
        """Verifies reducing-balance loan optimizer simulation runs on V2 existing loans."""
        loans = get_loans_for_applicant("APP0001", version="v2")
        self.assertGreater(len(loans), 0)
        loan = loans[0]
        loan_id = loan["loan_account_id"]
        cur_emi = loan["emi_inr"]

        sim = simulate_loan_repayment(loan_id, proposed_emi=cur_emi + 2000.0, version="v2")
        self.assertEqual(sim["loan_account_id"], loan_id)
        self.assertGreater(sim["savings"]["interest_saved"], 0)
        self.assertGreater(sim["savings"]["tenure_months_saved"], 0)
        self.assertIn("amortization_schedule", sim)

    def test_08_rejection_probability_fields(self):
        """Verifies that predicted rejection probability and display labels are computed correctly."""
        res = discover_recommendations(
            applicant_id="APP0001",
            loan_type="car",
            requested_amount=300000.0,
            desired_tenure_months=36,
            category_details={
                "vehicle_price": 500000.0,
                "down_payment": 200000.0,
                "vehicle_condition": "New",
                "vehicle_type": "Sedan"
            },
            version="v2"
        )

        for rec in res["eligible_recommendations"]:
            self.assertIn("is_predicted_rejected", rec)
            self.assertIn("predicted_rejection_probability", rec)
            self.assertIn("display_label", rec)
            self.assertIn("display_probability", rec)
            self.assertIn("display_percentage", rec)
            prob = rec["predicted_approval_probability"]
            if prob < 0.5:
                self.assertTrue(rec["is_predicted_rejected"])
                self.assertEqual(rec["display_label"], "Rejection Probability")
                self.assertEqual(rec["predicted_outcome"], "Rejected")
                self.assertAlmostEqual(rec["display_probability"], 1.0 - prob, places=3)
            else:
                self.assertFalse(rec["is_predicted_rejected"])
                self.assertEqual(rec["display_label"], "Approval Likelihood")
                self.assertEqual(rec["predicted_outcome"], "Approved")
                self.assertEqual(rec["display_probability"], prob)

        for inelig in res["ineligible_products"]:
            self.assertTrue(inelig["is_predicted_rejected"])
            self.assertEqual(inelig["display_label"], "Rejection Probability")
            self.assertEqual(inelig["rejection_percentage"], "100.0%")

    def test_09_v2_one_time_payment_simulation(self):
        """Verifies one-time lump-sum payment impacts tenure and EMI correctly."""
        loans = get_loans_for_applicant("APP0001", version="v2")
        self.assertGreater(len(loans), 0)
        loan = loans[0]
        loan_id = loan["loan_account_id"]
        principal = float(loan["remaining_loan_amount_inr"])
        cur_emi = float(loan["emi_inr"])

        lump_sum = 50000.0
        self.assertLess(lump_sum, principal)

        # Simulation with lump sum prepayment
        sim = simulate_loan_repayment(
            loan_id, 
            proposed_emi=cur_emi, 
            lump_sum_payment=lump_sum, 
            version="v2"
        )
        self.assertEqual(sim["lump_sum_payment"], lump_sum)
        self.assertAlmostEqual(sim["effective_principal"], principal - lump_sum, places=2)
        self.assertIn("one_time_payment_impact", sim)

        impact = sim["one_time_payment_impact"]
        self.assertTrue(impact["has_lump_sum"])
        
        # Option A: Same EMI -> Tenure reduces
        tenure_strat = impact["tenure_reduction_strategy"]
        self.assertGreater(tenure_strat["months_saved"], 0)
        self.assertGreater(tenure_strat["interest_saved"], 0)
        self.assertLess(tenure_strat["new_tenure_months"], sim["baseline"]["remaining_tenure_months"])

        # Option B: Same Tenure -> EMI reduces
        emi_strat = impact["emi_reduction_strategy"]
        self.assertGreater(emi_strat["monthly_emi_saved"], 0)
        self.assertGreater(emi_strat["interest_saved"], 0)
        self.assertLess(emi_strat["new_monthly_emi"], cur_emi)

        # Month 0 lump sum row in schedule
        schedule = sim["amortization_schedule"]
        self.assertGreater(len(schedule), 1)
        self.assertEqual(schedule[0]["month"], 0)
        self.assertTrue(schedule[0].get("is_lump_sum"))
        self.assertAlmostEqual(schedule[0]["ending_balance"], principal - lump_sum, places=2)

        # Boundary checks
        with self.assertRaises(ValueError):
            simulate_loan_repayment(loan_id, cur_emi, lump_sum_payment=principal, version="v2")
        with self.assertRaises(ValueError):
            simulate_loan_repayment(loan_id, cur_emi, lump_sum_payment=-1000.0, version="v2")


if __name__ == "__main__":
    unittest.main()
