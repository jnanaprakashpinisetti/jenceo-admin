// src/pages/clients/DisplayClient.js
import React, { useState, useEffect, useMemo } from 'react';
import firebaseDB from '../../firebase';
import editIcon from '../../assets/eidt.svg';
import viewIcon from '../../assets/view.svg';
import deleteIcon from '../../assets/delete.svg';
import ClientModal from './ClientModal';
import { useAuth } from "../../context/AuthContext";

/**
 * Matches EnquiriesDisplay features:
 * - Reminder badges with counts (overdue/today/tomorrow/upcoming) + clickable filter
 * - Search, Status filter, Sort, Reset
 * - Urgency classes on rows (reminder-overdue, reminder-today, reminder-tomorrow, reminder-upcoming)
 *
 * Data model differences handled:
 * - Reminder date comes from the most recent payment's `reminderDate`
 * - Status uses `serviceStatus`
 * - Search across idNo, clientName, location, typeOfService, mobileNo1
 */

export default function DisplayClient() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedClient, setSelectedClient] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  // Filters / Sort
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterReminder, setFilterReminder] = useState('');
  const [sortBy, setSortBy] = useState('id'); // id | name | reminderDate

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Delete flow
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [clientToDelete, setClientToDelete] = useState(null);
  const [showMovedModal, setShowMovedModal] = useState(false);

  // Removal details modal state (second step)
  const [showRemovalDetailsModal, setShowRemovalDetailsModal] = useState(false);
  const [removalForm, setRemovalForm] = useState({ reason: '', comment: '' });
  const [removalErrors, setRemovalErrors] = useState({});

  // Save flow
  const [showSaveModal, setShowSaveModal] = useState(false);

  // Reminder badges
  const [reminderCounts, setReminderCounts] = useState({
    overdue: 0,
    today: 0,
    tomorrow: 0,
    upcoming: 0,
  });

  // --- Reminder helpers (ported + adapted) ---
  const [today] = useState(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  });

  const [paymentsMeta, setPaymentsMeta] = useState({});

  const { user, currentUserName, authUser } = useAuth();

  // Robust parser for many shapes: Firebase Timestamp, number(ms/s), ISO, "DD-MM-YYYY", "DD/MM/YYYY"
  const parseDate = (v) => {
    if (v == null || v === "") return null;

    // Firestore/Firebase Timestamp
    if (typeof v === "object") {
      if ("seconds" in v || "nanoseconds" in v) {
        const ms =
          (Number(v.seconds || 0) * 1000) + Math.round(Number(v.nanoseconds || 0) / 1e6);
        const d = new Date(ms);
        return isNaN(d) ? null : d;
      }
      // Some APIs wrap in { _seconds: ..., _nanoseconds: ... }
      if ("_seconds" in v || "_nanoseconds" in v) {
        const ms =
          (Number(v._seconds || 0) * 1000) + Math.round(Number(v._nanoseconds || 0) / 1e6);
        const d = new Date(ms);
        return isNaN(d) ? null : d;
      }
    }

    // Numeric epoch (ms or s)
    if (typeof v === "number" || (/^\d+$/.test(String(v)))) {
      const n = Number(v);
      // Heuristic: if it's seconds (10 digits), convert to ms
      const ms = n < 1e12 ? n * 1000 : n;
      const d = new Date(ms);
      return isNaN(d) ? null : d;
    }

    // Strings
    const s = String(v).trim();
    // DD-MM-YYYY or DD/MM/YYYY
    let m = s.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);
    if (m) {
      const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
      return isNaN(d) ? null : d;
    }
    // YYYY-MM-DD
    m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) {
      const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
      return isNaN(d) ? null : d;
    }

    const d = new Date(s);
    return isNaN(d) ? null : d;
  };

  // Prefer a value that includes TIME:
  // 1) first payment with addedAt/timestamp/date
  // 2) otherwise client-level fields
  // Prefer a value that includes TIME: use latest payment first, else client-level fields
  const getCreatedDateValue = (c) => {
    const meta = paymentsMeta[c?.id];
    if (meta?.addedAt) return meta.addedAt;

    // fallback to client-level fields (often date-only → 12:00 AM)
    return (
      c?.timestamp ??
      c?.createdAt ??
      c?.created_on ??
      c?.createdOn ??
      c?.createdon ??
      c?.addedAt ??
      c?.added_on ??
      c?.date ??
      c?.meta?.createdAt ??
      c?.meta?.timestamp ??
      null
    );
  };

  // Clean a display name
  const cleanName = (s) => String(s || "").trim().replace(/@.*/, "");

  // Resolve a user id against Users map
  const nameFromUsers = (id, users = {}) => {
    if (!id) return "";
    const u = users[id];
    if (!u) return "";
    return cleanName(u.name || u.displayName || u.username || u.email);
  };

  // EXACTLY like payments/WorkerCalleDisplay, but tailored for a *client* row:
  // 1) direct strings on the client
  // 2) ids on the client via Users map
  // 3) first payment's direct strings / ids via Users map
  // (No fallback to current logged-in user)
  const resolveAddedByStrict = (client, users = {}) => {
    if (!client) return "";

    // 1) direct client fields first
    const direct = [
      client.addedByName,
      client.createdByName,
      client.userName,
      client.addedBy,
      client.createdBy,
    ];
    for (const d of direct) {
      const nm = cleanName(d);
      if (nm) return nm;
    }

    // 2) try client ids → Users map
    const idFields = [
      client.user_key,
      client.userKey,
      client.userId,
      client.uid,
      client.addedById,
      client.createdById,
      client.addedByUid,
      client.createdByUid,
      client.ownerId,
      client.key,
    ];
    for (const id of idFields) {
      const nm = nameFromUsers(id, users);
      if (nm) return nm;
    }

    // 3) fallback: first payment that carries a name or an id we can resolve
    if (Array.isArray(client.payments)) {
      const p =
        client.payments.find(pp => cleanName(pp?.addedByName)) ||
        client.payments.find(pp =>
          [
            pp?.user_key, pp?.userKey, pp?.userId, pp?.uid,
            pp?.addedById, pp?.createdById, pp?.addedByUid, pp?.createdByUid,
            pp?.ownerId, pp?.key
          ].some(Boolean)
        );

      if (p) {
        if (cleanName(p.addedByName)) return cleanName(p.addedByName);

        const payIds = [
          p.user_key, p.userKey, p.userId, p.uid,
          p.addedById, p.createdById, p.addedByUid, p.createdByUid,
          p.ownerId, p.key
        ];
        for (const id of payIds) {
          const nm = nameFromUsers(id, users);
          if (nm) return nm;
        }
      }
    }

    return ""; // let the UI show "System" only if nothing resolves
  };

  // Most recent reminder from payments
  const getReminderDate = (c) => {
    if (!c || !Array.isArray(c.payments)) return null;

    const valid = c.payments
      .filter(p => p.reminderDate && String(p.reminderDate).trim() !== '')
      .map(p => parseDate(p.reminderDate))
      .filter(Boolean)
      .sort((a, b) => b - a); // most recent first

    return valid[0] || null;
  };

  const daysUntil = (d) => {
    if (!d) return Infinity;
    const rd = new Date(d);
    rd.setHours(0, 0, 0, 0);
    return Math.ceil((rd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  // Enquiries-style CSS class for reminder state
  const getReminderClass = (client) => {
    const d = getReminderDate(client);
    if (!d) return '';
    const du = daysUntil(d);
    if (du < 0) return 'reminder-overdue';
    if (du === 0) return 'reminder-today';
    if (du === 1) return 'reminder-tomorrow';
    // treat day+2 as "upcoming" to mirror Enquiries "day after tomorrow+"
    if (du >= 2) return 'reminder-upcoming';
    return '';
  };

  // Status badge (kept your mapping)
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Running': return 'bg-success';
      case 'Closed': return 'bg-secondary';
      case 'Stop': return 'bg-warning';
      case 'Re-open': return 'bg-info';
      case 'Re-start': return 'bg-primary';
      case 'Re-place': return 'bg-dark';
      default: return 'bg-info';
    }
  };

  // Sort order (keep urgent-first behavior, then apply user sort)
  const byIdDesc = (a, b) => {
    const idA = a.idNo || '';
    const idB = b.idNo || '';
    if (idA.startsWith('JC') && idB.startsWith('JC')) {
      const numA = parseInt(idA.replace('JC', '')) || 0;
      const numB = parseInt(idB.replace('JC', '')) || 0;
      return numB - numA;
    }
    if (!isNaN(idA) && !isNaN(idB)) return parseInt(idB) - parseInt(idA);
    return (idB || '').localeCompare(idA || '');
  };

  const baseUrgencySort = (a, b) => {
    const dA = getReminderDate(a);
    const dB = getReminderDate(b);
    const duA = daysUntil(dA);
    const duB = daysUntil(dB);

    const urgentA = duA <= 2;
    const urgentB = duB <= 2;

    // both urgent: earlier first
    if (urgentA && urgentB) return (dA || 0) - (dB || 0);
    if (urgentA && !urgentB) return -1;
    if (!urgentA && urgentB) return 1;
    return 0; // tie → user sort
  };

  // === Users map (for "By {user}" under ID, same as EnquiriesDisplay) ===
  const [usersMap, setUsersMap] = useState({});
  useEffect(() => {
    const paths = [
      "JenCeo-DataBase/Users", // current
      "Users",                  // legacy
      "JenCeo/Users"            // you mentioned this path in auth context
    ];

    const offs = [];
    paths.forEach((p) => {
      const ref = firebaseDB.child(p);
      const handler = ref.on("value", (snap) => {
        const v = snap.val() || {};
        setUsersMap((prev) => ({ ...v, ...prev }));
      });
      offs.push(() => ref.off("value", handler));
    });

    return () => offs.forEach((fn) => fn());
  }, []);

  // === Live join latest payment per client from DB (handles ClientData/<id>/Payments) ===
  useEffect(() => {
    if (!Array.isArray(clients) || clients.length === 0) return;

    const offs = [];
    clients.forEach((c) => {
      if (!c?.id) return;

      // listen to lowercase path (your DB uses "payments")
      const payRefLower = firebaseDB.child(`ClientData/${c.id}/payments`);
      const handlerLower = payRefLower.limitToLast(1).on("value", (snap) => {
        let latest = null;
        snap.forEach((child) => (latest = { id: child.key, ...child.val() }));
        const addedAt =
          latest?.addedAt || latest?.timestamp || latest?.date || latest?.createdAt || "";
        const addedById =
          latest?.addedById || latest?.user_key || latest?.userId || latest?.uid ||
          latest?.createdById || latest?.addedByUid || latest?.createdByUid || "";

        setPaymentsMeta((prev) => ({
          ...prev,
          [c.id]: {
            addedByName: latest?.addedByName || "",
            addedById,
            addedAt,
          },
        }));
      });

      // OPTIONAL: also listen to legacy UPPERCASE path if you truly have some records there.
      const payRefUpper = firebaseDB.child(`ClientData/${c.id}/Payments`);
      const handlerUpper = payRefUpper.limitToLast(1).on("value", (snap) => {
        let latest = null;
        snap.forEach((child) => (latest = { id: child.key, ...child.val() }));
        if (!latest) return;
        const addedAt =
          latest?.addedAt || latest?.timestamp || latest?.date || latest?.createdAt || "";
        const addedById =
          latest?.addedById || latest?.user_key || latest?.userId || latest?.uid ||
          latest?.createdById || latest?.addedByUid || latest?.createdByUid || "";

        setPaymentsMeta((prev) => ({
          ...prev,
          [c.id]: {
            addedByName: latest?.addedByName || prev?.[c.id]?.addedByName || "",
            addedById: addedById || prev?.[c.id]?.addedById || "",
            addedAt: addedAt || prev?.[c.id]?.addedAt || "",
          },
        }));
      });

      offs.push(() => payRefLower.off("value", handlerLower));
      offs.push(() => payRefUpper.off("value", handlerUpper));
    });

    return () => offs.forEach((fn) => fn());
  }, [clients]);

  // Join latest payment meta (name/id/time) per client from in-memory `client.payments`
  useEffect(() => {
    const meta = {};
    const pickDate = (p) => parseDate(p?.addedAt || p?.timestamp || p?.date);

    (clients || []).forEach((c) => {
      const arr = Array.isArray(c?.payments) ? c.payments.slice() : [];
      if (!arr.length) return;

      // Choose most recent payment with an actual time-bearing date
      const withDates = arr
        .map((p) => ({ p, d: pickDate(p) }))
        .filter((x) => !!x.d)
        .sort((a, b) => b.d - a.d);

      const chosen = (withDates[0]?.p) || arr[0];
      if (chosen) {
        meta[c.id] = {
          addedByName: chosen.addedByName || "",
          addedById:
            chosen.addedById ||
            chosen.user_key ||
            chosen.userId ||
            chosen.uid ||
            chosen.createdById ||
            chosen.addedByUid ||
            chosen.createdByUid ||
            "",
          addedAt: chosen.addedAt || chosen.timestamp || chosen.date || "",
        };
      }
    });

    setPaymentsMeta(meta);
  }, [clients]);

  // Robust resolver: payment → client ids → nested sniff → in-memory payments
  const resolveAddedBy = (client, paymentsMeta, usersIndex) => {
    const meta = paymentsMeta?.[client?.id];

    // 1) Payment meta: name wins
    if (meta?.addedByName && String(meta.addedByName).trim()) {
      return String(meta.addedByName).trim().replace(/@.*/, "");
    }

    // 2) Payment meta: id → usersIndex
    const metaId = String(meta?.addedById || "").toLowerCase();
    if (metaId && usersIndex[metaId]) return usersIndex[metaId];

    // 3) Client id fields → usersIndex
    const candidates = [
      client?.addedById, client?.createdById, client?.createdBy,
      client?.uid, client?.userId, client?.user_key, client?.dbId,
      client?.dbUsername, client?.dbName, client?.email, client?.userEmail,
    ].filter(Boolean).map(x => String(x).toLowerCase());
    for (const c of candidates) if (usersIndex[c]) return usersIndex[c];

    // 4) Sniff top/nested fields for a name/id
    const top = probeClientForUser(client);
    if (top.name) return String(top.name).replace(/@.*/, "");
    if (top.id) {
      const k = String(top.id).toLowerCase();
      if (usersIndex[k]) return usersIndex[k];
    }

    // 5) As a last resort, sniff the most recent in-memory payment on the client object
    if (Array.isArray(client?.payments) && client.payments.length) {
      const pick = (p) => parseDate(p?.addedAt || p?.timestamp || p?.date) || 0;
      const p = client.payments.slice().sort((a, b) => pick(b) - pick(a))[0];

      const ph = sniffUserField(p);
      if (ph.name) return String(ph.name).replace(/@.*/, "");
      if (ph.id) {
        const k = String(ph.id).toLowerCase();
        if (usersIndex[k]) return usersIndex[k];
      }
    }

    return "System";
  };

  const formatTime12 = (v) => {
    const d = parseDate(v);
    if (!d) return "";
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
  };

  // Return first non-empty string
  const firstStr = (...vals) => {
    for (const v of vals) {
      if (v == null) continue;
      const s = String(v).trim();
      if (s) return s;
    }
    return "";
  };

  // Heuristic: find a user id/name anywhere in an object
  const sniffUserField = (obj) => {
    if (!obj || typeof obj !== "object") return { id: "", name: "" };

    // 1) direct name-like fields
    const name = firstStr(
      obj.addedByName, obj.createdByName, obj.userName, obj.enteredByName,
      obj.byName, obj.ownerName, obj.created_name, obj.added_name
    );
    if (name) return { id: "", name };

    // 2) id-like fields
    const id = firstStr(
      obj.addedById, obj.createdById, obj.user_key, obj.userKey, obj.userId,
      obj.uid, obj.dbId, obj.ownerId, obj.key, obj.created_uid, obj.by, obj.enteredById
    );
    if (id) return { id, name: "" };

    return { id: "", name: "" };
  };

  // Walk the client object shallowly + a few nested spots for IDs/names
  const probeClientForUser = (client) => {
    if (!client) return { id: "", name: "" };

    // top-level first
    let hit = sniffUserField(client);
    if (hit.name || hit.id) return hit;

    // common nests
    hit = sniffUserField(client.meta); if (hit.name || hit.id) return hit;
    hit = sniffUserField(client.audit); if (hit.name || hit.id) return hit;
    hit = sniffUserField(client.history?.createdBy); if (hit.name || hit.id) return hit;

    return { id: "", name: "" };
  };

  // === Date + Time in one (DD-MM-YYYY • hh:mm am/pm) using parseDate() ===
  const formatDateTime = (value) => {
    const d = parseDate(value);
    if (!d) return "";

    // If original string looks date-only, suppress time part
    const s = String(value || "").trim();
    const isDateOnly =
      /^\d{2}[-/]\d{2}[-/]\d{4}$/.test(s) || /^\d{4}-\d{2}-\d{2}$/.test(s);

    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();

    if (isDateOnly) return `${dd}-${mm}-${yyyy}`;

    const time = d.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    return `${dd}-${mm}-${yyyy} • ${time}`;
  };

  // Fetch + live updates (kept your realtime listener)
  useEffect(() => {
    const ref = firebaseDB.child('ClientData');
    const handler = ref.on('value', (snapshot) => {
      try {
        if (snapshot.exists()) {
          const list = [];
          snapshot.forEach((child) => {
            list.push({ id: child.key, ...child.val() });
          });
          setClients(list);
        } else {
          setClients([]);
        }
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    });
    return () => ref.off('value', handler);
  }, []);

  // Compute reminder counts for badges (overdue/today/tomorrow/upcoming)
  useEffect(() => {
    const counts = { overdue: 0, today: 0, tomorrow: 0, upcoming: 0 };
    clients.forEach((c) => {
      const d = getReminderDate(c);
      if (!d) return;
      const du = daysUntil(d);
      if (du < 0) counts.overdue++;
      else if (du === 0) counts.today++;
      else if (du === 1) counts.tomorrow++;
      else if (du >= 2) counts.upcoming++;
    });
    setReminderCounts(counts);
  }, [clients]);

  // Search + filter + sort
  const filteredSorted = useMemo(() => {
    const needle = search.toLowerCase().trim();

    let arr = clients.filter((c) => {
      const rClass = getReminderClass(c);
      const matchesReminder = filterReminder ? rClass === filterReminder : true;
      const matchesStatus = filterStatus ? (c.serviceStatus || '').toLowerCase() === filterStatus.toLowerCase() : true;

      const hay =
        `${c.idNo || ''} ${c.clientName || ''} ${c.location || ''} ${c.typeOfService || ''} ${c.mobileNo1 || ''}`
          .toLowerCase();

      const matchesSearch = needle ? hay.includes(needle) : true;

      return matchesReminder && matchesStatus && matchesSearch;
    });

    // Urgency-first (like your previous) then apply user sort
    arr.sort((a, b) => {
      if (sortBy === 'name') {
        return (a.clientName || '').localeCompare(b.clientName || '');
      }
      if (sortBy === 'reminderDate') {
        const da = getReminderDate(a);
        const db = getReminderDate(b);
        if (!da && !db) return 0;
        if (!da) return 1;
        if (!db) return -1;
        return da - db; // earliest first
      }
      // default id (desc)
      return byIdDesc(a, b);
    });

    return arr;
  }, [clients, search, filterStatus, filterReminder, sortBy]);

  // Pagination derived
  const totalPages = Math.ceil(filteredSorted.length / rowsPerPage) || 1;
  const indexOfLast = currentPage * rowsPerPage;
  const indexOfFirst = indexOfLast - rowsPerPage;
  const currentClients = filteredSorted.slice(indexOfFirst, indexOfLast);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

  // Counts shown in header "Reminder Clients:"
  const reminderCount = filteredSorted.filter((c) => {
    const d = getReminderDate(c);
    if (!d) return false;
    return daysUntil(d) <= 2;
  }).length;

  // Handlers
  const handleView = (client) => {
    setSelectedClient(client);
    setIsEditMode(false);
    setIsModalOpen(true);
  };

  const handleEdit = (client) => {
    setSelectedClient(client);
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  const openDeleteConfirm = (client) => {
    setClientToDelete(client);
    setShowDeleteConfirm(true);
  };

  const closeDeleteConfirm = () => {
    setShowDeleteConfirm(false);
    setClientToDelete(null);
  };

  const handleDeleteConfirmed = async () => {
    setShowDeleteConfirm(false);
    setShowRemovalDetailsModal(true);
  };

  const handleSave = async (updatedClient) => {
    try {
      await firebaseDB.child(`ClientData/${updatedClient.id}`).update(updatedClient);
      setIsModalOpen(false);
      setShowSaveModal(true);
    } catch (err) {
      setError('Error updating client: ' + err.message);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedClient(null);
    setIsEditMode(false);
  };

  const formatDate = (d) => {
    if (!d) return '—';
    const dt = parseDate(d);
    if (!dt) return '—';
    return dt.toLocaleDateString('en-GB');
  };

  const resetFilters = () => {
    setSearch('');
    setFilterStatus('');
    setFilterReminder('');
    setSortBy('id');
    setCurrentPage(1);
  };

  // Map many possible identifiers → clean display name
  const [usersIndex, setUsersIndex] = useState({});

  useEffect(() => {
    const index = {};
    Object.entries(usersMap || {}).forEach(([key, u]) => {
      const name = String(
        u?.name || u?.displayName || u?.dbName || u?.dbUsername || u?.username || u?.fullName || u?.Name || u?.email || ""
      ).replace(/@.*/, "").trim();

      const ids = [
        key, u?.id, u?.uid, u?.key, u?.dbId, u?.dbUsername, u?.dbName,
        u?.username, u?.email, u?.Email, u?.userEmail, u?.emailId,
      ].filter(Boolean).map(x => String(x).toLowerCase());

      ids.forEach(id => { if (name) index[id] = name; });
    });

    setUsersIndex(index);
  }, [usersMap]);

  if (loading) return <div className="text-center my-5">Loading clients...</div>;
  if (error) return <div className="alert alert-danger">Error: {error}</div>;
  if (clients.length === 0) return <div className="alert alert-info">No clients found</div>;

  return (
    <div className="display-client">
      <h3 className="mb-3">Clients</h3>

      {/* Reminder badges (click to filter) */}
      <div className="alert alert-info d-flex justify-content-around flex-wrap reminder-badges">
        <span
          className={`reminder-badge overdue ${filterReminder === 'reminder-overdue' ? 'active' : ''}`}
          onClick={() => { setFilterReminder('reminder-overdue'); setCurrentPage(1); }}
        >
          Overdue: <strong>{reminderCounts.overdue}</strong>
        </span>

        <span
          className={`reminder-badge today ${filterReminder === 'reminder-today' ? 'active' : ''}`}
          onClick={() => { setFilterReminder('reminder-today'); setCurrentPage(1); }}
        >
          Today: <strong>{reminderCounts.today}</strong>
        </span>

        <span
          className={`reminder-badge tomorrow ${filterReminder === 'reminder-tomorrow' ? 'active' : ''}`}
          onClick={() => { setFilterReminder('reminder-tomorrow'); setCurrentPage(1); }}
        >
          Tomorrow: <strong>{reminderCounts.tomorrow}</strong>
        </span>

        <span
          className={`reminder-badge upcoming ${filterReminder === 'reminder-upcoming' ? 'active' : ''}`}
          onClick={() => { setFilterReminder('reminder-upcoming'); setCurrentPage(1); }}
        >
          Upcoming: <strong>{reminderCounts.upcoming}</strong>
        </span>

      </div>

      {/* Filters row (search / status / sort / reset) */}
      <div className="row mb-3">
        <div className="col-md-6 mb-2">
          <input
            type="text"
            className="form-control opacity-75"
            placeholder="Search id, name, location, service, mobile..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
          />
        </div>
        <div className="col-md-2 mb-2">
          <select
            className="form-select opacity-75"
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
          >
            <option value="">All Status</option>
            <option>Running</option>
            <option>Closed</option>
            <option>Stop</option>
            <option>Re-open</option>
            <option>Re-start</option>
            <option>Re-place</option>
          </select>
        </div>
        <div className="col-md-2 mb-2">
          <select
            className="form-select opacity-75"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="id">Sort by ID</option>
            <option value="name">Sort by Name</option>
            <option value="reminderDate">Sort by Reminder Date</option>
          </select>
        </div>
        <div className="col-md-1 d-flex gap-2 flex-wrap">
          <button className="btn btn-secondary flex-fill mb-2" onClick={resetFilters}>
            Reset
          </button>
        </div>

        {/* Page size + summary (kept, just aligned) */}
        <div className="col-md-1 d-flex align-items-center justify-content-end mb-2">
          <select
            className="form-select form-select-sm w-auto"
            value={rowsPerPage}
            onChange={(e) => {
              setRowsPerPage(parseInt(e.target.value));
              setCurrentPage(1);
            }}
          >
            <option value={10}>10 / Rows</option>
            <option value={20}>20 / Rows</option>
            <option value={30}>30 / Rows</option>
            <option value={40}>40 / Rows</option>
            <option value={50}>50 / Rows</option>
          </select>
        </div>
      </div>

      <div className="table-responsive running-client">
        <table className="table table-dark table-hover">
          <thead className="table-dark">
            <tr>
              <th>ID No ↓</th>
              <th>Client Name</th>
              <th>Location</th>
              <th>Type of Service</th>
              <th>Reminder Date</th>
              <th>Mobile No</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentClients.map((client) => {
              const rDate = getReminderDate(client);
              const rClass = getReminderClass(client);

              const daysLabel = (() => {
                const du = daysUntil(rDate);
                if (!isFinite(du)) return '';
                if (du === 0) return 'Today';
                if (du === 1) return 'Tomorrow';
                if (du < 0) return `${Math.abs(du)} days ago`;
                return `${du} days`;
              })();

              const resolvedName = resolveAddedBy(client, paymentsMeta, usersIndex);

              return (
                <tr key={client.id} className={rClass} onClick={() => handleView(client)} style={{ cursor: 'pointer' }}>
                  <td>
                    <strong>{client.idNo || "N/A"}</strong>
                    <small className="d-block small-text text-info opacity-50">
                      By {resolvedName}
                    </small>
                  </td>
                  <td>{client.clientName || 'N/A'}
                    <small className="d-block small-text text-info opacity-50">
                      {formatDateTime(getCreatedDateValue(client))}
                    </small>
                  </td>
                  <td>{client.location || 'N/A'}</td>
                  <td>{client.typeOfService || 'N/A'}</td>
                  <td>
                    {formatDate(rDate)}
                    {rDate && <small className="d-block text-muted opacity-50">{daysLabel}</small>}
                  </td>
                  <td>
                    {client.mobileNo1 ? (
                      <span>
                        <a href={`tel:${client.mobileNo1}`} className="btn btn-sm btn-info" onClick={(e) => e.stopPropagation()}>Call</a>
                        <a
                          className="btn btn-sm btn-warning ms-1"
                          href={`https://wa.me/${client.mobileNo1.replace(/\D/g, '')}?text=${encodeURIComponent(
                            'Hello, This is Sudheer From JenCeo Home Care Services'
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                        >
                          WAP
                        </a>
                      </span>
                    ) : 'N/A'}
                  </td>
                  <td>
                    <span className={`badge ${getStatusBadgeClass(client.serviceStatus)} opacity-75`}>
                      {client.serviceStatus || 'Running'}
                    </span>
                  </td>
                  <td>
                    <div className="d-flex">
                      <button className="btn btn-sm me-2" title="View" onClick={(e) => { e.stopPropagation(); handleView(client); }}>
                        <img src={viewIcon} alt="view Icon" width="18" height="18" />
                      </button>
                      <button className="btn btn-sm me-2" title="Edit" onClick={(e) => { e.stopPropagation(); handleEdit(client); }}>
                        <img src={editIcon} alt="edit Icon" width="15" height="15" />
                      </button>
                      <button className="btn btn-sm" title="Delete" onClick={(e) => { e.stopPropagation(); openDeleteConfirm(client); }}>
                        <img src={deleteIcon} alt="delete Icon" width="14" height="14" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {currentClients.length === 0 && (
              <tr>
                <td colSpan="8">
                  <div className="alert alert-warning mb-0">No records match your filters.</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className='d-flex justify-content-center'>
          <nav aria-label="Client pagination" className="pagination-wrapper w-auto p-0 mt-3">
            <ul className="pagination justify-content-center">
              <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                <button className="page-link" onClick={() => setCurrentPage(1)} disabled={currentPage === 1} aria-label="First">«</button>
              </li>
              <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                <button className="page-link" onClick={() => setCurrentPage(currentPage - 1)} disabled={currentPage === 1} aria-label="Previous">‹</button>
              </li>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
                <li key={num} className={`page-item ${currentPage === num ? 'active' : ''}`}>
                  <button className="page-link" onClick={() => setCurrentPage(num)}>{num}</button>
                </li>
              ))}
              <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                <button className="page-link" onClick={() => setCurrentPage(currentPage + 1)} disabled={currentPage === totalPages} aria-label="Next">›</button>
              </li>
              <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                <button className="page-link" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} aria-label="Last">»</button>
              </li>
            </ul>
          </nav>
        </div>
      )}

      {/* Client View/Edit Modal */}
      {selectedClient && (
        <ClientModal
          client={selectedClient}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSave={handleSave}
          onDelete={() => { }}
          isEditMode={isEditMode}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && clientToDelete && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Confirm Delete</h5>
                <button type="button" className="btn-close" onClick={closeDeleteConfirm}></button>
              </div>
              <div className="modal-body">
                <p className="mb-0">Are you sure you want to delete this client?</p>
                <p className="mt-2">
                  <strong>ID:</strong> {clientToDelete.idNo || clientToDelete.id} <br />
                  <strong>Name:</strong> {clientToDelete.clientName || 'N/A'}
                </p>
                <small className="text-muted">
                  This will move the record to the <strong>ExitClients</strong> section.
                </small>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeDeleteConfirm}>Cancel</button>
                <button type="button" className="btn btn-danger" onClick={() => { setShowDeleteConfirm(false); setShowRemovalDetailsModal(true); }}>Yes, Move & Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Removal Details Modal (after confirming delete) */}
      {showRemovalDetailsModal && clientToDelete && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Removal Details</h5>
                <button type="button" className="btn-close" onClick={() => setShowRemovalDetailsModal(false)}></button>
              </div>
              <div className="modal-body">
                <p>Please provide a reason and comment for removal. Both fields are mandatory.</p>
                <div className="mb-2">
                  <label className="form-label">Reason</label>
                  <select className="form-select" value={removalForm.reason} onChange={(e) => setRemovalForm(prev => ({ ...prev, reason: e.target.value }))}>
                    <option value="">-- Select reason --</option>
                    <option value="Contract Closed">Contract Closed</option>
                    <option value="Contract Terminated">Contract Terminated</option>
                    <option value="Contract Stopped">Contract Stopped</option>
                  </select>
                  {removalErrors.reason && <div className="text-danger small mt-1">{removalErrors.reason}</div>}
                </div>
                <div className="mb-2">
                  <label className="form-label">Comment</label>
                  <textarea className="form-control" rows={4} value={removalForm.comment} onChange={(e) => setRemovalForm(prev => ({ ...prev, comment: e.target.value }))} />
                  {removalErrors.comment && <div className="text-danger small mt-1">{removalErrors.comment}</div>}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowRemovalDetailsModal(false)}>Cancel</button>
                <button type="button" className="btn btn-danger" onClick={async () => {
                  const errs = {};
                  if (!removalForm.reason) errs.reason = 'Select reason';
                  if (!removalForm.comment || !removalForm.comment.trim()) errs.comment = 'Enter comment';
                  setRemovalErrors(errs);
                  if (Object.keys(errs).length > 0) return;

                  try {
                    const client = clientToDelete;
                    const { id, ...payload } = client;
                    const movedAt = new Date().toISOString();
                    const removalEntry = { removedAt: movedAt, removedBy: (window?.CURRENT_USER_NAME || 'System'), removalReason: removalForm.reason, removalComment: removalForm.comment.trim() };

                    await firebaseDB.child(`ExitClients/${id}`).set({ ...payload, originalId: id, movedAt });
                    await firebaseDB.child(`ExitClients/${id}/removalHistory`).push(removalEntry);
                    await firebaseDB.child(`ClientData/${id}`).remove();

                    setShowRemovalDetailsModal(false);
                    setShowMovedModal(true);
                    setClientToDelete(null);
                    setRemovalForm({ reason: '', comment: '' });
                    setRemovalErrors({});
                  } catch (err) {
                    console.error('Error moving client with removal', err);
                    alert('Remove failed: ' + (err.message || err));
                  }
                }}>Remove & Move</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Moved Success Modal */}
      {showMovedModal && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-success text-white">
                <h5 className="modal-title">Moved Successfully</h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowMovedModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <p>The client has been moved to the <strong>ExitClients</strong> section.</p>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-success" onClick={() => setShowMovedModal(false)}>OK</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Save Success Modal */}
      {showSaveModal && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-success text-white">
                <h5 className="modal-title">Saved Successfully</h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowSaveModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <p>Client details have been updated.</p>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-success" onClick={() => setShowSaveModal(false)}>OK</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}