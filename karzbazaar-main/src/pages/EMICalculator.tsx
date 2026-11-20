import React, { useState, useMemo } from 'react';
import { Calculator, ArrowLeft, Landmark, DollarSign, Calendar, Percent } from 'lucide-react';
import Navbar from '../components/Navbar';

const EMICalculator: React.FC = () => {
  const [amount, setAmount] = useState<number>(1000000);
  const [interestRate, setInterestRate] = useState<number>(9.5);
  const [tenureYears, setTenureYears] = useState<number>(5);

  const tenureMonths = tenureYears * 12;

  const calculation = useMemo(() => {
    const P = amount;
    const r = (interestRate / 100.0) / 12.0;
    const N = tenureMonths;

    if (P <= 0 || N <= 0 || r <= 0) {
      return { emi: 0, totalInterest: 0, totalPayment: 0 };
    }

    const emi = (P * r * Math.pow(1 + r, N)) / (Math.pow(1 + r, N) - 1);
    const totalPayment = emi * N;
    const totalInterest = totalPayment - P;

    return {
      emi: Math.round(emi),
      totalInterest: Math.round(totalInterest),
      totalPayment: Math.round(totalPayment)
    };
  }, [amount, interestRate, tenureMonths]);

  return (
    <div className="min-h-screen w-full bg-slate-50 font-sans flex flex-col pb-16">
      <Navbar title="Reducing-Balance EMI Calculator" />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80">
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-black text-[#002E6E]">
              Loan EMI Calculator
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Standard reducing-balance monthly payment and total interest estimation.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Input Controls */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Principal Amount */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Loan Principal Amount</label>
                  <span className="text-base font-black text-[#002E6E] font-mono">
                    ₹{amount.toLocaleString()}
                  </span>
                </div>
                <input
                  type="range"
                  min={50000}
                  max={10000000}
                  step={25000}
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#002E6E]"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
                  <span>₹50K</span>
                  <span>₹1 Crore</span>
                </div>
              </div>

              {/* Interest Rate */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Interest Rate (Annual %)</label>
                  <span className="text-base font-black text-[#002E6E] font-mono">
                    {interestRate}%
                  </span>
                </div>
                <input
                  type="range"
                  min={5.0}
                  max={25.0}
                  step={0.1}
                  value={interestRate}
                  onChange={(e) => setInterestRate(Number(e.target.value))}
                  className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#002E6E]"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
                  <span>5.0%</span>
                  <span>25.0%</span>
                </div>
              </div>

              {/* Tenure Years */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Tenure (Years)</label>
                  <span className="text-base font-black text-[#002E6E] font-mono">
                    {tenureYears} Years ({tenureMonths} Months)
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={30}
                  step={1}
                  value={tenureYears}
                  onChange={(e) => setTenureYears(Number(e.target.value))}
                  className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#002E6E]"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
                  <span>1 Year</span>
                  <span>30 Years</span>
                </div>
              </div>

            </div>

            {/* Output Projections Card */}
            <div className="lg:col-span-5 bg-gradient-to-br from-[#002E6E] to-[#001D47] text-white p-6 sm:p-8 rounded-3xl flex flex-col justify-between shadow-xl">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-300 block mb-1">
                  Estimated Monthly EMI
                </span>
                <h3 className="text-4xl font-black text-white font-mono tracking-tight">
                  ₹{calculation.emi.toLocaleString()}
                </h3>
                <span className="text-[11px] text-cyan-200/70 block mt-1">Per Month for {tenureMonths} Months</span>
              </div>

              <div className="space-y-4 my-6 pt-6 border-t border-white/10 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Principal Amount</span>
                  <span className="font-bold font-mono">₹{amount.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Total Interest Payable</span>
                  <span className="font-bold text-[#00BAF2] font-mono">₹{calculation.totalInterest.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between border-t border-white/10 pt-3">
                  <span className="font-bold text-white">Total Repayment Amount</span>
                  <span className="font-black text-emerald-400 text-sm font-mono">₹{calculation.totalPayment.toLocaleString()}</span>
                </div>
              </div>

              <p className="text-[10px] text-cyan-200/60 leading-tight">
                Standard nominal formula: EMI = [P × r × (1+r)^N]/[(1+r)^N-1]. Does not include processing charges or taxes.
              </p>
            </div>

          </div>
        </div>

      </main>
    </div>
  );
};

export default EMICalculator;
