import React, { useEffect, useMemo, useState } from "react";
import firebaseDB from "../../firebase";

const DailyEntryModal = ({ entry, isEditing, employee, onSave, onClose }) => {
  // ---- form state (kept) ----
  const [formData, setFormData] = useState({
    date: "",
    clientId: "",
    clientName: "",
    jobRole: "",
    status: "present",
    isPublicHoliday: false,
    isEmergency: false,
    notes: "",
  });

  // ---- your layout state (kept) ----
  const [clients, setClients] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [basicSalary, setBasicSalary] = useState(0);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [entryDataToSave, setEntryDataToSave] = useState(null);

  // duplicate modal
  const [dupModalOpen, setDupModalOpen] = useState(false);
  const [dupList, setDupList] = useState([]);

  // ========= helpers =========
  const toStr = (v) => (v == null ? "" : String(v));
  const canon = (v) =>
    toStr(v).toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").trim();

  const calculateDailySalary = () => Math.round((Number(basicSalary) || 0) / 30);

  // unify ONE client object shape no matter the source fields
  const normalizeClient = (firebaseKey, data) => {
    const idNo =
      toStr(data?.idNo) ||
      toStr(data?.clientId) ||
      toStr(data?.id) ||
      ""; // business ID we display/store
    const clientName = toStr(data?.clientName) || toStr(data?.name) || "";
    return {
      key: firebaseKey,
      clientId: idNo,          // business ID only (never show firebase key)
      clientName,
      location: toStr(data?.location || data?.area || ""),
      _idC: canon(idNo),
      _nmC: canon(clientName),
    };
  };

  // try multiple DB paths and merge
  const loadFromPath = async (path) => {
    try {
      const snap = await firebaseDB.child(path).get();
      if (!snap.exists()) return [];
      const obj = snap.val() || {};
      return Object.entries(obj).map(([k, v]) => normalizeClient(k, v));
    } catch {
      return [];
    }
  };

  const loadClients = async () => {
    // priority order; first one that contains data will already make search work.
    const sources = [
      "JenCeo-DataBase/ClientData",
      "ClientData",
      "JenCeo-DataBase/Clients",
      "Clients",
    ];
    const all = [];
    // load sequentially, merge and de-dupe by (clientId+clientName)
    for (const p of sources) {
      const part = await loadFromPath(p);
      all.push(...part);
    }
    const dedup = [];
    const seen = new Set();
    all.forEach((c) => {
      const key = `${c._idC}|${c._nmC}`;
      if (!seen.has(key) && (c.clientId || c.clientName)) {
        seen.add(key);
        dedup.push(c);
      }
    });
    setClients(dedup);
  };

  // ========= effects (kept) =========
  useEffect(() => {
    loadClients();
    if (employee) setBasicSalary(employee.basicSalary || 0);

    if (entry) {
      setFormData({
        date: entry.date || "",
        clientId: entry.clientId || "",
        clientName: entry.clientName || "",
        jobRole: entry.jobRole || employee?.primarySkill || "",
        status: entry.status || "present",
        isPublicHoliday: entry.isPublicHoliday || false,
        isEmergency: entry.isEmergency || false,
        notes: entry.notes || "",
      });
      if (entry.clientName) {
        const label = [entry.clientId, entry.clientName].filter(Boolean).join(" - ");
        setSearchTerm(label);
      }
    } else {
      const today = new Date().toISOString().split("T")[0];
      setFormData((prev) => ({
        ...prev,
        date: today,
        jobRole: employee?.primarySkill || "",
      }));
    }
  }, [entry, employee]);

  // ======= search – same feel as WorkerSearch (case-insensitive) =======
  useEffect(() => {
    const q = canon(searchTerm);
    if (!q) {
      setFilteredClients([]);
      setShowClientDropdown(false);
      return;
    }
    const filtered = clients.filter((c) => c._idC.includes(q) || c._nmC.includes(q));
    setFilteredClients(filtered.slice(0, 12));
    setShowClientDropdown(true);
  }, [searchTerm, clients]);

  const searchClients = (term) => setSearchTerm(term);

  const selectClient = (client) => {
    setFormData((prev) => ({
      ...prev,
      clientId: client.clientId || "",
      clientName: client.clientName || "",
    }));
    setSearchTerm(
      [client.clientId || "", client.clientName || ""].filter(Boolean).join(" - ")
    );
    setShowClientDropdown(false);
  };

  const handleChange = (field, value) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  // ========= duplicate check =========
  const checkDuplicate = async (employeeId, date, excludeId = null) => {
    if (!employeeId || !date) return false;
    try {
      const snap = await firebaseDB
        .child("TimesheetEntries")
        .orderByChild("employeeId_date")
        .equalTo(`${employeeId}_${date}`)
        .once("value");
      if (snap.exists()) {
        const rows = Object.entries(snap.val()).map(([id, data]) => ({ id, ...data }));
        const others = excludeId ? rows.filter((r) => r.id !== excludeId) : rows;
        if (others.length > 0) {
          setDupList(others);
          setDupModalOpen(true);
          return true;
        }
      }
    } catch {
      // ignore errors; if it fails we won't block, but fallback is possible here if needed
    }
    return false;
  };

  // ========= submit (same layout, added dup guard + default client) =========
  const handleSubmit = async (e) => {
    e.preventDefault();
    const empId = employee?.id || employee?.employeeId;
    if (!empId) {
      alert("Please select an employee first.");
      return;
    }
    if (!formData.date) {
      alert("Please pick a date.");
      return;
    }

    // block duplicate dates
    const isDup = await checkDuplicate(empId, formData.date, isEditing ? entry?.id : null);
    if (isDup) return;

    // default client if none picked
    const finalClientId = formData.clientId || "DEFAULT";
    const finalClientName = formData.clientName || "Default Client";

    const entryData = {
      ...formData,
      clientId: finalClientId,
      clientName: finalClientName,
      id: entry?.id || Date.now().toString(),
      dailySalary: calculateDailySalary(),
      basicSalary: basicSalary,
      employeeId: empId,
      employeeName: `${employee?.firstName || ""} ${employee?.lastName || ""}`.trim(),
      employeeId_date: `${empId}_${formData.date}`,
      timestamp: new Date().toISOString(),
    };

    setEntryDataToSave(entryData);
    setShowConfirmModal(true);
  };

  const confirmSave = () => {
    if (entryDataToSave) onSave(entryDataToSave);
    setShowConfirmModal(false);
    setEntryDataToSave(null);
  };

  const cancelSave = () => {
    setShowConfirmModal(false);
    setEntryDataToSave(null);
  };

  // ========= UI (unchanged layout) =========
  return (
    <>
      <div
        className="modal fade show"
        style={{ display: "block", backgroundColor: "rgba(0,0,0,0.8)" }}
        tabIndex="-1"
      >
        <div className="modal-dialog modal-lg">
          <div className="modal-content bg-dark border border-secondary">
            <div className="modal-header bg-secondary">
              <div className="d-flex align-items-center">
                {employee?.employeePhotoUrl && (
                  <img
                    src={employee.employeePhotoUrl}
                    alt="Employee"
                    className="rounded-circle me-3"
                    style={{ width: "50px", height: "50px", objectFit: "cover" }}
                  />
                )}
                <div>
                  <h5 className="modal-title text-white mb-0">
                    {isEditing ? "Edit Daily Entry" : "Add Daily Entry"}
                  </h5>
                  <small className="text-light">
                    {employee?.firstName} {employee?.lastName} •{" "}
                    {employee?.idNo || employee?.employeeId}
                  </small>
                </div>
              </div>
              <button type="button" className="btn-close btn-close-white" onClick={onClose} />
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="row g-3">
                  {/* Basic Salary */}
                  <div className="col-md-6">
                    <label className="form-label text-warning">
                      <strong>Basic Salary (₹)</strong>
                    </label>
                    <input
                      type="number"
                      className="form-control bg-dark text-white border-warning"
                      value={basicSalary}
                      onChange={(e) => setBasicSalary(parseFloat(e.target.value) || 0)}
                      min="0"
                      step="100"
                    />
                    <small className="text-muted">Monthly basic salary</small>
                  </div>

                  {/* Daily Salary */}
                  <div className="col-md-6">
                    <label className="form-label text-success">
                      <strong>Daily Salary</strong>
                    </label>
                    <div className="form-control bg-dark text-success border-success">
                      <strong>₹{calculateDailySalary()}</strong>
                      <small className="text-muted ms-2">(₹{basicSalary} ÷ 30 days)</small>
                    </div>
                  </div>

                  {/* Date */}
                  <div className="col-md-6">
                    <label className="form-label text-info">
                      <strong>Date</strong>
                    </label>
                    <input
                      type="date"
                      className="form-control bg-dark text-white border-secondary"
                      value={formData.date}
                      onChange={(e) => handleChange("date", e.target.value)}
                      required
                    />
                  </div>

                  {/* Job Role */}
                  <div className="col-md-6">
                    <label className="form-label text-info">
                      <strong>Job Role</strong>
                    </label>
                    <select
                      className="form-select bg-dark text-white border-secondary"
                      value={formData.jobRole}
                      onChange={(e) => handleChange("jobRole", e.target.value)}
                      required
                    >
                      <option value="">Select Job Role</option>
                      <option value="Nursing">Nursing</option>
                      <option value="Patient Care">Patient Care</option>
                      <option value="Care Taker">Care Taker</option>
                      <option value="Baby Care">Baby Care</option>
                      <option value="Supporting">Supporting</option>
                      <option value="Diaper">Diaper</option>
                      <option value="Cook">Cook</option>
                      <option value="Housekeeping">Housekeeping</option>
                      <option value="Old Age Care">Old Age Care</option>
                      <option value="Any Duty">Any Duty</option>
                      <option value="Others">Others</option>
                    </select>
                  </div>

                  {/* Client Search (kept layout, worker-style search) */}
                  <div className="col-12">
                    <label className="form-label text-info">
                      <strong>Search Client (ID or Name)</strong>
                    </label>
                    <div className="position-relative">
                      <input
                        type="text"
                        className="form-control bg-dark text-white border-secondary"
                        placeholder="Search by client ID (e.g., JC00001) or name…"
                        value={searchTerm}
                        onChange={(e) => searchClients(e.target.value)}
                        onFocus={() => searchTerm && setShowClientDropdown(true)}
                        onBlur={() => setTimeout(() => setShowClientDropdown(false), 150)}
                      />

                      {showClientDropdown && filteredClients.length > 0 && (
                        <div className="position-absolute top-100 start-0 end-0 bg-dark border border-secondary mt-1 rounded shadow-lg z-3 max-h-200 overflow-auto">
                          {filteredClients.map((client) => (
                            <div
                              key={client.key}
                              className="p-2 border-bottom border-secondary hover-bg-gray-700 cursor-pointer"
                              onClick={() => selectClient(client)}
                            >
                              <div className="fw-bold text-white">
                                {client.clientId || "-"} - {client.clientName || "-"}
                              </div>
                              {client.location && (
                                <small className="text-muted">Location: {client.location}</small>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Selected Client Display */}
                    {(formData.clientId || formData.clientName) && (
                      <div className="mt-2 p-2 bg-success bg-opacity-10 border border-success rounded">
                        <small className="text-success">
                          <strong>Selected Client:</strong>{" "}
                          {[formData.clientId, formData.clientName].filter(Boolean).join(" - ")}
                        </small>
                      </div>
                    )}
                  </div>

                  {/* Status */}
                  <div className="col-md-6">
                    <label className="form-label text-warning">
                      <strong>Status</strong>
                    </label>
                    <select
                      className="form-select bg-dark text-white border-secondary"
                      value={formData.status}
                      onChange={(e) => handleChange("status", e.target.value)}
                    >
                      <option value="present">Present</option>
                      <option value="leave">Leave</option>
                      <option value="half-day">Half Day</option>
                      <option value="holiday">Holiday</option>
                      <option value="absent">Absent</option>
                    </select>
                  </div>

                  {/* Specials */}
                  <div className="col-md-6">
                    <label className="form-label text-warning">
                      <strong>Special Conditions</strong>
                    </label>
                    <div className="d-flex gap-3 mt-2">
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="isPublicHoliday"
                          checked={formData.isPublicHoliday}
                          onChange={(e) => handleChange("isPublicHoliday", e.target.checked)}
                          disabled={formData.status === "present"}
                        />
                        <label className="form-check-label text-info" htmlFor="isPublicHoliday">
                          Public Holiday
                        </label>
                      </div>
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="isEmergency"
                          checked={formData.isEmergency}
                          onChange={(e) => handleChange("isEmergency", e.target.checked)}
                        />
                        <label className="form-check-label text-danger" htmlFor="isEmergency">
                          Emergency Duty
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="col-12">
                    <label className="form-label text-info">
                      <strong>Notes</strong>
                    </label>
                    <textarea
                      className="form-control bg-dark text-white border-secondary"
                      rows="3"
                      value={formData.notes}
                      onChange={(e) => handleChange("notes", e.target.value)}
                      placeholder="Any additional notes about the work..."
                    />
                  </div>

                  {/* Summary (kept) */}
                  <div className="col-12">
                    <div className="card bg-gray-800 border-info">
                      <div className="card-body">
                        <h6 className="card-title text-info">Entry Summary</h6>
                        <div className="row text-center">
                          <div className="col-md-3">
                            <small className="text-muted">Date</small>
                            <div className="fw-bold text-white">
                              {formData.date || "Not set"}
                            </div>
                          </div>
                          <div className="col-md-3">
                            <small className="text-muted">Client ID</small>
                            <div className="fw-bold text-white">
                              {formData.clientId || "Default"}
                            </div>
                          </div>
                          <div className="col-md-3">
                            <small className="text-muted">Client Name</small>
                            <div className="fw-bold text-white">
                              {formData.clientName || "Default Client"}
                            </div>
                          </div>
                          <div className="col-md-3">
                            <small className="text-muted">Daily Salary</small>
                            <div className="fw-bold text-success">₹{calculateDailySalary()}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* footer (kept) */}
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={onClose}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {isEditing ? "Update Entry" : "Add Entry"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* ===== Duplicate Entry Modal ===== */}
      {dupModalOpen && (
        <div
          className="modal fade show"
          style={{ display: "block", backgroundColor: "rgba(0,0,0,0.8)" }}
          tabIndex="-1"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content bg-dark border border-warning">
              <div className="modal-header border-warning">
                <h5 className="modal-title text-warning">
                  <i className="bi bi-exclamation-triangle me-2" />
                  Date Already Exists
                </h5>
              </div>
              <div className="modal-body">
                <div className="alert alert-warning bg-warning bg-opacity-10 border-warning">
                  An entry already exists for <strong>{formData.date}</strong>.
                </div>
                <div className="table-responsive">
                  <table className="table table-sm table-dark mb-0">
                    <thead>
                      <tr>
                        <th>Client</th>
                        <th>Status</th>
                        <th>Saved</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dupList.map((d) => (
                        <tr key={d.id}>
                          <td className="text-info">
                            {[d.clientId, d.clientName].filter(Boolean).join(" - ")}
                          </td>
                          <td>
                            <span
                              className={`badge ${
                                d.status === "present"
                                  ? "bg-success"
                                  : d.status === "absent"
                                  ? "bg-danger"
                                  : "bg-secondary"
                              }`}
                            >
                              {d.status}
                            </span>
                          </td>
                          <td className="text-muted">
                            {d.updatedAt
                              ? new Date(d.updatedAt).toLocaleString("en-IN")
                              : d.timestamp
                              ? new Date(d.timestamp).toLocaleString("en-IN")
                              : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-white mt-3 mb-0">
                  Please choose a different date or edit the existing entry.
                </p>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setDupModalOpen(false);
                    setDupList([]);
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== Confirmation Modal (kept layout) ===== */}
      {showConfirmModal && entryDataToSave && (
        <div
          className="modal fade show"
          style={{ display: "block", backgroundColor: "rgba(0,0,0,0.8)" }}
          tabIndex="-1"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content bg-dark border border-warning">
              <div className="modal-header border-warning">
                <h5 className="modal-title text-warning">
                  <i className="fas fa-check-circle me-2"></i>
                  Confirm Daily Entry
                </h5>
              </div>
              <div className="modal-body">
                <div className="alert alert-warning bg-warning bg-opacity-10 border-warning">
                  <strong>Please review the entry details:</strong>
                </div>

                <div className="row g-2 mb-3">
                  <div className="col-6">
                    <small className="text-muted">Date</small>
                    <div className="fw-bold text-white">{entryDataToSave.date}</div>
                  </div>
                  <div className="col-6">
                    <small className="text-muted">Job Role</small>
                    <div className="fw-bold text-white">{entryDataToSave.jobRole}</div>
                  </div>
                  <div className="col-12">
                    <small className="text-muted">Client</small>
                    <div className="fw-bold text-white">
                      {[entryDataToSave.clientId, entryDataToSave.clientName]
                        .filter(Boolean)
                        .join(" - ")}
                    </div>
                  </div>
                  <div className="col-6">
                    <small className="text-muted">Status</small>
                    <div className="fw-bold text-capitalize text-info">
                      {entryDataToSave.status}
                    </div>
                  </div>
                  <div className="col-6">
                    <small className="text-muted">Daily Salary</small>
                    <div className="fw-bold text-success">₹{entryDataToSave.dailySalary}</div>
                  </div>
                  {(entryDataToSave.isPublicHoliday || entryDataToSave.isEmergency) && (
                    <div className="col-12">
                      <small className="text-muted">Special Conditions</small>
                      <div>
                        {entryDataToSave.isPublicHoliday && (
                          <span className="badge bg-info me-2">Public Holiday</span>
                        )}
                        {entryDataToSave.isEmergency && (
                          <span className="badge bg-danger">Emergency Duty</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="alert alert-info bg-info bg-opacity-10 border-info">
                  <small>
                    <strong>Employee:</strong> {entryDataToSave.employeeName} ({entryDataToSave.employeeId})
                  </small>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={cancelSave}>
                  <i className="fas fa-times me-1"></i>
                  Cancel
                </button>
                <button type="button" className="btn btn-success" onClick={confirmSave}>
                  <i className="fas fa-check me-1"></i>
                  Confirm & Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .hover-bg-gray-700:hover {
          background-color: #374151 !important;
        }
        .cursor-pointer {
          cursor: pointer;
        }
        .max-h-200 {
          max-height: 200px;
        }
        .z-3 {
          z-index: 3;
        }
        .bg-gray-800 {
          background-color: #1f2937;
        }
      `}</style>
    </>
  );
};

export default DailyEntryModal;
