/**
 * LoanIQ API Client (ES6)
 * Connects to the Flask backend with request-scoped versioning (V1 / V2).
 */

const API_BASE = (window.location.hostname === 'localhost' && window.location.port === '5173')
  ? 'http://127.0.0.1:5000/api'
  : '/api';

const api = {
  // Version Resolution (Pure Version 2)
  getVersion() {
    return 'v2';
  },

  setVersion(version) {
    // Kept for interface compatibility
  },

  getHeaders(extraHeaders = {}) {
    return {
      'Content-Type': 'application/json',
      'X-LoanIQ-Version': 'v2',
      ...extraHeaders
    };
  },

  // Session & Local Storage
  getApplicant() {
    try {
      const data = localStorage.getItem('loaniq_applicant_v2') || localStorage.getItem('loaniq_applicant');
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  },

  setApplicant(applicant) {
    localStorage.setItem('loaniq_applicant_v2', JSON.stringify(applicant));
    localStorage.setItem('loaniq_applicant', JSON.stringify(applicant));
  },

  clearApplicant() {
    localStorage.removeItem('loaniq_applicant_v2');
    localStorage.removeItem('loaniq_applicant');
  },

  // Auth & Applicants
  async login(panNumber) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ identifier: panNumber, password: '', version: this.getVersion() })
    });
    const data = await res.json();
    return {
      success: data.success,
      version: data.version,
      applicant: data.applicant || data.data || null,
      data: data.applicant || data.data || null,
      error: data.error
    };
  },

  async register(applicantData) {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ ...applicantData, version: this.getVersion() })
    });
    const data = await res.json();
    return {
      success: data.success,
      version: data.version,
      applicant: data.applicant || data.data || null,
      data: data.applicant || data.data || null,
      error: data.error
    };
  },

  async getDemoUsers() {
    const v = this.getVersion();
    const res = await fetch(`${API_BASE}/auth/sample-users?limit=50&version=${v}`, {
      headers: this.getHeaders()
    });
    const data = await res.json();
    return {
      success: data.success,
      version: data.version,
      data: data.sample_users || []
    };
  },

  async getApplicantProfile(applicantId) {
    const v = this.getVersion();
    const res = await fetch(`${API_BASE}/applicant/${applicantId}?version=${v}`, {
      headers: this.getHeaders()
    });
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
      headers: this.getHeaders(),
      body: JSON.stringify({ ...data, version: this.getVersion() })
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
    const v = this.getVersion();
    const res = await fetch(`${API_BASE}/applicant/${applicantId}/dashboard?version=${v}`, {
      headers: this.getHeaders()
    });
    return await res.json();
  },

  // Existing Loans
  async getExistingLoans(applicantId) {
    const v = this.getVersion();
    const res = await fetch(`${API_BASE}/loans/applicant/${applicantId}?version=${v}`, {
      headers: this.getHeaders()
    });
    return await res.json();
  },

  async addExistingLoan(loanData) {
    const res = await fetch(`${API_BASE}/loans/add`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ ...loanData, version: this.getVersion() })
    });
    return await res.json();
  },

  // Products
  async getProducts(loanType = null) {
    const v = this.getVersion();
    let url = `${API_BASE}/products?version=${v}`;
    if (loanType) url += `&loan_type=${encodeURIComponent(loanType)}`;
    const res = await fetch(url, { headers: this.getHeaders() });
    return await res.json();
  },

  // Discovery & Recommendations
  async discoverLoans(discoveryPayload) {
    const res = await fetch(`${API_BASE}/recommendations/discover`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ ...discoveryPayload, version: this.getVersion() })
    });
    return await res.json();
  },

  // Loan Repayment Optimiser
  async simulateOptimization(simulationPayload) {
    const res = await fetch(`${API_BASE}/optimizer/simulate`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ ...simulationPayload, version: this.getVersion() })
    });
    return await res.json();
  },

  // Standalone Financial EMI Calculation
  calculateEMI(principal, annualRate, tenureMonths) {
    const P = Number(principal);
    const r = (Number(annualRate) / 100) / 12;
    const n = Number(tenureMonths);
    if (P <= 0 || n <= 0) return 0;
    if (r === 0) return Math.round(P / n);
    const emi = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    return Math.round(emi);
  }
};
