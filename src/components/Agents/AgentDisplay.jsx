
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
    const [tab, setTab] = useState("worker"); // "worker" | "client"
    const [workerAgents, setWorkerAgents] = useState([]);
    const [clientAgents, setClientAgents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [search, setSearch] = useState("");

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState("view"); // "view" | "edit" | "add"
    const [modalData, setModalData] = useState(null);   // current agent row

    
  // Resolve correct DB roots by probing both with a one-time read
  const [workerBase, setWorkerBase] = useState("JenCeo-DataBase/AgentData/WorkerAgent");
  const [clientBase, setClientBase] = useState("JenCeo-DataBase/AgentData/ClientAgent");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const tryPaths = async (candidates) => {
          for (const path of candidates) {
            try {
              const snap = await firebaseDB.child(path).once("value");
              if (snap && (snap.exists?.() || (snap.val?.() != null))) return path;
            } catch (e) {
              // ignore and try next
            }
          }
          return candidates[0];
        };

        const w = await tryPaths([
          "JenCeo-DataBase/AgentData/WorkerAgent",
          "AgentData/WorkerAgent",
        ]);
        const c = await tryPaths([
          "JenCeo-DataBase/AgentData/ClientAgent",
          "AgentData/ClientAgent",
        ]);

        if (!mounted) return;
        setWorkerBase(w);
        setClientBase(c);
      } catch (e) {
        if (mounted) setError(e?.message || String(e));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Live subscriptions once bases are known
  useEffect(() => {
    if (!workerBase || !clientBase) return;
    setError("");

    const workerRef = firebaseDB.child(workerBase);
    const clientRef = firebaseDB.child(clientBase);

    const onWorker = workerRef.on("value", (snap) => {
      const list = [];
      if (snap && snap.exists && snap.exists()) {
        snap.forEach((child) => list.push({ id: child.key, agentType: "worker", ...child.val() }));
      } else {
        const v = snap?.val?.();
        if (v && typeof v === "object") {
          Object.entries(v).forEach(([k, val]) => list.push({ id: k, agentType: "worker", ...(val || {}) }));
        }
      }
      setWorkerAgents(sortByIdNo(list));
    }, (err) => setError(err?.message || String(err)));

    const onClient = clientRef.on("value", (snap) => {
      const list = [];
      if (snap && snap.exists && snap.exists()) {
        snap.forEach((child) => list.push({ id: child.key, agentType: "client", ...child.val() }));
      } else {
        const v = snap?.val?.();
        if (v && typeof v === "object") {
          Object.entries(v).forEach(([k, val]) => list.push({ id: k, agentType: "client", ...(val || {}) }));
        }
      }
      setClientAgents(sortByIdNo(list));
    }, (err) => setError(err?.message || String(err)));

    return () => {
      workerRef.off("value", onWorker);
      clientRef.off("value", onClient);
    };
  }, [workerBase, clientBase]);


    const sortByIdNo = (arr) => {
        const safeNum = (id) => {
            if (!id) return -1;
            const m = String(id).match(/(\d+)/);
            return m ? Number(m[1]) : -1;
        };
        // Highest number first
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
        const base = (row.agentType === "client" || tab === "client") ? clientBase : workerBase;
        if (!window.confirm(`Delete ${row.agentName || "this agent"} (${row.idNo})?`)) return;
        try {
            await firebaseDB.child(`${base}/${row.id}`).remove();
        } catch (err) {
            alert("Delete failed: " + (err?.message || String(err)));
        }
    };

    if (loading) return <div className="text-center py-5">Loading agents…</div>;
    if (error) return <div className="alert alert-danger my-3">Error: {error}</div>;

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
                            Worker Agents
                        </button>
                    </li>
                    <li className="nav-item">
                        <button
                            className={`nav-link ${tab === "client" ? "active" : ""}`}
                            onClick={() => setTab("client")}
                        >
                            Client Agents
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
                                    No agents found.
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
                    // nothing to do; listeners refresh the list automatically
                    setShowModal(false);
                    setModalData(null);
                    setModalMode("view");
                }}
            />
        </div>
    );
}
