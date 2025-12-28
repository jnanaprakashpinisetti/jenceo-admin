import React from "react";

const BankDetailsTab = ({ formData, editMode, handleChange }) => {
  return (
    <div className="row">
      <div className="col-md-6">
        <div className="mb-3">
          <label className="form-label"><strong>Bank Name</strong></label>
          <input
            type="text"
            className="form-control"
            name="bankName"
            value={formData.bankName || ""}
            onChange={handleChange}
            readOnly={!editMode}
            disabled={!editMode}
          />
        </div>

        <div className="mb-3">
          <label className="form-label"><strong>Branch Name</strong></label>
          <input
            type="text"
            className="form-control"
            name="branchName"
            value={formData.branchName || ""}
            onChange={handleChange}
            readOnly={!editMode}
            disabled={!editMode}
          />
        </div>

        <div className="mb-3">
          <label className="form-label"><strong>Account Holder Name</strong></label>
          <input
            type="text"
            className="form-control"
            name="accountHolderName"
            value={formData.accountHolderName || ""}
            onChange={handleChange}
            readOnly={!editMode}
            disabled={!editMode}
          />
        </div>

        <div className="mb-3">
          <label className="form-label"><strong>Account Number</strong></label>
          <input
            type="text"
            className="form-control"
            name="accountNumber"
            value={formData.accountNumber || ""}
            onChange={handleChange}
            readOnly={!editMode}
            disabled={!editMode}
          />
        </div>
      </div>

      <div className="col-md-6">
        <div className="mb-3">
          <label className="form-label"><strong>IFSC Code</strong></label>
          <input
            type="text"
            className="form-control"
            name="ifscCode"
            value={formData.ifscCode || ""}
            onChange={handleChange}
            readOnly={!editMode}
            disabled={!editMode}
          />
        </div>

        <div className="mb-3">
          <label className="form-label"><strong>UPI ID</strong></label>
          <input
            type="text"
            className="form-control"
            name="upiId"
            value={formData.upiId || ""}
            onChange={handleChange}
            readOnly={!editMode}
            disabled={!editMode}
            placeholder="username@bank"
          />
        </div>

        <div className="mb-3">
          <label className="form-label"><strong>Cancelled Cheque</strong></label>
          {formData.cancelledChequeUrl && formData.cancelledChequeUrl !== "" ? (
            <div>
              <a 
                href={formData.cancelledChequeUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="btn btn-sm btn-info me-2"
              >
                View Document
              </a>
              <span className="text-success">
                <i className="fas fa-check-circle me-1"></i>
                Uploaded
              </span>
            </div>
          ) : (
            <div className="text-warning">
              <i className="fas fa-exclamation-triangle me-1"></i>
              Not uploaded
            </div>
          )}
        </div>

        <div className="alert alert-warning mt-4">
          <h6 className="alert-heading"><i className="fas fa-shield-alt me-2"></i>Bank Details Security</h6>
          <p className="mb-0 small">Bank details are sensitive information. Ensure proper authorization before viewing or editing.</p>
        </div>
      </div>
    </div>
  );
};

export default BankDetailsTab;