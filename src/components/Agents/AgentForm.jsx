import React, { useEffect, useMemo, useState } from "react";
import firebaseDB from "../../firebase";

// ----- Helpers ---------------------------------------------------------------
const toStr = (v) => (v == null ? "" : String(v));
const canon = (v) =>
  toStr(v).toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").trim();

// Auto-generate next Agent ID based on type
async function generateNextAgentId(agentType = "worker") {
  const prefix = agentType === "client" ? "AC" : "AW";
  const snap = await firebaseDB.child("AgentData").once("value");
  let max = 0;
  if (snap.exists()) {
    snap.forEach((child) => {
      const idNo = toStr(child.val()?.idNo || "");
      const m = idNo.match(new RegExp(`^${prefix}(\\d{1,4})$`, "i"));
      if (m) {
        const n = parseInt(m[1], 10);
        if (!Number.isNaN(n) && n > max) max = n;
      }
    });
  }
  return `${prefix}${max + 1}`;
}

// Calculate profile completion percentage
const calculateProfileCompletion = (formData, step) => {
  const totalFields = {
    step1: ['agentType', 'idNo', 'agentName', 'mobile', 'commission'],
    step2: ['workingPlace', 'workingProficiency', 'emergencyContact', 'experience'],
    step3: ['address1', 'villageTown', 'mandal', 'district', 'state', 'pinCode']
  };

  let completed = 0;
  let total = 0;

  // Count completed fields up to current step
  for (let i = 1; i <= step; i++) {
    totalFields[`step${i}`]?.forEach(field => {
      total++;
      if (formData[field] && toStr(formData[field]).trim()) {
        completed++;
      }
    });
  }

  return total > 0 ? Math.round((completed / total) * 100) : 0;
};

// ----- Component -------------------------------------------------------------
const AgentForm = ({
  show = false,
  onClose = () => { },
  title = "Add New Agent",
  onSubmit,
  initialData = {},
  isEdit = false,
}) => {
  // Default photo URL
  const DEFAULT_PHOTO_URL = "https://firebasestorage.googleapis.com/v0/b/jenceo-admin.firebasestorage.app/o/OfficeFiles%2FSample-Photo.jpg?alt=media&token=01855b47-c9c2-490e-b400-05851192dde7";

  // ----------------------- Form State -----------------------
  const [formData, setFormData] = useState({
    // Step 1: Basic Info
    agentType: initialData.agentType || "worker",
    idNo: initialData.idNo || "",
    agentName: initialData.agentName || "",
    mobile: initialData.mobile || "",
    altMobile: initialData.altMobile || "",
    whatsApp: initialData.whatsApp || "",
    email: initialData.email || "",
    commission: initialData.commission || "",
    rating: initialData.rating || 0,

    // Step 2: Professional Details
    workingPlace: initialData.workingPlace || "",
    workingProficiency: initialData.workingProficiency || "",
    emergencyContact: initialData.emergencyContact || "",
    experience: initialData.experience || "",

    // Step 3: Address & Documents
    address1: initialData.address1 || "",
    dNo: initialData.dNo || "",
    streetName: initialData.streetName || "",
    landMark: initialData.landMark || "",
    villageTown: initialData.villageTown || "",
    mandal: initialData.mandal || "",
    district: initialData.district || "",
    state: initialData.state || "",
    pinCode: initialData.pinCode || "",

    // Uploads
    agentPhotoUrl: initialData.agentPhotoUrl || DEFAULT_PHOTO_URL,
    idProofUrl: initialData.idProofUrl || "",
    idProofType: initialData.idProofType || "",
    notes: initialData.notes || "",
  });

  const [errors, setErrors] = useState({});
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profileCompletion, setProfileCompletion] = useState(0);

  // Modals
  const [showConfirm, setShowConfirm] = useState(false);
  const [dupAgent, setDupAgent] = useState(null);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [autoIdLock, setAutoIdLock] = useState(false);

  const initialSnapshot = useMemo(() => JSON.stringify(formData), []);

  // Update profile completion percentage
  useEffect(() => {
    setProfileCompletion(calculateProfileCompletion(formData, step));
  }, [formData, step]);

  useEffect(() => {
    if (show && !isEdit) {
      (async () => {
        try {
          const nextId = await generateNextAgentId(formData.agentType);
          setFormData((p) => ({ ...p, idNo: nextId }));
          setAutoIdLock(true);
        } catch {
          if (!formData.idNo) {
            const prefix = formData.agentType === "client" ? "AC" : "AW";
            setFormData((p) => ({ ...p, idNo: `${prefix}1` }));
            setAutoIdLock(true);
          }
        }
      })();
    }
    if (!show) {
      setStep(1);
      setAutoIdLock(false);
    }
  }, [show, isEdit, formData.agentType]);

  // ----------------------- Validation -----------------------
  const validateStep1 = () => {
    const e = {};
    if (!formData.idNo.trim()) e.idNo = "Agent ID is required.";
    else if (!/^(AW|AC)[1-9]\d{0,3}$/i.test(formData.idNo)) e.idNo = "ID must be AW1/AW9999 or AC1/AC9999";
    if (!formData.agentName.trim()) e.agentName = "Agent Name is required.";
    if (!formData.mobile.trim()) e.mobile = "Mobile is required.";
    else if (!/^\d{10}$/.test(formData.mobile)) e.mobile = "Enter 10 digit mobile number.";
    if (!toStr(formData.commission).trim()) e.commission = "Commission is required.";
    else if (Number.isNaN(Number(formData.commission)) || Number(formData.commission) < 0) {
      e.commission = "Enter a valid amount.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = () => {
    const e = {};
    // All fields in step 2 are now optional, so no validation
    setErrors(e);
    return true;
  };

  const validateStep3 = () => {
    const e = {};
    // All fields in step 3 are now optional, so no validation
    setErrors(e);
    return true;
  };

  const validateAll = () => {
    const validations = [validateStep1, validateStep2, validateStep3];
    for (let i = 0; i < validations.length; i++) {
      if (!validations[i]()) {
        setStep(i + 1);
        return false;
      }
    }
    return true;
  };

  // ----------------------- Handlers -----------------------
  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "idNo" && (autoIdLock || isEdit)) return;

    // Regenerate ID if agent type changes
    if (name === "agentType" && !isEdit) {
      (async () => {
        try {
          const nextId = await generateNextAgentId(value);
          setFormData((p) => ({ ...p, agentType: value, idNo: nextId }));
        } catch {
          const prefix = value === "client" ? "AC" : "AW";
          setFormData((p) => ({ ...p, agentType: value, idNo: `${prefix}1` }));
        }
      })();
    } else {
      setFormData((p) => ({ ...p, [name]: value }));
    }

    if (errors[name]) setErrors((p) => ({ ...p, [name]: "" }));
  };

  const setRating = (n) => setFormData((p) => ({ ...p, rating: n }));

  // File upload handlers
  const onPhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const typeOk = ["image/jpeg", "image/png"].includes(file.type);
    if (!typeOk) {
      alert("Photo: only JPG/PNG allowed.");
      return;
    }
    if (file.size > 100 * 1024) {
      alert("Photo must be ≤ 100KB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setFormData((p) => ({ ...p, agentPhotoUrl: ev.target.result }));
    };
    reader.readAsDataURL(file);
  };

  const onIdProofChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const type = file.type;
    const valid = type === "application/pdf" || type === "image/jpeg" || type === "image/png";
    if (!valid) {
      alert("ID Proof: only PDF/JPG/PNG allowed.");
      return;
    }
    if (file.size > 150 * 1024) {
      alert("ID Proof must be ≤ 150KB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setFormData((p) => ({
        ...p,
        idProofUrl: ev.target.result,
        idProofType: type === "application/pdf" ? "pdf" : "image",
      }));
    };
    reader.readAsDataURL(file);
  };

  const nextStep = async () => {
    const validators = [validateStep1, validateStep2];
    if (step <= validators.length) {
      if (!validators[step - 1]()) return;

      // Check duplicate mobile on step 1
      if (step === 1 && !isEdit) {
        const dup = await checkDuplicateMobile();
        if (dup) {
          setDupAgent(dup);
          setShowDuplicateModal(true);
          return;
        }
      }
    }
    setStep((s) => Math.min(3, s + 1));
  };

  const prevStep = () => setStep((s) => Math.max(1, s - 1));

  const hasUnsavedChanges = useMemo(() => {
    try {
      return JSON.stringify(formData) !== initialSnapshot;
    } catch {
      return true;
    }
  }, [formData, initialSnapshot]);

  const handleClose = () => {
    if (hasUnsavedChanges) setShowDiscardModal(true);
    else onClose();
  };

  const confirmDiscard = () => {
    setShowDiscardModal(false);
    onClose();
  };

  // Duplicate Mobile check
  const checkDuplicateMobile = async () => {
    try {
      const snap = await firebaseDB
        .child("AgentData")
        .orderByChild("mobile")
        .equalTo(formData.mobile)
        .once("value");
      if (snap.exists()) {
        let dup = null;
        snap.forEach((child) => {
          const v = child.val();
          if (!isEdit || v?.id !== initialData?.id) {
            dup = v;
          }
        });
        return dup;
      }
    } catch (err) { }
    return null;
  };

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    if (!validateAll()) return;

    if (!isEdit) {
      const dup = await checkDuplicateMobile();
      if (dup) {
        setDupAgent(dup);
        setShowDuplicateModal(true);
        return;
      }
    }

    setShowConfirm(true);
  };

  const doSave = async () => {
    setIsSubmitting(true);
    try {
      const now = new Date().toISOString();
      const payload = {
        agentType: formData.agentType,
        idNo: formData.idNo.trim(),
        agentName: formData.agentName.trim(),
        mobile: formData.mobile.trim(),
        altMobile: toStr(formData.altMobile).trim(),
        whatsApp: toStr(formData.whatsApp).trim(),
        email: toStr(formData.email).trim(),
        commission: Number(formData.commission) || 0,
        rating: Number(formData.rating) || 0,

        workingPlace: formData.workingPlace.trim(),
        workingProficiency: formData.workingProficiency.trim(),
        emergencyContact: formData.emergencyContact.trim(),
        experience: formData.experience.trim(),

        address1: formData.address1.trim(),
        dNo: formData.dNo.trim(),
        streetName: formData.streetName.trim(),
        landMark: formData.landMark.trim(),
        villageTown: formData.villageTown.trim(),
        mandal: formData.mandal.trim(),
        district: formData.district.trim(),
        state: formData.state.trim(),
        pinCode: formData.pinCode.trim(),

        agentPhotoUrl: formData.agentPhotoUrl || DEFAULT_PHOTO_URL,
        idProofUrl: formData.idProofUrl || "",
        idProofType: formData.idProofType || "",
        notes: toStr(formData.notes).trim(),
        updatedAt: now,
        profileCompletion: calculateProfileCompletion(formData, 3),
      };

      if (isEdit && initialData?.id) {
        payload.createdAt = initialData.createdAt || now;
        await firebaseDB.child(`AgentData/${initialData.id}`).update(payload);
      } else {
        payload.createdAt = now;
        try {
          const saved = localStorage.getItem("currentUser");
          if (saved) {
            const u = JSON.parse(saved);
            payload.addedById = u?.uid || "";
            payload.addedByName = u?.displayName || u?.email || "";
          }
        } catch { }
        const ref = firebaseDB.child("AgentData").push();
        await ref.set({ id: ref.key, ...payload });
      }

      onSubmit && onSubmit(payload);
      setShowConfirm(false);
      setIsSubmitting(false);
      onClose && onClose();
    } catch (err) {
      setIsSubmitting(false);
      alert("Error saving Agent: " + (err?.message || err));
    }
  };

  // ----------------------- UI Components -----------------------
  if (!show) return null;

  const StepHeader = () => (
    <div className="d-flex align-items-center justify-content-center mb-3">
      {[1, 2, 3].map((stepNum) => (
        <React.Fragment key={stepNum}>
          <div className={`badge rounded-pill ${step >= stepNum ? "bg-primary" : "bg-secondary"}`}>
            {stepNum}
          </div>
          {stepNum < 3 && <div className="text-secondary mx-2">—</div>}
        </React.Fragment>
      ))}
    </div>
  );

  const ProgressBar = () => (
    <div className="mb-3">
      <div className="d-flex justify-content-between align-items-center mb-1">
        <small className="text-muted">Profile Completion</small>
        <small className="text-primary">{profileCompletion}%</small>
      </div>
      <div className="progress" style={{ height: "6px" }}>
        <div
          className="progress-bar bg-success"
          style={{ width: `${profileCompletion}%` }}
        />
      </div>
    </div>
  );

  return (
    <>
      {/* Main Modal */}
      <div className="wb-backdrop" onClick={handleClose}>
        <div className="wb-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "600px" }}>
          <div className="wb-header">
            <div>
              <div className="wb-title">{title || (isEdit ? "Edit Agent" : "Add New Agent")}</div>
              <small className={formData.agentType === "client" ? "text-info" : "text-warning"}>
                {formData.agentType === "client" ? "Client Agent" : "Worker Agent"} • {formData.idNo}
              </small>
            </div>
            <div>
              <button className="wb-close-btn" title="Close" onClick={handleClose}>✕</button>
            </div>
          </div>

          <div className="wb-body">
            <div className="form-card">
              <StepHeader />
              <ProgressBar />

              <form onSubmit={handleSubmit}>
                {/* STEP 1: Basic Information */}
                {step === 1 && (
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label">Agent Type <span className="text-danger">*</span></label>
                      <select
                        name="agentType"
                        className="form-select"
                        value={formData.agentType}
                        onChange={handleChange}
                        disabled={isEdit}
                      >
                        <option value="worker">Worker Agent (AW)</option>
                        <option value="client">Client Agent (AC)</option>
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Agent ID <span className="text-danger">*</span></label>
                      <input
                        name="idNo"
                        type="text"
                        className={`form-control ${errors.idNo ? "is-invalid" : ""}`}
                        value={formData.idNo}
                        onChange={handleChange}
                        disabled={autoIdLock || isEdit}
                        placeholder="Auto-generated"
                      />
                      {errors.idNo && <div className="invalid-feedback">{errors.idNo}</div>}
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Agent Name <span className="text-danger">*</span></label>
                      <input
                        name="agentName"
                        type="text"
                        className={`form-control ${errors.agentName ? "is-invalid" : ""}`}
                        value={formData.agentName}
                        onChange={handleChange}
                        placeholder="Enter full name"
                      />
                      {errors.agentName && <div className="invalid-feedback">{errors.agentName}</div>}
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Mobile No <span className="text-danger">*</span></label>
                      <input
                        name="mobile"
                        type="tel"
                        className={`form-control ${errors.mobile ? "is-invalid" : ""}`}
                        value={formData.mobile}
                        onChange={handleChange}
                        placeholder="10 digits"
                        maxLength={10}
                      />
                      {errors.mobile && <div className="invalid-feedback">{errors.mobile}</div>}
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Alt. Mobile</label>
                      <input
                        name="altMobile"
                        type="tel"
                        className="form-control"
                        value={formData.altMobile}
                        onChange={handleChange}
                        placeholder="Optional"
                        maxLength={10}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">WhatsApp</label>
                      <input
                        name="whatsApp"
                        type="tel"
                        className="form-control"
                        value={formData.whatsApp}
                        onChange={handleChange}
                        placeholder="WhatsApp number"
                        maxLength={10}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Email</label>
                      <input
                        name="email"
                        type="email"
                        className="form-control"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="example@domain.com"
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Commission (₹) <span className="text-danger">*</span></label>
                      <input
                        name="commission"
                        type="number"
                        className={`form-control ${errors.commission ? "is-invalid" : ""}`}
                        value={formData.commission}
                        onChange={handleChange}
                        placeholder="Commission amount"
                        min={0}
                        step="1"
                      />
                      {errors.commission && <div className="invalid-feedback">{errors.commission}</div>}
                    </div>



                    <div className="col-12 mt-3 d-flex justify-content-end">
                      <button type="button" className="btn btn-primary" onClick={nextStep}>
                        Next →
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 2: Professional Details */}
                {step === 2 && (
                  <div className="row g-3">

                    <div className="col-md-6">
                      <label className="form-label">D.No / House No</label>
                      <input
                        name="dNo"
                        className="form-control"
                        value={formData.dNo}
                        onChange={handleChange}
                        placeholder="Door number"
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Street Name</label>
                      <input
                        name="streetName"
                        className="form-control"
                        value={formData.streetName}
                        onChange={handleChange}
                        placeholder="Street name"
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Land Mark</label>
                      <input
                        name="landMark"
                        className="form-control"
                        value={formData.landMark}
                        onChange={handleChange}
                        placeholder="Nearby landmark"
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Village / Town</label>
                      <input
                        name="villageTown"
                        className="form-control"
                        value={formData.villageTown}
                        onChange={handleChange}
                        placeholder="Village or town name"
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Mandal</label>
                      <input
                        name="mandal"
                        className="form-control"
                        value={formData.mandal}
                        onChange={handleChange}
                        placeholder="Mandal name"
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">District</label>
                      <input
                        name="district"
                        className="form-control"
                        value={formData.district}
                        onChange={handleChange}
                        placeholder="District name"
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">State</label>
                      <input
                        name="state"
                        className="form-control"
                        value={formData.state}
                        onChange={handleChange}
                        placeholder="State name"
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">PIN Code</label>
                      <input
                        name="pinCode"
                        type="text"
                        className="form-control"
                        value={formData.pinCode}
                        onChange={handleChange}
                        placeholder="6 digits"
                        maxLength={6}
                      />
                    </div>




                    <div className="col-12 d-flex justify-content-between mt-3">
                      <button type="button" className="btn btn-outline-secondary" onClick={prevStep}>
                        ← Back
                      </button>
                      <button type="button" className="btn btn-primary" onClick={nextStep}>
                        Next →
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 3: Address & Documents */}
                {step === 3 && (
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label">Working Place</label>
                      <input
                        name="workingPlace"
                        type="text"
                        className="form-control"
                        value={formData.workingPlace}
                        onChange={handleChange}
                        placeholder="Current working place"
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Working Proficiency</label>
                      <input
                        name="workingProficiency"
                        type="text"
                        className="form-control"
                        value={formData.workingProficiency}
                        onChange={handleChange}
                        placeholder="e.g., Carpenter, Electrician, etc."
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Emergency Contact</label>
                      <input
                        name="emergencyContact"
                        type="tel"
                        className="form-control"
                        value={formData.emergencyContact}
                        onChange={handleChange}
                        placeholder="10 digits"
                        maxLength={10}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Experience (Years)</label>
                      <input
                        name="experience"
                        type="number"
                        className="form-control"
                        value={formData.experience}
                        onChange={handleChange}
                        placeholder="Years of experience"
                        min={0}
                        step="0.5"
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Photo (≤100KB, JPG/PNG)</label>
                      <input
                        className="form-control"
                        type="file"
                        accept="image/jpeg,image/png"
                        onChange={onPhotoChange}
                      />
                      <div className="mt-2">
                        <img
                          src={formData.agentPhotoUrl}
                          alt="preview"
                          style={{ maxWidth: 120, borderRadius: 8, border: "1px solid #444" }}
                        />
                        <small className="d-block text-muted mt-1">Default photo will be used if not uploaded</small>
                      </div>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">ID Proof (≤150KB, PDF/JPG/PNG)</label>
                      <input
                        className="form-control"
                        type="file"
                        accept="application/pdf,image/jpeg,image/png"
                        onChange={onIdProofChange}
                      />
                      {formData.idProofUrl && (
                        <div className="mt-2">
                          {formData.idProofType === "pdf" ? (
                            <>
                              <a href={formData.idProofUrl} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-info">
                                📄 View PDF
                              </a>
                              <small className="d-block text-success mt-1">✓ PDF uploaded</small>
                            </>
                          ) : (
                            <>
                              <img
                                src={formData.idProofUrl}
                                alt="id proof"
                                style={{ maxWidth: 120, borderRadius: 8, border: "1px solid #444" }}
                              />
                              <small className="d-block text-success mt-1">✓ ID Proof uploaded</small>
                            </>
                          )}
                        </div>
                      )}

                      <div className="col-md-12">
                        <label className="form-label d-block">Rating</label>
                        <div className="mt-1">
                          {[1, 2, 3, 4, 5].map((n) => {
                            const filled = n <= Number(formData.rating || 0);
                            let color = "text-secondary";
                            if (filled) {
                              if (formData.rating >= 4) color = "text-success";
                              else if (formData.rating === 3) color = "text-warning";
                              else color = "text-danger";
                            }
                            return (
                              <i
                                key={n}
                                className={`bi ${filled ? "bi-star-fill" : "bi-star"} ${color}`}
                                style={{ fontSize: "1.6rem", marginRight: 4, cursor: "pointer" }}
                                onClick={() => setRating(n)}
                              />
                            );
                          })}
                          <span className="ms-2 text-muted small">{formData.rating || 0}/5</span>
                        </div>
                      </div>
                    </div>


                    <div className="col-12">
                      <label className="form-label">Notes</label>
                      <textarea
                        name="notes"
                        rows={3}
                        className="form-control"
                        value={formData.notes}
                        onChange={handleChange}
                        placeholder="Any additional information..."
                      />
                    </div>

                    <div className="col-12 d-flex justify-content-between mt-3">
                      <button type="button" className="btn btn-outline-secondary" onClick={prevStep}>
                        ← Back
                      </button>
                      <div>
                        <button type="button" className="btn btn-success me-2" onClick={handleSubmit} disabled={isSubmitting}>
                          {isSubmitting ? "Saving..." : (isEdit ? "Update Agent" : "Add Agent")}
                        </button>
                        <button type="button" className="btn btn-secondary" onClick={handleClose}>
                          Close
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* All Modals remain the same as before */}
      {showConfirm && (
        <div className="modal fade show" style={{ display: "block", backgroundColor: "rgba(0,0,0,0.55)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content bg-dark text-white border border-warning">
              <div className="modal-header">
                <h5 className="modal-title">Confirm {isEdit ? "Update" : "Addition"}</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowConfirm(false)}></button>
              </div>
              <div className="modal-body">
                <p>Please confirm the details:</p>
                <ul className="mb-0">
                  <li><strong>Type:</strong> {formData.agentType === "client" ? "Client Agent" : "Worker Agent"}</li>
                  <li><strong>ID:</strong> {formData.idNo}</li>
                  <li><strong>Name:</strong> {formData.agentName}</li>
                  <li><strong>Mobile:</strong> {formData.mobile}</li>
                  <li><strong>Commission:</strong> ₹{formData.commission}</li>
                  <li><strong>Profile Complete:</strong> {profileCompletion}%</li>
                </ul>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowConfirm(false)}>Cancel</button>
                <button className="btn btn-success" onClick={doSave} disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : "Confirm & Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Mobile Modal */}
      {showDuplicateModal && dupAgent && (
        <div className="modal fade show" style={{ display: "block", backgroundColor: "rgba(0,0,0,0.55)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content bg-dark text-white border border-danger">
              <div className="modal-header">
                <h5 className="modal-title">Duplicate Mobile Found</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowDuplicateModal(false)}></button>
              </div>
              <div className="modal-body">
                <p>An agent with the same mobile already exists:</p>
                <ul>
                  <li><strong>ID:</strong> {dupAgent.idNo || "-"}</li>
                  <li><strong>Name:</strong> {dupAgent.agentName || "-"}</li>
                  <li><strong>Mobile:</strong> {dupAgent.mobile || "-"}</li>
                </ul>
                <p className="mb-0">Please use a different mobile number.</p>
              </div>
              <div className="modal-footer">
                <button className="btn btn-danger" onClick={() => setShowDuplicateModal(false)}>OK</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Discard Changes Modal */}
      {showDiscardModal && (
        <div className="modal fade show" style={{ display: "block", backgroundColor: "rgba(0,0,0,0.55)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content bg-dark text-white border border-warning">
              <div className="modal-header">
                <h5 className="modal-title">Discard changes?</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowDiscardModal(false)}></button>
              </div>
              <div className="modal-body">
                You have unsaved changes. Are you sure you want to close without saving?
                <div className="mt-2 text-info">
                  <small>Profile completion: {profileCompletion}%</small>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowDiscardModal(false)}>Cancel</button>
                <button className="btn btn-warning" onClick={confirmDiscard}>Discard</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .wb-backdrop {
          position: fixed; inset: 0; background: rgba(0,0,0,0.5);
          display: flex; align-items: center; justify-content: center; z-index: 1050;
          padding: 20px;
        }
        .wb-card {
          width: 95%; max-width: 600px; background: #101214; color: #fff; border-radius: 12px;
          border: 1px solid #2a2f36; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,.4);
          max-height: 90vh; overflow-y: auto;
        }
        .wb-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 16px 20px; border-bottom: 1px solid #2a2f36; background: #161a1f;
        }
        .wb-title { font-size: 1.2rem; font-weight: 600; }
        .wb-close-btn {
          border: 0; background: transparent; color: #bbb; font-size: 1.2rem; cursor: pointer;
        }
        .wb-close-btn:hover { color: #fff; }
        .wb-body { padding: 20px; }
        .form-card { background: #1a1d23; padding: 20px; border-radius: 8px; }
        .form-card-header h4 { margin: 0; color: #fff; }
      `}</style>
    </>
  );
};

export default AgentForm;