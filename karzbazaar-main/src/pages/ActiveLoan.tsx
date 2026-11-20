import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Landmark, Sliders, TrendingDown, Clock, ShieldCheck, 
  Plus, AlertCircle, Sparkles, CheckCircle2, ArrowRight, DollarSign, X
} from 'lucide-react';
import Navbar from '../components/Navbar';
import { api, getStoredApplicant, Applicant, ExistingLoan, SimulationResponse } from '../api';

const ActiveLoan: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [applicant, setApplicant] = useState<Applicant | null>(null);
  const [loans, setLoans] = useState<ExistingLoan[]>([]);
  const [selectedLoanId, setSelectedLoanId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Slider state
  const [proposedEmi, setProposedEmi] = useState<number>(0);
  const [simulation, setSimulation] = useState<SimulationResponse | null>(null);
  const [simError, setSimError] = useState<string>('');

  // Add Loan Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addLoanError, setAddLoanError] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [newLoanData, setNewLoanData] = useState({
    loan_type: 'Personal',
    loan_amount_inr: 200000,
    annual_interest_rate_pct: 12.5,
    original_tenure_months: 36,
    loan_start_date: new Date().toISOString().split('T')[0],
    emi_inr: 6688,
    remaining_loan_amount_inr: 150000,
    remaining_tenure_months: 26,
    status: 'active'
  });

  const loadLoans = async (appId: string, preferredId?: string) => {
    setLoading(true);
    try {
      const res = await api.getLoans(appId);
      if (res.success && res.loans) {
        setLoans(res.loans);
        if (res.loans.length > 0) {
          const target = preferredId 
            ? res.loans.find((l: ExistingLoan) => l.loan_account_id === preferredId) || res.loans[0]
            : res.loans[0];
          setSelectedLoanId(target.loan_account_id);
          setProposedEmi(target.emi_inr);
        }
      }
    } catch (err: any) {
      setError('Could not fetch existing loans from SQLite database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const cur = getStoredApplicant();
    if (!cur) {
      navigate('/login');
      return;
    }
    setApplicant(cur);

    const navLoanId = location.state?.selectedLoanId;
    loadLoans(cur.applicant_id, navLoanId);
  }, [navigate]);

  const activeLoan = useMemo(() => {
    return loans.find(l => l.loan_account_id === selectedLoanId) || loans[0];
  }, [loans, selectedLoanId]);

  // Update proposed EMI when active loan changes
  useEffect(() => {
    if (activeLoan) {
      setProposedEmi(activeLoan.emi_inr);
      setSimError('');
    }
  }, [selectedLoanId]);

  // Recalculate simulation live on proposedEmi change
  useEffect(() => {
    if (!activeLoan) return;

    const P = activeLoan.remaining_loan_amount_inr;
    const r = (activeLoan.annual_interest_rate_pct / 100.0) / 12.0;
    const minInterest = P * r;

    if (proposedEmi <= minInterest) {
      setSimError(`Proposed EMI of ₹${Math.round(proposedEmi).toLocaleString()} is at or below the monthly accrued interest (₹${Math.round(minInterest).toLocaleString()}). The loan will never amortise.`);
      setSimulation(null);
      return;
    }

    setSimError('');
    api.simulateRepayment(activeLoan.loan_account_id, proposedEmi).then(res => {
      if (res.success && res.simulation) {
        setSimulation(res.simulation);
      } else {
        setSimError(res.error || 'Simulation calculation failed.');
      }
    }).catch(err => {
      setSimError('Failed to contact simulation engine.');
    });
  }, [activeLoan, proposedEmi]);

  // Slider bounds
  const sliderBounds = useMemo(() => {
    if (!activeLoan) return { min: 1000, max: 50000, step: 250 };
    const P = activeLoan.remaining_loan_amount_inr;
    const r = (activeLoan.annual_interest_rate_pct / 100.0) / 12.0;
    const minInterest = Math.ceil(P * r) + 100; // minimum required to amortise
    const current = activeLoan.emi_inr;
    const min = Math.max(minInterest, Math.floor(current * 0.4));
    const max = Math.max(min * 3, Math.ceil(current * 2.5));
    const step = 250;
    return { min, max, step };
  }, [activeLoan]);

  const handleAddLoanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applicant) return;
    setAddLoanError('');
    setAddLoading(true);

    try {
      const payload = {
        ...newLoanData,
        applicant_id: applicant.applicant_id,
        loan_amount_inr: Number(newLoanData.loan_amount_inr),
        annual_interest_rate_pct: Number(newLoanData.annual_interest_rate_pct),
        original_tenure_months: Number(newLoanData.original_tenure_months),
        emi_inr: Number(newLoanData.emi_inr),
        remaining_loan_amount_inr: Number(newLoanData.remaining_loan_amount_inr),
        remaining_tenure_months: Number(newLoanData.remaining_tenure_months)
      };

      const res = await api.addLoan(payload);
      if (res.success && res.loan) {
        setShowAddModal(false);
        // Refresh loans & updated applicant aggregates
        await loadLoans(applicant.applicant_id, res.loan.loan_account_id);
      } else {
        setAddLoanError(res.error || 'Failed to add existing loan.');
      }
    } catch (err: any) {
      setAddLoanError('Server error while adding loan to database.');
    } finally {
      setAddLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 font-sans flex flex-col pb-16">
      <Navbar title="Loan Repayment Optimiser" />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Header with Add Loan Button */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-50 border border-cyan-200 text-[#002E6E] text-xs font-semibold mb-2">
              <Sliders size={14} className="text-[#00BAF2]" />
              <span>Reducing-Balance Amortisation Simulator</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#002E6E]">
              Loan Repayment Optimiser
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Simulate adjusting your monthly EMI on active loans. See live tenure reductions and calculate exact interest savings.
            </p>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-5 py-3 bg-[#002E6E] hover:bg-[#002252] text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all self-start sm:self-auto shrink-0"
          >
            <Plus size={16} className="text-[#00BAF2]" />
            <span>Add Existing Loan</span>
          </button>
        </div>

        {loans.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-sm">
            <Landmark size={40} className="text-slate-400 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-[#002E6E]">No Existing Loans on File</h3>
            <p className="text-xs text-slate-500 mt-2 max-w-md mx-auto">
              Add your current active loans using the button above to simulate accelerated repayments and interest savings.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-5 px-6 py-2.5 bg-[#002E6E] text-white text-xs font-bold rounded-xl"
            >
              Add Your First Existing Loan
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left 4 Cols: Loan Selector & Static Baseline Details */}
            <div className="lg:col-span-4 space-y-4">
              
              {/* Account Selector */}
              <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200/80">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Select Active Loan Account
                </label>
                <div className="space-y-2">
                  {loans.map(l => (
                    <button
                      key={l.loan_account_id}
                      type="button"
                      onClick={() => setSelectedLoanId(l.loan_account_id)}
                      className={`w-full p-3 rounded-2xl text-left border-2 transition-all flex items-center justify-between ${
                        selectedLoanId === l.loan_account_id
                          ? 'border-[#002E6E] bg-blue-50/50 shadow-sm'
                          : 'border-slate-100 hover:border-slate-200 bg-white'
                      }`}
                    >
                      <div>
                        <span className="font-mono text-xs font-bold text-[#002E6E] block">
                          {l.loan_account_id}
                        </span>
                        <span className="text-xs text-slate-500 font-medium">
                          {l.loan_type} Loan • ₹{Math.round(l.remaining_loan_amount_inr).toLocaleString()} rem.
                        </span>
                      </div>
                      <span className="text-xs font-black text-slate-800">
                        ₹{Math.round(l.emi_inr).toLocaleString()}/mo
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Baseline Loan Snapshot */}
              {activeLoan && (
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 space-y-4">
                  <div className="flex items-center justify-between border-b pb-3">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Current Baseline</span>
                      <h3 className="font-extrabold text-base text-[#002E6E]">{activeLoan.loan_type} Loan</h3>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200 uppercase">
                      {activeLoan.status}
                    </span>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Original Sanction</span>
                      <span className="font-bold text-slate-800">₹{Math.round(activeLoan.loan_amount_inr).toLocaleString()}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Annual Interest Rate</span>
                      <span className="font-bold text-[#002E6E]">{activeLoan.annual_interest_rate_pct}% p.a.</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Original Tenure</span>
                      <span className="font-bold text-slate-800">{activeLoan.original_tenure_months} Months</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Current Monthly EMI</span>
                      <span className="font-extrabold text-slate-900">₹{Math.round(activeLoan.emi_inr).toLocaleString()}</span>
                    </div>

                    <div className="border-t border-slate-100 my-2 pt-2"></div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-semibold">Remaining Principal</span>
                      <span className="font-black text-emerald-700">₹{Math.round(activeLoan.remaining_loan_amount_inr).toLocaleString()}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Remaining Tenure</span>
                      <span className="font-bold text-slate-800">{activeLoan.remaining_tenure_months} Months</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Scheduled Payoff</span>
                      <span className="font-bold text-slate-800">{activeLoan.maturity_date}</span>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Right 8 Cols: Interactive Slider & Live Projection Dashboard */}
            <div className="lg:col-span-8 space-y-6">
              
              {/* Interactive EMI Slider Card */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
                  <div>
                    <h2 className="text-lg font-black text-[#002E6E]">Proposed Monthly EMI Scenario</h2>
                    <p className="text-xs text-slate-500">
                      Move the slider to simulate higher or lower EMI payments
                    </p>
                  </div>

                  <div className="px-4 py-2 bg-blue-50 border border-blue-200 rounded-2xl flex items-center gap-2 self-start sm:self-auto">
                    <span className="text-xs text-slate-500 font-semibold">Proposed EMI:</span>
                    <span className="text-xl font-black text-[#002E6E] font-mono">
                      ₹{Math.round(proposedEmi).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Range Slider */}
                <div className="space-y-3">
                  <input
                    type="range"
                    min={sliderBounds.min}
                    max={sliderBounds.max}
                    step={sliderBounds.step}
                    value={proposedEmi}
                    onChange={(e) => setProposedEmi(Number(e.target.value))}
                    className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#002E6E]"
                  />

                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
                    <span>Min: ₹{Math.round(sliderBounds.min).toLocaleString()} (covers interest)</span>
                    <button
                      onClick={() => activeLoan && setProposedEmi(activeLoan.emi_inr)}
                      className="text-xs font-bold text-[#00BAF2] hover:underline"
                    >
                      Reset to Baseline (₹{Math.round(activeLoan?.emi_inr || 0).toLocaleString()})
                    </button>
                    <span>Max: ₹{Math.round(sliderBounds.max).toLocaleString()}</span>
                  </div>
                </div>

                {/* Quick Add Buttons */}
                <div className="flex flex-wrap items-center gap-2 mt-5 pt-4 border-t border-slate-100">
                  <span className="text-xs text-slate-400 font-medium">Quick Step:</span>
                  {[500, 1000, 2000, 5000].map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => activeLoan && setProposedEmi(activeLoan.emi_inr + amt)}
                      className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors"
                    >
                      +₹{amt.toLocaleString()}
                    </button>
                  ))}
                </div>

                {/* Error Banner when EMI is too low */}
                {simError && (
                  <div className="mt-5 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2.5">
                    <AlertCircle size={18} className="shrink-0 mt-0.5 text-amber-600" />
                    <div>
                      <p className="font-bold">Insufficient Amortisation Payment</p>
                      <p className="text-[11px] mt-0.5">{simError}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Simulation Comparison Matrix */}
              {simulation && (
                <div className="space-y-4">
                  
                  {/* Highlights Banner */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    
                    {/* Interest Saved */}
                    <div className={`p-6 rounded-3xl border ${
                      simulation.savings.interest_saved >= 0 
                        ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900' 
                        : 'bg-rose-50/70 border-rose-200 text-rose-900'
                    }`}>
                      <span className="text-xs font-bold uppercase tracking-wider block opacity-75">
                        {simulation.savings.interest_saved >= 0 ? 'Total Interest Saved' : 'Additional Interest Payable'}
                      </span>
                      <h3 className="text-3xl font-black mt-1">
                        ₹{Math.abs(Math.round(simulation.savings.interest_saved)).toLocaleString()}
                      </h3>
                      <p className="text-xs mt-1.5 opacity-90">
                        {simulation.savings.interest_saved >= 0 
                          ? 'Saved by accelerating monthly principal reduction' 
                          : 'Extra interest accrued due to extended repayment'}
                      </p>
                    </div>

                    {/* Tenure Saved */}
                    <div className={`p-6 rounded-3xl border ${
                      simulation.savings.tenure_months_saved >= 0 
                        ? 'bg-cyan-50/70 border-cyan-200 text-[#002E6E]' 
                        : 'bg-amber-50/70 border-amber-200 text-amber-900'
                    }`}>
                      <span className="text-xs font-bold uppercase tracking-wider block opacity-75">
                        {simulation.savings.tenure_months_saved >= 0 ? 'Tenure Reduction' : 'Tenure Extension'}
                      </span>
                      <h3 className="text-3xl font-black mt-1">
                        {Math.abs(simulation.savings.tenure_months_saved)} Months
                      </h3>
                      <p className="text-xs mt-1.5 opacity-90">
                        New payoff target: <span className="font-bold">{simulation.proposed.estimated_maturity_date}</span>
                      </p>
                    </div>

                  </div>

                  {/* Detailed Comparison Table */}
                  <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80">
                    <h3 className="text-sm font-bold text-[#002E6E] uppercase tracking-wider mb-4 border-b pb-2">
                      Side-by-Side Simulation Metrics
                    </h3>

                    <div className="grid grid-cols-2 gap-6 text-xs">
                      
                      {/* Baseline Column */}
                      <div className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-200/60">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Current Baseline
                        </span>
                        
                        <div>
                          <span className="text-slate-500 block text-[11px]">Monthly EMI</span>
                          <span className="font-bold text-slate-800 text-sm">
                            ₹{Math.round(simulation.baseline.current_emi).toLocaleString()}
                          </span>
                        </div>

                        <div>
                          <span className="text-slate-500 block text-[11px]">Remaining Months</span>
                          <span className="font-bold text-slate-800 text-sm">
                            {simulation.baseline.remaining_tenure_months} Months ({Math.round(simulation.baseline.remaining_tenure_months / 12 * 10) / 10} Yrs)
                          </span>
                        </div>

                        <div>
                          <span className="text-slate-500 block text-[11px]">Remaining Interest</span>
                          <span className="font-bold text-slate-800 text-sm">
                            ₹{Math.round(simulation.baseline.total_interest_payable).toLocaleString()}
                          </span>
                        </div>

                        <div>
                          <span className="text-slate-500 block text-[11px]">Total Outflow</span>
                          <span className="font-bold text-slate-800 text-sm">
                            ₹{Math.round(simulation.baseline.total_repayment_amount).toLocaleString()}
                          </span>
                        </div>

                        <div>
                          <span className="text-slate-500 block text-[11px]">Payoff Date</span>
                          <span className="font-bold text-slate-800 text-sm">
                            {simulation.baseline.estimated_maturity_date}
                          </span>
                        </div>
                      </div>

                      {/* Proposed Scenario Column */}
                      <div className="space-y-3 p-4 bg-blue-50/60 rounded-2xl border border-blue-200/60">
                        <span className="text-[10px] font-bold text-[#002E6E] uppercase tracking-wider block">
                          Proposed Scenario
                        </span>

                        <div>
                          <span className="text-slate-500 block text-[11px]">Proposed EMI</span>
                          <span className="font-black text-[#002E6E] text-sm">
                            ₹{Math.round(simulation.proposed.proposed_emi).toLocaleString()}
                          </span>
                        </div>

                        <div>
                          <span className="text-slate-500 block text-[11px]">New Remaining Months</span>
                          <span className="font-black text-[#002E6E] text-sm">
                            {simulation.proposed.remaining_tenure_months} Months ({Math.round(simulation.proposed.remaining_tenure_months / 12 * 10) / 10} Yrs)
                          </span>
                        </div>

                        <div>
                          <span className="text-slate-500 block text-[11px]">New Total Interest</span>
                          <span className="font-black text-[#002E6E] text-sm">
                            ₹{Math.round(simulation.proposed.total_interest_payable).toLocaleString()}
                          </span>
                        </div>

                        <div>
                          <span className="text-slate-500 block text-[11px]">New Total Outflow</span>
                          <span className="font-black text-[#002E6E] text-sm">
                            ₹{Math.round(simulation.proposed.total_repayment_amount).toLocaleString()}
                          </span>
                        </div>

                        <div>
                          <span className="text-slate-500 block text-[11px]">Accelerated Payoff Date</span>
                          <span className="font-black text-emerald-700 text-sm">
                            {simulation.proposed.estimated_maturity_date}
                          </span>
                        </div>
                      </div>

                    </div>

                    <p className="text-[11px] text-slate-400 mt-4 leading-relaxed">
                      * Slider adjustments are temporary simulation scenarios and do not update your official contractual agreement or database loan records without an explicit update action.
                    </p>
                  </div>

                </div>
              )}

            </div>

          </div>
        )}

      </main>

      {/* ADD EXISTING LOAN MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-150">
            
            <div className="flex items-center justify-between border-b pb-4 mb-6">
              <div>
                <h3 className="text-xl font-extrabold text-[#002E6E]">Add Existing Active Loan</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Record an existing loan. Applicant total EMI & loan count are recalculated in SQLite automatically.
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {addLoanError && (
              <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
                {addLoanError}
              </div>
            )}

            <form onSubmit={handleAddLoanSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Loan Category *</label>
                  <select
                    value={newLoanData.loan_type}
                    onChange={(e) => setNewLoanData({ ...newLoanData, loan_type: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl text-sm border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00BAF2]"
                  >
                    <option value="Personal">Personal Loan</option>
                    <option value="Home">Home Loan</option>
                    <option value="Car">Car Loan</option>
                    <option value="Education">Education Loan</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Sanctioned Amount (₹) *</label>
                  <input
                    type="number"
                    value={newLoanData.loan_amount_inr}
                    onChange={(e) => setNewLoanData({ ...newLoanData, loan_amount_inr: Number(e.target.value) })}
                    min={0}
                    step="any"
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl text-sm border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00BAF2]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Annual Interest Rate (%) *</label>
                  <input
                    type="number"
                    step="any"
                    value={newLoanData.annual_interest_rate_pct}
                    onChange={(e) => setNewLoanData({ ...newLoanData, annual_interest_rate_pct: Number(e.target.value) })}
                    min={1}
                    max={50}
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl text-sm border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00BAF2]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Original Tenure (Months) *</label>
                  <input
                    type="number"
                    value={newLoanData.original_tenure_months}
                    onChange={(e) => setNewLoanData({ ...newLoanData, original_tenure_months: Number(e.target.value) })}
                    min={1}
                    max={360}
                    step={1}
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl text-sm border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00BAF2]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Current Monthly EMI (₹) *</label>
                  <input
                    type="number"
                    value={newLoanData.emi_inr}
                    onChange={(e) => setNewLoanData({ ...newLoanData, emi_inr: Number(e.target.value) })}
                    min={0}
                    step="any"
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl text-sm border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00BAF2]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Remaining Balance (₹) *</label>
                  <input
                    type="number"
                    value={newLoanData.remaining_loan_amount_inr}
                    onChange={(e) => setNewLoanData({ ...newLoanData, remaining_loan_amount_inr: Number(e.target.value) })}
                    min={0}
                    step="any"
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl text-sm border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00BAF2]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Remaining Tenure (Months) *</label>
                  <input
                    type="number"
                    value={newLoanData.remaining_tenure_months}
                    onChange={(e) => setNewLoanData({ ...newLoanData, remaining_tenure_months: Number(e.target.value) })}
                    min={1}
                    step={1}
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl text-sm border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00BAF2]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Loan Start Date</label>
                  <input
                    type="date"
                    value={newLoanData.loan_start_date}
                    onChange={(e) => setNewLoanData({ ...newLoanData, loan_start_date: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl text-sm border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00BAF2]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addLoading}
                  className="px-6 py-2.5 text-xs font-bold bg-[#002E6E] hover:bg-[#002252] text-white rounded-xl shadow-md transition-all disabled:opacity-50"
                >
                  {addLoading ? 'Saving in SQLite...' : 'Save Loan & Recalculate Totals'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default ActiveLoan;
