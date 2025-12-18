import React, { useState } from "react";

const BasicInfo = ({
    formData,
    setFormData,
    status,
    setStatus,
    canEdit,
    isEditMode,
    DOB_MIN,
    DOB_MAX,
    effectiveUserName,
    handleInputChange,
    setHasUnsavedChanges
}) => {
    const [idModalOpen, setIdModalOpen] = useState(false);
    const [idModalSrc, setIdModalSrc] = useState(null);
    const [idModalType, setIdModalType] = useState("image");

    const handlePhotoChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif"];
            if (!validTypes.includes(file.type)) {
                alert("Please select a valid image file (JPEG, PNG, GIF)");
                return;
            }
            const reader = new FileReader();
            reader.onload = (ev) => {
                setFormData((prev) => ({
                    ...prev,
                    employeePhotoFile: file,
                    employeePhotoUrl: ev.target.result,
                }));
                setHasUnsavedChanges(true);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleViewId = () => {
        const src = formData.idProofUrl || formData.idProofPreview || null;
        if (!src) return;
        const t = formData.idProofFile?.type === "application/pdf" ? "pdf" : "image";
        setIdModalSrc(src);
        setIdModalType(t);
        setIdModalOpen(true);
    };

    const handleDownloadId = async () => {
        try {
            if (formData.idProofFile instanceof File) {
                const file = formData.idProofFile;
                const a = document.createElement("a");
                a.href = URL.createObjectURL(file);
                a.download = file.name || "id-proof";
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(a.href);
                return;
            }

            const src = formData.idProofUrl || formData.idProofPreview;
            if (!src) return;

            const res = await fetch(src, { mode: "cors" });
            const blob = await res.blob();
            const a = document.createElement("a");
            const url = URL.createObjectURL(blob);
            const guessedName = (formData.idProofUrl && formData.idProofUrl.split("/").pop().split("?")[0]) ||
                (idModalType === "pdf" ? "id-proof.pdf" : "id-proof.jpg");
            a.href = url;
            a.download = guessedName || "id-proof";
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        } catch (e) {
            const src = formData.idProofUrl || formData.idProofPreview;
            if (src) window.open(src, "_blank", "noopener,noreferrer");
        }
    };

    const handleIdProofChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
        const fileExtension = file.name.toLowerCase().split('.').pop();
        const allowedExtensions = ['pdf', 'jpg', 'jpeg', 'png'];

        if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
            alert('Please select a PDF, JPG, or PNG file only.');
            e.target.value = '';
            return;
        }

        if (file.size > 150 * 1024) {
            alert('File size must be less than 150KB.');
            e.target.value = '';
            return;
        }

        setFormData(prev => ({
            ...prev,
            idProofFile: file,
            idProofError: null
        }));
        setHasUnsavedChanges(true);

        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                setFormData(prev => ({
                    ...prev,
                    idProofPreview: e.target.result,
                    idProofError: null
                }));
            };
            reader.readAsDataURL(file);
        } else {
            setFormData(prev => ({
                ...prev,
                idProofPreview: null,
                idProofError: null
            }));
        }
    };

    const renderInputField = (label, name, value, type = "text", extraProps = {}, icon = "bi-card-text") => (
        <div className="">
            <label className="form-label">
                <i className={`bi ${icon} me-1`}></i>
                <strong>{label}</strong>
            </label>
            {canEdit ? (
                <div className="input-group">
                    <span className="input-group-text">
                        <i className={`bi ${icon}`}></i>
                    </span>
                    <input
                        type={type}
                        className={"form-control form-control-sm" + (isEditMode ? " " : "")}
                        name={name}
                        value={value || ""}
                        onChange={handleInputChange}
                        {...extraProps}
                    />
                </div>
            ) : (
                <div className="input-group">
                    <span className="input-group-text">
                        <i className={`bi ${icon}`}></i>
                    </span>
                    <div className="form-control form-control-sm bg-light">{String(value || "N/A")}</div>
                </div>
            )}
        </div>
    );

    const renderPhoneField = (label, name, value, extraProps = {}, icon = "bi-phone") => {
        const digitsOnly = String(value || "").replace(/\D/g, "");
        const canCall = !!digitsOnly;
        return (
            <div className="">
                <label className="form-label">
                    <i className={`bi ${icon} me-1`}></i>
                    <strong>{label}</strong>
                </label>
                {canEdit ? (
                    <div className="input-group">
                        <span className="input-group-text">
                            <i className="bi bi-plus-slash-minus"></i>91
                        </span>
                        <input
                            type="tel"
                            className={"form-control form-control-sm" + (isEditMode ? " " : "")}
                            name={name}
                            value={value || ""}
                            onChange={handleInputChange}
                            inputMode="numeric"
                            maxLength={10}
                            pattern="^[0-9]{10}$"
                            {...extraProps}
                        />
                    </div>
                ) : (
                    <div className="input-group">
                        <span className="input-group-text">
                            <i className={`bi ${icon}`}></i>
                        </span>
                        <div className="form-control form-control-sm bg-light d-flex align-items-center justify-content-between">
                            <span>{value || "N/A"}</span>
                            <div>
                                {canCall && (
                                    <>
                                        <a href={`tel:${digitsOnly}`} className="btn btn-sm btn-outline-primary ms-2">
                                            <i className="bi bi-telephone-outbound me-1"></i>Call
                                        </a>
                                        <a
                                            className="btn btn-sm btn-outline-success ms-1"
                                            href={`https://wa.me/${digitsOnly?.replace(/\D/g, '')}?text=${encodeURIComponent(
                                                "Hello, This is Sudheer From JenCeo Home Care Services"
                                            )}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            <i className="bi bi-whatsapp me-1"></i>WhatsApp
                                        </a>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderSelectField = (label, name, value, options, icon = "bi-list") => (
        <div className="">
            <label className="form-label">
                <i className={`bi ${icon} me-1`}></i>
                <strong>{label}</strong>
            </label>
            {canEdit ? (
                <div className="input-group">
                    <span className="input-group-text">
                        <i className={`bi ${icon}`}></i>
                    </span>
                    <select className={"form-select form-control-sm" + (isEditMode ? " mb-2" : "")} name={name} value={value || ""} onChange={handleInputChange}>
                        <option value="">Select {label}</option>
                        {options.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>
            ) : (
                <div className="input-group">
                    <span className="input-group-text">
                        <i className={`bi ${icon}`}></i>
                    </span>
                    <div className="form-control form-control-sm bg-light">{String(value || "N/A")}</div>
                </div>
            )}
        </div>
    );

    const renderHistoryComments = () => {
        const entries = [];
        const employee = formData;

        if (employee?.removalHistory) {
            Object.values(employee.removalHistory).forEach(h =>
                entries.push({
                    type: "Removal",
                    reason: h.removalReason,
                    comment: h.removalComment,
                    user: h.removedBy,
                    time: h.removedAt,
                    icon: "bi-person-dash"
                })
            );
        }

        if (employee?.returnHistory) {
            Object.values(employee.returnHistory).forEach(h =>
                entries.push({
                    type: "Return",
                    reason: h.reason,
                    comment: h.comment,
                    user: h.returnedBy || h.userStamp,
                    time: h.returnedAt || h.timestamp,
                    icon: "bi-person-check"
                })
            );
        }

        if (formData?.removalReason || formData?.removalComment || formData?.removedBy) {
            entries.push({
                type: "Removal",
                reason: formData.removalReason,
                comment: formData.removalComment,
                user: formData.removedBy,
                time: formData.removedAt,
                icon: "bi-person-dash"
            });
        }

        if (formData?.revertReason || formData?.revertComment || formData?.revertedBy) {
            entries.push({
                type: "Revert",
                reason: formData.revertReason,
                comment: formData.revertComment,
                user: formData.revertedBy,
                time: formData.revertedAt,
                icon: "bi-arrow-counterclockwise"
            });
        }

        if (formData?.__returnInfo) {
            entries.push({
                type: "Return",
                reason: formData.__returnInfo.reasonType,
                comment: formData.__returnInfo.comment,
                user: formData.__returnInfo.returnedBy || formData.__returnInfo.userStamp,
                time: formData.__returnInfo.returnedAt || formData.__returnInfo.timestamp,
                icon: "bi-person-check"
            });
        }

        entries.sort((a, b) => new Date(b.time) - new Date(a.time));

        if (entries.length === 0) {
            return (
                <div className="card">
                    <div className="card-body text-center">
                        <i className="bi bi-chat-left-text fs-1 text-muted mb-3"></i>
                        <h5 className="text-muted">No History Available</h5>
                        <p className="text-muted mb-0">No removed or returned comments found.</p>
                    </div>
                </div>
            );
        }

        return entries.map((e, idx) => (
            <div className="card mb-3 border-left-3" style={{ borderLeftColor: e.type === "Removal" ? "#dc3545" : e.type === "Return" ? "#198754" : "#ffc107" }} key={`${e.type}-${idx}`}>
                <div className="card-body">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                        <div className="d-flex align-items-center">
                            <i className={`bi ${e.icon || "bi-clock-history"} me-2 fs-5`} 
                               style={{ color: e.type === "Removal" ? "#dc3545" : e.type === "Return" ? "#198754" : "#ffc107" }}></i>
                            <strong
                                className={`action-type ${e.type === "Removal"
                                    ? "text-danger"
                                    : e.type === "Return"
                                        ? "text-success"
                                        : "text-warning"
                                    }`}
                            >
                                {e.type}
                            </strong>
                        </div>
                        <div className="text-muted small">
                            <i className="bi bi-clock me-1"></i>
                            {e.time && new Date(e.time).toLocaleString()}
                        </div>
                    </div>
                    
                    {e.user && (
                        <div className="d-flex align-items-center mb-2">
                            <i className="bi bi-person-circle text-muted me-2"></i>
                            <span className="text-muted">By <strong>{e.user}</strong></span>
                        </div>
                    )}
                    
                    <div className="action-comments-body mt-3">
                        {e.reason && (
                            <div className="action-row mb-2">
                                <div className="d-flex">
                                    <i className="bi bi-journal-text text-muted me-2"></i>
                                    <div>
                                        <span className="text-muted small">Reason:</span>
                                        <div className="value">{e.reason}</div>
                                    </div>
                                </div>
                            </div>
                        )}
                        {e.comment && (
                            <div className="action-row">
                                <div className="d-flex">
                                    <i className="bi bi-chat-left-text text-muted me-2"></i>
                                    <div>
                                        <span className="text-muted small">Comment:</span>
                                        <div className="value comment-text mt-1">{e.comment}</div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        ));
    };

    return (
        <>
            {/* Status & Rating Card */}
            <div className="card shadow-sm border-primary mb-4">
                <div className="card-header bg-primary text-white d-flex align-items-center">
                    <i className="bi bi-person-badge me-2 fs-5"></i>
                    <h4 className="mb-0">Employee Status & Rating</h4>
                </div>
                <div className="card-body">
                    <div className="row">
                        <div className="col-md-6">
                            <div className="mb-3">
                                <label className="form-label">
                                    <i className="bi bi-clipboard-check me-1"></i>
                                    <strong>Status</strong>
                                </label>
                                {canEdit ? (
                                    <div className="input-group">
                                        <span className="input-group-text">
                                            <i className="bi bi-clipboard-check"></i>
                                        </span>
                                        <select className="form-select" value={status} onChange={(e) => setStatus(e.target.value)}>
                                            <option value="On Duty">On Duty</option>
                                            <option value="Off Duty">Off Duty</option>
                                            <option value="Resigned">Resigned</option>
                                            <option value="Absconder">Absconder</option>
                                            <option value="Terminated">Terminated</option>
                                        </select>
                                    </div>
                                ) : (
                                    <div className="input-group">
                                        <span className="input-group-text">
                                            <i className="bi bi-clipboard-check"></i>
                                        </span>
                                        <div className="form-control bg-light">
                                            <span
                                                className={`badge px-3 py-2`}
                                                style={{
                                                    fontSize: "1rem",
                                                    backgroundColor:
                                                        status === "On Duty"
                                                            ? "green"
                                                            : status === "Off Duty"
                                                                ? "gray"
                                                                : status === "Terminated"
                                                                    ? "red"
                                                                    : status === "Resigned"
                                                                        ? "brown"
                                                                        : "red",
                                                    color: "white",
                                                }}
                                            >
                                                {status}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="col-md-6">
                            <div className="mb-3">
                                <label className="form-label">
                                    <i className="bi bi-star me-1"></i>
                                    <strong>Performance Rating</strong>
                                </label>
                                <div className="d-flex align-items-center">
                                    {[1, 2, 3, 4, 5].map((n) => {
                                        const val = Number(formData.rating || 0);
                                        const filled = n <= val;
                                        let color = "text-secondary";
                                        if (filled) {
                                            if (val >= 4) color = "text-success";
                                            else if (val === 3) color = "text-warning";
                                            else color = "text-danger";
                                        }
                                        return (
                                            <i
                                                key={n}
                                                className={`bi ${filled ? "bi-star-fill" : "bi-star"} ${color} me-1`}
                                                style={{ fontSize: "2rem", cursor: canEdit ? "pointer" : "default" }}
                                                title={`${val}/5`}
                                                onClick={() => canEdit && setFormData(prev => ({ ...prev, rating: String(n) }))}
                                            />
                                        );
                                    })}
                                    <span className="ms-3">
                                        <strong>{formData.rating || "0"}/5</strong>
                                    </span>
                                </div>
                                <small className="text-muted mt-2 d-block">
                                    <i className="bi bi-info-circle me-1"></i>
                                    Click stars to rate employee performance
                                </small>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Photo & ID Proof Card */}
            <div className="row mb-4">
                <div className="col-md-5">
                    <div className="card shadow-sm border-info h-100">
                        <div className="card-header bg-info text-white d-flex align-items-center">
                            <i className="bi bi-camera me-2"></i>
                            <h5 className="mb-0">Employee Photo</h5>
                        </div>
                        <div className="card-body text-center">
                            {formData.employeePhotoUrl ? (
                                <div className="d-flex flex-column align-items-center">
                                    <img
                                        src={formData.employeePhotoUrl}
                                        alt="Employee"
                                        style={{ maxWidth: "100%", maxHeight: "250px", objectFit: "cover" }}
                                        className="rounded img-fluid mb-3"
                                    />
                                    {canEdit && (
                                        <button
                                            type="button"
                                            className="btn btn-outline-danger btn-sm w-100"
                                            onClick={() =>
                                                setFormData((prev) => ({
                                                    ...prev,
                                                    employeePhotoFile: undefined,
                                                    employeePhotoUrl: null,
                                                }))
                                            }
                                        >
                                            <i className="bi bi-trash me-1"></i> Remove Photo
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center py-4">
                                    <i className="bi bi-person-square fs-1 text-muted mb-3"></i>
                                    <p className="text-muted">No photo selected</p>
                                </div>
                            )}
                            {canEdit && (
                                <div className="mt-3">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handlePhotoChange}
                                        className="form-control"
                                    />
                                    <small className="text-muted d-block mt-2">
                                        <i className="bi bi-info-circle me-1"></i>
                                        JPG, PNG, GIF (max 150KB)
                                    </small>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="col-md-7">
                    <div className="card shadow-sm border-warning h-100">
                        <div className="card-header bg-warning text-white d-flex align-items-center">
                            <i className="bi bi-file-earmark-text me-2"></i>
                            <h5 className="mb-0">ID Proof Document</h5>
                        </div>
                        <div className="card-body text-center">
                            {formData.idProofUrl || formData.idProofPreview ? (
                                <div className="d-flex flex-column align-items-center">
                                    {(formData.idProofUrl?.toLowerCase().includes(".pdf") ||
                                        formData.idProofFile?.type === "application/pdf") ? (
                                        <div className="border rounded p-4 bg-light mb-3">
                                            <i className="bi bi-file-earmark-pdf-fill text-danger" style={{ fontSize: "3rem" }} />
                                            <div className="mt-2">PDF Document</div>
                                        </div>
                                    ) : (
                                        <img
                                            src={formData.idProofUrl || formData.idProofPreview}
                                            alt="ID Proof"
                                            style={{ maxWidth: "100%", maxHeight: "200px", objectFit: "contain" }}
                                            className="rounded img-fluid mb-3"
                                        />
                                    )}
                                    <div className="d-flex gap-2 justify-content-center">
                                        <button
                                            type="button"
                                            className="btn btn-outline-primary btn-sm"
                                            onClick={handleViewId}
                                            title="View full ID"
                                        >
                                            <i className="bi bi-eye me-1" /> View
                                        </button>
                                        {canEdit && (
                                            <button
                                                type="button"
                                                className="btn btn-outline-danger btn-sm"
                                                onClick={() =>
                                                    setFormData((prev) => ({
                                                        ...prev,
                                                        idProofFile: undefined,
                                                        idProofUrl: null,
                                                        idProofPreview: null,
                                                        idProofError: null,
                                                    }))
                                                }
                                                title="Remove ID Proof"
                                            >
                                                <i className="bi bi-trash me-1" /> Remove
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            className="btn btn-outline-success btn-sm"
                                            onClick={handleDownloadId}
                                            title="Download ID Proof"
                                        >
                                            <i className="bi bi-download me-1" /> Download
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-4">
                                    <i className="bi bi-file-earmark fs-1 text-muted mb-3"></i>
                                    <p className="text-muted">No ID proof uploaded</p>
                                </div>
                            )}
                            {canEdit && (
                                <div className="mt-3">
                                    <input
                                        type="file"
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        onChange={handleIdProofChange}
                                        className="form-control"
                                    />
                                    <small className="text-muted d-block mt-2">
                                        <i className="bi bi-info-circle me-1"></i>
                                        PDF, JPG, PNG only (max 150KB)
                                    </small>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ID Proof Modal */}
            {idModalOpen && idModalSrc && (
                <div
                    className="modal fade show d-block"
                    tabIndex="-1"
                    aria-modal="true"
                    role="dialog"
                    style={{ background: "rgba(0,0,0,0.8)", zIndex: 3001 }}
                    onClick={() => setIdModalOpen(false)}
                >
                    <div className="modal-dialog modal-xl modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-content" style={{ background: "#0b1220", color: "#e2e8f0" }}>
                            <div className="modal-header">
                                <h5 className="modal-title">
                                    <i className="bi bi-file-earmark-text me-2"></i>ID Proof
                                </h5>
                                <button type="button" className="btn-close btn-close-white" onClick={() => setIdModalOpen(false)} />
                            </div>
                            <div className="modal-body" style={{ maxHeight: "80vh", overflow: "auto" }}>
                                {idModalType === "pdf" ? (
                                    <embed
                                        src={idModalSrc}
                                        type="application/pdf"
                                        style={{ width: "100%", height: "75vh", borderRadius: 8 }}
                                    />
                                ) : (
                                    <img
                                        src={idModalSrc}
                                        alt="ID Proof"
                                        style={{ width: "100%", height: "auto", borderRadius: 8, objectFit: "contain" }}
                                    />
                                )}
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-outline-secondary" onClick={() => setIdModalOpen(false)}>
                                    <i className="bi bi-x-circle me-1"></i> Close
                                </button>
                                <button className="btn btn-primary" onClick={handleDownloadId}>
                                    <i className="bi bi-download me-1" /> Download
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

           {/* Personal Information Card */}
<div className="card shadow-sm border-success mb-4">
    <div className="card-header bg-success text-white d-flex align-items-center">
        <i className="bi bi-person-vcard me-2"></i>
        <h4 className="mb-0">Personal Information</h4>
    </div>
    <div className="card-body">
        
        {/* Employee Identification Section */}
        <div className="section-divider mb-4">
            <h6 className="section-title text-success">
                <i className="bi bi-person-badge me-2"></i>
                Employee Identification
            </h6>
            <div className="row g-3">
                <div className="col-md-6">
                    {renderInputField("ID No", "idNo", formData.idNo || formData.employeeId, "text", {}, "bi-person-badge")}
                </div>
                <div className="col-md-6">
                    {renderInputField("Local ID", "localId", formData.localId, "text", {}, "bi-card-checklist")}
                </div>
            </div>
        </div>

        {/* Name & Personal Details Section */}
        <div className="section-divider mb-4 pt-3 border-top">
            <h6 className="section-title text-success">
                <i className="bi bi-person-lines-fill me-2"></i>
                Name & Personal Details
            </h6>
            <div className="row g-3">
                <div className="col-md-6">
                    {renderInputField("First Name", "firstName", formData.firstName, "text", {}, "bi-person")}
                </div>
                <div className="col-md-6">
                    {renderInputField("Last Name", "lastName", formData.lastName, "text", {}, "bi-person")}
                </div>
                <div className="col-md-6">
                    {renderSelectField("Gender", "gender", formData.gender, [
                        { value: "Male", label: "Male" },
                        { value: "Female", label: "Female" },
                        { value: "Other", label: "Other" },
                    ], "bi-gender-ambiguous")}
                </div>
                <div className="col-md-6">
                    {renderInputField("Care Of", "co", formData.co, "text", {}, "bi-person-heart")}
                </div>
            </div>
        </div>

        {/* Birth Details Section */}
        <div className="section-divider mb-4 pt-3 border-top">
            <h6 className="section-title text-success">
                <i className="bi bi-calendar-heart me-2"></i>
                Birth Details
            </h6>
            <div className="row g-3">
                <div className="col-md-6">
                    {renderInputField("Date of Birth", "dateOfBirth", formData.dateOfBirth, "date", {
                        min: DOB_MIN,
                        max: DOB_MAX,
                    }, "bi-calendar-heart")}
                </div>
                <div className="col-md-6">
                    {renderInputField("Age", "years", formData.years, "number", { readOnly: true }, "bi-calendar")}
                </div>
            </div>
        </div>

        {/* Government IDs Section */}
        <div className="section-divider mb-4 pt-3 border-top">
            <h6 className="section-title text-success">
                <i className="bi bi-shield-check me-2"></i>
                Government IDs
            </h6>
            <div className="row g-3">
                <div className="col-md-6">
                    {renderInputField("Aadhar No", "aadharNo", formData.aadharNo, "tel", {
                        inputMode: "numeric",
                        maxLength: 12,
                        pattern: "^[0-9]{12}$",
                    }, "bi-credit-card")}
                </div>
            </div>
        </div>

        {/* Contact Information Section */}
        <div className="section-divider mb-4 pt-3 border-top">
            <h6 className="section-title text-success">
                <i className="bi bi-telephone me-2"></i>
                Contact Information
            </h6>
            <div className="row g-3">
                <div className="col-md-6">
                    {renderPhoneField("Mobile 1", "mobileNo1", formData.mobileNo1, {}, "bi-telephone")}
                </div>
                <div className="col-md-6">
                    {renderPhoneField("Mobile 2", "mobileNo2", formData.mobileNo2, {}, "bi-telephone")}
                </div>
            </div>
        </div>

        {/* Employment Details Section */}
        <div className="section-divider mb-4 pt-3 border-top">
            <h6 className="section-title text-success">
                <i className="bi bi-briefcase me-2"></i>
                Employment Details
            </h6>
            <div className="row g-3">
                <div className="col-md-6">
                    {renderInputField("Date of Joining", "date", formData.date || formData.dateOfJoining, "date", {}, "bi-calendar-check")}
                </div>
                <div className="col-md-6">
                    {renderInputField("Page No", "pageNo", formData.pageNo, "number", {}, "bi-journal")}
                </div>
            </div>
        </div>

        {/* Salary Information Section */}
        <div className="section-divider pt-3 border-top">
            <h6 className="section-title text-success">
                <i className="bi bi-cash-stack me-2"></i>
                Salary Information
            </h6>
            <div className="row g-3">
                <div className="col-md-6">
                    {renderInputField("Basic Salary", "basicSalary", formData.basicSalary, "number", {}, "bi-cash-stack")}
                </div>
                <div className="col-md-6">
                    {renderInputField("Allowance", "allowance", formData.allowance, "number", {}, "bi-cash")}
                </div>
            </div>
        </div>

    </div>
</div>

            {/* About Employee Card */}
            <div className="card shadow-sm border-info mb-4">
                <div className="card-header bg-info text-white d-flex align-items-center">
                    <i className="bi bi-chat-left-text me-2"></i>
                    <h4 className="mb-0">About Employee & Skills</h4>
                </div>
                <div className="card-body">
                    <div className="mb-3">
                        <label className="form-label">
                            <i className="bi bi-person-lines-fill me-1"></i>
                            <strong>Employee Description</strong>
                        </label>
                        {canEdit ? (
                            <div className="input-group">
                                <span className="input-group-text">
                                    <i className="bi bi-chat-left-text"></i>
                                </span>
                                <textarea
                                    className="form-control"
                                    name="aboutEmployeee"
                                    value={formData.aboutEmployeee || ""}
                                    onChange={handleInputChange}
                                    rows="3"
                                    placeholder="Describe employee skills, experience, and special abilities..."
                                />
                            </div>
                        ) : (
                            <div className="input-group">
                                <span className="input-group-text">
                                    <i className="bi bi-chat-left-text"></i>
                                </span>
                                <div className="form-control bg-light" style={{ minHeight: "80px" }}>
                                    {formData.aboutEmployeee || "N/A"}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* History Comments Card */}
            <div className="card shadow-sm border-warning">
                <div className="card-header bg-warning text-white d-flex align-items-center">
                    <i className="bi bi-clock-history me-2"></i>
                    <h4 className="mb-0">Return / Remove History</h4>
                </div>
                <div className="card-body">
                    {renderHistoryComments()}
                </div>
            </div>
        </>
    );
};

export default BasicInfo;