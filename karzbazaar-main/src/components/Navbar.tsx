import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, LogOut, User, ChevronDown, Landmark, Sparkles } from 'lucide-react';
import { getStoredApplicant, clearStoredApplicant } from '../api';

interface NavbarProps {
  title?: string | React.ReactNode;
  backAction?: () => void;
  showBack?: boolean;
}

const Navbar: React.FC<NavbarProps> = ({ title, backAction, showBack = true }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [applicant, setApplicant] = useState<any>(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    setApplicant(getStoredApplicant());
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleBack = () => {
    if (backAction) {
      backAction();
    } else {
      navigate(-1);
    }
  };

  const handleLogout = () => {
    clearStoredApplicant();
    window.location.href = '/login';
  };

  const isCurrent = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 bg-[#002E6E] text-white shadow-md border-b border-blue-900/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Left: Brand & Back */}
        <div className="flex items-center gap-3 sm:gap-4">
          {showBack && location.pathname !== '/' && (
            <button
              onClick={handleBack}
              className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-cyan-200 transition-colors flex items-center gap-1.5 text-xs font-semibold shadow-sm"
              aria-label="Go back"
            >
              <ArrowLeft size={16} />
              {!isMobile && <span>Back</span>}
            </button>
          )}

          <div
            onClick={() => navigate('/')}
            className="flex items-center gap-2.5 cursor-pointer select-none group"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#00BAF2] to-cyan-200 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
              <Landmark size={18} className="text-[#002E6E]" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-extrabold tracking-tight text-white">
                Loan<span className="text-[#00BAF2]">IQ</span>
              </span>
              <span className="hidden sm:inline-block text-[10px] uppercase font-bold tracking-wider text-cyan-300 bg-white/10 px-1.5 py-0.5 rounded">
                Fintech
              </span>
            </div>
          </div>
        </div>

        {/* Center: Navigation Links (Desktop) */}
        {!isMobile && applicant && (
          <nav className="flex items-center gap-1">
            <button
              onClick={() => navigate('/')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                isCurrent('/') ? 'bg-white/15 text-white shadow-sm' : 'text-slate-200 hover:text-white hover:bg-white/10'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => navigate('/form')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                isCurrent('/form') ? 'bg-white/15 text-white shadow-sm' : 'text-slate-200 hover:text-white hover:bg-white/10'
              }`}
            >
              Discover Loans
            </button>
            <button
              onClick={() => navigate('/active')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                isCurrent('/active') ? 'bg-white/15 text-white shadow-sm' : 'text-slate-200 hover:text-white hover:bg-white/10'
              }`}
            >
              Loan Optimiser
            </button>
            <button
              onClick={() => navigate('/compare')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                isCurrent('/compare') ? 'bg-white/15 text-white shadow-sm' : 'text-slate-200 hover:text-white hover:bg-white/10'
              }`}
            >
              Compare
            </button>
            <button
              onClick={() => navigate('/emicalculator')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                isCurrent('/emicalculator') ? 'bg-white/15 text-white shadow-sm' : 'text-slate-200 hover:text-white hover:bg-white/10'
              }`}
            >
              EMI Calculator
            </button>
          </nav>
        )}

        {/* Right: User Profile Menu or Sign In */}
        <div className="flex items-center gap-2 sm:gap-3">
          {applicant ? (
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/15 border border-white/15 transition-all shadow-sm"
              >
                <div className="w-7 h-7 rounded-full bg-[#00BAF2] text-[#002E6E] flex items-center justify-center font-black text-xs">
                  {applicant.full_name ? applicant.full_name.charAt(0).toUpperCase() : <User size={14} />}
                </div>
                {!isMobile && (
                  <div className="text-left">
                    <p className="text-xs font-bold leading-tight text-white max-w-[130px] truncate">
                      {applicant.full_name}
                    </p>
                    <p className="text-[10px] text-cyan-200 font-mono leading-none mt-0.5">
                      {applicant.applicant_id}
                    </p>
                  </div>
                )}
                <ChevronDown
                  size={14}
                  className={`text-slate-300 transition-transform ${showProfileMenu ? 'rotate-180' : ''}`}
                />
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 text-slate-800 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-4 py-2.5 border-b border-slate-100">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Signed in as</p>
                    <p className="text-xs font-extrabold text-[#002E6E] truncate">{applicant.full_name}</p>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">PAN: {applicant.pan_number}</p>
                  </div>

                  <button
                    onClick={() => { setShowProfileMenu(false); navigate('/profile'); }}
                    className="w-full text-left px-4 py-2 text-xs hover:bg-slate-50 flex items-center gap-2.5 text-slate-700 font-medium transition-colors"
                  >
                    <User size={14} className="text-slate-400" />
                    <span>View Profile & Credentials</span>
                  </button>

                  <button
                    onClick={() => { setShowProfileMenu(false); navigate('/form'); }}
                    className="w-full text-left px-4 py-2 text-xs hover:bg-slate-50 flex items-center gap-2.5 text-slate-700 font-medium transition-colors"
                  >
                    <Sparkles size={14} className="text-[#00BAF2]" />
                    <span>Discover New Loans</span>
                  </button>

                  <div className="border-t border-slate-100 my-1"></div>

                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-xs hover:bg-red-50 text-red-600 flex items-center gap-2.5 font-semibold transition-colors"
                  >
                    <LogOut size={14} />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/login')}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white hover:bg-white/10 transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={() => navigate('/signup')}
                className="px-3.5 py-1.5 rounded-lg bg-[#00BAF2] hover:bg-cyan-300 text-[#002E6E] text-xs font-bold shadow-sm transition-colors"
              >
                Register
              </button>
            </div>
          )}
        </div>

      </div>
    </header>
  );
};

export default Navbar;
