import React, { useState, useEffect, useRef } from "react";

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

    // Biodata preview iframe
    const bioIframeRef = useRef(null);

    // Initialize + lock existing rows
    useEffect(() => {
        if (!client) return;
        setFormData({
            ...client,
            workers: lockRows(client.workers),
            payments: lockRows(client.payments),
        });
    }, [client]);

    const handleChange = (e, section, index = null) => {
        const { name, value } = e.target;

        // Arrays: workers/payments
        if (index !== null && (section === "workers" || section === "payments")) {
            setFormData((prev) => {
                const list = Array.isArray(prev[section]) ? [...prev[section]] : [];
                const row = list[index] || {};

                // Safety lock for existing rows — allow specific fields:
                //  - payments.reminderDate must be editable in edit mode
                //  - workers.basicSalary must be editable in edit mode
                if (row.__locked && isEditMode) {
                    const isAllowedPayment = section === "payments" && name === "reminderDate";
                    const isAllowedWorker = section === "workers" && name === "basicSalary";
                    if (!isAllowedPayment && !isAllowedWorker) {
                        return prev; // block all other fields for locked rows
                    }
                }

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
            __locked: false,
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
            if (row?.__locked) return prev;
            list.splice(index, 1);
            return { ...prev, workers: list };
        });
    };

    const addPayment = () => {
        const newPayment = {
            paymentMethod: "cash",
            paidAmount: "",
            balance: "",
            receptNo: "",
            bookNo: "",
            remarks: "",
            reminderDate: "",
            __locked: false,
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
            if (row?.__locked) return prev;
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

    // ---- Biodata (client) HTML ----
    const buildClientBiodataHTML = () => {
        const safe = (v, d = "—") => (v == null || v === "" ? d : String(v));
        const fullName = safe(formData.clientName);
        const metaDate = new Date().toLocaleDateString();

        const addrRows = `
              <div class="row"><div class="col-md-4"><strong>Door No</strong></div><div class="col-md-1">:</div><div class="col-md-7">${safe(formData.dNo)}</div>      </div>
              <div class="row"><div class="col-md-4"><strong>Landmark</strong></div><div class="col-md-1">:</div><div class="col-md-7">${safe(formData.landMark)}</div>      </div>
              <div class="row"><div class="col-md-4"><strong>Street</strong></div><div class="col-md-1">:</div><div class="col-md-7">${safe(formData.street)}</div>      </div>
              <div class="row"><div class="col-md-4"><strong>Village / Town</strong></div><div class="col-md-1">:</div><div class="col-md-7">${safe(formData.villageTown)}</div>      </div>
              <div class="row"><div class="col-md-4"><strong>Mandal</strong></div><div class="col-md-1">:</div><div class="col-md-7">${safe(formData.mandal)}</div>      </div>
             <div class="row"> <div class="col-md-4"><strong>District</strong></div><div class="col-md-1">:</div><div class="col-md-7">${safe(formData.district)}</div>      </div>
              <div class="row"><div class="col-md-4"><strong>State & Pin Code</strong></div><div class="col-md-1">:</div><div class="col-md-7">${safe(formData.state)}${formData.pincode ? " - " + formData.pincode : ""}</div>      </div>
    `;

        const workersHtml = (Array.isArray(formData.workers) ? formData.workers : [])
            .map(
                (w, i) => `
      <div class="row" style="margin-bottom:6px;">
        <div class="col"><span class="lbl">#${i + 1} ${safe(w.cName)}</span> — <span class="val">ID: ${safe(
                    w.workerIdNo
                )}, Basic Salary: ${safe(w.basicSalary)}, Period: ${safe(w.startingDate)} to ${safe(
                    w.endingDate
                )}</span></div>
      </div>`
            )
            .join("");

        const paymentsHtml = (Array.isArray(formData.payments) ? formData.payments : [])
            .map(
                (p, i) => `
      <div class="row" style="margin-bottom:6px;">
        <div class="col"><span class="lbl">#${i + 1} ${safe(p.paymentMethod).toUpperCase()}</span> — <span class="val">Paid Amount: ${safe(
                    p.paidAmount
                )}, Balance: ${safe(p.balance)}, Receipt: ${safe(p.receptNo)}, Reminder: ${safe(p.reminderDate)}</span></div>
      </div>`
            )
            .join("");

        const html = `
<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Client Biodata - ${fullName}</title>
<style>
  *{box-sizing:border-box} html,body{margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;color:#111}
  .page{width:900px;margin:16px auto;background:#fff;border:1px solid #e5e5e5;padding:20px}
  .header-section {background-color:#05b6ff; padding: 15px; margin: 0 -15px 15px -15px; color: #fff; text-align:center}
  .header-section * {margin:0}
  .header{display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #222;padding-bottom:10px}
  .title{font-size:20px;font-weight:700;letter-spacing:.4px}
  .subtitle{font-size:12px;color:#444;margin-top:2px}
  .sec{margin-top:14px;border:1px solid #ddd;border-radius:6px;overflow:hidden}
  .sec-title{background:#f3f4f6;padding:8px 10px;font-weight:700}
  .sec-title h3{margin:0;font-size:16px}
  .sec-body{padding:10px}
  .row{display:flex;flex-wrap:wrap;margin-bottom:10px}
  .row:nth-child(even){background:#eef5fb; padding: 5px 0;}
  .col{flex:1}
  .lbl{font-weight:600; margin-right:5px}
  .val{font-weight:500}
  /* bootstrap-like helpers already used in your markup */
  .col-md-4 { flex: 0 0 33.3333%; max-width: 33.3333%; }
  .col-md-7 { flex: 0 0 58.3333%; max-width: 58.3333%; }
  .col-md-1 { flex: 0 0 8.3333%;  max-width: 8.3333%; text-align:center; }
  .blue {color: #05b6ff}
  @media print{
    .page{border:none;margin:0;width:100%}
    @page{ size:A4; margin:10mm }
    .page{ transform-origin: top left; }
  }
</style>
</head>
<body>
<div class="page">
  <div class="header-section">
  <h2>JenCeo Home Care Services</h2>
  <h3>Client Aggrement Info</h3>
  </div>
  <div class="header">
    <div>
      <div class="title blue">${fullName} (Bio-Data)</div>
      <div class="subtitle">Generated: ${metaDate}</div>
    </div>
    <div class="blue"><strong>ID:</strong> ${safe(formData.idNo)}</div>
  </div>

  <div class="sec">
    <div class="sec-title"><h3>Basic Information</h3></div>
    <div class="sec-body">
      <div class="row">
        <div class="col"><span class="lbl">Client Name:</span> <span class="val">${fullName}</span></div>
        <div class="col"><span class="lbl">Gender:</span> <span class="val">${safe(formData.gender)}</span></div>
        <div class="col"><span class="lbl">Care Of:</span> <span class="val">${safe(formData.careOf)}</span></div>
      </div>
      <div class="row">
        <div class="col"><span class="lbl">Location:</span> <span class="val blue">${safe(formData.location)}</span></div>
        <div class="col"><span class="lbl">Mobile 1:</span> <span class="val blue">${safe(formData.mobileNo1)}</span></div>
        <div class="col"><span class="lbl">Mobile 2:</span> <span class="val">${safe(formData.mobileNo2)}</span></div>
      </div>
    </div>
  </div>

  <div class="sec">
    <div class="sec-title"><h3>Address</h3></div>
    <div class="sec-body">
      ${addrRows}
    </div>
  </div>

  <div class="sec">
    <div class="sec-title"><h3>Service Details</h3></div>
    <div class="sec-body">
      <div class="row">
        <div class="col"><span class="lbl">Type of Service:</span> <span class="val blue">${safe(formData.typeOfService)}</span></div>
        <div class="col"><span class="lbl">Service Charges:</span> <span class="val blue">${safe(formData.serviceCharges)}</span></div>
        <div class="col"><span class="lbl">Service Period:</span> <span class="val">${safe(formData.servicePeriod)}</span></div>
      </div>
      <div class="row">
        <div class="col"><span class="lbl">Travelling Charges:</span> <span class="val">${safe(formData.travellingCharges)}</span></div>
        <div class="col"><span class="lbl">Service Status:</span> <span class="val">${safe(formData.serviceStatus)}</span></div>
        <div class="col"><span class="lbl">Gap If Any:</span> <span class="val">${safe(formData.gapIfAny)}</span></div>
      </div>
      <div class="row">
        <div class="col"><span class="lbl">Starting Date:</span> <span class="val blue">${safe(formData.startingDate)}</span></div>
        <div class="col"><span class="lbl">Ending Date:</span> <span class="val">${safe(formData.endingDate)}</span></div>
        <div class="col"><span class="lbl">Page No:</span> <span class="val">${safe(formData.pageNo)}</span></div>
      </div>
    </div>
  </div>

  <div class="sec">
    <div class="sec-title"><h3>Care Recipients</h3></div>
    <div class="sec-body">
      <div class="row">
        <div class="col"><span class="lbl">Patient Name:</span> <span class="val">${safe(formData.patientName)}</span></div>
        <div class="col"><span class="lbl">Patient Age:</span> <span class="val">${safe(formData.patentAge)}</span></div>
        <div class="col"><span class="lbl">Dropper Name:</span> <span class="val">${safe(formData.dropperName)}</span></div>
      </div>
   
    </div>
  </div>

  <div class="sec">
    <div class="sec-title"><h3>Workers</h3></div>
    <div class="sec-body">
      ${workersHtml || '<div class="muted">No workers added</div>'}
    </div>
  </div>

  <div class="sec">
    <div class="sec-title"><h3>Payments</h3></div>
    <div class="sec-body">
      ${paymentsHtml || '<div class="muted">No payments added</div>'}
    </div>
  </div>
</div>
<script>window.focus && window.focus();</script>
</body>
</html>
`;
        return html;
    };

    // keep biodata preview up to date in the tab
    useEffect(() => {
        if (activeTab !== "biodata") return;
        if (!bioIframeRef.current) return;
        bioIframeRef.current.srcdoc = buildClientBiodataHTML();
    }, [activeTab, formData]);

    const handleBioPrint = () => {
        const html = buildClientBiodataHTML();
        const blob = new Blob([html], { type: "text/html;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const win = window.open(url, "_blank", "noopener,noreferrer");
        // a tiny delay helps mobile to render before print
        setTimeout(() => {
            try { win && win.focus(); } catch { }
            try { win && win.print(); } catch { }
        }, 200);
        setTimeout(() => URL.revokeObjectURL(url), 20000);
    };

    const handleBioDownload = () => {
        const html = buildClientBiodataHTML();
        const blob = new Blob([html], { type: "text/html;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        const name = (formData.clientName || "client").replace(/\s+/g, "_");
        a.href = url;
        a.download = `${name}_biodata.html`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 0);
    };

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
                                ["patient", "Care Recipients"],
                                ["workers", `Workers (${formData.workers?.length || 0})`],
                                ["payments", `Payments (${formData.payments?.length || 0})`],
                                ["biodata", "Biodata"], // NEW tab (after payments)
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
                                                <label className="form-label">Relation</label>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    name="relation"
                                                    value={formData.relation || ""}
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

                                    </div>

                                    <div className="row">
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
                                        <div className="col-md-4">
                                            <div className="mb-3">
                                                <label className="form-label">Google Location</label>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    name="googleLocation"
                                                    value={formData.googleLocation || ""}
                                                    onChange={handleChange}
                                                    disabled={!isEditMode}

                                                />
                                            </div>

                                        </div>
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
                                                    maxLength={3}
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
                                            <label className="form-label">Care Recipients Name *</label>
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
                                            <label className="form-label">Care Recipients Age *</label>
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
                                                                    disabled={!isEditMode /* enabled even if locked */}
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
                                                                                name={`paymentMethod-${index}`}
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
                                                                <label className="form-label">Paid Amount *</label>
                                                                <input
                                                                    type="number"
                                                                    className="form-control"
                                                                    name="paidAmount"
                                                                    value={payment.paidAmount || ""}
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
                                                                    disabled={!isEditMode /* enabled even if locked */}
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

                            {/* Biodata (NEW) */}
                            {activeTab === "biodata" && (
                                <div>
                                    <div className="modal-card">
                                        <div className="modal-card-header d-flex align-items-center justify-content-between">
                                            <h6 className="mb-0">Biodata (Preview)</h6>
                                            <div className="d-flex gap-2">
                                                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={handleBioDownload}>
                                                    Download
                                                </button>
                                                <button type="button" className="btn btn-primary btn-sm" onClick={handleBioPrint}>
                                                    Print
                                                </button>
                                            </div>
                                        </div>
                                        <div className="modal-card-body" style={{ height: 520 }}>
                                            <iframe
                                                ref={bioIframeRef}
                                                title="BiodataPreview"
                                                style={{ width: "100%", height: "100%", border: "1px solid #e5e5e5", borderRadius: 6 }}
                                            />
                                        </div>
                                    </div>
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
