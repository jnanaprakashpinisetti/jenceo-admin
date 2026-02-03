import React, { useState, useEffect } from 'react';
import { securityService } from './SecurityService';
import firebaseDB from '../../firebase';

const SuspiciousActivityReports = ({ userId }) => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewDetails, setViewDetails] = useState(null);

  useEffect(() => {
    loadReports();
  }, [userId]);

  const loadReports = async () => {
    setLoading(true);
    try {
      const snapshot = await firebaseDB.child('SuspiciousActivityReports')
        .orderByChild('userId')
        .equalTo(userId)
        .once('value');
      
      if (snapshot.exists()) {
        const reportsData = snapshot.val();
        const reportsList = Object.entries(reportsData).map(([id, data]) => ({
          id,
          ...data
        })).sort((a, b) => new Date(b.reportedAt) - new Date(a.reportedAt));
        
        setReports(reportsList);
      } else {
        setReports([]);
      }
    } catch (error) {
      console.error('Error loading reports:', error);
      alert('Error loading reports: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getUrgencyColor = (urgency) => {
    switch(urgency) {
      case 'CRITICAL': return 'danger';
      case 'HIGH': return 'danger';
      case 'MEDIUM': return 'warning';
      case 'LOW': return 'info';
      default: return 'secondary';
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'PENDING_REVIEW': return 'warning';
      case 'UNDER_INVESTIGATION': return 'info';
      case 'RESOLVED': return 'success';
      case 'DISMISSED': return 'secondary';
      default: return 'secondary';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-info" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-2 text-muted">Loading suspicious activity reports...</p>
      </div>
    );
  }

  if (viewDetails) {
    return (
      <div className="card border-0 shadow-soft">
        <div className="card-body p-4">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h5 className="mb-0">
              <i className="bi bi-flag-fill me-2 text-warning"></i>
              Report Details
            </h5>
            <button 
              className="btn btn-sm btn-outline-secondary"
              onClick={() => setViewDetails(null)}
            >
              <i className="bi bi-arrow-left me-1"></i> Back to List
            </button>
          </div>

          <div className="row">
            <div className="col-md-6">
              <div className="mb-3">
                <label className="form-label text-muted">Report ID</label>
                <div className="form-control bg-light">{viewDetails.id}</div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="mb-3">
                <label className="form-label text-muted">Reported On</label>
                <div className="form-control bg-light">{formatDate(viewDetails.reportedAt)}</div>
              </div>
            </div>
          </div>

          <div className="row">
            <div className="col-md-6">
              <div className="mb-3">
                <label className="form-label text-muted">Activity Type</label>
                <div className="form-control bg-light">{viewDetails.activityType}</div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="mb-3">
                <label className="form-label text-muted">Urgency Level</label>
                <div>
                  <span className={`badge bg-${getUrgencyColor(viewDetails.urgency)}`}>
                    {viewDetails.urgency}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-3">
            <label className="form-label text-muted">Description</label>
            <div className="card bg-light p-3">
              {viewDetails.description}
            </div>
          </div>

          <div className="row">
            <div className="col-md-6">
              <div className="mb-3">
                <label className="form-label text-muted">Date of Activity</label>
                <div className="form-control bg-light">{viewDetails.date}</div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="mb-3">
                <label className="form-label text-muted">Time of Activity</label>
                <div className="form-control bg-light">{viewDetails.time}</div>
              </div>
            </div>
          </div>

          <div className="row">
            <div className="col-md-6">
              <div className="mb-3">
                <label className="form-label text-muted">Location</label>
                <div className="form-control bg-light">{viewDetails.location || 'Not specified'}</div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="mb-3">
                <label className="form-label text-muted">Device Information</label>
                <div className="form-control bg-light">{viewDetails.deviceInfo || 'Not specified'}</div>
              </div>
            </div>
          </div>

          <div className="mb-3">
            <label className="form-label text-muted">Report Status</label>
            <div>
              <span className={`badge bg-${getStatusColor(viewDetails.status)}`}>
                {viewDetails.status}
              </span>
            </div>
          </div>

          <div className="alert alert-info">
            <i className="bi bi-info-circle me-2"></i>
            <small>
              This report has been submitted to our security team. They will review it and take appropriate action.
              You will be notified if any follow-up is required.
            </small>
          </div>

          <div className="d-flex gap-2">
            <button 
              className="btn btn-outline-warning"
              onClick={() => {
                // Option to update or add more info
                const newInfo = prompt('Add additional information about this report:', '');
                if (newInfo) {
                  alert('Additional information added. Security team will review it.');
                }
              }}
            >
              <i className="bi bi-plus-circle me-1"></i>
              Add Information
            </button>
            <button 
              className="btn btn-outline-secondary"
              onClick={() => setViewDetails(null)}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card border-0 shadow-soft">
      <div className="card-body p-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h5 className="mb-1">
              <i className="bi bi-flag-fill me-2 text-warning"></i>
              Suspicious Activity Reports
            </h5>
            <small className="text-muted">Review your submitted security reports</small>
          </div>
          <div className="d-flex gap-2">
            <button 
              className="btn btn-sm btn-outline-info"
              onClick={loadReports}
            >
              <i className="bi bi-arrow-clockwise"></i> Refresh
            </button>
            <button 
              className="btn btn-sm btn-outline-warning"
              onClick={() => window.location.hash = '#security'}
            >
              <i className="bi bi-plus-circle me-1"></i>
              New Report
            </button>
          </div>
        </div>

        {reports.length === 0 ? (
          <div className="text-center py-5">
            <i className="bi bi-shield-check display-4 text-success mb-3"></i>
            <h5 className="text-success">No Reports Found</h5>
            <p className="text-muted">You haven't submitted any suspicious activity reports yet.</p>
            <button 
              className="btn btn-warning mt-2"
              onClick={() => window.location.hash = '#security'}
            >
              <i className="bi bi-flag me-2"></i>
              Report Suspicious Activity
            </button>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover">
              <thead className="bg-light">
                <tr>
                  <th>Report ID</th>
                  <th>Type</th>
                  <th>Description</th>
                  <th>Reported</th>
                  <th>Urgency</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reports.map(report => (
                  <tr key={report.id}>
                    <td>
                      <small className="text-muted">{report.id.substring(0, 8)}...</small>
                    </td>
                    <td>
                      <small>{report.activityType.replace(/_/g, ' ')}</small>
                    </td>
                    <td>
                      <small className="text-truncate d-block" style={{ maxWidth: '200px' }}>
                        {report.description.substring(0, 60)}...
                      </small>
                    </td>
                    <td>
                      <small>{formatDate(report.reportedAt)}</small>
                    </td>
                    <td>
                      <span className={`badge bg-${getUrgencyColor(report.urgency)}`}>
                        {report.urgency}
                      </span>
                    </td>
                    <td>
                      <span className={`badge bg-${getStatusColor(report.status)}`}>
                        {report.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn-sm btn-outline-info"
                        onClick={() => setViewDetails(report)}
                        title="View Details"
                      >
                        <i className="bi bi-eye"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="alert alert-info mt-4">
          <div className="d-flex">
            <i className="bi bi-info-circle me-2"></i>
            <div>
              <small>
                <strong>Note:</strong> All reports are reviewed by our security team within 24-48 hours.
                You can add additional information to existing reports if needed.
              </small>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuspiciousActivityReports;