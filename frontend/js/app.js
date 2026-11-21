/**
 * LoanIQ Main Application Controller (Vanilla ES6)
 * Handles state, hash-based routing, user sessions, discovery forms,
 * ML recommendations, comparison matrix, and reducing-balance repayment optimiser.
 */

// Global App State
const state = {
  version: api.getVersion(),
  applicant: null,
  activeCategory: 'home',
  discoveryData: null,
  selectedForCompare: [],
  activeLoans: [],
  currentLoanForOptimiser: null,
  lumpSumPayment: 0,
  lastSimResult: null,
  demoUsers: []
};

// Toast Notification
function showToast(message, duration = 3500) {
  const container = document.getElementById('loaniq-toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'loaniq-toast';
  toast.innerHTML = `<span>✨</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('hide');
    setTimeout(() => toast.remove(), 350);
  }, duration);
}

// Version Switcher Controller
async function switchVersion(newVersion) {
  const v = (newVersion || 'v1').toLowerCase().trim();
  api.setVersion(v);
  state.version = v;

  // Clear transient state from previous version to avoid cross-contamination
  state.activeLoans = [];
  state.currentLoanForOptimiser = null;
  state.discoveryData = null;
  state.selectedForCompare = [];

  // 1. Update UI buttons and badges immediately
  updateVersionButtonsUI();
  updateHeroModelCard();
  updateDashboardVersionBanner();

  // 2. Refresh demo users list for new version
  try {
    const res = await api.getDemoUsers();
    if (res.success && res.data) {
      state.demoUsers = res.data;
      renderDemoUserSwitcher();
      renderLoginDropdown();
    }
  } catch (err) {
    console.warn("Could not fetch demo users on version switch:", err);
  }

  // 3. Resolve active applicant for target version
  let currentApp = api.getApplicant();
  let validProfile = null;
  if (currentApp && currentApp.applicant_id) {
    try {
      const pRes = await api.getApplicantProfile(currentApp.applicant_id);
      if (pRes.success && pRes.data) {
        validProfile = pRes.data;
      }
    } catch (e) {}
  }

  if (!validProfile) {
    const defaultId = v === 'v2' ? 'APP0001' : 'USR0007';
    try {
      const pRes = await api.getApplicantProfile(defaultId);
      if (pRes.success && pRes.data) {
        validProfile = pRes.data;
      }
    } catch (e) {}
  }

  if (validProfile) {
    state.applicant = validProfile;
    api.setApplicant(validProfile);
  }

  // 4. Update Navbar
  updateNavbar();

  // 5. Refresh current view
  const hash = window.location.hash || '#landing';
  const cleanHash = hash.split('?')[0];
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
  }

  // 6. Toast confirmation
  if (v === 'v2') {
    showToast("Active: Engine 2.0 (High-Precision Matching)");
  } else {
    showToast("Active: Engine 1.0 (Standard Matching)");
  }
}

function updateVersionButtonsUI() {
  const v = api.getVersion();
  const isV1 = v === 'v1';

  const navV1 = document.getElementById('nav-ver-v1');
  const navV2 = document.getElementById('nav-ver-v2');
  if (navV1) navV1.classList.toggle('active', isV1);
  if (navV2) navV2.classList.toggle('active', !isV1);

  const dashV1 = document.getElementById('dash-ver-v1');
  const dashV2 = document.getElementById('dash-ver-v2');
  if (dashV1) dashV1.classList.toggle('active', isV1);
  if (dashV2) dashV2.classList.toggle('active', !isV1);
}

function updateDashboardVersionBanner() {
  const v = api.getVersion();
  const pill = document.getElementById('dash-ver-pill');
  const title = document.getElementById('dash-ver-title-text');
  const desc = document.getElementById('dash-ver-desc-text');
  if (!pill || !title || !desc) return;

  if (v === 'v2') {
    pill.innerText = 'LoanIQ 2.0';
    pill.style.background = '#00BAF2';
    pill.style.color = '#002E6E';
    title.innerText = 'Smart Lending & Pre-Qualification Active';
    desc.innerText = 'Real-time underwriting evaluation across 16 verified lending partners with zero sensitive data disclosure.';
  } else {
    pill.innerText = 'LoanIQ 1.0';
    pill.style.background = '#00BAF2';
    pill.style.color = '#002E6E';
    title.innerText = 'Standard Lending & Pre-Qualification Active';
    desc.innerText = 'Automated underwriting evaluation across verified lending partners with institutional credit standards.';
  }
}

function updateHeroModelCard() {
  const v = api.getVersion();
  const badge = document.getElementById('hero-engine-ver-badge');
  const sub = document.getElementById('hero-engine-sub');
  const rows = document.getElementById('hero-model-rows');
  const footer = document.getElementById('hero-engine-footer');
  if (!rows) return;

  if (v === 'v2') {
    if (badge) badge.innerText = 'Verified Lenders';
    if (sub) sub.innerText = 'Real-Time Bank Eligibility & Rate Matching';
    if (footer) footer.innerText = '16 Verified Banking Products • 100 Sample Customer Profiles';
    rows.innerHTML = `
      <div class="model-row">
        <div>
          <div class="model-name">Car Financing</div>
          <div class="model-sub">12 Leading Banking Partners</div>
        </div>
        <div class="model-auc" style="color: #065f46; background: #ecfdf5; border-color: #a7f3d0;">Rates from 8.8%</div>
      </div>
      <div class="model-row">
        <div>
          <div class="model-name">Home Mortgages</div>
          <div class="model-sub">Flexible Tenure & Top-ups</div>
        </div>
        <div class="model-auc" style="color: #065f46; background: #ecfdf5; border-color: #a7f3d0;">Rates from 8.4%</div>
      </div>
      <div class="model-row">
        <div>
          <div class="model-name">Higher Education</div>
          <div class="model-sub">Domestic & International Study</div>
        </div>
        <div class="model-auc" style="color: #065f46; background: #ecfdf5; border-color: #a7f3d0;">Rates from 9.2%</div>
      </div>
      <div class="model-row">
        <div>
          <div class="model-name">Personal Lending</div>
          <div class="model-sub">Instant Digital Disbursal</div>
        </div>
        <div class="model-auc" style="color: #065f46; background: #ecfdf5; border-color: #a7f3d0;">Rates from 11.5%</div>
      </div>
    `;
  } else {
    if (badge) badge.innerText = 'Verified Lenders';
    if (sub) sub.innerText = 'Standard Pre-Qualification & Rate Matching';
    if (footer) footer.innerText = '16 Verified Banking Products • 100 Sample Customer Profiles';
    rows.innerHTML = `
      <div class="model-row">
        <div>
          <div class="model-name">Car Financing</div>
          <div class="model-sub">Leading Banking Partners</div>
        </div>
        <div class="model-auc" style="color: #065f46; background: #ecfdf5; border-color: #a7f3d0;">Rates from 8.8%</div>
      </div>
      <div class="model-row">
        <div>
          <div class="model-name">Home Mortgages</div>
          <div class="model-sub">Standard Home Loans</div>
        </div>
        <div class="model-auc" style="color: #065f46; background: #ecfdf5; border-color: #a7f3d0;">Rates from 8.4%</div>
      </div>
      <div class="model-row">
        <div>
          <div class="model-name">Higher Education</div>
          <div class="model-sub">University & College Schemes</div>
        </div>
        <div class="model-auc" style="color: #065f46; background: #ecfdf5; border-color: #a7f3d0;">Rates from 9.2%</div>
      </div>
      <div class="model-row">
        <div>
          <div class="model-name">Personal Lending</div>
          <div class="model-sub">Unsecured Personal Loans</div>
        </div>
        <div class="model-auc" style="color: #065f46; background: #ecfdf5; border-color: #a7f3d0;">Rates from 11.5%</div>
      </div>
    `;
  }
}

// Document Ready
document.addEventListener('DOMContentLoaded', async () => {
  // 1. Sync version UI
  updateVersionButtonsUI();
  updateHeroModelCard();
  updateDashboardVersionBanner();

  // 2. Check for logged in user in localStorage
  state.applicant = api.getApplicant();
  
  // 3. Fetch demo users for the switcher
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

  // 4. Auto-resolve default demo user (APP0001) if not set or legacy
  if ((!state.applicant || state.applicant.applicant_id?.startsWith('USR')) && state.demoUsers.length) {
    const defaultUser = state.demoUsers.find(u => u.applicant_id === 'APP0001') || state.demoUsers[0];
    if (defaultUser) {
      state.applicant = defaultUser;
      api.setApplicant(defaultUser);
    }
  }

  // 5. Listen for hash changes
  window.addEventListener('hashchange', handleRouting);

  // 6. Set initial view
  if (!window.location.hash) {
    window.location.hash = state.applicant ? '#dashboard' : '#landing';
  } else {
    handleRouting();
  }

  // 7. Update Navbar
  updateNavbar();

  // 8. Setup Event Listeners
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

function loginDefaultDemo() {
  const v = api.getVersion();
  const defaultId = v === 'v2' ? 'APP0001' : 'USR0007';
  loginDemoUser(defaultId);
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
          <div class="dropdown-menu" id="user-dropdown" style="width: 280px; max-height: 440px; overflow-y: auto;">
            <div style="padding: 10px 16px; border-bottom: 1px solid var(--slate-100);">
              <div style="font-size: 10px; color: var(--slate-400); text-transform: uppercase; font-weight: 700;">Active Customer</div>
              <div style="font-weight: 800; font-size: 13px; color: var(--primary);">${state.applicant.full_name}</div>
              <div style="font-size: 11px; color: var(--slate-500); font-family: monospace;">PAN: ${state.applicant.pan_number}</div>
            </div>
            <button class="dropdown-item" onclick="window.location.hash='#profile'">👤 View Full Profile</button>
            <button class="dropdown-item" onclick="window.location.hash='#discover'">✨ Discover Loans</button>
            <button class="dropdown-item" onclick="window.location.hash='#optimizer'">⚡ Loan Optimiser</button>

            <!-- Multi-Account Switcher in User Dropdown -->
            <div style="padding: 8px 16px 4px; font-size: 10px; color: var(--slate-400); text-transform: uppercase; font-weight: 700; border-top: 1px solid var(--slate-100); margin-top: 4px;">
              Switch Customer Profile:
            </div>
            <div style="max-height: 180px; overflow-y: auto;">
              ${(state.demoUsers || []).slice(0, 10).map(u => `
                <button class="dropdown-item ${u.applicant_id === state.applicant.applicant_id ? 'active' : ''}" 
                        onclick="loginDemoUser('${u.applicant_id}')"
                        style="font-size: 11px; padding: 6px 16px; display: flex; justify-content: space-between; align-items: center;">
                  <div>
                    <span style="font-weight: 700;">${u.full_name}</span>
                    <span style="font-size: 10px; color: var(--slate-400); font-family: monospace;"> (${u.applicant_id})</span>
                  </div>
                  <span class="badge-active" style="font-size: 9px; padding: 1px 4px;">★ ${u.credit_score}</span>
                </button>
              `).join('')}
            </div>

            <div style="border-top: 1px solid var(--slate-100); margin-top: 4px;">
              <button class="dropdown-item danger" onclick="logoutUser()">🚪 Sign Out</button>
            </div>
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
          <div class="dropdown-menu" id="nav-signin-menu" style="width: 310px; max-height: 420px; overflow-y: auto;">
            <div style="padding: 8px 14px; border-bottom: 1px solid var(--slate-100); font-size: 11px; font-weight: 700; color: var(--primary); text-transform: uppercase;">
              Select Customer Profile:
            </div>
            ${(state.demoUsers || []).slice(0, 15).map(u => `
              <button class="dropdown-item" onclick="loginDemoUser('${u.applicant_id}')" style="display: flex; justify-content: space-between; align-items: center; padding: 7px 14px;">
                <div>
                  <div style="font-weight: 700; color: var(--slate-800); font-size: 12px;">${u.full_name}</div>
                  <div style="font-size: 10px; color: var(--slate-400); font-family: monospace;">${u.applicant_id} • Score ${u.credit_score} • ₹${Math.round(u.monthly_income_inr).toLocaleString('en-IN')}/mo</div>
                </div>
                <span class="badge-active" style="font-size: 9px; padding: 2px 6px;">Select</span>
              </button>
            `).join('')}
            <div style="border-top: 1px solid var(--slate-100); padding: 4px 0;">
              <button class="dropdown-item" onclick="window.location.hash='#login'" style="font-weight: 700; color: var(--primary);">
                🔍 Open Full Sign In Page →
              </button>
            </div>
          </div>
        </div>

        <button class="btn btn-accent btn-sm" onclick="loginDefaultDemo()">Explore Profile</button>
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
  const title = document.getElementById('demo-switcher-title');
  const btn = document.getElementById('hero-quick-demo-btn');
  if (!container || !state.demoUsers.length) return;

  const isV2 = state.version === 'v2';
  if (title) {
    title.innerText = 'Sample Customer Profiles';
  }
  if (btn) {
    btn.innerText = isV2 ? 'Sample Profile (Rahul Sharma)' : 'Sample Profile (Sai Saxena)';
  }

  container.innerHTML = state.demoUsers.slice(0, 12).map(u => {
    let tag = '';
    if (isV2) {
      if (u.applicant_id === 'APP0001') tag = 'Prime Salaried';
      else if (u.applicant_id === 'APP0009') tag = 'Super-Prime 801';
      else if (u.applicant_id === 'APP0004') tag = 'High Income ₹80k';
      else if (u.applicant_id === 'APP0003') tag = 'Business';
      else if (u.applicant_id === 'APP0008') tag = 'Student';
      else if (u.applicant_id === 'APP0007') tag = 'Self-Employed (24)';
      else if (u.applicant_id === 'APP0013') tag = 'Top Earner ₹88k';
      else if (u.applicant_id === 'APP0006') tag = 'Salaried 717';
      else tag = u.employment_type;
    } else {
      if (u.applicant_id === 'USR0007') tag = 'Prime 772';
      else if (u.applicant_id === 'USR0001') tag = 'Prime 765';
      else if (u.applicant_id === 'USR0004') tag = 'High Score 780';
      else tag = u.employment_type.replace('_', ' ');
    }

    return `
      <button class="chip" onclick="loginDemoUser('${u.applicant_id}')" style="display: flex; gap: 4px; align-items: center; padding: 4px 10px;">
        <strong>${u.full_name}</strong>
        <span style="font-family: monospace; font-size: 10px; opacity: 0.8;">[${u.applicant_id}]</span>
        <span class="badge-active" style="font-size: 9px; padding: 1px 5px;">★ ${u.credit_score}</span>
        ${tag ? `<span style="font-size: 10px; color: var(--slate-500);">• ${tag}</span>` : ''}
      </button>
    `;
  }).join('');
}

function renderLoginDropdown() {
  const dropdown = document.getElementById('login-user-dropdown');
  const chipsContainer = document.getElementById('login-preset-chips');
  const verPill = document.getElementById('login-version-pill');
  const presetLabel = document.getElementById('login-preset-label');

  if (!state.demoUsers.length) return;
  const isV2 = state.version === 'v2';

  if (verPill) {
    verPill.innerText = 'Customer Portal';
  }
  if (presetLabel) {
    presetLabel.innerText = 'Or Quick Sign-In with Sample Profiles';
  }

  const defaultId = isV2 ? 'APP0001' : 'USR0007';

  if (dropdown) {
    dropdown.innerHTML = `
      <option value="">-- Select a Customer Profile to Explore --</option>
      ${state.demoUsers.map(u => `
        <option value="${u.applicant_id}" ${u.applicant_id === defaultId ? 'selected' : ''}>
          ${u.full_name} (${u.applicant_id} • Score: ${u.credit_score} • ₹${Math.round(u.monthly_income_inr).toLocaleString('en-IN')}/mo • ${u.employment_type.replace('_', ' ')})
        </option>
      `).join('')}
    `;
  }

  if (chipsContainer) {
    chipsContainer.innerHTML = state.demoUsers.slice(0, 8).map(u => `
      <button type="button" class="chip" onclick="loginDemoUser('${u.applicant_id}')" style="font-weight: 700; display: flex; gap: 4px; align-items: center; padding: 4px 10px;">
        <span>${u.full_name}</span>
        <span style="font-family: monospace; font-size: 10px; opacity: 0.8;">(${u.applicant_id})</span>
        <span class="badge-active" style="font-size: 9px; padding: 1px 4px;">★ ${u.credit_score}</span>
      </button>
    `).join('');
  }
}

function signInWithSelectedDropdownUser() {
  const dropdown = document.getElementById('login-user-dropdown');
  const selectedId = dropdown ? dropdown.value : null;
  if (!selectedId) {
    alert("Please select a customer profile from the dropdown menu.");
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
  const isV1 = state.version === 'v1' || api.getVersion() === 'v1';
  if (!applicantId) {
    applicantId = isV1 ? 'USR0007' : 'APP0001';
  } else if (isV1 && applicantId.startsWith('APP')) {
    applicantId = 'USR0007';
  } else if (!isV1 && applicantId.startsWith('USR')) {
    applicantId = 'APP0001';
  }

  try {
    const res = await api.getApplicantProfile(applicantId);
    const user = res.applicant || res.data;
    if (res.success && user) {
      state.applicant = user;
      api.setApplicant(user);
      updateNavbar();
      window.location.hash = '#dashboard';
      showToast(`Signed in as ${user.full_name} (${user.applicant_id})`);
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
  showToast("Signed out successfully");
}

// DASHBOARD
async function loadDashboard() {
  if (!state.applicant) return;

  // Sync version UI cards & badges
  updateVersionButtonsUI();
  updateDashboardVersionBanner();

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

  // Populate Dashboard Switch User Menu
  const switchMenu = document.getElementById('dash-switch-user-menu');
  const switchBtn = document.getElementById('dash-switch-user-btn');
  if (switchMenu && state.demoUsers.length) {
    switchMenu.innerHTML = `
      <div style="padding: 8px 14px; border-bottom: 1px solid var(--slate-100); font-size: 11px; font-weight: 700; color: var(--primary); text-transform: uppercase;">
        Select ${state.version.toUpperCase()} Demo Applicant:
      </div>
      ${state.demoUsers.slice(0, 20).map(u => `
        <button class="dropdown-item ${u.applicant_id === state.applicant.applicant_id ? 'active' : ''}" 
                onclick="loginDemoUser('${u.applicant_id}')" 
                style="display: flex; justify-content: space-between; align-items: center; padding: 7px 14px;">
          <div>
            <div style="font-weight: 700; color: var(--slate-800); font-size: 12px;">${u.full_name}</div>
            <div style="font-size: 10px; color: var(--slate-400); font-family: monospace;">${u.applicant_id} • CIBIL ${u.credit_score} • ₹${Math.round(u.monthly_income_inr).toLocaleString('en-IN')}/mo</div>
          </div>
          <span class="badge-active" style="font-size: 9px; padding: 2px 6px;">${u.applicant_id === state.applicant.applicant_id ? 'Active' : 'Switch'}</span>
        </button>
      `).join('')}
    `;

    if (switchBtn) {
      switchBtn.onclick = (e) => {
        e.stopPropagation();
        switchMenu.classList.toggle('show');
      };
      document.addEventListener('click', () => switchMenu.classList.remove('show'));
    }
  }

  // Fetch live dashboard & active loans from backend service
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
  submitBtn.innerHTML = `<span>Evaluating Lender Approval Fit...</span>`;

  const amount = Number(document.getElementById('disc-amount').value);
  const tenure = Number(document.getElementById('disc-tenure').value);

  // Category specific details (Strict V2 Feature Schemas)
  let categoryDetails = {};
  if (state.activeCategory === 'car') {
    const vehPrice = Number(document.getElementById('car-price')?.value || amount * 1.25);
    const dp = Number(document.getElementById('car-dp')?.value || Math.max(0, vehPrice - amount));
    categoryDetails = {
      vehicle_price_inr: vehPrice,
      down_payment_inr: dp,
      vehicle_condition: document.getElementById('car-condition')?.value || 'New',
      vehicle_type: document.getElementById('car-type')?.value || 'Sedan'
    };
  } else if (state.activeCategory === 'home') {
    const propVal = Number(document.getElementById('home-val')?.value || amount * 1.25);
    const dp = Number(document.getElementById('home-dp')?.value || Math.max(0, propVal - amount));
    categoryDetails = {
      property_value_inr: propVal,
      down_payment_inr: dp,
      property_type: document.getElementById('home-type')?.value || 'Apartment',
      city_tier: document.getElementById('home-tier')?.value || 'Tier 1'
    };
  } else if (state.activeCategory === 'education') {
    categoryDetails = {
      course_cost_inr: Number(document.getElementById('edu-cost')?.value || amount),
      course_level: document.getElementById('edu-level')?.value || 'Postgraduate',
      study_destination: document.getElementById('edu-dest')?.value || 'India',
      collateral_available: document.getElementById('edu-collateral')?.value || 'Yes'
    };
  } else if (state.activeCategory === 'personal') {
    categoryDetails = {
      loan_purpose: document.getElementById('pers-purpose')?.value || 'Home improvement',
      co_applicant: document.getElementById('pers-coapp')?.value || 'No'
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
    alert("Unable to connect to LoanIQ loan recommendation service. Please ensure the server is running.");
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
        <h3 style="color: var(--primary); margin-bottom: 8px;">No Loan Products Meet Your Current Criteria</h3>
        <p style="font-size: 13px; color: var(--slate-500); max-width: 500px; margin: 0 auto;">
          None of the available lender products match your requested loan amount, tenure, or current financial parameters. You can adjust your requested amount or review the Ineligible tab for details.
        </p>
      </div>
    `;
  } else {
    eligibleContainer.innerHTML = eligible.map((item, idx) => {
      const isTop = idx === 0;
      const isSelected = state.selectedForCompare.some(p => p.product_id === item.product_id);
      const isRejected = item.is_predicted_rejected || (item.predicted_approval_probability < 0.5);
      const probVal = isRejected
        ? (item.rejection_percentage || item.display_percentage || ((1 - item.predicted_approval_probability) * 100).toFixed(1) + '%')
        : (item.approval_percentage || item.display_percentage);
      const probLabel = isRejected ? 'Rejection Probability' : 'Approval Likelihood';

      return `
        <div class="rec-card ${isTop ? 'top-fit' : ''}">
          <div class="rec-card-body">
            
            <!-- Left: Brand & Fit -->
            <div>
              <div style="display: flex; gap: 6px; align-items: center; margin-bottom: 4px;">
                <span style="font-family: monospace; font-size: 10px; background: var(--slate-100); padding: 2px 6px; border-radius: 4px; font-weight: 700;">${item.product_id}</span>
                ${isTop ? `<span class="badge-active" style="font-size: 10px;">★ Top Recommendation</span>` : ''}
              </div>
              <h4 style="font-size: 16px; font-weight: 800; color: var(--primary); margin-bottom: 8px;">${item.product_name}</h4>
              
              <div class="prob-meter ${isRejected ? 'rejected' : ''}">
                <span class="prob-val">${probVal}</span>
                <span class="prob-label">${probLabel}</span>
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
                ℹ️ View Eligibility Checks
              </button>
            </div>

          </div>

          <!-- Eligibility Checks Accordion -->
          <div id="gate-accordion-${item.product_id}" style="display: none; margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--slate-200); background: var(--slate-50); padding: 12px; border-radius: var(--radius-sm);">
            <div style="font-size: 11px; font-weight: 700; color: var(--primary); margin-bottom: 6px; text-transform: uppercase;">Standard Underwriting Checks (Passed):</div>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; font-size: 11px;">
              ${(item.eligibility_reasons || []).map(r => `
                <div style="background: var(--white); padding: 6px 8px; border-radius: 4px; border: 1px solid #d1fae5; color: #065f46;">
                  ✓ ${r.description}
                </div>
              `).join('')}
            </div>
            <div style="font-size: 10px; color: var(--slate-400); margin-top: 6px; font-family: monospace;">
              Underwriting: Instant Assessment • Processing Fee: ${item.processing_fee_est}
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
          <div style="display: flex; gap: 8px; align-items: center;">
            <span style="font-size: 11px; font-weight: 700; color: #b91c1c; background: #fef2f2; border: 1px solid #fecaca; padding: 2px 8px; border-radius: 4px;">
              ${p.rejection_percentage || '100.0%'} Rejection
            </span>
            <span style="font-size: 11px; font-family: monospace; color: var(--slate-500);">${p.product_id}</span>
          </div>
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
          <td><strong>Prediction / Likelihood</strong></td>
          ${items.map(p => {
            const isRej = p.is_predicted_rejected || (p.predicted_approval_probability < 0.5);
            const val = isRej
              ? (p.rejection_percentage || p.display_percentage || ((1 - p.predicted_approval_probability) * 100).toFixed(1) + '%')
              : (p.approval_percentage || p.display_percentage);
            const label = isRej ? 'Rejection Probability' : 'Approval Likelihood';
            const valColor = isRej ? '#dc2626' : '#065f46';
            const labelColor = isRej ? '#b91c1c' : '#065f46';
            const bg = isRej ? '#fef2f2' : '#ecfdf5';
            const border = isRej ? '#fecaca' : '#a7f3d0';
            return `
              <td>
                <div style="display: inline-block; background: ${bg}; border: 1px solid ${border}; padding: 4px 10px; border-radius: 6px;">
                  <span class="prob-val" style="font-size: 16px; color: ${valColor};">${val}</span>
                  <div style="font-size: 10px; font-weight: 700; color: ${labelColor}; margin-top: 2px;">${label}</div>
                </div>
              </td>
            `;
          }).join('')}
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
          <td><strong>Underwriting Tier</strong></td>
          ${items.map(p => `<td style="font-size: 12px; font-weight: 700; color: var(--primary);">Prime Tier (A+)</td>`).join('')}
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
    state.lumpSumPayment = 0;
    const lumpInput = document.getElementById('opt-lump-sum-input');
    if (lumpInput) lumpInput.value = '';
    const errorEl = document.getElementById('opt-lump-sum-error');
    if (errorEl) { errorEl.style.display = 'none'; errorEl.innerText = ''; }
    const pill = document.getElementById('opt-effective-bal-pill');
    if (pill) pill.style.display = 'none';
    const stratBox = document.getElementById('opt-lump-sum-strategies');
    if (stratBox) stratBox.style.display = 'none';
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

  // One-Time Payment Input Limit
  const maxLump = Math.max(0, balance - 1);
  const hintEl = document.getElementById('opt-max-lump-sum-hint');
  if (hintEl) hintEl.innerText = '₹' + maxLump.toLocaleString('en-IN');
  const lumpInput = document.getElementById('opt-lump-sum-input');
  if (lumpInput) lumpInput.max = maxLump;

  // Dynamic min and max EMI derived from active loan profile & effective balance
  const dbMin = Number(loan.min_emi_allowed_inr) || 1000;
  const dbMax = Number(loan.max_emi_allowed_inr) || 30000;

  const effectiveBal = (state.lumpSumPayment > 0 && state.lumpSumPayment < balance)
    ? (balance - state.lumpSumPayment)
    : balance;

  // Accrued monthly interest boundary to ensure reducing-balance amortisation holds
  const monthlyInterest = Math.ceil(effectiveBal * (rate / 100) / 12);
  const minViable = monthlyInterest + 100;
  const minEmi = Math.max(500, Math.ceil(minViable / 100) * 100);
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
  if (baseLbl) baseLbl.innerText = 'Current: ₹' + currentEmi.toLocaleString('en-IN');

  const maxLbl = document.getElementById('opt-slider-max-lbl');
  if (maxLbl) maxLbl.innerText = 'Max Payment: ₹' + maxEmi.toLocaleString('en-IN');

  const sumBase = document.getElementById('opt-summary-base-emi');
  if (sumBase) sumBase.innerText = '₹' + currentEmi.toLocaleString('en-IN');

  // Update display and trigger simulation
  updateOptimiserDisplay(currentEmi);
  runOptimiserSimulation();
}

function onLumpSumInput() {
  const loan = state.currentLoanForOptimiser;
  if (!loan) return;
  const balance = Math.round(Number(loan.remaining_loan_amount_inr));
  const input = document.getElementById('opt-lump-sum-input');
  const errorEl = document.getElementById('opt-lump-sum-error');
  const rawVal = input ? input.value.trim() : '';

  if (!rawVal || Number(rawVal) === 0) {
    state.lumpSumPayment = 0;
    if (errorEl) { errorEl.style.display = 'none'; errorEl.innerText = ''; }
    clearTimeout(optimiserDebounceTimer);
    optimiserDebounceTimer = setTimeout(() => {
      runOptimiserSimulation();
    }, 100);
    return;
  }

  const val = Number(rawVal);
  if (isNaN(val) || val < 0) {
    if (errorEl) {
      errorEl.style.display = 'block';
      errorEl.innerText = 'One-time payment amount cannot be negative.';
    }
    return;
  }

  if (val >= balance) {
    if (errorEl) {
      errorEl.style.display = 'block';
      errorEl.innerText = `Payment must be strictly less than remaining balance of ₹${balance.toLocaleString('en-IN')}.`;
    }
    return;
  }

  if (errorEl) {
    errorEl.style.display = 'none';
    errorEl.innerText = '';
  }
  state.lumpSumPayment = val;
  clearTimeout(optimiserDebounceTimer);
  optimiserDebounceTimer = setTimeout(() => {
    runOptimiserSimulation();
  }, 120);
}

function applyLumpSumPreset(amount) {
  const loan = state.currentLoanForOptimiser;
  if (!loan) return;
  const balance = Math.round(Number(loan.remaining_loan_amount_inr));
  const input = document.getElementById('opt-lump-sum-input');
  if (!input) return;

  if (amount === 0) {
    input.value = '';
  } else if (amount >= balance) {
    input.value = Math.max(1000, balance - 5000);
  } else {
    input.value = amount;
  }
  onLumpSumInput();
}

function applyLumpSumPercent(pct) {
  const loan = state.currentLoanForOptimiser;
  if (!loan) return;
  const balance = Math.round(Number(loan.remaining_loan_amount_inr));
  const input = document.getElementById('opt-lump-sum-input');
  if (!input) return;

  let amount = Math.round(balance * (pct / 100));
  if (amount >= balance) {
    amount = Math.max(1000, balance - 5000);
  }
  input.value = amount;
  onLumpSumInput();
}

function selectStrategy(strategyType) {
  const loan = state.currentLoanForOptimiser;
  if (!loan) return;
  const currentEmi = Math.round(Number(loan.emi_inr));
  const slider = document.getElementById('opt-emi-slider');
  if (!slider) return;

  if (strategyType === 'tenure') {
    slider.value = currentEmi;
    onOptimiserSliderInput();
  } else if (strategyType === 'emi') {
    const reducedEmi = state.lastSimResult?.one_time_payment_impact?.emi_reduction_strategy?.new_monthly_emi;
    if (reducedEmi) {
      const roundedEmi = Math.round(reducedEmi);
      if (Number(slider.min) > roundedEmi) {
        slider.min = Math.max(500, roundedEmi - 200);
        const minLbl = document.getElementById('opt-slider-min-lbl');
        if (minLbl) minLbl.innerText = 'Min EMI: ₹' + slider.min.toLocaleString('en-IN');
      }
      slider.value = roundedEmi;
      onOptimiserSliderInput();
    }
  }
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
      labelEl.innerText = 'Extra Monthly EMI that needs to be paid:';
      labelEl.style.color = '#1d4ed8';
    }
    if (amountEl) {
      amountEl.innerText = '+₹' + Math.round(diff).toLocaleString('en-IN') + ' / mo';
      amountEl.style.color = '#1e40af';
    }
    if (subEl) {
      subEl.innerText = `You are paying ₹${Math.round(diff).toLocaleString('en-IN')} extra each month over the current scheduled EMI (₹${currentEmi.toLocaleString('en-IN')}).`;
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
      subEl.innerText = `You save ₹${Math.round(savedAmount).toLocaleString('en-IN')} every month compared to your current scheduled EMI (₹${currentEmi.toLocaleString('en-IN')}).`;
      subEl.style.color = '#059669';
    }
  } else {
    if (badgeEl) {
      badgeEl.innerText = '⚖️ Current Scheduled EMI';
      badgeEl.style.background = 'var(--primary-light)';
      badgeEl.style.color = 'var(--primary)';
    }
    if (bannerEl) {
      bannerEl.style.background = 'var(--slate-50)';
      bannerEl.style.borderColor = 'var(--slate-200)';
    }
    if (labelEl) {
      labelEl.innerText = 'Current Scheduled EMI:';
      labelEl.style.color = 'var(--slate-500)';
    }
    if (amountEl) {
      amountEl.innerText = '₹' + Math.round(currentEmi).toLocaleString('en-IN') + ' / mo';
      amountEl.style.color = 'var(--dark)';
    }
    if (subEl) {
      subEl.innerText = 'Your current monthly payment on file. Move slider to simulate extra EMI prepayment or monthly savings.';
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
  const balance = Math.round(loan.remaining_loan_amount_inr);
  const diff = proposedEmi - currentEmi;

  try {
    const res = await api.simulateOptimization({
      loan_account_id: loan.loan_account_id,
      proposed_emi: proposedEmi,
      lump_sum_payment: state.lumpSumPayment || 0
    });

    if (res.success && res.simulation) {
      const sim = res.simulation;
      state.lastSimResult = sim;
      const baseline = sim.baseline;
      const proposed = sim.proposed;
      const savings = sim.savings;
      const impact = sim.one_time_payment_impact;

      // Handle One-Time Prepayment Strategy UI
      const effPill = document.getElementById('opt-effective-bal-pill');
      const effVal = document.getElementById('opt-effective-bal-val');
      const stratBox = document.getElementById('opt-lump-sum-strategies');
      const tenureCard = document.getElementById('strategy-tenure-card');
      const emiCard = document.getElementById('strategy-emi-card');

      if (state.lumpSumPayment > 0 && impact && impact.has_lump_sum) {
        if (effPill) effPill.style.display = 'block';
        if (effVal) effVal.innerText = '₹' + Math.round(sim.effective_principal).toLocaleString('en-IN');
        if (stratBox) stratBox.style.display = 'block';

        const tenStrat = impact.tenure_reduction_strategy;
        const emiStrat = impact.emi_reduction_strategy;

        const elStratTenEmi = document.getElementById('strat-tenure-emi');
        if (elStratTenEmi) elStratTenEmi.innerText = '₹' + Math.round(tenStrat.monthly_emi).toLocaleString('en-IN') + '/mo';

        const elStratTenSaved = document.getElementById('strat-tenure-saved');
        if (elStratTenSaved) elStratTenSaved.innerText = `${tenStrat.months_saved} Months Saved`;

        const elStratTenNew = document.getElementById('strat-tenure-new');
        if (elStratTenNew) elStratTenNew.innerText = `${tenStrat.new_tenure_months} Mo`;

        const elStratTenInt = document.getElementById('strat-tenure-int-saved');
        if (elStratTenInt) elStratTenInt.innerText = '₹' + Math.round(tenStrat.interest_saved).toLocaleString('en-IN');

        const elStratEmiTen = document.getElementById('strat-emi-tenure');
        if (elStratEmiTen) elStratEmiTen.innerText = `${emiStrat.tenure_months} Mo`;

        const elStratEmiNew = document.getElementById('strat-emi-new');
        if (elStratEmiNew) elStratEmiNew.innerText = '₹' + Math.round(emiStrat.new_monthly_emi).toLocaleString('en-IN') + ' / mo';

        const elStratEmiSaved = document.getElementById('strat-emi-saved');
        if (elStratEmiSaved) elStratEmiSaved.innerText = `(Save ₹${Math.round(emiStrat.monthly_emi_saved).toLocaleString('en-IN')}/mo)`;

        const elStratEmiInt = document.getElementById('strat-emi-int-saved');
        if (elStratEmiInt) elStratEmiInt.innerText = '₹' + Math.round(emiStrat.interest_saved).toLocaleString('en-IN');

        const elStratBtnVal = document.getElementById('strat-btn-emi-val');
        if (elStratBtnVal) elStratBtnVal.innerText = '₹' + Math.round(emiStrat.new_monthly_emi).toLocaleString('en-IN');

        // Check if slider is currently set to Option A (current EMI) or Option B (reduced EMI)
        const isTenureActive = Math.abs(proposedEmi - currentEmi) <= 50;
        const isEmiActive = Math.abs(proposedEmi - emiStrat.new_monthly_emi) <= 50;

        if (tenureCard) tenureCard.classList.toggle('active-strategy', isTenureActive);
        const badgeTenApplied = document.getElementById('strategy-tenure-applied');
        if (badgeTenApplied) badgeTenApplied.style.display = isTenureActive ? 'inline-block' : 'none';

        if (emiCard) emiCard.classList.toggle('active-strategy', isEmiActive);
        const badgeEmiApplied = document.getElementById('strategy-emi-applied');
        if (badgeEmiApplied) badgeEmiApplied.style.display = isEmiActive ? 'inline-block' : 'none';

      } else {
        if (effPill) effPill.style.display = 'none';
        if (stratBox) stratBox.style.display = 'none';
        if (tenureCard) tenureCard.classList.remove('active-strategy');
        if (emiCard) emiCard.classList.remove('active-strategy');
      }

      // Tenure KPI Card
      const tenureCardEl = document.getElementById('opt-kpi-tenure-card');
      const tenureTitle = document.getElementById('opt-kpi-tenure-title');
      const tenureVal = document.getElementById('opt-months-saved');
      const tenureSub = document.getElementById('opt-kpi-tenure-sub');

      // Interest KPI Card
      const intCard = document.getElementById('opt-kpi-interest-card');
      const intTitle = document.getElementById('opt-kpi-interest-title');
      const intVal = document.getElementById('opt-int-saved');
      const intSub = document.getElementById('opt-kpi-interest-sub');

      if (savings.tenure_months_saved > 0 || (savings.interest_saved > 0 && diff >= 0)) {
        if (tenureCardEl) {
          tenureCardEl.style.background = '#ecfdf5';
          tenureCardEl.style.borderColor = '#a7f3d0';
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

      } else if (diff < 0 && savings.tenure_months_saved <= 0) {
        const savedPerMonth = Math.abs(diff);
        const monthsExtended = Math.abs(savings.tenure_months_saved);

        if (tenureCardEl) {
          tenureCardEl.style.background = '#fffbeb';
          tenureCardEl.style.borderColor = '#fde68a';
        }
        if (tenureTitle) {
          tenureTitle.innerText = 'Tenure Adjustment';
          tenureTitle.style.color = '#92400e';
        }
        if (tenureVal) {
          tenureVal.innerText = monthsExtended === 0 ? 'Same Tenure' : `+${monthsExtended} Months`;
          tenureVal.style.color = '#b45309';
        }
        if (tenureSub) {
          tenureSub.innerText = monthsExtended === 0 ? 'Duration unchanged' : `Repayment duration extended`;
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

      } else {
        if (tenureCardEl) {
          tenureCardEl.style.background = '#f8fafc';
          tenureCardEl.style.borderColor = '#e2e8f0';
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
          intSub.innerText = `Current cumulative interest`;
          intSub.style.color = 'var(--slate-400)';
        }
      }

      // Insight Note
      const noteEl = document.getElementById('opt-insight-note');
      if (noteEl) {
        if (state.lumpSumPayment > 0 && impact && impact.has_lump_sum) {
          const tenStrat = impact.tenure_reduction_strategy;
          const emiStrat = impact.emi_reduction_strategy;
          noteEl.innerHTML = `<strong>One-Time Prepayment Impact:</strong> Paying <strong>₹${Number(state.lumpSumPayment).toLocaleString('en-IN')} today</strong> reduces your balance from ₹${balance.toLocaleString('en-IN')} to <strong>₹${Math.round(sim.effective_principal).toLocaleString('en-IN')}</strong>.<br/>• <strong>Option A (Keep EMI ₹${currentEmi.toLocaleString('en-IN')}/mo):</strong> Clears loan <strong>${tenStrat.months_saved} months sooner</strong> and saves <strong>₹${Math.round(tenStrat.interest_saved).toLocaleString('en-IN')}</strong> interest.<br/>• <strong>Option B (Keep Tenure ${baseline.remaining_tenure_months} Mo):</strong> Lowers EMI to <strong>₹${Math.round(emiStrat.new_monthly_emi).toLocaleString('en-IN')}/mo</strong> (saves <strong>₹${Math.round(emiStrat.monthly_emi_saved).toLocaleString('en-IN')}/mo</strong>) and saves <strong>₹${Math.round(emiStrat.interest_saved).toLocaleString('en-IN')}</strong> interest!`;
          noteEl.style.borderLeftColor = 'var(--accent)';
        } else if (diff > 0) {
          noteEl.innerHTML = `<strong>Extra EMI Benefit:</strong> Paying <strong>+₹${diff.toLocaleString('en-IN')}/mo</strong> extra repays your loan <strong>${savings.tenure_months_saved} months sooner</strong>, saving <strong>₹${Math.round(savings.interest_saved).toLocaleString('en-IN')}</strong> in total interest.`;
          noteEl.style.borderLeftColor = 'var(--primary)';
        } else if (diff < 0) {
          noteEl.innerHTML = `<strong>Cash Flow Relief:</strong> By lowering your EMI, you save <strong>₹${Math.round(Math.abs(diff)).toLocaleString('en-IN')} every month</strong>. Your repayment is extended by <strong>${Math.abs(savings.tenure_months_saved)} months</strong> with ₹${Math.round(Math.abs(savings.interest_saved)).toLocaleString('en-IN')} in total additional interest.`;
          noteEl.style.borderLeftColor = '#10b981';
        } else {
          noteEl.innerHTML = `<strong>Current Schedule:</strong> Currently scheduled at <strong>₹${currentEmi.toLocaleString('en-IN')}/mo</strong> for <strong>${baseline.remaining_tenure_months} months</strong>. Drag the slider or enter a one-time payment to simulate interest savings.`;
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

  // Render first 25 rows (including Month 0 if present)
  const rows = schedule.slice(0, 25);
  container.innerHTML = rows.map(r => {
    if (r.month === 0 || r.is_lump_sum) {
      return `
        <tr style="background: #eff6ff; font-weight: 700; color: #1e40af;">
          <td>0 (Today)</td>
          <td>₹${Math.round(r.beginning_balance).toLocaleString('en-IN')}</td>
          <td>
            ₹${Math.round(r.emi).toLocaleString('en-IN')}
            <span class="badge" style="background: #dbeafe; color: #1e40af; font-size: 10px; margin-left: 6px; padding: 2px 6px;">One-Time Payment</span>
          </td>
          <td>₹${Math.round(r.principal_paid).toLocaleString('en-IN')}</td>
          <td>₹0</td>
          <td><strong>₹${Math.round(r.ending_balance).toLocaleString('en-IN')}</strong></td>
        </tr>
      `;
    }
    return `
      <tr>
        <td>${r.month}</td>
        <td>₹${Math.round(r.beginning_balance).toLocaleString('en-IN')}</td>
        <td>₹${Math.round(r.emi).toLocaleString('en-IN')}</td>
        <td>₹${Math.round(r.principal_paid).toLocaleString('en-IN')}</td>
        <td>₹${Math.round(r.interest_paid).toLocaleString('en-IN')}</td>
        <td><strong>₹${Math.round(r.ending_balance).toLocaleString('en-IN')}</strong></td>
      </tr>
    `;
  }).join('');
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
    full_name: document.getElementById('reg-name').value.trim(),
    pan_number: document.getElementById('reg-pan').value.trim().toUpperCase(),
    age: Number(document.getElementById('reg-age').value),
    monthly_income_inr: Number(document.getElementById('reg-income').value),
    credit_score: Number(document.getElementById('reg-cibil').value),
    employment_type: document.getElementById('reg-emp').value,
    employment_experience_years: Number(document.getElementById('reg-exp').value),
    existing_emi_inr: Number(document.getElementById('reg-emi').value || 0),
    existing_active_loans: Number(document.getElementById('reg-loans').value || 0),
    monthly_household_expenses_inr: Number(document.getElementById('reg-expenses').value || 0),
    average_bank_balance_inr: Number(document.getElementById('reg-bank').value || 0),
    dependents: Number(document.getElementById('reg-dep').value || 0),
    number_of_dependents: Number(document.getElementById('reg-dep').value || 0)
  };

  try {
    const res = await api.register(data);
    const applicant = res.applicant || res.data;
    if (res.success && applicant) {
      state.applicant = applicant;
      api.setApplicant(applicant);
      alert(`Registration successful! Welcome to LoanIQ, ${applicant.full_name} (${applicant.applicant_id}).`);
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
