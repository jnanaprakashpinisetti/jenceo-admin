import React, { useState, useEffect } from 'react';
import { activityService } from './ActivityService';
import { securityService } from './SecurityService';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const DeviceSessionManager = ({ userId }) => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentSessionId, setCurrentSessionId] = useState('');
  const [terminatingSession, setTerminatingSession] = useState(null);
  
  const { logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadSessions();
    // Get current session ID from multiple possible locations
    const sessionId = sessionStorage.getItem('currentSessionId') || 
                     localStorage.getItem('currentSessionId') || 
                     document.cookie.match(/(?:^|; )currentSessionId=([^;]*)/)?.[1] || 
                     Math.random().toString(36).substring(2) + Date.now().toString(36);
    setCurrentSessionId(sessionId);
  }, [userId]);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const userSessions = await activityService.getUserActivities(userId, 100);
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

  const terminateSession = async (sessionId, sessionData) => {
    if (!window.confirm(`Are you sure you want to terminate this session?\n\nDevice: ${sessionData.deviceInfo?.browser || 'Unknown'} on ${sessionData.deviceInfo?.os || 'Unknown'}\nLocation: ${sessionData.city || 'Unknown'}, ${sessionData.country || 'Unknown'}`)) return;
    
    setTerminatingSession(sessionId);
    try {
      const result = await securityService.terminateSession(userId, sessionId);
      
      if (result.success) {
        // Update local state
        setSessions(prev => prev.filter(session => session.sessionId !== sessionId));
        
        // Show success message
        alert('Session terminated successfully!');
        
        // If terminating current session, log out
        if (sessionId === currentSessionId) {
          // Log security event
          await securityService.logSecurityEvent({
            type: 'CURRENT_SESSION_TERMINATED',
            userId,
            sessionId,
            severity: 'HIGH'
          });
          
          // Clear session storage
          sessionStorage.removeItem('currentSessionId');
          localStorage.removeItem('currentSessionId');
          localStorage.removeItem('authToken');
          sessionStorage.removeItem('authToken');
          
          // Set a cookie to expire
          document.cookie = "currentSessionId=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
          document.cookie = "authToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
          
          // Use the auth context logout function
          try {
            await logout();
            navigate('/login?message=session_terminated');
          } catch (error) {
            console.error('Error during logout:', error);
            navigate('/login?message=session_terminated');
          }
        }
      } else {
        alert('Error terminating session: ' + result.error);
      }
    } catch (error) {
      alert('Error terminating session: ' + error.message);
    } finally {
      setTerminatingSession(null);
    }
  };

  const terminateAllOtherSessions = async () => {
    if (!window.confirm('Terminate all other sessions? You will stay logged in on this device.')) return;
    
    try {
      const result = await securityService.terminateAllOtherSessions(userId, currentSessionId);
      
      if (result.success) {
        // Keep only current session
        setSessions(prev => prev.filter(session => session.sessionId === currentSessionId));
        
        // Log security event
        await securityService.logSecurityEvent({
          type: 'ALL_OTHER_SESSIONS_TERMINATED',
          userId,
          currentSessionId,
          terminatedCount: sessions.length - 1,
          severity: 'HIGH'
        });
        
        alert('All other sessions terminated successfully!');
      } else {
        alert('Error terminating sessions: ' + result.error);
      }
    } catch (error) {
      alert('Error terminating sessions: ' + error.message);
    }
  };

  const trustDevice = async (sessionId) => {
    try {
      const session = sessions.find(s => s.sessionId === sessionId);
      if (session) {
        // Extract device info from userAgent
        const deviceInfo = securityService.parseUserAgent(session.userAgent);
        
        // Log trusting action
        await securityService.logSecurityEvent({
          type: 'DEVICE_MANUALLY_TRUSTED',
          userId,
          sessionId,
          deviceInfo,
          severity: 'LOW'
        });
        
        alert('Device marked as trusted!');
        await loadSessions(); // Refresh to update UI
      }
    } catch (error) {
      console.error('Error trusting device:', error);
      alert('Error trusting device: ' + error.message);
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
    
    if (!browser) return 'bi-browser';
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

  const formatRelativeTime = (timestamp) => {
    const now = new Date();
    const activityTime = new Date(timestamp);
    const diffMs = now - activityTime;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return activityTime.toLocaleDateString();
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
          <small className="text-muted">{sessions.length} total sessions • {sessions.filter(s => s.isActive).length} active now</small>
        </div>
        <div className="d-flex gap-2">
          <button
            className="btn btn-outline-info btn-sm"
            onClick={loadSessions}
            title="Refresh sessions"
          >
            <i className="bi bi-arrow-clockwise"></i>
          </button>
          <button
            className="btn btn-outline-danger btn-sm"
            onClick={terminateAllOtherSessions}
            disabled={sessions.filter(s => !s.isCurrent).length === 0}
          >
            <i className="bi bi-power me-1"></i>
            Terminate All Other Sessions
          </button>
        </div>
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
                <tr key={session.id || session.sessionId} className={session.isCurrent ? 'table-primary' : ''}>
                  <td>
                    <div className="d-flex align-items-center">
                      <div className="me-3">
                        <i className={`bi ${getBrowserIcon(session.deviceInfo?.browser)} fs-5 text-info`}></i>
                      </div>
                      <div>
                        <div className="fw-medium">{session.deviceInfo?.browser || 'Unknown'}</div>
                        <small className="text-muted">
                          <i className={`bi ${getDeviceIcon(session.deviceInfo?.deviceType)} me-1`}></i>
                          {session.deviceInfo?.deviceType || 'Unknown'} • {session.deviceInfo?.os || 'Unknown'}
                        </small>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div>
                      <div>{session.city || 'Unknown'}</div>
                      <small className="text-muted">{session.country || 'Unknown'}</small>
                      <small className="d-block text-muted">{session.ipAddress || 'Unknown'}</small>
                    </div>
                  </td>
                  <td>
                    <div>
                      <div>{formatRelativeTime(session.loginTime)}</div>
                      <small className="text-muted">{new Date(session.loginTime).toLocaleDateString()}</small>
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
                    <div className="d-flex gap-2">
                      {!session.isCurrent && (
                        <>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => terminateSession(session.sessionId || session.id, session)}
                            disabled={terminatingSession === (session.sessionId || session.id)}
                            title="Terminate Session"
                          >
                            {terminatingSession === (session.sessionId || session.id) ? (
                              <span className="spinner-border spinner-border-sm"></span>
                            ) : (
                              <i className="bi bi-power"></i>
                            )}
                          </button>
                          <button
                            className="btn btn-sm btn-outline-info"
                            onClick={() => trustDevice(session.sessionId || session.id)}
                            title="Mark as Trusted Device"
                          >
                            <i className="bi bi-shield-check"></i>
                          </button>
                        </>
                      )}
                      {session.isCurrent && (
                        <span className="text-muted small">Current session</span>
                      )}
                    </div>
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
              <strong>Session Security:</strong> Each login creates a new session. You can terminate suspicious sessions here. Terminating the current session will log you out. "Terminate All Other Sessions" will keep only this device active.
            </small>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeviceSessionManager;