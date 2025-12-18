import React from "react";

const WorkingTab = ({ 
    formData, 
    isEditMode, 
    workErrors, 
    Err, 
    handleArrayChange, 
    removeWorkSection, 
    addWorkSection 
}) => {
    return (
        <div className="modal-card ">
            <div className="modal-card-header">
                <h4 className="mb-0">Working Details</h4>
            </div>
            <div className="modal-card-body">
                {(formData.workDetails || []).map((w, i) => {
                    const locked = !!w.__locked;
                    const invalidClass = (field) => (workErrors[i]?.[field] ? " is-invalid" : "");
                    return (
                        <div key={i} className="border rounded p-3 ">
                            <div className="d-flex justify-content-between align-items-center mb-2">
                                <h6 className="mb-0">
                                    Work #{i + 1} {locked && <span className="badge bg-secondary ms-2">Locked</span>}
                                </h6>
                                {isEditMode && !locked && (
                                    <button className="btn btn-outline-danger btn-sm" onClick={() => removeWorkSection(i)}>
                                        Remove
                                    </button>
                                )}
                            </div>

                            <div className="row">
                                <div className="col-md-4 mb-2">
                                    <label className="form-label">
                                        <strong>Client ID</strong>
                                        <span className="star">*</span>
                                    </label>
                                    {isEditMode ? (
                                        <input
                                            type="text"
                                            className={`form-control form-control-sm${invalidClass("clientId")}`}
                                            value={w.clientId || ""}
                                            onChange={(e) => handleArrayChange("workDetails", i, "clientId", e.target.value)}
                                            disabled={locked}
                                        />
                                    ) : (
                                        <div className="form-control form-control-sm bg-light">{w.clientId || "N/A"}</div>
                                    )}
                                    <Err msg={workErrors[i]?.clientId} />
                                </div>

                                <div className="col-md-4 mb-2">
                                    <label className="form-label">
                                        <strong>Client Name</strong>
                                        <span className="star">*</span>
                                    </label>
                                    {isEditMode ? (
                                        <input
                                            type="text"
                                            className={`form-control form-control-sm${invalidClass("clientName")}`}
                                            value={w.clientName || ""}
                                            onChange={(e) => handleArrayChange("workDetails", i, "clientName", e.target.value)}
                                            disabled={locked}
                                        />
                                    ) : (
                                        <div className="form-control form-control-sm bg-light">{w.clientName || "N/A"}</div>
                                    )}
                                    <Err msg={workErrors[i]?.clientName} />
                                </div>

                                <div className="col-md-4 mb-2">
                                    <label className="form-label">
                                        <strong>Location</strong>
                                    </label>
                                    {isEditMode ? (
                                        <input
                                            type="text"
                                            className="form-control form-control-sm"
                                            value={w.location || ""}
                                            onChange={(e) => handleArrayChange("workDetails", i, "location", e.target.value)}
                                            disabled={locked}
                                        />
                                    ) : (
                                        <div className="form-control form-control-sm bg-light">{w.location || "N/A"}</div>
                                    )}
                                </div>
                            </div>

                            <div className="row">
                                <div className="col-md-4 mb-2">
                                    <label className="form-label">
                                        <strong>Days</strong>
                                        <span className="star">*</span>
                                    </label>
                                    {isEditMode ? (
                                        <input
                                            type="number"
                                            className={`form-control form-control-sm${invalidClass("days")}`}
                                            value={w.days || ""}
                                            onChange={(e) => handleArrayChange("workDetails", i, "days", e.target.value)}
                                            disabled={locked}
                                        />
                                    ) : (
                                        <div className="form-control form-control-sm bg-light">{w.days || "N/A"}</div>
                                    )}
                                    <Err msg={workErrors[i]?.days} />
                                </div>

                                <div className="col-md-4 mb-2">
                                    <label className="form-label">
                                        <strong>From Date</strong>
                                        <span className="star">*</span>
                                    </label>
                                    {isEditMode ? (
                                        <input
                                            type="date"
                                            className={`form-control form-control-sm${invalidClass("fromDate")}`}
                                            value={w.fromDate || ""}
                                            onChange={(e) => handleArrayChange("workDetails", i, "fromDate", e.target.value)}
                                            disabled={locked}
                                        />
                                    ) : (
                                        <div className="form-control form-control-sm bg-light">{w.fromDate || "N/A"}</div>
                                    )}
                                    <Err msg={workErrors[i]?.fromDate} />
                                </div>

                                <div className="col-md-4 mb-2">
                                    <label className="form-label">
                                        <strong>To Date</strong>
                                        <span className="star">*</span>
                                    </label>
                                    {isEditMode ? (
                                        <input
                                            type="date"
                                            className={`form-control form-control-sm${invalidClass("toDate")}`}
                                            value={w.toDate || ""}
                                            onChange={(e) => handleArrayChange("workDetails", i, "toDate", e.target.value)}
                                            disabled={locked}
                                        />
                                    ) : (
                                        <div className="form-control form-control-sm bg-light">{w.toDate || "N/A"}</div>
                                    )}
                                    <Err msg={workErrors[i]?.toDate} />
                                </div>
                            </div>

                            <div className="row">
                                <div className="col-md-6 mb-2">
                                    <label className="form-label">
                                        <strong>Service Type</strong>
                                        <span className="star">*</span>
                                    </label>
                                    {isEditMode ? (
                                        <input
                                            type="text"
                                            className={`form-control form-control-sm${invalidClass("serviceType")}`}
                                            value={w.serviceType || ""}
                                            onChange={(e) => handleArrayChange("workDetails", i, "serviceType", e.target.value)}
                                            disabled={locked}
                                        />
                                    ) : (
                                        <div className="form-control form-control-sm bg-light">{w.serviceType || "N/A"}</div>
                                    )}
                                    <Err msg={workErrors[i]?.serviceType} />
                                </div>

                                <div className="col-md-6 mb-2">
                                    <label className="form-label">
                                        <strong>Remarks</strong>
                                    </label>
                                    {isEditMode ? (
                                        <input
                                            type="text"
                                            className="form-control form-control-sm"
                                            value={w.remarks || ""}
                                            onChange={(e) => handleArrayChange("workDetails", i, "remarks", e.target.value)}
                                            disabled={locked}
                                        />
                                    ) : (
                                        <div className="form-control form-control-sm bg-light">{w.remarks || "N/A"}</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}

                {isEditMode && (
                    <div className="d-flex justify-content-end">
                        <button className="btn btn-outline-primary btn-sm mt-2" onClick={addWorkSection}>
                            + Add Work
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default WorkingTab;