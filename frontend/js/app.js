/**
 * LoanIQ Main Application Controller (Vanilla ES6)
 * Handles state, hash-based routing, user sessions, discovery forms,
 * ML recommendations, comparison matrix, and reducing-balance repayment optimiser.
 */

// Global App State
const state = {
  applicant: null,
  activeCategory: 'home',
  discoveryData: null,
  selectedForCompare: [],
  activeLoans: [],
  currentLoanForOptimiser: null,
  demoUsers: []
};

// Document Ready
document.addEventListener('DOMContentLoaded', async () => {
  // 1. Check for logged in user in localStorage
  state.applicant = api.getApplicant();
  
  // 2. Fetch demo users for the switcher
  try {
    const res = await api.getDemoUsers();
    if (res.success && res.data) {
      state.demoUsers = res.data;
      renderDemoUserSwitcher();
      renderLoginDropdown();
    }
  } catch (err) {
    console.warn("Could not pre-fetch demo users:", err);
  }

  // 3. Listen for hash changes
  window.addEventListener('hashchange', handleRouting);

  // 4. Set initial view
  if (!window.location.hash) {
    window.location.hash = state.applicant ? '#dashboard' : '#landing';
  } else {
    handleRouting();
  }

  // 5. Update Navbar
  updateNavbar();

  // 6. Setup Event Listeners
  setupEventListeners();
});

// ROUTING
function handleRouting() {
  const hash = window.location.hash || '#landing';
  const cleanHash = hash.split('?')[0];

  // Protected route check
  const protectedRoutes = ['#dashboard', '#discover', '#recommendations', '#optimizer', '#compare', '#profile'];
  if (protectedRoutes.includes(cleanHash) && !state.applicant) {
    window.location.hash = '#login';
    return;
  }

  // Hide all views
  document.querySelectorAll('.view-section').forEach(sec => sec.style.display = 'none');

  // Update active nav link
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.toggle('active', link.getAttribute('href') === cleanHash);
  });

  // Show target view
  const targetId = cleanHash.replace('#', '') + '-view';
  const targetElem = document.getElementById(targetId);
  if (targetElem) {
    targetElem.style.display = 'block';
    window.scrollTo(0, 0);
  } else {
    // Default to dashboard or landing
    const fallback = state.applicant ? 'dashboard-view' : 'landing-view';
    const fbElem = document.getElementById(fallback);
    if (fbElem) fbElem.style.display = 'block';
  }

  // View specific on-enter hooks
  if (cleanHash === '#dashboard') {
    loadDashboard();
  } else if (cleanHash === '#discover') {
    initDiscoveryForm();
  } else if (cleanHash === '#optimizer') {
    loadOptimiserView();
  } else if (cleanHash === '#compare') {
    renderCompareView();
  } else if (cleanHash === '#profile') {
    loadProfileView();
  } else if (cleanHash === '#calculator') {
    initCalculatorView();
  } else if (cleanHash === '#login') {
    renderLoginDropdown();
  }

  updateNavbar();
}

// NAVBAR & AUTH
function updateNavbar() {
  const navAuth = document.getElementById('nav-auth');
  const navLinks = document.getElementById('nav-links');

  if (state.applicant) {
    if (navLinks) navLinks.style.display = 'flex';
    if (navAuth) {
      navAuth.innerHTML = `
        <div class="user-pill" id="user-pill-btn">
          <div class="user-avatar">${state.applicant.full_name.charAt(0).toUpperCase()}</div>
          <div class="user-info">
            <div class="user-name">${state.applicant.full_name}</div>
            <div class="user-id">${state.applicant.applicant_id}</div>
          </div>
          <span style="font-size: 10px; opacity: 0.7;">▼</span>
          <div class="dropdown-menu" id="user-dropdown">
            <div style="padding: 10px 16px; border-bottom: 1px solid var(--slate-100);">
              <div style="font-size: 10px; color: var(--slate-400); text-transform: uppercase; font-weight: 700;">Active Applicant</div>
              <div style="font-weight: 800; font-size: 13px; color: var(--primary);">${state.applicant.full_name}</div>
              <div style="font-size: 11px; color: var(--slate-500); font-family: monospace;">PAN: ${state.applicant.pan_number}</div>
            </div>
            <button class="dropdown-item" onclick="window.location.hash='#profile'">👤 View Full Profile</button>
            <button class="dropdown-item" onclick="window.location.hash='#discover'">✨ Discover Loans</button>
            <button class="dropdown-item" onclick="window.location.hash='#optimizer'">⚡ Loan Optimiser</button>
            <button class="dropdown-item danger" onclick="logoutUser()">🚪 Sign Out</button>
          </div>
        </div>
      `;

      // Toggle dropdown
      const pillBtn = document.getElementById('user-pill-btn');
      const dropdown = document.getElementById('user-dropdown');
      if (pillBtn && dropdown) {
        pillBtn.onclick = (e) => {
          e.stopPropagation();
          dropdown.classList.toggle('show');
        };
        document.onclick = () => dropdown.classList.remove('show');
      }
    }
  } else {
    if (navLinks) navLinks.style.display = 'none';
    if (navAuth) {
      navAuth.innerHTML = `
        <div style="position: relative; display: inline-block;">
          <button class="btn btn-outline btn-sm" id="nav-signin-btn" style="color: white; border-color: rgba(255,255,255,0.35); background: rgba(255,255,255,0.08); display: flex; align-items: center; gap: 6px;">
            <span>Sign In</span>
            <span style="font-size: 10px; opacity: 0.8;">▼</span>
          </button>
          <div class="dropdown-menu" id="nav-signin-menu" style="width: 290px; max-height: 380px; overflow-y: auto;">
            <div style="padding: 8px 14px; border-bottom: 1px solid var(--slate-100); font-size: 11px; font-weight: 700; color: var(--primary); text-transform: uppercase;">
              Select Demo Applicant:
            </div>
            ${(state.demoUsers || []).slice(0, 10).map(u => `
              <button class="dropdown-item" onclick="loginDemoUser('${u.applicant_id}')" style="display: flex; justify-content: space-between; align-items: center; padding: 7px 14px;">
                <div>
                  <div style="font-weight: 700; color: var(--slate-800); font-size: 12px;">${u.full_name}</div>
                  <div style="font-size: 10px; color: var(--slate-400); font-family: monospace;">${u.applicant_id} • CIBIL ${u.credit_score}</div>
                </div>
                <span class="badge-active" style="font-size: 9px; padding: 2px 6px;">Sign In</span>
              </button>
            `).join('')}
            <div style="border-top: 1px solid var(--slate-100); padding: 4px 0;">
              <button class="dropdown-item" onclick="window.location.hash='#login'" style="font-weight: 700; color: var(--primary);">
                🔍 Open Full Sign In Dropdown Page →
              </button>
            </div>
          </div>
        </div>

        <button class="btn btn-accent btn-sm" onclick="loginDemoUser('USR0007')">1-Click Demo</button>
      `;

      // Toggle dropdown for navbar signin
      const btn = document.getElementById('nav-signin-btn');
      const menu = document.getElementById('nav-signin-menu');
      if (btn && menu) {
        btn.onclick = (e) => {
          e.stopPropagation();
          menu.classList.toggle('show');
        };
        document.onclick = () => menu.classList.remove('show');
      }
    }
  }
}

