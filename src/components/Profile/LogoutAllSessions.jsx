import React, { useState } from 'react';
import { securityService } from './SecurityService';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const LogoutAllSessions = ({ userId }) => {
  const [loading, setLoading] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogoutAll = async () => {
    if (confirmText !== 'LOGOUT ALL') {
      alert('Please type "LOGOUT ALL" to confirm');
      return;
    }

    if (!window.confirm('This will log you out from all devices. Are you sure?')) return;

    setLoading(true);
    try {
      // Log security event
      await securityService.logSecurityEvent({
        type: 'LOGOUT_ALL_SESSIONS',
        userId: userId,
        ipAddress: await securityService.getClientIP(),
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        severity: 'HIGH'
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
    <div className="border rounded p-3">
      <h6 className="text-danger mb-3">
        <i className="bi bi-exclamation-triangle me-2"></i>
        Logout From All Devices
      </h6>
      
      <div className="alert alert-danger">
        <div className="d-flex">
          <i className="bi bi-shield-exclamation me-3 fs-4"></i>
          <div>
            <h6 className="alert-heading">Security Warning</h6>
            <p className="mb-2 small">
              This will immediately log you out from all devices where you're currently signed in, including this one. You'll need to sign in again on each device.
            </p>
            <small className="text-muted">Use this if you suspect unauthorized access to your account.</small>
          </div>
        </div>
      </div>

      <div className="mb-3">
        <label className="form-label small">
          Type <code className="text-danger">LOGOUT ALL</code> to confirm:
        </label>
        <input
          type="text"
          className="form-control"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
          placeholder="LOGOUT ALL"
          disabled={loading}
        />
      </div>

      <button
        className="btn btn-danger w-100"
        onClick={handleLogoutAll}
        disabled={loading || confirmText !== 'LOGOUT ALL'}
      >
        {loading ? (
          <>
            <span className="spinner-border spinner-border-sm me-2"></span>
            Logging out...
          </>
        ) : (
          <>
            <i className="bi bi-power me-2"></i>
            Logout From All Devices
          </>
        )}
      </button>

      <div className="mt-3">
        <small className="text-muted">
          <i className="bi bi-info-circle me-1"></i>
          This action will be logged in security audit logs.
        </small>
      </div>
    </div>
  );
};

export default LogoutAllSessions;