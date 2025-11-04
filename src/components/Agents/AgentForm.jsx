import React, { useEffect, useMemo, useState } from "react";
import firebaseDB from "../../firebase";
import { useAuth } from "../../context/AuthContext";

// ----- Helpers ---------------------------------------------------------------
const toStr = (v) => (v == null ? "" : String(v));

// Auto-generate next Agent ID based on type
async function generateNextAgentId(agentType = "worker") {
  const prefix = agentType === "client" ? "AC" : "AW";
  const path = agentType === "client" ? "AgentData/ClientAgent" : "AgentData/WorkerAgent";
  
  try {
    const snap = await firebaseDB.child(path).once("value");
    let max = 0;
    let agentCount = 0;
    
    if (snap.exists()) {
      agentCount = snap.numChildren();
      
      snap.forEach((child) => {
        const agentData = child.val();
        const idNo = toStr(agentData?.idNo || "").trim();
        
        if (!idNo) return;
        
        const m = idNo.match(new RegExp(`^${prefix}(\\d+)$`, "i"));
        if (m) {
          const n = parseInt(m[1], 10);
          if (!Number.isNaN(n) && n > max) max = n;
        }
      });
    }

    let nextNumber;
    if (agentCount > 0 && max === 0) {
      nextNumber = agentCount + 1;
    } else {
      nextNumber = max + 1;
    }
    
    return `${prefix}${nextNumber}`;
  } catch (error) {
    return `${prefix}1`;
  }
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
  const DEFAULT_PHOTO_URL =
    "https://firebasestorage.googleapis.com/v0/b/jenceo-admin.firebasestorage.app/o/OfficeFiles%2FSample-Photo.jpg?alt=media&token=01855b47-c9c2-490e-b400-05851192dde7";

  // ----------------------- Form State -----------------------
  const [formData, setFormData] = useState({
    agentType: initialData.agentType || "worker",
    idNo: initialData.idNo || "",
    agentName: initialData.agentName || "",
    gender: initialData.gender || "",
    mobile: initialData.mobile || "",
    altMobile: initialData.altMobile || "",
    upiNo: initialData.upiNo || "",
    commission: initialData.commission || "",
    rating: initialData.rating || 0,
    workingPlace: initialData.workingPlace || "",
    workingProficiency: initialData.workingProficiency || "",
    emergencyContact: initialData.emergencyContact || "",
    experience: initialData.experience || "",
    address1: initialData.address1 || "",
    dNo: initialData.dNo || "",
    streetName: initialData.streetName || "",
    landMark: initialData.landMark || "",
    villageTown: initialData.villageTown || "",
    mandal: initialData.mandal || "",
    district: initialData.district || "",
    state: initialData.state || "",
    pinCode: initialData.pinCode || "",
    agentPhotoUrl: initialData.agentPhotoUrl || DEFAULT_PHOTO_URL,
    idProofUrl: initialData.idProofUrl || "",
    idProofType: initialData.idProofType || "",
    notes: initialData.notes || "",
  });

  const [errors, setErrors] = useState({});
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profileCompletion, setProfileCompletion] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const [dupAgent, setDupAgent] = useState(null);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [autoIdLock, setAutoIdLock] = useState(false);

  const initialSnapshot = useMemo(() => JSON.stringify(formData), []);

  // Get current user from auth context
  const authContext = useAuth();
  const currentUser = authContext?.user || JSON.parse(localStorage.getItem("currentUser") || "{}");

  const getUserInfo = () => {
    return {
      uid: currentUser?.dbId || currentUser?.uid || "system",
      name: currentUser?.name || currentUser?.displayName || currentUser?.username || "System",
      email: currentUser?.email || "",
    };
  };

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
        } catch (error) {
          const prefix = formData.agentType === "client" ? "AC" : "AW";
          const fallbackId = `${prefix}1`;
          setFormData((p) => ({ ...p, idNo: fallbackId }));
          setAutoIdLock(true);
        }
      })();
    }
    
    if (!show) {
      setStep(1);
      setAutoIdLock(false);
      if (!isEdit) {
        setFormData({
          agentType: "worker",
          idNo: "",
          agentName: "",
          mobile: "",
          altMobile: "",
          upiNo: "",
          email: "",
          commission: "",
          rating: 0,
          workingPlace: "",
          workingProficiency: "",
          emergencyContact: "",
          experience: "",
          address1: "",
          dNo: "",
          streetName: "",
          landMark: "",
          villageTown: "",
          mandal: "",
          district: "",
          state: "",
          pinCode: "",
          agentPhotoUrl: DEFAULT_PHOTO_URL,
          idProofUrl: "",
          idProofType: "",
          notes: "",
        });
      }
    }
  }, [show, isEdit, formData.agentType]);

  // ----------------------- Validation -----------------------
  const validateStep1 = () => {
    const e = {};
    if (!toStr(formData.idNo).trim()) e.idNo = "Agent ID is required.";
    else if (!/^(AW|AC)[1-9]\d{0,3}$/i.test(toStr(formData.idNo)))
      e.idNo = "ID must be AW1/AW9999 or AC1/AC9999";
    if (!toStr(formData.agentName).trim()) e.agentName = "Agent Name is required.";
    if (!toStr(formData.gender).trim()) e.gender = "Gender is required.";
    if (!toStr(formData.mobile).trim()) e.mobile = "Mobile is required.";
    else if (!/^\d{10}$/.test(toStr(formData.mobile)))
      e.mobile = "Enter 10 digit mobile number.";
    if (!toStr(formData.commission).trim())
      e.commission = "Commission is required.";
    else if (Number.isNaN(Number(formData.commission)) || Number(formData.commission) < 0) {
      e.commission = "Enter a valid amount.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = () => {
    setErrors({});
    return true;
  };

  const validateStep3 = () => {
    setErrors({});
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
  
    if (name === "agentType" && !isEdit) {
      (async () => {
        try {
          const nextId = await generateNextAgentId(value);
          setFormData((p) => ({ ...p, agentType: value, idNo: nextId }));
        } catch (error) {
          const prefix = value === "client" ? "AC" : "AW";
          const fallbackId = `${prefix}1`;
          setFormData((p) => ({ ...p, agentType: value, idNo: fallbackId }));
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
      const workerSnap = await firebaseDB
        .child("AgentData/WorkerAgent")
        .orderByChild("mobile")
        .equalTo(formData.mobile)
        .once("value");

      const clientSnap = await firebaseDB
        .child("AgentData/ClientAgent")
        .orderByChild("mobile")
        .equalTo(formData.mobile)
        .once("value");

      let dup = null;

      workerSnap.forEach((child) => {
        const v = child.val();
        if (!isEdit || v?.id !== initialData?.id) {
          dup = v;
        }
      });

      if (!dup) {
        clientSnap.forEach((child) => {
          const v = child.val();
          if (!isEdit || v?.id !== initialData?.id) {
            dup = v;
          }
        });
      }

      return dup;
    } catch (err) {
      return null;
    }
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
      const userInfo = getUserInfo();
  
      const payload = {
        ...formData,
        updatedAt: now,
        updatedBy: userInfo.uid,
        updatedByName: userInfo.name,
        updatedByEmail: userInfo.email,
      };
  
      const basePath = formData.agentType === "client" ? "AgentData/ClientAgent" : "AgentData/WorkerAgent";

      if (isEdit && initialData?.id) {
        payload.createdAt = initialData.createdAt || now;
        payload.createdBy = initialData.createdBy || userInfo.uid;
        payload.createdByName = initialData.createdByName || userInfo.name;
        await firebaseDB.child(`${basePath}/${initialData.id}`).update(payload);
      } else {
        payload.createdAt = now;
        payload.createdBy = userInfo.uid;
        payload.createdByName = userInfo.name;
        payload.createdByEmail = userInfo.email;

        const ref = firebaseDB.child(basePath).push();
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
        <div className="progress-bar bg-success" style={{ width: `${profileCompletion}%` }} />
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
              <div className="wb-title">
                {title || (isEdit ? "Edit Agent" : "Add New Agent")}
              </div>
              <small className={formData.agentType === "client" ? "text-info" : "text-warning"}>
                {formData.agentType === "client" ? "Client Agent" : "Worker Agent"} • {formData.idNo}
              </small>
            </div>
            <div>
              <button className="wb-close-btn" title="Close" onClick={handleClose}>
                ✕
              </button>
            </div>
          </div>

          <div className="wb-body" style={{ maxHeight: "70vh", overflowY: "auto" }}>
            <div className="form-card">
              <StepHeader />
              <ProgressBar />

              <form onSubmit={handleSubmit}>
                {/* STEP 1: Basic Information */}
                {step === 1 && (
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label">Agent Type <span className="text-danger">*</span></label>
                      <select name="agentType" className="form-select" value={formData.agentType} onChange={handleChange} disabled={isEdit}>
                        <option value="worker">Worker Agent (AW)</option>
                        <option value="client">Client Agent (AC)</option>
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Agent ID <span className="text-danger">*</span></label>
                      <input name="idNo" type="text" className={`form-control ${errors.idNo ? "is-invalid" : ""}`} value={formData.idNo} onChange={handleChange} disabled={autoIdLock || isEdit} placeholder="Auto-generated" />
                      {errors.idNo && <div className="invalid-feedback">{errors.idNo}</div>}
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Agent Name <span className="text-danger">*</span></label>
                      <input name="agentName" type="text" className={`form-control ${errors.agentName ? "is-invalid" : ""}`} value={formData.agentName} onChange={handleChange} placeholder="Enter full name" />
                      {errors.agentName && <div className="invalid-feedback">{errors.agentName}</div>}
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Gender <span className="text-danger">*</span></label>
                      <select
                        name="gender"
                        className={`form-select ${errors.gender ? "is-invalid" : ""}`}
                        value={formData.gender}
                        onChange={handleChange}
                      >
                        <option value="">Select gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                      {errors.gender && <div className="invalid-feedback">{errors.gender}</div>}
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Mobile No <span className="text-danger">*</span></label>
                      <input name="mobile" type="tel" className={`form-control ${errors.mobile ? "is-invalid" : ""}`} value={formData.mobile} onChange={handleChange} placeholder="10 digits" maxLength={10} />
                      {errors.mobile && <div className="invalid-feedback">{errors.mobile}</div>}
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Alt. Mobile</label>
                      <input name="altMobile" type="tel" className="form-control" value={formData.altMobile} onChange={handleChange} placeholder="Optional" maxLength={10} />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">UPI No</label>
                      <input name="upiNo" type="text" className="form-control" value={formData.upiNo} onChange={handleChange} placeholder="UPI ID for payments" />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Commission (₹) <span className="text-danger">*</span></label>
                      <input name="commission" type="number" className={`form-control ${errors.commission ? "is-invalid" : ""}`} value={formData.commission} onChange={handleChange} placeholder="Commission amount" min={0} step="1" />
                      {errors.commission && <div className="invalid-feedback">{errors.commission}</div>}
                    </div>

                    <div className="col-12 mt-3 d-flex justify-content-end">
                      <button type="button" className="btn btn-primary" onClick={nextStep}>Next →</button>
                    </div>
                  </div>
                )}

                {/* STEP 2: Address Details */}
                {step === 2 && (
                  <div className="row g-3">
                    <div className="col-md-6"><label className="form-label">D.No / House No</label><input name="dNo" className="form-control" value={formData.dNo} onChange={handleChange} placeholder="Door number" /></div>
                    <div className="col-md-6"><label className="form-label">Street Name</label><input name="streetName" className="form-control" value={formData.streetName} onChange={handleChange} placeholder="Street name" /></div>
                    <div className="col-md-6"><label className="form-label">Land Mark</label><input name="landMark" className="form-control" value={formData.landMark} onChange={handleChange} placeholder="Nearby landmark" /></div>
                    <div className="col-md-6"><label className="form-label">Village / Town</label><input name="villageTown" className="form-control" value={formData.villageTown} onChange={handleChange} placeholder="Village or town name" /></div>
                    <div className="col-md-6"><label className="form-label">Mandal</label><input name="mandal" className="form-control" value={formData.mandal} onChange={handleChange} placeholder="Mandal name" /></div>
                    <div className="col-md-6"><label className="form-label">District</label><input name="district" className="form-control" value={formData.district} onChange={handleChange} placeholder="District name" /></div>
                    <div className="col-md-6"><label className="form-label">State</label><input name="state" className="form-control" value={formData.state} onChange={handleChange} placeholder="State name" /></div>
                    <div className="col-md-6"><label className="form-label">PIN Code</label><input name="pinCode" type="text" className="form-control" value={formData.pinCode} onChange={handleChange} placeholder="6 digits" maxLength={6} /></div>

                    <div className="col-12 d-flex justify-content-between mt-3">
                      <button type="button" className="btn btn-outline-secondary" onClick={prevStep}>← Back</button>
                      <button type="button" className="btn btn-primary" onClick={nextStep}>Next →</button>
                    </div>
                  </div>
                )}

                {/* STEP 3: Professional Details & Documents */}
                {step === 3 && (
                  <div className="row g-3">
                    <div className="col-md-6"><label className="form-label">Working Place</label><input name="workingPlace" type="text" className="form-control" value={formData.workingPlace} onChange={handleChange} placeholder="Current working place" /></div>
                    <div className="col-md-6"><label className="form-label">Working Proficiency</label><input name="workingProficiency" type="text" className="form-control" value={formData.workingProficiency} onChange={handleChange} placeholder="e.g., Carpenter, Electrician, etc." /></div>
                    <div className="col-md-6"><label className="form-label">Emergency Contact</label><input name="emergencyContact" type="tel" className="form-control" value={formData.emergencyContact} onChange={handleChange} placeholder="10 digits" maxLength={10} /></div>
                    <div className="col-md-6"><label className="form-label">Experience (Years)</label><input name="experience" type="number" className="form-control" value={formData.experience} onChange={handleChange} placeholder="Years of experience" min={0} step="0.5" /></div>

                    <div className="col-md-6">
                      <label className="form-label">Photo (≤100KB, JPG/PNG)</label>
                      <input className="form-control" type="file" accept="image/jpeg,image/png" onChange={onPhotoChange} />
                      <div className="mt-2">
                        <img src={formData.agentPhotoUrl} alt="preview" style={{ maxWidth: 120, borderRadius: 8, border: "1px solid #444" }} />
                        <small className="d-block text-muted mt-1">Default photo will be used if not uploaded</small>
                      </div>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">ID Proof (≤150KB, PDF/JPG/PNG)</label>
                      <input className="form-control" type="file" accept="application/pdf,image/jpeg,image/png" onChange={onIdProofChange} />
                      {formData.idProofUrl && (
                        <div className="mt-2">
                          {formData.idProofType === "pdf" ? (
                            <>
                              <a href={formData.idProofUrl} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-info">📄 View PDF</a>
                              <small className="d-block text-success mt-1">✓ PDF uploaded</small>
                            </>
                          ) : (
                            <>
                              <img src={formData.idProofUrl} alt="id proof" style={{ maxWidth: 120, borderRadius: 8, border: "1px solid #444" }} />
                              <small className="d-block text-success mt-1">✓ ID Proof uploaded</small>
                            </>
                          )}
                        </div>
                      )}
                    </div>

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
                            <i key={n} className={`bi ${filled ? "bi-star-fill" : "bi-star"} ${color}`} style={{ fontSize: "1.6rem", marginRight: 4, cursor: "pointer" }} onClick={() => setRating(n)} />
                          );
                        })}
                        <span className="ms-2 text-muted small">{formData.rating || 0}/5</span>
                      </div>
                    </div>

                    <div className="col-12">
                      <label className="form-label">Notes</label>
                      <textarea name="notes" rows={3} className="form-control" value={formData.notes} onChange={handleChange} placeholder="Any additional information..." />
                    </div>

                    <div className="col-12 d-flex justify-content-between mt-4 pt-3 border-top border-secondary">
                      <button type="button" className="btn btn-outline-secondary" onClick={prevStep}>← Back</button>
                      <div>
                        <button type="button" className="btn btn-success me-2" onClick={handleSubmit} disabled={isSubmitting}>
                          {isSubmitting ? "Saving..." : isEdit ? "Update Agent" : "Add Agent"}
                        </button>
                        <button type="button" className="btn btn-secondary" onClick={handleClose}>Close</button>
                      </div>
                    </div>
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="wb-backdrop" style={{ zIndex: 1060 }}>
          <div className="wb-card" style={{ maxWidth: "600px" }}>
            <div className="wb-header">
              <div className="wb-title text-warning">
                <i className="bi bi-shield-check me-2"></i>
                Confirm {isEdit ? "Agent Update" : "New Agent"}
              </div>
              <button className="wb-close-btn" onClick={() => setShowConfirm(false)}>✕</button>
            </div>
            <div className="wb-body">
              <div className="row w-100 g-3 m-auto">
                <div className="col-md-6">
                  <div className="card bg-dark border-primary h-100">
                    <div className="card-header bg-primary bg-opacity-25">
                      <h6 className="mb-0"><i className="bi bi-person-badge me-2"></i>Agent Information</h6>
                    </div>
                    <div className="card-body">
                      <p><strong>Type: </strong> <span className={`badge ms-3 ${formData.agentType === "client" ? "bg-info" : "bg-warning"}`}>{formData.agentType === "client" ? "Client Agent" : "Worker Agent"}</span></p>
                      <p><strong>Agent ID: </strong> {formData.idNo}</p>
                      <p><strong>Name: </strong> {formData.agentName}</p>
                      <p><strong>Mobile: </strong> {formData.mobile}</p>
                      <p><strong>Commission: </strong> ₹{formData.commission}</p>
                    </div>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="card bg-dark border-success h-100">
                    <div className="card-header bg-success bg-opacity-25">
                      <h6 className="mb-0"><i className="bi bi-info-circle me-2"></i>Audit Info</h6>
                    </div>
                    <div className="card-body">
                      <p><strong>Created By: </strong> {getUserInfo().name}</p>
                      <p><strong>Profile Completion: </strong> <span className="text-success">{profileCompletion}%</span></p>
                      <p><strong>Status: </strong> <span className={`badge ${isEdit ? "bg-warning" : "bg-success"}`}>{isEdit ? "Update" : "New Creation"}</span></p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="wb-footer">
              <button className="btn btn-outline-secondary me-2" onClick={() => setShowConfirm(false)} disabled={isSubmitting}>
                Cancel
              </button>
              <button className="btn btn-success" onClick={doSave} disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : isEdit ? "Update Agent" : "Create Agent"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Mobile Modal */}
      {showDuplicateModal && (
        <div className="wb-backdrop" style={{ zIndex: 1060 }}>
          <div className="wb-card" style={{ maxWidth: "500px" }}>
            <div className="wb-header">
              <div className="wb-title text-warning">
                <i className="bi bi-exclamation-triangle me-2"></i>
                Duplicate Mobile Number
              </div>
            </div>
            <div className="wb-body">
              <div className="alert alert-warning">
                <strong>Mobile {formData.mobile}</strong> is already registered with another agent.
              </div>
              {dupAgent && (
                <div className="card bg-dark border-warning">
                  <div className="card-body">
                    <p><strong>Name:</strong> {dupAgent.agentName}</p>
                    <p><strong>Agent ID:</strong> {dupAgent.idNo}</p>
                    <p><strong>Type:</strong> {dupAgent.agentType === "client" ? "Client Agent" : "Worker Agent"}</p>
                  </div>
                </div>
              )}
            </div>
            <div className="wb-footer">
              <button className="btn btn-warning" onClick={() => setShowDuplicateModal(false)}>
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Discard Changes Modal */}
      {showDiscardModal && (
        <div className="wb-backdrop" style={{ zIndex: 1060 }}>
          <div className="wb-card" style={{ maxWidth: "450px" }}>
            <div className="wb-header">
              <div className="wb-title text-danger">
                <i className="bi bi-exclamation-circle me-2"></i>
                Unsaved Changes
              </div>
            </div>
            <div className="wb-body">
              <p>You have unsaved changes. Are you sure you want to close?</p>
              <p className="text-muted small">Profile completion: {profileCompletion}%</p>
            </div>
            <div className="wb-footer">
              <button className="btn btn-outline-secondary me-2" onClick={() => setShowDiscardModal(false)}>
                Continue Editing
              </button>
              <button className="btn btn-danger" onClick={confirmDiscard}>
                Discard Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add CSS Styles */}
      <style jsx>{`
        .wb-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1050;
          padding: 20px;
        }
        .wb-card {
          background: #1e1e1e;
          border-radius: 10px;
          border: 1px solid #333;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
          width: 100%;
          max-width: 600px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
        }
        .wb-header {
          padding: 15px 20px;
          border-bottom: 1px solid #333;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #2a2a2a;
        }
        .wb-title {
          font-size: 1.2rem;
          font-weight: 600;
          color: white;
          margin: 0;
        }
        .wb-close-btn {
          background: none;
          border: none;
          color: #999;
          font-size: 1.2rem;
          cursor: pointer;
          padding: 0;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .wb-close-btn:hover {
          color: white;
          background: rgba(255,255,255,0.1);
          border-radius: 50%;
        }
        .wb-body {
          padding: 20px;
          flex: 1;
          overflow-y: auto;
        }
        .wb-footer {
          padding: 15px 20px;
          border-top: 1px solid #333;
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          background: #2a2a2a;
        }
        .form-card {
          background: #2a2a2a;
          padding: 20px;
          border-radius: 8px;
          border: 1px solid #333;
          height:100%
        }
        .form-control {
          background: #333;
          border: 1px solid #444;
          color: white;
        }
        .form-control:focus {
          background: #333;
          border-color: #007bff;
          color: white;
          box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
        }
        .form-control::placeholder {
          color: #666;
        }
        .form-label {
          color: #ccc;
          font-weight: 500;
        }
        .invalid-feedback {
          display: block;
        }
      `}</style>
    </>
  );
};

export default AgentForm;