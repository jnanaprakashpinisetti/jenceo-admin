import React, { useState, useEffect } from 'react';
import { activityService } from './ActivityService';
import { securityService } from './SecurityService';

const SecurityInsights = ({ userId }) => {
  const [insights, setInsights] = useState({
    securityScore: 0,
    totalLogins: 0,
    uniqueDevices: 0,
    uniqueLocations: 0,
    suspiciousActivities: 0,
    lastSecurityReview: null,
    failedAttempts: 0,
    activeSessions: 0
  });
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState([]);

  useEffect(() => {
    loadInsights();
  }, [userId]);

  const loadInsights = async () => {
    setLoading(true);
    try {
      const [userActivities, securityData] = await Promise.all([
        activityService.getUserActivities(userId, 50),
        securityService.getUserSecurityData(userId)
      ]);

      setActivities(userActivities);

      // Calculate insights
      const uniqueDevices = new Set(userActivities.map(a => a.userAgent));
      const uniqueLocations = new Set(userActivities.map(a => `${a.city}, ${a.country}`));
      const suspiciousActivities = userActivities.filter(a => a.status === 'SUSPICIOUS').length;
      
      const failedAttempts = securityData.failedAttempts || 0;
      const activeSessions = securityData.activeSessions || 0;
      
      // Calculate security score
      let score = 100;
      if (failedAttempts > 0) score -= failedAttempts * 5;
      if (suspiciousActivities > 0) score -= suspiciousActivities * 10;
      if (uniqueDevices.size > 3) score -= 15;
      if (uniqueLocations.size > 2) score -= 10;
      if (activeSessions > 1) score -= 10; // Penalize multiple active sessions

      setInsights({
        securityScore: Math.max(0, score),
        totalLogins: userActivities.length,
        uniqueDevices: uniqueDevices.size,
        uniqueLocations: uniqueLocations.size,
        suspiciousActivities,
        lastSecurityReview: securityData.lastReview || new Date(),
        failedAttempts,
        activeSessions
      });
    } catch (error) {
      console.error('Error loading insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const getInsightCard = (title, value, icon, color, description) => (
    <div className="col-md-3 mb-4">
      <div className="card h-100 border-0" style={{ background: `linear-gradient(135deg, ${color}15 0%, ${color}05 100%)` }}>
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-start">
            <div>
              <h6 className="text-muted mb-1">{title}</h6>
              <h3 className={`text-${color}`}>{value}</h3>
              <small className="text-muted">{description}</small>
            </div>
            <div className={`rounded-circle p-3 bg-${color} bg-opacity-10`}>
              <i className={`bi ${icon} text-${color}`}></i>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-info" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className=" border-0 shadow-soft">
      <div className="card-body p-4">
        <h5 className="mb-4">
          <i className="bi bi-shield-check me-2 text-primary"></i>
          Security & Activity Insights
        </h5>

        {/* Introduction */}
        <div className="alert alert-info text-info mb-4">
          <div className="d-flex">
            <i className="bi bi-info-circle me-3 fs-4"></i>
            <div>
              <h6 className="alert-heading">Understanding Your Security Dashboard</h6>
              <p className="mb-0 small">
                This dashboard shows how we protect your account. We track login activity to detect suspicious behavior and keep your data safe. All tracking is transparent and you can review everything here.
              </p>
            </div>
          </div>
        </div>

        {/* Security Overview Cards */}
        <div className="row mb-4">
          {getInsightCard(
            'Security Score',
            `${insights.securityScore}/100`,
            'bi-shield-check',
            insights.securityScore >= 80 ? 'success' : insights.securityScore >= 60 ? 'warning' : 'danger',
            'Based on password, 2FA, and activity'
          )}
          
          {getInsightCard(
            'Total Logins',
            insights.totalLogins,
            'bi-box-arrow-in-right',
            'info',
            'Successful login attempts'
          )}
          
          {getInsightCard(
            'Active Sessions',
            insights.activeSessions,
            'bi-person-check',
            insights.activeSessions <= 1 ? 'success' : 'warning',
            'Current active sessions'
          )}
          
          {getInsightCard(
            'Unique Devices',
            insights.uniqueDevices,
            'bi-phone',
            insights.uniqueDevices <= 3 ? 'success' : 'warning',
            'Different devices used'
          )}
        </div>

        {/* How We Protect You */}
        <div className="card border-0 bg-light mb-4">
          <div className="card-body p-4">
            <h6 className="mb-3">
              <i className="bi bi-shield-lock me-2"></i>
              How We Protect Your Account
            </h6>
            <div className="row">
              <div className="col-md-6">
                <ul className="list-unstyled text-center">
                  <li className="mb-3">
                    <i className="bi bi-check-circle-fill text-success me-2"></i>
                    <strong>Real-time Monitoring:</strong> We track every login in real-time
                  </li>
                  <li className="mb-3">
                    <i className="bi bi-check-circle-fill text-success me-2"></i>
                    <strong>Device Recognition:</strong> We remember your trusted devices
                  </li>
                  <li className="mb-3">
                    <i className="bi bi-check-circle-fill text-success me-2"></i>
                    <strong>Session Management:</strong> Track and manage active sessions
                  </li>
                </ul>
              </div>
              <div className="col-md-6">
                <ul className="list-unstyled">
                  <li className="mb-3">
                    <i className="bi bi-check-circle-fill text-success me-2"></i>
                    <strong>Suspicious Activity Detection:</strong> Alerts for new devices/locations
                  </li>
                  <li className="mb-3">
                    <i className="bi bi-check-circle-fill text-success me-2"></i>
                    <strong>Automatic Logout:</strong> After password changes for security
                  </li>
                  <li className="mb-3">
                    <i className="bi bi-check-circle-fill text-success me-2"></i>
                    <strong>Read-Only Logs:</strong> Audit logs cannot be deleted
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* What We Track */}
        <div className="card border-0 mb-4" style={{ background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)' }}>
          <div className="card-body p-4">
            <h6 className="mb-3">
              <i className="bi bi-eye me-2"></i>
              What Data We Track (Transparently)
            </h6>
            <div className="row">
              <div className="col-md-4 mb-3">
                <div className="card border">
                  <div className="card-body text-center">
                    <i className="bi bi-globe fs-1 text-primary mb-2"></i>
                    <h6 className='d-block'>Location Data</h6>
                    <small className="text-muted">Country, city from IP for security alerts</small>
                  </div>
                </div>
              </div>
              <div className="col-md-4 mb-3">
                <div className="card border">
                  <div className="card-body text-center">
                    <i className="bi bi-pc-display fs-1 text-info mb-2"></i>
                    <h6 className='d-block'>Device Info</h6>
                    <small className="text-muted">Browser, OS, device type for recognition</small>
                  </div>
                </div>
              </div>
              <div className="col-md-4 mb-3">
                <div className="card border">
                  <div className="card-body text-center">
                    <i className="bi bi-clock-history fs-1 text-success mb-2"></i>
                    <h6 className='d-block'>Session Data</h6>
                    <small className="text-muted">Login times and active session tracking</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Suspicious Activity Detection */}
        <div className="card border-danger border-2">
          <div className="card-body p-4">
            <h6 className="mb-3 text-danger">
              <i className="bi bi-exclamation-triangle me-2"></i>
              How We Detect Suspicious Activity
            </h6>
            <div className="row">
              <div className="col-md-6">
                <div className="alert alert-warning">
                  <strong>Multiple Active Sessions:</strong> Alerts when you're logged in from multiple devices
                </div>
              </div>
              <div className="col-md-6">
                <div className="alert alert-warning">
                  <strong>New Device Detection:</strong> We alert you when logging in from a new device
                </div>
              </div>
              <div className="col-md-6">
                <div className="alert alert-warning">
                  <strong>Geographic Anomalies:</strong> Multiple countries in short time trigger alerts
                </div>
              </div>
              <div className="col-md-6">
                <div className="alert alert-warning">
                  <strong>Rapid Successive Logins:</strong> Multiple attempts in short time are blocked
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* System Actions */}
        <div className="mt-4">
          <h6 className="mb-3">
            <i className="bi bi-gear me-2"></i>
            Automatic Security Actions
          </h6>
          <div className="row g-3">
            <div className="col-md-3">
              <div className="card border-success text-center">
                <div className="card-body">
                  <i className="bi bi-door-closed fs-3 text-success mb-2"></i>
                  <h6 className='d-block'>Auto Logout</h6>
                  <small className="text-muted">After password changes</small>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card border-warning text-center">
                <div className="card-body">
                  <i className="bi bi-bell fs-3 text-warning mb-2"></i>
                  <h6 className='d-block'>Email Alerts</h6>
                  <small className="text-muted">For new device logins</small>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card border-info text-center">
                <div className="card-body">
                  <i className="bi bi-shield-exclamation fs-3 text-info mb-2"></i>
                  <h6 className='d-block'>Risk Scoring</h6>
                  <small className="text-muted">Real-time security assessment</small>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card border-danger text-center">
                <div className="card-body">
                  <i className="bi bi-x-octagon fs-3 text-danger mb-2"></i>
                  <h6 className='d-block'>Session Control</h6>
                  <small className="text-muted">Manage active sessions</small>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Last Updated */}
        <div className="text-center mt-4">
          <small className="text-muted">
            <i className="bi bi-clock-history me-1"></i>
            Last security review: {new Date(insights.lastSecurityReview).toLocaleDateString()} • 
            Insights update in real-time
          </small>
        </div>
      </div>
    </div>
  );
};

export default SecurityInsights;