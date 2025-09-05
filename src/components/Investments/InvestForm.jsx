// InvestForm.jsx
import React, { useEffect, useRef, useState } from "react";
import InvestModal from "./InvestModal";
import ThankyouModal from "../ThankyouModal";
import firebaseDB from "../../firebase";

/**
 * InvestForm.jsx
 * - Consistent styling & validation with other forms
 * - Fixed value handling (no arrays)
 * - Adds employeeName, createdAt when saving
 *
 * Props:
 *  - currentUser (string) optional — used as employeeName when saving (default "Admin")
 */
export default function InvestForm({ currentUser = "Admin" }) {
  // initial empty form
  const emptyFormData = {
    investor: "",
    invest_date: "",
    invest_amount: "",
    invest_to: "",
    invest_reference: "",
    invest_purpose: "",
    invest_comments: "",
  };

  const [formData, setFormData] = useState(emptyFormData);
  const [errors, setErrors] = useState({});
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showThankModal, setShowThankModal] = useState(false);
  const firstFieldRef = useRef(null);

  // max date = today
  const todayISO = new Date().toISOString().split("T")[0];

  // focus first field when component mounts
  useEffect(() => {
    if (firstFieldRef.current) firstFieldRef.current.focus();
  }, []);

  // unified change handler (store primitive values, not arrays)
  const handleChange = (e) => {
    const { name, value } = e.target;
    // For numeric fields keep as number when possible
    const normalizedValue =
      e.target.type === "number" ? (value === "" ? "" : value) : value;
    setFormData((p) => ({ ...p, [name]: normalizedValue }));
    // clear error for this field
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  // blur handler - mark invalid class if needed (visual)
  const handleBlur = (e) => {
    const { name } = e.target;
    if (errors[name]) {
      // re-run validation to clear/reshow
      validateField(name, formData[name]);
    }
  };

  // single-field validation (called on blur or submit)
  const validateField = (name, value) => {
    let msg = "";
    if (name === "investor") {
      if (!value || value.toString().trim() === "") msg = "Select investor";
    }
    if (name === "invest_date") {
      if (!value) msg = "Select investment date";
      else {
        const d = new Date(value);
        const max = new Date(todayISO);
        if (isNaN(d.getTime())) msg = "Invalid date";
        else if (d > max) msg = "Date cannot be in the future";
      }
    }
    if (name === "invest_amount") {
      if (value === "" || value === null) msg = "Enter amount";
      else {
        const n = Number(value);
        if (Number.isNaN(n) || n <= 0) msg = "Amount must be greater than 0";
      }
    }
    if (name === "invest_to") {
      if (!value || value.toString().trim() === "") msg = "Select destination";
    }
    setErrors((prev) => ({ ...prev, [name]: msg }));
    return msg === "";
  };

  // validate all fields before showing confirm modal
  const validateAll = () => {
    const toValidate = ["investor", "invest_date", "invest_amount", "invest_to"];
    let ok = true;
    toValidate.forEach((f) => {
      const valid = validateField(f, formData[f]);
      if (!valid) ok = false;
    });
    // optional: invest_reference/invest_purpose/invest_comments are optional
    return ok;
  };

  // on form submit -> show confirmation modal if valid
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateAll()) {
      // focus first invalid field
      const firstInvalid = Object.keys(errors).find((k) => errors[k]);
      if (firstInvalid) {
        const el = document.querySelector(`[name="${firstInvalid}"]`);
        if (el) el.focus();
      }
      return;
    }
    setShowConfirmModal(true);
  };

  // cancel confirm modal
  const handleCancelConfirm = () => {
    setShowConfirmModal(false);
    // focus first input
    if (firstFieldRef.current) firstFieldRef.current.focus();
  };

  // save to firebase on confirm
  const handleSave = async (e) => {
    e.preventDefault();
    setShowConfirmModal(false);

    // prepare payload with metadata
    const payload = {
      investor: formData.investor,
      invest_date: formData.invest_date,
      invest_amount: Number(formData.invest_amount) || 0,
      invest_to: formData.invest_to,
      invest_reference: formData.invest_reference?.trim() || "",
      invest_purpose: formData.invest_purpose?.trim() || "",
      invest_comments: formData.invest_comments?.trim() || "",
      employeeName: currentUser || "Admin",
      createdAt: new Date().toISOString(),
    };

    try {
      await firebaseDB.child("Investments").push(payload);
      setShowThankModal(true);
      // reset form
      setFormData(emptyFormData);
      setErrors({});
      // focus first
      if (firstFieldRef.current) firstFieldRef.current.focus();
    } catch (err) {
      console.error("Failed saving investment:", err);
      alert("Failed to save. See console for details.");
    }
  };

  // close thank you modal
  const handleCloseThank = (e) => {
    e && e.preventDefault();
    setShowThankModal(false);
    if (firstFieldRef.current) firstFieldRef.current.focus();
  };

  return (
    <div className="form-wrapper container py-3">
      <form id="investForm" onSubmit={handleSubmit} noValidate>
        <div className="row g-3">
          {/* Investor */}
          <div className="col-md-6">
            <label htmlFor="investor" className="form-label">
              <strong>
                Select Investor <span className="star text-danger">*</span>
              </strong>
            </label>
            <select
              id="investor"
              name="investor"
              className={`form-select ${errors.investor ? "is-invalid" : ""}`}
              value={formData.investor}
              onChange={handleChange}
              onBlur={handleBlur}
              ref={firstFieldRef}
            >
              <option value="">Select Investor</option>
              <option value="Suresh">Suresh</option>
              <option value="Prakash">Prakash</option>
              <option value="Sudheer">Sudheer</option>
              <option value="Others">Others</option>
            </select>
            {errors.investor && <div className="invalid-feedback">{errors.investor}</div>}
          </div>

          {/* Invest Date */}
          <div className="col-md-6">
            <label htmlFor="invest_date" className="form-label">
              <strong>
                Investment Date <span className="star text-danger">*</span>
              </strong>
            </label>
            <input
              id="invest_date"
              name="invest_date"
              type="date"
              className={`form-control ${errors.invest_date ? "is-invalid" : ""}`}
              value={formData.invest_date}
              onChange={handleChange}
              onBlur={handleBlur}
              max={todayISO}
            />
            {errors.invest_date && <div className="invalid-feedback">{errors.invest_date}</div>}
          </div>

          {/* Amount */}
          <div className="col-md-6">
            <label htmlFor="invest_amount" className="form-label">
              <strong>
                Amount <span className="star text-danger">*</span>
              </strong>
            </label>
            <input
              id="invest_amount"
              name="invest_amount"
              type="tel"
              min="1"
              className={`form-control ${errors.invest_amount ? "is-invalid" : ""}`}
              value={formData.invest_amount}
              onChange={handleChange}
              onBlur={handleBlur}
              maxLength={6}
            />
            {errors.invest_amount && <div className="invalid-feedback">{errors.invest_amount}</div>}
          </div>

          {/* Invest To */}
          <div className="col-md-6">
            <label htmlFor="invest_to" className="form-label">
              <strong>
                To <span className="star text-danger">*</span>
              </strong>
            </label>
            <select
              id="invest_to"
              name="invest_to"
              className={`form-select ${errors.invest_to ? "is-invalid" : ""}`}
              value={formData.invest_to}
              onChange={handleChange}
              onBlur={handleBlur}
            >
              <option value="">Select Destination</option>
              <option value="sbiValluru">S.B.I Valluru</option>
              <option value="sbiHyd">S.B.I Hyd</option>
              <option value="hdfc">HDFC</option>
              <option value="others">Others</option>
            </select>
            {errors.invest_to && <div className="invalid-feedback">{errors.invest_to}</div>}
          </div>

          {/* Reference & Purpose */}
          <div className="col-md-6">
            <label htmlFor="invest_reference" className="form-label">
              <strong>Reference No</strong>
            </label>
            <input
              id="invest_reference"
              name="invest_reference"
              type="text"
              className="form-control"
              value={formData.invest_reference}
              onChange={handleChange}
            />
          </div>

          <div className="col-md-6">
            <label htmlFor="invest_purpose" className="form-label">
              <strong>Purpose</strong>
            </label>
            <input
              id="invest_purpose"
              name="invest_purpose"
              type="text"
              className="form-control"
              value={formData.invest_purpose}
              onChange={handleChange}
            />
          </div>

          {/* Comments */}
          <div className="col-12">
            <label htmlFor="invest_comments" className="form-label">
              <strong>Comments</strong>
            </label>
            <textarea
              id="invest_comments"
              name="invest_comments"
              rows="4"
              className="form-control"
              value={formData.invest_comments}
              onChange={handleChange}
            />
          </div>

          {/* Action buttons */}
          <div className="col-12 d-flex justify-content-end gap-2">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setFormData(emptyFormData);
                setErrors({});
                if (firstFieldRef.current) firstFieldRef.current.focus();
              }}
            >
              Reset
            </button>
            <button type="submit" className="btn btn-primary">
              Submit
            </button>
          </div>
        </div>
      </form>

      {/* Confirmation modal (InvestModal) */}
      {showConfirmModal && (
        <InvestModal
          cancleFun={handleCancelConfirm}
          actionFun={handleSave}
          name={formData.investor}
          amount={formData.invest_amount}
          date={formData.invest_date}
          actionText="Save"
        />
      )}

      {/* Thank you */}
      {showThankModal && <ThankyouModal cancleFun={handleCloseThank} />}
    </div>
  );
}
