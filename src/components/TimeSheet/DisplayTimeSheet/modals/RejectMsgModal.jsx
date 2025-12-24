// Timesheet/DisplayTimeSheet/modals/RejectMsgModal.jsx
import React from 'react';
import { useTimesheet } from '../context/TimesheetContext';

const RejectMsgModal = () => {
  const {
    showRejectMsgModal,
    rejectMsg,
    toggleModal,
  } = useTimesheet();

  if (!showRejectMsgModal) return null;

  return (
    <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <div className="modal-dialog modal-md">
        <div className="modal-content bg-dark text-white border border-danger">
          <div className="modal-header border-0 bg-danger bg-opacity-50">
            <h5 className="modal-title text-white">
              <i className="bi bi-x-circle me-2"></i>
              Rejection Details
            </h5>
            <button className="btn-close btn-close-white" onClick={() => toggleModal('showRejectMsgModal', false)} />
          </div>
          <div className="modal-body">
            {rejectMsg?.text ? (
              <>
                <div className="row mb-3">
                  <div className="col-6">
                    <div className="mb-2 small text-muted">Rejected by</div>
                    <div className="fw-semibold text-warning">{rejectMsg.by || 'Unknown'}</div>
                  </div>
                  <div className="col-6">
                    <div className="mb-2 small text-muted">Rejected at</div>
                    <div className="fw-semibold">
                      {rejectMsg.at ? new Date(rejectMsg.at).toLocaleString('en-IN') : 'Not specified'}
                    </div>
                  </div>
                </div>

                <div className="mb-2 small text-muted">Rejection Reason</div>
                <div className="p-3 bg-danger rounded border border-secondary bg-opacity-10" style={{ whiteSpace: 'pre-wrap', minHeight: '100px' }}>
                  {rejectMsg.text}
                </div>
              </>
            ) : (
              <div className="text-center py-4">
                <i className="bi bi-info-circle text-warning display-4 mb-3"></i>
                <div className="text-warning">No rejection comment found.</div>
                <small className="text-muted">The timesheet was rejected but no reason was provided.</small>
              </div>
            )}
          </div>
          <div className="modal-footer border-0">
            <button className="btn btn-danger" onClick={() => toggleModal('showRejectMsgModal', false)}>
              <i className="bi bi-x-lg me-1"></i>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RejectMsgModal;