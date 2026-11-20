import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Car, Home as HomeIcon, GraduationCap, UserCheck, 
  ArrowRight, ShieldCheck, Sparkles, AlertCircle, Info, Landmark, Check
} from 'lucide-react';
import Navbar from '../components/Navbar';
import { api, getStoredApplicant, Applicant } from '../api';

type LoanCategory = 'car' | 'home' | 'education' | 'personal';

const LoanForm: React.FC = () => {
  const navigate = useNavigate();
  const [applicant, setApplicant] = useState<Applicant | null>(null);
  const [activeCategory, setActiveCategory] = useState<LoanCategory>('home');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Common request parameters
  const [requestedAmount, setRequestedAmount] = useState(2500000);
  const [desiredTenure, setDesiredTenure] = useState(180);

  // Category-specific states
  // 1. Car
  const [carData, setCarData] = useState({
    vehicle_price: 650000,
    vehicle_type: 'sedan',
    vehicle_condition: 'new',
    vehicle_age_years: 0,
    fuel_type: 'petrol'
  });

  // 2. Home
  const [homeData, setHomeData] = useState({
    property_value: 3500000,
    property_type: 'apartment',
    property_location: 'urban',
    property_status: 'ready_to_move',
    property_age_years: 2,
    co_applicant: 1,
    co_applicant_monthly_income: 35000
  });

  // 3. Education
  const [eduData, setEduData] = useState({
    course_level: 'postgraduate',
    course_field: 'engineering',
    institution_type: 'private',
    institution_tier: 'tier_1',
    study_location: 'India',
    course_duration_years: 2,
    total_course_cost: 800000,
    scholarship_amount: 50000,
    co_applicant: 1,
    co_applicant_monthly_income: 30000
  });

  // 4. Personal
  const [personalData, setPersonalData] = useState({
    loan_purpose: 'home_renovation',
    marital_status: 'married'
  });

  useEffect(() => {
    const cur = getStoredApplicant();
    if (!cur) {
      navigate('/login');
      return;
    }
    setApplicant(cur);

    // Set category initial defaults
    if (activeCategory === 'car') {
      setRequestedAmount(500000);
      setDesiredTenure(48);
    } else if (activeCategory === 'home') {
      setRequestedAmount(2500000);
      setDesiredTenure(180);
    } else if (activeCategory === 'education') {
      setRequestedAmount(600000);
      setDesiredTenure(60);
    } else if (activeCategory === 'personal') {
      setRequestedAmount(250000);
      setDesiredTenure(24);
    }
  }, [activeCategory, navigate]);

  // Quick preset chips
  const amountPresets: Record<LoanCategory, number[]> = {
    car: [300000, 500000, 800000, 1200000, 2000000],
    home: [1500000, 2500000, 4000000, 6000000, 10000000],
    education: [300000, 500000, 800000, 1500000, 2500000],
    personal: [100000, 250000, 500000, 750000, 1000000]
  };

  const tenurePresets: Record<LoanCategory, { label: string; months: number }[]> = {
    car: [
      { label: '3 Yrs', months: 36 },
      { label: '4 Yrs', months: 48 },
      { label: '5 Yrs', months: 60 },
      { label: '7 Yrs', months: 84 }
    ],
    home: [
      { label: '5 Yrs', months: 60 },
      { label: '10 Yrs', months: 120 },
      { label: '15 Yrs', months: 180 },
      { label: '20 Yrs', months: 240 },
      { label: '25 Yrs', months: 300 }
    ],
    education: [
      { label: '3 Yrs', months: 36 },
      { label: '5 Yrs', months: 60 },
      { label: '7 Yrs', months: 84 },
      { label: '10 Yrs', months: 120 }
    ],
    personal: [
      { label: '1 Yr', months: 12 },
      { label: '2 Yrs', months: 24 },
      { label: '3 Yrs', months: 36 },
      { label: '5 Yrs', months: 60 }
    ]
  };

  // Approximate indicative monthly EMI benchmark (8.5% p.a. indicative)
  const indicativeRate = activeCategory === 'home' ? 0.085 : activeCategory === 'car' ? 0.090 : activeCategory === 'education' ? 0.095 : 0.125;
  const monthlyRate = indicativeRate / 12;
  const indicativeEmi = desiredTenure > 0 && requestedAmount > 0
    ? (requestedAmount * monthlyRate * Math.pow(1 + monthlyRate, desiredTenure)) / (Math.pow(1 + monthlyRate, desiredTenure) - 1)
    : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applicant) return;

    setError('');
    setLoading(true);

    let categoryDetails: any = {};
    if (activeCategory === 'car') {
      categoryDetails = { 
        ...carData, 
        vehicle_price: Number(carData.vehicle_price), 
        vehicle_age_years: Number(carData.vehicle_age_years) 
      };
    } else if (activeCategory === 'home') {
      categoryDetails = { 
        ...homeData, 
        property_value: Number(homeData.property_value), 
        property_age_years: Number(homeData.property_age_years),
        co_applicant: Number(homeData.co_applicant),
        co_applicant_monthly_income: homeData.co_applicant === 1 ? Number(homeData.co_applicant_monthly_income) : 0
      };
    } else if (activeCategory === 'education') {
      categoryDetails = { 
        ...eduData, 
        course_duration_years: Number(eduData.course_duration_years),
        total_course_cost: Number(eduData.total_course_cost),
        scholarship_amount: Number(eduData.scholarship_amount),
        co_applicant: Number(eduData.co_applicant),
        co_applicant_monthly_income: eduData.co_applicant === 1 ? Number(eduData.co_applicant_monthly_income) : 0
      };
    } else if (activeCategory === 'personal') {
      categoryDetails = { 
        ...personalData 
      };
    }

    try {
      const payload = {
        applicant_id: applicant.applicant_id,
        loan_type: activeCategory,
        requested_amount: Number(requestedAmount),
        desired_tenure_months: Number(desiredTenure),
        category_details: categoryDetails
      };

      const res = await api.discoverLoans(payload);
      if (res.success && res.data) {
        navigate('/recommendations', { state: { discoveryData: res.data } });
      } else {
        setError(res.error || 'Failed to generate recommendations.');
      }
    } catch (err: any) {
      setError('Connection error while contacting LoanIQ inference engine.');
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    { id: 'car', label: 'Car Loan', icon: <Car size={18} />, hint: 'Rates from 8.8%' },
    { id: 'home', label: 'Home Loan', icon: <HomeIcon size={18} />, hint: 'Rates from 8.4%' },
    { id: 'education', label: 'Education Loan', icon: <GraduationCap size={18} />, hint: 'Rates from 9.2%' },
    { id: 'personal', label: 'Personal Loan', icon: <UserCheck size={18} />, hint: 'Rates from 11.5%' }
  ];

  return (
    <div className="min-h-screen w-full bg-slate-50 font-sans flex flex-col pb-16">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Header Breadcrumb & Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
              <span>LoanIQ Discovery</span>
              <span>/</span>
              <span className="text-[#002E6E] font-bold uppercase">{activeCategory} Loan</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#002E6E] tracking-tight">
              Discover & Compare Loans
            </h1>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-50 border border-cyan-200 text-[#002E6E] text-xs font-semibold self-start sm:self-auto">
            <Sparkles size={13} className="text-[#00BAF2]" />
            <span>AI Calibrated Approval Engine</span>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {categories.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id as LoanCategory)}
                className={`p-3.5 rounded-xl flex items-center gap-3 text-left transition-all border ${
                  isActive
                    ? 'bg-[#002E6E] text-white border-[#002E6E] shadow-sm'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                  isActive ? 'bg-[#00BAF2] text-[#002E6E]' : 'bg-slate-100 text-slate-500'
                }`}>
                  {cat.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-bold truncate leading-tight">{cat.label}</p>
                  <p className={`text-[10px] font-medium leading-tight mt-0.5 ${isActive ? 'text-cyan-200' : 'text-slate-400'}`}>
                    {cat.hint}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2.5">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Two-Column Structured Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Main Form: 8 Columns */}
          <div className="lg:col-span-8 space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Section 1: Principal & Tenure */}
              <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-200 space-y-5">
                <div className="border-b border-slate-100 pb-3">
                  <h2 className="text-sm font-bold text-[#002E6E] uppercase tracking-wider">
                    1. Loan Amount & Desired Tenure
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Specified principal and repayment schedule evaluated against bank product boundaries.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* Amount Field */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                        Loan Amount (₹) *
                      </label>
                      <span className="text-sm font-extrabold text-[#002E6E]">
                        ₹{Number(requestedAmount).toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                      <input
                        type="number"
                        value={requestedAmount}
                        onChange={(e) => setRequestedAmount(Number(e.target.value))}
                        min={0}
                        step="any"
                        required
                        className="w-full pl-8 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00BAF2] focus:border-transparent transition-all"
                      />
                    </div>

                    {/* Quick Preset Amount Chips */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {amountPresets[activeCategory].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setRequestedAmount(amt)}
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                            requestedAmount === amt
                              ? 'bg-[#002E6E] text-white'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          ₹{(amt / 100000).toFixed(amt % 100000 === 0 ? 0 : 1)}L
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tenure Field */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                        Desired Tenure (Months) *
                      </label>
                      <span className="text-sm font-extrabold text-[#002E6E]">
                        {desiredTenure} Mo ({Math.round(desiredTenure / 12 * 10) / 10} Yrs)
                      </span>
                    </div>

                    <input
                      type="number"
                      value={desiredTenure}
                      onChange={(e) => setDesiredTenure(Number(e.target.value))}
                      min={1}
                      max={360}
                      step={1}
                      required
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00BAF2] focus:border-transparent transition-all"
                    />

                    {/* Quick Preset Tenure Chips */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {tenurePresets[activeCategory].map((preset) => (
                        <button
                          key={preset.months}
                          type="button"
                          onClick={() => setDesiredTenure(preset.months)}
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                            desiredTenure === preset.months
                              ? 'bg-[#002E6E] text-white'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: Category Specific Fields */}
              <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-200 space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h2 className="text-sm font-bold text-[#002E6E] uppercase tracking-wider">
                    2. {categories.find(c => c.id === activeCategory)?.label} Specific Attributes
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Feature inputs passed directly to the trained category machine learning pipeline.
                  </p>
                </div>

                {/* 2.1 CAR LOAN FIELDS */}
                {activeCategory === 'car' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Vehicle On-Road Price (₹) *</label>
                      <input
                        type="number"
                        value={carData.vehicle_price}
                        onChange={(e) => setCarData({ ...carData, vehicle_price: Number(e.target.value) })}
                        min={0}
                        step="any"
                        required
                        className="w-full px-3 py-2 bg-slate-50 rounded-xl text-xs sm:text-sm font-medium border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00BAF2]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Vehicle Body Type *</label>
                      <select
                        value={carData.vehicle_type}
                        onChange={(e) => setCarData({ ...carData, vehicle_type: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 rounded-xl text-xs sm:text-sm font-medium border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00BAF2]"
                      >
                        <option value="sedan">Sedan</option>
                        <option value="SUV">SUV</option>
                        <option value="hatchback">Hatchback</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Vehicle Condition *</label>
                      <select
                        value={carData.vehicle_condition}
                        onChange={(e) => setCarData({ ...carData, vehicle_condition: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 rounded-xl text-xs sm:text-sm font-medium border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00BAF2]"
                      >
                        <option value="new">Brand New</option>
                        <option value="used">Pre-Owned / Used</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Vehicle Age (Years)</label>
                      <input
                        type="number"
                        value={carData.vehicle_age_years}
                        onChange={(e) => setCarData({ ...carData, vehicle_age_years: Number(e.target.value) })}
                        min={0}
                        max={25}
                        step={1}
                        className="w-full px-3 py-2 bg-slate-50 rounded-xl text-xs sm:text-sm font-medium border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00BAF2]"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Fuel Type *</label>
                      <select
                        value={carData.fuel_type}
                        onChange={(e) => setCarData({ ...carData, fuel_type: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 rounded-xl text-xs sm:text-sm font-medium border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00BAF2]"
                      >
                        <option value="petrol">Petrol</option>
                        <option value="diesel">Diesel</option>
                        <option value="CNG">CNG</option>
                        <option value="electric">Electric (EV)</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* 2.2 HOME LOAN FIELDS */}
                {activeCategory === 'home' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Estimated Property Value (₹) *</label>
                      <input
                        type="number"
                        value={homeData.property_value}
                        onChange={(e) => setHomeData({ ...homeData, property_value: Number(e.target.value) })}
                        min={0}
                        step="any"
                        required
                        className="w-full px-3 py-2 bg-slate-50 rounded-xl text-xs sm:text-sm font-medium border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00BAF2]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Property Type *</label>
                      <select
                        value={homeData.property_type}
                        onChange={(e) => setHomeData({ ...homeData, property_type: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 rounded-xl text-xs sm:text-sm font-medium border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00BAF2]"
                      >
                        <option value="apartment">Apartment / Flat</option>
                        <option value="independent_house">Independent House / Villa</option>
                        <option value="plot">Residential Plot</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Property Location *</label>
                      <select
                        value={homeData.property_location}
                        onChange={(e) => setHomeData({ ...homeData, property_location: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 rounded-xl text-xs sm:text-sm font-medium border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00BAF2]"
                      >
                        <option value="urban">Urban / Metro</option>
                        <option value="semi_urban">Semi-Urban</option>
                        <option value="rural">Rural</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Construction Status *</label>
                      <select
                        value={homeData.property_status}
                        onChange={(e) => setHomeData({ ...homeData, property_status: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 rounded-xl text-xs sm:text-sm font-medium border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00BAF2]"
                      >
                        <option value="ready_to_move">Ready to Move</option>
                        <option value="under_construction">Under Construction</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Property Age (Years)</label>
                      <input
                        type="number"
                        value={homeData.property_age_years}
                        onChange={(e) => setHomeData({ ...homeData, property_age_years: Number(e.target.value) })}
                        min={0}
                        max={60}
                        step={1}
                        className="w-full px-3 py-2 bg-slate-50 rounded-xl text-xs sm:text-sm font-medium border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00BAF2]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Co-Applicant Present?</label>
                      <select
                        value={homeData.co_applicant}
                        onChange={(e) => setHomeData({ ...homeData, co_applicant: Number(e.target.value) })}
                        className="w-full px-3 py-2 bg-slate-50 rounded-xl text-xs sm:text-sm font-medium border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00BAF2]"
                      >
                        <option value={1}>Yes (Includes joint income)</option>
                        <option value={0}>No (Single applicant)</option>
                      </select>
                    </div>

                    {homeData.co_applicant === 1 && (
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Co-Applicant Monthly Income (₹)</label>
                        <input
                          type="number"
                          value={homeData.co_applicant_monthly_income}
                          onChange={(e) => setHomeData({ ...homeData, co_applicant_monthly_income: Number(e.target.value) })}
                          min={0}
                          step="any"
                          className="w-full px-3 py-2 bg-slate-50 rounded-xl text-xs sm:text-sm font-medium border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00BAF2]"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* 2.3 EDUCATION LOAN FIELDS */}
                {activeCategory === 'education' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Course Level *</label>
                      <select
                        value={eduData.course_level}
                        onChange={(e) => setEduData({ ...eduData, course_level: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 rounded-xl text-xs sm:text-sm font-medium border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00BAF2]"
                      >
                        <option value="undergraduate">Undergraduate (Bachelors)</option>
                        <option value="postgraduate">Postgraduate (Masters)</option>
                        <option value="doctorate">Doctorate (PhD)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Academic Field *</label>
                      <select
                        value={eduData.course_field}
                        onChange={(e) => setEduData({ ...eduData, course_field: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 rounded-xl text-xs sm:text-sm font-medium border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00BAF2]"
                      >
                        <option value="engineering">Engineering / Tech</option>
                        <option value="medicine">Medicine / Healthcare</option>
                        <option value="management">Management / MBA</option>
                        <option value="science">Sciences</option>
                        <option value="arts">Arts & Humanities</option>
                        <option value="law">Law</option>
                        <option value="other">Other Fields</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Study Location *</label>
                      <select
                        value={eduData.study_location}
                        onChange={(e) => setEduData({ ...eduData, study_location: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 rounded-xl text-xs sm:text-sm font-medium border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00BAF2]"
                      >
                        <option value="India">Domestic (India)</option>
                        <option value="abroad">International (Abroad)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Institution Tier *</label>
                      <select
                        value={eduData.institution_tier}
                        onChange={(e) => setEduData({ ...eduData, institution_tier: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 rounded-xl text-xs sm:text-sm font-medium border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00BAF2]"
                      >
                        <option value="tier_1">Tier 1 (IIT/IIM/Ivy League)</option>
                        <option value="tier_2">Tier 2 (Govt Recognized)</option>
                        <option value="tier_3">Tier 3 (Other Accredited)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Total Course Cost (₹) *</label>
                      <input
                        type="number"
                        value={eduData.total_course_cost}
                        onChange={(e) => setEduData({ ...eduData, total_course_cost: Number(e.target.value) })}
                        min={0}
                        step="any"
                        required
                        className="w-full px-3 py-2 bg-slate-50 rounded-xl text-xs sm:text-sm font-medium border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00BAF2]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Scholarship Amount (₹)</label>
                      <input
                        type="number"
                        value={eduData.scholarship_amount}
                        onChange={(e) => setEduData({ ...eduData, scholarship_amount: Number(e.target.value) })}
                        min={0}
                        step="any"
                        className="w-full px-3 py-2 bg-slate-50 rounded-xl text-xs sm:text-sm font-medium border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00BAF2]"
                      />
                    </div>
                  </div>
                )}

                {/* 2.4 PERSONAL LOAN FIELDS */}
                {activeCategory === 'personal' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Loan Objective / Purpose *</label>
                      <select
                        value={personalData.loan_purpose}
                        onChange={(e) => setPersonalData({ ...personalData, loan_purpose: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 rounded-xl text-xs sm:text-sm font-medium border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00BAF2]"
                      >
                        <option value="home_renovation">Home Renovation</option>
                        <option value="debt_consolidation">Debt Consolidation</option>
                        <option value="medical">Medical Treatment</option>
                        <option value="wedding">Wedding / Family Function</option>
                        <option value="travel">Travel & Holiday</option>
                        <option value="other">Other Personal</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Marital Status *</label>
                      <select
                        value={personalData.marital_status}
                        onChange={(e) => setPersonalData({ ...personalData, marital_status: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 rounded-xl text-xs sm:text-sm font-medium border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00BAF2]"
                      >
                        <option value="married">Married</option>
                        <option value="single">Single / Unmarried</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Section 3: Prefilled Profile Credentials */}
              {applicant && (
                <div className="bg-slate-100/70 rounded-2xl p-4 sm:p-5 border border-slate-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <ShieldCheck size={16} className="text-[#002E6E]" />
                      <span className="text-xs font-bold text-[#002E6E] uppercase tracking-wider">
                        Applicant Credentials (From SQLite)
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-500">ID: {applicant.applicant_id}</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Credit Score</span>
                      <span className="text-sm font-black text-[#002E6E]">{applicant.credit_score}</span>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Monthly Income</span>
                      <span className="text-sm font-black text-emerald-700">₹{Math.round(applicant.monthly_income_inr).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Employment</span>
                      <span className="text-sm font-black text-slate-800 capitalize truncate block">
                        {applicant.employment_type.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Existing EMI</span>
                      <span className="text-sm font-black text-slate-800">₹{Math.round(applicant.existing_emi_inr).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-600 text-xs sm:text-sm font-bold hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-3 rounded-xl bg-[#002E6E] hover:bg-[#001D47] text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-sm transition-all active:scale-[0.99] disabled:opacity-50"
                >
                  {loading ? (
                    <span>Evaluating ML Models...</span>
                  ) : (
                    <>
                      <span>Evaluate Eligibility & Rank Offers</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>

          {/* Right Sidebar: Sticky Live Financial Summary (4 Columns) */}
          <div className="lg:col-span-4 space-y-4 lg:sticky lg:top-20">
            
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-xs font-bold text-[#002E6E] uppercase tracking-wider">
                  Live Financing Summary
                </h3>
                <span className="text-[10px] font-bold text-[#00BAF2] bg-cyan-50 px-2 py-0.5 rounded-full capitalize">
                  {activeCategory}
                </span>
              </div>

              {/* Indicative Calculations */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Requested Principal:</span>
                  <span className="font-extrabold text-slate-900">
                    ₹{Number(requestedAmount).toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Tenure Horizon:</span>
                  <span className="font-extrabold text-slate-900">
                    {desiredTenure} Months ({Math.round(desiredTenure / 12 * 10) / 10} Yrs)
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Indicative Benchmark Rate:</span>
                  <span className="font-extrabold text-[#002E6E]">
                    {(indicativeRate * 100).toFixed(1)}% p.a.
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-100 text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    Estimated Monthly EMI
                  </span>
                  <span className="text-xl font-black text-[#002E6E] block mt-0.5">
                    ₹{Math.round(indicativeEmi).toLocaleString('en-IN')}
                  </span>
                  <span className="text-[10px] text-slate-400">Actual EMI depends on lender approval</span>
                </div>
              </div>

              {/* Deterministic Hard Eligibility Gates */}
              <div className="border-t border-slate-100 pt-3 space-y-2">
                <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                  5 Deterministic Hard Gates
                </p>

                <div className="space-y-1.5 text-[11px]">
                  <div className="flex items-center gap-1.5 text-emerald-700">
                    <Check size={13} className="shrink-0" />
                    <span>Credit Score Gate (Min 650)</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-700">
                    <Check size={13} className="shrink-0" />
                    <span>Age Gate (18-65 Yrs)</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-700">
                    <Check size={13} className="shrink-0" />
                    <span>Debt-to-Income / FOIR Threshold</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-700">
                    <Check size={13} className="shrink-0" />
                    <span>Minimum Monthly Income Gate</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-700">
                    <Check size={13} className="shrink-0" />
                    <span>Category Product Bounds Gate</span>
                  </div>
                </div>
              </div>

              {/* Architecture & ML Footer Note */}
              <div className="p-2.5 rounded-lg bg-slate-50 text-[10px] text-slate-500 leading-relaxed border border-slate-100">
                <span className="font-bold text-slate-700 block">ML Pipeline Evaluation:</span>
                Uses calibrated scikit-learn models to predict lender approval probability after all 5 deterministic gates pass.
              </div>
            </div>

          </div>

        </div>

      </main>
    </div>
  );
};

export default LoanForm;
