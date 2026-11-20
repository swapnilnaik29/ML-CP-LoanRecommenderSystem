/**
 * LoanIQ API Client
 * Connects the frontend to the Flask backend on /api
 */

const API_BASE = '/api';

export interface Applicant {
  id: number;
  applicant_id: string;
  pan_number: string;
  full_name: string;
  age: number;
  monthly_income_inr: number;
  employment_type: string;
  employment_experience_years: number;
  credit_score: number;
  existing_emi_inr: number;
  existing_active_loans: number;
  monthly_household_expenses_inr: number;
  average_bank_balance_inr: number;
  dependents: number;
  email?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ExistingLoan {
  id: number;
  loan_account_id: string;
  applicant_id: string;
  pan_number: string;
  loan_type: string;
  loan_amount_inr: number;
  annual_interest_rate_pct: number;
  original_tenure_months: number;
  loan_start_date: string;
  emi_inr: number;
  min_emi_allowed_inr: number;
  max_emi_allowed_inr: number;
  remaining_loan_amount_inr: number;
  remaining_tenure_months: number;
  remaining_tenure_years: number;
  maturity_date: string;
  status: string;
  snapshot_date?: string;
}

export interface LoanProduct {
  id: number;
  product_id: string;
  loan_type: string;
  product_name: string;
  min_loan_amount: number;
  max_loan_amount: number;
  min_credit_score: number;
  min_age: number;
  max_age: number;
  interest_rate_min: number;
  interest_rate_max: number;
  min_tenure_months: number;
  max_tenure_months: number;
}

export interface RecommendationResult {
  product_id: string;
  product_name: string;
  loan_type: string;
  interest_rate_range: string;
  interest_rate_annual: number;
  tenure_range_months: string;
  min_loan_amount: number;
  max_loan_amount: number;
  estimated_monthly_emi: number;
  estimated_total_interest: number;
  estimated_total_payment: number;
  predicted_approval_probability: number;
  approval_percentage: string;
  is_eligible: boolean;
  eligibility_reasons: any[];
  model_version: string;
  processing_fee_est: string;
}

export interface IneligibleProduct {
  product_id: string;
  product_name: string;
  loan_type: string;
  interest_rate_range: string;
  min_loan_amount: number;
  max_loan_amount: number;
  is_eligible: boolean;
  failed_reasons: string[];
  eligibility_reasons: any[];
}

export interface DiscoveryResponse {
  application_id: string;
  loan_type: string;
  requested_amount: number;
  desired_tenure_months: number;
  applicant_id: string;
  applicant_name: string;
  credit_score: number;
  eligible_recommendations: RecommendationResult[];
  ineligible_products: IneligibleProduct[];
  total_eligible: number;
  total_ineligible: number;
  disclaimer: string;
}

export interface SimulationResponse {
  loan_account_id: string;
  loan_type: string;
  remaining_principal: number;
  annual_interest_rate_pct: number;
  baseline: {
    current_emi: number;
    remaining_tenure_months: number;
    total_interest_payable: number;
    total_repayment_amount: number;
    estimated_maturity_date: string;
  };
  proposed: {
    proposed_emi: number;
    remaining_tenure_months: number;
    total_interest_payable: number;
    total_repayment_amount: number;
    estimated_maturity_date: string;
  };
  savings: {
    interest_saved: number;
    tenure_months_saved: number;
    is_beneficial: boolean;
  };
}

// Session helper
export const getStoredApplicant = (): Applicant | null => {
  try {
    const raw = localStorage.getItem('loaniq_applicant') || localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const setStoredApplicant = (applicant: Applicant) => {
  localStorage.setItem('loaniq_applicant', JSON.stringify(applicant));
  // Backward compatibility with previous user key
  localStorage.setItem('user', JSON.stringify(applicant));
  localStorage.setItem('username', applicant.applicant_id);
};

export const clearStoredApplicant = () => {
  localStorage.removeItem('loaniq_applicant');
  localStorage.removeItem('user');
  localStorage.removeItem('username');
};

// API calls
export const api = {
  // Auth
  login: async (identifier: string, password: string = 'demo1234') => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password })
    });
    return res.json();
  },

  register: async (applicantData: any) => {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(applicantData)
    });
    return res.json();
  },

  getSampleUsers: async (limit: number = 20) => {
    const res = await fetch(`${API_BASE}/auth/sample-users?limit=${limit}`);
    return res.json();
  },

  // Applicant
  getProfile: async (applicantId: string) => {
    const res = await fetch(`${API_BASE}/applicant/${applicantId}`);
    return res.json();
  },

  updateProfile: async (applicantId: string, data: any) => {
    const res = await fetch(`${API_BASE}/applicant/${applicantId}/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  getDashboard: async (applicantId: string) => {
    const res = await fetch(`${API_BASE}/applicant/${applicantId}/dashboard`);
    return res.json();
  },

  // Loans
  getLoans: async (applicantId: string) => {
    const res = await fetch(`${API_BASE}/loans/applicant/${applicantId}`);
    return res.json();
  },

  addLoan: async (loanData: any) => {
    const res = await fetch(`${API_BASE}/loans/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loanData)
    });
    return res.json();
  },

  // Discovery & Recommendations
  discoverLoans: async (payload: {
    applicant_id: string;
    loan_type: string;
    requested_amount: number;
    desired_tenure_months: number;
    category_details: any;
  }) => {
    const res = await fetch(`${API_BASE}/recommendations/discover`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  },

  // Repayment Optimizer
  simulateRepayment: async (loanAccountId: string, proposedEmi: number) => {
    const res = await fetch(`${API_BASE}/optimizer/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        loan_account_id: loanAccountId,
        proposed_emi: proposedEmi
      })
    });
    return res.json();
  },

  // Products
  getProducts: async (loanType?: string) => {
    const url = loanType ? `${API_BASE}/products?loan_type=${loanType}` : `${API_BASE}/products`;
    const res = await fetch(url);
    return res.json();
  }
};
