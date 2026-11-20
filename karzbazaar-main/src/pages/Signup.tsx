import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Landmark, ArrowRight, ShieldAlert, CheckCircle2, User, CreditCard, DollarSign } from 'lucide-react';
import { api, setStoredApplicant } from '../api';

const Signup: React.FC = () => {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    full_name: '',
    pan_number: '',
    age: 28,
    monthly_income_inr: 65000,
    employment_type: 'salaried',
    employment_experience_years: 4,
    credit_score: 740,
    existing_emi_inr: 0,
    existing_active_loans: 0,
    monthly_household_expenses_inr: 22000,
    average_bank_balance_inr: 85000,
    dependents: 1,
    password: '',
    confirm_password: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!formData.pan_number.trim() || formData.pan_number.trim().length !== 10) {
      setError('PAN identifier must be 10 characters (e.g., ZZZP0099A).');
      return;
    }
    if (formData.password && formData.password !== formData.confirm_password) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = {
        ...formData,
        pan_number: formData.pan_number.trim().toUpperCase(),
        age: Number(formData.age),
        monthly_income_inr: Number(formData.monthly_income_inr),
        employment_experience_years: Number(formData.employment_experience_years),
        credit_score: Number(formData.credit_score),
        existing_emi_inr: Number(formData.existing_emi_inr),
        existing_active_loans: Number(formData.existing_active_loans),
        monthly_household_expenses_inr: Number(formData.monthly_household_expenses_inr),
        average_bank_balance_inr: Number(formData.average_bank_balance_inr),
        dependents: Number(formData.dependents),
        password: formData.password || 'demo1234'
      };

      const res = await api.register(payload);
      if (res.success && res.applicant) {
        setStoredApplicant(res.applicant);
        navigate('/');
      } else {
        setError(res.error || 'Registration failed.');
      }
    } catch (err: any) {
      setError('Connection to server failed. Please ensure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 py-10 px-4 font-sans flex flex-col items-center justify-center">
      
      {/* Brand Header */}
      <div className="flex items-center gap-2 mb-6 select-none">
        <div className="w-10 h-10 rounded-2xl bg-[#002E6E] flex items-center justify-center text-[#00BAF2] shadow-md">
          <Landmark size={22} />
        </div>
        <div className="flex flex-col">
          <span className="text-2xl font-black tracking-tight text-[#002E6E] leading-none">
            Loan<span className="text-[#00BAF2]">IQ</span>
          </span>
          <span className="text-[10px] text-slate-500 font-medium tracking-wide">
            Applicant Registration
          </span>
        </div>
      </div>

      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-xl border border-slate-200/80 p-6 sm:p-8">
        
        <div className="mb-6">
          <h2 className="text-2xl font-extrabold text-[#002E6E]">New Applicant Details</h2>
          <p className="text-xs text-slate-500 mt-1">
            Complete your financial profile to receive calibrated AI loan recommendations and repayment simulations.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
            <ShieldAlert size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Section 1: Identification */}
          <div>
            <h3 className="text-xs font-bold text-[#002E6E] uppercase tracking-wider mb-3 flex items-center gap-1.5 border-b pb-1.5">
              <User size={14} className="text-[#00BAF2]" />
              1. Personal & Identity Information
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Legal Name *</label>
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  placeholder="e.g., Harsh Bansal"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl text-sm border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00BAF2]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  PAN Lookup Identifier *
                  <span className="text-[10px] text-slate-400 font-normal ml-1">(Synthetic Demo)</span>
                </label>
                <input
                  type="text"
                  name="pan_number"
                  value={formData.pan_number}
                  onChange={handleChange}
                  placeholder="e.g., ZZZP0099A"
                  maxLength={10}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl text-sm border border-slate-200 uppercase font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00BAF2]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Age (Years) *</label>
                <input
                  type="number"
                  name="age"
                  value={formData.age}
                  onChange={handleChange}
                  min={18}
                  max={100}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl text-sm border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00BAF2]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Number of Dependents</label>
                <input
                  type="number"
                  name="dependents"
                  value={formData.dependents}
                  onChange={handleChange}
                  min={0}
                  max={10}
                  className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl text-sm border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00BAF2]"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Employment & Income */}
          <div>
            <h3 className="text-xs font-bold text-[#002E6E] uppercase tracking-wider mb-3 flex items-center gap-1.5 border-b pb-1.5">
              <DollarSign size={14} className="text-[#00BAF2]" />
              2. Employment & Income Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Employment Type *</label>
                <select
                  name="employment_type"
                  value={formData.employment_type}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl text-sm border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00BAF2]"
                >
                  <option value="salaried">Salaried Professional</option>
                  <option value="self_employed">Self Employed</option>
                  <option value="business">Business Owner</option>
                  <option value="student">Student</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Experience (Years) *</label>
                <input
                  type="number"
                  name="employment_experience_years"
                  value={formData.employment_experience_years}
                  onChange={handleChange}
                  min={0}
                  max={50}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl text-sm border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00BAF2]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Monthly Income (₹) *</label>
                <input
                  type="number"
                  name="monthly_income_inr"
                  value={formData.monthly_income_inr}
                  onChange={handleChange}
                  min={0}
                  step="any"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl text-sm border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00BAF2]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Monthly Household Expenses (₹)</label>
                <input
                  type="number"
                  name="monthly_household_expenses_inr"
                  value={formData.monthly_household_expenses_inr}
                  onChange={handleChange}
                  min={0}
                  step="any"
                  className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl text-sm border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00BAF2]"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Financial & Credit Profile */}
          <div>
            <h3 className="text-xs font-bold text-[#002E6E] uppercase tracking-wider mb-3 flex items-center gap-1.5 border-b pb-1.5">
              <CreditCard size={14} className="text-[#00BAF2]" />
              3. Credit & Banking Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Credit Score (300 - 900) *</label>
                <input
                  type="number"
                  name="credit_score"
                  value={formData.credit_score}
                  onChange={handleChange}
                  min={300}
                  max={900}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl text-sm border border-slate-200 font-bold text-[#002E6E] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00BAF2]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Average Bank Balance (₹)</label>
                <input
                  type="number"
                  name="average_bank_balance_inr"
                  value={formData.average_bank_balance_inr}
                  onChange={handleChange}
                  min={0}
                  step="any"
                  className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl text-sm border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00BAF2]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Existing Monthly EMI (₹)</label>
                <input
                  type="number"
                  name="existing_emi_inr"
                  value={formData.existing_emi_inr}
                  onChange={handleChange}
                  min={0}
                  step="any"
                  className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl text-sm border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00BAF2]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Number of Active Loans</label>
                <input
                  type="number"
                  name="existing_active_loans"
                  value={formData.existing_active_loans}
                  onChange={handleChange}
                  min={0}
                  className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl text-sm border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00BAF2]"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Security */}
          <div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Create a password"
                  className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl text-sm border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00BAF2]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Confirm Password</label>
                <input
                  type="password"
                  name="confirm_password"
                  value={formData.confirm_password}
                  onChange={handleChange}
                  placeholder="Repeat password"
                  className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl text-sm border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00BAF2]"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-[#002E6E] hover:bg-[#002252] text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-900/10 transition-all hover:shadow-xl active:scale-[0.99] disabled:opacity-50"
          >
            {loading ? (
              <span>Saving Profile in SQLite...</span>
            ) : (
              <>
                <span>Complete Registration & Go to Dashboard</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-500">
            Already have an applicant account?{' '}
            <Link to="/login" className="font-bold text-[#002E6E] hover:text-[#00BAF2] transition-colors">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
