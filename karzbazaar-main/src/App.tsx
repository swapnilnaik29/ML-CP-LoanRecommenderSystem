import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

// Page Imports
import Home from './pages/Home';
import LoanForm from './pages/LoanForm';
import Recommendations from './pages/Recommendations';
import LoanDetails from './pages/LoanDetails';
import ActiveLoan from './pages/ActiveLoan';
import Compare from './pages/Compare';
import Profile from './pages/Profile';
import EMICalculator from './pages/EMICalculator';
import Login from './pages/Login';
import Signup from './pages/Signup';
import { getStoredApplicant } from './api';

/**
 * ProtectedRoute Component
 * Redirects to /login if the applicant is not authenticated
 */
const ProtectedRoute = ({ isAuth, children }: { isAuth: boolean; children: React.ReactNode }) => {
  if (!isAuth) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return getStoredApplicant() !== null;
  });

  useEffect(() => {
    const handleStorage = () => {
      setIsAuthenticated(getStoredApplicant() !== null);
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  return (
    <Router>
      <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased">
        <Routes>
          {/* Public / Landing */}
          <Route path="/" element={<Home isAuth={isAuthenticated} />} />
          <Route path="/login" element={<Login onLogin={() => setIsAuthenticated(true)} />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/emicalculator" element={<EMICalculator />} />

          {/* Protected Routes */}
          <Route 
            path="/form" 
            element={
              <ProtectedRoute isAuth={isAuthenticated}>
                <LoanForm />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/recommendations" 
            element={
              <ProtectedRoute isAuth={isAuthenticated}>
                <Recommendations />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/compare" 
            element={
              <ProtectedRoute isAuth={isAuthenticated}>
                <Compare />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/active" 
            element={
              <ProtectedRoute isAuth={isAuthenticated}>
                <ActiveLoan />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/profile" 
            element={
              <ProtectedRoute isAuth={isAuthenticated}>
                <Profile />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/info" 
            element={
              <ProtectedRoute isAuth={isAuthenticated}>
                <LoanDetails />
              </ProtectedRoute>
            } 
          />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