function renderDemoUserSwitcher() {
  const container = document.getElementById('demo-users-list');
  if (!container || !state.demoUsers.length) return;

  container.innerHTML = state.demoUsers.slice(0, 8).map(u => `
    <button class="chip" onclick="loginDemoUser('${u.applicant_id}')" style="display: flex; gap: 4px; align-items: center;">
      <strong>${u.full_name}</strong>
      <span style="opacity: 0.7;">(CIBIL ${u.credit_score})</span>
    </button>
  `).join('');
}

function renderLoginDropdown() {
  const dropdown = document.getElementById('login-user-dropdown');
  if (!dropdown || !state.demoUsers.length) return;

  dropdown.innerHTML = `
    <option value="">-- Choose an Applicant from Database --</option>
    ${state.demoUsers.map(u => `
      <option value="${u.applicant_id}" ${u.applicant_id === 'USR0007' ? 'selected' : ''}>
        ${u.full_name} (${u.applicant_id} • CIBIL: ${u.credit_score} • ₹${Math.round(u.monthly_income_inr).toLocaleString('en-IN')}/mo • ${u.employment_type.replace('_', ' ')})
      </option>
    `).join('')}
  `;
}

function signInWithSelectedDropdownUser() {
  const dropdown = document.getElementById('login-user-dropdown');
  const selectedId = dropdown ? dropdown.value : null;
  if (!selectedId) {
    alert("Please select an applicant from the dropdown menu.");
    return;
  }
  loginDemoUser(selectedId);
}

function toggleManualPan() {
  const form = document.getElementById('manual-pan-form');
  if (form) {
    form.style.display = form.style.display === 'none' ? 'block' : 'none';
  }
}

async function loginDemoUser(applicantId) {
  try {
    const res = await api.getApplicantProfile(applicantId);
    if (res.success && res.data) {
      state.applicant = res.data;
      api.setApplicant(res.data);
      updateNavbar();
      window.location.hash = '#dashboard';
    } else {
      alert("Could not load demo user: " + (res.error || "Unknown error"));
    }
  } catch (err) {
    alert("Connection error contacting LoanIQ backend API.");
  }
}

function logoutUser() {
  state.applicant = null;
  api.clearApplicant();
  updateNavbar();
  window.location.hash = '#landing';
}

// DASHBOARD
async function loadDashboard() {
  if (!state.applicant) return;

  // Render static applicant header
  document.getElementById('dash-applicant-name').innerText = state.applicant.full_name;
  document.getElementById('dash-applicant-id').innerText = state.applicant.applicant_id;
  document.getElementById('dash-applicant-pan').innerText = state.applicant.pan_number;
  document.getElementById('dash-applicant-emp').innerText = state.applicant.employment_type.replace('_', ' ');
  document.getElementById('dash-applicant-cibil').innerText = state.applicant.credit_score;

  // CIBIL Badge Color
  const cibilBadge = document.getElementById('dash-cibil-badge');
  if (cibilBadge) {
    const s = state.applicant.credit_score;
    cibilBadge.innerText = s >= 750 ? `Excellent (${s})` : s >= 700 ? `Good (${s})` : `Fair (${s})`;
    cibilBadge.className = s >= 700 ? 'badge-active' : 'chip';
  }

  // Fetch live dashboard & active loans from SQLite
  try {
    const res = await api.getDashboard(state.applicant.applicant_id);
    if (res.success && res.dashboard) {
      const db = res.dashboard;
      document.getElementById('dash-active-count').innerText = db.total_active_loans;
      document.getElementById('dash-total-emi').innerText = '₹' + Math.round(db.total_monthly_emi).toLocaleString('en-IN');
      document.getElementById('dash-income').innerText = '₹' + Math.round(state.applicant.monthly_income_inr).toLocaleString('en-IN');
      
      const debtRatio = Math.round((db.total_monthly_emi / (state.applicant.monthly_income_inr || 1)) * 100);
      document.getElementById('dash-debt-ratio').innerText = `FOIR / Debt Burden: ${debtRatio}%`;

      // Render Active Loans list
      state.activeLoans = db.active_loans || [];
      renderDashboardLoansList(state.activeLoans);
    }
  } catch (err) {
    console.error("Dashboard fetch error:", err);
  }
}

function renderDashboardLoansList(loans) {
  const container = document.getElementById('dash-loans-container');
  if (!container) return;

  if (!loans.length) {
    container.innerHTML = `
      <div style="text-align: center; padding: 30px; background: var(--slate-50); border-radius: var(--radius-md); border: 1px dashed var(--slate-300);">
        <p style="font-size: 13px; color: var(--slate-500);">No active loans recorded for this applicant.</p>
        <button class="btn btn-primary btn-sm" onclick="window.location.hash='#discover'" style="margin-top: 10px;">Discover Loan Offers</button>
      </div>
    `;
    return;
  }

  container.innerHTML = loans.map(l => `
    <div class="card" style="margin-bottom: 12px; padding: 16px; display: flex; justify-content: space-between; align-items: center;">
      <div>
        <div style="display: flex; gap: 8px; align-items: center;">
          <span style="font-family: monospace; font-size: 11px; background: var(--slate-100); padding: 2px 6px; border-radius: 4px; font-weight: 700;">${l.loan_account_id}</span>
          <span style="font-weight: 800; font-size: 14px; color: var(--primary);">${l.loan_type} Loan</span>
          <span class="badge-active" style="font-size: 10px;">${l.status}</span>
        </div>
        <div style="font-size: 12px; color: var(--slate-500); margin-top: 4px;">
          Bal: <strong>₹${Math.round(l.remaining_loan_amount_inr).toLocaleString('en-IN')}</strong> • 
          Rate: <strong>${l.annual_interest_rate_pct}% p.a.</strong> • 
          Remaining: <strong>${l.remaining_tenure_months} Mo</strong>
        </div>
      </div>
      <div style="text-align: right;">
        <div style="font-size: 15px; font-weight: 900; color: var(--dark);">₹${Math.round(l.emi_inr).toLocaleString('en-IN')}<span style="font-size: 10px; font-weight: normal; color: var(--slate-400);">/mo</span></div>
        <button class="btn btn-outline btn-sm" onclick="selectLoanForOptimiser('${l.loan_account_id}')" style="margin-top: 4px;">Optimise</button>
      </div>
    </div>
  `).join('');
}

