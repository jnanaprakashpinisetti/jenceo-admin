import React, { useEffect, useState } from 'react';
import firebaseDB from '../../firebase';
import ChangePassword from './ChangePassword';
import LogoutAllSessions from './LogoutAllSessions';
import DeviceSessionManager from './DeviceSessionManager';
import ReportSuspiciousActivity from './ReportSuspiciousActivity';
import { securityService } from './SecurityService';

const SecuritySettings = ({ user, savedAt }) => {
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [securityScore, setSecurityScore] = useState(0);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lastSecurityReview, setLastSecurityReview] = useState(null);
  const [activeSessions, setActiveSessions] = useState(0);
  const [recommendations, setRecommendations] = useState([]);
  const [has2FA, setHas2FA] = useState(false);
  const [toggling2FA, setToggling2FA] = useState(false);

  const loadSecurityData = async () => {
    if (!user?.uid) return;

    try {
      const [
        score,
        attempts,
        review,
        sessions,
        userData,
        recs
      ] = await Promise.all([
        securityService.calculateSecurityScore(user.uid),
        securityService.getFailedLoginAttempts(user.uid),
        securityService.getLastSecurityReview(user.uid),
        securityService.getActiveSessionCount(user.uid),
        securityService.getUserSecurityData(user.uid),
        securityService.getSecurityRecommendations(user.uid)
      ]);

      setSecurityScore(score);
      setFailedAttempts(attempts);
      setLastSecurityReview(review ? new Date(review) : null);
      setActiveSessions(sessions);
      setRecommendations(recs);
      
      // Check if user has 2FA enabled
      try {
        const userSnapshot = await firebaseDB.child(`Users/${user.uid}`).once('value');
        const userData = userSnapshot.val();
        setHas2FA(userData?.has2FA || false);
      } catch (error) {
        console.error('Error checking 2FA status:', error);
      }
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

  const toggle2FA = async () => {
    if (!window.confirm(`Are you sure you want to ${has2FA ? 'disable' : 'enable'} two-factor authentication?`)) return;
    
    setToggling2FA(true);
    try {
      const result = await securityService.toggleTwoFactorAuth(user.uid, !has2FA);
      if (result.success) {
        setHas2FA(!has2FA);
        await loadSecurityData(); // Refresh security data
        alert(`2FA ${!has2FA ? 'enabled' : 'disabled'} successfully!`);
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      alert('Error toggling 2FA: ' + error.message);
    } finally {
      setToggling2FA(false);
    }
  };

  return (
    <div className="border-0 shadow-soft mb-4">
      <div className="card-body p-3 p-md-4">
        <h5 className="mb-4">Security Settings</h5>

        {/* Security Score & Recommendations */}
        <div
          className="card border-0 mb-4"
          style={{
            background: 'linear-gradient(135deg, #0b1220 0%, #1a2332 100%)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <div className="card-body p-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div>
                <h6 className="mb-1 text-light">Account Security Dashboard</h6>
                <small className="text-muted">
                  Real-time security assessment of your account
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

            {/* Security Recommendations */}
            {recommendations.length > 0 && (
              <div className="mt-4 pt-3 border-top border-secondary">
                <h6 className="text-light mb-2">Security Recommendations</h6>
                <div className="row g-2">
                  {recommendations.slice(0, 3).map(rec => (
                    <div key={rec.id} className="col-md-4">
                      <div className={`alert alert-${rec.severity} mb-0 py-2`}>
                        <i className={`bi bi-exclamation-triangle me-1`}></i>
                        <small>{rec.title}</small>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Two-Factor Authentication */}
        <div className="card border-0 mb-4" style={{ background: 'linear-gradient(135deg, #0b1220 0%, #1a2332 100%)' }}>
          <div className="card-body p-4">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <h6 className="text-light mb-1">Two-Factor Authentication</h6>
                <small className="text-muted">
                  Add an extra layer of security to your account
                </small>
              </div>
              <div className="form-check form-switch">
                <input
                  className="form-check-input"
                  type="checkbox"
                  role="switch"
                  id="2faSwitch"
                  checked={has2FA}
                  onChange={toggle2FA}
                  disabled={toggling2FA}
                  style={{ width: '3em', height: '1.5em' }}
                />
                <label className="form-check-label text-light ms-2" htmlFor="2faSwitch">
                  {has2FA ? 'Enabled' : 'Disabled'}
                </label>
              </div>
            </div>
            {toggling2FA && (
              <div className="text-center mt-3">
                <div className="spinner-border spinner-border-sm text-info"></div>
                <small className="text-muted ms-2">Updating 2FA settings...</small>
              </div>
            )}
            <div className="mt-3">
              <small className="text-muted">
                <i className="bi bi-info-circle me-1"></i>
                {has2FA 
                  ? '2FA is protecting your account. You\'ll need a verification code from your authenticator app when logging in.'
                  : 'Enable 2FA to require a verification code in addition to your password.'}
              </small>
            </div>
          </div>
        </div>

        {/* Password */}
        <div className="rounded p-4 mb-4 border border-secondary border-opacity-25">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h6 className="mb-1">Password Security</h6>
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

          <div className="mt-3">
            <small className="text-muted">
              <i className="bi bi-info-circle me-1" />
              Last password change:{' '}
              {savedAt ? savedAt.toLocaleDateString() : 'Never'}
            </small>
          </div>
        </div>

        {/* Sessions */}
        <div className="border border-secondary border-opacity-25 rounded p-4 mb-4">
          <h6 className="mb-3">Active Sessions & Devices</h6>
          <DeviceSessionManager userId={user?.uid} />
        </div>

        {/* Security Actions */}
        <div className="border border-secondary border-opacity-25 rounded p-4">
          <h6 className="mb-3">Security Actions & Reporting</h6>

          <div className="row g-3">
            <div className="col-md-6">
              <LogoutAllSessions userId={user?.uid} />
            </div>
            <div className="col-md-6">
              <ReportSuspiciousActivity userId={user?.uid} />
            </div>
          </div>

          {/* Security Audit Info */}
          <div className="mt-4 pt-3 border-top">
            <h6 className="mb-2">Security Audit & Monitoring</h6>
            <div className="row g-3">
              <div className="col-md-4">
                <div className="card border-0 bg-dark text-center h-100">
                  <div className="card-body p-3">
                    <i className="bi bi-shield-lock fs-3 text-info mb-2"></i>
                    <h6 className='text-light d-block'>Real-time Monitoring</h6>
                    <small className="text-muted">24/7 activity tracking</small>
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="card border-0 bg-dark text-center h-100">
                  <div className="card-body p-3">
                    <i className="bi bi-clock-history fs-3 text-success mb-2"></i>
                    <h6 className='text-light d-block'>90-Day Logs</h6>
                    <small className="text-muted">Tamper-proof audit trail</small>
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="card border-0 bg-dark text-center h-100">
                  <div className="card-body p-3">
                    <i className="bi bi-bell fs-3 text-warning mb-2"></i>
                    <h6 className='text-light d-block'>Instant Alerts</h6>
                    <small className="text-muted">Suspicious activity alerts</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

 

<div className="card border-info border border-opacity-25 mt-4">
  <div className="card-body p-4">
    <div className="d-flex align-items-center">
      <div className="bg-info bg-opacity-10 p-3 rounded-circle me-3">
        <i className="bi bi-flag fs-4 text-info"></i>
      </div>
      <div className="flex-grow-1">
        <h6 className="mb-1">View Your Security Reports</h6>
        <p className="text-muted mb-2">Check the status of your submitted suspicious activity reports</p>
        <button 
          className="btn btn-outline-info btn-sm"
          onClick={() => window.location.hash = '#reports'}
        >
          <i className="bi bi-eye me-1"></i>
          View Reports
        </button>
      </div>
    </div>
  </div>
</div>
      </div>
    </div>
  );
};

export default SecuritySettings;