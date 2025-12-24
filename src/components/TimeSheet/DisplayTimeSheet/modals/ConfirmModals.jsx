// Timesheet/DisplayTimeSheet/modals/ConfirmModals.jsx
import React from 'react';
import { useTimesheet } from '../context/TimesheetContext';
import { useTimesheetOperations } from '../hooks/useTimesheetOperations';

const ConfirmModals = () => {
  const {
    showConfirmModal,
    showDeleteModal,
    showPrevTsDelete,
    prevTsToDelete,
    showAssignModal,
    assignTo,
    userSearch,
    allUsers,
    timesheet,
    advances,
    selectedEntries,
    setAssignTo,
    setUserSearch,
    toggleModal,
    setPrevTsToDelete,
  } = useTimesheet();

  const { deletePreviousTimesheet, confirmSubmit, assignTimesheet } = useTimesheetOperations();

  const filteredUsers = React.useMemo(() => {
    const q = (userSearch || "").toLowerCase();
    if (!q) return allUsers;
    return allUsers.filter(u =>
      (u.displayName || "").toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q)
    );
  }, [userSearch, allUsers]);

  const sumAdvances = (src) => {
    if (!src) return 0;
    if (Array.isArray(src)) {
      return src.reduce((s, a) => s + (parseFloat(a?.amount) || 0), 0);
    }
    if (typeof src === 'object') {
      return Object.values(src).reduce((s, a) => {
        const amt = typeof a === 'object' ? a.amount : a;
        return s + (parseFloat(amt) || 0);
      }, 0);
    }
    return parseFloat(src) || 0;
  };

  const computeNetPay = () => {
    const totalSalary = (timesheet?.dailyEntries || []).reduce(
      (s, e) => s + (parseFloat(e?.dailySalary) || 0),
      0
    );
    const adv = sumAdvances(advances);
    return Math.round(totalSalary - adv);
  };

  return (
    <>
      {/* Submit Confirmation Modal */}
      {showConfirmModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,1)' }}>
          <div className="modal-dialog">
            <div className="modal-content bg-secondary bg-opacity-50">
              <div className="modal-header bg-dark border-0">
                <h5 className="modal-title text-white">
                  <i className="bi bi-send-check me-2"></i>
                  Submit Timesheet
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => toggleModal('showConfirmModal', false)}
                ></button>
              </div>
              <div className="modal-body">
                <p className="text-white">
                  Are you sure you want to submit this timesheet? Once submitted, it cannot be edited.
                </p>
                <div className="bg-dark p-3 rounded-3">
                  <h6 className="text-info mb-3">
                    <i className="fas fa-check-circle me-2"></i>
                    Ready to Submit
                  </h6>

                  <div className="list-group list-group-flush bg-transparent">
                    <div className="list-group-item bg-transparent border-secondary d-flex justify-content-between align-items-center px-0">
                      <span className="text-muted">Submitted By</span>
                      <span className="text-white">Current User</span>
                    </div>
                    <div className="list-group-item bg-transparent border-secondary d-flex justify-content-between align-items-center px-0">
                      <span className="text-muted">Working Days</span>
                      <span className="text-success">{timesheet?.workingDays || 0}</span>
                    </div>
                    <div className="list-group-item bg-transparent border-secondary d-flex justify-content-between align-items-center px-0">
                      <span className="text-muted">Total Salary</span>
                      <span className="text-success">₹{Number(timesheet?.totalSalary || 0).toFixed(2)}</span>
                    </div>
                    <div className="list-group-item bg-transparent border-secondary d-flex justify-content-between align-items-center px-0">
                      <span className="text-muted">Advances</span>
                      <span className="text-danger">
                        ₹{sumAdvances(advances).toFixed(2)}
                      </span>
                    </div>
                    <div className="list-group-item bg-transparent border-0 d-flex justify-content-between align-items-center px-0 pt-3">
                      <span className="text-white">Net Pay</span>
                      <span className={computeNetPay() < 0 ? 'text-danger' : 'text-warning'}>
                        ₹{computeNetPay().toFixed(0)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer border-0 bg-dark">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => toggleModal('showConfirmModal', false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-success"
                  onClick={confirmSubmit}
                >
                  Confirm Submit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.8)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content bg-dark border border-danger">
              <div className="modal-header border-danger">
                <h5 className="modal-title text-danger">
                  <i className="bi bi-trash me-2"></i>
                  Confirm Delete
                </h5>
              </div>
              <div className="modal-body">
                <div className="alert alert-danger bg-danger bg-opacity-10 border-danger">
                  <strong>Are you sure you want to delete {selectedEntries.length > 1 ? 'these entries' : 'this entry'}?</strong>
                </div>
                <p className="text-white">This action cannot be undone.</p>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => toggleModal('showDeleteModal', false)}>
                  <i className="fas fa-times me-1"></i>
                  Cancel
                </button>
                <button type="button" className="btn btn-danger" onClick={() => {}}>
                  <i className="bi bi-trash me-1"></i>
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Previous Timesheet Delete Modal */}
      {showPrevTsDelete && (
        <div className="modal fade show" style={{ display: 'block', background: 'rgba(0,0,0,0.8)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content bg-dark border border-danger">
              <div className="modal-header border-danger">
                <h5 className="modal-title text-danger">
                  <i className="bi bi-trash me-2"></i>Delete Timesheet
                </h5>
              </div>
              <div className="modal-body">
                <div className="alert alert-danger bg-danger bg-opacity-10 border-danger">
                  <strong className='text-white'>
                    Delete timesheet <span className="text-warning">&nbsp; {prevTsToDelete?.period} </span> &nbsp; for
                    &nbsp; <span className="text-warning"> {prevTsToDelete?.employeeName}</span>?
                  </strong>
                </div>
                <p className="text-white mb-0">This will also delete all its daily entries.</p>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => {
                  setPrevTsToDelete(null);
                  toggleModal('showPrevTsDelete', false);
                }}>
                  Cancel
                </button>
                <button className="btn btn-danger" onClick={deletePreviousTimesheet}>
                  <i className="bi bi-trash me-1"></i>Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {showAssignModal && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.8)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content bg-dark border border-primary">
              <div className="modal-header border-primary">
                <h5 className="modal-title text-primary">
                  <i className="fas fa-user-check me-2"></i>
                  Assign Timesheet
                </h5>
              </div>
              <div className="modal-body">
                <div className="alert alert-primary bg-primary bg-opacity-10 border-primary tex-info">
                  <p className='text-info mb-0'> <strong>Timesheet submitted successfully!</strong></p>
                </div>

                <label className="form-label text-white">Assign To (search name or email)</label>
                <div className="position-relative mb-2">
                  <input
                    type="text"
                    className="form-control bg-dark text-white border-secondary"
                    placeholder="Search user..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    onFocus={() => setUserSearch(userSearch)}
                  />
                  <div className="mt-2 p-2 bg-dark border border-secondary rounded" style={{ maxHeight: 220, overflowY: 'auto' }}>
                    {filteredUsers.map(u => (
                      <div
                        key={u.uid}
                        className={`p-2 rounded ${assignTo === u.uid ? 'bg-primary' : 'hover-bg-gray-700'}`}
                        onClick={() => {
                          setAssignTo(u.uid);
                          setUserSearch(u.displayName || u.email);
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="fw-bold text-white">{u.displayName}</div>
                        <div className="text-info small">Role: {u.role || 'user'}</div>
                        <div className="text-muted small">{u.email}</div>
                      </div>
                    ))}
                    {filteredUsers.length === 0 && <div className="text-muted">No users found</div>}
                  </div>
                </div>

                {assignTo && (
                  <div className="alert alert-success bg-success bg-opacity-10 border-success mt-2">
                    <small className='text-white opacity-75'>
                      <strong>Selected:</strong> {filteredUsers.find(u => u.uid === assignTo)?.displayName || filteredUsers.find(u => u.uid === assignTo)?.email}
                    </small>
                  </div>
                )}

                <div className="alert alert-info bg-info bg-opacity-10 border-info">
                  <small className='text-white opacity-50'>
                    <strong>Submitted by:</strong> Current User
                    <br />
                    <strong>Timestamp:</strong> {new Date().toLocaleString('en-IN')}
                  </small>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    toggleModal('showAssignModal', false);
                    setAssignTo('');
                    setUserSearch('');
                  }}
                >
                  Skip
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={assignTimesheet}
                  disabled={!assignTo}
                >
                  <i className="fas fa-user-check me-1"></i>
                  {assignTo ? `Assign to ${filteredUsers.find(u => u.uid === assignTo)?.displayName || filteredUsers.find(u => u.uid === assignTo)?.email}` : 'Assign'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ConfirmModals;