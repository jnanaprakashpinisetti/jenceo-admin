import React, { useState, useEffect } from 'react';
import { activityService } from './ActivityService';
import { securityService } from './SecurityService';

const DeviceSessionManager = ({ userId }) => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentSessionId, setCurrentSessionId] = useState('');

  useEffect(() => {
    loadSessions();
    setCurrentSessionId(sessionStorage.getItem('currentSessionId') || '');
  }, [userId]);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const userSessions = await activityService.getUserSessions(userId);
      const enhancedSessions = await Promise.all(
        userSessions.map(async (session) => ({
          ...session,
          deviceInfo: securityService.parseUserAgent(session.userAgent),
          isCurrent: session.sessionId === currentSessionId,
          isActive: new Date(session.loginTime) > new Date(Date.now() - 3600000)
        }))
      );
      setSessions(enhancedSessions);
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const terminateSession = async (sessionId) => {
    if (!window.confirm('Are you sure you want to terminate this session?')) return;
    
    try {
      await securityService.terminateSession(userId, sessionId);
      await loadSessions();
      
      // If terminating current session, log out
      if (sessionId === currentSessionId) {
        window.location.href = '/login?message=session_terminated';
      }
    } catch (error) {
      alert('Error terminating session: ' + error.message);
    }
  };

  const terminateAllOtherSessions = async () => {
    if (!window.confirm('Terminate all other sessions? You will stay logged in on this device.')) return;
    
    try {
      await securityService.terminateAllOtherSessions(userId, currentSessionId);
      await loadSessions();
    } catch (error) {
      alert('Error terminating sessions: ' + error.message);
    }
  };

  const getBrowserIcon = (browser) => {
    const browserMap = {
      'chrome': 'bi-browser-chrome',
      'firefox': 'bi-browser-firefox',
      'safari': 'bi-browser-safari',
      'edge': 'bi-browser-edge',
      'opera': 'bi-browser-opera'
    };
    
    const lowerBrowser = browser.toLowerCase();
    for (const [key, value] of Object.entries(browserMap)) {
      if (lowerBrowser.includes(key)) return value;
    }
    return 'bi-browser';
  };

  const getDeviceIcon = (deviceType) => {
    const iconMap = {
      'Mobile': 'bi-phone',
      'Tablet': 'bi-tablet',
      'Desktop': 'bi-pc',
      'Unknown': 'bi-question-circle'
    };
    return iconMap[deviceType] || 'bi-question-circle';
  };

  if (loading) {
    return (
      <div className="text-center py-3">
        <div className="spinner-border spinner-border-sm text-info" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h6 className="mb-0">Active Sessions</h6>
          <small className="text-muted">{sessions.length} total sessions</small>
        </div>
        <button
          className="btn btn-outline-danger btn-sm"
          onClick={terminateAllOtherSessions}
          disabled={sessions.filter(s => !s.isCurrent).length === 0}
        >
          <i className="bi bi-power me-1"></i>
          Terminate All Other Sessions
        </button>
      </div>

      {sessions.length === 0 ? (
        <div className="text-center py-3">
          <i className="bi bi-pc-display-horizontal fs-1 text-muted"></i>
          <p className="text-muted mt-2">No active sessions found</p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table table-hover">
            <thead>
              <tr>
                <th>Device</th>
                <th>Location</th>
                <th>Last Active</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session) => (
                <tr key={session.sessionId} className={session.isCurrent ? 'table-primary' : ''}>
                  <td>
                    <div className="d-flex align-items-center">
                      <div className="me-3">
                        <i className={`bi ${getBrowserIcon(session.deviceInfo.browser)} fs-5 text-info`}></i>
                      </div>
                      <div>
                        <div className="fw-medium">{session.deviceInfo.browser}</div>
                        <small className="text-muted">
                          <i className={`bi ${getDeviceIcon(session.deviceInfo.deviceType)} me-1`}></i>
                          {session.deviceInfo.deviceType} • {session.deviceInfo.os}
                        </small>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div>
                      <div>{session.city}</div>
                      <small className="text-muted">{session.country}</small>
                    </div>
                  </td>
                  <td>
                    <div>
                      <div>{new Date(session.loginTime).toLocaleDateString()}</div>
                      <small className="text-muted">{new Date(session.loginTime).toLocaleTimeString()}</small>
                    </div>
                  </td>
                  <td>
                    {session.isCurrent ? (
                      <span className="badge bg-primary">
                        <i className="bi bi-check-circle me-1"></i>Current
                      </span>
                    ) : session.isActive ? (
                      <span className="badge bg-success">
                        <i className="bi bi-circle-fill me-1"></i>Active
                      </span>
                    ) : (
                      <span className="badge bg-secondary">
                        <i className="bi bi-clock-history me-1"></i>Expired
                      </span>
                    )}
                  </td>
                  <td>
                    {!session.isCurrent && (
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => terminateSession(session.sessionId)}
                        title="Terminate Session"
                      >
                        <i className="bi bi-power"></i>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="alert alert-info text-info mt-3">
        <div className="d-flex">
          <i className="bi bi-info-circle me-2"></i>
          <div>
            <small>
              <strong>Session Security:</strong> Each login creates a new session. You can terminate suspicious sessions here. Terminating the current session will log you out.
            </small>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeviceSessionManager;