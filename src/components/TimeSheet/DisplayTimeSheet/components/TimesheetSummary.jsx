// Timesheet/DisplayTimeSheet/components/TimesheetSummary.jsx
import React from 'react';
import { useTimesheet } from '../context/TimesheetContext';
import { monthShort } from '../utils/timesheetHelpers';

const TimesheetSummary = () => {
  const {
    timesheet,
    advances,
    employees,
    selectedEmployee
  } = useTimesheet();

  const employee = employees.find(emp => emp.id === selectedEmployee);

  const calculateTotalAdvances = () => {
    if (!timesheet && !advances) return 0;

    if (advances && advances.length > 0) {
      return advances.reduce((sum, advance) => {
        const amount = parseFloat(advance?.amount) || 0;
        return sum + amount;
      }, 0);
    }

    const advancesData = timesheet?.advances || timesheet?.advancesTotal || 0;

    if (advancesData && typeof advancesData === 'object') {
      return Object.values(advancesData).reduce((sum, advance) => {
        return sum + (parseFloat(advance?.amount) || 0);
      }, 0);
    }

    return Number(advancesData || 0);
  };

  const formatDisplayPeriod = () => {
    if (!timesheet) return '';

    if (timesheet.periodKey) {
      if (timesheet.periodKey.includes('_to_')) {
        const [s, e] = timesheet.periodKey.split('_to_');
        const [sy, sm, sd] = s.split('-');
        const [ey, em, ed] = e.split('-');
        const smon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][parseInt(sm, 10) - 1];
        const emon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][parseInt(em, 10) - 1];
        const yy = String(ey).slice(-2);
        return `${smon}-${sd} to ${emon}-${ed} '${yy}`;
      } else {
        return monthShort(timesheet.periodKey);
      }
    }

    if (timesheet.period) {
      return timesheet.period;
    }

    if (timesheet.startDate && timesheet.endDate) {
      const start = new Date(timesheet.startDate);
      const end = new Date(timesheet.endDate);
      const smon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][start.getMonth()];
      const emon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][end.getMonth()];
      const yy = String(end.getFullYear()).slice(-2);
      return `${smon}-${start.getDate()} to ${emon}-${end.getDate()} '${yy}`;
    }

    return 'Period not specified';
  };

  const totalAdvances = calculateTotalAdvances();
  const totalSalary = Number(timesheet?.totalSalary || 0);
  const netPayable = totalSalary - totalAdvances;
  const displayPeriod = formatDisplayPeriod();

  if (!timesheet) return null;

  return (
    <div className="row mb-4">
      <div className="col-12">
        <div className="card bg-dark border-primary">
          <div className="card-header bg-primary bg-opacity-25 border-primary d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center">
              {employee?.employeePhotoUrl ? (
                <img
                  src={employee.employeePhotoUrl}
                  alt="Employee"
                  className="rounded-circle me-3"
                  style={{ width: '60px', height: '60px', objectFit: 'cover' }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    const fallback = e.target.nextSibling;
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
              ) : null}

              <div>
                <h5 className="card-title mb-0 text-info">
                  Timesheet Summary - {timesheet.employeeName}
                </h5>
                <small className="text-warning">
                  <strong>Period:</strong> {displayPeriod}
                </small>
              </div>
            </div>

            <div className="mb-2 text-center">
              <small className="text-muted me-3">Timesheet ID:</small>
              <br />
              <span className="badge bg-warning">{timesheet.timesheetId || timesheet.id}</span>
            </div>
            <span className={`badge ${timesheet.status === 'draft' ? 'bg-warning' :
                timesheet.status === 'submitted' ? 'bg-info' :
                  timesheet.status === 'approved' ? 'bg-success' : 'bg-secondary'
              }`}>
              {timesheet.status?.toUpperCase()}
            </span>
          </div>

          <div className="card-body">
            <div className="row">
              <div className="col-lg-6 mb-4">
                <div className="card bg-secondary bg-opacity-10 border-secondary h-100">
                  <div className="card-header bg-info bg-opacity-10 border-info">
                    <h6 className="mb-0 text-white">
                      <i className="fas fa-calendar-check me-2"></i>
                      Attendance Summary
                    </h6>
                  </div>
                  <div className="card-body">
                    <div className="row g-3">
                      <div className="col-md-4 col-6">
                        <div className="bg-success bg-opacity-10 rounded p-3 border border-success text-center">
                          <small className="text-muted d-block">Working Days</small>
                          <div className="text-success h4 mb-0">{timesheet.workingDays || 0}</div>
                        </div>
                      </div>
                      <div className="col-md-4 col-6">
                        <div className="bg-warning bg-opacity-10 rounded p-3 border border-warning text-center">
                          <small className="text-muted d-block">Leaves</small>
                          <div className="text-warning h4 mb-0">{timesheet.leaves || 0}</div>
                        </div>
                      </div>
                      <div className="col-md-4 col-6">
                        <div className="bg-primary bg-opacity-10 rounded p-3 border border-primary text-center">
                          <small className="text-muted d-block">Holidays</small>
                          <div className="text-primary h4 mb-0">{timesheet.holidays || 0}</div>
                        </div>
                      </div>
                      <div className="col-md-4 col-6">
                        <div className="bg-info bg-opacity-10 rounded p-3 border border-info text-center">
                          <small className="text-muted d-block">Emergencies</small>
                          <div className="text-info h4 mb-0">{timesheet.emergencies || 0}</div>
                        </div>
                      </div>
                      <div className="col-md-4 col-6">
                        <div className="bg-danger bg-opacity-10 rounded p-3 border border-danger text-center">
                          <small className="text-muted d-block">Absents</small>
                          <div className="text-danger h4 mb-0">{timesheet.absents || 0}</div>
                        </div>
                      </div>
                      <div className="col-md-4 col-6">
                        <div className="bg-secondary bg-opacity-10 rounded p-3 border border-secondary text-center">
                          <small className="text-muted d-block">Total Days</small>
                          <div className="text-white h4 mb-0">{timesheet.totalDays || 0}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-lg-6 mb-4">
                <div className="card bg-secondary bg-opacity-10 border-secondary h-100">
                  <div className="card-header bg-success bg-opacity-10 border-success">
                    <h6 className="mb-0 text-white">
                      <i className="fas fa-money-bill-wave me-2"></i>
                      Salary Breakdown
                    </h6>
                  </div>
                  <div className="card-body">
                    <div className="row g-3">
                      <div className="col-md-6">
                        <div className="bg-dark bg-opacity-50 rounded p-3 border border-secondary text-center">
                          <small className="text-muted d-block">Basic Salary</small>
                          <div className="text-white h5 mb-0">₹{employee?.basicSalary || 0}</div>
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="bg-dark bg-opacity-50 rounded p-3 border border-secondary text-center">
                          <small className="text-muted d-block">Daily Rate</small>
                          <div className="text-white h5 mb-0">₹{Math.round((employee?.basicSalary || 0) / 30)}</div>
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="bg-success bg-opacity-10 rounded p-3 border border-success text-center">
                          <small className="text-muted d-block">Total Salary</small>
                          <div className="text-success h5 mb-0">₹{totalSalary.toFixed(2)}</div>
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="bg-danger bg-opacity-10 rounded p-3 border border-danger text-center">
                          <small className="text-muted d-block">Advances</small>
                          <div className="text-danger h5 mb-0">₹{totalAdvances.toFixed(0)}</div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 p-3 bg-warning bg-opacity-10 rounded border border-warning">
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <span className="text-white h6 mb-0">Net Payable Amount</span>
                          <br />
                          <small className="text-muted">Total Salary - Advances</small>
                        </div>
                        <span className={netPayable < 0 ? 'text-danger h4 mb-0' : 'text-warning h4 mb-0'}>
                          ₹{netPayable.toFixed(0)}
                        </span>
                      </div>
                      {netPayable < 0 && (
                        <div className="mt-2 alert alert-danger bg-danger bg-opacity-10 border-danger py-1">
                          <small className="text-danger">
                            <i className="bi bi-exclamation-triangle me-1"></i>
                            Negative balance: Employee owes money
                          </small>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimesheetSummary;