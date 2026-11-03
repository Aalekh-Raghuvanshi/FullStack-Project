import { Navigate, Route, Routes } from 'react-router';
import AppShell from './components/layout/AppShell.jsx';
import LoginPage from './pages/LoginPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import PatientsPage from './pages/PatientsPage.jsx';
import DoctorsPage from './pages/DoctorsPage.jsx';
import AppointmentsPage from './pages/AppointmentsPage.jsx';
import AdmissionsPage from './pages/AdmissionsPage.jsx';
import LaboratoryPage from './pages/LaboratoryPage.jsx';
import BillingPage from './pages/BillingPage.jsx';
import AnalyticsPage from './pages/AnalyticsPage.jsx';
import PatientIntelligencePage from './pages/PatientIntelligencePage.jsx';
import WebhookManagementPage from './pages/WebhookManagementPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import ProtectedRoute from './components/auth/ProtectedRoute.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/patients" element={<PatientsPage />} />
          <Route path="/doctors" element={<DoctorsPage />} />
          <Route path="/appointments" element={<AppointmentsPage />} />
          <Route path="/admissions" element={<AdmissionsPage />} />
          <Route path="/laboratory" element={<LaboratoryPage />} />
          <Route path="/billing" element={<BillingPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/patient-intelligence" element={<PatientIntelligencePage />} />
          <Route path="/webhooks" element={<WebhookManagementPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
