// src/components/Tasks/ToDo.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
// NOTE: No Firestore imports. We use Realtime Database via your existing export.
import firebaseDB from "../../firebase"; // keep your firebase as-is

// ---------- helpers ----------
const cn = (...xs) => xs.filter(Boolean).join(" ");
const fmtDT = (ts) => {
  try {
    if (!ts) return "Recent";
    if (typeof ts === "number") return new Date(ts).toLocaleString();
    if (typeof ts === "string") return new Date(ts).toLocaleString();
    return "Recent";
  } catch {
    return "Recent";
  }
};

// ---- RTDB helpers (fixed: never call child/ref with empty path) ----
const hasRTDB =
  !!firebaseDB &&
  (typeof firebaseDB.child === "function" || typeof firebaseDB.ref === "function");

const getRef = (path) => {
  if (!hasRTDB) return null;
  const p = String(path || "").trim();
  // Do NOT call child/ref with an empty path; default to ToDo if empty sneaks in
  if (!p) {
    return typeof firebaseDB.child === "function"
      ? firebaseDB.child("ToDo")
      : firebaseDB.ref("ToDo");
  }
  return typeof firebaseDB.child === "function"
    ? firebaseDB.child(p)
    : firebaseDB.ref(p);
};

// ---------- constants ----------
const CATEGORIES = {
  "Worker Call": "#22c55e", // green
  "Petty Cash": "#f59e0b",  // amber
  Client: "#3b82f6",        // blue
  Agreements: "#a855f7",    // purple
  Other: "#94a3b8",         // slate
};
const PRIORITIES = {
  Low: "#84cc16",
  Medium: "#facc15",
  High: "#fb923c",
  Urgent: "#ef4444",
};
const STATUS = {
  pending: { bg: "linear-gradient(135deg,#2b2f43,#353c5a)", border: "#f59e0b" },
  "in-progress": { bg: "linear-gradient(135deg,#19324a,#1f4a75)", border: "#3b82f6" },
  completed: { bg: "linear-gradient(135deg,#183a2b,#1e4d38)", border: "#22c55e" },
};
const TABS = [
  { id: "all", label: "All Tasks" },
  { id: "pending", label: "Pending" },
  { id: "in-progress", label: "In Progress" },
  { id: "completed", label: "Completed" },
];

