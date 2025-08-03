import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ROUTES } from '../constants/routes';

interface AdminRouteProps {
  children: React.ReactNode;
}

/**
 * AdminRoute component that protects admin-only routes
 * Redirects non-admin users to home page
 */
export const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Lade...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated || !user) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  }

  // Redirect to home if not admin
  if (user.role !== 'ADMIN') {
    return <Navigate to={ROUTES.HOME} replace />;
  }

  // User is authenticated and is admin, render the protected component
  return <>{children}</>;
};

export default AdminRoute;