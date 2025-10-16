// src/components/Shop/PurchaseDetails.jsx
import React, { useEffect, useMemo, useState } from "react";
import firebaseDB from "../../firebase";
import { useAuth } from "../../context/AuthContext";
// import categoryMap from "./VegCatalog";


const categoryMap = {
    "1 కూరగాయలు": ["టమాట", "వంకాయ", "బెండకాయ", "దోసకాయ", "కాకరకాయ", "బీరకాయ", "పొట్లకాయ", "సొరకాయ", "దొండకాయ", "గుమ్మడికాయ", "బూడిద గుమ్మడికాయ", "మునగకాయ", "పచ్చిమిరపకాయ", "గోరుచిక్కుడు", "బీన్స్", "చిక్కుడు", "అరటికాయ", "మామిడికాయ", "క్యాబేజీ", "కాలిఫ్లవర్"],
    "2 వేరు కూరగాయలు": ["ఉల్లిపాయ", "వెల్లుల్లి", "కేరట్", "బీట్ రూట్", "ముల్లంగి", "బంగాళాదుంప", "చిలకడదుంప", "చెమదుంప", "అల్లం"],
    "3 ఆకుకూరలు": ["పాలకూర", "తోటకూర", "మెంతికూర", "కొత్తిమీర", "పుదీనా", "కరివేపాకు", "గోంగూర"],
    "4 అరటి పళ్ళు": ["కర్పూరం", "పచ్చ చేక్కరకేళి", "ఎర్ర చేక్కరకేళి", "అమృతపాణి", "త్రయ అరిటి పళ్ళు"],
    "5 పువ్వులు": ["బంతి పువ్వులు", "పసుపు చామంతి", "తెల్ల చామంతి", "గులాబీ", "మలబార్", "మల్లె పువ్వులు", "మల్లె పూలదండ", "సన్నజాజులు", "సన్నజాజుల దండ"],
    "6 కొబ్బరిబొండాలు": ["కేరళ బొండాలు", "ఆంధ్ర బొండాలు"],
    "7 ఇతర వస్తువులు": ["కొబ్బరికాయలు", "బెల్లం", "తేనే పాకం"],
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
    // admins see all branches
    if (role === "guest" || role === "user" || role === "admin" || role === "superadmin") return "Shop";
    // others see only their branch
    const key = deriveBranchKey(user);
    return key ? `Shop/${key}` : "Shop";
};

const getWritePath = (user) => {
    const key = deriveBranchKey(user);
    return key ? `Shop/${key}` : "Shop";
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
        console.log("PurchaseDetails: Fetching from:", DB_PATH);

        const handler = (snap) => {
            const raw = snap.val() || {};
            console.log("PurchaseDetails: Raw data received:", raw);

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

            console.log("PurchaseDetails: Processed rows:", flat.length, flat);
            setAllRows(flat);
            setLoading(false);
        };

        const errHandler = (err) => {
            console.error("PurchaseDetails: Firebase read error:", err);
            setAllRows([]);
            setLoading(false);
        };

        const cb = ref.on("value", handler, errHandler);
        return () => ref.off("value", cb);
    }, [DB_PATH]);

    /* ------------ Lookups ------------ */
    const byDateVeg = useMemo(() => {
        const map = {};
        for (const r of allRows) {
            if (!r.date || !r.subCategory) continue;
            // last write wins; acceptable for lookup usage
            map[`${r.date}::${r.subCategory}`] = r;
        }
        return map;
    }, [allRows]);

    const byId = useMemo(() => {
        const map = {};
        for (const r of allRows) if (r?.id) map[r.id] = r;
        return map;
    }, [allRows]);

    const getRow = (veg, d = dateStr) => byDateVeg[`${d}::${veg}`] || null;

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

    // Monthly price tracker columns = all veg names in dataset
    const vegAll = useMemo(() => {
        const s = new Set();
        for (const r of allRows) if (r.subCategory) s.add(r.subCategory);
        return Array.from(s).sort((a, b) => a.localeCompare(b, "te-IN"));
    }, [allRows]);

    // ✅ count only rows for the selected date
    const itemsLoadedForDate = useMemo(
        () => allRows.filter((r) => r.date === dateStr).length,
        [allRows, dateStr]
    );

    /* ------------ Write (upsert) with correct branch ------------ */
    const upsert = async (veg, patch, date = dateStr, mainCategoryGuess = "") => {
        // If we already have a row for this veg/date, update same branch/id
        const existing = getRow(veg, date);
        if (existing?.id && existing?._branch) {
            const ref = firebaseDB.child(`Shop/${existing._branch}/${existing.id}`);

            const quantity =
                "quantity" in patch
                    ? safeNum(patch.quantity)
                    : safeNum(existing?.quantity);
            const price =
                "price" in patch ? safeNum(patch.price) : safeNum(existing?.price);
            const sellingRate =
                "sellingRate" in patch
                    ? safeNum(patch.sellingRate)
                    : safeNum(existing?.sellingRate);

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

            console.log(
                "PurchaseDetails: Updating:",
                `Shop/${existing._branch}/${existing.id}`,
                payload
            );
            await ref.set(payload);

            setAllRows((prev) => prev.map((r) => (r.id === existing.id ? payload : r)));
            return;
        }

        // Otherwise create a new record under current user's branch
        const listRef = firebaseDB.child(DB_WRITE_PATH);
        const id = listRef.push().key;

        // keep/guess mainCategory
        let mainCategory = mainCategoryGuess || "";
        if (!mainCategory) {
            const anyDate = allRows.find(
                (r) => r.subCategory === veg && r.mainCategory
            );
            mainCategory = anyDate?.mainCategory || "";
        }

        const quantity = "quantity" in patch ? safeNum(patch.quantity) : 0;
        const price = "price" in patch ? safeNum(patch.price) : 0;
        const sellingRate =
            "sellingRate" in patch ? safeNum(patch.sellingRate) : 0;

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

        console.log("PurchaseDetails: Creating:", `${DB_WRITE_PATH}/${id}`, payload);
        await listRef.child(id).set(payload);

        // optimistic
        setAllRows((prev) => {
            const next = prev.slice();
            next.push({ ...payload, _branch: deriveBranchKey(authUser) });
            return next;
        });
    };

    /* ------------ Selling-Rate editor helpers (ID-based) ------------ */
    const beginEditSelling = (row) => {
        setEditingKey(row.id);
        setSellDraft(row?.sellingRate ?? "");
    };
    const cancelEditSelling = () => {
        setEditingKey(null);
        setSellDraft("");
    };
    const saveEditSelling = async () => {
        const row = byId[editingKey];
        if (!row) return cancelEditSelling();

        const branch =
            row._branch || (DB_PATH.startsWith("Shop/") ? DB_PATH.split("/")[1] : "");
        const ref = firebaseDB.child(`Shop/${branch}/${row.id}`);

        const patch = {
            sellingRate: safeNum(sellDraft),
            updatedAt: new Date().toISOString(),
            updatedById: authUser?.uid || authUser?.dbId || "",
            updatedByName: getUserName(authUser),
        };

        await ref.update(patch);

        // optimistic local update
        setAllRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, ...patch } : r)));
        cancelEditSelling();
    };

    /* ------------ Years for dropdown ------------ */
    const yearsAround = useMemo(() => {
        const cur = new Date().getFullYear();
        return Array.from({ length: 7 }, (_, i) => cur - 3 + i);
    }, []);

    return (
        <div className="p-3 bg-dark border border-secondary rounded-3">
            {/* Debug Info */}
            <div className="alert alert-info mb-3 text-warning">
                {/* Controls */}
                <div className="d-flex flex-wrap align-items-center justify-content-between">

                    <div className="d-flex gap-2 align-items-center">
                        <select
                            className="form-select form-select-sm bg-secondary text-light border-secondary"
                            value={month}
                            onChange={(e) => setMonth(parseInt(e.target.value, 10))}
                            style={{ width: 140 }}
                        >
                            {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((m, i) => (
                                <option key={m} value={i}>
                                    {m}
                                </option>
                            ))}
                        </select>
                        <select
                            className="form-select form-select-sm bg-secondary text-light border-secondary"
                            value={year}
                            onChange={(e) => setYear(parseInt(e.target.value, 10))}
                            style={{ width: 110 }}
                        >
                            {yearsAround.map((y) => (
                                <option key={y} value={y}>
                                    {y}
                                </option>
                            ))}
                        </select>
                        <select
                            className="form-select form-select-sm bg-secondary text-light border-secondary"
                            value={dateStr}
                            onChange={(e) => setDateStr(e.target.value)}
                            style={{ width: 150 }}
                        >
                            {Array.from({ length: daysInMonth }, (_, i) => ymd(new Date(year, month, i + 1))).map((d) => (
                                <option key={d} value={d}>
                                    {d}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="small text-warning">
                        కొన్న వస్తువులు:  {itemsLoadedForDate} | <strong>Date:</strong>{" "}
                        {dateStr}
                    </div>
                </div>

            </div>



            {/* ===================== DAILY PURCHASE (TABLE-LIKE ROWS) ===================== */}
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
                    {/* Data Rows */}
                    <div className="mb-4">
                        {/* Table Header */}
                        <div
                            className="row g-0 mb-2 rounded-top"
                            style={{
                                background: "linear-gradient(135deg, #1f2937 0%, #374151 100%)",
                                borderBottom: "2px solid #4b5563",
                            }}
                        >
                            <div className="col-md-2 p-3 border-end border-dark">
                                <small className="text-light fw-bold">
                                    <i className="fas fa-carrot text-warning me-2"></i>
                                    VEGETABLE
                                </small>
                            </div>
                            <div className="col-md-1 p-3 border-end border-dark text-center">
                                <small className="text-light fw-bold">
                                    <i className="fas fa-weight-hanging text-info me-2"></i>
                                    QTY
                                </small>
                            </div>
                            <div className="col-md-1 p-3 border-end border-dark text-center">
                                <small className="text-light fw-bold">
                                    <i className="fas fa-tag text-primary me-2"></i>
                                    PRICE
                                </small>
                            </div>
                            <div className="col-md-2 p-3 border-end border-dark text-center">
                                <small className="text-light fw-bold">
                                    <i className="fas fa-calculator text-success me-2"></i>
                                    TOTAL
                                </small>
                            </div>
                            <div className="col-md-2 p-3 border-end border-dark text-center">
                                <small className="text-light fw-bold">
                                    <i className="fas fa-user text-info me-2"></i>
                                    PURCHASED BY
                                </small>
                            </div>
                            <div className="col-md-4 p-3 text-center">
                                <small className="text-light fw-bold">
                                    <i className="fas fa-chart-line text-warning me-2"></i>
                                    SELLING RATE
                                </small>
                            </div>
                        </div>

                        {/* Data Rows */}
                        {dailyGroups.map((grp) => (
                            <div key={grp.title}>
                                {/* Category Header */}
                                <div className="row g-0 mb-1 mt-3">
                                    <div className="col-12">
                                        <div
                                            className="d-flex align-items-center ps-3 py-2 rounded"
                                            style={{
                                                background: "rgba(59, 130, 246, 0.1)",
                                                borderLeft: "4px solid #3b82f6",
                                            }}
                                        >
                                            <i className="fas fa-tag text-info me-2"></i>
                                            <h5 className="text-warning mb-0 small fw-bold">
                                                {grp.title}
                                            </h5>
                                        </div>
                                    </div>
                                </div>

                                {/* Items */}
                                {grp.items.map((item, index) => {
                                    const totalNow =
                                        item.total ?? safeNum(item.quantity) * safeNum(item.price);
                                    const isEditing = editingKey === item.id;
                                    const isEven = index % 2 === 0;

                                    return (
                                        <div
                                            className={`row g-0 align-items-center py-2 ${isEven ? "" : "bg-gray-800"}`}
                                            key={item.id}
                                            style={{
                                                borderBottom: "1px solid #374151",
                                                borderLeft: "2px solid transparent",
                                                borderRight: "2px solid transparent",
                                                background: isEven
                                                    ? "rgba(17, 24, 39, 0.7)"
                                                    : "rgba(31, 41, 55, 0.7)",
                                                transition: "all 0.2s ease",
                                                margin: "1px 0",
                                            }}
                                        >
                                            {/* Vegetable Name */}
                                            <div className="col-md-2 ps-3">
                                                <div className="d-flex align-items-center">
                                                    <i className="fas fa-carrot text-warning me-2"></i>
                                                    <div>
                                                        <strong
                                                            className="text-light d-block"
                                                            style={{ fontSize: "0.8rem" }}
                                                        >
                                                            {item.subCategory}
                                                        </strong>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Quantity - Non-editable */}
                                            <div className="col-md-1 text-center">
                                                <div className="d-flex align-items-center justify-content-center">
                                                    <span
                                                        className="text-light fw-semibold px-2 py-1 rounded"
                                                        style={{
                                                            fontSize: "0.85rem",
                                                            background: "rgba(6, 182, 212, 0.15)",
                                                            border: "1px solid rgba(6, 182, 212, 0.3)",
                                                            minWidth: "50px",
                                                        }}
                                                    >
                                                        {item.quantity || 0}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Price - Non-editable */}
                                            <div className="col-md-1 text-center">
                                                <div className="d-flex align-items-center justify-content-center">
                                                    <span
                                                        className="text-light fw-semibold px- py-1 rounded"
                                                        style={{
                                                            fontSize: "0.85rem",
                                                            background: "rgba(59, 130, 246, 0.15)",
                                                            border: "1px solid rgba(59, 130, 246, 0.3)",
                                                            minWidth: "70px",
                                                        }}
                                                    >
                                                        ₹{item.price || 0}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Total */}
                                            <div className="col-md-2 text-center">
                                                <div className="d-flex align-items-center justify-content-center">
                                                    <span
                                                        className="badge fw-bold px-3 py-2"
                                                        style={{
                                                            fontSize: "0.85rem",
                                                            background:
                                                                "linear-gradient(135deg, #059669 0%, #10b981 100%)",
                                                            border: "1px solid rgba(16, 185, 129, 0.5)",
                                                        }}
                                                    >
                                                        ₹{totalNow || 0}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Purchased By */}
                                            <div className="col-md-2 text-center">
                                                <div className="d-flex align-items-center justify-content-center">
                                                    <span
                                                        className="text-light fw-semibold px-2 py-1 rounded"
                                                        style={{
                                                            fontSize: "0.8rem",
                                                            background: "rgba(139, 92, 246, 0.15)",
                                                            border: "1px solid rgba(139, 92, 246, 0.3)",
                                                            maxWidth: "120px",
                                                            overflow: "hidden",
                                                            textOverflow: "ellipsis",
                                                            whiteSpace: "nowrap",
                                                        }}
                                                        title={item.createdByName || item.updatedByName || "Unknown"}
                                                    >
                                                        <i className="fas fa-user me-1 text-info"></i>
                                                        {item.createdByName || item.updatedByName || "Unknown"}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Selling Rate - Editable (ID-based) */}
                                            <div className="col-md-4 text-center">
                                                <div className="d-flex align-items-center justify-content-center">
                                                    {isEditing ? (
                                                        <div className="d-flex gap-2 align-items-center">
                                                            <div className="input-group input-group-sm" style={{ maxWidth: "150px" }}>
                                                                <span className="input-group-text bg-dark border-secondary text-light">₹</span>
                                                                <input
                                                                    type="number"
                                                                    className="form-control form-control-sm text-center border-secondary bg-dark text-light"
                                                                    value={sellDraft}
                                                                    onChange={(e) => setSellDraft(e.target.value)}
                                                                    autoFocus
                                                                    style={{ minWidth: "80px" }}
                                                                />
                                                            </div>
                                                            <button
                                                                className="btn btn-sm btn-success px-2 d-flex align-items-center gap-1"
                                                                onClick={saveEditSelling}
                                                                title="Save"
                                                                style={{ minWidth: "60px" }}
                                                            >
                                                                <i className="fas fa-check small"></i>
                                                                Save
                                                            </button>
                                                            <button
                                                                className="btn btn-sm btn-danger px-2 d-flex align-items-center gap-1"
                                                                onClick={cancelEditSelling}
                                                                title="Cancel"
                                                                style={{ minWidth: "60px" }}
                                                            >
                                                                <i className="fas fa-times small"></i>
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="d-flex align-items-center gap-2">
                                                            <span
                                                                role="button"
                                                                className="badge fw-bold px-3 py-2"
                                                                onClick={() => beginEditSelling(item)}
                                                                title="Click to edit selling rate"
                                                                style={{
                                                                    background:
                                                                        "linear-gradient(135deg, #d97706 0%, #f59e0b 100%)",
                                                                    border: "1px solid rgba(245, 158, 11, 0.5)",
                                                                    fontSize: "0.85rem",
                                                                    transition: "all 0.2s ease",
                                                                    cursor: "pointer",
                                                                }}
                                                                onMouseEnter={(e) => {
                                                                    e.target.style.transform = "scale(1.05)";
                                                                    e.target.style.boxShadow =
                                                                        "0 4px 12px rgba(245, 158, 11, 0.3)";
                                                                }}
                                                                onMouseLeave={(e) => {
                                                                    e.target.style.transform = "scale(1)";
                                                                    e.target.style.boxShadow = "none";
                                                                }}
                                                            >
                                                                <i className="fas fa-rupee-sign me-1"></i>
                                                                {item?.sellingRate || "0"}
                                                            </span>
                                                            <small className="text-muted d-none d-md-block">
                                                                Click to edit
                                                            </small>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ===================== MONTHLY PRICE TRACKER (VEGETABLES IN COLUMNS, DATES IN ROWS) ===================== */}
            <h5 className="mt-5 mb-3 text-warning">
                <i className="fas fa-calendar-alt me-2"></i>
                Monthly Price Tracker —{" "}
                {new Date(year, month).toLocaleString("default", {
                    month: "long",
                    year: "numeric",
                })}
            </h5>

            {vegAll.length === 0 ? (
                <div className="text-center py-4">
                    <div className="text-muted">
                        <i className="fas fa-chart-line fa-2x mb-2"></i>
                        <p>No vegetable data available for tracking</p>
                    </div>
                </div>
            ) : (
                <div className="table-responsive">
                    <table className="table table-dark table-bordered align-middle">
                        <thead>
                            <tr>
                                <th style={{ minWidth: 140, textAlign: "center" }}>Vegetable</th>
                                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((dayNum) => {
                                    const fullDate = ymd(new Date(year, month, dayNum));
                                    const isToday = fullDate === ymd(new Date());
                                    return (
                                        <th
                                            key={dayNum}
                                            className="text-center"
                                            style={{ background: isToday ? "rgba(149,150,150,0.15)" : "" }}
                                        >
                                            <div>
                                                <div>{dayNum}</div>
                                                <small className="text-muted" style={{ fontSize: "0.7rem" }}>
                                                    {new Date(year, month, dayNum).toLocaleDateString("en", { weekday: "short" })}
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
                                                <i className="fas fa-tag me-2"></i>{catLabel}
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

                                            {Array.from({ length: daysInMonth }, (_, i) => {
                                                const fullDate = ymd(new Date(year, month, i + 1));
                                                const isToday = fullDate === ymd(new Date());
                                                const row = byDateVeg[`${fullDate}::${veg}`];
                                                const price = safeNum(row?.price);

                                                return (
                                                    <td
                                                        key={`${veg}-${i}`}
                                                        className={`text-center ${isToday ? "fw-bold text-warning" : ""}`}
                                                        style={{
                                                            background: isToday ? "rgba(13, 202, 240, 0.1)" : "rgba(27, 33, 46, 0.6)",
                                                        }}
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
                        </tbody>
                    </table>

                </div>
            )}


            <style>{`
        .bg-gray-800 {
          background-color: #2d3748 !important;
        }
        .form-label-sm { 
          font-size: 0.75rem; 
          margin-bottom: 0.25rem;
        }
        .card input.form-control {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.15);
          color: #fff;
        }
        .card input.form-control:focus {
          background: rgba(255,255,255,0.12);
          border-color: #0dcaf0;
          color: #fff;
          box-shadow: 0 0 0 0.2rem rgba(13, 202, 240, 0.25);
        }
        .badge[role="button"] { 
          cursor: pointer; 
          transition: all 0.2s ease;
        }
        .badge[role="button"]:hover {
          transform: scale(1.05);
        }
        .table th {
          background-color: #1f2937 !important;
          border-color: #374151 !important;
        }
      
        .small {
          font-size: 0.875rem;
        }
      `}</style>
        </div>
    );
}
