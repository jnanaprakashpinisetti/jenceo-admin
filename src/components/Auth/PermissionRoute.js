// src/components/Auth/PermissionRoute.jsx
import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { hasPerm } from "../../utils/perm";

export default function PermissionRoute({ componentName, action = "view", children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!hasPerm(user, componentName, action)) return <Navigate to="/" replace />;
  return children;
}
