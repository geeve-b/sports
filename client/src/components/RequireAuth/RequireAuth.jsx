import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import EmptyState from '../EmptyState/EmptyState';
import { ScoreboardLoader } from '../Skeleton/Skeleton';

/** Gate a route on sign-in, and optionally on role. */
export default function RequireAuth({ roles, children }) {
  const { status, user } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <ScoreboardLoader />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (roles && !roles.includes(user.role)) {
    return (
      <EmptyState title="Staff only.">
        This page is for {roles.join(' and ')} accounts. Your account is a {user.role} account.
      </EmptyState>
    );
  }
  return children;
}
