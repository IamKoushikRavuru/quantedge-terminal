import { Navigate, useLocation } from 'react-router-dom';
import { getToken } from '../hooks/useAuth';

/**
 * Wraps any route that requires authentication.
 * If no token → redirect to /login.
 * If brand-new user (qe_is_new_user flag) and not already on /onboarding → redirect there.
 */
export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const location = useLocation();
    if (!getToken()) {
        return <Navigate to="/login" replace />;
    }
    const isNew = localStorage.getItem('qe_is_new_user') === '1';
    if (isNew && location.pathname !== '/onboarding') {
        return <Navigate to="/onboarding" replace />;
    }
    return <>{children}</>;
}
