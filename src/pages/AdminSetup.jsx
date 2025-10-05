// src/pages/AdminSetup.jsx
import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";


/******************************************************** */
/******************************************************** */
/***************TGUS FUKE US FIR CREATE ADMIN**************/
/******************************************************** */
/******************************************************** */

export default function AdminSetup() {
  const { initializeDefaultAdmin, login, user, ready } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  

  useEffect(() => {
    // Only run setup when auth is ready and no user is logged in
    if (ready && !user) {
      setupAdmin();
    } else if (user) {
      // If user is already logged in, redirect to dashboard
      setMessage("✅ System already configured! Admin user exists. Redirecting to login...");
      setTimeout(() => navigate("/"), 2000);
    }
  }, [ready, user]);

  const setupAdmin = async () => {
    setLoading(true);
    setMessage("🛠️ Checking system setup...");
    
    try {
      const result = await initializeDefaultAdmin();
      
      if (result.success) {
        if (result.exists) {
          setMessage("✅ Admin user already exists. Redirecting to login...");
          setStep(2);
          setTimeout(() => navigate("/login"), 3000);
        } else {
          setMessage("✅ Default admin user created successfully!");
          setStep(2);
          
          // Auto-login with admin credentials after a delay
          setTimeout(async () => {
            setMessage("🔐 Attempting auto-login...");
            try {
              await login("admin", "admin123");
              setMessage("✅ Login successful! Redirecting to dashboard...");
              setTimeout(() => navigate("/"), 2000);
            } catch (loginError) {
              setMessage("❌ Auto-login failed. Please login manually.");
              setStep(3);
              setError(loginError.message);
            }
          }, 2000);
        }
      } else {
        setMessage(`❌ Failed to create admin user: ${result.error}`);
        setError(result.error);
        setStep(4);
      }
    } catch (error) {
      setMessage(`❌ Setup error: ${error.message}`);
      setError(error.message);
      setStep(4);
    } finally {
      setLoading(false);
    }
  };

  const retrySetup = () => {
    setStep(1);
    setError("");
    setLoading(true);
    setupAdmin();
  };

  // Show loading while checking auth status
  if (!ready) {
    return (
      <div className="container mt-5">
        <div className="row justify-content-center">
          <div className="col-md-6">
            <div className="">
              <div className="card-body text-center">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <p className="mt-2">Initializing system...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If user is already logged in, show redirect message
  if (user) {
    return (
      <div className="container mt-5">
        <div className="row justify-content-center">
          <div className="col-md-6">
            <div className="">
              <div className="card-body text-center">
                <div className="alert alert-info">
                  <h5>Already Logged In</h5>
                  <p>You are already logged in as <strong>{user.name}</strong>.</p>
                  <button 
                    className="btn btn-primary"
                    onClick={() => navigate("/")}
                  >
                    Go to Dashboard
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-md-8">
          <div className="">
            <div className="card-header bg-primary text-white">
              <h4 className="mb-0">System Setup</h4>
            </div>
            <div className="card-body">
              {step === 1 && (
                <>
                  <div className="text-center mb-4">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                  </div>
                  <p className="text-center">{message || "Initializing system..."}</p>
                </>
              )}

              {step === 2 && (
                <div className="text-center">
                  <div className="alert alert-success">
                    <h5>✅ Setup Complete!</h5>
                    <p>{message}</p>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="text-center">
                  <div className="alert alert-info">
                    <h5>Manual Login Required</h5>
                    <p>Please use the following credentials to login:</p>
                    <div className="bg-light p-3 rounded mt-3">
                      <p><strong>Username:</strong> admin</p>
                      <p><strong>Password:</strong> admin123</p>
                    </div>
                  </div>
                  <button 
                    className="btn btn-primary me-2"
                    onClick={() => navigate("/login")}
                  >
                    Go to Login Page
                  </button>
                  <button 
                    className="btn btn-outline-secondary"
                    onClick={retrySetup}
                  >
                    Retry Auto-login
                  </button>
                </div>
              )}

              {step === 4 && (
                <div className="text-center">
                  <div className="alert alert-danger">
                    <h5>❌ Setup Failed</h5>
                    <p>{message}</p>
                    {error && <p className="mt-2"><small>Error details: {error}</small></p>}
                  </div>
                  <button 
                    className="btn btn-primary"
                    onClick={retrySetup}
                  >
                    Retry Setup
                  </button>
                </div>
              )}

              {loading && (
                <div className="text-center mt-3">
                  <div className="spinner-border spinner-border-sm" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <span className="ms-2">Processing...</span>
                </div>
              )}
            </div>
          </div>

          <div className=" mt-4">
            <div className="card-body">
              <h5>Default Admin Credentials</h5>
              <div className="bg-light p-3 rounded">
                <p className="mb-1"><strong>Username:</strong> admin</p>
                <p className="mb-1"><strong>Password:</strong> admin123</p>
                <p className="mb-0"><strong>Role:</strong> Administrator</p>
              </div>
              <small className="text-muted mt-2 d-block">
                This setup will create the first administrator account for your system.
                After setup, you can create additional users from the Admin panel.
              </small>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

