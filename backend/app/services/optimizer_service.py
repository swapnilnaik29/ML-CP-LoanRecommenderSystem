"""
LoanIQ Repayment Optimizer Service
Calculates standard monthly reducing-balance amortisation and simulates EMI adjustments.
"""

import math
from datetime import date, datetime
from typing import Dict, Any, List, Optional
from backend.app.database import get_db_connection


def calculate_amortisation_schedule(principal: float, annual_rate_pct: float, monthly_emi: float) -> Dict[str, Any]:
    """
    Calculates exact month-by-month reducing-balance amortisation.
    Accounts for monthly interest = balance * r, principal repayment, and final smaller payment.
    """
    if principal <= 0:
        return {
            "months_to_payoff": 0,
            "total_interest_payable": 0.0,
            "total_repayment_amount": 0.0,
            "final_payment": 0.0,
            "schedule": []
        }

    r = (annual_rate_pct / 100.0) / 12.0
    monthly_interest_accrued = principal * r

    if monthly_emi <= monthly_interest_accrued:
        raise ValueError(
            f"Proposed EMI of ₹{monthly_emi:,.2f} is at or below the monthly accrued interest "
            f"of ₹{monthly_interest_accrued:,.2f}. The balance will not decrease and the loan will never amortise."
        )

    balance = principal
    total_interest = 0.0
    month = 0
    max_months = 600  # 50 years cap safety
    schedule = []

    while balance > 0.01 and month < max_months:
        month += 1
        interest_charge = balance * r
        total_interest += interest_charge
        total_due = balance + interest_charge

        if total_due <= monthly_emi:
            # Final smaller payment
            final_payment = round(total_due, 2)
            principal_paid = balance
            ending_balance = 0.0
            schedule.append({
                "month": month,
                "beginning_balance": round(balance, 2),
                "emi": final_payment,
                "principal_paid": round(principal_paid, 2),
                "interest_paid": round(interest_charge, 2),
                "ending_balance": 0.0
            })
            balance = 0.0
            break
        else:
            principal_paid = monthly_emi - interest_charge
            ending_balance = balance - principal_paid
            schedule.append({
                "month": month,
                "beginning_balance": round(balance, 2),
                "emi": round(monthly_emi, 2),
                "principal_paid": round(principal_paid, 2),
                "interest_paid": round(interest_charge, 2),
                "ending_balance": round(ending_balance, 2)
            })
            balance -= principal_paid

    total_repayment = principal + total_interest

    return {
        "months_to_payoff": month,
        "total_interest_payable": round(total_interest, 2),
        "total_repayment_amount": round(total_repayment, 2),
        "final_payment": round(monthly_emi if balance == 0 else monthly_emi, 2),
        "schedule": schedule
    }


def simulate_loan_repayment(
    loan_account_id: str, 
    proposed_emi: float, 
    lump_sum_payment: float = 0.0, 
    version: str = "v2"
) -> Dict[str, Any]:
    """
    Simulates repayment scenario on an existing loan for a proposed EMI and optional one-time lump-sum prepayment.
    Compares against current baseline loan conditions without modifying the database.
    """
    conn = get_db_connection(version)
    loan_row = conn.execute("SELECT * FROM existing_loans WHERE loan_account_id = ?", (loan_account_id,)).fetchone()
    conn.close()

    if not loan_row:
        raise ValueError(f"Loan account {loan_account_id} not found in database {version}.")

    loan = dict(loan_row)
    principal = float(loan["remaining_loan_amount_inr"])
    rate = float(loan["annual_interest_rate_pct"])
    current_emi = float(loan["emi_inr"])

    try:
        lump_sum = float(lump_sum_payment or 0.0)
    except (ValueError, TypeError):
        lump_sum = 0.0

    if lump_sum < 0:
        raise ValueError("One-time payment amount cannot be negative.")
    if principal > 0 and lump_sum >= principal:
        raise ValueError(
            f"One-time payment (₹{lump_sum:,.2f}) must be strictly less than the remaining principal balance "
            f"(₹{principal:,.2f})."
        )

    if principal <= 0:
        return {
            "loan": loan,
            "baseline": {"tenure_months": 0, "total_interest": 0, "total_repayment": 0, "maturity_date": date.today().isoformat()},
            "proposed": {"emi": proposed_emi, "tenure_months": 0, "total_interest": 0, "total_repayment": 0, "maturity_date": date.today().isoformat()},
            "savings": {"interest_saved": 0, "tenure_months_saved": 0},
            "one_time_payment_impact": None
        }

    effective_principal = principal - lump_sum

    # 1. Baseline calculation (Original loan without lump-sum)
    baseline_calc = calculate_amortisation_schedule(principal, rate, current_emi)

    # 2. Proposed calculation (Amortisation on effective principal with proposed_emi)
    proposed_calc = calculate_amortisation_schedule(effective_principal, rate, proposed_emi)

    # Compute dates helper
    today = date.today()

    def add_months(d: date, m: int) -> str:
        total = d.month + m
        y = d.year + (total - 1) // 12
        mo = ((total - 1) % 12) + 1
        day = min(d.day, 28)
        return date(y, mo, day).isoformat()

    baseline_maturity = add_months(today, baseline_calc["months_to_payoff"])
    proposed_maturity = add_months(today, proposed_calc["months_to_payoff"])

    # Overall savings considering lump sum + ongoing proposed schedule vs baseline
    interest_saved = round(baseline_calc["total_interest_payable"] - proposed_calc["total_interest_payable"], 2)
    tenure_saved = baseline_calc["months_to_payoff"] - proposed_calc["months_to_payoff"]

    # 3. Dedicated One-Time Prepayment Impact Calculations:
    # Option A: Keep EMI Same -> Tenure Reduces
    option_tenure_calc = calculate_amortisation_schedule(effective_principal, rate, current_emi)
    option_tenure_months = option_tenure_calc["months_to_payoff"]
    option_tenure_saved = baseline_calc["months_to_payoff"] - option_tenure_months
    option_tenure_interest_saved = round(baseline_calc["total_interest_payable"] - option_tenure_calc["total_interest_payable"], 2)
    option_tenure_maturity = add_months(today, option_tenure_months)

    # Option B: Keep Tenure Same -> Monthly EMI Reduces
    target_tenure = baseline_calc["months_to_payoff"]
    r = (rate / 100.0) / 12.0
    if target_tenure > 0:
        if r > 0:
            reduced_emi = round((effective_principal * r * math.pow(1 + r, target_tenure)) / (math.pow(1 + r, target_tenure) - 1), 2)
        else:
            reduced_emi = round(effective_principal / target_tenure, 2)
        try:
            option_emi_calc = calculate_amortisation_schedule(effective_principal, rate, reduced_emi)
        except ValueError:
            reduced_emi = math.ceil((effective_principal * r * math.pow(1 + r, target_tenure)) / (math.pow(1 + r, target_tenure) - 1)) + 1
            option_emi_calc = calculate_amortisation_schedule(effective_principal, rate, reduced_emi)

        option_emi_saved_per_month = round(current_emi - reduced_emi, 2)
        option_emi_interest_saved = round(baseline_calc["total_interest_payable"] - option_emi_calc["total_interest_payable"], 2)
    else:
        reduced_emi = 0.0
        option_emi_saved_per_month = 0.0
        option_emi_interest_saved = 0.0
        option_emi_calc = {"months_to_payoff": 0, "total_interest_payable": 0.0, "total_repayment_amount": 0.0}

    # Construct schedule with Month 0 entry if lump-sum payment was made
    schedule = list(proposed_calc.get("schedule", []))
    if lump_sum > 0:
        schedule = [{
            "month": 0,
            "beginning_balance": round(principal, 2),
            "emi": round(lump_sum, 2),
            "principal_paid": round(lump_sum, 2),
            "interest_paid": 0.0,
            "ending_balance": round(effective_principal, 2),
            "is_lump_sum": True
        }] + schedule

    return {
        "loan_account_id": loan["loan_account_id"],
        "loan_type": loan["loan_type"],
        "remaining_principal": principal,
        "effective_principal": round(effective_principal, 2),
        "lump_sum_payment": round(lump_sum, 2),
        "annual_interest_rate_pct": rate,
        "baseline": {
            "current_emi": current_emi,
            "remaining_tenure_months": baseline_calc["months_to_payoff"],
            "total_interest_payable": baseline_calc["total_interest_payable"],
            "total_repayment_amount": baseline_calc["total_repayment_amount"],
            "estimated_maturity_date": baseline_maturity
        },
        "proposed": {
            "proposed_emi": proposed_emi,
            "remaining_tenure_months": proposed_calc["months_to_payoff"],
            "total_interest_payable": proposed_calc["total_interest_payable"],
            "total_repayment_amount": round(lump_sum + proposed_calc["total_repayment_amount"], 2),
            "estimated_maturity_date": proposed_maturity
        },
        "savings": {
            "interest_saved": interest_saved,
            "tenure_months_saved": tenure_saved,
            "is_beneficial": interest_saved > 0
        },
        "one_time_payment_impact": {
            "lump_sum_amount": round(lump_sum, 2),
            "original_principal": round(principal, 2),
            "effective_principal": round(effective_principal, 2),
            "has_lump_sum": lump_sum > 0,
            "tenure_reduction_strategy": {
                "monthly_emi": current_emi,
                "new_tenure_months": option_tenure_months,
                "months_saved": max(0, option_tenure_saved),
                "total_interest": option_tenure_calc["total_interest_payable"],
                "interest_saved": max(0.0, option_tenure_interest_saved),
                "estimated_maturity_date": option_tenure_maturity
            },
            "emi_reduction_strategy": {
                "tenure_months": target_tenure,
                "new_monthly_emi": reduced_emi,
                "monthly_emi_saved": max(0.0, option_emi_saved_per_month),
                "total_interest": option_emi_calc["total_interest_payable"],
                "interest_saved": max(0.0, option_emi_interest_saved),
                "estimated_maturity_date": baseline_maturity
            }
        },
        "amortization_schedule": schedule
    }
