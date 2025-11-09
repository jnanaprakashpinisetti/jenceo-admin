import React, { useState, useEffect } from 'react';
import firebaseDB from '../../firebase';

const TimesheetTable = ({ employee }) => {
  const [allTimesheets, setAllTimesheets] = useState([]);
  const [filteredTimesheets, setFilteredTimesheets] = useState([]);
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [loading, setLoading] = useState(true);
  const [debugInfo, setDebugInfo] = useState('');
  const [showTimesheetModal, setShowTimesheetModal] = useState(false);
  const [selectedTimesheet, setSelectedTimesheet] = useState(null);
  const [timesheetEntries, setTimesheetEntries] = useState([]);
  const [timesheetAdvances, setTimesheetAdvances] = useState([]);

  // Months array with colors
  const months = [
    { number: '01', name: 'Jan', color: 'btn-outline-warning' },
    { number: '02', name: 'Feb', color: 'btn-outline-warning' },
    { number: '03', name: 'Mar', color: 'btn-outline-warning' },
    { number: '04', name: 'Apr', color: 'btn-outline-warning' },
    { number: '05', name: 'May', color: 'btn-outline-warning' },
    { number: '06', name: 'Jun', color: 'btn-outline-warning' },
    { number: '07', name: 'Jul', color: 'btn-outline-warning' },
    { number: '08', name: 'Aug', color: 'btn-outline-warning' },
    { number: '09', name: 'Sep', color: 'btn-outline-warning' },
    { number: '10', name: 'Oct', color: 'btn-outline-warning' },
    { number: '11', name: 'Nov', color: 'btn-outline-warning' },
    { number: '12', name: 'Dec', color: 'btn-outline-warning' }
  ];

  // Initialize current year
  useEffect(() => {
    const current = new Date();
    const year = current.getFullYear().toString();
    setSelectedYear(year);
  }, []);

  // Fetch timesheets for this employee
  useEffect(() => {
    if (employee) {
      fetchTimesheetsFromCorrectPath();
    } else {
      setAllTimesheets([]);
      setLoading(false);
    }
  }, [employee]);

  // Filter timesheets when year or month changes
  useEffect(() => {
    filterTimesheets();
  }, [allTimesheets, selectedYear, selectedMonth]);

  const fetchTimesheetsFromCorrectPath = async () => {
    try {
      setLoading(true);
      
      if (!employee) {
        setAllTimesheets([]);
        setDebugInfo('No employee data provided');
        return;
      }

      // Get the correct Firebase key
      const employeeKey = employee.id;
      
      if (!employeeKey) {
        setAllTimesheets([]);
        setDebugInfo('No employee key found');
        return;
      }

      setDebugInfo(`Searching for employee: ${employeeKey}`);

      // Try both paths - with and without JenCeo-DataBase prefix
      const paths = [
        `JenCeo-DataBase/EmployeeBioData/${employeeKey}/timesheets`,
        `EmployeeBioData/${employeeKey}/timesheets`
      ];

      let foundTimesheets = [];
      let successfulPath = '';

      for (const path of paths) {
        try {
          const snapshot = await firebaseDB.child(path).once('value');
          
          if (snapshot.exists()) {
            const data = snapshot.val();
            successfulPath = path;

            // Convert to array
            if (typeof data === 'object') {
              foundTimesheets = Object.entries(data).map(([id, tsData]) => ({
                id,
                timesheetId: id,
                ...tsData
              }));
            }
            break;
          }
        } catch (pathError) {
          // Silently continue to next path
        }
      }

      if (foundTimesheets.length > 0) {
        setAllTimesheets(foundTimesheets);
        setDebugInfo(`Found ${foundTimesheets.length} timesheets`);
      } else {
        setAllTimesheets([]);
        setDebugInfo('No timesheets found');
      }

    } catch (error) {
      setAllTimesheets([]);
      setDebugInfo(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Load detailed timesheet data for modal
  const loadTimesheetDetails = async (timesheet) => {
    if (!employee?.id || !timesheet?.timesheetId) return;
    
    try {
      setSelectedTimesheet(timesheet);
      
      // Load daily entries
      const entriesSnapshot = await firebaseDB
        .child(`EmployeeBioData/${employee.id}/timesheets/${timesheet.timesheetId}/dailyEntries`)
        .once('value');
      
      if (entriesSnapshot.exists()) {
        const entriesData = entriesSnapshot.val();
        const entriesList = Object.entries(entriesData).map(([date, entryData]) => ({
          id: date,
          date,
          ...entryData
        })).sort((a, b) => new Date(a.date) - new Date(b.date));
        setTimesheetEntries(entriesList);
      } else {
        setTimesheetEntries([]);
      }

      // Load advances
      const advancesSnapshot = await firebaseDB
        .child(`EmployeeBioData/${employee.id}/timesheets/${timesheet.timesheetId}/advances`)
        .once('value');
      
      if (advancesSnapshot.exists()) {
        const advancesData = advancesSnapshot.val();
        const advancesList = Object.entries(advancesData).map(([id, advanceData]) => ({
          id,
          ...advanceData
        }));
        setTimesheetAdvances(advancesList);
      } else {
        setTimesheetAdvances([]);
      }

      setShowTimesheetModal(true);
    } catch (error) {
      setDebugInfo('Error loading timesheet details');
    }
  };

  const filterTimesheets = () => {
    if (!selectedYear || allTimesheets.length === 0) {
      setFilteredTimesheets([]);
      return;
    }

    let filtered = allTimesheets.filter(timesheet => {
      let sheetYear = '';
      
      if (timesheet.periodKey && timesheet.periodKey.includes('-')) {
        if (timesheet.periodKey.includes('_to_')) {
          sheetYear = timesheet.periodKey.split('_to_')[0].split('-')[0];
        } else {
          sheetYear = timesheet.periodKey.split('-')[0];
        }
      } else if (timesheet.period && timesheet.period.includes('-')) {
        sheetYear = timesheet.period.split('-')[0];
      } else if (timesheet.startDate) {
        sheetYear = timesheet.startDate.split('-')[0];
      } else if (timesheet.createdAt) {
        sheetYear = new Date(timesheet.createdAt).getFullYear().toString();
      } else if (timesheet.updatedAt) {
        sheetYear = new Date(timesheet.updatedAt).getFullYear().toString();
      }

      return sheetYear === selectedYear;
    });

    // If specific month is selected, filter further
    if (selectedMonth !== 'all') {
      filtered = filtered.filter(timesheet => {
        let sheetMonth = '';
        
        if (timesheet.periodKey && timesheet.periodKey.includes('-')) {
          if (timesheet.periodKey.includes('_to_')) {
            sheetMonth = timesheet.periodKey.split('_to_')[0].split('-')[1];
          } else {
            sheetMonth = timesheet.periodKey.split('-')[1];
          }
        } else if (timesheet.period && timesheet.period.includes('-')) {
          sheetMonth = timesheet.period.split('-')[1];
        } else if (timesheet.startDate) {
          sheetMonth = timesheet.startDate.split('-')[1];
        } else if (timesheet.createdAt) {
          sheetMonth = (new Date(timesheet.createdAt).getMonth() + 1).toString().padStart(2, '0');
        }

        return sheetMonth === selectedMonth;
      });
    }

    // Sort by date (newest first)
    filtered.sort((a, b) => {
      const dateA = new Date(a.updatedAt || a.createdAt || a.startDate || 0);
      const dateB = new Date(b.updatedAt || b.createdAt || b.startDate || 0);
      return dateB - dateA;
    });

    setFilteredTimesheets(filtered);
  };

  // Get timesheet count for each month
  const getTimesheetCountForMonth = (monthNumber) => {
    return allTimesheets.filter(timesheet => {
      let sheetYear = '';
      let sheetMonth = '';
      
      if (timesheet.periodKey && timesheet.periodKey.includes('-')) {
        if (timesheet.periodKey.includes('_to_')) {
          sheetYear = timesheet.periodKey.split('_to_')[0].split('-')[0];
          sheetMonth = timesheet.periodKey.split('_to_')[0].split('-')[1];
        } else {
          sheetYear = timesheet.periodKey.split('-')[0];
          sheetMonth = timesheet.periodKey.split('-')[1];
        }
      } else if (timesheet.period && timesheet.period.includes('-')) {
        sheetYear = timesheet.period.split('-')[0];
        sheetMonth = timesheet.period.split('-')[1];
      } else if (timesheet.startDate) {
        sheetYear = timesheet.startDate.split('-')[0];
        sheetMonth = timesheet.startDate.split('-')[1];
      }

      return sheetYear === selectedYear && sheetMonth === monthNumber;
    }).length;
  };

  // Get available years from all timesheets
  const getAvailableYears = () => {
    const years = new Set();
    
    allTimesheets.forEach(timesheet => {
      let sheetYear = '';
      
      if (timesheet.periodKey && timesheet.periodKey.includes('-')) {
        if (timesheet.periodKey.includes('_to_')) {
          sheetYear = timesheet.periodKey.split('_to_')[0].split('-')[0];
        } else {
          sheetYear = timesheet.periodKey.split('-')[0];
        }
      } else if (timesheet.period && timesheet.period.includes('-')) {
        sheetYear = timesheet.period.split('-')[0];
      } else if (timesheet.startDate) {
        sheetYear = timesheet.startDate.split('-')[0];
      } else if (timesheet.createdAt) {
        sheetYear = new Date(timesheet.createdAt).getFullYear().toString();
      }

      if (sheetYear) {
        years.add(sheetYear);
      }
    });

    return Array.from(years).sort((a, b) => b - a);
  };

  const getAdvanceAmount = (ts) => {
    if (typeof ts?.advancesTotal === 'number') return ts.advancesTotal;
    if (typeof ts?.advances === 'number') return ts.advances;
    if (ts?.advances && typeof ts.advances === 'object') {
      // Sum amounts from the advances object
      return Object.values(ts.advances).reduce((sum, a) => {
        const amt = typeof a === 'object' ? a.amount : a;
        return sum + (parseFloat(amt) || 0);
      }, 0);
    }
    return 0;
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      draft: { class: 'bg-warning', text: 'Draft' },
      submitted: { class: 'bg-info', text: 'Submitted' },
      approved: { class: 'bg-success', text: 'Approved' },
      rejected: { class: 'bg-danger', text: 'Rejected' },
      assigned: { class: 'bg-primary', text: 'Assigned' },
      clarification: { class: 'bg-warning', text: 'Clarification' }
    };
    
    const config = statusConfig[status?.toLowerCase()] || { class: 'bg-secondary', text: status || 'Unknown' };
    return <span className={`badge ${config.class}`}>{config.text}</span>;
  };

  // Calculate totals
  const totals = filteredTimesheets.reduce((acc, ts) => ({
    totalDays: acc.totalDays + (parseFloat(ts.totalDays) || 0),
    workingDays: acc.workingDays + (parseFloat(ts.workingDays) || 0),
    leaves: acc.leaves + (parseFloat(ts.leaves) || 0),
    holidays: acc.holidays + (parseFloat(ts.holidays) || 0),
    advances: acc.advances + getAdvanceAmount(ts),
    netPayable: acc.netPayable + (parseFloat(ts.netPayable) || 0),
    totalSalary: acc.totalSalary + (parseFloat(ts.totalSalary) || 0)
  }), {
    totalDays: 0,
    workingDays: 0,
    leaves: 0,
    holidays: 0,
    advances: 0,
    netPayable: 0,
    totalSalary: 0
  });

  // Format period for display
  const formatPeriodLabel = (periodKey) => {
    if (!periodKey) return '';
    if (periodKey.includes('_to_')) {
      const [s, e] = periodKey.split('_to_');
      const [sy, sm, sd] = s.split('-');
      const [ey, em, ed] = e.split('-');
      const smon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][parseInt(sm, 10) - 1];
      const emon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][parseInt(em, 10) - 1];
      const yy = String(ey).slice(-2);
      return `${smon}-${sd} to ${emon}-${ed} '${yy}`;
    }
    // monthly (YYYY-MM)
    const [y, m] = periodKey.split('-');
    const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][parseInt(m, 10) - 1] || m;
    return `${month}-${String(y).slice(-2)}`;
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <div className="mt-2 text-muted">Loading timesheets...</div>
      </div>
    );
  }

  return (
    <div className="timesheet-table-container">
      {/* Debug Info */}
      <div className="alert alert-dark bg-dark text-light border-secondary mb-3">
        <div className="d-flex justify-content-between align-items-start">
          <div>
            <small>
              <strong>Debug Info:</strong> {debugInfo}
            </small>
            <br />
            <small className="text-warning">
              <strong>Employee ID:</strong> {employee?.id} | 
              <strong> Total Timesheets:</strong> {allTimesheets.length}
            </small>
          </div>
          <button 
            className="btn btn-sm btn-outline-warning"
            onClick={fetchTimesheetsFromCorrectPath}
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Year Selection */}
      <div className="row mb-4">
        <div className="col-md-6">
          <div className="bg-secondary rounded p-3 bg-opacity-10">
            <label className="form-label text-white">
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
        <div className="col-md-6">
          <div className="bg-secondary rounded p-3 bg-opacity-10"> 
            <label className="form-label text-white">
              <strong>Current Selection</strong>
            </label>
            <div className="alert alert-info bg-dark mb-0 text-white">
              <strong>
                {selectedYear} - {selectedMonth === 'all' ? 'All Months' : months.find(m => m.number === selectedMonth)?.name}
                {selectedYear && ` (${filteredTimesheets.length} timesheets)`}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* Month Buttons with Counts */}
      {selectedYear && (
        <div className="row mb-4">
          <div className="col-12">
            <label className="form-label text-info mb-3">
              <strong>Select Month ({getAvailableYears().length > 0 ? `${selectedYear} Data` : 'No Data'})</strong>
            </label>
            <div className="d-flex flex-wrap gap-2">
              {/* "All" Button */}
              <button
                key="all"
                className={`btn ${selectedMonth === 'all' ? 'btn-warning' : 'btn-outline-warning'} btn-sm position-relative`}
                onClick={() => setSelectedMonth('all')}
                style={{ minWidth: '80px' }}
              >
                All
                <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-info">
                  {allTimesheets.filter(ts => {
                    let sheetYear = '';
                    if (ts.periodKey) sheetYear = ts.periodKey.split('-')[0];
                    return sheetYear === selectedYear;
                  }).length}
                </span>
              </button>

              {/* Month Buttons */}
              {months.map(month => {
                const count = getTimesheetCountForMonth(month.number);
                const isActive = month.number === selectedMonth;
                
                return (
                  <button
                    key={month.number}
                    className={`btn ${isActive ? 'btn-warning' : 'btn-outline-warning'} btn-sm position-relative`}
                    onClick={() => setSelectedMonth(month.number)}
                    style={{ minWidth: '70px' }}
                    disabled={count === 0}
                  >
                    {month.name}
                    {count > 0 && (
                      <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-success">
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Timesheet Table */}
      <div className="table-responsive">
        <table className="table table-dark table-hover table-bordered mb-0">
          <thead className="table-secondary">
            <tr>
              <th className="border-secondary text-center">Month</th>
              <th className="border-secondary text-center">Timesheet ID</th>
              <th className="border-secondary text-center">Period</th>
              <th className="border-secondary text-center">Total Days</th>
              <th className="border-secondary text-center">Working Days</th>
              <th className="border-secondary text-center">Leaves</th>
              <th className="border-secondary text-center">Holidays</th>
              <th className="border-secondary text-center">Advances</th>
              <th className="border-secondary text-center">Total Salary</th>
              <th className="border-secondary text-center">Net Payable</th>
              <th className="border-secondary text-center">Status</th>
              <th className="border-secondary text-center">Last Updated</th>
              <th className="border-secondary text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredTimesheets.length > 0 ? (
              filteredTimesheets.map(timesheet => {
                let sheetMonth = '';
                let sheetYear = '';
                
                if (timesheet.periodKey && timesheet.periodKey.includes('-')) {
                  if (timesheet.periodKey.includes('_to_')) {
                    sheetYear = timesheet.periodKey.split('_to_')[0].split('-')[0];
                    sheetMonth = timesheet.periodKey.split('_to_')[0].split('-')[1];
                  } else {
                    sheetYear = timesheet.periodKey.split('-')[0];
                    sheetMonth = timesheet.periodKey.split('-')[1];
                  }
                }

                const monthInfo = months.find(m => m.number === sheetMonth);
                
                return (
                  <tr key={timesheet.id}>
                    <td className="border-secondary text-center">
                      <strong className="text-warning">
                        {monthInfo?.name || 'N/A'}
                      </strong>
                    </td>
                    <td className="border-secondary">
                      <small className="text-info">{timesheet.timesheetId || timesheet.id}</small>
                    </td>
                    <td className="border-secondary">
                      <small className="text-white">{formatPeriodLabel(timesheet.periodKey) || timesheet.period || 'N/A'}</small>
                    </td>
                    <td className="border-secondary text-center">
                      <span className="fw-bold text-white">{timesheet.totalDays || 0}</span>
                    </td>
                    <td className="border-secondary text-center">
                      <span className="fw-bold text-success">{timesheet.workingDays || 0}</span>
                    </td>
                    <td className="border-secondary text-center">
                      <span className="fw-bold text-warning">{timesheet.leaves || 0}</span>
                    </td>
                    <td className="border-secondary text-center">
                      <span className="fw-bold text-primary">{timesheet.holidays || 0}</span>
                    </td>
                    <td className="border-secondary text-center">
                    <span className="fw-bold text-danger">₹{getAdvanceAmount(timesheet)}</span>
                    </td>
                    <td className="border-secondary text-center">
                      <span className="fw-bold text-success">₹{timesheet.totalSalary || 0}</span>
                    </td>
                    <td className="border-secondary text-center">
                      <span className="fw-bold text-success">₹{timesheet.netPayable || 0}</span>
                    </td>
                    <td className="border-secondary text-center">
                      {getStatusBadge(timesheet.status)}
                    </td>
                    <td className="border-secondary">
                      <small className="text-muted">
                        {timesheet.updatedAt ? 
                          new Date(timesheet.updatedAt).toLocaleDateString('en-IN') : 
                          'N/A'
                        }
                      </small>
                    </td>
                    <td className="border-secondary text-center">
                      <button
                        className="btn btn-sm btn-outline-info"
                        onClick={() => loadTimesheetDetails(timesheet)}
                        title="View Full Details"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="13" className="text-center py-4 text-muted border-secondary">
                  {allTimesheets.length === 0 ? (
                    <div>
                      <h5 className="text-info">No Timesheets Found</h5>
                      <p className="text-muted">
                        This employee doesn't have any timesheets yet.
                        <br />
                        <small>Employee ID: {employee?.id}</small>
                      </p>
                    </div>
                  ) : selectedYear ? (
                    `No timesheets found for ${selectedYear}${selectedMonth !== 'all' ? `-${selectedMonth}` : ''}.`
                  ) : (
                    'Please select a year to view timesheets.'
                  )}
                </td>
              </tr>
            )}
          </tbody>
          
          {/* Footer with Totals */}
          {filteredTimesheets.length > 0 && (
            <tfoot className="table-warning">
              <tr>
                <td colSpan="3" className="text-end fw-bold border-secondary text-dark">
                  {selectedMonth === 'all' ? `Year ${selectedYear} Total:` : `Month Total:`}
                </td>
                <td className="text-center fw-bold border-secondary text-dark">
                  {totals.totalDays}
                </td>
                <td className="text-center fw-bold border-secondary text-dark">
                  {totals.workingDays}
                </td>
                <td className="text-center fw-bold border-secondary text-dark">
                  {totals.leaves}
                </td>
                <td className="text-center fw-bold border-secondary text-dark">
                  {totals.holidays}
                </td>
                <td className="text-center fw-bold border-secondary text-dark">
                  ₹{totals.advances}
                </td>
                <td className="text-center fw-bold border-secondary text-dark">
                  ₹{totals.totalSalary}
                </td>
                <td className="text-center fw-bold border-secondary text-dark">
                  ₹{totals.netPayable}
                </td>
                <td colSpan="3" className="border-secondary text-dark">
                  <small>
                    {filteredTimesheets.length} timesheet(s)
                  </small>
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Timesheet Details Modal */}
      {showTimesheetModal && selectedTimesheet && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.9)' }}>
          <div className="modal-dialog modal-xl">
            <div className="modal-content bg-dark">
              <div className="modal-header bg-primary bg-opacity-25 border-primary">
                <h5 className="modal-title text-white">
                  <i className="fas fa-file-invoice me-2"></i>
                  Timesheet Details - {selectedTimesheet.timesheetId}
                </h5>
                <button 
                  type="button" 
                  className="btn-close btn-close-white"
                  onClick={() => {
                    setShowTimesheetModal(false);
                    setSelectedTimesheet(null);
                    setTimesheetEntries([]);
                    setTimesheetAdvances([]);
                  }}
                ></button>
              </div>
              <div className="modal-body">
                {/* Timesheet Summary */}
                <div className="row mb-4">
                  <div className="col-12">
                    <div className="card bg-dark border-info">
                      <div className="card-header bg-info bg-opacity-25 border-info">
                        <h6 className="mb-0 text-white">Timesheet Summary</h6>
                      </div>
                      <div className="card-body">
                        <div className="row">
                          <div className="col-md-3">
                            <strong className="text-info">Period:</strong>
                            <div className="text-white">{formatPeriodLabel(selectedTimesheet.periodKey)}</div>
                          </div>
                          <div className="col-md-3">
                            <strong className="text-info">Status:</strong>
                            <div>{getStatusBadge(selectedTimesheet.status)}</div>
                          </div>
                          <div className="col-md-3">
                            <strong className="text-info">Working Days:</strong>
                            <div className="text-success">{selectedTimesheet.workingDays || 0}</div>
                          </div>
                          <div className="col-md-3">
                            <strong className="text-info">Total Salary:</strong>
                            <div className="text-success">₹{selectedTimesheet.totalSalary || 0}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Daily Entries */}
                <div className="row mb-4">
                  <div className="col-12">
                    <div className="card bg-dark border-secondary">
                      <div className="card-header bg-secondary bg-opacity-25 border-secondary">
                        <h6 className="mb-0 text-white">
                          Daily Entries ({timesheetEntries.length})
                        </h6>
                      </div>
                      <div className="card-body p-0">
                        <div className="table-responsive">
                          <table className="table table-dark table-sm mb-0">
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
                              {timesheetEntries.map(entry => (
                                <tr key={entry.id}>
                                  <td>
                                    <small className="text-info">
                                      {new Date(entry.date).toLocaleDateString('en-IN')}
                                    </small>
                                  </td>
                                  <td>
                                    <small className="text-warning">{entry.clientId}</small>
                                    <br />
                                    <small>{entry.clientName}</small>
                                  </td>
                                  <td>
                                    <small className="text-muted">{entry.jobRole}</small>
                                  </td>
                                  <td>
                                    <span className={`badge ${
                                      entry.isEmergency ? "bg-danger" :
                                      entry.status === "present" ? "bg-success" :
                                      entry.status === "leave" ? "bg-warning" :
                                      entry.status === "absent" ? "bg-info" :
                                      entry.status === "holiday" ? "bg-primary" : "bg-secondary"
                                    }`}>
                                      {entry.isEmergency ? "Emergency" : entry.status}
                                    </span>
                                    {entry.isHalfDay && !entry.isEmergency && (
                                      <span className="badge bg-info ms-1">½</span>
                                    )}
                                  </td>
                                  <td className={
                                    entry.dailySalary === 0 ? "text-danger" :
                                    entry.isHalfDay ? "text-warning" : "text-success"
                                  }>
                                    ₹{entry.dailySalary?.toFixed(2)}
                                  </td>
                                  <td>
                                    <small className="text-muted">
                                      {entry.notes || '—'}
                                    </small>
                                  </td>
                                </tr>
                              ))}
                              {timesheetEntries.length === 0 && (
                                <tr>
                                  <td colSpan="6" className="text-center text-muted py-3">
                                    No daily entries found
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

                {/* Advances */}
                {timesheetAdvances.length > 0 && (
                  <div className="row">
                    <div className="col-12">
                      <div className="card bg-dark border-warning">
                        <div className="card-header bg-warning bg-opacity-25 border-warning">
                          <h6 className="mb-0 text-white">
                            Advances ({timesheetAdvances.length})
                          </h6>
                        </div>
                        <div className="card-body p-0">
                          <div className="table-responsive">
                            <table className="table table-dark table-sm mb-0">
                              <thead>
                                <tr>
                                  <th>Date</th>
                                  <th>Amount</th>
                                  <th>Reason</th>
                                  <th>Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {timesheetAdvances.map(advance => (
                                  <tr key={advance.id}>
                                    <td>
                                      <small className="text-info">
                                        {advance.date ? new Date(advance.date).toLocaleDateString('en-IN') : 'N/A'}
                                      </small>
                                    </td>
                                    <td className="text-danger">
                                      ₹{advance.amount || 0}
                                    </td>
                                    <td>
                                      <small>{advance.reason || '—'}</small>
                                    </td>
                                    <td>
                                      <span className={`badge ${
                                        advance.status === 'settled' ? 'bg-success' : 'bg-warning'
                                      }`}>
                                        {advance.status || 'pending'}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowTimesheetModal(false);
                    setSelectedTimesheet(null);
                    setTimesheetEntries([]);
                    setTimesheetAdvances([]);
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      {filteredTimesheets.length > 0 && (
        <div className="row mt-4">
          <div className="col-xl-2 col-md-4 col-6 mb-3">
            <div className="card bg-dark border-info text-center">
              <div className="card-body py-3">
                <h6 className="text-info mb-1">Total Timesheets</h6>
                <h4 className="text-white mb-0">{filteredTimesheets.length}</h4>
              </div>
            </div>
          </div>
          <div className="col-xl-2 col-md-4 col-6 mb-3">
            <div className="card bg-dark border-success text-center">
              <div className="card-body py-3">
                <h6 className="text-success mb-1">Working Days</h6>
                <h4 className="text-white mb-0">{totals.workingDays}</h4>
              </div>
            </div>
          </div>
          <div className="col-xl-2 col-md-4 col-6 mb-3">
            <div className="card bg-dark border-warning text-center">
              <div className="card-body py-3">
                <h6 className="text-warning mb-1">Total Leaves</h6>
                <h4 className="text-white mb-0">{totals.leaves}</h4>
              </div>
            </div>
          </div>
          <div className="col-xl-2 col-md-4 col-6 mb-3">
            <div className="card bg-dark border-primary text-center">
              <div className="card-body py-3">
                <h6 className="text-primary mb-1">Total Holidays</h6>
                <h4 className="text-white mb-0">{totals.holidays}</h4>
              </div>
            </div>
          </div>
          <div className="col-xl-2 col-md-4 col-6 mb-3">
            <div className="card bg-dark border-danger text-center">
              <div className="card-body py-3">
                <h6 className="text-danger mb-1">Total Advances</h6>
                <h4 className="text-white mb-0">₹{totals.advances}</h4>
              </div>
            </div>
          </div>
          <div className="col-xl-2 col-md-4 col-6 mb-3">
            <div className="card bg-dark border-success text-center">
              <div className="card-body py-3">
                <h6 className="text-success mb-1">Net Payable</h6>
                <h4 className="text-white mb-0">₹{totals.netPayable}</h4>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimesheetTable;