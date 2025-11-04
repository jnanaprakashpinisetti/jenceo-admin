import React, { useEffect, useMemo, useState } from "react";
import firebaseDB from "../../firebase";
import AgentModal from "./AgentModal";

// Safe string helper
const S = (v) => (v == null ? "" : String(v));

// Fallback photo
const DEFAULT_PHOTO =
    "https://firebasestorage.googleapis.com/v0/b/jenceo-admin.firebasestorage.app/o/OfficeFiles%2FSample-Photo.jpg?alt=media&token=01855b47-c9c2-490e-b400-05851192dde7";

// Small cell image
const Avatar = ({ src, alt }) => (
    <img
        src={src || DEFAULT_PHOTO}
        alt={alt || "photo"}
        style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover", border: "1px solid #2d2d2d" }}
    />
);

export default function AgentDisplay() {
    const [tab, setTab] = useState("worker");
    const [workerAgents, setWorkerAgents] = useState([]);
    const [clientAgents, setClientAgents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");

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

    // Simple search across a few cells
    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return activeList;
        return activeList.filter((a) => {
            return (
                S(a.idNo).toLowerCase().includes(q) ||
                S(a.agentName).toLowerCase().includes(q) ||
                S(a.villageTown).toLowerCase().includes(q) ||
                S(a.gender).toLowerCase().includes(q)
            );
        });
    }, [activeList, search]);

    const openAdd = () => {
        setModalMode("add");
        setModalData({ agentType: tab === "worker" ? "worker" : "client" });
        setShowModal(true);
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

    if (loading) return <div className="text-center py-5">Loading agents…</div>;
    
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
            <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
                <ul className="nav nav-tabs">
                    <li className="nav-item">
                        <button
                            className={`nav-link ${tab === "worker" ? "active" : ""}`}
                            onClick={() => setTab("worker")}
                        >
                            Worker Agents ({workerAgents.length})
                        </button>
                    </li>
                    <li className="nav-item">
                        <button
                            className={`nav-link ${tab === "client" ? "active" : ""}`}
                            onClick={() => setTab("client")}
                        >
                            Client Agents ({clientAgents.length})
                        </button>
                    </li>
                </ul>

                <div className="ms-auto d-flex align-items-center gap-2">
                    <div className="input-group" style={{ width: 360 }}>
                        <span className="input-group-text">
                            <i className="bi bi-search" />
                        </span>
                        <input
                            className="form-control"
                            placeholder="Search by ID, name, gender, location…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <button className="btn btn-primary" onClick={openAdd}>
                        + Add {tab === "worker" ? "Worker" : "Client"} Agent
                    </button>
                </div>
            </div>

            {/* Debug info */}
            <div className="alert alert-info d-flex align-items-center gap-2 mb-3">
                <small className="flex-grow-1">
                    <strong>Data Status:</strong> Worker Agents: {workerAgents.length} | Client Agents: {clientAgents.length} | 
                    Showing: {filtered.length} | Search: "{search}"
                </small>
                <button 
                    className="btn btn-sm btn-outline-info" 
                    onClick={refreshData}
                    disabled={loading}
                >
                    {loading ? 'Refreshing...' : 'Refresh Data'}
                </button>
            </div>

            {/* Table */}
            <div className="table-responsive border rounded">
                <table className="table table-dark table-hover align-middle mb-0">
                    <thead>
                        <tr className="text-uppercase small">
                            <th style={{ width: 70 }}>Photo</th>
                            <th style={{ width: 110 }}>ID No</th>
                            <th>Name</th>
                            <th style={{ width: 110 }}>Gender</th>
                            <th style={{ width: 170 }}>Location (Village/Town)</th>
                            <th style={{ width: 120 }}>Status</th>
                            <th style={{ width: 140 }} className="text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 && (
                            <tr>
                                <td colSpan={7} className="text-center py-4 text-muted">
                                    {activeList.length === 0 ? 
                                        `No ${tab} agents found in database.` : 
                                        'No agents match your search criteria.'
                                    }
                                </td>
                            </tr>
                        )}
                        {filtered.map((row) => {
                            const photo = row?.agentPhotoUrl || row?.photoUrl || row?.photo || DEFAULT_PHOTO;
                            const status = S(row?.status) || "—";
                            return (
                                <tr key={row?.id || row?.idNo} onClick={() => handleRowClick(row)} style={{ cursor: "pointer" }}>
                                    <td><Avatar src={photo} alt={row?.agentName} /></td>
                                    <td className="fw-semibold">{S(row?.idNo)}</td>
                                    <td>{S(row?.agentName)}</td>
                                    <td>{S(row?.gender)}</td>
                                    <td>{S(row?.villageTown)}</td>
                                    <td>
                                        <span className={`badge ${status === "On Duty" ? "bg-success" : status === "Off Duty" ? "bg-secondary" : "bg-dark border"}`}>
                                            {status}
                                        </span>
                                    </td>
                                    <td onClick={stop}>
                                        <div className="d-flex justify-content-center gap-2">
                                            <button className="btn btn-sm btn-outline-info" onClick={() => openView(row)}>
                                                View
                                            </button>
                                            <button className="btn btn-sm btn-outline-warning" onClick={() => openEdit(row)}>
                                                Edit
                                            </button>
                                            <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(row)}>
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

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
        </div>
    );
}