import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { ThemeProvider }        from './context/ThemeContext';
import { AuthProvider }         from './context/AuthContext';
import { ProfileProvider }      from './context/ProfileContext';
import { ToastProvider }        from './context/ToastContext';
import { NotificationProvider } from './context/NotificationContext';
import ProtectedRoute           from './components/ProtectedRoute';
import Layout                   from './layouts/Layout';
import CustomCursor             from './components/common/CustomCursor';

import Login          from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword  from './pages/ResetPassword';

const Dashboard  = lazy(() => import('./pages/Dashboard'));
const Customers  = lazy(() => import('./pages/Customers'));
const Loans      = lazy(() => import('./pages/Loans'));
const LoanDetail = lazy(() => import('./pages/LoanDetail'));
const Repayments = lazy(() => import('./pages/Repayments'));
const Expenses   = lazy(() => import('./pages/Expenses'));
const Reports    = lazy(() => import('./pages/Reports'));
const Users      = lazy(() => import('./pages/Users'));

function Protected({ children, adminOnly = false }) {
  return (
    <ProtectedRoute adminOnly={adminOnly}>
      <Layout>{children}</Layout>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ProfileProvider>
          <ToastProvider>
            <NotificationProvider>
              <CustomCursor />
              <BrowserRouter>
                <Suspense fallback={<div className="page-loading-spinner" aria-label="Loading…" />}>
                  <Routes>
                    <Route path="/login"                 element={<Login />} />
                    <Route path="/forgot-password"       element={<ForgotPassword />} />
                    <Route path="/reset-password/:token" element={<ResetPassword />} />
                    <Route path="/"           element={<Protected><Dashboard /></Protected>} />
                    <Route path="/customers"  element={<Protected><Customers /></Protected>} />
                    <Route path="/loans"      element={<Protected><Loans /></Protected>} />
                    <Route path="/loans/:id"  element={<Protected><LoanDetail /></Protected>} />
                    <Route path="/repayments" element={<Protected><Repayments /></Protected>} />
                    <Route path="/expenses"   element={<Protected><Expenses /></Protected>} />
                    <Route path="/reports"    element={<Protected><Reports /></Protected>} />
                    <Route path="/users"      element={<Protected adminOnly><Users /></Protected>} />
                    <Route path="*"           element={<Navigate to="/" replace />} />
                  </Routes>
                </Suspense>
              </BrowserRouter>
            </NotificationProvider>
          </ToastProvider>
        </ProfileProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
