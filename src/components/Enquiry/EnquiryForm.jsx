import React, { useState, useEffect } from "react";
import { firebaseDB } from "../../firebase";

const EnquiryForm =  ({ show, onClose, title = "Enquiry Form" }) => {
    const [formData, setFormData] = useState({
    date: "",
    name: "",
    mobile: "",
    gender: "",
    service: "",
    amount: "",
    through: "",
    status: "",
    communication: "",
    reminderDate: "",
    comments: "",
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedData, setSubmittedData] = useState({ name: "", mobile: "" });
  const [showThankYou, setShowThankYou] = useState(false);

  // Set default date to today whenever the modal opens
  useEffect(() => {
    if (show) {
      const today = new Date();
      const formatted = today.toISOString().split("T")[0];
      setFormData((prev) => ({ ...prev, date: formatted }));
      setErrors({});
      setShowThankYou(false);
    }
  }, [show]);

  // Helpers for date comparisons as YYYY-MM-DD
  const toYMD = (d) => {
    if (typeof d === "string") return d;
    return new Date(d).toISOString().split("T")[0];
  };

  // Validation
  const validateField = (name, value) => {
    let error = "";

    switch (name) {
      case "date": {
        const today = new Date();
        const minDate = new Date();
        minDate.setDate(today.getDate() - 10);

        const selected = new Date(value);
        const todayYMD = new Date(toYMD(today));
        const minYMD = new Date(toYMD(minDate));

        if (selected < minYMD || selected > todayYMD) {
          error = "Date must be within the past 10 days up to today.";
        }
        break;
      }
      case "name":
        if (!value.trim()) error = "Name is required.";
        break;
      case "mobile":
        if (!/^\d{10}$/.test(value)) error = "Mobile number must be 10 digits.";
        break;
      case "gender":
        if (!value) error = "Gender is required.";
        break;
      case "amount":
        if (!/^\d{1,5}$/.test(String(value))) error = "Enter valid amount (max 5 digits).";
        break;
      case "through":
        if (!value) error = "Please select an option.";
        break;
      case "status":
        if (!value) error = "Please select a status.";
        break;
      case "communication":
        if (!value) error = "Please select communication level.";
        break;
      case "reminderDate": {
        // Optional: only validate if provided; must be today or later
        if (value) {
          const todayYMD = toYMD(new Date());
          if (value < todayYMD) {
            error = "Reminder date must be today or later.";
          }
        }
        break;
      }
      default:
        break;
    }
    return error;
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    const error = validateField(name, value);
    setErrors((prev) => ({ ...prev, [name]: error }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    // hard limit mobile length
    if (name === "mobile" && value.length > 10) return;
    // hard limit amount length
    if (name === "amount" && String(value).length > 5) return;

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Validate required fields (skip optional: service, comments, reminderDate)
    const fieldsToCheck = Object.keys(formData).filter(
      (f) => !["service", "comments", "reminderDate"].includes(f)
    );

    const newErrors = {};
    fieldsToCheck.forEach((f) => {
      const err = validateField(f, formData[f]);
      if (err) newErrors[f] = err;
    });

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      try {
        // Save to Firebase under JenCeo-DataBase/EnquiryData
        const ref = firebaseDB.child("EnquiryData").push();
        await ref.set({
          ...formData,
          timestamp: new Date().toISOString(),
          id: ref.key, // store key for later use in lists/modals
        });

        setSubmittedData({ name: formData.name, mobile: formData.mobile });
        setShowThankYou(true);

        // Reset form (keep today's date)
        const today = new Date().toISOString().split("T")[0];
        setFormData({
          date: today,
          name: "",
          mobile: "",
          gender: "",
          service: "",
          amount: "",
          through: "",
          status: "",
          communication: "",
          reminderDate: "",
          comments: "",
        });

        setErrors({});
      } catch (err) {
        console.error("Error adding document:", err);
        alert("There was an error submitting the form. Please try again.");
      }
    } else {
      // focus first error
      const first = Object.keys(newErrors)[0];
      const el = document.querySelector(`#enq-${first}`);
      if (el) el.focus();
    }

    setIsSubmitting(false);
  };

  // Hide modal (parent controls visibility, but we also want to reset local UI)
  const handleClose = () => {
    setShowThankYou(false);
    onClose && onClose();
  };

  if (!show) return null;

  return (
    <div
      className="modal fade show d-block"
      tabIndex="-1"
      style={{ background: "rgba(0,0,0,0.5)" }}
      aria-modal="true"
      role="dialog"
    >
      <div className="modal-dialog modal-xl modal-dialog-centered client-form">
        <div className="modal-content" style={{ borderRadius: 12 }}>
          <div className="modal-header text-white" style={{ borderTopLeftRadius: 12, borderTopRightRadius: 12 }}>
            <h5 className="modal-title">{title}</h5>
            <button type="button" className="btn-close btn-close-white" onClick={handleClose} />
          </div>

          {/* Body: either form or thank-you panel */}
          {!showThankYou ? (
            <div className="modal-body">
              <form onSubmit={handleSubmit}>
                <div className="row">
                  {/* Date */}
                  <div className="col-md-6 mb-3">
                    <label className="form-label">
                      Date <span className="text-danger">*</span>
                    </label>
                    <input
                      id="enq-date"
                      type="date"
                      name="date"
                      className={`form-control ${errors.date ? "is-invalid" : ""}`}
                      value={formData.date}
                      onChange={handleChange}
                      onBlur={handleBlur}
                    />
                    {errors.date && <div className="invalid-feedback">{errors.date}</div>}
                  </div>

                  {/* Name */}
                  <div className="col-md-6 mb-3">
                    <label className="form-label">
                      Name <span className="text-danger">*</span>
                    </label>
                    <input
                      id="enq-name"
                      type="text"
                      name="name"
                      className={`form-control ${errors.name ? "is-invalid" : ""}`}
                      value={formData.name}
                      onChange={handleChange}
                      onBlur={handleBlur}
                    />
                    {errors.name && <div className="invalid-feedback">{errors.name}</div>}
                  </div>
                </div>

                <div className="row">
                  {/* Mobile */}
                  <div className="col-md-6 mb-3">
                    <label className="form-label">
                      Mobile No <span className="text-danger">*</span>
                    </label>
                    <input
                      id="enq-mobile"
                      type="text"
                      name="mobile"
                      className={`form-control ${errors.mobile ? "is-invalid" : ""}`}
                      value={formData.mobile}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      maxLength={10}
                      inputMode="numeric"
                    />
                    {errors.mobile && <div className="invalid-feedback">{errors.mobile}</div>}
                  </div>

                  {/* Gender */}
                  <div className="col-md-6 mb-3">
                    <label className="form-label">
                      Gender <span className="text-danger">*</span>
                    </label>
                    <select
                      id="enq-gender"
                      name="gender"
                      className={`form-select ${errors.gender ? "is-invalid" : ""}`}
                      value={formData.gender}
                      onChange={handleChange}
                      onBlur={handleBlur}
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                    {errors.gender && <div className="invalid-feedback">{errors.gender}</div>}
                  </div>
                </div>

                <div className="row">
                  {/* Service */}
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Type of Service</label>
                    <input
                      id="enq-service"
                      type="text"
                      name="service"
                      className="form-control"
                      value={formData.service}
                      onChange={handleChange}
                    />
                  </div>

                  {/* Amount */}
                  <div className="col-md-6 mb-3">
                    <label className="form-label">
                      Amount <span className="text-danger">*</span>
                    </label>
                    <input
                      id="enq-amount"
                      type="number"
                      name="amount"
                      className={`form-control ${errors.amount ? "is-invalid" : ""}`}
                      value={formData.amount}
                      onChange={handleChange}
                      onBlur={handleBlur}
                    />
                    {errors.amount && <div className="invalid-feedback">{errors.amount}</div>}
                  </div>
                </div>

                <div className="row">
                  {/* Through */}
                  <div className="col-md-6 mb-3">
                    <label className="form-label">
                      Through <span className="text-danger">*</span>
                    </label>
                    <select
                      id="enq-through"
                      name="through"
                      className={`form-select ${errors.through ? "is-invalid" : ""}`}
                      value={formData.through}
                      onChange={handleChange}
                      onBlur={handleBlur}
                    >
                      <option value="">Select</option>
                      <option value="Poster">Poster</option>
                      <option value="Reference">Reference</option>
                      <option value="Hospital-Agent">Hospital-Agent</option>
                      <option value="Medical Cover">Medical Cover</option>
                      <option value="JustDial">JustDial</option>
                      <option value="Facebook">Facebook</option>
                      <option value="Instagram">Instagram</option>
                      <option value="LinkedIn">LinkedIn</option>
                      <option value="YouTube">YouTube</option>
                      <option value="Website">Website</option>
                      <option value="Google">Google</option>
                    </select>
                    {errors.through && <div className="invalid-feedback">{errors.through}</div>}
                  </div>

                  {/* Status */}
                  <div className="col-md-6 mb-3">
                    <label className="form-label">
                      Status <span className="text-danger">*</span>
                    </label>
                    <select
                      id="enq-status"
                      name="status"
                      className={`form-select ${errors.status ? "is-invalid" : ""}`}
                      value={formData.status}
                      onChange={handleChange}
                      onBlur={handleBlur}
                    >
                      <option value="">Select</option>
                      <option value="Enquiry">Enquiry</option>
                      <option value="Pending">Pending</option>
                      <option value="On Boarding">On Boarding</option>
                      <option value="No Response">No Response</option>
                    </select>
                    {errors.status && <div className="invalid-feedback">{errors.status}</div>}
                  </div>
                </div>

                <div className="row">
                  {/* Communication */}
                  <div className="col-md-6 mb-3">
                    <label className="form-label">
                      Communication <span className="text-danger">*</span>
                    </label>
                    <select
                      id="enq-communication"
                      name="communication"
                      className={`form-select ${errors.communication ? "is-invalid" : ""} ${
                        formData.communication
                          ? "communication-" + formData.communication.toLowerCase().replace(/\s+/g, "-")
                          : ""
                      }`}
                      value={formData.communication}
                      onChange={handleChange}
                      onBlur={handleBlur}
                    >
                      <option value="">Select</option>
                      <option value="Very Good">Very Good</option>
                      <option value="Good">Good</option>
                      <option value="Average">Average</option>
                      <option value="Below Average">Below Average</option>
                      <option value="Bad">Bad</option>
                      <option value="Very Bad">Very Bad</option>
                    </select>
                    {errors.communication && (
                      <div className="invalid-feedback">{errors.communication}</div>
                    )}
                  </div>

                  {/* Reminder Date (optional, today or later) */}
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Reminder Date</label>
                    <input
                      id="enq-reminderDate"
                      type="date"
                      name="reminderDate"
                      className={`form-control ${errors.reminderDate ? "is-invalid" : ""}`}
                      value={formData.reminderDate}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      min={toYMD(new Date())}
                    />
                    {errors.reminderDate && (
                      <div className="invalid-feedback">{errors.reminderDate}</div>
                    )}
                  </div>
                </div>

                {/* Comments */}
                <div className="row">
                  <div className="col-md-12 mb-3">
                    <label className="form-label">Comments</label>
                    <textarea
                      id="enq-comments"
                      name="comments"
                      className="form-control"
                      value={formData.comments}
                      onChange={handleChange}
                      rows="3"
                    />
                  </div>
                </div>

                <div className="d-flex justify-content-end gap-2">
                  <button type="button" className="btn btn-outline-secondary" onClick={handleClose}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                        Submitting...
                      </>
                    ) : (
                      "Submit Enquiry"
                    )}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            // Thank You panel (inside same modal)
            <div className="modal-body text-center py-4">
              <div className="mb-3">
                <i className="fas fa-check-circle text-success" style={{ fontSize: "3rem" }}></i>
              </div>
              <h4 className="text-success mb-3">Enquiry Submitted Successfully!</h4>
              <p className="mb-1">
                Enquiry for <strong className="text-primary">{submittedData.name}</strong>
              </p>
              <p>
                Mobile No: <strong className="text-primary">{submittedData.mobile}</strong>
              </p>
              <p className="text-muted">Your enquiry has been saved and will be processed shortly.</p>

              <div className="d-flex justify-content-center gap-2 mt-3">
                <button
                  className="btn btn-success px-4"
                  onClick={() => {
                    setShowThankYou(false);
                    handleClose();
                  }}
                >
                  Got it!
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EnquiryForm;