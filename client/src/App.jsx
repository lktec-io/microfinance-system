import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { lazy } from 'react';
import { AuthProvider }         from './context/AuthContext';
import { ProfileProvider }      from './context/ProfileContext';
import { ToastProvider }        from './context/ToastContext';
import { NotificationProvider } from './context/NotificationContext';
import ProtectedRoute           from './components/ProtectedRoute';
import ErrorBoundary            from './components/common/ErrorBoundary';
import Layout                   from './layouts/Layout';

import Login          from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword  from './pages/ResetPassword';

const Dashboard      = lazy(() => import('./pages/Dashboard'));
const DailySummary   = lazy(() => import('./pages/DailySummary'));
const Customers      = lazy(() => import('./pages/Customers'));
const Loans          = lazy(() => import('./pages/Loans'));
const LoanDetail     = lazy(() => import('./pages/LoanDetail'));
const Repayments     = lazy(() => import('./pages/Repayments'));
const Expenses       = lazy(() => import('./pages/Expenses'));
const Reports        = lazy(() => import('./pages/Reports'));
const Users          = lazy(() => import('./pages/Users'));
const SystemSettings = lazy(() => import('./pages/SystemSettings'));

/* Layout mounts ONCE — sidebar & header never remount during navigation */
function ProtectedLayout() {
  return (
    <ProtectedRoute>
      <Layout>
        <Outlet />
      </Layout>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ProfileProvider>
        <ToastProvider>
          <NotificationProvider>
            <BrowserRouter>
              <ErrorBoundary fullScreen>
                <Routes>
                  {/* Public pages */}
                  <Route path="/login"                 element={<Login />} />
                  <Route path="/forgot-password"       element={<ForgotPassword />} />
                  <Route path="/reset-password/:token" element={<ResetPassword />} />

                  {/* All protected pages share ONE Layout */}
                  <Route element={<ProtectedLayout />}>
                    <Route path="/"           element={<Dashboard />} />
                    {/* Daily sheet — every role; money inside it follows the RBAC mask */}
                    <Route path="/daily-summary" element={<DailySummary />} />
                    <Route path="/customers"  element={<Customers />} />
                    <Route path="/loans"      element={<Loans />} />
                    <Route path="/loans/:id"  element={<LoanDetail />} />
                    <Route path="/repayments" element={<Repayments />} />
                    <Route path="/expenses"   element={<Expenses />} />
                    {/* Report Module — admin only (API also returns 403 for staff) */}
                    <Route path="/reports"    element={
                      <ProtectedRoute adminOnly><Reports /></ProtectedRoute>
                    } />
                    <Route path="/admin/reports" element={
                      <ProtectedRoute adminOnly><Navigate to="/reports" replace /></ProtectedRoute>
                    } />
                    <Route path="/users"      element={
                      <ProtectedRoute adminOnly><Users /></ProtectedRoute>
                    } />
                    <Route path="/settings"   element={
                      <ProtectedRoute adminOnly><SystemSettings /></ProtectedRoute>
                    } />
                    <Route path="*"           element={<Navigate to="/" replace />} />
                  </Route>
                </Routes>
              </ErrorBoundary>
            </BrowserRouter>
          </NotificationProvider>
        </ToastProvider>
      </ProfileProvider>
    </AuthProvider>
  );
}