// LOAN DISCOVERY
function initDiscoveryForm() {
  if (!state.applicant) return;

  // Fill prefilled applicant credentials
  document.getElementById('pref-cibil').innerText = state.applicant.credit_score;
  document.getElementById('pref-income').innerText = '₹' + Math.round(state.applicant.monthly_income_inr).toLocaleString('en-IN');
  document.getElementById('pref-emp').innerText = state.applicant.employment_type.replace('_', ' ');
  document.getElementById('pref-emi').innerText = '₹' + Math.round(state.applicant.existing_emi_inr).toLocaleString('en-IN');

  // Set category tab
  setCategory(state.activeCategory || 'home');

  // Trigger live calculation
  updateDiscoveryLiveSummary();
}

function setCategory(cat) {
  state.activeCategory = cat;

  // Update tabs UI
  document.querySelectorAll('.category-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.category === cat);
  });

  // Show/Hide category specific input sections
  document.querySelectorAll('.cat-fields').forEach(sec => sec.style.display = 'none');
  const targetFields = document.getElementById(`cat-${cat}-fields`);
  if (targetFields) targetFields.style.display = 'block';

  // Set default amounts and tenures per category
  const amountInput = document.getElementById('disc-amount');
  const tenureInput = document.getElementById('disc-tenure');

  if (cat === 'home') {
    amountInput.value = 2500000;
    tenureInput.value = 180;
  } else if (cat === 'car') {
    amountInput.value = 650000;
    tenureInput.value = 48;
  } else if (cat === 'education') {
    amountInput.value = 600000;
    tenureInput.value = 60;
  } else if (cat === 'personal') {
    amountInput.value = 250000;
    tenureInput.value = 24;
  }

  // Render quick chips for this category
  renderDiscoveryChips(cat);

  // Update live calculation
  updateDiscoveryLiveSummary();
}

function renderDiscoveryChips(cat) {
  const amountChips = {
    car: [300000, 500000, 800000, 1200000, 1500000],
    home: [1500000, 2500000, 4000000, 6000000, 10000000],
    education: [300000, 600000, 1000000, 1500000, 2500000],
    personal: [100000, 250000, 500000, 750000, 1000000]
  };

  const tenureChips = {
    car: [36, 48, 60, 84],
    home: [60, 120, 180, 240, 300],
    education: [36, 60, 84, 120],
    personal: [12, 24, 36, 60]
  };

  const amtContainer = document.getElementById('amt-chips');
  if (amtContainer && amountChips[cat]) {
    amtContainer.innerHTML = amountChips[cat].map(amt => `
      <button type="button" class="chip" onclick="setDiscoveryAmount(${amt})">₹${(amt / 100000).toFixed(amt % 100000 === 0 ? 0 : 1)}L</button>
    `).join('');
  }

  const tenureContainer = document.getElementById('tenure-chips');
  if (tenureContainer && tenureChips[cat]) {
    tenureContainer.innerHTML = tenureChips[cat].map(mo => `
      <button type="button" class="chip" onclick="setDiscoveryTenure(${mo})">${mo / 12} Yrs (${mo}m)</button>
    `).join('');
  }
}

function setDiscoveryAmount(amt) {
  const input = document.getElementById('disc-amount');
  if (input) {
    input.value = amt;
    updateDiscoveryLiveSummary();
  }
}

function setDiscoveryTenure(mo) {
  const input = document.getElementById('disc-tenure');
  if (input) {
    input.value = mo;
    updateDiscoveryLiveSummary();
  }
}

function updateDiscoveryLiveSummary() {
  const amount = Number(document.getElementById('disc-amount')?.value || 0);
  const tenure = Number(document.getElementById('disc-tenure')?.value || 1);

  // Indicative rates
  const rateMap = { home: 0.085, car: 0.09, education: 0.095, personal: 0.125 };
  const rAnnual = rateMap[state.activeCategory] || 0.09;
  const rMonthly = rAnnual / 12;

  const emi = tenure > 0 && amount > 0
    ? (amount * rMonthly * Math.pow(1 + rMonthly, tenure)) / (Math.pow(1 + rMonthly, tenure) - 1)
    : 0;

  document.getElementById('sum-principal').innerText = '₹' + Math.round(amount).toLocaleString('en-IN');
  document.getElementById('sum-tenure').innerText = `${tenure} Mo (${Math.round(tenure / 12 * 10) / 10} Yrs)`;
  document.getElementById('sum-rate').innerText = `${(rAnnual * 100).toFixed(1)}% p.a.`;
  document.getElementById('sum-emi').innerText = '₹' + Math.round(emi).toLocaleString('en-IN');
}

async function submitDiscoveryForm(e) {
  e.preventDefault();
  if (!state.applicant) return;

  const submitBtn = document.getElementById('disc-submit-btn');
  const originalText = submitBtn.innerHTML;
  submitBtn.disabled = true;
  submitBtn.innerHTML = `<span>Evaluating ML Approval Models...</span>`;

  const amount = Number(document.getElementById('disc-amount').value);
  const tenure = Number(document.getElementById('disc-tenure').value);

  // Category specific details
  let categoryDetails = {};
  if (state.activeCategory === 'car') {
    categoryDetails = {
      vehicle_price: Number(document.getElementById('car-price')?.value || amount),
      vehicle_type: document.getElementById('car-type')?.value || 'sedan',
      vehicle_condition: document.getElementById('car-condition')?.value || 'new',
      vehicle_age_years: Number(document.getElementById('car-age')?.value || 0),
      fuel_type: document.getElementById('car-fuel')?.value || 'petrol'
    };
  } else if (state.activeCategory === 'home') {
    const coApp = Number(document.getElementById('home-coapp')?.value || 0);
    categoryDetails = {
      property_value: Number(document.getElementById('home-val')?.value || amount * 1.2),
      property_type: document.getElementById('home-type')?.value || 'apartment',
      property_location: document.getElementById('home-loc')?.value || 'urban',
      property_status: document.getElementById('home-status')?.value || 'ready_to_move',
      property_age_years: Number(document.getElementById('home-age')?.value || 2),
      co_applicant: coApp,
      co_applicant_monthly_income: coApp === 1 ? Number(document.getElementById('home-coincome')?.value || 30000) : 0
    };
  } else if (state.activeCategory === 'education') {
    const coApp = Number(document.getElementById('edu-coapp')?.value || 0);
    categoryDetails = {
      course_level: document.getElementById('edu-level')?.value || 'postgraduate',
      course_field: document.getElementById('edu-field')?.value || 'engineering',
      study_location: document.getElementById('edu-loc')?.value || 'India',
      institution_tier: document.getElementById('edu-tier')?.value || 'tier_1',
      total_course_cost: Number(document.getElementById('edu-cost')?.value || amount),
      scholarship_amount: Number(document.getElementById('edu-schol')?.value || 0),
      co_applicant: coApp,
      co_applicant_monthly_income: coApp === 1 ? Number(document.getElementById('edu-coincome')?.value || 25000) : 0
    };
  } else if (state.activeCategory === 'personal') {
    categoryDetails = {
      loan_purpose: document.getElementById('pers-purpose')?.value || 'home_renovation',
      marital_status: document.getElementById('pers-marital')?.value || 'married'
    };
  }

  const payload = {
    applicant_id: state.applicant.applicant_id,
    loan_type: state.activeCategory,
    requested_amount: amount,
    desired_tenure_months: tenure,
    category_details: categoryDetails
  };

  try {
    const res = await api.discoverLoans(payload);
    if (res.success && res.data) {
      state.discoveryData = res.data;
      state.selectedForCompare = [];
      renderRecommendationsView(res.data);
      window.location.hash = '#recommendations';
    } else {
      alert("Error: " + (res.error || "Could not evaluate loan recommendations."));
    }
  } catch (err) {
    alert("Connection error contacting LoanIQ machine learning inference service.");
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalText;
  }
}

