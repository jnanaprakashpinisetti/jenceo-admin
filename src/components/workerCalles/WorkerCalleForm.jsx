// src/components/workerCalles/WorkerCalleForm-2.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import firebaseDB from "../../firebase";
import SuccessModal from "../common/SuccessModal";
import { useAuth } from "../../context/AuthContext";

// ---------- helpers ----------
const todayYMD = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};
const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};
const toBase64 = (file) =>
  new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = () => res(reader.result);
    reader.onerror = rej;
    reader.readAsDataURL(file);
  });

// ---------- constants ----------
const HOME_CARE_OPTS = [
  "Nursing",
  "Patient Care",
  "Care Taker",
  "Bedside Attender",
  "Old Age Care",
  "Baby Care",
  "Supporting",
  "Cook",
  "Housekeeping",
  "Diaper",
  "Injection",
  "BP Check",
  "Sugar Check",
  "Wound Dressing",
  "Nebulization",
  "Post-Operative Care",
  "Any Duty",
];

const NURSING_WORKS = [
  "Vital Signs Monitoring",
  "BP Check",
  "Sugar Check (Glucometer)",
  "Medication Administration",
  "IV/IM Injection",
  "Wound Dressing",
  "Catheter Care",
  "Ryle’s Tube / NG Feeding",
  "PEG Feeding",
  "Nebulization",
  "Suctioning",
  "Oxygen Support",
  "Tracheostomy Care",
  "Bedsore Care",
  "Positioning & Mobility",
  "Bed Bath & Hygiene",
  "Diaper Change",
  "Urine Bag Change",
  "Post-Operative Care",
];

const OTHER_SKILL_SECTIONS = [
  {
    title: "Office & Administrative",
    color: "primary",
    skills: [
      "Computer Operating",
      "Data Entry",
      "Office Assistant",
      "Receptionist",
      "Front Desk Executive",
      "Admin Assistant",
      "Office Boy",
      "Peon",
      "Office Attendant",
    ],
  },
  {
    title: "Customer Service & Telecommunication",
    color: "success",
    skills: [
      "Tele Calling",
      "Customer Support",
      "Telemarketing",
      "BPO Executive",
      "Call Center Agent",
      "Customer Care Executive",
    ],
  },
  {
    title: "Management & Supervision",
    color: "warning",
    skills: ["Supervisor", "Manager", "Team Leader", "Site Supervisor", "Project Coordinator"],
  },
  { title: "Security", color: "danger", skills: ["Security Guard", "Security Supervisor", "Gatekeeper", "Watchman"] },
  {
    title: "Driving & Logistics",
    color: "info",
    skills: ["Driving", "Delivery Boy", "Delivery Executive", "Rider", "Driver", "Car Driver", "Bike Rider", "Logistics Helper"],
  },
  {
    title: "Technical & Maintenance",
    color: "secondary",
    skills: [
      "Electrician",
      "Plumber",
      "Carpenter",
      "Painter",
      "Mason",
      "AC Technician",
      "Mechanic",
      "Maintenance Staff",
      "House Keeping",
      "Housekeeping Supervisor",
    ],
  },
  {
    title: "Industrial & Labor",
    color: "danger",
    skills: ["Labour", "Helper", "Loading Unloading", "Warehouse Helper", "Factory Worker", "Production Helper", "Packaging Staff"],
  },
  { title: "Retail & Sales", color: "primary", skills: ["Sales Boy", "Sales Girl", "Store Helper", "Retail Assistant", "Shop Attendant"] },
];

export default function WorkerCalleForm2({ isOpen, onClose }) {
  const { user: currentUser } = useAuth();

  // ----- wizard state -----
  const [step, setStep] = useState(1);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [existingWorker, setExistingWorker] = useState(null);
  const [showCloseConfirmModal, setShowCloseConfirmModal] = useState(false);
  const [errors, setErrors] = useState({});
  const [openSkill, setOpenSkill] = useState(null);
  const [openNursing, setOpenNursing] = useState(false);

  // View modal for ID/Photo
  const [viewOpen, setViewOpen] = useState(false);
  const [viewTitle, setViewTitle] = useState("");
  const [viewSrc, setViewSrc] = useState("");
  const [viewType, setViewType] = useState("");

  // ----- form model -----
  const [formData, setFormData] = useState({
    // step 1
    callId: "",
    callDate: todayYMD(),
    mobileNo: "",
    name: "",
    location: "",
    source: "",
    gender: "",
    maritalStatus: "",
    age: "",
    experience: "No",
    years: "",
    skills: "", // primary
    email: "",

    // nursing works in step 1 when skills === Nursing (mandatory ≥ 1)
    nursingWorks: [],

    // step 2
    homeCareSkills: [],
    otherSkills: [],
    education: "",
    workingHours: "",
    languages: [],

    // step 3 (optional)
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    pincode: "",
    joiningType: "",
    expectedSalary: "",
    conversationLevel: "",
    callReminderDate: "",
    formComment: "",

    // uploads (optional)
    photoDataUrl: "", // <= 100KB (image)
    photoName: "",
    photoType: "",
    photoSize: 0,

    idProofDataUrl: "", // <= 150KB (pdf/image)
    idProofName: "",
    idProofType: "",
    idProofSize: 0,

    // meta
    createdById: "",
    createdByName: "",
    createdAt: "",
    addedBy: "",
    userName: "",

    // progress snapshots
    completionRequiredPct: 0,
    completionOverallPct: 0,
  });

  // ----- next WC id -----
  const fetchNextCallId = async () => {
    try {
      const snap = await firebaseDB.child("WorkerCallData").once("value");
      let maxN = 0;
      if (snap.exists()) {
        snap.forEach((child) => {
          const id = (child.val()?.callId || "").trim();
          const m = /^WC-(\d+)$/.exec(id);
          if (m) maxN = Math.max(maxN, parseInt(m[1], 10) || 0);
        });
      }
      return `WC-${String(maxN + 1).padStart(2, "0")}`;
    } catch {
      return "WC-01";
    }
  };

  // ----- init -----
  useEffect(() => {
    let alive = true;
    const init = async () => {
      if (!isOpen) return;
      const nextId = await fetchNextCallId();
      if (!alive) return;

      const createdById = currentUser?.dbId || "";
      const createdByName =
        currentUser?.name || currentUser?.username || currentUser?.email?.split("@")[0] || "Unknown";

      setFormData((p) => ({
        ...p,
        callId: nextId,
        callDate: p.callDate || todayYMD(),
        createdById,
        createdByName,
        createdAt: new Date().toISOString(),
        addedBy: createdByName,
        userName: createdByName,
      }));
    };
    init();
    return () => {
      alive = false;
    };
  }, [isOpen, currentUser]);

  // ----- handlers -----
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === "checkbox") {
      const arr = Array.isArray(formData[name]) ? formData[name] : [];
      setFormData({ ...formData, [name]: checked ? [...arr, value] : arr.filter((x) => x !== value) });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    if (errors[name]) setErrors((p) => ({ ...p, [name]: "" }));
  };

  const toggleArrayField = (field, value) => {
    setFormData((prev) => {
      const current = Array.isArray(prev[field]) ? prev[field] : [];
      const updated = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
      return { ...prev, [field]: updated };
    });
  };

  // Upload: Photo (<=100KB, JPG/PNG) and ID proof (<=150KB, PDF/JPG/PNG)
  const onPhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const typeOk = /image\/(jpeg|jpg|png)/i.test(file.type);
    const sizeOk = file.size <= 100 * 1024;
    if (!typeOk) return alert("Photo must be JPG or PNG");
    if (!sizeOk) return alert("Photo must be ≤ 100 KB");

    const dataUrl = await toBase64(file);
    setFormData((p) => ({
      ...p,
      photoDataUrl: dataUrl,
      photoName: file.name,
      photoType: file.type,
      photoSize: file.size,
    }));
  };

  const onIdProofChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const typeOk = /^(application\/pdf|image\/jpeg|image\/jpg|image\/png)$/i.test(file.type);
    const sizeOk = file.size <= 150 * 1024;
    if (!typeOk) return alert("ID Proof must be PDF, JPG, or PNG");
    if (!sizeOk) return alert("ID Proof must be ≤ 150 KB");

    const dataUrl = await toBase64(file);
    setFormData((p) => ({
      ...p,
      idProofDataUrl: dataUrl,
      idProofName: file.name,
      idProofType: file.type,
      idProofSize: file.size,
    }));
  };

  const openViewer = (title, dataUrl, mime) => {
    setViewTitle(title);
    setViewSrc(dataUrl);
    setViewType(mime || "");
    setViewOpen(true);
  };

  const handleDownloadDataUrl = (name, dataUrl) => {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = name || "download";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  // ----- duplicate check -----
  const checkDuplicateMobile = async (mobileNo) => {
    try {
      const snap = await firebaseDB.child("WorkerCallData").orderByChild("mobileNo").equalTo(mobileNo).once("value");
      return snap.exists() ? snap.val() : null;
    } catch {
      return null;
    }
  };

  const dupCheckBlocking = async () => {
    if (!formData.mobileNo || !/^\d{10}$/.test(formData.mobileNo)) return false;
    const dup = await checkDuplicateMobile(formData.mobileNo);
    if (dup) {
      const existing = Object.values(dup)[0];
      setExistingWorker(existing);
      setShowDuplicateModal(true);
      return true; // blocked
    }
    return false;
  };

  // ----- validation -----
  const validateStep = () => {
    const err = {};
    if (step === 1) {
      if (!formData.callId) err.callId = "Call ID is required";
      if (!formData.callDate) err.callDate = "Call Date is required";
      if (!formData.mobileNo) err.mobileNo = "Mobile No is required";
      else if (!/^\d{10}$/.test(formData.mobileNo)) err.mobileNo = "Mobile No must be 10 digits";
      if (!formData.name) err.name = "Name is required";
      if (!formData.location) err.location = "Location is required";
      if (!formData.source) err.source = "Source is required";
      if (!formData.gender) err.gender = "Gender is required";
      if (!formData.age) err.age = "Age is required";

      if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) err.email = "Invalid email format";

      if (formData.experience === "Yes") {
        if (!formData.years) err.years = "Years required";
        if (!formData.skills) err.skills = "Primary Skill required";
      }

      // NEW: If Primary Skill is Nursing => require at least 1 nursing work in STEP 1
      if (formData.skills === "Nursing" && (!formData.nursingWorks || formData.nursingWorks.length === 0)) {
        err.nursingWorks = "Select at least one nursing work.";
        if (!openNursing) setOpenNursing(true);
      }
    } else if (step === 2) {
      if (!formData.education) err.education = "Education is required";
      // workingHours/languages optional
    } else if (step === 3) {
      // existing checks
      if (formData.callReminderDate) {
        const d = new Date(formData.callReminderDate);
        if (d < startOfToday()) err.callReminderDate = "Reminder date cannot be in the past";
      }
      if (formData.pincode && !/^\d{6}$/.test(formData.pincode)) err.pincode = "PIN code must be 6 digits";

      // NEW: mandatory fields
      if (!formData.joiningType) {
        err.joiningType = "Joining Type is required";
      }
      if (!formData.conversationLevel) {
        err.conversationLevel = "Conversation Level is required";
      }
      if (!formData.formComment || !formData.formComment.trim()) {
        err.formComment = "Comment is required";
      }
    }

    setErrors(err);
    return Object.keys(err).length === 0;
  };

  // ----- progress tracking -----
  const REQUIRED_FIELDS = useMemo(
    () => [
      "callId",
      "callDate",
      "mobileNo",
      "name",
      "location",
      "source",
      "gender",
      "age",
      ...(formData.experience === "Yes" ? ["years", "skills"] : []),
      ...(formData.skills === "Nursing" ? ["nursingWorks"] : []),
      "education",
      // NEW required in Step 3:
      "joiningType",
      "conversationLevel",
      "formComment",
    ],
    [formData.experience, formData.skills]
  );


  const OVERALL_FIELDS = [
    ...REQUIRED_FIELDS,
    "maritalStatus",
    "email",
    "homeCareSkills",
    "otherSkills",
    "languages",
    "workingHours",
    "addressLine1",
    "addressLine2",
    "city",
    "state",
    "pincode",
    "joiningType",
    "expectedSalary",
    "conversationLevel",
    "callReminderDate",
    "formComment",
    "photoDataUrl",
    "idProofDataUrl",
  ];

  const countFilled = (field) => {
    const v = formData[field];
    if (Array.isArray(v)) return v.length > 0 ? 1 : 0;
    return v !== undefined && v !== null && String(v).trim() !== "" ? 1 : 0;
  };
  const reqFilled = REQUIRED_FIELDS.reduce((acc, f) => acc + countFilled(f), 0);
  const overallFilled = OVERALL_FIELDS.reduce((acc, f) => acc + countFilled(f), 0);
  const reqPct = Math.round((reqFilled / Math.max(1, REQUIRED_FIELDS.length)) * 100);
  const overallPct = Math.round((overallFilled / Math.max(1, OVERALL_FIELDS.length)) * 100);

  // ----- step nav -----
  const nextStep = async () => {
    if (!validateStep()) return;
    if (step === 1) {
      const blocked = await dupCheckBlocking();
      if (blocked) return; // stop moving if duplicate
    }
    setStep((s) => Math.min(3, s + 1));
  };
  const prevStep = () => setStep((s) => Math.max(1, s - 1));

  // ----- close handling -----
  const hasUnsavedChanges = () => {
    const keys = [
      "mobileNo",
      "name",
      "location",
      "source",
      "gender",
      "maritalStatus",
      "age",
      "experience",
      "years",
      "skills",
      "email",
      "nursingWorks",
      "homeCareSkills",
      "otherSkills",
      "languages",
      "education",
      "workingHours",
      "addressLine1",
      "addressLine2",
      "city",
      "state",
      "pincode",
      "joiningType",
      "expectedSalary",
      "conversationLevel",
      "callReminderDate",
      "formComment",
      "photoDataUrl",
      "idProofDataUrl",
    ];
    return keys.some((k) => {
      const v = formData[k];
      return Array.isArray(v) ? v.length > 0 : String(v || "").trim() !== "";
    });
  };

  const resetForm = () => {
    setFormData({
      callId: "",
      callDate: todayYMD(),
      mobileNo: "",
      name: "",
      location: "",
      source: "",
      gender: "",
      maritalStatus: "",
      age: "",
      experience: "No",
      years: "",
      skills: "",
      email: "",
      nursingWorks: [],
      homeCareSkills: [],
      otherSkills: [],
      education: "",
      workingHours: "",
      languages: [],
      addressLine1: "",
      addressLine2: "",
      city: "",
      state: "",
      pincode: "",
      joiningType: "",
      expectedSalary: "",
      conversationLevel: "",
      callReminderDate: "",
      formComment: "",
      photoDataUrl: "",
      photoName: "",
      photoType: "",
      photoSize: 0,
      idProofDataUrl: "",
      idProofName: "",
      idProofType: "",
      idProofSize: 0,
      createdById: "",
      createdByName: "",
      createdAt: "",
      addedBy: "",
      userName: "",
      completionRequiredPct: 0,
      completionOverallPct: 0,
    });
    setStep(1);
    setErrors({});
    setOpenNursing(false);
    setOpenSkill(null);
  };

  const handleCloseClick = () => (hasUnsavedChanges() ? setShowCloseConfirmModal(true) : onClose?.());
  const confirmClose = () => {
    setShowCloseConfirmModal(false);
    resetForm();
    onClose?.();
  };
  const cancelClose = () => setShowCloseConfirmModal(false);

  // ----- submit -----
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep()) return;

    // final dup check
    if (formData.mobileNo && /^\d{10}$/.test(formData.mobileNo)) {
      const dup = await checkDuplicateMobile(formData.mobileNo);
      if (dup) {
        const existing = Object.values(dup)[0];
        setExistingWorker(existing);
        setShowDuplicateModal(true);
        return;
      }
    }

    const createdById = currentUser?.dbId || "";
    const createdByName =
      currentUser?.name || currentUser?.username || currentUser?.email?.split("@")[0] || "Unknown";

    const payload = {
      ...formData,
      createdById,
      createdByName,
      createdAt: formData.createdAt || new Date().toISOString(),
      addedBy: formData.addedBy || createdByName,
      userName: formData.userName || createdByName,
      // progress snapshots
      completionRequiredPct: reqPct,
      completionOverallPct: overallPct,
    };

    try {
      await firebaseDB.child("WorkerCallData").push(payload);
      setShowSuccessModal(true);
    } catch (err) {
      console.error("Error saving Worker:", err);
      alert("Error saving worker call. Please try again.");
    }
  };

  if (!isOpen) return null;

  const stepTitle = step === 1 ? "Basic Details" : step === 2 ? "Skills Details" : "Address & Preferences";

  return (
    <>
      {/* Main Modal */}
      <div className="modal fade show" style={{ display: "block", backgroundColor: "rgba(0,0,0,.9)" }}>
        <div className="modal-dialog modal-lg modal-dialog-centered client-form workerCallForm">
          <div className="modal-content shadow-lg border-0 rounded-4">
            <div className="modal-header">
              <div className="w-100">
                <div className="d-flex justify-content-between align-items-center">
                  <h3 className="modal-title mb-0">Worker Call Form</h3>
                  <button type="button" className="btn-close btn-close-white" onClick={handleCloseClick} />
                </div>

                {/* Progress */}
                <div className="mt-2">
                  <div className="small text-muted d-flex justify-content-between">
                    <span>
                      Step {step} of 3 · <strong>{stepTitle}</strong>
                    </span>
                    <span>
                      Required: {reqPct}% · Overall: {overallPct}%
                    </span>
                  </div>
                  <div className="progress" style={{ height: 6 }}>
                    <div className="progress-bar bg-info" role="progressbar" style={{ width: `${reqPct}%` }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-body">
              <form onSubmit={handleSubmit}>
                {/* STEP 1 */}
                {step === 1 && (
                  <div>
                    <h5 className="mb-3">Basic Details</h5>
                    <hr />
                    <div className="row mb-3">
                      <div className="col-md-6">
                        <label className="form-label">
                          Call ID <span className="star">*</span>
                        </label>
                        <input
                          type="text"
                          name="callId"
                          value={formData.callId}
                          className={`form-control ${errors.callId ? "is-invalid" : ""}`}
                          disabled
                          readOnly
                        />
                        {errors.callId && <div className="invalid-feedback">{errors.callId}</div>}
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">
                          Date <span className="star">*</span>
                        </label>
                        <input
                          type="date"
                          name="callDate"
                          value={formData.callDate}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          className={`form-control ${errors.callDate ? "is-invalid" : ""}`}
                          disabled
                          max={todayYMD()}
                        />
                        {errors.callDate && <div className="invalid-feedback">{errors.callDate}</div>}
                      </div>
                    </div>

                    <div className="row mb-3">
                      <div className="col-md-6">
                        <label className="form-label">
                          Mobile No <span className="star">*</span>
                        </label>
                        <input
                          type="tel"
                          name="mobileNo"
                          value={formData.mobileNo}
                          onChange={handleChange}
                          onBlur={async () => {
                            // show dup modal on blur (informational), but block in nextStep too
                            const blocked = await dupCheckBlocking();
                            if (!blocked && errors.mobileNo) setErrors((p) => ({ ...p, mobileNo: "" }));
                          }}
                          className={`form-control ${errors.mobileNo ? "is-invalid" : ""}`}
                          maxLength={10}
                          autoFocus
                        />
                        {errors.mobileNo && <div className="invalid-feedback">{errors.mobileNo}</div>}
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">
                          Name <span className="star">*</span>
                        </label>
                        <input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          className={`form-control ${errors.name ? "is-invalid" : ""}`}
                        />
                        {errors.name && <div className="invalid-feedback">{errors.name}</div>}
                      </div>
                    </div>

                    <div className="row mb-3">
                      <div className="col-md-6">
                        <label className="form-label">
                          From / Location <span className="star">*</span>
                        </label>
                        <input
                          type="text"
                          name="location"
                          value={formData.location}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          className={`form-control ${errors.location ? "is-invalid" : ""}`}
                        />
                        {errors.location && <div className="invalid-feedback">{errors.location}</div>}
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">
                          Source <span className="star">*</span>
                        </label>
                        <select
                          name="source"
                          value={formData.source}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          className={`form-select ${errors.source ? "is-invalid" : ""}`}
                        >
                          <option value="">Select</option>
                          {[
                            "Apana",
                            "WorkerIndian",
                            "Reference",
                            "Poster",
                            "Agent",
                            "Facebook",
                            "LinkedIn",
                            "Instagram",
                            "YouTube",
                            "Website",
                            "Just Dail",
                            "News Paper",
                          ].map((src) => (
                            <option key={src} value={src}>
                              {src}
                            </option>
                          ))}
                        </select>
                        {errors.source && <div className="invalid-feedback">{errors.source}</div>}
                      </div>
                    </div>

                    <div className="row mb-3">
                      <div className="col-md-6">
                        <label className="form-label">
                          Gender <span className="star">*</span>
                        </label>
                        <select
                          name="gender"
                          value={formData.gender}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          className={`form-select ${errors.gender ? "is-invalid" : ""}`}
                        >
                          <option value="">Select</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Others">Others</option>
                        </select>
                        {errors.gender && <div className="invalid-feedback">{errors.gender}</div>}
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Marital Status</label>
                        <select
                          name="maritalStatus"
                          value={formData.maritalStatus}
                          onChange={handleChange}
                          className="form-select"
                        >
                          <option value="">Select</option>
                          <option value="Married">Married</option>
                          <option value="Un Married">Un Married</option>
                          <option value="Single">Single</option>
                          <option value="Widow">Widow</option>
                        </select>
                      </div>
                    </div>

                    <div className="row mb-3">
                      <div className="col-md-6">
                        <label className="form-label">
                          Age <span className="star">*</span>
                        </label>
                        <input
                          type="number"
                          name="age"
                          value={formData.age}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          className={`form-control ${errors.age ? "is-invalid" : ""}`}
                        />
                        {errors.age && <div className="invalid-feedback">{errors.age}</div>}
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Email (optional)</label>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          className={`form-control ${errors.email ? "is-invalid" : ""}`}
                          placeholder="name@example.com"
                        />
                        {errors.email && <div className="invalid-feedback">{errors.email}</div>}
                      </div>
                    </div>

                    <div className="row mb-2">
                      <div className="col-md-6">
                        <label className="form-label">
                          Experience <span className="star">*</span>
                        </label>
                        <div>
                          <div className="form-check form-check-inline">
                            <input type="radio" name="experience" value="Yes" checked={formData.experience === "Yes"} onChange={handleChange} />
                            <label className="form-check-label">&nbsp;&nbsp;Yes</label>
                          </div>
                          <div className="form-check form-check-inline">
                            <input type="radio" name="experience" value="No" checked={formData.experience === "No"} onChange={handleChange} />
                            <label className="form-check-label">&nbsp;&nbsp;No</label>
                          </div>
                        </div>
                      </div>
                    </div>

                    {formData.experience === "Yes" && (
                      <div className="row mb-3">
                        <div className="col-md-6">
                          <label className="form-label">Years</label>
                          <input
                            type="text"
                            name="years"
                            value={formData.years}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            className={`form-control ${errors.years ? "is-invalid" : ""}`}
                          />
                          {errors.years && <div className="invalid-feedback">{errors.years}</div>}
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">Primary Skill</label>
                          <select
                            name="skills"
                            value={formData.skills}
                            onChange={(e) => {
                              const v = e.target.value;
                              setFormData((p) => ({ ...p, skills: v }));
                              if (v === "Nursing") setOpenNursing(true);
                            }}
                            onBlur={handleBlur}
                            className={`form-select ${errors.skills ? "is-invalid" : ""}`}
                          >
                            <option value="">-- Select Skill --</option>
                            {HOME_CARE_OPTS.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                          {errors.skills && <div className="invalid-feedback">{errors.skills}</div>}
                        </div>
                      </div>
                    )}

                    {/* Nursing Works IN STEP 1 (mandatory if Primary=Nursing) */}
                    {formData.skills === "Nursing" && (
                      <div className="mb-2">
                        <div className="accordion" id="nursingAccordion">
                          <div className="accordion-item bg-dark text-white border-0 rounded-3">
                            <h2 className="accordion-header">
                              <button
                                type="button"
                                className={`accordion-button ${openNursing ? "" : "collapsed"} bg-info text-dark`}
                                onClick={() => setOpenNursing(!openNursing)}
                              >
                                Nursing Works (select at least one)
                              </button>
                            </h2>
                            <div className={`accordion-collapse collapse ${openNursing ? "show" : ""}`}>
                              <div className="accordion-body">
                                <div className="d-flex flex-wrap gap-2">
                                  {NURSING_WORKS.map((nw) => {
                                    const active = formData.nursingWorks.includes(nw);
                                    return (
                                      <button
                                        key={nw}
                                        type="button"
                                        className={`btn btn-sm rounded-pill ${active ? "btn-info text-dark" : "btn-outline-info"}`}
                                        onClick={() => toggleArrayField("nursingWorks", nw)}
                                      >
                                        {nw}
                                      </button>
                                    );
                                  })}
                                </div>
                                {errors.nursingWorks && <div className="text-danger small mt-2">{errors.nursingWorks}</div>}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* STEP 2 */}
                {step === 2 && (
                  <div>
                    <h5 className="mb-3">Skills Details</h5>
                    <hr />

                    <div className="mb-3 p-3 bg-dark rounded-3">
                      <h6 className="mb-2 text-warning">HOME CARE SKILLS</h6>
                      <div className="d-flex flex-wrap gap-2">
                        {HOME_CARE_OPTS.map((skill) => {
                          const active = formData.homeCareSkills.includes(skill);
                          return (
                            <button
                              type="button"
                              key={skill}
                              className={`btn btn-sm ${active ? "btn-warning" : "btn-outline-warning"} rounded-pill`}
                              onClick={() => toggleArrayField("homeCareSkills", skill)}
                            >
                              {skill}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="accordion" id="skillsAccordion">
                      {OTHER_SKILL_SECTIONS.map((sec, i) => {
                        const isOpen = openSkill === i;
                        const needsDark = isOpen && (sec.color === "warning" || sec.color === "info");
                        const headingBtnClass = isOpen
                          ? `accordion-button bg-${sec.color} ${needsDark ? "text-dark" : "text-white"}`
                          : "accordion-button collapsed bg-dark text-white";
                        return (
                          <div className="accordion-item bg-dark text-white border-0 mb-2 rounded-3" key={sec.title}>
                            <h2 className="accordion-header">
                              <button
                                type="button"
                                className={headingBtnClass}
                                style={{ borderRadius: "0.5rem" }}
                                onClick={() => setOpenSkill(isOpen ? null : i)}
                                aria-expanded={isOpen}
                                aria-controls={`skillSec${i}`}
                              >
                                {sec.title}
                              </button>
                            </h2>
                            <div
                              id={`skillSec${i}`}
                              className={`accordion-collapse collapse ${isOpen ? "show" : ""}`}
                              data-bs-parent="#skillsAccordion"
                            >
                              <div className="accordion-body">
                                <div className="d-flex flex-wrap gap-2">
                                  {sec.skills.map((s) => {
                                    const active = formData.otherSkills.includes(s);
                                    const pillNeedsDark = (sec.color === "warning" || sec.color === "info") && active;
                                    return (
                                      <button
                                        key={s}
                                        type="button"
                                        className={`btn btn-sm rounded-pill ${active ? `btn-${sec.color}${pillNeedsDark ? " text-dark" : ""}` : `btn-outline-${sec.color}`
                                          }`}
                                        onClick={() => toggleArrayField("otherSkills", s)}
                                      >
                                        {s}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <hr />
                    <div className="row mb-3">
                      <div className="col-md-6">
                        <label className="form-label">
                          Education <span className="star">*</span>
                        </label>
                        <input
                          type="text"
                          name="education"
                          value={formData.education}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          className={`form-control ${errors.education ? "is-invalid" : ""}`}
                        />
                        {errors.education && <div className="invalid-feedback">{errors.education}</div>}
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Working Hours</label>
                        <div>
                          <div className="form-check form-check-inline">
                            <input type="radio" name="workingHours" value="12" checked={formData.workingHours === "12"} onChange={handleChange} />
                            <label className="form-check-label">&nbsp;&nbsp;12 Hours</label>
                          </div>
                          <div className="form-check form-check-inline">
                            <input type="radio" name="workingHours" value="24" checked={formData.workingHours === "24"} onChange={handleChange} />
                            <label className="form-check-label">&nbsp;&nbsp;24 Hours</label>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mb-2 p-3 bg-dark rounded-3">
                      <p className="form-label text-warning">
                        <strong>Languages Known</strong>
                      </p>
                      {["Telugu", "Hindi", "English", "Urdu", "Kannada", "Malayalam", "Tamil", "Oriya", "Bengali", "Marathi"].map((lang) => (
                        <div className="form-check form-check-inline" key={lang}>
                          <input
                            type="checkbox"
                            className="form-check-input"
                            name="languages"
                            value={lang}
                            checked={formData.languages.includes(lang)}
                            onChange={handleChange}
                          />
                          <label className="form-check-label">{lang}</label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* STEP 3 */}
                {step === 3 && (
                  <div>
                    <h5 className="mb-3">Address & Preferences (Optional)</h5>
                    <hr />
                    <div className="row mb-2">
                      <div className="col-md-6">
                        <label className="form-label">Address Line 1</label>
                        <input type="text" name="addressLine1" value={formData.addressLine1} onChange={handleChange} className="form-control" />
                      </div>

                      <div className="col-md-6">
                        <label className="form-label">Address Line 2</label>
                        <input type="text" name="addressLine2" value={formData.addressLine2} onChange={handleChange} className="form-control" />
                      </div>
                    </div>

                    <div className="row mb-3">
                      <div className="col-md-4">
                        <label className="form-label">City</label>
                        <input type="text" name="city" value={formData.city} onChange={handleChange} className="form-control" />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">State</label>
                        <input type="text" name="state" value={formData.state} onChange={handleChange} className="form-control" />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">PIN Code</label>
                        <input
                          type="text"
                          name="pincode"
                          value={formData.pincode}
                          onChange={handleChange}
                          className={`form-control ${errors.pincode ? "is-invalid" : ""}`}
                          maxLength={6}
                        />
                        {errors.pincode && <div className="invalid-feedback">{errors.pincode}</div>}
                      </div>
                    </div>

                    <div className="row mb-3">
                      <div className="col-md-6">
                        <label className="form-label">
                          Joining Type <span className="star">*</span>
                        </label>
                        <select
                          name="joiningType"
                          value={formData.joiningType}
                          onChange={handleChange}
                          className={`form-select ${errors.joiningType ? "is-invalid" : ""}`}
                        >
                          <option value="">Select Joining Type</option>
                          <option value="Immediate">Immediate</option>
                          <option value="1 Week">1 Week</option>
                          <option value="15 Days">15 Days</option>
                          <option value="Flexible">Flexible</option>
                          <option value="Negotiable">Negotiable</option>
                        </select>
                        {errors.joiningType && <div className="invalid-feedback">{errors.joiningType}</div>}
                      </div>

                      <div className="col-md-6">
                        <label className="form-label">Expected Salary</label>
                        <input type="tel" name="expectedSalary" value={formData.expectedSalary} onChange={handleChange} className="form-control" maxLength={6} />
                      </div>
                    </div>

                    <div className="row mb-3">
                      <div className="col-md-6">
                        <label className="form-label">Conversation Level  <span className="star">*</span></label>
                        <select
                          name="conversationLevel"
                          value={formData.conversationLevel}
                          onChange={handleChange}
                          className={`form-select ${errors.conversationLevel ? "is-invalid" : ""}`}
                        >
                          <option value="">Select</option>
                          <option value="Very Good">Very Good</option>
                          <option value="Good">Good</option>
                          <option value="Average">Average</option>
                          <option value="Below Average">Below Average</option>
                          <option value="Bad">Bad</option>
                          <option value="Very Bad">Very Bad</option>
                        </select>
                        {errors.conversationLevel && <div className="invalid-feedback">{errors.conversationLevel}</div>}
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Call Reminder Date</label>
                        <div className="input-group">
                          <input
                            type="date"
                            name="callReminderDate"
                            value={formData.callReminderDate}
                            onChange={handleChange}
                            className={`form-control ${errors.callReminderDate ? "is-invalid" : ""}`}
                            min={todayYMD()}
                          />
                          {formData.callReminderDate && (
                            <button
                              type="button"
                              className="btn btn-outline-secondary"
                              onClick={() => setFormData((p) => ({ ...p, callReminderDate: "" }))}
                            >
                              Clear
                            </button>
                          )}
                          {errors.callReminderDate && <div className="invalid-feedback d-block">{errors.callReminderDate}</div>}
                        </div>
                      </div>
                    </div>

                    <div className="row mb-3">
                      {/* Photo (≤100KB, JPG/PNG) */}
                      <div className="col-md-6">
                        <label className="form-label">Photo (optional)</label>
                        <input type="file" accept=".jpg,.jpeg,.png" className="form-control" onChange={onPhotoChange} />
                        {formData.photoDataUrl && (
                          <div className="mt-2 d-flex align-items-center gap-2">
                            <img
                              src={formData.photoDataUrl}
                              alt="photo"
                              className="rounded"
                              style={{ width: 72, height: 72, objectFit: "cover" }}
                            />
                            <div className="btn-group">
                              <button
                                type="button"
                                className="btn btn-outline-primary btn-sm"
                                onClick={() => openViewer("Photo", formData.photoDataUrl, formData.photoType)}
                              >
                                View
                              </button>
                              <button
                                type="button"
                                className="btn btn-outline-success btn-sm"
                                onClick={() => handleDownloadDataUrl(formData.photoName || "photo.jpg", formData.photoDataUrl)}
                              >
                                Download
                              </button>
                              <button
                                type="button"
                                className="btn btn-outline-secondary btn-sm"
                                onClick={() =>
                                  setFormData((p) => ({
                                    ...p,
                                    photoDataUrl: "",
                                    photoName: "",
                                    photoType: "",
                                    photoSize: 0,
                                  }))
                                }
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        )}
                        <div className="text-muted mt-1 opacity-75">JPG/PNG, ≤ 100 KB</div>
                      </div>

                      {/* ID Proof (≤150KB, PDF/JPG/PNG) */}
                      <div className="col-md-6">
                        <label className="form-label">ID Proof (optional)</label>
                        <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="form-control" onChange={onIdProofChange} />
                        {formData.idProofDataUrl && (
                          <div className="mt-2 d-flex align-items-center gap-2">
                            {/* thumbnail icon */}
                            {/^application\/pdf$/i.test(formData.idProofType) ? (
                              <div className="border rounded p-3 bg-light text-center" style={{ width: 72, height: 72 }}>
                                <i className="bi bi-file-earmark-pdf-fill text-danger" style={{ fontSize: "2rem" }} />
                              </div>
                            ) : (
                              <img
                                src={formData.idProofDataUrl}
                                alt="id"
                                className="rounded"
                                style={{ width: 72, height: 72, objectFit: "cover" }}
                              />
                            )}
                            <div className="btn-group">
                              <button
                                type="button"
                                className="btn btn-outline-primary btn-sm"
                                onClick={() => openViewer("ID Proof", formData.idProofDataUrl, formData.idProofType)}
                              >
                                View
                              </button>
                              <button
                                type="button"
                                className="btn btn-outline-success btn-sm"
                                onClick={() => handleDownloadDataUrl(formData.idProofName || "id-proof", formData.idProofDataUrl)}
                              >
                                Download
                              </button>
                              <button
                                type="button"
                                className="btn btn-outline-secondary btn-sm"
                                onClick={() =>
                                  setFormData((p) => ({
                                    ...p,
                                    idProofDataUrl: "",
                                    idProofName: "",
                                    idProofType: "",
                                    idProofSize: 0,
                                  }))
                                }
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        )}
                        <div className="text-muted mt-1 opacity-75">PDF/JPG/PNG, ≤ 150 KB</div>
                      </div>
                    </div>

                    <div className="mb-3">
                      <label className="form-label">
                        Comment <span className="star">*</span>
                      </label>
                      <textarea
                        className={`form-control border-secondary ${errors.formComment ? "is-invalid" : ""}`}
                        name="formComment"
                        value={formData.formComment}
                        onChange={handleChange}
                        rows={3}
                        placeholder="Enter a brief comment"
                      />
                      {errors.formComment && <div className="invalid-feedback">{errors.formComment}</div>}
                    </div>

                  </div>
                )}

                {/* Footer */}
                <div className="card-footer d-flex justify-content-end w-100 gap-2 mt-2">
                  {step > 1 && (
                    <button type="button" className="btn btn-secondary" onClick={prevStep}>
                      Previous
                    </button>
                  )}
                  {step < 3 && (
                    <button type="button" className="btn btn-info" onClick={nextStep}>
                      Next
                    </button>
                  )}
                  {step === 3 && (
                    <button type="submit" className="btn btn-success">
                      Submit
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Duplicate Modal */}
      {showDuplicateModal && (
        <div className="modal fade show d-block" style={{ background: "rgba(0,0,0,.6)", zIndex: 1110 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content rounded-3">
              <div className="modal-header">
                <h5 className="modal-title">Duplicate Mobile Number</h5>
                <button className="btn-close" onClick={() => setShowDuplicateModal(false)} />
              </div>
              <div className="modal-body">
                <p className="mb-2">
                  The mobile number <strong>{formData.mobileNo}</strong> already exists in the system.
                </p>
                {existingWorker ? (
                  <div className="small text-muted">
                    Existing: <strong>{existingWorker.name || "-"}</strong>{" "}
                    {existingWorker.callId ? `(Call ID: ${existingWorker.callId})` : ""}
                  </div>
                ) : null}
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowDuplicateModal(false)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Close-confirm Modal */}
      {showCloseConfirmModal && (
        <div className="modal fade show d-block" style={{ background: "rgba(0,0,0,.6)", zIndex: 1110 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content rounded-3">
              <div className="modal-header">
                <h5 className="modal-title">Discard changes?</h5>
                <button className="btn-close" onClick={cancelClose} />
              </div>
              <div className="modal-body">You have unsaved changes. Are you sure you want to close?</div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={cancelClose}>
                  No, stay
                </button>
                <button className="btn btn-danger" onClick={confirmClose}>
                  Yes, close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal (existing) */}
      {showSuccessModal && <SuccessModal show={true} onClose={confirmClose} title="Saved" message="Worker call saved successfully." />}

      {/* View Modal for Photo / ID Proof */}
      {viewOpen && (
        <div className="modal fade show d-block" style={{ background: "rgba(0,0,0,.7)", zIndex: 1120 }}>
          <div className="modal-dialog modal-xl modal-dialog-centered">
            <div className="modal-content rounded-3">
              <div className="modal-header">
                <h5 className="modal-title">{viewTitle}</h5>
                <button className="btn-close" onClick={() => setViewOpen(false)} />
              </div>
              <div className="modal-body" style={{ background: "#0b1220" }}>
                {/^application\/pdf$/i.test(viewType) ? (
                  <iframe
                    title="PDF Preview"
                    src={viewSrc}
                    style={{ width: "100%", height: "80vh", border: "none", background: "#fff" }}
                  />
                ) : (
                  <div className="text-center">
                    <img
                      src={viewSrc}
                      alt="preview"
                      style={{ maxWidth: "100%", maxHeight: "80vh", objectFit: "contain" }}
                    />
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button className="btn btn-light" onClick={() => setViewOpen(false)}>
                  Close
                </button>
                <button className="btn btn-success" onClick={() => handleDownloadDataUrl(viewTitle || "file", viewSrc)}>
                  Download
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
