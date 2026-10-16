import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthProvider';
import { WorkspaceProvider } from './providers/WorkspaceProvider';
import PublicContactPage from './components/PublicContactPage';
import { PublicTrustPageRoute } from './pages/public/PublicTrustPageRoute';
import BillingReturnPage from './components/BillingReturnPage';
import GitHubIntegrationCallbackPage from './components/GitHubIntegrationCallbackPage';
import { LoginPage } from './pages/public/LoginPage';

const PublicSiteLayout = lazy(() => import('./pages/public/PublicSiteLayout'));
const LandingPage = lazy(() => import('./components/LandingPage').then(module => ({ default: module.LandingPage })));
const ProductPage = lazy(() => import('./pages/public/ProductPage'));
const SecurityPage = lazy(() => import('./pages/public/SecurityPage'));
const PricingPage = lazy(() => import('./pages/public/PricingPage'));
const AboutPage = lazy(() => import('./pages/public/AboutPage'));

const AppShell = lazy(() => import('./pages/app/AppShell'));
const DashboardPage = lazy(() => import('./pages/app/DashboardPage'));
const TargetsPage = lazy(() => import('./pages/app/TargetsPage'));
const TargetDetailPage = lazy(() => import('./pages/app/TargetDetailPage'));
const ScansPage = lazy(() => import('./pages/app/ScansPage'));
const ScanDetailPage = lazy(() => import('./pages/app/ScanDetailPage'));
const FindingsPage = lazy(() => import('./pages/app/FindingsPage'));
const ReportsPage = lazy(() => import('./pages/app/ReportsPage'));
const ReportDetailPage = lazy(() => import('./pages/app/ReportDetailPage'));
const JoinTeamPage = lazy(() => import('./pages/public/JoinTeamPage'));
const SignUpPage = lazy(() => import('./pages/public/SignUpPage'));
const PasswordRecoveryPage = lazy(() => import('./pages/public/PasswordRecoveryPage'));

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
            <Route element={<PublicSiteLayout />}>
              <Route path="/" element={<LandingPage />} />
              <Route path="/product" element={<ProductPage />} />
              <Route path="/security" element={<SecurityPage />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/contact" element={<PublicContactPage />} />
            </Route>
            <Route path="/trust/:slug" element={<PublicTrustPageRoute />} />
            <Route path="/billing/return" element={<BillingReturnPage />} />
            <Route path="/integrations/github/callback" element={<GitHubIntegrationCallbackPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignUpPage />} />
            <Route path="/forgot-password" element={<PasswordRecoveryPage mode="request" />} />
            <Route path="/auth/reset-password" element={<PasswordRecoveryPage mode="update" />} />
            <Route path="/join" element={<JoinTeamPage />} />

            <Route path="/app" element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
              <Route index element={<DashboardPage />} />
              <Route path="targets" element={<TargetsPage />} />
              <Route path="targets/:targetId" element={<TargetDetailPage />} />
              <Route path="scans" element={<ScansPage />} />
              <Route path="scans/:scanId" element={<ScanDetailPage />} />
              <Route path="findings" element={<FindingsPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="reports/:reportId" element={<ReportDetailPage />} />
              {/* Advanced V2/V3 module URLs fall through to the safe /app redirect. */}
              <Route path="*" element={<Navigate to="/app" replace />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}
