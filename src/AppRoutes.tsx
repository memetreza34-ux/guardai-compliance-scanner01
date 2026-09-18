import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthProvider';
import { WorkspaceProvider } from './providers/WorkspaceProvider';
import { LandingPage } from './components/LandingPage';
import PublicContactPage from './components/PublicContactPage';
import { PublicTrustPageRoute } from './pages/public/PublicTrustPageRoute';
import BillingReturnPage from './components/BillingReturnPage';
import GitHubIntegrationCallbackPage from './components/GitHubIntegrationCallbackPage';
import { LoginPage } from './pages/public/LoginPage';

const AppShell = lazy(() => import('./pages/app/AppShell'));
const DashboardPage = lazy(() => import('./pages/app/DashboardPage'));
const TargetsPage = lazy(() => import('./pages/app/TargetsPage'));
const TargetDetailPage = lazy(() => import('./pages/app/TargetDetailPage'));
const NotYetAvailable = lazy(() => import('./components/NotYetAvailable'));

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, isLoading, error } = useAuth();
  
  if (isLoading) {
    return <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-400">Loading session...</div>;
  }
  
  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-400 p-4 text-center">
        <div>
          <h1 className="text-xl font-bold text-rose-500 mb-2">Configuration Error</h1>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }
  
  return <WorkspaceProvider>{children}</WorkspaceProvider>;
}

export function AppRoutes() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<div className="flex h-screen items-center justify-center bg-slate-950 text-slate-400">Loading...</div>}>
          <Routes>
            {/* PUBLIC */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/contact" element={<PublicContactPage />} />
            <Route path="/trust/:slug" element={<PublicTrustPageRoute />} />
            <Route path="/billing/return" element={<BillingReturnPage />} />
            <Route path="/integrations/github/callback" element={<GitHubIntegrationCallbackPage />} />
            <Route path="/login" element={<LoginPage />} />
            
            {/* AUTHENTICATED WORKSPACE */}
            <Route path="/app" element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
              <Route index element={<DashboardPage />} />
              <Route path="targets" element={<TargetsPage />} />
              <Route path="targets/:targetId" element={<TargetDetailPage />} />
              
              <Route path="scans" element={<NotYetAvailable title="Scans" />} />
              <Route path="scans/:scanId" element={<NotYetAvailable title="Scan Details" />} />
              <Route path="findings" element={<NotYetAvailable title="Findings" />} />
              <Route path="evidence" element={<NotYetAvailable title="Evidence" />} />
              <Route path="reports" element={<NotYetAvailable title="Reports" />} />
              <Route path="monitoring" element={<NotYetAvailable title="Monitoring" />} />
              <Route path="ai-governance" element={<NotYetAvailable title="AI Governance" />} />
              <Route path="integrations" element={<NotYetAvailable title="Integrations" />} />
              <Route path="audit" element={<NotYetAvailable title="Audit Log" />} />
              <Route path="team" element={<NotYetAvailable title="Team" />} />
              <Route path="billing" element={<NotYetAvailable title="Billing" />} />
              <Route path="settings" element={<NotYetAvailable title="Settings" />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}
