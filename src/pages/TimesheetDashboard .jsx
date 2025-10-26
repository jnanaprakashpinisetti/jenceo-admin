import React, { useState, useEffect } from 'react';
import firebaseDB from '../firebase';

const TimesheetDashboard = () => {
  // State declarations
  const [timesheets, setTimesheets] = useState([]);
  const [filteredTimesheets, setFilteredTimesheets] = useState([]);
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedTimesheet, setSelectedTimesheet] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [clarificationText, setClarificationText] = useState('');
  const [showClarificationInput, setShowClarificationInput] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  // Initialize current user and years
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('currentUser')) || {
      uid: 'admin',
      displayName: 'Admin User',
      email: 'admin@system.com',
      role: 'admin'
    };
    setCurrentUser(user);

    // Set current year and month
    const current = new Date();
    setSelectedYear(current.getFullYear().toString());
    setSelectedMonth((current.getMonth() + 1).toString().padStart(2, '0'));
  }, []);

  // Fetch all timesheets
  useEffect(() => {
    fetchTimesheets();
  }, []);

  // Filter timesheets when year/month changes
  useEffect(() => {
    filterTimesheets();
  }, [timesheets, selectedYear, selectedMonth]);

  const fetchTimesheets = async () => {
    try {
      const snapshot = await firebaseDB.child("Timesheets").once('value');
      if (snapshot.exists()) {
        const timesheetsData = Object.entries(snapshot.val()).map(([id, data]) => ({
          id,
          ...data
        }));
        setTimesheets(timesheetsData);
      }
    } catch (error) {
      console.error('Error fetching timesheets:', error);
    }
  };

  const filterTimesheets = () => {
    if (!selectedYear || !selectedMonth) return;

    const filtered = timesheets.filter(timesheet => {
      // Extract year and month from period or startDate
      let sheetYear, sheetMonth;

      if (timesheet.period && timesheet.period.includes('-')) {
        // Handle YYYY-MM format
        [sheetYear, sheetMonth] = timesheet.period.split('-');
      } else if (timesheet.startDate) {
        // Handle date range format
        sheetYear = timesheet.startDate.split('-')[0];
        sheetMonth = timesheet.startDate.split('-')[1];
      } else {
        return false;
      }

      return sheetYear === selectedYear && sheetMonth === selectedMonth;
    });

    setFilteredTimesheets(filtered);
  };

  const getTimesheetForMonth = (monthNumber) => {
    return filteredTimesheets.find(ts => {
      const sheetMonth = ts.period?.split('-')[1] || ts.startDate?.split('-')[1];
      return sheetMonth === monthNumber;
    });
  };



  const getAvailableYears = () => {
    const years = new Set();
    timesheets.forEach(timesheet => {
      if (timesheet.period && timesheet.period.includes('-')) {
        years.add(timesheet.period.split('-')[0]);
      } else if (timesheet.startDate) {
        years.add(timesheet.startDate.split('-')[0]);
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      draft: { class: 'bg-warning', text: 'Draft' },
      submitted: { class: 'bg-info', text: 'Submitted' },
      approved: { class: 'bg-success', text: 'Approved' },
      rejected: { class: 'bg-danger', text: 'Rejected' },
      clarification: { class: 'bg-warning', text: 'Clarification' }
    };

    const config = statusConfig[status] || { class: 'bg-secondary', text: status };
    return <span className={`badge ${config.class}`}>{config.text}</span>;
  };

  const handleViewDetails = async (timesheetId) => {
    try {
      // Fetch complete timesheet data
      const snapshot = await firebaseDB.child(`Timesheets/${timesheetId}`).once('value');
      if (snapshot.exists()) {
        const timesheetData = snapshot.val();

        // Fetch daily entries
        const entriesSnapshot = await firebaseDB.child('TimesheetEntries')
          .orderByChild('timesheetId')
          .equalTo(timesheetId)
          .once('value');

        let dailyEntries = [];
        if (entriesSnapshot.exists()) {
          dailyEntries = Object.values(entriesSnapshot.val());
        }

        // Fetch advances
        const advancesSnapshot = await firebaseDB.child('Advances')
          .orderByChild('timesheetId')
          .equalTo(timesheetId)
          .once('value');

        let advances = [];
        if (advancesSnapshot.exists()) {
          advances = Object.values(advancesSnapshot.val());
        }

        setSelectedTimesheet({
          ...timesheetData,
          dailyEntries,
          advances
        });
        setShowDetailModal(true);
        setShowClarificationInput(false);
        setClarificationText('');
      }
    } catch (error) {
      console.error('Error fetching timesheet details:', error);
    }
  };

  const updateTimesheetStatus = async (status, clarification = '') => {
    if (!selectedTimesheet) return;

    try {
      const updateData = {
        status,
        updatedBy: currentUser?.uid,
        updatedByName: currentUser?.displayName,
        updatedAt: new Date().toISOString()
      };

      // Add clarification data if needed
      if (status === 'clarification') {
        updateData.clarificationRequest = {
          text: clarification,
          requestedBy: currentUser?.uid,
          requestedByName: currentUser?.displayName,
          requestedAt: new Date().toISOString(),
          resolved: false
        };
      } else if (status === 'approved' || status === 'rejected') {
        updateData.reviewedBy = currentUser?.uid;
        updateData.reviewedByName = currentUser?.displayName;
        updateData.reviewedAt = new Date().toISOString();

        // Clear clarification if exists
        if (selectedTimesheet.clarificationRequest) {
          updateData.clarificationRequest = {
            ...selectedTimesheet.clarificationRequest,
            resolved: true,
            resolvedBy: currentUser?.uid,
            resolvedByName: currentUser?.displayName,
            resolvedAt: new Date().toISOString()
          };
        }
      }

      await firebaseDB.child(`Timesheets/${selectedTimesheet.id}`).update(updateData);

      // Refresh data
      await fetchTimesheets();
      setShowDetailModal(false);
      setSelectedTimesheet(null);
      setClarificationText('');
      setShowClarificationInput(false);

    } catch (error) {
      console.error('Error updating timesheet status:', error);
    }
  };

  const handleStatusAction = (status) => {
    if (status === 'clarification') {
      setShowClarificationInput(true);
    } else {
      updateTimesheetStatus(status);
    }
  };

  const submitClarification = () => {
    if (clarificationText.trim()) {
      updateTimesheetStatus('clarification', clarificationText.trim());
    }
  };

  return (
    <div className="container-fluid py-4">
      {/* Header */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card bg-dark border-secondary">
            <div className="card-body">
              <div className="row align-items-center">
                <div className="col-md-3">
                  <h4 className="text-white mb-0">
                    <i className="bi bi-speedometer2 me-2 text-warning"></i>
                    Timesheet Dashboard
                  </h4>
                  <small className="text-muted">Manage and review employee timesheets</small>
                </div>
                <div className="col-md-9 text-end">
                  <div className="row">
                    <div className="col-md-10 text-center">
                      <label className="form-label text-info">
                        <strong>Select Month</strong>
                      </label>
                      <div className="d-flex flex-wrap gap-2">
                        {Array.from({ length: 12 }, (_, i) => {
                          const monthNum = (i + 1).toString().padStart(2, '0');
                          const monthName = new Date(2023, i).toLocaleString('en', { month: 'short' });
                          const isActive = monthNum === selectedMonth;
                          const timesheet = getTimesheetForMonth(monthNum);
                          const hasData = !!timesheet;

                          // Color classes for buttons
                          const colorClasses = [
                            'btn-warning', 'btn-info', 'btn-success', 'btn-primary',
                            'btn-warning', 'btn-danger', 'btn-info', 'btn-success',
                            'btn-primary', 'btn-warning', 'btn-info', 'btn-success'
                          ];

                          return (
                            <button
                              key={monthNum}
                              className={`btn ${colorClasses[i]} btn-sm position-relative ${isActive ? 'active' : ''}`}
                              onClick={() => setSelectedMonth(monthNum)}
                              style={{ minWidth: '60px' }}
                            >
                              {monthName}
                              {hasData && (
                                <span className="position-absolute top-0 start-100 translate-middle p-1 bg-success border border-light rounded-circle">
                                  <span className="visually-hidden">Has data</span>
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="col-md-2 text-center">
                      <label className="form-label text-info">
                        <strong>Select Year</strong>
                      </label>
                      <select
                        className="form-select bg-dark text-white border-secondary"
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value)}
                      >
                        <option value="">Select Year</option>
                        {getAvailableYears().map(year => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="row mb-4">
        <div className="col-xl-2 col-md-4 col-6 mb-3">
          <div className="card bg-dark border-info">
            <div className="card-body text-center">
              <h6 className="text-info d-block">Total Timesheets</h6>
              <h3 className="text-white">{filteredTimesheets.length}</h3>
            </div>
          </div>
        </div>
        <div className="col-xl-2 col-md-4 col-6 mb-3">
          <div className="card bg-dark border-success">
            <div className="card-body text-center">
              <h6 className="text-success d-block">Approved</h6>
              <h3 className="text-white">
                {filteredTimesheets.filter(ts => ts.status === 'approved').length}
              </h3>
            </div>
          </div>
        </div>
        <div className="col-xl-2 col-md-4 col-6 mb-3">
          <div className="card bg-dark border-warning">
            <div className="card-body text-center">
              <h6 className="text-warning d-block">Pending</h6>
              <h3 className="text-white">
                {filteredTimesheets.filter(ts => ts.status === 'submitted' || ts.status === 'clarification').length}
              </h3>
            </div>
          </div>
        </div>
        <div className="col-xl-2 col-md-4 col-6 mb-3">
          <div className="card bg-dark border-danger">
            <div className="card-body text-center">
              <h6 className="text-danger d-block">Rejected</h6>
              <h3 className="text-white">
                {filteredTimesheets.filter(ts => ts.status === 'rejected').length}
              </h3>
            </div>
          </div>
        </div>
        <div className="col-xl-2 col-md-4 col-6 mb-3">
          <div className="card bg-dark border-secondary">
            <div className="card-body text-center">
              <h6 className="text-secondary d-block">Draft</h6>
              <h3 className="text-white">
                {filteredTimesheets.filter(ts => ts.status === 'draft').length}
              </h3>
            </div>
          </div>
        </div>
        <div className="col-xl-2 col-md-4 col-6 mb-3">
          <div className="card bg-dark border-primary">
            <div className="card-body text-center">
              <h6 className="text-primary d-block">Total Amount</h6>
              <h3 className="text-warning">
                ₹{filteredTimesheets.reduce((sum, ts) => sum + (ts.totalSalary || 0), 0)}
              </h3>
            </div>
          </div>
        </div>
      </div>

      {/* Timesheets Table */}
      <div className="row">
        <div className="col-12">
          <div className="card bg-dark border-secondary">
            <div className="card-header bg-secondary d-flex justify-content-between align-items-center">
              <h5 className="card-title mb-0 text-white">
                Timesheets - {selectedMonth && new Date(2023, parseInt(selectedMonth) - 1).toLocaleString('en', { month: 'long' })} {selectedYear}
              </h5>
              <span className="badge bg-primary">{filteredTimesheets.length} records</span>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-dark table-hover mb-0">
                  <thead>
                    <tr>
                      <th className="border-secondary">Employee ID</th>
                      <th className="border-secondary">Photo</th>
                      <th className="border-secondary">Name</th>
                      <th className="border-secondary">Period</th>
                      <th className="border-secondary">Total Days</th>
                      <th className="border-secondary">Total Amount</th>
                      <th className="border-secondary">Status</th>
                      <th className="border-secondary">Submitted</th>
                      <th className="border-secondary">Review By</th>
                      <th className="border-secondary">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTimesheets.map(timesheet => (
                      <tr key={timesheet.id}>
                        <td className="border-secondary">
                          <div className="fw-bold text-white opacity-50">{timesheet.employeeData?.employeeId || timesheet.employeeData?.idNo}</div>

                        </td>
                        <td className="border-secondary">
                          {timesheet.employeeData?.employeePhotoUrl ? (
                            <img
                              src={timesheet.employeeData.employeePhotoUrl}
                              alt="Employee"
                              className="rounded-circle"
                              style={{ width: '50px', height: '50px', objectFit: 'cover' }}
                            />
                          ) : (
                            <div
                              className="rounded-circle bg-secondary d-flex align-items-center justify-content-center"
                              style={{ width: '50px', height: '50px' }}
                            >
                              <i className="bi bi-person text-white"></i>
                            </div>
                          )}
                        </td>
                        <td className="border-secondary">
                          {timesheet.employeeName}
                        </td>
                        <td className="border-secondary">
                          <small className="text-info">{timesheet.period}</small>
                        </td>
                        <td className="border-secondary">
                          <div className="text-center">
                            <span className="fw-bold text-white">{timesheet.totalDays || 0}</span>
                            <br />
                            <small className="text-muted">
                              W: {timesheet.workingDays || 0} | L: {timesheet.leaves || 0}
                            </small>
                          </div>
                        </td>
                        <td className="border-secondary">
                          <div>
                            <strong className="text-success">₹{timesheet.totalSalary || 0}</strong>
                            <br />
                            <small className="text-muted">
                              Net: ₹{timesheet.netPayable || 0}
                            </small>
                          </div>
                        </td>
                        <td className="border-secondary">
                          {getStatusBadge(timesheet.status)}
                        </td>
                        <td className="border-secondary">
                          {timesheet.submittedAt ? (
                            <div>
                              <small className="text-white">
                                {new Date(timesheet.submittedAt).toLocaleDateString('en-IN')}
                              </small>
                              <br />
                              <small className="text-muted">
                                {timesheet.submittedByName}
                              </small>
                            </div>
                          ) : (
                            <span className="text-muted">Not submitted</span>
                          )}
                        </td>
                        <td className="border-secondary">
                          {timesheet.reviewedByName ? (
                            <div>
                              <small className="text-white">{timesheet.reviewedByName}</small>
                              <br />
                              <small className="text-muted">
                                {timesheet.reviewedAt && new Date(timesheet.reviewedAt).toLocaleDateString('en-IN')}
                              </small>
                            </div>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                        <td className="border-secondary">
                          <button
                            className="btn btn-sm btn-outline-info"
                            onClick={() => handleViewDetails(timesheet.id)}
                            title="View Details"
                          >
                            <i className="bi bi-eye"></i> View
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredTimesheets.length === 0 && (
                      <tr>
                        <td colSpan="9" className="text-center py-4 text-muted border-secondary">
                          No timesheets found for the selected period.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Timesheet Detail Modal */}
      {showDetailModal && selectedTimesheet && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.8)' }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered modal-xl">
            <div className="modal-content bg-dark border border-secondary">
              <div className="modal-header ">
                <h5 className="modal-title text-info">
                  <i className="bi bi-file-text me-2"></i>
                  Timesheet Details - {selectedTimesheet.employeeName}
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowDetailModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                {/* Employee and Summary Info */}
                <div className="row mb-4">
                  <div className="col-md-3">
                    <div className="card bg-dark border-secondary h-100">
                      <div className="card-body text-center">
                        {selectedTimesheet.employeeData?.employeePhotoUrl ? (
                          <img
                            src={selectedTimesheet.employeeData.employeePhotoUrl}
                            alt="Employee"
                            className="rounded-circle mb-3"
                            style={{ width: '80px', height: '80px', objectFit: 'cover' }}
                          />
                        ) : (
                          <div
                            className="rounded-circle bg-secondary d-flex align-items-center justify-content-center mx-auto mb-3"
                            style={{ width: '80px', height: '80px' }}
                          >
                            <i className="bi bi-person text-white fs-2"></i>
                          </div>
                        )}
                        <h6 className="text-white d-block">{selectedTimesheet.employeeName}</h6>
                        <small className="text-muted">
                          {selectedTimesheet.employeeData?.employeeId || selectedTimesheet.employeeData?.idNo}
                        </small>
                        <br />
                        <small className="text-info">{selectedTimesheet.employeeData?.primarySkill}</small>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-9">
                    <div className="card bg-dark border-secondary h-100">
                      <div className="card-body">
                        <div className="row text-center">
                          <div className="col-md-2 col-6 mb-3">
                            <div className="border  rounded border-info p-2 h-100">
                              <h6 className="text-info d-block">Total Days</h6>
                              <p className="h5 text-white">{selectedTimesheet.totalDays}</p>
                            </div>
                          </div>
                          <div className="col-md-2 col-6 mb-3">
                            <div className="border border-success rounded p-2 h-100">
                              <h6 className="text-success d-block">Working Days</h6>
                              <p className="h5 text-white">{selectedTimesheet.workingDays}</p>
                            </div>
                          </div>
                          <div className="col-md-2 col-6 mb-3">
                            <div className="border border-warning rounded p-2 h-100">
                              <h6 className="text-warning d-block">Leaves</h6>
                              <p className="h5 text-white">{selectedTimesheet.leaves}</p>
                            </div>
                          </div>
                          <div className="col-md-2 col-6 mb-3">
                            <div className="border border-primary rounded p-2 h-100">
                              <h6 className="text-primary d-block">Holidays</h6>
                              <p className="h5 text-white">{selectedTimesheet.holidays}</p>
                            </div>
                          </div>
                          <div className="col-md-2 col-6 mb-3">
                            <div className="border border-danger rounded p-2 h-100">
                              <h6 className="text-danger d-block">Advances</h6>
                              <p className="h5 text-white">₹{selectedTimesheet.advances}</p>
                            </div>
                          </div>
                          <div className="col-md-2 col-6 mb-3">
                            <div className="border border-success rounded p-2 h-100">
                              <h6 className="text-success d-block">Net Payable</h6>
                              <p className="h5 text-white">₹{selectedTimesheet.netPayable}</p>
                            </div>
                          </div>
                        </div>
                        <div className="row mt-2">
                          <div className="col-12 text-center">
                            <small className="text-muted">Period: {selectedTimesheet.period}</small>
                            <br />
                            <small className="text-muted">
                              Status: {getStatusBadge(selectedTimesheet.status)}
                            </small>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Daily Entries Table */}
                <div className="row mb-4">
                  <div className="col-12">
                    <h6 className="text-white mb-3">Daily Entries</h6>
                    <div className="table-responsive">
                      <table className="table table-dark table-sm">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Client</th>
                            <th>Position</th>
                            <th>Status</th>
                            <th>Salary</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedTimesheet.dailyEntries?.map(entry => (
                            <tr key={entry.id}>
                              <td>{new Date(entry.date).toLocaleDateString('en-IN')}</td>
                              <td>{entry.clientName}</td>
                              <td>{entry.jobRole}</td>
                              <td>
                                <span className={`badge ${entry.status === 'present' ? 'bg-success' :
                                  entry.status === 'leave' ? 'bg-warning' :
                                    entry.isPublicHoliday ? 'bg-primary' : 'bg-secondary'
                                  }`}>
                                  {entry.status}
                                  {entry.isPublicHoliday && ' (Holiday)'}
                                </span>
                              </td>
                              <td className="text-success">₹{entry.dailySalary}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-secondary">
                            <td colSpan="4" className="text-end fw-bold">Total Salary:</td>
                            <td className="fw-bold text-success">₹{selectedTimesheet.totalSalary}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Advances Section */}
                {selectedTimesheet.advances && selectedTimesheet.advances.length > 0 && (
                  <div className="row mb-4">
                    <div className="col-12">
                      <h6 className="text-white mb-3">Advances</h6>
                      <div className="table-responsive">
                        <table className="table table-dark table-sm">
                          <thead>
                            <tr>
                              <th>Date</th>
                              <th>Amount</th>
                              <th>Purpose</th>
                              <th>Approved By</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedTimesheet.advances.map(advance => (
                              <tr key={advance.id}>
                                <td>{new Date(advance.date).toLocaleDateString('en-IN')}</td>
                                <td className="text-danger">₹{advance.amount}</td>
                                <td>{advance.purpose}</td>
                                <td>{advance.approvedByName}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* Clarification Input */}
                {showClarificationInput && (
                  <div className="row mb-3">
                    <div className="col-12">
                      <div className="card bg-dark border-warning">
                        <div className="card-body">
                          <h6 className="text-warning">Request Clarification</h6>
                          <textarea
                            className="form-control bg-dark text-white border-warning"
                            rows="3"
                            placeholder="Enter clarification request..."
                            value={clarificationText}
                            onChange={(e) => setClarificationText(e.target.value)}
                          />
                          <div className="mt-2">
                            <button
                              className="btn btn-warning btn-sm me-2"
                              onClick={submitClarification}
                              disabled={!clarificationText.trim()}
                            >
                              Submit Request
                            </button>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => setShowClarificationInput(false)}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Existing Clarification Request */}
                {selectedTimesheet.clarificationRequest && !selectedTimesheet.clarificationRequest.resolved && (
                  <div className="row mb-3">
                    <div className="col-12">
                      <div className="card bg-dark border-warning">
                        <div className="card-body">
                          <h6 className="text-warning">Clarification Request</h6>
                          <p className="text-white">{selectedTimesheet.clarificationRequest.text}</p>
                          <small className="text-muted">
                            Requested by: {selectedTimesheet.clarificationRequest.requestedByName} on{' '}
                            {new Date(selectedTimesheet.clarificationRequest.requestedAt).toLocaleString('en-IN')}
                          </small>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer ">
                <div className="d-flex justify-content-between w-100">
                  <div>
                    <small className="text-muted">
                      Submitted by: {selectedTimesheet.submittedByName} on{' '}
                      {selectedTimesheet.submittedAt && new Date(selectedTimesheet.submittedAt).toLocaleString('en-IN')}
                    </small>
                  </div>
                  <div>
                    {selectedTimesheet.status !== 'approved' && selectedTimesheet.status !== 'rejected' && (
                      <>
                        <button
                          className="btn btn-success me-2"
                          onClick={() => handleStatusAction('approved')}
                        >
                          <i className="bi bi-check-circle me-1"></i>
                          Approve
                        </button>
                        <button
                          className="btn btn-danger me-2"
                          onClick={() => handleStatusAction('rejected')}
                        >
                          <i className="bi bi-x-circle me-1"></i>
                          Reject
                        </button>
                        <button
                          className="btn btn-warning"
                          onClick={() => handleStatusAction('clarification')}
                        >
                          <i className="bi bi-question-circle me-1"></i>
                          Clarification
                        </button>
                      </>
                    )}
                    <button
                      className="btn btn-secondary ms-2"
                      onClick={() => setShowDetailModal(false)}
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimesheetDashboard;