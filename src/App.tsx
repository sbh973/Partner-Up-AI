import { MotionConfig } from 'framer-motion';
import type { ReactNode } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { PageLoader } from './components/ui/Feedback';
import { ToastProvider } from './components/ui/Toast';
import { SessionProvider, useSession } from './lib/session';
import { AccountPage } from './pages/AccountPage';
import { AuthPage } from './pages/AuthPage';
import { ConnectionPage } from './pages/ConnectionPage';
import { DashboardPage } from './pages/DashboardPage';
import { DnaPage } from './pages/DnaPage';
import { InboxPage } from './pages/InboxPage';
import { LandingPage } from './pages/LandingPage';
import { MutualPage } from './pages/MutualPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ScoutPage } from './pages/ScoutPage';
import { SetupPage } from './pages/SetupPage';

function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useSession();
  const location = useLocation();
  if (status === 'loading') return <PageLoader />;
  if (status === 'signed_out') return <Navigate to={`/auth?next=${encodeURIComponent(location.pathname)}`} replace />;
  return <>{children}</>;
}

/** Everything in the app needs a profile first (name, gender, age, contact). */
function RequireProfile() {
  const { me } = useSession();
  if (me && !me.profile) return <Navigate to="/app/setup" replace />;
  return <Outlet />;
}

export function App() {
  return (
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <ToastProvider>
          <SessionProvider>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route
                path="/app/setup"
                element={
                  <RequireAuth>
                    <SetupPage />
                  </RequireAuth>
                }
              />
              <Route
                path="/app"
                element={
                  <RequireAuth>
                    <AppShell />
                  </RequireAuth>
                }
              >
                <Route element={<RequireProfile />}>
                  <Route index element={<DashboardPage />} />
                  <Route path="mutual" element={<MutualPage />} />
                  <Route path="scout" element={<ScoutPage />} />
                  <Route path="scout/connection/:id" element={<ConnectionPage />} />
                  <Route path="dna" element={<DnaPage />} />
                  <Route path="inbox" element={<InboxPage />} />
                  <Route path="account" element={<AccountPage />} />
                </Route>
              </Route>
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </SessionProvider>
        </ToastProvider>
      </BrowserRouter>
    </MotionConfig>
  );
}
