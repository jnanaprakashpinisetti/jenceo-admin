import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({
    identifier: "",
    password: ""
  });

  const clearErrors = () => {
    setError("");
    setFieldErrors({
      identifier: "",
      password: ""
    });
  };

  const validateForm = () => {
    const errors = {
      identifier: "",
      password: ""
    };

    if (!identifier.trim()) {
      errors.identifier = "Email or username is required";
    }

    if (!password) {
      errors.password = "Password is required";
    } else if (password.length < 3) {
      errors.password = "Password must be at least 3 characters";
    }

    setFieldErrors(errors);
    return !errors.identifier && !errors.password;
  };

  async function handleSubmit(e) {
    e.preventDefault();
    clearErrors();

    if (!validateForm()) {
      return;
    }

    setBusy(true);

    try {
      await login(identifier.trim(), password);
      navigate("/");
    } catch (err) {
      console.error("Login error", err);
      
      // Set specific field errors based on error type
      const errorMessage = err.message || "Login failed";
      setError(errorMessage);

      // Highlight specific fields based on error
      if (errorMessage.includes("user not found") || errorMessage.includes("no account found")) {
        setFieldErrors(prev => ({
          ...prev,
          identifier: "User not found"
        }));
      } else if (errorMessage.includes("password") || errorMessage.includes("incorrect")) {
        setFieldErrors(prev => ({
          ...prev,
          password: "Invalid password"
        }));
      } else if (errorMessage.includes("inactive") || errorMessage.includes("disabled")) {
        setFieldErrors(prev => ({
          ...prev,
          identifier: "Account is inactive"
        }));
      }
    }

    setBusy(false);
  }

  const handleIdentifierChange = (e) => {
    setIdentifier(e.target.value);
    if (fieldErrors.identifier) {
      setFieldErrors(prev => ({ ...prev, identifier: "" }));
    }
    if (error) setError("");
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    if (fieldErrors.password) {
      setFieldErrors(prev => ({ ...prev, password: "" }));
    }
    if (error) setError("");
  };

  const getInputClass = (fieldName) => {
    const baseClass = "form-control";
    return fieldErrors[fieldName] ? `${baseClass} is-invalid` : baseClass;
  };

  return (
    <div style={{ padding: 24, display: "flex", justifyContent: "center", minHeight: "80vh", alignItems: "center" }}>
      <div className="card bg-dark text-white" style={{ width: 400 }}>
        <div className="card-body">
          <h4 className="mb-3 text-center">Sign In</h4>

          <form onSubmit={handleSubmit}>
            <div className="form-group mb-3">
              <label className="small">Email or Username</label>
              <input
                className={getInputClass("identifier")}
                type="text"
                required
                value={identifier}
                onChange={handleIdentifierChange}
                placeholder="Enter email or username"
                disabled={busy}
              />
              {fieldErrors.identifier && (
                <div className="invalid-feedback d-block">
                  {fieldErrors.identifier}
                </div>
              )}
            </div>

            <div className="form-group mb-3">
              <label className="small">Password</label>
              <input
                className={getInputClass("password")}
                type="password"
                required
                value={password}
                onChange={handlePasswordChange}
                placeholder="Enter password"
                disabled={busy}
              />
              {fieldErrors.password && (
                <div className="invalid-feedback d-block">
                  {fieldErrors.password}
                </div>
              )}
            </div>

            {error && !fieldErrors.identifier && !fieldErrors.password && (
              <div className="alert alert-danger small mb-3">
                <i className="bi bi-exclamation-triangle me-2"></i>
                {error}
              </div>
            )}

            <button
              className="btn btn-primary w-100"
              type="submit"
              disabled={busy}
              style={{ height: "45px" }}
            >
              {busy ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          <div className="mt-4 small text-muted">
            <div className="mb-2">
              <strong>Demo Credentials:</strong>
            </div>
            <div className="mb-1">
              <i className="bi bi-envelope me-2"></i>
              <strong>Email:</strong> Use your Firebase Authentication email
            </div>
            <div>
              <i className="bi bi-person me-2"></i>
              <strong>Username:</strong> Use your database username
            </div>
          </div>

          {/* Help tips */}
          <div className="mt-3 small text-muted border-top pt-3">
            <div className="mb-1">
              <i className="bi bi-lightbulb me-2"></i>
              <strong>Tip:</strong> Enter email for Firebase login, username for database login
            </div>
            <div>
              <i className="bi bi-shield-check me-2"></i>
              <strong>Note:</strong> Passwords are case-sensitive
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}