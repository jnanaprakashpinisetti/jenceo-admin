// src/components/workerCalles/Step11SalaryProfile.jsx
import React from "react";

const DEFAULT_PHOTO_URL =
    "https://firebasestorage.googleapis.com/v0/b/jenceo-admin.firebasestorage.app/o/OfficeFiles%2FSample-Photo.jpg?alt=media&token=01855b47-c9c2-490e-b400-05851192dde7";

const StarRating = ({ value = 0, onChange, readOnly = false, size = "1.2rem" }) => {
    const v = Number(value || 0);
    return (
        <div className="d-inline-flex align-items-center">
            {[1, 2, 3, 4, 5].map((n) => {
                const filled = n <= v;
                let color = "text-secondary";
                if (filled) {
                    if (v >= 4) color = "text-success";
                    else if (v === 3) color = "text-warning";
                    else color = "text-danger";
                }
                return (
                    <i
                        key={n}
                        role={readOnly ? "img" : "button"}
                        aria-label={readOnly ? `${v}/5` : `Set ${n} star${n > 1 ? "s" : ""}`}
                        className={`bi ${filled ? "bi-star-fill" : "bi-star"} ${color}`}
                        style={{
                            fontSize: size,
                            cursor: readOnly ? "default" : "pointer",
                            marginRight: 4,
                            transition: "all 0.2s ease",
                        }}
                        onClick={readOnly ? undefined : () => onChange?.(n)}
                        onMouseEnter={(e) => {
                            if (!readOnly) {
                                e.target.style.transform = "scale(1.2)";
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (!readOnly) {
                                e.target.style.transform = "scale(1)";
                            }
                        }}
                        title={readOnly ? `${v || 0}/5` : `Rate ${n} star${n > 1 ? "s" : ""}`}
                    />
                );
            })}

        </div>
    );
};

export default function SalaryProfile({
    formData,
    handleChange,
    handleBlur,
    errors = {},
}) {
    // pick the freshest image first
    const basePhoto =
        formData?.employeePhotoPreview ||     // live preview while editing
        formData?.employeePhotoUrl ||         // saved storage URL
        formData?.photoDataUrl ||             // legacy inline
        formData?.employeePhoto ||            // saved by submit
        formData?.photoUrl ||
        DEFAULT_PHOTO_URL;

    // force a refresh for remote URLs when steps change
    const cacheKey = Number(formData?._photoCacheBust || 0);

    const photoSrc =
        typeof basePhoto === "string" && basePhoto.startsWith("data:")
            ? basePhoto
            : `${basePhoto}${basePhoto?.includes("?") ? "&" : "?"}v=${cacheKey}`;


    // FIX: This function was missing - this is why rating wasn't clickable
    const setRating = (n) => {
        handleChange?.({ target: { name: "rating", value: String(n) } });
    };

    const pill = (label, type = "secondary") => (
        <span className={`badge rounded-pill bg-${type} me-2 mb-2`}>{label}</span>
    );

    const listOrDash = (arr) =>
        Array.isArray(arr) && arr.length > 0 ? arr.join(", ") : "—";

    const getRatingLabel = (rating) => {
        const r = Number(rating || 0);
        if (r >= 4.5) return "Excellent";
        if (r >= 4) return "Very Good";
        if (r >= 3) return "Good";
        if (r >= 2) return "Fair";
        if (r >= 1) return "Poor";
        return "Not Rated";
    };

    const getRatingColor = (rating) => {
        const r = Number(rating || 0);
        if (r >= 4) return "success";
        if (r >= 3) return "warning";
        if (r >= 1) return "danger";
        return "secondary";
    };


    return (
        <>
            {/* === Salary & Profile Section === */}
            <div className="bg-dark text-light p-3 rounded-3 mb-4">
                <div className="form-card-header mb-4">
                    <h3 className="text-center text-warning mb-3">
                        <i className="bi bi-currency-dollar me-2"></i>
                        Salary & Profile
                    </h3>
                </div>
                <hr></hr>

                <div className="row g-4">
                    {/* Left Column - Salary Details */}
                    <div className="col-lg-6">
                        <div className="bg-dark bg-opacity-50 rounded-3 h-100">

                            <div className="mb-3">
                                <label htmlFor="basicSalary" className="form-label">
                                    Basic Salary <span className="text-danger">*</span>
                                    <small className="text-muted ms-2">(Monthly)</small>
                                </label>
                                <div className="input-group">
                                    <span className="input-group-text bg-secondary text-light">₹</span>
                                    <input
                                        type="tel"
                                        className={`form-control ${errors.basicSalary ? "is-invalid" : ""}`}
                                        id="basicSalary"
                                        name="basicSalary"
                                        value={formData.basicSalary}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        placeholder="Enter basic salary"
                                        maxLength={6}
                                    />
                                </div>
                                {errors.basicSalary && <div className="invalid-feedback d-block">{errors.basicSalary}</div>}
                            </div>
                        </div>
                    </div>

                    <div className="col-md-6">
                        <div className="mb-3">
                            <label htmlFor="pageNo" className="form-label">
                                Page No <span className="text-danger">*</span>
                                <small className="text-muted ms-2">(Record book)</small>
                            </label>
                            <input
                                type="tel"
                                className={`form-control ${errors.pageNo ? "is-invalid" : ""}`}
                                id="pageNo"
                                name="pageNo"
                                value={formData.pageNo}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                placeholder="Enter page number"
                                maxLength={3}
                            />
                            {errors.pageNo && <div className="invalid-feedback d-block">{errors.pageNo}</div>}
                        </div>
                    </div>
                </div>

                <div className="row">
                    {/* Right Column - Profile Details */}
                    <div className="col-lg-12">
                        <div className="bg-dark bg-opacity-50 rounded-3 h-100">

                            <div className="mb-3">
                                <label htmlFor="aboutEmployee" className="form-label">
                                    About Employee
                                    <small className="text-muted ms-2">(Brief description)</small>
                                </label>
                                <textarea
                                    className="form-control"
                                    id="aboutEmployee"
                                    name="aboutEmployee"
                                    value={formData.aboutEmployee}
                                    onChange={handleChange}
                                    rows={4}
                                    placeholder="Describe the employee's strengths, experience, and special qualities..."
                                    style={{ resize: "vertical" }}
                                />
                                <small className="text-muted">
                                    {formData.aboutEmployee ? formData.aboutEmployee.length : 0}/500 characters
                                </small>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="row">

                    <div className="bg-secondary bg-opacity-25 p-3 rounded-3 text-center">

                        <label className="form-label">
                            Employee Rating
                            <small className="text-muted d-block">(Click stars to rate)</small>
                        </label>

                        <div className="position-relative mb-2 ">
                            <img
                                src={photoSrc}
                                alt="Employee"
                                onError={(e) => (e.currentTarget.src = DEFAULT_PHOTO_URL)}
                                className="img-fluid rounded-3 border border-secondary"
                                style={{ width: 140, height: 140, objectFit: "cover" }}
                            />

                        </div>
                        <StarRating
                            value={formData.rating || 0}
                            onChange={setRating}
                            size="1.5rem"
                        />
                        {formData.rating && (
                            <div className="mt-2">
                                <span className={`badge bg-${getRatingColor(formData.rating)}`}>
                                    {getRatingLabel(formData.rating)} ({formData.rating}/5)
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>


        </>
    );
}