import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

import { useAuth } from '../../context/auth-context';

export type UserRole = 'CLIENT' | 'WORKSHOP';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** When set, only this role may render the route. */
  requiredRole?: UserRole;
}

/**
 * ProtectedRoute — authentication, and role gating when a role is given.
 *
 * `requiredRole` used to be accepted here and silently ignored: the component
 * this app actually imports took only `children`, while a second implementation
 * that did check the role sat unreferenced in `routes.tsx`. `App.tsx` passed
 * `requiredRole` into the version that dropped it, so role isolation rested on
 * individual pages rather than on the route boundary. It is enforced here now.
 *
 * A signed-in user who lacks the role is sent to their own dashboard rather than
 * to `/login`, so they are not logged out of a session that is perfectly valid.
 */
const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        role="status"
        aria-live="polite"
      >
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
        <span className="sr-only">Carregando</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    const home = user?.role === 'WORKSHOP' ? '/workshop/dashboard' : '/client/dashboard';
    return <Navigate to={home} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
