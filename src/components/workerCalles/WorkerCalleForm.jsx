// src/components/workerCalles/WorkerCalleForm.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import firebaseDB from "../../firebase";
import { useAuth } from "../../context/AuthContext";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";


/* =======================================================
   Helpers
======================================================= */
const toYMD = (d = new Date()) => {
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
const toBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

const getEffectiveUserId = (u) => u?.dbId || u?.uid || u?.id || u?.key || null;
const getEffectiveUserName = (u, fallback = "System") => {
  const raw = u?.name || u?.displayName || u?.dbName || u?.username || u?.email || fallback || "System";
  return String(raw).trim().replace(/@.*/, "") || "System";
};

const DEFAULT_PHOTO_URL =
  "https://firebasestorage.googleapis.com/v0/b/jenceo-admin.firebasestorage.app/o/OfficeFiles%2FSample-Photo.jpg?alt=media&token=01855b47-c9c2-490e-b400-05851192dde7";


/* =======================================================
   Constants
======================================================= */
const TOTAL_STEPS = 6;

const HOME_CARE_OPTS = [
  "Nursing", "Patient Care", "Care Taker", "Bedside Attender", "Old Age Care", "Baby Care",
  "Supporting", "Cook", "Housekeeping", "Diaper", "Any Duty"
];

const NURSING_WORKS = [
  "Vital Signs Monitoring", "BP Check", "Sugar Check (Glucometer)", "Medication Administration",
  "IV/IM Injection", "Wound Dressing", "Catheter Care", "Ryle's Tube / NG Feeding", "PEG Feeding",
  "Nebulization", "Suctioning", "Oxygen Support", "Tracheostomy Care", "Bedsore Care",
  "Positioning & Mobility", "Bed Bath & Hygiene", "Diaper Change", "Urine Bag Change", "Post-Operative Care"
];

const OTHER_SKILL_SECTIONS = [
  { title: "Office & Administrative", color: "primary", skills: ["Computer Operating", "Data Entry", "Office Assistant", "Receptionist", "Front Desk Executive", "Admin Assistant", "Office Boy", "Peon", "Office Attendant"] },
  { title: "Customer Service & Telecommunication", color: "success", skills: ["Tele Calling", "Customer Support", "Telemarketing", "BPO Executive", "Call Center Agent", "Customer Care Executive"] },
  { title: "Management & Supervision", color: "warning", skills: ["Supervisor", "Manager", "Team Leader", "Site Supervisor", "Project Coordinator"] },
  { title: "Security", color: "danger", skills: ["Security Guard", "Security Supervisor", "Gatekeeper", "Watchman"] },
  { title: "Driving & Logistics", color: "info", skills: ["Driving", "Delivery Boy", "Delivery Executive", "Rider", "Driver", "Car Driver", "Bike Rider", "Logistics Helper"] },
  { title: "Technical & Maintenance", color: "secondary", skills: ["Electrician", "Plumber", "Carpenter", "Painter", "Mason", "AC Technician", "Mechanic", "Maintenance Staff", "House Keeping", "Housekeeping Supervisor"] },
  { title: "Industrial & Labor", color: "danger", skills: ["Labour", "Helper", "Loading Unloading", "Warehouse Helper", "Factory Worker", "Production Helper", "Packaging Staff"] },
  { title: "Retail & Sales", color: "primary", skills: ["Sales Boy", "Sales Girl", "Store Helper", "Retail Assistant", "Shop Attendant"] },
];

/* =======================================================
   Component
======================================================= */
export default function WorkerCalleForm({ isOpen = false, onClose = () => { }, onSaved }) {
  const { user: authUser } = useAuth?.() || {};
  const effectiveUserId = getEffectiveUserId(authUser);
  const effectiveUserName = getEffectiveUserName(authUser, "Unknown");

  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState({});
  const [openNursing, setOpenNursing] = useState(false);
  const [openOtherSkill, setOpenOtherSkill] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [duplicateInfo, setDuplicateInfo] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const firstRunRef = useRef(true);

  const [formData, setFormData] = useState({
    // Meta / Auto Id
    callId: "",
    callDate: toYMD(),
    createdAt: "",
    createdById: "",
    createdByName: "",
    addedBy: "",
    userName: "",

    // Step 1 — Basic
    mobileNo: "",
    name: "",
    gender: "",
    age: "",
    location: "",
    source: "",
    maritalStatus: "",
    email: "",

    // Step 2 — Skills & Education
    experience: "",
    years: "",
    skills: "",           // Primary Skill
    nursingWorks: [],
    homeCareSkills: [],
    otherSkills: [],
    education: "",
    collegeName: "",
    motherTongue: "",
    workingHours: "",
    languages: [],

    // Step 3 — Address & Preferences
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    pincode: "",
    expectedSalary: "",
    joiningType: "",
    conversationLevel: "",
    callReminderDate: "",
    formComment: "",

    // Step 4 — Uploads
    photoDataUrl: DEFAULT_PHOTO_URL,
    photoName: "",
    photoType: "",
    photoSize: 0,
    idProofDataUrl: "",
    idProofName: "",
    idProofType: "",
    idProofSize: 0,
    rating: 0,
  });

  const [nurseFilter, setNurseFilter] = useState("");     // filter text for nursing works
  const [rating, setRating] = useState(Number(formData?.rating ?? 0));

  /* -------------------- Auto-ID Generator (robust like BioData) -------------------- */
  useEffect(() => {
    if (!isOpen) return;
    let mounted = true;
    async function getNextId() {
      try {
        const snap = await firebaseDB.child("WorkerCallData").once("value");
        const ids = [];
        const v = snap.val();
        if (v) {
          Object.values(v).forEach((rec) => {
            const id = (rec?.callId || "").toString().trim();
            if (id) ids.push(id);
          });
        }
        // Support formats like WC12, WC0012, WC-12, WC-0012
        let next = "WC00001";
        if (ids.length > 0) {
          let maxNum = 0;
          let digits = 5;
          ids.forEach((id) => {
            const m = id.match(/^WC-?(\d+)$/i);
            if (m) {
              const num = parseInt(m[1], 10);
              if (!Number.isNaN(num) && num > maxNum) {
                maxNum = num;
                digits = Math.max(digits, m[1].length);
              }
            }
          });
          const padded = String(maxNum + 1).padStart(digits, "0");
          next = `WC${padded}`;
        }
        if (!mounted) return;
        setFormData((p) => ({
          ...p,
          callId: next,
          callDate: p.callDate || toYMD(),
          createdAt: new Date().toISOString(),
          createdById: effectiveUserId || "",
          createdByName: effectiveUserName || "Unknown",
          addedBy: effectiveUserName || "Unknown",
          userName: effectiveUserName || "Unknown",
        }));
      } catch (e) {
        if (!mounted) return;
        setFormData((p) => ({
          ...p,
          callId: "WC00001",
          createdAt: new Date().toISOString(),
          createdById: effectiveUserId || "",
          createdByName: effectiveUserName || "Unknown",
          addedBy: effectiveUserName || "Unknown",
          userName: effectiveUserName || "Unknown",
        }));
      }
    }
    getNextId();
    return () => { mounted = false; };
  }, [isOpen, effectiveUserId, effectiveUserName]);

  useEffect(() => {
    const hasNursing =
      formData.skills === "Nursing" ||
      (Array.isArray(formData.homeCareSkills) && formData.homeCareSkills.includes("Nursing"));

    setOpenNursing(hasNursing);

    if (!hasNursing) {
      // If user moved away from nursing, clear selected nursing works & errors
      setFormData((p) => (p.nursingWorks?.length
        ? { ...p, nursingWorks: [] }
        : p
      ));
      setErrors((prev) => {
        const n = { ...prev };
        delete n.nursingWorks;
        return n;
      });
    }
  }, [formData.skills, formData.homeCareSkills]);


  /* -------------------- Duplicate check on mobile -------------------- */
  const checkDuplicateMobile = async (mobile) => {
    if (!mobile || !/^\d{10}$/.test(mobile)) return null;
    try {
      const q = await firebaseDB
        .child("WorkerCallData")
        .orderByChild("mobileNo")
        .equalTo(mobile)
        .once("value");
      const val = q.val();
      if (!val) return null;
      const key = Object.keys(val)[0];
      return { recordId: key, ...val[key] };
    } catch {
      return null;
    }
  };

  /* -------------------- Field handlers -------------------- */
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === "checkbox") {
      const current = Array.isArray(formData[name]) ? formData[name] : [];
      const nextArr = checked ? [...current, value] : current.filter((x) => x !== value);
      setFormData((prev) => ({ ...prev, [name]: nextArr }));

      if (name === "nursingWorks") {
        setOpenNursing(true);
        // clear error as soon as at least one is selected
        setErrors((prev) => {
          const n = { ...prev };
          if (nextArr.length > 0) delete n.nursingWorks;
          return n;
        });
      } else {
        // generic: clear this checkbox field's error if any
        if (errors[name]) {
          setErrors((prev) => { const n = { ...prev }; delete n[name]; return n; });
        }
      }
      return;
    }
    if (name === "mobileNo") {
      // digits only, 10 max
      if (value && !/^\d*$/.test(value)) return;
      if (value.length > 10) return;
    }
    if (name === "pincode") {
      if (value && !/^\d*$/.test(value)) return;
      if (value.length > 6) return;
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => { const n = { ...prev }; delete n[name]; return n; });
  };

  const handleBlur = async (e) => {
    const { name, value } = e.target;
    if (name === "mobileNo") {
      if (value && !/^\d{10}$/.test(value)) {
        setErrors((p) => ({ ...p, mobileNo: "Mobile must be 10 digits" }));
      } else if (value) {
        const dup = await checkDuplicateMobile(value);
        setDuplicateInfo(dup);
      }
    }
    if (name === "email" && value) {
      const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      if (!ok) setErrors((p) => ({ ...p, email: "Invalid email format" }));
    }
    if (name === "pincode" && value && !/^\d{6}$/.test(value)) {
      setErrors((p) => ({ ...p, pincode: "PIN must be 6 digits" }));
    }
  };

  const toggleSkillPill = (field, val) => {
    setFormData((prev) => {
      const arr = Array.isArray(prev[field]) ? prev[field] : [];
      const exists = arr.includes(val);
      const next = exists ? arr.filter((x) => x !== val) : [...arr, val];
      return { ...prev, [field]: next };
    });
  };

  /* -------------------- Uploads -------------------- */
  const onPhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return setFormData((p) => ({ ...p, photoDataUrl: "", photoName: "", photoType: "", photoSize: 0 }));
    if (!/image\/(jpeg|jpg|png|gif)/i.test(file.type)) return setErrors((p) => ({ ...p, photoDataUrl: "Photo must be JPG/PNG/GIF" }));
    if (file.size > 100 * 1024) return setErrors((p) => ({ ...p, photoDataUrl: "Image must be ≤ 100KB" }));
    const dataUrl = await toBase64(file);
    setFormData(p => ({
      ...p,
      photoDataUrl: dataUrl,
      photoName: file.name,
      photoType: file.type,
      photoSize: file.size,
      photoFile: file,                 // + keep file for storage upload
    }));
    setErrors((p) => { const n = { ...p }; delete n.photoDataUrl; return n; });
  };
  const onIdProofChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return setFormData((p) => ({ ...p, idProofDataUrl: "", idProofName: "", idProofType: "", idProofSize: 0 }));
    const valid = file.type === "application/pdf" || /image\/(jpeg|jpg|png)/i.test(file.type);
    if (!valid) return setErrors((p) => ({ ...p, idProofDataUrl: "ID Proof must be PDF or Image" }));
    if (file.size > 150 * 1024) return setErrors((p) => ({ ...p, idProofDataUrl: "File must be ≤ 150KB" }));
    const dataUrl = await toBase64(file);
    setFormData(p => ({
      ...p,
      idProofDataUrl: dataUrl,
      idProofName: file.name,
      idProofType: file.type,
      idProofSize: file.size,
      idProofFile: file,               // + keep file for storage upload
    }));
    setErrors((p) => { const n = { ...p }; delete n.idProofDataUrl; return n; });
  };

  /* -------------------- Progress -------------------- */
  const REQUIRED_FIELDS = useMemo(() => {
    return [
      // Step 1
      "mobileNo", "name", "gender", "age", "location", "source",
      // Step 2
      "education", "motherTongue", "experience", "skills",
      ...(formData.experience === "Yes" ? ["years"] : []),
      ...(formData.skills === "Nursing" ? ["nursingWorks"] : []),
      // Step 4
      "joiningType", "conversationLevel", "formComment",
    ];
  }, [formData.experience, formData.skills]);


  const countFilled = (f) => {
    const v = formData[f];
    if (Array.isArray(v)) return v.length > 0 ? 1 : 0;
    return v !== undefined && v !== null && String(v).trim() !== "" ? 1 : 0;
  };
  const reqFilled = REQUIRED_FIELDS.reduce((acc, f) => acc + countFilled(f), 0);
  const reqPct = Math.round((reqFilled / Math.max(1, REQUIRED_FIELDS.length)) * 100);

  // Overall progress across many fields (counts non-empty fields)
  const PROGRESS_FIELDS = [
    "mobileNo", "name", "gender", "age", "maritalStatus", "location", "source", "email",
    "education", "collegeName", "motherTongue", "languages", "experience", "years", "skills",
    "homeCareSkills", "nursingWorks", "otherSkills",
    "addressLine1", "addressLine2", "city", "state", "pincode",
    "expectedSalary", "joiningType", "conversationLevel", "callReminderDate", "formComment",
    "photoDataUrl", "idProofDataUrl"
  ];
  const progressFilled = PROGRESS_FIELDS.reduce((acc, f) => {
    const v = formData[f];
    const filled = Array.isArray(v) ? v.length > 0 : (v !== undefined && v !== null && String(v).trim() !== "");
    return acc + (filled ? 1 : 0);
  }, 0);
  const overallPct = Math.round((progressFilled / PROGRESS_FIELDS.length) * 100);

  /* -------------------- Validation per step (BioData style) -------------------- */

  const checkValidationForStep = (s) => {
    const e = {};
    switch (s) {
      case 1: {
        if (!formData.callId) e.callId = "Call ID missing";
        if (!formData.callDate) e.callDate = "Date required";
        if (!formData.mobileNo) e.mobileNo = "Mobile is required";
        else if (!/^\d{10}$/.test(formData.mobileNo)) e.mobileNo = "Mobile must be 10 digits";
        if (!formData.name) e.name = "Name is required";
        if (!formData.gender) e.gender = "Gender is required";
        if (!formData.age) e.age = "Age is required";
        if (!formData.location) e.location = "Location is required";
        if (!formData.source) e.source = "Source is required";
        if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) e.email = "Invalid email";
        break;
      }
      case 2: {
        // Education + Primary skill (languages optional)
        if (!formData.education) e.education = "Education is required";
        if (!formData.experience) e.experience = "Experience is required";
        if (!formData.skills) e.skills = "Primary Skill is required";
        break;
      }

      case 3: {
        // Experience + Years + Nursing works if Nursing selected
        if (formData.experience === "Yes" && !formData.years) e.years = "Years required";
        if (formData.skills === "Nursing" && (!formData.nursingWorks || formData.nursingWorks.length === 0)) {
          e.nursingWorks = "Select at least one nursing work";
        }
        break;
      }
      case 4: {
        // Address & Preferences (+ Mother Tongue)
        if (formData.pincode && !/^\d{6}$/.test(formData.pincode)) e.pincode = "PIN must be 6 digits";
        if (formData.callReminderDate) {
          const d = new Date(formData.callReminderDate);
          if (d < startOfToday()) e.callReminderDate = "Reminder cannot be in the past";
        }
        if (!formData.motherTongue) e.motherTongue = "Mother Tongue is required";
        if (!formData.joiningType) e.joiningType = "Joining Type required";
        if (!formData.conversationLevel) e.conversationLevel = "Conversation Level required";
        if (!formData.formComment || !String(formData.formComment).trim()) e.formComment = "Comment required";
        break;
      }
      case 5: {
        // Uploads (optional) - validate sizes if present
        if (formData.photoDataUrl && formData.photoSize > 100 * 1024) e.photoDataUrl = "Image must be ≤ 100KB";
        if (formData.idProofDataUrl && formData.idProofSize > 150 * 1024) e.idProofDataUrl = "File must be ≤ 150KB";
        break;
      }
      case 6: {
        // Final recheck criticals
        const e1 = checkValidationForStep(1);
        const e2 = checkValidationForStep(2);
        const e3 = checkValidationForStep(3);
        const e4 = checkValidationForStep(4);
        return { ...e1, ...e2, ...e3, ...e4 };
      }
      default:
        break;
    }
    return e;
  };

  const validateCurrentStep = (s) => {
    const e = checkValidationForStep(s);
    if (Object.keys(e).length > 0) {
      setErrors((prev) => ({ ...prev, ...e }));
      const firstKey = Object.keys(e)[0];
      setTimeout(() => {
        const el = document.querySelector(`[name="${firstKey}"]`);
        if (el?.focus) el.focus();
        el?.scrollIntoView?.({ behavior: "smooth", block: "center" });
      }, 60);
      return false;
    }
    // clear step errors
    setErrors((prev) => {
      const n = { ...prev };
      Object.keys(e).forEach((k) => delete n[k]);
      return n;
    });
    return true;
  };

  /* -------------------- Navigation -------------------- */
  const nextStep = async () => {
    if (!validateCurrentStep(step)) return;
    if (step === 1 && duplicateInfo) {
      const proceed = window.confirm(`This mobile already exists for ${duplicateInfo?.name || "a record"} (Call ID: ${duplicateInfo?.callId || "N/A"}). Do you want to continue anyway?`);
      if (!proceed) return;
    }
    setStep((s) => Math.min(TOTAL_STEPS, s + 1));
  };
  const prevStep = () => setStep((s) => Math.max(1, s - 1));

  const hasUnsavedChanges = useMemo(() => {
    const keys = ["mobileNo", "name", "gender", "age", "location", "source", "email", "experience", "years", "skills", "nursingWorks", "homeCareSkills", "otherSkills", "education", "collegeName", "motherTongue", "workingHours", "languages", "addressLine1", "addressLine2", "city", "state", "pincode", "expectedSalary", "joiningType", "conversationLevel", "callReminderDate", "formComment", "photoDataUrl", "idProofDataUrl"];
    return keys.some((k) => {
      const v = formData[k];
      return Array.isArray(v) ? v.length > 0 : String(v || "").trim() !== "";
    });
  }, [formData]);

  const handleClose = () => {
    if (hasUnsavedChanges) setShowCloseConfirm(true);
    else onClose?.();
  };

  const resetAll = () => {
    setFormData((p) => ({
      ...p,
      callId: "",
      callDate: toYMD(),
      createdAt: "",
      createdById: "",
      createdByName: "",
      addedBy: "",
      userName: "",
      mobileNo: "",
      name: "",
      gender: "",
      age: "",
      location: "",
      source: "",
      maritalStatus: "",
      email: "",
      experience: "No",
      years: "",
      skills: "",
      nursingWorks: [],
      homeCareSkills: [],
      otherSkills: [],
      education: "",
      collegeName: "",
      motherTongue: "",
      workingHours: "",
      languages: [],
      addressLine1: "",
      addressLine2: "",
      city: "",
      state: "",
      pincode: "",
      expectedSalary: "",
      joiningType: "",
      conversationLevel: "",
      callReminderDate: "",
      formComment: "",
      photoDataUrl: DEFAULT_PHOTO_URL,
      photoName: "",
      photoType: "",
      photoSize: 0,
      idProofDataUrl: "",
      idProofName: "",
      idProofType: "",
      idProofSize: 0,
      setRating: 0,
    }));
    setErrors({});
    setStep(1);
    setOpenNursing(false);
    setOpenOtherSkill(null);
    setDuplicateInfo(null);
    setSuccess(null);
  };

  /* -------------------- Submit -------------------- */
  const handleSubmit = async (e) => {
    e?.preventDefault?.();

    if (isSaving) return;       // guard double clicks
    setIsSaving(true);

    // Final full-form validation before any uploads or DB writes
    const allErrors = checkValidationForStep(6);
    if (Object.keys(allErrors).length > 0) {
      setErrors(prev => ({ ...prev, ...allErrors }));
      const firstKey = Object.keys(allErrors)[0];

      // Send the user to the step that contains the first missing/invalid field
      const stepByField = (k) => {
        const step1 = ["callId", "callDate", "mobileNo", "name", "gender", "age", "location", "source", "email"];
        const step2 = ["education", "motherTongue", "experience", "years", "skills", "languages", "homeCareSkills", "nursingWorks", "otherSkills", "collegeName", "workingHours"];
        const step4 = ["addressLine1", "addressLine2", "city", "state", "pincode", "expectedSalary", "joiningType", "conversationLevel", "callReminderDate", "formComment"];
        if (step1.includes(k)) return 1;
        if (step2.includes(k)) return 2;
        // nursingWorks enforced from Primary/Nursing is conceptually step 2 in your UI
        if (k === "nursingWorks") return 2;
        if (step4.includes(k)) return 4;
        return 1;
      };

      const goto = stepByField(firstKey);
      setStep(goto);

      // Focus & scroll to the exact field after step switches
      setTimeout(() => {
        const el = document.querySelector(`[name="${firstKey}"]`);
        if (el?.focus) el.focus();
        el?.scrollIntoView?.({ behavior: "smooth", block: "center" });
      }, 120);

      setIsSaving(false);
      return; // 🚫 Do NOT continue to uploads / push
    }

    const storage = getStorage();
    let employeePhotoUrl = null;
    let idProofUrl = null;

    try {
      const idForPath = formData.callId || `WC${Date.now()}`; // always stable for the record

      // Only upload if we actually have a file AND no URL was already set on this form
      if (formData.photoFile) {
        const ext = (formData.photoName || "").split(".").pop()?.toLowerCase() || "jpg";
        const sRef = storageRef(storage, `WorkerCallData/${idForPath}/photo.${ext}`);
        await uploadBytes(sRef, formData.photoFile);
        employeePhotoUrl = await getDownloadURL(sRef);
      }

      if (formData.idProofFile) {
        const ext = (formData.idProofName || "").split(".").pop()?.toLowerCase() || "pdf";
        const sRef = storageRef(storage, `WorkerCallData/${idForPath}/id-proof.${ext}`);
        await uploadBytes(sRef, formData.idProofFile);
        idProofUrl = await getDownloadURL(sRef);
      }
    } catch (upErr) {
      console.error("Upload failed:", upErr);
      alert("Upload failed. Please try smaller/valid files.");
      setIsSaving(false);
      return;
    }

    // ---- Compute completion percentages (for save payload)
    const REQUIRED_FIELDS_COUNT = REQUIRED_FIELDS.length || 1;
    const completionRequiredPct = Math.round(
      (REQUIRED_FIELDS.reduce(
        (acc, f) =>
          acc +
          (Array.isArray(formData[f])
            ? formData[f].length > 0
              ? 1
              : 0
            : String(formData[f] || "").trim() !== "" ? 1 : 0),
        0
      ) / REQUIRED_FIELDS_COUNT) * 100
    );

    const ALL_FIELDS = [
      ...new Set([
        ...REQUIRED_FIELDS,
        "maritalStatus",
        "email",
        "homeCareSkills",
        "otherSkills",
        "addressLine1",
        "addressLine2",
        "city",
        "state",
        "pincode",
        "expectedSalary",
        "joiningType",
        "conversationLevel",
        "callReminderDate",
        "photoDataUrl",
        "idProofDataUrl",
      ]),
    ];

    const completionOverallPct = Math.round(
      (ALL_FIELDS.reduce(
        (acc, f) =>
          acc +
          (Array.isArray(formData[f])
            ? formData[f].length > 0
              ? 1
              : 0
            : String(formData[f] || "").trim() !== "" ? 1 : 0),
        0
      ) / ALL_FIELDS.length) * 100
    );


    // ---- Build payload AFTER uploads; never put undefined in object
    const payload = {
      ...formData,
      rating: Number(formData.rating || rating || 0),

      ...(employeePhotoUrl ? { employeePhotoUrl } : {}),
      ...(idProofUrl ? { idProofUrl } : {}),

      employeePhotoPreview: null,
      idProofPreview: null,

      createdAt: formData.createdAt || new Date().toISOString(),
      createdById: effectiveUserId || formData.createdById,
      createdByName: getEffectiveUserName({ name: effectiveUserName }) || formData.createdByName,
      addedBy: formData.addedBy || effectiveUserName,
      userName: formData.userName || effectiveUserName,
      completionRequiredPct,
      completionOverallPct,
    };

    try {
      await firebaseDB.child("WorkerCallData").push(payload);
      const savedSummary = { callId: payload.callId, name: payload.name };
      resetAll();
      setSuccess(savedSummary);
      if (typeof onSaved === "function") onSaved(payload);
    } catch (err) {
      console.error("Error saving worker call:", err);
      alert("Error saving record. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };



  if (!isOpen) return null;

  /* =======================================================
     Render
  ======================================================= */
  const StepTitle = () => {
    const map = {
      1: "Basic Details",
      2: "Education & Primary Skill",
      3: "Experience & Skills",
      4: "Address & Preferences",
      5: "Uploads (Optional)",
      6: "Review & Submit",
    };
    return map[step] || "Worker Call Form";
  };

  return (
    <>
      <div className="modal fade show worker-call-gray" style={{ display: "block", backgroundColor: "rgba(0,0,0,.90)" }}>
        <div className="modal-dialog modal-lg modal-dialog-centered worker-call-form">
          <div className="modal-content shadow-lg border-0 rounded-4 bg-dark text-light">
            <div className="modal-header bg-dark text-light border-dark">
              <div className="w-100">
                <div className="d-flex justify-content-between align-items-center">
                  <h3 className="modal-title mb-0">Worker Call Form</h3>
                  <button type="button" className="btn-close btn-close-white" onClick={handleClose} />
                </div>

                {/* Progress + Stepper */}
                {/* Progress + Stepper */}
                <div className="mt-3">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="text-light small">
                      Step <strong className="text-warning">{step}</strong> of <strong>{TOTAL_STEPS}</strong> ·
                      <span className="text-warning ms-1">{StepTitle()}</span>
                    </span>
                    <span className="text-light small">
                      Progress: <strong className="text-warning">{overallPct}%</strong> completed
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="position-relative"
                    style={{
                      top: "20px",
                    }}

                  >
                    <div
                      className="progress"
                      style={{
                        height: "8px",
                        background: "rgba(255,255,255,0.1)",
                        borderRadius: "10px",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        className="progress-bar"
                        role="progressbar"
                        style={{
                          width: `${(step / TOTAL_STEPS) * 100}%`,
                          transition: "width 0.4s ease-in-out",
                          background: "linear-gradient(90deg, #f59e0b, #fbbf24)",
                          borderRadius: "10px"
                        }}
                      />
                    </div>
                  </div>

                  {/* Step Indicators */}
                  <div className="d-flex justify-content-between position-relative">
                    {/* Connecting Line */}
                    <div
                      className="position-absolute top-0 start-0 end-0" />

                    {Array.from({ length: TOTAL_STEPS }, (_, i) => {
                      const stepNumber = i + 1;
                      const isActive = step >= stepNumber;
                      const isCurrent = step === stepNumber;

                      return (
                        <div key={stepNumber} className="text-center position-relative" style={{ zIndex: 2 }}>
                          {/* Step Circle */}
                          <div
                            className={`rounded-circle d-flex align-items-center justify-content-center ${isActive
                              ? "bg-warning border-warning"
                              : "bg-secondary border-secondary"
                              } border-2`}
                            style={{
                              width: "30px",
                              height: "30px",
                              transition: "all 0.3s ease",
                              transform: isCurrent ? "scale(1.1)" : "scale(1)",
                              boxShadow: isCurrent ? "0 0 0 3px rgba(245, 158, 11, 0.3)" : "none"
                            }}
                          >
                            {isActive ? (
                              <i className="bi bi-check-lg text-dark small fw-bold"></i>
                            ) : (
                              <span className={`small fw-bold ${isActive ? "text-dark" : "text-light"}`}>
                                {stepNumber}
                              </span>
                            )}
                          </div>

                          {/* Step Label */}
                          <div className="mt-2">
                            <small
                              className={`fw-medium ${isActive ? "text-warning" : "text-muted"
                                }`}
                              style={{ fontSize: "0.7rem" }}
                            >
                              {(() => {
                                const stepLabels = {
                                  1: "Basic",
                                  2: "Education",
                                  3: "Skills",
                                  4: "Details",
                                  5: "Upload",
                                  6: "Review"
                                };
                                return stepLabels[stepNumber] || `Step ${stepNumber}`;
                              })()}
                            </small>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-body bg-dark text-light">
              {/* STEP 1 */}
              {step === 1 && (
                <div className="bg-dark p-3 rounded-4">
                  <h5 className="mb-3">Basic Details</h5><hr />
                  <div className="row mb-3">
                    <div className="col-md-6">
                      <label className="form-label">Call ID</label>
                      <input type="text" className={`form-control ${errors.callId ? "is-invalid" : ""}`} name="callId" value={formData.callId} readOnly disabled style={{ backgroundColor: "transparent" }} />
                      {errors.callId && <div className="invalid-feedback">{errors.callId}</div>}
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Date</label>
                      <input type="date" className={`form-control ${errors.callDate ? "is-invalid" : ""}`} name="callDate" value={formData.callDate} readOnly disabled style={{ backgroundColor: "transparent" }} />
                      {errors.callDate && <div className="invalid-feedback">{errors.callDate}</div>}
                    </div>
                  </div>

                  <div className="row mb-3">
                    <div className="col-md-6">
                      <label className="form-label">Mobile No <span className="star">*</span></label>
                      <input type="tel" name="mobileNo" className={`form-control ${errors.mobileNo ? "is-invalid" : ""}`} value={formData.mobileNo} onChange={handleChange} onBlur={handleBlur} maxLength={10} autoFocus />
                      {errors.mobileNo && <div className="invalid-feedback">{errors.mobileNo}</div>}
                      {duplicateInfo && !errors.mobileNo && (
                        <div className="form-text text-warning mt-1">Duplicate found: {duplicateInfo?.name || "record"} (Call ID: {duplicateInfo?.callId || "N/A"})</div>
                      )}
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Name <span className="star">*</span></label>
                      <input type="text" name="name" className={`form-control ${errors.name ? "is-invalid" : ""}`} value={formData.name} onChange={handleChange} onBlur={handleBlur} />
                      {errors.name && <div className="invalid-feedback">{errors.name}</div>}
                    </div>
                  </div>

                  <div className="row mb-3">
                    <div className="col-md-6">
                      <label className="form-label">Gender <span className="star">*</span></label>
                      <select name="gender" className={`form-select ${errors.gender ? "is-invalid" : ""}`} value={formData.gender} onChange={handleChange}>
                        <option value="">Select</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Others">Others</option>
                      </select>
                      {errors.gender && <div className="invalid-feedback">{errors.gender}</div>}
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Age <span className="star">*</span></label>
                      <input type="number" name="age" className={`form-control ${errors.age ? "is-invalid" : ""}`} value={formData.age} onChange={handleChange} onBlur={handleBlur} />
                      {errors.age && <div className="invalid-feedback">{errors.age}</div>}
                    </div>

                  </div>

                  <div className="row mb-3">
                    <div className="col-md-6">
                      <label className="form-label">From / Location <span className="star">*</span></label>
                      <input type="text" name="location" className={`form-control ${errors.location ? "is-invalid" : ""}`} value={formData.location} onChange={handleChange} onBlur={handleBlur} />
                      {errors.location && <div className="invalid-feedback">{errors.location}</div>}
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Source <span className="star">*</span></label>
                      <select name="source" className={`form-select ${errors.source ? "is-invalid" : ""}`} value={formData.source} onChange={handleChange}>
                        <option value="">Select</option>
                        {["Apana", "WorkerIndian", "Reference", "Poster", "Agent", "Facebook", "LinkedIn", "Instagram", "YouTube", "Website", "Just Dail", "News Paper"].map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                      {errors.source && <div className="invalid-feedback">{errors.source}</div>}
                    </div>



                  </div>

                  <div className="row mb-3">
                    <div className="col-md-6">
                      <label className="form-label">Marital Status</label>
                      <select name="maritalStatus" className="form-select" value={formData.maritalStatus} onChange={handleChange}>
                        <option value="">Select</option>
                        <option value="Married">Married</option>
                        <option value="Un Married">Un Married</option>
                        <option value="Single">Single</option>
                        <option value="Widow">Widow</option>
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Email (optional)</label>
                      <input type="email" name="email" className={`form-control ${errors.email ? "is-invalid" : ""}`} value={formData.email} onChange={handleChange} onBlur={handleBlur} placeholder="name@example.com" />
                      {errors.email && <div className="invalid-feedback">{errors.email}</div>}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2 */}
              {step === 2 && (

                <div className="bg-dark p-3 rounded-4">

                  <h5 className="mb-3">Education, Language & Skills</h5><hr />
                  <div className="row mb-3">
                    <div className="col-md-6">
                      <label className="form-label">Education <span className="star">*</span></label>
                      <input type="text" name="education" className={`form-control ${errors.education ? "is-invalid" : ""}`} value={formData.education} onChange={handleChange} />
                      {errors.education && <div className="invalid-feedback">{errors.education}</div>}
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">College Name (optional)</label>
                      <input type="text" name="collegeName" className="form-control" value={formData.collegeName} onChange={handleChange} placeholder="College / Institute" />
                    </div>
                  </div>

                  <div className="row mb-3">
                    <div className="col-md-6">
                      <label className="form-label">Mother Tongue <span className="star">*</span></label>
                      <select name="motherTongue" className={`form-select ${errors.motherTongue ? "is-invalid" : ""}`} value={formData.motherTongue} onChange={handleChange}>
                        <option value="">Select Mother Tongue</option>
                        {["Telugu", "English", "Hindi", "Urdu", "Tamil", "Kannada", "Malayalam", "Marathi", "Gujarati", "Bengali", "Punjabi", "Odia", "Assamese"].map((m) => <option key={m} value={m}>{m}</option>)}
                      </select>
                      {errors.motherTongue && <div className="invalid-feedback">{errors.motherTongue}</div>}
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Experience <span className="star">*</span></label><br />
                      <div className="form-check form-check-inline">
                        <input className="form-check-input" type="radio" name="experience" value="Yes"
                          checked={formData.experience === "Yes"} onChange={handleChange} />
                        <label className="form-check-label">Yes</label>
                      </div>
                      <div className="form-check form-check-inline">
                        <input className="form-check-input" type="radio" name="experience" value="No"
                          checked={formData.experience === "No"} onChange={handleChange} />
                        <label className="form-check-label">No</label>
                      </div>
                      {errors.experience && <div className="text-danger small mt-1">{errors.experience}</div>}
                    </div>


                  </div>
                  <div className="row mb-3">
                    <div className="col-md-6">
                      <label className="form-label">Primary Skill <span className="star">*</span></label>
                      <select
                        name="skills"
                        className={`form-select ${errors.skills ? "is-invalid" : ""}`}
                        value={formData.skills}
                        onChange={(e) => {
                          const v = e.target.value;
                          setFormData((p) => ({ ...p, skills: v }));
                          if (v === "Nursing") setOpenNursing(true);
                          // clear skill error if user picked something
                          if (v) setErrors((prev) => { const n = { ...prev }; delete n.skills; return n; });
                        }}
                      >
                        <option value="">-- Select Skill --</option>
                        {HOME_CARE_OPTS.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                      {errors.skills && <div className="invalid-feedback">{errors.skills}</div>}
                    </div>



                    {formData.experience === "Yes" && (
                      <div className="col-md-6">
                        <label className="form-label">Years of Experience</label>
                        <input type="text" name="years" className={`form-control ${errors.years ? "is-invalid" : ""}`} value={formData.years} onChange={handleChange} />
                        {errors.years && <div className="invalid-feedback">{errors.years}</div>}
                      </div>
                    )}
                  </div>

                  <div className="row mb-3">
                    <div className="col-md-12">
                      <div className="languages">
                        <label className="form-label">Languages Known (optional)</label>
                        <div>
                          {["Telugu", "Hindi", "English", "Urdu", "Kannada", "Malayalam", "Tamil", "Oriya", "Bengali", "Marathi"].map((lang) => (
                            <div className="form-check form-check-inline" key={lang}>
                              <input className="form-check-input" type="checkbox" name="languages" value={lang} checked={formData.languages.includes(lang)} onChange={handleChange} />
                              <label className="form-check-label">{lang}</label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>




                  {/* Home Care Skills pills */}
                  <div className="mb-3 p-3 bg-dark rounded-3">
                    <h6 className="mb-2">HOME CARE SKILLS</h6>
                    <div className="d-flex flex-wrap gap-2">
                      {HOME_CARE_OPTS.map((opt) => {
                        const active = formData.homeCareSkills.includes(opt);
                        const disabled = formData.skills === opt;
                        return (
                          <button type="button" key={opt}
                            className={`btn btn-sm rounded-pill ${active ? "btn-warning" : "btn-outline-warning"}`}
                            onClick={() => {
                              if (!disabled) toggleSkillPill("homeCareSkills", opt);
                              if (opt === "Nursing") setOpenNursing(true);
                            }}

                            disabled={disabled}
                            title={disabled ? "Disabled because it's selected as Primary Skill" : ""}>
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {(formData.skills === "Nursing" || openNursing) && (
                    <div className="accordion mb-3" id="nursingAccordion">
                      <div className="accordion-item bg-dark text-white border-0 rounded-3">
                        <h2 className="accordion-header">
                          <button className={`accordion-button ${openNursing ? "" : "collapsed"} bg-info text-dark`} type="button" onClick={() => setOpenNursing((v) => !v)}>
                            Nursing Works (select at least one)
                          </button>
                        </h2>
                        <div className={`accordion-collapse collapse ${openNursing ? "show" : ""}`}>
                          <div className="accordion-body">
                            <div className="d-flex flex-wrap gap-2">
                              {NURSING_WORKS
                                .filter(nw => !nurseFilter || nw === nurseFilter)
                                .map((nw) => {
                                  const active = formData.nursingWorks.includes(nw);
                                  return (
                                    <button
                                      type="button"
                                      key={nw}
                                      className={`btn btn-sm rounded-pill ${active ? "btn-info text-dark" : "btn-outline-info"}`}
                                      onClick={() => toggleSkillPill("nursingWorks", nw)}
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
                  )}
                </div>
              )}

              {/* STEP 3 */}
              {step === 3 && (
                <div className="bg-dark p-3 rounded-4">
                  <h5 className="mb-3">Other Skills</h5><hr />
                  <div className="accordion" id="skillsAccordion">
                    {OTHER_SKILL_SECTIONS.map((sec, i) => {
                      const isOpen = openOtherSkill === i;
                      const needsDark = isOpen && (sec.color === "warning" || sec.color === "info");
                      const headingBtnClass = isOpen
                        ? `accordion-button bg-${sec.color} ${needsDark ? "text-dark" : "text-white"}`
                        : `accordion-button collapsed bg-dark text-light border-0`;

                      return (
                        <div
                          key={sec.title}
                          className="accordion-item bg-dark text-white border-0 rounded-3 mb-2 shadow-sm"
                        >
                          <h2 className="accordion-header">
                            <button
                              className={headingBtnClass}
                              type="button"
                              onClick={() => setOpenOtherSkill(isOpen ? null : i)}
                            >
                              {sec.title}
                            </button>
                          </h2>

                          <div className={`accordion-collapse collapse ${isOpen ? "show" : ""}`}>
                            <div className="accordion-body">
                              <div className="d-flex flex-wrap gap-2">
                                {sec.skills.map((s) => {
                                  const active = formData.otherSkills.includes(s);

                                  // Each section’s skills use its theme color
                                  const btnClass = active
                                    ? `btn btn-sm rounded-pill btn-${sec.color} text-dark fw-semibold`
                                    : `btn btn-sm rounded-pill btn-outline-${sec.color}`;

                                  return (
                                    <button
                                      type="button"
                                      key={s}
                                      className={btnClass}
                                      onClick={() => toggleSkillPill("otherSkills", s)}
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

                </div>
              )}

              {/* STEP 4 */}
              {step === 4 && (
                <div className="bg-dark p-3 rounded-4">
                  <h5 className="mb-3">Address, Preferences & Language</h5><hr />
                  <div className="row mb-3">
                    <div className="col-md-6">
                      <label className="form-label">Address Line 1</label>
                      <input type="text" name="addressLine1" className="form-control" value={formData.addressLine1} onChange={handleChange} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Address Line 2</label>
                      <input type="text" name="addressLine2" className="form-control" value={formData.addressLine2} onChange={handleChange} />
                    </div>
                  </div>
                  <div className="row mb-3">
                    <div className="col-md-4">
                      <label className="form-label">City / Town</label>
                      <input type="text" name="city" className="form-control" value={formData.city} onChange={handleChange} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">State</label>
                      <input type="text" name="state" className="form-control" value={formData.state} onChange={handleChange} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">PIN Code</label>
                      <input type="text" name="pincode" className={`form-control ${errors.pincode ? "is-invalid" : ""}`} value={formData.pincode} onChange={handleChange} onBlur={handleBlur} />
                      {errors.pincode && <div className="invalid-feedback">{errors.pincode}</div>}
                    </div>
                  </div>

                  <div className="row mb-3">
                    <div className="col-md-6">
                      <label className="form-label">Expected Salary (optional)</label>
                      <input type="text" name="expectedSalary" className="form-control" value={formData.expectedSalary} onChange={handleChange} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Joining Type <span className="star">*</span></label>
                      <select name="joiningType" className={`form-select ${errors.joiningType ? "is-invalid" : ""}`} value={formData.joiningType} onChange={handleChange}>
                        <option value="">Select</option>
                        <option value="Immediate">Immediate</option>
                        <option value="Within a Week">Within a Week</option>
                        <option value="Next Month">Next Month</option>
                      </select>
                      {errors.joiningType && <div className="invalid-feedback">{errors.joiningType}</div>}
                    </div>

                  </div>

                  <div className="row mb-3">
                    <div className="col-md-6">
                      <label className="form-label">Conversation Level <span className="star">*</span></label>
                      <select name="conversationLevel" className={`form-select ${errors.conversationLevel ? "is-invalid" : ""}`} value={formData.conversationLevel} onChange={handleChange}>
                        <option value="">Select</option>
                        <option value="Good">Good</option>
                        <option value="Average">Average</option>
                        <option value="Poor">Poor</option>
                      </select>
                      {errors.conversationLevel && <div className="invalid-feedback">{errors.conversationLevel}</div>}
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Call Reminder Date</label>
                      <input type="date" name="callReminderDate" className={`form-control ${errors.callReminderDate ? "is-invalid" : ""}`} value={formData.callReminderDate} onChange={handleChange} min={toYMD(new Date())} />
                      {errors.callReminderDate && <div className="invalid-feedback">{errors.callReminderDate}</div>}
                    </div>

                  </div>
                  <div className="row mb-3">

                    <div className="col-md-12">
                      <label className="form-label">Comment <span className="star">*</span></label>
                      <textarea name="formComment" rows={3} className={`form-control ${errors.formComment ? "is-invalid" : ""}`} value={formData.formComment} onChange={handleChange} />
                      {errors.formComment && <div className="invalid-feedback">{errors.formComment}</div>}
                    </div>

                  </div>
                </div>
              )}

              {/* STEP 5 */}
              {step === 5 && (
                <div className="bg-dark p-3 rounded-4">
                  <h5 className="mb-3">Uploads (Optional)</h5><hr />
                  <div className="row mb-3">
                    <div className="col-md-6">
                      <label className="form-label">Photo (≤100KB, JPG/PNG/GIF)</label>
                      <input
                        className={`form-control ${errors.photoDataUrl ? "is-invalid" : ""}`}
                        type="file"
                        accept="image/jpeg,image/png,image/jpg,image/gif"
                        onChange={onPhotoChange}
                      />
                      {errors.photoDataUrl && (
                        <div className="invalid-feedback">{errors.photoDataUrl}</div>
                      )}

                      <div className="mt-2 text-center">
                        <img
                          src={formData.photoDataUrl || DEFAULT_PHOTO_URL}
                          alt="preview"
                          style={{
                            maxWidth: 120,
                            borderRadius: 8,
                            border: "1px solid #555",
                            padding: 2,
                            backgroundColor: "#222",
                          }}
                          onError={(e) => (e.target.src = DEFAULT_PHOTO_URL)}
                        />
                        <div className="small text-muted mt-1">
                          {formData.photoName ? formData.photoName : "Default photo"}
                        </div>
                      </div>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">ID Proof (≤150KB, PDF/JPG/PNG)</label>
                      <input className={`form-control ${errors.idProofDataUrl ? "is-invalid" : ""}`} type="file" accept="application/pdf,image/jpeg,image/jpg,image/png" onChange={onIdProofChange} />
                      {errors.idProofDataUrl && <div className="invalid-feedback">{errors.idProofDataUrl}</div>}
                      {formData.idProofDataUrl && (
                        <div className="mt-2">
                          <small className="text-muted">{formData.idProofName}</small>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 6 */}
              {step === 6 && (
                <div className="bg-dark p-4 rounded-4 border border-secondary">
                  <h5 className="mb-3 text-warning d-flex align-items-center">
                    <i className="bi bi-check-circle-fill me-2"></i>
                    Review & Submit
                  </h5>
                  <hr className="border-secondary" />

                  {/* Header Card */}
                  <div className="card bg-dark border-secondary mb-4">
                    <div className="card-body p-3">
                      <div className="row align-items-center">
                        <div className="col-md-8">
                          <div className="d-flex flex-wrap gap-3 align-items-center">
                            <div className="d-flex align-items-center">
                              <i className="bi bi-person-badge text-warning me-2"></i>
                              <strong className="text-light">Call ID:</strong>
                              <span className="ms-1 text-warning">{formData.callId}</span>
                            </div>
                            <div className="d-flex align-items-center">
                              <i className="bi bi-calendar text-warning me-2"></i>
                              <strong className="text-light">Date:</strong>
                              <span className="ms-1 text-warning">{formData.callDate}</span>
                            </div>
                            <div className="d-flex align-items-center">
                              <i className="bi bi-person text-warning me-2"></i>
                              <strong className="text-light">By:</strong>
                              <span className="ms-1 text-warning">{formData.createdByName}</span>
                            </div>
                          </div>
                        </div>
                        <div className="col-md-4 text-end">
                          <div className="bg-warning rounded-pill px-3 py-2 d-inline-block">
                            <strong className="text-dark">
                              <i className="bi bi-graph-up me-1"></i>
                              {reqPct}% Complete
                            </strong>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Rating Card */}
                  <div className="card bg-dark border-secondary mb-4">
                    <div className="card-header bg-secondary bg-opacity-25 border-secondary">
                      <h6 className="mb-0 text-light">
                        <i className="bi bi-star me-2 text-warning"></i>
                        Candidate Rating
                      </h6>
                    </div>
                    <div className="card-body">
                      <div className="row align-items-center">
                        <div className="col-md-6">
                          <label className="form-label text-light mb-2">
                            Rate this candidate <span className="text-danger">*</span>
                          </label>
                          <div className="d-flex align-items-center gap-1">
                            {[1, 2, 3, 4, 5].map(n => (
                              <button
                                key={n}
                                type="button"
                                className={`btn btn-lg p-0 ${n <= (rating || 0) ? "text-warning" : "text-secondary"}`}
                                onClick={() => {
                                  setRating(n);
                                  setFormData(p => ({ ...p, rating: n }));
                                }}
                                style={{
                                  fontSize: "2rem",
                                  lineHeight: 1,
                                  transition: "all 0.2s ease",
                                  transform: n <= (rating || 0) ? "scale(1.1)" : "scale(1)"
                                }}
                                title={`Rate ${n} star${n > 1 ? 's' : ''}`}
                              >
                                ★
                              </button>
                            ))}
                            <span className="ms-3 text-light fw-bold fs-5">{rating || 0}/5</span>
                          </div>
                          {!rating && <div className="text-danger small mt-2">Please provide a rating before submitting</div>}
                        </div>
                        <div className="col-md-6 text-end">
                          <div className="bg-dark border border-secondary rounded p-3">
                            <small className="text-muted">
                              <i className="bi bi-info-circle me-1"></i>
                              Rate based on communication, skills, and overall impression
                            </small>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Information Cards Grid */}
                  <div className="row g-3 mb-4">
                    {/* Personal Information Card */}
                    <div className="col-md-6">
                      <div className="card bg-dark h-100 border-secondary">
                        <div className="card-header bg-secondary bg-opacity-25 border-secondary">
                          <h6 className="mb-0 text-light">
                            <i className="bi bi-person-vcard me-2 text-warning"></i>
                            Personal Information
                          </h6>
                        </div>
                        <div className="card-body">
                          <div className="info-grid">
                            <div className="info-item">
                              <span className="info-label">Full Name</span>
                              <span className="info-value text-light">{formData.name || "—"}</span>
                            </div>
                            <div className="info-item">
                              <span className="info-label">Mobile</span>
                              <span className="info-value text-warning">{formData.mobileNo || "—"}</span>
                            </div>
                            <div className="info-item">
                              <span className="info-label">Location</span>
                              <span className="info-value text-light">{formData.location || "—"}</span>
                            </div>
                            <div className="info-item">
                              <span className="info-label">Source</span>
                              <span className="info-value text-light">{formData.source || "—"}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Professional Information Card */}
                    <div className="col-md-6">
                      <div className="card bg-dark h-100 border-secondary">
                        <div className="card-header bg-secondary bg-opacity-25 border-secondary">
                          <h6 className="mb-0 text-light">
                            <i className="bi bi-briefcase me-2 text-warning"></i>
                            Professional Details
                          </h6>
                        </div>
                        <div className="card-body">
                          <div className="info-grid">
                            <div className="info-item">
                              <span className="info-label">Primary Skill</span>
                              <span className="info-value text-warning">{formData.skills || "—"}</span>
                            </div>
                            <div className="info-item">
                              <span className="info-label">Education</span>
                              <span className="info-value text-light">{formData.education || "—"}</span>
                            </div>
                            <div className="info-item">
                              <span className="info-label">Mother Tongue</span>
                              <span className="info-value text-light">{formData.motherTongue || "—"}</span>
                            </div>
                            <div className="info-item">
                              <span className="info-label">Working Hours</span>
                              <span className="info-value text-light">{formData.workingHours || "—"}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Additional Details Card */}
                    <div className="col-md-6">
                      <div className="card bg-dark h-100 border-secondary">
                        <div className="card-header bg-secondary bg-opacity-25 border-secondary">
                          <h6 className="mb-0 text-light">
                            <i className="bi bi-gear me-2 text-warning"></i>
                            Job Preferences
                          </h6>
                        </div>
                        <div className="card-body">
                          <div className="info-grid">
                            <div className="info-item">
                              <span className="info-label">Joining Type</span>
                              <span className="info-value text-light">{formData.joiningType || "—"}</span>
                            </div>
                            <div className="info-item">
                              <span className="info-label">Conversation Level</span>
                              <span className={`info-value ${formData.conversationLevel === 'Good' ? 'text-success' :
                                formData.conversationLevel === 'Average' ? 'text-warning' :
                                  formData.conversationLevel === 'Poor' ? 'text-danger' : 'text-light'
                                }`}>
                                {formData.conversationLevel || "—"}
                              </span>
                            </div>
                            <div className="info-item">
                              <span className="info-label">Experience</span>
                              <span className="info-value text-light">
                                {formData.experience === 'Yes' ? `${formData.years || '0'} years` : 'No Experience'}
                              </span>
                            </div>
                            <div className="info-item">
                              <span className="info-label">Expected Salary</span>
                              <span className="info-value text-warning">
                                {formData.expectedSalary ? `₹${formData.expectedSalary}` : "—"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Skills Summary Card */}
                    <div className="col-md-6">
                      <div className="card bg-dark h-100 border-secondary">
                        <div className="card-header bg-secondary bg-opacity-25 border-secondary">
                          <h6 className="mb-0 text-light">
                            <i className="bi bi-tools me-2 text-warning"></i>
                            Skills Summary
                          </h6>
                        </div>
                        <div className="card-body">
                          <div className="skills-summary">
                            {formData.nursingWorks.length > 0 && (
                              <div className="skill-category mb-3">
                                <small className="text-warning fw-bold">Nursing Works:</small>
                                <div className="d-flex flex-wrap gap-1 mt-1">
                                  {formData.nursingWorks.slice(0, 3).map(skill => (
                                    <span key={skill} className="badge bg-warning bg-opacity-25 text-warning border border-warning">
                                      {skill}
                                    </span>
                                  ))}
                                  {formData.nursingWorks.length > 3 && (
                                    <span className="badge bg-secondary">+{formData.nursingWorks.length - 3} more</span>
                                  )}
                                </div>
                              </div>
                            )}

                            {formData.homeCareSkills.length > 0 && (
                              <div className="skill-category mb-3">
                                <small className="text-warning fw-bold">Home Care:</small>
                                <div className="d-flex flex-wrap gap-1 mt-1">
                                  {formData.homeCareSkills.slice(0, 3).map(skill => (
                                    <span key={skill} className="badge bg-warning bg-opacity-25 text-warning border border-warning">
                                      {skill}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {formData.otherSkills.length > 0 && (
                              <div className="skill-category">
                                <small className="text-warning fw-bold">Other Skills:</small>
                                <div className="d-flex flex-wrap gap-1 mt-1">
                                  {formData.otherSkills.slice(0, 4).map(skill => (
                                    <span key={skill} className="badge bg-warning bg-opacity-25 text-warning border border-warning">
                                      {skill}
                                    </span>
                                  ))}
                                  {formData.otherSkills.length > 4 && (
                                    <span className="badge bg-secondary">+{formData.otherSkills.length - 4} more</span>
                                  )}
                                </div>
                              </div>
                            )}

                            {formData.nursingWorks.length === 0 && formData.homeCareSkills.length === 0 && formData.otherSkills.length === 0 && (
                              <div className="text-center text-muted py-2">
                                <i className="bi bi-inbox" style={{ fontSize: '2rem' }}></i>
                                <p className="mt-2 mb-0 small">No skills added</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Comment Card */}
                  {formData.formComment && (
                    <div className="card bg-dark border-secondary mb-4">
                      <div className="card-header bg-secondary bg-opacity-25 border-secondary">
                        <h6 className="mb-0 text-light">
                          <i className="bi bi-chat-left-text me-2 text-warning"></i>
                          Additional Comments
                        </h6>
                      </div>
                      <div className="card-body">
                        <div className="bg-dark bg-opacity-50 rounded p-3 border border-secondary">
                          <p className="mb-0 text-light opacity-75" style={{ lineHeight: '1.6' }}>
                            "{formData.formComment}"
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Final Action Card */}
                  <div className="card bg-dark border-secondary">
                    <div className="card-body text-center py-4">
                      <div className="mb-3">
                        <i className="bi bi-shield-check text-warning" style={{ fontSize: '3rem' }}></i>
                      </div>
                      <h5 className="text-warning mb-3">Ready to Submit?</h5>
                      <p className="text-light mb-4 opacity-75">
                        Please review all information carefully. Once submitted, this worker call will be saved to the database.
                      </p>
                      <div className="d-flex justify-content-center gap-3">
                        <button
                          type="button"
                          className="btn btn-outline-warning"
                          onClick={() => setStep(1)}
                        >
                          <i className="bi bi-arrow-left me-2"></i>
                          Review Again
                        </button>
                        <button
                          type="button"
                          className="btn btn-warning px-4"
                          onClick={handleSubmit}
                          disabled={!rating}
                        >
                          <i className="bi bi-check-lg me-2"></i>
                          Submit Worker Call
                        </button>
                      </div>
                      {!rating && (
                        <div className="text-danger small mt-3">
                          <i className="bi bi-exclamation-triangle me-1"></i>
                          Please provide a rating before submitting
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>


            <div className="modal-footer bg-dark text-light d-flex justify-content-between border-dark">
              <div>
                {[1, 2, 3, 4, 5, 6].map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setStep(n)}
                    className={`btn me-2 ${step === n ? "btn-warning text-dark fw-semibold" : "btn-outline-light"
                      }`}
                    aria-current={step === n ? "step" : undefined}
                  >
                    Step {n}
                  </button>
                ))}
              </div>

              <div className="d-flex align-items-center gap-2">
                {step > 1 && <button type="button" className="btn btn-secondary" onClick={prevStep}>Back</button>}
                {step < TOTAL_STEPS && <button type="button" className="btn btn-info text-dark" onClick={nextStep}>Next</button>}
                {step === TOTAL_STEPS && (
                  <button type="button" className="btn btn-success" onClick={handleSubmit} disabled={isSaving}>
                    {isSaving ? (<><span className="spinner-border spinner-border-sm me-2" />Saving...</>) : "Save"}
                  </button>
                )}

              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Close confirm */}
      {showCloseConfirm && (
        <div className="modal fade show worker-call-gray" style={{ display: "block", backgroundColor: "rgba(0,0,0,.9)" }}>
          <div className="modal-dialog modal-md modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-dark text-light border-dark">
                <h5 className="modal-title text-danger">Discard changes?</h5>
                <button type="button" className="btn-close" onClick={() => setShowCloseConfirm(false)} />
              </div>
              <div className="modal-body bg-dark text-light text-center">
                You have unsaved changes. <br></br> Do you really want to close?
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowCloseConfirm(false)}>Cancel</button>
                <button className="btn btn-danger" onClick={() => { setShowCloseConfirm(false); resetAll(); onClose?.(); }}>Discard</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success toast/modal */}
      {success && (
        <div className="modal fade show worker-call-gray" style={{ display: "block", backgroundColor: "rgba(0,0,0,.9)" }}>
          <div className="modal-dialog modal-md modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-dark text-light border-dark">
                <h5 className="modal-title text-warning">Saved!</h5>
                <button type="button" className="btn-close" onClick={() => { setSuccess(null); onClose?.(); }} />
              </div>
              <div className="modal-body bg-dark text-info text-center">
                Worker call saved for <br></br> <strong>{success.name}</strong> <br></br> (ID: <strong>{success.callId}</strong>).
              </div>
              <div className="modal-footer">
                <button className="btn btn-success" onClick={() => { setSuccess(null); onClose?.(); }}>OK</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}