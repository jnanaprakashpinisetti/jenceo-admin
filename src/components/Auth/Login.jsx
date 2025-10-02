import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function Login() {
  const { login, loading } = useAuth();
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
    setFieldErrors({ identifier: "", password: "" });
  };

  const validateForm = () => {
    const errors = {
      identifier: identifier.trim() ? "" : "Email or username is required",
      password: password ? "" : "Password is required"
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
      navigate("/");
    } catch (err) {
      const errorMessage = err.message || "Login failed";
      setError(errorMessage);

      // Set specific field errors based on error type
      const errorLower = errorMessage.toLowerCase();
      
      if (errorLower.includes("user not found") || errorLower.includes("no account found")) {
        setFieldErrors(prev => ({ ...prev, identifier: "Username not found" }));
      } else if (errorLower.includes("password") || errorLower.includes("incorrect")) {
        setFieldErrors(prev => ({ ...prev, password: "Invalid password" }));
      } else if (errorLower.includes("inactive") || errorLower.includes("disabled")) {
        setFieldErrors(prev => ({ ...prev, identifier: "Account is inactive" }));
      }
    }

    setBusy(false);
  };

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
    return `form-control ${fieldErrors[fieldName] ? "is-invalid" : ""}`;
  };

  const isSubmitting = busy || loading;

  return (
    <div className="login-container">
      <div className="card login-card">
        <div className="card-body">
          <h4 className="login-title">Sign In</h4>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email or Username</label>
              <input
                className={getInputClass("identifier")}
                type="text"
                required
                value={identifier}
                onChange={handleIdentifierChange}
                placeholder="example@site.com or admin"
                autoFocus
                disabled={isSubmitting}
              />
              {fieldErrors.identifier && (
                <div className="error-message">{fieldErrors.identifier}</div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                className={getInputClass("password")}
                type="password"
                required
                value={password}
                onChange={handlePasswordChange}
                placeholder="Enter your password"
                disabled={isSubmitting}
              />
              {fieldErrors.password && (
                <div className="error-message">{fieldErrors.password}</div>
              )}
            </div>

            {error && !fieldErrors.identifier && !fieldErrors.password && (
              <div className="alert alert-danger error-alert">
                <i className="bi bi-exclamation-triangle me-2"></i>
                {error}
              </div>
            )}

            <div className="submit-container">
              <button
                className="btn btn-primary submit-button"
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="spinner spinner-sm me-2"></span>
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </button>
            </div>
          </form>

          <div className="login-info">
            <div className="info-title">
              <strong>Login Options:</strong>
            </div>
            <div className="info-item">
              <i className="bi bi-envelope me-2"></i>
              Use email for Firebase Authentication
            </div>
            <div className="info-item">
              <i className="bi bi-person me-2"></i>
              Use username for database authentication
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .login-container {
          padding: 24px;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
        }

        .login-card {
          width: 400px;
          background-color: #333638;
          border-radius: 10px;
          color: white;
        }

        .login-title {
          margin-bottom: 1.5rem;
          text-align: center;
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-label {
          font-size: 0.875rem;
          margin-bottom: 0.5rem;
          display: block;
        }

        .error-message {
          width: 100%;
          margin-top: 0.25rem;
          font-size: 0.875rem;
          color: #dc3545;
        }

        .error-alert {
          font-size: 0.875rem;
          margin-bottom: 1rem;
        }

        .submit-container {
          display: flex;
          justify-content: center;
        }

        .submit-button {
          min-width: 120px;
          padding: 10px 30px;
        }

        .spinner {
          display: inline-block;
          width: 1rem;
          height: 1rem;
          border: 2px solid currentColor;
          border-right-color: transparent;
          border-radius: 50%;
          animation: spinner-border 0.75s linear infinite;
        }

        .login-info {
          margin-top: 1.5rem;
          font-size: 0.875rem;
          color: #6c757d;
          text-align: center;
        }

        .info-title {
          margin-bottom: 0.5rem;
        }

        .info-item {
          margin-bottom: 0.25rem;
        }

        @keyframes spinner-border {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}