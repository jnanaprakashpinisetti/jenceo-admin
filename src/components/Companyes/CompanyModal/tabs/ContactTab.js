import React from "react";

const ContactTab = ({ formData, editMode, errors, handleChange }) => {
  const contactMethods = ["Phone", "Email", "WhatsApp", "SMS", "In-Person"];

  return (
    <div className="row">
      <div className="col-md-6">
        <h5 className="mb-3">Primary Contact</h5>
        
        <div className="mb-3">
          <label className="form-label"><strong>Contact Person Name *</strong></label>
          <input
            type="text"
            className={`form-control ${errors.primaryContactName ? "is-invalid" : ""}`}
            name="primaryContactName"
            value={formData.primaryContactName || ""}
            onChange={handleChange}
            readOnly={!editMode}
            disabled={!editMode}
          />
          {errors.primaryContactName && <div className="invalid-feedback">{errors.primaryContactName}</div>}
        </div>

        <div className="mb-3">
          <label className="form-label"><strong>Designation *</strong></label>
          <input
            type="text"
            className={`form-control ${errors.primaryDesignation ? "is-invalid" : ""}`}
            name="primaryDesignation"
            value={formData.primaryDesignation || ""}
            onChange={handleChange}
            readOnly={!editMode}
            disabled={!editMode}
          />
          {errors.primaryDesignation && <div className="invalid-feedback">{errors.primaryDesignation}</div>}
        </div>

        <div className="mb-3">
          <label className="form-label"><strong>Department</strong></label>
          <input
            type="text"
            className="form-control"
            name="primaryDepartment"
            value={formData.primaryDepartment || ""}
            onChange={handleChange}
            readOnly={!editMode}
            disabled={!editMode}
          />
        </div>

        <div className="row">
          <div className="col-md-6">
            <div className="mb-3">
              <label className="form-label"><strong>Mobile No *</strong></label>
              <input
                type="tel"
                className={`form-control ${errors.primaryMobile ? "is-invalid" : ""}`}
                name="primaryMobile"
                value={formData.primaryMobile || ""}
                onChange={handleChange}
                readOnly={!editMode}
                disabled={!editMode}
                maxLength="10"
              />
              {errors.primaryMobile && <div className="invalid-feedback">{errors.primaryMobile}</div>}
            </div>
          </div>
          <div className="col-md-6">
            <div className="mb-3">
              <label className="form-label"><strong>Alternate Mobile</strong></label>
              <input
                type="tel"
                className="form-control"
                name="primaryAlternateMobile"
                value={formData.primaryAlternateMobile || ""}
                onChange={handleChange}
                readOnly={!editMode}
                disabled={!editMode}
                maxLength="10"
              />
            </div>
          </div>
        </div>

        <div className="mb-3">
          <label className="form-label"><strong>Email</strong></label>
          <input
            type="email"
            className="form-control"
            name="primaryEmail"
            value={formData.primaryEmail || ""}
            onChange={handleChange}
            readOnly={!editMode}
            disabled={!editMode}
          />
        </div>

        <div className="mb-3">
          <label className="form-label"><strong>Preferred Contact Method *</strong></label>
          <select
            className={`form-control ${errors.primaryPreferredMethod ? "is-invalid" : ""}`}
            name="primaryPreferredMethod"
            value={formData.primaryPreferredMethod || ""}
            onChange={handleChange}
            disabled={!editMode}
          >
            <option value="">Select Method</option>
            {contactMethods.map(method => (
              <option key={method} value={method}>{method}</option>
            ))}
          </select>
          {errors.primaryPreferredMethod && <div className="invalid-feedback">{errors.primaryPreferredMethod}</div>}
        </div>
      </div>

      <div className="col-md-6">
        <h5 className="mb-3">Secondary Contact</h5>
        
        <div className="mb-3">
          <label className="form-label"><strong>Contact Person Name *</strong></label>
          <input
            type="text"
            className={`form-control ${errors.secondaryContactName ? "is-invalid" : ""}`}
            name="secondaryContactName"
            value={formData.secondaryContactName || ""}
            onChange={handleChange}
            readOnly={!editMode}
            disabled={!editMode}
          />
          {errors.secondaryContactName && <div className="invalid-feedback">{errors.secondaryContactName}</div>}
        </div>

        <div className="mb-3">
          <label className="form-label"><strong>Designation *</strong></label>
          <input
            type="text"
            className={`form-control ${errors.secondaryDesignation ? "is-invalid" : ""}`}
            name="secondaryDesignation"
            value={formData.secondaryDesignation || ""}
            onChange={handleChange}
            readOnly={!editMode}
            disabled={!editMode}
          />
          {errors.secondaryDesignation && <div className="invalid-feedback">{errors.secondaryDesignation}</div>}
        </div>

        <div className="mb-3">
          <label className="form-label"><strong>Department</strong></label>
          <input
            type="text"
            className="form-control"
            name="secondaryDepartment"
            value={formData.secondaryDepartment || ""}
            onChange={handleChange}
            readOnly={!editMode}
            disabled={!editMode}
          />
        </div>

        <div className="row">
          <div className="col-md-6">
            <div className="mb-3">
              <label className="form-label"><strong>Mobile No *</strong></label>
              <input
                type="tel"
                className={`form-control ${errors.secondaryMobile ? "is-invalid" : ""}`}
                name="secondaryMobile"
                value={formData.secondaryMobile || ""}
                onChange={handleChange}
                readOnly={!editMode}
                disabled={!editMode}
                maxLength="10"
              />
              {errors.secondaryMobile && <div className="invalid-feedback">{errors.secondaryMobile}</div>}
            </div>
          </div>
          <div className="col-md-6">
            <div className="mb-3">
              <label className="form-label"><strong>Alternate Mobile</strong></label>
              <input
                type="tel"
                className="form-control"
                name="secondaryAlternateMobile"
                value={formData.secondaryAlternateMobile || ""}
                onChange={handleChange}
                readOnly={!editMode}
                disabled={!editMode}
                maxLength="10"
              />
            </div>
          </div>
        </div>

        <div className="mb-3">
          <label className="form-label"><strong>Email</strong></label>
          <input
            type="email"
            className="form-control"
            name="secondaryEmail"
            value={formData.secondaryEmail || ""}
            onChange={handleChange}
            readOnly={!editMode}
            disabled={!editMode}
          />
        </div>

        <div className="mb-3">
          <label className="form-label"><strong>Preferred Contact Method *</strong></label>
          <select
            className={`form-control ${errors.secondaryPreferredMethod ? "is-invalid" : ""}`}
            name="secondaryPreferredMethod"
            value={formData.secondaryPreferredMethod || ""}
            onChange={handleChange}
            disabled={!editMode}
          >
            <option value="">Select Method</option>
            {contactMethods.map(method => (
              <option key={method} value={method}>{method}</option>
            ))}
          </select>
          {errors.secondaryPreferredMethod && <div className="invalid-feedback">{errors.secondaryPreferredMethod}</div>}
        </div>
      </div>

      <div className="col-md-12 mt-4">
        <h5 className="mb-3">Finance Contact</h5>
        <div className="row">
          <div className="col-md-4">
            <div className="mb-3">
              <label className="form-label"><strong>Finance Contact Name</strong></label>
              <input
                type="text"
                className="form-control"
                name="financeContactName"
                value={formData.financeContactName || ""}
                onChange={handleChange}
                readOnly={!editMode}
                disabled={!editMode}
              />
            </div>
          </div>
          <div className="col-md-4">
            <div className="mb-3">
              <label className="form-label"><strong>Designation</strong></label>
              <input
                type="text"
                className="form-control"
                name="financeDesignation"
                value={formData.financeDesignation || ""}
                onChange={handleChange}
                readOnly={!editMode}
                disabled={!editMode}
              />
            </div>
          </div>
          <div className="col-md-4">
            <div className="mb-3">
              <label className="form-label"><strong>Email</strong></label>
              <input
                type="email"
                className="form-control"
                name="financeEmail"
                value={formData.financeEmail || ""}
                onChange={handleChange}
                readOnly={!editMode}
                disabled={!editMode}
              />
            </div>
          </div>
          <div className="col-md-4">
            <div className="mb-3">
              <label className="form-label"><strong>Mobile</strong></label>
              <input
                type="tel"
                className="form-control"
                name="financeMobile"
                value={formData.financeMobile || ""}
                onChange={handleChange}
                readOnly={!editMode}
                disabled={!editMode}
                maxLength="10"
              />
            </div>
          </div>
          <div className="col-md-8">
            <div className="mb-3">
              <label className="form-label"><strong>Billing Address</strong></label>
              {editMode && (
                <div className="form-check">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    name="billingAddressSame"
                    checked={formData.billingAddressSame || false}
                    onChange={handleChange}
                    id="billingAddressSame"
                  />
                  <label className="form-check-label" htmlFor="billingAddressSame">
                    Same as Registered Address
                  </label>
                </div>
              )}
              {!editMode && formData.billingAddressSame && (
                <div className="alert alert-info p-2 mb-0">
                  Same as Registered Address
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactTab;