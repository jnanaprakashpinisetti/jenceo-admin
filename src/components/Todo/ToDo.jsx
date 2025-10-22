// src/components/Tasks/ToDo.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import firebaseDB from "../../firebase";

// If you have AuthContext, uncomment this:
// import { useAuth } from "../../AuthContext";

// ---------- tiny helpers ----------
const cn = (...xs) => xs.filter(Boolean).join(" ");
const safeVal = (v, d = "") => (v === null || v === undefined ? d : v);
const isFn = (x) => typeof x === "function";

const fmtDT = (ts) => {
  try {
    if (!ts) return "Recent";
    const d = typeof ts === "number" ? new Date(ts) : new Date(String(ts));
    return d.toLocaleString("en-GB", { hour12: true });
  } catch {
    return "Recent";
  }
};

const todayYMD = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

// ---------- RTDB helpers ----------
const hasRTDB =
  !!firebaseDB && (isFn(firebaseDB.child) || isFn(firebaseDB.ref));

const getRef = (path) => {
  if (!hasRTDB) return null;
  const p = String(path || "").trim();
  if (!p) {
    return isFn(firebaseDB.child)
      ? firebaseDB.child("ToDo")
      : firebaseDB.ref("ToDo");
  }
  return isFn(firebaseDB.child) ? firebaseDB.child(p) : firebaseDB.ref(p);
};

// ---------- constants ----------
// Expanded categories requested
const CATEGORIES = {
  "Worker Call": "#22c55e",
  "Petty Cash": "#f59e0b",
  Client: "#3b82f6",
  Development: "#ec4899",
  Design: "#a855f7",
  HR: "#06b6d4",
  Finance: "#10b981",
  Admin: "#f97316",
  "IT Support": "#6366f1",
  Operations: "#0ea5e9",
  Sales: "#e11d48",
  Marketing: "#84cc16",
  Other: "#94a3b8",
};

const PRIORITIES = {
  Lowest: "#6b7280",
  Low: "#84cc16",
  Medium: "#facc15",
  High: "#fb923c",
  Highest: "#ef4444",
};

const STATUS = {
  "To Do": { bg: "linear-gradient(135deg,#2b2f43,#353c5a)", border: "#6b7280" },
  "In Progress": { bg: "linear-gradient(135deg,#19324a,#1f4a75)", border: "#3b82f6" },
  "In Review": { bg: "linear-gradient(135deg,#7c2d12,#9a3412)", border: "#ea580c" },
  Done: { bg: "linear-gradient(135deg,#183a2b,#1e4d38)", border: "#22c55e" },
};

const ISSUE_TYPES = {
  Story: { icon: "📖", color: "#3b82f6" },
  Task: { icon: "✓", color: "#22c55e" },
  Bug: { icon: "🐛", color: "#ef4444" },
  Epic: { icon: "⚡", color: "#8b5cf6" },
  SubTask: { icon: "🔹", color: "#6b7280" },
};

const TABS = [
  { id: "all", label: "All Tasks" },
  { id: "To Do", label: "To Do" },
  { id: "In Progress", label: "In Progress" },
  { id: "In Review", label: "In Review" },
  { id: "Done", label: "Done" },
];

// ticket/project keys (choose on create)
const TICKET_KEYS = ["JEN", "OPS", "CRM", "FIN", "HR"];

