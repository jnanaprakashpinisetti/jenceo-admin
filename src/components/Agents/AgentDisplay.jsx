import React, { useEffect, useMemo, useState } from "react";
import firebaseDB from "../../firebase";
import AgentModal from "./AgentModal";

// Safe string helper
const S = (v) => (v == null ? "" : String(v));

// Date formatting helpers
const parseDate = (v) => {
    if (!v) return null;
    if (typeof v === "object" && v && "seconds" in v)
        return new Date(v.seconds * 1000);
    if (v instanceof Date && !isNaN(v.getTime())) return v;
    const dt = new Date(v);
    return isNaN(dt.getTime()) ? null : dt;
};

const isValidDate = (d) => d instanceof Date && !isNaN(d.getTime());

const formatDDMMYYYY = (v) => {
    const d = parseDate(v);
    return isValidDate(d) ? d.toLocaleDateString("en-GB") : "—";
};

const formatTime = (dateLike) => {
    const d = parseDate(dateLike);
    if (!isValidDate(d)) return "";
    return d.toLocaleTimeString([], { hour12: true, hour: "numeric", minute: "2-digit" });
};

const daysUntil = (v) => {
    const d = parseDate(v);
    if (!isValidDate(d)) return Number.POSITIVE_INFINITY;
    const startOfDay = (date) => {
        const x = new Date(date);
        x.setHours(0, 0, 0, 0);
        return x;
    };
    return Math.ceil(
        (startOfDay(d) - startOfDay(new Date())) / (1000 * 60 * 60 * 24)
    );
};

// Mobile number helper function
const getMobileNumber = (agent) => {
    const mobileFields = [
        'mobileNo',
        'mobile',
        'phone',
        'phoneNo',
        'contactNo',
        'contactNumber',
        'whatsappNo',
        'whatsapp'
    ];

    for (const field of mobileFields) {
        if (agent?.[field]) {
            return String(agent[field]).trim();
        }
    }
    return null;
};

// Fallback photo
const DEFAULT_PHOTO =
    "https://firebasestorage.googleapis.com/v0/b/jenceo-admin.firebasestorage.app/o/OfficeFiles%2FSample-Photo.jpg?alt=media&token=01855b47-c9c2-490e-b400-05851192dde7";

// Small cell image
const Avatar = ({ src, alt, size = "md" }) => {
    const sizes = {
        sm: { width: 32, height: 32 },
        md: { width: 44, height: 44 },
        lg: { width: 60, height: 60 }
    };

    return (
        <img
            src={src || DEFAULT_PHOTO}
            alt={alt || "photo"}
            style={{
                ...sizes[size],
                borderRadius: '8px',
                objectFit: "cover",
                border: "2px solid #374151",
                boxShadow: "0 2px 8px rgba(0,0,0,0.2)"
            }}
        />
    );
};

// Star Rating Component
const StarRating = ({ rating = 0, size = "sm" }) => {
    const starSize = size === "sm" ? "0.7rem" : "1rem";
    return (
        <div className="d-flex justify-content-center gap-1 mt-1">
            {[1, 2, 3, 4, 5].map((star) => {
                const filled = star <= Number(rating || 0);
                let color = "text-secondary";
                if (filled) {
                    color = rating >= 4 ? "text-success" : rating === 3 ? "text-warning" : "text-danger";
                }
                return (
                    <i
                        key={star}
                        className={`bi ${filled ? "bi-star-fill" : "bi-star"} ${color}`}
                        style={{ fontSize: starSize }}
                    />
                );
            })}
        </div>
    );
};

// Reminder Badge Component
const ReminderBadge = ({ reminderDate }) => {
    if (!reminderDate) return null;

    const du = daysUntil(reminderDate);
    const hasReminder = isFinite(du);

    if (!hasReminder) return null;

    const duText = du === 0 ? "Today" : du === 1 ? "Tomorrow" : du < 0 ? `${Math.abs(du)} days ago` : `${du} days`;

    const reminderClass = !hasReminder ? "text-secondary" :
        du < 0 ? "text-danger" :
            du === 0 ? "text-warning" :
                du === 1 ? "text-info" : "text-success";

    return (
        <div className={`small ${reminderClass} text-center`}>
            <div>Reminder:</div>
            <div className="fw-bold">{formatDDMMYYYY(reminderDate)}</div>
            <div className="extra-small">{duText}</div>
        </div>
    );
};

