// Timesheet/DisplayTimeSheet/components/TimesheetShare.jsx
import React from 'react';
import { useTimesheet } from '../context/TimesheetContext';

const TimesheetShare = ({
  onClose,
}) => {
  const {
    timesheet,
    dailyEntries,
    advances,
    employee,
    previousTimesheets,
  } = useTimesheet();

  if (!timesheet || !employee) {
    return (
      <div className="p-5 text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-3">Loading timesheet data...</p>
      </div>
    );
  }

  return (
    <div className="timesheet-share-container">
      <div className="d-flex justify-content-between align-items-center p-3 bg-dark border-bottom">
        <h4 className="mb-0 text-white">
          <i className="bi bi-share me-2"></i>
          Timesheet Share View
        </h4>
        <button className="btn btn-outline-light" onClick={onClose}>
          <i className="bi bi-x-lg"></i> Close
        </button>
      </div>

      <div className="p-4">
        {/* Header */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="card border-0 shadow">
              <div className="card-body">
                <div className="row">
                  <div className="col-md-8">
                    <h2 className="card-title">Timesheet - {employee.firstName} {employee.lastName}</h2>
                    <p className="text-muted mb-1">
                      <strong>Period:</strong> {timesheet.period || 'Not specified'}
                    </p>
                    <p className="text-muted mb-1">
                      <strong>Timesheet ID:</strong> {timesheet.timesheetId || timesheet.id}
                    </p>
                    <p className="text-muted mb-0">
                      <strong>Status:</strong> 
                      <span className={`badge ms-2 ${timesheet.status === 'approved' ? 'bg-success' :
                          timesheet.status === 'submitted' ? 'bg-primary' :
                            timesheet.status === 'draft' ? 'bg-warning' : 'bg-secondary'
                        }`}>
                        {timesheet.status?.toUpperCase()}
                      </span>
                    </p>
                  </div>
                  <div className="col-md-4 text-end">
                    {employee.employeePhotoUrl && (
                      <img
                        src={employee.employeePhotoUrl}
                        alt="Employee"
                        className="rounded-circle"
                        style={{ width: '100px', height: '100px', objectFit: 'cover' }}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="row mb-4">
          <div className="col-md-4">
            <div className="card border-success">
              <div className="card-body text-center">
                <h6 className="card-subtitle mb-2 text-muted">Working Days</h6>
                <h2 className="text-success">{timesheet.workingDays || 0}</h2>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card border-primary">
              <div className="card-body text-center">
                <h6 className="card-subtitle mb-2 text-muted">Total Salary</h6>
                <h2 className="text-primary">₹{Number(timesheet.totalSalary || 0).toFixed(2)}</h2>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card border-warning">
              <div className="card-body text-center">
                <h6 className="card-subtitle mb-2 text-muted">Net Payable</h6>
                <h2 className="text-warning">₹{Number(timesheet.netPayable || 0).toFixed(2)}</h2>
              </div>
            </div>
          </div>
        </div>

        {/* Daily Entries Table */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="card">
              <div className="card-header bg-light">
                <h5 className="mb-0">Daily Entries ({dailyEntries.length})</h5>
              </div>
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-striped mb-0">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Client</th>
                        <th>Job Role</th>
                        <th>Status</th>
                        <th>Salary</th>
                        <th>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dailyEntries.map((entry) => (
                        <tr key={entry._rowKey || entry.date}>
                          <td>{new Date(entry.date).toLocaleDateString('en-IN')}</td>
                          <td>{entry.clientName}</td>
                          <td>{entry.jobRole}</td>
                          <td>
                            <span className={`badge ${entry.status === 'present' ? 'bg-success' :
                                entry.status === 'absent' ? 'bg-danger' :
                                  entry.status === 'leave' ? 'bg-warning' : 'bg-info'
                              }`}>
                              {entry.status}
                            </span>
                          </td>
                          <td>₹{entry.dailySalary?.toFixed(2)}</td>
                          <td>
                            {entry.notes ? (
                              <small className="text-muted">{entry.notes}</small>
                            ) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="table-light">
                        <td colSpan="4" className="text-end"><strong>Total:</strong></td>
                        <td className="text-primary">
                          <strong>₹{dailyEntries.reduce((sum, e) => sum + (e.dailySalary || 0), 0).toFixed(2)}</strong>
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="row">
          <div className="col-12">
            <div className="card border-0 bg-light">
              <div className="card-body text-center">
                <p className="text-muted mb-0">
                  Generated on {new Date().toLocaleDateString('en-IN')} at {new Date().toLocaleTimeString('en-IN')}
                </p>
                <p className="text-muted mb-0 small">
                  This is a read-only view. For editing, please use the main application.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimesheetShare;