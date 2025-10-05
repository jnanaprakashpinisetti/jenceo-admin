// src/routes/ProtectedRoute.jsx
import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ allowedRoles = [] }) {
  const { user, ready, loading } = useAuth();
  const location = useLocation();

  // Don't show anything while loading
  if (!ready || loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  // If no user and trying to access protected route, redirect to login
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Check roles if specified
  const role = String(user?.role || "").toLowerCase();
  if (allowedRoles.length > 0) {
    const allowed = allowedRoles.map((r) => String(r).toLowerCase());
    if (!allowed.includes(role)) {
      return <Navigate to="/" replace />; // Redirect to home instead of unauthorized page
    }
  }

  return <Outlet />;
}