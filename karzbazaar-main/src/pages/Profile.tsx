import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, CreditCard, DollarSign, Briefcase, Landmark, 
  ShieldCheck, Edit3, Save, X, AlertCircle, CheckCircle2
} from 'lucide-react';
import Navbar from '../components/Navbar';
import { api, getStoredApplicant, setStoredApplicant, Applicant } from '../api';

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const [applicant, setApplicant] = useState<Applicant | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [editForm, setEditForm] = useState({
    full_name: '',
    age: 30,
    monthly_income_inr: 0,
    employment_type: 'salaried',
    employment_experience_years: 0,
    credit_score: 700,
    monthly_household_expenses_inr: 0,
    average_bank_balance_inr: 0,
    dependents: 0
  });

  useEffect(() => {
    const cur = getStoredApplicant();
    if (!cur) {
      navigate('/login');
      return;
    }
    setApplicant(cur);
    setEditForm({
      full_name: cur.full_name,
      age: cur.age,
      monthly_income_inr: cur.monthly_income_inr,
      employment_type: cur.employment_type,
      employment_experience_years: cur.employment_experience_years,
      credit_score: cur.credit_score,
      monthly_household_expenses_inr: cur.monthly_household_expenses_inr,
      average_bank_balance_inr: cur.average_bank_balance_inr,
      dependents: cur.dependents
    });

    // Refresh from SQLite
    api.getProfile(cur.applicant_id).then(res => {
      if (res.success && res.applicant) {
        setApplicant(res.applicant);
        setStoredApplicant(res.applicant);
        setEditForm({
          full_name: res.applicant.full_name,
          age: res.applicant.age,
          monthly_income_inr: res.applicant.monthly_income_inr,
          employment_type: res.applicant.employment_type,
          employment_experience_years: res.applicant.employment_experience_years,
          credit_score: res.applicant.credit_score,
          monthly_household_expenses_inr: res.applicant.monthly_household_expenses_inr,
          average_bank_balance_inr: res.applicant.average_bank_balance_inr,
          dependents: res.applicant.dependents
        });
      }
    }).catch(() => {});
  }, [navigate]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applicant) return;
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const payload = {
        ...editForm,
        age: Number(editForm.age),
        monthly_income_inr: Number(editForm.monthly_income_inr),
        employment_experience_years: Number(editForm.employment_experience_years),
        credit_score: Number(editForm.credit_score),
        monthly_household_expenses_inr: Number(editForm.monthly_household_expenses_inr),
        average_bank_balance_inr: Number(editForm.average_bank_balance_inr),
        dependents: Number(editForm.dependents)
      };

      const res = await api.updateProfile(applicant.applicant_id, payload);
      if (res.success && res.applicant) {
        setApplicant(res.applicant);
        setStoredApplicant(res.applicant);
        setIsEditing(false);
        setSuccessMsg('Profile updated and saved in SQLite database successfully.');
      } else {
        setErrorMsg(res.error || 'Failed to update applicant profile.');
      }
    } catch (err: any) {
      setErrorMsg('Server communication error.');
    } finally {
      setLoading(false);
    }
  };

  if (!applicant) return null;

  return (
    <div className="min-h-screen w-full bg-slate-50 font-sans flex flex-col pb-16">
      <Navbar title="Applicant Profile" />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Profile Card Header */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-[#002E6E] text-[#00BAF2] flex items-center justify-center font-black text-2xl shadow-md shrink-0">
              {applicant.full_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl font-black text-[#002E6E]">{applicant.full_name}</h1>
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-50 text-[#002E6E] font-bold text-xs border border-cyan-200">
                  {applicant.applicant_id}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-mono">
                PAN Lookup Identifier: <span className="font-bold text-slate-700">{applicant.pan_number}</span>
              </p>
            </div>
          </div>

          <div>
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-[#002E6E] text-xs font-bold rounded-xl flex items-center gap-2 transition-colors"
              >
                <Edit3 size={15} />
                <span>Edit Profile</span>
              </button>
            ) : (
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2.5 border border-slate-300 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-100 transition-colors flex items-center gap-1.5"
              >
                <X size={15} />
                <span>Cancel</span>
              </button>
            )}
          </div>
        </div>

        {/* Feedback Messages */}
        {successMsg && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle size={16} className="text-red-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Profile Content */}
        {!isEditing ? (
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80 space-y-6">
            
            {/* Row 1: Personal & Credit */}
            <div>
              <h3 className="text-xs font-bold text-[#002E6E] uppercase tracking-wider mb-4 border-b pb-2 flex items-center gap-1.5">
                <User size={14} className="text-[#00BAF2]" />
                Personal & Credit Scoring
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-slate-400 block text-[10px]">Age</span>
                  <span className="font-bold text-slate-800 text-sm">{applicant.age} Years</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-slate-400 block text-[10px]">Credit Score</span>
                  <span className="font-black text-[#002E6E] text-sm">{applicant.credit_score}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-slate-400 block text-[10px]">Dependents</span>
                  <span className="font-bold text-slate-800 text-sm">{applicant.dependents}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-slate-400 block text-[10px]">Synthetic PAN</span>
                  <span className="font-mono font-bold text-slate-800 text-sm">{applicant.pan_number}</span>
                </div>
              </div>
            </div>

            {/* Row 2: Employment & Income */}
            <div>
              <h3 className="text-xs font-bold text-[#002E6E] uppercase tracking-wider mb-4 border-b pb-2 flex items-center gap-1.5">
                <Briefcase size={14} className="text-[#00BAF2]" />
                Employment & Financial Capacity
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-slate-400 block text-[10px]">Employment Type</span>
                  <span className="font-bold text-slate-800 text-sm capitalize">{applicant.employment_type.replace('_', ' ')}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-slate-400 block text-[10px]">Experience</span>
                  <span className="font-bold text-slate-800 text-sm">{applicant.employment_experience_years} Years</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-slate-400 block text-[10px]">Monthly Income</span>
                  <span className="font-black text-emerald-700 text-sm">₹{Math.round(applicant.monthly_income_inr).toLocaleString()}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-slate-400 block text-[10px]">Household Expenses</span>
                  <span className="font-bold text-slate-800 text-sm">₹{Math.round(applicant.monthly_household_expenses_inr).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Row 3: Banking & Existing Obligations */}
            <div>
              <h3 className="text-xs font-bold text-[#002E6E] uppercase tracking-wider mb-4 border-b pb-2 flex items-center gap-1.5">
                <Landmark size={14} className="text-[#00BAF2]" />
                Banking & Existing Debt
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-slate-400 block text-[10px]">Average Bank Balance</span>
                  <span className="font-bold text-slate-800 text-sm">₹{Math.round(applicant.average_bank_balance_inr).toLocaleString()}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-slate-400 block text-[10px]">Existing Monthly EMI</span>
                  <span className="font-black text-slate-900 text-sm">₹{Math.round(applicant.existing_emi_inr).toLocaleString()}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-slate-400 block text-[10px]">Active Loans Count</span>
                  <span className="font-black text-[#002E6E] text-sm">{applicant.existing_active_loans}</span>
                </div>
              </div>
            </div>

          </div>
        ) : (
          /* Edit Form */
          <form onSubmit={handleSave} className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80 space-y-5">
            <h3 className="text-base font-extrabold text-[#002E6E] mb-2">Edit Financial Profile</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Legal Name</label>
                <input
                  type="text"
                  value={editForm.full_name}
                  onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl text-sm border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00BAF2]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Age (Years)</label>
                <input
                  type="number"
                  value={editForm.age}
                  onChange={(e) => setEditForm({ ...editForm, age: Number(e.target.value) })}
                  min={18}
                  max={100}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl text-sm border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00BAF2]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Monthly Income (₹)</label>
                <input
                  type="number"
                  value={editForm.monthly_income_inr}
                  onChange={(e) => setEditForm({ ...editForm, monthly_income_inr: Number(e.target.value) })}
                  min={0}
                  step="any"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl text-sm border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00BAF2]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Monthly Household Expenses (₹)</label>
                <input
                  type="number"
                  value={editForm.monthly_household_expenses_inr}
                  onChange={(e) => setEditForm({ ...editForm, monthly_household_expenses_inr: Number(e.target.value) })}
                  min={0}
                  step="any"
                  className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl text-sm border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00BAF2]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Average Bank Balance (₹)</label>
                <input
                  type="number"
                  value={editForm.average_bank_balance_inr}
                  onChange={(e) => setEditForm({ ...editForm, average_bank_balance_inr: Number(e.target.value) })}
                  min={0}
                  step="any"
                  className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl text-sm border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00BAF2]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Credit Score (300-900)</label>
                <input
                  type="number"
                  value={editForm.credit_score}
                  onChange={(e) => setEditForm({ ...editForm, credit_score: Number(e.target.value) })}
                  min={300}
                  max={900}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl text-sm border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00BAF2]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Employment Type</label>
                <select
                  value={editForm.employment_type}
                  onChange={(e) => setEditForm({ ...editForm, employment_type: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl text-sm border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00BAF2]"
                >
                  <option value="salaried">Salaried</option>
                  <option value="self_employed">Self Employed</option>
                  <option value="business">Business</option>
                  <option value="student">Student</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Experience (Years)</label>
                <input
                  type="number"
                  value={editForm.employment_experience_years}
                  onChange={(e) => setEditForm({ ...editForm, employment_experience_years: Number(e.target.value) })}
                  min={0}
                  max={50}
                  className="w-full px-3.5 py-2.5 bg-slate-50 rounded-xl text-sm border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00BAF2]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 text-xs font-bold bg-[#002E6E] hover:bg-[#002252] text-white rounded-xl shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                <Save size={14} />
                <span>{loading ? 'Saving in SQLite...' : 'Save Changes'}</span>
              </button>
            </div>
          </form>
        )}

      </main>
    </div>
  );
};

export default Profile;