// RECOMMENDATIONS
function renderRecommendationsView(data) {
  if (!data) return;

  document.getElementById('rec-loan-type').innerText = data.loan_type.toUpperCase() + ' LOAN';
  document.getElementById('rec-requested-amt').innerText = '₹' + Number(data.requested_amount).toLocaleString('en-IN');
  document.getElementById('rec-desired-tenure').innerText = `${data.desired_tenure_months} Months`;
  document.getElementById('rec-eligible-count').innerText = (data.eligible_recommendations || []).length;
  document.getElementById('rec-ineligible-count').innerText = (data.ineligible_products || []).length;

  // Render Eligible List
  const eligibleContainer = document.getElementById('rec-eligible-list');
  const eligible = data.eligible_recommendations || [];

  if (!eligible.length) {
    eligibleContainer.innerHTML = `
      <div class="card" style="text-align: center; padding: 40px;">
        <h3 style="color: var(--primary); margin-bottom: 8px;">No Loan Products Passed Hard Eligibility Gating</h3>
        <p style="font-size: 13px; color: var(--slate-500); max-width: 500px; margin: 0 auto;">
          None of the 16 configured lender products matched the requested amount, tenure, or applicant profile bounds. Check the Ineligible tab to review specific rule evaluations.
        </p>
      </div>
    `;
  } else {
    eligibleContainer.innerHTML = eligible.map((item, idx) => {
      const isTop = idx === 0;
      const isSelected = state.selectedForCompare.some(p => p.product_id === item.product_id);
      return `
        <div class="rec-card ${isTop ? 'top-fit' : ''}">
          <div class="rec-card-body">
            
            <!-- Left: Brand & Fit -->
            <div>
              <div style="display: flex; gap: 6px; align-items: center; margin-bottom: 4px;">
                <span style="font-family: monospace; font-size: 10px; background: var(--slate-100); padding: 2px 6px; border-radius: 4px; font-weight: 700;">${item.product_id}</span>
                ${isTop ? `<span class="badge-active" style="font-size: 10px;">★ Top Model Fit</span>` : ''}
              </div>
              <h4 style="font-size: 16px; font-weight: 800; color: var(--primary); margin-bottom: 8px;">${item.product_name}</h4>
              
              <div class="prob-meter">
                <span class="prob-val">${item.approval_percentage}</span>
                <span style="font-size: 11px; font-weight: 700; color: #065f46;">Approval Fit</span>
              </div>
            </div>

            <!-- Center: Financial Metrics -->
            <div class="rec-metrics-grid">
              <div class="rec-metric-item">
                <div class="rec-metric-label">Interest Rate</div>
                <div class="rec-metric-val" style="color: var(--primary);">${item.interest_rate_range}</div>
                <div style="font-size: 10px; color: var(--slate-400);">Nominal ${item.interest_rate_annual}%</div>
              </div>

              <div class="rec-metric-item">
                <div class="rec-metric-label">Monthly EMI</div>
                <div class="rec-metric-val">₹${Math.round(item.estimated_monthly_emi).toLocaleString('en-IN')}</div>
                <div style="font-size: 10px; color: var(--slate-400);">Reducing Bal.</div>
              </div>

              <div class="rec-metric-item">
                <div class="rec-metric-label">Total Interest</div>
                <div class="rec-metric-val">₹${Math.round(item.estimated_total_interest).toLocaleString('en-IN')}</div>
                <div style="font-size: 10px; color: var(--slate-400);">${data.desired_tenure_months} Months</div>
              </div>

              <div class="rec-metric-item">
                <div class="rec-metric-label">Total Payment</div>
                <div class="rec-metric-val" style="color: var(--success);">₹${Math.round(item.estimated_total_payment).toLocaleString('en-IN')}</div>
                <div style="font-size: 10px; color: var(--slate-400);">Prin. + Int.</div>
              </div>
            </div>

            <!-- Right: Actions -->
            <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 8px;">
              <button class="btn ${isSelected ? 'btn-accent' : 'btn-outline'} btn-sm" onclick="toggleCompareProduct('${item.product_id}')">
                ${isSelected ? '✓ In Compare' : '+ Compare'}
              </button>
              <button class="chip" onclick="toggleEligibilityAccordion('${item.product_id}')" style="font-size: 11px;">
                ℹ️ View 5 Gates
              </button>
            </div>

          </div>

          <!-- 5 Gates Accordion -->
          <div id="gate-accordion-${item.product_id}" style="display: none; margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--slate-200); background: var(--slate-50); padding: 12px; border-radius: var(--radius-sm);">
            <div style="font-size: 11px; font-weight: 700; color: var(--primary); margin-bottom: 6px; text-transform: uppercase;">Deterministic Hard Gates (Passed):</div>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; font-size: 11px;">
              ${(item.eligibility_reasons || []).map(r => `
                <div style="background: var(--white); padding: 6px 8px; border-radius: 4px; border: 1px solid #d1fae5; color: #065f46;">
                  ✓ ${r.description}
                </div>
              `).join('')}
            </div>
            <div style="font-size: 10px; color: var(--slate-400); margin-top: 6px; font-family: monospace;">
              Model: ${item.model_version} • Fee: ${item.processing_fee_est}
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // Render Ineligible List
  const ineligibleContainer = document.getElementById('rec-ineligible-list');
  const ineligible = data.ineligible_products || [];

  if (!ineligible.length) {
    ineligibleContainer.innerHTML = `
      <div class="card" style="text-align: center; padding: 24px;">
        <p style="font-size: 13px; color: var(--slate-500);">All configured lender products passed your profile criteria.</p>
      </div>
    `;
  } else {
    ineligibleContainer.innerHTML = ineligible.map(p => `
      <div class="ineligible-card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <strong style="font-size: 14px; color: var(--dark);">${p.product_name}</strong>
          <span style="font-size: 11px; font-family: monospace; color: var(--slate-500);">${p.product_id}</span>
        </div>
        <div>
          <span style="font-size: 11px; font-weight: 700; color: var(--danger);">Failed Criteria:</span>
          <div>
            ${(p.failed_reasons || []).map(r => `<span class="fail-reason-tag">✕ ${r}</span>`).join('')}
          </div>
        </div>
      </div>
    `).join('');
  }

  updateCompareDock();
}

function toggleEligibilityAccordion(productId) {
  const elem = document.getElementById(`gate-accordion-${productId}`);
  if (elem) {
    elem.style.display = elem.style.display === 'none' ? 'block' : 'none';
  }
}

function toggleCompareProduct(productId) {
  if (!state.discoveryData) return;
  const item = (state.discoveryData.eligible_recommendations || []).find(p => p.product_id === productId);
  if (!item) return;

  const existsIdx = state.selectedForCompare.findIndex(p => p.product_id === productId);
  if (existsIdx >= 0) {
    state.selectedForCompare.splice(existsIdx, 1);
  } else {
    if (state.selectedForCompare.length >= 4) {
      alert("You can select up to 4 products to compare side-by-side.");
      return;
    }
    state.selectedForCompare.push(item);
  }

  renderRecommendationsView(state.discoveryData);
}

function updateCompareDock() {
  const dock = document.getElementById('compare-dock');
  if (!dock) return;

  const count = state.selectedForCompare.length;
  if (count > 0) {
    dock.classList.add('show');
    document.getElementById('dock-count').innerText = `${count} Product${count > 1 ? 's' : ''} Selected`;
    document.getElementById('dock-names').innerText = state.selectedForCompare.map(p => p.product_name).join(', ');
  } else {
    dock.classList.remove('show');
  }
}

// COMPARE VIEW
function renderCompareView() {
  const container = document.getElementById('compare-table-container');
  if (!container) return;

  if (state.selectedForCompare.length < 2) {
    container.innerHTML = `
      <div class="card" style="text-align: center; padding: 40px;">
        <h3 style="color: var(--primary); margin-bottom: 8px;">Select Products to Compare</h3>
        <p style="font-size: 13px; color: var(--slate-500); margin-bottom: 16px;">
          Please select at least 2 eligible loan products from the Recommendations page to view a side-by-side comparison matrix.
        </p>
        <button class="btn btn-primary btn-sm" onclick="window.location.hash='#discover'">Go to Discovery</button>
      </div>
    `;
    return;
  }

  const items = state.selectedForCompare;

  container.innerHTML = `
    <table class="compare-matrix-table">
      <thead>
        <tr>
          <th style="width: 220px;">Attribute</th>
          ${items.map(p => `
            <th style="font-weight: 800; font-size: 15px; color: var(--primary);">
              ${p.product_name}
              <div style="font-size: 10px; font-weight: normal; color: var(--slate-400); font-family: monospace;">${p.product_id}</div>
            </th>
          `).join('')}
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Approval Probability</strong></td>
          ${items.map(p => `
            <td><span class="prob-val" style="font-size: 16px;">${p.approval_percentage}</span></td>
          `).join('')}
        </tr>
        <tr>
          <td><strong>Interest Rate Range</strong></td>
          ${items.map(p => `<td><strong>${p.interest_rate_range}</strong> (Nominal: ${p.interest_rate_annual}%)</td>`).join('')}
        </tr>
        <tr>
          <td><strong>Estimated Monthly EMI</strong></td>
          ${items.map(p => `<td style="font-size: 15px; font-weight: 800; color: var(--primary);">₹${Math.round(p.estimated_monthly_emi).toLocaleString('en-IN')}</td>`).join('')}
        </tr>
        <tr>
          <td><strong>Total Interest Payable</strong></td>
          ${items.map(p => `<td>₹${Math.round(p.estimated_total_interest).toLocaleString('en-IN')}</td>`).join('')}
        </tr>
        <tr>
          <td><strong>Total Repayment Amount</strong></td>
          ${items.map(p => `<td style="color: var(--success); font-weight: 800;">₹${Math.round(p.estimated_total_payment).toLocaleString('en-IN')}</td>`).join('')}
        </tr>
        <tr>
          <td><strong>Tenure Options</strong></td>
          ${items.map(p => `<td>${p.min_tenure_months} - ${p.max_tenure_months} Months</td>`).join('')}
        </tr>
        <tr>
          <td><strong>Processing Fee</strong></td>
          ${items.map(p => `<td>${p.processing_fee_est}</td>`).join('')}
        </tr>
        <tr>
          <td><strong>Prepayment Penalty</strong></td>
          ${items.map(p => `<td>${p.prepayment_penalty ? 'Applicable' : 'Nil / Zero Penalty'}</td>`).join('')}
        </tr>
        <tr>
          <td><strong>ML Calibrated Pipeline</strong></td>
          ${items.map(p => `<td style="font-family: monospace; font-size: 11px;">${p.model_version}</td>`).join('')}
        </tr>
      </tbody>
    </table>
  `;
}

// LOAN OPTIMISER (REPAYMENT SIMULATOR)
async function loadOptimiserView() {
  if (!state.applicant) return;

  // Load existing loans if not loaded
  if (!state.activeLoans.length) {
    try {
      const res = await api.getExistingLoans(state.applicant.applicant_id);
      if (res.success && (res.loans || res.data)) {
        state.activeLoans = res.loans || res.data || [];
      }
    } catch (err) {
      console.warn("Could not fetch loans for optimiser:", err);
    }
  }

  // Populate Loan Selector
  const selector = document.getElementById('opt-loan-select');
  if (selector && state.activeLoans.length) {
    selector.innerHTML = state.activeLoans.map(l => `
      <option value="${l.loan_account_id}">${l.loan_type} Loan (${l.loan_account_id}) - Bal: ₹${Math.round(l.remaining_loan_amount_inr).toLocaleString('en-IN')}</option>
    `).join('');

    // Select first or current
    if (!state.currentLoanForOptimiser) {
      state.currentLoanForOptimiser = state.activeLoans[0];
    }
    selector.value = state.currentLoanForOptimiser.loan_account_id;
  }

  renderOptimiserSnapshot();
}

function selectLoanForOptimiser(loanAccountId) {
  const loan = state.activeLoans.find(l => l.loan_account_id === loanAccountId);
  if (loan) {
    state.currentLoanForOptimiser = loan;
    window.location.hash = '#optimizer';
  }
}

function onOptimiserLoanChanged() {
  const select = document.getElementById('opt-loan-select');
  const loanId = select.value;
  const loan = state.activeLoans.find(l => l.loan_account_id === loanId);
  if (loan) {
    state.currentLoanForOptimiser = loan;
    renderOptimiserSnapshot();
  }
}

let optimiserDebounceTimer = null;

function renderOptimiserSnapshot() {
  const loan = state.currentLoanForOptimiser;
  if (!loan) return;

  const currentEmi = Math.round(Number(loan.emi_inr));
  const balance = Math.round(Number(loan.remaining_loan_amount_inr));
  const rate = Number(loan.annual_interest_rate_pct);
  const remainingTenure = Number(loan.remaining_tenure_months);

  // Baseline 4 KPIs
  document.getElementById('opt-bal-amount').innerText = '₹' + balance.toLocaleString('en-IN');
  document.getElementById('opt-cur-emi').innerText = '₹' + currentEmi.toLocaleString('en-IN');
  document.getElementById('opt-rem-tenure').innerText = `${remainingTenure} Months`;
  document.getElementById('opt-int-rate').innerText = `${rate}% p.a.`;

  // Dynamic min and max EMI derived strictly from database record
  const dbMin = Number(loan.min_emi_allowed_inr) || 1000;
  const dbMax = Number(loan.max_emi_allowed_inr) || 30000;

  // Accrued monthly interest boundary to ensure reducing-balance amortisation holds
  const monthlyInterest = Math.ceil(balance * (rate / 100) / 12);
  const minViable = monthlyInterest + 100;
  const minEmi = Math.max(dbMin, Math.ceil(minViable / 100) * 100);
  const maxEmi = Math.max(dbMax, Math.round(currentEmi * 2.5));

  // Configure slider
  const slider = document.getElementById('opt-emi-slider');
  if (slider) {
    slider.min = minEmi;
    slider.max = maxEmi;
    slider.step = 100;
    slider.value = currentEmi;
  }

  // Update labels
  const minLbl = document.getElementById('opt-slider-min-lbl');
  if (minLbl) minLbl.innerText = 'Min EMI: ₹' + minEmi.toLocaleString('en-IN');

  const baseLbl = document.getElementById('opt-slider-base-lbl');
  if (baseLbl) baseLbl.innerText = 'DB Baseline: ₹' + currentEmi.toLocaleString('en-IN');

  const maxLbl = document.getElementById('opt-slider-max-lbl');
  if (maxLbl) maxLbl.innerText = 'Max EMI: ₹' + maxEmi.toLocaleString('en-IN');

  const sumBase = document.getElementById('opt-summary-base-emi');
  if (sumBase) sumBase.innerText = '₹' + currentEmi.toLocaleString('en-IN');

  // Update display and trigger simulation
  updateOptimiserDisplay(currentEmi);
  runOptimiserSimulation();
}

function onOptimiserSliderInput() {
  const slider = document.getElementById('opt-emi-slider');
  if (!slider || !state.currentLoanForOptimiser) return;

  const proposedEmi = Number(slider.value);
  updateOptimiserDisplay(proposedEmi);

  clearTimeout(optimiserDebounceTimer);
  optimiserDebounceTimer = setTimeout(() => {
    runOptimiserSimulation();
  }, 100);
}

function updateOptimiserDisplay(proposedEmi) {
  const loan = state.currentLoanForOptimiser;
  if (!loan) return;

  const currentEmi = Math.round(Number(loan.emi_inr));
  const diff = proposedEmi - currentEmi;

  const displayEl = document.getElementById('opt-proposed-emi-display');
  if (displayEl) displayEl.innerText = '₹' + Math.round(proposedEmi).toLocaleString('en-IN');

  const summaryNewEl = document.getElementById('opt-summary-new-emi');
  if (summaryNewEl) summaryNewEl.innerText = '₹' + Math.round(proposedEmi).toLocaleString('en-IN');

  const bannerEl = document.getElementById('opt-impact-banner');
  const labelEl = document.getElementById('opt-impact-label');
  const amountEl = document.getElementById('opt-impact-amount');
  const subEl = document.getElementById('opt-impact-sub');
  const badgeEl = document.getElementById('opt-mode-badge');

  if (diff > 0) {
    if (badgeEl) {
      badgeEl.innerText = '⚡ Prepayment Mode';
      badgeEl.style.background = '#dbeafe';
      badgeEl.style.color = '#1e40af';
    }
    if (bannerEl) {
      bannerEl.style.background = '#eff6ff';
      bannerEl.style.borderColor = '#bfdbfe';
    }
    if (labelEl) {
      labelEl.innerText = 'Extra EMI that needs to be paid:';
      labelEl.style.color = '#1d4ed8';
    }
    if (amountEl) {
      amountEl.innerText = '+₹' + Math.round(diff).toLocaleString('en-IN') + ' / mo';
      amountEl.style.color = '#1e40af';
    }
    if (subEl) {
      subEl.innerText = `You are paying ₹${Math.round(diff).toLocaleString('en-IN')} extra each month over the current database EMI (₹${currentEmi.toLocaleString('en-IN')}).`;
      subEl.style.color = '#2563eb';
    }
  } else if (diff < 0) {
    const savedAmount = Math.abs(diff);
    if (badgeEl) {
      badgeEl.innerText = '💡 Monthly EMI Saved';
      badgeEl.style.background = '#d1fae5';
      badgeEl.style.color = '#065f46';
    }
    if (bannerEl) {
      bannerEl.style.background = '#ecfdf5';
      bannerEl.style.borderColor = '#a7f3d0';
    }
    if (labelEl) {
      labelEl.innerText = 'Monthly EMI Saved (Immediate Cash Relief):';
      labelEl.style.color = '#047857';
    }
    if (amountEl) {
      amountEl.innerText = '₹' + Math.round(savedAmount).toLocaleString('en-IN') + ' / mo saved';
      amountEl.style.color = '#065f46';
    }
    if (subEl) {
      subEl.innerText = `You save ₹${Math.round(savedAmount).toLocaleString('en-IN')} every month compared to your database baseline EMI (₹${currentEmi.toLocaleString('en-IN')}).`;
      subEl.style.color = '#059669';
    }
  } else {
    if (badgeEl) {
      badgeEl.innerText = '⚖️ Database Baseline';
      badgeEl.style.background = 'var(--primary-light)';
      badgeEl.style.color = 'var(--primary)';
    }
    if (bannerEl) {
      bannerEl.style.background = 'var(--slate-50)';
      bannerEl.style.borderColor = 'var(--slate-200)';
    }
    if (labelEl) {
      labelEl.innerText = 'Database Baseline EMI:';
      labelEl.style.color = 'var(--slate-500)';
    }
    if (amountEl) {
      amountEl.innerText = '₹' + Math.round(currentEmi).toLocaleString('en-IN') + ' / mo';
      amountEl.style.color = 'var(--dark)';
    }
    if (subEl) {
      subEl.innerText = 'Exact current monthly payment from database record. Move slider to simulate extra EMI or savings.';
      subEl.style.color = 'var(--slate-400)';
    }
  }
}

async function runOptimiserSimulation() {
  const loan = state.currentLoanForOptimiser;
  if (!loan) return;

  const slider = document.getElementById('opt-emi-slider');
  const proposedEmi = Number(slider?.value || loan.emi_inr);
  const currentEmi = Math.round(loan.emi_inr);
  const diff = proposedEmi - currentEmi;

  try {
    const res = await api.simulateOptimization({
      loan_account_id: loan.loan_account_id,
      proposed_emi: proposedEmi
    });

    if (res.success && res.simulation) {
      const sim = res.simulation;
      const baseline = sim.baseline;
      const proposed = sim.proposed;
      const savings = sim.savings;

      // Tenure KPI Card
      const tenureCard = document.getElementById('opt-kpi-tenure-card');
      const tenureTitle = document.getElementById('opt-kpi-tenure-title');
      const tenureVal = document.getElementById('opt-months-saved');
      const tenureSub = document.getElementById('opt-kpi-tenure-sub');

      // Interest KPI Card
      const intCard = document.getElementById('opt-kpi-interest-card');
      const intTitle = document.getElementById('opt-kpi-interest-title');
      const intVal = document.getElementById('opt-int-saved');
      const intSub = document.getElementById('opt-kpi-interest-sub');

      if (diff > 0) {
        if (tenureCard) {
          tenureCard.style.background = '#ecfdf5';
          tenureCard.style.borderColor = '#a7f3d0';
        }
        if (tenureTitle) {
          tenureTitle.innerText = 'Tenure Reduction';
          tenureTitle.style.color = '#065f46';
        }
        if (tenureVal) {
          tenureVal.innerText = `${savings.tenure_months_saved} Months Saved`;
          tenureVal.style.color = '#065f46';
        }
        if (tenureSub) {
          tenureSub.innerText = `Debt-free ${savings.tenure_months_saved} months earlier`;
          tenureSub.style.color = '#047857';
        }

        if (intCard) {
          intCard.style.background = '#eff6ff';
          intCard.style.borderColor = '#bfdbfe';
        }
        if (intTitle) {
          intTitle.innerText = 'Total Interest Saved';
          intTitle.style.color = 'var(--primary)';
        }
        if (intVal) {
          intVal.innerText = '₹' + Math.round(savings.interest_saved).toLocaleString('en-IN');
          intVal.style.color = 'var(--primary)';
        }
        if (intSub) {
          intSub.innerText = 'Guaranteed money saved in interest';
          intSub.style.color = '#1d4ed8';
        }

        const noteEl = document.getElementById('opt-insight-note');
        if (noteEl) {
          noteEl.innerHTML = `<strong>Extra EMI Benefit:</strong> Paying <strong>+₹${diff.toLocaleString('en-IN')}/mo</strong> extra repays your loan <strong>${savings.tenure_months_saved} months sooner</strong>, saving <strong>₹${Math.round(savings.interest_saved).toLocaleString('en-IN')}</strong> in total interest.`;
          noteEl.style.borderLeftColor = 'var(--primary)';
        }

      } else if (diff < 0) {
        const savedPerMonth = Math.abs(diff);
        const monthsExtended = Math.abs(savings.tenure_months_saved);
        const extraInterest = Math.abs(savings.interest_saved);

        if (tenureCard) {
          tenureCard.style.background = '#fffbeb';
          tenureCard.style.borderColor = '#fde68a';
        }
        if (tenureTitle) {
          tenureTitle.innerText = 'Tenure Extension';
          tenureTitle.style.color = '#92400e';
        }
        if (tenureVal) {
          tenureVal.innerText = `+${monthsExtended} Months`;
          tenureVal.style.color = '#b45309';
        }
        if (tenureSub) {
          tenureSub.innerText = `Repayment duration extended`;
          tenureSub.style.color = '#92400e';
        }

        if (intCard) {
          intCard.style.background = '#ecfdf5';
          intCard.style.borderColor = '#a7f3d0';
        }
        if (intTitle) {
          intTitle.innerText = 'Monthly Cash Flow Saved';
          intTitle.style.color = '#065f46';
        }
        if (intVal) {
          intVal.innerText = '₹' + Math.round(savedPerMonth).toLocaleString('en-IN') + '/mo';
          intVal.style.color = '#065f46';
        }
        if (intSub) {
          intSub.innerText = `Immediate cash back in your monthly budget`;
          intSub.style.color = '#047857';
        }

        const noteEl = document.getElementById('opt-insight-note');
        if (noteEl) {
          noteEl.innerHTML = `<strong>Cash Flow Relief:</strong> By lowering your EMI, you save <strong>₹${Math.round(savedPerMonth).toLocaleString('en-IN')} every month</strong>. Your repayment is extended by <strong>${monthsExtended} months</strong> with ₹${Math.round(extraInterest).toLocaleString('en-IN')} in total additional interest.`;
          noteEl.style.borderLeftColor = '#10b981';
        }

      } else {
        if (tenureCard) {
          tenureCard.style.background = '#f8fafc';
          tenureCard.style.borderColor = '#e2e8f0';
        }
        if (tenureTitle) {
          tenureTitle.innerText = 'Remaining Tenure';
          tenureTitle.style.color = 'var(--slate-500)';
        }
        if (tenureVal) {
          tenureVal.innerText = `${baseline.remaining_tenure_months} Months`;
          tenureVal.style.color = 'var(--dark)';
        }
        if (tenureSub) {
          tenureSub.innerText = `Current scheduled baseline`;
          tenureSub.style.color = 'var(--slate-400)';
        }

        if (intCard) {
          intCard.style.background = '#f8fafc';
          intCard.style.borderColor = '#e2e8f0';
        }
        if (intTitle) {
          intTitle.innerText = 'Total Interest Payable';
          intTitle.style.color = 'var(--slate-500)';
        }
        if (intVal) {
          intVal.innerText = '₹' + Math.round(baseline.total_interest_payable).toLocaleString('en-IN');
          intVal.style.color = 'var(--dark)';
        }
        if (intSub) {
          intSub.innerText = `Baseline cumulative interest`;
          intSub.style.color = 'var(--slate-400)';
        }

        const noteEl = document.getElementById('opt-insight-note');
        if (noteEl) {
          noteEl.innerHTML = `<strong>Database Baseline:</strong> Currently scheduled at <strong>₹${currentEmi.toLocaleString('en-IN')}/mo</strong> for <strong>${baseline.remaining_tenure_months} months</strong>. Drag the scroll bar to see extra EMI prepayment or monthly savings.`;
          noteEl.style.borderLeftColor = 'var(--primary)';
        }
      }

      // Comparison details
      document.getElementById('opt-new-tenure').innerText = `${proposed.remaining_tenure_months} Mo (${(proposed.remaining_tenure_months / 12).toFixed(1)} Yrs)`;
      document.getElementById('opt-new-payoff').innerText = proposed.estimated_maturity_date || '--';
      document.getElementById('opt-new-interest').innerText = '₹' + Math.round(proposed.total_interest_payable).toLocaleString('en-IN');
      document.getElementById('opt-new-total').innerText = '₹' + Math.round(proposed.total_repayment_amount).toLocaleString('en-IN');

      // Amortisation Schedule Table
      renderAmortisationTable(sim.amortization_schedule || []);
    }
  } catch (err) {
    console.error("Simulation error:", err);
  }
}

function renderAmortisationTable(schedule) {
  const container = document.getElementById('opt-amort-body');
  if (!container) return;

  // Render first 24 months + final row
  const rows = schedule.slice(0, 24);
  container.innerHTML = rows.map(r => `
    <tr>
      <td>${r.month}</td>
      <td>₹${Math.round(r.beginning_balance).toLocaleString('en-IN')}</td>
      <td>₹${Math.round(r.emi).toLocaleString('en-IN')}</td>
      <td>₹${Math.round(r.principal_paid).toLocaleString('en-IN')}</td>
      <td>₹${Math.round(r.interest_paid).toLocaleString('en-IN')}</td>
      <td><strong>₹${Math.round(r.ending_balance).toLocaleString('en-IN')}</strong></td>
    </tr>
  `).join('');
}

// STANDALONE EMI CALCULATOR
function initCalculatorView() {
  calculateStandaloneEMI();
}

function calculateStandaloneEMI() {
  const P = Number(document.getElementById('calc-p')?.value || 1000000);
  const R = Number(document.getElementById('calc-r')?.value || 9.5);
  const N = Number(document.getElementById('calc-n')?.value || 60);

  document.getElementById('calc-p-val').innerText = '₹' + P.toLocaleString('en-IN');
  document.getElementById('calc-r-val').innerText = `${R}%`;
  document.getElementById('calc-n-val').innerText = `${N} Mo (${N / 12} Yrs)`;

  const r = (R / 12) / 100;
  const emi = (P * r * Math.pow(1 + r, N)) / (Math.pow(1 + r, N) - 1);
  const totalPayment = emi * N;
  const totalInterest = totalPayment - P;

  document.getElementById('calc-emi-result').innerText = '₹' + Math.round(emi).toLocaleString('en-IN');
  document.getElementById('calc-int-result').innerText = '₹' + Math.round(totalInterest).toLocaleString('en-IN');
  document.getElementById('calc-total-result').innerText = '₹' + Math.round(totalPayment).toLocaleString('en-IN');
}

// PROFILE
function loadProfileView() {
  if (!state.applicant) return;
  const a = state.applicant;

  document.getElementById('prof-name').value = a.full_name;
  document.getElementById('prof-pan').value = a.pan_number;
  document.getElementById('prof-age').value = a.age;
  document.getElementById('prof-income').value = a.monthly_income_inr;
  document.getElementById('prof-cibil').value = a.credit_score;
  document.getElementById('prof-emp').value = a.employment_type;
  document.getElementById('prof-exp').value = a.employment_experience_years;
  document.getElementById('prof-emi').value = a.existing_emi_inr;
  document.getElementById('prof-active').value = a.existing_active_loans;
  document.getElementById('prof-expenses').value = a.monthly_household_expenses_inr;
  document.getElementById('prof-bank').value = a.average_bank_balance_inr;
  document.getElementById('prof-dep').value = a.number_of_dependents;
}

async function saveProfile(e) {
  e.preventDefault();
  if (!state.applicant) return;

  const data = {
    full_name: document.getElementById('prof-name').value,
    age: Number(document.getElementById('prof-age').value),
    monthly_income_inr: Number(document.getElementById('prof-income').value),
    credit_score: Number(document.getElementById('prof-cibil').value),
    employment_type: document.getElementById('prof-emp').value,
    employment_experience_years: Number(document.getElementById('prof-exp').value),
    monthly_household_expenses_inr: Number(document.getElementById('prof-expenses').value),
    average_bank_balance_inr: Number(document.getElementById('prof-bank').value),
    number_of_dependents: Number(document.getElementById('prof-dep').value)
  };

  try {
    const res = await api.updateApplicantProfile(state.applicant.applicant_id, data);
    if (res.success && res.data) {
      state.applicant = res.data;
      api.setApplicant(res.data);
      alert("Profile updated successfully!");
      updateNavbar();
      window.location.hash = '#dashboard';
    } else {
      alert("Update failed: " + (res.error || "Unknown error"));
    }
  } catch (err) {
    alert("Connection error while updating profile.");
  }
}

// REGISTER NEW APPLICANT
async function submitRegistration(e) {
  e.preventDefault();

  const data = {
    full_name: document.getElementById('reg-name').value,
    pan_number: document.getElementById('reg-pan').value.toUpperCase(),
    age: Number(document.getElementById('reg-age').value),
    monthly_income_inr: Number(document.getElementById('reg-income').value),
    credit_score: Number(document.getElementById('reg-cibil').value),
    employment_type: document.getElementById('reg-emp').value,
    employment_experience_years: Number(document.getElementById('reg-exp').value),
    existing_emi_inr: Number(document.getElementById('reg-emi').value || 0),
    existing_active_loans: Number(document.getElementById('reg-loans').value || 0),
    monthly_household_expenses_inr: Number(document.getElementById('reg-expenses').value || 0),
    average_bank_balance_inr: Number(document.getElementById('reg-bank').value || 0),
    number_of_dependents: Number(document.getElementById('reg-dep').value || 0)
  };

  try {
    const res = await api.register(data);
    if (res.success && res.data) {
      state.applicant = res.data;
      api.setApplicant(res.data);
      alert("Registration successful! Welcome to LoanIQ.");
      updateNavbar();
      window.location.hash = '#dashboard';
    } else {
      alert("Registration failed: " + (res.error || "Please check your inputs"));
    }
  } catch (err) {
    alert("Connection error contacting LoanIQ registration endpoint.");
  }
}

// SETUP EVENT LISTENERS
function setupEventListeners() {
  // Discovery amount and tenure change listeners for live calculation
  document.getElementById('disc-amount')?.addEventListener('input', updateDiscoveryLiveSummary);
  document.getElementById('disc-tenure')?.addEventListener('input', updateDiscoveryLiveSummary);

  // Discovery form submit
  document.getElementById('discovery-form')?.addEventListener('submit', submitDiscoveryForm);

  // Optimiser Extra EMI slider
  document.getElementById('opt-extra-slider')?.addEventListener('input', runOptimiserSimulation);

  // Standalone calculator sliders
  document.getElementById('calc-p')?.addEventListener('input', calculateStandaloneEMI);
  document.getElementById('calc-r')?.addEventListener('input', calculateStandaloneEMI);
  document.getElementById('calc-n')?.addEventListener('input', calculateStandaloneEMI);

  // Profile form
  document.getElementById('profile-form')?.addEventListener('submit', saveProfile);

  // Registration form
  document.getElementById('register-form')?.addEventListener('submit', submitRegistration);
}
