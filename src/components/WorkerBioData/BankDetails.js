import React from "react";

const BankDetails = ({
  formData,
  handleChange,
  handleBlur,
  prevStep,
  handleSubmit,
  errors,
  isSubmitting,
}) => {
  return (
    <div className="bank-details-form">
      <div className="form-card-header mb-4">
        <h3 className="text-center">Bank Account Details</h3>
      </div>
      <hr></hr>

      <div className="row g-3">
        {/* Account Number */}
        <div className="col-md-6">
          <label htmlFor="accountNo" className="form-label">Account No</label>
          <input
            type="text"
            className={`form-control ${errors.accountNo ? "is-invalid" : ""}`}
            id="accountNo"
            name="accountNo"
            value={formData.accountNo}
            onChange={handleChange}
            onBlur={handleBlur}
            maxLength={18}
            placeholder="Enter account number"
          />
          {errors.accountNo && <div className="invalid-feedback">{errors.accountNo}</div>}
        </div>

        {/* Bank Name */}
        <div className="col-md-6">
          <label htmlFor="bankName" className="form-label">Bank Name</label>
          <input
            type="text"
            className={`form-control ${errors.bankName ? "is-invalid" : ""}`}
            id="bankName"
            name="bankName"
            value={formData.bankName}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="Enter bank name"
          />
          {errors.bankName && <div className="invalid-feedback">{errors.bankName}</div>}
        </div>

        {/* Branch Name */}
        <div className="col-md-6">
          <label htmlFor="branchName" className="form-label">Branch Name</label>
          <input
            type="text"
            className={`form-control ${errors.branchName ? "is-invalid" : ""}`}
            id="branchName"
            name="branchName"
            value={formData.branchName}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="Enter branch name"
          />
          {errors.branchName && <div className="invalid-feedback">{errors.branchName}</div>}
        </div>

        {/* IFSC Code */}
        <div className="col-md-6">
          <label htmlFor="ifscCode" className="form-label">IFSC Code</label>
          <input
            type="text"
            className={`form-control ${errors.ifscCode ? "is-invalid" : ""}`}
            id="ifscCode"
            name="ifscCode"
            value={formData.ifscCode}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="Enter IFSC code"
            style={{ textTransform: "uppercase" }}
            maxLength={11}
          />
          {errors.ifscCode && <div className="invalid-feedback">{errors.ifscCode}</div>}
        </div>

        {/* UPI Payment Details */}
        <div className="col-12 mt-3">
          <h6 className="border-bottom pb-2">UPI Payment Details</h6>
        </div>

        {/* PhonePe */}
        <div className="col-md-6">
          <label htmlFor="phonePayNo" className="form-label">PhonePe Number</label>
          <div className="input-group">
            <span className="input-group-text">+91</span>
            <input
              type="text"
              className={`form-control ${errors.phonePayNo ? "is-invalid" : ""}`}
              id="phonePayNo"
              name="phonePayNo"
              value={formData.phonePayNo}
              onChange={handleChange}
              onBlur={handleBlur}
              maxLength={10}
              placeholder="Enter PhonePe number"
            />
          </div>
          {errors.phonePayNo && <div className="invalid-feedback">{errors.phonePayNo}</div>}
        </div>

        <div className="col-md-6">
          <label htmlFor="phonePayName" className="form-label">PhonePe Name</label>
          <input
            type="text"
            className={`form-control ${errors.phonePayName ? "is-invalid" : ""}`}
            id="phonePayName"
            name="phonePayName"
            value={formData.phonePayName}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="Enter name registered with PhonePe"
          />
          {errors.phonePayName && <div className="invalid-feedback">{errors.phonePayName}</div>}
        </div>

        {/* Google Pay */}
        <div className="col-md-6">
          <label htmlFor="googlePayNo" className="form-label">Google Pay Number</label>
          <div className="input-group">
            <span className="input-group-text">+91</span>
            <input
              type="text"
              className={`form-control ${errors.googlePayNo ? "is-invalid" : ""}`}
              id="googlePayNo"
              name="googlePayNo"
              value={formData.googlePayNo}
              onChange={handleChange}
              onBlur={handleBlur}
              maxLength={10}
              placeholder="Enter Google Pay number"
            />
          </div>
          {errors.googlePayNo && <div className="invalid-feedback">{errors.googlePayNo}</div>}
        </div>

        <div className="col-md-6">
          <label htmlFor="googlePayName" className="form-label">Google Pay Name</label>
          <input
            type="text"
            className={`form-control ${errors.googlePayName ? "is-invalid" : ""}`}
            id="googlePayName"
            name="googlePayName"
            value={formData.googlePayName}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="Enter name registered with Google Pay"
          />
          {errors.googlePayName && <div className="invalid-feedback">{errors.googlePayName}</div>}
        </div>

        {/* Salary Information */}
        <div className="col-12 mt-3">
          <h6 className="border-bottom pb-2">Salary Information</h6>
        </div>

        <div className="col-md-6">
          <label htmlFor="basicSalary" className="form-label">Basic Salary</label>
          <input
            type="tel"
            className={`form-control ${errors.basicSalary ? "is-invalid" : ""}`}
            id="basicSalary"
            name="basicSalary"
            value={formData.basicSalary}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="Enter salary"
            maxLength={5}
          />
          {errors.basicSalary && <div className="invalid-feedback">{errors.basicSalary}</div>}
        </div>

        <div className="col-md-6">
          <label htmlFor="pageNo" className="form-label">Page No</label>
          <input
            type="tel"
            className={`form-control ${errors.pageNo ? "is-invalid" : ""}`}
            id="pageNo"
            name="pageNo"
            value={formData.pageNo}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="Enter page no"
            maxLength={3}
          />
          {errors.pageNo && <div className="invalid-feedback">{errors.pageNo}</div>}
        </div>

        <div className="col-12">
          <label htmlFor="aboutEmployee" className="form-label">About Employee</label>
          <textarea
            className="form-control"
            id="aboutEmployee"
            name="aboutEmployee"
            value={formData.aboutEmployee}
            onChange={handleChange}
            rows={3}
          />
        </div>
      </div>

      <div className="d-flex justify-content-between mt-4">
        <button type="button" className="btn btn-secondary" onClick={prevStep}>
          Previous
        </button>
        <button
          type="button"
          className="btn btn-success"
          onClick={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? "Submitting..." : "Submit"}
        </button>
      </div>
    </div>
  );
};

export default BankDetails;
