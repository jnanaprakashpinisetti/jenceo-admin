import React, { useState } from 'react';
import { securityService } from './SecurityService';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const LogoutAllSessions = ({ userId }) => {
  const [loading, setLoading] = useState(false);
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [confirmChecked2, setConfirmChecked2] = useState(false);
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogoutAll = async () => {
    if (!confirmChecked || !confirmChecked2) {
      alert('Please confirm both security checks');
      return;
    }

    setLoading(true);
    try {
      // Log security event
      await securityService.logSecurityEvent({
        type: 'LOGOUT_ALL_SESSIONS',
        userId: userId,
        ipAddress: await securityService.getClientIP(),
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        severity: 'HIGH',
        details: 'User initiated logout from all devices'
      });

      // Clear all sessions from database
      await securityService.terminateAllSessions(userId);

      // Log out current session
      await logout();
      
      // Redirect to login with message
      navigate('/login?message=logged_out_all');
    } catch (error) {
      alert('Error logging out all sessions: ' + error.message);
      setLoading(false);
    }
  };

  return (
    <div className="rounded p-4 bg-danger bg-opacity-10">
      <div className="d-flex align-items-center mb-3">
        <div className="bg-danger bg-opacity-10 p-3 rounded-circle me-3">
          <i className="bi bi-shield-exclamation fs-4 text-danger"></i>
        </div>
        <div>
          <h6 className="text-danger mb-0">Logout From All Devices</h6>
          <small className="text-muted">Nuclear option for account security</small>
        </div>
      </div>
      
      <div className="alert alert-danger border-danger">
        <div className="d-flex">
          <i className="bi bi-exclamation-triangle me-3 fs-4"></i>
          <div>
            <h6 className="alert-heading">Security Warning</h6>
            <p className="mb-2">
              This will immediately log you out from <strong>all devices</strong> where you're currently signed in, including this one. You'll need to sign in again on each device.
            </p>
            <small className="small-text d-block">
              <i className="bi bi-info-circle me-1"></i>
              Use this if you suspect unauthorized access to your account.
            </small>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <h6 className="mb-3 text-dark">Confirm Security Checks:</h6>
        
        <div className="form-check mb-3 border-bottom pb-3">
          <input
            className="form-check-input"
            type="checkbox"
            id="confirm1"
            checked={confirmChecked}
            onChange={(e) => setConfirmChecked(e.target.checked)}
            disabled={loading}
          />
          <label className="form-check-label ms-2" htmlFor="confirm1">
            <strong>I understand this will log me out from all my devices</strong>
            <small className="text-muted d-block">
              This includes mobile apps, desktop browsers, and any other active sessions
            </small>
          </label>
        </div>

        <div className="form-check">
          <input
            className="form-check-input"
            type="checkbox"
            id="confirm2"
            checked={confirmChecked2}
            onChange={(e) => setConfirmChecked2(e.target.checked)}
            disabled={loading}
          />
          <label className="form-check-label ms-2" htmlFor="confirm2">
            <strong>I want to terminate all active sessions for security reasons</strong>
            <small className="text-muted d-block">
              This action cannot be undone and will require re-login on all devices
            </small>
          </label>
        </div>
      </div>

      <button
        className="btn btn-danger w-100 py-3 fw-bold"
        onClick={handleLogoutAll}
        disabled={loading || !confirmChecked || !confirmChecked2}
      >
        {loading ? (
          <>
            <span className="spinner-border spinner-border-sm me-2"></span>
            Securely Logging Out All Devices...
          </>
        ) : (
          <>
            <i className="bi bi-shield-slash me-2"></i>
            Logout From All Devices
          </>
        )}
      </button>

      <div className="mt-3 text-center">
        <small className="text-muted">
          <i className="bi bi-clock-history me-1"></i>
          This action will be permanently logged in security audit logs.
        </small>
      </div>
    </div>
  );
};

export default LogoutAllSessions;