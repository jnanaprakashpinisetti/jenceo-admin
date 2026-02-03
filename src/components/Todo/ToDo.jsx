// src/components/Tasks/ToDo.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import firebaseDB from "../../firebase";
import { useAuth } from "../../context/AuthContext";
import RichTextEditor from "./RichTextEditor";

// Add after existing imports
import { useProjects } from "./hooks/useProjects";
import { useTasks } from "./hooks/useTasks";
import HeaderActions from "./components/HeaderActions";
import DeletedTaskCard from "./components/DeletedTaskCard";
import CreateProjectModal from "./components/CreateProjectModal";
import UserSearchDropdown from "./components/UserSearchDropdown";

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

const anyFilterActive = (state) => {
  const { activeTab, qtext, cat, prio, assignee, issueType, sort, projectId } = state;
  return !(
    activeTab === "all" &&
    qtext === "" &&
    cat === "ALL" &&
    prio === "ALL" &&
    assignee === "ALL" &&
    issueType === "ALL" &&
    sort === "createdAt_desc" &&
    projectId === "ALL"
  );
};

// ---------- RTDB helpers ----------
const hasRTDB =
  !!firebaseDB && (isFn(firebaseDB.child) || isFn(firebaseDB.ref));

const getRef = (path) => {
  if (!hasRTDB) return null;
  const p = String(path || "").trim();

  // Always start from root and build the path
  let ref = isFn(firebaseDB.child) ? firebaseDB : firebaseDB;

  if (p) {
    // Split the path and navigate through it
    const pathParts = p.split('/').filter(part => part !== '');
    pathParts.forEach(part => {
      ref = isFn(ref.child) ? ref.child(part) : ref.ref(part);
    });
  }

  return ref;
};

// ---------- constants ----------
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
  "In Progress": {
    bg: "linear-gradient(135deg,#19324a,#1f4a75)",
    border: "#3b82f6",
  },
  "In Review": {
    bg: "linear-gradient(135deg,#7c2d12,#9a3412)",
    border: "#ea580c",
  },
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
  { id: "Deleted", label: "Deleted" },
  { id: "unknown", label: "Unknown Project" }, // NEW: For tasks without projects
];

const TICKET_KEYS = ["JEN", "OPS", "CRM", "FIN", "HR"];

// ---------- component ----------
export default function ToDo() {
  // Resolve current user from AuthContext → window → localStorage, with a safe fallback.
  const authCtx = useAuth();
  const authFromCtx = authCtx?.user ?? authCtx;

  const authFromWin = typeof window !== "undefined" ? window.JenCeoAuth : null;

  let authFromStorage = null;
  try {
    authFromStorage =
      JSON.parse(localStorage.getItem("JenCeo:user")) ||
      JSON.parse(localStorage.getItem("authUser")) ||
      JSON.parse(localStorage.getItem("user"));
  } catch { }

  const mergedAuth = authFromCtx ||
    authFromWin ||
    authFromStorage || {
    uid: "guest",
    dbId: "guest",
    name: "Guest",
    role: "user",
    photoURL: "",
  };

  const myId = mergedAuth?.dbId || mergedAuth?.uid || "guest";
  const myName = mergedAuth?.name || mergedAuth?.displayName || "Guest";
  const myRole = (
    mergedAuth?.role ||
    mergedAuth?.userRole ||
    "user"
  ).toLowerCase();
  const isPrivileged = [
    "admin",
    "manager",
    "super admin",
    "superadmin",
  ].includes(myRole);

  // data
  const [tasks, setTasks] = useState([]);
  theUsersFix(); // <-- to avoid tree-shake of helper
  const [users, setUsers] = useState({});
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
  const [projectId, setProjectId] = useState("ALL");

  // notifications
  const [notifOpen, setNotifOpen] = useState(false);
  const lastSeenKey = `todo:lastSeen:${myId}`;
  const [lastSeen, setLastSeen] = useState(() =>
    Number(localStorage.getItem(lastSeenKey) || 0)
  );

  // modals
  const [showAdd, setShowAdd] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [showDiscard, setShowDiscard] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showDelete, setShowDelete] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showCreateProject, setShowCreateProject] = useState(false);

  // NEW: Team selection modal
  const [showTeamSelect, setShowTeamSelect] = useState(false);
  const [selectedTeamMembers, setSelectedTeamMembers] = useState([]);
  const [currentProjectTeam, setCurrentProjectTeam] = useState([]);

  const [toasts, setToasts] = useState([]);
  const notify = (text, variant = "success") => {
    const id = Date.now() + Math.random();
    setToasts((ts) => [...ts, { id, text, variant }]);
    setTimeout(() => {
      setToasts((ts) => ts.filter((t) => t.id !== id));
    }, 1600);
  };

  // new task form
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    category: "Worker Call",
    priority: "Medium",
    issueType: "Task",
    assignedTo: "",
    status: "To Do",
    dueDate: "",
    storyPoints: 1,
    labels: [],
    parentTask: "",
    projectId: "",
    projectKey: "",
    projectTitle: "",
    ticketKey: "JEN",
  });

  // ---------- Current User ----------
  const currentUser = {
    id: myId,
    name: myName,
    role: myRole,
    photoURL: mergedAuth?.photoURL || ""
  };

  const [projects, setProjects] = useState([]);
  const [lastUsedProject, setLastUsedProject] = useState(null);
  const [comments, setComments] = useState({});
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");

  const notifRootRef = useRef(null);
  const backendOK = !!hasRTDB;

  // ---------- subscribe PROJECTS ----------
  useEffect(() => {
    if (!backendOK) return;

    // This should point to ToDo/Projects
    const ref = getRef("ToDo/Projects");
    const cb = (snap) => {
      const val = snap.val?.() ?? snap;
      const obj = val || {};
      const list = Object.entries(obj).map(([id, v]) => ({
        id,
        ...v,
      }));
      list.sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));
      setProjects(list);
    };

    try {
      if (isFn(ref.on)) {
        ref.on("value", cb);
        return () => {
          try {
            ref.off("value", cb);
          } catch { }
        };
      }
      ref.once?.("value", (s) => cb(s));
    } catch (error) {
      console.error("Failed to load projects:", error);
    }
  }, [backendOK]);

  // NEW: Update project team
  const updateProjectTeam = async (projectId, teamMembers) => {
    if (!backendOK) {
      notify("Firebase not configured", "error");
      return;
    }

    try {
      // This should point to ToDo/Projects/projectId/teamMembers
      const ref = getRef(`ToDo/Projects/${projectId}/teamMembers`);
      await ref.set(teamMembers);

      // Also update the project's updatedAt
      await getRef(`ToDo/Projects/${projectId}`).update({
        updatedAt: Date.now()
      });

      notify("Team updated successfully");
    } catch (error) {
      console.error("Failed to update project team:", error);
      notify("Failed to update team", "error");
    }
  };

  // NEW: Update project status
  const updateProjectStatus = async (projectId, status) => {
    if (!backendOK) {
      notify("Firebase not configured", "error");
      return;
    }

    try {
      await getRef(`ToDo/Projects/${projectId}`).update({
        status: status,
        updatedAt: Date.now()
      });

      notify(`Project marked as ${status}`);
    } catch (error) {
      console.error("Failed to update project status:", error);
      notify("Failed to update project status", "error");
    }
  };

  // NEW: Delete project
  const deleteProject = async (projectId) => {
    if (!backendOK) {
      notify("Firebase not configured", "error");
      return;
    }

    try {
      // First, check if there are any tasks in this project
      const projectTasks = tasks.filter(task => task.projectId === projectId && !task.deleted);

      if (projectTasks.length > 0) {
        if (!window.confirm(`This project has ${projectTasks.length} active tasks. Are you sure you want to delete it? This will move all tasks to "Unknown Project".`)) {
          return;
        }

        // Move all tasks to unknown project
        for (const task of projectTasks) {
          await getRef(`ToDo/${task.id}`).update({
            projectId: "",
            projectKey: "",
            projectTitle: "",
            updatedAt: Date.now()
          });
        }
      }

      await getRef(`ToDo/Projects/${projectId}`).remove();
      setProjectId("ALL");
      notify("Project deleted successfully");
    } catch (error) {
      console.error("Failed to delete project:", error);
      notify("Failed to delete project", "error");
    }
  };

  const createProject = async (projectData) => {
    if (!backendOK) {
      notify("Firebase not configured", "error");
      return;
    }

    try {
      const now = Date.now();
      // This should point to ToDo/Projects
      const ref = getRef("ToDo/Projects");
      const project = {
        ...projectData,
        createdAt: now,
        updatedAt: now,
        sequence: 0,
        status: "active",
        teamMembers: {},
      };

      let projectId;
      if (isFn(ref.push)) {
        const res = await ref.push(project);
        projectId = res.key;
      } else {
        projectId = String(now);
        await getRef(`ToDo/Projects/${projectId}`).set(project);
      }

      notify("Project created successfully");
      return projectId;
    } catch (error) {
      console.error("Failed to create project:", error);
      notify("Failed to create project", "error");
      throw error;
    }
  };

  const incrementProjectSeq = async (projectId) => {
    if (!backendOK) return 1;

    try {
      // This should point to ToDo/Projects/projectId/sequence
      const ref = getRef(`ToDo/Projects/${projectId}/sequence`);
      let nextSeq = 1;

      if (isFn(ref.transaction)) {
        await ref.transaction((curr) => {
          nextSeq = (curr || 0) + 1;
          return nextSeq;
        });
      } else {
        const snap = await ref.get?.();
        const curr = snap?.val?.() ?? snap?.val ?? 0;
        nextSeq = (Number(curr) || 0) + 1;
        await ref.set(nextSeq);
      }

      return nextSeq;
    } catch (error) {
      console.error("Failed to increment project sequence:", error);
      return 1;
    }
  };

  // ---------- subscribe USERS ----------
  useEffect(() => {
    if (!backendOK) return;

    const REF_PATHS = [
      "Users",
      "Users",
      "JenCeo/Users",
    ];
    const priority = new Map(REF_PATHS.map((p, i) => [p, i]));

    const isSystemRow = (key, u) => {
      const k = String(key || "").toLowerCase();
      const name = String(u?.name || "").toLowerCase();
      const role = String(u?.role || "").toLowerCase();

      if (k.startsWith("_")) return true;
      if (role.includes("service") || role.includes("system")) return true;
      if (name === "system administrator") return true;
      return false;
    };

    const accumById = {};
    const mergeUser = (path, key, raw) => {
      const user = {
        id: raw?.uid || raw?.id || key,
        name: (
          raw?.name ||
          raw?.displayName ||
          raw?.username ||
          key ||
          ""
        ).trim(),
        role: String(raw?.role || raw?.userRole || "user").toLowerCase(),
        photoURL: raw?.photoURL || raw?.avatar || "",
        _prio: priority.get(path) ?? 999,
      };
      if (!user.name) user.name = user.id;

      if (isSystemRow(key, user)) return;

      const existing = accumById[user.id];
      if (!existing) {
        accumById[user.id] = user;
      } else {
        const better =
          (user.photoURL && !existing.photoURL) || user._prio < existing._prio
            ? user
            : existing;
        accumById[user.id] = better;
      }
    };

    const pushToState = () => {
      const byDisplay = {};
      Object.values(accumById).forEach((u) => {
        const sig = (u.name + "|" + u.role).toLowerCase();
        if (!byDisplay[sig] || (u.photoURL && !byDisplay[sig].photoURL)) {
          byDisplay[sig] = u;
        }
      });

      const finalMap = {};
      Object.values(byDisplay).forEach((u) => {
        finalMap[u.id] = { name: u.name, role: u.role, photoURL: u.photoURL };
      });

      setUsers(finalMap);

      setNewTask((p) =>
        p.assignedTo ? p : { ...p, assignedTo: finalMap[myId] ? myId : "" }
      );
    };

    const unsubs = [];
    REF_PATHS.forEach((path) => {
      const ref = getRef(path);
      if (!ref) return;
      const cb = (snap) => {
        const obj = (snap?.val && snap.val()) || snap?.val || {};
        Object.entries(obj || {}).forEach(([k, v]) => mergeUser(path, k, v));
        pushToState();
      };
      try {
        if (isFn(ref.on)) {
          ref.on("value", cb);
          unsubs.push(() => ref.off("value", cb));
        } else {
          ref.once?.("value", cb);
        }
      } catch { }
    });

    return () => unsubs.forEach((u) => u?.());
  }, [backendOK, myId]);

  // ---------- subscribe TASKS ----------
  useEffect(() => {
    if (!backendOK) {
      setError(
        "Firebase RTDB not configured. Please check your configuration."
      );
      setTasks([]);
      return;
    }
    setLoading(true);
    setError("");

    // This should point to ToDo (for tasks)
    const ref = getRef("ToDo");
    const cb = (snap) => {
      const val = snap.val?.() ?? snap;
      const obj = val || {};

      // Filter out the Projects node from tasks
      const taskEntries = Object.entries(obj).filter(([key, value]) =>
        key !== "Projects" && typeof value === "object" && value !== null
      );

      const list = taskEntries.map(([id, v]) => ({
        id,
        ...v,
      }));
      list.sort(
        (a, b) =>
          (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0)
      );
      setTasks(list);
      setLoading(false);
    };

    try {
      if (isFn(ref.on)) {
        ref.on("value", cb);
        return () => {
          try {
            ref.off("value", cb);
          } catch { }
        };
      }
      ref.once?.("value", (s) => cb(s));
    } catch {
      setError("Failed to load tasks from database.");
      setLoading(false);
    }
  }, [backendOK]);

  useEffect(() => {
    if (!selectedTask) return;
    const fresh = tasks.find((t) => t.id === selectedTask.id);
    if (fresh) setSelectedTask(fresh);
  }, [tasks]);

  // NEW: Load team members when project is selected
  useEffect(() => {
    if (projectId !== "ALL" && projectId) {
      const currentProject = projects.find(p => p.id === projectId);
      if (currentProject) {
        setCurrentProjectTeam(currentProject.teamMembers || {});
      }
    }
  }, [projectId, projects]);

  // ---------- computed maps ----------
  const tabCounts = useMemo(() => {
    const base = {
      all: 0,
      "To Do": 0,
      "In Progress": 0,
      "In Review": 0,
      Done: 0,
      Deleted: 0,
      unknown: 0,
    };
    tasks.forEach((t) => {
      if (!isPrivileged) {
        const mine = t.assignedTo === myId || t.createdById === myId;
        if (!mine) return;
      }
      base.all += 1;
      if (t.deleted) {
        base.Deleted += 1;
      } else if (!t.projectId) {
        base.unknown += 1;
      } else if (base[t.status] !== undefined) {
        base[t.status] += 1;
      }
    });
    return base;
  }, [tasks, isPrivileged, myId]);

  // ---------- filtered list ----------
  const filtered = useMemo(() => {
    let list = tasks.slice();

    // Visibility rules
    if (!isPrivileged) {
      list = list.filter(
        (t) => t.assignedTo === myId || t.createdById === myId
      );
    }

    // Handle special tabs
    if (activeTab === "Deleted") {
      list = list.filter(t => t.deleted === true);
    } else if (activeTab === "unknown") {
      list = list.filter(t => !t.deleted && (!t.projectId || t.projectId === ""));
    } else {
      list = list.filter(t => !t.deleted);
      if (activeTab !== "all") list = list.filter((t) => t.status === activeTab);
    }

    if (cat !== "ALL") list = list.filter((t) => t.category === cat);
    if (prio !== "ALL") list = list.filter((t) => t.priority === prio);
    if (assignee !== "ALL") list = list.filter((t) => t.assignedTo === assignee);
    if (issueType !== "ALL") list = list.filter((t) => t.issueType === issueType);

    // Project filter (exclude for unknown tab)
    if (projectId !== "ALL" && activeTab !== "unknown") {
      list = list.filter((t) => t.projectId === projectId);
    }

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
      const av = key === "createdAt" ? a.createdAt || 0 : safeVal(a[key], "").toString().toLowerCase();
      const bv = key === "createdAt" ? b.createdAt || 0 : safeVal(b[key], "").toString().toLowerCase();
      if (av === bv) return 0;
      return dir === "asc" ? (av > bv ? 1 : -1) : av < bv ? 1 : -1;
    });
    return list;
  }, [
    tasks, isPrivileged, myId, activeTab, cat, prio, assignee, issueType, projectId, qtext, sort
  ]);

  // ---------- Soft Delete Task ----------
  const softDeleteTask = async (taskId, user) => {
    if (!backendOK) return;
    try {
      const now = Date.now();
      const ref = getRef(`ToDo/${taskId}`);
      await ref.update({
        deleted: true,
        deletedAt: now,
        deletedBy: user.id,
        deletedByName: user.name,
        updatedAt: now,
      });
      notify("Task moved to deleted items");
    } catch (error) {
      console.error("Failed to soft delete task:", error);
      notify("Failed to delete task", "error");
    }
  };

  // ---------- Permanent Delete Task ----------
  const deleteTask = async (taskId) => {
    if (!backendOK) return;
    try {
      await getRef(`ToDo/${taskId}`).remove();
      notify("Task permanently deleted");
    } catch {
      setError("Failed to delete task.");
      notify("Failed to delete task", "error");
    }
  };

  // ---------- Restore Task ----------
  const restoreTask = async (taskId) => {
    if (!backendOK) return;
    try {
      const ref = getRef(`ToDo/${taskId}`);
      await ref.update({
        deleted: false,
        deletedAt: null,
        deletedBy: null,
        deletedByName: null,
        updatedAt: Date.now(),
      });
      notify("Task restored");
    } catch (error) {
      console.error("Failed to restore task:", error);
      notify("Failed to restore task", "error");
    }
  };

  // ---------- notifications ----------
  const relevantToMe = (t) => t.assignedTo === myId || t.createdById === myId;
  const unread = useMemo(() => {
    const unseen = tasks.filter(
      (t) => relevantToMe(t) && (t.updatedAt || t.createdAt || 0) > lastSeen
    );
    return unseen
      .sort(
        (a, b) =>
          (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0)
      )
      .slice(0, 8);
  }, [tasks, lastSeen]);

  useEffect(() => {
    const onDoc = (e) => {
      if (!notifOpen) return;
      if (notifRootRef.current && !notifRootRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [notifOpen]);

  const markAllSeen = () => {
    const now = Date.now();
    localStorage.setItem(lastSeenKey, String(now));
    setLastSeen(now);
    setNotifOpen(false);
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
    } catch (err) {
      console.error("Failed to push history", err);
    }
  };

  // ---------- ticket sequence ----------
  const nextTicketSeq = async (key) => {
    const ref = getRef(`ToDoSequences/${key}`);
    if (!ref) return 1;
    if (isFn(ref.transaction)) {
      let next = 1;
      try {
        await ref.transaction((curr) => {
          next = (curr || 0) + 1;
          return next;
        });
        return next;
      } catch { }
    }
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
  const formatSubTicket = (parentTicket, n) =>
    `${parentTicket}-${String(n).padStart(2, "0")}`;

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
      notify("Status updated");
    } catch {
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
    } catch {
      setError(`Failed to update ${field}.`);
    }
  };

  const addComment = async (taskId, text) => {
    const body = (text || "").trim();
    if (!body || !backendOK) return;
    try {
      const now = Date.now();
      const ref = getRef(`ToDo/${taskId}/comments`);
      const payload = {
        text: body,
        author: myId,
        authorName: myName,
        authorPhoto: users[myId]?.photoURL || mergedAuth?.photoURL || "",
        timestamp: now,
        type: "comment",
      };
      if (isFn(ref.push)) {
        await ref.push(payload);
      } else {
        await getRef(`ToDo/${taskId}/comments/${now}`).set(payload);
      }
      setComments((p) => ({ ...p, [taskId]: "" }));
      await pushHistory(taskId, {
        action: "comment_added",
        field: "comment",
        from: null,
        to: body.slice(0, 80),
      });
      notify("Comment added");
    } catch {
      setError("Failed to add comment.");
    }
  };

  const addSubtask = async (parentId, title) => {
    const t = (title || "").trim();
    if (!t || !backendOK) return;
    try {
      const parent = tasks.find((x) => x.id === parentId);
      if (!parent) return;
      const now = Date.now();

      const subSeqRef = getRef(`ToDo/${parentId}/subSeqCounter`);
      let nextSubNo = 1;
      if (isFn(subSeqRef.transaction)) {
        await subSeqRef.transaction((curr) => {
          nextSubNo = (curr || 0) + 1;
          return nextSubNo;
        });
      } else {
        const snap = await subSeqRef.get?.();
        nextSubNo = ((snap?.val?.() ?? snap?.val) || 0) + 1;
        await subSeqRef.set(nextSubNo);
      }

      const child = {
        title: t,
        description: "",
        category: parent.category || "Other",
        priority: parent.priority || "Medium",
        issueType: "SubTask",
        assignedTo: parent.assignedTo,
        assignedToName: parent.assignedToName,
        assignedToAvatar: parent.assignedToAvatar,
        status: "To Do",
        dueDate: parent.dueDate || "",
        storyPoints: 1,
        labels: Array.isArray(parent.labels) ? parent.labels.slice(0, 5) : [],
        parentTask: parentId,
        ticketKey: parent.ticketKey,
        parentTicket: formatTicket(
          parent.ticketKey,
          Number(parent.ticketSeq || 0)
        ),
        childSeq: String(nextSubNo),
        createdById: myId,
        createdBy: myName,
        createdByAvatar: users[myId]?.photoURL || mergedAuth?.photoURL || "",
        createdAt: now,
        updatedAt: now,
        comments: {},
        subtasks: {},
        attachments: {},
        history: {
          [now]: {
            action: "created",
            field: "task",
            from: null,
            to: "To Do",
            user: myId,
            userName: myName,
            timestamp: now,
          },
        },
      };

      const listRef = getRef("ToDo");
      let childId = null;
      if (isFn(listRef.push)) {
        const res = await listRef.push(child);
        childId = res?.key;
      } else {
        childId = String(now);
        await getRef(`ToDo/${childId}`).set(child);
      }

      await getRef(`ToDo/${parentId}/linkedSubtasks/${childId}`).set(true);
      setNewSubtaskTitle("");
      await pushHistory(parentId, {
        action: "subtask_added",
        field: "subtask",
        from: null,
        to: title,
      });
      notify("Subtask created");
    } catch {
      setError("Failed to add subtask.");
    }
  };

  const toggleChildDone = async (childId, checked) => {
    if (!backendOK) return;
    try {
      await updateTaskStatus(childId, checked ? "Done" : "To Do");
    } catch { }
  };

  // ---------- add task ----------
  const handleAddTask = async (e) => {
    e?.preventDefault?.();
    if (!newTask.title.trim()) {
      setError("Please enter a task title.");
      return;
    }
    if (!newTask.projectId) {
      setError("Please select a project.");
      return;
    }
    if (!backendOK) {
      setError("Firebase not configured. Cannot add task.");
      return;
    }
    setLoading(true);
    setError("");

    const now = Date.now();

    // Get ticket sequence from project
    let ticketSeq = "1";
    let finalTicketKey = newTask.ticketKey || "TASK";

    if (newTask.projectId) {
      try {
        const nextSeq = await incrementProjectSeq(newTask.projectId);
        ticketSeq = String(nextSeq);
        finalTicketKey = `${newTask.projectKey}-${String(nextSeq).padStart(2, "0")}`;
      } catch (err) {
        setError("Failed to generate ticket number. Please try again.");
        setLoading(false);
        return;
      }
    }
    const assUser = users[newTask.assignedTo] || {};
    const payload = {
      title: newTask.title.trim(),
      description: newTask.description?.trim() || "",
      category: newTask.category,
      priority: newTask.priority,
      issueType: newTask.issueType,
      assignedTo: newTask.assignedTo || myId,
      assignedToName: assUser.name || newTask.assignedTo || "",
      assignedToAvatar: assUser.photoURL || "",
      status: newTask.status,
      dueDate: newTask.dueDate || "",
      storyPoints: newTask.storyPoints || 1,
      labels: newTask.labels || [],
      parentTask: newTask.parentTask || "",
      // Project fields
      projectId: newTask.projectId,
      projectKey: newTask.projectKey,
      projectTitle: newTask.projectTitle,
      ticketKey: finalTicketKey,
      ticketSeq,
      createdById: myId,
      createdBy: myName,
      createdByAvatar: users[myId]?.photoURL || mergedAuth?.photoURL || "",
      createdAt: now,
      updatedAt: now,
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
      // This should point to ToDo (for tasks)
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
        projectId: "",
        projectKey: "",
        projectTitle: "",
        ticketKey: "JEN",
      });
      setDirty(false);
      setShowAdd(false);
      notify("Issue created");
    } catch {
      setError("Failed to add task. Please verify Firebase rules and network.");
    } finally {
      setLoading(false);
    }
  };

  // --- ATTACHMENTS ---
  const getStorage = () => {
    try {
      return (
        firebaseDB?.storage?.() ||
        firebaseDB?.app?.storage?.() ||
        firebaseDB?.storage ||
        null
      );
    } catch {
      return null;
    }
  };

  const readFileAsDataURL = (file) =>
    new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = reject;
      fr.readAsDataURL(file);
    });

  const [attaching, setAttaching] = useState(false);
  const [attachProgress, setAttachProgress] = useState(0);

  const canDeleteAttachment = (task) => isPrivileged || task?.createdById === myId;

  const attachFiles = async (taskId, files) => {
    if (!backendOK || !files || files.length === 0) return;
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    try {
      setAttaching(true);
      setAttachProgress(0);

      const storage = getStorage();
      let i = 0;

      for (const file of Array.from(files)) {
        i += 1;
        const now = Date.now();
        const attId = `${now}-${Math.random().toString(36).slice(2, 8)}`;

        const meta = {
          name: file.name,
          size: file.size,
          type: file.type,
          uploadedBy: myId,
          uploadedByName: myName,
          uploadedAt: now,
        };

        let url = "";

        if (file.size < 1024 * 1024 && file.type.startsWith('image/')) {
          const dataUrl = await readFileAsDataURL(file);
          url = dataUrl;
          meta.storageType = 'dataURL';
        } else {
          if (storage?.ref || storage?.refFromURL) {
            const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
            const path = `ToDoAttachments/${taskId}/${now}_${safeName}`;
            const ref = storage.ref ? storage.ref(path) : storage.refFromURL(path);

            if (ref.put) {
              const snap = await ref.put(file);
              url = await snap.ref.getDownloadURL();
              meta.storageType = 'firebase';
            } else {
              const dataUrl = await readFileAsDataURL(file);
              url = dataUrl;
              meta.storageType = 'dataURL';
            }
          } else {
            const dataUrl = await readFileAsDataURL(file);
            url = dataUrl;
            meta.storageType = 'dataURL';
          }
        }

        await getRef(`ToDo/${taskId}/attachments/${attId}`).set({
          ...meta,
          url,
        });

        setAttachProgress(Math.round((i / files.length) * 100));

        await pushHistory(taskId, {
          action: "attachment_added",
          field: "attachment",
          from: null,
          to: meta.name,
        });
      }

      notify("Attachment(s) added");
    } catch (e) {
      console.error("Attachment error:", e);
      notify("Failed to add attachment(s)", "error");
    } finally {
      setAttaching(false);
      setAttachProgress(0);
    }
  };

  const removeAttachment = async (taskId, attId) => {
    if (!backendOK) return;
    try {
      const attSnap = await getRef(
        `ToDo/${taskId}/attachments/${attId}`
      ).get?.();
      const att = attSnap?.val?.() ?? attSnap?.val ?? null;

      await getRef(`ToDo/${taskId}/attachments/${attId}`).remove();

      await pushHistory(taskId, {
        action: "attachment_removed",
        field: "attachment",
        from: att?.name || attId,
        to: null,
      });

      notify("Attachment removed");
    } catch (e) {
      console.error(e);
      notify("Failed to remove attachment", "error");
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

  // ---------- helpers ----------
  const resetFilters = () => {
    setActiveTab("all");
    setQtext("");
    setCat("ALL");
    setPrio("ALL");
    setAssignee("ALL");
    setIssueType("ALL");
    setSort("createdAt_desc");
    setProjectId("ALL");
  };

  const ticketLabel = (task) => {
    if (task.issueType === "SubTask" && task.parentTicket && task.childSeq) {
      return formatSubTicket(task.parentTicket, Number(task.childSeq));
    }
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

  const linkedChildren = (parentId) =>
    tasks
      .filter((t) => t.parentTask === parentId)
      .sort((a, b) => (a.childSeq || 0) - (b.childSeq || 0));

  // NEW: Team selection handlers
  const handleOpenTeamSelect = () => {
    const currentProject = projects.find(p => p.id === projectId);
    if (currentProject) {
      setSelectedTeamMembers(Object.keys(currentProject.teamMembers || {}));
      setShowTeamSelect(true);
    }
  };

  const handleTeamMemberToggle = (userId) => {
    setSelectedTeamMembers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSaveTeam = async () => {
    if (!projectId || projectId === "ALL") return;

    const teamMembers = {};
    selectedTeamMembers.forEach(userId => {
      teamMembers[userId] = true;
    });

    await updateProjectTeam(projectId, teamMembers);
    setShowTeamSelect(false);
  };

  const handleSelectAllTeam = () => {
    setSelectedTeamMembers(Object.keys(users));
  };

  const handleClearTeam = () => {
    setSelectedTeamMembers([]);
  };

  // ---------- render ----------
  const filtersState = {
    activeTab,
    qtext,
    cat,
    prio,
    assignee,
    issueType,
    sort,
    projectId,
  };
  const filtersDirty = anyFilterActive(filtersState);
  const isAdmin = ["admin", "super admin", "superadmin"].includes(myRole);

  const currentProject = projectId !== "ALL" ? projects.find(p => p.id === projectId) : null;

  return (
    <div className="todo-wrap">
      {/* Header */}
      <div className="todo-head rounded-4 p-3 mb-3 shadow-sm mmt-3">
        <div className="task-header">
          <div>
            <div className="tiny text-white-50 text-uppercase">
              Advanced Task Manager
            </div>
            <div className="h3 fw-bold mb-0 text-warning">
              JenCeo Task Board
            </div>
          </div>

          <div className="d-flex align-items-center gap-2">
            {/* Notifications bell */}
            <div className="notif-wrap position-relative" ref={notifRootRef}>
              <button
                className={cn(
                  "btn btn-sm",
                  unread.length ? "btn-warning notif-glow" : "btn-outline-light"
                )}
                onClick={() => setNotifOpen((s) => !s)}
                title={
                  unread.length ? `${unread.length} updates` : "No new updates"
                }
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
                    <div className="d-flex gap-2">
                      <button
                        className="btn btn-sm btn-success"
                        onClick={markAllSeen}
                      >
                        Mark as read
                      </button>
                      <button
                        className="btn btn-sm btn-outline-light"
                        onClick={() => setNotifOpen(false)}
                      >
                        Close
                      </button>
                    </div>
                  </div>
                  {unread.length === 0 ? (
                    <div className="text-muted small">
                      You're all caught up.
                    </div>
                  ) : (
                    <ul className="list-unstyled m-0">
                      {unread.map((t) => (
                        <li
                          key={t.id}
                          className="notif-item"
                          onClick={() => {
                            setSelectedTask(t);
                            setShowDetail(true);
                            setNotifOpen(false);
                          }}
                        >
                          <div className="d-flex align-items-center gap-2">
                            {users[t.assignedTo]?.photoURL ||
                              t.assignedToAvatar ? (
                              <img
                                src={
                                  users[t.assignedTo]?.photoURL ||
                                  t.assignedToAvatar
                                }
                                onError={(e) =>
                                  (e.currentTarget.style.display = "none")
                                }
                                alt="avatar"
                                className="avatar avatar-xs"
                                style={{ objectFit: "cover" }}
                              />
                            ) : (
                              <span className="avatar avatar-xs avatar-fallback">
                                {(t.assignedToName || "U")
                                  .slice(0, 2)
                                  .toUpperCase()}
                              </span>
                            )}
                            <div className="flex-grow-1">
                              <div className="small text-white-90">
                                {t.title}
                              </div>
                              <div className="tiny text-muted-300">
                                {ticketLabel(t)} •{" "}
                                {fmtDT(t.updatedAt || t.createdAt)}
                              </div>
                            </div>
                            <span
                              className="badge"
                              style={{
                                background:
                                  STATUS[t.status]?.border || "#475569",
                              }}
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

            <HeaderActions
              backendOK={backendOK}
              setShowAdd={setShowAdd}
              setShowCreateProject={setShowCreateProject}
              projects={projects}
            />
          </div>
        </div>

        {/* Project Header */}
        {currentProject && (
          <div className="project-header neo-card p-3 mb-3 mt-3">
            <div className="d-flex justify-content-between align-items-center">
              <div className="flex-grow-1">
                <div className="d-flex align-items-center gap-3 mb-2">
                  <h4 className="text-info mb-0">
                    {currentProject.emoji}
                    {currentProject.title}
                  </h4>
                  <span className={`badge ${currentProject.status === 'active' ? 'bg-success' :
                      currentProject.status === 'inactive' ? 'bg-secondary' :
                        currentProject.status === 'done' ? 'bg-primary' : 'bg-warning'
                    }`}>
                    {currentProject.status?.toUpperCase() || 'ACTIVE'}
                  </span>
                </div>
                <p className="text-muted mb-2">
                  {currentProject.description}
                </p>
                <div className="d-flex align-items-center gap-2 text-muted small">
                  <span>Team: {Object.keys(currentProject.teamMembers || {}).length} members</span>
                  <span>•</span>
                  <span>Created: {fmtDT(currentProject.createdAt)}</span>
                  <span>•</span>
                  <span>Key: {currentProject.projectKey}</span>
                </div>
              </div>
              <div className="d-flex gap-2 flex-wrap">
                <button
                  className="btn btn-primary"
                  onClick={() => setShowAdd(true)}
                >
                  + Create Task
                </button>
                <button
                  className="btn btn-outline-info"
                  onClick={handleOpenTeamSelect}
                >
                  👥 Select Team
                </button>
                <div className="btn-group">
                  <button
                    className="btn btn-outline-warning dropdown-toggle"
                    type="button"
                    data-bs-toggle="dropdown"
                  >
                    Status
                  </button>
                  <ul className="dropdown-menu dropdown-menu-dark">
                    <li>
                      <button
                        className="dropdown-item"
                        onClick={() => updateProjectStatus(projectId, 'active')}
                      >
                        🟢 Active
                      </button>
                    </li>
                    <li>
                      <button
                        className="dropdown-item"
                        onClick={() => updateProjectStatus(projectId, 'inactive')}
                      >
                        ⚪ Inactive
                      </button>
                    </li>
                    <li>
                      <button
                        className="dropdown-item"
                        onClick={() => updateProjectStatus(projectId, 'done')}
                      >
                        🔵 Done
                      </button>
                    </li>
                  </ul>
                </div>
                <button
                  className="btn btn-outline-danger"
                  onClick={() => {
                    if (window.confirm(`Are you sure you want to delete project "${currentProject.title}"?`)) {
                      deleteProject(projectId);
                    }
                  }}
                >
                  🗑 Delete
                </button>
                <button
                  className="btn btn-outline-light"
                  onClick={() => setProjectId("ALL")}
                >
                  View All Projects
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="d-flex flex-wrap gap-2 mt-3 align-items-center">
          <div
            className="btn-group btn-group-sm"
            role="group"
            aria-label="tabs"
          >
            {TABS.map((t) => (
              <button
                key={t.id}
                className={cn(
                  "btn",
                  activeTab === t.id ? "btn-info text-dark" : "btn-outline-info"
                )}
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

          <div style={{ width: 220 }}>
            <UserSearchDropdown
              users={{
                ALL: { name: "All Assignees", role: "" },
                ...users
              }}
              value={assignee}
              onChange={setAssignee}
              className="form-select-sm"
            />
          </div>

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

          <select
            className="form-select form-select-sm dark-input"
            style={{ width: 180 }}
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
          >
            <option value="ALL">All Projects</option>
            {projects.map((proj) => (
              <option key={proj.id} value={proj.id}>
                {proj.emoji} {proj.title} ({proj.projectKey})
              </option>
            ))}
          </select>

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

          <div className="input-group input-group-sm" style={{ maxWidth: 360 }}>
            <span className="input-group-text dark-input">🔎</span>
            <input
              className="form-control dark-input"
              placeholder="Search tasks, labels..."
              value={qtext}
              onChange={(e) => setQtext(e.target.value)}
            />
          </div>

          {/* Reset Filters button */}
          <button
            className={cn(
              "btn btn-sm ms-auto",
              filtersDirty ? "btn-warning pulse" : "btn-outline-warning"
            )}
            onClick={resetFilters}
            title={filtersDirty ? "Some filters are active" : "Reset filters"}
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* Team Selection Modal */}
      {showTeamSelect && currentProject && (
        <div className="modal-overlay" onClick={() => setShowTeamSelect(false)}>
          <div className="modal-modern modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header bg-primary text-white">
              <h6 className="mb-0">
                Select Team for: {currentProject.emoji} {currentProject.title}
              </h6>
              <button
                className="btn btn-sm btn-light"
                onClick={() => setShowTeamSelect(false)}
              >
                Close
              </button>
            </div>
            <div className="modal-body p-3" style={{ background: "#0f172a", maxHeight: '70vh', overflowY: 'auto' }}>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div className="text-white-80">
                  Selected: {selectedTeamMembers.length} members
                </div>
                <div className="d-flex gap-2">
                  <button
                    className="btn btn-sm btn-outline-info"
                    onClick={handleSelectAllTeam}
                  >
                    Select All
                  </button>
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    onClick={handleClearTeam}
                  >
                    Clear All
                  </button>
                </div>
              </div>

              <div className="row g-2">
                {Object.entries(users).map(([userId, user]) => (
                  <div key={userId} className="col-md-6">
                    <div className="team-member-item d-flex align-items-center gap-3 p-2 rounded bg-dark bg-opacity-50">
                      <input
                        type="checkbox"
                        className="form-check-input"
                        checked={selectedTeamMembers.includes(userId)}
                        onChange={() => handleTeamMemberToggle(userId)}
                      />
                      {user.photoURL ? (
                        <img
                          src={user.photoURL}
                          alt={user.name}
                          className="avatar avatar-sm"
                          style={{ objectFit: "cover" }}
                        />
                      ) : (
                        <span className="avatar avatar-sm avatar-fallback">
                          {(user.name || "U")
                            .split(" ")
                            .map((s) => s[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
                        </span>
                      )}
                      <div className="flex-grow-1">
                        <div className="text-white-90">{user.name}</div>
                        <div className="small text-muted-300">{user.role || "user"}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="d-flex justify-content-end gap-2 mt-4">
                <button
                  className="btn btn-light"
                  onClick={() => setShowTeamSelect(false)}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleSaveTeam}
                >
                  Save Team
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rest of the component remains the same... */}
      {/* (Task list, Create Task Modal, Detail Modal, etc.) */}

      {/* The rest of your existing JSX remains unchanged */}
      {/* Task list */}
      {loading && tasks.length === 0 ? (
        <div className="alert alert-info">Loading tasks…</div>
      ) : filtered.length === 0 ? (
        <div className="col-12">
          <div className="neo-card p-4 text-center">
            No tasks found. Create a new task to get started!
          </div>
        </div>
      ) : activeTab === "Deleted" ? (
        // Deleted Tasks Table View
        <div className="deleted-tasks-table">
          <div className="table-responsive">
            <table className="table table-dark table-hover">
              <thead>
                <tr>
                  <th>Ticket</th>
                  <th>Title</th>
                  <th>Project</th>
                  <th>Status</th>
                  <th>Deleted By</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((task) => (
                  <tr key={task.id}>
                    <td>
                      <span className="badge bg-secondary">{ticketLabel(task)}</span>
                    </td>
                    <td>
                      <div>
                        <strong className="text-white">{task.title}</strong>
                        {task.description && (
                          <div className="text-muted small mt-1">
                            {task.description.slice(0, 100)}...
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      {task.projectId ? (
                        <span>
                          {projects.find(p => p.id === task.projectId)?.emoji}
                          {projects.find(p => p.id === task.projectId)?.title || 'Unknown'}
                        </span>
                      ) : (
                        <span className="text-warning">Unknown Project</span>
                      )}
                    </td>
                    <td>
                      <span className="badge" style={{
                        background: STATUS[task.status]?.border || "#475569"
                      }}>
                        {task.status}
                      </span>
                    </td>
                    <td>
                      <div className="small">
                        <div className="text-info">{task.deletedByName || 'Unknown'}</div>
                        <div className="small text-muted opacity-50">
                          {task.deletedAt ? new Date(task.deletedAt).toLocaleDateString() : 'N/A'}
                          <br />
                          {task.deletedAt ? new Date(task.deletedAt).toLocaleTimeString() : ''}
                        </div>
                      </div>
                    </td>

                    <td>
                      <div className="btn-group btn-group-sm">
                        <button
                          className="btn btn-success"
                          onClick={() => restoreTask(task.id)}
                          title="Restore Task"
                        >
                          ↶
                        </button>
                        <button
                          className="btn btn-danger"
                          onClick={() => {
                            setDeleteTarget(task);
                            setShowDelete(true);
                          }}
                          title="Permanently Delete"
                        >
                          🗑
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        // Regular Card View for other tabs
        <div className="row">
          {filtered.map((task) => {
            const ticket = ticketLabel(task);
            const overdue = isOverdue(task);
            const createdBy =
              users[task.createdById]?.name || task.createdBy || "—";
            const desc = (task.description || "").trim();
            const snippet =
              desc.length > 120 ? desc.slice(0, 120) + "…" : desc;

            return (
              <div className="col-lg-6 col-xl-4 mb-3" key={task.id}>
                <div
                  className="task-card rounded-3 overflow-hidden"
                  onClick={() => {
                    setSelectedTask(task);
                    setShowDetail(true);
                  }}
                >
                  <div
                    className="task-border"
                    style={{ borderColor: STATUS[task.status]?.border }}
                  />
                  <div className="task-wrapper">
                    {/* Header */}
                    <div className="task-info">
                      <div className="d-flex align-items-center gap-2">
                        <span
                          className="category-chip"
                          style={{
                            background:
                              CATEGORIES[task.category] || "#475569",
                          }}
                        />
                        <span
                          className="issue-type-badge"
                          style={{
                            background:
                              ISSUE_TYPES[task.issueType]?.color || "#3b82f6",
                          }}
                          title={task.issueType}
                        >
                          {ISSUE_TYPES[task.issueType]?.icon || "✓"}{" "}
                          {task.issueType}
                        </span>
                        <span className="task-id text-muted-300 small">
                          {ticket}
                        </span>
                        {/* Project badge */}
                        {task.projectId && (
                          <span className="badge bg-dark small">
                            {projects.find(p => p.id === task.projectId)?.projectKey || 'PROJ'}
                          </span>
                        )}
                        {/* Parent link if SubTask */}
                        {task.issueType === "SubTask" && task.parentTicket && (
                          <div className="tiny text-info">
                            Parent:{" "}
                            <span className="badge bg-dark">
                              {task.parentTicket}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="d-flex align-items-center gap-1">
                        <span
                          className="badge priority-badge"
                          style={{ background: PRIORITIES[task.priority] }}
                        >
                          {task.priority}
                        </span>
                      </div>
                    </div>

                    {/* Assignee & status */}
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <div className="d-flex align-items-center gap-2">
                        {users[task.assignedTo]?.photoURL ||
                          task.assignedToAvatar ? (
                          <img
                            src={
                              users[task.assignedTo]?.photoURL ||
                              task.assignedToAvatar
                            }
                            onError={(e) =>
                              (e.currentTarget.style.display = "none")
                            }
                            alt="avatar"
                            className="avatar avatar-sm"
                            style={{ objectFit: "cover" }}
                          />
                        ) : (
                          <span className="avatar avatar-sm avatar-fallback">
                            {(task.assignedToName || "U")
                              .split(" ")
                              .map((s) => s[0])
                              .join("")
                              .slice(0, 2)
                              .toUpperCase()}
                          </span>
                        )}
                        <div className="small text-white-80">
                          {task.assignedToName ||
                            users[task.assignedTo]?.name ||
                            task.assignedTo}
                        </div>
                      </div>

                      {/* Due date */}
                      {task.dueDate && (
                        <div className="small mb-2">
                          <strong
                            className={
                              overdue ? "text-danger" : "text-success"
                            }
                          >
                            Due:
                          </strong>{" "}
                          <span
                            className={
                              overdue ? "text-danger" : "text-success"
                            }
                          >
                            {task.dueDate}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="content-wrapper">
                      {/* Title */}
                      <h6 className="text-info mb-1 opacity-75">{task.title}</h6>

                      {/* Description snippet */}
                      {snippet && (
                        <div className="small text-secondary">
                          {snippet}
                        </div>
                      )}
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

                    {/* Footer: created by + quick actions */}
                    <div className="action-btns">
                      <div className="btn-group btn-group-sm w-100 mb-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          className={cn(
                            "text-center btn",
                            task.status === "To Do"
                              ? "btn-secondary"
                              : "btn-outline-secondary"
                          )}
                          onClick={() => updateTaskStatus(task.id, "To Do")}
                        >
                          To Do
                        </button>
                        <button
                          className={cn(
                            "btn",
                            task.status === "In Progress"
                              ? "btn-primary"
                              : "btn-outline-primary"
                          )}
                          onClick={() =>
                            updateTaskStatus(task.id, "In Progress")
                          }
                        >
                          In Progress
                        </button>
                        <button
                          className={cn(
                            "btn",
                            task.status === "In Review"
                              ? "btn-warning"
                              : "btn-outline-warning"
                          )}
                          onClick={() =>
                            updateTaskStatus(task.id, "In Review")
                          }
                        >
                          In Review
                        </button>
                        <button
                          className={cn(
                            "btn",
                            task.status === "Done"
                              ? "btn-success"
                              : "btn-outline-success"
                          )}
                          onClick={() => updateTaskStatus(task.id, "Done")}
                        >
                          Done
                        </button>

                        {isAdmin && (
                          <button
                            className="btn btn-outline-danger"
                            title="Delete task"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTarget(task);
                              setShowDelete(true);
                            }}
                          >
                            🗑
                          </button>
                        )}
                      </div>

                      <div className="d-flex align-items-center gap-2">
                        {users[task.createdById]?.photoURL ||
                          task.createdByAvatar ? (
                          <img
                            src={
                              users[task.createdById]?.photoURL ||
                              task.createdByAvatar
                            }
                            onError={(e) =>
                              (e.currentTarget.style.display = "none")
                            }
                            alt="creator"
                            className="avatar avatar-xs"
                            style={{ objectFit: "cover" }}
                          />
                        ) : (
                          <span className="avatar avatar-xs avatar-fallback">
                            {(createdBy || "U")
                              .split(" ")
                              .map((s) => s[0])
                              .join("")
                              .slice(0, 2)
                              .toUpperCase()}
                          </span>
                        )}
                        <span className="tiny text-muted-300 opacity-50">
                          Created By {createdBy} • {fmtDT(task.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Task Modal */}
      {showAdd && (
        <div
          className="modal fade show"
          style={{ display: "block", background: "rgba(2,6,23,.8)" }}
          onClick={() => (dirty ? setShowDiscard(true) : setShowAdd(false))}
        >
          <div
            className="modal-dialog modal-lg modal-dialog-centered"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content overflow-hidden modal-content-dark">
              <div className="modal-header modal-header-grad">
                <h5 className="modal-title text-white text-truncate">
                  Create New Task
                </h5>
                <button
                  className="btn-close btn-close-white"
                  onClick={() =>
                    dirty ? setShowDiscard(true) : setShowAdd(false)
                  }
                />
              </div>

              <form onSubmit={handleAddTask}>
                <div className="modal-body modal-body-dark">
                  {error && (
                    <div className="alert alert-danger py-2">{error}</div>
                  )}
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label text-muted-200">
                        Task Title *
                      </label>
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
                    <div className="col-md-3">
                      <label className="form-label text-muted-200">
                        Project *
                      </label>
                      <select
                        className="form-select dark-input"
                        value={newTask.projectId || ""}
                        onChange={(e) => {
                          const selectedProject = projects.find(p => p.id === e.target.value);
                          setNewTask((p) => ({
                            ...p,
                            projectId: e.target.value,
                            projectKey: selectedProject?.projectKey,
                            projectTitle: selectedProject?.title,
                          }));
                          setDirty(true);
                        }}
                        required
                      >
                        <option value="">Select a project...</option>
                        {projects.map((proj) => (
                          <option key={proj.id} value={proj.id}>
                            {proj.emoji} {proj.title} ({proj.projectKey})
                          </option>
                        ))}
                      </select>
                      {projects.length === 0 && (
                        <div className="form-text text-warning">
                          No projects found. <a href="#" onClick={(e) => { e.preventDefault(); setShowCreateProject(true); }}>Create a project first</a>.
                        </div>
                      )}
                    </div>

                    <div className="col-md-3">
                      <label className="form-label text-muted-200">
                        Task Type
                      </label>
                      <select
                        className="form-select dark-input"
                        value={newTask.issueType}
                        onChange={(e) => {
                          setNewTask((p) => ({
                            ...p,
                            issueType: e.target.value,
                          }));
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
                      <label className="form-label text-muted-200">
                        Description
                      </label>
                      <RichTextEditor
                        value={newTask.description}
                        onChange={(html) => {
                          setNewTask((p) => ({
                            ...p,
                            description: html,
                          }));
                          setDirty(true);
                        }}
                        placeholder="Detailed description of the issue..."
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label text-muted-200">
                        Assignee
                      </label>
                      <UserSearchDropdown
                        users={users}
                        value={newTask.assignedTo || myId}
                        onChange={(value) => {
                          setNewTask((p) => ({
                            ...p,
                            assignedTo: value,
                          }));
                          setDirty(true);
                        }}
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label text-muted-200">
                        Priority
                      </label>
                      <select
                        className="form-select dark-input"
                        value={newTask.priority}
                        onChange={(e) => {
                          setNewTask((p) => ({
                            ...p,
                            priority: e.target.value,
                          }));
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
                      <label className="form-label text-muted-200">
                        Story Points
                      </label>
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
                      <label className="form-label text-muted-200">
                        Category
                      </label>
                      <select
                        className="form-select dark-input"
                        value={newTask.category}
                        onChange={(e) => {
                          setNewTask((p) => ({
                            ...p,
                            category: e.target.value,
                          }));
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
                      <label className="form-label text-muted-200">
                        Due Date
                      </label>
                      <input
                        type="date"
                        className="form-control dark-input"
                        min={todayYMD()}
                        value={newTask.dueDate}
                        onChange={(e) => {
                          setNewTask((p) => ({
                            ...p,
                            dueDate: e.target.value,
                          }));
                          setDirty(true);
                        }}
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label text-muted-200">
                        Status
                      </label>
                      <select
                        className="form-select dark-input"
                        value={newTask.status}
                        onChange={(e) => {
                          setNewTask((p) => ({
                            ...p,
                            status: e.target.value,
                          }));
                          setDirty(true);
                        }}
                      >
                        {Object.keys(STATUS).map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="modal-footer modal-footer-dark">
                  <button
                    type="button"
                    className="btn btn-light"
                    onClick={() =>
                      dirty ? setShowDiscard(true) : setShowAdd(false)
                    }
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading || !backendOK}
                  >
                    {loading ? "Creating..." : "Create Issue"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Create Project Modal */}
      {showCreateProject && (
        <CreateProjectModal
          showCreateProject={showCreateProject}
          setShowCreateProject={setShowCreateProject}
          users={users}
          currentUser={currentUser}
          createProject={createProject}
          notify={notify}
          projects={projects}
        />
      )}

      {/* Detail Modal */}
      {showDetail && selectedTask && (
        <div className="modal-overlay" onClick={() => setShowDetail(false)}>
          <div
            className="modal-modern modal-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="modal-header"
              style={{
                background: "linear-gradient(90deg,#06b6d4,#3b82f6)",
                color: "#fff",
              }}
            >
              <div className="d-flex align-items-center gap-2">
                <span
                  className="category-chip"
                  style={{
                    background: CATEGORIES[selectedTask.category] || "#475569",
                  }}
                />
                <span
                  className="issue-type-badge"
                  style={{
                    background:
                      ISSUE_TYPES[selectedTask.issueType]?.color || "#3b82f6",
                  }}
                  title={selectedTask.issueType}
                >
                  {ISSUE_TYPES[selectedTask.issueType]?.icon || "✓"}{" "}
                  {selectedTask.issueType}
                </span>
                <h5 className="mb-0">
                  {selectedTask.title}{" "}
                  <small className="opacity-75">
                    {ticketLabel(selectedTask)}
                  </small>
                </h5>
              </div>
              <button
                className="btn btn-sm btn-light"
                onClick={() => setShowDetail(false)}
              >
                Close
              </button>
            </div>

            <div className="modal-body p-3" style={{ background: "#0f172a" }}>
              <div className="row g-4">
                {/* Left */}
                <div className="col-md-8">
                  <div className="panel-soft">
                    <h6 className="text-white-90 mb-2">Description</h6>
                    <div
                      className="text-white-80 rich-text-content"
                      dangerouslySetInnerHTML={{
                        __html: selectedTask.description || "No description provided."
                      }}
                    />
                  </div>

                  {/* Attachments */}
                  <div className="panel-soft mb-3">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <h6 className="text-white-90 mb-0">Attachments</h6>
                      <div className="d-flex align-items-center gap-2">
                        {attaching && (
                          <span className="tiny text-muted-300">
                            Uploading… {attachProgress}%
                          </span>
                        )}
                        <label
                          className="btn btn-sm btn-outline-primary mb-0"
                          htmlFor="file-input-attach"
                        >
                          + Add
                        </label>
                        <input
                          id="file-input-attach"
                          type="file"
                          accept="image/*, .pdf, .doc, .docx, .txt"
                          multiple
                          style={{ display: "none" }}
                          onChange={(e) => {
                            const files = e.target.files;
                            if (files && files.length) {
                              attachFiles(selectedTask.id, files);
                              e.target.value = "";
                            }
                          }}
                        />
                      </div>
                    </div>

                    {/* Attachment grid */}
                    {selectedTask.attachments ? (
                      <div className="att-grid">
                        {Object.entries(selectedTask.attachments).map(([id, a]) => (
                          <div key={id} className="att-item">
                            <div className="att-preview-wrapper">
                              {String(a.type || "").startsWith("image/") ? (
                                <div
                                  className="att-preview-image"
                                  onClick={() => {
                                    const newWindow = window.open('', '_blank');
                                    if (newWindow) {
                                      newWindow.document.write(`
                      <!DOCTYPE html>
                      <html>
                        <head>
                          <title>${a.name || 'Attachment'}</title>
                          <style>
                            body { 
                              margin: 0; 
                              padding: 20px; 
                              background: #0f172a; 
                              display: flex; 
                              justify-content: center; 
                              align-items: center; 
                              min-height: 100vh;
                            }
                            img { 
                              max-width: 90vw; 
                              max-height: 90vh; 
                              border-radius: 8px;
                              box-shadow: 0 4px 20px rgba(0,0,0,0.5);
                            }
                            .close-btn {
                              position: fixed;
                              top: 20px;
                              right: 20px;
                              background: #ef4444;
                              color: white;
                              border: none;
                              padding: 10px 15px;
                              border-radius: 5px;
                              cursor: pointer;
                              z-index: 1000;
                            }
                          </style>
                        </head>
                        <body>
                          <button class="close-btn" onclick="window.close()">Close</button>
                          <img src="${a.url}" alt="${a.name || 'Attachment'}" />
                        </body>
                      </html>
                    `);
                                    }
                                  }}
                                >
                                  <img
                                    src={a.url}
                                    alt={a.name}
                                    className="att-thumb"
                                    onError={(e) => {
                                      e.target.style.display = 'none';
                                      e.target.nextSibling.style.display = 'block';
                                    }}
                                  />
                                  <div className="att-fallback" style={{ display: 'none' }}>
                                    📄 {a.name || 'File'}
                                  </div>
                                </div>
                              ) : (
                                <div
                                  className="att-file-fallback"
                                  onClick={() => {
                                    window.open(a.url, '_blank', 'noopener,noreferrer');
                                  }}
                                >
                                  📄 {a.name || 'File'}
                                </div>
                              )}
                            </div>

                            <div className="att-meta">
                              <div
                                className="text-white-80 small text-truncate"
                                title={a.name}
                              >
                                {a.name}
                              </div>
                              <div className="tiny text-muted-300">
                                {fmtDT(a.uploadedAt)}
                              </div>
                              {a.size && (
                                <div className="tiny text-muted-300">
                                  {(a.size / 1024).toFixed(1)} KB
                                </div>
                              )}
                            </div>

                            {canDeleteAttachment(selectedTask) && (
                              <button
                                className="btn btn-sm btn-outline-danger att-del"
                                title="Remove"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeAttachment(selectedTask.id, id);
                                }}
                              >
                                🗑
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-muted-400 small">
                        No attachments yet.
                      </div>
                    )}
                  </div>

                  {/* Comments */}
                  <div className="panel-soft">
                    <h6 className="text-white-90 mb-2">Activity & Comments</h6>
                    {selectedTask.comments &&
                      Object.values(selectedTask.comments).length > 0 ? (
                      Object.values(selectedTask.comments)
                        .sort((a, b) => b.timestamp - a.timestamp)
                        .map((c, i) => (
                          <div
                            key={i}
                            className="comment-row d-flex gap-3 p-3 rounded mb-2"
                          >
                            <div>
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
                                  {c.authorName ||
                                    users[c.author]?.name ||
                                    c.author}
                                </strong>
                                <span className="text-muted-300 small-text">
                                  {fmtDT(c.timestamp)}
                                </span>
                              </div>
                              <div className="text-white-80">{c.text}</div>
                            </div>
                          </div>
                        ))
                    ) : (
                      <div className="text-muted-400 small">
                        No comments yet.
                      </div>
                    )}
                    <div className="d-flex gap-2 mt-3 flex-wrap">
                      <div className="flex-grow-1 w-100">
                        <RichTextEditor
                          value={comments[selectedTask.id] || ""}
                          onChange={(html) =>
                            setComments((p) => ({
                              ...p,
                              [selectedTask.id]: html,
                            }))
                          }
                          placeholder="Add a comment..."
                        />
                      </div>
                      <button
                        className="btn btn-outline-primary align-self-start"
                        onClick={() =>
                          addComment(selectedTask.id, comments[selectedTask.id])
                        }
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
                          <div
                            key={ts}
                            className="history-item d-flex gap-2 align-items-start mb-2"
                          >
                            <span className="history-dot" />
                            <div className="history-content flex-grow-1 opacity-75">
                              <div className="history-text">
                                <strong>
                                  {h.userName || users[h.user]?.name || h.user}
                                </strong>{" "}
                                {String(h.action).replace("_", " ")}
                                {h.field && h.field !== "task"
                                  ? ` ${h.field}`
                                  : ""}
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
                              <div className="small-text text-muted-300">
                                {fmtDT(h.timestamp)}
                              </div>
                            </div>
                          </div>
                        ))
                    ) : (
                      <div className="text-muted-400 small">
                        No history yet.
                      </div>
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
                        {users[selectedTask.assignedTo]?.photoURL ||
                          selectedTask.assignedToAvatar ? (
                          <img
                            src={
                              users[selectedTask.assignedTo]?.photoURL ||
                              selectedTask.assignedToAvatar
                            }
                            onError={(e) =>
                              (e.currentTarget.style.display = "none")
                            }
                            alt="assignee"
                            className="avatar avatar-sm"
                            style={{ objectFit: "cover" }}
                          />
                        ) : (
                          <span className="avatar avatar-sm avatar-fallback">
                            {(selectedTask.assignedToName || "U")
                              .split(" ")
                              .map((s) => s[0])
                              .join("")
                              .slice(0, 2)
                              .toUpperCase()}
                          </span>
                        )}
                        <div>
                          <div className="text-white-90">
                            {selectedTask.assignedToName ||
                              users[selectedTask.assignedTo]?.name ||
                              selectedTask.assignedTo}
                          </div>
                          <div className="small text-muted-300">
                            {(
                              users[selectedTask.assignedTo]?.role || "user"
                            ).toString()}
                          </div>
                        </div>
                      </div>
                      <UserSearchDropdown
                        users={users}
                        value={selectedTask.assignedTo}
                        onChange={(value) =>
                          updateTaskField(selectedTask.id, "assignedTo", value)
                        }
                        className="form-select-sm"
                      />
                    </div>
                    {/* Linked Subtasks */}
                    <div className="panel-soft mb-3">
                      <h6 className="text-warning mb-2">Subtasks</h6>
                      {linkedChildren(selectedTask.id).length === 0 ? (
                        <div className="text-muted-400 small">
                          No subtasks yet.
                        </div>
                      ) : (
                        linkedChildren(selectedTask.id).map((child) => (
                          <div
                            key={child.id}
                            className="subtask-item d-flex align-items-center justify-content-between gap-2 mb-2"
                          >
                            <div className="d-flex align-items-center gap-2">
                              <input
                                type="checkbox"
                                checked={child.status === "Done"}
                                onChange={(e) =>
                                  toggleChildDone(child.id, e.target.checked)
                                }
                                className="form-check-input"
                              />
                              <span
                                className={
                                  child.status === "Done"
                                    ? "text-muted-300 text-decoration-line-through"
                                    : "text-white-80"
                                }
                              >
                                {child.title}
                              </span>
                            </div>
                            <div className="d-flex align-items-center gap-2">
                              <span className="tiny badge bg-dark">
                                {ticketLabel(child)}
                              </span>
                              <button
                                className="btn btn-sm btn-outline-light"
                                onClick={() => setSelectedTask(child)}
                              >
                                Open
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                      <div className="d-flex gap-2 mt-2">
                        <input
                          className="form-control form-control-sm dark-input"
                          placeholder="Add subtask..."
                          value={newSubtaskTitle}
                          onChange={(e) => setNewSubtaskTitle(e.target.value)}
                        />
                        <button
                          className="btn btn-sm btn-outline-warning"
                          onClick={() =>
                            addSubtask(selectedTask.id, newSubtaskTitle)
                          }
                        >
                          Add
                        </button>
                      </div>
                    </div>

                    {/* Status */}
                    <div className="panel-soft mb-3">
                      <h6 className="text-white-90 mb-2">Status</h6>
                      <select
                        className="form-select form-select-sm dark-input"
                        value={selectedTask.status}
                        onChange={(e) =>
                          updateTaskStatus(selectedTask.id, e.target.value)
                        }
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
                            onChange={(e) =>
                              updateTaskField(
                                selectedTask.id,
                                "priority",
                                e.target.value
                              )
                            }
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
                              updateTaskField(
                                selectedTask.id,
                                "dueDate",
                                e.target.value
                              )
                            }
                          />
                          {selectedTask.dueDate && (
                            <div
                              className={
                                isOverdue(selectedTask)
                                  ? "text-danger tiny mt-1"
                                  : "text-success tiny mt-1"
                              }
                            >
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
                              updateTaskField(
                                selectedTask.id,
                                "category",
                                e.target.value
                              )
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
                          <span className="text-muted-300">Project:</span>
                          <div className="text-info">
                            {selectedTask.projectTitle || 'Unknown Project'}
                          </div>
                        </div>
                        {selectedTask.issueType === "SubTask" &&
                          selectedTask.parentTicket && (
                            <div className="detail-item">
                              <span className="text-muted-300">Parent:</span>
                              <div className=" text-warning">
                                {selectedTask.parentTicket}
                              </div>
                            </div>
                          )}
                        <div className="detail-item">
                          <span className="text-muted-300">Ticket:</span>
                          <div className="text-info">
                            {ticketLabel(selectedTask)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Created/Updated */}
                    <div className="panel-soft">
                      <div className="small text-muted-300">Created</div>
                      <div className="text-white-90 small-text">
                        {fmtDT(selectedTask.createdAt)} by{" "}
                        {selectedTask.createdBy ||
                          users[selectedTask.createdById]?.name ||
                          "—"}
                      </div>
                      <div className="small text-muted-300 mt-1">
                        Last Updated
                      </div>
                      <div className="text-white-90 small-text">
                        {fmtDT(selectedTask.updatedAt)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Discard Changes Modal */}
      {showDiscard && (
        <div className="modal-overlay" onClick={() => setShowDiscard(false)}>
          <div className="modal-modern" onClick={(e) => e.stopPropagation()}>
            <div
              className="modal-header"
              style={{
                background: "linear-gradient(90deg,#ef4444,#f97316)",
                color: "#fff",
              }}
            >
              <h6 className="mb-0">Discard changes?</h6>
              <button
                className="btn btn-sm btn-light"
                onClick={() => setShowDiscard(false)}
              >
                Close
              </button>
            </div>
            <div className="modal-body p-3" style={{ background: "#0f172a" }}>
              <div className="text-white-80">
                You have unsaved changes. Are you sure you want to discard them?
              </div>
              <div className="d-flex justify-content-end gap-2 mt-3">
                <button
                  className="btn btn-light"
                  onClick={() => setShowDiscard(false)}
                >
                  Keep Editing
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => {
                    setShowDiscard(false);
                    setShowAdd(false);
                    setDirty(false);
                  }}
                >
                  Discard
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDelete && deleteTarget && (
        <div className="modal-overlay" onClick={() => setShowDelete(false)}>
          <div className="modal-modern" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header bg-danger text-white">
              <h6 className="mb-0">
                {activeTab === "Deleted" ? "Permanently Delete" : "Move to Deleted"}
                "{deleteTarget.title}"?
              </h6>
              <button
                className="btn btn-sm btn-light"
                onClick={() => setShowDelete(false)}
              >
                Close
              </button>
            </div>
            <div className="modal-body p-3" style={{ background: "#0f172a" }}>
              <div className="text-white-80 mb-3">
                {activeTab === "Deleted" ? (
                  "This action cannot be undone. The task will be permanently removed from the database."
                ) : (
                  "This task will be moved to the deleted items. You can restore it later from the Deleted tab."
                )}
              </div>

              <div className="task-preview p-2 bg-dark rounded mb-3">
                <div className="small">
                  <strong>Ticket:</strong> {ticketLabel(deleteTarget)}<br />
                  <strong>Project:</strong> {deleteTarget.projectTitle || projects.find(p => p.id === deleteTarget.projectId)?.title || 'Unknown Project'}<br />
                  <strong>Status:</strong> {deleteTarget.status}<br />
                  <strong>Assignee:</strong> {deleteTarget.assignedToName}
                </div>
              </div>

              <div className="d-flex justify-content-end gap-2">
                <button
                  className="btn btn-light"
                  onClick={() => setShowDelete(false)}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-danger"
                  onClick={async () => {
                    try {
                      if (activeTab === "Deleted") {
                        // Permanent deletion
                        await deleteTask(deleteTarget.id);
                      } else {
                        // Soft deletion
                        await softDeleteTask(deleteTarget.id, {
                          id: myId,
                          name: myName
                        });
                      }
                      if (showDetail && selectedTask?.id === deleteTarget.id) {
                        setShowDetail(false);
                      }
                    } catch (e) {
                      notify("Failed to delete task", "error");
                    } finally {
                      setShowDelete(false);
                      setDeleteTarget(null);
                    }
                  }}
                >
                  {activeTab === "Deleted" ? "Permanently Delete" : "Move to Deleted"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* toasts */}
      <div className="toast-wrap">
        {toasts.map((t) => (
          <div key={t.id} className={`toast-item ${t.variant}`}>
            {t.text}
          </div>
        ))}
      </div>
    </div>
  );

  // no-op to satisfy earlier reference; hoisted function declaration
  function theUsersFix() { }
}