// ---------- component ----------
export default function ToDo() {
  // const { user: authUser } = useAuth?.() || {};
  // Fallback if no AuthContext:
  const authUser =
    // ↓ replace this fallback with your actual auth object if available
    { uid: "guest", dbId: "guest", name: "Guest", role: "employee", photoURL: "" };

  const myId = authUser?.dbId || authUser?.uid || "guest";
  const myName = authUser?.name || "Guest";
  const myRole = (authUser?.role || "employee").toLowerCase();
  const isPrivileged =
    myRole === "admin" || myRole === "manager" || myRole === "super admin" || myRole === "superadmin";

  // data
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState({}); // { userKey: { name, role, photoURL } }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ui filters
  const [activeTab, setActiveTab] = useState("all");
  const [qtext, setQtext] = useState("");
  const [cat, setCat] = useState("ALL");
  const [prio, setPrio] = useState("ALL");
  const [assignee, setAssignee] = useState("ALL");
  const [issueType, setIssueType] = useState("ALL");
  const [sort, setSort] = useState("createdAt_desc");

  // notifications
  const [notifOpen, setNotifOpen] = useState(false);
  const lastSeenKey = `todo:lastSeen:${myId}`;
  const [lastSeen, setLastSeen] = useState(() => Number(localStorage.getItem(lastSeenKey) || 0));

  // modals
  const [showAdd, setShowAdd] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  // new task form
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    category: "Worker Call",
    priority: "Medium",
    issueType: "Task",
    assignedTo: "", // will default to me once users load
    status: "To Do",
    dueDate: "",
    storyPoints: 1,
    labels: [],
    parentTask: "",
    ticketKey: "JEN",
  });

  // comments/subtasks inputs
  const [comments, setComments] = useState({});
  const [subtasks, setSubtasks] = useState({});

  const addFormRef = useRef(null);
  const backendOK = !!hasRTDB;

  // ---------- subscribe USERS (JenCeo-DataBase/Users) ----------
  useEffect(() => {
    if (!backendOK) return;
    const ref = getRef("JenCeo-DataBase/Users");
    const cb = (snap) => {
      const raw = snap.val?.() ?? snap;
      const obj = raw || {};
      // Normalize into { key: { name, role, photoURL } }
      const mapped = {};
      Object.entries(obj).forEach(([k, v]) => {
        if (v && typeof v === "object") {
          mapped[k] = {
            name: v.name || v.displayName || v.username || k,
            role: (v.role || v.userRole || "employee").toLowerCase(),
            photoURL: v.photoURL || v.avatar || "",
          };
        }
      });
      setUsers(mapped);
      // default assignee in create modal
      setNewTask((p) => ({
        ...p,
        assignedTo: p.assignedTo || myId,
      }));
    };
    try {
      if (isFn(ref.on)) {
        ref.on("value", cb);
        return () => {
          try { ref.off("value", cb); } catch {}
        };
      }
      ref.once?.("value", (s) => cb(s));
    } catch (e) {
      console.error("Users subscribe error:", e);
    }
  }, [backendOK, myId]);

  // ---------- subscribe TASKS (ToDo root) ----------
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
      const val = snap.val?.() ?? snap;
      const obj = val || {};
      const list = Object.entries(obj).map(([id, v]) => ({
        id,
        ...v,
      }));
      list.sort(
        (a, b) =>
          (b.updatedAt || b.createdAt || 0) -
          (a.updatedAt || a.createdAt || 0)
      );
      setTasks(list);
      setLoading(false);
    };

    try {
      if (isFn(ref.on)) {
        ref.on("value", cb);
        return () => {
          try { ref.off("value", cb); } catch {}
        };
      }
      ref.once?.("value", (s) => cb(s));
    } catch (err) {
      console.error("ToDo RTDB subscribe error:", err);
      setError("Failed to load tasks from database.");
      setLoading(false);
    }
  }, [backendOK]);

  // ---------- computed maps ----------
  const tabCounts = useMemo(() => {
    const base = { all: 0, "To Do": 0, "In Progress": 0, "In Review": 0, Done: 0 };
    tasks.forEach((t) => {
      // visibility check here so counts match the list a user actually sees
      if (!isPrivileged) {
        const mine = t.assignedTo === myId || t.createdById === myId;
        if (!mine) return;
      }
      base.all += 1;
      if (base[t.status] !== undefined) base[t.status] += 1;
    });
    return base;
  }, [tasks, isPrivileged, myId]);

  // ---------- filtered list ----------
  const filtered = useMemo(() => {
    let list = tasks.slice();

    // Visibility: privileged see all; others see only assigned to them or created by them
    if (!isPrivileged) {
      list = list.filter(
        (t) => t.assignedTo === myId || t.createdById === myId
      );
    }

    if (activeTab !== "all") list = list.filter((t) => t.status === activeTab);
    if (cat !== "ALL") list = list.filter((t) => t.category === cat);
    if (prio !== "ALL") list = list.filter((t) => t.priority === prio);
    if (assignee !== "ALL") list = list.filter((t) => t.assignedTo === assignee);
    if (issueType !== "ALL") list = list.filter((t) => t.issueType === issueType);
    if (qtext.trim()) {
      const q = qtext.toLowerCase();
      list = list.filter(
        (t) =>
          t.title?.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q) ||
          t.assignedToName?.toLowerCase?.().includes(q) ||
          t.ticketKey?.toLowerCase?.().includes(q) ||
          (t.labels && t.labels.some((l) => l.toLowerCase().includes(q)))
      );
    }
    const [key, dir] = sort.split("_");
    list.sort((a, b) => {
      const av =
        key === "createdAt"
          ? a.createdAt || 0
          : safeVal(a[key], "").toString().toLowerCase();
      const bv =
        key === "createdAt"
          ? b.createdAt || 0
          : safeVal(b[key], "").toString().toLowerCase();
      if (av === bv) return 0;
      return dir === "asc" ? (av > bv ? 1 : -1) : av < bv ? 1 : -1;
    });
    return list;
  }, [
    tasks,
    isPrivileged,
    myId,
    activeTab,
    cat,
    prio,
    assignee,
    issueType,
    qtext,
    sort,
  ]);

  // ---------- notifications (localStorage + UI) ----------
  const relevantToMe = (t) => t.assignedTo === myId || t.createdById === myId;
  const unread = useMemo(() => {
    const unseen = tasks.filter((t) => relevantToMe(t) && (t.updatedAt || t.createdAt || 0) > lastSeen);
    // top 8 newest
    return unseen.sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0)).slice(0, 8);
  }, [tasks, lastSeen]);

  const markAllSeen = () => {
    const now = Date.now();
    localStorage.setItem(lastSeenKey, String(now));
    setLastSeen(now);
    setNotifOpen(false);
  };

  // ---------- UI pieces ----------
  const UserAvatar = ({ userId, size = "sm" }) => {
    const u = users[userId] || {};
    const photo = u.photoURL;
    const name = u.name || userId || "User";
    const initials = name
      .split(" ")
      .map((s) => s[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

    if (photo) {
      return (
        <img
          src={photo}
          alt={name}
          title={`${name} (${u.role || "user"})`}
          className={`avatar avatar-${size}`}
          style={{ objectFit: "cover" }}
        />
      );
    }
    return (
      <span
        className={`avatar avatar-${size} avatar-fallback`}
        title={`${name} (${u.role || "user"})`}
      >
        {initials}
      </span>
    );
  };

  const IssueTypeBadge = ({ type }) => {
    const issue = ISSUE_TYPES[type] || ISSUE_TYPES.Task;
    return (
      <span
        className="issue-type-badge"
        style={{ backgroundColor: issue.color }}
        title={type}
      >
        {issue.icon} {type}
      </span>
    );
  };

  // ---------- audit helpers ----------
  const pushHistory = async (taskId, entry) => {
    const now = Date.now();
    try {
      await getRef(`ToDo/${taskId}/history/${now}`).set({
        ...entry,
        user: myId,
        userName: myName,
        timestamp: now,
      });
      await getRef(`ToDo/${taskId}`).update({ updatedAt: now });
    } catch (e) {
      console.error("pushHistory error:", e);
    }
  };

  // ---------- ticket sequence per key (JEN-01, JEN-02, …) ----------
  const nextTicketSeq = async (key) => {
    const ref = getRef(`ToDoSequences/${key}`);
    if (!ref) return 1;
    // Prefer RTDB transaction if available
    if (isFn(ref.transaction)) {
      let next = 1;
      try {
        await ref.transaction((curr) => {
          next = (curr || 0) + 1;
          return next;
        });
        return next;
      } catch (e) {
        console.warn("transaction failed, falling back to read/set", e);
      }
    }
    // Fallback (race-prone, but better than nothing)
    try {
      const snap = await ref.get?.();
      const curr = snap?.val?.() ?? snap?.val ?? 0;
      const next = (Number(curr) || 0) + 1;
      await ref.set(next);
      return next;
    } catch {
      return 1;
    }
  };

  const formatTicket = (key, n) => `${key}-${String(n).padStart(2, "0")}`;

  // ---------- actions ----------
  const updateTaskStatus = async (taskId, newStatus) => {
    if (!backendOK) return;
    try {
      const now = Date.now();
      const ref = getRef(`ToDo/${taskId}`);
      await ref.update({ status: newStatus, updatedAt: now });
      await pushHistory(taskId, {
        action: "status_changed",
        field: "status",
        from: null,
        to: newStatus,
      });
    } catch (err) {
      console.error("update status error:", err);
      setError("Failed to update task status.");
    }
  };

  const updateTaskField = async (taskId, field, value) => {
    if (!backendOK) return;
    try {
      const now = Date.now();
      const ref = getRef(`ToDo/${taskId}`);
      await ref.update({ [field]: value, updatedAt: now });
      await pushHistory(taskId, {
        action: "field_updated",
        field,
        from: null,
        to: value,
      });

      if (field === "assignedTo") {
        const u = users[value] || {};
        await ref.update({
          assignedToName: u.name || value,
          assignedToAvatar: u.photoURL || "",
        });
      }
    } catch (err) {
      console.error(`update ${field} error:`, err);
      setError(`Failed to update ${field}.`);
    }
  };

  const deleteTask = async (taskId) => {
    if (!backendOK) return;
    try {
      await getRef(`ToDo/${taskId}`).remove();
    } catch (err) {
      console.error("delete task error:", err);
      setError("Failed to delete task.");
    }
  };

  const addComment = async (taskId, text) => {
    const body = (text || "").trim();
    if (!body) return;
    if (!backendOK) return;
    try {
      const now = Date.now();
      const ref = getRef(`ToDo/${taskId}/comments`);
      const payload = {
        text: body,
        author: myId,
        authorName: myName,
        authorPhoto: users[myId]?.photoURL || "",
        timestamp: now,
        type: "comment",
      };
      if (isFn(ref.push)) {
        await ref.push(payload);
      } else {
        await getRef(`ToDo/${taskId}/comments/${now}`).set(payload);
      }
      setComments((p) => ({ ...p, [taskId]: "" }));
      // also log to history
      await pushHistory(taskId, {
        action: "comment_added",
        field: "comment",
        from: null,
        to: body.slice(0, 80),
      });
    } catch (err) {
      console.error("add comment error:", err);
      setError("Failed to add comment.");
    }
  };

  const addSubtask = async (taskId, title) => {
    if (!title.trim()) return;
    if (!backendOK) return;
    try {
      const now = Date.now();
      const ref = getRef(`ToDo/${taskId}/subtasks`);
      const subtask = {
        title: title.trim(),
        completed: false,
        createdBy: myId,
        createdByName: myName,
        createdAt: now,
      };
      let subtaskId = String(now);
      if (isFn(ref.push)) {
        const pushed = await ref.push(subtask);
        subtaskId = pushed?.key || subtaskId;
      } else {
        await getRef(`ToDo/${taskId}/subtasks/${now}`).set(subtask);
      }
      setSubtasks((p) => ({ ...p, [taskId]: "" }));
      await pushHistory(taskId, {
        action: "subtask_added",
        field: "subtask",
        from: null,
        to: subtask.title,
      });
    } catch (err) {
      console.error("add subtask error:", err);
      setError("Failed to add subtask.");
    }
  };

  const toggleSubtask = async (taskId, subtaskId, completed) => {
    if (!backendOK) return;
    try {
      await getRef(`ToDo/${taskId}/subtasks/${subtaskId}`).update({
        completed: !!completed,
        completedAt: completed ? Date.now() : null,
      });
      await pushHistory(taskId, {
        action: completed ? "subtask_completed" : "subtask_reopened",
        field: "subtask",
        from: completed ? "open" : "done",
        to: completed ? "done" : "open",
      });
    } catch (err) {
      console.error("toggle subtask error:", err);
      setError("Failed to update subtask.");
    }
  };

  // ---------- add task ----------
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
    // get next per-project sequence
    const nextSeq = await nextTicketSeq(newTask.ticketKey || "JEN");
    const ticketSeq = String(nextSeq); // store as raw number/string
    const assUser = users[newTask.assignedTo] || {};
    const payload = {
      title: newTask.title.trim(),
      description: newTask.description?.trim() || "",
      category: newTask.category,
      priority: newTask.priority,
      issueType: newTask.issueType,
      assignedTo: newTask.assignedTo || myId,
      assignedToName: assUser.name || (newTask.assignedTo || ""),
      assignedToAvatar: assUser.photoURL || "",
      status: newTask.status,
      dueDate: newTask.dueDate || "",
      storyPoints: newTask.storyPoints || 1,
      labels: newTask.labels || [],
      parentTask: newTask.parentTask || "",
      // ticket fields
      ticketKey: newTask.ticketKey || "JEN",
      ticketSeq, // numeric string; show formatted in UI
      // creator
      createdById: myId,
      createdBy: myName,
      createdByAvatar: users[myId]?.photoURL || "",
      createdAt: now,
      updatedAt: now,
      // audit collections
      comments: {},
      subtasks: {},
      attachments: {},
      history: {
        [now]: {
          action: "created",
          field: "task",
          from: null,
          to: newTask.status,
          user: myId,
          userName: myName,
          timestamp: now,
        },
      },
    };

    try {
      const ref = getRef("ToDo");
      if (isFn(ref.push)) {
        await ref.push(payload);
      } else if (isFn(ref.set)) {
        await ref.set(payload);
      }
      setNewTask({
        title: "",
        description: "",
        category: "Worker Call",
        priority: "Medium",
        issueType: "Task",
        assignedTo: myId,
        status: "To Do",
        dueDate: "",
        storyPoints: 1,
        labels: [],
        parentTask: "",
        ticketKey: "JEN",
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

  // beforeunload guard
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

  // ---------- render ----------
  const resetFilters = () => {
    setActiveTab("all");
    setQtext("");
    setCat("ALL");
    setPrio("ALL");
    setAssignee("ALL");
    setIssueType("ALL");
    setSort("createdAt_desc");
  };

  const ticketLabel = (task) => {
    if (task.ticketKey && task.ticketSeq) {
      const n = Number(task.ticketSeq);
      return formatTicket(task.ticketKey, isNaN(n) ? task.ticketSeq : n);
    }
    return `#${String(task.id || "").slice(-6)}`;
  };

  const isOverdue = (task) => {
    if (!task.dueDate) return false;
    if (task.status === "Done") return false;
    try {
      const due = new Date(task.dueDate + "T23:59:59");
      return Date.now() > due.getTime();
    } catch {
      return false;
    }
  };

  return (
    <div className="todo-wrap">
      {/* Header */}
      <div className="todo-head rounded-4 p-3 mb-3 shadow-sm mmt-3">
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <div className="tiny text-white-50 text-uppercase">Advanced Task Manager</div>
            <div className="h3 fw-bold mb-0 text-white">JIRA-like Task Board</div>
            {!backendOK && (
              <div className="text-danger small mt-1">
                Firebase not configured — reads/writes are disabled.
              </div>
            )}
            {error && <div className="text-danger small">{error}</div>}
          </div>

          <div className="d-flex align-items-center gap-2">
            {/* Notifications bell */}
            <div className="notif-wrap position-relative">
              <button
                className={cn("btn btn-sm", unread.length ? "btn-warning" : "btn-outline-light")}
                onClick={() => setNotifOpen((s) => !s)}
                title={unread.length ? `${unread.length} updates` : "No new updates"}
              >
                🔔
                {unread.length > 0 && (
                  <span className="badge bg-danger ms-2">{unread.length}</span>
                )}
              </button>
              {notifOpen && (
                <div className="notif-dropdown">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <strong>Updates</strong>
                    <button className="btn btn-sm btn-success" onClick={markAllSeen}>
                      Mark as read
                    </button>
                  </div>
                  {unread.length === 0 ? (
                    <div className="text-muted small">You're all caught up.</div>
                  ) : (
                    <ul className="list-unstyled m-0">
                      {unread.map((t) => (
                        <li key={t.id} className="notif-item" onClick={() => { setSelectedTask(t); setShowDetail(true); setNotifOpen(false); }}>
                          <div className="d-flex align-items-center gap-2">
                            <UserAvatar userId={t.assignedTo} size="xs" />
                            <div className="flex-grow-1">
                              <div className="small text-white-90">{t.title}</div>
                              <div className="tiny text-muted-300">{ticketLabel(t)} • {fmtDT(t.updatedAt || t.createdAt)}</div>
                            </div>
                            <span
                              className="badge"
                              style={{ background: STATUS[t.status]?.border || "#475569" }}
                            >
                              {t.status}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            <button className="btn btn-warning" onClick={() => setShowAdd(true)} disabled={!backendOK}>
              + Create Issue
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="d-flex flex-wrap gap-2 mt-3 align-items-center">
          <div className="btn-group btn-group-sm" role="group" aria-label="tabs">
            {TABS.map((t) => (
              <button
                key={t.id}
                className={cn("btn", activeTab === t.id ? "btn-info text-dark" : "btn-outline-info")}
                onClick={() => setActiveTab(t.id)}
              >
                {t.label}
                <span className="badge bg-dark ms-2">{tabCounts[t.id]}</span>
              </button>
            ))}
          </div>

          <select
            className="form-select form-select-sm dark-input"
            style={{ width: 180 }}
            value={cat}
            onChange={(e) => setCat(e.target.value)}
          >
            <option value="ALL">All Categories</option>
            {Object.keys(CATEGORIES).map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>

          <select
            className="form-select form-select-sm dark-input"
            style={{ width: 150 }}
            value={prio}
            onChange={(e) => setPrio(e.target.value)}
          >
            <option value="ALL">All Priorities</option>
            {Object.keys(PRIORITIES).map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>

          <select
            className="form-select form-select-sm dark-input"
            style={{ width: 200 }}
            value={assignee}
            onChange={(e) => setAssignee(e.target.value)}
          >
            <option value="ALL">All Assignees</option>
            {Object.entries(users).map(([k, u]) => (
              <option key={k} value={k}>
                {u.name} ({u.role || "user"})
              </option>
            ))}
          </select>

          <select
            className="form-select form-select-sm dark-input"
            style={{ width: 140 }}
            value={issueType}
            onChange={(e) => setIssueType(e.target.value)}
          >
            <option value="ALL">All Types</option>
            {Object.keys(ISSUE_TYPES).map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>

          <div className="input-group input-group-sm" style={{ maxWidth: 360 }}>
            <span className="input-group-text dark-input">🔎</span>
            <input
              className="form-control dark-input"
              placeholder="Search tasks, labels..."
              value={qtext}
              onChange={(e) => setQtext(e.target.value)}
            />
          </div>

          <select
            className="form-select form-select-sm dark-input"
            style={{ width: 160 }}
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="createdAt_desc">Newest</option>
            <option value="createdAt_asc">Oldest</option>
            <option value="title_asc">Title A→Z</option>
            <option value="title_desc">Title Z→A</option>
            <option value="priority_desc">Priority High→Low</option>
            <option value="priority_asc">Priority Low→High</option>
          </select>

          {/* Reset Filters button */}
          <button className="btn btn-sm btn-outline-warning ms-auto" onClick={resetFilters}>
            Reset Filters
          </button>
        </div>
      </div>

      {/* Task list */}
      {loading && tasks.length === 0 ? (
        <div className="alert alert-info">Loading tasks…</div>
      ) : (
        <div className="row">
          {filtered.length === 0 ? (
            <div className="col-12">
              <div className="neo-card p-4 text-center">
                No tasks found. Create a new task to get started!
              </div>
            </div>
          ) : (
            filtered.map((task) => {
              const ticket = ticketLabel(task);
              const overdue = isOverdue(task);
              return (
                <div className="col-lg-6 col-xl-4 mb-3" key={task.id}>
                  <div className="task-card rounded-3 overflow-hidden">
                    <div className="task-border" style={{ borderColor: STATUS[task.status]?.border }} />
                    <div className="p-3">
                      {/* Header */}
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <div className="d-flex align-items-center gap-2">
                          <IssueTypeBadge type={task.issueType} />
                          <span className="task-id text-muted-300 small">{ticket}</span>
                        </div>
                        <div className="d-flex align-items-center gap-1">
                          <span className="story-points-badge" title="Story Points">
                            {task.storyPoints || 1} SP
                          </span>
                          <span
                            className="badge priority-badge"
                            style={{ background: PRIORITIES[task.priority] }}
                          >
                            {task.priority}
                          </span>
                        </div>
                      </div>

                      {/* Title & assignee */}
                      <h6 className="text-white mb-2">{task.title}</h6>
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <div className="d-flex align-items-center gap-2">
                          <UserAvatar userId={task.assignedTo} />
                          <div className="small text-white-80">
                            {task.assignedToName || users[task.assignedTo]?.name || task.assignedTo}
                          </div>
                        </div>
                        <span
                          className="status-badge"
                          style={{
                            background: STATUS[task.status]?.border,
                            color: "#fff",
                            padding: "2px 8px",
                            borderRadius: "12px",
                            fontSize: "0.75rem",
                          }}
                        >
                          {task.status}
                        </span>
                      </div>

                      {/* Labels */}
                      {task.labels && task.labels.length > 0 && (
                        <div className="d-flex flex-wrap gap-1 mb-2">
                          {task.labels.slice(0, 3).map((label, i) => (
                            <span key={i} className="label-tag small">
                              {label}
                            </span>
                          ))}
                          {task.labels.length > 3 && (
                            <span className="label-tag small">
                              +{task.labels.length - 3}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Due date */}
                      {task.dueDate && (
                        <div className="small mb-2">
                          <strong className={overdue ? "text-danger" : "text-success"}>
                            Due:
                          </strong>{" "}
                          <span className={overdue ? "text-danger" : "text-success"}>
                            {task.dueDate}
                          </span>
                        </div>
                      )}

                      {/* Progress */}
                      {task.subtasks && Object.keys(task.subtasks).length > 0 && (
                        <div className="mb-2">
                          <div className="d-flex justify-content-between small text-muted-300 mb-1">
                            <span>Progress</span>
                            <span>
                              {Object.values(task.subtasks).filter((st) => st.completed).length}/
                              {Object.keys(task.subtasks).length}
                            </span>
                          </div>
                          <div className="progress" style={{ height: 6 }}>
                            <div
                              className="progress-bar"
                              style={{
                                width: `${
                                  (Object.values(task.subtasks).filter((st) => st.completed).length /
                                    Object.keys(task.subtasks).length) *
                                  100
                                }%`,
                                backgroundColor: PRIORITIES[task.priority],
                              }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Quick actions */}
                      <div className="d-flex justify-content-between align-items-center mt-3">
                        <div className="btn-group btn-group-sm">
                          <button
                            className={cn("btn", task.status === "To Do" ? "btn-secondary" : "btn-outline-secondary")}
                            onClick={() => updateTaskStatus(task.id, "To Do")}
                          >
                            To Do
                          </button>
                          <button
                            className={cn("btn", task.status === "In Progress" ? "btn-primary" : "btn-outline-primary")}
                            onClick={() => updateTaskStatus(task.id, "In Progress")}
                          >
                            In Progress
                          </button>
                          <button
                            className={cn("btn", task.status === "Done" ? "btn-success" : "btn-outline-success")}
                            onClick={() => updateTaskStatus(task.id, "Done")}
                          >
                            Done
                          </button>
                        </div>
                        <div className="d-flex gap-1">
                          <button
                            className="btn btn-sm btn-outline-light"
                            onClick={() => {
                              setSelectedTask(task);
                              setShowDetail(true);
                            }}
                          >
                            View
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => {
                              if (window.confirm("Delete this task?")) deleteTask(task.id);
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Create Issue Modal */}
      {showAdd && (
        <div
          className="modal fade show"
          style={{ display: "block", background: "rgba(2,6,23,.8)" }}
          onClick={() => {
            if (!dirty || window.confirm("Discard changes?")) setShowAdd(false);
          }}
        >
          <div
            className="modal-dialog modal-lg modal-dialog-centered"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content overflow-hidden modal-content-dark">
              <div className="modal-header modal-header-grad">
                <h5 className="modal-title text-white">Create New Issue</h5>
                <button
                  className="btn-close btn-close-white"
                  onClick={() => {
                    if (!dirty || window.confirm("Discard changes?")) setShowAdd(false);
                  }}
                />
              </div>
              <form ref={addFormRef} onSubmit={handleAddTask}>
                <div className="modal-body modal-body-dark">
                  {error && <div className="alert alert-danger py-2">{error}</div>}
                  <div className="row g-3">
                    <div className="col-md-8">
                      <label className="form-label text-muted-200">Issue Title</label>
                      <input
                        className="form-control dark-input"
                        value={newTask.title}
                        onChange={(e) => {
                          setNewTask((p) => ({ ...p, title: e.target.value }));
                          setDirty(true);
                        }}
                        placeholder="What needs to be done?"
                        required
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label text-muted-200">Issue Type</label>
                      <select
                        className="form-select dark-input"
                        value={newTask.issueType}
                        onChange={(e) => {
                          setNewTask((p) => ({ ...p, issueType: e.target.value }));
                          setDirty(true);
                        }}
                      >
                        {Object.keys(ISSUE_TYPES).map((k) => (
                          <option key={k} value={k}>
                            {k}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-12">
                      <label className="form-label text-muted-200">Description</label>
                      <textarea
                        className="form-control dark-input"
                        rows={4}
                        value={newTask.description}
                        onChange={(e) => {
                          setNewTask((p) => ({ ...p, description: e.target.value }));
                          setDirty(true);
                        }}
                        placeholder="Detailed description of the issue..."
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label text-muted-200">Assignee</label>
                      <select
                        className="form-select dark-input"
                        value={newTask.assignedTo || myId}
                        onChange={(e) => {
                          setNewTask((p) => ({ ...p, assignedTo: e.target.value }));
                          setDirty(true);
                        }}
                      >
                        {Object.entries(users).map(([k, u]) => (
                          <option key={k} value={k}>
                            {u.name} ({u.role || "user"})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-4">
                      <label className="form-label text-muted-200">Priority</label>
                      <select
                        className="form-select dark-input"
                        value={newTask.priority}
                        onChange={(e) => {
                          setNewTask((p) => ({ ...p, priority: e.target.value }));
                          setDirty(true);
                        }}
                      >
                        {Object.keys(PRIORITIES).map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-4">
                      <label className="form-label text-muted-200">Story Points</label>
                      <input
                        type="number"
                        className="form-control dark-input"
                        min="1"
                        max="40"
                        value={newTask.storyPoints}
                        onChange={(e) => {
                          const v = parseInt(e.target.value) || 1;
                          setNewTask((p) => ({ ...p, storyPoints: v }));
                          setDirty(true);
                        }}
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label text-muted-200">Category</label>
                      <select
                        className="form-select dark-input"
                        value={newTask.category}
                        onChange={(e) => {
                          setNewTask((p) => ({ ...p, category: e.target.value }));
                          setDirty(true);
                        }}
                      >
                        {Object.keys(CATEGORIES).map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-4">
                      <label className="form-label text-muted-200">Due Date</label>
                      <input
                        type="date"
                        className="form-control dark-input"
                        min={todayYMD()}
                        value={newTask.dueDate}
                        onChange={(e) => {
                          setNewTask((p) => ({ ...p, dueDate: e.target.value }));
                          setDirty(true);
                        }}
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label text-muted-200">Project Key</label>
                      <select
                        className="form-select dark-input"
                        value={newTask.ticketKey}
                        onChange={(e) => {
                          setNewTask((p) => ({ ...p, ticketKey: e.target.value }));
                          setDirty(true);
                        }}
                      >
                        {TICKET_KEYS.map((k) => (
                          <option key={k} value={k}>
                            {k}
                          </option>
                        ))}
                      </select>
                      <div className="form-text text-muted-300">
                        IDs will be like <code>JEN-01</code>, <code>JEN-02</code>…
                      </div>
                    </div>
                  </div>
                </div>

                <div className="modal-footer modal-footer-dark">
                  <button
                    type="button"
                    className="btn btn-light"
                    onClick={() => {
                      if (!dirty || window.confirm("Discard changes?")) setShowAdd(false);
                    }}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={loading || !backendOK}>
                    {loading ? "Creating..." : "Create Issue"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetail && selectedTask && (
        <div className="modal-overlay" onClick={() => setShowDetail(false)}>
          <div className="modal-modern modal-xl" onClick={(e) => e.stopPropagation()}>
            <div
              className="modal-header"
              style={{ background: "linear-gradient(90deg,#06b6d4,#3b82f6)", color: "#fff" }}
            >
              <div className="d-flex align-items-center gap-2">
                <IssueTypeBadge type={selectedTask.issueType} />
                <h5 className="mb-0">
                  {selectedTask.title}{" "}
                  <small className="opacity-75">
                    {ticketLabel(selectedTask)}
                  </small>
                </h5>
              </div>
              <button className="btn btn-sm btn-light" onClick={() => setShowDetail(false)}>
                Close
              </button>
            </div>

            <div className="modal-body p-3" style={{ background: "#0f172a" }}>
              <div className="row g-4">
                {/* Left */}
                <div className="col-md-8">
                  <div className="panel-soft">
                    <h6 className="text-white-90 mb-2">Description</h6>
                    <div className="text-white-80">
                      {selectedTask.description || "No description provided."}
                    </div>
                  </div>

                  {/* Subtasks */}
                  {selectedTask.subtasks && (
                    <div className="panel-soft mb-3">
                      <h6 className="text-white-90 mb-2">Subtasks</h6>
                      {Object.keys(selectedTask.subtasks).length === 0 ? (
                        <div className="text-muted-400 small">No subtasks yet.</div>
                      ) : null}
                      {Object.entries(selectedTask.subtasks).map(([id, st]) => (
                        <div key={id} className="subtask-item d-flex align-items-center gap-2 mb-2">
                          <input
                            type="checkbox"
                            checked={!!st.completed}
                            onChange={(e) => toggleSubtask(selectedTask.id, id, e.target.checked)}
                            className="form-check-input"
                          />
                          <span
                            className={
                              st.completed
                                ? "text-muted-300 text-decoration-line-through"
                                : "text-white-80"
                            }
                          >
                            {st.title}
                          </span>
                        </div>
                      ))}
                      <div className="d-flex gap-2 mt-2">
                        <input
                          className="form-control form-control-sm dark-input"
                          placeholder="Add subtask..."
                          value={subtasks[selectedTask.id] || ""}
                          onChange={(e) =>
                            setSubtasks((p) => ({ ...p, [selectedTask.id]: e.target.value }))
                          }
                        />
                        <button
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => addSubtask(selectedTask.id, subtasks[selectedTask.id])}
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Comments */}
                  <div className="panel-soft">
                    <h6 className="text-white-90 mb-2">Activity & Comments</h6>
                    {selectedTask.comments && Object.values(selectedTask.comments).length > 0 ? (
                      Object.values(selectedTask.comments)
                        .sort((a, b) => b.timestamp - a.timestamp)
                        .map((c, i) => (
                          <div key={i} className="comment-row d-flex gap-3 p-3 rounded mb-2">
                            <div>
                              {/* avatar */}
                              {c.authorPhoto ? (
                                <img
                                  src={c.authorPhoto}
                                  alt={c.authorName || c.author}
                                  className="avatar avatar-sm"
                                  style={{ objectFit: "cover" }}
                                />
                              ) : (
                                <span className="avatar avatar-sm avatar-fallback">
                                  {(c.authorName || c.author || "U")
                                    .split(" ")
                                    .map((s) => s[0])
                                    .join("")
                                    .slice(0, 2)
                                    .toUpperCase()}
                                </span>
                              )}
                            </div>
                            <div className="flex-grow-1">
                              <div className="d-flex justify-content-between align-items-center mb-1">
                                <strong className="text-white-90">
                                  {c.authorName || users[c.author]?.name || c.author}
                                </strong>
                                <small className="text-muted-300">{fmtDT(c.timestamp)}</small>
                              </div>
                              <div className="text-white-80">{c.text}</div>
                            </div>
                          </div>
                        ))
                    ) : (
                      <div className="text-muted-400 small">No comments yet.</div>
                    )}
                    <div className="d-flex gap-2 mt-3">
                      <input
                        className="form-control dark-input"
                        placeholder="Add a comment..."
                        value={comments[selectedTask.id] || ""}
                        onChange={(e) =>
                          setComments((p) => ({ ...p, [selectedTask.id]: e.target.value }))
                        }
                      />
                      <button
                        className="btn btn-outline-primary"
                        onClick={() => addComment(selectedTask.id, comments[selectedTask.id])}
                      >
                        Comment
                      </button>
                    </div>
                  </div>

                  {/* History */}
                  <div className="panel-soft">
                    <h6 className="text-white-90 mb-2">Activity History</h6>
                    {selectedTask.history ? (
                      Object.entries(selectedTask.history)
                        .sort(([a], [b]) => Number(b) - Number(a))
                        .slice(0, 12)
                        .map(([ts, h]) => (
                          <div key={ts} className="history-item d-flex gap-2 align-items-start mb-2">
                            <span className="history-dot" />
                            <div className="history-content flex-grow-1">
                              <div className="history-text">
                                <strong>{h.userName || users[h.user]?.name || h.user}</strong>{" "}
                                {String(h.action).replace("_", " ")}
                                {h.field && h.field !== "task" ? ` ${h.field}` : ""}
                                {h.from ? (
                                  <>
                                    {" "}
                                    from <code>{String(h.from)}</code>
                                  </>
                                ) : null}
                                {h.to ? (
                                  <>
                                    {" "}
                                    to <code>{String(h.to)}</code>
                                  </>
                                ) : null}
                              </div>
                              <div className="small text-muted-300">{fmtDT(h.timestamp)}</div>
                            </div>
                          </div>
                        ))
                    ) : (
                      <div className="text-muted-400 small">No history yet.</div>
                    )}
                  </div>
                </div>

                {/* Right */}
                <div className="col-md-4">
                  <div className="sticky-top" style={{ top: "20px" }}>
                    {/* Assignee */}
                    <div className="panel-soft mb-3">
                      <h6 className="text-white-90 mb-2">Assignee</h6>
                      <div className="d-flex align-items-center gap-2">
                        <UserAvatar userId={selectedTask.assignedTo} />
                        <div>
                          <div className="text-white-90">
                            {selectedTask.assignedToName ||
                              users[selectedTask.assignedTo]?.name ||
                              selectedTask.assignedTo}
                          </div>
                          <div className="small text-muted-300">
                            {(users[selectedTask.assignedTo]?.role || "user").toString()}
                          </div>
                        </div>
                      </div>
                      <select
                        className="form-select form-select-sm dark-input mt-2"
                        value={selectedTask.assignedTo}
                        onChange={(e) => updateTaskField(selectedTask.id, "assignedTo", e.target.value)}
                      >
                        {Object.entries(users).map(([k, u]) => (
                          <option key={k} value={k}>
                            {u.name} ({u.role || "user"})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Status */}
                    <div className="panel-soft mb-3">
                      <h6 className="text-white-90 mb-2">Status</h6>
                      <select
                        className="form-select form-select-sm dark-input"
                        value={selectedTask.status}
                        onChange={(e) => updateTaskStatus(selectedTask.id, e.target.value)}
                      >
                        {Object.keys(STATUS).map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Details */}
                    <div className="panel-soft mb-3">
                      <h6 className="text-white-90 mb-2">Details</h6>
                      <div className="detail-grid">
                        <div className="detail-item">
                          <span className="text-muted-300">Priority:</span>
                          <select
                            className="form-select form-select-sm dark-input"
                            value={selectedTask.priority}
                            onChange={(e) => updateTaskField(selectedTask.id, "priority", e.target.value)}
                          >
                            {Object.keys(PRIORITIES).map((p) => (
                              <option key={p} value={p}>
                                {p}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="detail-item">
                          <span className="text-muted-300">Story Points:</span>
                          <input
                            type="number"
                            className="form-control form-control-sm dark-input"
                            value={selectedTask.storyPoints || 1}
                            onChange={(e) =>
                              updateTaskField(
                                selectedTask.id,
                                "storyPoints",
                                parseInt(e.target.value) || 1
                              )
                            }
                          />
                        </div>
                        <div className="detail-item">
                          <span className="text-muted-300">Due Date:</span>
                          <input
                            type="date"
                            className="form-control form-control-sm dark-input"
                            value={selectedTask.dueDate || ""}
                            onChange={(e) =>
                              updateTaskField(selectedTask.id, "dueDate", e.target.value)
                            }
                          />
                          {selectedTask.dueDate && (
                            <div className={isOverdue(selectedTask) ? "text-danger tiny mt-1" : "text-success tiny mt-1"}>
                              {isOverdue(selectedTask) ? "Overdue" : "On time"}
                            </div>
                          )}
                        </div>
                        <div className="detail-item">
                          <span className="text-muted-300">Category:</span>
                          <select
                            className="form-select form-select-sm dark-input"
                            value={selectedTask.category}
                            onChange={(e) =>
                              updateTaskField(selectedTask.id, "category", e.target.value)
                            }
                          >
                            {Object.keys(CATEGORIES).map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="detail-item">
                          <span className="text-muted-300">Ticket:</span>
                          <div className="text-white-90">
                            {ticketLabel(selectedTask)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Created/Updated */}
                    <div className="panel-soft">
                      <div className="small text-muted-300">Created</div>
                      <div className="text-white-90 small">
                        {fmtDT(selectedTask.createdAt)} by{" "}
                        {selectedTask.createdBy || users[selectedTask.createdById]?.name || "—"}
                      </div>
                      <div className="small text-muted-300 mt-1">Last Updated</div>
                      <div className="text-white-90 small">{fmtDT(selectedTask.updatedAt)}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
