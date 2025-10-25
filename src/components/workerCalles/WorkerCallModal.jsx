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
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";


const WORKER_BASE = "WorkerCallData";
const workerRef = (id) => firebaseDB.child(`${WORKER_BASE}/${id}`);
const workerCommentsRef = (id) => firebaseDB.child(`${WORKER_BASE}/${id}/comments`);


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



async function uploadToStorage(file, pathPrefix = "WorkerFiles") {
  if (!file) return null;
  const storage = getStorage(); // or use your exported storage instance
  const name = `${pathPrefix}/${Date.now()}_${file.name || "file"}`;
  const sRef = storageRef(storage, name);
  await uploadBytes(sRef, file);
  return await getDownloadURL(sRef);
}




// ---------- Biodata HTML helpers ----------
const safe = (v) => (v === null || v === undefined ? "" : String(v).trim());
const asArr = (v) => (Array.isArray(v) ? v : v ? [v] : []);
const chips = (arr) =>
  asArr(arr)
    .filter(Boolean)
    .map((x) => `<span class="tag">${safe(x)}</span>`)
    .join(" ");

const addrLines = (a = {}) => {
  const l1 = safe(a.line1 || a.addressLine1 || a.address1);
  const l2 = safe(a.line2 || a.addressLine2 || a.address2);
  const city = safe(a.city);
  const state = safe(a.state);
  const pin = safe(a.pincode || a.pin || a.zip);
  return `
    <div class="row">
      <div class="col-md-4"><strong>Address Line 1</strong></div><div class="col-md-1 text-center">:</div><div class="col-md-7">${l1}</div>
    </div>
    <div class="row">
      <div class="col-md-4"><strong>Address Line 2</strong></div><div class="col-md-1 text-center">:</div><div class="col-md-7">${l2}</div>
    </div>
    <div class="row">
      <div class="col-md-4"><strong>City</strong></div><div class="col-md-1 text-center">:</div><div class="col-md-7">${city}</div>
    </div>
    <div class="row">
      <div class="col-md-4"><strong>State</strong></div><div class="col-md-1 text-center">:</div><div class="col-md-7">${state}</div>
    </div>
    <div class="row">
      <div class="col-md-4"><strong>Pincode</strong></div><div class="col-md-1 text-center">:</div><div class="col-md-7">${pin}</div>
    </div>
  `;
};

const addressBlock = (title, a) => `
  <div class="addr">
    <div class="addr-title">${title}</div>
    <div class="addr-line">${addrLines(a)}</div>
  </div>
`;

const section = (titleHtml, bodyHtml) => `
  <div class="sec">
    <div class="sec-title">${titleHtml}</div>
    <div class="sec-body">${bodyHtml}</div>
  </div>
`;

