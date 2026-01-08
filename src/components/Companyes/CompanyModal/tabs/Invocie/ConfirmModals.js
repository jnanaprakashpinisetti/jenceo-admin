import React from 'react';

export const DeleteConfirmModal = ({ 
  invoiceToDelete, 
  deleteRemarks, 
  setDeleteRemarks, 
  setShowDeleteConfirm, 
  confirmDeleteInvoice,
  formatDate,
  formatAmount
}) => {
  return (
    <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 1070 }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header bg-danger text-white">
            <h5 className="modal-title">
              <i className="bi bi-exclamation-triangle me-2"></i>
              Confirm Delete
            </h5>
          </div>
          <div className="modal-body">
            <div className="alert alert-danger">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              <strong>Warning!</strong> Are you sure you want to delete this invoice?
            </div>

            {invoiceToDelete && (
              <div className="card">
                <div className="card-body">
                  <h6 className="card-title">Invoice Details</h6>
                  <p className="card-text mb-1"><strong>Invoice #:</strong> {invoiceToDelete.invoiceNumber}</p>
                  <p className="card-text mb-1"><strong>Company:</strong> {invoiceToDelete.companyName}</p>
                  <p className="card-text mb-1"><strong>Amount:</strong> ₹{formatAmount(invoiceToDelete.amount)}</p>
                  <p className="card-text mb-0"><strong>Service Date:</strong> {formatDate(invoiceToDelete.data.serviceDate)}</p>
                </div>
              </div>
            )}

            <div className="mb-3 mt-3">
              <label className="form-label"><strong>Reason for Deletion*</strong></label>
              <textarea
                className="form-control"
                rows="3"
                value={deleteRemarks}
                onChange={(e) => setDeleteRemarks(e.target.value)}
                placeholder="Please provide reason for deleting this invoice..."
                required
              />
              <small className="form-text small small-text">
                This will be recorded in the deletion history.
              </small>
            </div>

            <div className="alert alert-info mt-3 text-info">
              <i className="bi bi-info-circle me-2"></i>
              <strong>Note:</strong> This will move the invoice to the deleted archive. You can restore it later if needed.
            </div>
          </div>
          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setShowDeleteConfirm(false);
                setDeleteRemarks('');
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={confirmDeleteInvoice}
              disabled={!deleteRemarks.trim()}
            >
              <i className="bi bi-trash me-1"></i>
              Delete Invoice
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const RestoreConfirmModal = ({ 
  invoiceToRestore, 
  setShowRestoreConfirm, 
  confirmRestoreInvoice,
  formatDate,
  formatAmount
}) => {
  return (
    <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 1070 }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header bg-success text-white">
            <h5 className="modal-title">
              <i className="bi bi-check-circle me-2"></i>
              Confirm Restore
            </h5>
          </div>
          <div className="modal-body">
            <div className="alert alert-success">
              <i className="bi bi-check-circle-fill me-2"></i>
              <strong>Restore Invoice</strong> Are you sure you want to restore this invoice?
            </div>

            {invoiceToRestore && (
              <div className="card">
                <div className="card-body">
                  <h6 className="card-title">Invoice Details</h6>
                  <p className="card-text mb-1"><strong>Invoice #:</strong> {invoiceToRestore.invoiceNumber}</p>
                  <p className="card-text mb-1"><strong>Company:</strong> {invoiceToRestore.companyName}</p>
                  <p className="card-text mb-1"><strong>Amount:</strong> ₹{formatAmount(invoiceToRestore.amount)}</p>
                  <p className="card-text mb-0"><strong>Deleted On:</strong> {formatDate(invoiceToRestore.deletedAt)}</p>
                  <p className="card-text mb-0"><strong>Reason:</strong> {invoiceToRestore.deletedReason || 'No reason provided'}</p>
                </div>
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowRestoreConfirm(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-success"
              onClick={confirmRestoreInvoice}
            >
              <i className="bi bi-arrow-counterclockwise me-1"></i>
              Restore Invoice
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};