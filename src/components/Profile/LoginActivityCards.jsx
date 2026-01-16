import React, { useState, useEffect } from 'react';
import { activityService } from './ActivityService';
import { securityService } from './SecurityService';

const LoginActivityCards = ({ userId, onViewFullLog }) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentSessionId, setCurrentSessionId] = useState('');

  useEffect(() => {
    loadActivities();
    setCurrentSessionId(sessionStorage.getItem('currentSessionId') || '');
  }, [userId]);

  const loadActivities = async () => {
    setLoading(true);
    try {
      const userActivities = await activityService.getUserActivities(userId, 5);
      const enhancedActivities = await Promise.all(
        userActivities.map(async (activity) => ({
          ...activity,
          deviceInfo: securityService.parseUserAgent(activity.userAgent),
          isSuspicious: await checkSuspiciousActivity(activity)
        }))
      );
      setActivities(enhancedActivities);
    } catch (error) {
      console.error('Error loading activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkSuspiciousActivity = async (activity) => {
    const recentActivities = await activityService.getUserActivities(userId, 10);
    const uniqueDevices = new Set(recentActivities.map(a => a.userAgent));
    const uniqueLocations = new Set(recentActivities.map(a => a.country));
    
    return uniqueDevices.size > 3 || uniqueLocations.size > 2;
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

  const formatTime = (timestamp) => {
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

  const getStatusBadge = (activity) => {
    if (activity.sessionId === currentSessionId) {
      return <span className="badge bg-primary"><i className="bi bi-check-circle me-1"></i>Current Session</span>;
    }
    if (activity.isSuspicious) {
      return <span className="badge bg-danger"><i className="bi bi-exclamation-triangle me-1"></i>Suspicious</span>;
    }
    if (new Date(activity.loginTime) > new Date(Date.now() - 3600000)) {
      return <span className="badge bg-success"><i className="bi bi-circle-fill me-1"></i>Active</span>;
    }
    return <span className="badge bg-secondary"><i className="bi bi-clock-history me-1"></i>Expired</span>;
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <div className="spinner-border text-info" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-4">
        <i className="bi bi-clock-history display-4 text-muted mb-3"></i>
        <p className="text-muted">No login activity found</p>
      </div>
    );
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h6 className="mb-0">Recent Login Activity</h6>
        <button 
          className="btn btn-outline-info btn-sm"
          onClick={onViewFullLog}
        >
          <i className="bi bi-list me-1"></i>
          View Full Log
        </button>
      </div>
      
      <div className="row g-3">
        {activities.map((activity) => (
          <div key={activity.id} className="col-md-6">
            <div className={`card h-100 ${activity.isSuspicious ? 'border-danger' : 'border-secondary'}`}>
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <div className="d-flex align-items-center">
                    <div className={`rounded-circle p-2 me-3 ${activity.isSuspicious ? 'bg-danger bg-opacity-10' : 'bg-info bg-opacity-10'}`}>
                      <i className={`bi ${getBrowserIcon(activity.deviceInfo.browser)} text-info`}></i>
                    </div>
                    <div>
                      <h6 className="mb-0">{activity.deviceInfo.browser}</h6>
                      <small className="text-muted">
                        <i className={`bi ${getDeviceIcon(activity.deviceInfo.deviceType)} me-1`}></i>
                        {activity.deviceInfo.deviceType}
                      </small>
                    </div>
                  </div>
                  {getStatusBadge(activity)}
                </div>
                
                <div className="mb-3">
                  <small className="text-muted d-block">
                    <i className="bi bi-globe me-1"></i>
                    {activity.city}, {activity.country}
                  </small>
                  <small className="text-muted d-block">
                    <i className="bi bi-pc me-1"></i>
                    {activity.deviceInfo.os}
                  </small>
                  <small className="text-muted d-block">
                    <i className="bi bi-clock me-1"></i>
                    {formatTime(activity.loginTime)}
                  </small>
                </div>
                
                <div className="d-flex justify-content-between">
                  <small className="text-muted">
                    <i className="bi bi-ip me-1"></i>
                    {activity.ipAddress}
                  </small>
                  <small className="text-muted">
                    {activity.loginMethod || 'Password'}
                  </small>
                </div>
                
                {activity.isSuspicious && (
                  <div className="alert alert-danger alert-sm mt-3 mb-0 py-2">
                    <i className="bi bi-exclamation-triangle me-1"></i>
                    New device or location detected
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LoginActivityCards;