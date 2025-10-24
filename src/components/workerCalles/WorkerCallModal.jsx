// src/components/workerCalles/WorkerCallModal.jsx
import React, {
  useEffect,
  useMemo,
  useState,
  useRef,
  useCallback,
} from "react";
import firebaseDB from "../../firebase";
import { useAuth } from "../../context/AuthContext";

/** Resolve a nice display name for a user id from the global Users node */
const pickUserName = (u) => {
  if (!u) return "";
  return (
    u.name ||
    u.displayName ||
    u.username ||
    (u.email ? u.email.replace(/@.*/, "") : "") ||
    ""
  );
};

const normalizeArray = (val) => {
  if (!val) return [];
  if (Array.isArray(val)) return val.filter(Boolean);
  if (typeof val === "string") {
    return val
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
};

const parseDate = (dLike) => {
  if (dLike instanceof Date) return dLike;
  if (typeof dLike === "number") return new Date(dLike);
  return new Date(String(dLike));
};

const formatDateTime = (dLike) => {
  const d = parseDate(dLike);
  if (Number.isNaN(d.getTime())) return "—";
  return (
    d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }) +
    " " +
    d.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
  );
};

export default function WorkerCallModal({
  worker,
  isOpen,
  onClose,
  isEditMode,
}) {
  const { user: authUser } = useAuth();

  // Global Users map (no local auth)
  const [usersMap, setUsersMap] = useState({});
  useEffect(() => {
    const ref = firebaseDB.child("Users");
    const cb = ref.on("value", (snap) => setUsersMap(snap.val() || {}));
    return () => ref.off("value", cb);
  }, []);

  const currentUserId = authUser?.dbId || authUser?.uid || authUser?.id || null;
  const currentUserName =
    (currentUserId && pickUserName(usersMap[currentUserId])) ||
    authUser?.displayName ||
    (authUser?.email ? authUser.email.replace(/@.*/, "") : "") ||
    "user";

  // Distinct option catalogs
  const primarySkillOptions = [
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

  const homeCareSkillOptions = [
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

  const otherSkillOptions = [
    "Computer Operating",
    "Data Entry",
    "Office Assistant",
    "Receptionist",
    "Front Desk Executive",
    "Admin Assistant",
    "Office Boy",
    "Peon",
    "Office Attendant",
    "Tele Calling",
    "Customer Support",
    "Telemarketing",
    "BPO Executive",
    "Call Center Agent",
    "Customer Care Executive",
    "Supervisor",
    "Manager",
    "Team Leader",
    "Site Supervisor",
    "Project Coordinator",
    "Security Guard",
    "Security Supervisor",
    "Gatekeeper",
    "Watchman",
    "Driving",
    "Delivery Boy",
    "Delivery Executive",
    "Rider",
    "Driver",
    "Car Driver",
    "Bike Rider",
    "Logistics Helper",
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
    "Sales Boy",
    "Sales Girl",
    "Store Helper",
    "Retail Assistant",
    "Shop Attendant",
    "Labour",
    "Helper",
    "Loading Unloading",
    "Warehouse Helper",
    "Factory Worker",
    "Production Helper",
    "Packaging Staff",
  ];

  const languageOptions = [
    "Telugu",
    "English",
    "Hindi",
    "Urdu",
    "Kannada",
    "Malayalam",
    "Tamil",
    "Bengali",
    "Marati",
  ];

  const sourceOptions = [
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
    "Just Dial",
    "News Paper",
    "Other",
  ];

  const iframeRef = useRef(null);

  // Build the biodata HTML. Present & Permanent address are the same by design.
  const buildBiodataHTML = ({ hideSensitive = false } = {}) => {
    const w = localWorker || {};
    const addr1 = [w.addressLine1, w.addressLine2].filter(Boolean).join(", ");
    const addr2 = [w.city, w.state, w.pincode].filter(Boolean).join(", ");
    const fullAddress = [addr1, addr2].filter(Boolean).join(", ");

    const phone = hideSensitive ? "**********" : w.mobileNo || "";
    const email = hideSensitive ? "********" : w.email || "";

    const langs = (w.languages || []).join(", ");
    const pskills = Array.isArray(w.skills)
      ? w.skills.join(", ")
      : w.skills || "";
    const hskills = (w.homeCareSkills || []).join(", ");
    const nworks = (w.nursingWorks || []).join(", ");

    return `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Biodata</title>
  <style>
    body{font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial; padding:20px; color:#111}
    .h{font-size:18px; font-weight:700; margin:16px 0 8px}
    .row{display:flex; gap:16px; margin:8px 0}
    .col{flex:1}
    .box{border:1px solid #ddd; border-radius:8px; padding:12px}
    .muted{color:#666; font-size:12px}
    .tag{display:inline-block; padding:2px 8px; border-radius:999px; background:#eef; margin:2px; font-size:12px}
    .small{font-size:12px}
  </style>
</head>
<body>
  <div class="h">Employee Biodata</div>
  <div class="row">
    <div class="col box">
      <div><strong>Name:</strong> ${w.name || "-"}</div>
      <div><strong>Mobile:</strong> ${phone}</div>
      <div><strong>Email:</strong> ${email}</div>
      <div><strong>Gender:</strong> ${w.gender || "-"}</div>
      <div><strong>Age:</strong> ${w.age || "-"}</div>
      <div><strong>Experience:</strong> ${w.experience || "-"} ${
      w.years ? `(${w.years} yrs)` : ""
    }</div>
      <div><strong>Location:</strong> ${w.location || "-"}</div>
      <div class="small muted">Source: ${w.source || "-"}</div>
    </div>
    <div class="col box">
      <div class="h" style="margin-top:0">Address</div>
      <div><strong>Present Address:</strong><br/>${fullAddress || "-"}</div>
      <div style="margin-top:8px"><strong>Permanent Address:</strong><br/>${
        fullAddress || "-"
      }</div>
    </div>
  </div>

  <div class="row">
    <div class="col box">
      <div class="h" style="margin-top:0">Skills & Languages</div>
      <div><strong>Primary Skill(s):</strong> ${pskills || "-"}</div>
      <div><strong>Home Care Skills:</strong> ${hskills || "-"}</div>
      <div><strong>Nursing Tasks:</strong> ${nworks || "-"}</div>
      <div><strong>Languages:</strong> ${langs || "-"}</div>
      <div><strong>Working Hours:</strong> ${w.workingHours || "-"}</div>
    </div>
    <div class="col box">
      <div class="h" style="margin-top:0">Notes</div>
      <div><strong>Conversation:</strong> ${w.conversationLevel || "-"}</div>
      <div><strong>Comment:</strong> ${w.formComment || w.comment || "-"}</div>
      <div><strong>Joining:</strong> ${w.joiningType || "-"}</div>
      <div><strong>Expected Salary:</strong> ${w.expectedSalary || "-"}</div>
      <div><strong>Reminder:</strong> ${w.callReminderDate || "-"}</div>
    </div>
  </div>
</body>
</html>`;
  };

  const handleDownloadBiodata = () => {
    const html = buildBiodataHTML({ hideSensitive: true });
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Biodata_${localWorker?.callId || "worker"}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleShareBiodata = () => {
    const txt =
      `Biodata - ${localWorker?.name || ""}\n` +
      `Mobile: ${localWorker?.mobileNo || ""}\n` +
      `Primary: ${
        Array.isArray(localWorker?.skills)
          ? localWorker.skills.join(", ")
          : localWorker?.skills || ""
      }\n` +
      `Location: ${localWorker?.location || ""}`;
    const url = `https://wa.me/?text=${encodeURIComponent(txt)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const [activeTab, setActiveTab] = useState("basic");
  const [localWorker, setLocalWorker] = useState({ ...worker });
  // --- normalize comments from DB (array OR object) ---
  const commentsList = Array.isArray(localWorker?.comments)
    ? localWorker.comments.filter(Boolean)
    : localWorker?.comments && typeof localWorker.comments === "object"
    ? Object.values(localWorker.comments).filter(Boolean)
    : [];

  useEffect(() => {
    if (activeTab === "biodata" && iframeRef.current) {
      iframeRef.current.srcdoc = buildBiodataHTML({ hideSensitive: false });
    }
  }, [activeTab, localWorker]);

  // Canonical comments array; ALWAYS sorted desc by date
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");

  const [showSaveModal, setShowSaveModal] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [showUnsavedConfirm, setShowUnsavedConfirm] = useState(false);
  const [languageSearch, setLanguageSearch] = useState("");
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);

  const languageInputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Save remains disabled until a comment is added this session
  const [canSave, setCanSave] = useState(false);

  // Rehydrate when the record changes
  useEffect(() => {
    setLocalWorker({ ...worker });
    const list = Array.isArray(worker?.comments) ? worker.comments.slice() : [];
    list.sort((a, b) => {
      const da = parseDate(a?.date).getTime() || 0;
      const db = parseDate(b?.date).getTime() || 0;
      return db - da; // latest first
    });
    setComments(list);
    setNewComment("");
    setDirty(false);
    setCanSave(false); // locked until a comment is added
  }, [worker?.id]);

  // Click outside dropdown handler
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        languageInputRef.current &&
        !languageInputRef.current.contains(event.target)
      ) {
        setShowLanguageDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Close dropdown on escape key
  useEffect(() => {
    const handleEscapeKey = (event) => {
      if (event.key === "Escape" && showLanguageDropdown) {
        setShowLanguageDropdown(false);
        // Optional: Focus back on the input
        if (languageInputRef.current) {
          languageInputRef.current.focus();
        }
      }
    };

    document.addEventListener("keydown", handleEscapeKey);
    return () => {
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, [showLanguageDropdown]);

  const cleanObjectForFirebase = (obj) => {
    const cleaned = { ...obj };
    Object.keys(cleaned).forEach((key) => {
      if (cleaned[key] === undefined || cleaned[key] === null) {
        delete cleaned[key];
      }
    });
    return cleaned;
  };

  useEffect(() => {
    setLocalWorker((prev) => ({
      ...worker,
      employeePhotoUrl: worker?.employeePhotoUrl || worker?.employeePhoto || null,
      idProofUrl: worker?.idProofUrl || null,
      idProofPreview: worker?.idProofPreview || null,
      idProofFile: null,
      idProofError: null,
    }));
  }, [worker]);
  

  // ⬇️ ADD: live comments subscription (array OR object) -----------------------
useEffect(() => {
  if (!worker?.id) return;
  const ref = firebaseDB.child(`WorkerCallData/${worker.id}/comments`);
  const onVal = (snap) => {
    const raw = snap.val();
    let list = [];
    if (Array.isArray(raw)) {
      list = raw.filter(Boolean);
    } else if (raw && typeof raw === "object") {
      list = Object.values(raw).filter(Boolean);
    }
    list.sort((a, b) => {
      const ta = new Date(a?.date || a?.timestamp || 0).getTime() || 0;
      const tb = new Date(b?.date || b?.timestamp || 0).getTime() || 0;
      return tb - ta; // latest first
    });

    setComments(list);
    setLocalWorker((prev) => ({ ...prev, comments: list }));
  };

  ref.on("value", onVal);
  return () => ref.off("value", onVal);
}, [worker?.id]);
// ---------------------------------------------------------------------------


  // Update handleLanguageSelect to close dropdown
  const handleLanguageSelect = useCallback(
    (language) => {
      if (!isEditMode) return;
      setLocalWorker((prev) => {
        const arr = normalizeArray(prev.languages);
        if (arr.some((v) => String(v).toLowerCase() === language.toLowerCase()))
          return prev;
        return { ...prev, languages: [...arr, language] };
      });
      setLanguageSearch("");
      setShowLanguageDropdown(false);
      setDirty(true);

      // Focus back on input after selection
      if (languageInputRef.current) {
        languageInputRef.current.focus();
      }
    },
    [isEditMode]
  );

  // === Handle employee photo upload (JPG, PNG ≤ 100KB) ===
const handlePhotoChange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  if (!["image/jpeg", "image/png"].includes(file.type)) {
    alert("Only JPG or PNG files are allowed.");
    return;
  }

  if (file.size > 100 * 1024) {
    alert("Photo size should be less than 100KB.");
    return;
  }

  const reader = new FileReader();
  reader.onload = (ev) => {
    setLocalWorker((prev) => ({
      ...prev,
      employeePhotoFile: file,
      employeePhotoUrl: null,
      employeePhotoPreview: ev.target.result,
    }));
  };
  reader.readAsDataURL(file);
};


// === Handle ID Proof upload (PDF, JPG, PNG ≤ 150KB) ===
const handleIdProofChange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  if (
    !["application/pdf", "image/jpeg", "image/png"].includes(file.type)
  ) {
    alert("Only PDF, JPG or PNG files are allowed.");
    return;
  }

  if (file.size > 150 * 1024) {
    alert("ID Proof file size should be less than 150KB.");
    return;
  }

  const reader = new FileReader();
  reader.onload = (ev) => {
    setLocalWorker((prev) => ({
      ...prev,
      idProofFile: file,
      idProofUrl: null,
      idProofPreview: ev.target.result,
    }));
  };
  reader.readAsDataURL(file);
};


// === View ID proof in modal (PDF or image) ===
const handleViewId = () => {
  const url =
    localWorker.idProofUrl || localWorker.idProofPreview || null;

  if (!url) {
    alert("No ID proof available to view.");
    return;
  }

  // open in modal for image/pdf preview
  const win = window.open();
  if (win) {
    if (url.toLowerCase().endsWith(".pdf")) {
      win.document.write(
        `<embed src="${url}" type="application/pdf" width="100%" height="100%">`
      );
    } else {
      win.document.write(`<img src="${url}" style="width:100%">`);
    }
  } else {
    alert("Popup blocked. Please allow popups to view file.");
  }
};


// === Download ID proof (image or PDF) ===
const handleDownloadId = () => {
  const url =
    localWorker.idProofUrl || localWorker.idProofPreview || null;

  if (!url) {
    alert("No ID proof available to download.");
    return;
  }

  const link = document.createElement("a");
  link.href = url;
  const ext = url.toLowerCase().endsWith(".pdf") ? ".pdf" : ".jpg";
  link.download = `${localWorker.name || "ID_Proof"}${ext}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};


  // Hooks above any early returns
  const filteredLanguages = useMemo(
    () =>
      languageOptions.filter((lang) =>
        lang.toLowerCase().includes(languageSearch.toLowerCase())
      ),
    [languageSearch]
  );

  if (!isOpen) return null;

  // ====== Handlers ======
  const handleMultiToggle = (field, value) => {
    if (!isEditMode) return;
    setLocalWorker((prev) => {
      const arr = normalizeArray(prev[field]);
      const lower = String(value).toLowerCase();
      const hit = arr.some((v) => String(v).toLowerCase() === lower);
      const next = hit
        ? arr.filter((v) => String(v).toLowerCase() !== lower)
        : [...arr, value];
      return { ...prev, [field]: next };
    });
    setDirty(true);
  };

  const handleAddCustom = (field, inputId) => {
    if (!isEditMode) return;
    const el = document.getElementById(inputId);
    if (!el) return;
    const value = (el.value || "").trim();
    if (!value) return;
    setLocalWorker((prev) => {
      const arr = normalizeArray(prev[field]);
      if (arr.some((v) => String(v).toLowerCase() === value.toLowerCase()))
        return prev;
      return { ...prev, [field]: [...arr, value] };
    });
    el.value = "";
    setDirty(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setLocalWorker((prev) => ({ ...prev, [name]: value }));
    setDirty(true);
  };

  /** Save worker details (disabled until a comment is added) */
  const handleSave = async () => {
    if (!canSave) return;
    try {
      const now = Date.now();
      const toSave = cleanObjectForFirebase({
        ...localWorker,
        skills: normalizeArray(localWorker.skills),
        languages: normalizeArray(localWorker.languages),
        homeCareSkills: normalizeArray(localWorker.homeCareSkills),
        otherSkills: normalizeArray(localWorker.otherSkills),
        updatedAt: now,
        updatedById: currentUserId || localWorker.updatedById || null,
        updatedByName: currentUserName || localWorker.updatedByName || "",
      });

      if (!localWorker.createdAt) {
        toSave.createdAt = localWorker.date || now;
      }
      if (!localWorker.createdById && currentUserId) {
        toSave.createdById = currentUserId;
        toSave.createdByName = currentUserName;
      }

      await firebaseDB.child(`WorkerCallData/${worker.id}`).update(toSave);
      setLocalWorker((prev) => ({ ...prev, ...toSave }));
      setShowSaveModal(true);
      setDirty(false);
    } catch (err) {
      console.error("Save failed:", err);
      alert("Failed to save worker details.");
    }
  };

  /** Add a comment → enables Save; shows at the top; never overwrites history */
  const handleAddComment = async () => {
    if (!isEditMode) return;
    const text = newComment.trim();
    if (!text) return;
    try {
      const entry = {
        text,
        date: new Date().toISOString(),
        userId: currentUserId || null,
        user: currentUserName || "user",
      };

      const updated = [entry, ...comments];
      setComments(updated);
      setNewComment("");

      await firebaseDB
        .child(`WorkerCallData/${worker.id}/comments`)
        .set(updated);

      setLocalWorker((prev) => ({
        ...prev,
        comments: updated,
        updatedAt: Date.now(),
        updatedById: currentUserId || null,
        updatedByName: currentUserName || "",
      }));

      setCanSave(true);
      setDirty(true);
    } catch (err) {
      console.error("Adding comment failed:", err);
      alert("Failed to add comment.");
    }
  };

  const handleTagRemove = (field, idx) => {
    if (!isEditMode) return;
    setLocalWorker((prev) => {
      const arr = normalizeArray(prev[field]);
      arr.splice(idx, 1);
      return { ...prev, [field]: [...arr] };
    });
    setDirty(true);
  };

  const confirmClose = () => {
    if (dirty) setShowUnsavedConfirm(true);
    else onClose();
  };

  // Action handlers
  const handleCall = () => {
    if (localWorker.mobileNo) {
      window.open(`tel:${localWorker.mobileNo}`);
    }
  };

  const handleWhatsApp = () => {
    if (localWorker.mobileNo) {
      const message = `Hello ${
        localWorker.name || ""
      }, I found your contact from Apana Staff.`;
      const encodedMessage = encodeURIComponent(message);
      window.open(
        `https://wa.me/${localWorker.mobileNo.replace(
          "+",
          ""
        )}?text=${encodedMessage}`
      );
    }
  };

  // Created/Updated stamps (global Users)
  const createdByName =
    pickUserName(usersMap[localWorker?.createdById]) ||
    localWorker?.createdByName ||
    "";
  const updatedByName =
    pickUserName(usersMap[localWorker?.updatedById]) ||
    localWorker?.updatedByName ||
    "";

  // Helper function to render info cards for view mode
  const renderInfoCard = (label, value, badgeType = null) => {
    let displayValue = value || "—";
    let badgeClass = "";

    if (badgeType === "gender") {
      badgeClass =
        value === "Male"
          ? "badge-gender-male"
          : value === "Female"
          ? "badge-gender-female"
          : "badge-gender-other";
    } else if (badgeType === "conversation") {
      badgeClass =
        value === "Very Good"
          ? "badge-conv-vgood"
          : value === "Good"
          ? "badge-conv-good"
          : value === "Average"
          ? "badge-conv-average"
          : "badge-conv-poor";
    }

    return (
      <div className="info-card-item">
        <div className="info-card-label">{label}</div>
        <div className={`info-card-value ${badgeClass}`}>
          {badgeClass ? (
            <span className="info-badge p-2 ">{displayValue}</span>
          ) : (
            displayValue
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <div
        className="modal fade show dark-modal"
        style={{ display: "block", background: "rgba(0,0,0,0.95)" }}
      >
        <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
          <div
            className="modal-content border-0"
            style={{
              borderRadius: "8px",
              maxWidth: "900px",
              margin: "auto",
              maxHeight: "90vh",
            }}
          >
            {/* Header */}
            <div className="modal-header dark-header">
              <div className="d-flex align-items-center w-100">
                <div className="flex-grow-1">
                  <h5 className="modal-title fw-bold mb-2 text-white">
                    {isEditMode ? "✏️ Edit Worker" : "👤 Worker Details"}
                  </h5>
                  <div className="d-flex flex-wrap align-items-center gap-3 text-white-90 small text-warning">
                    <span className="d-flex align-items-center gap-2">
                      <i className="bi bi-person-fill"></i>
                      {localWorker?.name || "—"}
                    </span>
                    <span className="d-flex align-items-center gap-2">
                      <i className="bi bi-telephone-fill"></i>
                      {localWorker?.mobileNo || "—"}
                    </span>
                    <span className="d-flex align-items-center gap-2">
                      <i className="bi bi-geo-alt-fill"></i>
                      {localWorker?.location || "—"}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="d-flex align-items-center gap-2">
                  {localWorker.mobileNo && (
                    <>
                      <button
                        type="button"
                        className="btn btn-success btn-sm d-flex align-items-center gap-2 action-btn"
                        onClick={handleCall}
                        title="Call Worker"
                      >
                        <i className="bi bi-telephone-fill"></i>
                        Call
                      </button>
                      <button
                        type="button"
                        className="btn btn-success btn-sm d-flex align-items-center gap-2 action-btn"
                        onClick={handleWhatsApp}
                        title="WhatsApp Worker"
                        style={{
                          backgroundColor: "#25D366",
                          borderColor: "#25D366",
                        }}
                      >
                        <i className="bi bi-whatsapp"></i>
                        WhatsApp
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    onClick={confirmClose}
                  ></button>
                </div>
              </div>
            </div>

            <div className="modal-body p-0 dark-body">
              {/* Tabs */}
              <div className="dark-tabs-container">
                <div className="container-fluid px-3">
                  <ul className="nav nav-pills nav-justified gap-2 p-2">
                    <li className="nav-item">
                      <button
                        className={`nav-link dark-tab ${
                          activeTab === "basic" ? "active" : ""
                        }`}
                        onClick={() => setActiveTab("basic")}
                      >
                        <i className="bi bi-person-vcard me-2"></i>
                        Basic Info
                      </button>
                    </li>

                    <li className="nav-item">
                      <button
                        className={`nav-link dark-tab ${
                          activeTab === "skills" ? "active" : ""
                        }`}
                        onClick={() => setActiveTab("skills")}
                      >
                        <i className="bi bi-tools me-2"></i>
                        Skills
                      </button>
                    </li>

                    {/* NEW: Address */}
                    <li className="nav-item">
                      <button
                        className={`nav-link dark-tab ${
                          activeTab === "address" ? "active" : ""
                        }`}
                        onClick={() => setActiveTab("address")}
                      >
                        <i className="bi bi-geo-alt me-2"></i>
                        Address
                      </button>
                    </li>

                    {/* NEW: Biodata */}
                    <li className="nav-item">
                      <button
                        className={`nav-link dark-tab ${
                          activeTab === "biodata" ? "active" : ""
                        }`}
                        onClick={() => setActiveTab("biodata")}
                      >
                        <i className="bi bi-file-earmark-text me-2"></i>
                        Biodata
                      </button>
                    </li>
                  </ul>
                </div>
              </div>

              <div
                className="tab-content p-3"
                style={{
                  minHeight: "400px",
                  maxHeight: "60vh",
                  overflowY: "auto",
                }}
              >
                {/* Basic Info Tab */}
                {activeTab === "basic" && (
                  <div className="fade show">
                    <div className="row g-3">
                      {/* Personal Information */}
                      <div className="col-12">
                        <div className="dark-card">
                          <div className="card-header dark-card-header">
                            <h6 className="mb-0 fw-bold d-flex align-items-center text-warning">
                              <i className="bi bi-person-badge me-2"></i>
                              Personal Information
                            </h6>
                          </div>
                          <div className="card-body p-3">
                            {isEditMode ? (
                              <div className="row g-3">
                                <div className="col-md-4">
                                  <label className="form-label fw-semibold text-secondary">
                                    Mobile Number
                                  </label>
                                  <input
                                    type="text"
                                    name="mobileNo"
                                    value={localWorker.mobileNo || ""}
                                    disabled
                                    className="form-control dark-input"
                                  />
                                </div>

                                <div className="col-md-4">
                                  <label className="form-label fw-semibold text-secondary">
                                    Full Name
                                  </label>
                                  <input
                                    type="text"
                                    name="name"
                                    value={localWorker.name || ""}
                                    onChange={handleChange}
                                    className="form-control dark-input"
                                    placeholder="Enter worker name"
                                  />
                                </div>

                                <div className="col-md-4">
                                  <label className="form-label fw-semibold text-secondary">
                                    Gender
                                  </label>
                                  <select
                                    name="gender"
                                    value={localWorker.gender || ""}
                                    onChange={handleChange}
                                    className="form-select dark-input"
                                  >
                                    <option value="">Select Gender</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Others">Others</option>
                                  </select>
                                </div>

                                <div className="col-md-4">
                                  <label className="form-label fw-semibold text-secondary">
                                    Age
                                  </label>
                                  <input
                                    type="number"
                                    name="age"
                                    value={localWorker.age || ""}
                                    onChange={handleChange}
                                    className="form-control dark-input text-center"
                                    min="10"
                                    max="80"
                                    placeholder="Age"
                                  />
                                </div>

                                <div className="col-md-4">
                                  <label className="form-label fw-semibold text-secondary">
                                    Education
                                  </label>
                                  <input
                                    type="text"
                                    name="education"
                                    value={localWorker.education || ""}
                                    onChange={handleChange}
                                    className="form-control dark-input"
                                    placeholder="Enter education"
                                  />
                                </div>

                                <div className="col-md-4">
                                  <label className="form-label fw-semibold text-secondary">
                                    Location
                                  </label>
                                  <input
                                    type="text"
                                    name="location"
                                    value={localWorker.location || ""}
                                    onChange={handleChange}
                                    className="form-control dark-input"
                                    placeholder="Enter location"
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className="info-grid-compact">
                                {renderInfoCard(
                                  "Mobile Number",
                                  localWorker.mobileNo
                                )}
                                {renderInfoCard("Full Name", localWorker.name)}
                                {renderInfoCard(
                                  "Gender",
                                  localWorker.gender,
                                  "gender"
                                )}
                                {renderInfoCard(
                                  "Education",
                                  localWorker.education
                                )}
                                {renderInfoCard("Age", localWorker.age)}
                                {renderInfoCard(
                                  "Location",
                                  localWorker.location
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Professional Information */}
                      <div className="col-12">
                        <div className="dark-card">
                          <div className="card-header dark-card-header">
                            <h6 className="mb-0 fw-bold d-flex align-items-center text-warning">
                              <i className="bi bi-briefcase me-2"></i>
                              Professional Information
                            </h6>
                          </div>
                          <div className="card-body p-3">
                            {isEditMode ? (
                              <div className="row g-3">
                                <div className="col-md-4">
                                  <label className="form-label fw-semibold text-secondary">
                                    Marital Status
                                  </label>
                                  <select
                                    name="maritalStatus"
                                    value={localWorker.maritalStatus || ""}
                                    onChange={handleChange}
                                    className="form-select dark-input"
                                  >
                                    <option value="">Select Status</option>
                                    <option value="Single">Single</option>
                                    <option value="Married">Married</option>
                                    <option value="Separated">Separated</option>
                                    <option value="Widow">Widow</option>
                                  </select>
                                </div>

                                <div className="col-md-4">
                                  <label className="form-label fw-semibold text-secondary">
                                    Source
                                  </label>
                                  <select
                                    name="source"
                                    value={localWorker.source || ""}
                                    onChange={handleChange}
                                    className="form-select dark-input"
                                  >
                                    <option value="">Select Source</option>
                                    {sourceOptions.map((s) => (
                                      <option key={s} value={s}>
                                        {s}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <div className="col-md-4">
                                  <label className="form-label fw-semibold text-secondary">
                                    Experience
                                  </label>
                                  <select
                                    name="experience"
                                    value={localWorker.experience || "No"}
                                    onChange={handleChange}
                                    className="form-select dark-input"
                                  >
                                    <option value="No">No Experience</option>
                                    <option value="Yes">Has Experience</option>
                                  </select>
                                </div>

                                <div className="col-md-4">
                                  <label className="form-label fw-semibold text-secondary">
                                    Years
                                  </label>
                                  <input
                                    type="number"
                                    name="years"
                                    value={localWorker.years || ""}
                                    onChange={handleChange}
                                    className="form-control dark-input text-center"
                                    min="0"
                                    max="50"
                                    placeholder="Years"
                                  />
                                </div>

                                <div className="col-md-4">
                                  <label className="form-label fw-semibold text-secondary d-block">
                                    Working Hours
                                  </label>
                                  <select
                                    name="workingHours"
                                    value={localWorker.workingHours || ""}
                                    onChange={handleChange}
                                    className="form-select dark-input"
                                  >
                                    <option value="">Select Hours</option>
                                    <option value="24">24HR</option>
                                    <option value="12">12HR</option>
                                  </select>
                                </div>

                                <div className="col-md-4">
                                  <label className="form-label fw-semibold text-secondary">
                                    Joining Type
                                  </label>

                                  <select
                                    name="joiningType"
                                    value={localWorker.joiningType || "No"}
                                    onChange={handleChange}
                                    className="form-select dark-input"
                                  >
                                    <option value="">
                                      Select Joining Type
                                    </option>
                                    <option value="Immediate">Immediate</option>
                                    <option value="1 Week">1 Week</option>
                                    <option value="15 Days">15 Days</option>
                                    <option value="Flexible">Flexible</option>
                                    <option value="Negotiable">
                                      Negotiable
                                    </option>
                                  </select>
                                </div>

                                <div className="col-md-4">
                                  <label className="form-label fw-semibold text-secondary">
                                    Expeted Salary
                                  </label>
                                  <input
                                    type="tel"
                                    name="expectedSalary"
                                    value={localWorker.expectedSalary || ""}
                                    onChange={handleChange}
                                    className="form-control dark-input"
                                    placeholder=" Expected Salary"
                                    maxLength={5}
                                  />
                                </div>

                                <div className="col-md-4">
                                  <label className="form-label fw-semibold text-secondary d-block">
                                    Conversation Level
                                  </label>
                                  <select
                                    name="conversationLevel"
                                    value={localWorker.conversationLevel || ""}
                                    onChange={handleChange}
                                    className="form-select dark-input"
                                  >
                                    <option value="">Select Level</option>
                                    <option value="Very Good">Very Good</option>
                                    <option value="Good">Good</option>
                                    <option value="Average">Average</option>
                                    <option value="Below Average">
                                      Below Average
                                    </option>
                                    <option value="Bad">Bad</option>
                                    <option value="Very Bad">Very Bad</option>
                                  </select>
                                </div>

                                <div className="col-md-4">
                                  <label className="form-label fw-semibold text-secondary">
                                    Reminder Date
                                  </label>
                                  <input
                                    type="date"
                                    name="callReminderDate"
                                    value={localWorker.callReminderDate || ""}
                                    onChange={handleChange}
                                    className="form-control dark-input"
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className="info-grid-compact">
                                {renderInfoCard(
                                  "Marital Status",
                                  localWorker.maritalStatus
                                )}
                                {renderInfoCard("Source", localWorker.source)}
                                {renderInfoCard(
                                  "Experience",
                                  localWorker.experience
                                )}
                                {renderInfoCard("Years", localWorker.years)}
                                {renderInfoCard(
                                  "Working Hours",
                                  localWorker.workingHours
                                    ? `${localWorker.workingHours}HR`
                                    : "N/A"
                                )}
                                {renderInfoCard(
                                  "Joining Type",
                                  localWorker.joiningType,
                                  "joiningType"
                                )}
                                {renderInfoCard(
                                  "Expected Salary",
                                  localWorker.expectedSalary,
                                  "expectedSalary"
                                )}
                                {renderInfoCard(
                                  "Conversation Level",
                                  localWorker.conversationLevel,
                                  "conversation"
                                )}
                                {renderInfoCard(
                                  "Reminder Date",
                                  localWorker.callReminderDate
                                    ? new Date(
                                        localWorker.callReminderDate
                                      ).toLocaleDateString("en-GB")
                                    : "—"
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Comments */}
                      <div className="col-12">
                        <div className="dark-card">
                          <div className="card-header dark-card-header">
                            <h6 className="mb-0 fw-bold d-flex align-items-center text-warning">
                              <i className="bi bi-chat-left-text me-2"></i>
                              Comments & Activity
                            </h6>
                          </div>
                          <div className="card-body p-3">
                            {/* Initial Form Comment */}
                            {localWorker.formComment && (
                              <div className="comment-initial mb-3">
                                <div className="comment-header d-flex justify-content-between align-items-center mb-2">
                                  <small className="text-primary fw-bold">
                                    Initial Comment
                                  </small>
                                </div>
                                <p className="mb-0 text-info">
                                  {localWorker.formComment}
                                </p>
                              </div>
                            )}

                            {/* Comments List */}
                            <div
                              className="comments-list-compact "
                              style={{ maxHeight: "200px", overflowY: "auto" }}
                            >
                              {/* Comments list (now uses state "comments" fed by DB subscription) */}
{comments.length > 0 ? (
  comments.map((c, i) => {
    const authorName = c?.authorName || c?.user || c?.author || "User";
    const avatarUrl = c?.authorPhoto || "";
    const when = c?.timestamp || c?.date
      ? new Date(c.timestamp || c.date).toLocaleString("en-GB", { hour12: true })
      : "Recent";
    const text = (c?.text || "").trim();

    return (
      <div key={c?.id || c?.timestamp || c?.date || i} className="comment-row d-flex gap-3 p-3 rounded mb-2">
        <div>
          {avatarUrl ? (
            <img src={avatarUrl} alt={authorName} className="avatar avatar-sm" style={{ objectFit: "cover", width: 32, height: 32 }} />
          ) : (
            <span className="avatar avatar-sm avatar-fallback" style={{ width: 32, height: 32 }}>
              {authorName.split(" ").map(s => s[0]).join("").slice(0, 2).toUpperCase()}
            </span>
          )}
        </div>
        <div className="flex-grow-1">
          <div className="d-flex justify-content-between align-items-center mb-1">
            <strong className="text-white-90">{authorName}</strong>
            <span className="text-muted-300 small">{when}</span>
          </div>
          <div className="text-white-80">
            {text || <span className="text-muted-400 fst-italic">— no content —</span>}
          </div>
        </div>
      </div>
    );
  })
) : (
  <div className="empty-state-compact text-center py-3">
    <i className="bi bi-chat-left-text text-muted"></i>
    <p className="mt-2 mb-0 text-muted">No comments yet</p>
  </div>
)}

                            </div>

                            {isEditMode && (
                              <div className="add-comment-section">
                                <label className="form-label fw-semibold text-light">
                                  Add Comment{" "}
                                  <span className="text-danger">*</span>
                                </label>
                                <textarea
                                  className="form-control dark-input mb-2"
                                  rows="2"
                                  value={newComment}
                                  onChange={(e) =>
                                    setNewComment(e.target.value)
                                  }
                                  placeholder="Add a new comment... (Required to enable saving)"
                                />
                                <button
                                  className="btn btn-primary btn-sm"
                                  onClick={handleAddComment}
                                  disabled={!newComment.trim()}
                                >
                                  Add Comment
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Skills Tab */}
                {activeTab === "skills" && (
                  <div className="fade show">
                    <div className="row g-3">
                      {/* Languages */}
                      <div className="col-12">
                        <div className="dark-card">
                          <div className="card-header dark-card-header">
                            <h6 className="mb-0 fw-bold d-flex align-items-center">
                              <i className="bi bi-translate me-2"></i>
                              Languages
                            </h6>
                          </div>
                          <div className="card-body p-3">
                            {isEditMode && (
                              <div className="position-relative mb-3">
                                <input
                                  type="text"
                                  className="form-control dark-input"
                                  placeholder="🔍 Search or type language..."
                                  value={languageSearch}
                                  onChange={(e) => {
                                    setLanguageSearch(e.target.value);
                                    setShowLanguageDropdown(true);
                                  }}
                                  onFocus={() => setShowLanguageDropdown(true)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Escape") {
                                      setShowLanguageDropdown(false);
                                    }
                                  }}
                                  ref={languageInputRef}
                                />
                                {showLanguageDropdown && (
                                  <div
                                    className="language-dropdown dark-dropdown"
                                    ref={dropdownRef}
                                  >
                                    {filteredLanguages.map((lang) => (
                                      <div
                                        key={lang}
                                        className="dropdown-item text-secondary"
                                        onClick={() =>
                                          handleLanguageSelect(lang)
                                        }
                                      >
                                        {lang}
                                      </div>
                                    ))}
                                    {filteredLanguages.length === 0 && (
                                      <div className="dropdown-item text-muted">
                                        No languages found
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}

                            <div className="languages-container-compact">
                              {normalizeArray(localWorker.languages).length >
                              0 ? (
                                <div className="d-flex flex-wrap gap-2">
                                  {normalizeArray(localWorker.languages).map(
                                    (lang, idx) => (
                                      <div
                                        key={idx}
                                        className="language-tag-compact btn btn-outline-warning btn-sm position-relative"
                                      >
                                        {lang}
                                        {isEditMode && (
                                          <button
                                            type="button"
                                            className="btn-close btn-close-white tag-remove position-absolute top-0 start-100 translate-middle"
                                            onClick={() =>
                                              handleTagRemove("languages", idx)
                                            }
                                            style={{
                                              width: "0.5rem",
                                              height: "0.5rem",
                                              fontSize: "0.6rem",
                                              padding: "0.25rem",
                                            }}
                                          ></button>
                                        )}
                                      </div>
                                    )
                                  )}
                                </div>
                              ) : (
                                <div className="empty-state-compact text-center py-3">
                                  <i className="bi bi-translate text-muted"></i>
                                  <p className="mt-2 mb-0 text-muted">
                                    No languages selected
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Skills Columns */}
                      {/* <div className="col-md-6">
                        <div className="dark-card h-100">
                          <div className="card-header dark-card-header">
                            <h6 className="mb-0 fw-bold text-warning">PRIMARY SKILLS</h6>
                          </div>
                          <div className="card-body p-3">
                            {isEditMode ? (
                              <>
                                <div className="skills-pills-compact mb-3">
                                  {primarySkillOptions.map((opt) => {
                                    const active = normalizeArray(localWorker.skills)
                                      .map((x) => String(x).toLowerCase())
                                      .includes(String(opt).toLowerCase());
                                    return (
                                      <button
                                        type="button"
                                        key={`primary-${opt}`}
                                        className={`btn btn-sm rounded-pill ${active
                                          ? "btn-primary"
                                          : "btn-outline-light"
                                          } disabled-keep skill-pill-compact`}
                                        onClick={() => handleMultiToggle("skills", opt)}
                                        disabled={!isEditMode}
                                        aria-pressed={active}
                                      >
                                        {opt}
                                      </button>
                                    );
                                  })}
                                </div>

                                <div className="input-group input-group-sm mb-2">
                                  <input
                                    id="custom-skills"
                                    type="text"
                                    className="form-control dark-input"
                                    placeholder="Add custom skill"
                                    disabled={!isEditMode}
                                  />
                                  <button
                                    type="button"
                                    className="btn btn-primary disabled-keep"
                                    onClick={() => handleAddCustom("skills", "custom-skills")}
                                    disabled={!isEditMode}
                                  >
                                    Add
                                  </button>
                                </div>
                              </>
                            ) : (
                              <div className="skills-display-compact">
                                {normalizeArray(localWorker.skills).length > 0 ? (
                                  <div className="d-flex flex-wrap gap-2">
                                    {normalizeArray(localWorker.skills).map((skill, idx) => (
                                      <span
                                        key={idx}
                                        className="skill-tag-compact primary"
                                      >
                                        {skill}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="empty-state-compact text-center py-3">
                                    <i className="bi bi-tools text-muted"></i>
                                    <p className="mt-2 mb-0 text-muted">No primary skills</p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div> */}

                      <div className="col-md-12">
                        <div className="dark-card">
                          <div className="card-header dark-card-header">
                            <h6 className="mb-0 fw-bold text-warning">
                              HOME CARE SKILLS
                            </h6>
                          </div>
                          <div className="card-body p-3">
                            {isEditMode ? (
                              <>
                                <div className="skills-pills-compact mb-3">
                                  {homeCareSkillOptions.map((opt) => {
                                    const active = normalizeArray(
                                      localWorker.homeCareSkills
                                    )
                                      .map((x) => String(x).toLowerCase())
                                      .includes(String(opt).toLowerCase());
                                    return (
                                      <button
                                        type="button"
                                        key={`homecare-${opt}`}
                                        className={`btn btn-sm rounded-pill ${
                                          active
                                            ? "btn-info"
                                            : "btn-outline-info"
                                        } disabled-keep skill-pill-compact`}
                                        onClick={() =>
                                          handleMultiToggle(
                                            "homeCareSkills",
                                            opt
                                          )
                                        }
                                        disabled={!isEditMode}
                                        aria-pressed={active}
                                      >
                                        {opt}
                                      </button>
                                    );
                                  })}
                                </div>

                                <div className="input-group input-group-sm mb-2">
                                  <input
                                    id="custom-homeCareSkills"
                                    type="text"
                                    className="form-control dark-input"
                                    placeholder="Add custom skill"
                                    disabled={!isEditMode}
                                  />
                                  <button
                                    type="button"
                                    className="btn btn-success disabled-keep"
                                    onClick={() =>
                                      handleAddCustom(
                                        "homeCareSkills",
                                        "custom-homeCareSkills"
                                      )
                                    }
                                    disabled={!isEditMode}
                                  >
                                    Add
                                  </button>
                                </div>
                              </>
                            ) : (
                              <div className="skills-display-compact">
                                {normalizeArray(localWorker.homeCareSkills)
                                  .length > 0 ? (
                                  <div className="d-flex flex-wrap gap-2">
                                    {normalizeArray(
                                      localWorker.homeCareSkills
                                    ).map((skill, idx) => (
                                      <span
                                        key={idx}
                                        className="skill-tag-compact success"
                                      >
                                        {skill}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="empty-state-compact text-center py-3">
                                    <i className="bi bi-house-heart text-muted"></i>
                                    <p className="mt-2 mb-0 text-muted">
                                      No home care skills
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Other Skills Accordion */}
                      <div className="col-12">
                        <div className="dark-card">
                          <div className="card-header dark-card-header">
                            <h6 className="mb-0 fw-bold text-warning">
                              OTHER SKILLS
                            </h6>
                          </div>
                          <div className="card-body">
                            {isEditMode ? (
                              <>
                                <div
                                  className="accordion"
                                  id="otherSkillsAccordion"
                                >
                                  {[
                                    {
                                      title: "💼 Office & Administrative",
                                      skills: otherSkillOptions.slice(0, 9),
                                      color: "office",
                                      bgClass: "bg-office",
                                      btnClass: "btn-office",
                                    },
                                    {
                                      title: "📞 Customer Service",
                                      skills: otherSkillOptions.slice(9, 15),
                                      color: "customer",
                                      bgClass: "bg-customer",
                                      btnClass: "btn-customer",
                                    },
                                    {
                                      title: "👔 Management",
                                      skills: otherSkillOptions.slice(15, 20),
                                      color: "management",
                                      bgClass: "bg-management",
                                      btnClass: "btn-management",
                                    },
                                    {
                                      title: "🛡️ Security",
                                      skills: otherSkillOptions.slice(20, 24),
                                      color: "security",
                                      bgClass: "bg-security",
                                      btnClass: "btn-security",
                                    },
                                    {
                                      title: "🚗 Driving & Logistics",
                                      skills: otherSkillOptions.slice(24, 32),
                                      color: "driving",
                                      bgClass: "bg-driving",
                                      btnClass: "btn-driving",
                                    },
                                    {
                                      title: "🔧 Technical",
                                      skills: otherSkillOptions.slice(32, 42),
                                      color: "technical",
                                      bgClass: "bg-technical",
                                      btnClass: "btn-technical",
                                    },
                                    {
                                      title: "🛍️ Retail & Sales",
                                      skills: otherSkillOptions.slice(42, 47),
                                      color: "retail",
                                      bgClass: "bg-retail",
                                      btnClass: "btn-retail",
                                    },
                                    {
                                      title: "🏭 Industrial",
                                      skills: otherSkillOptions.slice(47),
                                      color: "industrial",
                                      bgClass: "bg-industrial",
                                      btnClass: "btn-industrial",
                                    },
                                  ].map((category, index) => {
                                    const selectedCount = normalizeArray(
                                      localWorker.otherSkills
                                    ).filter((x) =>
                                      category.skills
                                        .map((s) => s.toLowerCase())
                                        .includes(String(x).toLowerCase())
                                    ).length;

                                    return (
                                      <div
                                        className="accordion-item mb-2"
                                        key={index}
                                      >
                                        <h2
                                          className="accordion-header"
                                          id={`heading-${index}`}
                                        >
                                          <button
                                            className={`accordion-button collapsed fw-bold text-dark`}
                                            type="button"
                                            data-bs-toggle="collapse"
                                            data-bs-target={`#collapse-${index}`}
                                            aria-expanded="false"
                                            aria-controls={`collapse-${index}`}
                                          >
                                            {category.title}
                                            {selectedCount > 0 && (
                                              <span className="badge bg-warning text-dark ms-2">
                                                {selectedCount} Selected
                                              </span>
                                            )}
                                          </button>
                                        </h2>
                                        <div
                                          id={`collapse-${index}`}
                                          className="accordion-collapse collapse"
                                          aria-labelledby={`heading-${index}`}
                                          data-bs-parent="#otherSkillsAccordion"
                                        >
                                          <div className="accordion-body">
                                            <div className="skills-pills-compact d-flex flex-wrap gap-2">
                                              {category.skills.map((opt) => {
                                                const active = normalizeArray(
                                                  localWorker.otherSkills
                                                )
                                                  .map((x) =>
                                                    String(x).toLowerCase()
                                                  )
                                                  .includes(
                                                    String(opt).toLowerCase()
                                                  );
                                                return (
                                                  <button
                                                    key={`other-${opt}`}
                                                    type="button"
                                                    className={`btn btn-sm rounded-pill ${
                                                      active
                                                        ? category.bgClass
                                                        : category.btnClass
                                                    } disabled-keep skill-pill-compact`}
                                                    onClick={() =>
                                                      handleMultiToggle(
                                                        "otherSkills",
                                                        opt
                                                      )
                                                    }
                                                    disabled={!isEditMode}
                                                    aria-pressed={active}
                                                  >
                                                    {opt}
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

                                {/* Custom Add Input */}
                                <div className="input-group input-group-sm mt-3">
                                  <input
                                    id="custom-otherSkills"
                                    type="text"
                                    className="form-control dark-input"
                                    placeholder="Add custom other skill"
                                    disabled={!isEditMode}
                                  />
                                  <button
                                    type="button"
                                    className="btn btn-warning disabled-keep"
                                    onClick={() =>
                                      handleAddCustom(
                                        "otherSkills",
                                        "custom-otherSkills"
                                      )
                                    }
                                    disabled={!isEditMode}
                                  >
                                    Add
                                  </button>
                                </div>
                              </>
                            ) : (
                              <div className="skills-display-compact">
                                {normalizeArray(localWorker.otherSkills)
                                  .length > 0 ? (
                                  <div className="d-flex flex-wrap gap-2 p-3">
                                    {normalizeArray(
                                      localWorker.otherSkills
                                    ).map((skill, idx) => (
                                      <span
                                        key={idx}
                                        className="skill-tag-compact warning"
                                      >
                                        {skill}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="empty-state-compact text-center py-3">
                                    <i className="bi bi-grid-3x3-gap text-muted"></i>
                                    <p className="mt-2 mb-0 text-muted">
                                      No other skills
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Address Tab */}
                {activeTab === "address" && (
                  <div className="fade show">
                    <div className="row g-3">
                      <div className="col-12">
                        <div className="dark-card">
                          <div className="card-header dark-card-header">
                            <h6 className="mb-0 fw-bold d-flex align-items-center text-warning">
                              <i className="bi bi-geo-alt me-2"></i>
                              Address
                            </h6>
                          </div>
                          <div className="card-body p-3">
                            <div className="row g-3">
                              <div className="col-md-6">
                                <div className="form-floating">
                                  <input
                                    className="form-control dark-input"
                                    value={localWorker.addressLine1 || ""}
                                    onChange={(e) =>
                                      isEditMode &&
                                      setLocalWorker((p) => ({
                                        ...p,
                                        addressLine1: e.target.value,
                                      }))
                                    }
                                    placeholder="Door / Street"
                                    disabled={!isEditMode}
                                  />
                                </div>
                              </div>

                              <div className="col-md-6">
                                <div className="form-floating">
                                  <input
                                    className="form-control dark-input"
                                    value={localWorker.addressLine2 || ""}
                                    onChange={(e) =>
                                      isEditMode &&
                                      setLocalWorker((p) => ({
                                        ...p,
                                        addressLine2: e.target.value,
                                      }))
                                    }
                                    placeholder="Area / Landmark"
                                    disabled={!isEditMode}
                                  />
                                </div>
                              </div>

                              <div className="col-md-4">
                                <div className="form-floating">
                                  <input
                                    className="form-control dark-input"
                                    value={localWorker.city || ""}
                                    onChange={(e) =>
                                      isEditMode &&
                                      setLocalWorker((p) => ({
                                        ...p,
                                        city: e.target.value,
                                      }))
                                    }
                                    placeholder="City / Town"
                                    disabled={!isEditMode}
                                  />
                                </div>
                              </div>

                              <div className="col-md-4">
                                <div className="form-floating">
                                  <input
                                    className="form-control dark-input"
                                    value={localWorker.state || ""}
                                    onChange={(e) =>
                                      isEditMode &&
                                      setLocalWorker((p) => ({
                                        ...p,
                                        state: e.target.value,
                                      }))
                                    }
                                    placeholder="State"
                                    disabled={!isEditMode}
                                  />
                                </div>
                              </div>

                              <div className="col-md-4">
                                <div className="form-floating">
                                  <input
                                    className="form-control dark-input"
                                    value={localWorker.pincode || ""}
                                    onChange={(e) =>
                                      isEditMode &&
                                      setLocalWorker((p) => ({
                                        ...p,
                                        pincode: e.target.value,
                                      }))
                                    }
                                    placeholder="Pincode"
                                    disabled={!isEditMode}
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Tiny note to match your requirement */}
                            <div className="small text-muted mt-2">
                              Note: For biodata, <strong>Present</strong> and{" "}
                              <strong>Permanent</strong> address are treated as
                              the same.
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Biodata Tab */}
               {/* ========== BIODATA TAB (match WorkerModal style) ========== */}
{activeTab === "biodata" && (
  <div className="modal-card">
    {/* Header strip (same gradient / header image look) */}
    <div className="modal-card-header d-flex align-items-center justify-content-between" style={{ background: "linear-gradient(90deg,#0ea5e9,#7c3aed)", color: "#fff" }}>
      <h4 className="mb-0 d-flex align-items-center gap-2">
        <img
          src="https://firebasestorage.googleapis.com/v0/b/jenceo-admin.firebasestorage.app/o/OfficeFiles%2FHeadder.svg?alt=media&token=fa65a3ab-ba03-4959-bc36-e293c6db48ae"
          alt="header"
          height={24}
          style={{ opacity: 0.9 }}
        />
        Biodata
      </h4>
      <div className="d-flex align-items-center gap-2">
        <button className="btn btn-sm btn-outline-success" onClick={handleDownloadBiodata}>
          <i className="bi bi-download me-1" /> Download
        </button>
        <button className="btn btn-sm btn-outline-primary" onClick={handleShareBiodata}>
          <i className="bi bi-share me-1" /> Share
        </button>
      </div>
    </div>

    <div className="modal-card-body">
      <div className="row g-3">
        {/* Left: Photo + upload (optional) */}
        <div className="col-md-4">
          <div className="neo-card p-3 text-center">
            <div className="mb-2">
              {localWorker.employeePhotoUrl ? (
                <img
                  src={localWorker.employeePhotoUrl}
                  alt="photo"
                  className="rounded"
                  style={{ width: "100%", maxHeight: 260, objectFit: "cover" }}
                />
              ) : (
                <div className="p-4 border rounded text-muted">No Photo</div>
              )}
            </div>

            {/* Upload photo (optional) */}
            <div className="d-grid gap-2">
              <input
                type="file"
                accept=".jpg,.jpeg,.png"
                hidden
                id="wm-photo-input"
                onChange={handlePhotoChange}
                disabled={!isEditMode}
              />
              <label htmlFor="wm-photo-input" className={`btn btn-sm ${isEditMode ? "btn-outline-info" : "btn-outline-secondary disabled"}`}>
                <i className="bi bi-image me-1" /> {isEditMode ? "Upload Photo (≤100KB)" : "Upload Disabled"}
              </label>
            </div>

            {/* ID Proof (optional) */}
            <div className="mt-3 text-start">
              <label className="form-label mb-1"><strong>ID Proof</strong></label>
              <div className="d-flex align-items-center gap-2">
                <button type="button" className="btn btn-outline-primary btn-sm" onClick={handleViewId} disabled={!localWorker.idProofUrl && !localWorker.idProofPreview}>
                  <i className="bi bi-eye me-1" /> View
                </button>
                <button type="button" className="btn btn-outline-success btn-sm" onClick={handleDownloadId} disabled={!localWorker.idProofUrl && !localWorker.idProofPreview}>
                  <i className="bi bi-download me-1" /> Download
                </button>
              </div>
              <div className="d-grid gap-2 mt-2">
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  hidden
                  id="wm-id-input"
                  onChange={handleIdProofChange}
                  disabled={!isEditMode}
                />
                <label htmlFor="wm-id-input" className={`btn btn-sm ${isEditMode ? "btn-outline-warning" : "btn-outline-secondary disabled"}`}>
                  <i className="bi bi-file-earmark-arrow-up me-1" /> {isEditMode ? "Upload ID (≤150KB)" : "Upload Disabled"}
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Preview (kept as iframe for full HTML biodata) */}
        <div className="col-md-8">
          <div className="neo-card p-0 overflow-hidden">
            <iframe
              ref={iframeRef}
              title="Biodata"
              style={{ width: "100%", height: "520px", border: "0", background: "#fff" }}
              // srcdoc is set via useEffect when tab opens
            />
          </div>
        </div>
      </div>
    </div>

    {/* Footer */}
    <div className="modal-card-footer d-flex justify-content-end gap-2">
      <button className="btn btn-secondary" onClick={onClose}><i className="bi bi-x-lg me-1" /> Close</button>
      <button className="btn btn-primary" onClick={handleDownloadBiodata}><i className="bi bi-download me-1" /> Download</button>
    </div>
  </div>
)}

              </div>

              {/* Footer */}
              <div className="modal-footer dark-footer py-2 px-3">
                <div className="d-flex justify-content-between align-items-center w-100">
                  <div className="meta-info-compact">
                    {createdByName && (
                      <small className="text-muted opacity-50">
                        Created by: <strong>{createdByName}</strong>
                        {localWorker.createdAt &&
                          ` on ${formatDateTime(localWorker.createdAt)}`}
                      </small>
                    )}
                  </div>

                  <div className="d-flex gap-2">
                    {isEditMode && (
                      <button
                        className="btn btn-success px-3 fw-bold btn-sm"
                        onClick={handleSave}
                        disabled={!canSave}
                        title={
                          !canSave ? "Add a comment first to enable saving" : ""
                        }
                      >
                        Save Changes
                      </button>
                    )}
                    <button
                      className="btn btn-secondary px-3 btn-sm"
                      onClick={confirmClose}
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Save Success Modal */}
      {showSaveModal && (
        <div
          className="modal fade show dark-modal"
          style={{ display: "block", backgroundColor: "rgba(0,0,0,0.8)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content dark-card">
              <div className="modal-body text-center p-4">
                <div className="text-success mb-3">
                  <i
                    className="bi bi-check-circle"
                    style={{ fontSize: "2.5rem" }}
                  ></i>
                </div>
                <h5 className="fw-bold text-success mb-3">Success!</h5>
                <p className="text-light mb-4">
                  Worker details have been saved successfully.
                </p>
                <button
                  className="btn btn-success px-4 btn-sm"
                  onClick={() => {
                    setShowSaveModal(false);
                    onClose();
                  }}
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Unsaved Changes Confirmation */}
      {showUnsavedConfirm && (
        <div
          className="modal fade show dark-modal"
          style={{ display: "block", background: "rgba(0,0,0,0.8)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content dark-card">
              <div className="modal-body text-center p-4">
                <div className="text-warning mb-3">
                  <i
                    className="bi bi-exclamation-triangle"
                    style={{ fontSize: "2.5rem" }}
                  ></i>
                </div>
                <h5 className="fw-bold text-warning mb-3">Unsaved Changes</h5>
                <p className="text-light mb-4">
                  You have unsaved changes. Are you sure you want to close
                  without saving?
                </p>
                <div className="d-flex gap-2 justify-content-center">
                  <button
                    className="btn btn-secondary px-3 btn-sm"
                    onClick={() => setShowUnsavedConfirm(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn btn-warning px-3 btn-sm"
                    onClick={() => {
                      setShowUnsavedConfirm(false);
                      onClose();
                    }}
                  >
                    Discard Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
