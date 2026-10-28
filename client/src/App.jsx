import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import RequireAuth from './components/RequireAuth/RequireAuth';
import Skeleton, { ScoreboardLoader } from './components/Skeleton/Skeleton';
import { useAuth } from './hooks/useAuth';
import AppShell from './layouts/AppShell';

const Login = lazy(() => import('./pages/Auth/Login'));
const Register = lazy(() => import('./pages/Auth/Register'));
const MatchCentre = lazy(() => import('./pages/MatchCentre/MatchCentre'));
const Squad = lazy(() => import('./pages/Squad/Squad'));
const PlayerProfile = lazy(() => import('./pages/PlayerProfile/PlayerProfile'));
const Fixtures = lazy(() => import('./pages/Fixtures/Fixtures'));
const MatchDetail = lazy(() => import('./pages/Fixtures/MatchDetail'));
const FormationBuilder = lazy(() => import('./pages/Formation/FormationBuilder'));
const Training = lazy(() => import('./pages/Training/Training'));
const Availability = lazy(() => import('./pages/Availability/Availability'));
const Announcements = lazy(() => import('./pages/Announcements/Announcements'));
const TeamStats = lazy(() => import('./pages/TeamStats/TeamStats'));
const Admin = lazy(() => import('./pages/Admin/Admin'));
const Settings = lazy(() => import('./pages/Settings/Settings'));
const NotFound = lazy(() => import('./pages/NotFound/NotFound'));

const STAFF = ['admin', 'coach'];

function PublicOnly({ children }) {
  const { status, user } = useAuth();
  if (status === 'loading') return <ScoreboardLoader />;
  return user ? <Navigate to="/" replace /> : children;
}

const PageFallback = () => (
  <div className="pt-5">
    <Skeleton rows={5} big label="Loading page" />
  </div>
);

export default function App() {
  return (
    <Suspense fallback={<ScoreboardLoader />}>
      <Routes>
        <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
        <Route path="/register" element={<PublicOnly><Register /></PublicOnly>} />

        <Route
          element={
            <RequireAuth>
              <AppShell />
            </RequireAuth>
          }
        >
          <Route
            path="/"
            element={<Suspense fallback={<PageFallback />}><MatchCentre /></Suspense>}
          />
          <Route path="/squad" element={<Suspense fallback={<PageFallback />}><Squad /></Suspense>} />
          <Route path="/squad/:id" element={<Suspense fallback={<PageFallback />}><PlayerProfile /></Suspense>} />
          <Route path="/fixtures" element={<Suspense fallback={<PageFallback />}><Fixtures /></Suspense>} />
          <Route path="/fixtures/:id" element={<Suspense fallback={<PageFallback />}><MatchDetail /></Suspense>} />
          <Route
            path="/lineup/:matchId?"
            element={
              <RequireAuth roles={STAFF}>
                <Suspense fallback={<PageFallback />}><FormationBuilder /></Suspense>
              </RequireAuth>
            }
          />
          <Route path="/training" element={<Suspense fallback={<PageFallback />}><Training /></Suspense>} />
          <Route path="/availability" element={<Suspense fallback={<PageFallback />}><Availability /></Suspense>} />
          <Route path="/announcements" element={<Suspense fallback={<PageFallback />}><Announcements /></Suspense>} />
          <Route path="/stats" element={<Suspense fallback={<PageFallback />}><TeamStats /></Suspense>} />
          <Route
            path="/admin"
            element={
              <RequireAuth roles={['admin']}>
                <Suspense fallback={<PageFallback />}><Admin /></Suspense>
              </RequireAuth>
            }
          />
          <Route path="/settings" element={<Suspense fallback={<PageFallback />}><Settings /></Suspense>} />
          <Route path="*" element={<Suspense fallback={<PageFallback />}><NotFound /></Suspense>} />
        </Route>
      </Routes>
    </Suspense>
  );
}
