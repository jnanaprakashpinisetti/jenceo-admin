// Timesheet/DisplayTimeSheet/components/TimesheetHeader.jsx
import React, { useState, useEffect } from 'react';
import WorkerSearch from './WorkerSearch';
import { useTimesheet } from '../context/TimesheetContext';
import { getCurrentPeriodKey } from '../utils/timesheetHelpers';

const TimesheetHeader = () => {
  const {
    employees,
    selectedEmployee,
    selectedMonth,
    startDate,
    endDate,
    useDateRange,
    setSelectedEmployee,
    setSelectedMonth,
    setStartDate,
    setEndDate,
    setUseDateRange,
    loadTimesheet,
  } = useTimesheet();

  // Add safe versions of functions
  const safeSetStartDate = setStartDate || (() => {
    console.warn('setStartDate is not available in context');
  });
  
  const safeSetEndDate = setEndDate || (() => {
    console.warn('setEndDate is not available in context');
  });

  const [localUseDateRange, setLocalUseDateRange] = useState(useDateRange);

  // Update useEffect to use safe functions
  useEffect(() => {
    if (!startDate) {
      const defaultStart = new Date();
      defaultStart.setDate(1);
      safeSetStartDate(defaultStart.toISOString().split('T')[0]);
    }
    if (!endDate) {
      const defaultEnd = new Date();
      defaultEnd.setDate(28);
      safeSetEndDate(defaultEnd.toISOString().split('T')[0]);
    }
    if (!selectedMonth && setSelectedMonth) {
      const now = new Date();
      setSelectedMonth(now.toISOString().slice(0, 7));
    }
  }, []);

  const handlePeriodChange = () => {
    setUseDateRange(localUseDateRange);
    if (selectedEmployee) {
      // Reset timesheet data before loading new period
      loadTimesheet();
    }
  };

  const handleEmployeeSelect = (employeeId) => {
    setSelectedEmployee(employeeId);
    // Load timesheet for selected employee
    if (employeeId) {
      setTimeout(() => loadTimesheet(), 100);
    }
  };

  return (
    <div className="row mb-4">
      <div className="col-12">
        <div className="card bg-dark border-secondary">
          <div className="card-header bg-primary bg-opacity-25 border-primary">
            <h5 className="card-title mb-0 text-white">
              <i className="fas fa-user-clock me-2"></i>
              Timesheet Management
            </h5>
          </div>
          <div className="card-body">
            <div className="row g-3 align-items-end">
              <div className="col-md-5">
                <label className="form-label text-warning mb-1">
                  <strong><i className="fas fa-search me-2"></i>Search Employee</strong>
                  <small className="text-muted ms-2">({employees.length} employees available)</small>
                </label>
                <WorkerSearch
                  employees={employees}
                  onSelectEmployee={handleEmployeeSelect}
                  selectedEmployee={selectedEmployee}
                />
              </div>

              <div className="col-md-7">
                <div className="row g-3">
                  <div className="col-md-3">
                    <div className="form-check form-switch">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="dateRangeToggle"
                        checked={localUseDateRange}
                        onChange={(e) => setLocalUseDateRange(e.target.checked)}
                      />
                      <label className="form-check-label text-info" htmlFor="dateRangeToggle">
                        Use Date Range
                      </label>
                    </div>
                  </div>

                  {!localUseDateRange ? (
                    <div className="col-md-5">
                      <label className="form-label text-white">Select Month</label>
                      <input
                        type="month"
                        className="form-control bg-dark text-white border-secondary"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        onBlur={handlePeriodChange}
                      />
                    </div>
                  ) : (
                    <>
                      <div className="col-md-4">
                        <label className="form-label text-white">Start Date</label>
                        <input
                          type="date"
                          className="form-control bg-dark text-white border-secondary"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          onBlur={handlePeriodChange}
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label text-white">End Date</label>
                        <input
                          type="date"
                          className="form-control bg-dark text-white border-secondary"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          onBlur={handlePeriodChange}
                        />
                      </div>
                    </>
                  )}

                  {selectedEmployee && (
                    <div className="col-md-4">
                      <button
                        className="btn btn-outline-info w-100"
                        onClick={handlePeriodChange}
                      >
                        <i className="fas fa-sync-alt me-2"></i>
                        Refresh
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {selectedEmployee && (
              <div className="row mt-3">
                <div className="col-12">
                  <div className="alert alert-info bg-info bg-opacity-10 border-info">
                    <div className="d-flex justify-content-between align-items-center">
                      <small className="text-white">
                        <strong>Active Period:</strong> {
                          getCurrentPeriodKey(localUseDateRange, startDate, endDate, selectedMonth)
                        }
                      </small>
                      {selectedEmployee && (
                        <small className="text-warning">
                          <strong>Employee ID:</strong> {selectedEmployee}
                        </small>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimesheetHeader;