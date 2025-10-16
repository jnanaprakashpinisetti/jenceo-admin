// src/components/Shop/PurchaseDetails.jsx
// src/components/Shop/PurchaseDetails.jsx
import React, { useEffect, useMemo, useState } from "react";
import firebaseDB from "../../firebase";
import { useAuth } from "../../context/AuthContext";
// import categoryMap from "./VegCatalog";

// Inline catalog (you can switch to import later)
const categoryMap = {
    "1 కూరగాయలు": ["టమాటలు", "వంకాయలు", "బెండకాయలు", "దోసకాయలు", "కాకరకాయలు", "బీరకాయలు", "పొట్లకాయలు", "సొరకాయలు", "దొండకాయలు", "గుమ్మడికాయ", "బూడిద గుమ్మడికాయ", "మునగకాయలు", "పచ్చిమిరపకాయలు", "గోరుచిక్కుడు", "బీన్స్", "చిక్కుడు", "అరటికాయలు", "మామిడికాయలు", "క్యాబేజీ", "కాలిఫ్లవర్"],
    "2 వేరు కూరగాయలు": ["ఉల్లిపాయలు", "వెల్లుల్లి", "కేరట్", "బీట్ రూట్", "ముల్లంగి", "బంగాళాదుంపలు", "చిలకడదుంపలు", "చెమదుంపలు", "అల్లం"],
    "3 ఆకుకూరలు": ["పాలకూర", "తోటకూర", "మెంతికూర", "కొత్తిమీర", "పుదీనా", "కరివేపాకు", "గోంగూర"],
    "4 అరటి పళ్ళు": ["కర్పూరం", "పచ్చ చేక్కరకేళి", "ఎర్ర చేక్కరకేళి", "అమృతపాణి", "ట్రే అరిటి పళ్ళు"],
    "5 పువ్వులు": ["బంతి పువ్వులు", "పసుపు చామంతి", "తెల్ల చామంతి", "గులాబీ", "మలబార్", "మల్లె పువ్వులు", "మల్లె పూలదండ", "సన్నజాజులు", "సన్నజాజుల దండ"],
    "6 కొబ్బరిబొండాలు": ["కేరళ బొండాలు", "కేరళ నెంబర్ కాయ", "కేరళ గ్రేడ్ కాయ", "ఆంధ్ర బొండాలు", "ఆంధ్ర నెంబర్ కాయ", "ఆంధ్ర గ్రేడ్ కాయ"],
    "7 ఇతర వస్తువులు": ["కొబ్బరికాయలు", "బెల్లం", "తేనే పాకం"]
};

/* ------------ Helpers ------------ */
const ymd = (d) => {
    const x = new Date(d);
    const yyyy = x.getFullYear();
    const mm = String(x.getMonth() + 1).padStart(2, "0");
    const dd = String(x.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
};

const safeNum = (v) => (isNaN(Number(v)) ? 0 : Number(v));
const norm = (s) => String(s || "").trim().toLowerCase();

const getUserName = (user) =>
    user?.name ||
    user?.username ||
    user?.displayName ||
    (user?.email ? user.email.replace(/@.*/, "") : "") ||
    "User";

/** Detect if an object looks like a row payload */
const looksLikeRow = (o) => {
    if (!o || typeof o !== "object") return false;
    return (
        "subCategory" in o ||
        "mainCategory" in o ||
        "quantity" in o ||
        "price" in o ||
        "date" in o
    );
};

/** Flatten any nested structure Shop/key/key => rows[] */
const flattenRows = (obj, out = []) => {
    if (!obj || typeof obj !== "object") return out;
    for (const [k, v] of Object.entries(obj)) {
        if (v && typeof v === "object") {
            if (looksLikeRow(v)) {
                out.push({ id: v.id || k, ...v });
            } else {
                // recurse (handles .../key/<id> and deeper nesting)
                flattenRows(v, out);
            }
        }
    }
    return out;
};

/* ------------ Branch helpers (read vs write) ------------ */
const deriveBranchKey = (user) =>
    user?.branchKey || user?.dbId || user?.uid || "";

const getReadPath = (user) => {
    const role = (user?.role || "").toLowerCase();
    // Admins see all branches (Shop). Others see own branch.
    if (role === "guest" || role === "user" || role === "admin" || role === "superadmin") return "Shop";
    const key = deriveBranchKey(user);
    return key ? `Shop/${key}` : "Shop";
};

const getWritePath = (user) => {
    const key = deriveBranchKey(user);
    return key ? `Shop/${key}` : "Shop";
};

// Check if user has admin privileges
const hasAdminAccess = (user) => {
    const role = (user?.role || "").toLowerCase();
    return role === "admin" || role === "superadmin";
};

export default function PurchaseDetails() {
    const { user: authUser } = useAuth?.() || {};

    const now = new Date();
    const [year, setYear] = useState(now.getFullYear());
    const [month, setMonth] = useState(now.getMonth()); // 0..11
    const [dateStr, setDateStr] = useState(ymd(now)); // yyyy-mm-dd

    const [allRows, setAllRows] = useState([]);
    const [loading, setLoading] = useState(true);

    // selling rate inline editor (ID-based)
    const [editingKey, setEditingKey] = useState(null); // row.id
    const [sellDraft, setSellDraft] = useState("");

    /* ------------ Dynamic DB paths ------------ */
    const DB_READ_PATH = useMemo(() => getReadPath(authUser), [authUser]);
    const DB_WRITE_PATH = useMemo(() => getWritePath(authUser), [authUser]);
    // For backward compatibility with older references:
    const DB_PATH = DB_READ_PATH;

    // Check admin access
    const isAdminUser = useMemo(() => hasAdminAccess(authUser), [authUser]);

    // ── Delete modal state
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteRow, setDeleteRow] = useState(null);

    const openDelete = (row) => {
        if (!isAdminUser) return; // Only admins can delete
        setDeleteRow(row);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (!isAdminUser) return; // Additional security check
        try {
            const row = deleteRow;
            if (!row) return;
            const branch = row._branch || (DB_PATH.startsWith("Shop/") ? DB_PATH.split("/")[1] : "");
            await firebaseDB.child(`Shop/${branch}/${row.id}`).remove();
            setAllRows((prev) => prev.filter((r) => r.id !== row.id));
        } finally {
            setShowDeleteModal(false);
            setDeleteRow(null);
        }
    };

    const cancelDelete = () => {
        setShowDeleteModal(false);
        setDeleteRow(null);
    };

    const fmtINR = (n) => `₹${(Number(n) || 0).toLocaleString("en-IN")}`;

    // Grand total for the selected date
    const grandTotalForDate = useMemo(
        () =>
            allRows
                .filter((r) => r.date === dateStr)
                .reduce((sum, r) => {
                    const qty = safeNum(r.quantity);
                    const price = safeNum(r.price);
                    return sum + (r?.total != null ? safeNum(r.total) : qty * price);
                }, 0),
        [allRows, dateStr]
    );

    /* ------------ Date options ------------ */
    const daysInMonth = useMemo(
        () => new Date(year, month + 1, 0).getDate(),
        [year, month]
    );

    useEffect(() => {
        // keep selected date valid on month/year change
        const currentDay = new Date(dateStr).getDate();
        const possible = ymd(new Date(year, month, Math.min(currentDay, daysInMonth)));
        setDateStr(possible);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [year, month, daysInMonth]);

    /* ------------ Fetch from dynamic path: Shop or Shop/<branch> ------------ */
    useEffect(() => {
        setLoading(true);
        const ref = firebaseDB.child(DB_PATH);
        const handler = (snap) => {
            const raw = snap.val() || {};
            let flat = [];

            // If reading from Shop (admin), merge all branches
            if (DB_PATH === "Shop") {
                for (const [branchKey, subtree] of Object.entries(raw)) {
                    const rows = flattenRows(subtree).map((row) => {
                        const quantity = safeNum(row?.quantity);
                        const price = safeNum(row?.price);
                        return {
                            ...row,
                            _branch: branchKey,
                            id: row?.id || "",
                            date: row?.date || "",
                            mainCategory: row?.mainCategory || "",
                            subCategory: row?.subCategory || "",
                            quantity,
                            price,
                            sellingRate: safeNum(row?.sellingRate),
                            total: row?.total != null ? safeNum(row.total) : quantity * price,
                        };
                    });
                    flat.push(...rows);
                }
            } else {
                // Reading from a single branch
                const branchKey = DB_PATH.split("/")[1] || "";
                flat = flattenRows(raw).map((row) => {
                    const quantity = safeNum(row?.quantity);
                    const price = safeNum(row?.price);
                    return {
                        ...row,
                        _branch: branchKey,
                        id: row?.id || "",
                        date: row?.date || "",
                        mainCategory: row?.mainCategory || "",
                        subCategory: row?.subCategory || "",
                        quantity,
                        price,
                        sellingRate: safeNum(row?.sellingRate),
                        total: row?.total != null ? safeNum(row.total) : quantity * price,
                    };
                });
            }

            setAllRows(flat);
            setLoading(false);
        };

        const errHandler = () => {
            setAllRows([]);
            setLoading(false);
        };

        const cb = ref.on("value", handler, errHandler);
        return () => ref.off("value", cb);
    }, [DB_PATH]);

    /* ------------ Lookups (inside component) ------------ */
    const byDateVeg = useMemo(() => {
        const map = {};
        for (const r of allRows) {
            if (!r.date || !r.subCategory) continue;
            // normalized key
            map[`${r.date}::${norm(r.subCategory)}`] = r;
        }
        return map;
    }, [allRows]);

    const byId = useMemo(() => {
        const map = {};
        for (const r of allRows) if (r?.id) map[r.id] = r;
        return map;
    }, [allRows]);

    const getRow = (veg, d = dateStr) => byDateVeg[`${d}::${norm(veg)}`] || null;

    // Daily (selected date) → group by mainCategory, items as table-like rows
    const dailyGroups = useMemo(() => {
        const rows = allRows.filter((r) => r.date === dateStr);
        if (!rows.length) return [];
        const catMap = new Map();
        for (const r of rows) {
            const mc = r.mainCategory || "—";
            if (!catMap.has(mc)) catMap.set(mc, []);
            catMap.get(mc).push(r);
        }
        const orderedCats = Array.from(catMap.keys()).sort((a, b) =>
            a.localeCompare(b, "te-IN")
        );
        return orderedCats.map((mc) => ({
            title: mc,
            items: catMap
                .get(mc)
                .sort((a, b) =>
                    String(a.subCategory).localeCompare(String(b.subCategory), "te-IN")
                ),
        }));
    }, [allRows, dateStr]);

    // Monthly price tracker: vegetables discovered from data (fallback)
    const vegAll = useMemo(() => {
        const s = new Set();
        for (const r of allRows) if (r.subCategory) s.add(r.subCategory);
        return Array.from(s).sort((a, b) => a.localeCompare(b, "te-IN"));
    }, [allRows]);

    // Count only rows for selected date
    const itemsLoadedForDate = useMemo(
        () => allRows.filter((r) => r.date === dateStr).length,
        [allRows, dateStr]
    );

    // ===== Totals (must be inside component; use hooks correctly) =====
    const dayList = useMemo(
        () =>
            Array.from({ length: daysInMonth }, (_, i) =>
                ymd(new Date(year, month, i + 1))
            ),
        [year, month, daysInMonth]
    );

    const rowAt = (veg, date) => {
        const keyNorm = `${date}::${norm(veg)}`;
        return byDateVeg[keyNorm] || null;
    };

    const categoryTotalsByDate = useMemo(() => {
        const out = {};
        for (const [catLabel, vegList] of Object.entries(categoryMap)) {
            out[catLabel] = dayList.map((d) =>
                vegList.reduce((sum, veg) => {
                    const r = rowAt(veg, d);
                    if (!r) return sum;
                    const qty = safeNum(r.quantity);
                    const price = safeNum(r.price);
                    const tot = r?.total != null ? safeNum(r.total) : qty * price;
                    return sum + tot;
                }, 0)
            );
        }
        return out;
    }, [dayList, byDateVeg]);

    const grandTotalsByDate = useMemo(
        () =>
            dayList.map((d) =>
                allRows
                    .filter((r) => r.date === d)
                    .reduce((sum, r) => {
                        const qty = safeNum(r.quantity);
                        const price = safeNum(r.price);
                        const tot = r?.total != null ? safeNum(r.total) : qty * price;
                        return sum + tot;
                    }, 0)
            ),
        [dayList, allRows]
    );

    /* ------------ Write (upsert) with correct branch ------------ */
    const upsert = async (veg, patch, date = dateStr, mainCategoryGuess = "") => {
        // update existing
        const existing = getRow(veg, date);
        if (existing?.id && existing?._branch) {
            const ref = firebaseDB.child(`Shop/${existing._branch}/${existing.id}`);
            const quantity =
                "quantity" in patch ? safeNum(patch.quantity) : safeNum(existing?.quantity);
            const price =
                "price" in patch ? safeNum(patch.price) : safeNum(existing?.price);
            const sellingRate =
                "sellingRate" in patch ? safeNum(patch.sellingRate) : safeNum(existing?.sellingRate);

            const payload = {
                ...existing,
                quantity,
                price,
                sellingRate,
                total: quantity * price,
                updatedAt: new Date().toISOString(),
                updatedById: authUser?.uid || authUser?.dbId || "",
                updatedByName: getUserName(authUser),
            };

            await ref.set(payload);
            setAllRows((prev) => prev.map((r) => (r.id === existing.id ? payload : r)));
            return;
        }

        // create new
        const listRef = firebaseDB.child(DB_WRITE_PATH);
        const id = listRef.push().key;

        let mainCategory = mainCategoryGuess || "";
        if (!mainCategory) {
            const anyDate = allRows.find(
                (r) => norm(r.subCategory) === norm(veg) && r.mainCategory
            );
            mainCategory = anyDate?.mainCategory || "";
        }

        const quantity = "quantity" in patch ? safeNum(patch.quantity) : 0;
        const price = "price" in patch ? safeNum(patch.price) : 0;
        const sellingRate = "sellingRate" in patch ? safeNum(patch.sellingRate) : 0;

        const payload = {
            id,
            date,
            mainCategory,
            subCategory: veg,
            quantity,
            price,
            sellingRate,
            total: quantity * price,
            createdAt: new Date().toISOString(),
            createdById: authUser?.uid || authUser?.dbId || "",
            createdByName: getUserName(authUser),
            updatedAt: new Date().toISOString(),
            updatedById: authUser?.uid || authUser?.dbId || "",
            updatedByName: getUserName(authUser),
        };

        await listRef.child(id).set(payload);

        setAllRows((prev) => {
            const next = prev.slice();
            next.push({ ...payload, _branch: deriveBranchKey(authUser) });
            return next;
        });
    };

    /* ------------ Selling-Rate editor helpers (ID-based) ------------ */
    const beginEditSelling = (row) => {
        if (!isAdminUser) return; // Only admins can edit selling rate
        setEditingKey(row.id);
        setSellDraft(row?.sellingRate ?? "");
    };
    const cancelEditSelling = () => {
        setEditingKey(null);
        setSellDraft("");
    };
    const saveEditSelling = async () => {
        if (!isAdminUser) return; // Additional security check
        const row = byId[editingKey];
        if (!row) return cancelEditSelling();

        const branch = row._branch || (DB_PATH.startsWith("Shop/") ? DB_PATH.split("/")[1] : "");
        const ref = firebaseDB.child(`Shop/${branch}/${row.id}`);

        const patch = {
            sellingRate: safeNum(sellDraft),
            updatedAt: new Date().toISOString(),
            updatedById: authUser?.uid || authUser?.dbId || "",
            updatedByName: getUserName(authUser),
        };

        await ref.update(patch);

        setAllRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, ...patch } : r)));
        cancelEditSelling();
    };

    /* ------------ Years for dropdown ------------ */
    const yearsAround = useMemo(() => {
        const cur = new Date().getFullYear();
        return Array.from({ length: 7 }, (_, i) => cur - 3 + i);
    }, []);

    return (
        <div className="p-3 bg-dark border border-secondary rounded-3 mt-3">
            {/* Controls + Info */}
            <div
                className="vegitableHeader"
                style={{
                    background: "linear-gradient(135deg, #1e1b4b 0%, #3730a3 50%, #1e1b4b 100%)",
                    backgroundSize: "200% 200%",
                    animation: "gradientShift 3s ease infinite",
                    boxShadow: "0 8px 32px rgba(30, 27, 75, 0.5)",
                    border: "1px solid rgba(99, 102, 241, 0.3)",
                    backdropFilter: "blur(10px)"
                }}
            >
                <div className="d-flex flex-column flex-md-row align-items-stretch align-items-md-center justify-content-between gap-3">
                    {/* Date Controls */}
                    <div className="d-flex flex-column flex-sm-row gap-3 align-items-stretch w-100">
                        {/* Month & Year Row for Mobile */}
                        <div className="d-flex flex-row gap-2 w-100">
                            {/* Month Select */}
                            <div className="position-relative flex-fill">
                                <i className="fas fa-calendar-alt position-absolute top-50 start-0 translate-middle-y ms-3 text-white opacity-75"></i>
                                <select
                                    className="form-select form-select-lg border-0 ps-5 py-2 w-100"
                                    value={month}
                                    onChange={(e) => setMonth(parseInt(e.target.value, 10))}
                                    style={{
                                        background: "linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.8) 100%)",
                                        color: "white",
                                        borderRadius: "10px",
                                        backdropFilter: "blur(10px)",
                                        border: "1px solid rgba(99, 102, 241, 0.4)",
                                        fontSize: "0.9rem",
                                        fontWeight: "500",
                                        minHeight: "48px"
                                    }}
                                >
                                    {["జనవరి", "ఫిబ్రవరి", "మార్చి", "ఏప్రిల్", "మే", "జూన్", "జూలై", "ఆగస్టు", "సెప్టెంబర్", "అక్టోబర్", "నవంబర్", "డిసెంబర్"].map((m, i) => (
                                        <option key={m} value={i} style={{ background: "#0f172a", color: "white" }}>{m}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Year Select */}
                            <div className="position-relative flex-fill">
                                <i className="fas fa-calendar position-absolute top-50 start-0 translate-middle-y ms-3 text-white opacity-75"></i>
                                <select
                                    className="form-select form-select-lg border-0 ps-5 py-2 w-100"
                                    value={year}
                                    onChange={(e) => setYear(parseInt(e.target.value, 10))}
                                    style={{
                                        background: "linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.8) 100%)",
                                        color: "white",
                                        borderRadius: "10px",
                                        backdropFilter: "blur(10px)",
                                        border: "1px solid rgba(99, 102, 241, 0.4)",
                                        fontSize: "0.9rem",
                                        fontWeight: "500",
                                        minHeight: "48px"
                                    }}
                                >
                                    {yearsAround.map((y) => (
                                        <option key={y} value={y} style={{ background: "#0f172a", color: "white" }}>{y}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Date Select - Full Width on Mobile */}
                        <div className="position-relative w-100">
                            <i className="fas fa-clock position-absolute top-50 start-0 translate-middle-y ms-3 text-white opacity-75"></i>
                            <select
                                className="form-select form-select-lg border-0 ps-5 py-2 w-100"
                                value={dateStr}
                                onChange={(e) => setDateStr(e.target.value)}
                                style={{
                                    background: "linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.8) 100%)",
                                    color: "white",
                                    borderRadius: "10px",
                                    backdropFilter: "blur(10px)",
                                    border: "1px solid rgba(99, 102, 241, 0.4)",
                                    fontSize: "0.9rem",
                                    fontWeight: "500",
                                    minHeight: "48px"
                                }}
                            >
                                {Array.from({ length: daysInMonth }, (_, i) => ymd(new Date(year, month, i + 1))).map((d) => (
                                    <option key={d} value={d} style={{ background: "#0f172a", color: "white" }}>{d}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Stats Cards */}
                    <div className="d-flex flex-column flex-sm-row gap-3 align-items-stretch w-100 w-md-auto">
                        {/* Total Items Card */}
                        <div
                            className="text-center p-3 rounded-3 position-relative overflow-hidden flex-fill"
                            style={{
                                background: "linear-gradient(135deg, rgba(6, 182, 212, 0.25) 0%, rgba(8, 145, 178, 0.25) 100%)",
                                border: "1px solid rgba(6, 182, 212, 0.4)",
                                backdropFilter: "blur(10px)",
                                minHeight: "90px"
                            }}
                        >
                            <div className="position-absolute top-0 start-0 w-100 h-100 opacity-10"
                                style={{
                                    background: "radial-gradient(circle at 30% 20%, rgba(6, 182, 212, 0.5) 0%, transparent 50%)"
                                }}>
                            </div>
                            <div className="position-relative z-1 h-100 d-flex flex-column justify-content-center">
                                <div className="text-cyan-300 fw-bold mb-1" style={{ fontSize: "0.75rem", color: '#67e8f9' }}>
                                    <i className="fas fa-shopping-basket me-2"></i>
                                    మొత్తం కొన్న వస్తువులు
                                </div>
                                <div
                                    className="fw-bold text-white rounded-pill px-3 py-2 mx-auto"
                                    style={{
                                        background: "linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)",
                                        fontSize: "1rem",
                                        boxShadow: "0 4px 15px rgba(6, 182, 212, 0.4)",
                                        border: "1px solid rgba(255,255,255,0.3)",
                                        width: "fit-content",
                                        minWidth: "60px"
                                    }}
                                >
                                    {itemsLoadedForDate}
                                </div>
                            </div>
                        </div>

                        {/* Total Amount Card */}
                        <div
                            className="text-center p-3 rounded-3 position-relative overflow-hidden flex-fill"
                            style={{
                                background: "linear-gradient(135deg, rgba(245, 158, 11, 0.25) 0%, rgba(217, 119, 6, 0.25) 100%)",
                                border: "1px solid rgba(245, 158, 11, 0.4)",
                                backdropFilter: "blur(10px)",
                                minHeight: "90px"
                            }}
                        >
                            <div className="position-absolute top-0 start-0 w-100 h-100 opacity-10"
                                style={{
                                    background: "radial-gradient(circle at 70% 20%, rgba(245, 158, 11, 0.5) 0%, transparent 50%)"
                                }}>
                            </div>
                            <div className="position-relative z-1 h-100 d-flex flex-column justify-content-center">
                                <div className="text-amber-300 fw-bold mb-1" style={{ fontSize: "0.75rem", color: '#fcd34d' }}>
                                    <i className="fas fa-indian-rupee-sign me-2"></i>
                                    మొత్తం కొన్న వెల
                                </div>
                                <div
                                    className="fw-bold text-white rounded-pill px-3 py-2 mx-auto"
                                    style={{
                                        background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                                        fontSize: "1rem",
                                        boxShadow: "0 4px 15px rgba(245, 158, 11, 0.4)",
                                        border: "1px solid rgba(255,255,255,0.3)",
                                        width: "fit-content",
                                        minWidth: "80px"
                                    }}
                                >
                                    {fmtINR(grandTotalForDate)}
                                </div>
                            </div>
                        </div>

                        {/* Admin Badge */}
                        {isAdminUser && (
                            <div
                                className="text-center p-3 rounded-3 position-relative overflow-hidden flex-fill"
                                style={{
                                    background: "linear-gradient(135deg, rgba(236, 72, 153, 0.25) 0%, rgba(219, 39, 119, 0.25) 100%)",
                                    border: "1px solid rgba(236, 72, 153, 0.4)",
                                    backdropFilter: "blur(10px)",
                                    minHeight: "90px"
                                }}
                            >
                                <div className="position-absolute top-0 start-0 w-100 h-100 opacity-10"
                                    style={{
                                        background: "radial-gradient(circle at 50% 20%, rgba(236, 72, 153, 0.5) 0%, transparent 50%)"
                                    }}>
                                </div>
                                <div className="position-relative z-1 h-100 d-flex flex-column justify-content-center">
                                    <div className="text-pink-300 fw-bold mb-1" style={{ fontSize: "0.75rem", color: '#f9a8d4' }}>
                                        <i className="fas fa-user-shield me-2"></i>
                                        అడ్మిన్ బోర్డు
                                    </div>
                                    <div
                                        className="fw-bold text-white rounded-pill px-3 py-1 mx-auto"
                                        style={{
                                            background: "linear-gradient(135deg, #ec4899 0%, #db2777 100%)",
                                            fontSize: "0.85rem",
                                            boxShadow: "0 4px 15px rgba(236, 72, 153, 0.4)",
                                            border: "1px solid rgba(255,255,255,0.3)",
                                            width: "fit-content",
                                            minWidth: "70px"
                                        }}
                                    >
                                        Active
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>





            {/* ===================== DAILY PURCHASE ===================== */}
            <h5 className="mb-3 text-warning">
                <i className="fas fa-shopping-basket me-2"></i>
                Daily Purchases — {dateStr}
            </h5>

            {loading ? (
                <div className="text-center py-4">
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="mt-2 text-muted">Loading purchase data...</p>
                </div>
            ) : dailyGroups.length === 0 ? (
                <div className="text-center py-5">
                    <div className="text-muted mb-3">
                        <i className="fas fa-shopping-cart fa-3x"></i>
                    </div>
                    <h5 className="text-muted">No purchases for {dateStr}</h5>
                    <p className="text-muted">Add purchases by entering data below</p>
                </div>
            ) : (
                <div className="mb-4">
                    {/* Desktop Header - Enhanced with beautiful gradient */}
                    <div
                        className="row g-0 mb-2 rounded-top d-none d-md-flex"
                        style={{
                            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                            borderBottom: "2px solid #5a6fd8",
                            boxShadow: "0 4px 15px rgba(102, 126, 234, 0.3)",
                        }}
                    >
                        <div className="col-md-1 p-3 border-end border-light border-opacity-25 text-center">
                            <small className="text-white fw-bold" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>S.No</small>
                        </div>
                        <div className="col-md-2 p-3 border-end border-light border-opacity-25">
                            <small className="text-white fw-bold" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                                <i className="fas fa-carrot text-warning me-2"></i>VEGETABLE
                            </small>
                        </div>
                        <div className="col-md-1 p-3 border-end border-light border-opacity-25 text-center">
                            <small className="text-white fw-bold" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                                <i className="fas fa-weight-hanging text-info me-2"></i>QTY
                            </small>
                        </div>
                        <div className="col-md-1 p-3 border-end border-light border-opacity-25 text-center">
                            <small className="text-white fw-bold" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                                <i className="fas fa-tag text-light me-2"></i>PRICE
                            </small>
                        </div>
                        <div className="col-md-2 p-3 border-end border-light border-opacity-25 text-center">
                            <small className="text-white fw-bold" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                                <i className="fas fa-calculator text-success me-2"></i>TOTAL
                            </small>
                        </div>
                        <div className="col-md-2 p-3 border-end border-light border-opacity-25 text-center">
                            <small className="text-white fw-bold" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                                <i className="fas fa-user text-light me-2"></i>PURCHASED BY
                            </small>
                        </div>
                        <div className="col-md-2 p-3 border-end border-light border-opacity-25 text-center">
                            <small className="text-white fw-bold" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                                <i className="fas fa-chart-line text-warning me-2"></i>SELLING RATE
                            </small>
                        </div>
                        {isAdminUser && (
                            <div className="col-md-1 p-3 text-center">
                                <small className="text-white fw-bold" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                                    <i className="fas fa-ellipsis-h text-light me-2"></i>ACTIONS
                                </small>
                            </div>
                        )}
                    </div>

                    {/* Rows */}
                    {dailyGroups.map((grp) => {
                        const catTotal = grp.items.reduce((sum, item) => {
                            const t = item?.total != null ? safeNum(item.total) : safeNum(item.quantity) * safeNum(item.price);
                            return sum + t;
                        }, 0);

                        return (
                            <div key={grp.title}>
                                {/* Category header - Enhanced */}
                                <div className="row g-0 mb-1 mt-4">
                                    <div className="col-12">
                                        <div
                                            className="d-flex align-items-center justify-content-between ps-3 py-2 rounded"
                                            style={{
                                                background: "linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%)",
                                                borderLeft: "4px solid #667eea",
                                                borderBottom: "1px solid rgba(102, 126, 234, 0.3)"
                                            }}
                                        >
                                            <div className="d-flex align-items-center">
                                                <i className="fas fa-tag text-primary me-2"></i>
                                                <h5 className="text-white mb-0 fw-bold" style={{ fontSize: '0.95rem' }}>{grp.title}</h5>
                                            </div>
                                            <div className="d-none d-md-block pe-3">
                                                <span
                                                    className="badge fw-bold px-3 py-2"
                                                    style={{
                                                        background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                                                        border: "1px solid rgba(16, 185, 129, 0.5)",
                                                        fontSize: "0.8rem"
                                                    }}
                                                >
                                                    Category Total: {fmtINR(catTotal)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {grp.items.map((item, index) => {
                                    const totalNow = item.total != null ? safeNum(item.total) : safeNum(item.quantity) * safeNum(item.price);
                                    const isEditing = editingKey === item.id;
                                    const isEven = index % 2 === 0;

                                    return (
                                        <React.Fragment key={item.id}>
                                            {/* Desktop View - Enhanced colors */}
                                            <div
                                                className={`row g-0 align-items-center py-2 d-none d-md-flex ${isEven ? "" : ""}`}
                                                style={{
                                                    borderBottom: "1px solid rgba(255,255,255,0.1)",
                                                    background: isEven
                                                        ? "linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.7) 100%)"
                                                        : "linear-gradient(135deg, rgba(51, 65, 85, 0.7) 0%, rgba(30, 41, 59, 0.7) 100%)",
                                                    transition: "all 0.3s ease",
                                                    margin: "1px 0",
                                                    borderRadius: "4px",
                                                }}
                                            >
                                                {/* S.No */}
                                                <div className="col-md-1 text-center">
                                                    <span
                                                        className="fw-bold"
                                                        style={{
                                                            color: '#cbd5e1',
                                                            fontSize: "0.85rem",
                                                            background: "rgba(99, 102, 241, 0.1)",
                                                            padding: '4px 8px',
                                                            borderRadius: '12px',
                                                            border: '1px solid rgba(99, 102, 241, 0.3)'
                                                        }}
                                                    >
                                                        {index + 1}
                                                    </span>
                                                </div>

                                                {/* Vegetable */}
                                                <div className="col-md-2 ps-3">
                                                    <div className="d-flex align-items-center">
                                                        <i className="fas fa-carrot text-warning me-2"></i>
                                                        <strong
                                                            className="d-block fw-bold"
                                                            style={{
                                                                fontSize: "0.85rem",
                                                                color: '#f8fafc',
                                                                textShadow: '0 1px 2px rgba(0,0,0,0.2)'
                                                            }}
                                                        >
                                                            {item.subCategory}
                                                        </strong>
                                                    </div>
                                                </div>

                                                {/* Quantity */}
                                                <div className="col-md-1 text-center">
                                                    <span
                                                        className="fw-semibold px-2 py-1 rounded"
                                                        style={{
                                                            fontSize: "0.85rem",
                                                            background: "linear-gradient(135deg, rgba(6, 182, 212, 0.2) 0%, rgba(8, 145, 178, 0.2) 100%)",
                                                            border: "1px solid rgba(6, 182, 212, 0.4)",
                                                            color: '#7dd3fc'
                                                        }}
                                                    >
                                                        {item.quantity || 0}
                                                    </span>
                                                </div>

                                                {/* Price */}
                                                <div className="col-md-1 text-center">
                                                    <span
                                                        className="fw-semibold px-2 py-1 rounded"
                                                        style={{
                                                            fontSize: "0.85rem",
                                                            background: "linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(124, 58, 237, 0.2) 100%)",
                                                            border: "1px solid rgba(139, 92, 246, 0.4)",
                                                            color: '#c4b5fd'
                                                        }}
                                                    >
                                                        {fmtINR(item.price)}
                                                    </span>
                                                </div>

                                                {/* Total */}
                                                <div className="col-md-2 text-center">
                                                    <span
                                                        className="badge fw-bold px-3 py-2"
                                                        style={{
                                                            fontSize: "0.85rem",
                                                            background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                                                            border: "1px solid rgba(245, 158, 11, 0.5)",
                                                            color: '#ffffff',
                                                            textShadow: '0 1px 2px rgba(0,0,0,0.2)'
                                                        }}
                                                    >
                                                        {fmtINR(totalNow)}
                                                    </span>
                                                </div>

                                                {/* Purchased By */}
                                                <div className="col-md-2 text-center">
                                                    <span
                                                        className="fw-semibold px-2 py-1 rounded"
                                                        style={{
                                                            fontSize: "0.8rem",
                                                            background: "linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(5, 150, 105, 0.2) 100%)",
                                                            border: "1px solid rgba(16, 185, 129, 0.4)",
                                                            color: '#86efac',
                                                            maxWidth: "140px",
                                                            overflow: "hidden",
                                                            textOverflow: "ellipsis",
                                                            whiteSpace: "nowrap",
                                                        }}
                                                        title={item.createdByName || item.updatedByName || "Unknown"}
                                                    >
                                                        <i className="fas fa-user me-1"></i>
                                                        {item.createdByName || item.updatedByName || "Unknown"}
                                                    </span>
                                                </div>

                                                {/* Selling rate */}
                                                <div className="col-md-2 text-center">
                                                    <div className="d-flex align-items-center justify-content-center">
                                                        {isEditing ? (
                                                            <div className="d-flex gap-2 align-items-center">
                                                                <div className="input-group input-group-sm" style={{ maxWidth: "150px" }}>
                                                                    <span
                                                                        className="input-group-text border-0"
                                                                        style={{
                                                                            background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                                                                            color: 'white',
                                                                            border: 'none'
                                                                        }}
                                                                    >
                                                                        ₹
                                                                    </span>
                                                                    <input
                                                                        type="number"
                                                                        className="form-control form-control-sm text-center border-0"
                                                                        style={{
                                                                            background: 'rgba(255,255,255,0.9)',
                                                                            color: '#1f2937',
                                                                            minWidth: "80px"
                                                                        }}
                                                                        value={sellDraft}
                                                                        onChange={(e) => setSellDraft(e.target.value)}
                                                                        autoFocus
                                                                    />
                                                                </div>
                                                                <button
                                                                    className="btn btn-sm px-2 d-flex align-items-center gap-1"
                                                                    onClick={() => saveEditSelling(item)}
                                                                    title="Save"
                                                                    style={{
                                                                        minWidth: "60px",
                                                                        background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                                                                        border: 'none',
                                                                        color: 'white'
                                                                    }}
                                                                >
                                                                    <i className="fas fa-check small"></i> Save
                                                                </button>
                                                                <button
                                                                    className="btn btn-sm px-2 d-flex align-items-center gap-1"
                                                                    onClick={cancelEditSelling}
                                                                    title="Cancel"
                                                                    style={{
                                                                        minWidth: "60px",
                                                                        background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                                                                        border: 'none',
                                                                        color: 'white'
                                                                    }}
                                                                >
                                                                    <i className="fas fa-times small"></i> Cancel
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div className="d-flex align-items-center gap-2">
                                                                <span
                                                                    role="button"
                                                                    className={`badge fw-bold px-3 py-2 ${isAdminUser ? "cursor-pointer" : "cursor-default"}`}
                                                                    onClick={isAdminUser ? () => beginEditSelling(item) : undefined}
                                                                    title={isAdminUser ? "Click to edit selling rate" : "Admin access required"}
                                                                    style={{
                                                                        background: isAdminUser
                                                                            ? "linear-gradient(135deg, #ec4899 0%, #db2777 100%)"
                                                                            : "linear-gradient(135deg, #6b7280 0%, #4b5563 100%)",
                                                                        border: isAdminUser
                                                                            ? "1px solid rgba(236, 72, 153, 0.5)"
                                                                            : "1px solid rgba(107, 114, 128, 0.5)",
                                                                        fontSize: "0.85rem",
                                                                        transition: "all 0.3s ease",
                                                                        cursor: isAdminUser ? "pointer" : "default",
                                                                        opacity: isAdminUser ? 1 : 0.7,
                                                                        color: '#ffffff',
                                                                        textShadow: '0 1px 2px rgba(0,0,0,0.2)'
                                                                    }}
                                                                >
                                                                    <i className="fas fa-rupee-sign me-1"></i>
                                                                    {item?.sellingRate || "0"}
                                                                </span>
                                                                {isAdminUser && (
                                                                    <small
                                                                        className="text-muted d-none d-md-block"
                                                                        style={{ color: '#9ca3af' }}
                                                                    >
                                                                        Click to edit
                                                                    </small>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Actions - Only show for admin users */}
                                                {isAdminUser && (
                                                    <div className="col-md-1 text-center">
                                                        <button
                                                            className="btn btn-sm px-3"
                                                            title="Delete this entry"
                                                            onClick={() => openDelete(item)}
                                                            style={{
                                                                background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                                                                border: 'none',
                                                                color: 'white',
                                                                transition: 'all 0.3s ease'
                                                            }}
                                                            onMouseOver={(e) => {
                                                                e.target.style.transform = 'scale(1.05)';
                                                                e.target.style.background = "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)";
                                                            }}
                                                            onMouseOut={(e) => {
                                                                e.target.style.transform = 'scale(1)';
                                                                e.target.style.background = "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)";
                                                            }}
                                                        >
                                                            <i className="fas fa-trash"></i>
                                                            <span className="d-none d-lg-inline ms-1">Delete</span>
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Mobile View - Enhanced */}
                                            <div
                                                className="card mb-3 d-md-none border-0"
                                                style={{
                                                    background: "linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.8) 100%)",
                                                    boxShadow: "0 4px 15px rgba(0,0,0,0.2)"
                                                }}
                                            >
                                                <div className="card-body">
                                                    {/* Header Row */}
                                                    <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom border-opacity-25" style={{ borderColor: '#475569' }}>
                                                        <div className="d-flex align-items-center">
                                                            <span
                                                                className="badge me-2"
                                                                style={{
                                                                    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                                                                    color: 'white'
                                                                }}
                                                            >
                                                                {index + 1}
                                                            </span>
                                                            <i className="fas fa-carrot text-warning me-2"></i>
                                                            <strong className="text-white">{item.subCategory}</strong>
                                                        </div>
                                                        {isAdminUser && (
                                                            <button
                                                                className="btn btn-sm"
                                                                title="Delete this entry"
                                                                onClick={() => openDelete(item)}
                                                                style={{
                                                                    background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                                                                    border: 'none',
                                                                    color: 'white'
                                                                }}
                                                            >
                                                                <i className="fas fa-trash"></i>
                                                                Delete
                                                            </button>
                                                        )}
                                                    </div>

                                                    {/* Data Rows with Telugu Labels - Enhanced */}
                                                    <div className="row g-2">
                                                        {/* Quantity */}
                                                        <div className="col-6">
                                                            <div className="d-flex flex-column justify-content-center text-center align-items-center p-2 rounded h-100"
                                                                style={{
                                                                    background: "linear-gradient(135deg, rgba(6, 182, 212, 0.15) 0%, rgba(8, 145, 178, 0.15) 100%)",
                                                                    border: "1px solid rgba(6, 182, 212, 0.3)"
                                                                }}>
                                                                <div className="text-cyan-300 fw-bold w-100" style={{ color: '#67e8f9', fontSize: '0.8rem' }}>పరిమాణం:</div>
                                                                <span className="text-white fw-bold w-100" style={{ fontSize: '0.9rem' }}>{item.quantity || 0} kg</span>
                                                            </div>
                                                        </div>

                                                        {/* Price */}
                                                        <div className="col-6">
                                                            <div className="d-flex flex-column justify-content-center text-center align-items-center p-2 rounded h-100"
                                                                style={{
                                                                    background: "linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(124, 58, 237, 0.15) 100%)",
                                                                    border: "1px solid rgba(139, 92, 246, 0.3)"
                                                                }}>
                                                                <div className="text-purple-300 fw-bold w-100" style={{ color: '#d8b4fe', fontSize: '0.8rem' }}>ధర:</div>
                                                                <span className="text-white fw-bold w-100" style={{ fontSize: '0.9rem' }}>{fmtINR(item.price)}</span>
                                                            </div>
                                                        </div>

                                                        {/* Total */}
                                                        <div className="col-6">
                                                            <div className="d-flex flex-column justify-content-center text-center align-items-center p-2 rounded h-100"
                                                                style={{
                                                                    background: "linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(217, 119, 6, 0.15) 100%)",
                                                                    border: "1px solid rgba(245, 158, 11, 0.3)"
                                                                }}>
                                                                <div className="text-amber-300 fw-bold w-100" style={{ color: '#fcd34d', fontSize: '0.8rem' }}>మొత్తం:</div>
                                                                <span className="text-white fw-bold w-100" style={{ fontSize: '0.9rem' }}>{fmtINR(totalNow)}</span>
                                                            </div>
                                                        </div>

                                                        {/* Purchased By */}
                                                        <div className="col-6">
                                                            <div className="d-flex flex-column justify-content-center text-center align-items-center p-2 rounded h-100"
                                                                style={{
                                                                    background: "linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.15) 100%)",
                                                                    border: "1px solid rgba(16, 185, 129, 0.3)"
                                                                }}>
                                                                <div className="text-emerald-300 fw-bold w-100" style={{ color: '#6ee7b7', fontSize: '0.8rem' }}>కొన్నవారు:</div>
                                                                <span className="text-white fw-bold w-100" style={{ fontSize: '0.8rem' }}>
                                                                    {item.createdByName || item.updatedByName || "Unknown"}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Selling Rate */}
                                                        <div className="col-12">
                                                            <div className="d-flex justify-content-between flex-wrap gap-2 align-items-center p-2 rounded"
                                                                style={{
                                                                    background: "linear-gradient(135deg, rgba(236, 72, 153, 0.15) 0%, rgba(219, 39, 119, 0.15) 100%)",
                                                                    border: "1px solid rgba(236, 72, 153, 0.3)"
                                                                }}>
                                                                <small className="text-pink-300 fw-bold" style={{ color: '#f9a8d4' }}>అమ్మకం ధర:</small>
                                                                <div className="d-flex align-items-center gap-2">
                                                                    {isEditing ? (
                                                                        // Same beautiful edit controls as desktop
                                                                        <div className="d-flex gap-2 align-items-center">
                                                                            <div className="input-group input-group-sm" style={{ maxWidth: "150px" }}>
                                                                                <span
                                                                                    className="input-group-text border-0"
                                                                                    style={{
                                                                                        background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                                                                                        color: 'white',
                                                                                        border: 'none'
                                                                                    }}
                                                                                >
                                                                                    ₹
                                                                                </span>
                                                                                <input
                                                                                    type="number"
                                                                                    className="form-control form-control-sm text-center border-0"
                                                                                    style={{
                                                                                        background: 'rgba(255,255,255,0.9)',
                                                                                        color: '#1f2937',
                                                                                        minWidth: "80px"
                                                                                    }}
                                                                                    value={sellDraft}
                                                                                    onChange={(e) => setSellDraft(e.target.value)}
                                                                                    autoFocus
                                                                                />
                                                                            </div>
                                                                            <button
                                                                                className="btn btn-sm px-2"
                                                                                onClick={() => saveEditSelling(item)}
                                                                                title="Save"
                                                                                style={{
                                                                                    background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                                                                                    border: 'none',
                                                                                    color: 'white'
                                                                                }}
                                                                            >
                                                                                Save
                                                                                <i className="fas fa-check"></i>
                                                                            </button>
                                                                            <button
                                                                                className="btn btn-sm px-2"
                                                                                onClick={cancelEditSelling}
                                                                                title="Cancel"
                                                                                style={{
                                                                                    background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                                                                                    border: 'none',
                                                                                    color: 'white'
                                                                                }}
                                                                            >
                                                                                Canecl
                                                                                <i className="fas fa-times"></i>
                                                                            </button>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="d-flex align-items-center gap-2">
                                                                            <span
                                                                                role="button"
                                                                                className={`badge fw-bold px-3 py-2 ${isAdminUser ? "cursor-pointer" : "cursor-default"}`}
                                                                                onClick={isAdminUser ? () => beginEditSelling(item) : undefined}
                                                                                title={isAdminUser ? "Click to edit selling rate" : "Admin access required"}
                                                                                style={{
                                                                                    background: isAdminUser
                                                                                        ? "linear-gradient(135deg, #ec4899 0%, #db2777 100%)"
                                                                                        : "linear-gradient(135deg, #6b7280 0%, #4b5563 100%)",
                                                                                    border: isAdminUser
                                                                                        ? "1px solid rgba(236, 72, 153, 0.5)"
                                                                                        : "1px solid rgba(107, 114, 128, 0.5)",
                                                                                    fontSize: "0.85rem",
                                                                                    color: '#ffffff'
                                                                                }}
                                                                            >
                                                                                <i className="fas fa-rupee-sign me-1"></i>
                                                                                {item?.sellingRate || "0"}
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </React.Fragment>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.7)" }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content bg-dark border border-danger">
                            <div className="modal-header border-danger">
                                <h5 className="modal-title text-danger">
                                    <i className="fas fa-exclamation-triangle me-2"></i>
                                    Confirm Delete
                                </h5>
                                <button type="button" className="btn-close btn-close-white" onClick={cancelDelete}></button>
                            </div>
                            <div className="modal-body">
                                <div className="alert alert-danger">
                                    <i className="fas fa-exclamation-circle me-2"></i>
                                    Are you sure you want to delete this purchase entry?
                                </div>
                                {deleteRow && (
                                    <div className="bg-gray-800 p-3 rounded">
                                        <div className="text-light">
                                            <strong>Vegetable:</strong> {deleteRow.subCategory}
                                        </div>
                                        <div className="text-light">
                                            <strong>Date:</strong> {deleteRow.date}
                                        </div>
                                        <div className="text-light">
                                            <strong>Quantity:</strong> {deleteRow.quantity}
                                        </div>
                                        <div className="text-light">
                                            <strong>Price:</strong> {fmtINR(deleteRow.price)}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer border-danger">
                                <button type="button" className="btn btn-secondary" onClick={cancelDelete}>
                                    <i className="fas fa-times me-2"></i>Cancel
                                </button>
                                <button type="button" className="btn btn-danger" onClick={confirmDelete}>
                                    <i className="fas fa-trash me-2"></i>Delete Entry
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}


            {/* ===================== MONTHLY PRICE TRACKER ===================== */}
            <h5 className="mt-5 mb-3 text-info">
                <i className="fas fa-calendar-alt me-2"></i>
                Monthly Price Tracker —{" "}
                {new Date(year, month).toLocaleString("default", { month: "long", year: "numeric" })}
            </h5>

            <div className="table-responsive">
                <table className="table table-dark table-bordered align-middle">
                    <thead>
                        <tr>
                            <th style={{ minWidth: 140, textAlign: "center" }}>Vegetable</th>
                            {dayList.map((fullDate, i) => {
                                const isToday = fullDate === ymd(new Date());
                                const d = new Date(fullDate);
                                return (
                                    <th key={i} className="text-center" style={{ background: isToday ? "rgba(149,150,150,0.15)" : "" }}>
                                        <div>
                                            <div>{d.getDate()}</div>
                                            <small className="text-muted" style={{ fontSize: "0.7rem" }}>
                                                {d.toLocaleDateString("en", { weekday: "short" })}
                                            </small>
                                        </div>
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>

                    <tbody>
                        {Object.entries(categoryMap).map(([catLabel, vegList]) => (
                            <React.Fragment key={catLabel}>
                                {/* Category header row */}
                                <tr>
                                    <td colSpan={1 + daysInMonth} className="bg-secondary bg-opacity-25">
                                        <strong className="text-info">
                                            <i className="fas fa-tag me-2"></i>
                                            {catLabel}
                                        </strong>
                                    </td>
                                </tr>

                                {/* Vegetables under this category */}
                                {vegList.map((veg) => (
                                    <tr key={veg}>
                                        <th className="fw-semibold text-warning text-center">
                                            <div className="d-flex align-items-center justify-content-center gap-2">
                                                <i className="fas fa-carrot text-warning small"></i>
                                                {veg}
                                            </div>
                                        </th>

                                        {dayList.map((fullDate, i) => {
                                            const isToday = fullDate === ymd(new Date());
                                            const r = getRow(veg, fullDate);
                                            const price = safeNum(r?.price);

                                            return (
                                                <td
                                                    key={`${veg}-${i}`}
                                                    className={`text-center ${isToday ? "fw-bold text-warning" : ""}`}
                                                    style={{ background: isToday ? "rgba(13, 202, 240, 0.1)" : "rgba(27, 33, 46, 0.6)" }}
                                                    title={price ? `₹${price}` : ""}
                                                >
                                                    {price ? (
                                                        <span className={`${isToday ? "text-warning fw-bold" : "text-light"} small`}>
                                                            <i className="fas fa-rupee-sign me-1"></i>
                                                            {price}
                                                        </span>
                                                    ) : (
                                                        <span className="small-text opacity-75">*</span>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}


                            </React.Fragment>
                        ))}

                        {/* Grand Total row (₹ per day across all categories) */}
                    </tbody>
                </table>

                {/* ===================== DELETE CONFIRM MODAL ===================== */}
                {showDeleteModal && (
                    <div className="modal fade show d-block" tabIndex="-1" style={{ background: "rgba(0,0,0,0.9)" }}>
                        <div className="modal-dialog modal-sm modal-dialog-centered">
                            <div className="modal-content border-0 rounded-4 shadow">
                                <div className="modal-header bg-danger text-white">
                                    <h6 className="modal-title d-flex align-items-center gap-2">
                                        <i className="fas fa-trash"></i> Confirm Delete
                                    </h6>
                                    <button type="button" className="btn-close btn-close-white" onClick={cancelDelete}></button>
                                </div>

                                <div className="modal-body bg-dark text-light">
                                    <p className="mb-0">
                                        <strong>{deleteRow?.subCategory}</strong> – {deleteRow?.date}
                                    </p>
                                    <small className="text-warning">
                                        Qty: {deleteRow?.quantity} • Price: {fmtINR(deleteRow?.price)} • Total:{" "}
                                        {fmtINR(deleteRow?.total ?? (safeNum(deleteRow?.quantity) * safeNum(deleteRow?.price)))}
                                    </small>
                                    <div className="alert alert-secondary text-dark mt-3 mb-0">
                                        ఇది డిలీట్ చెయ్యాలి అనుకుటున్నరా ?
                                    </div>
                                </div>

                                <div className="modal-footer bg-dark border-0">
                                    <button className="btn btn-outline-light" onClick={cancelDelete}>కాదు</button>
                                    <button className="btn btn-danger fw-bold" onClick={confirmDelete}>అవును</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

            </div>

            <style>{`
        .bg-gray-800 { background-color: #2d3748 !important; }
        .form-label-sm { font-size: 0.75rem; margin-bottom: 0.25rem; }
        .small { font-size: 0.875rem; }
      `}</style>
        </div>
    );
}
