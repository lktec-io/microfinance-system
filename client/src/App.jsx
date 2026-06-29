import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider }  from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import ProtectedRoute    from './components/ProtectedRoute';
import Layout            from './layouts/Layout';

import Login      from './pages/Login';
import Dashboard  from './pages/Dashboard';
import Customers  from './pages/Customers';
import Loans      from './pages/Loans';
import LoanDetail from './pages/LoanDetail';
import Repayments from './pages/Repayments';
import Reports    from './pages/Reports';
import Users      from './pages/Users';

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
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login"      element={<Login />} />
              <Route path="/"           element={<Protected><Dashboard /></Protected>} />
              <Route path="/customers"  element={<Protected><Customers /></Protected>} />
              <Route path="/loans"      element={<Protected><Loans /></Protected>} />
              <Route path="/loans/:id"  element={<Protected><LoanDetail /></Protected>} />
              <Route path="/repayments" element={<Protected><Repayments /></Protected>} />
              <Route path="/reports"    element={<Protected><Reports /></Protected>} />
              <Route path="/users"      element={<Protected adminOnly><Users /></Protected>} />
              <Route path="*"           element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
