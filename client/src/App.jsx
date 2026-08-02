import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { lazy } from 'react';
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
    <ThemeProvider>
      <AuthProvider>
        <ProfileProvider>
          <ToastProvider>
            <NotificationProvider>
              <CustomCursor />
              <BrowserRouter>
                <Routes>
                  {/* Public pages */}
                  <Route path="/login"                 element={<Login />} />
                  <Route path="/forgot-password"       element={<ForgotPassword />} />
                  <Route path="/reset-password/:token" element={<ResetPassword />} />

                  {/* All protected pages share ONE Layout — sidebar never remounts */}
                  <Route element={<ProtectedLayout />}>
                    <Route path="/"           element={<Dashboard />} />
                    <Route path="/customers"  element={<Customers />} />
                    <Route path="/loans"      element={<Loans />} />
                    <Route path="/loans/:id"  element={<LoanDetail />} />
                    <Route path="/repayments" element={<Repayments />} />
                    <Route path="/expenses"   element={<Expenses />} />
                    <Route path="/reports"    element={<Reports />} />
                    <Route path="/users"      element={
                      <ProtectedRoute adminOnly><Users /></ProtectedRoute>
                    } />
                    <Route path="*"           element={<Navigate to="/" replace />} />
                  </Route>
                </Routes>
              </BrowserRouter>
            </NotificationProvider>
          </ToastProvider>
        </ProfileProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
