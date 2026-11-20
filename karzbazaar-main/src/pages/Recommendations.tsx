import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  CheckCircle2, XCircle, Award, BarChart2, ArrowRight, 
  Info, ShieldAlert, Sparkles, Filter, ChevronDown, ChevronUp, Layers
} from 'lucide-react';
import Navbar from '../components/Navbar';
import { RecommendationResult, IneligibleProduct, DiscoveryResponse } from '../api';

const Recommendations: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const discoveryData: DiscoveryResponse | undefined = location.state?.discoveryData;
  const [activeTab, setActiveTab] = useState<'eligible' | 'ineligible'>('eligible');
  const [selectedToCompare, setSelectedToCompare] = useState<RecommendationResult[]>([]);
  const [expandedReasons, setExpandedReasons] = useState<string | null>(null);

  useEffect(() => {
    if (!discoveryData) {
      // If user refreshed or navigated directly, redirect to discovery form
      navigate('/form');
    }
  }, [discoveryData, navigate]);

  if (!discoveryData) {
    return null;
  }

  const eligibleList = discoveryData.eligible_recommendations || [];
  const ineligibleList = discoveryData.ineligible_products || [];

  const handleToggleSelect = (item: RecommendationResult) => {
    const isSelected = selectedToCompare.some(p => p.product_id === item.product_id);
    if (isSelected) {
      setSelectedToCompare(selectedToCompare.filter(p => p.product_id !== item.product_id));
    } else {
      if (selectedToCompare.length >= 4) {
        alert("You can select up to 4 products for comparison.");
        return;
      }
      setSelectedToCompare([...selectedToCompare, item]);
    }
  };

  const handleGoToCompare = () => {
    if (selectedToCompare.length < 2) {
      alert("Please select at least 2 eligible products to compare side by side.");
      return;
    }
    navigate('/compare', { state: { selectedProducts: selectedToCompare, discoveryData } });
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 font-sans flex flex-col pb-24">
      <Navbar title={`Recommendations: ${discoveryData.loan_type.toUpperCase()} Loan`} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Header Summary Banner */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full bg-blue-50 text-[#002E6E] text-xs font-bold border border-blue-100 uppercase tracking-wide">
                {discoveryData.loan_type} Loan Discovery
              </span>
              <span className="text-xs text-slate-400 font-mono">
                App ID: {discoveryData.application_id}
              </span>
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-black text-[#002E6E]">
              Calibrated Loan Recommendations
            </h1>
            
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Requested: <span className="font-bold text-slate-800">₹{Number(discoveryData.requested_amount).toLocaleString()}</span> over{' '}
              <span className="font-bold text-slate-800">{discoveryData.desired_tenure_months} months</span> for{' '}
              <span className="font-bold text-slate-800">{discoveryData.applicant_name}</span> (Credit Score: {discoveryData.credit_score}).
            </p>
          </div>

          <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200/80 self-start lg:self-auto">
            <div className="text-center px-3 border-r border-slate-200">
              <span className="text-2xl font-black text-emerald-600 block">{eligibleList.length}</span>
              <span className="text-[11px] text-slate-500 font-semibold uppercase">Eligible</span>
            </div>
            <div className="text-center px-3">
              <span className="text-2xl font-black text-slate-400 block">{ineligibleList.length}</span>
              <span className="text-[11px] text-slate-500 font-semibold uppercase">Ineligible</span>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          <button
            onClick={() => setActiveTab('eligible')}
            className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
              activeTab === 'eligible'
                ? 'bg-[#002E6E] text-white shadow-md'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <CheckCircle2 size={16} className={activeTab === 'eligible' ? 'text-[#00BAF2]' : 'text-slate-400'} />
            <span>Eligible Recommendations ({eligibleList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('ineligible')}
            className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
              activeTab === 'ineligible'
                ? 'bg-[#002E6E] text-white shadow-md'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <XCircle size={16} className={activeTab === 'ineligible' ? 'text-rose-400' : 'text-slate-400'} />
            <span>Ineligible Products ({ineligibleList.length})</span>
          </button>
        </div>

        {/* TAB 1: ELIGIBLE RECOMMENDATIONS */}
        {activeTab === 'eligible' && (
          <div className="space-y-4">
            {eligibleList.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-sm">
                <ShieldAlert size={36} className="text-amber-500 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-[#002E6E]">No Configured Products Met Hard Eligibility Criteria</h3>
                <p className="text-xs text-slate-500 mt-2 max-w-md mx-auto">
                  None of the loan products in this category matched the requested loan amount, age bounds, or credit score threshold. Check the Ineligible Products tab to review specific reasons.
                </p>
                <button
                  onClick={() => navigate('/form')}
                  className="mt-5 px-5 py-2.5 bg-[#002E6E] text-white text-xs font-bold rounded-xl"
                >
                  Adjust Loan Parameters
                </button>
              </div>
            ) : (
              eligibleList.map((item, index) => {
                const isSelected = selectedToCompare.some(p => p.product_id === item.product_id);
                const isTop = index === 0;
                const isExpanded = expandedReasons === item.product_id;

                return (
                  <div
                    key={item.product_id}
                    className={`bg-white rounded-2xl p-5 sm:p-6 border transition-all shadow-sm ${
                      isSelected
                        ? 'border-[#00BAF2] ring-2 ring-[#00BAF2]/30 shadow-md'
                        : isTop
                        ? 'border-cyan-300 hover:border-cyan-400'
                        : 'border-slate-200 hover:border-slate-300 hover:shadow'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                      
                      {/* Left: Product & Probability Badge */}
                      <div className="space-y-2 max-w-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                            {item.product_id}
                          </span>
                          {isTop && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-cyan-100 text-[#002E6E] text-[11px] font-bold">
                              <Award size={12} className="text-[#00BAF2]" />
                              Highest ML Approval Fit
                            </span>
                          )}
                        </div>

                        <h3 className="text-lg font-bold text-[#002E6E] leading-snug">
                          {item.product_name}
                        </h3>

                        <div className="flex items-center gap-3 pt-0.5">
                          <div className="px-3 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800">
                            <span className="text-[10px] uppercase font-bold tracking-wider block text-emerald-600">
                              Approval Fit
                            </span>
                            <span className="text-base font-extrabold">{item.approval_percentage}</span>
                          </div>

                          <div className="text-xs text-slate-500">
                            <p className="font-medium text-slate-700">ML Calibrated</p>
                            <p className="text-[10px] text-slate-400">Deterministic Passed</p>
                          </div>
                        </div>
                      </div>

                      {/* Center: Financial Parameters */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs flex-1 max-w-2xl">
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Interest Rate</span>
                          <span className="font-bold text-[#002E6E] text-sm block mt-0.5">{item.interest_rate_range}</span>
                          <span className="text-[10px] text-slate-400 block">Nominal {item.interest_rate_annual}%</span>
                        </div>

                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Monthly EMI</span>
                          <span className="font-bold text-slate-900 text-sm block mt-0.5">₹{Math.round(item.estimated_monthly_emi).toLocaleString('en-IN')}</span>
                          <span className="text-[10px] text-slate-400 block">Reducing balance</span>
                        </div>

                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Interest</span>
                          <span className="font-bold text-slate-800 text-sm block mt-0.5">₹{Math.round(item.estimated_total_interest).toLocaleString('en-IN')}</span>
                          <span className="text-[10px] text-slate-400 block">{discoveryData.desired_tenure_months} mo</span>
                        </div>

                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Repayment</span>
                          <span className="font-bold text-emerald-700 text-sm block mt-0.5">₹{Math.round(item.estimated_total_payment).toLocaleString('en-IN')}</span>
                          <span className="text-[10px] text-slate-400 block">Principal + Int.</span>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex flex-col sm:flex-row lg:flex-col items-end gap-2.5 shrink-0">
                        <button
                          onClick={() => handleToggleSelect(item)}
                          className={`w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                            isSelected
                              ? 'bg-[#00BAF2] text-[#002E6E] shadow-sm'
                              : 'bg-white border border-slate-300 text-slate-700 hover:border-cyan-400 hover:bg-slate-50'
                          }`}
                        >
                          <BarChart2 size={13} />
                          <span>{isSelected ? '✓ Selected' : 'Add to Compare'}</span>
                        </button>

                        <button
                          onClick={() => setExpandedReasons(isExpanded ? null : item.product_id)}
                          className="text-xs text-[#002E6E] hover:text-[#00BAF2] font-semibold flex items-center gap-1 transition-colors"
                        >
                          <Info size={13} />
                          <span>Eligibility Breakdown</span>
                          {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                        </button>
                      </div>

                    </div>

                    {/* Hard Eligibility Rules Breakdown Accordion */}
                    {isExpanded && (
                      <div className="mt-5 pt-4 border-t border-slate-100 bg-slate-50/70 p-4 rounded-2xl">
                        <h4 className="text-xs font-bold text-[#002E6E] uppercase tracking-wider mb-2">
                          Hard Eligibility Gates Evaluation (All 5 Passed)
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                          {item.eligibility_reasons.map((r: any, idx: number) => (
                            <div key={idx} className="flex items-center gap-2 p-2 bg-white rounded-xl border border-emerald-100 text-emerald-900">
                              <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                              <span className="text-[11px] font-medium leading-tight">{r.description}</span>
                            </div>
                          ))}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-2 font-mono">
                          Model Engine: {item.model_version} • Processing Fee: {item.processing_fee_est}
                        </p>
                      </div>
                    )}

                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TAB 2: INELIGIBLE PRODUCTS */}
        {activeTab === 'ineligible' && (
          <div className="space-y-4">
            {ineligibleList.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-3xl border border-slate-200">
                <CheckCircle2 size={32} className="text-emerald-500 mx-auto mb-2" />
                <h3 className="text-base font-bold text-[#002E6E]">No Ineligible Products</h3>
                <p className="text-xs text-slate-500 mt-1">All configured products in this category passed your eligibility criteria.</p>
              </div>
            ) : (
              ineligibleList.map((item) => (
                <div
                  key={item.product_id}
                  className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm opacity-90"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                          {item.product_id}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 text-xs font-bold border border-rose-200">
                          Ineligible
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-slate-800">{item.product_name}</h3>
                      <p className="text-xs text-slate-500">
                        Amount Range: ₹{Number(item.min_loan_amount).toLocaleString()} - ₹{Number(item.max_loan_amount).toLocaleString()} • Rate: {item.interest_rate_range}
                      </p>
                    </div>

                    <div className="bg-rose-50/70 p-3 rounded-2xl border border-rose-200/80 max-w-md">
                      <p className="text-xs font-bold text-rose-800 mb-1 flex items-center gap-1.5">
                        <ShieldAlert size={14} className="text-rose-600 shrink-0" />
                        <span>Failed Hard Eligibility Criteria:</span>
                      </p>
                      <ul className="list-disc list-inside text-xs text-rose-700 space-y-0.5">
                        {item.failed_reasons.map((reason, idx) => (
                          <li key={idx} className="text-[11px]">{reason}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Academic Project Disclaimer */}
        <div className="p-4 bg-slate-100/70 rounded-2xl text-[11px] text-slate-500 leading-relaxed border border-slate-200">
          <p className="font-bold text-slate-600 mb-0.5">Synthetic Model Disclaimer:</p>
          {discoveryData.disclaimer}
        </div>

      </main>

      {/* Floating Comparison Tray */}
      {selectedToCompare.length > 0 && (
        <div className="fixed bottom-0 inset-x-0 bg-[#002E6E] text-white border-t border-cyan-500/30 p-4 shadow-2xl z-40 animate-in slide-in-from-bottom duration-200">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#00BAF2] text-[#002E6E] flex items-center justify-center font-bold text-sm">
                {selectedToCompare.length}
              </div>
              <div>
                <p className="text-xs font-bold text-white">
                  {selectedToCompare.length} Product{selectedToCompare.length > 1 ? 's' : ''} Selected for Comparison
                </p>
                <p className="text-[11px] text-cyan-200">
                  {selectedToCompare.map(p => p.product_name).join(', ')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedToCompare([])}
                className="px-3 py-1.5 text-xs text-slate-300 hover:text-white"
              >
                Clear
              </button>

              <button
                onClick={handleGoToCompare}
                disabled={selectedToCompare.length < 2}
                className="px-6 py-2.5 bg-[#00BAF2] hover:bg-cyan-300 disabled:opacity-40 disabled:cursor-not-allowed text-[#002E6E] rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg transition-all"
              >
                <span>Compare Side-by-Side</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Recommendations;