export default function ToDo() {
  // data
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ui filters
  const [activeTab, setActiveTab] = useState("all");
  const [qtext, setQtext] = useState("");
  const [cat, setCat] = useState("ALL");
  const [prio, setPrio] = useState("ALL");
  const [sort, setSort] = useState("createdAt_desc");

  // add modal
  const [showAdd, setShowAdd] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    category: "Worker Call",
    priority: "Medium",
    assignedTo: "admin",
    status: "pending",
    dueDate: "",
  });

  // detail modal
  const [showModal, setShowModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [comments, setComments] = useState({});

  const addFormRef = useRef(null);
  const backendOK = !!hasRTDB;

  // ---------- subscribe tasks (RTDB) ----------
  useEffect(() => {
    if (!backendOK) {
      setError("Firebase RTDB not configured. Please check your configuration.");
      setTasks([]);
      return;
    }
    setLoading(true);
    setError("");

    const ref = getRef("ToDo");
    const cb = (snap) => {
      const val = snap.val?.() ?? snap; // some test envs hand plain object
      const obj = val || {};
      const list = Object.entries(obj).map(([id, v]) => ({
        id,
        ...v,
      }));
      list.sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));
      setTasks(list);
      setLoading(false);
    };

    try {
      if (typeof ref.on === "function") {
        ref.on("value", cb);
        return () => {
          try {
            ref.off("value", cb);
          } catch {}
        };
      }
      // fallback single read
      ref.once?.("value", (s) => cb(s));
    } catch (err) {
      console.error("ToDo RTDB subscribe error:", err);
      setError("Failed to load tasks from database.");
      setLoading(false);
    }
  }, [backendOK]);

  // ---------- tab counts ----------
  const tabCounts = useMemo(() => {
    const base = { all: tasks.length, pending: 0, "in-progress": 0, completed: 0 };
    tasks.forEach((t) => {
      if (base[t.status] !== undefined) base[t.status] += 1;
    });
    return base;
  }, [tasks]);

  // ---------- filtered list ----------
  const filtered = useMemo(() => {
    let list = tasks.slice();
    if (activeTab !== "all") list = list.filter((t) => t.status === activeTab);
    if (cat !== "ALL") list = list.filter((t) => t.category === cat);
    if (prio !== "ALL") list = list.filter((t) => t.priority === prio);
    if (qtext.trim()) {
      const q = qtext.toLowerCase();
      list = list.filter(
        (t) =>
          t.title?.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q) ||
          t.assignedTo?.toLowerCase().includes(q)
      );
    }
    const [key, dir] = sort.split("_");
    list.sort((a, b) => {
      const av = key === "createdAt" ? (a.createdAt || 0) : (a[key] || "").toString().toLowerCase();
      const bv = key === "createdAt" ? (b.createdAt || 0) : (b[key] || "").toString().toLowerCase();
      if (av === bv) return 0;
      return dir === "asc" ? (av > bv ? 1 : -1) : av < bv ? 1 : -1;
    });
    return list;
  }, [tasks, activeTab, cat, prio, qtext, sort]);

  // ---------- actions (RTDB) ----------
  const handleAddTask = async (e) => {
    e?.preventDefault?.();
    if (!newTask.title.trim()) {
      setError("Please enter a task title.");
      return;
    }
    if (!backendOK) {
      setError("Firebase not configured. Cannot add task.");
      return;
    }
    setLoading(true);
    setError("");

    const now = Date.now();
    const payload = {
      title: newTask.title.trim(),
      description: newTask.description?.trim() || "",
      category: newTask.category,
      priority: newTask.priority,
      assignedTo: newTask.assignedTo,
      status: newTask.status,
      dueDate: newTask.dueDate || "",
      comments: {}, // map of auto keys
      createdBy: "admin",
      createdAt: now,
      updatedAt: now,
    };

    try {
      const ref = getRef("ToDo");
      if (typeof ref.push === "function") {
        await ref.push(payload);
      } else if (typeof ref.set === "function") {
        await ref.set(payload); // fallback
      }
      setNewTask({
        title: "",
        description: "",
        category: "Worker Call",
        priority: "Medium",
        assignedTo: "admin",
        status: "pending",
        dueDate: "",
      });
      setDirty(false);
      setShowAdd(false);
    } catch (err) {
      console.error("add task error:", err);
      setError("Failed to add task. Please verify Firebase rules and network.");
    } finally {
      setLoading(false);
    }
  };

  const updateTaskStatus = async (taskId, newStatus) => {
    if (!backendOK) {
      setError("Firebase not configured. Cannot update task.");
      return;
    }
    try {
      const now = Date.now();
      const ref = getRef(`ToDo/${taskId}`);
      await ref.update({ status: newStatus, updatedAt: now });
    } catch (err) {
      console.error("update status error:", err);
      setError("Failed to update task status.");
    }
  };

  const deleteTask = async (taskId) => {
    if (!backendOK) {
      setError("Firebase not configured. Cannot delete task.");
      return;
    }
    try {
      const ref = getRef(`ToDo/${taskId}`);
      await ref.remove();
    } catch (err) {
      console.error("delete task error:", err);
      setError("Failed to delete task.");
    }
  };

  const addComment = async (taskId, text) => {
    const body = (text || "").trim();
    if (!body) return;
    if (!backendOK) {
      setError("Firebase not configured. Cannot add comment.");
      return;
    }
    try {
      const now = Date.now();
      const ref = getRef(`ToDo/${taskId}/comments`);
      if (typeof ref.push === "function") {
        await ref.push({ text: body, author: "admin", timestamp: now });
      } else {
        // Fallback: write by timestamp key
        await getRef(`ToDo/${taskId}/comments/${String(now)}`).set({
          text: body,
          author: "admin",
          timestamp: now,
        });
      }
      setComments((p) => ({ ...p, [taskId]: "" }));
    } catch (err) {
      console.error("add comment error:", err);
      setError("Failed to add comment.");
    }
  };

  // beforeunload guard for add modal
  useEffect(() => {
    if (!showAdd) return;
    const handler = (e) => {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [showAdd, dirty]);

  // ---------- UI ----------
  return (
    <div className="todo-wrap">
      {/* Header card */}
      <div className="todo-head rounded-4 p-3 mb-3 shadow-sm">
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <div className="tiny text-white-50 text-uppercase">Office Task Manager</div>
            <div className="h3 fw-bold mb-0 text-white">To-Do & Workflow</div>
            {!backendOK && <div className="text-danger small mt-1">Firebase not configured — reads/writes are disabled.</div>}
            {error && <div className="text-danger small">{error}</div>}
          </div>
          <button className="btn btn-warning" onClick={()=>setShowAdd(true)} disabled={!backendOK}>+ New Task</button>
        </div>

        {/* filters row */}
        <div className="d-flex flex-wrap gap-2 mt-3">
          <div className="btn-group btn-group-sm" role="group" aria-label="tabs">
            {TABS.map(t => (
              <button
                key={t.id}
                className={cn("btn", activeTab===t.id ? "btn-info text-dark" : "btn-outline-info")}
                onClick={()=>setActiveTab(t.id)}
              >
                {t.label}
                <span className="badge bg-dark ms-2">
                  {t.id==="all" ? tasks.length : (tasks.filter(x=>x.status===t.id).length)}
                </span>
              </button>
            ))}
          </div>

          <select className="form-select form-select-sm dark-input" style={{width:180}} value={cat} onChange={(e)=>setCat(e.target.value)}>
            <option value="ALL">All Categories</option>
            {Object.keys(CATEGORIES).map(k => <option key={k} value={k}>{k}</option>)}
          </select>

          <select className="form-select form-select-sm dark-input" style={{width:150}} value={prio} onChange={(e)=>setPrio(e.target.value)}>
            <option value="ALL">All Priorities</option>
            {Object.keys(PRIORITIES).map(k => <option key={k} value={k}>{k}</option>)}
          </select>

          <div className="input-group input-group-sm" style={{maxWidth:360}}>
            <span className="input-group-text dark-input">🔎</span>
            <input className="form-control dark-input" placeholder="Search title/description/assignee…" value={qtext} onChange={e=>setQtext(e.target.value)} />
          </div>

          <select className="form-select form-select-sm dark-input" style={{width:160}} value={sort} onChange={(e)=>setSort(e.target.value)}>
            <option value="createdAt_desc">Newest</option>
            <option value="createdAt_asc">Oldest</option>
            <option value="title_asc">Title A→Z</option>
            <option value="title_desc">Title Z→A</option>
          </select>
        </div>
      </div>

      {/* list */}
      {loading && tasks.length===0 ? (
        <div className="alert alert-info">Loading tasks…</div>
      ) : (
        <div className="row">
          {filtered.length===0 ? (
            <div className="col-12">
              <div className="neo-card p-4 text-center">No tasks found. Add a new task to get started!</div>
            </div>
          ) : (
            filtered.map(task => (
              <div className="col-lg-6 mb-3" key={task.id}>
                <div className="task-card rounded-3 overflow-hidden">
                  <div className="task-border" style={{borderColor: STATUS[task.status]?.border}} />
                  <div className="p-3">
                    <div className="d-flex justify-content-between align-items-center">
                      <h5 className="mb-0 text-white">{task.title}</h5>
                      <span className="badge priority-badge" style={{background:PRIORITIES[task.priority]}}>{task.priority}</span>
                    </div>
                    <p className="mt-2 mb-2 text-muted-200">{task.description || <span className="text-muted-400">—</span>}</p>
                    <div className="d-flex flex-wrap align-items-center gap-2 small text-muted-200">
                      <span className="px-2 py-1 rounded label-chip" style={{color:CATEGORIES[task.category]||"#ddd"}}>
                        {task.category}
                      </span>
                      <span className="mut-dot">•</span>
                      <span><strong className="text-muted-300">Assigned:</strong> <span className="text-white-80">{task.assignedTo}</span></span>
                      {task.dueDate && (<><span className="mut-dot">•</span><span><strong className="text-muted-300">Due:</strong> <span className="text-white-80">{task.dueDate}</span></span></>)}
                      <span className="mut-dot">•</span>
                      <span><strong className="text-muted-300">Created:</strong> <span className="text-white-80">{fmtDT(task.createdAt)}</span></span>
                    </div>

                    {/* comments */}
                    <div className="mt-3">
                      <div className="fw-semibold mb-2 text-white-90">Comments</div>
                      {task.comments
                        ? Object.values(task.comments).map((c,i)=>(
                            <div key={i} className="comment-row d-flex justify-content-between align-items-center p-2 rounded mb-1">
                              <div><strong>{c.author}:</strong> {c.text}</div>
                              <div className="small text-muted-300">{fmtDT(c.timestamp)}</div>
                            </div>
                          ))
                        : <div className="text-muted-400 small">No comments yet.</div>}
                      <div className="d-flex mt-2 gap-2">
                        <input className="form-control form-control-sm dark-input" placeholder="Add a comment…" value={comments[task.id]||""} onChange={e=>setComments(p=>({...p,[task.id]:e.target.value}))} />
                        <button className="btn btn-sm btn-outline-primary" onClick={()=>addComment(task.id, comments[task.id])} disabled={loading || !(comments[task.id]||"").trim()}>Add</button>
                      </div>
                    </div>

                    {/* actions */}
                    <div className="d-flex justify-content-between align-items-center mt-3">
                      <div className="btn-group btn-group-sm">
                        <button className={cn("btn", task.status==="pending"?"btn-warning":"btn-outline-warning")} onClick={()=>updateTaskStatus(task.id,"pending")}>Pending</button>
                        <button className={cn("btn", task.status==="in-progress"?"btn-info text-dark":"btn-outline-info")} onClick={()=>updateTaskStatus(task.id,"in-progress")}>In Progress</button>
                        <button className={cn("btn", task.status==="completed"?"btn-success":"btn-outline-success")} onClick={()=>updateTaskStatus(task.id,"completed")}>Completed</button>
                      </div>
                      <div className="d-flex gap-2">
                        <button className="btn btn-sm btn-outline-light" onClick={()=>{ setSelectedTask(task); setShowModal(true); }}>View Details</button>
                        <button className="btn btn-sm btn-outline-danger" onClick={()=>{ if(window.confirm("Delete this task?")) deleteTask(task.id); }} disabled={loading}>Delete</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* add task modal */}
      {showAdd && (
        <div className="modal fade show" style={{display:"block", background:"rgba(2,6,23,.8)"}} onClick={()=>{ if(!dirty || window.confirm("Discard changes?")) setShowAdd(false); }}>
          <div className="modal-dialog modal-lg modal-dialog-centered" onClick={(e)=>e.stopPropagation()}>
            <div className="modal-content overflow-hidden modal-content-dark">
              <div className="modal-header modal-header-grad">
                <h5 className="modal-title text-white">Add New Task</h5>
                <button className="btn-close btn-close-white" onClick={()=>{ if(!dirty || window.confirm("Discard changes?")) setShowAdd(false); }} />
              </div>
              <form ref={addFormRef} onSubmit={handleAddTask}>
                <div className="modal-body modal-body-dark">
                  {error && <div className="alert alert-danger py-2">{error}</div>}
                  <div className="row g-3">
                    <div className="col-md-8">
                      <label className="form-label text-muted-200">Title</label>
                      <input className="form-control dark-input" value={newTask.title} onChange={e=>{ setNewTask(p=>({...p,title:e.target.value})); setDirty(true); }} placeholder="Task title…" required />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label text-muted-200">Assigned To</label>
                      <select className="form-select dark-input" value={newTask.assignedTo} onChange={e=>{ setNewTask(p=>({...p,assignedTo:e.target.value})); setDirty(true); }}>
                        <option value="admin">Admin</option>
                        <option value="manager">Manager</option>
                        <option value="user">User</option>
                      </select>
                    </div>
                    <div className="col-12">
                      <label className="form-label text-muted-200">Description</label>
                      <textarea className="form-control dark-input" rows={3} value={newTask.description} onChange={e=>{ setNewTask(p=>({...p,description:e.target.value})); setDirty(true); }} placeholder="Task description…" />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label text-muted-200">Category</label>
                      <select className="form-select dark-input" value={newTask.category} onChange={e=>{ setNewTask(p=>({...p,category:e.target.value})); setDirty(true); }}>
                        {Object.keys(CATEGORIES).map(c=> <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label text-muted-200">Priority</label>
                      <select className="form-select dark-input" value={newTask.priority} onChange={e=>{ setNewTask(p=>({...p,priority:e.target.value})); setDirty(true); }}>
                        {Object.keys(PRIORITIES).map(p=> <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label text-muted-200">Due Date</label>
                      <input type="date" className="form-control dark-input" value={newTask.dueDate} onChange={e=>{ setNewTask(p=>({...p,dueDate:e.target.value})); setDirty(true); }} />
                    </div>
                  </div>
                </div>
                <div className="modal-footer modal-footer-dark">
                  <button type="button" className="btn btn-light" onClick={()=>{ if(!dirty || window.confirm("Discard changes?")) setShowAdd(false); }}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={loading || !backendOK}>{loading ? "Saving…" : "Save Task"}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* details modal */}
      {showModal && selectedTask && (
        <div className="modal-overlay" onClick={()=>setShowModal(false)}>
          <div className="modal-modern" onClick={(e)=>e.stopPropagation()}>
            <div className="modal-header" style={{background:"linear-gradient(90deg,#06b6d4,#3b82f6)", color:"#fff"}}>
              <h5 className="mb-0">{selectedTask.title}</h5>
              <button className="btn btn-sm btn-light" onClick={()=>setShowModal(false)}>Close</button>
            </div>
            <div className="modal-body p-3" style={{background:"#0f172a"}}>
              <div className="row g-3">
                <div className="col-md-8">
                  <div className="panel-soft">
                    <div className="small text-muted-300">Description</div>
                    <div className="text-white-90">{selectedTask.description || "-"}</div>
                  </div>
                  <div className="panel-soft">
                    <div className="small text-muted-300">Comments</div>
                    {selectedTask.comments
                      ? Object.values(selectedTask.comments).map((c,i)=>(
                          <div key={i} className="comment-row d-flex justify-content-between align-items-center p-2 rounded mb-1">
                            <div><strong>{c.author}:</strong> {c.text}</div>
                            <div className="small text-muted-300">{fmtDT(c.timestamp)}</div>
                          </div>
                        ))
                      : (<div className="text-muted-400 small">No comments yet.</div>)}
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="panel-soft">
                    <div className="small text-muted-300">Category</div>
                    <div className="text-white-90" style={{color:CATEGORIES[selectedTask.category]||"#ddd"}}>{selectedTask.category}</div>
                  </div>
                  <div className="panel-soft">
                    <div className="small text-muted-300">Priority</div>
                    <div className="text-white-90" style={{color:PRIORITIES[selectedTask.priority]||"#ddd"}}>{selectedTask.priority}</div>
                  </div>
                  <div className="panel-soft">
                    <div className="small text-muted-300">Assigned To</div>
                    <div className="text-white-90">{selectedTask.assignedTo}</div>
                  </div>
                  <div className="panel-soft">
                    <div className="small text-muted-300">Status</div>
                    <div className="text-white-90">{selectedTask.status}</div>
                  </div>
                  <div className="panel-soft">
                    <div className="small text-muted-300">Created</div>
                    <div className="text-white-90">{fmtDT(selectedTask.createdAt)}</div>
                  </div>
                  {selectedTask.dueDate && (
                    <div className="panel-soft">
                      <div className="small text-muted-300">Due Date</div>
                      <div className="text-white-90">{selectedTask.dueDate}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
