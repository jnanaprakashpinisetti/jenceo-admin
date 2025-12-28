import React from "react";

const FinanceTab = ({ formData, editMode, handleChange }) => {
  const manpowerOptions = [
    "Skilled", "Unskilled", "Semi-Skilled", "Technical", "Supervisory", 
    "Managerial", "Support Staff", "Contractual", "Temporary"
  ];

  const shiftOptions = ["8 Hours", "12 Hours", "24 Hours", "Day Shift", "Night Shift", "Rotational"];
  const deploymentOptions = ["Urban", "Rural", "Metro", "Tier-1 City", "Tier-2 City", "Tier-3 City", "Pan-India"];
  const billingCycles = ["Monthly", "Quarterly", "Half-Yearly", "Yearly", "Custom"];
  const paymentTerms = ["Net 15", "Net 30", "Net 45", "Net 60", "Advance", "Upon Delivery"];
  const yesNoOptions = ["Yes", "No"];

  return (
    <div className="row">
      <div className="col-md-6">
        <div className="mb-3">
          <label className="form-label"><strong>Manpower Types</strong></label>
          <div className="row">
            {manpowerOptions.map(type => (
              <div key={type} className="col-md-6 mb-2">
                <div className="form-check">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    name="manpowerTypes"
                    value={type}
                    checked={(formData.manpowerTypes || []).includes(type)}
                    onChange={handleChange}
                    disabled={!editMode}
                    id={`manpower-${type}`}
                  />
                  <label className="form-check-label" htmlFor={`manpower-${type}`}>
                    {type}
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-3">
          <label className="form-label"><strong>Shift Coverage</strong></label>
          <select
            className="form-control"
            name="shiftCoverage"
            value={formData.shiftCoverage || ""}
            onChange={handleChange}
            disabled={!editMode}
          >
            <option value="">Select Shift</option>
            {shiftOptions.map(shift => (
              <option key={shift} value={shift}>{shift}</option>
            ))}
          </select>
        </div>

        <div className="mb-3">
          <label className="form-label"><strong>Deployment Areas</strong></label>
          <div className="row">
            {deploymentOptions.map(area => (
              <div key={area} className="col-md-6 mb-2">
                <div className="form-check">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    name="deploymentAreas"
                    value={area}
                    checked={(formData.deploymentAreas || []).includes(area)}
                    onChange={handleChange}
                    disabled={!editMode}
                    id={`deployment-${area}`}
                  />
                  <label className="form-check-label" htmlFor={`deployment-${area}`}>
                    {area}
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="col-md-6">
        <div className="mb-3">
          <label className="form-label"><strong>Contract Start Date</strong></label>
          <input
            type="date"
            className="form-control"
            name="contractStartDate"
            value={formData.contractStartDate || ""}
            onChange={handleChange}
            readOnly={!editMode}
            disabled={!editMode}
          />
        </div>

        <div className="mb-3">
          <label className="form-label"><strong>Contract End Date</strong></label>
          <input
            type="date"
            className="form-control"
            name="contractEndDate"
            value={formData.contractEndDate || ""}
            onChange={handleChange}
            readOnly={!editMode}
            disabled={!editMode}
          />
        </div>

        <div className="mb-3">
          <label className="form-label"><strong>Billing Cycle</strong></label>
          <select
            className="form-control"
            name="billingCycle"
            value={formData.billingCycle || ""}
            onChange={handleChange}
            disabled={!editMode}
          >
            <option value="">Select Billing Cycle</option>
            {billingCycles.map(cycle => (
              <option key={cycle} value={cycle}>{cycle}</option>
            ))}
          </select>
        </div>

        <div className="mb-3">
          <label className="form-label"><strong>Payment Terms</strong></label>
          <select
            className="form-control"
            name="paymentTerms"
            value={formData.paymentTerms || ""}
            onChange={handleChange}
            disabled={!editMode}
          >
            <option value="">Select Payment Terms</option>
            {paymentTerms.map(term => (
              <option key={term} value={term}>{term}</option>
            ))}
          </select>
        </div>

        <div className="row">
          <div className="col-md-6">
            <div className="mb-3">
              <label className="form-label"><strong>GST Applicable</strong></label>
              <select
                className="form-control"
                name="gstApplicable"
                value={formData.gstApplicable || ""}
                onChange={handleChange}
                disabled={!editMode}
              >
                <option value="">Select</option>
                {yesNoOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="col-md-6">
            <div className="mb-3">
              <label className="form-label"><strong>TDS Applicable</strong></label>
              <select
                className="form-control"
                name="tdsApplicable"
                value={formData.tdsApplicable || ""}
                onChange={handleChange}
                disabled={!editMode}
              >
                <option value="">Select</option>
                {yesNoOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="col-12 mt-4">
        <div className="alert alert-info text-info">
          <h6 className="alert-heading">Contract Summary</h6>
          <div className="row">
            <div className="col-md-6">
              <p className="mb-1"><strong>Contract Period:</strong> 
                {formData.contractStartDate && formData.contractEndDate 
                  ? `${formData.contractStartDate} to ${formData.contractEndDate}`
                  : "Not specified"}
              </p>
              <p className="mb-1"><strong>Billing:</strong> {formData.billingCycle || "Not specified"}</p>
            </div>
            <div className="col-md-6">
              <p className="mb-1"><strong>Payment Terms:</strong> {formData.paymentTerms || "Not specified"}</p>
              <p className="mb-1"><strong>Taxes:</strong> GST: {formData.gstApplicable || "Not specified"}, TDS: {formData.tdsApplicable || "Not specified"}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinanceTab;