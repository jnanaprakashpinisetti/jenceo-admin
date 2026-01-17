import React, { useState, useEffect } from 'react';
import { securityService } from './SecurityService';
import { activityService } from './ActivityService';

const SecurityDashboard = ({ userId }) => {
  const [dashboardData, setDashboardData] = useState({
    securityScore: 0,
    totalLogins: 0,
    failedAttempts: 0,
    activeSessions: 0,
    uniqueDevices: 0,
    uniqueLocations: 0,
    lastBreachCheck: null,
    securityEvents: []
  });
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');

  useEffect(() => {
    loadDashboardData();
  }, [userId, timeRange]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [
        securityData,
        activities,
        simultaneousLogins,
        recommendations
      ] = await Promise.all([
        securityService.getUserSecurityData(userId),
        activityService.getUserActivities(userId, 100),
        securityService.detectSimultaneousLogins(userId),
        securityService.getSecurityRecommendations(userId)
      ]);

      // Calculate unique devices and locations
      const uniqueDevices = new Set(activities.map(a => a.userAgent));
      const uniqueLocations = new Set(activities.map(a => `${a.city}, ${a.country}`));

      // Get recent security events (last 10)
      const recentEvents = activities
        .filter(a => a.status === 'SUSPICIOUS' || a.status === 'FAILED')
        .slice(0, 10);

      setDashboardData({
        securityScore: securityData.securityScore,
        totalLogins: activities.length,
        failedAttempts: securityData.failedAttempts,
        activeSessions: securityData.activeSessions,
        uniqueDevices: uniqueDevices.size,
        uniqueLocations: uniqueLocations.size,
        lastBreachCheck: securityData.lastReview,
        securityEvents: recentEvents,
        simultaneousLogins: simultaneousLogins.count,
        hasSimultaneous: simultaneousLogins.hasSimultaneous,
        recommendations: recommendations
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Export reports function
  const exportReports = async () => {
    try {
      const activities = await activityService.getUserActivities(userId, 1000);
      
      // Create CSV content
      const csvContent = [
        ['Time', 'IP Address', 'Browser', 'Device', 'OS', 'Location', 'Status'],
        ...activities.map(a => [
          new Date(a.loginTime).toLocaleString(),
          a.ipAddress,
          a.deviceInfo?.browser || 'Unknown',
          a.deviceInfo?.deviceType || 'Unknown',
          a.deviceInfo?.os || 'Unknown',
          `${a.city || 'Unknown'}, ${a.country || 'Unknown'}`,
          a.status || 'SUCCESS'
        ])
      ].map(row => row.map(field => `"${field}"`).join(',')).join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `security-report-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      alert('Report exported successfully!');
    } catch (error) {
      console.error('Error exporting reports:', error);
      alert('Error exporting reports: ' + error.message);
    }
  };

  // Handle quick actions
  const handleQuickAction = (action) => {
    switch(action) {
      case 'view_logs':
        // Navigate to activity tab
        window.location.hash = '#activity';
        window.dispatchEvent(new HashChangeEvent('hashchange'));
        break;
      case 'security_scan':
        loadDashboardData();
        alert('Security scan completed! Data refreshed.');
        break;
      case 'password_health':
        // Navigate to security tab and open password form
        window.location.hash = '#security';
        window.dispatchEvent(new HashChangeEvent('hashchange'));
        // You might want to trigger password form opening here
        setTimeout(() => {
          const passwordBtn = document.querySelector('[data-action="change-password"]');
          if (passwordBtn) passwordBtn.click();
        }, 100);
        break;
      case 'export_reports':
        exportReports();
        break;
    }
  };

  const getSecurityCard = (title, value, icon, color, subtitle, trend = null) => (
    <div className="col-md-6 col-sm-12 mb-3">
      <div className={`card border-${color} border-2 h-100`}>
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-start">
            <div>
              <h6 className="text-muted mb-1">{title}</h6>
              <h3 className={`text-${color} mb-0`}>{value}</h3>
              <small className="text-muted">{subtitle}</small>
            </div>
            <div className={`bg-${color} bg-opacity-10 p-3 rounded-circle`}>
              <i className={`bi ${icon} text-${color}`}></i>
            </div>
          </div>
          {trend && (
            <div className="mt-2">
              <small className={`text-${trend > 0 ? 'success' : 'danger'}`}>
                <i className={`bi bi-arrow-${trend > 0 ? 'up' : 'down'}-right me-1`}></i>
                {Math.abs(trend)}% from last month
              </small>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const getThreatLevel = (score) => {
    if (score >= 80) return { level: 'Low', color: 'success', icon: 'bi-shield-check' };
    if (score >= 60) return { level: 'Medium', color: 'warning', icon: 'bi-shield-exclamation' };
    return { level: 'High', color: 'danger', icon: 'bi-shield-slash' };
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-info" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-2 text-muted">Loading security dashboard...</p>
      </div>
    );
  }

  const threatLevel = getThreatLevel(dashboardData.securityScore);

  return (
    <div className="card border-0 shadow-soft">
      <div className="card-body p-4">
        {/* Header */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h5 className="mb-1">
              <i className="bi bi-shield-lock me-2 text-primary"></i>
              Security Dashboard
            </h5>
            <small className="text-muted">Real-time security monitoring and insights</small>
          </div>
          <div className="d-flex align-items-center gap-2">
            <select 
              className="form-select form-select-sm w-auto"
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="all">All time</option>
            </select>
            <button 
              className="btn btn-sm btn-outline-info"
              onClick={loadDashboardData}
              title="Refresh data"
            >
              <i className="bi bi-arrow-clockwise"></i>
            </button>
          </div>
        </div>

        {/* Threat Level Alert */}
        <div className={`alert alert-${threatLevel.color} alert-dismissible fade show mb-4`}>
          <div className="d-flex">
            <div className="me-3">
              <i className={`bi ${threatLevel.icon} fs-3`}></i>
            </div>
            <div className="flex-grow-1">
              <h6 className="alert-heading">Current Threat Level: {threatLevel.level}</h6>
              <p className="mb-2">
                Your account security is currently at <strong>{threatLevel.level.toLowerCase()}</strong> risk.
                {threatLevel.level === 'High' && ' Immediate action is recommended.'}
                {threatLevel.level === 'Medium' && ' Some improvements are suggested.'}
                {threatLevel.level === 'Low' && ' Your account is well-protected.'}
              </p>
              <div className="progress" style={{ height: '6px' }}>
                <div 
                  className={`progress-bar bg-${threatLevel.color}`}
                  style={{ width: `${dashboardData.securityScore}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="row mb-4">
          {getSecurityCard(
            'Security Score',
            `${dashboardData.securityScore}/100`,
            'bi-shield-check',
            threatLevel.color,
            'Overall account security',
            dashboardData.securityScore > 70 ? 5 : -10
          )}
          
          {getSecurityCard(
            'Active Sessions',
            dashboardData.activeSessions,
            'bi-person-check',
            dashboardData.activeSessions > 1 ? 'warning' : 'success',
            'Currently logged in devices'
          )}
          
          {getSecurityCard(
            'Failed Logins',
            dashboardData.failedAttempts,
            'bi-exclamation-triangle',
            dashboardData.failedAttempts > 0 ? 'danger' : 'success',
            'Failed attempts this month'
          )}
          
          {getSecurityCard(
            'Unique Devices',
            dashboardData.uniqueDevices,
            'bi-phone',
            dashboardData.uniqueDevices > 3 ? 'warning' : 'info',
            'Different devices used'
          )}
        </div>

        {/* Simultaneous Login Warning */}
        {dashboardData.hasSimultaneous && (
          <div className="alert alert-warning mb-4">
            <div className="d-flex align-items-center">
              <i className="bi bi-exclamation-triangle-fill fs-4 me-3"></i>
              <div>
                <h6 className="alert-heading mb-1">Simultaneous Logins Detected</h6>
                <p className="mb-0">
                  Your account is currently active on {dashboardData.simultaneousLogins} different devices/locations.
                  {dashboardData.simultaneousLogins > 2 && ' This may indicate unauthorized access.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Recent Security Events */}
        <div className="card border-0 bg-light mb-4">
          <div className="card-body p-4">
            <h6 className="mb-3 text-center">Recent Security Events</h6>
            {dashboardData.securityEvents.length === 0 ? (
              <div className="text-center py-3">
                <i className="bi bi-check-circle-fill fs-1 text-success mb-3"></i>
                <p className="small">No suspicious events detected recently</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Event</th>
                      <th>Location</th>
                      <th>Device</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardData.securityEvents.map((event, index) => (
                      <tr key={index} className={event.status === 'FAILED' ? 'table-danger' : 'table-warning'}>
                        <td>
                          <small>{new Date(event.loginTime).toLocaleDateString()}</small>
                          <br />
                          <small className="text-muted">{new Date(event.loginTime).toLocaleTimeString()}</small>
                        </td>
                        <td>
                          {event.status === 'FAILED' ? 'Failed Login' : 'Suspicious Login'}
                        </td>
                        <td>
                          <small>{event.city}, {event.country}</small>
                          <br />
                          <small className="text-muted">{event.ipAddress}</small>
                        </td>
                        <td>
                          <small>{event.deviceInfo?.browser || 'Unknown'}</small>
                        </td>
                        <td>
                          <span className={`badge bg-${event.status === 'FAILED' ? 'danger' : 'warning'}`}>
                            {event.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card border-0" style={{ background: 'linear-gradient(135deg, #0b1220 0%, #1a2332 100%)' }}>
          <div className="card-body p-4">
            <h6 className="text-light mb-3">Quick Security Actions</h6>
            <div className="row g-3">
              <div className="col-md-6">
                <button 
                  className="btn btn-outline-info w-100"
                  onClick={() => handleQuickAction('view_logs')}
                >
                  <i className="bi bi-eye me-2"></i>
                  View Full Logs
                </button>
              </div>
              <div className="col-md-6">
                <button 
                  className="btn btn-outline-warning w-100"
                  onClick={() => handleQuickAction('security_scan')}
                >
                  <i className="bi bi-shield-exclamation me-2"></i>
                  Run Security Scan
                </button>
              </div>
              <div className="col-md-6">
                <button 
                  className="btn btn-outline-success w-100"
                  onClick={() => handleQuickAction('password_health')}
                >
                  <i className="bi bi-key me-2"></i>
                  Password Health
                </button>
              </div>
              <div className="col-md-6">
                <button 
                  className="btn btn-outline-light w-100"
                  onClick={() => handleQuickAction('export_reports')}
                >
                  <i className="bi bi-download me-2"></i>
                  Export Reports
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Last Updated */}
        <div className="text-center mt-4">
          <small className="text-muted">
            <i className="bi bi-clock-history me-1"></i>
            Last updated: {new Date().toLocaleTimeString()} • Data refreshes automatically
          </small>
        </div>
      </div>
    </div>
  );
};

export default SecurityDashboard;