const buildBiodataHTML = (w) => {
  const headerImage = "https://firebasestorage.googleapis.com/v0/b/jenceo-admin.firebasestorage.app/o/OfficeFiles%2FHeadder.svg?alt=media&token=fa65a3ab-ba03-4959-bc36-e293c6db48ae";

  const empId = safe(w.callId);
  const fullName = safe(w.name || `${safe(w.firstName)} ${safe(w.lastName)}`.trim());
  const gender = safe(w.gender);
  const dobText = safe(w.dob || w.dateOfBirth);
  const ageText = safe(w.age);
  const co = safe(w.careOf || w.guardianName || w.fatherName || w.motherName);
  const marital = safe(w.maritalStatus);

  const qual = safe(w.qualification || w.education);
  const college = safe(w.collegeName || w.college || w.school);
  const pskill = chips(w.primarySkill || w.skills);
  const otherSkills = w.otherSkills || [];
  const mtongue = chips(w.motherTongue);
  const experince = safe(w.years);
  const langs = safe(w.languages || []);

  const permAddr = {
    line1: w.permanentAddressLine1 || w.addressLine1 || w.address1,
    line2: w.permanentAddressLine2 || w.addressLine2 || w.address2,
    city: w.permanentCity || w.city,
    state: w.permanentState || w.state,
    pincode: w.permanentPincode || w.pincode || w.pin,
  };
  // Present address – if missing, fall back to permanent (as requested)
  const presentAddr = {
    line1: w.presentAddressLine1 || w.addressLine1 || w.address1 || permAddr.line1,
    line2: w.presentAddressLine2 || w.addressLine2 || w.address2 || permAddr.line2,
    city: w.presentCity || w.city || permAddr.city,
    state: w.presentState || w.state || permAddr.state,
    pincode: w.presentPincode || w.pincode || w.pin || permAddr.pincode,
  };

  const metaDate = new Date().toLocaleDateString("en-GB");
  const idDisplay = safe(w.idNo || w.employeeId || w.id || w.key);

  const stars = Number(w.rating ?? 0);
  const starColor = stars >= 4 ? "#16a34a" : (stars >= 3 ? "#f59e0b" : "#ef4444");
  const ratingHtml = `
  <div style= "margin-top:6px;text-align:center;color:${starColor}; background: #f5f5f5; max-width: max-content; margin: auto; padding: 3px; border-radius: 4px;">
    ${[1, 2, 3, 4, 5].map(n => n <= stars ? "★" : "☆").join(" ")}
    <span style="margin-left:6px;font-size:12px;color:#555">(${stars}/5)</span>
  </div>
`;

  // then use ${photoHtml}${ratingHtml} where you render the photo box


  // Photo (prefer saved URL, then in-memory preview)
  const photoUrl = w.employeePhotoUrl || w.employeePhoto || w.photoURL || "";
  const photoPreview = w.employeePhotoPreview || "";
  const photoHtml = (photoUrl || photoPreview)
    ? `<img src="${safe(photoUrl || photoPreview)}" alt="Photo" />`
    : `<div class="no-photo">No Photo</div>`;

  const html = `
<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Employee Biodata - ${fullName}</title>
<style>
  *{box-sizing:border-box}
  html,body{margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;color:#111}
  .page{ max-width:900px; margin:auto;background:#fff;border:1px solid #e5e5e5;padding:20px}
  .header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;border-bottom:2px solid #b7b4b4; padding:20px; margin:0 -20px; background: #c7d1f5; border-radius: 5px;}
  .row { display: flex; flex-wrap: wrap; margin-left: -6px; margin-right: -6px; border-bottom:1px solid #f1f1f1; margin-bottom:6px }
  .row > div { padding-left: 6px; padding-right: 6px; }
  .col-md-1 { flex: 0 0 8.3333%;  max-width: 8.3333%; }
  .col-md-4 { flex: 0 0 33.3333%; max-width: 33.3333%; }
  .col-md-7 { flex: 0 0 58.3333%; max-width: 58.3333%; }

  .biodataHeader {display:flex; justify-content:space-between; align-items: stretch; color:#fff; margin: -20px -20px 20px -20px}
  .logoSection {flex: 0 0 40%; align-content: center; border-bottom:10px solid #02acf2 }
  .logoSection h1 {color:#FCC603; margin:0; font-size:40px; margin-left:50px; font-weight:900; line-height:1}
  .logoSection h1 spane {color:#02acf2; margin:0; font-size:100px; }
  .logoSection .subText {color:#817f7f; margin-left:65px; font-size:12px; font-weight:bold; letter-spacing:3px  }
  .dataSection {background:#02acf2; flex: 1;  padding:10px 20px; border-top-left-radius: 125px; padding-left: 70px; }
  .dataSection * {margin:0; }
  .dataSection span {font-size:10px; }

  .h-left{flex:1; margin-top:25px}
  .title{font-size:40px;font-weight:700;letter-spacing:.4px;margin:0}
  .subtitle{font-size:12px;color:#444;margin-top:2px}
  .meta{font-size:11px;color:#555;margin-top:4px;display:flex;gap:14px;flex-wrap:wrap}
  .sec{margin-top:14px;border:1px solid #ddd;border-radius:6px;overflow:hidden}
  .sec-title{background:#dfe2f5; padding:8px 10px;font-weight:700}
  .sec-title h3{margin:0;font-size:14px}
  .sec-body{padding:10px}
  .kv-row{display:grid;grid-template-columns: 240px 12px 1fr;gap:10px;align-items:start; margin-bottom:0; padding: 8px 0 2px 5px;}
  .kv-row:nth-child(even) {background-color: #f2f3fd;}
  .kv-label{font-weight:600; font-size:12px}
  .kv-colon{text-align:center}
  .kv-value{font-weight:500;word-break:break-word; font-size:12px}
  .addr{border:1px dashed #c9c9c9;border-radius:6px; padding:10px;margin-top:10px; margin-bottom:5px}
  .addr-title{font-weight:700;margin-bottom:4px; font-size:14px}
  .addr-line{font-size:10px;line-height:1; margin-bottom:5px}
  .addr-line .row {padding-top:10px; padding-bottom:10px; border-bottom:0; margin-bottom:0}
  .addr-line .row:nth-child(odd) {background-color:#f2f3fd;}
  .two-col{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  .tags{display:flex;flex-wrap:wrap;gap:6px}
  .tag{border:1px solid #02acf2;color:#02acf2;font-size:12px;padding:3px 8px;border-radius:999px}
  .muted{color:#777}
  .footer{margin :20px -20px -20px -20px;font-size:10px; color:#fff;display:flex;justify-content:space-between; background-color:#02acf2; padding:10px 20px}
  .blue {color:#02acf2}
  @media print{.page{border:none;margin:0;width:100%}}
  .header-img{width:100%;max-height:120px;object-fit:contain;margin-bottom:6px}
  .photo-box {text-align: center;}
  .photo-box img{width:130px;height:130px;object-fit:cover;border-radius:6px;border:1px solid #ccc}
  .photo-box .no-photo{width:120px;height:120px;border:1px solid #ccc;border-radius:6px;display:flex;align-items:center;justify-content:center;color:#888;font-size:12px}
  .heaerImg {margin: -21px -20px 10px -20px}
  .heaerImg img {width:100%}

  @media only screen and (max-width: 767px) {
    .biodataHeader {display:none}
    .header {display:block}
    .header .h-left {text-align:center; margin-top:10px}
    .header .meta {justify-content:center; margin-bottom:15px}
    .title {font-size: 20px}
    .kv-row {display:block}
    .kv-colon {display:none}
    .kv-label {margin-bottom:5px}
    .two-col {display:block}
    .col-md-1 { display:none}
    .col-md-4 { flex: 0 0 100%; max-width: 100%; }
    .col-md-7 { flex: 0 0 100%; max-width: 100%; }
    .addr-title {font-size:12px}
    .addr-line .col-md-4 {padding-bottom:5px}
    .photo-box {text-align:center}
  }
</style>
</head>
<body>
<div class="page">
  <div class="heaerImg"><img src="${headerImage}" alt="Header" /></div>

  <div class="header">
    <div class="h-left">
      <h1 class="title">EMPLOYEE BIO-DATA</h1>
      <div class="subtitle">H.R Department (Reg No: SEA/HYD/ALO/26/1040178/2025)</div>
      <div class="meta">
        <div><strong>ID:</strong> ${empId}</div>
        <div><strong>Date:</strong> ${metaDate}</div>
      </div>
    </div>
    <div class="photo-box">
      ${photoHtml}
      ${ratingHtml}
    </div>
    
  </div>

  ${section("<h3>Basic Information</h3>", `
    <div class="kv-row">
      <div class="kv-label">Full Name</div><div class="kv-colon">:</div>
      <div class="kv-value blue"><strong>${fullName}</strong></div>
    </div>
    <div class="kv-row">
      <div class="kv-label">Gender</div><div class="kv-colon">:</div>
      <div class="kv-value blue">${gender}</div>
    </div>
    <div class="kv-row">
      <div class="kv-label">Date of Birth</div><div class="kv-colon">:</div>
      <div class="kv-value">${dobText}</div>
    </div>
    <div class="kv-row">
      <div class="kv-label">Age</div><div class="kv-colon">:</div>
      <div class="kv-value blue">${ageText}</div>
    </div>
    <div class="kv-row">
      <div class="kv-label">Care of</div><div class="kv-colon">:</div>
      <div class="kv-value">${co}</div>
    </div>
    <div class="kv-row">
      <div class="kv-label">Marital Status</div><div class="kv-colon">:</div>
      <div class="kv-value blue">${marital}</div>
    </div>
  `)}

  ${section("<h3>Addresses</h3>", `
    <div class="two-col">
      <div>${addressBlock("Permanent Address", permAddr)}</div>
      <div>${addressBlock("Present Address", presentAddr)}</div>
    </div>
  `)}

  ${section("<h3>Qualification & Skills</h3>", `
    <div class="kv-row">
      <div class="kv-label">Qualification</div><div class="kv-colon">:</div>
      <div class="kv-value blue">${qual}</div>
    </div>
    <div class="kv-row">
      <div class="kv-label">College / School</div><div class="kv-colon">:</div>
      <div class="kv-value">${college}</div>
    </div>
    <div class="kv-row">
      <div class="kv-label">Primary Skill</div><div class="kv-colon">:</div>
      <div class="kv-value blue"><strong>${pskill}</strong></div>
    </div>
    <div class="kv-row">
      <div class="kv-label">Other Skills</div><div class="kv-colon">:</div>
      <div class="kv-value">${safe(otherSkills)}</div>
    </div>
    <div class="kv-row">
      <div class="kv-label">Experience</div><div class="kv-colon">:</div>
      <div class="kv-value blue"><strong>${chips(experince)}</strong></div>
    </div>
    <div class="kv-row">
      <div class="kv-label">Mother Tongue</div><div class="kv-colon">:</div>
      <div class="kv-value">${mtongue}</div>
    </div>
    <div class="kv-row">
      <div class="kv-label">Languages</div><div class="kv-colon">:</div>
      <div class="kv-value">${langs}</div>
    </div>
  `)}

  <div class="footer">
    <div>Doc Ref: JC-HR-07</div>
    <div>Revision: 1</div>
    <div>Date: 1st May 2025</div>
    <div>Page 1 of 1</div>
  </div>
</div>
<script>window.focus && window.focus();</script>
</body>
</html>
`;
  return html;
};




