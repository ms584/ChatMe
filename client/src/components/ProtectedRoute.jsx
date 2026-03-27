import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const LoadingSpinner = () => (
  <div className="loading-screen">
    <div className="spinner" />
    <p>Loading...</p>
  </div>
);

/**
 * Wraps a route to require authentication.
 * @param {string|null} requiredRole - 'admin' | 'user' | null (any authenticated)
 */
const ProtectedRoute = ({ children, requiredRole = null }) => {
  const { user, loading } = useAuth();

  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/chat'} replace />;
  }
  return children;
};

export default ProtectedRoute;
