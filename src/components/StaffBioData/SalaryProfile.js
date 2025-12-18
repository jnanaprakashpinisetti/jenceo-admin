// SalaryProfile.js
import React, { useEffect, useState } from "react";

const SalaryProfile = ({
  formData,
  errors,
  handleChange,
  handleBlur,
  nextStep,
  prevStep,
  handleSubmit,
  isSubmitting
}) => {
  const [calculatedTotals, setCalculatedTotals] = useState({
    totalEarnings: 0,
    totalDeductions: 0,
    netSalary: 0
  });

  // Calculate totals whenever salary breakdown or deductions change
  useEffect(() => {
    const calculateTotals = () => {
      // Parse earnings
      const basic = parseFloat(formData.salaryBreakdown?.basic) || 0;
      const hra = parseFloat(formData.salaryBreakdown?.hra) || 0;
      const da = parseFloat(formData.salaryBreakdown?.da) || 0;
      const ta = parseFloat(formData.salaryBreakdown?.ta) || 0;
      const medical = parseFloat(formData.salaryBreakdown?.medical) || 0;
      const specialAllowance = parseFloat(formData.salaryBreakdown?.specialAllowance) || 0;
      const otherAllowances = parseFloat(formData.salaryBreakdown?.otherAllowances) || 0;

      // Parse deductions
      const pf = parseFloat(formData.deductions?.pf) || 0;
      const esi = parseFloat(formData.deductions?.esi) || 0;
      const tds = parseFloat(formData.deductions?.tds) || 0;
      const otherDeductions = parseFloat(formData.deductions?.otherDeductions) || 0;

      // Calculate totals
      const totalEarnings = basic + hra + da + ta + medical + specialAllowance + otherAllowances;
      const totalDeductions = pf + esi + tds + otherDeductions;
      const netSalary = totalEarnings - totalDeductions;

      setCalculatedTotals({
        totalEarnings,
        totalDeductions,
        netSalary
      });

      // Auto-update the form fields if they're empty or different
      if (!formData.salaryBreakdown?.totalEarnings || 
          parseFloat(formData.salaryBreakdown.totalEarnings) !== totalEarnings) {
        handleChange({
          target: {
            name: "salaryBreakdown.totalEarnings",
            value: totalEarnings.toString()
          }
        });
      }

      if (!formData.deductions?.totalDeductions || 
          parseFloat(formData.deductions.totalDeductions) !== totalDeductions) {
        handleChange({
          target: {
            name: "deductions.totalDeductions",
            value: totalDeductions.toString()
          }
        });
      }

      if (!formData.netSalary || 
          parseFloat(formData.netSalary) !== netSalary) {
        handleChange({
          target: {
            name: "netSalary",
            value: netSalary.toString()
          }
        });
      }
    };

    calculateTotals();
  }, [formData.salaryBreakdown, formData.deductions, handleChange]);

  // Handle input change with validation
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Allow only numbers and decimal point
    if (value === "" || /^[0-9]*\.?[0-9]*$/.test(value)) {
      handleChange(e);
    }
  };

  // Format currency for display
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Handle rating change
  const handleRatingChange = (rating) => {
    handleChange({
      target: {
        name: "rating",
        value: rating
      }
    });
  };

  // Render star rating
  const renderStars = () => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <button
          key={i}
          type="button"
          className={`star-btn ${i <= (formData.rating || 0) ? 'active' : ''}`}
          onClick={() => handleRatingChange(i)}
          title={`Rate ${i} star${i > 1 ? 's' : ''}`}
          aria-label={`Rate ${i} star${i > 1 ? 's' : ''}`}
        >
          ★
        </button>
      );
    }
    return stars;
  };

  return (
    <div>
      <div className="form-card-header mb-4">
        <h3 className="text-center">Salary Profile</h3>
        <p className="text-center text-muted mb-0">Configure salary structure and payment details</p>
      </div>
      <hr />

      {/* Effective Date & Payment Mode */}
      <div className="row g-3 mb-4">
        <div className="col-md-6">
          <label htmlFor="salaryEffectiveDate" className="form-label">
            Salary Effective Date <span className="star">*</span>
          </label>
          <input
            type="date"
            className={`form-control ${errors.salaryEffectiveDate ? "is-invalid" : ""}`}
            id="salaryEffectiveDate"
            name="salaryEffectiveDate"
            value={formData.salaryEffectiveDate || ""}
            onChange={handleChange}
            onBlur={handleBlur}
            min={formData.date || ""} // Minimum date should be joining date
            max={new Date().toISOString().split("T")[0]}
          />
          {errors.salaryEffectiveDate && (
            <div className="invalid-feedback">{errors.salaryEffectiveDate}</div>
          )}
          <small className="text-muted">Date from which this salary structure is effective</small>
        </div>

        <div className="col-md-6">
          <label htmlFor="paymentMode" className="form-label">
            Payment Mode <span className="star">*</span>
          </label>
          <select
            className={`form-select ${errors.paymentMode ? "is-invalid" : ""}`}
            id="paymentMode"
            name="paymentMode"
            value={formData.paymentMode || ""}
            onChange={handleChange}
            onBlur={handleBlur}
          >
            <option value="">Select Payment Mode</option>
            <option value="Bank Transfer">Bank Transfer</option>
            <option value="Cash">Cash</option>
            <option value="Cheque">Cheque</option>
            <option value="Online Transfer">Online Transfer</option>
            <option value="UPI">UPI</option>
          </select>
          {errors.paymentMode && (
            <div className="invalid-feedback">{errors.paymentMode}</div>
          )}
        </div>
      </div>

      {/* Salary Breakdown Section */}
      <div className="card mb-4">
        <div className="card-header bg-light">
          <h5 className="mb-0">Salary Breakdown</h5>
          <small className="text-muted">Enter individual salary components</small>
        </div>
        <div className="card-body">
          <div className="row g-3">
            {/* Basic Salary */}
            <div className="col-md-6">
              <label htmlFor="salaryBreakdown.basic" className="form-label">
                Basic Salary <span className="star">*</span>
              </label>
              <div className="input-group">
                <span className="input-group-text">₹</span>
                <input
                  type="text"
                  inputMode="numeric"
                  className={`form-control ${errors["salaryBreakdown.basic"] ? "is-invalid" : ""}`}
                  id="salaryBreakdown.basic"
                  name="salaryBreakdown.basic"
                  value={formData.salaryBreakdown?.basic || ""}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  placeholder="0.00"
                />
              </div>
              {errors["salaryBreakdown.basic"] && (
                <div className="invalid-feedback d-block">{errors["salaryBreakdown.basic"]}</div>
              )}
            </div>

            {/* HRA */}
            <div className="col-md-6">
              <label htmlFor="salaryBreakdown.hra" className="form-label">
                House Rent Allowance (HRA)
              </label>
              <div className="input-group">
                <span className="input-group-text">₹</span>
                <input
                  type="text"
                  inputMode="numeric"
                  className="form-control"
                  id="salaryBreakdown.hra"
                  name="salaryBreakdown.hra"
                  value={formData.salaryBreakdown?.hra || ""}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* DA */}
            <div className="col-md-6">
              <label htmlFor="salaryBreakdown.da" className="form-label">
                Dearness Allowance (DA)
              </label>
              <div className="input-group">
                <span className="input-group-text">₹</span>
                <input
                  type="text"
                  inputMode="numeric"
                  className="form-control"
                  id="salaryBreakdown.da"
                  name="salaryBreakdown.da"
                  value={formData.salaryBreakdown?.da || ""}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Travel Allowance */}
            <div className="col-md-6">
              <label htmlFor="salaryBreakdown.ta" className="form-label">
                Travel Allowance (TA)
              </label>
              <div className="input-group">
                <span className="input-group-text">₹</span>
                <input
                  type="text"
                  inputMode="numeric"
                  className="form-control"
                  id="salaryBreakdown.ta"
                  name="salaryBreakdown.ta"
                  value={formData.salaryBreakdown?.ta || ""}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Medical Allowance */}
            <div className="col-md-6">
              <label htmlFor="salaryBreakdown.medical" className="form-label">
                Medical Allowance
              </label>
              <div className="input-group">
                <span className="input-group-text">₹</span>
                <input
                  type="text"
                  inputMode="numeric"
                  className="form-control"
                  id="salaryBreakdown.medical"
                  name="salaryBreakdown.medical"
                  value={formData.salaryBreakdown?.medical || ""}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Special Allowance */}
            <div className="col-md-6">
              <label htmlFor="salaryBreakdown.specialAllowance" className="form-label">
                Special Allowance
              </label>
              <div className="input-group">
                <span className="input-group-text">₹</span>
                <input
                  type="text"
                  inputMode="numeric"
                  className="form-control"
                  id="salaryBreakdown.specialAllowance"
                  name="salaryBreakdown.specialAllowance"
                  value={formData.salaryBreakdown?.specialAllowance || ""}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Other Allowances */}
            <div className="col-md-12">
              <label htmlFor="salaryBreakdown.otherAllowances" className="form-label">
                Other Allowances
              </label>
              <div className="input-group">
                <span className="input-group-text">₹</span>
                <input
                  type="text"
                  inputMode="numeric"
                  className="form-control"
                  id="salaryBreakdown.otherAllowances"
                  name="salaryBreakdown.otherAllowances"
                  value={formData.salaryBreakdown?.otherAllowances || ""}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  placeholder="0.00"
                />
              </div>
              <small className="text-muted">Any additional allowances not listed above</small>
            </div>
          </div>

          {/* Total Earnings Display */}
          <div className="mt-4 p-3 bg-light rounded">
            <div className="d-flex justify-content-between align-items-center">
              <span className="fw-bold">Total Earnings:</span>
              <span className="h5 mb-0 text-success">
                {formatCurrency(calculatedTotals.totalEarnings)}
              </span>
            </div>
            <input
              type="hidden"
              name="salaryBreakdown.totalEarnings"
              value={calculatedTotals.totalEarnings}
              onChange={() => {}} // Empty handler to prevent warnings
            />
          </div>
        </div>
      </div>

      {/* Deductions Section */}
      <div className="card mb-4">
        <div className="card-header bg-light">
          <h5 className="mb-0">Deductions</h5>
          <small className="text-muted">Enter salary deductions</small>
        </div>
        <div className="card-body">
          <div className="row g-3">
            {/* PF */}
            <div className="col-md-6">
              <label htmlFor="deductions.pf" className="form-label">
                Provident Fund (PF)
              </label>
              <div className="input-group">
                <span className="input-group-text">₹</span>
                <input
                  type="text"
                  inputMode="numeric"
                  className="form-control"
                  id="deductions.pf"
                  name="deductions.pf"
                  value={formData.deductions?.pf || ""}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* ESI */}
            <div className="col-md-6">
              <label htmlFor="deductions.esi" className="form-label">
                ESI Contribution
              </label>
              <div className="input-group">
                <span className="input-group-text">₹</span>
                <input
                  type="text"
                  inputMode="numeric"
                  className="form-control"
                  id="deductions.esi"
                  name="deductions.esi"
                  value={formData.deductions?.esi || ""}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* TDS */}
            <div className="col-md-6">
              <label htmlFor="deductions.tds" className="form-label">
                TDS (Tax Deducted at Source)
              </label>
              <div className="input-group">
                <span className="input-group-text">₹</span>
                <input
                  type="text"
                  inputMode="numeric"
                  className="form-control"
                  id="deductions.tds"
                  name="deductions.tds"
                  value={formData.deductions?.tds || ""}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Other Deductions */}
            <div className="col-md-6">
              <label htmlFor="deductions.otherDeductions" className="form-label">
                Other Deductions
              </label>
              <div className="input-group">
                <span className="input-group-text">₹</span>
                <input
                  type="text"
                  inputMode="numeric"
                  className="form-control"
                  id="deductions.otherDeductions"
                  name="deductions.otherDeductions"
                  value={formData.deductions?.otherDeductions || ""}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          {/* Total Deductions Display */}
          <div className="mt-4 p-3 bg-light rounded">
            <div className="d-flex justify-content-between align-items-center">
              <span className="fw-bold">Total Deductions:</span>
              <span className="h5 mb-0 text-danger">
                {formatCurrency(calculatedTotals.totalDeductions)}
              </span>
            </div>
            <input
              type="hidden"
              name="deductions.totalDeductions"
              value={calculatedTotals.totalDeductions}
              onChange={() => {}} // Empty handler to prevent warnings
            />
          </div>
        </div>
      </div>

      {/* Net Salary & Rating Section */}
      <div className="row g-3 mb-4">
        {/* Net Salary Display */}
        <div className="col-md-6">
          <div className="card h-100">
            <div className="card-body text-center">
              <h6 className="card-subtitle mb-2 text-muted">Net Salary (Take Home)</h6>
              <h3 className={`card-title ${calculatedTotals.netSalary < 0 ? 'text-danger' : 'text-success'}`}>
                {formatCurrency(calculatedTotals.netSalary)}
              </h3>
              <small className="text-muted">
                {calculatedTotals.netSalary < 0 ? 
                  "Warning: Deductions exceed earnings!" : 
                  "Calculated as: Total Earnings - Total Deductions"}
              </small>
              <input
                type="hidden"
                name="netSalary"
                value={calculatedTotals.netSalary}
                onChange={() => {}} // Empty handler to prevent warnings
              />
            </div>
          </div>
        </div>

        {/* Performance Rating */}
        <div className="col-md-6">
          <div className="card h-100">
            <div className="card-body">
              <label className="form-label">
                Performance Rating
                <small className="text-muted ms-1">(optional)</small>
              </label>
              <div className="d-flex align-items-center mb-2">
                <div className="star-rating me-3">
                  {renderStars()}
                </div>
                <span className="badge bg-secondary">
                  {formData.rating || 0}/5
                </span>
              </div>
              <small className="text-muted">
                Rate employee's initial performance (1 = Poor, 5 = Excellent)
              </small>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Card */}
      <div className="card mb-4 border-primary">
        <div className="card-header bg-primary text-white">
          <h5 className="mb-0">Salary Summary</h5>
        </div>
        <div className="card-body">
          <div className="row text-center">
            <div className="col-md-4">
              <div className="p-3">
                <div className="text-muted mb-1">Total Earnings</div>
                <div className="h4 text-success mb-0">
                  {formatCurrency(calculatedTotals.totalEarnings)}
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="p-3">
                <div className="text-muted mb-1">Total Deductions</div>
                <div className="h4 text-danger mb-0">
                  {formatCurrency(calculatedTotals.totalDeductions)}
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="p-3">
                <div className="text-muted mb-1">Net Salary</div>
                <div className={`h4 ${calculatedTotals.netSalary < 0 ? 'text-danger' : 'text-success'} mb-0`}>
                  {formatCurrency(calculatedTotals.netSalary)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Notes Section */}
      <div className="mb-4">
        <label htmlFor="notes" className="form-label">
          Additional Notes
          <small className="text-muted ms-1">(optional)</small>
        </label>
        <textarea
          className="form-control"
          id="notes"
          name="notes"
          value={formData.notes || ""}
          onChange={handleChange}
          onBlur={handleBlur}
          rows="3"
          placeholder="Any additional notes about salary structure, special conditions, or payment terms..."
        ></textarea>
      </div>

      {/* Navigation Buttons */}
      <div className="d-flex justify-content-between mt-4">
        <button 
          type="button" 
          className="btn btn-secondary"
          onClick={prevStep}
        >
          <i className="bi bi-arrow-left me-2"></i>Previous
        </button>
        
        <button 
          type="button" 
          className="btn btn-primary"
          onClick={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              Submitting...
            </>
          ) : (
            <>
              <i className="bi bi-check-circle me-2"></i>Submit & Save
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default SalaryProfile;