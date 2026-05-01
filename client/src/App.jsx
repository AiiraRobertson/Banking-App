import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import PublicRoute from './components/PublicRoute';
import DashboardLayout from './components/layout/DashboardLayout';
import AdminLayout from './components/layout/AdminLayout';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import AccountsPage from './pages/AccountsPage';
import AccountDetailPage from './pages/AccountDetailPage';
import TransferPage from './pages/TransferPage';
import WireTransferPage from './pages/WireTransferPage';
import TransactionHistoryPage from './pages/TransactionHistoryPage';
import BillPayPage from './pages/BillPayPage';
import LoanCalculatorPage from './pages/LoanCalculatorPage';
import ProfilePage from './pages/ProfilePage';
import NotificationsPage from './pages/NotificationsPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminUserDetailPage from './pages/admin/AdminUserDetailPage';
import AdminTransactionsPage from './pages/admin/AdminTransactionsPage';
import AdminAccountsPage from './pages/admin/AdminAccountsPage';
import TermsPage from './pages/resources/TermsPage';
import FAQPage from './pages/resources/FAQPage';
import MissionPage from './pages/resources/MissionPage';
import PolicyPage from './pages/resources/PolicyPage';
import InnovationPage from './pages/resources/InnovationPage';
import InvestmentPage from './pages/resources/InvestmentPage';
import CareerPage from './pages/resources/CareerPage';
import ContactPage from './pages/resources/ContactPage';
import ComplaintPage from './pages/resources/ComplaintPage';
import FeedbackPage from './pages/resources/FeedbackPage';
import ReviewsPage from './pages/resources/ReviewsPage';

function CatchAllRedirect() {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return null;
  return <Navigate to={isAuthenticated ? '/' : '/welcome'} replace />;
}

export default function App() {
  return (
    <ThemeProvider>
    <AuthProvider>
      <NotificationProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/welcome" element={<PublicRoute><LandingPage /></PublicRoute>} />
            <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
            <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
            <Route path="/loan-calculator" element={<LoanCalculatorPage />} />

            <Route path="/terms" element={<TermsPage />} />
            <Route path="/faq" element={<FAQPage />} />
            <Route path="/mission" element={<MissionPage />} />
            <Route path="/policy" element={<PolicyPage />} />
            <Route path="/innovation" element={<InnovationPage />} />
            <Route path="/investment" element={<InvestmentPage />} />
            <Route path="/careers" element={<CareerPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/complaint" element={<ComplaintPage />} />
            <Route path="/feedback" element={<FeedbackPage />} />
            <Route path="/reviews" element={<ReviewsPage />} />

            <Route path="/" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
              <Route index element={<DashboardPage />} />
              <Route path="accounts" element={<AccountsPage />} />
              <Route path="accounts/:id" element={<AccountDetailPage />} />
              <Route path="transfer" element={<TransferPage />} />
              <Route path="wire-transfer" element={<WireTransferPage />} />
              <Route path="transactions" element={<TransactionHistoryPage />} />
              <Route path="bill-pay" element={<BillPayPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="notifications" element={<NotificationsPage />} />
            </Route>

            <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
              <Route index element={<AdminDashboardPage />} />
              <Route path="users" element={<AdminUsersPage />} />
              <Route path="users/:id" element={<AdminUserDetailPage />} />
              <Route path="transactions" element={<AdminTransactionsPage />} />
              <Route path="accounts" element={<AdminAccountsPage />} />
            </Route>

            <Route path="*" element={<CatchAllRedirect />} />
          </Routes>
        </BrowserRouter>
      </NotificationProvider>
    </AuthProvider>
    </ThemeProvider>
  );
}
