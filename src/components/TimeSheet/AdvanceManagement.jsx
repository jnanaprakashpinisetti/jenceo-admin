import React, { useState } from 'react';
import firebaseDB from '../../firebase';

const AdvanceManagement = ({ employeeId, timesheetId, advances, onAdvanceAdded, currentUser }) => {
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [advanceToDelete, setAdvanceToDelete] = useState(null);
  const [editingAdvance, setEditingAdvance] = useState(null);
  const [advanceForm, setAdvanceForm] = useState({
    amount: '',
    reason: '',
    date: new Date().toISOString().split('T')[0]
  });

  // Reset form when opening modal
  const openAddModal = () => {
    setEditingAdvance(null);
    setAdvanceForm({
      amount: '',
      reason: '',
      date: new Date().toISOString().split('T')[0]
    });
    setShowAdvanceModal(true);
  };

  // Open edit modal with existing data
  const openEditModal = (advance) => {
    setEditingAdvance(advance);
    setAdvanceForm({
      amount: advance.amount.toString(),
      reason: advance.reason,
      date: advance.date
    });
    setShowAdvanceModal(true);
  };

  const handleSubmitAdvance = async (e) => {
    e.preventDefault();
    
    const timestamp = new Date().toISOString();
    const userData = {
      updatedBy: currentUser?.uid || 'admin',
      updatedByName: currentUser?.displayName || 'Admin',
      updatedAt: timestamp
    };

    const advanceData = {
      employeeId,
      timesheetId,
      amount: parseFloat(advanceForm.amount),
      reason: advanceForm.reason,
      date: advanceForm.date,
      status: 'approved',
      ...userData
    };

    try {
      if (editingAdvance) {
        // Update existing advance
        await firebaseDB.child(`Advances/${editingAdvance.id}`).update(advanceData);
      } else {
        // Create new advance
        const newRef = firebaseDB.child('Advances').push();
        const newAdvance = {
          ...advanceData,
          id: newRef.key,
          createdBy: currentUser?.uid || 'admin',
          createdByName: currentUser?.displayName || 'Admin',
          createdAt: timestamp
        };
        await newRef.set(newAdvance);
      }
      
      // Reset form and close modal
      setAdvanceForm({ amount: '', reason: '', date: new Date().toISOString().split('T')[0] });
      setShowAdvanceModal(false);
      setEditingAdvance(null);
      
      // Refresh advances list
      onAdvanceAdded();
    } catch (error) {
      console.error('Error saving advance:', error);
      alert('Error saving advance. Please try again.');
    }
  };

  const confirmDeleteAdvance = (advance) => {
    setAdvanceToDelete(advance);
    setShowDeleteModal(true);
  };

  const deleteAdvance = async () => {
    if (advanceToDelete) {
      try {
        await firebaseDB.child(`Advances/${advanceToDelete.id}`).remove();
        setShowDeleteModal(false);
        setAdvanceToDelete(null);
        onAdvanceAdded(); // Refresh advances list
      } catch (error) {
        console.error('Error deleting advance:', error);
        alert('Error deleting advance. Please try again.');
      }
    }
  };

  const totalAdvances = advances.reduce((sum, advance) => sum + (advance.amount || 0), 0);

  // Sort advances by date (newest first)
  const sortedAdvances = [...advances].sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div className="card bg-dark border-secondary h-100">
      <div className="card-header bg-secondary d-flex justify-content-between align-items-center">
        <h5 className="card-title mb-0 text-white">Advances</h5>
        <button 
          className="btn btn-sm btn-warning"
          onClick={openAddModal}
        >
          <i className="bi bi-plus-circle"></i> Add Advance
        </button>
      </div>
      <div className="card-body">
        <div className="mb-3">
          <h6 className="text-info">Total Advances: <span className="text-warning">₹{totalAdvances}</span></h6>
        </div>
        
        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
          {sortedAdvances.map((advance, index) => (
            <div key={advance.id || index} className="border-bottom border-secondary pb-2 mb-2">
              <div className="d-flex justify-content-between align-items-start">
                <div className="flex-grow-1">
                  <div className="d-flex justify-content-between">
                    <span className="text-success fw-bold">₹{advance.amount}</span>
                    <small className="text-muted">
                      {new Date(advance.date).toLocaleDateString('en-IN')}
                    </small>
                  </div>
                  <div className="text-info small mt-1">{advance.reason}</div>
                  <div className="text-muted small mt-1">
                    Status: <span className="badge bg-success">{advance.status}</span>
                  </div>
                  {advance.createdByName && (
                    <div className="text-muted small">
                      Added by: {advance.createdByName} on {new Date(advance.createdAt).toLocaleDateString('en-IN')}
                    </div>
                  )}
                  {advance.updatedByName && advance.updatedAt !== advance.createdAt && (
                    <div className="text-muted small">
                      Updated by: {advance.updatedByName} on {new Date(advance.updatedAt).toLocaleDateString('en-IN')}
                    </div>
                  )}
                </div>
                <div className="ms-2">
                  <button 
                    className="btn btn-sm btn-outline-warning me-1"
                    onClick={() => openEditModal(advance)}
                    title="Edit Advance"
                  >
                    <i className="bi bi-pencil"></i>
                  </button>
                  <button 
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => confirmDeleteAdvance(advance)}
                    title="Delete Advance"
                  >
                    <i className="bi bi-trash"></i>
                  </button>
                </div>
              </div>
            </div>
          ))}
          {advances.length === 0 && (
            <div className="text-center text-muted py-3">
              <i className="bi bi-wallet2 display-6"></i>
              <p className="mt-2">No advances recorded</p>
            </div>
          )}
        </div>
      </div>

      {/* Advance Add/Edit Modal */}
      {showAdvanceModal && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.8)' }} tabIndex="-1">
          <div className="modal-dialog">
            <div className="modal-content bg-dark border border-warning">
              <div className="modal-header bg-warning">
                <h5 className="modal-title text-dark">
                  <i className="bi bi-wallet2 me-2"></i>
                  {editingAdvance ? 'Edit Advance' : 'Add Advance'}
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowAdvanceModal(false)}></button>
              </div>
              <form onSubmit={handleSubmitAdvance}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label text-info">
                      <strong>Amount (₹)</strong>
                    </label>
                    <input
                      type="number"
                      className="form-control bg-dark text-white border-secondary"
                      value={advanceForm.amount}
                      onChange={(e) => setAdvanceForm(prev => ({ ...prev, amount: e.target.value }))}
                      min="1"
                      step="100"
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label text-info">
                      <strong>Date</strong>
                    </label>
                    <input
                      type="date"
                      className="form-control bg-dark text-white border-secondary"
                      value={advanceForm.date}
                      onChange={(e) => setAdvanceForm(prev => ({ ...prev, date: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label text-info">
                      <strong>Reason</strong>
                    </label>
                    <textarea
                      className="form-control bg-dark text-white border-secondary"
                      rows="3"
                      value={advanceForm.reason}
                      onChange={(e) => setAdvanceForm(prev => ({ ...prev, reason: e.target.value }))}
                      placeholder="Enter reason for advance..."
                      required
                    />
                  </div>
                  
                  {/* User Info */}
                  <div className="alert alert-info bg-info bg-opacity-10 border-info">
                    <small>
                      <strong>Recorded by:</strong> {currentUser?.displayName} ({currentUser?.email})
                    </small>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowAdvanceModal(false)}>
                    <i className="bi bi-x-circle me-1"></i>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-warning">
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
              <div className="modal-header border-danger">
                <h5 className="modal-title text-danger">
                  <i className="bi bi-exclamation-triangle me-2"></i>
                  Confirm Deletion
                </h5>
              </div>
              <div className="modal-body">
                <div className="alert alert-danger bg-danger bg-opacity-10 border-danger">
                  <strong>Are you sure you want to delete this advance?</strong>
                </div>
                
                {advanceToDelete && (
                  <div className="border border-secondary rounded p-3 mb-3">
                    <div className="row">
                      <div className="col-6">
                        <small className="text-muted">Amount</small>
                        <div className="fw-bold text-white">₹{advanceToDelete.amount}</div>
                      </div>
                      <div className="col-6">
                        <small className="text-muted">Date</small>
                        <div className="fw-bold text-white">
                          {new Date(advanceToDelete.date).toLocaleDateString('en-IN')}
                        </div>
                      </div>
                      <div className="col-12 mt-2">
                        <small className="text-muted">Reason</small>
                        <div className="fw-bold text-info">{advanceToDelete.reason}</div>
                      </div>
                    </div>
                  </div>
                )}
                
                <p className="text-white">This action cannot be undone. The advance record will be permanently removed from the system.</p>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>
                  <i className="bi bi-x-circle me-1"></i>
                  Cancel
                </button>
                <button type="button" className="btn btn-danger" onClick={deleteAdvance}>
                  <i className="bi bi-trash me-1"></i>
                  Delete Advance
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