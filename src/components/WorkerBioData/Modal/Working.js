import React, { useState } from "react";

const Working = ({
    formData,
    setFormData,
    canEdit,
    effectiveUserName,
    formatDDMMYY,
    formatTime12h,
    setHasUnsavedChanges
}) => {
    const [showWorkForm, setShowWorkForm] = useState(false);
    const [editingWorkIndex, setEditingWorkIndex] = useState(null);
    const [editWorkDraft, setEditWorkDraft] = useState({ toDate: "", days: "", remarks: "" });
    const [newWork, setNewWork] = useState({
        clientId: "",
        clientName: "",
        location: "",
        days: "",
        fromDate: "",
        toDate: "",
        serviceType: "",
        remarks: "",
        __locked: false,
    });

    const updateNewWork = (field, val) =>
        setNewWork((w) => ({ ...w, [field]: val }));

    const resetWorkDraft = () => setNewWork({
        clientId: "",
        clientName: "",
        location: "",
        days: "",
        fromDate: "",
        toDate: "",
        serviceType: "",
        remarks: "",
        __locked: false,
    });

    const validateNewWork = () => {
        const e = {};
        if (!newWork.clientId) e.clientId = "Client ID required";
        if (!newWork.clientName) e.clientName = "Client name required";
        if (!newWork.fromDate) e.fromDate = "From date required";
        if (newWork.fromDate && newWork.toDate && new Date(newWork.fromDate) > new Date(newWork.toDate)) {
            e.toDate = "To date must be after From date";
        }
        if (!newWork.serviceType) e.serviceType = "Service type required";
        return e;
    };

    const addWorkFromForm = () => {
        const errs = validateNewWork();
        if (Object.keys(errs).length) {
            alert("Fix Work Form: " + Object.values(errs).join(", "));
            return;
        }
        
        const stampAuthorOnRow = (row) => ({
            ...row,
            addedByName: effectiveUserName,
            addedAt: new Date().toISOString(),
            createdByName: effectiveUserName,
            createdAt: new Date().toISOString(),
        });

        const row = stampAuthorOnRow(newWork);
        setFormData((prev) => ({
            ...prev,
            workDetails: [...(prev.workDetails || []), { ...row }]
        }));
        setHasUnsavedChanges(true);
        setShowWorkForm(false);
        resetWorkDraft();
    };

    const startEditWork = (idx) => {
        const w = (formData.workDetails || [])[idx] || {};
        setEditWorkDraft({
            toDate: w.toDate || "",
            days: (w.days ?? "").toString(),
            remarks: w.remarks || ""
        });
        setEditingWorkIndex(idx);
    };

    const cancelEditWork = () => {
        setEditingWorkIndex(null);
        setEditWorkDraft({ toDate: "", days: "", remarks: "" });
    };

    const saveEditWork = () => {
        if (editingWorkIndex == null) return;
        setFormData(prev => {
            const arr = [...(prev.workDetails || [])];
            const w = { ...arr[editingWorkIndex] };

            if (editWorkDraft.toDate !== "") w.toDate = editWorkDraft.toDate;
            if (editWorkDraft.days !== "") w.days = editWorkDraft.days.replace(/\D/g, "");
            w.remarks = editWorkDraft.remarks;

            arr[editingWorkIndex] = w;
            return { ...prev, workDetails: arr };
        });
        setHasUnsavedChanges(true);
        cancelEditWork();
    };

    const removeWorkSection = (index) => {
        setFormData((prev) => {
            const list = [...(prev.workDetails || [])];
            if (list[index]?.__locked) return prev;
            list.splice(index, 1);
            return { ...prev, workDetails: list.length ? list : [] };
        });
        setHasUnsavedChanges(true);
    };

    return (
        <div className="modal-card mt-3">
            <div className="modal-card-header d-flex justify-content-between align-items-center">
                <strong>Working</strong>
                {canEdit && (
                    <button
                        type="button"
                        className="btn btn-outline-primary btn-sm"
                        onClick={() => setShowWorkForm((s) => !s)}
                    >
                        {showWorkForm ? "Close" : "+ Add Work"}
                    </button>
                )}
            </div>

            <div className="modal-card-body">
                {canEdit && showWorkForm && (
                    <div className="border rounded p-3 mb-3 bg-light">
                        <div className="row">
                            <div className="col-md-3 mb-2">
                                <label className="form-label"><strong>Client ID</strong><span className="star">*</span></label>
                                <input
                                    className="form-control form-control-sm"
                                    value={newWork.clientId || ""}
                                    onChange={(e) => updateNewWork("clientId", e.target.value)}
                                />
                            </div>
                            <div className="col-md-3 mb-2">
                                <label className="form-label"><strong>Client Name</strong><span className="star">*</span></label>
                                <input
                                    className="form-control form-control-sm"
                                    value={newWork.clientName || ""}
                                    onChange={(e) => updateNewWork("clientName", e.target.value)}
                                />
                            </div>
                            <div className="col-md-3 mb-2">
                                <label className="form-label"><strong>Location</strong></label>
                                <input
                                    className="form-control form-control-sm"
                                    value={newWork.location || ""}
                                    onChange={(e) => updateNewWork("location", e.target.value)}
                                />
                            </div>
                            <div className="col-md-3 mb-2">
                                <label className="form-label"><strong>Days</strong> </label>
                                <input
                                    className="form-control form-control-sm"
                                    value={newWork.days || ""}
                                    onChange={(e) => updateNewWork("days", e.target.value.replace(/\D/g, ""))}
                                />
                            </div>
                        </div>

                        <div className="row">
                            <div className="col-md-3 mb-2">
                                <label className="form-label"><strong>From</strong><span className="star">*</span></label>
                                <input
                                    type="date"
                                    className="form-control form-control-sm"
                                    value={newWork.fromDate || ""}
                                    onChange={(e) => updateNewWork("fromDate", e.target.value)}
                                />
                            </div>
                            <div className="col-md-3 mb-2">
                                <label className="form-label"><strong>To</strong> </label>
                                <input
                                    type="date"
                                    className="form-control form-control-sm"
                                    value={newWork.toDate || ""}
                                    onChange={(e) => updateNewWork("toDate", e.target.value)}
                                />
                            </div>
                            <div className="col-md-3 mb-2">
                                <label className="form-label"><strong>Service Type</strong><span className="star">*</span></label>
                                <input
                                    className="form-control form-control-sm"
                                    value={newWork.serviceType || ""}
                                    onChange={(e) => updateNewWork("serviceType", e.target.value)}
                                />
                            </div>
                            <div className="col-md-3 mb-2">
                                <label className="form-label"><strong>Remarks</strong></label>
                                <textarea
                                    className="form-control form-control-sm"
                                    value={newWork.remarks || ""}
                                    onChange={(e) => updateNewWork("remarks", e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="d-flex gap-2 justify-content-end">
                            <button className="btn btn-secondary btn-sm" onClick={() => { setShowWorkForm(false); resetWorkDraft(); }}>
                                Cancel
                            </button>
                            <button className="btn btn-primary btn-sm" onClick={addWorkFromForm}>
                                Save Work
                            </button>
                        </div>
                    </div>
                )}

                {(formData.workDetails?.length ?? 0) === 0 ? (
                    <div className="text-muted text-center">No work entries added yet.</div>
                ) : (
                    <div className="table-responsive">
                        <table className="table table-sm table-bordered align-middle">
                            <thead className="table-dark">
                                <tr>
                                    <th>#</th>
                                    <th>Client ID</th>
                                    <th>Client Name</th>
                                    <th>Location</th>
                                    <th>Days</th>
                                    <th>From</th>
                                    <th>To</th>
                                    <th>Service Type</th>
                                    <th>Remarks</th>
                                    <th>Added By</th>
                                    {canEdit && <th>Action</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {(formData.workDetails || []).map((w, i) => (
                                    <tr key={i}>
                                        <td>{i + 1}</td>
                                        <td>{w.clientId || "—"}</td>
                                        <td>{w.clientName || "—"}</td>
                                        <td>{w.location || "—"}</td>
                                        <td>{w.days || "—"}</td>
                                        <td>{w.fromDate || "—"}</td>
                                        <td>{w.toDate || "—"}</td>
                                        <td>{w.serviceType || "—"}</td>
                                        <td style={{ maxWidth: 240, whiteSpace: 'pre-wrap' }}>{w.remarks || "—"}</td>
                                        <td className="small text-muted">
                                            {(w.addedByName || w.createdByName || effectiveUserName)}<br />
                                            <span>{formatDDMMYY(w.addedAt || w.createdAt)} {formatTime12h(w.addedAt || w.createdAt)}</span>
                                        </td>
                                        {canEdit && (
                                            <td>
                                                {!w.__locked ? (
                                                    <button
                                                        className="btn btn-outline-warning btn-sm"
                                                        onClick={() => startEditWork(i)}
                                                    >
                                                        Edit
                                                    </button>
                                                ) : (
                                                    <span className="badge bg-secondary">Locked</span>
                                                )}
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Inline edit panel */}
                        {canEdit && editingWorkIndex != null && (
                            <div className="border rounded p-3 mt-3 bg-light">
                                <div className="d-flex justify-content-between align-items-center mb-2">
                                    <strong>Edit Work (Row #{editingWorkIndex + 1})</strong>
                                    <small className="text-muted">
                                        You can edit <em>To date</em>, <em>Days</em>, and <em>Remarks</em> only.
                                    </small>
                                </div>

                                <div className="row">
                                    <div className="col-md-3 mb-2">
                                        <label className="form-label"><strong>To date</strong> <small className="text-muted">(optional)</small></label>
                                        <input
                                            type="date"
                                            className="form-control form-control-sm"
                                            value={editWorkDraft.toDate || ""}
                                            onChange={(e) => setEditWorkDraft(d => ({ ...d, toDate: e.target.value }))}
                                        />
                                    </div>

                                    <div className="col-md-3 mb-2">
                                        <label className="form-label"><strong>Days</strong> <small className="text-muted">(optional)</small></label>
                                        <input
                                            className="form-control form-control-sm"
                                            value={editWorkDraft.days || ""}
                                            onChange={(e) =>
                                                setEditWorkDraft(d => ({ ...d, days: e.target.value.replace(/\D/g, "") }))
                                            }
                                            maxLength={2}
                                            inputMode="numeric"
                                        />
                                    </div>

                                    <div className="col-md-6 mb-2">
                                        <label className="form-label"><strong>Remarks</strong></label>
                                        <input
                                            className="form-control form-control-sm"
                                            value={editWorkDraft.remarks || ""}
                                            onChange={(e) => setEditWorkDraft(d => ({ ...d, remarks: e.target.value }))}
                                        />
                                    </div>
                                </div>

                                <div className="d-flex gap-2 justify-content-end">
                                    <button className="btn btn-secondary btn-sm" onClick={cancelEditWork}>Cancel</button>
                                    <button className="btn btn-primary btn-sm" onClick={saveEditWork}>Save</button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Working;