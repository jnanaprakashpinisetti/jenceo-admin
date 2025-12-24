// Timesheet/DisplayTimeSheet/components/DailyEntriesTable.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from "../../../../context/AuthContext";
import TimesheetShare from './TimesheetShare';

const DailyEntriesTable = ({
  entries = [],
  timesheet,
  timesheetId,
  onEdit,
  onDelete,
  totalSalary,
  isDisabled,
  isReadOnly,
  selectedEntries = [],
  onSelectEntry,
  onSelectAllEntries,
  employees = [],
  selectedEmployee,
  advances = [],
  previousTimesheets = [],
  whoSafe,
  authContext,
  canUserEditTimesheet,
  setPendingEditAction,
  setShowEditConfirmModal,
  isSubmittedLike,
  setShowReadOnlyModal,
  showReadOnlyModal
}) => {
  const [showShareView, setShowShareView] = useState(false);
  const { user: authUser } = useAuth();
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [currentNote, setCurrentNote] = useState('');
  const [isShareDataReady, setIsShareDataReady] = useState(false);

  useEffect(() => {
    if (entries?.length > 0 && timesheet) {
      setIsShareDataReady(true);
    } else {
      setIsShareDataReady(false);
    }
  }, [entries, timesheet]);

  const handleSelectEntry = (entry) => {
    const { uid } = whoSafe();
    const canEdit = canUserEditTimesheet(timesheet, uid, authContext);

    if (!canEdit) {
      setShowReadOnlyModal(true);
      return;
    }

    onSelectEntry(entry);
  };

  const handleSelectAllEntries = () => {
    const { uid } = whoSafe();
    const canEdit = canUserEditTimesheet(timesheet, uid, authContext);

    if (!canEdit) {
      setShowReadOnlyModal(true);
      return;
    }

    onSelectAllEntries();
  };

  const handleEditClick = (entry) => {
    const { uid } = whoSafe();
    const canEdit = canUserEditTimesheet(timesheet, uid, authContext);

    if (!canEdit) {
      setShowReadOnlyModal(true);
      return;
    }

    if (isSubmittedLike(timesheet?.status)) {
      setPendingEditAction({ type: 'edit', entry: entry });
      setShowEditConfirmModal(true);
    } else {
      onEdit(entry);
    }
  };

  const handleDeleteClick = (entry) => {
    const { uid } = whoSafe();
    const canDelete = canUserEditTimesheet(timesheet, uid, authContext);

    if (!canDelete) {
      setShowReadOnlyModal(true);
      return;
    }

    if (isSubmittedLike(timesheet?.status)) {
      setPendingEditAction({ type: 'delete', entry: entry });
      setShowEditConfirmModal(true);
    } else {
      onDelete(entry);
    }
  };

  return (
    <div className="card bg-dark border-secondary">
      {/* Card Header */}
      <div className="card-header bg-info bg-opacity-25 border-info d-flex justify-content-between align-items-center">
        <div>
          <h5 className="card-title mb-0 text-white">
            <i className="fas fa-calendar-day me-2"></i>
            Daily Entries ({entries.length})
          </h5>
          {timesheetId && (
            <div className="mt-1">
              <small className="text-warning me-3">
                <strong>Timesheet ID:</strong> {timesheetId}
              </small>
              <small className="text-info">
                <strong>Status:</strong> {timesheet?.status || "draft"}
              </small>
              {isReadOnly && timesheet?.assignedTo && (
                <small className="text-warning ms-3">
                  <strong>Assigned To:</strong> {timesheet.assignedToName || timesheet.assignedTo}
                </small>
              )}
            </div>
          )}
        </div>
        <div className="text-end">
          {selectedEntries.length > 0 && (
            <span className="badge bg-primary">
              {selectedEntries.length} selected
            </span>
          )}
        </div>

        <button
          className="btn btn-info ms-2"
          onClick={() => setShowShareView(true)}
          disabled={!timesheet}
        >
          <i className="bi bi-share me-2"></i>
          Share Timesheet
        </button>
      </div>

      {/* Table */}
      <div className="card-body p-0">
        <div className="table-responsive">
          <table className="table table-dark table-hover mb-0">
            <thead>
              <tr>
                <th width="50">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={selectedEntries.length === entries.length && entries.length > 0}
                    onChange={handleSelectAllEntries}
                    disabled={isDisabled || isReadOnly}
                  />
                </th>
                <th>Date</th>
                <th>Client ID</th>
                <th>Client Name</th>
                <th>Job Role</th>
                <th>Status</th>
                <th>Salary</th>
                <th>Modified By</th>
                <th>Comments</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e._rowKey || `${e.employeeId}_${e.date}`}>
                  <td>
                    <input
                      type="checkbox"
                      className="form-check-input"
                      checked={selectedEntries.includes(String(e.id || e.date))}
                      onChange={() => handleSelectEntry(e)}
                      disabled={isDisabled || isReadOnly}
                      value={e.date}
                    />
                  </td>
                  <td>
                    <small className="text-info">
                      {new Date(e.date).toLocaleDateString("en-IN", {
                        weekday: "short",
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </small>
                  </td>
                  <td>
                    <small className="text-warning">{e.clientId}</small>
                  </td>
                  <td>{e.clientName}</td>
                  <td>
                    <small className="text-muted">{e.jobRole}</small>
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        e.isEmergency
                          ? "bg-danger"
                          : e.status === "present"
                          ? "bg-success"
                          : e.status === "leave"
                          ? "bg-warning"
                          : e.status === "absent"
                          ? "bg-info"
                          : e.status === "holiday"
                          ? "bg-primary"
                          : "bg-secondary"
                      }`}
                    >
                      {e.isEmergency ? "Emergency" : e.status}
                    </span>
                    {e.isHalfDay && !e.isEmergency && (
                      <span className="badge bg-info ms-1">½</span>
                    )}
                    {e.isPublicHoliday && !e.isEmergency && (
                      <span className="badge bg-primary ms-1">Holiday</span>
                    )}
                  </td>
                  <td
                    className={
                      e.dailySalary === 0
                        ? "text-danger"
                        : e.isHalfDay
                        ? "text-warning"
                        : "text-success"
                    }
                  >
                    ₹{e.dailySalary?.toFixed(2)}
                  </td>
                  <td>
                    <small className="text-muted">
                      By {e.updatedByName || e.createdByName || "System"}
                    </small>
                    <br />
                    <small className="text-white opacity-50 small-text">
                      {e.updatedAt
                        ? new Date(e.updatedAt).toLocaleString("en-IN")
                        : e.createdAt
                        ? new Date(e.createdAt).toLocaleString("en-IN")
                        : ""}
                    </small>
                  </td>
                  <td>
                    {e.notes ? (
                      <div className="">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-warning"
                          onClick={() => {
                            setCurrentNote(e.notes);
                            setShowNoteModal(true);
                          }}
                        >
                          <i className="bi bi-chat-left-text"></i>
                        </button>
                      </div>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td>
                    <div className="btn-group btn-group-sm">
                      <button
                        className="btn btn-outline-warning btn-sm"
                        onClick={() => handleEditClick(e)}
                        title="Edit Entry"
                        disabled={isReadOnly || timesheet?.status === 'approved' || timesheet?.status === 'rejected'}
                      >
                        <i className="bi bi-pencil"></i>
                      </button>

                      <button
                        className="btn btn-outline-danger btn-sm"
                        onClick={() => handleDeleteClick(e)}
                        disabled={isReadOnly || timesheet?.status === 'approved' || timesheet?.status === 'rejected'}
                        title={timesheet?.status === 'approved' || timesheet?.status === 'rejected' ?
                          'Cannot delete approved/rejected timesheet' : 'Delete Entry'}
                      >
                        <i className="bi bi-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-dark border-top border-secondary">
                <td colSpan="6" className="text-end text-white">
                  <strong>Total Salary:</strong>
                </td>
                <td className="text-warning">
                  <strong>₹{totalSalary?.toFixed(2)}</strong>
                </td>
                <td colSpan="3"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Note Modal */}
      {showNoteModal && (
        <div
          className="modal fade show"
          style={{ display: "block", backgroundColor: "rgba(0,0,0,0.8)" }}
        >
          {/* ... Note Modal JSX ... */}
        </div>
      )}

      {/* Share Modal */}
      {showShareView && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.9)' }}>
          <div className="modal-dialog modal-fullscreen">
            <div className="modal-content bg-light">
              <div className="modal-body p-0">
                <TimesheetShare
                  timesheet={timesheet}
                  dailyEntries={entries}
                  advances={advances}
                  employee={employees.find(emp => emp.id === selectedEmployee)}
                  previousTimesheets={previousTimesheets}
                  onClose={() => setShowShareView(false)}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Read Only Modal */}
      {showReadOnlyModal && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.8)' }}>
          {/* ... Read Only Modal JSX ... */}
        </div>
      )}
    </div>
  );
};

export default DailyEntriesTable;