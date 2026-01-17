import React, { useState } from 'react';
import { securityService } from './SecurityService';

const ReportSuspiciousActivity = ({ userId, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    activityType: 'UNKNOWN_LOGIN',
    description: '',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    location: '',
    deviceInfo: '',
    urgency: 'MEDIUM'
  });
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [reportId, setReportId] = useState('');

  const activityTypes = [
    { value: 'UNKNOWN_LOGIN', label: 'Unknown Login Attempt' },
    { value: 'SUSPICIOUS_IP', label: 'Suspicious IP Address' },
    { value: 'UNRECOGNIZED_DEVICE', label: 'Unrecognized Device' },
    { value: 'UNUSUAL_LOCATION', label: 'Unusual Location' },
    { value: 'PASSWORD_RESET_ATTEMPT', label: 'Unauthorized Password Reset' },
    { value: 'MULTIPLE_FAILED_ATTEMPTS', label: 'Multiple Failed Login Attempts' },
    { value: 'OTHER', label: 'Other Suspicious Activity' }
  ];

  const urgencyLevels = [
    { value: 'LOW', label: 'Low - Just monitoring', color: 'info' },
    { value: 'MEDIUM', label: 'Medium - Needs attention', color: 'warning' },
    { value: 'HIGH', label: 'High - Immediate action needed', color: 'danger' },
    { value: 'CRITICAL', label: 'Critical - Account may be compromised', color: 'danger' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const reportData = {
        ...formData,
        reportedAt: new Date().toISOString(),
        userId,
        status: 'SUBMITTED'
      };

      const result = await securityService.reportSuspiciousActivity(userId, reportData);

      if (result.success) {
        setReportId(result.reportId);
        setReportSubmitted(true);
        
        // Reset form
        setFormData({
          activityType: 'UNKNOWN_LOGIN',
          description: '',
          date: new Date().toISOString().split('T')[0],
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          location: '',
          deviceInfo: '',
          urgency: 'MEDIUM'
        });
      } else {
        alert('Error submitting report: ' + result.error);
      }
    } catch (error) {
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (reportSubmitted) {
    return (
      <div className="border rounded p-4 border-success border-2">
        <div className="text-center">
          <div className="bg-success bg-opacity-10 p-4 rounded-circle d-inline-flex mb-3">
            <i className="bi bi-check-circle-fill fs-1 text-success"></i>
          </div>
          <h5 className="text-success mb-2">Report Submitted Successfully!</h5>
          <p className="text-muted">
            Your suspicious activity report has been logged and our security team will review it.
          </p>
          <div className="alert alert-info text-info mt-3">
            <small>
              <i className="bi bi-info-circle me-1"></i>
              <strong>Report ID:</strong> {reportId}
            </small>
          </div>
          <div className="d-flex gap-2 mt-3">
            <button 
              className="btn btn-outline-secondary flex-grow-1"
              onClick={() => {
                setReportSubmitted(false);
                setShowForm(false);
                if (onClose) onClose();
              }}
            >
              Close
            </button>
            <button 
              className="btn btn-outline-warning flex-grow-1"
              onClick={() => {
                setReportSubmitted(false);
                setShowForm(true);
              }}
            >
              Report Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!showForm) {
    return (
      <div className="bg-warning  bg-opacity-10 rounded p-4 h-100">
        <div className="d-flex align-items-center mb-3">
          <div className="bg-warning bg-opacity-10 p-3 rounded-circle me-3">
            <i className="bi bi-exclamation-triangle fs-4 text-warning"></i>
          </div>
          <div>
            <h6 className="mb-0">Report Suspicious Activity</h6>
            <small className="text-muted">See something unusual? Report it immediately</small>
          </div>
        </div>
        
        <div className="alert alert-warning">
          <p className="mb-2 small">
            If you notice any unusual activity on your account that you don't recognize, report it here immediately. Our security team will investigate.
          </p>
          <ul className="mb-0 small">
            <li>Logins from unknown locations</li>
            <li>Devices you don't recognize</li>
            <li>Failed login attempts you didn't make</li>
            <li>Any other suspicious behavior</li>
          </ul>
        </div>

        <div className="d-flex gap-2">
          <button 
            className="btn btn-warning flex-grow-1"
            onClick={() => setShowForm(true)}
          >
            <i className="bi bi-flag me-2"></i>
            Report Activity
          </button>
          {onClose && (
            <button 
              className="btn btn-outline-secondary"
              onClick={onClose}
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded p-4 border-warning">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h6 className="mb-0 text-warning">
          <i className="bi bi-flag-fill me-2"></i>
          Report Suspicious Activity
        </h6>
        <button 
          className="btn btn-sm btn-outline-secondary"
          onClick={() => {
            setShowForm(false);
            if (onClose) onClose();
          }}
          disabled={loading}
        >
          Cancel
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label className="form-label">Type of Suspicious Activity</label>
          <select 
            className="form-select"
            value={formData.activityType}
            onChange={(e) => setFormData({...formData, activityType: e.target.value})}
            required
            disabled={loading}
          >
            {activityTypes.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </div>

        <div className="mb-3">
          <label className="form-label">Description</label>
          <textarea 
            className="form-control"
            rows="3"
            placeholder="Describe what you observed in detail..."
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            required
            disabled={loading}
          ></textarea>
        </div>

        <div className="row mb-3">
          <div className="col-md-6">
            <label className="form-label">Date of Activity</label>
            <input 
              type="date"
              className="form-control"
              value={formData.date}
              onChange={(e) => setFormData({...formData, date: e.target.value})}
              required
              disabled={loading}
            />
          </div>
          <div className="col-md-6">
            <label className="form-label">Approximate Time</label>
            <input 
              type="time"
              className="form-control"
              value={formData.time}
              onChange={(e) => setFormData({...formData, time: e.target.value})}
              required
              disabled={loading}
            />
          </div>
        </div>

        <div className="row mb-3">
          <div className="col-md-6">
            <label className="form-label">Location (if known)</label>
            <input 
              type="text"
              className="form-control"
              placeholder="e.g., New York, USA"
              value={formData.location}
              onChange={(e) => setFormData({...formData, location: e.target.value})}
              disabled={loading}
            />
          </div>
          <div className="col-md-6">
            <label className="form-label">Device Information</label>
            <input 
              type="text"
              className="form-control"
              placeholder="e.g., Chrome on Windows, iPhone 12"
              value={formData.deviceInfo}
              onChange={(e) => setFormData({...formData, deviceInfo: e.target.value})}
              disabled={loading}
            />
          </div>
        </div>

        <div className="mb-4">
          <label className="form-label">Urgency Level</label>
          <div className="row g-2">
            {urgencyLevels.map(level => (
              <div key={level.value} className="col-md-6">
                <div className={`form-check border border-${level.color} rounded p-3 ${formData.urgency === level.value ? 'border-2' : ''}`}>
                  <input 
                    className="form-check-input"
                    type="radio"
                    name="urgency"
                    id={level.value}
                    value={level.value}
                    checked={formData.urgency === level.value}
                    onChange={(e) => setFormData({...formData, urgency: e.target.value})}
                    disabled={loading}
                  />
                  <label className="form-check-label ms-2" htmlFor={level.value}>
                    <strong className={`text-${level.color}`}>{level.label}</strong>
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="alert alert-info text-info">
          <i className="bi bi-shield-check me-2"></i>
          <small>
            Your report will be reviewed by our security team within 24 hours. For immediate threats, please contact support directly.
          </small>
        </div>

        <div className="d-flex gap-2">
          <button 
            type="submit" 
            className="btn btn-warning flex-grow-1 py-2"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2"></span>
                Submitting Report...
              </>
            ) : (
              <>
                <i className="bi bi-send-check me-2"></i>
                Submit Security Report
              </>
            )}
          </button>
          <button 
            type="button" 
            className="btn btn-outline-secondary"
            onClick={() => {
              setShowForm(false);
              if (onClose) onClose();
            }}
            disabled={loading}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default ReportSuspiciousActivity;