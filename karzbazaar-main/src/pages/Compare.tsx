import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  ArrowLeft, CheckCircle2, Award, ShieldCheck, 
  IndianRupee, Percent, Clock, AlertCircle, BarChart2
} from 'lucide-react';
import Navbar from '../components/Navbar';
import { RecommendationResult, DiscoveryResponse } from '../api';

const CompareLoans: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const selectedProducts: RecommendationResult[] = location.state?.selectedProducts || [];
  const discoveryData: DiscoveryResponse | undefined = location.state?.discoveryData;

  if (selectedProducts.length < 2) {
    return (
      <div className="min-h-screen w-full bg-slate-50 font-sans flex flex-col">
        <Navbar title="Compare Offers" />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-3xl bg-blue-50 text-[#002E6E] flex items-center justify-center mb-4">
            <BarChart2 size={32} />
          </div>
          <h2 className="text-xl font-extrabold text-[#002E6E]">Select At Least 2 Offers to Compare</h2>
          <p className="text-xs text-slate-500 mt-2 max-w-sm">
            Side-by-side comparison requires at least 2 eligible loan products. Go back to Recommendations to choose products.
          </p>
          <button
            onClick={() => navigate('/form')}
            className="mt-6 px-6 py-3 bg-[#002E6E] text-white rounded-xl text-xs font-bold hover:bg-[#002252] transition-colors"
          >
            Go to Loan Discovery
          </button>
        </div>
      </div>
    );
  }

  // Find top product by approval probability
  const topProduct = [...selectedProducts].sort((a, b) => b.predicted_approval_probability - a.predicted_approval_probability)[0];

  return (
    <div className="min-h-screen w-full bg-slate-50 font-sans flex flex-col pb-16">
      <Navbar title={`Compare Loan Offers (${selectedProducts.length})`} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#002E6E]">
              Side-by-Side Offer Comparison
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              All projections use consistent assumptions: ₹{Number(discoveryData?.requested_amount || 500000).toLocaleString()} principal over {discoveryData?.desired_tenure_months || 36} months.
            </p>
          </div>

          <button
            onClick={() => navigate(-1)}
            className="self-start sm:self-auto px-4 py-2 bg-white border border-slate-300 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-100 transition-colors flex items-center gap-1.5"
          >
            <ArrowLeft size={14} />
            <span>Back to Recommendations</span>
          </button>
        </div>

        {/* Comparison Table Container */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              
              {/* Product Header Row */}
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200">
                  <th className="p-4 sm:p-5 w-48 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                    Attribute
                  </th>
                  {selectedProducts.map((prod) => {
                    const isBest = prod.product_id === topProduct.product_id;
                    return (
                      <th
                        key={prod.product_id}
                        className={`p-4 sm:p-5 text-center min-w-[200px] border-l border-slate-200 relative ${
                          isBest ? 'bg-cyan-50/40' : ''
                        }`}
                      >
                        {isBest && (
                          <div className="absolute top-2 right-2">
                            <span className="px-2 py-0.5 rounded-full bg-cyan-100 text-[#002E6E] text-[10px] font-bold flex items-center gap-1">
                              <Award size={10} className="text-[#00BAF2]" />
                              Top Pick
                            </span>
                          </div>
                        )}
                        <span className="font-mono text-[10px] text-slate-400 block mb-1">
                          {prod.product_id}
                        </span>
                        <h3 className="font-extrabold text-sm sm:text-base text-[#002E6E]">
                          {prod.product_name}
                        </h3>
                        <p className="text-[11px] text-slate-500 capitalize">{prod.loan_type} Loan</p>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                
                {/* 1. ML Approval Probability */}
                <tr className="hover:bg-slate-50/50">
                  <td className="p-4 font-bold text-slate-900 bg-slate-50/30">
                    Predicted Approval Probability
                    <span className="block text-[10px] text-slate-400 font-normal">Calibrated Model Output</span>
                  </td>
                  {selectedProducts.map((prod) => (
                    <td key={prod.product_id} className="p-4 text-center border-l border-slate-100">
                      <span className="text-base font-black text-emerald-600 block">
                        {prod.approval_percentage}
                      </span>
                      <span className="text-[10px] text-slate-400">Score-ranked</span>
                    </td>
                  ))}
                </tr>

                {/* 2. Interest Rate */}
                <tr className="hover:bg-slate-50/50">
                  <td className="p-4 font-bold text-slate-900 bg-slate-50/30">
                    Annual Interest Rate
                    <span className="block text-[10px] text-slate-400 font-normal">Product rate range</span>
                  </td>
                  {selectedProducts.map((prod) => (
                    <td key={prod.product_id} className="p-4 text-center border-l border-slate-100 font-bold text-[#002E6E] text-sm">
                      {prod.interest_rate_range}
                    </td>
                  ))}
                </tr>

                {/* 3. Monthly EMI */}
                <tr className="hover:bg-slate-50/50">
                  <td className="p-4 font-bold text-slate-900 bg-slate-50/30">
                    Estimated Monthly EMI
                    <span className="block text-[10px] text-slate-400 font-normal">Standard reducing-balance</span>
                  </td>
                  {selectedProducts.map((prod) => (
                    <td key={prod.product_id} className="p-4 text-center border-l border-slate-100 font-black text-slate-900 text-sm">
                      ₹{Math.round(prod.estimated_monthly_emi).toLocaleString()}
                    </td>
                  ))}
                </tr>

                {/* 4. Total Interest Payable */}
                <tr className="hover:bg-slate-50/50">
                  <td className="p-4 font-bold text-slate-900 bg-slate-50/30">
                    Total Estimated Interest
                    <span className="block text-[10px] text-slate-400 font-normal">Over full requested tenure</span>
                  </td>
                  {selectedProducts.map((prod) => (
                    <td key={prod.product_id} className="p-4 text-center border-l border-slate-100 text-slate-800">
                      ₹{Math.round(prod.estimated_total_interest).toLocaleString()}
                    </td>
                  ))}
                </tr>

                {/* 5. Total Repayment */}
                <tr className="hover:bg-slate-50/50">
                  <td className="p-4 font-bold text-slate-900 bg-slate-50/30">
                    Total Repayment Amount
                    <span className="block text-[10px] text-slate-400 font-normal">Principal + Total Interest</span>
                  </td>
                  {selectedProducts.map((prod) => (
                    <td key={prod.product_id} className="p-4 text-center border-l border-slate-100 font-bold text-emerald-700">
                      ₹{Math.round(prod.estimated_total_payment).toLocaleString()}
                    </td>
                  ))}
                </tr>

                {/* 6. Eligible Amount Limits */}
                <tr className="hover:bg-slate-50/50">
                  <td className="p-4 font-bold text-slate-900 bg-slate-50/30">
                    Eligible Loan Amount Limits
                    <span className="block text-[10px] text-slate-400 font-normal">Hard product bounds</span>
                  </td>
                  {selectedProducts.map((prod) => (
                    <td key={prod.product_id} className="p-4 text-center border-l border-slate-100 text-slate-600">
                      ₹{Number(prod.min_loan_amount).toLocaleString()} - ₹{Number(prod.max_loan_amount).toLocaleString()}
                    </td>
                  ))}
                </tr>

                {/* 7. Tenure Range */}
                <tr className="hover:bg-slate-50/50">
                  <td className="p-4 font-bold text-slate-900 bg-slate-50/30">
                    Supported Tenure Range
                    <span className="block text-[10px] text-slate-400 font-normal">Product bounds</span>
                  </td>
                  {selectedProducts.map((prod) => (
                    <td key={prod.product_id} className="p-4 text-center border-l border-slate-100 text-slate-600">
                      {prod.tenure_range_months}
                    </td>
                  ))}
                </tr>

                {/* 8. Processing Fee */}
                <tr className="hover:bg-slate-50/50">
                  <td className="p-4 font-bold text-slate-900 bg-slate-50/30">
                    Estimated Processing Fee
                    <span className="block text-[10px] text-slate-400 font-normal">Indicative product fee</span>
                  </td>
                  {selectedProducts.map((prod) => (
                    <td key={prod.product_id} className="p-4 text-center border-l border-slate-100 text-slate-600">
                      {prod.processing_fee_est}
                    </td>
                  ))}
                </tr>

                {/* 9. Hard Eligibility Rules */}
                <tr className="hover:bg-slate-50/50">
                  <td className="p-4 font-bold text-slate-900 bg-slate-50/30">
                    Hard Eligibility Status
                    <span className="block text-[10px] text-slate-400 font-normal">5 deterministic gates</span>
                  </td>
                  {selectedProducts.map((prod) => (
                    <td key={prod.product_id} className="p-4 text-center border-l border-slate-100">
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-[11px]">
                        <CheckCircle2 size={13} className="text-emerald-500" />
                        All Gates Passed
                      </span>
                    </td>
                  ))}
                </tr>

                {/* 10. Model Engine */}
                <tr className="hover:bg-slate-50/50">
                  <td className="p-4 font-bold text-slate-900 bg-slate-50/30">
                    ML Model Engine
                    <span className="block text-[10px] text-slate-400 font-normal">Pipeline & calibration</span>
                  </td>
                  {selectedProducts.map((prod) => (
                    <td key={prod.product_id} className="p-4 text-center border-l border-slate-100 text-[10px] text-slate-400 font-mono">
                      {prod.model_version}
                    </td>
                  ))}
                </tr>

              </tbody>
            </table>
          </div>
        </div>

        {/* Disclaimer Footer */}
        <div className="p-4 bg-slate-100/70 rounded-2xl text-[11px] text-slate-500 leading-relaxed border border-slate-200">
          <p className="font-bold text-slate-600 mb-0.5">Assumptions & Estimation Note:</p>
          Calculations are simulated estimates based on nominal reducing-balance amortisation with monthly rests. Final terms, foreclosure conditions, processing charges, and insurance requirements are governed by specific lender agreements.
        </div>

      </main>
    </div>
  );
};

export default CompareLoans;
