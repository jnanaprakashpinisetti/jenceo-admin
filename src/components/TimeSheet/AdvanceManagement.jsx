import React, { useEffect, useMemo, useState } from 'react';
import firebaseDB from '../../firebase';
import { useAuth } from "../../context/AuthContext";

const AdvanceManagement = ({ 
   employeeId,
  timesheetId,
  advances = [],
  onAdvanceAdded,
  currentUser,
  isDisabled,
  isReadOnly,
  // NEW: pass from parent
  isAssignee = false,
  submittedLike = false,
}) => {
  const [localAdvances, setLocalAdvances] = useState(null);
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [advanceToDelete, setAdvanceToDelete] = useState(null);
  const [editingAdvance, setEditingAdvance] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [advanceForm, setAdvanceForm] = useState({
    amount: '',
    reason: '',
    date: '',
  });

  const { user: authUser } = useAuth();

  // Reset form when opening modal
  const openAddModal = () => {
    setEditingAdvance(null);
    setAdvanceForm({
      amount: '',
      reason: '',
      date: new Date().toISOString().split('T')[0] // Default to today
    });
    setShowAdvanceModal(true);
  };

  // Open edit modal with existing data
  const openEditModal = (advance) => {
    setEditingAdvance(advance);
    setAdvanceForm({
      amount: advance.amount.toString(),
      reason: advance.reason || '',
      date: advance.date || new Date().toISOString().split('T')[0]
    });
    setShowAdvanceModal(true);
  };

  const handleSubmitAdvance = async (e) => {
    e.preventDefault();

    // Validation
    if (!employeeId) {
      alert('Missing employee.');
      return;
    }
    if (!timesheetId) {
      alert('Missing timesheet.');
      return;
    }
    if (!advanceForm.date) {
      alert('Please select a date.');
      return;
    }
    if (!advanceForm.amount || parseFloat(advanceForm.amount) <= 0) {
      alert('Please enter a valid amount.');
      return;
    }

    const { uid, name } = whoSafe();
    const now = new Date().toISOString();

    const advanceData = {
      amount: parseFloat(advanceForm.amount),
      reason: advanceForm.reason || '',
      date: advanceForm.date,
      status: 'approved',
      updatedAt: now,
      updatedBy: uid,
      updatedByName: name,
    };

    try {
      if (editingAdvance?.id) {
        // UPDATE existing advance
        await firebaseDB
          .child(`EmployeeBioData/${employeeId}/timesheets/${timesheetId}/advances/${editingAdvance.id}`)
          .update(advanceData);
      } else {
        // CREATE new advance - ensure we're writing to the correct path
        const advancesRef = firebaseDB.child(`EmployeeBioData/${employeeId}/timesheets/${timesheetId}/advances`);
        const newAdvanceRef = advancesRef.push();

        const newAdvance = {
          ...advanceData,
          id: newAdvanceRef.key,
          createdAt: now,
          createdBy: uid,
          createdByName: name,
        };

        await newAdvanceRef.set(newAdvance);
      }

      // Reset form and close modal
      setAdvanceForm({ amount: '', reason: '', date: '' });
      setShowAdvanceModal(false);
      setEditingAdvance(null);

      // Refresh advances list
      if (onAdvanceAdded) {
        onAdvanceAdded();
      }

    } catch (err) {

      alert('Error saving advance. Please try again.');

    }
  };

 const canEditAdvance = submittedLike ? isAssignee : !isReadOnly;
  const canDeleteAdvance = !submittedLike && !isReadOnly;

  // Add the missing whoSafe function
  const auth = useAuth();
  const whoSafe = () => {
    // Priority 1: Auth context user
    if (auth?.user) {
      return {
        uid: auth.user.uid,
        name: auth.user.displayName || auth.user.name || auth.user.email || 'Admin'
      };
    }
    // Fallback
    return { uid: "system", name: "System" };
  };

  const confirmDeleteAdvance = (advance) => {
    setAdvanceToDelete(advance);
    setShowDeleteModal(true);
  };

  const deleteAdvance = async () => {
    if (advanceToDelete?.id) {
      try {
        await firebaseDB.child(`EmployeeBioData/${employeeId}/timesheets/${timesheetId}/advances/${advanceToDelete.id}`).remove();
        setShowDeleteModal(false);
        setAdvanceToDelete(null);

        // Refresh advances list
        if (onAdvanceAdded) {
          onAdvanceAdded();
        }
      } catch (error) {
        alert('Error deleting advance. Please try again.');
      }
    }
  };

  // SINGLE useEffect for loading advances - ONLY from timesheet path
  useEffect(() => {
    if (!employeeId || !timesheetId) {
      setLocalAdvances([]);
      return;
    }

    const ref = firebaseDB.child(`EmployeeBioData/${employeeId}/timesheets/${timesheetId}/advances`);

    const handler = ref.on('value', (snap) => {
      const data = snap.val() || {};
      // Handle different data structures safely
      let list = [];

      if (data && typeof data === 'object' && !Array.isArray(data)) {
        // Normal case: object with advance IDs as keys
        list = Object.entries(data).map(([key, value]) => ({
          id: key,
          ...value
        }));
      } else if (Array.isArray(data)) {
        // Array case (shouldn't happen but handle it)
        list = data.filter(item => item && typeof item === 'object');
      }
      // If data is a primitive (number, string, etc.), list remains empty

      setLocalAdvances(list);
    }, (error) => {
    });

    return () => ref.off('value', handler);
  }, [employeeId, timesheetId]);



  const effectiveAdvances = useMemo(
    () => (localAdvances !== null ? localAdvances : (advances || [])),
    [localAdvances, advances]
  );

  const totalAdvances = effectiveAdvances.reduce((sum, a) => sum + (parseFloat(a.amount) || 0), 0);
  const sortedAdvances = [...effectiveAdvances].sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div className="card bg-dark border-warning">
      {/* Header */}
      <div className="card-header bg-warning bg-opacity-10 border-warning d-flex justify-content-between align-items-center py-3">
        <div className="d-flex align-items-center">
          <i className="bi bi-wallet2 text-warning fs-4 me-3"></i>
          <div>
            <h5 className="card-title mb-0 text-white">Advance Management</h5>
            <small className="text-muted">Manage employee advances</small>
          </div>
        </div>
        <button
          className="btn btn-warning btn-sm"
          onClick={() => {
            if (!canEditAdvance) {
              alert('This timesheet is submitted/assigned or locked. Only the assignee can add advances.');
              return;
            }
            openAddModal();
          }}
          disabled={!employeeId || !timesheetId || !canEditAdvance}
          title={!canEditAdvance ? "Adding disabled" : "Add Advance"}
        >
          <i className="bi bi-plus-circle me-2"></i> Add Advance
        </button>
      </div>

      {/* Advances List */}
      <div className="card-body p-0">
        <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
          {sortedAdvances.map((advance, index) => (
            <div
              key={advance.id || index}
              className="border-bottom border-secondary p-3 hover-bg-gray-800 transition-all"
            >
              <div className="row g-2 align-items-start">
                {/* Column 1: Amount & Status */}
                <div className="col-md-3">
                  <div className="align-items-center mb-2">
                    <p className="text-warning fw-bold fs-5 mb-0">₹{advance.amount}</p>
                  </div>
                  <div className="text-info small">
                    <i className="bi bi-calendar me-1"></i>
                    {new Date(advance.date).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short'
                    })}
                  </div>
                </div>

                {/* Column 2: Reason & Metadata */}
                <div className="col-md-6 text-center">
                  <div className="row g-1">
                    <div className="col-12">
                      <small className="text-muted">
                        <i className="bi bi-person me-1"></i>
                        By: <span className="text-info">
                          {advance.createdByName || advance.updatedByName || 'System'}
                        </span>
                      </small>
                    </div>
                    <div className="col-12">
                      <small className="text-muted">
                        <i className="bi bi-clock me-1"></i>
                        {advance?.createdAt ? new Date(advance.createdAt).toLocaleDateString('en-IN') : '-'}
                      </small>
                    </div>
                  </div>
                </div>

                {/* Column 3: Actions */}
                <div className="col-md-3">
                  <div className="d-flex justify-content-end gap-1">
                    <button
                      className="btn btn-outline-warning btn-sm"
                      onClick={() => {
                        if (!canEditAdvance) {
                          alert('Editing advances is disabled. Only the assignee can edit while submitted/assigned.');
                          return;
                        }
                        openEditModal(advance);
                      }}
                      disabled={!canEditAdvance}
                      title={!canEditAdvance ? "Editing disabled" : "Edit Advance"}
                    >
                      <i className="bi bi-pencil"></i>
                    </button>

                    <button
                      className="btn btn-outline-danger btn-sm"
                      onClick={() => {
                        if (!canDeleteAdvance) return; // hard stop
                        confirmDeleteAdvance(advance);
                      }}
                      disabled={!canDeleteAdvance}
                      title={!canDeleteAdvance ? "Delete disabled for submitted/assigned or locked" : "Delete Advance"}
                    >
                      <i className="bi bi-trash"></i>
                    </button>
                  </div>
                  {advance.updatedByName && advance.updatedAt !== advance.createdAt && (
                    <div className="text-end mt-2">
                      <small className="text-muted">
                        <i className="bi bi-arrow-clockwise me-1"></i>
                        Updated
                      </small>
                    </div>
                  )}
                </div>

                <div className="col-md-12 bg-secondary bg-opacity-10 p-2 rounded-2">
                  <div className="text-white opacity-90 small mb-2" style={{ lineHeight: '1.3', opacity: .6 }}>
                    {advance.reason || 'No reason provided'}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Empty State */}
          {sortedAdvances.length === 0 && (
            <div className="text-center text-muted py-4">
              <i className="bi bi-wallet2 display-4 opacity-50 mb-2"></i>
              <h6 className="text-white opacity-50 mb-2 d-block">No Advances Recorded</h6>
              <p className="small opacity-50 mb-3">Add advances to track employee payments</p>
              <button
                className="btn btn-warning btn-sm"
                onClick={() => {
                  if (!canEditAdvance) {
                    alert('This timesheet is submitted/assigned or locked. Only the assignee can add advances.');
                    return;
                  }
                  openAddModal();
                }}
                disabled={!employeeId || !timesheetId || !canEditAdvance}
                title={!canEditAdvance ? "Adding disabled" : "Add Advance"}
              >
                <i className="bi bi-plus-circle me-2"></i> Add Advance
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Total Summary */}
      <div className="card-body py-3 border-bottom border-warning">
        <div className="row g-3 text-center">
          <div className="col-md-4">
            <div className="bg-warning bg-opacity-10 rounded p-2 border border-warning">
              <small className="text-muted d-block">Total Advances</small>
              <div className="text-warning h5 mb-0 fw-bold">₹{totalAdvances.toFixed(0)}</div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="bg-info bg-opacity-10 rounded p-2 border border-info">
              <small className="text-muted d-block">Advances Count</small>
              <div className="text-info h5 mb-0 fw-bold">{sortedAdvances.length}</div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="bg-success bg-opacity-10 rounded p-2 border border-success">
              <small className="text-muted d-block">Average</small>
              <div className="text-success h5 mb-0 fw-bold">
                ₹{sortedAdvances.length > 0 ? (totalAdvances / sortedAdvances.length).toFixed(0) : '0'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showAdvanceModal && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.8)' }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content bg-dark border border-warning">
              <div className="modal-header bg-warning bg-opacity-10 border-warning py-3">
                <div className="d-flex align-items-center">
                  <i className="bi bi-wallet2 text-warning fs-4 me-3"></i>
                  <h5 className="modal-title text-white mb-0">
                    {editingAdvance ? 'Edit Advance' : 'Add New Advance'}
                  </h5>
                </div>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowAdvanceModal(false)}></button>
              </div>
              <form onSubmit={handleSubmitAdvance}>
                <div className="modal-body">
                  <div className="row g-3">
                    {/* Amount */}
                    <div className="col-md-6">
                      <label className="form-label text-info">
                        <strong>Amount (₹)</strong>
                      </label>
                      <div className="input-group">
                        <span className="input-group-text bg-dark border-secondary text-warning">
                          <i className="bi bi-currency-rupee"></i>
                        </span>
                        <input
                          type="number"
                          className="form-control bg-dark text-white border-secondary"
                          value={advanceForm.amount}
                          onChange={(e) => setAdvanceForm(prev => ({ ...prev, amount: e.target.value }))}
                          min="1"
                          step="1"
                          placeholder="0"
                          required
                        />
                      </div>
                    </div>

                    {/* Date */}
                    <div className="col-md-6">
                      <label className="form-label text-info">
                        <strong>Date</strong>
                      </label>
                      <div className="input-group">
                        <span className="input-group-text bg-dark border-secondary text-warning">
                          <i className="bi bi-calendar"></i>
                        </span>
                        <input
                          type="date"
                          className="form-control bg-dark text-white border-secondary"
                          value={advanceForm.date}
                          onChange={(e) => setAdvanceForm(prev => ({ ...prev, date: e.target.value }))}
                          required
                        />
                      </div>
                    </div>

                    {/* Reason */}
                    <div className="col-12">
                      <label className="form-label text-info">
                        <strong>Reason</strong>
                      </label>
                      <textarea
                        className="form-control bg-dark text-white border-secondary"
                        rows="3"
                        value={advanceForm.reason}
                        onChange={(e) => setAdvanceForm(prev => ({ ...prev, reason: e.target.value }))}
                        placeholder="Enter reason for advance payment..."
                        required
                        style={{ resize: 'vertical' }}
                      />
                    </div>
                  </div>

                  {/* Debug Info */}
                  <div className="alert alert-info bg-info bg-opacity-10 border-info mt-3 py-2">
                    <small className="text-info">
                      <strong>Debug Info:</strong><br />
                      <strong>Employee:</strong> <span className='text-warning'>{employee?.displayName || employeeId}</span><br />
                      Timesheet: {timesheetId}<br />
                      Mode: {editingAdvance ? 'Editing' : 'Creating'}
                    </small>
                  </div>
                </div>
                <div className="modal-footer border-warning py-3">
                  <button type="button" className="btn btn-secondary btn-sm" 
                  onClick={() => {
                      if (!canEditAdvance) {
                        alert('This timesheet is submitted/assigned or locked. Only the assignee can add advances.');
                        return;
                      }
                      openAddModal();
                    }}
                    disabled={!employeeId || !timesheetId || !canEditAdvance}>
                    <i className="bi bi-x-circle me-1"></i>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-warning btn-sm">
                    <i className="bi bi-check-circle me-1"></i>
                    {editingAdvance ? 'Update Advance' : 'Add Advance'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.8)' }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content bg-dark border border-danger">
              <div className="modal-header border-danger py-3">
                <div className="d-flex align-items-center">
                  <i className="bi bi-exclamation-triangle text-danger fs-4 me-3"></i>
                  <h5 className="modal-title text-danger mb-0">
                    Confirm Deletion
                  </h5>
                </div>
              </div>
              <div className="modal-body">
                <div className="alert alert-danger bg-danger bg-opacity-10 border-danger">
                  <strong>Are you sure you want to delete this advance?</strong>
                </div>

                {/* {advanceToDelete && (
                  <div className="border border-secondary rounded p-3 mb-3 bg-dark bg-opacity-50">
                    <div className="row g-3">
                      <div className="col-md-6">
                        <small className="text-muted">Amount</small>
                        <div className="fw-bold text-warning fs-5">₹{advanceToDelete.amount}</div>
                      </div>
                      <div className="col-md-6">
                        <small className="text-muted">Date</small>
                        <div className="fw-bold text-white">
                          {new Date(advanceToDelete.date).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </div>
                      </div>
                      <div className="col-12">
                        <small className="text-muted">Reason</small>
                        <div className="fw-bold text-info small">{advanceToDelete.reason || 'No reason provided'}</div>
                      </div>
                    </div>
                  </div>
                )} */}

                {advanceToDelete && (
                  <div className="border border-secondary rounded p-3 mb-3 bg-dark bg-opacity-50">
                    <div className="text-white small">
                      <div><strong>Amount:</strong> ₹{advanceToDelete.amount}</div>
                      <div><strong>Date:</strong> {advanceToDelete.date}</div>
                      <div><strong>Reason:</strong> {advanceToDelete.reason || '—'}</div>
                    </div>
                  </div>
                )}
                <p className="text-white text-center mb-0 small">
                  <i className="bi bi-exclamation-circle text-warning me-2"></i>
                  This action cannot be undone.
                </p>
              </div>
              <div className="modal-footer border-danger py-3">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowDeleteModal(false)}>
                  <i className="bi bi-x-circle me-1"></i>
                  Cancel
                </button>
                {/* <button
                  className="btn btn-outline-danger btn-sm"
                  onClick={() => {
                    if (!canDeleteAdvance) return; // hard stop
                    confirmDeleteAdvance(advance);
                  }}
                  disabled={!canDeleteAdvance}
                  title={!canDeleteAdvance ? "Delete disabled for submitted/assigned or locked" : "Delete Advance"}
                >
                  <i className="bi bi-trash"></i>
                </button> */}
                <button className="btn btn-danger" onClick={deleteAdvance}>
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvanceManagement;