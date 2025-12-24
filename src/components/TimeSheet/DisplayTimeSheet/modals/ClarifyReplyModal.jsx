// Timesheet/DisplayTimeSheet/modals/ClarifyReplyModal.jsx
import React, { useState } from 'react';
import { useTimesheet } from '../context/TimesheetContext';

const ClarifyReplyModal = () => {
  const {
    showClarifyReplyModal,
    clarifyText,
    clarifyThread,
    setClarifyText,
    toggleModal,
  } = useTimesheet();

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!clarifyText.trim()) return;
    
    setIsSubmitting(true);
    try {
      // Submit reply logic here
      setTimeout(() => {
        toggleModal('showClarifyReplyModal', false);
        setClarifyText('');
        setIsSubmitting(false);
      }, 1000);
    } catch (error) {
      console.error('Error submitting reply:', error);
      setIsSubmitting(false);
    }
  };

  if (!showClarifyReplyModal) return null;

  return (
    <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.85)' }}>
      <div className="modal-dialog modal-md modal-dialog-centered">
        <div className="modal-content bg-dark border border-warning">
          <div className="modal-header border-warning">
            <h5 className="modal-title text-warning">
              <i className="bi bi-question-diamond me-2"></i>
              Clarification
            </h5>
            <button className="btn-close btn-close-white" onClick={() => toggleModal('showClarifyReplyModal', false)} />
          </div>
          
          <div className="modal-body">
            {clarifyThread.length === 0 ? (
              <div className="small text-muted">No previous messages yet.</div>
            ) : (
              <div className="list-group mb-3">
                {clarifyThread.map(item => (
                  <div key={item.id} className="list-group-item bg-dark text-white border-secondary">
                    <div className="d-flex justify-content-between">
                      <span>
                        <span className={`badge me-2 ${item.type === 'request' ? 'bg-warning text-dark' : 'bg-info'}`}>
                          {item.type === 'request' ? 'Request' : 'Reply'}
                        </span>
                        {item.text}
                      </span>
                    </div>
                    <div className="small-text text-info mt-1">
                      By {item.byName || 'Unknown'} -  
                      <small className="small-text text-white-50 ms-2">
                        {item.at ? new Date(item.at).toLocaleString() : ''}
                      </small>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <label className="form-label text-white">Your reply</label>
            <textarea
              className="form-control bg-info bg-opacity-10 text-white"
              rows={4}
              value={clarifyText}
              onChange={(e) => setClarifyText(e.target.value)}
              placeholder="Type your reply."
              disabled={isSubmitting}
            />
          </div>
          <div className="modal-footer">
            <button 
              className="btn btn-secondary" 
              onClick={() => toggleModal('showClarifyReplyModal', false)}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button 
              className="btn btn-primary" 
              onClick={handleSubmit}
              disabled={isSubmitting || !clarifyText.trim()}
            >
              {isSubmitting ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                  Posting...
                </>
              ) : (
                'Post Reply'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClarifyReplyModal;