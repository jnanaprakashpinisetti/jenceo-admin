// Timesheet/DisplayTimeSheet/components/TimesheetActions.jsx
import React from 'react';
import { useTimesheet } from '../context/TimesheetContext';
import { useTimesheetOperations } from '../hooks/useTimesheetOperations';

const TimesheetActions = () => {
  const {
    timesheet,
    dailyEntries,
    selectedEntries,
    isReadOnly,
    isSaving,
    hasUnsavedChanges,
    showSubmittedError,
    toggleModal,
    setDailyEntries,
    setTimesheet,
    setSelectedEntries,
  } = useTimesheet();

  const {
    saveTimesheet,
    submitTimesheet,
    handleAddEntry,
  } = useTimesheetOperations();

  const handleClearEntries = () => {
    if (isReadOnly) {
      toggleModal('showModal', {
        title: 'Locked',
        message: `This timesheet is ${timesheet?.status}. Editing is disabled.`,
        type: 'warning'
      });
      return;
    }

    setDailyEntries([]);
    if (timesheet) {
      const resetTimesheet = {
        ...timesheet,
        status: 'draft',
        workingDays: 0,
        fullDays: 0,
        halfDays: 0,
        leaves: 0,
        holidays: 0,
        emergencies: 0,
        absents: 0,
        totalDays: 0,
        totalSalary: 0,
        advances: 0,
        netPayable: 0,
        updatedAt: new Date().toISOString()
      };
      setTimesheet(resetTimesheet);
    }
    setSelectedEntries([]);
    toggleModal('showModal', {
      title: 'Cleared',
      message: 'Daily entries cleared. Timesheet reset to draft status.',
      type: 'info'
    });
  };

  const handleBulkDelete = () => {
    if (isReadOnly) {
      toggleModal('showReadOnlyModal', true);
      return;
    }

    if (selectedEntries.length === 0) {
      toggleModal('showModal', {
        title: 'Warning',
        message: 'Please select entries to delete.',
        type: 'warning'
      });
      return;
    }

    toggleModal('showDeleteModal', true);
  };

  return (
    <div className="row mb-3">
      <div className="col-12">
        <button
          className="btn btn-outline-primary me-2"
          onClick={saveTimesheet}
          disabled={isReadOnly || !timesheet || dailyEntries.length === 0 || isSaving || !hasUnsavedChanges}
        >
          {isSaving ? (
            <>
              <div className="spinner-border spinner-border-sm me-2" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              Saving...
            </>
          ) : (
            <>
              <i className="bi bi-save me-2"></i> Save
            </>
          )}
        </button>

        <button
          className="btn btn-outline-warning me-2"
          onClick={() => toggleModal('showAutoFillModal', true)}
          disabled={isReadOnly || !timesheet}
        >
          <i className="bi bi-magic me-2"></i> Auto-Fill
        </button>

        <button
          className="btn btn-outline-info me-2"
          onClick={() => toggleModal('showEntryModal', true)}
          disabled={!timesheet}
        >
          <i className="bi bi-plus-lg me-2"></i>
          Add Entry
        </button>

        {timesheet && (
          <>
            {selectedEntries.length > 0 && (
              <button
                className="btn btn-outline-danger me-2"
                onClick={handleBulkDelete}
                disabled={isReadOnly}
              >
                <i className="bi bi-trash me-2"></i>
                Delete Selected ({selectedEntries.length})
              </button>
            )}

            <button
              className="btn btn-outline-danger me-2"
              onClick={handleClearEntries}
              disabled={isReadOnly}
            >
              <i className="bi bi-x-circle me-2"></i> Clear Entries
            </button>

            <button
              className="btn btn-success"
              onClick={submitTimesheet}
              disabled={isReadOnly || timesheet?.status === 'submitted' || showSubmittedError || dailyEntries.length === 0}
            >
              {timesheet?.status === 'submitted' ? (
                <>
                  <i className="fas fa-check me-2"></i>
                  Submitted
                </>
              ) : (
                <>
                  <i className="fas fa-paper-plane me-2"></i>
                  Submit
                </>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default TimesheetActions;