// EnquiryForm.jsx
import React, { useState, useEffect, useMemo } from "react";
import { firebaseDB } from "../../firebase";

/* ----------------------------- Confirmation Modal ----------------------------- */
const ConfirmCloseModal = ({ open, onConfirm, onCancel }) => {
    if (!open) return null;
    return (
        <div
            className="modal fade show d-block"
            tabIndex="-1"
            aria-modal="true"
            role="dialog"
            style={{ background: "rgba(0,0,0,0.55)", zIndex: 1110 }}
        >
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content" style={{ borderRadius: 12 }}>
                    <div className="modal-header">
                        <h5 className="modal-title">Discard changes?</h5>
                        <button type="button" className="btn-close" onClick={onCancel} />
                    </div>
                    <div className="modal-body">
                        <p className="mb-0">
                            You have unsaved changes. If you close now, your changes will be lost.
                            Do you still want to close?
                        </p>
                    </div>
                    <div className="modal-footer">
                        <button className="btn btn-secondary" onClick={onCancel}>No, stay</button>
                        <button className="btn btn-danger" onClick={onConfirm}>Yes, close</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

/* ----------------------------- Thank You Modal ----------------------------- */
const ThankYouModal = ({ open, onClose, name, mobile }) => {
    if (!open) return null;

    return (
        <div
            className="modal fade show d-block thankyou-modal"
            tabIndex="-1"
            aria-modal="true"
            role="dialog"
            style={{ background: "rgba(0,0,0,0.5)", zIndex: 1080 }} // above typical bootstrap modal (1050)
        >
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content thankyou-card" style={{ borderRadius: 14 }}>
                    <div
                        className="modal-header thankyou-header"
                        style={{ borderTopLeftRadius: 14, borderTopRightRadius: 14 }}
                    >
                        <h5 className="modal-title">Success</h5>
                        <button type="button" className="btn-close" onClick={onClose} />
                    </div>

                    <div className="modal-body text-center py-4">
                        <div className="mb-3">
                            <i className="fas fa-check-circle" style={{ fontSize: "3rem" }} />
                        </div>
                        <h5 className="mb-2">Enquiry Saved</h5>
                        {name ? (
                            <>
                                <p className="mb-1">
                                    Enquiry for <strong>{name}</strong>
                                </p>
                                <p className="mb-0">
                                    Mobile: <strong>{mobile}</strong>
                                </p>
                            </>
                        ) : null}
                        <p className="text-muted mt-3 mb-0">We'll process it shortly.</p>
                    </div>

                    <div className="modal-footer justify-content-center">
                        <button className="btn btn-success px-4" onClick={onClose}>
                            Got it
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

/* --------------------------------- Form ---------------------------------- */
const EnquiryForm = ({ show, onClose, title = "Enquiry Form" }) => {
    const emptyForm = useMemo(() => ({
        idNo: "",
        date: "",
        name: "",
        mobile: "",
        gender: "",
        service: "",
        amount: "",
        careRecipientName: "",
        age: "",
        weight: "",
        location: "",
        serviceRequiredPeriod: "",
        through: "",
        status: "",
        communication: "",
        reminderDate: "",
        comments: "",
    }), []);

    const [formData, setFormData] = useState(emptyForm);
    const [initialData, setInitialData] = useState(emptyForm); // used for pristine check
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isGeneratingId, setIsGeneratingId] = useState(false);

    // Data to show in thank-you modal
    const [submittedData, setSubmittedData] = useState({ name: "", mobile: "" });
    const [showThankYou, setShowThankYou] = useState(false);

    // Confirm close state
    const [showConfirmClose, setShowConfirmClose] = useState(false);

    // Generate ID number from database: find max existing E-xx and +1
    const generateIdNo = async () => {
        setIsGeneratingId(true);
        try {
            const snap = await firebaseDB.child("EnquiryData").once("value");
            let maxNum = 0;

            if (snap.exists()) {
                snap.forEach((child) => {
                    const v = child.val();
                    const m = String(v?.idNo || "").match(/(\d+)$/); // grab trailing digits from E-01 / E-160 etc.
                    if (m) {
                        const n = parseInt(m[1], 10);
                        if (!Number.isNaN(n) && n > maxNum) maxNum = n;
                    }
                });
            }

            const next = maxNum + 1;
            // keep your current 2-digit style (E-01). If you prefer 3 digits, use padStart(3, "0").
            return `E-${String(next).padStart(2, "0")}`;
        } catch (err) {
            console.error("Error generating ID:", err);
            // fallback so form still works
            return `E-${String(new Date().getSeconds()).padStart(2, "0")}`;
        } finally {
            setIsGeneratingId(false);
        }
    };

    // Set default date to today and generate ID whenever the modal opens; also reset pristine baseline
    useEffect(() => {
        const initializeForm = async () => {
            if (show) {
                setIsGeneratingId(true);
                try {
                    const today = new Date();
                    const formatted = today.toISOString().split("T")[0];
                    const generatedId = await generateIdNo();

                    const initializedForm = {
                        ...emptyForm,
                        date: formatted,
                        idNo: generatedId
                    };

                    setFormData(initializedForm);
                    setInitialData(initializedForm);
                    setErrors({});
                    setShowThankYou(false);
                    setShowConfirmClose(false);
                } catch (error) {
                    console.error("Error initializing form:", error);
                } finally {
                    setIsGeneratingId(false);
                }
            }
        };

        initializeForm();
    }, [show, emptyForm]);

    // Helpers for date comparisons as YYYY-MM-DD
    const toYMD = (d) => {
        if (typeof d === "string") return d;
        return new Date(d).toISOString().split("T")[0];
    };

    // Validation
    const validateField = (name, value) => {
        let error = "";

        switch (name) {
            case "idNo":
                if (!value.trim()) error = "ID number is required.";
                break;
            case "date": {
                const today = new Date();
                const minDate = new Date();
                minDate.setDate(today.getDate() - 10);

                const selected = new Date(value);
                const todayYMD = new Date(toYMD(today));
                const minYMD = new Date(toYMD(minDate));

                // if (selected < minYMD || selected > todayYMD) {
                //     error = "Date must be within the past 10 days up to today.";
                // }
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
        if (name === "mobile" && value.length > 10) return;
        if (name === "amount" && String(value).length > 5) return;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const isPristine = useMemo(() => {
        // shallow compare since structure is flat
        const keys = Object.keys(initialData);
        for (const k of keys) {
            if ((formData[k] ?? "") !== (initialData[k] ?? "")) return false;
        }
        return true;
    }, [formData, initialData]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        // Validate required fields (skip optional: service, comments, reminderDate)
        const fieldsToCheck = Object.keys(formData).filter(
            (f) => !["service", "comments", "reminderDate", "careRecipientName", "age", "weight", "location", "serviceRequiredPeriod"].includes(f)
        );

        const newErrors = {};
        fieldsToCheck.forEach((f) => {
            const err = validateField(f, formData[f]);
            if (err) newErrors[f] = err;
        });

        setErrors(newErrors);

        if (Object.keys(newErrors).length === 0) {
            try {
                // Save to Firebase under EnquiryData
                const ref = firebaseDB.child("EnquiryData").push();
                await ref.set({
                    ...formData,
                    timestamp: new Date().toISOString(),
                    id: ref.key,
                });

                setSubmittedData({ name: formData.name, mobile: formData.mobile });
                setShowThankYou(true);

                // Reset form (keep today's date) and reset pristine baseline
                const today = new Date().toISOString().split("T")[0];
                const reset = {
                    idNo: "",
                    date: today,
                    name: "",
                    mobile: "",
                    gender: "",
                    service: "",
                    amount: "",
                    careRecipientName: "",
                    age: "",
                    weight: "",
                    location: "",
                    serviceRequiredPeriod: "",
                    through: "",
                    status: "",
                    communication: "",
                    reminderDate: "",
                    comments: "",
                };
                setFormData(reset);
                setInitialData(reset);

                setErrors({});
            } catch (err) {
                console.error("Error adding document:", err);
                alert("There was an error submitting the form. Please try again.");
            }
        } else {
            const first = Object.keys(newErrors)[0];
            const el = document.querySelector(`#enq-${first}`);
            if (el) el.focus();
        }

        setIsSubmitting(false);
    };

    // Close both form & thank-you modals
    const closeAll = () => {
        setShowThankYou(false);
        setShowConfirmClose(false);
        onClose && onClose();
    };

    // Handle clicking close/cancel: if pristine, close immediately; else ask to confirm
    const requestClose = () => {
        if (isPristine) {
            closeAll();
        } else {
            setShowConfirmClose(true);
        }
    };

    // If parent closed the form, don't show anything
    if (!show) return null;

    /* ---------------- Render either the form modal OR the thank-you modal ---------------- */
    return (
        <>
            {/* FORM MODAL (uses its own unique wrapper class "enquiry-modal") */}
            {!showThankYou && (
                <div
                    className="modal fade show d-block enquiry-modal"
                    tabIndex="-1"
                    aria-modal="true"
                    role="dialog"
                    style={{ background: "rgba(0,0,0,0.9)", zIndex: 1050 }}
                >
                    <div className="modal-dialog modal-xl modal-dialog-centered client-form">
                        <div className="modal-content" style={{ borderRadius: 12 }}>
                            <div
                                className="modal-header text-white"
                                style={{ borderTopLeftRadius: 12, borderTopRightRadius: 12 }}
                            >
                                <h5 className="modal-title">{title}</h5>
                                <button type="button" className="btn-close btn-close-white" onClick={requestClose} />
                            </div>

                            <div className="modal-body">
                                <form onSubmit={handleSubmit} className="enquiryForm">
                                    {/* ID No and Date */}
                                    <div className="row">
                                        <div className="col-md-6 mb-3">
                                            <label className="form-label">
                                                ID No <span className="text-danger">*</span>
                                            </label>
                                            <div className="input-group">
                                                <input
                                                    type="text"
                                                    name="idNo"
                                                    className={`form-control idNo ${errors.idNo ? "is-invalid" : ""}`}
                                                    value={formData.idNo}
                                                    onChange={handleChange}
                                                    onBlur={handleBlur}
                                                    disabled
                                                    placeholder={isGeneratingId ? "Generating ID..." : "Auto-generated ID"}
                                                />
                                                <div className="input-group-text">
                                                    {isGeneratingId ? (
                                                        <span className="spinner-border spinner-border-sm" />
                                                    ) : (
                                                        <i className="fas fa-check text-success" />
                                                    )}
                                                </div>
                                            </div>
                                            {errors.idNo && <div className="invalid-feedback">{errors.idNo}</div>}
                                        </div>

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
                                    </div>

                                    {/* Mobile and Name */}
                                    <div className="row">
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
                                                placeholder="Enter Name"
                                                autoFocus
                                            />
                                            {errors.name && <div className="invalid-feedback">{errors.name}</div>}
                                        </div>
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
                                                placeholder="Enter Mobile No"
                                            />
                                            {errors.mobile && <div className="invalid-feedback">{errors.mobile}</div>}
                                        </div>


                                    </div>

                                    {/* Gender and Service */}
                                    <div className="row">
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
                                        <div className="col-md-6 mb-3">
                                            <label className="form-label">Location</label>
                                            <input
                                                type="text"
                                                name="location"
                                                className="form-control"
                                                value={formData.location}
                                                onChange={handleChange}
                                                placeholder="Enter location"
                                            />
                                        </div>

                                    </div>

                                    {/* Amount and Care Recipient Name */}
                                    <div className="row">

                                        <div className="col-md-6 mb-3">
                                            <label className="form-label">Type of Service</label>
                                            <input
                                                id="enq-service"
                                                type="text"
                                                name="service"
                                                className="form-control"
                                                value={formData.service}
                                                onChange={handleChange}
                                                placeholder="Enter Type of Service"
                                            />
                                        </div>
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
                                                placeholder="Enter Amount"
                                            />
                                            {errors.amount && <div className="invalid-feedback">{errors.amount}</div>}
                                        </div>

                                        <div className="col-md-6 mb-3">
                                            <label className="form-label">Care Recipient Name</label>
                                            <input
                                                type="text"
                                                name="careRecipientName"
                                                className="form-control"
                                                value={formData.careRecipientName}
                                                onChange={handleChange}
                                                placeholder="Enter care recipient name"
                                            />
                                        </div>

                                        <div className="col-md-6 mb-3">
                                            <label className="form-label">Age</label>
                                            <input
                                                type="number"
                                                name="age"
                                                className="form-control"
                                                value={formData.age}
                                                onChange={handleChange}
                                                placeholder="Age"
                                                min="0"
                                                max="120"
                                            />
                                        </div>
                                    </div>

                                    {/* Age and Weight */}
                                    <div className="row">


                                        <div className="col-md-6 mb-3">
                                            <label className="form-label">Weight (kg)</label>
                                            <input
                                                type="number"
                                                name="weight"
                                                className="form-control"
                                                value={formData.weight}
                                                onChange={handleChange}
                                                placeholder="Weight"
                                                min="0"
                                                step="0.1"
                                            />
                                        </div>

                                        <div className="col-md-6 mb-3">
                                            <label className="form-label">Service Required Period</label>
                                            <input
                                                type="text"
                                                name="serviceRequiredPeriod"
                                                className="form-control"
                                                value={formData.serviceRequiredPeriod}
                                                onChange={handleChange}
                                                placeholder="e.g., 1 month, 15 days, etc."
                                            />
                                        </div>
                                    </div>

                                    {/* Through and Status */}
                                    <div className="row">
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

                                    {/* Communication and Reminder Date */}
                                    <div className="row">
                                        <div className="col-md-6 mb-3">
                                            <label className="form-label">
                                                Communication <span className="text-danger">*</span>
                                            </label>
                                            <select
                                                id="enq-communication"
                                                name="communication"
                                                className={`form-select ${errors.communication ? "is-invalid" : ""} ${formData.communication
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
                                            {errors.communication && <div className="invalid-feedback">{errors.communication}</div>}
                                        </div>

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
                                            {errors.reminderDate && <div className="invalid-feedback">{errors.reminderDate}</div>}
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
                                                placeholder="Enter Comments"
                                            />
                                        </div>
                                    </div>

                                    <div className="d-flex justify-content-end gap-2">
                                        <button type="button" className="btn btn-outline-secondary" onClick={requestClose}>
                                            Cancel
                                        </button>
                                        <button type="submit" className="btn btn-primary" disabled={isSubmitting || !formData.idNo || isGeneratingId}>
                                            {isSubmitting ? (
                                                <>
                                                    <span
                                                        className="spinner-border spinner-border-sm me-2"
                                                        role="status"
                                                        aria-hidden="true"
                                                    />
                                                    Submitting...
                                                </>
                                            ) : (
                                                "Submit Enquiry"
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* CONFIRMATION MODAL (only shows when closing with unsaved changes) */}
            <ConfirmCloseModal
                open={showConfirmClose}
                onConfirm={closeAll}
                onCancel={() => setShowConfirmClose(false)}
            />

            {/* THANK-YOU MODAL (separate, unique classes; no shared .client-form styles) */}
            <ThankYouModal
                open={showThankYou}
                onClose={closeAll}
                name={submittedData.name}
                mobile={submittedData.mobile}
            />
        </>
    );
};

export default EnquiryForm;