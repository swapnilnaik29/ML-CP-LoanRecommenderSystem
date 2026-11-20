/**
 * LoanIQ API Client (ES6)
 * Connects to the Flask backend on port 5000 or relative /api
 */

// If running on a different port like 5173, point to backend on 5000; if served by Flask, use relative /api
const API_BASE = window.location.port === '5000' ? '/api' : 'http://127.0.0.1:5000/api';

const api = {
  // Session & Local Storage
  getApplicant() {
    try {
      const data = localStorage.getItem('loaniq_applicant');
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  },

  setApplicant(applicant) {
    localStorage.setItem('loaniq_applicant', JSON.stringify(applicant));
  },

  clearApplicant() {
    localStorage.removeItem('loaniq_applicant');
  },

  // Auth & Applicants
  async login(panNumber) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: panNumber, password: '' })
    });
    const data = await res.json();
    return {
      success: data.success,
      applicant: data.applicant || data.data || null,
      data: data.applicant || data.data || null,
      error: data.error
    };
  },

  async register(applicantData) {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(applicantData)
    });
    const data = await res.json();
    return {
      success: data.success,
      applicant: data.applicant || data.data || null,
      data: data.applicant || data.data || null,
      error: data.error
    };
  },

  async getDemoUsers() {
    const res = await fetch(`${API_BASE}/auth/sample-users?limit=50`);
    const data = await res.json();
    return {
      success: data.success,
      data: data.sample_users || []
    };
  },

  async getApplicantProfile(applicantId) {
    const res = await fetch(`${API_BASE}/applicant/${applicantId}`);
    const data = await res.json();
    return {
      success: data.success,
      data: data.applicant,
      error: data.error
    };
  },

  async updateApplicantProfile(applicantId, data) {
    const res = await fetch(`${API_BASE}/applicant/${applicantId}/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const resData = await res.json();
    return {
      success: resData.success,
      data: resData.applicant,
      error: resData.error
    };
  },

  // Dashboard
  async getDashboard(applicantId) {
    const res = await fetch(`${API_BASE}/applicant/${applicantId}/dashboard`);
    return await res.json();
  },

  // Existing Loans
  async getExistingLoans(applicantId) {
    const res = await fetch(`${API_BASE}/loans/applicant/${applicantId}`);
    return await res.json();
  },

  async addExistingLoan(loanData) {
    const res = await fetch(`${API_BASE}/loans/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loanData)
    });
    return await res.json();
  },

  // Discovery & Recommendations
  async discoverLoans(discoveryPayload) {
    const res = await fetch(`${API_BASE}/recommendations/discover`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(discoveryPayload)
    });
    return await res.json();
  },

  // Loan Repayment Optimiser
  async simulateOptimization(simulationPayload) {
    const res = await fetch(`${API_BASE}/optimizer/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(simulationPayload)
    });
    return await res.json();
  },

  // Direct EMI Calculator
  async calculateEMI(principal, annualRate, tenureMonths) {
    const res = await fetch(`${API_BASE}/optimizer/calculate-emi`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        principal: Number(principal),
        annual_interest_rate_pct: Number(annualRate),
        tenure_months: Number(tenureMonths)
      })
    });
    return await res.json();
  }
};
