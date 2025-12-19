import React, { useState } from "react";
import { DOB_MIN, DOB_MAX, getDownloadUrl } from "../utils";
import { useAuth } from "../../../../context/AuthContext";
import firebaseDB from "../../../../firebase";

const BasicTab = ({ 
    formData, 
    setFormData, 
    isEditMode, 
    status, 
    setStatus,
    handleInputChange,
    handlePhotoChange,
    onSaveSuccess // NEW: Callback for successful save
}) => {
    const { user: authUser } = useAuth() || {};
    const isSuperAdmin = 
        String(authUser?.role || "").toLowerCase() === "superadmin" ||
        authUser?.isSuperAdmin === true ||
        authUser?.permissions?.canManageAll === true;
    
    const [superAdminUnlock, setSuperAdminUnlock] = useState(false);
    const [idModalOpen, setIdModalOpen] = useState(false);
    const [idModalSrc, setIdModalSrc] = useState(null);
    const [idModalType, setIdModalType] = useState("image");
    const lockBasic = isEditMode && (!isSuperAdmin || !superAdminUnlock);

    // Enhanced superior lookup with photo handling
    const handleSuperiorLookup = async (e) => {
        const superiorId = e.target.value.trim();

        if (!superiorId) {
            setFormData(prev => ({
                ...prev,
                superiorName: "",
                superiorPhoto: ""
            }));
            return;
        }

        try {
            // Fetch superior details from Firebase
            const snapshot = await firebaseDB
                .child("StaffBioData")
                .orderByChild("idNo")
                .equalTo(superiorId)
                .once("value");

            if (snapshot.exists()) {
                const data = snapshot.val();
                const firstKey = Object.keys(data)[0];
                const superior = data[firstKey];

                const superiorName = `${superior.firstName || ""} ${superior.lastName || ""}`.trim();
                let superiorPhoto = "";

                if (superior.employeePhoto) {
                    superiorPhoto = getDownloadUrl(superior.employeePhoto);
                } else if (superior.employeePhotoUrl) {
                    superiorPhoto = getDownloadUrl(superior.employeePhotoUrl);
                } else {
                    superiorPhoto = "https://firebasestorage.googleapis.com/v0/b/jenceo-admin.firebasestorage.app/o/OfficeFiles%2FSample-Photo.jpg?alt=media&token=01855b47-c9c2-490e-b400-05851192dde7";
                }

                setFormData(prev => ({
                    ...prev,
                    superiorName,
                    superiorPhoto
                }));
            } else {
                // Try other database nodes
                const nodes = ["EmployeeData", "Staffs", "WorkerBioData"];
                let found = false;

                for (const node of nodes) {
                    try {
                        const altSnapshot = await firebaseDB
                            .child(node)
                            .orderByChild("idNo")
                            .equalTo(superiorId)
                            .once("value");

                        if (altSnapshot.exists()) {
                            const data = altSnapshot.val();
                            const firstKey = Object.keys(data)[0];
                            const superior = data[firstKey];

                            const superiorName = `${superior.firstName || superior.name || ""} ${superior.lastName || ""}`.trim();
                            let superiorPhoto = "";

                            if (superior.employeePhoto) {
                                superiorPhoto = getDownloadUrl(superior.employeePhoto);
                            } else if (superior.photo) {
                                superiorPhoto = getDownloadUrl(superior.photo);
                            } else if (superior.employeePhotoUrl) {
                                superiorPhoto = getDownloadUrl(superior.employeePhotoUrl);
                            } else {
                                superiorPhoto = "https://firebasestorage.googleapis.com/v0/b/jenceo-admin.firebasestorage.app/o/OfficeFiles%2FSample-Photo.jpg?alt=media&token=01855b47-c9c2-490e-b400-05851192dde7";
                            }

                            setFormData(prev => ({
                                ...prev,
                                superiorName,
                                superiorPhoto
                            }));
                            found = true;
                            break;
                        }
                    } catch (err) {
                        console.error(`Error checking node ${node}:`, err);
                        continue;
                    }
                }

                if (!found) {
                    setFormData(prev => ({
                        ...prev,
                        superiorName: "",
                        superiorPhoto: ""
                    }));
                    alert("No staff found with this Superior ID");
                }
            }
        } catch (error) {
            console.error("Error looking up superior:", error);
            setFormData(prev => ({
                ...prev,
                superiorName: "",
                superiorPhoto: ""
            }));
            alert("Error looking up superior details");
        }
    };

    // ID Proof Functions from BasicInfo.js
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

    // Remove existing ID proof
    const removeIdProof = () => {
        setFormData(prev => ({
            ...prev,
            idProofFile: undefined,
            idProofUrl: null,
            idProofPreview: null,
            idProofError: null,
        }));
    };

    // Render input field helper
    const renderInputField = (label, name, value, type = "text", placeholder = "", required = false, extraProps = {}) => {
        const isDisabled = extraProps.disabled || (!isEditMode);
        const inputProps = {
            type,
            className: `form-control ${!isEditMode ? 'bg-light' : ''}`,
            name,
            value: value || "",
            onChange: handleInputChange,
            placeholder,
            required,
            disabled: isDisabled,
            ...extraProps
        };

        if (!isEditMode) {
            return (
                <div className="form-group">
                    <label className="form-label"><strong>{label}</strong></label>
                    <div className="form-control bg-light">
                        {value || <span className="text-muted">Not provided</span>}
                    </div>
                </div>
            );
        }

        return (
            <div className="form-group">
                <label className="form-label">
                    <strong>{label}</strong> {required && <span className="text-danger">*</span>}
                </label>
                <input {...inputProps} />
            </div>
        );
    };

    // Render phone field helper
    const renderPhoneField = (label, name, value, extraProps = {}) => {
        const digitsOnly = String(value || "").replace(/\D/g, "");
        const canCall = !!digitsOnly;
        return (
            <div className="">
                <label className="form-label">
                    <strong>{label}</strong>
                </label>
                {isEditMode ? (
                    <input
                        type="tel"
                        className="form-control form-control-sm"
                        name={name}
                        value={value || ""}
                        onChange={handleInputChange}
                        inputMode="numeric"
                        maxLength={10}
                        pattern="^[0-9]{10}$"
                        {...extraProps}
                    />
                ) : (
                    <div className="form-control form-control-sm bg-light d-flex align-items-center">
                        <span>{value || "N/A"}</span>
                        {canCall && (
                            <>
                                <a href={`tel:${digitsOnly}`} className="btn btn-sm btn-outline-primary ms-2 mb-1">
                                    Call
                                </a>
                                <a
                                    className="btn btn-sm btn-warning ms-1 mb-1"
                                    href={`https://wa.me/${digitsOnly?.replace(/\D/g, '')}?text=${encodeURIComponent(
                                        "Hello, This is Sudheer From JenCeo Home Care Services"
                                    )}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    WAP
                                </a>
                            </>
                        )}
                    </div>
                )}
            </div>
        );
    };

    // Render select field helper
    const renderSelectField = (label, name, value, options) => (
        <div className="">
            <label className="form-label">
                <strong>{label}</strong>
            </label>
            {isEditMode ? (
                <select className="form-select" name={name} value={value || ""} onChange={handleInputChange}>
                    <option value="">Select {label}</option>
                    {options.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
            ) : (
                <div className="form-control form-control-sm bg-light">{String(value || "N/A")}</div>
            )}
        </div>
    );

    return (
        <div className="modal-card staffBasicInfo">
            {/* Status and Superior Info Card */}
            <div className="card mb-4 border-0 shadow-sm" style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
                <div className="card-body text-white p-4">
                    <div className="row align-items-center">
                        {/* Status Section */}
                        <div className="col-md-4 mb-3 mb-md-0">
                            <h6 className="mb-2 fw-semibold opacity-90">Status</h6>
                            {isEditMode ? (
                                <select
                                    className="form-select form-select-sm bg-white text-dark"
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value)}
                                    style={{ maxWidth: "200px" }}
                                >
                                    <option value="On Duty">On Duty</option>
                                    <option value="Off Duty">Off Duty</option>
                                    <option value="Resigned">Resigned</option>
                                    <option value="Absconder">Absconder</option>
                                    <option value="Terminated">Terminated</option>
                                </select>
                            ) : (
                                <div className="d-flex align-items-center">
                                    <div className={`status-indicator me-2 ${status === "On Duty" ? "bg-success" : status === "Off Duty" ? "bg-secondary" : "bg-danger"}`}></div>
                                    <span className="badge bg-white text-dark px-3 py-2 fw-semibold">
                                        {status}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Superior Info Section */}
                        <div className="col-md-8">
                            <div className="d-flex align-items-center">
                                {/* Superior Avatar */}
                                <div className="position-relative me-3">
                                    {formData.superiorPhoto ? (
                                        <div className="avatar-wrapper">
                                            <img
                                                src={formData.superiorPhoto}
                                                alt="Superior"
                                                className="rounded-circle border-3 border-white shadow"
                                                style={{
                                                    width: "70px",
                                                    height: "70px",
                                                    objectFit: "cover"
                                                }}
                                                onError={(e) => {
                                                    e.target.src = "https://firebasestorage.googleapis.com/v0/b/jenceo-admin.firebasestorage.app/o/OfficeFiles%2FSample-Photo.jpg?alt=media&token=01855b47-c9c2-490e-b400-05851192dde7";
                                                }}
                                            />
                                            <div className="position-absolute bottom-0 end-0 bg-primary rounded-circle p-1 border border-2 border-white">
                                                <i className="bi bi-person-check text-white" style={{ fontSize: "12px" }}></i>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="avatar-placeholder rounded-circle border-3 border-white d-flex align-items-center justify-content-center shadow"
                                            style={{
                                                width: "70px",
                                                height: "70px",
                                                background: "rgba(255, 255, 255, 0.2)"
                                            }}>
                                            <i className="bi bi-person text-white" style={{ fontSize: "24px" }}></i>
                                        </div>
                                    )}
                                </div>

                                {/* Superior Details */}
                                <div className="flex-grow-1">
                                    <h6 className="mb-2 fw-semibold opacity-90">Reporting Manager</h6>
                                    <div className="bg-white rounded p-3 shadow-sm">
                                        <div className="row g-2">
                                            <div className="col-md-6">
                                                <div className="input-group input-group-sm">
                                                    <span className="input-group-text bg-light border-0">
                                                        <i className="bi bi-person-badge text-primary"></i>
                                                    </span>
                                                    <input
                                                        type="text"
                                                        className="form-control border-0 mb-0"
                                                        placeholder="Superior ID"
                                                        name="superiorId"
                                                        value={formData.superiorId || ""}
                                                        onChange={handleInputChange}
                                                        onBlur={handleSuperiorLookup}
                                                        disabled={!isEditMode}
                                                    />
                                                </div>
                                            </div>
                                            <div className="col-md-6">
                                                <div className="input-group input-group-sm">
                                                    <span className="input-group-text bg-light border-0">
                                                        <i className="bi bi-person text-primary"></i>
                                                    </span>
                                                    <input
                                                        type="text"
                                                        className="form-control border-0 bg-light mb-0"
                                                        value={formData.superiorName || ""}
                                                        readOnly
                                                        placeholder="Manager Name"
                                                        disabled
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {formData.superiorName && (
                                            <div className="mt-2 d-flex align-items-center">
                                                <i className="bi bi-arrow-right text-success me-2"></i>
                                                <small className="text-muted">
                                                    Reports to <strong className="text-dark">{formData.superiorName}</strong>
                                                    {formData.superiorId && <span className="ms-1">(ID: {formData.superiorId})</span>}
                                                </small>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Card */}
            <div className="card border-0 shadow-sm">
                <div className="card-header bg-white border-0 py-3">
                    <div className="d-flex justify-content-between align-items-center">
                        <h4 className="mb-0 fw-bold text-primary">
                            <i className="bi bi-card-text me-2"></i>
                            Basic Information
                        </h4>
                        {isSuperAdmin && (
                            <button
                                type="button"
                                className={`btn ${superAdminUnlock ? "btn-warning" : "btn-outline-warning"} btn-sm`}
                                onClick={() => setSuperAdminUnlock(v => !v)}
                                title="Super Admin unlock for sensitive fields"
                            >
                                <i className={`fas ${superAdminUnlock ? "fa-lock-open" : "fa-lock"} me-1`}></i>
                                {superAdminUnlock ? "Lock Fields" : "Unlock Fields"}
                            </button>
                        )}
                    </div>
                </div>

                <div className="card-body">
                    <div className="row">
                        {/* Left Column - Photo & ID Proofs */}
                        <div className="col-md-4 mb-4 mb-md-0">
                            {/* Staff Photo Card */}
                            <div className="card border mb-4">
                                <div className="card-header bg-light py-2">
                                    <h6 className="mb-0 fw-semibold">
                                        <i className="bi bi-camera me-2"></i>
                                        Staff Photo
                                    </h6>
                                </div>
                                <div className="card-body text-center p-3">
                                    <div className="staff-photo-container mb-3">
                                        {formData.employeePhotoUrl ? (
                                            <img
                                                src={formData.employeePhotoUrl}
                                                alt="Staff"
                                                className="rounded shadow img-fluid"
                                                style={{
                                                    maxWidth: "100%",
                                                    maxHeight: "250px",
                                                    objectFit: "cover",
                                                    border: "3px solid #f8f9fa"
                                                }}
                                            />
                                        ) : (
                                            <div className="photo-placeholder rounded d-flex flex-column align-items-center justify-content-center p-5"
                                                style={{
                                                    background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
                                                    minHeight: "200px"
                                                }}>
                                                <i className="bi bi-person-circle text-muted mb-2" style={{ fontSize: "48px" }}></i>
                                                <span className="text-muted">No photo selected</span>
                                            </div>
                                        )}
                                    </div>

                                    {isEditMode && (
                                        <div className="d-grid gap-2">
                                            <label className="btn btn-outline-primary btn-sm">
                                                <i className="bi bi-upload me-1"></i>
                                                Upload Photo
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handlePhotoChange}
                                                    className="d-none"
                                                />
                                            </label>
                                            {formData.employeePhotoUrl && (
                                                <button
                                                    type="button"
                                                    className="btn btn-outline-danger btn-sm"
                                                    onClick={() =>
                                                        setFormData((prev) => ({
                                                            ...prev,
                                                            employeePhotoFile: undefined,
                                                            employeePhotoUrl: null,
                                                        }))
                                                    }
                                                >
                                                    <i className="bi bi-trash me-1"></i>
                                                    Remove Photo
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* ID Proof Card - Updated like BasicInfo.js */}
                            <div className="card border">
                                <div className="card-header bg-warning text-white py-2 d-flex align-items-center">
                                    <i className="bi bi-file-earmark-text me-2"></i>
                                    <h6 className="mb-0 fw-semibold">ID Proof Document</h6>
                                </div>
                                <div className="card-body text-center p-3">
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
                                                {isEditMode && (
                                                    <button
                                                        type="button"
                                                        className="btn btn-outline-danger btn-sm"
                                                        onClick={removeIdProof}
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
                                    {isEditMode && (
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

                        {/* Right Column - Form Fields */}
                        <div className="col-md-8">
                            {/* Personal Details Card */}
                            <div className="card border mb-4">
                                <div className="card-header bg-light py-2">
                                    <h6 className="mb-0 fw-semibold">
                                        <i className="bi bi-person-circle me-2"></i>
                                        Personal Details
                                    </h6>
                                </div>
                                <div className="card-body">
                                    <div className="row g-3">
                                        <div className="col-md-6">
                                            {renderInputField("ID No", "idNo", formData.idNo || formData.employeeId, "text", "", true)}
                                        </div>
                                        <div className="col-md-6">
                                            {renderInputField("Page No", "pageNo", formData.pageNo, "number")}
                                        </div>
                                        <div className="col-md-6">
                                            {renderInputField("First Name", "firstName", formData.firstName, "text", "", false, { disabled: lockBasic })}
                                        </div>
                                        <div className="col-md-6">
                                            {renderInputField("Last Name", "lastName", formData.lastName, "text", "", false, { disabled: lockBasic })}
                                        </div>
                                        <div className="col-md-4">
                                            {renderSelectField("Gender", "gender", formData.gender, [
                                                { value: "Male", label: "Male" },
                                                { value: "Female", label: "Female" },
                                                { value: "Other", label: "Other" },
                                            ])}
                                        </div>
                                        <div className="col-md-4">
                                            {renderInputField("Care Of", "co", formData.co, "text", "Father/Guardian Name")}
                                        </div>
                                        <div className="col-md-4">
                                            {renderInputField("Age", "years", formData.years, "number", "", false, { min: 18, max: 100 })}
                                        </div>
                                        <div className="col-md-6">
                                            {renderInputField("Date of Birth", "dateOfBirth", formData.dateOfBirth, "date", "", false, {
                                                min: DOB_MIN, max: DOB_MAX, disabled: lockBasic
                                            })}
                                        </div>
                                        <div className="col-md-6">
                                            {renderInputField("Date of Joining", "date", formData.date || formData.dateOfJoining, "date", "", false, { disabled: lockBasic })}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Job Details Card */}
                            <div className="card border mb-4">
                                <div className="card-header bg-light py-2">
                                    <h6 className="mb-0 fw-semibold">
                                        <i className="bi bi-briefcase me-2"></i>
                                        Job Details
                                    </h6>
                                </div>
                                <div className="card-body">
                                    <div className="row g-3">
                                        <div className="col-md-4">
                                            {renderInputField("Department", "department", formData.department, "text", "", false, { disabled: lockBasic })}
                                        </div>
                                        <div className="col-md-4">
                                            {renderInputField("Designation", "designation", formData.designation, "text", "", false, { disabled: lockBasic })}
                                        </div>
                                        <div className="col-md-4">
                                            {renderInputField("Role", "role", formData.role, "text", "", false, { disabled: lockBasic })}
                                        </div>
                                        <div className="col-md-6">
                                            {renderInputField("Basic Salary", "basicSalary", formData.basicSalary, "number", "", false, { disabled: lockBasic })}
                                        </div>
                                        <div className="col-md-6">
                                            {renderInputField("Allowance", "allowance", formData.allowance, "number", "Other allowances")}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Contact Details Card */}
                            <div className="card border mb-4">
                                <div className="card-header bg-light py-2">
                                    <h6 className="mb-0 fw-semibold">
                                        <i className="bi bi-telephone me-2"></i>
                                        Contact Details
                                    </h6>
                                </div>
                                <div className="card-body">
                                    <div className="row g-3">
                                        <div className="col-md-6">
                                            {renderPhoneField("Mobile 1", "mobileNo1", formData.mobileNo1, "Primary mobile")}
                                        </div>
                                        <div className="col-md-6">
                                            {renderPhoneField("Mobile 2", "mobileNo2", formData.mobileNo2, "Alternate mobile")}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Official ID Proofs Card */}
                            <div className="card border mb-4">
                                <div className="card-header bg-light py-2">
                                    <h6 className="mb-0 fw-semibold">
                                        <i className="bi bi-passport me-2"></i>
                                        Official ID Proofs
                                    </h6>
                                </div>
                                <div className="card-body">
                                    <div className="row g-3">
                                        <div className="col-md-6">
                                            {renderInputField("PAN No", "panNo", formData.panNo, "text", "ABCDE1234F", false, {
                                                maxLength: 10,
                                                pattern: "[A-Z]{5}[0-9]{4}[A-Z]{1}"
                                            })}
                                        </div>
                                        <div className="col-md-6">
                                            {renderInputField("Aadhar No", "aadharNo", formData.aadharNo, "tel", "", false, {
                                                inputMode: "numeric",
                                                maxLength: 12,
                                                pattern: "^[0-9]{12}$",
                                            })}
                                        </div>
                                        <div className="col-md-6">
                                            {renderInputField("PF No", "pfNo", formData.pfNo, "text", "PF Account Number")}
                                        </div>
                                        <div className="col-md-6">
                                            {renderInputField("Insurance No", "insuranceNo", formData.insuranceNo, "text", "Insurance Number")}
                                        </div>
                                        <div className="col-md-6">
                                            {renderInputField("Health Card No", "healthCardNo", formData.healthCardNo, "text", "Health Card Number")}
                                        </div>
                                        <div className="col-md-6">
                                            {renderInputField("Driving License", "drivingLicense", formData.drivingLicense, "text", "DL Number")}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* About Employee Card */}
                            <div className="card border">
                                <div className="card-header bg-light py-2">
                                    <h6 className="mb-0 fw-semibold">
                                        <i className="bi bi-sticky me-2"></i>
                                        About Employee
                                    </h6>
                                </div>
                                <div className="card-body">
                                    {isEditMode ? (
                                        <textarea
                                            className="form-control"
                                            name="aboutEmployee"
                                            value={formData.aboutEmployee || ""}
                                            onChange={handleInputChange}
                                            rows="4"
                                            placeholder="Enter additional details, notes, or comments about the employee..."
                                            style={{ resize: "vertical" }}
                                        />
                                    ) : (
                                        <div className="p-3 bg-light rounded">
                                            {formData.aboutEmployee ? (
                                                <div className="text-dark">{formData.aboutEmployee}</div>
                                            ) : (
                                                <div className="text-center text-muted py-3">
                                                    <i className="bi bi-info-circle mb-2" style={{ fontSize: "32px" }}></i>
                                                    <p className="mb-0">No additional information provided</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
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
        </div>
    );
};

export default BasicTab;