// InvestForm.jsx
import React, { useEffect, useRef, useState } from "react";
import InvestModal from "./InvestModal";
import ThankyouModal from "../ThankyouModal";
import firebaseDB from "../../firebase";

export default function InvestForm({ currentUser = "Admin", show = false, onClose = () => { }, title = "Add Investment" }) {
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

  const todayISO = new Date().toISOString().split("T")[0];

  useEffect(() => {
    if (show && firstFieldRef.current) firstFieldRef.current.focus();
  }, [show]);

  useEffect(() => {
    if (!show) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [show, onClose]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const normalizedValue =
      e.target.type === "number" ? (value === "" ? "" : value) : value;
    setFormData((p) => ({ ...p, [name]: normalizedValue }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    if (errors[name]) validateField(name, formData[name]);
  };

  const validateField = (name, value) => {
    let msg = "";
    if (name === "investor" && (!value || value.trim() === "")) msg = "Select investor";
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
    if (name === "invest_to" && (!value || value.trim() === "")) msg = "Select destination";
    setErrors((prev) => ({ ...prev, [name]: msg }));
    return msg === "";
  };

  const validateAll = () => {
    const toValidate = ["investor", "invest_date", "invest_amount", "invest_to"];
    return toValidate.every((f) => validateField(f, formData[f]));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateAll()) return;
    setShowConfirmModal(true);
  };

  const handleCancelConfirm = () => {
    setShowConfirmModal(false);
    if (firstFieldRef.current) firstFieldRef.current.focus();
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setShowConfirmModal(false);

    const payload = {
      ...formData,
      invest_amount: Number(formData.invest_amount) || 0,
      employeeName: currentUser || "Admin",
      createdAt: new Date().toISOString(),
    };

    try {
      await firebaseDB.child("Investments").push(payload);
      setShowThankModal(true);
      setFormData(emptyFormData);
      setErrors({});
    } catch (err) {
      console.error("Failed saving investment:", err);
      alert("Failed to save. See console for details.");
    }
  };

  const handleCloseThank = () => setShowThankModal(false);

  if (!show) return null;

  return (
    <>
      <div className="wb-backdrop" onClick={onClose}>
        <div
          className="wb-card investmetForm"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          <div className="wb-header">
            <div>
              <div className="wb-title">{title}</div>
            </div>
            <button className="wb-close-btn" onClick={onClose}>✕</button>
          </div>

          <div className="wb-body ">
            <form id="investForm" onSubmit={handleSubmit} noValidate>
              <div className="row g-3">
                {/* All your existing fields (unchanged) */}
                {/* Investor */}
                <div className="col-md-6">
                  <label className="form-label">
                    <strong>Investor *</strong>
                  </label>
                  <select
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

                {/* Date */}
                <div className="col-md-6">
                  <label className="form-label"><strong>Date *</strong></label>
                  <input
                    type="date"
                    name="invest_date"
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
                  <label className="form-label"><strong>Amount *</strong></label>
                  <input
                    type="tel"
                    name="invest_amount"
                    className={`form-control ${errors.invest_amount ? "is-invalid" : ""}`}
                    value={formData.invest_amount}
                    onChange={handleChange}
                    onBlur={handleBlur}
                  />
                  {errors.invest_amount && <div className="invalid-feedback">{errors.invest_amount}</div>}
                </div>

                {/* To */}
                <div className="col-md-6">
                  <label className="form-label"><strong>To *</strong></label>
                  <select
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

                {/* Reference */}
                <div className="col-md-6">
                  <label className="form-label"><strong>Reference</strong></label>
                  <input
                    type="text"
                    name="invest_reference"
                    className="form-control"
                    value={formData.invest_reference}
                    onChange={handleChange}
                  />
                </div>

                {/* Purpose */}
                <div className="col-md-6">
                  <label className="form-label"><strong>Purpose</strong></label>
                  <input
                    type="text"
                    name="invest_purpose"
                    className="form-control"
                    value={formData.invest_purpose}
                    onChange={handleChange}
                  />
                </div>

                {/* Comments */}
                <div className="col-12">
                  <label className="form-label"><strong>Comments</strong></label>
                  <textarea
                    name="invest_comments"
                    rows="4"
                    className="form-control"
                    value={formData.invest_comments}
                    onChange={handleChange}
                  />
                </div>

                <div className="col-12 d-flex justify-content-end gap-2">
                  <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Submit</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>

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

      {showThankModal && <ThankyouModal cancleFun={handleCloseThank} />}
    </>
  );
}
