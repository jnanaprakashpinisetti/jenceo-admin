import React, { useState, useEffect } from 'react';
import firebaseDB from '../../firebase';

const TimesheetTable = ({ employee }) => {
  const [timesheets, setTimesheets] = useState([]);
  const [filteredTimesheets, setFilteredTimesheets] = useState([]);
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [loading, setLoading] = useState(true);

  // Months array with colors
  const months = [
    { number: '01', name: 'Jan', color: 'btn-warning' },
    { number: '02', name: 'Feb', color: 'btn-warning' },
    { number: '03', name: 'Mar', color: 'btn-warning' },
    { number: '04', name: 'Apr', color: 'btn-warning' },
    { number: '05', name: 'May', color: 'btn-warning' },
    { number: '06', name: 'Jun', color: 'btn-warning' },
    { number: '07', name: 'Jul', color: 'btn-warning' },
    { number: '08', name: 'Aug', color: 'btn-warning' },
    { number: '09', name: 'Sep', color: 'btn-warning' },
    { number: '10', name: 'Oct', color: 'btn-warning' },
    { number: '11', name: 'Nov', color: 'btn-warning' },
    { number: '12', name: 'Dec', color: 'btn-warning' }
  ];

  // Initialize current year and month
  useEffect(() => {
    const current = new Date();
    const year = current.getFullYear().toString();
    const month = (current.getMonth() + 1).toString().padStart(2, '0');
    
    setSelectedYear(year);
    setSelectedMonth(month);
  }, []);

  // Fetch timesheets for this employee
  useEffect(() => {
    fetchTimesheets();
  }, [employee]);

  // Filter timesheets when year changes
  useEffect(() => {
    filterTimesheets();
  }, [timesheets, selectedYear]);

  const fetchTimesheets = async () => {
    try {
      setLoading(true);
      const snapshot = await firebaseDB.child("Timesheets").once('value');
      if (snapshot.exists()) {
        const allTimesheets = Object.entries(snapshot.val()).map(([id, data]) => ({
          id,
          ...data
        }));
        
        // Filter timesheets for this employee
        const employeeTimesheets = allTimesheets.filter(ts => 
          ts.employeeId === employee?.id || ts.employeeId === employee?.employeeId
        );
        
        setTimesheets(employeeTimesheets);
      } else {
        setTimesheets([]);
      }
    } catch (error) {
      console.error('Error fetching timesheets:', error);
      setTimesheets([]);
    } finally {
      setLoading(false);
    }
  };

  const filterTimesheets = () => {
    if (!selectedYear) return;

    const filtered = timesheets.filter(timesheet => {
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

      return sheetYear === selectedYear;
    });

    // Sort by month
    filtered.sort((a, b) => {
      const monthA = a.period?.split('-')[1] || a.startDate?.split('-')[1] || '00';
      const monthB = b.period?.split('-')[1] || b.startDate?.split('-')[1] || '00';
      return monthA.localeCompare(monthB);
    });

    setFilteredTimesheets(filtered);
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

  const getTimesheetForMonth = (monthNumber) => {
    return filteredTimesheets.find(ts => {
      const sheetMonth = ts.period?.split('-')[1] || ts.startDate?.split('-')[1];
      return sheetMonth === monthNumber;
    });
  };

  // Calculate totals
  const totals = filteredTimesheets.reduce((acc, ts) => ({
    totalDays: acc.totalDays + (ts.totalDays || 0),
    workingDays: acc.workingDays + (ts.workingDays || 0),
    leaves: acc.leaves + (ts.leaves || 0),
    holidays: acc.holidays + (ts.holidays || 0),
    advances: acc.advances + (ts.advances || 0),
    netPayable: acc.netPayable + (ts.netPayable || 0),
    totalSalary: acc.totalSalary + (ts.totalSalary || 0)
  }), {
    totalDays: 0,
    workingDays: 0,
    leaves: 0,
    holidays: 0,
    advances: 0,
    netPayable: 0,
    totalSalary: 0
  });

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
      {/* Year Selection */}
      <div className="row mb-4">
        <div className="col-md-6">
        <div className="bg-secondary rounded p-2 bg-opacity-10">
          <label className="form-label text-white opacity-50">
            <strong>Select Year</strong>
          </label>
          <div className="alert alert-info bg-dark border-info mb-0 pt-1"> 
          <select 
            className="form-select bg-dark text-white opacity-50 border-secondary"
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
        <div className="col-md-6">
            <div className="bg-secondary rounded p-2 bg-opacity-10"> 
          <label className="form-label text-white opacity-50">
            <strong>Current Selection</strong>
          </label>
          <div className="alert alert-info bg-dark  mb-0 text-white opacity-50">
            <strong>
              {selectedYear} - {selectedMonth && months.find(m => m.number === selectedMonth)?.name}
            </strong>
          </div>
        </div>
        </div>
      </div>

      {/* Month Buttons */}
      <div className="row mb-4">
        <div className="col-12">
          <label className="form-label text-info mb-3">
            <strong>Select Month</strong>
          </label>
          <div className="d-flex flex-wrap gap-2">
            {months.map(month => {
              const timesheet = getTimesheetForMonth(month.number);
              const isActive = month.number === selectedMonth;
              const hasData = !!timesheet;
              
              return (
                <button
                  key={month.number}
                  className={`btn ${month.color} btn-sm position-relative ${isActive ? 'active' : ''}`}
                  onClick={() => setSelectedMonth(month.number)}
                  style={{ minWidth: '60px' }}
                >
                  {month.name}
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
      </div>

      {/* Timesheet Table */}
      <div className="table-responsive">
        <table className="table table-dark table-hover table-bordered mb-0">
          <thead className="table-secondary">
            <tr>
              <th className="border-secondary text-center">Month</th>
              <th className="border-secondary text-center">Period</th>
              <th className="border-secondary text-center">Total Days</th>
              <th className="border-secondary text-center">Working Days</th>
              <th className="border-secondary text-center">Leaves</th>
              <th className="border-secondary text-center">Holidays</th>
              <th className="border-secondary text-center">Advances</th>
              <th className="border-secondary text-center">Total Salary</th>
              <th className="border-secondary text-center">Net Payable</th>
              <th className="border-secondary text-center">Status</th>
              <th className="border-secondary text-center">Submitted</th>
            </tr>
          </thead>
          <tbody>
            {filteredTimesheets.length > 0 ? (
              filteredTimesheets.map(timesheet => {
                const sheetMonth = timesheet.period?.split('-')[1] || timesheet.startDate?.split('-')[1];
                const monthInfo = months.find(m => m.number === sheetMonth);
                const isCurrent = sheetMonth === selectedMonth;
                
                return (
                  <tr 
                    key={timesheet.id} 
                    className={isCurrent ? 'table-active' : ''}
                    onClick={() => setSelectedMonth(sheetMonth)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td className="border-secondary text-center">
                      <strong className={isCurrent ? 'text-warning' : 'text-white'}>
                        {monthInfo?.name || 'N/A'}
                      </strong>
                    </td>
                    <td className="border-secondary">
                      <small className="text-info">{timesheet.period}</small>
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
                      <span className="fw-bold text-danger">₹{timesheet.advances || 0}</span>
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
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="11" className="text-center py-4 text-muted border-secondary">
                  No timesheets found for {selectedYear}. 
                  {selectedYear === new Date().getFullYear().toString() && 
                    ' Timesheets will appear here once created.'}
                </td>
              </tr>
            )}
          </tbody>
          
          {/* Footer with Totals */}
          {filteredTimesheets.length > 0 && (
            <tfoot className="table-warning">
              <tr>
                <td colSpan="2" className="text-end fw-bold border-secondary">
                  Year {selectedYear} Total:
                </td>
                <td className="text-center fw-bold border-secondary text-dark">
                  {totals.totalDays}
                </td>
                <td className="text-center fw-bold border-secondary text-success">
                  {totals.workingDays}
                </td>
                <td className="text-center fw-bold border-secondary text-warning">
                  {totals.leaves}
                </td>
                <td className="text-center fw-bold border-secondary text-primary">
                  {totals.holidays}
                </td>
                <td className="text-center fw-bold border-secondary text-danger">
                  ₹{totals.advances}
                </td>
                <td className="text-center fw-bold border-secondary text-success">
                  ₹{totals.totalSalary}
                </td>
                <td className="text-center fw-bold border-secondary text-success">
                  ₹{totals.netPayable}
                </td>
                <td colSpan="2" className="border-secondary">
                  <small className="text-dark">
                    {filteredTimesheets.length} month(s)
                  </small>
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Summary Cards */}
      {filteredTimesheets.length > 0 && (
        <div className="row mt-4">
          <div className="col-xl-2 col-md-4 col-6 mb-3">
            <div className="card bg-dark border-info text-center">
              <div className="card-body py-3">
                <h6 className="text-info mb-1">Total Months</h6>
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

      {/* No Data Message */}
      {timesheets.length === 0 && (
        <div className="alert alert-info bg-dark border-info text-center mt-4">
          <h5 className="text-info">No Timesheets Found</h5>
          <p className="text-muted mb-0">
            This employee doesn't have any timesheets yet. Timesheets will appear here once they are created in the Timesheet Management system.
          </p>
        </div>
      )}
    </div>
  );
};

export default TimesheetTable;