// Reminder Filter Badges Component
const ReminderFilterBadges = ({ reminderFilter, setReminderFilter, badgeCounts }) => {
    return (
        <div className="alert alert-info text-info d-flex justify-content-around flex-wrap reminder-badges mb-4">
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
    );
};

// Pagination Component
const Pagination = ({ currentPage, totalPages, onPageChange, className = "" }) => {
    const pages = [];
    const maxVisiblePages = 5;

    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
        pages.push(
            <button
                key={i}
                onClick={() => onPageChange(i)}
                className={`btn btn-sm ${currentPage === i ? 'btn-info' : 'btn-outline-info'}`}
            >
                {i}
            </button>
        );
    }

    return (
        <div className={`d-flex justify-content-center align-items-center gap-2 ${className}`}>
            <button
                className="btn btn-sm btn-outline-info"
                onClick={() => onPageChange(1)}
                disabled={currentPage === 1}
            >
                ⏮ First
            </button>
            <button
                className="btn btn-sm btn-outline-info"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
            >
                ◀ Previous
            </button>

            {startPage > 1 && (
                <>
                    <button
                        className="btn btn-sm btn-outline-info"
                        onClick={() => onPageChange(1)}
                    >
                        1
                    </button>
                    {startPage > 2 && <span className="text-muted">...</span>}
                </>
            )}

            {pages}

            {endPage < totalPages && (
                <>
                    {endPage < totalPages - 1 && <span className="text-muted">...</span>}
                    <button
                        className="btn btn-sm btn-outline-info"
                        onClick={() => onPageChange(totalPages)}
                    >
                        {totalPages}
                    </button>
                </>
            )}

            <button
                className="btn btn-sm btn-outline-info"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
            >
                Next ▶
            </button>
            <button
                className="btn btn-sm btn-outline-info"
                onClick={() => onPageChange(totalPages)}
                disabled={currentPage === totalPages}
            >
                Last ⏭
            </button>
        </div>
    );
};

