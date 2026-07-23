import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectCurrentUser, selectIsAuthenticated } from '../store/authSlice.js';

// Protect routes requiring authentication
export const ProtectedRoute = () => {
  const isAuthenticated = useSelector(selectIsAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

// Route guard restricting access to admins only
export const AdminRoute = () => {
  const user = useSelector(selectCurrentUser);
  const isAuthenticated = useSelector(selectIsAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== 'admin') {
    return <Navigate to="/" replace />; // Redirect employee to search home
  }

  return <Outlet />;
};

// Route guard restricting access to employees only
export const EmployeeRoute = () => {
  const user = useSelector(selectCurrentUser);
  const isAuthenticated = useSelector(selectIsAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== 'employee') {
    return <Navigate to="/admin" replace />; // Redirect admin to dashboard
  }

  return <Outlet />;
};

// Redirect logged-in users away from auth pages (login/signup)
export const GuestRoute = () => {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const user = useSelector(selectCurrentUser);

  if (isAuthenticated && user) {
    if (user.role === 'admin') {
      return <Navigate to="/admin" replace />;
    }
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};
