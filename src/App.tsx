import { MotionConfig } from 'framer-motion';
import type { ReactNode } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { ErrorNote, PageLoader } from './components/ui/Feedback';
import { ToastProvider } from './components/ui/Toast';
import { AuthProvider, useAuth } from './lib/auth';
import { MeBoundary, useMe } from './lib/me';
import { AuthPage } from './pages/AuthPage';
import { DiscoverPage } from './pages/DiscoverPage';
import { GroupsPage } from './pages/GroupsPage';
import { HomePage } from './pages/HomePage';
import { LandingPage } from './pages/LandingPage';
import { MatchDetailPage } from './pages/MatchDetailPage';
import { MatchesPage } from './pages/MatchesPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { PartnershipPage } from './pages/PartnershipPage';
import { ProfilePage } from './pages/ProfilePage';

function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <PageLoader />;
  if (status === 'signed_out') {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/auth?next=${next}`} replace />;
  }
  return <>{children}</>;
}

/** Everything under /app needs a Partner Profile first (except onboarding itself). */
function RequireProfile() {
  const { me, loading, error, refresh } = useMe();
  const location = useLocation();
  if (loading && !me) return <PageLoader label="Loading your Partner DNA…" />;
  if (error && !me) return <ErrorNote message={error} onRetry={() => void refresh()} />;
  if (me && !me.profile) return <Navigate to={`/app/start${location.search}`} replace />;
  return <Outlet />;
}

export function App() {
  return (
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            <MeBoundary>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route
                  path="/app"
                  element={
                    <RequireAuth>
                      <AppShell />
                    </RequireAuth>
                  }
                >
                  <Route path="start" element={<OnboardingPage />} />
                  <Route path="start/:mode" element={<OnboardingPage />} />
                  <Route element={<RequireProfile />}>
                    <Route index element={<HomePage />} />
                    <Route path="discover" element={<DiscoverPage />} />
                    <Route path="match/:id" element={<MatchDetailPage />} />
                    <Route path="matches" element={<MatchesPage />} />
                    <Route path="partnership/:id" element={<PartnershipPage />} />
                    <Route path="groups" element={<GroupsPage />} />
                    <Route path="profile" element={<ProfilePage />} />
                  </Route>
                </Route>
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </MeBoundary>
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    </MotionConfig>
  );
}