// Error Modal Component
const ErrorModal = ({ show, message, onClose }) => {
    if (!show) return null;

    return (
        <div
            className="modal show d-block"
            tabIndex="-1"
            style={{ backgroundColor: "rgba(0,0,0,0.8)" }}
        >
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content bg-dark text-white border-danger">
                    <div className="modal-header border-danger">
                        <h5 className="modal-title text-danger">Error</h5>
                        <button
                            type="button"
                            className="btn-close btn-close-white"
                            onClick={onClose}
                        />
                    </div>
                    <div className="modal-body">
                        <div className="d-flex align-items-center gap-3">
                            <i className="bi bi-exclamation-triangle-fill text-danger" style={{ fontSize: "2rem" }}></i>
                            <div>
                                <p className="mb-0">{message}</p>
                                <small className="text-muted">Please check the console for more details.</small>
                            </div>
                        </div>
                    </div>
                    <div className="modal-footer border-danger">
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={onClose}
                        >
                            Close
                        </button>
                        <button
                            type="button"
                            className="btn btn-danger"
                            onClick={() => {
                                console.error("Agent Display Error:", message);
                                onClose();
                            }}
                        >
                            View Details in Console
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Filter Controls Component
const FilterControls = ({
    search,
    setSearch,
    sortField,
    setSortField,
    sortDirection,
    setSortDirection,
    statusFilter,
    setStatusFilter,
    genderFilter,
    setGenderFilter,
    reminderFilter,
    setReminderFilter,
    onResetFilters,
    loading,
    onRefresh
}) => {
    return (
        <div className="card bg-dark border-secondary mb-4">
            <div className="card-body">
                <div className="row g-3 align-items-center justify-content-around">
                    <div className="col-md-3">
                        <div className="d-flex flex-wrap gap-2 align-items-center justify-content-around">
                            {["overdue", "today", "tomorrow", "upcoming"].map((filter) => (
                                <button
                                    key={filter}
                                    className={`btn btn-sm ${reminderFilter === filter ? 'btn-warning' : 'btn-outline-warning'}`}
                                    onClick={() => setReminderFilter(reminderFilter === filter ? "" : filter)}
                                >
                                    {filter.charAt(0).toUpperCase() + filter.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>
                    {/* Search */}
                    <div className="col-md-6">
                        <div className="input-group">
                            <span className="input-group-text bg-dark border-secondary text-light">
                                <i className="fas fa-search"></i>
                            </span>
                            <input
                                className="form-control bg-dark border-secondary text-light"
                                placeholder="Search agents..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>


                    {/* Action Buttons */}
                    <div className="col-md-1">
                        <div className="d-flex gap-2">
                            <button
                                className="btn btn-outline-warning btn-sm"
                                onClick={onResetFilters}
                                title="Reset all filters"
                            >
                                <i className="fas fa-undo"></i> Reset
                            </button>
                            <button
                                className="btn btn-outline-info btn-sm"
                                onClick={onRefresh}
                                disabled={loading}
                            >
                                <i className="fas fa-sync-alt"></i> Refresh
                            </button>
                        </div>
                    </div>
                </div>


            </div>
        </div>
    );
};

export default function AgentDisplay() {
    const [tab, setTab] = useState("worker");
    const [workerAgents, setWorkerAgents] = useState([]);
    const [clientAgents, setClientAgents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [usersMap, setUsersMap] = useState({});

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    // Sorting state
    const [sortField, setSortField] = useState("idNo");
    const [sortDirection, setSortDirection] = useState("desc");

    // Filter states
    const [statusFilter, setStatusFilter] = useState("");
    const [genderFilter, setGenderFilter] = useState("");
    const [reminderFilter, setReminderFilter] = useState("");

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState("view");
    const [modalData, setModalData] = useState(null);

    // Error modal state
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    const showError = (message) => {
        setErrorMessage(message);
        setShowErrorModal(true);
    };

    // Enhanced user name resolution - FIXED VERSION
    const resolveAddedBy = (agent, usersMap = {}) => {
        if (!agent) return "System";

        // First check for direct name fields in the agent object
        const directNameFields = [
            agent?.addedByName,
            agent?.createdByName,
            agent?.addedBy,
            agent?.createdBy,
            agent?.userName,
            agent?.username
        ];

        for (const name of directNameFields) {
            const cleanName = String(name || "").trim();
            if (cleanName && cleanName !== "undefined" && cleanName !== "null" && !cleanName.includes("-")) {
                return cleanName;
            }
        }

        // Then check for user IDs and look them up in usersMap
        const idFields = [
            agent?.addedById,
            agent?.createdById,
            agent?.addedByUid,
            agent?.createdByUid,
            agent?.uid,
            agent?.userId
        ];

        for (const id of idFields) {
            if (id && usersMap[id]) {
                const user = usersMap[id];
                const userNames = [
                    user?.name,
                    user?.displayName,
                    user?.username,
                    user?.fullName,
                    user?.userName,
                    user?.email?.split('@')[0] // Use email username part
                ];

                for (const userName of userNames) {
                    const cleanName = String(userName || "").trim();
                    if (cleanName && cleanName !== "undefined" && cleanName !== "null") {
                        return cleanName;
                    }
                }
            }
        }

        // Check if there's a user object embedded in agent
        if (agent?.user && typeof agent.user === "object") {
            const userNames = [
                agent.user.name,
                agent.user.displayName,
                agent.user.userName,
                agent.user.username,
                agent.user.email?.split('@')[0]
            ];

            for (const userName of userNames) {
                const cleanName = String(userName || "").trim();
                if (cleanName && cleanName !== "undefined" && cleanName !== "null") {
                    return cleanName;
                }
            }
        }

        return "System"; // Final fallback
    };

    // Load users data for name resolution
    useEffect(() => {
        const ref = firebaseDB.child("Users");
        const cb = ref.on("value", (snap) => setUsersMap(snap.val() || {}));
        return () => ref.off("value", cb);
    }, []);

    // Load agents data
    useEffect(() => {
        const loadAgents = async () => {
            try {
                setLoading(true);
                setError("");

                // Try multiple possible paths
                const paths = [
                    "JenCeo-DataBase/AgentData/WorkerAgent",
                    "AgentData/WorkerAgent",
                    "WorkerAgent"
                ];

                let workerData = null;
                let clientData = null;

                // Try each path for worker agents
                for (const path of paths) {
                    try {
                        const snapshot = await firebaseDB.child(path).once('value');
                        if (snapshot.exists()) {
                            workerData = snapshot.val();
                            break;
                        }
                    } catch (err) {
                        // Silently continue to next path
                    }
                }

                // Try each path for client agents
                for (const path of paths) {
                    try {
                        const snapshot = await firebaseDB.child(path.replace('Worker', 'Client')).once('value');
                        if (snapshot.exists()) {
                            clientData = snapshot.val();
                            break;
                        }
                    } catch (err) {
                        // Silently continue to next path
                    }
                }

                // Process worker agents
                const workerList = [];
                if (workerData && typeof workerData === 'object') {
                    Object.entries(workerData).forEach(([key, value]) => {
                        if (value && typeof value === 'object') {
                            workerList.push({
                                id: key,
                                agentType: "worker",
                                ...value
                            });
                        }
                    });
                }
                setWorkerAgents(sortByIdNo(workerList));

                // Process client agents
                const clientList = [];
                if (clientData && typeof clientData === 'object') {
                    Object.entries(clientData).forEach(([key, value]) => {
                        if (value && typeof value === 'object') {
                            clientList.push({
                                id: key,
                                agentType: "client",
                                ...value
                            });
                        }
                    });
                }
                setClientAgents(sortByIdNo(clientList));

                if (workerList.length === 0 && clientList.length === 0) {
                    setError("No agent data found. Please check Firebase database structure.");
                }

            } catch (err) {
                const errorMsg = 'Failed to load agents: ' + (err?.message || String(err));
                setError(errorMsg);
                showError(errorMsg);
            } finally {
                setLoading(false);
            }
        };

        loadAgents();
    }, []);

    // Real-time listeners after initial load
    useEffect(() => {
        if (workerAgents.length === 0 && clientAgents.length === 0) return;

        const workerRef = firebaseDB.child("AgentData/WorkerAgent");
        const clientRef = firebaseDB.child("AgentData/ClientAgent");

        const onWorker = workerRef.on("value", (snap) => {
            if (snap.exists()) {
                const data = snap.val();
                const list = [];
                if (data && typeof data === 'object') {
                    Object.entries(data).forEach(([key, value]) => {
                        if (value && typeof value === 'object') {
                            list.push({
                                id: key,
                                agentType: "worker",
                                ...value
                            });
                        }
                    });
                }
                setWorkerAgents(sortByIdNo(list));
            }
        });

        const onClient = clientRef.on("value", (snap) => {
            if (snap.exists()) {
                const data = snap.val();
                const list = [];
                if (data && typeof data === 'object') {
                    Object.entries(data).forEach(([key, value]) => {
                        if (value && typeof value === 'object') {
                            list.push({
                                id: key,
                                agentType: "client",
                                ...value
                            });
                        }
                    });
                }
                setClientAgents(sortByIdNo(list));
            }
        });

        return () => {
            workerRef.off("value", onWorker);
            clientRef.off("value", onClient);
        };
    }, []);

    const sortByIdNo = (arr) => {
        const safeNum = (id) => {
            if (!id) return -1;
            const m = String(id).match(/(\d+)/);
            return m ? Number(m[1]) : -1;
        };
        return [...arr].sort((a, b) => safeNum(b?.idNo) - safeNum(a?.idNo));
    };

    // Active list for current tab
    const activeList = tab === "worker" ? workerAgents : clientAgents;

    // Reminder badge counts
    const badgeCounts = useMemo(() => {
        const c = { overdue: 0, today: 0, tomorrow: 0, upcoming: 0 };
        activeList.forEach((agent) => {
            const r = agent?.reminderDate;
            const du = daysUntil(r);
            if (!isFinite(du)) return;
            if (du < 0) c.overdue++;
            else if (du === 0) c.today++;
            else if (du === 1) c.tomorrow++;
            else c.upcoming++;
        });
        return c;
    }, [activeList]);

    // Sorting function
    const handleSort = (field) => {
        if (sortField === field) {
            setSortDirection(sortDirection === "asc" ? "desc" : "asc");
        } else {
            setSortField(field);
            setSortDirection("asc");
        }
    };

    // Sort data
    const sortedData = useMemo(() => {
        const sorted = [...activeList].sort((a, b) => {
            let aVal = a[sortField] || "";
            let bVal = b[sortField] || "";

            // Handle numeric sorting for idNo
            if (sortField === "idNo") {
                const aNum = String(aVal).match(/(\d+)/)?.[1] || -1;
                const bNum = String(bVal).match(/(\d+)/)?.[1] || -1;
                return sortDirection === "asc" ? aNum - bNum : bNum - aNum;
            }

            // Handle date sorting for reminder
            if (sortField === "reminderDate") {
                const aDate = parseDate(aVal);
                const bDate = parseDate(bVal);
                const aTime = isValidDate(aDate) ? aDate.getTime() : 0;
                const bTime = isValidDate(bDate) ? bDate.getTime() : 0;
                return sortDirection === "asc" ? aTime - bTime : bTime - aTime;
            }

            // String sorting for other fields
            aVal = String(aVal).toLowerCase();
            bVal = String(bVal).toLowerCase();

            if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
            if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
            return 0;
        });
        return sorted;
    }, [activeList, sortField, sortDirection]);

    // Search and filter
    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();

        return sortedData.filter((a) => {
            // Search filter
            if (search) {
                const matchesSearch =
                    S(a.idNo).toLowerCase().includes(q) ||
                    S(a.agentName).toLowerCase().includes(q) ||
                    S(a.villageTown).toLowerCase().includes(q) ||
                    S(a.gender).toLowerCase().includes(q) ||
                    S(a.status).toLowerCase().includes(q) ||
                    S(a.mobileNo).toLowerCase().includes(q);

                if (!matchesSearch) return false;
            }

            // Status filter
            if (statusFilter && S(a.status) !== statusFilter) {
                return false;
            }

            // Gender filter
            if (genderFilter && S(a.gender) !== genderFilter) {
                return false;
            }

            // Reminder filter
            if (reminderFilter) {
                const reminder = a?.reminderDate;
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

            return true;
        });
    }, [sortedData, search, statusFilter, genderFilter, reminderFilter]);

    // Pagination calculations
    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / rowsPerPage);
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = Math.min(startIndex + rowsPerPage, totalItems);
    const paginatedData = filtered.slice(startIndex, endIndex);

    // Reset to first page when search or tab changes
    useEffect(() => {
        setCurrentPage(1);
    }, [search, tab, rowsPerPage, reminderFilter, statusFilter, genderFilter]);

    // Reset all filters
    const resetAllFilters = () => {
        setSearch("");
        setSortField("idNo");
        setSortDirection("desc");
        setStatusFilter("");
        setGenderFilter("");
        setReminderFilter("");
        setCurrentPage(1);
    };

    const openView = (row) => {
        setModalMode("view");
        setModalData(row);
        setShowModal(true);
    };

    const openEdit = (row) => {
        setModalMode("edit");
        setModalData(row);
        setShowModal(true);
    };

    const handleRowClick = (row) => openView(row);

    const stop = (e) => e?.stopPropagation();

    const handleCall = (agent, e) => {
        e?.stopPropagation();
        const mobileNo = getMobileNumber(agent);
        if (!mobileNo) {
            showError("No mobile number available for this agent.");
            return;
        }
        window.open(`tel:${mobileNo}`, '_self');
    };

    const handleWhatsApp = (agent, e) => {
        e?.stopPropagation();
        const mobileNo = getMobileNumber(agent);
        if (!mobileNo) {
            showError("No mobile number available for this agent.");
            return;
        }
        const cleanNumber = String(mobileNo).replace(/\D/g, "");
        const message = "Hello, I'm interested in your services from JenCeo.";
        window.open(`https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`, '_blank');
    };

    const handleDelete = async (row) => {
        if (!row?.id) {
            showError("Missing record ID for deletion.");
            return;
        }

        const base = `AgentData/${row.agentType === "client" ? "ClientAgent" : "WorkerAgent"}`;
        if (!window.confirm(`Delete ${row.agentName || "this agent"} (${row.idNo})?`)) return;

        try {
            await firebaseDB.child(`${base}/${row.id}`).remove();
        } catch (err) {
            const errorMsg = "Delete failed: " + (err?.message || String(err));
            showError(errorMsg);
        }
    };

    const refreshData = async () => {
        setLoading(true);
        try {
            // Reload both worker and client agents
            const workerSnap = await firebaseDB.child("AgentData/WorkerAgent").once('value');
            const clientSnap = await firebaseDB.child("AgentData/ClientAgent").once('value');

            const workerList = [];
            const clientList = [];

            if (workerSnap.exists()) {
                const data = workerSnap.val();
                if (data && typeof data === 'object') {
                    Object.entries(data).forEach(([key, value]) => {
                        if (value && typeof value === 'object') {
                            workerList.push({
                                id: key,
                                agentType: "worker",
                                ...value
                            });
                        }
                    });
                }
            }

            if (clientSnap.exists()) {
                const data = clientSnap.val();
                if (data && typeof data === 'object') {
                    Object.entries(data).forEach(([key, value]) => {
                        if (value && typeof value === 'object') {
                            clientList.push({
                                id: key,
                                agentType: "client",
                                ...value
                            });
                        }
                    });
                }
            }

            setWorkerAgents(sortByIdNo(workerList));
            setClientAgents(sortByIdNo(clientList));

        } catch (err) {
            const errorMsg = 'Refresh failed: ' + (err?.message || String(err));
            setError(errorMsg);
            showError(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    const SortIcon = ({ field }) => {
        if (sortField !== field) return <span className="text-muted">↕</span>;
        return sortDirection === "asc" ? "↑" : "↓";
    };

    if (loading) return (
        <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
            </div>
            <div className="mt-2">Loading agents...</div>
        </div>
    );

    return (
        <div className="container-fluid px-0">

            {/* Enhanced Filter Controls */}
            <FilterControls
                search={search}
                setSearch={setSearch}
                sortField={sortField}
                setSortField={setSortField}
                sortDirection={sortDirection}
                setSortDirection={setSortDirection}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                genderFilter={genderFilter}
                setGenderFilter={setGenderFilter}
                reminderFilter={reminderFilter}
                setReminderFilter={setReminderFilter}
                onResetFilters={resetAllFilters}
                loading={loading}
                onRefresh={refreshData}
            />

            <ul className="nav nav-pills ms-auto justify-content-center gap-3 mb-4">
                <li className="nav-item">
                    <button
                        className={`nav-link text-dark ${tab === "worker" ? "active bg-warning" : "bg-secondary"}`}
                        onClick={() => setTab("worker")}
                    >
                        <i className="fas fa-hard-hat me-2"></i>
                        Worker Agents ({workerAgents.length})
                    </button>
                </li>
                <li className="nav-item">
                    <button
                        className={`nav-link text-dark ${tab === "client" ? "active bg-warning" : "bg-secondary"}`}
                        onClick={() => setTab("client")}
                    >
                        <i className="fas fa-user-tie me-2"></i>
                        Client Agents ({clientAgents.length})
                    </button>
                </li>
            </ul>

            {/* Stats and Controls */}
            <div className="row mb-3">
                <div className="col-md-8">

                    <div className="d-flex align-items-center gap-2">
                        <div className="text-warning small">
                            Showing <strong>{startIndex + 1}-{endIndex}</strong> of <strong>{totalItems}</strong> agents
                            {search && <span> for "<strong>{search}</strong>"</span>}
                        </div>

                        <select
                            className="form-select form-select-sm bg-dark border-secondary text-light"
                            style={{ width: 'auto' }}
                            value={rowsPerPage}
                            onChange={(e) => setRowsPerPage(Number(e.target.value))}
                        >
                            <option value={5}>5 per page</option>
                            <option value={10}>10 per page</option>
                            <option value={20}>20 per page</option>
                            <option value={50}>50 per page</option>
                            <option value={100}>100 per page</option>
                        </select>
                    </div>
                </div>

                <div className="col-md-4 text-end">
                    <div className="text-light small">
                        Sorted by: <strong>{sortField}</strong> ({sortDirection === 'asc' ? 'Ascending' : 'Descending'})
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="card bg-dark border-secondary">
                <div className="table-responsive">
                    <table className="table table-dark table-hover align-middle mb-0">
                        <thead className="table-secondary">
                            <tr className="text-uppercase small">
                                <th style={{ width: 70 }}>Photo</th>
                                <th style={{ width: 110 }} className="sortable" onClick={() => handleSort("idNo")}>
                                    ID No <SortIcon field="idNo" />
                                </th>
                                <th className="sortable" onClick={() => handleSort("agentName")}>
                                    Name & Rating <SortIcon field="agentName" />
                                </th>
                                <th style={{ width: 110 }} className="sortable" onClick={() => handleSort("gender")}>
                                    Gender <SortIcon field="gender" />
                                </th>
                                <th style={{ width: 170 }} className="sortable" onClick={() => handleSort("villageTown")}>
                                    Location <SortIcon field="villageTown" />
                                </th>
                                <th style={{ width: 120 }} className="sortable" onClick={() => handleSort("status")}>
                                    Status <SortIcon field="status" />
                                </th>
                                <th style={{ width: 120 }}>Contact</th>
                                <th style={{ width: 140 }} className="sortable" onClick={() => handleSort("reminderDate")}>
                                    Reminder <SortIcon field="reminderDate" />
                                </th>
                                <th style={{ width: 160 }} className="text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedData.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="text-center py-5 text-muted">
                                        <div className="py-4">
                                            {activeList.length === 0 ?
                                                `No ${tab} agents found in database.` :
                                                'No agents match your search criteria.'
                                            }
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                paginatedData.map((row) => {
                                    const photo = row?.agentPhotoUrl || row?.photoUrl || row?.photo || DEFAULT_PHOTO;
                                    const status = S(row?.status) || "—";
                                    const statusColor = {
                                        "On Duty": "success",
                                        "Off Duty": "secondary",
                                        "Active": "success",
                                        "Inactive": "danger"
                                    }[status] || "dark";

                                    const addedBy = resolveAddedBy(row, usersMap);
                                    const addedDate = row?.createdAt || row?.timestamp || row?.createdDate;
                                    const mobileNo = getMobileNumber(row);

                                    return (
                                        <tr
                                            key={row?.id || row?.idNo}
                                            onClick={() => handleRowClick(row)}
                                            style={{ cursor: "pointer" }}
                                            className="hover-highlight"
                                        >
                                            <td>
                                                <div className="d-flex justify-content-center">
                                                    <Avatar src={photo} alt={row?.agentName} />
                                                </div>
                                            </td>
                                            <td>
                                                <div className="fw-bold text-info">{S(row?.idNo)}</div>
                                                <div className="extra-small text-muted mt-1" style={{ fontSize: "8px", opacity: .5 }}>
                                                    <div>By: {addedBy}</div>
                                                    {addedDate && (
                                                        <span>
                                                            {formatDDMMYYYY(addedDate)}

                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td>
                                                <div className="fw-semibold">{S(row?.agentName)}</div>
                                                <StarRating rating={row?.rating} size="sm" />
                                            </td>
                                            <td>
                                                <span className={`badge bg-${row?.gender?.toLowerCase() === 'female' ? 'warning' : 'info'}`}>
                                                    {S(row?.gender)}
                                                </span>
                                            </td>
                                            <td>
                                                <small className="text-light">{S(row?.villageTown)}</small>
                                            </td>
                                            <td>
                                                <span className={`badge bg-${statusColor}`}>
                                                    {status}
                                                </span>
                                            </td>
                                            <td onClick={stop}>
                                                {mobileNo ? (
                                                    <div className="d-flex flex-column gap-1">
                                                        <button
                                                            className="btn btn-sm btn-outline-info d-flex align-items-center justify-content-center gap-1"
                                                            onClick={(e) => handleCall(row, e)}
                                                            title={`Call ${mobileNo}`}
                                                        >
                                                            <i className="bi bi-phone"></i> Call
                                                        </button>
                                                        <button
                                                            className="btn btn-sm btn-outline-warning d-flex align-items-center justify-content-center gap-1"
                                                            onClick={(e) => handleWhatsApp(row, e)}
                                                            title={`WhatsApp ${mobileNo}`}
                                                        >
                                                            <i className="bi bi-whatsapp"></i> WAP
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className="text-muted small">No contact</span>
                                                )}
                                            </td>
                                            <td>
                                                <ReminderBadge reminderDate={row?.reminderDate} />
                                            </td>
                                            <td onClick={stop}>
                                                <div className="d-flex justify-content-center gap-1">
                                                    <button
                                                        className="btn btn-sm btn-outline-info d-flex align-items-center gap-1"
                                                        onClick={() => openView(row)}
                                                        title="View Details"
                                                    >
                                                        <i className="bi bi-eye"></i>
                                                    </button>
                                                    <button
                                                        className="btn btn-sm btn-outline-warning d-flex align-items-center gap-1"
                                                        onClick={() => openEdit(row)}
                                                        title="Edit"
                                                    >
                                                        <i className="bi bi-pencil"></i>
                                                    </button>
                                                    <button
                                                        className="btn btn-sm btn-outline-danger d-flex align-items-center gap-1"
                                                        onClick={() => handleDelete(row)}
                                                        title="Delete"
                                                    >
                                                        <i className="bi bi-trash"></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination Footer */}
            {totalPages > 1 && (
                <div className="card bg-dark border-secondary mt-3">
                    <div className="card-body py-3">
                        <div className="row align-items-center">
                            <div className="col-md-6">
                                <div className="text-warning small">
                                    Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> •
                                    Showing <strong>{paginatedData.length}</strong> agents •
                                    Total: <strong>{totalItems}</strong> agents
                                </div>
                            </div>
                            <div className="col-md-6">
                                <Pagination
                                    currentPage={currentPage}
                                    totalPages={totalPages}
                                    onPageChange={setCurrentPage}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modals */}
            <AgentModal
                show={showModal}
                mode={modalMode}
                data={modalData}
                onClose={() => {
                    setShowModal(false);
                    setModalData(null);
                    setModalMode("view");
                }}
                onSaved={() => {
                    setShowModal(false);
                    setModalData(null);
                    setModalMode("view");
                }}
            />

            <ErrorModal
                show={showErrorModal}
                message={errorMessage}
                onClose={() => setShowErrorModal(false)}
            />

            <style jsx>{`
        .sortable {
          cursor: pointer;
          user-select: none;
        }
        .hover-highlight:hover {
          background-color: rgba(255, 255, 255, 0.05) !important;
          transform: translateY(-1px);
          transition: all 0.2s ease;
        }
        .table-responsive {
          border-radius: 8px;
        }
        .nav-pills .nav-link {
          border-radius: 20px;
          padding: 8px 16px;
        }
        .extra-small {
          font-size: 0.7rem;
        }
        .reminder-badge {
          cursor: pointer;
          padding: 8px 12px;
          border-radius: 20px;
          transition: all 0.3s ease;
        }
        .reminder-badge.active {
          background-color: rgba(13, 110, 253, 0.2);
          border: 2px solid #0d6efd;
        }
        .reminder-badge:hover {
          transform: scale(1.05);
        }
      `}</style>
        </div>
    );
}