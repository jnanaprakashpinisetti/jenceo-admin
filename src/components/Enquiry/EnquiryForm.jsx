import React, { useState, useEffect } from "react";
import { firebaseDB } from "../../firebase";

const EnquiryForm = () => {
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
    const [showModal, setShowModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submittedData, setSubmittedData] = useState({ name: "", mobile: "" });

    // Default date setup
    useEffect(() => {
        const today = new Date();
        const formatted = today.toISOString().split("T")[0];
        setFormData((prev) => ({ ...prev, date: formatted }));
    }, []);

    // Validation function
    const validateField = (name, value) => {
        let error = "";

        switch (name) {
            case "date": {
                const today = new Date();
                const minDate = new Date();
                minDate.setDate(today.getDate() - 10);
                const selected = new Date(value);
                if (selected < minDate || selected > today) {
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
                if (!/^\d{1,5}$/.test(value)) error = "Enter valid amount (max 5 digits).";
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
                // Reminder date is now optional, only validate if provided
                if (value) {
                    const today = new Date();
                    const selected = new Date(value);
                    if (selected < today.setHours(0, 0, 0, 0)) {
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
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        let newErrors = {};
        Object.keys(formData).forEach((field) => {
            // Skip validation for non-required fields if they're empty
            if (field === "service" || field === "comments" || field === "reminderDate") return;

            const error = validateField(field, formData[field]);
            if (error) newErrors[field] = error;
        });

        setErrors(newErrors);

        if (Object.keys(newErrors).length === 0) {
            try {
                // Save to Firebase Realtime Database under EnquiryData node
                const newEnquiryRef = firebaseDB.child("EnquiryData").push();

                await newEnquiryRef.set({
                    ...formData,
                    timestamp: new Date().toISOString(),
                });

                console.log("Document written with ID: ", newEnquiryRef.key);

                // Store submitted name and mobile for modal
                setSubmittedData({ name: formData.name, mobile: formData.mobile });

                // Show success modal
                setShowModal(true);

                // Reset form (but keep today's date)
                const today = new Date();
                const formatted = today.toISOString().split("T")[0];
                setFormData({
                    date: formatted,
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

                // Clear any previous errors
                setErrors({});
            } catch (error) {
                console.error("Error adding document: ", error);
                alert("There was an error submitting the form. Please try again.");
            }
        } else {
            // Scroll to the first error
            const firstErrorField = Object.keys(newErrors)[0];
            const element = document.querySelector(`[name="${firstErrorField}"]`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                element.focus();
            }
        }

        setIsSubmitting(false);
    };

    return (
        <div className="container mt-4">
            <div className="form-card shadow">
                <div className="form-card-header mb-4">
                    <h3 className="mb-3 text-center">Enquiry Form</h3>
                </div>
                <div className="form-card-body">
                    <form onSubmit={handleSubmit}>
                        <div className="row">
                            {/* Date */}
                            <div className="col-md-6 mb-3">
                                <label className="form-label">
                                    Date <span className="star">*</span>
                                </label>
                                <input
                                    type="date"
                                    name="date"
                                    className={`form-control ${errors.date ? 'is-invalid' : ''}`}
                                    value={formData.date}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                />
                                {errors.date && <div className="invalid-feedback">{errors.date}</div>}
                            </div>

                            {/* Name */}
                            <div className="col-md-6 mb-3">
                                <label className="form-label">
                                    Name <span className="star">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="name"
                                    className={`form-control ${errors.name ? 'is-invalid' : ''}`}
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
                                    Mobile No <span className="star">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="mobile"
                                    className={`form-control ${errors.mobile ? 'is-invalid' : ''}`}
                                    value={formData.mobile}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    maxLength="10"
                                />
                                {errors.mobile && <div className="invalid-feedback">{errors.mobile}</div>}
                            </div>

                            {/* Gender */}
                            <div className="col-md-6 mb-3">
                                <label className="form-label">
                                    Gender <span className="star">*</span>
                                </label>
                                <select
                                    name="gender"
                                    className={`form-select ${errors.gender ? 'is-invalid' : ''}`}
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
                            {/* Type of Service */}
                            <div className="col-md-6 mb-3">
                                <label className="form-label">Type of Service</label>
                                <input
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
                                    Amount <span className="star">*</span>
                                </label>
                                <input
                                    type="number"
                                    name="amount"
                                    className={`form-control ${errors.amount ? 'is-invalid' : ''}`}
                                    value={formData.amount}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    maxLength={5}
                                />
                                {errors.amount && <div className="invalid-feedback">{errors.amount}</div>}
                            </div>
                        </div>

                        <div className="row">
                            {/* Through */}
                            <div className="col-md-6 mb-3">
                                <label className="form-label">
                                    Through <span className="star">*</span>
                                </label>
                                <select
                                    name="through"
                                    className={`form-select ${errors.through ? 'is-invalid' : ''}`}
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
                                    Status <span className="star">*</span>
                                </label>
                                <select
                                    name="status"
                                    className={`form-select ${errors.status ? 'is-invalid' : ''}`}
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
                                    Communication <span className="star">*</span>
                                </label>
                                <select
                                    name="communication"
                                    className={`form-select ${errors.communication ? 'is-invalid' : ''} ${formData.communication
                                            ? "communication-" +
                                            formData.communication.toLowerCase().replace(/\s+/g, "-")
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

                            {/* Reminder Date - Now Optional */}
                            <div className="col-md-6 mb-3">
                                <label className="form-label">
                                    Reminder Date
                                </label>
                                <input
                                    type="date"
                                    name="reminderDate"
                                    className={`form-control ${errors.reminderDate ? 'is-invalid' : ''}`}
                                    value={formData.reminderDate}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
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
                                    name="comments"
                                    className="form-control"
                                    value={formData.comments}
                                    onChange={handleChange}
                                    rows="3"
                                ></textarea>
                            </div>
                        </div>
                        <div className="card-footer d-flex justify-content-end w-100">
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
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

            {/* Thank You Modal */}
            {showModal && (
                <div
                    className="modal-backdrop fade show"
                    style={{ backgroundColor: "rgba(0,0,0,0.5)", opacity: "1" }}
                >
                    <div className="modal d-block" tabIndex="-1">
                        <div className="modal-dialog modal-dialog-centered">
                            <div className="modal-content" style={{ borderRadius: "15px", border: "none" }}>
                                <div className="modal-header bg-success text-white" style={{ borderTopLeftRadius: "15px", borderTopRightRadius: "15px" }}>
                                    <h5 className="modal-title">
                                        <i className="fas fa-check-circle me-2"></i>
                                        Thank You!
                                    </h5>
                                    <button
                                        type="button"
                                        className="btn-close btn-close-white"
                                        onClick={() => setShowModal(false)}
                                    ></button>
                                </div>
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
                                    <p className="text-muted">
                                        Your enquiry has been saved and will be processed shortly.
                                    </p>
                                </div>
                                <div className="modal-footer justify-content-center border-0">
                                    <button
                                        type="button"
                                        className="btn btn-success px-4"
                                        onClick={() => setShowModal(false)}
                                    >
                                        <i className="fas fa-thumbs-up me-2"></i>
                                        Got It!
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EnquiryForm;