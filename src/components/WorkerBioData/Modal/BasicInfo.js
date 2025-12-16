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

    const renderInputField = (label, name, value, type = "text", placeholder = "", extraProps = {}) => (
        <div className="">
            <label className="form-label">
                <strong>{label}</strong>
            </label>
            {canEdit ? (
                <input
                    type={type}
                    className={"form-control form-control-sm" + (isEditMode ? " mb-2" : "")}
                    name={name}
                    value={value || ""}
                    onChange={handleInputChange}
                    placeholder={placeholder}
                    {...extraProps}
                />
            ) : (
                <div className="form-control form-control-sm bg-light">{String(value || "N/A")}</div>
            )}
        </div>
    );

    const renderPhoneField = (label, name, value, extraProps = {}) => {
        const digitsOnly = String(value || "").replace(/\D/g, "");
        const canCall = !!digitsOnly;
        return (
            <div className="">
                <label className="form-label">
                    <strong>{label}</strong>
                </label>
                {canEdit ? (
                    <input
                        type="tel"
                        className={"form-control form-control-sm" + (isEditMode ? " mb-2" : "")}
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
                            <a href={`tel:${digitsOnly}`} className="btn btn-sm btn-outline-primary ms-2 mb-1">
                                Call
                            </a>
                        )}
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
                    </div>
                )}
            </div>
        );
    };

    const renderSelectField = (label, name, value, options) => (
        <div className="">
            <label className="form-label">
                <strong>{label}</strong>
            </label>
            {canEdit ? (
                <select className={"form-select" + (isEditMode ? " mb-2" : "")} name={name} value={value || ""} onChange={handleInputChange}>
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
            });
        }

        if (formData?.revertReason || formData?.revertComment || formData?.revertedBy) {
            entries.push({
                type: "Revert",
                reason: formData.revertReason,
                comment: formData.revertComment,
                user: formData.revertedBy,
                time: formData.revertedAt,
            });
        }

        if (formData?.__returnInfo) {
            entries.push({
                type: "Return",
                reason: formData.__returnInfo.reasonType,
                comment: formData.__returnInfo.comment,
                user: formData.__returnInfo.returnedBy || formData.__returnInfo.userStamp,
                time: formData.__returnInfo.returnedAt || formData.__returnInfo.timestamp,
            });
        }

        entries.sort((a, b) => new Date(b.time) - new Date(a.time));

        if (entries.length === 0) {
            return <div className="no-comments">No removed or returned comments.</div>;
        }

        return entries.map((e, idx) => (
            <div className="action-comments" key={`${e.type}-${idx}`}>
                <div className="action-comments-header">
                    <strong
                        className={`action-type ${e.type === "Removal"
                            ? "action-type-removal"
                            : e.type === "Return"
                                ? "action-type-return"
                                : "action-type-revert"
                            }`}
                    >
                        {e.type}
                    </strong>
                    {e.user && <span className="action-user">by {e.user}</span>}
                    {e.time && (
                        <span className="action-time">
                            {new Date(e.time).toLocaleString()}
                        </span>
                    )}
                </div>
                <div className="action-comments-body">
                    {e.reason && (
                        <div className="action-row">
                            <span className="label">Reason:</span>
                            <span className="value">{e.reason}</span>
                        </div>
                    )}
                    {e.comment && (
                        <div className="action-row">
                            <span className="label">Comment:</span>
                            <div className="value comment-text">{e.comment}</div>
                        </div>
                    )}
                </div>
            </div>
        ));
    };

    return (
        <div className="modal-card">
            {/* Status & Rating */}
            <div className="row status">
                <div className="col-md-4">
                    <label className="form-label"><strong>Status</strong></label>
                    {canEdit ? (
                        <select className="form-select" value={status} onChange={(e) => setStatus(e.target.value)}>
                            <option value="On Duty">On Duty</option>
                            <option value="Off Duty">Off Duty</option>
                            <option value="Resigned">Resigned</option>
                            <option value="Absconder">Absconder</option>
                            <option value="Terminated">Terminated</option>
                        </select>
                    ) : (
                        <div>
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
                    )}
                </div>
                <div className="col-md-4">
                    <div className="mt-3">
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
                                    className={`bi ${filled ? "bi-star-fill" : "bi-star"} ${color}`}
                                    style={{ fontSize: "2rem", cursor: "pointer", marginRight: 2 }}
                                    title={`${val}/5`}
                                    onClick={() => canEdit && setFormData(prev => ({ ...prev, rating: String(n) }))}
                                />
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="modal-card-header">
                <h4 className="mb-0 mt-2">Basic Information</h4>
            </div>
            <div className="modal-card-body">
                <div className="row align-items-start">
                    <div className="col-md-4">
                        {/* Photo Section */}
                        <div className="">
                            <label className="form-label center">
                                <strong>Employee Photo</strong>
                            </label>
                            <div className="text-center">
                                {formData.employeePhotoUrl ? (
                                    <img
                                        src={formData.employeePhotoUrl}
                                        alt="Employee"
                                        style={{ maxWidth: "300px", maxHeight: "300px", objectFit: "cover" }}
                                        className="rounded img-fluid"
                                    />
                                ) : (
                                    <div className="text-muted">No photo selected</div>
                                )}
                                {canEdit && (
                                    <div className="d-flex flex-column align-items-center gap-2 mt-3">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handlePhotoChange}
                                            className="form-control"
                                            style={{ maxWidth: 320 }}
                                        />
                                        {formData.employeePhotoUrl && (
                                            <button
                                                type="button"
                                                className="btn btn-outline-secondary btn-sm"
                                                onClick={() =>
                                                    setFormData((prev) => ({
                                                        ...prev,
                                                        employeePhotoFile: undefined,
                                                        employeePhotoUrl: null,
                                                    }))
                                                }
                                            >
                                                Remove Photo
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                        <hr />
                        
                        {/* ID Proof Section */}
                        <div className="idProof">
                            <label className="form-label center">
                                <strong>ID Proof</strong>
                            </label>
                            <div className="text-center">
                                {formData.idProofUrl || formData.idProofPreview ? (
                                    <div className="d-flex flex-column align-items-center gap-2">
                                        {(formData.idProofUrl?.toLowerCase().includes(".pdf") ||
                                            formData.idProofFile?.type === "application/pdf") ? (
                                            <div className="border rounded p-4 bg-light">
                                                <i className="bi bi-file-earmark-pdf-fill text-danger" style={{ fontSize: "3rem" }} />
                                                <div className="mt-2">PDF Document</div>
                                            </div>
                                        ) : (
                                            <img
                                                src={formData.idProofUrl || formData.idProofPreview}
                                                alt="ID Proof"
                                                style={{ maxWidth: "300px", maxHeight: "300px", objectFit: "cover" }}
                                                className="rounded img-fluid"
                                            />
                                        )}
                                        <div className="d-flex align-items-center gap-2 mt-2">
                                            <button
                                                type="button"
                                                className="btn btn-outline-primary btn-sm d-inline-flex align-items-center"
                                                onClick={handleViewId}
                                                title="View full ID"
                                            >
                                                <i className="bi bi-eye me-1" /> View
                                            </button>
                                            {canEdit && (
                                                <button
                                                    type="button"
                                                    className="btn btn-outline-secondary btn-sm"
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
                                                    Remove ID Proof
                                                </button>
                                            )}
                                            {(formData.idProofUrl || formData.idProofPreview) && (
                                                <button
                                                    type="button"
                                                    className="btn btn-outline-success btn-sm d-inline-flex align-items-center"
                                                    onClick={handleDownloadId}
                                                    title="Download ID Proof"
                                                >
                                                    <i className="bi bi-download me-1" /> Download
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="small-text">No ID proof uploaded</div>
                                )}
                                {canEdit && (
                                    <div className="d-flex flex-column align-items-center gap-2 mt-3">
                                        <input
                                            type="file"
                                            accept=".pdf,.jpg,.jpeg,.png"
                                            onChange={handleIdProofChange}
                                            className="form-control"
                                            style={{ maxWidth: 320 }}
                                        />
                                        <div className="small-text small">PDF, JPG, PNG only (max 150KB)</div>
                                    </div>
                                )}
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
                                            <h5 className="modal-title">ID Proof</h5>
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
                                                Close
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

                    <div className="col-md-8">
                        <div className="row">
                            <div className="col-md-6">
                                {renderInputField("ID No", "idNo", formData.idNo || formData.employeeId, "text", "", true)}
                            </div>
                        </div>

                        <div className="row">
                            <div className="col-md-6">{renderInputField("First Name", "firstName", formData.firstName)}</div>
                            <div className="col-md-6">{renderInputField("Last Name", "lastName", formData.lastName)}</div>
                        </div>

                        <div className="row">
                            <div className="col-md-6">
                                {renderSelectField("Gender", "gender", formData.gender, [
                                    { value: "Male", label: "Male" },
                                    { value: "Female", label: "Female" },
                                    { value: "Other", label: "Other" },
                                ])}
                            </div>
                            <div className="col-md-6">{renderInputField("Care Of", "co", formData.co)}</div>
                        </div>

                        <div className="row">
                            <div className="col-md-6">
                                {renderInputField("Date of Birth", "dateOfBirth", formData.dateOfBirth, "date", "", {
                                    min: DOB_MIN,
                                    max: DOB_MAX,
                                })}
                            </div>
                            <div className="col-md-6">{renderInputField("Age", "years", formData.years, "number")}</div>
                        </div>

                        <div className="row">
                            <div className="col-md-6">
                                {renderInputField("Aadhar No", "aadharNo", formData.aadharNo, "tel", "", {
                                    inputMode: "numeric",
                                    maxLength: 12,
                                    pattern: "^[0-9]{12}$",
                                })}
                            </div>
                            <div className="col-md-6">{renderInputField("Local ID", "localId", formData.localId)}</div>
                        </div>

                        <div className="row">
                            <div className="col-md-6">{renderPhoneField("Mobile 1", "mobileNo1", formData.mobileNo1)}</div>
                            <div className="col-md-6">{renderPhoneField("Mobile 2", "mobileNo2", formData.mobileNo2)}</div>
                        </div>

                        <div className="row">
                            <div className="col-md-6">
                                {renderInputField("Date of Joining", "date", formData.date || formData.dateOfJoining, "date")}
                            </div>
                            <div className="col-md-6">{renderInputField("Page No", "pageNo", formData.pageNo)}</div>
                        </div>

                        <div className="row">
                            <div className="col-md-6">{renderInputField("Basic Salary", "basicSalary", formData.basicSalary, "number")}</div>
                            <div className="col-md-6">{renderInputField("Allowance", "allowance", formData.allowance, "number")}</div>
                        </div>
                    </div>

                    <div className="row">
                        <div className="col-md-12 history-section">
                            <label className="form-label">
                                <strong>About Employee & Skills</strong>
                            </label>
                            {canEdit ? (
                                <textarea
                                    className="form-control"
                                    name="aboutEmployeee"
                                    value={formData.aboutEmployeee || ""}
                                    onChange={handleInputChange}
                                    rows="3"
                                />
                            ) : (
                                <div className="form-control bg-light">{String(formData.aboutEmployeee || "N/A")}</div>
                            )}
                        </div>
                    </div>
                    
                    <div className="row mt-3">
                        <h5>Return / Remove comments</h5>
                        <div className="history-section mb-3">
                            {renderHistoryComments()}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BasicInfo;