import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Landmark, Compass, Sliders, BarChart2, Calculator, 
  ArrowRight, ShieldCheck, Sparkles, AlertCircle, ChevronRight,
  TrendingUp, CreditCard, User, Layers
} from 'lucide-react';
import Navbar from '../components/Navbar';
import { api, getStoredApplicant, Applicant, ExistingLoan } from '../api';

interface HomeProps {
  isAuth: boolean;
}

const Home: React.FC<HomeProps> = ({ isAuth }) => {
  const navigate = useNavigate();
  const [applicant, setApplicant] = useState<Applicant | null>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const current = getStoredApplicant();
    setApplicant(current);

    if (current?.applicant_id) {
      setLoading(true);
      api.getDashboard(current.applicant_id).then(res => {
        if (res.success && res.dashboard) {
          setDashboardData(res.dashboard);
        }
      }).catch(err => {
        console.error("Dashboard fetch error:", err);
      }).finally(() => {
        setLoading(false);
      });
    }
  }, [isAuth]);

  const getCreditScoreBadge = (score: number) => {
    if (score >= 750) return { label: 'Excellent', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    if (score >= 700) return { label: 'Good', color: 'bg-cyan-50 text-cyan-800 border-cyan-200' };
    if (score >= 650) return { label: 'Fair', color: 'bg-amber-50 text-amber-700 border-amber-200' };
    return { label: 'Needs Improvement', color: 'bg-rose-50 text-rose-700 border-rose-200' };
  };

  // If not logged in, render the Paytm-inspired fintech hero
  if (!applicant) {
    return (
      <div className="min-h-screen w-full bg-slate-50 font-sans flex flex-col">
        <Navbar showBack={false} />

        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-b from-[#002E6E] via-[#002252] to-[#00183A] text-white py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-12 relative z-10">
            
            <div className="max-w-2xl text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 text-cyan-300 text-xs font-semibold mb-6">
                <Sparkles size={14} className="text-[#00BAF2]" />
                <span>Next-Generation Loan Intelligence & Repayment Simulation</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1] mb-6">
                Discover the Right Loan.<br />
                <span className="text-[#00BAF2]">Optimise Every Rupee.</span>
              </h1>

              <p className="text-base sm:text-lg text-slate-300 mb-8 leading-relaxed max-w-xl">
                LoanIQ uses calibrated machine learning models to rank loan products by lender approval probability, and simulates smart tenure reductions to save thousands in interest.
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
                <button
                  onClick={() => navigate('/login')}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-[#00BAF2] hover:bg-cyan-300 text-[#002E6E] font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition-all active:scale-[0.99]"
                >
                  <span>Sign In / Demo Login</span>
                  <ArrowRight size={16} />
                </button>

                <button
                  onClick={() => navigate('/signup')}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white border border-white/20 font-bold text-sm flex items-center justify-center gap-2 transition-all"
                >
                  <span>Register Applicant</span>
                </button>
              </div>
            </div>

            {/* Quick Preview Card */}
            <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 text-slate-900 shadow-2xl border border-white/10">
              <div className="flex items-center justify-between border-b pb-4 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#002E6E] flex items-center justify-center text-[#00BAF2]">
                    <Landmark size={18} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-[#002E6E]">LoanIQ Engine</h4>
                    <p className="text-[11px] text-slate-500">4 Calibrated Categories</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                  Active
                </span>
              </div>

              <div className="space-y-3">
                <div className="p-3 bg-slate-50 rounded-2xl flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-800">Car Loan Models</p>
                    <p className="text-[11px] text-slate-500">Random Forest Tuned</p>
                  </div>
                  <span className="text-xs font-bold text-emerald-600">AUC: 0.923</span>
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-800">Home Loan Models</p>
                    <p className="text-[11px] text-slate-500">Calibrated Classifier</p>
                  </div>
                  <span className="text-xs font-bold text-emerald-600">ROC: 0.918</span>
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-800">Education Loan</p>
                    <p className="text-[11px] text-slate-500">Hist Gradient Boosting</p>
                  </div>
                  <span className="text-xs font-bold text-emerald-600">AUC: 0.975</span>
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-800">Personal Loan</p>
                    <p className="text-[11px] text-slate-500">Calibrated Random Forest</p>
                  </div>
                  <span className="text-xs font-bold text-emerald-600">AUC: 0.841</span>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>16 Real Configured Products</span>
                <span className="font-semibold text-[#002E6E]">100 Synthetic Users</span>
              </div>
            </div>

          </div>
        </section>

        {/* Features Grid */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#002E6E]">
              Complete End-to-End Loan Intelligence
            </h2>
            <p className="text-sm text-slate-500 mt-2 max-w-xl mx-auto">
              Built on verified reducing-balance financial mathematics and scikit-learn calibrated pipelines.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#002E6E] flex items-center justify-center mb-4">
                <Compass size={24} />
              </div>
              <h3 className="font-bold text-base text-[#002E6E] mb-2">Loan Discovery</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Dedicated category forms evaluate 5 hard eligibility gates and predict lender approval probability using category-specific ML models.
              </p>
            </div>

            <div className="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-2xl bg-cyan-50 text-[#00BAF2] flex items-center justify-center mb-4">
                <Sliders size={24} />
              </div>
              <h3 className="font-bold text-base text-[#002E6E] mb-2">Loan Optimiser</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Simulate proposed EMI adjustments on existing loans. See live remaining tenure reductions and hand-calculated interest savings.
              </p>
            </div>

            <div className="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
                <BarChart2 size={24} />
              </div>
              <h3 className="font-bold text-base text-[#002E6E] mb-2">Offer Comparison</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Compare eligible loan options side-by-side on interest rate, EMI, total repayment, tenure, and predicted approval probability.
              </p>
            </div>

            <div className="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                <Calculator size={24} />
              </div>
              <h3 className="font-bold text-base text-[#002E6E] mb-2">EMI Calculator</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Standard reducing-balance amortisation calculator for rapid loan estimation and financial planning.
              </p>
            </div>
          </div>
        </section>

        {/* Disclaimer Footer */}
        <footer className="mt-auto py-8 bg-white border-t border-slate-200 text-center text-xs text-slate-400">
          <p>© 2026 LoanIQ Platform • College Coursework Academic Project • Synthetic Simulation Benchmarks Only</p>
        </footer>
      </div>
    );
  }

  // LOGGED IN DASHBOARD VIEW
  const creditBadge = getCreditScoreBadge(applicant.credit_score);
  const activeLoansList: ExistingLoan[] = dashboardData?.active_loans || [];

  return (
    <div className="min-h-screen w-full bg-slate-50 font-sans flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Applicant Summary Banner */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-[#002E6E] text-[#00BAF2] flex items-center justify-center font-black text-xl shadow-sm shrink-0">
              {applicant.full_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-xl sm:text-2xl font-black text-[#002E6E]">{applicant.full_name}</h1>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${creditBadge.color}`}>
                  Score {applicant.credit_score} • {creditBadge.label}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Applicant ID: <span className="font-mono text-slate-700">{applicant.applicant_id}</span> • 
                PAN: <span className="font-mono text-slate-700">{applicant.pan_number}</span> • 
                Employment: <span className="capitalize text-slate-700">{applicant.employment_type.replace('_', ' ')}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-end md:self-auto">
            <button
              onClick={() => navigate('/profile')}
              className="px-3.5 py-2 text-xs font-bold text-[#002E6E] bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              View Full Profile
            </button>
            <button
              onClick={() => navigate('/form')}
              className="px-4 py-2 text-xs font-bold text-white bg-[#002E6E] hover:bg-[#002252] rounded-xl flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <span>Discover Loans</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* Existing Debt Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-[#002E6E] flex items-center justify-center shrink-0">
              <Layers size={22} />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Active Loans</p>
              <h3 className="text-xl font-black text-[#002E6E]">
                {dashboardData?.total_active_loans ?? applicant.existing_active_loans}
              </h3>
              <p className="text-[11px] text-slate-400">Linked SQLite Records</p>
            </div>
          </div>

          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-cyan-50 text-[#00BAF2] flex items-center justify-center shrink-0">
              <CreditCard size={22} />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Monthly EMI</p>
              <h3 className="text-xl font-black text-[#002E6E]">
                ₹{Math.round(dashboardData?.total_monthly_emi ?? applicant.existing_emi_inr).toLocaleString('en-IN')}
              </h3>
              <p className="text-[11px] text-slate-400">Total Monthly Debt Obligation</p>
            </div>
          </div>

          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <TrendingUp size={22} />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Monthly Income</p>
              <h3 className="text-xl font-black text-[#002E6E]">
                ₹{Math.round(applicant.monthly_income_inr).toLocaleString('en-IN')}
              </h3>
              <p className="text-[11px] text-emerald-600 font-medium">
                Debt Ratio: {Math.round(((dashboardData?.total_monthly_emi ?? applicant.existing_emi_inr) / (applicant.monthly_income_inr || 1)) * 100)}%
              </p>
            </div>
          </div>
        </div>

        {/* 4 Core User Journey Action Cards */}
        <div>
          <h2 className="text-lg font-bold text-[#002E6E] mb-4">Platform Services</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            
            {/* Card 1: Discover Loans */}
            <div
              onClick={() => navigate('/form')}
              className="p-6 bg-white rounded-3xl border-2 border-transparent hover:border-[#00BAF2] shadow-sm hover:shadow-xl transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-2xl bg-[#002E6E] text-[#00BAF2] flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  <Compass size={24} />
                </div>
                <h3 className="font-extrabold text-base text-[#002E6E] group-hover:text-[#00BAF2] transition-colors">
                  Discover Loans
                </h3>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  Personalised recommendation across Car, Home, Education, and Personal categories with ML approval probabilities.
                </p>
              </div>
              <div className="mt-5 flex items-center gap-1 text-xs font-bold text-[#002E6E] group-hover:translate-x-1 transition-transform">
                <span>Start Application</span>
                <ChevronRight size={14} />
              </div>
            </div>

            {/* Card 2: Repayment Optimiser */}
            <div
              onClick={() => navigate('/active')}
              className="p-6 bg-white rounded-3xl border-2 border-transparent hover:border-[#00BAF2] shadow-sm hover:shadow-xl transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-2xl bg-cyan-50 text-[#00BAF2] flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  <Sliders size={24} />
                </div>
                <h3 className="font-extrabold text-base text-[#002E6E] group-hover:text-[#00BAF2] transition-colors">
                  Loan Optimiser
                </h3>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  Interactive EMI slider to simulate tenure reduction and calculate exact interest savings on your active loans.
                </p>
              </div>
              <div className="mt-5 flex items-center gap-1 text-xs font-bold text-[#002E6E] group-hover:translate-x-1 transition-transform">
                <span>Simulate Repayment</span>
                <ChevronRight size={14} />
              </div>
            </div>

            {/* Card 3: Compare Loans */}
            <div
              onClick={() => navigate('/compare')}
              className="p-6 bg-white rounded-3xl border-2 border-transparent hover:border-[#00BAF2] shadow-sm hover:shadow-xl transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  <BarChart2 size={24} />
                </div>
                <h3 className="font-extrabold text-base text-[#002E6E] group-hover:text-[#00BAF2] transition-colors">
                  Compare Loans
                </h3>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  Side-by-side multi-attribute matrix comparing rates, EMIs, total cost, and approval probabilities.
                </p>
              </div>
              <div className="mt-5 flex items-center gap-1 text-xs font-bold text-[#002E6E] group-hover:translate-x-1 transition-transform">
                <span>Open Matrix</span>
                <ChevronRight size={14} />
              </div>
            </div>

            {/* Card 4: EMI Calculator */}
            <div
              onClick={() => navigate('/emicalculator')}
              className="p-6 bg-white rounded-3xl border-2 border-transparent hover:border-[#00BAF2] shadow-sm hover:shadow-xl transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  <Calculator size={24} />
                </div>
                <h3 className="font-extrabold text-base text-[#002E6E] group-hover:text-[#00BAF2] transition-colors">
                  EMI Calculator
                </h3>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  General reducing-balance loan calculator for quick scenario modeling and amortisation schedules.
                </p>
              </div>
              <div className="mt-5 flex items-center gap-1 text-xs font-bold text-[#002E6E] group-hover:translate-x-1 transition-transform">
                <span>Calculate EMI</span>
                <ChevronRight size={14} />
              </div>
            </div>

          </div>
        </div>

        {/* Active Loans Preview */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-bold text-[#002E6E]">Active Existing Loans</h2>
              <p className="text-xs text-slate-500">
                Managed in SQLite database • Reconciled from loan account records
              </p>
            </div>
            <button
              onClick={() => navigate('/active')}
              className="text-xs font-bold text-[#00BAF2] hover:text-[#002E6E] transition-colors flex items-center gap-1"
            >
              <span>Manage & Optimise</span>
              <ArrowRight size={14} />
            </button>
          </div>

          {activeLoansList.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <p className="text-sm font-semibold text-slate-600">No active loans found for this applicant.</p>
              <p className="text-xs text-slate-400 mt-1">You can add existing loans manually in the Loan Optimiser.</p>
              <button
                onClick={() => navigate('/active')}
                className="mt-4 px-4 py-2 bg-[#002E6E] text-white text-xs font-bold rounded-xl"
              >
                Add Existing Loan
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 uppercase font-semibold">
                    <th className="pb-3">Loan Account</th>
                    <th className="pb-3">Type</th>
                    <th className="pb-3">Original Principal</th>
                    <th className="pb-3">Interest Rate</th>
                    <th className="pb-3">Monthly EMI</th>
                    <th className="pb-3">Remaining Balance</th>
                    <th className="pb-3">Maturity Date</th>
                    <th className="pb-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {activeLoansList.map((loan) => (
                    <tr key={loan.loan_account_id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 font-mono font-bold text-[#002E6E]">{loan.loan_account_id}</td>
                      <td className="py-3.5">
                        <span className="px-2 py-0.5 rounded-md bg-blue-50 text-[#002E6E] font-semibold text-[11px]">
                          {loan.loan_type}
                        </span>
                      </td>
                      <td className="py-3.5">₹{Math.round(loan.loan_amount_inr).toLocaleString()}</td>
                      <td className="py-3.5 text-cyan-700 font-bold">{loan.annual_interest_rate_pct}%</td>
                      <td className="py-3.5 font-bold text-slate-900">₹{Math.round(loan.emi_inr).toLocaleString()}</td>
                      <td className="py-3.5 text-emerald-700 font-bold">₹{Math.round(loan.remaining_loan_amount_inr).toLocaleString()}</td>
                      <td className="py-3.5 text-slate-500">{loan.maturity_date}</td>
                      <td className="py-3.5 text-right">
                        <button
                          onClick={() => navigate('/active', { state: { selectedLoanId: loan.loan_account_id } })}
                          className="px-3 py-1 bg-cyan-50 hover:bg-cyan-100 text-[#002E6E] font-bold text-[11px] rounded-lg transition-colors"
                        >
                          Simulate EMI
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Disclaimer Footer */}
        <div className="p-4 bg-slate-100/70 rounded-2xl text-[11px] text-slate-500 leading-relaxed border border-slate-200">
          <p className="font-bold text-slate-600 mb-0.5">Academic College Project Disclaimer:</p>
          LoanIQ is a synthetic demonstration platform. Predicted lender approval probabilities are model estimates generated by calibrated machine learning algorithms (Random Forest, Calibrated Classifier, Hist Gradient Boosting) trained on benchmark datasets. They do not constitute guaranteed lender approval, credit decisions, or financial advice.
        </div>

      </main>
    </div>
  );
};

export default Home;
