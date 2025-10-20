// src/components/workerCalles/WorkerCalleDisplay.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import firebaseDB from "../../firebase";
import WorkerCallModal from "./WorkerCallModal";
import viewIcon from "../../assets/view.svg";
import editIcon from "../../assets/eidt.svg";
import deleteIcon from "../../assets/delete.svg";
import * as XLSX from "xlsx";
import { useAuth } from "../../context/AuthContext";

/* =============================
   Date & formatting helpers
   ============================= */
const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
const parseDate = (v) => {
  if (!v) return null;
  if (typeof v === "object" && v && "seconds" in v)
    return new Date(v.seconds * 1000);
  if (v instanceof Date && !isNaN(v.getTime())) return v;
  if (typeof v === "number") {
    const n = new Date(v);
    return isNaN(n.getTime()) ? null : n;
  }
  if (typeof v === "string") {
    const s = v.trim();
    if (!s) return null;
    const iso = new Date(s);
    if (!isNaN(iso.getTime())) return iso;
    const parts = s.split(/[\/-]/);
    if (parts.length === 3) {
      let y, m, d;
      if (parts[0].length === 4) {
        y = +parts[0];
        m = +parts[1] - 1;
        d = +parts[2];
      } else if (+parts[0] > 12) {
        d = +parts[0];
        m = +parts[1] - 1;
        y = +parts[2];
      } else {
        m = +parts[0] - 1;
        d = +parts[1];
        y = +parts[2];
      }
      const dt = new Date(y, m, d);
      if (!isNaN(dt.getTime())) return dt;
    }
  }
  const dt = new Date(v);
  return isNaN(dt.getTime()) ? null : dt;
};
const isValidDate = (d) => d instanceof Date && !isNaN(d.getTime());
const formatDDMMYYYY = (v) => {
  const d = parseDate(v);
  return isValidDate(d) ? d.toLocaleDateString("en-GB") : "—";
};
const daysUntil = (v) => {
  const d = parseDate(v);
  if (!isValidDate(d)) return Number.POSITIVE_INFINITY;
  return Math.ceil(
    (startOfDay(d) - startOfDay(new Date())) / (1000 * 60 * 60 * 24)
  );
};
const formatTime = (dateLike, mode = "12hr") => {
  const d = parseDate(dateLike);
  if (!isValidDate(d)) return "";
  const opts =
    mode === "24hr"
      ? { hour12: false, hour: "2-digit", minute: "2-digit" }
      : { hour12: true, hour: "numeric", minute: "2-digit" };
  return d.toLocaleTimeString([], opts);
};
const ordinal = (n) => {
  const s = ["th", "st", "nd", "rd"],
    v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};
const formatPrettyDate = (v) => {
  const d = parseDate(v);
  if (!isValidDate(d)) return "—";
  const day = d.getDate();
  const month = d.toLocaleString("en-GB", { month: "short" });
  const year = String(d.getFullYear()).slice(-2);
  return `${ordinal(day)} ${month} ${year}`;
};

const hasTimeData = (w) => {
  const baseDate = getBaseDate(w);
  const d = parseDate(baseDate);
  if (!isValidDate(d)) return false;

  // Check if time component exists and is not midnight
  const hasNonMidnightTime = !(
    d.getHours() === 0 &&
    d.getMinutes() === 0 &&
    d.getSeconds() === 0
  );

  // Also check if we have time data in the original string
  const dateString = String(baseDate || "");
  const hasTimeInString =
    dateString.includes("T") ||
    dateString.includes(":") ||
    dateString.includes("AM") ||
    dateString.includes("PM");

  return hasNonMidnightTime || hasTimeInString;
};

/* =============================
   ID helpers (stable + 2-digit WC-01)
   ============================= */
const twoDigit = (n) => String(Math.max(1, Number(n) || 1)).padStart(2, "0");
const normalizeIdText = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/[\s_-]/g, "");
const extractCallNumber = (val) => {
  if (!val) return null;
  const m =
    /wc[\s_-]*0*?(\d+)/i.exec(String(val)) || /^0*?(\d+)$/.exec(String(val));
  return m ? Number(m[1]) : null;
};
const buildCallId = (n) => `WC-${twoDigit(n)}`;
const getDisplayCallId = (w, stableIndexMap) => {
  const n = extractCallNumber(w?.callId);
  if (n) return buildCallId(n);
  const idx = stableIndexMap[w?.id] ?? 0;
  return buildCallId(idx + 1);
};

/* =============================
   "Added By" resolver (global Users map)
   ============================= */
const resolveAddedBy = (w, usersMap = {}) => {
  if (!w) return "";
  const direct = [
    w?.addedBy,
    w?.createdBy,
    w?.userName,
    w?.username,
    w?.createdByName,
    w?.addedByName,
  ];
  for (const d of direct) {
    const clean = String(d || "")
      .trim()
      .replace(/@.*/, "");
    if (clean) return clean;
  }
  const ids = [
    w?.createdById,
    w?.addedById,
    w?.createdByUid,
    w?.addedByUid,
    w?.uid,
    w?.userId,
  ];
  for (const id of ids) {
    if (id && usersMap[id]) {
      const u = usersMap[id];
      const cands = [u.name, u.displayName, u.username, u.email];
      for (const c of cands) {
        const clean = String(c || "")
          .trim()
          .replace(/@.*/, "");
        if (clean) return clean;
      }
    }
  }
  if (w?.user && typeof w.user === "object") {
    const cands = [
      w.user.name,
      w.user.displayName,
      w.user.userName,
      w.user.email,
    ];
    for (const c of cands) {
      const clean = String(c || "")
        .trim()
        .replace(/@.*/, "");
      if (clean) return clean;
    }
  }
  return "";
};

/* =============================
   Normalizers & misc helpers
   ============================= */
const normalizeArray = (val) =>
  Array.isArray(val)
    ? val.filter(Boolean)
    : typeof val === "string"
    ? val
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
const isWorkerShape = (v) =>
  !!(
    v &&
    typeof v === "object" &&
    (v.name ||
      v.mobileNo ||
      v.location ||
      v.gender ||
      v.skills ||
      v.conversationLevel ||
      v.callThrough ||
      v.through ||
      v.source)
  );
function collectWorkersFromSnapshot(rootSnap) {
  const rows = [];
  if (!rootSnap || !rootSnap.exists()) return rows;
  const walk = (snap, depth = 1) => {
    if (!snap) return;
    const val = snap.val();
    if (isWorkerShape(val)) {
      rows.push({ id: snap.key, ...val });
      return;
    }
    if (typeof val === "object" && snap.hasChildren() && depth < 3) {
      snap.forEach((ch) => walk(ch, depth + 1));
    }
  };
  walk(rootSnap, 1);
  return rows;
}
const calculateAge = (dob, ageFallback) => {
  if (ageFallback != null && !isNaN(ageFallback)) return Number(ageFallback);
  const d = parseDate(dob);
  if (!isValidDate(d)) return null;
  const t = new Date();
  let a = t.getFullYear() - d.getFullYear();
  const m = t.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && t.getDate() < d.getDate())) a--;
  return a;
};
const calculateExperience = (w) => {
  const fields = [
    w?.experience,
    w?.yearsOfExperience,
    w?.experienceYears,
    w?.expYears,
    w?.totalExperience,
    w?.workExperience,
    w?.years,
  ];
  for (const f of fields) {
    if (f != null) {
      const m = String(f).match(/(\d+(?:\.\d+)?)/);
      if (m) return parseFloat(m[1]);
    }
  }
  return null;
};
const normalizeSource = (raw) => {
  const s = String(raw || "")
    .trim()
    .toLowerCase();
  const map = new Map([
    ["apna", "Apana"],
    ["apana", "Apana"],
    ["workerindian", "WorkerIndian"],
    ["reference", "Reference"],
    ["poster", "Poster"],
    ["agent", "Agent"],
    ["facebook", "Facebook"],
    ["linkedin", "LinkedIn"],
    ["linked in", "LinkedIn"],
    ["instagram", "Instagram"],
    ["youtube", "YouTube"],
    ["you tube", "YouTube"],
    ["website", "Website"],
    ["just dial", "Just Dial"],
    ["justdial", "Just Dial"],
    ["justdail", "Just Dial"],
    ["news paper", "News Paper"],
    ["newspaper", "News Paper"],
  ]);
  if (map.has(s)) return map.get(s);
  if (s.includes("apna") || s.includes("apana")) return "Apana";
  if (s.includes("worker")) return "WorkerIndian";
  if (s.includes("refer")) return "Reference";
  if (s.includes("poster")) return "Poster";
  if (s.includes("agent")) return "Agent";
  if (s.includes("facebook")) return "Facebook";
  if (s.includes("link") && s.includes("in")) return "LinkedIn";
  if (s.includes("insta")) return "Instagram";
  if (s.includes("you") && s.includes("tube")) return "YouTube";
  if (s.includes("site") || s.includes("web")) return "Website";
  if (
    s.replace(/\s+/g, "") === "justdial" ||
    s.replace(/\s+/g, "") === "justdail"
  )
    return "Just Dial";
  if (s.includes("news") && s.includes("paper")) return "News Paper";
  return "Other";
};
// Update these functions to handle null/undefined better:
const getWorkerSkills = (w) => {
  const homeCareSkills = normalizeArray(w?.homeCareSkills);
  const primarySkills = normalizeArray(w?.primarySkills || w?.skills);
  const otherSkills = normalizeArray(w?.otherSkills);
  const additionalSkills = normalizeArray(w?.additionalSkills);

  return [
    ...homeCareSkills,
    ...primarySkills,
    ...otherSkills,
    ...additionalSkills,
  ]
    .map((s) => String(s).toLowerCase().trim())
    .filter((s) => s);
};

const getWorkerLanguages = (w) => {
  const v = w?.languages ?? w?.language ?? w?.knownLanguages ?? w?.speaks ?? "";
  if (!v) return [];
  return normalizeArray(v).map((s) => String(s).toLowerCase().trim());
};

const getWorkerRoles = (w) => {
  const v =
    w?.jobRole ??
    w?.role ??
    w?.roles ??
    w?.profession ??
    w?.designation ??
    w?.workType ??
    w?.otherSkills ??
    w?.otherskills ??
    w?.other_skills ??
    w?.["other skils"] ??
    "";
  if (!v) return [];
  return normalizeArray(v).map((s) => String(s).toLowerCase().trim());
};
const getBaseDate = (w) => {
  // First check for explicit timestamp fields
  if (w?.timestamp) return w.timestamp;
  if (w?.createdAt) return w.createdAt;
  if (w?.created_time) return w.created_time;
  if (w?.created_time_ms) return new Date(w.created_time_ms);

  // Fallback to existing fields
  return w?.callDate ?? w?.date ?? w?.createdDate ?? w?.createdOn ?? null;
};

/* =============================
   Permissions (export gate)
   ============================= */
/* =============================
   Enhanced Permissions System
   ============================= */
const derivePermissions = (authUser, explicit) => {
  // Start with explicit permissions if provided
  if (explicit && typeof explicit === "object") {
    return {
      canView: explicit.view ?? true,
      canEdit: explicit.edit ?? false,
      canDelete: explicit.delete ?? false,
      canExport: explicit.export ?? false,
      canManageUsers: explicit.manageUsers ?? false,
      canViewAnalytics: explicit.viewAnalytics ?? false,
      canBulkOperations: explicit.bulkOperations ?? false,
    };
  }

  // Fallback to role-based permissions
  const role = String(authUser?.role || "viewer").toLowerCase();

  const basePerms = {
    canView: true,
    canEdit: ["admin", "editor", "manager", "supervisor"].includes(role),
    canDelete: ["admin", "manager"].includes(role),
    canExport: ["admin", "manager", "supervisor"].includes(role),
    canManageUsers: role === "admin",
    canViewAnalytics: ["admin", "manager", "supervisor"].includes(role),
    canBulkOperations: ["admin", "manager"].includes(role),
  };

  // Override with user-specific permissions if available
  if (authUser?.permissions && typeof authUser.permissions === "object") {
    const userPerms =
      authUser.permissions["Worker Call Data"] ||
      authUser.permissions["WorkerCallData"] ||
      authUser.permissions;
    return {
      canView: userPerms.view ?? basePerms.canView,
      canEdit: userPerms.edit ?? basePerms.canEdit,
      canDelete: userPerms.delete ?? basePerms.canDelete,
      canExport: userPerms.export ?? basePerms.canExport,
      canManageUsers: userPerms.manageUsers ?? basePerms.canManageUsers,
      canViewAnalytics: userPerms.viewAnalytics ?? basePerms.canViewAnalytics,
      canBulkOperations:
        userPerms.bulkOperations ?? basePerms.canBulkOperations,
    };
  }

  return basePerms;
};
/* =============================
   Component
   ============================= */
