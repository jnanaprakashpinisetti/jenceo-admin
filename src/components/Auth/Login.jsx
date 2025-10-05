// src/pages/Login.jsx
import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function Login() {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({ identifier: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);

  const clearErrors = () => {
    setError("");
    setFieldErrors({ identifier: "", password: "" });
  };

  const validateForm = () => {
    const id = identifier.trim();
    const pw = password;
    const errors = {
      identifier: id ? "" : "Email or username is required",
      password: pw ? "" : "Password is required",
    };
    setFieldErrors(errors);
    return !errors.identifier && !errors.password;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearErrors();
    if (!validateForm()) return;

    setBusy(true);
    try {
      await login(identifier.trim(), password);
      const params = new URLSearchParams(location.search);
      const redirect = params.get("redirect");
      navigate(redirect || "/", { replace: true });
    } catch (err) {
      const msg = err?.message || "Login failed";
      setError(msg);
      const lower = msg.toLowerCase();
      if (lower.includes("user not found")) setFieldErrors((p) => ({ ...p, identifier: "Username not found" }));
      else if (lower.includes("password")) setFieldErrors((p) => ({ ...p, password: "Invalid password" }));
      else if (lower.includes("inactive") || lower.includes("disabled")) setFieldErrors((p) => ({ ...p, identifier: "Account is inactive" }));
    } finally {
      setBusy(false);
    }
  };

  const getInputClass = (name) => `form-control ${fieldErrors[name] ? "is-invalid" : ""}`;
  const isSubmitting = busy || loading;

  return (
    <div className="login-container">
      <div className="card login-card">
        <div className="card-body">
          <h4 className="login-title">Sign In</h4>

          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label className="form-label">Email or Username</label>
              <input
                className={getInputClass("identifier")}
                type="text"
                required
                value={identifier}
                onChange={(e)=>setIdentifier(e.target.value)}
                placeholder="example@site.com or admin"
                autoFocus
                disabled={isSubmitting}
              />
              {fieldErrors.identifier && <div className="error-message">{fieldErrors.identifier}</div>}
            </div>

            <div className="form-group">
              <label className="form-label d-flex justify-content-between">
                <span>Password</span>
                <button
                  type="button"
                  className="btn btn-link btn-sm p-0"
                  onClick={() => setShowPassword((v) => !v)}
                  disabled={isSubmitting}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </label>
              <input
                className={getInputClass("password")}
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e)=>setPassword(e.target.value)}
                placeholder="Enter your password"
                disabled={isSubmitting}
              />
              {fieldErrors.password && <div className="error-message">{fieldErrors.password}</div>}
            </div>

            {error && !fieldErrors.identifier && !fieldErrors.password && (
              <div className="alert alert-danger error-alert">
                {error}
              </div>
            )}

            <div className="submit-container">
              <button className="btn btn-primary submit-button" type="submit" disabled={isSubmitting}>
                {isSubmitting ? (<><span className="spinner spinner-sm me-2" />Signing in...</>) : "Sign In"}
              </button>
            </div>
          </form>

          <div className="login-info">
            <div className="info-title"><strong>Login Options:</strong></div>
            <div className="info-item">Use email for Authentication</div>
            <div className="info-item">Use Username for authentication</div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .login-container { padding: 24px; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
        .login-card { width: 400px; background-color: #333638; border-radius: 10px; color: white; }
        .login-title { margin-bottom: 1.5rem; text-align: center; }
        .form-group { margin-bottom: 1.5rem; }
        .form-label { font-size: 0.875rem; margin-bottom: 0.5rem; display: block; }
        .error-message { width: 100%; margin-top: 0.25rem; font-size: 0.875rem; color: #dc3545; }
        .error-alert { font-size: 0.875rem; margin-bottom: 1rem; }
        .submit-container { display: flex; justify-content: center; }
        .submit-button { min-width: 120px; padding: 10px 30px; }
        .spinner { display: inline-block; width: 1rem; height: 1rem; border: 2px solid currentColor; border-right-color: transparent; border-radius: 50%; animation: spinner-border 0.75s linear infinite; }
        .login-info { margin-top: 1.5rem; font-size: 0.875rem; color: #6c757d; text-align: center; }
        .info-title { margin-bottom: 0.5rem; }
        .info-item { margin-bottom: 0.25rem; }
        @keyframes spinner-border { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}