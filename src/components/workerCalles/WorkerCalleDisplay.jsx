// src/components/workerCalles/WorkerCalleDisplay.jsx
import React, { useEffect, useMemo, useState } from "react";
import firebaseDB from "../../firebase";
import WorkerCallModal from "./WorkerCallModal";
import viewIcon from "../../assets/view.svg";
import editIcon from "../../assets/eidt.svg";
import deleteIcon from "../../assets/delete.svg";
import * as XLSX from "xlsx";

/* ------------ date helpers ------------ */
const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const parseDate = (v) => {
  if (!v) return null;
  if (typeof v === "object" && v && "seconds" in v) return new Date(v.seconds * 1000);
  if (v instanceof Date && !isNaN(v.getTime())) return v;
  if (typeof v === "string") {
    const s = v.trim(); if (!s) return null;
    const iso = new Date(s); if (!isNaN(iso.getTime())) return iso;
    const parts = s.split(/[\/-]/);
    if (parts.length === 3) {
      let y, m, d;
      if (parts[0].length === 4) { y = +parts[0]; m = +parts[1] - 1; d = +parts[2]; }
      else if (+parts[0] > 12) { d = +parts[0]; m = +parts[1] - 1; y = +parts[2]; }
      else { m = +parts[0] - 1; d = +parts[1]; y = +parts[2]; }
      const dt = new Date(y, m, d); if (!isNaN(dt.getTime())) return dt;
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
  return Math.ceil((startOfDay(d) - startOfDay(new Date())) / (1000 * 60 * 60 * 24));
};
const urgencyClass = (v) => {
  const du = daysUntil(v);
  if (!isFinite(du)) return "";
  if (du < 0) return "reminder-overdue";
  if (du === 0) return "reminder-today";
  if (du === 1) return "reminder-tomorrow";
  return "reminder-upcoming";
};
const normalizeArray = (val) =>
  Array.isArray(val)
    ? val.filter(Boolean)
    : typeof val === "string"
      ? val.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

/* ------------ looks-like-a-worker detector ------------ */
const isWorkerShape = (v) => {
  if (!v || typeof v !== "object") return false;
  return Boolean(v.name || v.mobileNo || v.location || v.gender || v.skills || v.conversationLevel || v.callThrough || v.through || v.source);
};

const reminderBadgeClass = (v) => {
  const du = daysUntil(v);
  if (!isFinite(du)) return "bg-secondary";
  if (du < 0) return "bg-danger";
  if (du === 0) return "bg-warning text-dark";
  if (du === 1) return "bg-info text-dark";
  return "bg-success";
};

// Format time in 12hr or 24hr
const formatTime = (dateLike, mode = "12") => {
  const d = new Date(dateLike);
  if (isNaN(d.getTime())) return "";
  const opts =
    mode === "24"
      ? { hour12: false, hour: "2-digit", minute: "2-digit" }
      : { hour12: true, hour: "numeric", minute: "2-digit" };
  return d.toLocaleTimeString([], opts);
};

/* ------------ flatten up to depth=3 under WorkerCallData ------------ */
function collectWorkersFromSnapshot(rootSnap) {
  const rows = [];
  if (!rootSnap.exists()) return rows;
  const collectChild = (snap, depth = 1) => {
    if (!snap) return;
    const val = snap.val();
    if (isWorkerShape(val)) {
      rows.push({ id: snap.key, ...val });
      return;
    }
    if (typeof val === "object" && snap.hasChildren() && depth < 3) {
      snap.forEach((child) => collectChild(child, depth + 1));
    }
  };
  rootSnap.forEach((child) => collectChild(child, 1));
  return rows;
}

// NEW: Permission hook (you can replace this with actual auth context)
const usePermissions = () => {
  // For now, returning all permissions. Later replace with actual user permissions
  return {
    canView: true,
    canEdit: true,
    canDelete: true,
  };
};

// NEW: Format ID as WC-001, WC-002, etc.
const formatWorkerId = (firebaseId, index) => {
  const sequentialNumber = (index + 1).toString().padStart(3, '0');
  return `WC-${sequentialNumber}`;
};

export default function WorkerCalleDisplay() {
  // data
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // view/modals
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeleteReason, setShowDeleteReason] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // filters & sort
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [selectedLanguages, setSelectedLanguages] = useState([]);
  const [selectedGender, setSelectedGender] = useState([]);
  const [reminderFilter, setReminderFilter] = useState("");
  const [selectedSource, setSelectedSource] = useState("All");
  const [sortBy, setSortBy] = useState("id");
  const [sortDir, setSortDir] = useState("desc");

  // NEW: Time format state
  const [timeFormat, setTimeFormat] = useState("12hr");

  // NEW: Skill selection mode and age filter
  const [skillMode, setSkillMode] = useState("single");
  const [ageRange, setAgeRange] = useState({ min: "", max: "" });
  const [yearFilter, setYearFilter] = useState("");

  // NEW: Additional filters
  const [experienceFilter, setExperienceFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // NEW: Show job roles checkbox
  const [showJobRoles, setShowJobRoles] = useState(false);

  // pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // summary (year / month / day)
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const callThroughOptions = [
    "Apana", "WorkerIndian", "Reference", "Poster", "Agent", "Facebook", "LinkedIn", "Instagram", "YouTube", "Website", "Just Dial", "News Paper", "Other"
  ];

  // NEW: Year filter options
  const yearOptions = [
    { value: "", label: "All Years" },
    { value: "current", label: "Current Year" },
    { value: "1", label: "1 Year Above" },
    { value: "2", label: "2 Years Above" },
    { value: "6", label: "Last 6 Months" },
    { value: "3", label: "Last 3 Months" },
    { value: "1m", label: "Last 1 Month" }
  ];

  // NEW: Experience filter options
  const experienceOptions = [
    { value: "", label: "Any Experience" },
    { value: "0-1", label: "0-1 Years" },
    { value: "1-3", label: "1-3 Years" },
    { value: "3-5", label: "3-5 Years" },
    { value: "5+", label: "5+ Years" }
  ];

  // NEW: Status filter options
  const statusOptions = [
    { value: "", label: "All Status" },
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
    { value: "pending", label: "Pending" },
    { value: "hired", label: "Hired" }
  ];

  // Get user permissions
  const permissions = usePermissions();

  // Canonicalize various spellings/inputs into a fixed set
  const normalizeSource = (raw) => {
    if (!raw) return "Other";
    const s = String(raw).trim().toLowerCase();
    const map = new Map([
      ["apna", "Apana"], ["apana", "Apana"],
      ["workerindian", "WorkerIndian"],
      ["reference", "Reference"],
      ["poster", "Poster"],
      ["agent", "Agent"],
      ["facebook", "Facebook"],
      ["linkedin", "LinkedIn"], ["linked in", "LinkedIn"],
      ["instagram", "Instagram"],
      ["youtube", "YouTube"], ["you tube", "YouTube"],
      ["website", "Website"],
      ["just dial", "Just Dial"], ["just dail", "Just Dial"], ["justdail", "Just Dial"], ["justdial", "Just Dial"],
      ["news paper", "News Paper"], ["newspaper", "News Paper"],
    ]);
    if (map.has(s)) return map.get(s);

    // try relaxed matches
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
    if (s.replace(/\s+/g, "") === "justdial" || s.replace(/\s+/g, "") === "justdail") return "Just Dial";
    if (s.includes("news") && s.includes("paper")) return "News Paper";

    return "Other";
  };

  const [activeYear, setActiveYear] = useState(new Date().getFullYear());
  const [activeMonth, setActiveMonth] = useState(null);

  /* --- FETCH --- */
  useEffect(() => {
    const ref = firebaseDB.child("WorkerCallData");
    const cb = ref.on("value", (snap) => {
      try {
        const list = collectWorkersFromSnapshot(snap);
        const enriched = list.map(w => ({
          ...w,
          date: w?.date || w?.createdAt || w?.callReminderDate || new Date().toISOString()
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

  /* badge counts (from ALL rows) */
  const badgeCounts = useMemo(() => {
    const c = { overdue: 0, today: 0, tomorrow: 0, upcoming: 0 };
    workers.forEach((w) => {
      const du = daysUntil(w?.callReminderDate);
      if (!isFinite(du)) return;
      if (du < 0) c.overdue++;
      else if (du === 0) c.today++;
      else if (du === 1) c.tomorrow++;
      else c.upcoming++;
    });
    return c;
  }, [workers]);

  // Options for filters
  const skillOptions = ["Nursing", "Cooking", "Patient Care", "Care Taker", "Old Age Care", "Baby Care", "Bedside Attender", "Supporting", "Daiper", "Any Duty", "Others"];
  const roleOptions = [
    "Computer Operating", "Tele Calling", "Driving", "Supervisor", "Manager", "Attender", "Security",
    "Carpenter", "Painter", "Plumber", "Electrician", "Mason (Home maker)", "Tailor", "Labour", "Farmer", "Delivery Boy",
    "House Keeping", "Cook", "Nanny", "Elderly Care", "Driver", "Office Boy", "Peon"
  ];
  const languageOptions = ["Telugu", "English", "Hindi", "Urdu", "Kannada", "Malayalam", "Tamil", "Bengali", "Marati"];

  // NEW: Calculate age from date of birth
  const calculateAge = (dob) => {
    if (!dob) return null;
    const birthDate = parseDate(dob);
    if (!isValidDate(birthDate)) return null;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  // NEW: Calculate experience
  const calculateExperience = (exp) => {
    if (!exp) return null;
    if (typeof exp === 'number') return exp;
    if (typeof exp === 'string') {
      const match = exp.match(/(\d+)/);
      return match ? parseInt(match[1]) : null;
    }
    return null;
  };

  // Helpers with null safety
  const getWorkerRoles = (w) => {
    if (!w) return [];
    const val = w?.jobRole ?? w?.role ?? w?.roles ?? w?.profession ?? w?.designation ?? w?.workType ?? w?.otherSkills ?? w?.otherskills ?? w?.other_skills ?? w?.["other skils"] ?? "";
    return normalizeArray(val).map((s) => String(s ?? "").toLowerCase());
  };

  const getWorkerSkills = (w) => {
    if (!w) return [];
    return normalizeArray(w?.skills).map((s) => String(s ?? "").toLowerCase());
  };

  const getWorkerLanguages = (w) => {
    if (!w) return [];
    const val = w?.languages ?? w?.language ?? w?.knownLanguages ?? w?.speaks ?? "";
    return normalizeArray(val).map((s) => String(s ?? "").toLowerCase());
  };

  /* filtering */
  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return workers.filter((w) => {
      if (term) {
        const name = String(w?.name ?? "").toLowerCase();
        const location = String(w?.location ?? "").toLowerCase();
        const mobileNo = String(w?.mobileNo ?? "").toLowerCase();
        const hay = `${name} ${location} ${mobileNo}`;
        if (!hay.includes(term)) return false;
      }

      if (selectedGender.length > 0) {
        const g = String(w?.gender ?? "").toLowerCase();
        const wanted = selectedGender.map((x) => String(x ?? "").toLowerCase());
        if (!wanted.includes(g)) return false;
      }

      if (selectedSkills.length > 0) {
        const have = getWorkerSkills(w);
        const want = selectedSkills.map((s) => String(s ?? "").toLowerCase());
        if (skillMode === "single") {
          if (!want.some((s) => have.includes(s))) return false;
        } else {
          if (!want.every((s) => have.includes(s))) return false;
        }
      }

      if (selectedRoles.length > 0) {
        const have = getWorkerRoles(w);
        const want = selectedRoles.map((s) => String(s ?? "").toLowerCase());
        if (!want.some((s) => have.includes(s))) return false;
      }

      if (selectedLanguages.length > 0) {
        const have = getWorkerLanguages(w);
        const want = selectedLanguages.map((s) => String(s ?? "").toLowerCase());
        if (!want.some((s) => have.includes(s))) return false;
      }

      // Reminder filter
      if (reminderFilter) {
        const du = daysUntil(w?.callReminderDate);
        if (reminderFilter === "overdue" && du >= 0) return false;
        if (reminderFilter === "today" && du !== 0) return false;
        if (reminderFilter === "tomorrow" && du !== 1) return false;
        if (reminderFilter === "upcoming" && (du <= 1 || !isFinite(du))) return false;
      }

      // Source filter
      if (selectedSource !== "All") {
        const source = normalizeSource(w?.callThrough || w?.through || w?.source || "");
        if (source !== selectedSource) return false;
      }

      // Age filter
      const age = calculateAge(w?.dateOfBirth || w?.dob || w?.birthDate);
      if (ageRange.min && age < parseInt(ageRange.min)) return false;
      if (ageRange.max && age > parseInt(ageRange.max)) return false;

      // Location filter
      if (locationFilter) {
        const location = String(w?.location ?? "").toLowerCase();
        if (!location.includes(locationFilter.toLowerCase())) return false;
      }

      // Status filter
      if (statusFilter && w?.status !== statusFilter) return false;

      return true;
    });
  }, [workers, searchTerm, selectedGender, selectedSkills, selectedRoles, selectedLanguages, reminderFilter, selectedSource, skillMode, ageRange, yearFilter, experienceFilter, locationFilter, statusFilter]);

  /* sorting */
  const sorted = useMemo(() => {
    const arr = [...filtered];
    const dir = sortDir === "asc" ? 1 : -1;
    arr.sort((a, b) => {
      if (sortBy === "name") {
        return dir * String(a?.name ?? "").toLowerCase().localeCompare(String(b?.name ?? "").toLowerCase());
      }
      if (sortBy === "callReminderDate") {
        const da = parseDate(a?.callReminderDate);
        const db = parseDate(b?.callReminderDate);
        const av = isValidDate(da) ? da.getTime() : Number.POSITIVE_INFINITY;
        const bv = isValidDate(db) ? db.getTime() : Number.POSITIVE_INFINITY;
        return dir * (av - bv);
      }
      return dir * String(a?.id ?? "").toLowerCase().localeCompare(String(b?.id ?? "").toLowerCase());
    });
    return arr;
  }, [filtered, sortBy, sortDir]);

  /* pagination */
  const totalPages = useMemo(() => Math.max(1, Math.ceil(sorted.length / rowsPerPage)), [sorted, rowsPerPage]);
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const indexOfLast = safePage * rowsPerPage;
  const indexOfFirst = indexOfLast - rowsPerPage;
  const pageItems = useMemo(() => sorted.slice(indexOfFirst, indexOfLast), [sorted, indexOfFirst, indexOfLast]);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, selectedGender, selectedSkills, selectedRoles, selectedLanguages, reminderFilter, rowsPerPage, skillMode, ageRange, yearFilter, experienceFilter, locationFilter, statusFilter]);

  /* actions */
  const handleView = (w) => {
    if (!permissions.canView) return;
    setSelectedWorker(w);
    setIsEditMode(false);
    setIsModalOpen(true);
  };

  const handleEdit = (w) => {
    if (!permissions.canEdit) return;
    setSelectedWorker(w);
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  const handleDelete = (w) => {
    if (!permissions.canDelete) return;
    setSelectedWorker(w);
    setShowDeleteConfirm(true);
  };

  const handleRowClick = (w, e) => {
    if (e.target.closest('button, a, .btn')) return;
    handleView(w);
  };

  const handleDeleteConfirmed = () => {
    if (!selectedWorker || !permissions.canDelete) return;
    setShowDeleteConfirm(false);
    setDeleteReason("");
    setShowDeleteReason(true);
  };

  // NEW: Log user actions
  const logUserAction = async (action, workerId, details = {}) => {
    try {
      const logEntry = {
        action,
        workerId,
        userId: "current-user-id",
        timestamp: new Date().toISOString(),
        details,
        userAgent: navigator.userAgent
      };
      await firebaseDB.child(`UserActionLogs/${workerId}_${Date.now()}`).set(logEntry);
    } catch (error) {
      console.error("Failed to log user action:", error);
    }
  };

  // SOFT DELETE (MOVE): write to WorkerCalDeletedData and remove from WorkerCallData
  const performDeleteWithReason = async () => {
    if (!selectedWorker || !permissions.canDelete) return;
    if (!deleteReason.trim()) {
      alert("Please provide a reason for deletion");
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
      await firebaseDB.child(`WorkerCalDeletedData/${selectedWorker.id}`).set(payload);
      await firebaseDB.child(`WorkerCallData/${selectedWorker.id}`).remove();

      await logUserAction("DELETE", selectedWorker.id, {
        reason: deleteReason.trim(),
        workerName: selectedWorker.name
      });

      setShowDeleteReason(false);
      setSelectedWorker(null);
      setDeleteReason("");
    } catch (err) {
      console.error("Error moving worker to deleted list:", err);
      alert("Error deleting worker");
    } finally {
      setIsDeleting(false);
    }
  };

  const resetFilters = () => {
    setSearchTerm("");
    setSelectedSkills([]);
    setSelectedRoles([]);
    setSelectedLanguages([]);
    setSelectedGender([]);
    setReminderFilter("");
    setSortBy("id");
    setSortDir("desc");
    setRowsPerPage(10);
    setCurrentPage(1);
    setSkillMode("single");
    setAgeRange({ min: "", max: "" });
    setYearFilter("");
    setExperienceFilter("");
    setLocationFilter("");
    setStatusFilter("");
    setShowJobRoles(false);
  };

  /* export current filtered view */
  const handleExport = () => {
    const exportData = sorted.map((w, i) => {
      const baseDate = w?.date || w?.createdAt || w?.callReminderDate;
      const du = daysUntil(w?.callReminderDate || w?.reminderDate || w?.date || w?.createdAt);
      const duText = isFinite(du)
        ? du === 0 ? "Today" : du === 1 ? "Tomorrow" : du < 0 ? `${Math.abs(du)} days ago` : `${du} days`
        : "";
      const comms = (w?.communications ?? w?.communication ?? w?.conversation ?? w?.conversationLevel ?? "") || "";
      const callThrough = normalizeSource(w?.callThrough || w?.through || w?.source || "");
      const roles = normalizeArray(w?.jobRole ?? w?.role ?? w?.roles ?? w?.profession ?? w?.designation ?? w?.workType ?? w?.otherSkills ?? w?.otherskills ?? w?.other_skills ?? w?.["other skils"] ?? "");
      const languages = normalizeArray(w?.languages ?? w?.language ?? w?.knownLanguages ?? w?.speaks ?? "");
      const age = calculateAge(w?.dateOfBirth || w?.dob || w?.birthDate);
      const experience = calculateExperience(w?.experience || w?.exp || w?.workExperience);

      return {
        "S.No": i + 1,
        "ID": formatWorkerId(w.id, i),
        Date: formatDDMMYYYY(baseDate),
        Name: w?.name ?? "",
        Gender: w?.gender ?? "",
        Age: age || "",
        "Experience (Years)": experience || "",
        Skills: normalizeArray(w?.skills).join(", "),
        Roles: roles.join(", "),
        Languages: languages.join(", "),
        "Reminder Date": formatDDMMYYYY(w?.callReminderDate || w?.reminderDate || w?.date || w?.createdAt),
        "Days Until": duText,
        Mobile: w?.mobileNo ?? "",
        Location: w?.location ?? "",
        Status: w?.status || "active",
        Communications: comms,
        "Call Through": callThrough
      };
    });
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);
    XLSX.utils.book_append_sheet(wb, ws, "Workers");
    XLSX.writeFile(wb, "WorkerCallData.xlsx");
  };

  // ---------- YEAR / MONTH / DAY SUMMARY ----------
  const years = useMemo(() => {
    const ys = new Set();
    workers.forEach((w) => {
      const d = parseDate(w?.date || w?.callReminderDate || w?.createdAt);
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
    callThroughOptions.forEach((t) => { summary[t] = Array(12).fill(0); });

    workers.forEach((w) => {
      const d = parseDate(w?.date || w?.callReminderDate || w?.createdAt);
      if (!isValidDate(d) || d.getFullYear() !== activeYear) return;

      const m = d.getMonth();
      const srcRaw = (w?.callThrough || w?.through || w?.source || "").trim();
      const normalizedSource = normalizeSource(srcRaw);
      const matchingOption = callThroughOptions.find(opt => opt === normalizedSource);

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
    callThroughOptions.forEach((t) => { summary[t] = Array(daysInMonth).fill(0); });

    workers.forEach((w) => {
      const d = parseDate(w?.date || w?.callReminderDate || w?.createdAt);
      if (!isValidDate(d) || d.getFullYear() !== activeYear || d.getMonth() !== activeMonth) return;

      const day = d.getDate();
      const srcRaw = (w?.callThrough || w?.through || w?.source || "").trim();
      const normalizedSource = normalizeSource(srcRaw);
      const matchingOption = callThroughOptions.find(opt => opt === normalizedSource);

      if (matchingOption) {
        summary[matchingOption][day - 1] += 1;
      }
    });
    return summary;
  }, [workers, activeYear, activeMonth]);

  // NEW: Enhanced pagination controls
  const getDisplayedPageNumbers = () => {
    const totalPagesCalc = totalPages;
    const maxBtns = 7;
    if (totalPagesCalc <= maxBtns) return Array.from({ length: totalPagesCalc }, (_, i) => i + 1);

    const half = Math.floor(maxBtns / 2);
    let start = Math.max(1, safePage - half);
    let end = start + maxBtns - 1;

    if (end > totalPagesCalc) {
      end = totalPagesCalc;
      start = Math.max(1, end - maxBtns + 1);
    }

    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  };

  const goToFirstPage = () => setCurrentPage(1);
  const goToLastPage = () => setCurrentPage(totalPages);

  /* ---- RENDER ---- */
  if (loading) return <div className="text-center my-5">Loading…</div>;
  if (error) return <div className="alert alert-danger">Error: {error}</div>;

  const totalRowStyle = { background: "#122438" };

  return (
    <div className="workerCalls">
      {/* top controls */}
      <div className="alert alert-info d-flex justify-content-between flex-wrap">
        <div className="d-flex align-items-center">
          <span className="me-2 text-white opacity-75">Show</span>
          <select
            className="form-select form-select-sm"
            style={{ width: 80 }}
            value={rowsPerPage}
            onChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10) || 10); setCurrentPage(1); }}
          >
            {[10, 20, 30, 40, 50].map(n => <option key={n} value={n}>{n}</option>)}
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

        {/* Call Through filter */}
        <select
          className="form-select opacity-75 ms-2"
          style={{ maxWidth: 220 }}
          value={selectedSource}
          onChange={(e) => setSelectedSource(e.target.value)}
        >
          <option value="All">All Call Through</option>
          {callThroughOptions.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>

        <div className="d-flex gap-2">
          <select className="form-select opacity-75" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="id">Sort by ID</option>
            <option value="name">Sort by Name</option>
            <option value="callReminderDate">Sort by Reminder Date</option>
          </select>
          <select className="form-select opacity-75" value={sortDir} onChange={(e) => setSortDir(e.target.value)}>
            <option value="desc">Desc</option>
            <option value="asc">Asc</option>
          </select>
        </div>

        <div className="text-white d-flex align-items-center">
          Showing <strong className="mx-1">{pageItems.length}</strong> of <strong className="mx-1">{sorted.length}</strong> records
        </div>
      </div>

      {/* reminder badges as filters */}
      <div className="alert alert-info text-info d-flex justify-content-around flex-wrap mb-4">
        {["overdue", "today", "tomorrow", "upcoming"].map((k) => (
          <span
            key={k}
            role="button"
            className={`reminder-badge ${k} ${reminderFilter === k ? "active" : ""}`}
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

      {/* IMPROVED LAYOUT: All filters in one compact row */}
      <div className="filter-section mb-4 p-3 border rounded bg-dark">
        <h6 className="text-info mb-3">Basic Filters</h6>
        <div className="row g-3">
          {/* Year Filter */}
          <div className="col-md-2">
            <label className="form-label text-white small">Year Filter</label>
            <select
              className="form-select form-select-sm"
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
            >
              {yearOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Age Filter */}
          <div className="col-md-2">
            <label className="form-label text-white small">Age Range</label>
            <div className="d-flex gap-1">
              <input
                type="number"
                className="form-control form-control-sm"
                placeholder="Min"
                min="18"
                max="55"
                value={ageRange.min}
                onChange={(e) => setAgeRange(prev => ({ ...prev, min: e.target.value }))}
              />
              <input
                type="number"
                className="form-control form-control-sm"
                placeholder="Max"
                min="18"
                max="55"
                value={ageRange.max}
                onChange={(e) => setAgeRange(prev => ({ ...prev, max: e.target.value }))}
              />
            </div>
          </div>

          {/* Experience Filter */}
          <div className="col-md-2">
            <label className="form-label text-white small">Experience</label>
            <select
              className="form-select form-select-sm"
              value={experienceFilter}
              onChange={(e) => setExperienceFilter(e.target.value)}
            >
              {experienceOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Location Filter */}
          <div className="col-md-4">
            <label className="form-label text-white small">Location</label>
            <input
              type="text"
              className="form-control form-control-sm"
              placeholder="Enter location..."
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
            />
          </div>

          {/* Status Filter */}
          <div className="col-md-2">
            <label className="form-label text-white small">Status</label>
            <select
              className="form-select form-select-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              {statusOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Control Buttons Row */}
      <div className="filter-section mb-4 p-3 border rounded bg-dark">
        <div className="row g-3 align-items-center">
          {/* Gender */}
          <div className="col-md-3 text-center">
            <label className="form-label text-white small mb-2">Gender</label>
            <div className="d-flex gap-2 justify-content-center">
              {["Male", "Female"].map((g) => (
                <button
                  key={g}
                  type="button"
                  className={`btn ${selectedGender.includes(g) ? "btn-warning" : "btn-outline-warning"} btn-sm`}
                  onClick={() => {
                    setSelectedGender(prev =>
                      prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]
                    );
                  }}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* Skill Mode */}
          <div className="col-md-3 text-center">
            <label className="form-label text-white small mb-2">Skill Match</label>
            <div className="d-flex gap-2 justify-content-center">
              <button
                type="button"
                className={`btn ${skillMode === "single" ? "btn-info" : "btn-outline-info"} btn-sm`}
                onClick={() => setSkillMode("single")}
              >
                Any Skill
              </button>
              <button
                type="button"
                className={`btn ${skillMode === "multi" ? "btn-info" : "btn-outline-info"} btn-sm`}
                onClick={() => setSkillMode("multi")}
              >
                All Skills
              </button>
            </div>
          </div>

          {/* Time Format */}
          <div className="col-md-3 text-center">
            <label className="form-label text-white small mb-2">Time Format</label>
            <div className="d-flex gap-2 justify-content-center">
              <button
                type="button"
                className={`btn ${timeFormat === "12hr" ? "btn-primary" : "btn-outline-primary"} btn-sm`}
                onClick={() => setTimeFormat("12hr")}
              >
                12-Hour
              </button>
              <button
                type="button"
                className={`btn ${timeFormat === "24hr" ? "btn-primary" : "btn-outline-primary"} btn-sm`}
                onClick={() => setTimeFormat("24hr")}
              >
                24-Hour
              </button>
            </div>
          </div>

          <div className="col-md-3 text-center">
            <label className="form-label text-white small mb-2">Actions</label>
            <div className="d-flex gap-2 justify-content-center">
              <button className="btn btn-success" onClick={handleExport}>Export Excel</button>
              <button className="btn btn-danger" onClick={resetFilters}>Reset</button>
            </div>
          </div>
        </div>
      </div>

      {/* Skills, Roles, Languages in expandable sections */}
      <div className="row mb-4">
        {/* Skills */}
        <div className="col-md-7">
          <div className=" bg-dark border-secondary p-3">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h4 className="mb-1 text-info">Skills</h4>
            </div>
            <div className="collapse show" id="skillsCollapse">
              <div className="card-body">
                <div className="d-flex flex-wrap gap-1">
                  {skillOptions.map((skill) => (
                    <button
                      key={skill}
                      type="button"
                      className={`btn ${selectedSkills.includes(skill) ? "btn-warning" : "btn-outline-warning"} btn-sm`}
                      onClick={() => {
                        setSelectedSkills(prev =>
                          prev.includes(skill) ? prev.filter(x => x !== skill) : [...prev, skill]
                        );
                      }}
                    >
                      {skill}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Languages */}
        <div className="col-md-5">
          <div className=" bg-dark border-secondary p-3">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h4 className="mb-1 text-info">Languages</h4>
            </div>
            <div className="collapse show" id="languagesCollapse">
              <div className="card-body">
                <div className="d-flex flex-wrap gap-1">
                  {languageOptions.map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      className={`btn ${selectedLanguages.includes(lang) ? "btn-info" : "btn-outline-info"} btn-sm`}
                      onClick={() => {
                        setSelectedLanguages(prev =>
                          prev.includes(lang) ? prev.filter(x => x !== lang) : [...prev, lang]
                        );
                      }}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="jobrols mt-3">
          {/* Job Roles Toggle Switch */}
          <div className="col-md-2 mb-3">
            <div className="form-switch-custom">
              <input
                type="checkbox"
                className="form-check-input toggle-switch"
                id="showJobRoles"
                checked={showJobRoles}
                onChange={(e) => setShowJobRoles(e.target.checked)}
              />
              <label className="form-check-label ms-2 text-white small fw-bold mt-1" htmlFor="showJobRoles">
                {showJobRoles ? "Job Roles ON" : "Job Roles OFF"}
              </label>
            </div>
          </div>

          {/* Render Job Roles section ONLY if toggle is ON */}
          {showJobRoles && (
            <div className="col-md-12">
              <div className=" bg-dark border-secondary p-3">
                <div className="card-header d-flex justify-content-between align-items-center">
                  <h4 className="mb-2 text-warning">Job Roles</h4>
                </div>
                <div className="collapse show" id="rolesCollapse">
                  <div className="card-body">
                    <div className="d-flex flex-wrap gap-1">
                      {roleOptions.map((role) => (
                        <button
                          key={role}
                          type="button"
                          className={`btn ${selectedRoles.includes(role) ? "btn-success" : "btn-outline-success"} btn-sm`}
                          onClick={() => {
                            setSelectedRoles((prev) =>
                              prev.includes(role)
                                ? prev.filter((x) => x !== role)
                                : [...prev, role]
                            );
                          }}
                        >
                          {role}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="text-white d-flex align-items-center justify-content-center text-warning">
        <p className=" text-warning mb-0">Showing <strong className="mx-1  text-warning">{pageItems.length}</strong> of <strong className="mx-1  text-warning">{sorted.length}</strong> records</p>

      </div>

      {/* TOP pagination */}
      {totalPages > 1 && (
        <nav aria-label="Workers" className="pagination-top py-2 mb-3 bg-dark rounded">
          <ul className="pagination justify-content-center mb-0">
            <li className={`page-item ${safePage === 1 ? "disabled" : ""}`}>
              <button className="page-link bg-secondary text-white border-secondary" onClick={() => setCurrentPage(1)} disabled={safePage === 1}>«</button>
            </li>
            <li className={`page-item ${safePage === 1 ? "disabled" : ""}`}>
              <button className="page-link bg-secondary text-white border-secondary" onClick={() => setCurrentPage(safePage - 1)} disabled={safePage === 1}>‹</button>
            </li>
            {getDisplayedPageNumbers().map((num) => (
              <li key={num} className={`page-item ${safePage === num ? "active" : ""}`}>
                <button className={`page-link ${safePage === num ? 'bg-primary border-primary' : 'bg-secondary text-white border-secondary'}`} onClick={() => setCurrentPage(num)}>{num}</button>
              </li>
            ))}
            <li className={`page-item ${safePage === totalPages ? "disabled" : ""}`}>
              <button className="page-link bg-secondary text-white border-secondary" onClick={() => setCurrentPage(safePage + 1)} disabled={safePage === totalPages}>›</button>
            </li>
            <li className={`page-item ${safePage === totalPages ? "disabled" : ""}`}>
              <button className="page-link bg-secondary text-white border-secondary" onClick={() => setCurrentPage(totalPages)} disabled={safePage === totalPages}>»</button>
            </li>
          </ul>
        </nav>
      )}

      {/* table */}
      <div className="table-responsive">
        <table className="table table-dark table-hover">
          <thead>
            <tr>
              <th>S.No</th>
              <th>ID</th>
              <th>Date</th>
              <th>Name</th>
              <th>Gender</th>
              <th>Age</th>
              <th>Experience</th>
              <th>Skills</th>
              <th>Reminder Date</th>
              <th>Mobile</th>
              <th>Talkin</th>
              <th>Call Through</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((w, i) => {
              const globalIndex = sorted.findIndex(x => x.id === w.id);
              const du = daysUntil(w?.callReminderDate || w?.reminderDate || w?.date || w?.createdAt);
              const duText = isFinite(du)
                ? du === 0 ? "Today" : du === 1 ? "Tomorrow" : du < 0 ? `${Math.abs(du)} days ago` : `${du} days`
                : "";
              const comms = (w?.communications ?? w?.communication ?? w?.conversation ?? w?.conversationLevel ?? "") || "";
              const callThrough = normalizeSource(w?.callThrough || w?.through || w?.source || "");
              const roles = getWorkerRoles(w);
              const languages = getWorkerLanguages(w);
              const age = calculateAge(w?.dateOfBirth || w?.dob || w?.birthDate);
              const experience = calculateExperience(w?.experience || w?.exp || w?.workExperience);

              return (
                <tr
                  key={w.id}
                  onClick={(e) => handleRowClick(w, e)}
                  style={{ cursor: 'pointer' }}
                  className={urgencyClass(w?.callReminderDate)}
                >
                  <td>{globalIndex + 1}</td>
                  <td>{formatWorkerId(w.id, globalIndex)}</td>
                  <td>{formatDDMMYYYY(w?.date || w?.createdAt || w?.callReminderDate)}</td>
                  <td>
                    <div>{w?.name || "—"}</div>
                    <small className="text-muted">
                      Added by: {w?.addedBy || w?.createdBy || "System"}
                    </small>
                  </td>
                  <td>
                    <span className={`badge ${w?.gender === "Male" ? "bg-primary" : w?.gender === "Female" ? "bg-pink" : "bg-secondary"}`}>
                      {w?.gender || "—"}
                    </span>
                  </td>
                  <td>{age || "—"}</td>
                  <td>{experience ? `${experience} yrs` : "—"}</td>
                  <td>
                    <div className="d-flex flex-wrap gap-1">
                      {getWorkerSkills(w).slice(0, 3).map((skill, idx) => (
                        <span key={idx} className="badge bg-info">{skill}</span>
                      ))}
                      {getWorkerSkills(w).length > 3 && (
                        <span className="badge bg-secondary">+{getWorkerSkills(w).length - 3}</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${reminderBadgeClass(w?.callReminderDate || w?.reminderDate || w?.date || w?.createdAt)}`}>
                      {formatDDMMYYYY(w?.callReminderDate || w?.reminderDate || w?.date || w?.createdAt)}
                    </span>
                    <small className="d-block text-muted">
                      {timeFormat === "24hr"
                        ? formatTime(w?.callReminderDate || w?.reminderDate, "24")
                        : formatTime(w?.callReminderDate || w?.reminderDate, "12")}
                    </small>
                    <small className={`d-block fw-bold ${du < 0 ? "text-danger" :
                        du === 0 ? "text-warning" :
                          du === 1 ? "text-info" :
                            "text-success"
                      }`}>
                      {duText}
                    </small>
                  </td>
                  <td className="text-white">
                    <div className="fw-normal">{w?.mobileNo || "N/A"}</div>
                    {w?.mobileNo && (
                      <div className="mt-1">
                        <a
                          href={`tel:${w.mobileNo}`}
                          className="btn btn-sm btn-outline-info me-1 rounded-pill"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Call
                        </a>
                        <a
                          className="btn btn-sm btn-outline-success rounded-pill"
                          href={`https://wa.me/${String(w.mobileNo).replace(/\D/g, "")}?text=${encodeURIComponent(
                            "Hello, This is Sudheer From JenCeo Home Care Services"
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                        >
                          WAP
                        </a>
                      </div>
                    )}
                  </td>
                  <td>
                    <span className={`badge ${comms.toLowerCase().includes("good") ? "bg-success" : comms.toLowerCase().includes("average") ? "bg-warning text-dark" : "bg-secondary"}`}>
                      {comms || "—"}
                    </span>
                  </td>
                  <td>
                    <span className="badge bg-purple">{callThrough}</span>
                  </td>
                  <td>
                    <div className="d-flex gap-1" onClick={(e) => e.stopPropagation()}>
                      {permissions.canView && (
                        <button
                          className="btn btn-sm btn-outline-info"
                          onClick={() => handleView(w)}
                          title="View"
                        >
                          <img src={viewIcon} alt="View" width="16" height="16" />
                        </button>
                      )}
                      {permissions.canEdit && (
                        <button
                          className="btn btn-sm btn-outline-warning"
                          onClick={() => handleEdit(w)}
                          title="Edit"
                        >
                          <img src={editIcon} alt="Edit" width="16" height="16" />
                        </button>
                      )}
                      {permissions.canDelete && (
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => handleDelete(w)}
                          title="Delete"
                        >
                          <img src={deleteIcon} alt="Delete" width="16" height="16" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* summary table */}
      <div className="mt-5">
        <h5 className="text-info">Summary by Call Through</h5>
        <div className="d-flex gap-3 mb-3">
          <select
            className="form-select"
            style={{ width: 120 }}
            value={activeYear}
            onChange={(e) => { setActiveYear(parseInt(e.target.value)); setActiveMonth(null); }}
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <select
            className="form-select"
            style={{ width: 120 }}
            value={activeMonth ?? ""}
            onChange={(e) => setActiveMonth(e.target.value === "" ? null : parseInt(e.target.value))}
          >
            <option value="">All Months</option>
            {months.map((m, idx) => (
              <option key={idx} value={idx}>{m}</option>
            ))}
          </select>
        </div>

        <div className="table-responsive">
          <table className="table table-dark table-bordered">
            <thead>
              <tr>
                <th>Call Through</th>
                {activeMonth === null
                  ? months.map((m, idx) => <th key={idx}>{m}</th>)
                  : Array.from({ length: new Date(activeYear, activeMonth + 1, 0).getDate() }, (_, i) => i + 1).map((d) => <th key={d}>{d}</th>)}
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {callThroughOptions.map((opt) => {
                const data = activeMonth === null ? monthSummary[opt] : daySummary[opt];
                const total = data ? data.reduce((a, b) => a + b, 0) : 0;
                return (
                  <tr key={opt}>
                    <td>{opt}</td>
                    {data && data.map((count, idx) => (
                      <td key={idx}>{count || 0}</td>
                    ))}
                    <td style={totalRowStyle} className="text-white"><strong>{total}</strong></td>
                  </tr>
                );
              })}
              {/* total row */}
              <tr style={totalRowStyle}>
                <td className="text-white"><strong>Total</strong></td>
                {(() => {
                  const data = activeMonth === null
                    ? months.map((_, m) => callThroughOptions.reduce((sum, opt) => sum + (monthSummary[opt]?.[m] || 0), 0))
                    : Array.from({ length: new Date(activeYear, activeMonth + 1, 0).getDate() }, (_, d) =>
                      callThroughOptions.reduce((sum, opt) => sum + (daySummary[opt]?.[d] || 0), 0)
                    );
                  return data.map((total, idx) => <td key={idx} className="text-white"><strong>{total}</strong></td>);
                })()}
                <td className="text-white"><strong>
                  {callThroughOptions.reduce((sum, opt) => {
                    const data = activeMonth === null ? monthSummary[opt] : daySummary[opt];
                    return sum + (data ? data.reduce((a, b) => a + b, 0) : 0);
                  }, 0)}
                </strong></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* modals */}
      {isModalOpen && selectedWorker && (
        <WorkerCallModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedWorker(null);
            setIsEditMode(false);
          }}
          worker={selectedWorker}
          isEdit={isEditMode}
          onSave={(updatedWorker) => {
            // This will be handled by the real-time Firebase listener
            setIsModalOpen(false);
            setSelectedWorker(null);
            setIsEditMode(false);
          }}
        />
      )}

      {/* delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.8)" }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Confirm Delete</h5>
                <button type="button" className="btn-close" onClick={() => setShowDeleteConfirm(false)}></button>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to delete worker <strong>{selectedWorker?.name || 'this worker'}</strong>?</p>
                <p className="text-danger">This action will move the worker to the deleted records.</p>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
                <button type="button" className="btn btn-danger" onClick={handleDeleteConfirmed}>Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* delete reason modal */}
      {showDeleteReason && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.8)" }}>
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
                ></button>
              </div>
              <div className="modal-body">
                <p>Please provide a reason for deleting <strong>{selectedWorker?.name || 'this worker'}</strong>:</p>
                <textarea
                  className="form-control"
                  rows="3"
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  placeholder="Enter reason for deletion..."
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
    </div>
  );
}