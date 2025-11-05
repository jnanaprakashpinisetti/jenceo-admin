import React, { useEffect, useMemo, useState } from "react";
import firebaseDB from "../../firebase";
import AgentModal from "./AgentModal";

// Safe string helper
const S = (v) => (v == null ? "" : String(v));

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

export default function AgentDisplay() {
    const [tab, setTab] = useState("worker");
    const [workerAgents, setWorkerAgents] = useState([]);
    const [clientAgents, setClientAgents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    // Sorting state
    const [sortField, setSortField] = useState("idNo");
    const [sortDirection, setSortDirection] = useState("desc");

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState("view");
    const [modalData, setModalData] = useState(null);

    // Load agents data
    useEffect(() => {
        const loadAgents = async () => {
            try {
                setLoading(true);
                setError("");

                console.log("Loading agents from Firebase...");

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
                            console.log(`Found worker agents at: ${path}`, workerData);
                            break;
                        }
                    } catch (err) {
                        console.log(`Path ${path} failed:`, err.message);
                    }
                }

                // Try each path for client agents
                for (const path of paths) {
                    try {
                        const snapshot = await firebaseDB.child(path.replace('Worker', 'Client')).once('value');
                        if (snapshot.exists()) {
                            clientData = snapshot.val();
                            console.log(`Found client agents at: ${path.replace('Worker', 'Client')}`, clientData);
                            break;
                        }
                    } catch (err) {
                        console.log(`Path ${path.replace('Worker', 'Client')} failed:`, err.message);
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
                console.log("Processed worker agents:", workerList);
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
                console.log("Processed client agents:", clientList);
                setClientAgents(sortByIdNo(clientList));

                if (workerList.length === 0 && clientList.length === 0) {
                    setError("No agent data found. Please check Firebase database structure.");
                }

            } catch (err) {
                console.error('Error loading agents:', err);
                setError('Failed to load agents: ' + (err?.message || String(err)));
            } finally {
                setLoading(false);
            }
        };

        loadAgents();
    }, []);

    // Real-time listeners after initial load
    useEffect(() => {
        if (workerAgents.length === 0 && clientAgents.length === 0) return;

        console.log("Setting up real-time listeners...");

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
                console.log("Real-time worker update:", list.length);
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
                console.log("Real-time client update:", list.length);
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
        if (!q) return sortedData;
        return sortedData.filter((a) => {
            return (
                S(a.idNo).toLowerCase().includes(q) ||
                S(a.agentName).toLowerCase().includes(q) ||
                S(a.villageTown).toLowerCase().includes(q) ||
                S(a.gender).toLowerCase().includes(q) ||
                S(a.status).toLowerCase().includes(q)
            );
        });
    }, [sortedData, search]);

    // Pagination calculations
    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / rowsPerPage);
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = Math.min(startIndex + rowsPerPage, totalItems);
    const paginatedData = filtered.slice(startIndex, endIndex);

    // Reset to first page when search or tab changes
    useEffect(() => {
        setCurrentPage(1);
    }, [search, tab, rowsPerPage]);

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

    const handleDelete = async (row) => {
        if (!row?.id) {
            alert("Missing record id");
            return;
        }
        const base = `AgentData/${row.agentType === "client" ? "ClientAgent" : "WorkerAgent"}`;
        if (!window.confirm(`Delete ${row.agentName || "this agent"} (${row.idNo})?`)) return;
        try {
            await firebaseDB.child(`${base}/${row.id}`).remove();
        } catch (err) {
            alert("Delete failed: " + (err?.message || String(err)));
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

            console.log("Refreshed - Workers:", workerList.length, "Clients:", clientList.length);
        } catch (err) {
            console.error('Refresh failed:', err);
            setError('Refresh failed: ' + (err?.message || String(err)));
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

    if (error) return (
        <div className="alert alert-danger my-3">
            <strong>Error:</strong> {error}
            <button className="btn btn-sm btn-outline-danger ms-2" onClick={refreshData}>
                Retry
            </button>
        </div>
    );

    return (
        <div className="container-fluid px-0">
            {/* Header row */}
            <div className="card-body border-secondary mb-4 p-3 bg-secondary rounded-4 bg-opacity-10">
                <div className="d-flex flex-wrap align-items-center gap-3 justify-content-between">
                    <div className="d-flex align-items-center gap-2">
                        <h4 className="mb-0 text-primary">Agent Management</h4>
                        <span className="badge bg-primary fs-6">{activeList.length} Total</span>
                    </div>



                    <div className="d-flex align-items-center gap-2">
                        <div className="input-group" style={{ width: 360 }}>
                            <span className="input-group-text bg-dark border-secondary text-light">
                                🔍
                            </span>
                            <input
                                className="form-control bg-dark border-secondary text-light"
                                placeholder="Search by ID, name, gender, location, status..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>


                    </div>

                    <div className="d-flex align-items-center gap-3">
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

                        <button
                            className="btn btn-sm btn-outline-info d-flex align-items-center gap-1"
                            onClick={refreshData}
                            disabled={loading}
                        >
                            🔄 {loading ? 'Refreshing...' : 'Refresh'}
                        </button>
                    </div>
                </div>
            </div>

            <ul className="nav nav-pills ms-auto justify-content-center gap-3">
                <li className="nav-item">
                    <button
                        className={`nav-link text-dark ${tab === "worker" ? "active bg-warning" : "bg-secondary"}`}
                        onClick={() => setTab("worker")}
                    >
                        👷 Worker Agents ({workerAgents.length})
                    </button>
                </li>
                <li className="nav-item">
                    <button
                        className={`nav-link text-dark ${tab === "client" ? "active bg-warning" : "bg-secondary"}`}
                        onClick={() => setTab("client")}
                    >
                        👨‍💼 Client Agents ({clientAgents.length})
                    </button>
                </li>
            </ul>

            {/* Stats and Controls */}
            <div className="row mb-3">
                <div className="col-md-8">

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
                                    Name <SortIcon field="agentName" />
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
                                <th style={{ width: 160 }} className="text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedData.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-5 text-muted">
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
                                            <td className="fw-bold text-info">{S(row?.idNo)}</td>
                                            <td>
                                                <div className="fw-semibold">{S(row?.agentName)}</div>
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
                                                <div className="d-flex justify-content-center gap-1">
                                                    <button
                                                        className="btn btn-sm btn-outline-info d-flex align-items-center gap-1"
                                                        onClick={() => openView(row)}
                                                        title="View Details"
                                                    >
                                                        👁
                                                    </button>
                                                    <button
                                                        className="btn btn-sm btn-outline-warning d-flex align-items-center gap-1"
                                                        onClick={() => openEdit(row)}
                                                        title="Edit"
                                                    >
                                                        ✏️
                                                    </button>
                                                    <button
                                                        className="btn btn-sm btn-outline-danger d-flex align-items-center gap-1"
                                                        onClick={() => handleDelete(row)}
                                                        title="Delete"
                                                    >
                                                        🗑
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

            {/* Modal */}
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

            <style jsx>{`
                .sortable {
                    cursor: pointer;
                    user-select: none;
                }
                // .sortable:hover {
                //     background-color: rgba(255, 255, 255, 0.1) !important;
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
            `}</style>
        </div>
    );
}