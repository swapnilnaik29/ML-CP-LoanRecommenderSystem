import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Landmark, ShieldCheck, ArrowLeft, Award, CheckCircle2, DollarSign } from 'lucide-react';
import Navbar from '../components/Navbar';

const LoanDetails: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const selectedLoan = location.state?.loan || location.state?.product;

  if (!selectedLoan) {
    return (
      <div className="min-h-screen w-full bg-slate-50 font-sans flex flex-col">
        <Navbar title="Loan Product Details" />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <h2 className="text-xl font-bold text-[#002E6E]">No loan product selected</h2>
          <button
            onClick={() => navigate('/form')}
            className="mt-4 px-6 py-2.5 bg-[#002E6E] text-white rounded-xl text-xs font-bold"
          >
            Go to Loan Discovery
          </button>
        </div>
      </div>
    );
  }

  const name = selectedLoan.product_name || selectedLoan.bank || 'Loan Product';
  const rate = selectedLoan.interest_rate_range || selectedLoan.rate || '9.0%';
  const emi = selectedLoan.estimated_monthly_emi ? `₹${Math.round(selectedLoan.estimated_monthly_emi).toLocaleString()}` : selectedLoan.emi;
  const prob = selectedLoan.approval_percentage || selectedLoan.rejectionProb;
  const total = selectedLoan.estimated_total_payment ? `₹${Math.round(selectedLoan.estimated_total_payment).toLocaleString()}` : selectedLoan.total;
  const tenure = selectedLoan.tenure_range_months || selectedLoan.tenure;

  return (
    <div className="min-h-screen w-full bg-slate-50 font-sans flex flex-col pb-16">
      <Navbar title={`Product Details — ${name}`} />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200/80">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-6 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#002E6E] text-[#00BAF2] flex items-center justify-center">
                <Landmark size={28} />
              </div>
              <div>
                <span className="text-xs text-slate-400 font-mono block">LoanIQ Product Profile</span>
                <h1 className="text-2xl font-black text-[#002E6E]">{name}</h1>
              </div>
            </div>

            {selectedLoan.approval_percentage && (
              <div className="px-4 py-2 bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-800 text-right">
                <span className="text-[10px] uppercase font-bold tracking-wider block text-emerald-600">Predicted Approval Fit</span>
                <span className="text-xl font-black">{selectedLoan.approval_percentage}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs mb-8">
            <div className="p-4 bg-slate-50 rounded-2xl">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Interest Rate</span>
              <span className="text-base font-black text-[#002E6E]">{rate}</span>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Monthly EMI</span>
              <span className="text-base font-black text-slate-900">{emi}</span>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Tenure Terms</span>
              <span className="text-base font-black text-slate-900">{tenure}</span>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Payment</span>
              <span className="text-base font-black text-emerald-700">{total}</span>
            </div>
          </div>

          <div className="p-4 bg-cyan-50/50 rounded-2xl border border-cyan-100 text-xs text-slate-600 space-y-1">
            <p className="font-bold text-[#002E6E] flex items-center gap-1.5">
              <ShieldCheck size={16} className="text-[#00BAF2]" />
              LoanIQ Eligibility & Machine Learning Verification
            </p>
            <p className="text-[11px] text-slate-500">
              Evaluated against 5 deterministic eligibility gates (amount limits, min credit score, and age criteria) plus calibrated scikit-learn models for approval probability estimation.
            </p>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 flex justify-between items-center">
            <button
              onClick={() => navigate(-1)}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Back
            </button>
            <button
              onClick={() => navigate('/form')}
              className="px-6 py-2.5 bg-[#002E6E] text-white text-xs font-bold rounded-xl"
            >
              Discover More Offers
            </button>
          </div>
        </div>

      </main>
    </div>
  );
};

export default LoanDetails;