export default function WorkerCalleDisplay({ permissions: permissionsProp }) {
  const { user: authUser } = useAuth();
  const permissions = derivePermissions(authUser, permissionsProp);

  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stableIndexMap, setStableIndexMap] = useState({});
  const initializedOrder = useRef(false);

  // Users map for "By {user}"
  const [usersMap, setUsersMap] = useState({});
  useEffect(() => {
    const ref = firebaseDB.child("Users");
    const cb = ref.on("value", (snap) => setUsersMap(snap.val() || {}));
    return () => ref.off("value", cb);
  }, []);

  // Modal + actions
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeleteReason, setShowDeleteReason] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSkills, setSelectedSkills] = useState([]); // <-- fixed
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [selectedLanguages, setSelectedLanguages] = useState([]);
  const [selectedGender, setSelectedGender] = useState([]);
  const [reminderFilter, setReminderFilter] = useState("");
  const [selectedSource, setSelectedSource] = useState("All");
  const [skillMode, setSkillMode] = useState("single");
  const [timeFormat, setTimeFormat] = useState("all");

  const [ageRange, setAgeRange] = useState({ min: "", max: "" });
  const [experienceRange, setExperienceRange] = useState({ min: "", max: "" });

  const [showJobRoles, setShowJobRoles] = useState(false);

  // Sorting
  const [sortBy, setSortBy] = useState("id");
  const [sortDir, setSortDir] = useState("desc");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Options
  const callThroughOptions = [
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
    "Unknown",
  ];
  const skillOptions = [
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
  ];
  const roleOptions = [
    "Computer Operating",
    "Tele Calling",
    "Driving",
    "Supervisor",
    "Manager",
    "Attender",
    "Security",
    "Carpenter",
    "Painter",
    "Plumber",
    "Electrician",
    "Mason (Home maker)",
    "Tailor",
    "Labour",
    "Farmer",
    "Delivery Boy",
    "House Keeping",
    "Cook",
    "Nanny",
    "Elderly Care",
    "Office Boy",
    "Peon",
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

  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const [activeYear, setActiveYear] = useState(new Date().getFullYear());
  const [activeMonth, setActiveMonth] = useState(new Date().getMonth());

  // New state for tabs and user selection
  const [activeTab, setActiveTab] = useState("callData");
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedRows, setSelectedRows] = useState(new Set());

  /* --- FETCH --- */
  useEffect(() => {
    const ref = firebaseDB.child("WorkerCallData");
    const cb = ref.on("value", (snap) => {
      try {
        const list = collectWorkersFromSnapshot(snap);
        const enriched = list.map((w) => ({ ...w, date: getBaseDate(w) }));
        setWorkers(enriched);
        // Stable initial order map once
        if (!initializedOrder.current) {
          const sortedByCreated = [...enriched].sort((a, b) => {
            const da = parseDate(getBaseDate(a)),
              db = parseDate(getBaseDate(b));
            const av = isValidDate(da) ? da.getTime() : 0,
              bv = isValidDate(db) ? db.getTime() : 0;
            if (av !== bv) return av - bv;
            return String(a.id).localeCompare(String(b.id));
          });
          const map = {};
          sortedByCreated.forEach((row, idx) => (map[row.id] = idx));
          setStableIndexMap(map);
          initializedOrder.current = true;
        }
        setLoading(false);
      } catch (e) {
        setError(e.message || "Failed to load data");
        setLoading(false);
      }
    });
    return () => ref.off("value", cb);
  }, []);

  /* Reminder badge counts */
  const badgeCounts = useMemo(() => {
    const c = { overdue: 0, today: 0, tomorrow: 0, upcoming: 0 };
    workers.forEach((w) => {
      const r = w?.callReminderDate || w?.reminderDate;
      const du = daysUntil(r);
      if (!isFinite(du)) return;
      if (du < 0) c.overdue++;
      else if (du === 0) c.today++;
      else if (du === 1) c.tomorrow++;
      else c.upcoming++;
    });
    return c;
  }, [workers]);

  /* Filtering (case-insensitive + ID-aware) */
  const filtered = useMemo(() => {
    const raw = searchTerm.trim().toLowerCase();
    const idTerm = normalizeIdText(raw);

    return workers.filter((w) => {
      // Search filter
      if (searchTerm) {
        const matchesSearch =
          String(w?.name || "")
            .toLowerCase()
            .includes(raw) ||
          String(w?.location || "")
            .toLowerCase()
            .includes(raw) ||
          String(w?.mobileNo || "").includes(raw) ||
          normalizeIdText(w?.callId).includes(idTerm);

        if (!matchesSearch) return false;
      }

      // Gender filter
      if (selectedGender.length > 0) {
        const g = String(w?.gender ?? "").toLowerCase();
        if (!selectedGender.map((x) => String(x).toLowerCase()).includes(g))
          return false;
      }

      // Skills filter
      if (selectedSkills.length > 0) {
        const workerSkills = getWorkerSkills(w).map((s) => s.toLowerCase());
        const wantSkills = selectedSkills.map((s) => s.toLowerCase());

        if (skillMode === "multi") {
          // ALL selected skills must be present
          if (!wantSkills.every((s) => workerSkills.includes(s))) return false;
        } else {
          // ANY selected skill must be present (single mode)
          if (!wantSkills.some((s) => workerSkills.includes(s))) return false;
        }
      }

      // Roles filter
      if (selectedRoles.length > 0) {
        const workerRoles = getWorkerRoles(w).map((r) => r.toLowerCase());
        const wantRoles = selectedRoles.map((r) => r.toLowerCase());

        if (skillMode === "multi") {
          if (!wantRoles.every((r) => workerRoles.includes(r))) return false;
        } else {
          if (!wantRoles.some((r) => workerRoles.includes(r))) return false;
        }
      }

      // Languages filter
      if (selectedLanguages.length > 0) {
        const workerLangs = getWorkerLanguages(w).map((l) => l.toLowerCase());
        const wantLangs = selectedLanguages.map((l) => l.toLowerCase());

        if (skillMode === "multi") {
          if (!wantLangs.every((l) => workerLangs.includes(l))) return false;
        } else {
          if (!wantLangs.some((l) => workerLangs.includes(l))) return false;
        }
      }

      // Reminder filter
      if (reminderFilter) {
        const reminder = w?.callReminderDate || w?.reminderDate;
        const du = daysUntil(reminder);

        switch (reminderFilter) {
          case "overdue":
            if (!isFinite(du) || du >= 0) return false;
            break;
          case "today":
            if (du !== 0) return false;
            break;
          case "tomorrow":
            if (du !== 1) return false;
            break;
          case "upcoming":
            if (!isFinite(du) || du <= 1) return false;
            break;
          default:
            break;
        }
      }

      // Source filter
      if (selectedSource !== "All") {
        const src = normalizeSource(
          w?.callThrough || w?.through || w?.source || ""
        );
        if (src !== selectedSource) return false;
      }

      // Time Format filter
      if (timeFormat !== "all") {
        const workerHours = String(w?.workingHours || "").trim();
        if (workerHours !== timeFormat) return false;
      }

      // Age range filter
      if (ageRange.min || ageRange.max) {
        const age = calculateAge(
          w?.dateOfBirth || w?.dob || w?.birthDate,
          w?.age
        );
        if (age !== null) {
          const minAge = ageRange.min ? parseInt(ageRange.min) : 0;
          const maxAge = ageRange.max ? parseInt(ageRange.max) : 999;
          if (age < minAge || age > maxAge) return false;
        } else {
          // If age cannot be calculated and range is specified, exclude
          if (ageRange.min || ageRange.max) return false;
        }
      }

      // Experience range filter
      if (experienceRange.min || experienceRange.max) {
        const exp = calculateExperience(w);
        if (exp !== null) {
          const minExp = experienceRange.min
            ? parseFloat(experienceRange.min)
            : 0;
          const maxExp = experienceRange.max
            ? parseFloat(experienceRange.max)
            : 999;
          if (exp < minExp || exp > maxExp) return false;
        } else {
          // If experience cannot be calculated and range is specified, exclude
          if (experienceRange.min || experienceRange.max) return false;
        }
      }

      return true;
    });
  }, [
    workers,
    searchTerm,
    selectedGender,
    selectedSkills,
    selectedRoles,
    selectedLanguages,
    skillMode,
    reminderFilter,
    selectedSource,
    timeFormat,
    ageRange,
    experienceRange,
  ]);

  /* Sorting — add all requested fields */
  const sorted = useMemo(() => {
    const arr = [...filtered];
    const dir = sortDir === "asc" ? 1 : -1;
    arr.sort((a, b) => {
      switch (sortBy) {
        case "id": {
          const na =
            extractCallNumber(a?.callId) ?? (stableIndexMap[a?.id] ?? 0) + 1;
          const nb =
            extractCallNumber(b?.callId) ?? (stableIndexMap[b?.id] ?? 0) + 1;
          return dir * (na - nb);
        }
        case "date": {
          const da = parseDate(getBaseDate(a)),
            db = parseDate(getBaseDate(b));
          const av = isValidDate(da) ? da.getTime() : -Infinity,
            bv = isValidDate(db) ? db.getTime() : -Infinity;
          return dir * (av - bv);
        }
        case "name":
          return (
            dir *
            String(a?.name ?? "")
              .toLowerCase()
              .localeCompare(String(b?.name ?? "").toLowerCase())
          );
        case "gender":
          return (
            dir *
            String(a?.gender ?? "")
              .toLowerCase()
              .localeCompare(String(b?.gender ?? "").toLowerCase())
          );
        case "age": {
          const av =
            calculateAge(a?.dateOfBirth || a?.dob || a?.birthDate, a?.age) ??
            -Infinity;
          const bv =
            calculateAge(b?.dateOfBirth || b?.dob || b?.birthDate, b?.age) ??
            -Infinity;
          return dir * (av - bv);
        }
        case "experience": {
          const av = calculateExperience(a) ?? -Infinity;
          const bv = calculateExperience(b) ?? -Infinity;
          return dir * (av - bv);
        }
        case "reminder": {
          const da = parseDate(a?.callReminderDate || a?.reminderDate);
          const db = parseDate(b?.callReminderDate || b?.reminderDate);
          const av = isValidDate(da) ? da.getTime() : Number.POSITIVE_INFINITY;
          const bv = isValidDate(db) ? db.getTime() : Number.POSITIVE_INFINITY;
          return dir * (av - bv);
        }
        case "skills": {
          const av = (getWorkerSkills(a)[0] || "").toString();
          const bv = (getWorkerSkills(b)[0] || "").toString();
          return dir * av.localeCompare(bv);
        }
        case "mobile":
          return (
            dir *
            String(a?.mobileNo ?? "").localeCompare(String(b?.mobileNo ?? ""))
          );
        case "talking": {
          const ta = (
            a?.communications ??
            a?.communication ??
            a?.conversation ??
            a?.conversationLevel ??
            ""
          ).toString();
          const tb = (
            b?.communications ??
            b?.communication ??
            b?.conversation ??
            b?.conversationLevel ??
            ""
          ).toString();
          return dir * ta.localeCompare(tb);
        }
        default:
          return 0;
      }
    });
    return arr;
  }, [filtered, sortBy, sortDir, stableIndexMap]);

  // Years list
  const years = useMemo(() => {
    const ys = new Set();
    workers.forEach((w) => {
      const d = parseDate(getBaseDate(w));
      if (isValidDate(d)) ys.add(d.getFullYear());
    });
    const out = Array.from(ys).sort((a, b) => a - b);
    return out.length ? out : [new Date().getFullYear()];
  }, [workers]);
  useEffect(() => {
    if (!years.includes(activeYear)) setActiveYear(years[years.length - 1]);
  }, [years, activeYear]);

  // Current user id & name
  const currentUserId = authUser?.dbId || authUser?.uid || authUser?.id || null;
  const currentUserName =
    (currentUserId &&
      (usersMap[currentUserId]?.name ||
        usersMap[currentUserId]?.displayName)) ||
    authUser?.displayName ||
    (authUser?.email ? authUser.email.replace(/@.*/, "") : "") ||
    "User";

  /* Monthly Day Grid (per user) */
  /* Monthly Day Grid (per user) - One record counts once per day */
  // Replace the entire dayGrid useMemo with this:
  /* Monthly Day Grid - Fixed to count each record only once */
  const dayGrid = useMemo(() => {
    const grid = {};
    if (!currentUserId) return grid;

    const bump = (m, d, kind) => {
      if (!grid[m]) grid[m] = {};
      if (!grid[m][d]) grid[m][d] = { new: 0, modified: 0, total: 0 };
      grid[m][d][kind] += 1;
      grid[m][d].total += 1;
    };

    // Track records to ensure each is only counted once
    const processedRecords = new Set();

    workers.forEach((w) => {
      // Apply source filter
      if (selectedSource && selectedSource !== "All") {
        const workerSource = normalizeSource(
          w?.callThrough || w?.through || w?.source || ""
        );
        if (workerSource !== selectedSource) return;
      }

      const createdBy =
        w?.createdById ||
        w?.addedById ||
        w?.createdByUid ||
        w?.addedByUid ||
        w?.uid ||
        w?.userId;
      const updatedBy = w?.updatedById || w?.updatedByUid;

      // Check creation
      const createdAt = parseDate(
        w?.createdAt || w?.created_date || w?.createdOn || w?.date
      );
      const isNewRecord =
        isValidDate(createdAt) &&
        createdAt.getFullYear() === activeYear &&
        createdBy === currentUserId;

      // Check modifications
      const updatedAt = parseDate(w?.updatedAt || w?.updated_on || w?.editedAt);
      const isModifiedRecord =
        isValidDate(updatedAt) &&
        updatedAt.getFullYear() === activeYear &&
        updatedBy === currentUserId;

      // Unique key for this record in this year/month/day
      const recordKey = `${w.id}-${activeYear}`;

      if (isNewRecord && !processedRecords.has(recordKey)) {
        // Count as NEW only if not processed yet
        processedRecords.add(recordKey);
        bump(createdAt.getMonth(), createdAt.getDate(), "new");
      } else if (isModifiedRecord && !processedRecords.has(recordKey)) {
        // Count as MODIFIED only if not processed yet and not a new record
        processedRecords.add(recordKey);
        bump(updatedAt.getMonth(), updatedAt.getDate(), "modified");
      }
    });

    return grid;
  }, [workers, activeYear, currentUserId, selectedSource]);

  // User-specific day grid for admin view
  const userDayGrid = useMemo(() => {
    const grid = {};
    if (!selectedUser) return grid;

    const bump = (m, d, kind) => {
      if (!grid[m]) grid[m] = {};
      if (!grid[m][d]) grid[m][d] = { new: 0, modified: 0, total: 0 };
      grid[m][d][kind] += 1;
      grid[m][d].total += 1;
    };

    const processedRecords = new Set();

    workers.forEach((w) => {
      // Apply source filter
      if (selectedSource && selectedSource !== "All") {
        const workerSource = normalizeSource(
          w?.callThrough || w?.through || w?.source || ""
        );
        if (workerSource !== selectedSource) return;
      }

      const createdBy =
        w?.createdById ||
        w?.addedById ||
        w?.createdByUid ||
        w?.addedByUid ||
        w?.uid ||
        w?.userId;
      const updatedBy = w?.updatedById || w?.updatedByUid;

      // Check creation
      const createdAt = parseDate(
        w?.createdAt || w?.created_date || w?.createdOn || w?.date
      );
      const isNewRecord =
        isValidDate(createdAt) &&
        createdAt.getFullYear() === activeYear &&
        createdBy === selectedUser;

      // Check modifications
      const updatedAt = parseDate(w?.updatedAt || w?.updated_on || w?.editedAt);
      const isModifiedRecord =
        isValidDate(updatedAt) &&
        updatedAt.getFullYear() === activeYear &&
        updatedBy === selectedUser;

      const recordKey = `${w.id}-${activeYear}`;

      if (isNewRecord && !processedRecords.has(recordKey)) {
        processedRecords.add(recordKey);
        bump(createdAt.getMonth(), createdAt.getDate(), "new");
      } else if (isModifiedRecord && !processedRecords.has(recordKey)) {
        processedRecords.add(recordKey);
        bump(updatedAt.getMonth(), updatedAt.getDate(), "modified");
      }
    });

    return grid;
  }, [workers, activeYear, selectedUser, selectedSource]);

  const classifyCount = (n) => {
    if (!n || n === 0) return { label: "No Calls", cls: "perf-none" };
    if (n <= 20) return { label: "Poor Performance", cls: "perf-poor" };
    if (n <= 40) return { label: "Average", cls: "perf-avg" };
    if (n <= 60) return { label: "Good", cls: "perf-good" };
    if (n <= 80) return { label: "Very Good", cls: "perf-vgood" };
    if (n <= 90) return { label: "Excellent", cls: "perf-exc" };
    return { label: "Marvelous", cls: "perf-marv" };
  };

  const debugMultiSkillFilter = (w, wantSkills, haveSkills) => {
    console.log("Multi-skill debug:", {
      worker: w.name,
      wantedSkills: wantSkills,
      hasSkills: haveSkills,
      allWantedPresent: wantSkills.every((s) => haveSkills.includes(s)),
      skillMode: skillMode,
    });
  };

  // Add debug for language filtering
  const debugLanguageFilter = (w, wantLangs, haveLangs) => {
    console.log("Language debug:", {
      worker: w.name,
      wantedLangs: wantLangs,
      hasLangs: haveLangs,
      match:
        skillMode === "single"
          ? wantLangs.some((s) => haveLangs.includes(s))
          : wantLangs.every((s) => haveLangs.includes(s)),
    });
  };

  const graphDays = useMemo(() => {
    if (activeMonth == null) return [];
    const dim = new Date(activeYear, activeMonth + 1, 0).getDate();
    const arr = [];
    for (let d = 1; d <= dim; d++) {
      const cell = (dayGrid[activeMonth] && dayGrid[activeMonth][d]) || {
        total: 0,
      };
      const total = Math.min(100, cell.total || 0);
      arr.push({ day: d, total, ...classifyCount(total) });
    }
    return arr;
  }, [dayGrid, activeMonth, activeYear]);

  // User-specific graph days for admin view
  const userGraphDays = useMemo(() => {
    if (activeMonth == null) return [];
    const dim = new Date(activeYear, activeMonth + 1, 0).getDate();
    const arr = [];
    for (let d = 1; d <= dim; d++) {
      const cell = (userDayGrid[activeMonth] &&
        userDayGrid[activeMonth][d]) || { total: 0 };
      const total = Math.min(100, cell.total || 0);
      arr.push({ day: d, total, ...classifyCount(total) });
    }
    return arr;
  }, [userDayGrid, activeMonth, activeYear]);

  const pieAgg = useMemo(() => {
    if (activeMonth == null)
      return { none: 0, poor: 0, avg: 0, good: 0, vgood: 0, exc: 0, marv: 0 };
    const dim = new Date(activeYear, activeMonth + 1, 0).getDate();
    const agg = {
      none: 0,
      poor: 0,
      avg: 0,
      good: 0,
      vgood: 0,
      exc: 0,
      marv: 0,
    };
    for (let d = 1; d <= dim; d++) {
      const total =
        (dayGrid[activeMonth] && dayGrid[activeMonth][d]?.total) || 0;
      const { cls } = classifyCount(total);
      if (cls === "perf-none") agg.none++;
      else if (cls === "perf-poor") agg.poor++;
      else if (cls === "perf-avg") agg.avg++;
      else if (cls === "perf-good") agg.good++;
      else if (cls === "perf-vgood") agg.vgood++;
      else if (cls === "perf-exc") agg.exc++;
      else if (cls === "perf-marv") agg.marv++;
    }
    return agg;
  }, [dayGrid, activeMonth, activeYear]);

  // User-specific pie aggregation for admin view
  const userPieAgg = useMemo(() => {
    if (activeMonth == null)
      return { none: 0, poor: 0, avg: 0, good: 0, vgood: 0, exc: 0, marv: 0 };
    const dim = new Date(activeYear, activeMonth + 1, 0).getDate();
    const agg = {
      none: 0,
      poor: 0,
      avg: 0,
      good: 0,
      vgood: 0,
      exc: 0,
      marv: 0,
    };
    for (let d = 1; d <= dim; d++) {
      const total =
        (userDayGrid[activeMonth] && userDayGrid[activeMonth][d]?.total) || 0;
      const { cls } = classifyCount(total);
      if (cls === "perf-none") agg.none++;
      else if (cls === "perf-poor") agg.poor++;
      else if (cls === "perf-avg") agg.avg++;
      else if (cls === "perf-good") agg.good++;
      else if (cls === "perf-vgood") agg.vgood++;
      else if (cls === "perf-exc") agg.exc++;
      else if (cls === "perf-marv") agg.marv++;
    }
    return agg;
  }, [userDayGrid, activeMonth, activeYear]);

  // Helper functions for User Call Summary
  const getUserDayGrid = (userId) => {
    const grid = {};
    workers.forEach((w) => {
      const createdBy =
        w?.createdById ||
        w?.addedById ||
        w?.createdByUid ||
        w?.addedByUid ||
        w?.uid ||
        w?.userId;
      const updatedBy = w?.updatedById || w?.updatedByUid;

      const createdAt = parseDate(
        w?.createdAt || w?.created_date || w?.createdOn || w?.date
      );
      const isNewRecord =
        isValidDate(createdAt) &&
        createdAt.getFullYear() === activeYear &&
        createdBy === userId;

      const updatedAt = parseDate(w?.updatedAt || w?.updated_on || w?.editedAt);
      const isModifiedRecord =
        isValidDate(updatedAt) &&
        updatedAt.getFullYear() === activeYear &&
        updatedBy === userId;

      const bump = (m, d, kind) => {
        if (!grid[m]) grid[m] = {};
        if (!grid[m][d]) grid[m][d] = { new: 0, modified: 0, total: 0 };
        grid[m][d][kind] += 1;
        grid[m][d].total += 1;
      };

      if (isNewRecord) {
        bump(createdAt.getMonth(), createdAt.getDate(), "new");
      } else if (isModifiedRecord) {
        bump(updatedAt.getMonth(), updatedAt.getDate(), "modified");
      }
    });
    return grid;
  };

  const getTotalMonthlyCalls = () => {
    return Object.keys(usersMap).reduce(
      (total, userId) => total + getMonthlyUserTotal(userId),
      0
    );
  };

  const getCallCountClass = (count) => {
    if (count === 0) return "perf-none";
    if (count <= 10) return "perf-poor";
    if (count <= 25) return "perf-avg";
    if (count <= 50) return "perf-good";
    return "perf-vgood";
  };

  // Additional helper functions for User Call Summary
  const getMonthlyUserTotalAllUsers = (monthIndex) => {
    return Object.keys(usersMap).reduce((total, userId) => {
      const userGrid = getUserDayGrid(userId);
      const monthData = userGrid[monthIndex] || {};
      return (
        total +
        Object.values(monthData).reduce((sum, day) => sum + day.total, 0)
      );
    }, 0);
  };

  const getYearlyUserTotal = (userId) => {
    let total = 0;
    for (let month = 0; month < 12; month++) {
      const userGrid = getUserDayGrid(userId);
      const monthData = userGrid[month] || {};
      total += Object.values(monthData).reduce(
        (sum, day) => sum + day.total,
        0
      );
    }
    return total;
  };

  const getTotalYearlyCalls = () => {
    return Object.keys(usersMap).reduce(
      (total, userId) => total + getYearlyUserTotal(userId),
      0
    );
  };

  // Update getMonthlyUserTotal to accept month parameter
  const getMonthlyUserTotal = (userId, specificMonth = null) => {
    const month = specificMonth !== null ? specificMonth : activeMonth;
    if (month === null) return getYearlyUserTotal(userId);

    const userGrid = getUserDayGrid(userId);
    const monthData = userGrid[month] || {};
    return Object.values(monthData).reduce(
      (total, day) => total + day.total,
      0
    );
  };

  // Weekly calculation helper functions
  const getWeeklyUserTotal = (userId, week) => {
    if (activeMonth === null) return 0;

    const startDay = (week - 1) * 7 + 1;
    const endDay = Math.min(
      week * 7,
      new Date(activeYear, activeMonth + 1, 0).getDate()
    );

    let weeklyTotal = 0;
    const userGrid = getUserDayGrid(userId);

    for (let day = startDay; day <= endDay; day++) {
      const dayData = userGrid[activeMonth] && userGrid[activeMonth][day];
      weeklyTotal += dayData ? dayData.total : 0;
    }

    return weeklyTotal;
  };

  const getWeeklyTotal = (week) => {
    if (activeMonth === null) return 0;

    const startDay = (week - 1) * 7 + 1;
    const endDay = Math.min(
      week * 7,
      new Date(activeYear, activeMonth + 1, 0).getDate()
    );

    let weeklyTotal = 0;

    for (let day = startDay; day <= endDay; day++) {
      let dayTotal = 0;
      Object.keys(usersMap).forEach((userId) => {
        const userGrid = getUserDayGrid(userId);
        const dayData = userGrid[activeMonth] && userGrid[activeMonth][day];
        dayTotal += dayData ? dayData.total : 0;
      });
      weeklyTotal += dayTotal;
    }

    return weeklyTotal;
  };

  // Add these helper functions to your component

  const getBestPerformingDay = () => {
    // Implement logic to find the day with most calls
    // This could come from your daily calls data
    return {
      day: "Monday",
      calls: 45,
    };
  };

  const getPerformanceTrend = () => {
    // Compare current period with previous period
    // Return percentage change
    return 12; // +12%
  };

  const calculateTargetCompletion = (totalCalls) => {
    const monthlyTarget = 1000; // Set your target
    return Math.min(Math.round((totalCalls / monthlyTarget) * 100), 100);
  };

  const calculateEfficiencyScore = (userStats) => {
    // Calculate efficiency based on calls distribution
    const average =
      userStats.reduce((sum, stat) => sum + stat.total, 0) / userStats.length;
    const stdDev = Math.sqrt(
      userStats.reduce(
        (sum, stat) => sum + Math.pow(stat.total - average, 2),
        0
      ) / userStats.length
    );
    // Higher score for more balanced distribution
    const score = 10 - (stdDev / average) * 5;
    return Math.max(1, Math.min(10, Math.round(score)));
  };

  const calculateTop3Percentage = (userStats, totalCalls) => {
    const top3Total = userStats
      .slice(0, 3)
      .reduce((sum, stat) => sum + stat.total, 0);
    return Math.round((top3Total / totalCalls) * 100);
  };

  const calculateOthersPercentage = (userStats, totalCalls) => {
    const top3Total = userStats
      .slice(0, 3)
      .reduce((sum, stat) => sum + stat.total, 0);
    return Math.round(((totalCalls - top3Total) / totalCalls) * 100);
  };

  /* Pagination */
  const totalPages = Math.max(1, Math.ceil(sorted.length / rowsPerPage));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const indexOfLast = safePage * rowsPerPage;
  const indexOfFirst = indexOfLast - rowsPerPage;
  const pageItems = useMemo(
    () => sorted.slice(indexOfFirst, indexOfLast),
    [sorted, indexOfFirst, indexOfLast]
  );
  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchTerm,
    selectedSkills,
    selectedRoles,
    selectedLanguages,
    selectedGender,
    reminderFilter,
    selectedSource,
    skillMode,
    timeFormat,
    ageRange,
    experienceRange,
    rowsPerPage,
  ]);

  const getDisplayedPageNumbers = () => {
    const maxBtns = 5,
      tp = totalPages;
    if (tp <= maxBtns) return Array.from({ length: tp }, (_, i) => i + 1);
    const half = Math.floor(maxBtns / 2);
    let start = Math.max(1, safePage - half),
      end = start + maxBtns - 1;
    if (end > tp) {
      end = tp;
      start = end - maxBtns + 1;
    }
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  };

  /* Actions */
  const handleView = (w) => {
    if (!permissions.canView) return;
    setSelectedWorker(w);
    setIsEditMode(false);
    setIsModalOpen(true);
  };
  const handleEdit = (w, e) => {
    e?.stopPropagation?.();
    if (!permissions.canEdit) return;
    setSelectedWorker(w);
    setIsEditMode(true);
    setIsModalOpen(true);
  };
  const handleDelete = (w, e) => {
    e?.stopPropagation?.();
    if (!permissions.canDelete) return;
    setSelectedWorker(w);
    setShowDeleteConfirm(true);
  };
  const handleRowClick = (w, e) => {
    if (e?.target?.closest && e.target.closest("button, a, .btn")) return;
    handleView(w);
  };

  const handleDeleteConfirmed = () => {
    if (!selectedWorker || !permissions.canDelete) return;
    setShowDeleteConfirm(false);
    setDeleteReason("");
    setShowDeleteReason(true);
  };
  const performDeleteWithReason = async () => {
    if (!selectedWorker || !permissions.canDelete) return;
    if (!deleteReason.trim()) {
      alert("Please provide a reason");
      return;
    }
    try {
      setIsDeleting(true);
      await firebaseDB
        .child(`WorkerCalDeletedData/${selectedWorker.id}`)
        .set({
          ...selectedWorker,
          originalId: selectedWorker.id,
          deletedAt: new Date().toISOString(),
          deleteReason: deleteReason.trim(),
        });
      await firebaseDB.child(`WorkerCallData/${selectedWorker.id}`).remove();
      setShowDeleteReason(false);
      setSelectedWorker(null);
      setDeleteReason("");
    } catch (err) {
      console.error(err);
      alert("Error deleting worker");
    } finally {
      setIsDeleting(false);
    }
  };

  /* Row Selection */
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allIds = new Set(pageItems.map((item) => item.id));
      setSelectedRows(allIds);
    } else {
      setSelectedRows(new Set());
    }
  };

  const handleSelectRow = (id, checked) => {
    const newSelected = new Set(selectedRows);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedRows(newSelected);
  };

  /* Export */
  const handleExport = () => {
    if (!permissions.canExport) return;

    // If rows are selected, export only those, otherwise export all filtered
    const dataToExport =
      selectedRows.size > 0
        ? sorted.filter((w) => selectedRows.has(w.id))
        : sorted;

    const exportData = dataToExport.map((w) => {
      const baseDate = getBaseDate(w);
      const reminder = w?.callReminderDate || w?.reminderDate;
      const du = daysUntil(reminder);
      const duText = isFinite(du)
        ? du === 0
          ? "Today"
          : du === 1
          ? "Tomorrow"
          : du < 0
          ? `${Math.abs(du)} days ago`
          : `${du} days`
        : "";
      const age = calculateAge(
        w?.dateOfBirth || w?.dob || w?.birthDate,
        w?.age
      );
      const experience = calculateExperience(w);
      const displayId = getDisplayCallId(w, stableIndexMap);
      return {
        "WC Id": displayId,
        Date: formatDDMMYYYY(baseDate),
        Name: w?.name ?? "",
        Gender: w?.gender ?? "",
        Age: age ?? "",
        "Experience (Years)": experience ?? "",
        Skills: normalizeArray(w?.skills).join(", "),
        "Reminder Date": isValidDate(parseDate(reminder))
          ? formatDDMMYYYY(reminder)
          : "N/A",
        "Reminder (when)": isFinite(du) ? duText : "",
        Mobile: w?.mobileNo ?? "",
      };
    });
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);
    XLSX.utils.book_append_sheet(wb, ws, "Workers");

    const fileName =
      selectedRows.size > 0
        ? "SelectedWorkerCallData.xlsx"
        : "WorkerCallData.xlsx";
    XLSX.writeFile(wb, fileName);
  };

  /* Export All Data (Admin Only) */
  const handleExportAll = () => {
    if (!permissions.canManageUsers) {
      alert("Admin permission required for full data export.");
      return;
    }

    const exportData = workers.map((w, index) => {
      const baseDate = getBaseDate(w);
      const reminder = w?.callReminderDate || w?.reminderDate;
      const du = daysUntil(reminder);
      const duText = isFinite(du)
        ? du === 0
          ? "Today"
          : du === 1
          ? "Tomorrow"
          : du < 0
          ? `${Math.abs(du)} days ago`
          : `${du} days`
        : "";
      const age = calculateAge(
        w?.dateOfBirth || w?.dob || w?.birthDate,
        w?.age
      );
      const experience = calculateExperience(w);
      const displayId = getDisplayCallId(w, stableIndexMap);
      const addedBy = resolveAddedBy(w, usersMap);
      const callThrough = normalizeSource(
        w?.callThrough || w?.through || w?.source || ""
      );

      return {
        "S.No": index + 1,
        "WC Id": displayId,
        "Database ID": w.id,
        Date: formatDDMMYYYY(baseDate),
        Name: w?.name ?? "",
        Gender: w?.gender ?? "",
        Age: age ?? "",
        "Experience (Years)": experience ?? "",
        Skills: normalizeArray(w?.skills).join(", "),
        Languages: getWorkerLanguages(w).join(", "),
        Roles: getWorkerRoles(w).join(", "),
        Mobile: w?.mobileNo ?? "",
        Location: w?.location ?? "",
        "Communication Level": w?.conversationLevel ?? w?.communications ?? "",
        "Call Through": callThrough,
        "Reminder Date": isValidDate(parseDate(reminder))
          ? formatDDMMYYYY(reminder)
          : "N/A",
        "Reminder Status": isFinite(du) ? duText : "",
        "Added By": addedBy,
        "Created By ID": w?.createdById || w?.addedById || "",
        Comments: Array.isArray(w?.comments)
          ? w.comments.join("; ")
          : w?.comments || "",
        "Last Modified": w?.updatedAt ? formatDDMMYYYY(w.updatedAt) : "N/A",
      };
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);

    // Set column widths for comprehensive export
    const colWidths = [
      { wch: 6 }, // S.No
      { wch: 10 }, // WC Id
      { wch: 20 }, // Database ID
      { wch: 12 }, // Date
      { wch: 20 }, // Name
      { wch: 8 }, // Gender
      { wch: 6 }, // Age
      { wch: 12 }, // Experience
      { wch: 25 }, // Skills
      { wch: 15 }, // Languages
      { wch: 20 }, // Roles
      { wch: 15 }, // Mobile
      { wch: 20 }, // Location
      { wch: 15 }, // Communication
      { wch: 15 }, // Call Through
      { wch: 12 }, // Reminder Date
      { wch: 15 }, // Reminder Status
      { wch: 15 }, // Added By
      { wch: 20 }, // Created By ID
      { wch: 30 }, // Comments
      { wch: 15 }, // Last Modified
    ];
    ws["!cols"] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, "AllWorkerData");

    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
    XLSX.writeFile(wb, `AllWorkerData_FullExport_${timestamp}.xlsx`);
  };

  const hasActiveFilters = useMemo(
    () =>
      Boolean(
        searchTerm ||
          selectedSkills.length ||
          selectedRoles.length ||
          selectedLanguages.length ||
          selectedGender.length ||
          reminderFilter ||
          (selectedSource && selectedSource !== "All") ||
          skillMode !== "single" ||
          timeFormat !== "all" || // Fixed this line
          ageRange.min ||
          ageRange.max ||
          experienceRange.min ||
          experienceRange.max ||
          sortBy !== "id" ||
          sortDir !== "desc" ||
          rowsPerPage !== 10 ||
          currentPage !== 1 ||
          showJobRoles
      ),
    [
      searchTerm,
      selectedSkills,
      selectedRoles,
      selectedLanguages,
      selectedGender,
      reminderFilter,
      selectedSource,
      skillMode,
      timeFormat,
      ageRange,
      experienceRange,
      sortBy,
      sortDir,
      rowsPerPage,
      currentPage,
      showJobRoles,
    ]
  );

  // Update the resetFilters function to properly reset arrays:
  const resetFilters = () => {
    setSearchTerm("");
    setSelectedSkills([]);
    setSelectedRoles([]);
    setSelectedLanguages([]);
    setSelectedGender([]);
    setReminderFilter("");
    setSelectedSource("All");
    setSkillMode("single");
    setTimeFormat("all"); // Reset time format to "all"
    setAgeRange({ min: "", max: "" });
    setExperienceRange({ min: "", max: "" });
    setSortBy("id");
    setSortDir("desc");
    setRowsPerPage(10);
    setCurrentPage(1);
    setShowJobRoles(false);
    setSelectedRows(new Set());
  };

  /* UI */
  if (loading) return <div className="text-center my-5">Loading…</div>;
  if (error) return <div className="alert alert-danger">Error: {error}</div>;

  return (
    <div className="workerCalls">
      {/* reminder badges as filters */}
      <div className="alert alert-info text-info d-flex justify-content-around flex-wrap reminder-badges mb-4">
        {["overdue", "today", "tomorrow", "upcoming"].map((k) => (
          <span
            key={k}
            role="button"
            className={`reminder-badge ${k} ${
              reminderFilter === k ? "active" : ""
            }`}
            onClick={() => setReminderFilter(reminderFilter === k ? "" : k)}
          >
            {k[0].toUpperCase() + k.slice(1)}:{" "}
            <strong>
              {k === "overdue"
                ? badgeCounts.overdue
                : k === "today"
                ? badgeCounts.today
                : k === "tomorrow"
                ? badgeCounts.tomorrow
                : badgeCounts.upcoming}
            </strong>
          </span>
        ))}
      </div>

      {/* top controls */}
      <div className="d-flex justify-content-between flex-wrap gap-2 p-2 bg-dark border rounded-3 mb-3">
        {/* status line */}
        <div className="small text-center mt-2" style={{ color: "yellow" }}>
          Showing <strong>{pageItems.length}</strong> of{" "}
          <strong>{sorted.length}</strong> (from{" "}
          <strong>{workers.length}</strong> total)
          {reminderFilter ? ` — ${reminderFilter}` : ""}
        </div>
        <input
          type="text"
          className="form-control searchBar workerCallSearch"
          placeholder="Search name, location, mobile, or ID (WC-01)…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ maxWidth: 380 }}
        />
        <select
          className="form-select d-filter"
          value={selectedSource}
          onChange={(e) => setSelectedSource(e.target.value)}
        >
          <option value="All">All Call Through</option>
          {callThroughOptions.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>

        {/* User dropdown for admin/super admin */}
        {(permissions.canManageUsers || permissions.canExport) && (
          <select
            className="form-select d-filter"
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
          >
            <option value="">All Users</option>
            {Object.entries(usersMap).map(([userId, user]) => (
              <option key={userId} value={userId}>
                {user.name || user.displayName || user.email || userId}
              </option>
            ))}
          </select>
        )}

        <div className="d-flex gap-2 d-filterWrapper">
          <select
            className="form-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="id">Sort by ID</option>
            <option value="date">Sort by Date</option>
            <option value="name">Sort by Name</option>
            <option value="gender">Sort by Gender</option>
            <option value="age">Sort by Age</option>
            <option value="experience">Sort by Experience</option>
            <option value="reminder">Sort by Reminder</option>
            <option value="skills">Sort by Skills</option>
            <option value="mobile">Sort by Mobile</option>
            <option value="talking">Sort by Talking</option>
          </select>
          <select
            className="form-select"
            value={sortDir}
            onChange={(e) => setSortDir(e.target.value)}
          >
            <option value="desc">Desc</option>
            <option value="asc">Asc</option>
          </select>
        </div>

        <div className="d-flex gap-2 d-filterWrapper">
          <button
            className={`btn ${
              permissions.canExport ? "btn-success" : "btn-outline-secondary"
            }`}
            onClick={permissions.canExport ? handleExport : undefined}
            title={
              permissions.canExport
                ? "Export to Excel"
                : "Export disabled — ask admin for permission"
            }
            disabled={!permissions.canExport}
          >
            Export {selectedRows.size > 0 ? `(${selectedRows.size})` : ""}
          </button>
          {permissions.canManageUsers && (
            <button
              className="btn btn-info"
              onClick={handleExportAll}
              title="Export All Data (Admin Only)"
            >
              Export All
            </button>
          )}
          <button
            className={`btn btn-outline-warning text-warning ${
              hasActiveFilters ? "btn-pulse" : ""
            }`}
            onClick={resetFilters}
          >
            Reset
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs-container mb-4">
        <ul className="nav nav-tabs dark-tabs">
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === "callData" ? "active" : ""}`}
              onClick={() => setActiveTab("callData")}
            >
              <i className="bi bi-table me-2"></i>
              Call Data
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${
                activeTab === "callSummary" ? "active" : ""
              }`}
              onClick={() => setActiveTab("callSummary")}
            >
              <i className="bi bi-bar-chart me-2"></i>
              Call Summary
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${
                activeTab === "callThrough" ? "active" : ""
              }`}
              onClick={() => setActiveTab("callThrough")}
            >
              <i className="bi bi-diagram-3 me-2"></i>
              Call Through
            </button>
          </li>
        </ul>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {/* Call Data Tab */}
        {activeTab === "callData" && (
          <div className="tab-pane fade show active">
            {/* Filter row (unchanged markup) */}
            <div className="p-3 mb-3 bg-dark border rounded-3">
              <div className="row g-3 align-items-center justify-content-between sillFilterWrapper">
                <div className="col-lg-2 col-md-3 text-center">
                  <label className="form-label small mb-2 text-warning">
                    Gender
                  </label>
                  <div className="d-flex gap-2 justify-content-center">
                    {["Male", "Female"].map((g) => {
                      const on = selectedGender.includes(g);
                      return (
                        <button
                          key={g}
                          type="button"
                          className={`btn ${
                            on ? "btn-warning" : "btn-outline-warning"
                          } btn-sm`}
                          onClick={() =>
                            setSelectedGender((prev) =>
                              on ? prev.filter((x) => x !== g) : [...prev, g]
                            )
                          }
                        >
                          {g}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="col-lg-2 col-md-3 text-center">
                  <label className="form-label small mb-2 text-info">
                    Select Options
                  </label>
                  <div className="d-flex gap-2 justify-content-center">
                    <button
                      type="button"
                      className={`btn ${
                        skillMode === "single" ? "btn-info" : "btn-outline-info"
                      } btn-sm`}
                      onClick={() => setSkillMode("single")}
                    >
                      Single Sel
                    </button>
                    <button
                      type="button"
                      className={`btn ${
                        skillMode === "multi" ? "btn-info" : "btn-outline-info"
                      } btn-sm`}
                      onClick={() => setSkillMode("multi")}
                    >
                      Multi Sel
                    </button>
                  </div>
                </div>

                <div className="col-lg-2 col-md-6 text-center">
                  <label className="form-label text-info small mb-1">
                    Age (18 - 55)
                  </label>
                  <div className="d-flex gap-2">
                    <input
                      type="number"
                      min={18}
                      max={55}
                      className="form-control form-control-sm"
                      placeholder="Min (18)"
                      value={ageRange.min}
                      onChange={(e) =>
                        setAgeRange((r) => ({ ...r, min: e.target.value }))
                      }
                    />
                    <input
                      type="number"
                      min={18}
                      max={55}
                      className="form-control form-control-sm"
                      placeholder="Max (55)"
                      value={ageRange.max}
                      onChange={(e) =>
                        setAgeRange((r) => ({ ...r, max: e.target.value }))
                      }
                    />
                  </div>
                </div>

                <div className="col-lg-2 col-md-6 text-center">
                  <label className="form-label text-info small mb-1">
                    Experience (Yrs)
                  </label>
                  <div className="d-flex gap-2">
                    <input
                      type="number"
                      min={0}
                      step="0.5"
                      className="form-control form-control-sm"
                      placeholder="Min"
                      value={experienceRange.min}
                      onChange={(e) =>
                        setExperienceRange((r) => ({
                          ...r,
                          min: e.target.value,
                        }))
                      }
                    />
                    <input
                      type="number"
                      min={0}
                      step="0.5"
                      className="form-control form-control-sm"
                      placeholder="Max"
                      value={experienceRange.max}
                      onChange={(e) =>
                        setExperienceRange((r) => ({
                          ...r,
                          max: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                {/* Time Format Filter */}
                <div className="col-lg-2 col-md-3 text-center">
                  <label className="form-label small mb-2 text-info">
                    Working Hours
                  </label>
                  <div className="d-flex gap-2 justify-content-center">
                    <button
                      type="button"
                      className={`btn ${
                        timeFormat === "all" ? "btn-info" : "btn-outline-info"
                      } btn-sm`}
                      onClick={() => setTimeFormat("all")}
                    >
                      All
                    </button>
                    <button
                      type="button"
                      className={`btn ${
                        timeFormat === "12" ? "btn-info" : "btn-outline-info"
                      } btn-sm`}
                      onClick={() => setTimeFormat("12")}
                    >
                      12HRS
                    </button>
                    <button
                      type="button"
                      className={`btn ${
                        timeFormat === "24" ? "btn-info" : "btn-outline-info"
                      } btn-sm`}
                      onClick={() => setTimeFormat("24")}
                    >
                      24HRS
                    </button>
                  </div>
                </div>

                <div className="col-lg-1 col-md-2 text-center">
                  <label className="form-label text-warning small mb-2">
                    Other Skills
                  </label>
                  <div className="d-flex justify-content-center align-items-center gap-2 toggle-pill">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      id="showJobRoles"
                      checked={showJobRoles}
                      onChange={(e) => setShowJobRoles(e.target.checked)}
                    />
                    <label
                      className="form-check-label text-white small fw-bold"
                      htmlFor="showJobRoles"
                    >
                      {showJobRoles ? "ON" : "OFF"}
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Languages & Skills */}
            <div className="row g-3 mb-3">
              <div className="col-md-6">
                <div className="p-3 bg-dark border rounded-3 h-100">
                  <h6 className="mb-2 text-info">Languages</h6>
                  <div className="d-flex flex-wrap gap-2">
                    {languageOptions.map((l) => {
                      const active = selectedLanguages.includes(l);
                      return (
                        <button
                          key={l}
                          className={`btn btn-sm ${
                            active ? "btn-info text-dark" : "btn-outline-info"
                          } rounded-pill`}
                          onClick={() =>
                            setSelectedLanguages((prev) =>
                              active
                                ? prev.filter((x) => x !== l)
                                : [...prev, l]
                            )
                          }
                        >
                          {l}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="col-md-6">
                <div className="p-3 bg-dark border rounded-3 h-100">
                  <h6 className="mb-2 text-warning">Housekeeping Skills</h6>
                  <div className="d-flex flex-wrap gap-2">
                    {skillOptions.map((s) => {
                      const active = selectedSkills.includes(s);
                      return (
                        <button
                          key={s}
                          className={`btn btn-sm ${
                            active
                              ? "btn-outline-warning btn-warning text-black"
                              : "btn-outline-warning"
                          } rounded-pill`}
                          onClick={() =>
                            setSelectedSkills((prev) =>
                              active
                                ? prev.filter((x) => x !== s)
                                : [...prev, s]
                            )
                          }
                        >
                          {s}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {showJobRoles && (
              <div className="p-3 bg-dark border rounded-3 mb-3">
                <h6 className="mb-2 text-warning">Other Skills</h6>
                <div className="row g-3">
                  {/* Office & Administrative */}
                  <div className="col-md-3 col-lg-3">
                    <div className="category-section">
                      <h6 className="category-heading text-primary mb-2">
                        Office & Administrative
                      </h6>
                      <div className="d-flex flex-wrap gap-2">
                        {[
                          "Computer Operating",
                          "Data Entry",
                          "Office Assistant",
                          "Receptionist",
                          "Front Desk Executive",
                          "Admin Assistant",
                          "Office Boy",
                          "Peon",
                          "Office Attendant",
                        ].map((r) => {
                          const active = selectedRoles.includes(r);
                          return (
                            <button
                              key={r}
                              className={`btn btn-sm ${
                                active ? "btn-primary" : "btn-outline-primary"
                              } rounded-pill`}
                              onClick={() =>
                                setSelectedRoles((prev) =>
                                  active
                                    ? prev.filter((x) => x !== r)
                                    : [...prev, r]
                                )
                              }
                            >
                              {r}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Customer Service & Telecommunication */}
                  <div className="col-md-3 col-lg-3">
                    <div className="category-section">
                      <h6 className="category-heading text-success mb-2">
                        Customer Service
                      </h6>
                      <div className="d-flex flex-wrap gap-2">
                        {[
                          "Tele Calling",
                          "Customer Support",
                          "Telemarketing",
                          "BPO Executive",
                          "Call Center Agent",
                          "Customer Care Executive",
                        ].map((r) => {
                          const active = selectedRoles.includes(r);
                          return (
                            <button
                              key={r}
                              className={`btn btn-sm ${
                                active ? "btn-success" : "btn-outline-success"
                              } rounded-pill`}
                              onClick={() =>
                                setSelectedRoles((prev) =>
                                  active
                                    ? prev.filter((x) => x !== r)
                                    : [...prev, r]
                                )
                              }
                            >
                              {r}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Management & Supervision */}
                  <div className="col-md-3 col-lg-3">
                    <div className="category-section">
                      <h6 className="category-heading text-warning mb-2">
                        Management & Supervision
                      </h6>
                      <div className="d-flex flex-wrap gap-2">
                        {[
                          "Supervisor",
                          "Manager",
                          "Team Leader",
                          "Site Supervisor",
                          "Project Coordinator",
                        ].map((r) => {
                          const active = selectedRoles.includes(r);
                          return (
                            <button
                              key={r}
                              className={`btn btn-sm ${
                                active ? "btn-warning" : "btn-outline-warning"
                              } rounded-pill`}
                              onClick={() =>
                                setSelectedRoles((prev) =>
                                  active
                                    ? prev.filter((x) => x !== r)
                                    : [...prev, r]
                                )
                              }
                            >
                              {r}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Security */}
                  <div className="col-md-3 col-lg-3">
                    <div className="category-section">
                      <h6 className="category-heading text-danger mb-2">
                        Security
                      </h6>
                      <div className="d-flex flex-wrap gap-2">
                        {[
                          "Security Guard",
                          "Security Supervisor",
                          "Gatekeeper",
                          "Watchman",
                        ].map((r) => {
                          const active = selectedRoles.includes(r);
                          return (
                            <button
                              key={r}
                              className={`btn btn-sm ${
                                active ? "btn-danger" : "btn-outline-danger"
                              } rounded-pill`}
                              onClick={() =>
                                setSelectedRoles((prev) =>
                                  active
                                    ? prev.filter((x) => x !== r)
                                    : [...prev, r]
                                )
                              }
                            >
                              {r}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Driving & Logistics */}
                  <div className="col-md-3 col-lg-3">
                    <div className="category-section">
                      <h6 className="category-heading text-info mb-2">
                        Driving & Logistics
                      </h6>
                      <div className="d-flex flex-wrap gap-2">
                        {[
                          "Driving",
                          "Delivery Boy",
                          "Delivery Executive",
                          "Rider",
                          "Driver",
                          "Car Driver",
                          "Bike Rider",
                          "Logistics Helper",
                        ].map((r) => {
                          const active = selectedRoles.includes(r);
                          return (
                            <button
                              key={r}
                              className={`btn btn-sm ${
                                active ? "btn-info" : "btn-outline-info"
                              } rounded-pill`}
                              onClick={() =>
                                setSelectedRoles((prev) =>
                                  active
                                    ? prev.filter((x) => x !== r)
                                    : [...prev, r]
                                )
                              }
                            >
                              {r}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Technical & Maintenance - Updated Color */}
                  <div className="col-md-3 col-lg-3">
                    <div className="category-section">
                      <h6 className="category-heading text-warning mb-2">
                        Technical & Maintenance
                      </h6>
                      <div className="d-flex flex-wrap gap-2">
                        {[
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
                        ].map((r) => {
                          const active = selectedRoles.includes(r);
                          return (
                            <button
                              key={r}
                              className={`btn btn-sm ${
                                active ? "btn-warning" : "btn-outline-warning"
                              } rounded-pill`}
                              onClick={() =>
                                setSelectedRoles((prev) =>
                                  active
                                    ? prev.filter((x) => x !== r)
                                    : [...prev, r]
                                )
                              }
                            >
                              {r}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Retail & Sales */}
                  <div className="col-md-3 col-lg-3">
                    <div className="category-section">
                      <h6 className="category-heading text-primary mb-2">
                        Retail & Sales
                      </h6>
                      <div className="d-flex flex-wrap gap-2">
                        {[
                          "Sales Boy",
                          "Sales Girl",
                          "Store Helper",
                          "Retail Assistant",
                          "Shop Attendant",
                        ].map((r) => {
                          const active = selectedRoles.includes(r);
                          return (
                            <button
                              key={r}
                              className={`btn btn-sm ${
                                active ? "btn-primary" : "btn-outline-primary"
                              } rounded-pill`}
                              onClick={() =>
                                setSelectedRoles((prev) =>
                                  active
                                    ? prev.filter((x) => x !== r)
                                    : [...prev, r]
                                )
                              }
                            >
                              {r}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Industrial & Labor */}
                  <div className="col-md-3 col-lg-3">
                    <div className="category-section">
                      <h6 className="category-heading text-danger mb-2">
                        Industrial & Labor
                      </h6>
                      <div className="d-flex flex-wrap gap-2">
                        {[
                          "Labour",
                          "Helper",
                          "Loading Unloading",
                          "Warehouse Helper",
                          "Factory Worker",
                          "Production Helper",
                          "Packaging Staff",
                        ].map((r) => {
                          const active = selectedRoles.includes(r);
                          return (
                            <button
                              key={r}
                              className={`btn btn-sm ${
                                active ? "btn-danger" : "btn-outline-danger"
                              } rounded-pill`}
                              onClick={() =>
                                setSelectedRoles((prev) =>
                                  active
                                    ? prev.filter((x) => x !== r)
                                    : [...prev, r]
                                )
                              }
                            >
                              {r}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Top pagination */}

            <div className="d-flex align-items-center flex-wrap gap-2 mt-2 mb-3 bg-dark p-3 rounded-3">
              <div style={{ color: "yellow" }}>
                Showing <strong>{pageItems.length}</strong> of{" "}
                <strong>{sorted.length}</strong> (from{" "}
                <strong>{workers.length}</strong> total)
                {reminderFilter ? ` — ${reminderFilter}` : ""}
              </div>

              {Math.ceil(sorted.length / rowsPerPage) > 1 && (
                <nav
                  aria-label="Workers"
                  className="pagination-top py-2 m-auto pagination-wrapper"
                >
                  <ul className="pagination justify-content-center mb-0">
                    <li
                      className={`page-item ${
                        safePage === 1 ? "disabled" : ""
                      }`}
                    >
                      <button
                        className="page-link"
                        onClick={() => setCurrentPage(1)}
                        disabled={safePage === 1}
                      >
                        «
                      </button>
                    </li>
                    <li
                      className={`page-item ${
                        safePage === 1 ? "disabled" : ""
                      }`}
                    >
                      <button
                        className="page-link"
                        onClick={() => setCurrentPage(safePage - 1)}
                        disabled={safePage === 1}
                      >
                        ‹
                      </button>
                    </li>
                    {getDisplayedPageNumbers().map((num) => (
                      <li
                        key={num}
                        className={`page-item ${
                          safePage === num ? "active" : ""
                        }`}
                      >
                        <button
                          className="page-link"
                          onClick={() => setCurrentPage(num)}
                        >
                          {num}
                        </button>
                      </li>
                    ))}
                    <li
                      className={`page-item ${
                        safePage === totalPages ? "disabled" : ""
                      }`}
                    >
                      <button
                        className="page-link"
                        onClick={() => setCurrentPage(safePage + 1)}
                        disabled={safePage === totalPages}
                      >
                        ›
                      </button>
                    </li>
                    <li
                      className={`page-item ${
                        safePage === totalPages ? "disabled" : ""
                      }`}
                    >
                      <button
                        className="page-link"
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={safePage === totalPages}
                      >
                        »
                      </button>
                    </li>
                  </ul>
                </nav>
              )}

              <div className=" d-flex">
                <span className="me-2 text-white">Show</span>
                <select
                  className="form-select me-2 form-select-sm"
                  style={{ width: 80 }}
                  value={rowsPerPage}
                  onChange={(e) => {
                    setRowsPerPage(parseInt(e.target.value, 10) || 10);
                    setCurrentPage(1);
                  }}
                >
                  {[10, 20, 30, 40, 50].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
                <span className="text-white ">Entries</span>
              </div>
            </div>

            {/* Table -1 */}
            <div className="table-responsive">
              <table className="table table-dark table-hover align-middle">
                <thead>
                  <tr>
                    <th>
                      <input
                        type="checkbox"
                        onChange={handleSelectAll}
                        checked={
                          selectedRows.size > 0 &&
                          selectedRows.size === pageItems.length
                        }
                      />
                    </th>
                    <th>ID</th>
                    <th>Date</th>
                    <th>Name</th>
                    <th>Gender</th>
                    <th>Age</th>
                    <th>Experience</th>
                    <th>Reminder</th>
                    <th>Joining</th>
                    <th>Skills</th>
                    <th>Lang</th>
                    <th style={{ display: "none" }}>Languages</th>
                    <th>Mobile</th>
                    <th>Talking</th>
                    <th style={{ display: "none" }}>Call Through</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((w) => {
                    const idxInSorted = sorted.findIndex((x) => x.id === w.id);
                    const displayId = getDisplayCallId(w, stableIndexMap);
                    const addedBy = resolveAddedBy(w, usersMap);

                    const reminder =
                      w?.callReminderDate || w?.reminderDate || null;
                    const hasReminder = isValidDate(parseDate(reminder));
                    const du = hasReminder
                      ? daysUntil(reminder)
                      : Number.POSITIVE_INFINITY;
                    const duText = hasReminder
                      ? du === 0
                        ? "Today"
                        : du > 0
                        ? `in ${du} day${du > 1 ? "s" : ""}`
                        : `${Math.abs(du)} day${
                            Math.abs(du) > 1 ? "s" : ""
                          } ago`
                      : "";
                    const timeStr = hasReminder
                      ? timeFormat === "24hr"
                        ? formatTime(reminder, "24hr")
                        : formatTime(reminder, "12hr")
                      : "";

                    const comms = (
                      w?.communications ??
                      w?.communication ??
                      w?.conversation ??
                      w?.conversationLevel ??
                      ""
                    ).toString();
                    const callThrough = normalizeSource(
                      w?.callThrough || w?.through || w?.source || ""
                    );
                    const age = calculateAge(
                      w?.dateOfBirth || w?.dob || w?.birthDate,
                      w?.age
                    );
                    const experience = calculateExperience(w);

                    // Joining Type
                    const joiningType =
                      w?.joiningType ||
                      w?.joiningAvailability ||
                      w?.availability ||
                      "";

                    // Text color for reminder severity (no row background)
                    const reminderTextClass = !hasReminder
                      ? "text-secondary"
                      : du < 0
                      ? "text-danger"
                      : du === 0
                      ? "text-warning"
                      : du === 1
                      ? "text-info"
                      : "text-success";

                    return (
                      <tr
                        key={w.id}
                        onClick={(e) => handleRowClick(w, e)}
                        style={{ cursor: "pointer" }}
                      >
                        <td onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedRows.has(w.id)}
                            onChange={(e) =>
                              handleSelectRow(w.id, e.target.checked)
                            }
                          />
                        </td>
                        <td>
                          {displayId}
                          {addedBy && (
                            <small className="d-block small-text text-info opacity-50">
                              By {addedBy}
                            </small>
                          )}
                        </td>
                        <td>
                          {formatPrettyDate(getBaseDate(w))}
                          {hasTimeData(w) && (
                            <small className="d-block text-info small-text opacity-50">
                              {formatTime(
                                getBaseDate(w),
                                timeFormat === "24" ? "24hr" : "12hr"
                              )}
                            </small>
                          )}
                        </td>
                        <td>{w?.name || "—"}</td>
                        <td>
                          <span
                            className={
                              w?.gender === "Male"
                                ? "badge bg-primary opacity-50"
                                : w?.gender === "Female"
                                ? "badge badge-female opacity-50"
                                : "badge bg-secondary "
                            }
                          >
                            {w?.gender || "—"}
                          </span>
                        </td>
                        <td>{age ?? "—"}</td>
                        <td>
                          {typeof experience === "number"
                            ? `${experience} yrs`
                            : "—"}
                        </td>
                        <td className={reminderTextClass}>
                          <span className="d-block">
                            {hasReminder ? formatDDMMYYYY(reminder) : "N/A"}
                          </span>
                          {hasReminder}
                          {hasReminder && duText && (
                            <small className="d-block">{duText}</small>
                          )}
                        </td>
                        <td>
                          {joiningType ? (
                            <span
                              className={`badge ${
                                joiningType.toLowerCase().includes("immediate")
                                  ? "bg-success"
                                  : joiningType.toLowerCase().includes("15")
                                  ? "bg-warning text-dark"
                                  : joiningType.toLowerCase().includes("30")
                                  ? "bg-info"
                                  : joiningType
                                      .toLowerCase()
                                      .includes("flexible")
                                  ? "bg-primary"
                                  : "bg-secondary"
                              } opacity-50`}
                            >
                              {joiningType}
                            </span>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td style={{ maxWidth: "150px" }}>
                          <div className="d-flex flex-wrap gap-2 justify-content-center">
                            {getWorkerSkills(w)
                              .slice(0, 3)
                              .map((skill, idx) => (
                                <span
                                  key={idx}
                                  className="badge bg-info text-dark text-capitalize opacity-50"
                                >
                                  {skill}
                                </span>
                              ))}
                            {getWorkerSkills(w).length > 3 && (
                              <span className="badge bg-secondary">
                                +{getWorkerSkills(w).length - 3}
                              </span>
                            )}
                          </div>
                        </td>
                        {/* Keep but hide Languages col */}
                        <td style={{ maxWidth: "150px" }}>
                          <div className="d-flex flex-wrap gap-2 justify-content-center">
                            {getWorkerLanguages(w)
                              .slice(0, 3)
                              .map((lang, idx) => (
                                <span
                                  key={idx}
                                  className="badge bg-light text-dark  text-capitalize opacity-50"
                                >
                                  {lang}
                                </span>
                              ))}
                            {getWorkerLanguages(w).length > 3 && (
                              <span className="badge bg-primary">
                                +{getWorkerLanguages(w).length - 3}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="text-white">
                          {/* <div className="fw-normal">{w?.mobileNo || "N/A"}</div> */}
                          {w?.mobileNo && (
                            <div
                              className="mt-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <a
                                href={`tel:${w.mobileNo}`}
                                className="btn btn-sm btn-outline-info me-1 rounded-pill"
                              >
                                Call
                              </a>
                              <a
                                className="btn btn-sm btn-outline-warning rounded-pill"
                                href={`https://wa.me/${String(
                                  w.mobileNo
                                ).replace(/\D/g, "")}?text=${encodeURIComponent(
                                  "Hello, This is Sudheer From JenCeo Home Care Services"
                                )}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                WAP
                              </a>
                            </div>
                          )}
                        </td>
                        <td>
                          <span
                            className={`badge opacity-50 ${
                              comms.toLowerCase().includes("good")
                                ? "bg-success"
                                : comms.toLowerCase().includes("average")
                                ? "bg-warning text-dark"
                                : "bg-secondary"
                            }`}
                          >
                            {comms || "—"}
                          </span>
                        </td>
                        {/* Keep but hide Call Through */}
                        <td style={{ display: "none" }}>
                          <span className="badge bg-secondary">
                            {callThrough}
                          </span>
                        </td>
                        <td
                          className="text-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="btn-group" role="group">
                            {permissions.canView && (
                              <button
                                className="btn btn-sm btn-outline-info"
                                title="View"
                                onClick={() => handleView(w)}
                              >
                                <img
                                  src={viewIcon}
                                  alt="view"
                                  width="16"
                                  height="16"
                                />
                              </button>
                            )}
                            {permissions.canEdit && (
                              <button
                                className="btn btn-sm btn-outline-light border-warning"
                                title="Edit"
                                onClick={(e) => handleEdit(w, e)}
                              >
                                <img
                                  src={editIcon}
                                  alt="edit"
                                  width="16"
                                  height="16"
                                />
                              </button>
                            )}
                            {permissions.canDelete && (
                              <button
                                className="btn btn-sm btn-outline-danger"
                                title="Delete"
                                onClick={(e) => handleDelete(w, e)}
                              >
                                <img
                                  src={deleteIcon}
                                  alt="delete"
                                  width="16"
                                  height="16"
                                />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {pageItems.length === 0 && (
                    <tr>
                      <td colSpan="16">
                        <div className="alert alert-warning mb-0">
                          No records match your filters.
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Bottom pagination */}

            <div className="d-flex align-items-center flex-wrap gap-2 mt-2">
              <div style={{ color: "yellow" }}>
                Showing <strong>{pageItems.length}</strong> of{" "}
                <strong>{sorted.length}</strong> (from{" "}
                <strong>{workers.length}</strong> total)
                {reminderFilter ? ` — ${reminderFilter}` : ""}
              </div>

              {Math.ceil(sorted.length / rowsPerPage) > 1 && (
                <nav
                  aria-label="Workers"
                  className="pagination-top py-2 m-auto pagination-wrapper"
                >
                  <ul className="pagination justify-content-center mb-0">
                    <li
                      className={`page-item ${
                        safePage === 1 ? "disabled" : ""
                      }`}
                    >
                      <button
                        className="page-link"
                        onClick={() => setCurrentPage(1)}
                        disabled={safePage === 1}
                      >
                        «
                      </button>
                    </li>
                    <li
                      className={`page-item ${
                        safePage === 1 ? "disabled" : ""
                      }`}
                    >
                      <button
                        className="page-link"
                        onClick={() => setCurrentPage(safePage - 1)}
                        disabled={safePage === 1}
                      >
                        ‹
                      </button>
                    </li>
                    {getDisplayedPageNumbers().map((num) => (
                      <li
                        key={num}
                        className={`page-item ${
                          safePage === num ? "active" : ""
                        }`}
                      >
                        <button
                          className="page-link"
                          onClick={() => setCurrentPage(num)}
                        >
                          {num}
                        </button>
                      </li>
                    ))}
                    <li
                      className={`page-item ${
                        safePage === totalPages ? "disabled" : ""
                      }`}
                    >
                      <button
                        className="page-link"
                        onClick={() => setCurrentPage(safePage + 1)}
                        disabled={safePage === totalPages}
                      >
                        ›
                      </button>
                    </li>
                    <li
                      className={`page-item ${
                        safePage === totalPages ? "disabled" : ""
                      }`}
                    >
                      <button
                        className="page-link"
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={safePage === totalPages}
                      >
                        »
                      </button>
                    </li>
                  </ul>
                </nav>
              )}

              <div className=" d-flex">
                <span className="me-2 text-white">Show</span>
                <select
                  className="form-select me-2 form-select-sm"
                  style={{ width: 80 }}
                  value={rowsPerPage}
                  onChange={(e) => {
                    setRowsPerPage(parseInt(e.target.value, 10) || 10);
                    setCurrentPage(1);
                  }}
                >
                  {[10, 20, 30, 40, 50].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
                <span className="text-white ">Entries</span>
              </div>
            </div>
          </div>
        )}

        {/* Call Summary Tab */}
        {activeTab === "callSummary" && (
          <div className="tab-pane fade show active">
            {/* ---------- Daily Activity — {UserName} ---------- */}
            <h4 className="mt-2 mb-3 text-info">
              Daily Activity —{" "}
              <span className="text-warning">
                {selectedUser
                  ? usersMap[selectedUser]?.name ||
                    usersMap[selectedUser]?.displayName ||
                    selectedUser
                  : currentUserName}
              </span>
            </h4>
            <div className="d-flex align-items-center justify-content-between flex-wrap">
              <div className="d-flex flex-wrap gap-2 mb-3">
                {months.map((m, mi) => (
                  <button
                    key={m}
                    type="button"
                    className={`btn btn-sm w-auto ${
                      mi === activeMonth
                        ? "btn-warning text-dark"
                        : "btn-outline-warning"
                    }`}
                    onClick={() => setActiveMonth(mi)}
                  >
                    {m}
                  </button>
                ))}
              </div>
              <div className="d-flex gap-2 mb-3">
                <select
                  className="form-select form-select-sm"
                  value={activeYear}
                  onChange={(e) => setActiveYear(parseInt(e.target.value, 10))}
                >
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Table -1 */}
            {/* Month x Day grid */}
            {/* Desktop Table - hidden on mobile */}
            <div className="table-responsive mb-3 d-none d-lg-block">
              <div className="bg-dark border rounded p-3">
                <table
                  className="table table-dark table-hover"
                  style={{ fontSize: "12px" }}
                >
                  <thead>
                    <tr>
                      <th style={{ whiteSpace: "nowrap" }}>Month \\ Day</th>
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                        <th key={d} style={{ textAlign: "center" }}>
                          {d}
                        </th>
                      ))}
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {months.map((m, mi) => {
                      const dim = new Date(activeYear, mi + 1, 0).getDate();
                      let rowTotal = 0;
                      return (
                        <tr key={m}>
                          <td className="text-info fw-bold">{m}</td>
                          {Array.from({ length: 31 }, (_, i) => i + 1).map(
                            (d) => {
                              const currentGrid = selectedUser
                                ? userDayGrid
                                : dayGrid;
                              const cell = (currentGrid[mi] &&
                                currentGrid[mi][d]) || {
                                new: 0,
                                modified: 0,
                                total: 0,
                              };
                              const within = d <= dim;
                              const total = within ? cell.total : 0;
                              rowTotal += total;
                              const { cls, label } = classifyCount(total);
                              return (
                                <td
                                  key={d}
                                  className={
                                    within
                                      ? `text-center perf-text ${cls}`
                                      : "bg-secondary-subtle"
                                  }
                                >
                                  {within
                                    ? total > 0
                                      ? `${cell.new}/${cell.modified} (${total})`
                                      : "•"
                                    : ""}
                                  {within && total === 0 && (
                                    <span className="visually-hidden">
                                      {label}
                                    </span>
                                  )}
                                </td>
                              );
                            }
                          )}
                          <td className="fw-bold">{rowTotal}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Table - hidden on desktop */}
            <div className="d-lg-none mb-3">
              <div className="bg-dark border rounded p-3">
                <h6 className="text-info mb-3">
                  Monthly Performance - {activeYear}
                </h6>
                <div className="table-responsive">
                  <table
                    className="table table-dark table-sm"
                    style={{ fontSize: "11px" }}
                  >
                    <thead>
                      <tr>
                        <th>Day</th>
                        {months.map((month, index) => (
                          <th key={month} className="text-center">
                            {month.substring(0, 3)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from(
                        { length: 31 },
                        (_, dayIndex) => dayIndex + 1
                      ).map((day) => (
                        <tr key={day}>
                          <td className="fw-bold text-info">{day}</td>
                          {months.map((month, monthIndex) => {
                            const dim = new Date(
                              activeYear,
                              monthIndex + 1,
                              0
                            ).getDate();
                            const within = day <= dim;
                            const currentGrid = selectedUser
                              ? userDayGrid
                              : dayGrid;
                            const cell = (currentGrid[monthIndex] &&
                              currentGrid[monthIndex][day]) || {
                              new: 0,
                              modified: 0,
                              total: 0,
                            };
                            const { cls } = classifyCount(cell.total);

                            return (
                              <td
                                key={`${month}-${day}`}
                                className={`text-center ${
                                  within ? `perf-text ${cls}` : "bg-secondary"
                                }`}
                              >
                                {within
                                  ? cell.total > 0
                                    ? cell.total
                                    : "•"
                                  : ""}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Charts */}
            {activeMonth != null && (
              <div className="row g-4 mb-4">
                {/* Desktop Bar Chart */}
                <div className="col-md-8 d-none d-lg-block">
                  <div className="bg-dark border rounded p-3">
                    <div className="d-flex justify-content-between align-items-center">
                      <div className="text-info">
                        <strong>Daily Calls</strong> — {months[activeMonth]}{" "}
                        {activeYear} (0–100)
                      </div>
                      <span className="small text-muted">New + Modified</span>
                    </div>
                    <div className="mt-3">
                      <div className="bar-graph">
                        {(selectedUser ? userGraphDays : graphDays).map((g) => (
                          <div
                            key={g.day}
                            className={`bar ${g.cls}`}
                            title={`${months[activeMonth]} ${g.day}: ${g.total}`}
                            style={{ height: `${g.total}%` }}
                          >
                            <span className="bar-label">{g.day}</span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 small d-flex flex-wrap gap-3 align-items-center pt-3 justify-content-between">
                        <span className="legend perf-none">
                          No Call Days (0)
                        </span>
                        <span className="legend perf-poor">Poor (1–20)</span>
                        <span className="legend perf-avg">Average (21–40)</span>
                        <span className="legend perf-good">Good (41–60)</span>
                        <span className="legend perf-vgood">
                          Very Good (61–80)
                        </span>
                        <span className="legend perf-exc">
                          Excellent (81–90)
                        </span>
                        <span className="legend perf-marv">
                          Marvelous (91+)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mobile Bar Chart */}
                <div className="col-12 d-lg-none">
                  <div className="bg-dark p-3">
                    <div className="d-flex justify-content-between align-items-center">
                      <div className="text-info">
                        <strong>Daily Calls</strong> — {months[activeMonth]}{" "}
                        {activeYear}
                      </div>
                      <span className="small text-muted">New + Modified</span>
                    </div>
                    <div className="mt-3">
                      <div className="horizontal-bar-graph">
                        {(selectedUser ? userGraphDays : graphDays).map((g) => (
                          <div
                            key={g.day}
                            className="bar-row border rounded p-2 mb-2"
                          >
                            <div className="d-flex justify-content-between align-items-center mb-0">
                              <span className="bar-label small text-info">
                                Day {g.day}
                              </span>

                              <div className="d-flex" style={{ width: "80%" }}>
                                {g.total > 0 ? (
                                  <div
                                    className={`bar-horizontal mChart ${g.cls}`}
                                    style={{
                                      width: `${g.total}%`,
                                      height: "15px",
                                      minWidth: "8px", // Ensure small values are still visible
                                      borderRadius: "0px 4px 4px 0",
                                    }}
                                    title={`${months[activeMonth]} ${g.day}: ${g.total}`}
                                  ></div>
                                ) : (
                                  <div
                                    className="bar-horizontal perf-none"
                                    style={{
                                      width: "8px",
                                      height: "15px",
                                    }}
                                    title={`${months[activeMonth]} ${g.day}: No calls`}
                                  ></div>
                                )}
                              </div>

                              <span className="bar-value small text-warning">
                                {g.total}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 small d-flex flex-wrap gap-2 align-items-center pt-3 justify-content-center">
                        <span className="legend perf-none">0</span>
                        <span className="legend perf-poor">1-15</span>
                        <span className="legend perf-avg">16-35</span>
                        <span className="legend perf-good">36-50</span>
                        <span className="legend perf-vgood">51-65</span>
                        <span className="legend perf-exc">66-80</span>
                        <span className="legend perf-marv">81-100</span>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Pie Chart - Same for both but with responsive sizing */}
                <div className="col-md-4 col-12">
                  <div className="bg-dark border rounded p-3 h-100">
                    <div className="text-info">
                      <strong>Performance Mix</strong> — {months[activeMonth]}{" "}
                      {activeYear}
                    </div>
                    <div className="d-flex flex-column align-items-center justify-content-center mt-3 gap-3">
                      {(() => {
                        const currentPieAgg = selectedUser
                          ? userPieAgg
                          : pieAgg;
                        const total =
                          Object.values(currentPieAgg).reduce(
                            (a, b) => a + b,
                            0
                          ) || 1;
                        const seg = (k) => (currentPieAgg[k] / total) * 360;
                        const grads = [
                          `var(--perf-none) 0 ${seg("none")}deg`,
                          `var(--perf-poor) ${seg("none")}deg ${
                            seg("none") + seg("poor")
                          }deg`,
                          `var(--perf-avg) ${seg("none") + seg("poor")}deg ${
                            seg("none") + seg("poor") + seg("avg")
                          }deg`,
                          `var(--perf-good) ${
                            seg("none") + seg("poor") + seg("avg")
                          }deg ${
                            seg("none") + seg("poor") + seg("avg") + seg("good")
                          }deg`,
                          `var(--perf-vgood) ${
                            seg("none") + seg("poor") + seg("avg") + seg("good")
                          }deg ${
                            seg("none") +
                            seg("poor") +
                            seg("avg") +
                            seg("good") +
                            seg("vgood")
                          }deg`,
                          `var(--perf-exc) ${
                            seg("none") +
                            seg("poor") +
                            seg("avg") +
                            seg("good") +
                            seg("vgood")
                          }deg ${
                            seg("none") +
                            seg("poor") +
                            seg("avg") +
                            seg("good") +
                            seg("vgood") +
                            seg("exc")
                          }deg`,
                          `var(--perf-marv) ${
                            seg("none") +
                            seg("poor") +
                            seg("avg") +
                            seg("good") +
                            seg("vgood") +
                            seg("exc")
                          }deg 360deg`,
                        ].join(", ");
                        return (
                          <div className="pie-wrap">
                            <div
                              className="pie"
                              style={{
                                background: `conic-gradient(${grads})`,
                                width:
                                  window.innerWidth < 768 ? "150px" : "200px",
                                height:
                                  window.innerWidth < 768 ? "150px" : "200px",
                              }}
                            />
                          </div>
                        );
                      })()}
                      <div className="mt-3 small w-100 d-flex flex-wrap justify-content-center gap-2">
                        <span className="legend perf-none">
                          No Call Days:{" "}
                          {selectedUser ? userPieAgg.none : pieAgg.none}
                        </span>
                        <span className="legend perf-poor">
                          Poor: {selectedUser ? userPieAgg.poor : pieAgg.poor}
                        </span>
                        <span className="legend perf-avg">
                          Average: {selectedUser ? userPieAgg.avg : pieAgg.avg}
                        </span>
                        <span className="legend perf-good">
                          Good: {selectedUser ? userPieAgg.good : pieAgg.good}
                        </span>
                        <span className="legend perf-vgood">
                          Very Good:{" "}
                          {selectedUser ? userPieAgg.vgood : pieAgg.vgood}
                        </span>
                        <span className="legend perf-exc">
                          Excellent:{" "}
                          {selectedUser ? userPieAgg.exc : pieAgg.exc}
                        </span>
                        <span className="legend perf-marv">
                          Marvelous:{" "}
                          {selectedUser ? userPieAgg.marv : pieAgg.marv}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* User Call Summary Table & Graph */}
            <div className="row mt-4">
              <div className="col-12">
                <div className="bg-dark border rounded p-3 mb-4">
                  <h4 className="text-info mb-3">
                    <i className="bi bi-people-fill me-2"></i>
                    User Call Summary — {activeYear}
                  </h4>

                  {/* Month Selector */}
                  <div className="d-flex align-items-center justify-content-between flex-wrap mb-4">
                    <div className="d-flex flex-wrap gap-2">
                      <button
                        type="button"
                        className={`btn btn-sm ${
                          activeMonth === null
                            ? "btn-warning text-dark"
                            : "btn-outline-warning"
                        }`}
                        onClick={() => setActiveMonth(null)}
                      >
                        All Months
                      </button>
                      {months.map((m, mi) => (
                        <button
                          key={m}
                          type="button"
                          className={`btn btn-sm w-auto ${
                            mi === activeMonth
                              ? "btn-warning text-dark"
                              : "btn-outline-warning"
                          }`}
                          onClick={() => setActiveMonth(mi)}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                    <div className="d-flex gap-2">
                      <select
                        className="form-select form-select-sm"
                        value={activeYear}
                        onChange={(e) =>
                          setActiveYear(parseInt(e.target.value, 10))
                        }
                      >
                        {years.map((y) => (
                          <option key={y} value={y}>
                            {y}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* User Call Summary Table */}
                  <div className="table-responsive mb-4">
                    <div className="table-responsive mb-4">
                      <table
                        className="table table-dark table-hover user-summary-table"
                        style={{ fontSize: "12px" }}
                      >
                        <thead className="summary-table-header">
                          <tr>
                            <th className="text-info">User</th>
                            {Array.from({ length: 31 }, (_, dayIndex) => (
                              <th
                                key={dayIndex}
                                className="text-center text-warning"
                              >
                                {dayIndex + 1}
                              </th>
                            ))}
                            <th className="text-warning text-center">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(usersMap).map(([userId, user]) => {
                            let userTotal = 0;
                            const dayCalls = Array.from(
                              { length: 31 },
                              (_, dayIndex) => {
                                const day = dayIndex + 1;
                                let calls = 0;

                                if (activeMonth === null) {
                                  // Yearly view - sum calls for this day across all months
                                  for (let month = 0; month < 12; month++) {
                                    const userGrid = getUserDayGrid(userId);
                                    const dayData =
                                      userGrid[month] && userGrid[month][day];
                                    calls += dayData ? dayData.total : 0;
                                  }
                                } else {
                                  // Monthly view - get calls for specific month
                                  const daysInMonth = new Date(
                                    activeYear,
                                    activeMonth + 1,
                                    0
                                  ).getDate();
                                  const isDayInMonth = day <= daysInMonth;
                                  if (isDayInMonth) {
                                    const userGrid = getUserDayGrid(userId);
                                    const dayData =
                                      userGrid[activeMonth] &&
                                      userGrid[activeMonth][day];
                                    calls = dayData ? dayData.total : 0;
                                  }
                                }

                                userTotal += calls;
                                return {
                                  day,
                                  calls,
                                  isInMonth:
                                    activeMonth === null
                                      ? true
                                      : day <=
                                        new Date(
                                          activeYear,
                                          activeMonth + 1,
                                          0
                                        ).getDate(),
                                };
                              }
                            );

                            return (
                              <tr key={userId}>
                                <td
                                  className="text-info fw-bold"
                                  title={userId}
                                >
                                  {user.name ||
                                    user.displayName ||
                                    user.email ||
                                    userId}
                                </td>
                                {dayCalls.map(({ day, calls, isInMonth }) => (
                                  <td
                                    key={day}
                                    className={`text-center ${
                                      isInMonth
                                        ? getCallCountClass(calls)
                                        : "text-muted"
                                    }`}
                                    title={`${
                                      user.name || "User"
                                    }: ${calls} calls on day ${day}${
                                      activeMonth !== null
                                        ? ` ${months[activeMonth]}`
                                        : ""
                                    }`}
                                  >
                                    {isInMonth
                                      ? calls > 0
                                        ? calls
                                        : "•"
                                      : "-"}
                                  </td>
                                ))}
                                <td className="text-success text-warning fw-bold bg-dark">
                                  {userTotal > 0 ? userTotal : "•"}
                                </td>
                              </tr>
                            );
                          })}

                          {/* Daily Totals Row */}
                          <tr className="daily-totals-row fw-bold">
                            <td className="text-warning">Daily Total</td>
                            {Array.from({ length: 31 }, (_, dayIndex) => {
                              const day = dayIndex + 1;
                              let dailyTotal = 0;

                              if (activeMonth === null) {
                                // Yearly view - sum all users' calls for this day across all months
                                Object.keys(usersMap).forEach((userId) => {
                                  for (let month = 0; month < 12; month++) {
                                    const userGrid = getUserDayGrid(userId);
                                    const dayData =
                                      userGrid[month] && userGrid[month][day];
                                    dailyTotal += dayData ? dayData.total : 0;
                                  }
                                });
                              } else {
                                // Monthly view - sum all users' calls for this day in specific month
                                const daysInMonth = new Date(
                                  activeYear,
                                  activeMonth + 1,
                                  0
                                ).getDate();
                                const isDayInMonth = day <= daysInMonth;
                                if (isDayInMonth) {
                                  Object.keys(usersMap).forEach((userId) => {
                                    const userGrid = getUserDayGrid(userId);
                                    const dayData =
                                      userGrid[activeMonth] &&
                                      userGrid[activeMonth][day];
                                    dailyTotal += dayData ? dayData.total : 0;
                                  });
                                }
                              }

                              const isInMonth =
                                activeMonth === null
                                  ? true
                                  : day <=
                                    new Date(
                                      activeYear,
                                      activeMonth + 1,
                                      0
                                    ).getDate();

                              return (
                                <td
                                  key={day}
                                  className={`text-center ${
                                    isInMonth ? "text-warning" : "text-muted"
                                  }`}
                                >
                                  {isInMonth
                                    ? dailyTotal > 0
                                      ? dailyTotal
                                      : "•"
                                    : "-"}
                                </td>
                              );
                            })}
                            <td className="text-warning text-center bg-success">
                              {activeMonth === null
                                ? getTotalYearlyCalls()
                                : getTotalMonthlyCalls()}
                            </td>
                          </tr>

                          {/* Weekly/Monthly Summary Rows */}
                          {activeMonth === null ? (
                            // Yearly view - show monthly totals per user
                            <>
                              {months.map((month, monthIndex) => (
                                <tr
                                  key={`month-${month}`}
                                  className="month-summary-row"
                                >
                                  <td className="text-info fw-bold">
                                    {month} Total
                                  </td>
                                  {Array.from({ length: 31 }, (_, dayIndex) => {
                                    const day = dayIndex + 1;
                                    let monthlyDailyTotal = 0;

                                    Object.keys(usersMap).forEach((userId) => {
                                      const userGrid = getUserDayGrid(userId);
                                      const dayData =
                                        userGrid[monthIndex] &&
                                        userGrid[monthIndex][day];
                                      monthlyDailyTotal += dayData
                                        ? dayData.total
                                        : 0;
                                    });

                                    return (
                                      <td
                                        key={day}
                                        className="text-center text-info"
                                      >
                                        {monthlyDailyTotal > 0
                                          ? monthlyDailyTotal
                                          : "•"}
                                      </td>
                                    );
                                  })}
                                  <td className="text-warning text-center fw-bold bg-info">
                                    {getMonthlyUserTotalAllUsers(monthIndex) > 0
                                      ? getMonthlyUserTotalAllUsers(monthIndex)
                                      : "•"}
                                  </td>
                                </tr>
                              ))}
                            </>
                          ) : (
                            // Monthly view - show weekly totals
                            <>
                              {[1, 2, 3, 4, 5].map((week) => (
                                <tr
                                  key={`week-${week}`}
                                  className="week-summary-row"
                                >
                                  <td className="text-info fw-bold">
                                    Week {week}
                                  </td>
                                  {Array.from({ length: 31 }, (_, dayIndex) => {
                                    const day = dayIndex + 1;
                                    const startDay = (week - 1) * 7 + 1;
                                    const endDay = Math.min(
                                      week * 7,
                                      new Date(
                                        activeYear,
                                        activeMonth + 1,
                                        0
                                      ).getDate()
                                    );
                                    const isDayInWeek =
                                      day >= startDay && day <= endDay;

                                    let weeklyDailyTotal = 0;
                                    if (isDayInWeek) {
                                      Object.keys(usersMap).forEach(
                                        (userId) => {
                                          const userGrid =
                                            getUserDayGrid(userId);
                                          const dayData =
                                            userGrid[activeMonth] &&
                                            userGrid[activeMonth][day];
                                          weeklyDailyTotal += dayData
                                            ? dayData.total
                                            : 0;
                                        }
                                      );
                                    }

                                    return (
                                      <td
                                        key={day}
                                        className={`text-center ${
                                          isDayInWeek
                                            ? "text-info"
                                            : "text-muted"
                                        }`}
                                      >
                                        {isDayInWeek
                                          ? weeklyDailyTotal > 0
                                            ? weeklyDailyTotal
                                            : "•"
                                          : "-"}
                                      </td>
                                    );
                                  })}
                                  <td className="text-warning text-center fw-bold bg-info">
                                    {getWeeklyTotal(week) > 0
                                      ? getWeeklyTotal(week)
                                      : "•"}
                                  </td>
                                </tr>
                              ))}
                            </>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <div className="bg-dark border rounded p-3">
                  <h5 className="text-info mb-3">
                    <i className="bi bi-bar-chart-fill me-2"></i>
                    User Performance Comparison -{" "}
                    {activeMonth === null ? "Yearly" : months[activeMonth]}{" "}
                    {activeYear}
                  </h5>

                  <div className="row">
                    {/* Vertical Bar Chart */}
                    <div className="col-md-9">
                      <div className="vertical-bar-chart">
                        <div
                          className="chart-container"
                          style={{ height: "450px" }}
                        >
                          <div className="d-flex justify-content-around align-items-end h-100 px-3">
                            {(() => {
                              // Calculate maxCalls first
                              const maxCalls =
                                Math.max(
                                  ...Object.keys(usersMap).map((id) =>
                                    activeMonth === null
                                      ? getYearlyUserTotal(id)
                                      : getMonthlyUserTotal(id)
                                  )
                                ) || 1;

                              return Object.entries(usersMap).map(
                                ([userId, user], index) => {
                                  const total =
                                    activeMonth === null
                                      ? getYearlyUserTotal(userId)
                                      : getMonthlyUserTotal(userId);
                                  const percentage = (total / maxCalls) * 85;

                                  // Simple, visible color themes
                                  const colorThemes = [
                                    {
                                      main: "#3B82F6", // Blue
                                      light: "#60A5FA",
                                    },
                                    {
                                      main: "#10B981", // Green
                                      light: "#34D399",
                                    },
                                    {
                                      main: "#8B5CF6", // Purple
                                      light: "#A78BFA",
                                    },
                                    {
                                      main: "#F59E0B", // Amber
                                      light: "#FBBF24",
                                    },
                                    {
                                      main: "#EF4444", // Red
                                      light: "#F87171",
                                    },
                                    {
                                      main: "#06B6D4", // Cyan
                                      light: "#22D3EE",
                                    },
                                    {
                                      main: "#84CC16", // Lime
                                      light: "#A3E635",
                                    },
                                    {
                                      main: "#F97316", // Orange
                                      light: "#FB923C",
                                    },
                                  ];

                                  const theme =
                                    colorThemes[index % colorThemes.length];

                                  return (
                                    <div
                                      key={userId}
                                      className="vertical-bar-group text-center mx-2"
                                    >
                                      <div
                                        className="vertical-bar"
                                        style={{
                                          height: `${percentage}%`,
                                          background: `linear-gradient(180deg, ${theme.main} 0%, ${theme.light} 100%)`,
                                          boxShadow:
                                            "0 4px 12px rgba(0,0,0,0.3)",
                                          border: `2px solid ${theme.main}`,
                                          borderRadius: "8px 8px 0 0",
                                        }}
                                        title={`${
                                          user.name || "User"
                                        }: ${total} calls`}
                                      >
                                        <span
                                          className="vertical-bar-value"
                                          style={{
                                            color: "white",
                                            textShadow:
                                              "0 1px 3px rgba(0,0,0,0.8)",
                                            fontWeight: "800",
                                            fontSize:
                                              total > 99 ? "12px" : "14px",
                                            position: "relative",
                                            zIndex: 2,
                                          }}
                                        >
                                          {total}
                                        </span>
                                      </div>

                                      {/* User label */}
                                      <div className="user-label mt-3">
                                        <div
                                          className="user-name-badge"
                                          style={{
                                            background: theme.main,
                                            color: "white",
                                            padding: "6px 12px",
                                            borderRadius: "20px",
                                            fontSize: "12px",
                                            fontWeight: "700",
                                            maxWidth: "110px",
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            whiteSpace: "nowrap",
                                            boxShadow:
                                              "0 2px 8px rgba(0,0,0,0.2)",
                                            border: `2px solid ${theme.light}`,
                                          }}
                                        >
                                          {user.name ||
                                            user.displayName ||
                                            "User"}
                                        </div>

                                        {/* Performance indicator */}
                                        <div
                                          className="performance-indicator mt-2"
                                          style={{
                                            fontSize: "11px",
                                            fontWeight: "600",
                                            color: theme.main,
                                            background: "rgba(255,255,255,0.9)",
                                            padding: "3px 8px",
                                            borderRadius: "12px",
                                            border: `1px solid ${theme.main}`,
                                          }}
                                        >
                                          {total} calls
                                        </div>
                                      </div>
                                    </div>
                                  );
                                }
                              );
                            })()}
                          </div>

                          {/* Y-axis labels */}
                          {/* <div className="y-axis-labels">
        {[0, 25, 50, 75, 100].map(percent => {
          const maxCallsValue = Math.max(...Object.keys(usersMap).map(id =>
            activeMonth === null ? getYearlyUserTotal(id) : getMonthlyUserTotal(id)
          )) || 1;
          
          return (
            <div 
              key={percent} 
              className="y-axis-label"
              style={{
                bottom: `${percent}%`,
                color: '#374151',
                fontWeight: '700',
                fontSize: '12px',
                background: 'rgba(255,255,255,0.8)',
                padding: '2px 6px',
                borderRadius: '4px'
              }}
            >
              {Math.round((percent / 100) * maxCallsValue)}
            </div>
          );
        })}
      </div> */}
                        </div>

                        {/* Chart title */}
                        <div className="chart-title text-center mt-4">
                          <h5 className="fw-bold text-warning mb-0">
                            <i className="bi bi-bar-chart-fill me-2 text-primary"></i>
                            User Performance Overview
                            <i className="bi bi-activity ms-2 text-primary"></i>
                          </h5>
                          <p className="text-muted small mt-1">
                            Total calls per user{" "}
                            {activeMonth === null
                              ? "this year"
                              : `in ${months[activeMonth]}`}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Performance Stats */}
                    {/* Performance Stats */}
                    <div className="col-md-3">
                      <div className="performance-stats">
                        <h6 className="text-warning mb-3">
                          Performance Overview
                        </h6>
                        {(() => {
                          const userStats = Object.entries(usersMap)
                            .map(([userId, user]) => {
                              const total =
                                activeMonth === null
                                  ? getYearlyUserTotal(userId)
                                  : getMonthlyUserTotal(userId);
                              return { userId, user, total };
                            })
                            .sort((a, b) => b.total - a.total);

                          const topPerformer = userStats[0];
                          const averageCalls =
                            userStats.reduce(
                              (sum, stat) => sum + stat.total,
                              0
                            ) / userStats.length;
                          const totalCalls =
                            activeMonth === null
                              ? getTotalYearlyCalls()
                              : getTotalMonthlyCalls();

                          // Additional calculations
                          const activeUsers = userStats.filter(
                            (stat) => stat.total > 0
                          ).length;
                          const bestDay = getBestPerformingDay(); // You'll need to implement this
                          const performanceTrend = getPerformanceTrend(); // You'll need to implement this
                          const targetCompletion =
                            calculateTargetCompletion(totalCalls); // You'll need to implement this

                          return (
                            <div className="stats-list">
                              {/* Existing stats */}
                              <div className="stat-item mb-3 p-2 border rounded">
                                <div className="text-success fw-bold">
                                  🏆 Top Performer
                                </div>
                                <div className="text-light small">
                                  {topPerformer?.user?.name || "User"}:{" "}
                                  <span className="text-warning">
                                    {topPerformer?.total || 0}
                                  </span>{" "}
                                  calls
                                </div>
                              </div>

                              <div className="stat-item mb-3 p-2 border rounded">
                                <div className="text-info fw-bold">
                                  📊 Average
                                </div>
                                <div className="text-light small">
                                  <span className="text-warning">
                                    {averageCalls.toFixed(1)}
                                  </span>{" "}
                                  calls per user
                                </div>
                              </div>

                              <div className="stat-item mb-3 p-2 border rounded">
                                <div className="text-primary fw-bold">
                                  👥 Active Users
                                </div>
                                <div className="text-light small">
                                  <span className="text-warning">
                                    {activeUsers}
                                  </span>{" "}
                                  / {userStats.length} users active
                                </div>
                                <div
                                  className="progress mt-1"
                                  style={{ height: "4px" }}
                                >
                                  <div
                                    className="progress-bar bg-success"
                                    style={{
                                      width: `${
                                        (activeUsers / userStats.length) * 100
                                      }%`,
                                    }}
                                  ></div>
                                </div>
                              </div>

                              <div className="stat-item mb-3 p-2 border rounded">
                                <div className="text-warning fw-bold">
                                  📈 Total Calls
                                </div>
                                <div className="text-light small">
                                  <span className="text-success">
                                    {totalCalls}
                                  </span>{" "}
                                  calls
                                </div>
                              </div>

                              {/* NEW ADDITIONS BELOW */}

                              {/* Target Completion */}
                              <div className="stat-item mb-3 p-2 border rounded">
                                <div className="text-info fw-bold">
                                  🎯 Target Progress
                                </div>
                                <div className="text-light small">
                                  <span className="text-warning">
                                    {targetCompletion}%
                                  </span>{" "}
                                  completed
                                </div>
                                <div
                                  className="progress mt-1"
                                  style={{ height: "4px" }}
                                >
                                  <div
                                    className="progress-bar bg-info"
                                    style={{ width: `${targetCompletion}%` }}
                                  ></div>
                                </div>
                              </div>

                              {/* Performance Trend */}
                              {/* <div className="stat-item mb-3 p-2 border rounded">
                                <div className="fw-bold">
                                  {performanceTrend > 0 ? '📈 Trend' : performanceTrend < 0 ? '📉 Trend' : '➡️ Trend'}
                                </div>
                                <div className="text-light small">
                                  <span className={performanceTrend > 0 ? 'text-success' : performanceTrend < 0 ? 'text-danger' : 'text-warning'}>
                                    {performanceTrend > 0 ? '+' : ''}{performanceTrend}%
                                  </span> vs previous period
                                </div>
                              </div> */}

                              {/* Best Performing Day */}
                              <div className="stat-item mb-3 p-2 border rounded">
                                <div className="text-success fw-bold">
                                  ⭐ Best Day
                                </div>
                                <div className="text-light small">
                                  {bestDay.day}:{" "}
                                  <span className="text-warning">
                                    {bestDay.calls}
                                  </span>{" "}
                                  calls
                                </div>
                              </div>

                              {/* Efficiency Score */}
                              {/* <div className="stat-item mb-3 p-2 border rounded">
                                <div className="text-primary fw-bold">⚡ Efficiency</div>
                                <div className="text-light small">
                                  <span className="text-warning">{calculateEfficiencyScore(userStats)}</span>/10 score
                                </div>
                                <div className="progress mt-1" style={{ height: '4px' }}>
                                  <div
                                    className="progress-bar bg-primary"
                                    style={{ width: `${calculateEfficiencyScore(userStats) * 10}%` }}
                                  ></div>
                                </div>
                              </div> */}

                              {/* Calls Distribution */}
                              {/* <div className="stat-item p-2 border rounded">
                                <div className="text-warning fw-bold">📊 Distribution</div>
                                <div className="text-light small">
                                  Top 3: <span className="text-success">{calculateTop3Percentage(userStats, totalCalls)}%</span> of calls
                                </div>
                                <div className="text-light small">
                                  Others: <span className="text-info">{calculateOthersPercentage(userStats, totalCalls)}%</span> of calls
                                </div>
                              </div> */}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="mt-4 pt-3 border-top opacity-50 border-secondary">
                    <div className="row text-center">
                      <div className="col">
                        <span className="legend perf-none">No Calls (0)</span>
                      </div>
                      <div className="col">
                        <span className="legend perf-poor">Poor (1-20)</span>
                      </div>
                      <div className="col">
                        <span className="legend perf-avg">Avarage (21-40)</span>
                      </div>
                      <div className="col">
                        <span className="legend perf-good">Good (41-60)</span>
                      </div>
                      <div className="col">
                        <span className="legend perf-vgood">
                          Very Good (61-80)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Call Through Tab */}
        {activeTab === "callThrough" && (
          <div className="tab-pane fade show active">
            {/* ---------- Call Through Summary (kept markup, fixed counts) ---------- */}
            <div className="d-flex align-items-center justify-content-between">
              <h4 className="mt-2 text-info">Call Through Summary</h4>
            </div>
            <CallThroughSummary
              months={months}
              workers={workers}
              activeYear={activeYear}
              normalizeSource={normalizeSource}
              getBaseDate={getBaseDate}
              callThroughOptions={callThroughOptions}
              selectedSource={selectedSource}
            />
          </div>
        )}
      </div>

      {/* MODAL */}
      {isModalOpen && selectedWorker && (
        <WorkerCallModal
          key={`${selectedWorker?.id}-${isEditMode ? "edit" : "view"}`}
          isOpen={isModalOpen}
          worker={{
            ...selectedWorker,
            comments: Array.isArray(selectedWorker?.comments)
              ? selectedWorker.comments
              : [],
          }}
          isEdit={isEditMode}
          isEditMode={isEditMode}
          mode={isEditMode ? "edit" : "view"}
          readOnly={!isEditMode}
          onRequestEdit={() => setIsEditMode(true)}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedWorker(null);
            setIsEditMode(false);
          }}
          onSave={async (updated) => {
            try {
              if (isEditMode && selectedWorker?.id) {
                await firebaseDB
                  .child(`WorkerCallData/${selectedWorker.id}`)
                  .update(updated || {});
                setWorkers((prev) =>
                  prev.map((x) =>
                    x.id === selectedWorker.id
                      ? { ...x, ...(updated || {}) }
                      : x
                  )
                );
              }
            } catch (err) {
              console.error("Save failed:", err);
              alert("Failed to save changes");
            } finally {
              setIsModalOpen(false);
              setSelectedWorker(null);
              setIsEditMode(false);
            }
          }}
        />
      )}

      {/* DELETE CONFIRM */}
      {showDeleteConfirm && (
        <div
          className="modal show d-block"
          tabIndex="-1"
          style={{ backgroundColor: "rgba(0,0,0,0.8)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content bg-dark text-white border-info">
              <div className="modal-header border-info">
                <h5 className="modal-title">Confirm Delete</h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowDeleteConfirm(false)}
                />
              </div>
              <div className="modal-body">
                <p>
                  Are you sure you want to delete{" "}
                  <strong>{selectedWorker?.name || "this worker"}</strong>?
                </p>
              </div>
              <div className="modal-footer border-info">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={handleDeleteConfirmed}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DELETE REASON */}
      {showDeleteReason && (
        <div
          className="modal show d-block"
          tabIndex="-1"
          style={{ backgroundColor: "rgba(0,0,0,0.8)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content ">
              <div className="modal-header">
                <h5 className="modal-title">Delete Reason</h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowDeleteReason(false)}
                />
              </div>
              <div className="modal-body">
                <textarea
                  className="form-control"
                  rows="4"
                  placeholder="Please describe why you are deleting this record…"
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                />
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowDeleteReason(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  disabled={isDeleting}
                  onClick={performDeleteWithReason}
                >
                  {isDeleting ? "Deleting…" : "Confirm Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Styles: bars, pie, and performance text colors (no table backgrounds) */}
      <style>{`
        .bar-graph { display:grid; grid-template-columns: repeat(31, minmax(6px,1fr)); gap:6px; align-items:end; height:220px; }
        .bar { position:relative; background: var(--perf-avg); border-radius:3px 3px 0 0; }
        .bar .bar-label { position:absolute; bottom:-18px; left:50%; transform:translateX(-50%); font-size:10px; color:#999; }
        .legend { display:inline-flex; align-items:center; gap:6px; padding:2px 8px; border-radius:999px; }
        .legend::before { content:""; display:inline-block; width:12px; height:12px; border-radius:50%; background: currentColor; }
        .perf-none { color: var(--perf-none); }
        .perf-poor { color: var(--perf-poor); }
        .perf-avg { color: var(--perf-avg); }
        .perf-good { color: var(--perf-good); }
        .perf-vgood { color: var(--perf-vgood); }
        .perf-exc { color: var(--perf-exc); }
        .perf-marv { color: var(--perf-marv); }

        .mChart.perf-poor { background-color: var(--perf-poor); }
        .mChart.perf-avg { background-color: var(--perf-avg); }
        .mChart.perf-good { background-color: var(--perf-good); }
        .mChart.perf-vgood { background-color: var(--perf-vgood); }
        .mChart.perf-exc { background-color: var(--perf-exc); }
        .mChart.perf-marv { background-color: var(--perf-marv); }
        .perf-text.perf-none, .perf-text.perf-poor, .perf-text.perf-avg, .perf-text.perf-good, .perf-text.perf-vgood, .perf-text.perf-exc, .perf-text.perf-marv { font-weight:600; }
        .pie-wrap { width:180px; height:180px; display:grid; place-items:center; }
        .pie { width:160px; height:160px; border-radius:50%; }
        :root {
          --perf-none:#44434e;
          --perf-poor:#dc3545;
          --perf-avg:#ffc107;
          --perf-good:#0dcaf0;
          --perf-vgood:#20c997;
          --perf-exc:#198754;
          --perf-marv:#6f42c1;
        }

        /* Tabs Styles */
        .dark-tabs {
          border-bottom: 2px solid #444;
        }
        .dark-tabs .nav-link {
          color: #ccc;
          background: transparent;
          border: 1px solid transparent;
          border-bottom: none;
          margin-bottom: -2px;
        }
        .dark-tabs .nav-link:hover {
          color: #fff;
          border-color: #666;
        }
        .dark-tabs .nav-link.active {
          color: #fff;
          background: #007bff;
          border-color: #007bff;
        }
      `}</style>
    </div>
  );
}

/* ---------- Call Through Summary (with Unknown month for no-date records) ---------- */
function CallThroughSummary({
  months,
  workers,
  activeYear,
  normalizeSource,
  getBaseDate,
  callThroughOptions,
  selectedSource,
}) {
  const monthSummary = useMemo(() => {
    const summary = {};
    callThroughOptions.forEach((t) => {
      summary[t] = Array(13).fill(0); // 12 months + 1 Unknown column
    });

    workers.forEach((w) => {
      // Apply source filter
      if (selectedSource && selectedSource !== "All") {
        const workerSource = normalizeSource(
          w?.callThrough || w?.through || w?.source || ""
        );
        if (workerSource !== selectedSource) return;
      }

      const d = parseDate(getBaseDate(w));
      const srcLabel = normalizeSource(
        w?.callThrough || w?.through || w?.source || ""
      );
      const bucket = callThroughOptions.includes(srcLabel) ? srcLabel : "Other";

      if (isValidDate(d) && d.getFullYear() === activeYear) {
        // Has valid date and matches active year - put in proper month
        const m = d.getMonth();
        summary[bucket][m] = (summary[bucket][m] || 0) + 1;
      } else {
        // No valid date or wrong year - put in Unknown column (index 12)
        summary[bucket][12] = (summary[bucket][12] || 0) + 1;
      }
    });
    return summary;
  }, [workers, activeYear, callThroughOptions, selectedSource]);

  const totalsPerMonth = useMemo(() => {
    const t = Array(13).fill(0); // 12 months + 1 Unknown
    Object.keys(monthSummary).forEach((k) => {
      monthSummary[k].forEach((v, mi) => {
        t[mi] += v;
      });
    });
    return t;
  }, [monthSummary]);

  const grandTotal = useMemo(
    () => totalsPerMonth.reduce((a, b) => a + b, 0),
    [totalsPerMonth]
  );

  {
    /* Table -3 */
  }
  return (
    <div className="table-responsive mt-2">
      <table
        className="table table-dark summary-table table-hover"
        style={{ fontSize: "12px" }}
      >
        <thead className="summary-table-header">
          <tr>
            <th>Call Through</th>
            {months.map((m, mi) => (
              <th key={m}>{m}</th>
            ))}
            <th className="unKnonMonth text-info">Miss </th>
            <th className="text-warning fw-bold">Total</th>
          </tr>
        </thead>
        <tbody>
          {callThroughOptions.map((t) => {
            const rowData = monthSummary[t] || Array(13).fill(0);
            const rowTotal = rowData.reduce((a, b) => a + b, 0);

            return (
              <tr key={t} className="summary-table-row">
                <td className="source-name text-info">{t}</td>
                {/* Monthly counts */}
                {rowData.slice(0, 12).map((count, idx) => (
                  <td key={idx}>{count > 0 ? count : ""}</td>
                ))}
                {/* Unknown month count */}
                <td className="unKnonMonth text-center fw-bold">
                  {rowData[12] > 0 ? rowData[12] : ""}
                </td>
                <td className="total-cell text-warning fw-bold">{rowTotal}</td>
              </tr>
            );
          })}
          <tr className="summary-table-row fw-bold">
            <td className="totalRow">Total</td>
            {/* Monthly totals */}
            {totalsPerMonth.slice(0, 12).map((sum, mi) => (
              <td className="totalRow " key={mi}>
                {sum > 0 ? sum : ""}
              </td>
            ))}
            {/* Unknown month total */}
            <td className="unKnonMonth text-center fw-bold">
              {totalsPerMonth[12] > 0 ? totalsPerMonth[12] : ""}
            </td>
            <td className="total-cell bg-primary text-white">{grandTotal}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