export default function WorkerCallModal({
  worker,
  isOpen,
  onClose,
  isEditMode,
  workerData
}) {
  const { user: authUser } = useAuth();
  useEffect(() => {
    if (worker && typeof worker === "object") {
      setLocalWorker(worker);
    }
  }, [worker]);


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

  const MOTHER_TONGUE_OPTIONS = [
    "Telugu",
    "English",
    "Hindi",
    "Urdu",
    "Tamil",
    "Kannada",
    "Malayalam",
    "Marathi",
    "Gujarati",
    "Bengali",
    "Punjabi",
    "Odia",
    "Assamese"
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


  // Builds a Blob URL with the same HTML you see in the Biodata iframe
  const makeBiodataBlobUrl = (workerObj) => {
    const html = buildBiodataHTML(workerObj || {});
    const blob = new Blob([html], { type: "text/html" });
    return URL.createObjectURL(blob);
  };

  // Download the full biodata (HTML with photo & content)
  const handleDownloadBiodata = () => {
    const url = makeBiodataBlobUrl(localWorker); // ✅ use current worker
    const a = document.createElement("a");
    a.href = url;
    a.download = `Biodata_${localWorker?.callId || localWorker?.name || "worker"}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const handleShareBiodata = async () => {
    try {
      // Try to share as image (optional) if html2canvas is present
      const canShareFiles = !!(navigator.share && navigator.canShare);
      const canvasRoot = iframeRef?.current?.contentDocument?.body;
      if (canShareFiles && window.html2canvas && canvasRoot) {
        const canvas = await window.html2canvas(canvasRoot, { useCORS: true, backgroundColor: "#fff", scale: 2 });
        const blob = await new Promise((res) => canvas.toBlob(res, "image/png"));
        if (blob) {
          const file = new File([blob], `Biodata_${localWorker?.callId || "worker"}.png`, { type: "image/png" });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              title: `Biodata - ${localWorker?.name || ""}`,
              text: `Biodata - ${localWorker?.name || ""}\nMobile: ${localWorker?.mobileNo || ""}`,
              files: [file],
            });
            return;
          }
        }
      }

      // Fallback: share/open a temporary HTML page (exact same UI content)
      const url = makeBiodataBlobUrl(localWorker);
      // On desktop this opens a tab; on mobile you can copy/share the URL
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      // Final fallback: open HTML in a new tab
      const url = makeBiodataBlobUrl(localWorker);
      window.open(url, "_blank", "noopener,noreferrer");
    }
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

  // Live subscribe to the worker node so UI always reflects latest DB state
  useEffect(() => {
    if (!worker?.id) return;
    const ref = workerRef(worker.id);

    const onVal = (snap) => {
      const fresh = snap.val() || {};
      setLocalWorker((prev) => ({ ...prev, ...fresh }));
      // keep rating state in sync
      setRating(Number(fresh.rating ?? 0));

      // if Biodata tab is open, refresh the iframe
      if (activeTab === "biodata" && iframeRef.current) {
        iframeRef.current.srcdoc = buildBiodataHTML(fresh);
      }
    };

    ref.on("value", onVal);
    return () => ref.off("value", onVal);
  }, [worker?.id, activeTab]);


  // Canonical comments array; ALWAYS sorted desc by date
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");

  const [showSaveModal, setShowSaveModal] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [showUnsavedConfirm, setShowUnsavedConfirm] = useState(false);
  const [languageSearch, setLanguageSearch] = useState("");
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);

  const [rating, setRating] = useState(
    Number(worker?.rating ?? 0)
  );


  const languageInputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Save remains disabled until a comment is added this session
  const [canSave, setCanSave] = useState(true);

  // Rehydrate when the record changes
  useEffect(() => {
    if (!worker) return;
    // Normalize a few possible legacy keys just in case
    const nursing =
      worker.nursingWorks ??
      worker.nursingTasks ??
      worker.nurseWorks ??
      [];

    setLocalWorker(prev => ({
      ...prev,
      ...worker,
      nursingWorks: Array.isArray(nursing) ? nursing : [],
      homeCareSkills: Array.isArray(worker.homeCareSkills) ? worker.homeCareSkills : [],
      // keep other fields as you already do...
    }));
  }, [worker]);


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
    const ref = workerCommentsRef(worker.id);
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
  useEffect(() => {
    if (activeTab !== "biodata") return;
    if (!iframeRef.current) return;
    iframeRef.current.srcdoc = buildBiodataHTML(localWorker || {});
  }, [activeTab, localWorker]);



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
    const file = e.target.files?.[0];
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
        employeePhotoUrl: null, // Clear the old URL to force using preview
        employeePhotoPreview: ev.target.result,
      }));
      setDirty(true);
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
        idProofUrl: null, // Clear the old URL to force using preview
        idProofPreview: ev.target.result,
      }));
      setDirty(true);
    };
    reader.readAsDataURL(file);
  };

  // Open ID proof in a new tab (PDF or image)
  const handleViewId = () => {
    const url = localWorker.idProofUrl || localWorker.idProofPreview || null;
    if (!url) return alert("No ID proof available to view.");
    const win = window.open("", "_blank", "noopener,noreferrer");
    if (!win) return alert("Popup blocked. Please allow popups.");

    const lower = url.toLowerCase();
    if (lower.endsWith(".pdf") || lower.includes("application/pdf")) {
      win.document.write(`<embed src="${url}" type="application/pdf" width="100%" height="100%" />`);
    } else {
      win.document.write(`<img src="${url}" style="width:100%" />`);
    }
  };

  const handleDownloadId = () => {
    // Use preview first, then URL
    const url = localWorker.idProofPreview || localWorker.idProofUrl || null;
    if (!url) return alert("No ID proof available to download.");
    const a = document.createElement("a");
    a.href = url;
    // Determine file extension based on content type
    let extension = ".jpg";
    if (url.toLowerCase().endsWith(".pdf") || url.includes("application/pdf")) {
      extension = ".pdf";
    } else if (url.includes("image/png")) {
      extension = ".png";
    }
    a.download = `${localWorker.name || "ID_Proof"}${extension}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
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

  // Remove disallowed values (undefined, functions, File/Blob) recursively
  function cleanForFirebase(input) {
    if (input == null) return input; // keep null
    if (Array.isArray(input)) {
      return input
        .map((x) => cleanForFirebase(x))
        .filter((x) => x !== undefined); // strip undefined array items
    }
    if (typeof input === "object") {
      // Skip File/Blob
      const isFileLike =
        (typeof File !== "undefined" && input instanceof File) ||
        (typeof Blob !== "undefined" && input instanceof Blob);
      if (isFileLike) return undefined;

      const out = {};
      for (const [k, v] of Object.entries(input)) {
        if (typeof v === "function") continue;
        const cleaned = cleanForFirebase(v);
        if (cleaned !== undefined) out[k] = cleaned; // omit undefined keys
      }
      return out;
    }
    // primitives: keep (string/number/boolean)
    return input;
  }

  // Convenience: ensure arrays + clear transient upload fields
  function buildWorkerSavePayload(localWorker, {
    employeePhotoUrl,
    idProofUrl,
    currentUserId,
    currentUserName
  }) {
    const now = Date.now();
    const base = {
      ...localWorker,

      // normalize arrays
      skills: Array.isArray(localWorker.skills) ? localWorker.skills : (localWorker.skills ? [localWorker.skills] : []),
      languages: Array.isArray(localWorker.languages) ? localWorker.languages : (localWorker.languages ? [localWorker.languages] : []),
      homeCareSkills: Array.isArray(localWorker.homeCareSkills) ? localWorker.homeCareSkills : (localWorker.homeCareSkills ? [localWorker.homeCareSkills] : []),
      otherSkills: Array.isArray(localWorker.otherSkills) ? localWorker.otherSkills : (localWorker.otherSkills ? [localWorker.otherSkills] : []),

      // uploaded URLs
      employeePhotoUrl: employeePhotoUrl ?? localWorker.employeePhotoUrl ?? null,
      idProofUrl: idProofUrl ?? localWorker.idProofUrl ?? null,

      // NEW: persist rating
      rating: Number(localWorker.rating ?? 0),

      // explicitly clear previews in DB (null, not undefined)
      employeePhotoPreview: null,
      idProofPreview: null,

      // NEVER store File/Blob in RTDB
      employeePhotoFile: undefined,
      idProofFile: undefined,

      updatedAt: now,
      updatedById: currentUserId || localWorker.updatedById || null,
      updatedByName: currentUserName || localWorker.updatedByName || ""
    };

    if (!localWorker.createdAt) base.createdAt = localWorker.date || now;
    if (!localWorker.createdById && currentUserId) {
      base.createdById = currentUserId;
      base.createdByName = currentUserName || "";
    }

    return cleanForFirebase(base);
  }



  /** Save worker details (disabled until a comment is added) */
  // Remove undefined/File/Blob and clear previews before writing to RTDB
  function cleanForFirebase(input) {
    if (input == null) return input;                        // keep null
    if (Array.isArray(input)) return input.map(cleanForFirebase).filter(v => v !== undefined);
    if (typeof input === "object") {
      // skip File/Blob
      if ((typeof File !== "undefined" && input instanceof File) ||
        (typeof Blob !== "undefined" && input instanceof Blob)) return undefined;
      const out = {};
      for (const [k, v] of Object.entries(input)) {
        if (typeof v === "function") continue;
        const cleaned = cleanForFirebase(v);
        if (cleaned !== undefined) out[k] = cleaned;        // omit undefined keys
      }
      return out;
    }
    return input;                                          // primitives ok
  }

  function buildWorkerSavePayload(source, { employeePhotoUrl, idProofUrl, currentUserId, currentUserName }) {
    const now = Date.now();

    const base = {
      ...source,

      // normalize arrays
      skills: Array.isArray(source.skills) ? source.skills : (source.skills ? [source.skills] : []),
      languages: Array.isArray(source.languages) ? source.languages : (source.languages ? [source.languages] : []),
      homeCareSkills: Array.isArray(source.homeCareSkills) ? source.homeCareSkills : (source.homeCareSkills ? [source.homeCareSkills] : []),
      otherSkills: Array.isArray(source.otherSkills) ? source.otherSkills : (source.otherSkills ? [source.otherSkills] : []),
      nursingWorks: Array.isArray(source.nursingWorks) ? source.nursingWorks : (source.nursingWorks ? [source.nursingWorks] : []),

      // URLs coming from uploads (fall back to existing)
      employeePhotoUrl: employeePhotoUrl ?? source.employeePhotoUrl ?? null,
      idProofUrl: idProofUrl ?? source.idProofUrl ?? null,

      // persist rating
      rating: Number(source.rating ?? 0),

      // clear previews in DB (use null, not undefined)
      employeePhotoPreview: null,
      idProofPreview: null,

      // never store File/Blob
      employeePhotoFile: undefined,
      idProofFile: undefined,

      updatedAt: now,
      updatedById: currentUserId || source.updatedById || null,
      updatedByName: currentUserName || source.updatedByName || "",
    };

    if (!source.createdAt) base.createdAt = source.date || now;
    if (!source.createdById && currentUserId) {
      base.createdById = currentUserId;
      base.createdByName = currentUserName || "";
    }

    return cleanForFirebase(base);
  }

  const handleSave = async () => {
    try {
      // 1) Upload files if present
      let employeePhotoUrl = localWorker.employeePhotoUrl || null;
      let idProofUrl = localWorker.idProofUrl || null;

      if (localWorker.employeePhotoFile) {
        employeePhotoUrl = await uploadToStorage(localWorker.employeePhotoFile, "WorkerPhotos");
      }
      if (localWorker.idProofFile) {
        idProofUrl = await uploadToStorage(localWorker.idProofFile, "WorkerIdProofs");
      }

      // 2) Build safe payload (includes rating)
      const payload = buildWorkerSavePayload(
        { ...localWorker, rating },                 // include latest rating state
        { employeePhotoUrl, idProofUrl, currentUserId, currentUserName }
      );

      // 3) Write to RTDB
      await firebaseDB.child(`${WORKER_BASE}/${localWorker.id}`).update(payload);

      // 4) Reflect immediately in UI
      setLocalWorker((prev) => ({ ...prev, ...payload }));
      setDirty(false);

      // 5) Refresh biodata iframe if open
      if (activeTab === "biodata" && iframeRef.current) {
        iframeRef.current.srcdoc = buildBiodataHTML({ ...localWorker, ...payload });
      }

      // Optional: small toast/modal you already have
      setShowSaveModal?.(true);
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

      await workerCommentsRef(worker.id).set(updated);

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
      const message = `Hello ${localWorker.name || ""
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
              <div className="d-flex align-items-center w-100 flex-wrap">
                <div className="flex-grow-1">


                  <h5 className="modal-title fw-bold mb-2 text-warning">
                    {localWorker?.name}
                  </h5>
                  <div className="d-flex align-items-center gap-1 ms-3">
                    {[1, 2, 3, 4, 5].map(n => {
                      let starColor = "";
                      if (n <= rating) {
                        if (rating >= 4) {
                          starColor = "text-success"; // Green for 4-5 stars
                        } else if (rating === 3) {
                          starColor = "text-warning"; // Yellow for 3 stars
                        } else {
                          starColor = "text-danger"; // Red for 1-2 stars
                        }
                      }

                      return (
                        <i
                          key={n}
                          className={`bi ${n <= rating ? `bi-star-fill ${starColor}` : "bi-star text-secondary"}`}
                          style={{
                            cursor: isEditMode ? "pointer" : "default",
                            fontSize: "1.05rem"
                          }}
                          onClick={() => {
                            if (isEditMode) {
                              setRating(n);
                              setDirty(true);
                            }
                          }}
                          title={`${rating || 0}/5`}
                        />
                      );
                    })}
                  </div>

                </div>

                {/* Action Buttons */}
                <div className="d-flex align-items-center gap-2">
                  {localWorker.mobileNo && (
                    <>
                      <button
                        type="button"
                        className="btn btn-success btn-sm d-flex align-items-center gap-2 action-btn mb-0"
                        onClick={handleCall}
                        title="Call Worker"
                      >
                        <i className="bi bi-telephone-fill"></i>
                        Call
                      </button>
                      <button
                        type="button"
                        className="btn btn-success btn-sm d-flex align-items-center gap-2 action-btn mb-0"
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
                        className={`nav-link text-nowrap dark-tab ${activeTab === "basic" ? "active" : ""
                          }`}
                        onClick={() => setActiveTab("basic")}
                      >
                        <i className="bi bi-person-vcard me-2 "></i>
                        Basic Info
                      </button>
                    </li>

                    <li className="nav-item">
                      <button
                        className={`nav-link dark-tab ${activeTab === "skills" ? "active" : ""
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
                        className={`nav-link dark-tab ${activeTab === "address" ? "active" : ""
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
                        className={`nav-link dark-tab ${activeTab === "biodata" ? "active" : ""
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
                                    Collage / School
                                  </label>
                                  <input
                                    type="text"
                                    name="collegeName"
                                    value={localWorker.collegeName || ""}
                                    onChange={handleChange}
                                    className="form-control dark-input"
                                    placeholder="Enter CollegeName"
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
                                <div className="col-md-4">
                                  <label className="form-label fw-semibold text-secondary">
                                    Email
                                  </label>
                                  <input
                                    type="text"
                                    name="location"
                                    value={localWorker.email || ""}
                                    onChange={handleChange}
                                    className="form-control dark-input"
                                    placeholder="Enter Email"
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
                                {renderInfoCard(
                                  "Collage",
                                  localWorker.collegeName
                                )}
                                {renderInfoCard("Age", localWorker.age)}
                                {renderInfoCard(
                                  "Location",
                                  localWorker.location
                                )}
                                {renderInfoCard(
                                  "Email",
                                  localWorker.email
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
                              COMMENTS & ACTIVITY
                            </h6>
                          </div>
                          <div className="card-body p-3">
                            {/* Initial Form Comment */}
                            {localWorker.formComment && (
                              <div className="comment-initial mb-2">
                                <div className="comment-header d-flex justify-content-between align-items-center mb-2">
                                  <small className="text-primary fw-bold">
                                    Initial Comment
                                  </small>
                                </div>
                                <p className="mb-0 text-white opacity-75">
                                  {localWorker.formComment}
                                </p>

                              </div>
                            )}

                            {/* Comments List */}
                            <div
                              className="comments-list-compact"
                              style={{ maxHeight: "200px", overflowY: "auto" }}
                            >
                              {(() => {
                                // 1) If comment is a single string on the worker, show just that
                                const singleComment =
                                  typeof localWorker?.comment === "string"
                                    ? localWorker.comment.trim()
                                    : "";

                                if (singleComment) {
                                  return <p className="mb-0 text-white opacity-50">{singleComment}</p>;
                                }

                                // 2) Else, attempt to render a list (from state "comments" or object at localWorker.comment)
                                const listFromState = Array.isArray(comments) ? comments : [];
                                const listFromObject =
                                  localWorker?.comment && typeof localWorker.comment === "object"
                                    ? Object.values(localWorker.comment).filter(Boolean)
                                    : [];

                                const allComments =
                                  listFromState.length > 0 ? listFromState : listFromObject;

                                if (allComments.length === 0) {
                                  return (
                                    <div className="empty-state-compact text-center py-3">
                                      <i className="bi bi-chat-left-text text-muted"></i>
                                      <p className="mt-2 mb-0 text-muted">No comments yet</p>
                                    </div>
                                  );
                                }

                                return allComments
                                  .slice()
                                  .sort((a, b) => (b?.timestamp || 0) - (a?.timestamp || 0))
                                  .map((c, i) => {
                                    const authorName =
                                      c?.authorName || c?.user || c?.author || localWorker?.createdByName || "User";
                                    const avatarUrl = c?.authorPhoto || localWorker?.photoURL || "";
                                    const when = c?.timestamp || c?.date
                                      ? new Date(c.timestamp || c.date).toLocaleString("en-GB", { hour12: true })
                                      : "Recent";
                                    const text = (c?.text || c?.comment || "").trim();

                                    return (
                                      <div
                                        key={c?.id || c?.timestamp || c?.date || i}
                                        className="comment-row d-flex gap-3 p-3 rounded mb-2 comment-initial"
                                      >

                                        <div className="flex-grow-1">
                                          <div className="text-white-80 mb-1">
                                            {text || (
                                              <span className="text-muted-400 fst-italic">— no content —</span>
                                            )}
                                          </div>
                                          <div className="d-flex justify-content-between align-items-center">
                                            <strong className="text-white-50 small-text">By {authorName}</strong>
                                            <span className="text-white-50 small-text">{when}</span>
                                          </div>

                                        </div>
                                      </div>
                                    );
                                  });
                              })()}
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
                      {/* Mother Tongue (simple select) */}
                      <div className="col-12">
                        <div className="dark-card">
                          <div className="card-header dark-card-header">
                            <h6 className="mb-0 fw-bold d-flex align-items-center">
                              <i className="bi bi-megaphone me-2"></i>
                              Mother Tongue
                            </h6>
                          </div>
                          <div className="card-body p-3">
                            {isEditMode ? (
                              <select
                                name="motherTongue"
                                value={localWorker.motherTongue || ""}
                                onChange={(e) => {
                                  setLocalWorker(prev => ({ ...prev, motherTongue: e.target.value }));
                                  setDirty(true);
                                }}
                                className="form-select dark-input"
                              >
                                <option value="">Select Mother Tongue</option>
                                {MOTHER_TONGUE_OPTIONS.map(mt => (
                                  <option key={mt} value={mt}>{mt}</option>
                                ))}
                              </select>
                            ) : (
                              <div className="info-grid-compact">
                                {renderInfoCard("Mother Tongue", localWorker.motherTongue || "—")}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

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

                      {/* Nursing Tasks (shown if primary skill is Nursing or Nursing is in homeCareSkills) */}
                      {(
                        String(localWorker?.skills).toLowerCase() === "nursing" ||
                        (Array.isArray(localWorker?.homeCareSkills) &&
                          localWorker.homeCareSkills.some(s => String(s).toLowerCase() === "nursing"))
                      ) && (
                          <div className="glass-card p-3 mb-3">
                            <h6 className=" text-warning mb-3">NURSING TASKS</h6>
                            <div className="d-flex flex-wrap gap-2">
                              {[
                                "Vital Signs Monitoring", "BP Check", "Sugar Check (Glucometer)", "Medication Administration", "IV/IM Injection",
                                "Wound Dressing", "Catheter Care", "Ryle’s Tube / NG Feeding", "PEG Feeding", "Nebulization", "Suctioning",
                                "Oxygen Support", "Tracheostomy Care", "Bedsore Care", "Positioning & Mobility", "Bed Bath & Hygiene",
                                "Diaper Change", "Urine Bag Change", "Post-Operative Care",
                              ].map(task => {
                                const active = Array.isArray(localWorker.nursingWorks) && localWorker.nursingWorks.includes(task);
                                return (
                                  <button
                                    key={task}
                                    type="button"
                                    className={`btn btn-sm rounded-pill ${active ? "btn-info" : "btn-outline-info"}`}
                                    onClick={() => {
                                      if (!isEditMode) return; // keep your edit guard if you have one
                                      setLocalWorker(prev => {
                                        const curr = Array.isArray(prev.nursingWorks) ? prev.nursingWorks : [];
                                        const next = active ? curr.filter(x => x !== task) : [...curr, task];
                                        return { ...prev, nursingWorks: next };
                                      });
                                    }}
                                    aria-pressed={active}
                                    disabled={!isEditMode}
                                  >
                                    {task}
                                  </button>
                                );
                              })}
                            </div>
                            {/* If you want to enforce at least one when Primary is Nursing (UI hint) */}
                            {String(localWorker?.skills).toLowerCase() === "nursing" &&
                              (!localWorker.nursingWorks || localWorker.nursingWorks.length === 0) && (
                                <div className="text-danger small mt-2">Select at least one nursing task.</div>
                              )}
                          </div>
                        )}


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
                                        className={`btn btn-sm rounded-pill ${active
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
                                                    className={`btn btn-sm rounded-pill ${active
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
                      <div className="col-12 mb-3">
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

                      {/* Left: Photo + upload (optional) */}
                      <div className="col-md-4 m-auto">
                        <div className="glass-card p-3 text-center">
                          <div className="mb-2">
                            {/* Show preview first, then URL, then fallback */}
                            {localWorker.employeePhotoPreview ? (
                              <img
                                src={localWorker.employeePhotoPreview}
                                alt="photo preview"
                                className="rounded"
                                style={{ width: "100%", maxHeight: 260, objectFit: "cover" }}
                              />
                            ) : localWorker.employeePhotoUrl ? (
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

                          {/* Upload photo */}
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

                          {/* ID Proof */}
                          <div className="mt-3 text-start">
                            <label className="form-label text-secondary mb-1"><strong>ID Proof</strong></label>
                            <div className="d-flex align-items-center gap-2 mt-2 justify-content-around">
                              <button type="button" className="btn btn-outline-primary btn-sm" onClick={handleViewId}>
                                <i className="bi bi-eye me-1" /> View
                              </button>
                              <button type="button" className="btn btn-outline-success btn-sm" onClick={handleDownloadId}>
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

                    </div>
                  </div>
                )}

                {/* Biodata Tab */}

                {activeTab === "biodata" && (
                  <div className="modal-card">
                    <div
                      className="modal-card-header d-flex align-items-center justify-content-end"

                    >

                      <div className="d-flex align-items-center gap-2">
                        <button className="btn btn-sm btn-outline-warning" onClick={handleDownloadBiodata}>
                          <i className="bi bi-download me-1" /> Download
                        </button>
                        <button className="btn btn-sm btn-outline-info" onClick={handleShareBiodata}>
                          <i className="bi bi-share me-1" /> Share
                        </button>
                      </div>
                    </div>

                    <div className="modal-card-body">
                      <div className="row g-3">
                        <div className="col-md-12">
                          <div className="neo-card p-0 overflow-hidden">
                            <iframe
                              ref={iframeRef}
                              title="Biodata"
                              style={{ width: "100%", height: "520px", border: "0", background: "#fff" }}
                            />
                          </div>
                        </div>
                      </div>
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
