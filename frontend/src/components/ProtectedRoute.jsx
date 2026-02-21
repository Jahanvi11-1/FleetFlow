import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * ProtectedRoute component that wraps routes requiring authentication
 * Redirects to login if user is not authenticated or token is expired
 */
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isTokenExpired, loading } = useAuth();

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <div>Loading...</div>
      </div>
    );
  }

  // Check if user is authenticated and token is not expired
  if (!isAuthenticated || isTokenExpired()) {
    // Redirect to login page
    return <Navigate to="/login" replace />;
  }

  // User is authenticated, render the protected content
  return children;
};

export default ProtectedRoute;
