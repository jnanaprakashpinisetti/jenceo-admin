import React, { useState, useEffect } from 'react';

const ThankYouMessageForm = ({ 
  onClose, 
  company, 
  invoiceData,
  thankYouMessages,
  determineServiceType 
}) => {
  const [tempThankYouType, setTempThankYouType] = useState(invoiceData.thankYouType || 'default');
  const [tempCustomMessage, setTempCustomMessage] = useState(invoiceData.customThankYou || '');

  useEffect(() => {
    setTempThankYouType(invoiceData.thankYouType || 'default');
    setTempCustomMessage(invoiceData.customThankYou || '');
  }, [invoiceData]);

  const handleTypeChange = (type) => {
    setTempThankYouType(type);
    if (type !== 'custom') {
      setTempCustomMessage('');
    }
  };

  const handleApply = () => {
    onClose(tempThankYouType, tempCustomMessage);
  };

  const getMessagePreview = () => {
    if (tempThankYouType === 'custom') {
      return tempCustomMessage || 'Enter your custom message...';
    }
    return thankYouMessages[tempThankYouType]?.message || thankYouMessages.default.message;
  };

  return (
    <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 1060 }}>
      <div className="modal-dialog modal-lg modal-dialog-centered invoiceRadio">
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header bg-primary text-white">
            <h5 className="modal-title">
              <i className="bi bi-chat-heart me-2"></i>
              Select Thank You Message
            </h5>
            <button
              type="button"
              className="btn-close btn-close-white"
              onClick={() => onClose()}
            />
          </div>
          <div className="modal-body">
            <div className="row">
              <div className="col-md-6">
                <h6 className="mb-3">Select Message Type</h6>
                <div className="form-check mb-2">
                  <input
                    className="form-check-input"
                    type="radio"
                    name="thankYouType"
                    id="defaultType"
                    value="default"
                    checked={tempThankYouType === 'default'}
                    onChange={(e) => handleTypeChange(e.target.value)}
                  />
                  <label className="form-check-label" htmlFor="defaultType">
                    <strong>Default Message</strong>
                    <small className="d-block small small-text">Generic thank you message for all companies</small>
                  </label>
                </div>

                <div className="form-check mb-2">
                  <input
                    className="form-check-input"
                    type="radio"
                    name="thankYouType"
                    id="homeCare"
                    value="homeCare"
                    checked={tempThankYouType === 'homeCare'}
                    onChange={(e) => handleTypeChange(e.target.value)}
                  />
                  <label className="form-check-label" htmlFor="homeCare">
                    <strong>Home Care</strong>
                    <small className="d-block small small-text">For home care and healthcare companies</small>
                  </label>
                </div>

                <div className="form-check mb-2">
                  <input
                    className="form-check-input"
                    type="radio"
                    name="thankYouType"
                    id="housekeeping"
                    value="housekeeping"
                    checked={tempThankYouType === 'housekeeping'}
                    onChange={(e) => handleTypeChange(e.target.value)}
                  />
                  <label className="form-check-label" htmlFor="housekeeping">
                    <strong>Housekeeping</strong>
                    <small className="d-block small small-text">For cleaning and maintenance companies</small>
                  </label>
                </div>

                <div className="form-check mb-2">
                  <input
                    className="form-check-input"
                    type="radio"
                    name="thankYouType"
                    id="security"
                    value="security"
                    checked={tempThankYouType === 'security'}
                    onChange={(e) => handleTypeChange(e.target.value)}
                  />
                  <label className="form-check-label" htmlFor="security">
                    <strong>Security</strong>
                    <small className="d-block small small-text">For security services companies</small>
                  </label>
                </div>

                <div className="form-check mb-3">
                  <input
                    className="form-check-input"
                    type="radio"
                    name="thankYouType"
                    id="custom"
                    value="custom"
                    checked={tempThankYouType === 'custom'}
                    onChange={(e) => handleTypeChange(e.target.value)}
                  />
                  <label className="form-check-label" htmlFor="custom">
                    <strong>Custom Message</strong>
                    <small className="d-block small small-text">Write your own thank you message</small>
                  </label>
                </div>

                {tempThankYouType === 'custom' && (
                  <div className="mb-3">
                    <label className="form-label">
                      <strong>Custom Thank You Message</strong>
                    </label>
                    <textarea
                      className="form-control"
                      rows="6"
                      value={tempCustomMessage}
                      onChange={(e) => setTempCustomMessage(e.target.value)}
                      placeholder="Enter your custom thank you message here..."
                    />
                    <small className="small small-text">
                      You can use HTML tags like &lt;strong&gt;, &lt;br&gt;, &lt;em&gt; for formatting
                    </small>
                  </div>
                )}
              </div>

              <div className="col-md-6">
                <h6 className="mb-3">Message Preview</h6>
                <div className="card">
                  <div className="card-header bg-light">
                    <strong>Preview</strong>
                  </div>
                  <div className="card-body" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    <div className="thank-you-preview">
                      <h5 style={{ color: '#02acf2', marginBottom: '15px' }}>
                        {tempThankYouType === 'custom' ? 'Thank You Message' : thankYouMessages[tempThankYouType]?.title || 'Thank You for Your Partnership!'}
                      </h5>
                      <div dangerouslySetInnerHTML={{
                        __html: getMessagePreview().replace(
                          company?.companyName || 'Company',
                          `<strong>${company?.companyName || 'Company'}</strong>`
                        )
                      }} />
                    </div>
                  </div>
                </div>

                <div className="mt-3">
                  <div className="alert alert-info text-info">
                    <i className="bi bi-info-circle me-2"></i>
                    <strong>Current Company Type:</strong> {company?.companyType || 'Not specified'}
                    <br />
                    <strong>Auto-detected:</strong> {determineServiceType().toUpperCase()}
                    <br />
                    <strong>Selected Type:</strong> {tempThankYouType.toUpperCase()}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => onClose()}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleApply}
            >
              <i className="bi bi-check-lg me-1"></i>
              Apply Message
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThankYouMessageForm;