import React, { useEffect, useState } from 'react';
import ChangePassword from './ChangePassword';
import LogoutAllSessions from './LogoutAllSessions';
import DeviceSessionManager from './DeviceSessionManager';
import { securityService } from './SecurityService';

const SecuritySettings = ({ user, savedAt }) => {
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [securityScore, setSecurityScore] = useState(0);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lastSecurityReview, setLastSecurityReview] = useState(null);
  const [activeSessions, setActiveSessions] = useState(0);

  const loadSecurityData = async () => {
    if (!user?.uid) return;

    try {
      const [
        score,
        attempts,
        review,
        sessions
      ] = await Promise.all([
        securityService.calculateSecurityScore(user.uid),
        securityService.getFailedLoginAttempts(user.uid),
        securityService.getLastSecurityReview(user.uid),
        securityService.getActiveSessionCount(user.uid),
      ]);

      setSecurityScore(score);
      setFailedAttempts(attempts);
      setLastSecurityReview(review ? new Date(review) : null);
      setActiveSessions(sessions);
    } catch (error) {
      console.error('Error loading security data:', error);
    }
  };

  useEffect(() => {
    loadSecurityData();
  }, [user?.uid]);

  const getScoreColor = (score) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'danger';
  };

 

  return (
    <div className="border-0 shadow-soft mb-4">
      <div className="card-body p-3 p-md-4">
        <h5 className="mb-4">Security Settings</h5>

        {/* Security Score */}
        <div
          className="card border-0 mb-4"
          style={{
            background: '#282b2e',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <div className="card-body p-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div>
                <h6 className="mb-1 text-light">Account Security Score</h6>
                <small className="text-muted">
                  Based on password strength, activity & sessions
                </small>
              </div>

              <div className="text-end">
                <div className={`display-6 fw-bold text-${getScoreColor(securityScore)}`}>
                  {securityScore}/100
                </div>
                <div className="progress mt-2" style={{ height: 6, width: 120 }}>
                  <div
                    className={`progress-bar bg-${getScoreColor(securityScore)}`}
                    style={{ width: `${securityScore}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="row text-center mt-3">
              <div className="col-4 border-end border-secondary">
                <small className="text-muted d-block">LAST REVIEW</small>
                <div className="text-light">
                  {lastSecurityReview
                    ? lastSecurityReview.toLocaleDateString()
                    : '—'}
                </div>
              </div>

              <div className="col-4 border-end border-secondary">
                <small className="text-muted d-block">FAILED LOGINS</small>
                <div className={`text-${failedAttempts ? 'warning' : 'success'}`}>
                  {failedAttempts} this month
                </div>
              </div>

              <div className="col-4">
                <small className="text-muted d-block">ACTIVE SESSIONS</small>
                <div className="text-light">{activeSessions}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Password */}
        <div className="rounded p-4 mb-4 border border-secondary border-opacity-25">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h6 className="mb-1">Password</h6>
              <p className="text-muted mb-0">
                Change your password regularly to keep your account secure.
              </p>
            </div>

            {!showPasswordForm && (
              <button
                className="btn btn-primary"
                onClick={() => setShowPasswordForm(true)}
              >
                Change Password
              </button>
            )}
          </div>

          {showPasswordForm && (
            <ChangePassword
              userId={user?.uid}
              onCancel={() => setShowPasswordForm(false)}
              onSuccess={() => {
                setShowPasswordForm(false);
                loadSecurityData(); // 🔁 refresh security data
              }}
            />
          )}

          <small className="text-muted">
            <i className="bi bi-info-circle me-1" />
            Last password change:{' '}
            {savedAt ? savedAt.toLocaleDateString() : 'Never'}
          </small>
        </div>

        {/* Sessions */}
        <div className="border rounded p-4 mb-4">
          <h6 className="mb-3">Active Sessions & Devices</h6>
          <DeviceSessionManager userId={user?.uid} />
        </div>

        {/* Actions */}
        <div className="border rounded p-4">
          <h6 className="mb-3">Security Actions</h6>

          <div className="row g-3">
            <div className="col-md-6">
              <LogoutAllSessions userId={user?.uid} />
            </div>
            <div className="col-md-6">
              <button className="btn btn-outline-warning w-100">
                <i className="bi bi-shield-exclamation me-2" />
                Report Suspicious Activity
              </button>
            </div>
          </div>

          <div className="mt-4">
            <h6 className="mb-2">Security Audit Logs</h6>
            <ul className="list-unstyled text-muted">
              <li>
                <i className="bi bi-check-circle-fill text-success me-2" />
                Read-only logs (tamper-proof)
              </li>
              <li>
                <i className="bi bi-clock-history text-info me-2" />
                Retained for 90 days
              </li>
              <li>
                <i className="bi bi-eye text-primary me-2" />
                Role-based visibility
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecuritySettings;
