import React from 'react';
import { Navigate } from 'react-router-dom';

// Simple authentication check - update with your actual logic if needed
const isAuthenticated = () => {
  return localStorage.getItem('token') !== null;
};

const ProtectedRoute = ({ children }) => {
  if (!isAuthenticated()) {
    // Redirect to the login page if not authenticated
    return <Navigate to="/login" replace />;
  }
  // Render the protected component if the user is authenticated
  return children;
};

export default ProtectedRoute;
