import React, { useState, useEffect } from "react";

const lockRows = (arr) =>
    (Array.isArray(arr) ? arr : []).map((r) => ({ ...r, __locked: true }));

const stripLocks = (obj) => {
    const clone = JSON.parse(JSON.stringify(obj));
    if (Array.isArray(clone.workers)) {
        clone.workers = clone.workers.map(({ __locked, ...rest }) => rest);
    }
    if (Array.isArray(clone.payments)) {
        clone.payments = clone.payments.map(({ __locked, ...rest }) => rest);
    }
    return clone;
};

const ClientModal = ({ client, isOpen, onClose, onSave, onDelete, isEditMode }) => {
    const [formData, setFormData] = useState({});
    const [activeTab, setActiveTab] = useState("basic");
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Initialize + lock existing rows
    useEffect(() => {
        if (!client) return;
        setFormData((prev) => ({
            ...client,
            workers: lockRows(client.workers),
            payments: lockRows(client.payments),
        }));
    }, [client]);

    const handleChange = (e, section, index = null) => {
        const { name, value } = e.target;

        // Nested arrays
        if (index !== null && (section === "workers" || section === "payments")) {
            setFormData((prev) => {
                const list = Array.isArray(prev[section]) ? [...prev[section]] : [];
                const row = list[index] || {};

                // hard-stop edits to locked rows (safety net)
                if (row.__locked && isEditMode) return prev;

                list[index] = { ...row, [name]: value };
                return { ...prev, [section]: list };
            });
            return;
        }

        // Top-level fields
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const payload = stripLocks(formData);
        onSave(payload);
    };

    const addWorker = () => {
        const newWorker = {
            workerIdNo: "",
            cName: "",
            basicSalary: "",
            startingDate: "",
            endingDate: "",
            mobile1: "",
            mobile2: "",
            remarks: "",
            __locked: false, // new rows are editable
        };
        setFormData((prev) => ({
            ...prev,
            workers: [...(prev.workers || []), newWorker],
        }));
    };

    const removeWorker = (index) => {
        setFormData((prev) => {
            const list = [...(prev.workers || [])];
            const row = list[index];
            if (row?.__locked) return prev; // don't remove locked rows
            list.splice(index, 1);
            return { ...prev, workers: list };
        });
    };

    const addPayment = () => {
        const newPayment = {
            paymentMethod: "cash",
            amount: "",        // <-- NEW field
            balance: "",
            receptNo: "",
            remarks: "",
            reminderDate: "",
            __locked: false, // new rows are editable
        };
        setFormData((prev) => ({
            ...prev,
            payments: [...(prev.payments || []), newPayment],
        }));
    };

    const removePayment = (index) => {
        setFormData((prev) => {
            const list = [...(prev.payments || [])];
            const row = list[index];
            if (row?.__locked) return prev; // don't remove locked rows
            list.splice(index, 1);
            return { ...prev, payments: list };
        });
    };

    const handleDeleteClick = () => setShowDeleteConfirm(true);

    const confirmDelete = () => {
        onDelete(client.id, true); // move to ExistClients
        setShowDeleteConfirm(false);
    };

    const cancelDelete = () => setShowDeleteConfirm(false);

    if (!isOpen) return null;

    return (
        <div className="modal fade show" style={{ display: "block", backgroundColor: "rgba(0,0,0,0.5)" }}>
            <div className="modal-dialog modal-xl modal-dialog-centered">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">
                            {isEditMode ? "Edit Client" : "View Client"} - {formData.idNo} - {formData.clientName}
                        </h5>
                        <button type="button" className="btn-close" onClick={onClose}></button>
                    </div>

                    <div className="modal-body">
                        {/* Tabs */}
                        <ul className="nav nav-tabs" role="tablist">
                            {[
                                ["basic", "Basic Info"],
                                ["address", "Address"],
                                ["service", "Service Details"],
                                ["patient", "Patient Details"],
                                ["workers", `Workers (${formData.workers?.length || 0})`],
                                ["payments", `Payments (${formData.payments?.length || 0})`],
                            ].map(([key, label]) => (
                                <li key={key} className="nav-item" role="presentation">
                                    <button
                                        className={`nav-link ${activeTab === key ? "active" : ""}`}
                                        onClick={() => setActiveTab(key)}
                                    >
                                        {label}
                                    </button>
                                </li>
                            ))}
                        </ul>

                        <div className="tab-content p-3">
                            {/* Basic */}
                            {activeTab === "basic" && (
                                <div className="row">
                                    <div className="row">

                                        <div className="col-md-4">
                                            <div className="mb-3">
                                                <label className="form-label">ID No</label>
                                                <input type="text" className="form-control" value={formData.idNo || ""} disabled />
                                            </div>
                                        </div>
                                        <div className="col-md-4">
                                            <div className="mb-3">
                                                <label className="form-label">Client Name *</label>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    name="clientName"
                                                    value={formData.clientName || ""}
                                                    onChange={handleChange}
                                                    disabled={!isEditMode}
                                                />
                                            </div>
                                        </div>
                                        <div className="col-md-4">
                                            <div className="mb-3">
                                                <label className="form-label">Gender *</label>
                                                <select
                                                    className="form-control"
                                                    name="gender"
                                                    value={formData.gender || ""}
                                                    onChange={handleChange}
                                                    disabled={!isEditMode}
                                                >
                                                    <option value="">Select Gender</option>
                                                    <option value="Male">Male</option>
                                                    <option value="Female">Female</option>
                                                    <option value="Other">Other</option>
                                                </select>
                                            </div>
                                        </div>

                                    </div>
                                    <div className="row">
                                        <div className="col-md-4">
                                            <div className="mb-3">
                                                <label className="form-label">Care Of</label>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    name="careOf"
                                                    value={formData.careOf || ""}
                                                    onChange={handleChange}
                                                    disabled={!isEditMode}
                                                />
                                            </div>
                                        </div>
                                        <div className="col-md-4">
                                            <div className="mb-3">
                                                <label className="form-label">Location *</label>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    name="location"
                                                    value={formData.location || ""}
                                                    onChange={handleChange}
                                                    disabled={!isEditMode}
                                                />
                                            </div>
                                        </div>
                                        <div className="col-md-4">
                                            <div className="mb-3">
                                                <label className="form-label">Mobile No 1 *</label>
                                                <input
                                                    type="tel"
                                                    className="form-control"
                                                    name="mobileNo1"
                                                    value={formData.mobileNo1 || ""}
                                                    onChange={handleChange}
                                                    disabled={!isEditMode}
                                                    maxLength="10"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="row">
                                        <div className="col-md-4">
                                            <div className="mb-3">
                                                <label className="form-label">Mobile No 2</label>
                                                <input
                                                    type="tel"
                                                    className="form-control"
                                                    name="mobileNo2"
                                                    value={formData.mobileNo2 || ""}
                                                    onChange={handleChange}
                                                    disabled={!isEditMode}
                                                    maxLength="10"
                                                />
                                            </div>
                                        </div>
                                        <div className="col-md-4"></div>
                                        <div className="col-md-4"></div>
                                    </div>
                                </div>
                            )}

                            {/* Address */}
                            {activeTab === "address" && (
                                <div className="row">
                                    <div className="col-md-4">
                                        <div className="mb-3">
                                            <label className="form-label">Door No *</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                name="dNo"
                                                value={formData.dNo || ""}
                                                onChange={handleChange}
                                                disabled={!isEditMode}
                                            />
                                        </div>
                                    </div>
                                    <div className="col-md-4">
                                        <div className="mb-3">
                                            <label className="form-label">Landmark</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                name="landMark"
                                                value={formData.landMark || ""}
                                                onChange={handleChange}
                                                disabled={!isEditMode}
                                            />
                                        </div>
                                    </div>
                                    <div className="col-md-4">
                                        <div className="mb-3">
                                            <label className="form-label">Street</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                name="street"
                                                value={formData.street || ""}
                                                onChange={handleChange}
                                                disabled={!isEditMode}
                                            />
                                        </div>
                                    </div>

                                    <div className="row">

                                        <div className="col-md-4">
                                            <div className="mb-3">
                                                <label className="form-label">Village/Town *</label>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    name="villageTown"
                                                    value={formData.villageTown || ""}
                                                    onChange={handleChange}
                                                    disabled={!isEditMode}
                                                />
                                            </div>
                                        </div>
                                        <div className="col-md-4">
                                            <div className="mb-3">
                                                <label className="form-label">Mandal *</label>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    name="mandal"
                                                    value={formData.mandal || ""}
                                                    onChange={handleChange}
                                                    disabled={!isEditMode}
                                                />
                                            </div>
                                        </div>
                                        <div className="col-md-4">
                                            <div className="mb-3">
                                                <label className="form-label">District *</label>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    name="district"
                                                    value={formData.district || ""}
                                                    onChange={handleChange}
                                                    disabled={!isEditMode}
                                                />
                                            </div>
                                        </div>


                                    </div>
                                    <div className="row">
                                        <div className="col-md-4">
                                            <div className="mb-3">
                                                <label className="form-label">State *</label>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    name="state"
                                                    value={formData.state || ""}
                                                    onChange={handleChange}
                                                    disabled={!isEditMode}
                                                />
                                            </div>
                                        </div>
                                        <div className="col-md-4">
                                            <div className="mb-3">
                                                <label className="form-label">Pincode *</label>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    name="pincode"
                                                    value={formData.pincode || ""}
                                                    onChange={handleChange}
                                                    disabled={!isEditMode}
                                                    maxLength="6"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Service */}
                            {activeTab === "service" && (
                                <div className="row">

                                    <div className="col-md-4">
                                        <div className="mb-3">
                                            <label className="form-label">Type of Service *</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                name="typeOfService"
                                                value={formData.typeOfService || ""}
                                                onChange={handleChange}
                                                disabled={!isEditMode}
                                            />
                                        </div>
                                    </div>
                                    <div className="col-md-4">
                                        <div className="mb-3">
                                            <label className="form-label">Service Charges *</label>
                                            <input
                                                type="number"
                                                className="form-control"
                                                name="serviceCharges"
                                                value={formData.serviceCharges || ""}
                                                onChange={handleChange}
                                                disabled={!isEditMode}
                                            />
                                        </div>
                                    </div>
                                    <div className="col-md-4">
                                        <div className="mb-3">
                                            <label className="form-label">Service Period *</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                name="servicePeriod"
                                                value={formData.servicePeriod || ""}
                                                onChange={handleChange}
                                                disabled={!isEditMode}
                                            />
                                        </div>
                                    </div>


                                    <div className="row">
                                        <div className="col-md-4">
                                            <div className="mb-3">
                                                <label className="form-label">Travelling Charges</label>
                                                <input
                                                    type="number"
                                                    className="form-control"
                                                    name="travellingCharges"
                                                    value={formData.travellingCharges || ""}
                                                    onChange={handleChange}
                                                    disabled={!isEditMode}
                                                />
                                            </div>
                                        </div>
                                        <div className="col-md-4">
                                            <div className="mb-3">
                                                <label className="form-label">Service Status *</label>
                                                <select
                                                    className="form-control"
                                                    name="serviceStatus"
                                                    value={formData.serviceStatus || ""}
                                                    onChange={handleChange}
                                                    disabled={!isEditMode}
                                                >
                                                    <option value="">Select Status</option>
                                                    <option value="running">Running</option>
                                                    <option value="closed">Closed</option>
                                                    <option value="stop">Stop</option>
                                                    <option value="re-open">Re-open</option>
                                                    <option value="re-start">Re-start</option>
                                                    <option value="re-place">Re-place</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="col-md-4">
                                            <div className="mb-3">
                                                <label className="form-label">Gap If Any</label>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    name="gapIfAny"
                                                    value={formData.gapIfAny || ""}
                                                    onChange={handleChange}
                                                    disabled={!isEditMode}
                                                />
                                            </div>
                                        </div>

                                    </div>

                                    <div className="row">
                                        <div className="col-md-4">
                                            <div className="mb-3">
                                                <label className="form-label">Starting Date *</label>
                                                <input
                                                    type="date"
                                                    className="form-control"
                                                    name="startingDate"
                                                    value={formData.startingDate || ""}
                                                    onChange={handleChange}
                                                    disabled={!isEditMode}
                                                />
                                            </div>
                                        </div>
                                        <div className="col-md-4">
                                            <div className="mb-3">
                                                <label className="form-label">Ending Date</label>
                                                <input
                                                    type="date"
                                                    className="form-control"
                                                    name="endingDate"
                                                    value={formData.endingDate || ""}
                                                    onChange={handleChange}
                                                    disabled={!isEditMode}
                                                />
                                            </div>
                                        </div>
                                        <div className="col-md-4">
                                            <div className="mb-3">
                                                <label className="form-label">Page No *</label>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    name="pageNo"
                                                    value={formData.pageNo || ""}
                                                    onChange={handleChange}
                                                    disabled={!isEditMode}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                </div>
                            )}

                            {/* Patient */}
                            {activeTab === "patient" && (


                                <div className="row">
                                    <div className="col-md-4">
                                        <div className="mb-3">
                                            <label className="form-label">Patient Name *</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                name="patientName"
                                                value={formData.patientName || ""}
                                                onChange={handleChange}
                                                disabled={!isEditMode}
                                            />
                                        </div>

                                    </div>

                                    <div className="col-md-4">
                                        <div className="mb-3">
                                            <label className="form-label">Patient Age *</label>
                                            <input
                                                type="number"
                                                className="form-control"
                                                name="patentAge"
                                                value={formData.patentAge || ""}
                                                onChange={handleChange}
                                                disabled={!isEditMode}
                                            />
                                        </div>

                                    </div>
                                    <div className="col-md-4">
                                        <div className="mb-3">
                                            <label className="form-label">Dropper Name *</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                name="dropperName"
                                                value={formData.dropperName || ""}
                                                onChange={handleChange}
                                                disabled={!isEditMode}
                                            />
                                        </div>
                                    </div>

                                    <div className="col-md-6">
                                        <div className="mb-3">
                                            <label className="form-label">About Patient *</label>
                                            <textarea
                                                className="form-control"
                                                name="aboutPatent"
                                                value={formData.aboutPatent || ""}
                                                onChange={handleChange}
                                                disabled={!isEditMode}
                                                rows="4"
                                            />
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <div className="mb-3">
                                            <label className="form-label">About Work *</label>
                                            <textarea
                                                className="form-control"
                                                name="aboutWork"
                                                value={formData.aboutWork || ""}
                                                onChange={handleChange}
                                                disabled={!isEditMode}
                                                rows="4"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Workers */}
                            {activeTab === "workers" && (
                                <div>
                                    {formData.workers?.map((worker, index) => {
                                        const isLocked = !!worker.__locked && isEditMode;
                                        return (
                                            <div key={index} className="modal-card mb-3">
                                                <div className="modal-card-header d-flex justify-content-between align-items-center">
                                                    <h6 className="mb-0">
                                                        Worker #{index + 1} {isLocked && <span className="badge bg-secondary ms-2">Existing (locked)</span>}
                                                    </h6>

                                                    {isEditMode && !isLocked && (formData.workers?.length || 0) > 1 && (
                                                        <button type="button" className="btn btn-danger btn-sm" onClick={() => removeWorker(index)}>
                                                            Remove
                                                        </button>
                                                    )}
                                                </div>

                                                <div className="modal-card-body">
                                                    <div className="row">
                                                        <div className="col-md-4">
                                                            <div className="mb-3">
                                                                <label className="form-label">Worker ID No *</label>
                                                                <input
                                                                    type="text"
                                                                    className="form-control"
                                                                    name="workerIdNo"
                                                                    value={worker.workerIdNo || ""}
                                                                    onChange={(e) => handleChange(e, "workers", index)}
                                                                    disabled={!isEditMode || isLocked}
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="col-md-4">
                                                            <div className="mb-3">
                                                                <label className="form-label">Name *</label>
                                                                <input
                                                                    type="text"
                                                                    className="form-control"
                                                                    name="cName"
                                                                    value={worker.cName || ""}
                                                                    onChange={(e) => handleChange(e, "workers", index)}
                                                                    disabled={!isEditMode || isLocked}
                                                                />
                                                            </div>
                                                        </div>

                                                        <div className="col-md-4">
                                                            <div className="mb-3">
                                                                <label className="form-label">Basic Salary *</label>
                                                                <input
                                                                    type="number"
                                                                    className="form-control"
                                                                    name="basicSalary"
                                                                    value={worker.basicSalary || ""}
                                                                    onChange={(e) => handleChange(e, "workers", index)}
                                                                    disabled={!isEditMode || isLocked}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="row">
                                                        <div className="col-md-4">
                                                            <div className="mb-3">
                                                                <label className="form-label">Starting Date *</label>
                                                                <input
                                                                    type="date"
                                                                    className="form-control"
                                                                    name="startingDate"
                                                                    value={worker.startingDate || ""}
                                                                    onChange={(e) => handleChange(e, "workers", index)}
                                                                    disabled={!isEditMode || isLocked}
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="col-md-4">
                                                            <div className="mb-3">
                                                                <label className="form-label">Ending Date</label>
                                                                <input
                                                                    type="date"
                                                                    className="form-control"
                                                                    name="endingDate"
                                                                    value={worker.endingDate || ""}
                                                                    onChange={(e) => handleChange(e, "workers", index)}
                                                                    disabled={!isEditMode || isLocked}
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="col-md-4">
                                                            <div className="mb-3">
                                                                <label className="form-label">Mobile 1 *</label>
                                                                <input
                                                                    type="tel"
                                                                    className="form-control"
                                                                    name="mobile1"
                                                                    value={worker.mobile1 || ""}
                                                                    onChange={(e) => handleChange(e, "workers", index)}
                                                                    disabled={!isEditMode || isLocked}
                                                                    maxLength="10"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="row">
                                                        <div className="col-md-12">
                                                            <div className="mb-3">
                                                                <label className="form-label">Remarks</label>
                                                                <textarea
                                                                    type="text"
                                                                    className="form-control"
                                                                    name="remarks"
                                                                    value={worker.remarks || ""}
                                                                    onChange={(e) => handleChange(e, "workers", index)}
                                                                    disabled={!isEditMode || isLocked}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {isEditMode && (
                                        <button type="button" className="btn btn-primary" onClick={addWorker}>
                                            Add New Worker
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* Payments */}
                            {activeTab === "payments" && (
                                <div>
                                    {formData.payments?.map((payment, index) => {
                                        const isLocked = !!payment.__locked && isEditMode;
                                        return (
                                            <div key={index} className="modal-card mb-3">
                                                <div className="modal-card-header d-flex justify-content-between align-items-center">
                                                    <h6 className="mb-0">
                                                        Payment #{index + 1} {isLocked && <span className="badge bg-secondary ms-2">Existing (locked)</span>}
                                                    </h6>

                                                    {isEditMode && !isLocked && (formData.payments?.length || 0) > 1 && (
                                                        <button type="button" className="btn btn-danger btn-sm" onClick={() => removePayment(index)}>
                                                            Remove
                                                        </button>
                                                    )}
                                                </div>

                                                <div className="modal-card-body">
                                                    {/* Row: Payment Method, Amount, Balance */}
                                                    <div className="row">
                                                        <div className="col-md-4">
                                                            <div className="mb-3">
                                                                <label className="form-label">Payment Method *</label>
                                                                <div>
                                                                    {["cash", "online", "check"].map((opt) => (
                                                                        <div key={opt} className="form-check form-check-inline">
                                                                            <input
                                                                                type="radio"
                                                                                className="form-check-input"
                                                                                name={`paymentMethod-${index}`} // unique group per row
                                                                                value={opt}
                                                                                checked={payment.paymentMethod === opt}
                                                                                onChange={() =>
                                                                                    handleChange(
                                                                                        { target: { name: "paymentMethod", value: opt } },
                                                                                        "payments",
                                                                                        index
                                                                                    )
                                                                                }
                                                                                disabled={!isEditMode || isLocked}
                                                                            />
                                                                            <label className="form-check-label" style={{ textTransform: "capitalize" }}>
                                                                                {opt}
                                                                            </label>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="col-md-4">
                                                            <div className="mb-3">
                                                                <label className="form-label">Amount *</label>
                                                                <input
                                                                    type="number"
                                                                    className="form-control"
                                                                    name="amount"
                                                                    value={payment.amount || ""}
                                                                    onChange={(e) => handleChange(e, "payments", index)}
                                                                    disabled={!isEditMode || isLocked}
                                                                />
                                                            </div>
                                                        </div>

                                                        <div className="col-md-4">
                                                            <div className="mb-3">
                                                                <label className="form-label">Balance *</label>
                                                                <input
                                                                    type="number"
                                                                    className="form-control"
                                                                    name="balance"
                                                                    value={payment.balance || ""}
                                                                    onChange={(e) => handleChange(e, "payments", index)}
                                                                    disabled={!isEditMode || isLocked}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="row">
                                                        <div className="col-md-4">
                                                            <div className="mb-3">
                                                                <label className="form-label">Receipt No *</label>
                                                                <input
                                                                    type="text"
                                                                    className="form-control"
                                                                    name="receptNo"
                                                                    value={payment.receptNo || ""}
                                                                    onChange={(e) => handleChange(e, "payments", index)}
                                                                    disabled={!isEditMode || isLocked}
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="col-md-4">
                                                            <div className="mb-3">
                                                                <label className="form-label">Reminder Date</label>
                                                                <input
                                                                    type="date"
                                                                    className="form-control"
                                                                    name="reminderDate"
                                                                    value={payment.reminderDate || ""}
                                                                    onChange={(e) => handleChange(e, "payments", index)}
                                                                    disabled={!isEditMode || isLocked}
                                                                />
                                                            </div>

                                                        </div>

                                                        <div className="col-md-4">
                                                            <div className="mb-3">
                                                                <label className="form-label">Remarks</label>
                                                                <input
                                                                    type="text"
                                                                    className="form-control"
                                                                    name="remarks"
                                                                    value={payment.remarks || ""}
                                                                    onChange={(e) => handleChange(e, "payments", index)}
                                                                    disabled={!isEditMode || isLocked}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>


                                                </div>
                                            </div>
                                        );
                                    })}

                                    {isEditMode && (
                                        <button type="button" className="btn btn-primary" onClick={addPayment}>
                                            Add New Payment
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="modal-footer">
                        {isEditMode && (
                            <>
                                <button type="button" className="btn btn-success" onClick={handleSubmit}>
                                    Save Changes
                                </button>
                                {/* <button type="button" className="btn btn-danger" onClick={handleDeleteClick}>
                                    Delete
                                </button> */}
                            </>
                        )}
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            Close
                        </button>
                    </div>
                </div>
            </div>

            {/* Delete Confirmation */}
            {showDeleteConfirm && (
                <div className="modal fade show" style={{ display: "block", backgroundColor: "rgba(0,0,0,0.5)" }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Confirm Delete</h5>
                                <button type="button" className="btn-close" onClick={cancelDelete}></button>
                            </div>
                            <div className="modal-body">
                                <p>
                                    Are you sure you want to delete this client? The client data will be moved to the ExistClients
                                    database.
                                </p>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-danger" onClick={confirmDelete}>
                                    Yes, Delete
                                </button>
                                <button type="button" className="btn btn-secondary" onClick={cancelDelete}>
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClientModal;
