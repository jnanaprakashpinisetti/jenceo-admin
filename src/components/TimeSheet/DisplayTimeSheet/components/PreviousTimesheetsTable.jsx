// Timesheet/DisplayTimeSheet/components/PreviousTimesheetsTable.jsx
import React from 'react';
import { useTimesheet } from '../context/TimesheetContext';
import { useTimesheetData } from '../hooks/useTimesheetData';
import { useAuthCheck } from '../hooks/useAuthCheck';
import { formatPeriodLabel, isSubmittedLike } from '../utils/timesheetHelpers';

const PreviousTimesheetsTable = () => {
  const {
    selectedEmployee,
    previousTimesheets,
    employees,
    loading,
    toggleModal,
    setPrevTsToDelete,
  } = useTimesheet();

  const { loadDailyEntriesByTimesheetId } = useTimesheetData();
  const { nameForUid } = useAuthCheck();

  const employee = employees.find(e => e.id === selectedEmployee);

  if (!selectedEmployee) return null;

  if (loading) {
    return (
      <div className="row mb-4">
        <div className="col-12">
          <div className="card bg-dark border-secondary text-center">
            <div className="card-body py-4">
              <div className="spinner-border text-info mb-3" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <h5 className="text-white">Loading Timesheets...</h5>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (previousTimesheets.length === 0) {
    return (
      <div className="row mb-4">
        <div className="col-12">
          <div className="card bg-dark border-secondary text-center">
            <div className="card-body py-4">
              <i className="bi bi-inbox display-4 text-muted mb-3"></i>
              <h5 className="text-white opacity-50">No Previous Timesheets Found</h5>
              <p className="text-muted mb-3">
                No timesheets found for this employee. Create a new timesheet to get started.
              </p>
              <button
                className="btn btn-outline-info"
                onClick={() => toggleModal('showEntryModal', true)}
              >
                <i className="bi bi-plus-lg me-2"></i>
                Create First Timesheet
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="row mb-4">
      <div className="col-12">
        <div className="card bg-dark border-secondary">
          <div className="card-header bg-info bg-opacity-25 border-secondary">
            <h5 className="card-title mb-0 text-white">
              <i className="bi bi-clock-history me-2"></i>
              Previous Timesheets for {employee?.firstName} ({previousTimesheets.length})
            </h5>
          </div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-dark table-striped mb-0">
                <thead>
                  <tr>
                    <th>Timesheet ID</th>
                    <th>Period</th>
                    <th>Status</th>
                    <th>Submitted By</th>
                    <th>Assigned To</th>
                    <th>Assigned By</th>
                    <th>Working Days</th>
                    <th>Total Salary</th>
                    <th>Advance</th>
                    <th>Net Salary</th>
                    <th>Action By</th>
                    <th style={{ width: 120 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {previousTimesheets.map((ts) => (
                    <tr key={ts.timesheetId || ts.id}>
                      <td className="text-info fw-bold">
                        {ts.timesheetId || ts.id}
                      </td>
                      <td>
                        <strong>
                          {formatPeriodLabel(ts.periodKey) || ts.period}
                        </strong>
                      </td>
                      <td>
                        <span
                          style={{ textTransform: 'capitalize' }}
                          className={
                            `badge ${ts.status === 'approved' ? 'bg-success' :
                              ts.status === 'assigned' ? 'bg-primary' :
                                ts.status === 'rejected' ? 'bg-danger' :
                                  ts.status === 'clarification' ? 'bg-warning' :
                                    ts.status === 'submitted' ? 'bg-info' : 'bg-secondary'
                            }`}
                        >
                          {ts.status || 'draft'}
                        </span>
                      </td>
                      <td>
                        <small>{ts.submittedByName || (ts.submittedBy ? nameForUid(ts.submittedBy) : 'Not Submitted')}</small>
                        <br />
                        <small className="text-muted opacity-75">
                          {ts.submittedAt ? new Date(ts.submittedAt).toLocaleString('en-IN') : '-'}
                        </small>
                      </td>
                      <td>
                        <small>{ts.assignedToName || 'Not Assigned'}</small>
                      </td>
                      <td>
                        <small>{ts.assignedByName || (ts.assignedBy ? nameForUid(ts.assignedBy) : 'Not Assigned')}</small>
                        <br />
                        <small className="text-muted opacity-75">
                          {ts.assignedAt ? new Date(ts.assignedAt).toLocaleString('en-IN') : '-'}
                        </small>
                      </td>
                      <td>{ts.workingDays ?? 0}</td>
                      <td>₹{Number(ts.totalSalary || 0).toFixed(0)}</td>
                      <td className='text-danger'>
                        ₹{(function () {
                          const advances = ts.advances || ts.advancesTotal || 0;
                          if (advances && typeof advances === 'object') {
                            return Object.values(advances).reduce((sum, advance) => {
                              return sum + (parseFloat(advance?.amount) || 0);
                            }, 0).toFixed(0);
                          }
                          return Number(advances || 0).toFixed(0);
                        })()}
                      </td>
                      <td className={(function () {
                        const totalSalary = Number(ts.totalSalary || 0);
                        let totalAdvances = 0;
                        if (ts.advances && typeof ts.advances === 'object') {
                          totalAdvances = Object.values(ts.advances).reduce((sum, advance) => {
                            return sum + (parseFloat(advance?.amount) || 0);
                          }, 0);
                        } else if (ts.advancesTotal) {
                          totalAdvances = Number(ts.advancesTotal || 0);
                        } else if (ts.advances) {
                          totalAdvances = Number(ts.advances || 0);
                        }
                        const netPayable = totalSalary - totalAdvances;
                        return netPayable < 0 ? 'text-danger' : 'text-warning';
                      })()}>
                        ₹{(function () {
                          const totalSalary = Number(ts.totalSalary || 0);
                          let totalAdvances = 0;
                          if (ts.advances && typeof ts.advances === 'object') {
                            totalAdvances = Object.values(ts.advances).reduce((sum, advance) => {
                              return sum + (parseFloat(advance?.amount) || 0);
                            }, 0);
                          } else if (ts.advancesTotal) {
                            totalAdvances = Number(ts.advancesTotal || 0);
                          } else if (ts.advances) {
                            totalAdvances = Number(ts.advances || 0);
                          }
                          const netPayable = totalSalary - totalAdvances;
                          return netPayable.toFixed(0);
                        })()}
                      </td>
                      <td>-</td>
                      <td>
                        <div className="btn-group btn-group-sm">
                          <button
                            className="btn btn-outline-info"
                            title="Open this timesheet"
                            onClick={() => {
                              loadDailyEntriesByTimesheetId(
                                ts.employeeId || selectedEmployee,
                                ts.timesheetId || ts.id
                              );
                            }}
                          >
                            <i className="bi bi-folder2-open"></i>
                          </button>
                          
                          {(ts.status === 'draft' || ts.status === 'rejected') && (
                            <button
                              className="btn btn-outline-danger"
                              title="Delete Timesheet"
                              onClick={() => {
                                setPrevTsToDelete(ts);
                                toggleModal('showPrevTsDelete', true);
                              }}
                            >
                              <i className="bi bi-trash"></i>
                            </button>
                          )}

                          {ts.status === "clarification" && (
                            <button
                              className="btn btn-outline-warning ms-1"
                              title="Reply to Clarification"
                              onClick={() => {
                                // Open clarification modal
                              }}
                            >
                              <i className="bi bi-reply"></i>
                            </button>
                          )}
                        </div>
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
  );
};

export default PreviousTimesheetsTable;