import React, { useState, useEffect } from "react";

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
                const today = new Date();
                const selected = new Date(value);
                if (!value || selected < today.setHours(0, 0, 0, 0)) {
                    error = "Reminder date must be today or later.";
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

    const handleSubmit = (e) => {
        e.preventDefault();
        let newErrors = {};
        Object.keys(formData).forEach((field) => {
            const error = validateField(field, formData[field]);
            if (error) newErrors[field] = error;
        });

        setErrors(newErrors);

        if (Object.keys(newErrors).length === 0) {
            alert("Form submitted successfully!");
            console.log(formData);
        }
    };

    return (
        <div className="container mt-4">
            <div className="form-card shadow">
                <div className="form-card-header mb-4">
                    <h3 className="mb-3 text-center">Enquiry Form</h3>
                </div>
                <div className="form-card-body">
                    <form onSubmit={handleSubmit}>
                        <div className="">
                            <div className="row">
                                {/* Date */}
                                <div className="col-md-6 mb-3">
                                    <label className="form-label">
                                        Date <span className="star">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        name="date"
                                        className="form-control"
                                        value={formData.date}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                    />
                                    {errors.date && <small className="text-danger">{errors.date}</small>}
                                </div>

                                {/* Name */}
                                <div className="col-md-6 mb-3">
                                    <label className="form-label">
                                        Name <span className="star">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="name"
                                        className="form-control"
                                        value={formData.name}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                    />
                                    {errors.name && <small className="text-danger">{errors.name}</small>}
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
                                        className="form-control"
                                        value={formData.mobile}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        maxLength="10"
                                    />
                                    {errors.mobile && <small className="text-danger">{errors.mobile}</small>}
                                </div>

                                {/* Gender */}
                                <div className="col-md-6 mb-3">
                                    <label className="form-label">
                                        Gender <span className="star">*</span>
                                    </label>
                                    <select
                                        name="gender"
                                        className="form-select"
                                        value={formData.gender}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                    >
                                        <option value="">Select Gender</option>
                                        <option>Male</option>
                                        <option>Female</option>
                                        <option>Other</option>
                                    </select>
                                    {errors.gender && <small className="text-danger">{errors.gender}</small>}
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
                                        type="tell"
                                        name="amount"
                                        className="form-control"
                                        value={formData.amount}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        maxLength={5}
                                    />
                                    {errors.amount && <small className="text-danger">{errors.amount}</small>}
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
                                        className="form-select"
                                        value={formData.through}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                    >
                                        <option value="">Select</option>
                                        <option>Poster</option>
                                        <option>Reference</option>
                                        <option>Hospital-Agent</option>
                                        <option>Medical Cover</option>
                                        <option>JustDial</option>
                                        <option>Facebook</option>
                                        <option>Instagram</option>
                                        <option>LinkedIn</option>
                                        <option>YouTube</option>
                                        <option>Website</option>
                                        <option>Google</option>
                                    </select>
                                    {errors.through && <small className="text-danger">{errors.through}</small>}
                                </div>

                                {/* Status */}
                                <div className="col-md-6 mb-3">
                                    <label className="form-label">
                                        Status <span className="star">*</span>
                                    </label>
                                    <select
                                        name="status"
                                        className="form-select"
                                        value={formData.status}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                    >
                                        <option value="">Select</option>
                                        <option>Enquiry</option>
                                        <option>Pending</option>
                                        <option>On Boarding</option>
                                        <option>No Response</option>
                                    </select>
                                    {errors.status && <small className="text-danger">{errors.status}</small>}
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
                                        className={`form-select communication-${formData.communication.toLowerCase().replace(" ", "-")}`}
                                        value={formData.communication}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                    >
                                        <option value="">Select</option>
                                        <option>Very Good</option>
                                        <option>Good</option>
                                        <option>Average</option>
                                        <option>Below Average</option>
                                        <option>Bad</option>
                                        <option>Very Bad</option>
                                    </select>
                                    {errors.communication && <small className="text-danger">{errors.communication}</small>}
                                </div>

                                {/* Reminder Date */}
                                <div className="col-md-6 mb-3">
                                    <label className="form-label">
                                        Reminder Date <span className="star">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        name="reminderDate"
                                        className="form-control"
                                        value={formData.reminderDate}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                    />
                                    {errors.reminderDate && (
                                        <small className="text-danger">{errors.reminderDate}</small>
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
                                    ></textarea>
                                </div>
                            </div>
                            <div className="card-footer d-flex justify-content-end w-100">
                                <button type="submit" className="btn btn-primary">
                                    Submit Enquiry
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default EnquiryForm;
