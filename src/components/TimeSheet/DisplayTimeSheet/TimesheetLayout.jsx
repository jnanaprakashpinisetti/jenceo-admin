// Timesheet/DisplayTimeSheet/TimesheetLayout.jsx (updated)
import React from 'react';
import { useTimesheet } from './context/TimesheetContext';
import TimesheetHeader from './components/TimesheetHeader';
import PreviousTimesheetsTable from './components/PreviousTimesheetsTable';
import TimesheetSummary from './components/TimesheetSummary';
import TimesheetActions from './components/TimesheetActions';
import DailyEntriesTable from './components/DailyEntriesTable';
import AdvanceManagement from '../AdvanceManagement';
import EntryModal from './modals/EntryModal';
import ConfirmModals from './modals/ConfirmModals';
import ClarifyReplyModal from './modals/ClarifyReplyModal';
import RejectMsgModal from './modals/RejectMsgModal';
import { useTimesheetData } from './hooks/useTimesheetData';
import { useTimesheetOperations } from './hooks/useTimesheetOperations';
import { useAuthCheck } from './hooks/useAuthCheck';

const TimesheetLayout = () => {
  const {
    selectedEmployee,
    timesheet,
    dailyEntries,
    advances,
    previousTimesheets,
    employees,
    showEntryModal,
    showClarifyReplyModal,
    showRejectMsgModal,
    showDuplicateWarning,
    duplicateEntries,
    toggleModal,
  } = useTimesheet();

  // Check what functions are actually exported from useTimesheetData
  const {
    fetchEmployees,
    loadClients,  // Might be named differently
    loadTimesheet,
    fetchClients  // If it exists
  } = useTimesheetData();

  const { handleSaveEntry, handleDeleteEntry } = useTimesheetOperations();
  const { whoSafe, canUserEditTimesheet } = useAuthCheck();

  // Initialize data on mount
React.useEffect(() => {
  fetchEmployees();

  // Try different function names if fetchClients doesn't exist
  const loadClientsFunction = fetchClients || loadClients || (() => {
    console.warn('No client loading function available');
  });
  
  loadClientsFunction();
}, []);

  const handleEditEntry = (entry) => {
    const { uid } = whoSafe();
    const canEdit = canUserEditTimesheet(timesheet);

    if (!canEdit) {
      toggleModal('showReadOnlyModal', true);
      return;
    }

    // Set current entry and open modal
    // This would need to be implemented in context
  };

  return (
    <div className="container-fluid py-4">
      <TimesheetHeader />

      {selectedEmployee && (
        <>
          <PreviousTimesheetsTable />

          {timesheet && (
            <TimesheetSummary />
          )}

          <TimesheetActions />

          <div className="row">
            <div className="col-lg-8">
              <DailyEntriesTable
                onEdit={handleEditEntry}
                onDelete={handleDeleteEntry}
              />
            </div>
            <div className="col-lg-4">
              <AdvanceManagement />
            </div>
          </div>
        </>
      )}

      {!selectedEmployee && (
        <div className="row">
          <div className="col-12">
            <div className="card bg-dark border-secondary text-center">
              <div className="card-body py-5">
                <div className="text-muted mb-3">
                  <i className="bi bi-search display-4 opacity-50"></i>
                </div>
                <h4 className="text-white mb-3 opacity-50">Welcome to Timesheet Management</h4>
                <p className="text-muted mb-4 opacity-75">
                  Please select an employee to view or manage their timesheet entries.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showEntryModal && (
        <EntryModal />
      )}

      <ConfirmModals />

      {showClarifyReplyModal && (
        <ClarifyReplyModal />
      )}

      {showRejectMsgModal && (
        <RejectMsgModal />
      )}

      {showDuplicateWarning && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.8)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content bg-dark border border-warning">
              <div className="modal-header border-warning">
                <h5 className="modal-title text-warning">
                  <i className="fas fa-exclamation-triangle me-2"></i>
                  Duplicate Entry Found
                </h5>
              </div>
              <div className="modal-body">
                <div className="alert alert-warning bg-warning bg-opacity-10 border-warning text-white">
                  <strong>An entry already exists for this date!</strong>
                </div>
                <div className="table-responsive">
                  <table className="table table-sm table-dark">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Client</th>
                        <th>Status</th>
                        <th>Timesheet</th>
                      </tr>
                    </thead>
                    <tbody>
                      {duplicateEntries.map((entry, index) => (
                        <tr key={index}>
                          <td className="text-white">{entry.date}</td>
                          <td className="text-info">{entry.clientName}</td>
                          <td>
                            <span className={`badge ${entry.status === 'present' ? 'bg-success' :
                              entry.status === 'absent' ? 'bg-danger' : 'bg-warning'
                              }`}>
                              {entry.status}
                            </span>
                          </td>
                          <td>
                            <small className="text-muted">{entry.timesheetId}</small>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => toggleModal('showDuplicateWarning', false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimesheetLayout;