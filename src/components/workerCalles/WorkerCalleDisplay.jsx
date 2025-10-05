// src/components/workerCalles/WorkerCalleDisplay.jsx
import React, { useEffect, useMemo, useState } from "react";
import firebaseDB from "../../firebase";
import WorkerCallModal from "./WorkerCallModal";
import viewIcon from "../../assets/view.svg";
import editIcon from "../../assets/eidt.svg";
import deleteIcon from "../../assets/delete.svg";
import * as XLSX from "xlsx";

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
const urgencyClass = (v) => {
  const du = daysUntil(v);
  if (!isFinite(du)) return "";
  if (du < 0) return "reminder-overdue";
  if (du === 0) return "reminder-today";
  if (du === 1) return "reminder-tomorrow";
  return "reminder-upcoming";
};
const reminderBadgeClass = (v) => {
  const du = daysUntil(v);
  if (!isFinite(du)) return "bg-secondary";
  if (du < 0) return "bg-danger";
  if (du === 0) return "bg-warning text-dark";
  if (du === 1) return "bg-info text-dark";
  return "bg-success";
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
  const s = ["th", "st", "nd", "rd"], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

const formatPrettyDate = (v) => {
  const d = parseDate(v);
  if (!isValidDate(d)) return "—";
  const day = d.getDate();
  const month = d.toLocaleString("en-GB", { month: "short" }); // Jan, Feb, Mar...
  const year = String(d.getFullYear()).slice(-2); // only last 2 digits
  return `${ordinal(day)}- ${month}- ${year}`;
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

const isWorkerShape = (v) => {
  if (!v || typeof v !== "object") return false;
  return Boolean(
    v.name ||
    v.mobileNo ||
    v.location ||
    v.gender ||
    v.skills ||
    v.conversationLevel ||
    v.callThrough ||
    v.through ||
    v.source
  );
};
function collectWorkersFromSnapshot(rootSnap) {
  const rows = [];
  if (!rootSnap.exists()) return rows;
  const walk = (snap, depth = 1) => {
    if (!snap) return;
    const val = snap.val();
    if (isWorkerShape(val)) {
      rows.push({ id: snap.key, ...val });
      return;
    }
    if (typeof val === "object" && snap.hasChildren() && depth < 3) {
      snap.forEach((child) => walk(child, depth + 1));
    }
  };
  rootSnap.forEach((child) => walk(child, 1));
  return rows;
}
const calculateAge = (dob, directAge = null) => {
  if (directAge != null) {
    const n = Number(String(directAge).replace(/[^\d.]/g, ""));
    if (!Number.isNaN(n)) return Math.floor(n);
  }
  if (!dob) return null;
  const d = parseDate(dob);
  if (!isValidDate(d)) return null;
  const t = new Date();
  let a = t.getFullYear() - d.getFullYear();
  const m = t.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && t.getDate() < d.getDate())) a--;
  return a;
};
const parseExperienceYears = (exp) => {
  if (exp == null) return null;
  if (typeof exp === "number") return exp;
  const m = String(exp).match(/(\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : null;
};
const calculateExperience = (w) => {
  const candidates = [
    w?.years, // DB field
    w?.experience,
    w?.exp,
    w?.workExperience,
    w?.experienceYears,
    w?.totalExperience,
    w?.expInYears,
    w?.experience_years,
  ];
  for (const c of candidates) {
    const v = parseExperienceYears(c);
    if (v != null && !Number.isNaN(v)) return v;
  }
  return null;
};
const normalizeSource = (raw) => {
  if (!raw) return "Other";
  const s = String(raw).trim().toLowerCase();
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
const getWorkerRoles = (w) => {
  const val =
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
  return normalizeArray(val).map((s) => String(s).toLowerCase());
};
const getWorkerSkills = (w) =>
  normalizeArray(w?.skills).map((s) => String(s).toLowerCase());
const getWorkerLanguages = (w) => {
  const val =
    w?.languages ?? w?.language ?? w?.knownLanguages ?? w?.speaks ?? "";
  return normalizeArray(val).map((s) => String(s).toLowerCase());
};
const formatWorkerId = (firebaseId, index) =>
  `WC-${String(index + 1).padStart(3, "0")}`;

// Added: more robust base date resolver (keeps logic, just extra fallbacks)
const getBaseDate = (w) =>
  w?.date ??
  w?.createdAt ??
  w?.createdDate ??
  w?.createdOn ??
  w?.timestamp ??
  w?.created_time ??
  w?.created_time_ms ??
  null;

/* =============================
   Permissions
   ============================= */
const derivePermissions = (currentUserRole, explicit) => {
  const base = {
    canView: true,
    canEdit: false,
    canDelete: false,
    canExport: false,
  };
  if (explicit && typeof explicit === "object") {
    return {
      canView: explicit.view ?? base.canView,
      canEdit: explicit.edit ?? base.canEdit,
      canDelete: explicit.delete ?? base.canDelete,
      canExport: explicit.export ?? base.canExport,
    };
  }
  const role = String(currentUserRole || "viewer").toLowerCase();
  if (role === "admin")
    return { canView: true, canEdit: true, canDelete: true, canExport: true };
  if (role === "editor" || role === "manager")
    return { canView: true, canEdit: true, canDelete: false, canExport: false };
  return base; // viewer
};

/* =============================
   Component
   ============================= */
export default function WorkerCalleDisplay({
  currentUserRole = "admin",
  permissions: permissionsProp,
}) {
  // permissions
  const permissions = derivePermissions(currentUserRole, permissionsProp);

  // data
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // modal
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  // delete
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeleteReason, setShowDeleteReason] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [selectedLanguages, setSelectedLanguages] = useState([]);
  const [selectedGender, setSelectedGender] = useState([]);
  const [reminderFilter, setReminderFilter] = useState("");
  const [selectedSource, setSelectedSource] = useState("All");
  const [skillMode, setSkillMode] = useState("single");
  const [timeFormat, setTimeFormat] = useState("24hr");

  // Age & Experience filters
  const [ageRange, setAgeRange] = useState({ min: "", max: "" });
  const [experienceRange, setExperienceRange] = useState({ min: "", max: "" });

  const [showJobRoles, setShowJobRoles] = useState(false);

  // sort
  const [sortBy, setSortBy] = useState("id");
  const [sortDir, setSortDir] = useState("desc");

  // pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // options
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
  ];
  const skillOptions = [
    "Nursing",
    "Cooking",
    "Patient Care",
    "Care Taker",
    "Old Age Care",
    "Baby Care",
    "Bedside Attender",
    "Supporting",
    "Daiper",
    "Any Duty",
    "Others",
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
    "Driver",
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

  // charts
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
  const [activeMonth, setActiveMonth] = useState(null); // 0-11 or null

  /* --- FETCH --- */
  useEffect(() => {
    const ref = firebaseDB.child("WorkerCallData");
    const cb = ref.on("value", (snap) => {
      try {
        const list = collectWorkersFromSnapshot(snap);
        const enriched = list.map((w) => ({
          ...w,
          date: getBaseDate(w),
        }));
        setWorkers(enriched);
        setLoading(false);
      } catch (e) {
        setError(e.message || "Failed to load data");
        setLoading(false);
      }
    });
    return () => ref.off("value", cb);
  }, []);

  /* badge counts */
  const badgeCounts = useMemo(() => {
    const c = { overdue: 0, today: 0, tomorrow: 0, upcoming: 0 };
    workers.forEach((w) => {
      const reminder = w?.callReminderDate || w?.reminderDate;
      const du = daysUntil(reminder);
      if (!isFinite(du)) return;
      if (du < 0) c.overdue++;
      else if (du === 0) c.today++;
      else if (du === 1) c.tomorrow++;
      else c.upcoming++;
    });
    return c;
  }, [workers]);

  /* filtering */
  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return workers.filter((w) => {
      if (term) {
        const hay = `${String(w?.name ?? "").toLowerCase()} ${String(
          w?.location ?? ""
        ).toLowerCase()} ${String(w?.mobileNo ?? "").toLowerCase()}`;
        if (!hay.includes(term)) return false;
      }
      if (selectedGender.length > 0) {
        const g = String(w?.gender ?? "").toLowerCase();
        if (!selectedGender.map((x) => String(x).toLowerCase()).includes(g))
          return false;
      }
      const haveSkills = getWorkerSkills(w),
        haveRoles = getWorkerRoles(w),
        haveLangs = getWorkerLanguages(w);
      const wantSkills = selectedSkills.map((s) => String(s).toLowerCase()),
        wantRoles = selectedRoles.map((s) => String(s).toLowerCase()),
        wantLangs = selectedLanguages.map((s) => String(s).toLowerCase());
      if (skillMode === "single") {
        if (
          wantSkills.length > 0 &&
          !wantSkills.some((s) => haveSkills.includes(s))
        )
          return false;
        if (
          wantRoles.length > 0 &&
          !wantRoles.some((s) => haveRoles.includes(s))
        )
          return false;
        if (
          wantLangs.length > 0 &&
          !wantLangs.some((s) => haveLangs.includes(s))
        )
          return false;
      } else {
        if (
          wantSkills.length > 0 &&
          !wantSkills.every((s) => haveSkills.includes(s))
        )
          return false;
        if (
          wantRoles.length > 0 &&
          !wantRoles.every((s) => haveRoles.includes(s))
        )
          return false;
        if (
          wantLangs.length > 0 &&
          !wantLangs.every((s) => haveLangs.includes(s))
        )
          return false;
      }
      if (reminderFilter) {
        const reminder = w?.callReminderDate || w?.reminderDate;
        const du = daysUntil(reminder);
        if (!isFinite(du)) return false;
        if (reminderFilter === "overdue" && !(du < 0)) return false;
        if (reminderFilter === "today" && du !== 0) return false;
        if (reminderFilter === "tomorrow" && du !== 1) return false;
        if (reminderFilter === "upcoming" && !(du >= 2)) return false;
      }
      if (selectedSource !== "All") {
        const src = normalizeSource(
          w?.callThrough || w?.through || w?.source || ""
        );
        if (src !== selectedSource) return false;
      }

      // Age filter
      const age = calculateAge(
        w?.dateOfBirth || w?.dob || w?.birthDate,
        w?.age
      );
      if (ageRange.min && age != null && age < parseInt(ageRange.min, 10))
        return false;
      if (ageRange.max && age != null && age > parseInt(ageRange.max, 10))
        return false;

      // Experience filter (includes w.years)
      const expYears = calculateExperience(w);
      if (
        experienceRange.min &&
        expYears != null &&
        expYears < parseFloat(experienceRange.min)
      )
        return false;
      if (
        experienceRange.max &&
        expYears != null &&
        expYears > parseFloat(experienceRange.max)
      )
        return false;

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
    ageRange,
    experienceRange,
  ]);

  /* sorting */
  const sorted = useMemo(() => {
    const arr = [...filtered];
    const dir = sortDir === "asc" ? 1 : -1;
    arr.sort((a, b) => {
      if (sortBy === "name")
        return (
          dir *
          String(a?.name ?? "")
            .toLowerCase()
            .localeCompare(String(b?.name ?? "").toLowerCase())
        );
      if (sortBy === "callReminderDate") {
        const da = parseDate(a?.callReminderDate || a?.reminderDate),
          db = parseDate(b?.callReminderDate || b?.reminderDate);
        const av = isValidDate(da) ? da.getTime() : Number.POSITIVE_INFINITY;
        const bv = isValidDate(db) ? db.getTime() : Number.POSITIVE_INFINITY;
        return dir * (av - bv);
      }
      return (
        dir *
        String(a?.id ?? "")
          .toLowerCase()
          .localeCompare(String(b?.id ?? "").toLowerCase())
      );
    });
    return arr;
  }, [filtered, sortBy, sortDir]);

  // ---------- YEAR / MONTH / DAY SUMMARY ----------
  const years = useMemo(() => {
    const ys = new Set();
    workers.forEach((w) => {
      const d = parseDate(getBaseDate(w));
      if (isValidDate(d)) ys.add(d.getFullYear());
    });
    const sortedYs = Array.from(ys).sort((a, b) => a - b);
    return sortedYs.length ? sortedYs : [new Date().getFullYear()];
  }, [workers]);

  useEffect(() => {
    if (!years.includes(activeYear)) {
      setActiveYear(years[years.length - 1]);
      setActiveMonth(null);
    }
  }, [years, activeYear]);

  const monthSummary = useMemo(() => {
    const summary = {};
    callThroughOptions.forEach((t) => {
      summary[t] = Array(12).fill(0);
    });

    workers.forEach((w) => {
      const d = parseDate(getBaseDate(w));
      if (!isValidDate(d) || d.getFullYear() !== activeYear) return;

      const m = d.getMonth();
      const srcRaw = (w?.callThrough || w?.through || w?.source || "").trim();
      const normalizedSource = normalizeSource(srcRaw);
      const matchingOption = callThroughOptions.find(
        (opt) => opt === normalizedSource
      );

      if (matchingOption) {
        summary[matchingOption][m] += 1;
      }
    });
    return summary;
  }, [workers, activeYear]);

  const daySummary = useMemo(() => {
    if (activeMonth === null) return null;
    const daysInMonth = new Date(activeYear, activeMonth + 1, 0).getDate();
    const summary = {};
    callThroughOptions.forEach((t) => {
      summary[t] = Array(daysInMonth).fill(0);
    });

    workers.forEach((w) => {
      const d = parseDate(getBaseDate(w));
      if (
        !isValidDate(d) ||
        d.getFullYear() !== activeYear ||
        d.getMonth() !== activeMonth
      )
        return;

      const day = d.getDate(); // 1..days
      const srcRaw = (w?.callThrough || w?.through || w?.source || "").trim();
      const normalizedSource = normalizeSource(srcRaw);
      const matchingOption = callThroughOptions.find(
        (opt) => opt === normalizedSource
      );

      if (matchingOption) {
        summary[matchingOption][day - 1] += 1;
      }
    });
    return summary;
  }, [workers, activeYear, activeMonth]);

  const totalRowStyle = { background: "#122438" };

  /* pagination */
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(sorted.length / rowsPerPage)),
    [sorted, rowsPerPage]
  );
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
    selectedGender,
    selectedSkills,
    selectedRoles,
    selectedLanguages,
    skillMode,
    reminderFilter,
    selectedSource,
    ageRange,
    experienceRange,
    rowsPerPage,
  ]);

  const getDisplayedPageNumbers = () => {
    const maxBtns = 9,
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

  /* actions */
  const handleView = (w) => {
    if (!permissions.canView) return;
    setSelectedWorker(w);
    setIsEditMode(false);
    setIsModalOpen(true);
  };
  const handleEdit = (w, e) => {
    e?.stopPropagation?.();
    setSelectedWorker(w);
    setIsEditMode(true);
    setIsModalOpen(true);
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
      const payload = {
        ...selectedWorker,
        originalId: selectedWorker.id,
        deletedAt: new Date().toISOString(),
        deleteReason: deleteReason.trim(),
      };
      await firebaseDB
        .child(`WorkerCalDeletedData/${selectedWorker.id}`)
        .set(payload);
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

  /* export */
  const handleExport = () => {
    if (!permissions.canExport) return;
    const exportData = sorted.map((w, i) => {
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

      return {
        "S.No": i + 1,
        "WC Id": formatWorkerId(w.id, i),
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
    XLSX.writeFile(wb, "WorkerCallData.xlsx");
  };


  const hasActiveFilters = useMemo(() => {
    return Boolean(
      searchTerm ||
      selectedSkills.length ||
      selectedRoles.length ||
      selectedLanguages.length ||
      selectedGender.length ||
      reminderFilter ||
      (selectedSource && selectedSource !== "All") ||
      skillMode !== "single" ||
      timeFormat !== "24hr" ||
      ageRange.min || ageRange.max ||
      experienceRange.min || experienceRange.max ||
      sortBy !== "id" || sortDir !== "desc" ||
      rowsPerPage !== 10 || currentPage !== 1 ||
      showJobRoles
    );
  }, [searchTerm, selectedSkills, selectedRoles, selectedLanguages, selectedGender, reminderFilter, selectedSource, skillMode, timeFormat, ageRange, experienceRange, sortBy, sortDir, rowsPerPage, currentPage, showJobRoles]);

  const resetFilters = () => {
    setSearchTerm("");
    setSelectedSkills([]);
    setSelectedRoles([]);
    setSelectedLanguages([]);
    setSelectedGender([]);
    setReminderFilter("");
    setSelectedSource("All");
    setSkillMode("single");
    setTimeFormat("24hr");
    setAgeRange({ min: "", max: "" });
    setExperienceRange({ min: "", max: "" });
    setSortBy("id");
    setSortDir("desc");
    setRowsPerPage(10);
    setCurrentPage(1);
    setShowJobRoles(false);
  };

  if (loading) return <div className="text-center my-5">Loading…</div>;
  if (error) return <div className="alert alert-danger">Error: {error}</div>;

  return (
    <div className="workerCalls">
      {/* top controls */}
      <div className="d-flex justify-content-between flex-wrap gap-2 mb-3 p-2 bg-dark border rounded-3">
        <div className="d-flex align-items-center">
          <span className="me-2 text-white opacity-75">Show</span>
          <select
            className="form-select form-select-sm"
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
          <span className="ms-2 text-white opacity-75">Entries</span>
        </div>

        <input
          type="text"
          className="form-control opacity-75"
          placeholder="Search name, location, mobile…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ maxWidth: 325 }}
        />

        <select
          className="form-select opacity-75"
          style={{ maxWidth: 220 }}
          value={selectedSource}
          onChange={(e) => setSelectedSource(e.target.value)}
        >
          <option value="All">All Call Through</option>
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
            "Just Dial",
            "News Paper",
            "Other",
          ].map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>

        <div className="d-flex gap-2">
          <select
            className="form-select opacity-75"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="id">Sort by ID</option>
            <option value="name">Sort by Name</option>
            <option value="callReminderDate">Sort by Reminder Date</option>
          </select>
          <select
            className="form-select opacity-75"
            value={sortDir}
            onChange={(e) => setSortDir(e.target.value)}
          >
            <option value="desc">Desc</option>
            <option value="asc">Asc</option>
          </select>
        </div>

        <div className="d-flex gap-2">
          {permissions.canExport && (
            <button className="btn btn-success" onClick={handleExport}>
              Export Excel
            </button>
          )}
          <button className={`btn btn-danger ${hasActiveFilters ? "btn-pulse" : ""}`} onClick={resetFilters}>
            Reset
          </button>
        </div>
      </div>

      {/* reminder badges as filters */}
      <div className="alert alert-info text-info d-flex justify-content-around flex-wrap reminder-badges mb-4">
        {["overdue", "today", "tomorrow", "upcoming"].map((k) => (
          <span
            key={k}
            role="button"
            className={`reminder-badge ${k} ${reminderFilter === k ? "active" : ""
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

      {/* Filter row */}
      <div className="p-3 mb-3 bg-dark border rounded-3">
        <div className="row g-3 align-items-center justify-content-between">
          <div className="col-lg-2 col-md-3 text-center">
            <label className="form-label text-white small mb-2">Gender</label>
            <div className="d-flex gap-2 justify-content-center">
              {["Male", "Female"].map((g) => {
                const on = selectedGender.includes(g);
                return (
                  <button
                    key={g}
                    type="button"
                    className={`btn ${on ? "btn-warning" : "btn-outline-warning"
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
            <label className="form-label text-white small mb-2">
              Skill Match
            </label>
            <div className="d-flex gap-2 justify-content-center">
              <button
                type="button"
                className={`btn ${skillMode === "single" ? "btn-info" : "btn-outline-info"
                  } btn-sm`}
                onClick={() => setSkillMode("single")}
              >
                Any Skill
              </button>
              <button
                type="button"
                className={`btn ${skillMode === "multi" ? "btn-info" : "btn-outline-info"
                  } btn-sm`}
                onClick={() => setSkillMode("multi")}
              >
                All Skills
              </button>
            </div>
          </div>

          <div className="col-lg-1 col-md-3 text-center">
            <label className="form-label text-white small mb-2">Time</label>
            <div className="d-flex gap-2 justify-content-center">

              <button
                type="button"
                className={`btn ${timeFormat === "24hr" ? "btn-primary" : "btn-outline-primary"
                  } btn-sm`}
                onClick={() => setTimeFormat("24hr")}
              >
                24hr
              </button>

              <button
                type="button"
                className={`btn ${timeFormat === "12hr" ? "btn-primary" : "btn-outline-primary"
                  } btn-sm`}
                onClick={() => setTimeFormat("12hr")}
              >
                12hr
              </button>

            </div>
          </div>

          {/* Age filter (18–55) */}
          <div className="col-lg-2 col-md-6 text-center">
            <label className="form-label text-white small mb-1">Age</label>
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

          {/* Experience filter (years) */}
          <div className="col-lg-2 col-md-6 text-center">
            <label className="form-label text-white small mb-1">
              Experience (yrs)
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
                  setExperienceRange((r) => ({ ...r, min: e.target.value }))
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
                  setExperienceRange((r) => ({ ...r, max: e.target.value }))
                }
              />
            </div>
          </div>

          {/* Toggle: Job Roles — styled via CSS below */}
          <div className="col-lg-1 col-md-2 text-center">
            <label className="form-label text-white small mb-2">
              Job Roles
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
                    className={`btn btn-sm ${active ? "btn-info text-dark" : "btn-outline-info"
                      } rounded-pill`}
                    onClick={() =>
                      setSelectedLanguages((prev) =>
                        active ? prev.filter((x) => x !== l) : [...prev, l]
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
                    className={`btn btn-sm ${active
                      ? "btn-outline-warning btn-warning text-black"
                      : "btn-outline-warning"
                      } rounded-pill`}
                    onClick={() =>
                      setSelectedSkills((prev) =>
                        active ? prev.filter((x) => x !== s) : [...prev, s]
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
          <h6 className="mb-2 text-warning">Job Roles</h6>
          <div className="d-flex flex-wrap gap-2">
            {roleOptions.map((r) => {
              const active = selectedRoles.includes(r);
              return (
                <button
                  key={r}
                  className={`btn btn-sm ${active ? "btn-success" : "btn-outline-success"
                    } rounded-pill`}
                  onClick={() =>
                    setSelectedRoles((prev) =>
                      active ? prev.filter((x) => x !== r) : [...prev, r]
                    )
                  }
                >
                  {r}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* status line */}
      <div className="mb-2 mt-4 small text-center" style={{ color: "yellow" }}>
        Showing <strong>{pageItems.length}</strong> of{" "}
        <strong>{sorted.length}</strong> (from <strong>{workers.length}</strong>{" "}
        total)
        {reminderFilter ? ` — ${reminderFilter}` : ""}
      </div>

      {/* TOP pagination */}
      {Math.ceil(sorted.length / rowsPerPage) > 1 && (
        <nav
          aria-label="Workers"
          className="pagination-top py-2 mb-3 m-auto pagination-wrapper"
        >
          <ul className="pagination justify-content-center mb-0">
            <li className={`page-item ${safePage === 1 ? "disabled" : ""}`}>
              <button
                className="page-link"
                onClick={() => setCurrentPage(1)}
                disabled={safePage === 1}
              >
                «
              </button>
            </li>
            <li className={`page-item ${safePage === 1 ? "disabled" : ""}`}>
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
                className={`page-item ${safePage === num ? "active" : ""}`}
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
              className={`page-item ${safePage === totalPages ? "disabled" : ""
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
              className={`page-item ${safePage === totalPages ? "disabled" : ""
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

      {/* table */}
      <div className="table-responsive">
        <table className="table table-dark table-hover align-middle">
          <thead>
            <tr>
              <th>S.No</th>
              <th>ID</th>
              <th>Date</th>
              <th>Name</th>
              <th>Gender</th>
              <th>Age</th>
              <th>Experience</th>
              <th>Reminder</th>
              <th>Skills</th>

              {/* Keep but hide: Languages, Call Through */}
              <th style={{ display: "none" }}>Languages</th>
              <th>Mobile</th>
              <th>Talking</th>
              <th style={{ display: "none" }}>Call Through</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((w, i) => {
              const globalIndex = sorted.findIndex((x) => x.id === w.id);

              const reminder = w?.callReminderDate || w?.reminderDate || null;
              const hasReminder = isValidDate(parseDate(reminder));
              const du = hasReminder
                ? daysUntil(reminder)
                : Number.POSITIVE_INFINITY;
              const duText = hasReminder
                ? du === 0
                  ? "in 0 days (today)"
                  : du > 0
                    ? `in ${du} day${du > 1 ? "s" : ""}`
                    : `${Math.abs(du)} day${Math.abs(du) > 1 ? "s" : ""} ago`
                : "";
              const timeStr = hasReminder
                ? timeFormat === "24hr"
                  ? formatTime(reminder, "24")
                  : formatTime(reminder, "12hr")
                : "";

              const comms =
                (w?.communications ??
                  w?.communication ??
                  w?.conversation ??
                  w?.conversationLevel ??
                  "") ||
                "";
              const callThrough = normalizeSource(
                w?.callThrough || w?.through || w?.source || ""
              );

              const age = calculateAge(
                w?.dateOfBirth || w?.dob || w?.birthDate,
                w?.age
              );
              const experience = calculateExperience(w);

              // Username fallbacks (added more)
              const rawUser =
                w?.addedBy ||
                w?.createdBy ||
                w?.userName ||
                w?.username ||
                w?.addedUserName ||
                w?.addedByName ||
                w?.added_user ||
                w?.createdUser ||
                w?.created_by ||
                w?.createdByName ||
                w?.createdUserName ||
                w?.createdby ||
                (w?.user &&
                  (w?.user?.name ||
                    w?.user?.displayName ||
                    w?.user?.userName ||
                    w?.user?.email)) ||
                (w?.meta &&
                  (w?.meta?.userName ||
                    w?.meta?.createdBy ||
                    w?.meta?.email)) ||
                "";

              const addedBy = String(rawUser || "")
                .replace(/@.*/, "") // if email, keep prefix
                .trim();

              return (
                <tr
                  key={w.id}
                  onClick={(e) => handleRowClick(w, e)}
                  style={{ cursor: "pointer" }}
                  className={urgencyClass(reminder)}
                >
                  <td>{globalIndex + 1}</td>
                  <td>{formatWorkerId(w.id, globalIndex)}</td>
                  <td>{formatPrettyDate(getBaseDate(w))}</td>
                  <td>{w?.name || "—"}</td>
                  <td>
                    <span
                      className={
                        w?.gender === "Male"
                          ? "badge bg-primary"
                          : w?.gender === "Female"
                            ? "badge badge-female"
                            : "badge bg-secondary"
                      }
                    >
                      {w?.gender || "—"}
                    </span>
                  </td>
                  <td>{age ?? "—"}</td>
                  <td>
                    {typeof experience === "number" ? `${experience} yrs` : "—"}
                  </td>
                  <td>
                    <span className={`badge ${reminderBadgeClass(reminder)}`}>
                      {hasReminder ? formatDDMMYYYY(reminder) : "N/A"}
                    </span>
                    {hasReminder && (
                      <small className="d-block text-muted">{timeStr}</small>
                    )}
                    {hasReminder && duText && (
                      <small className="d-block text-info">{duText}</small>
                    )}
                    {addedBy && (
                      <small className="d-block text-success">
                        by {addedBy}
                      </small>
                    )}
                  </td>
                  <td>
                    <div className="d-flex flex-wrap gap-1">
                      {getWorkerSkills(w)
                        .slice(0, 3)
                        .map((skill, idx) => (
                          <span key={idx} className="badge bg-info text-dark">
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

                  {/* Keep but hide: Languages */}
                  <td style={{ display: "none" }}>
                    <div className="d-flex flex-wrap gap-1">
                      {getWorkerLanguages(w)
                        .slice(0, 3)
                        .map((lang, idx) => (
                          <span key={idx} className="badge bg-secondary">
                            {lang}
                          </span>
                        ))}
                      {getWorkerLanguages(w).length > 3 && (
                        <span className="badge bg-secondary">
                          +{getWorkerLanguages(w).length - 3}
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="text-white">
                    <div className="fw-normal">{w?.mobileNo || "N/A"}</div>
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
                          href={`https://wa.me/${String(w.mobileNo).replace(
                            /\D/g,
                            ""
                          )}?text=${encodeURIComponent(
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
                      className={`badge ${comms.toLowerCase().includes("good")
                        ? "bg-success"
                        : comms.toLowerCase().includes("average")
                          ? "bg-warning text-dark"
                          : "bg-secondary"
                        }`}
                    >
                      {comms || "—"}
                    </span>
                  </td>

                  {/* Keep but hide: Call Through */}
                  <td style={{ display: "none" }}>
                    <span className="badge bg-secondary">{callThrough}</span>
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
                <td colSpan="14">
                  <div className="alert alert-warning mb-0">
                    No records match your filters.
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ---------- YEAR / MONTH / DAY SUMMARY UI ---------- */}
      <hr />
      <h4 className="mt-4">Call Through Summary</h4>

      {/* Year Tabs */}
      <ul className="nav nav-tabs summary-tabs mb-3">
        {years.map((y) => (
          <li className="nav-item" key={y}>
            <button
              className={`nav-link summary-tab ${activeYear === y ? "active" : ""
                }`}
              onClick={() => {
                setActiveYear(y);
                setActiveMonth(null);
              }}
            >
              {y}
            </button>
          </li>
        ))}
      </ul>

      {/* Month-wise table */}
      <div className="table-responsive summary-table-container">
        <table
          className="table table-dark table-sm summary-table table-hover"
          style={{ fontSize: "12px", tableLayout: "fixed" }}
        >
          <thead className="summary-table-header">
            <tr>
              <th>Call Through</th>
              {months.map((m, mi) => (
                <th
                  key={m}
                  style={{ cursor: "pointer" }}
                  onClick={() => setActiveMonth(mi)}
                >
                  {m}
                </th>
              ))}
              <th>Total</th>
            </tr>
          </thead>

          <tbody>
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
              "Just Dial",
              "News Paper",
              "Other",
            ].map((t) => (
              <tr key={t} className="summary-table-row">
                <td className="source-name text-info">{t}</td>
                {(monthSummary[t] || Array(12).fill(0)).map((count, idx) => (
                  <td
                    key={idx}
                    className={count > 0 ? "has-data" : ""}
                    style={{ cursor: "pointer" }}
                    onClick={() => setActiveMonth(idx)}
                  >
                    {count > 0 ? count : ""}
                  </td>
                ))}
                <td className="total-cell">
                  {(monthSummary[t] || Array(12).fill(0)).reduce(
                    (a, b) => a + b,
                    0
                  )}
                </td>
              </tr>
            ))}
            <tr
              className="summary-table-row fw-bold"
              style={{ background: "#122438" }}
            >
              <td className="source-name text-warning">Total</td>
              {months.map((_, mi) => {
                let sum = 0;
                [
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
                ].forEach((t) => {
                  const arr = monthSummary[t] || Array(12).fill(0);
                  sum += arr[mi] || 0;
                });
                return (
                  <td className="text-warning" key={mi}>
                    {sum || ""}
                  </td>
                );
              })}
              <td className="total-cell">
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
                  "Just Dial",
                  "News Paper",
                  "Other",
                ].reduce(
                  (acc, t) =>
                    acc +
                    (monthSummary[t] || Array(12).fill(0)).reduce(
                      (a, b) => a + b,
                      0
                    ),
                  0
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Day-wise table for selected month */}
      {activeMonth !== null && (
        <div className="mt-4">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h5 className="mb-0">
              {months[activeMonth]} {activeYear} — Day-wise
            </h5>
            <button
              className="btn btn-sm btn-outline-light"
              onClick={() => setActiveMonth(null)}
            >
              Close
            </button>
          </div>
          <div className="table-responsive summary-table-container">
            <table
              className="table table-dark table-sm summary-table table-hover"
              style={{ fontSize: "12px", tableLayout: "fixed" }}
            >
              <thead className="summary-table-header">
                <tr>
                  <th>Call Through</th>
                  {Array.from(
                    {
                      length: new Date(
                        activeYear,
                        activeMonth + 1,
                        0
                      ).getDate(),
                    },
                    (_, i) => i + 1
                  ).map((d) => (
                    <th
                      key={d}
                      style={{ whiteSpace: "nowrap", padding: "2px 4px" }}
                    >
                      {d}
                    </th>
                  ))}
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
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
                  "Just Dial",
                  "News Paper",
                  "Other",
                ].map((t) => (
                  <tr key={t} className="summary-table-row">
                    <td className="source-name">{t}</td>
                    {(
                      daySummary &&
                      (daySummary[t] ||
                        Array(
                          new Date(activeYear, activeMonth + 1, 0).getDate()
                        ).fill(0))
                    ).map((count, idx) => (
                      <td
                        key={idx}
                        className={count > 0 ? "has-data" : ""}
                        style={{ whiteSpace: "nowrap", padding: "2px 4px" }}
                      >
                        {count > 0 ? count : ""}
                      </td>
                    ))}
                    <td className="total-cell">
                      {daySummary
                        ? (
                          daySummary[t] ||
                          Array(
                            new Date(activeYear, activeMonth + 1, 0).getDate()
                          ).fill(0)
                        ).reduce((a, b) => a + b, 0)
                        : 0}
                    </td>
                  </tr>
                ))}

                <tr
                  className="summary-table-row fw-bold"
                  style={{ background: "#122438" }}
                >
                  <td className="source-name text-warning">Total</td>
                  {Array.from(
                    {
                      length: new Date(
                        activeYear,
                        activeMonth + 1,
                        0
                      ).getDate(),
                    },
                    (_, di) => {
                      let sum = 0;
                      [
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
                      ].forEach((t) => {
                        const arr = daySummary
                          ? daySummary[t] ||
                          Array(
                            new Date(activeYear, activeMonth + 1, 0).getDate()
                          ).fill(0)
                          : [];
                        sum += arr[di] || 0;
                      });
                      return (
                        <td className="text-warning" key={di}>
                          {sum || ""}
                        </td>
                      );
                    }
                  )}
                  <td className="total-cell">
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
                      "Just Dial",
                      "News Paper",
                      "Other",
                    ].reduce(
                      (acc, t) =>
                        acc +
                        (daySummary
                          ? (
                            daySummary[t] ||
                            Array(
                              new Date(
                                activeYear,
                                activeMonth + 1,
                                0
                              ).getDate()
                            ).fill(0)
                          ).reduce((a, b) => a + b, 0)
                          : 0),
                      0
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

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
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Confirm Delete</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowDeleteConfirm(false)}
                />
              </div>
              <div className="modal-body">
                <p>
                  Are you sure you want to delete{" "}
                  <strong>{selectedWorker?.name || "this worker"}</strong>?
                </p>
              </div>
              <div className="modal-footer">
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
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Delete Reason</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => {
                    setShowDeleteReason(false);
                    setDeleteReason("");
                  }}
                  disabled={isDeleting}
                />
              </div>
              <div className="modal-body">
                <p>
                  Please provide a reason for deleting{" "}
                  <strong>{selectedWorker?.name || "this worker"}</strong>:
                </p>
                <textarea
                  className="form-control"
                  rows="3"
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  placeholder="Enter reason…"
                  disabled={isDeleting}
                />
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowDeleteReason(false);
                    setDeleteReason("");
                  }}
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={performDeleteWithReason}
                  disabled={isDeleting || !deleteReason.trim()}
                >
                  {isDeleting ? "Deleting..." : "Confirm Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Inline styles for requested tweaks */}
      <style>{`
        /* Female badge color */
        .badge-female { background: #ff6ea8 !important; color: #111 !important; }

        /* Nicer toggle styling for the Job Roles checkbox */
        .toggle-pill .form-check-input {
          width: 42px; height: 22px; cursor: pointer; position: relative;
          appearance: none; -webkit-appearance: none; outline: none;
          background: linear-gradient(180deg, #efb819, #f5d516); border: 1px solid rgba(255,255,255,0.15);
          border-radius: 9px !important; transition: all .2s ease;
        }
        .toggle-pill .form-check-input::after {
          content: ""; position: absolute; top: 50%; left: 3px;
          width: 16px; height: 16px; border-radius: 50%;
          background: #a9771c; transform: translateY(-50%); transition: all .2s ease;
          box-shadow: 0 1px 3px rgba(0,0,0,.4);
        }
        .toggle-pill .form-check-input:checked {
          background: linear-gradient(135deg, #0ea5e9, #7c3aed);
          border-color: transparent;
        }
        .toggle-pill .form-check-input:checked::after { left: 23px; background: #fff; }
        .toggle-pill .form-check-label { padding-left: 4px; }

        /* Pagination wrapper subtle style retained */
        .pagination-wrapper { background: #0f172a; border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; }
      `}</style>
    </div>
  );
}
