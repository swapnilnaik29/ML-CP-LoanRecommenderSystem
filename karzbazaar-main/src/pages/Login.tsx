import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, User, ArrowRight, ShieldAlert, Sparkles, Landmark, CheckCircle2 } from 'lucide-react';
import { api, setStoredApplicant } from '../api';

interface LoginProps {
  onLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('USR0001');
  const [password, setPassword] = useState('demo1234');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sampleUsers, setSampleUsers] = useState<any[]>([]);

  useEffect(() => {
    // Fetch synthetic demo users from backend SQLite for quick testing
    api.getSampleUsers(15).then(res => {
      if (res.success && res.sample_users) {
        setSampleUsers(res.sample_users);
      }
    }).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setError('Please provide your PAN, Applicant ID, or Email.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const res = await api.login(identifier, password);
      if (res.success && res.applicant) {
        setStoredApplicant(res.applicant);
        onLogin();
        navigate('/');
      } else {
        setError(res.error || 'Authentication failed. Please verify credentials.');
      }
    } catch (err: any) {
      setError('Could not connect to LoanIQ server. Ensure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const selectQuickUser = (user: any) => {
    setIdentifier(user.applicant_id);
    setPassword('demo1234');
    setError('');
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 flex flex-col justify-center items-center p-4 font-sans">
      
      {/* Brand Header */}
      <div className="flex items-center gap-2 mb-8 select-none">
        <div className="w-11 h-11 rounded-2xl bg-[#002E6E] flex items-center justify-center text-[#00BAF2] shadow-lg">
          <Landmark size={24} />
        </div>
        <div className="flex flex-col">
          <span className="text-3xl font-black tracking-tight text-[#002E6E] leading-none">
            Loan<span className="text-[#00BAF2]">IQ</span>
          </span>
          <span className="text-xs text-slate-500 font-medium tracking-wide">
            Intelligent Lending & Repayment Optimisation
          </span>
        </div>
      </div>

      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200/80 p-8">
        
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-extrabold text-[#002E6E]">Welcome Back</h2>
          <p className="text-sm text-slate-500 mt-1">
            Sign in to access your personalised loan offers
          </p>
        </div>

        {/* Demo Fast-Login Selector */}
        {sampleUsers.length > 0 && (
          <div className="mb-6 p-3 bg-cyan-50/70 border border-cyan-200/80 rounded-2xl">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#002E6E] mb-2">
              <Sparkles size={14} className="text-[#00BAF2]" />
              <span>Quick Demo Switcher (Synthetic Applicants)</span>
            </div>
            <select
              onChange={(e) => {
                const u = sampleUsers.find(item => item.applicant_id === e.target.value);
                if (u) selectQuickUser(u);
              }}
              value={identifier}
              className="w-full text-xs bg-white border border-cyan-200 rounded-xl px-2.5 py-2 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#00BAF2]"
            >
              {sampleUsers.map(u => (
                <option key={u.applicant_id} value={u.applicant_id}>
                  {u.applicant_id} — {u.full_name} (Score: {u.credit_score}, Active Loans: {u.existing_active_loans})
                </option>
              ))}
            </select>
            <p className="text-[10px] text-slate-500 mt-1.5 leading-tight">
              Select any pre-seeded synthetic applicant for instant academic demonstration.
            </p>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
            <ShieldAlert size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
              Identifier (PAN / Applicant ID / Email)
            </label>
            <div className="relative">
              <User size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="e.g., USR0001 or ZZZP0001A"
                required
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 rounded-xl text-sm border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00BAF2] focus:border-transparent transition-all font-medium text-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
              Password
            </label>
            <div className="relative">
              <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 rounded-xl text-sm border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00BAF2] focus:border-transparent transition-all font-medium text-slate-800"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#002E6E] hover:bg-[#002252] text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-900/10 transition-all hover:shadow-xl active:scale-[0.99] disabled:opacity-50 mt-6"
          >
            {loading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>Sign In to LoanIQ</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-500">
            Need a new applicant profile?{' '}
            <Link to="/signup" className="font-bold text-[#002E6E] hover:text-[#00BAF2] transition-colors">
              Register New Applicant
            </Link>
          </p>
        </div>
      </div>

      <p className="text-[11px] text-slate-400 mt-6 text-center max-w-sm">
        Academic College Demonstration Platform • All applicant data and PAN values are synthetic simulation benchmarks.
      </p>
    </div>
  );
};

export default Login;
