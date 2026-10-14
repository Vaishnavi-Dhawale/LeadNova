import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { AppLayout } from './components/layout/AppLayout';

// Pages
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { CustomersPage } from './pages/CustomersPage';
import { CustomerDetailPage } from './pages/CustomerDetailPage';
import { EnquiriesPage } from './pages/EnquiriesPage';
import { EnquiryDetailPage } from './pages/EnquiryDetailPage';
import { FollowUpsPage } from './pages/FollowUpsPage';
import { EmailLeadsPage } from './pages/EmailLeadsPage';
import { EmailLeadDetailPage } from './pages/EmailLeadDetailPage';
import { EmailsPage } from './pages/EmailsPage';
import { CampaignsPage } from './pages/CampaignsPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { TerritoriesPage } from './pages/TerritoriesPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { UsersPage } from './pages/UsersPage';
import ActivityLogsPage from './pages/ActivityLogsPage';

// Protected Route Guard
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-sm font-medium text-slate-600">Initializing LeadNova...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Admin Only Route Guard
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAdmin, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected Routes nested in AppLayout */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        
        {/* Customers */}
        <Route path="customers" element={<CustomersPage />} />
        <Route path="customers/:id" element={<CustomerDetailPage />} />

        {/* Enquiries & Pipeline */}
        <Route path="enquiries" element={<EnquiriesPage />} />
        <Route path="enquiries/:id" element={<EnquiryDetailPage />} />

        {/* Follow Ups */}
        <Route path="follow-ups" element={<FollowUpsPage />} />

        {/* Inbound Email Leads */}
        <Route path="email-leads" element={<EmailLeadsPage />} />
        <Route path="email-leads/:id" element={<EmailLeadDetailPage />} />

        {/* Outbound Email Communications */}
        <Route path="emails" element={<EmailsPage />} />

        {/* Campaigns */}
        <Route path="campaigns" element={<CampaignsPage />} />

        {/* Master Data */}
        <Route path="categories" element={<CategoriesPage />} />
        <Route path="territories" element={<TerritoriesPage />} />

        {/* Documents */}
        <Route path="documents" element={<DocumentsPage />} />

        {/* Analytics & Reporting */}
        <Route path="analytics" element={<AnalyticsPage />} />

        {/* Administration Routes */}
        <Route
          path="users"
          element={
            <AdminRoute>
              <UsersPage />
            </AdminRoute>
          }
        />
        <Route
          path="activity-logs"
          element={
            <AdminRoute>
              <ActivityLogsPage />
            </AdminRoute>
          }
        />
      </Route>

      {/* Catch-all fallback */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export default App;
