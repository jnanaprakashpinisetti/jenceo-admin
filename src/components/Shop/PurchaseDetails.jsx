// src/components/Shop/PurchaseDetails.jsx
import React, { useEffect, useMemo, useState } from "react";
import firebaseDB from "../../firebase";
import { useAuth } from "../../context/AuthContext";


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

export default function PurchaseDetails() {
    const { user: authUser } = useAuth?.() || {};

    // Reads/writes only inside this branch key. Change if you need a different branch.
    const getBranchPath = (user) => {
        if (!user) return "Shop"; // fallback
        return "Shop";
        const key = user.dbId || user.branchKey || user.uid;
        return key ? `Shop/${key}` : "Shop";
    };
    // FIXED: Remove the duplicate "JenCeo-DataBase" from the path
    const DB_PATH = useMemo(() => getBranchPath(authUser), [authUser]);

    const now = new Date();
    const [year, setYear] = useState(now.getFullYear());
    const [month, setMonth] = useState(now.getMonth()); // 0..11
    const [dateStr, setDateStr] = useState(ymd(now)); // yyyy-mm-dd

    const [allRows, setAllRows] = useState([]);
    const [loading, setLoading] = useState(true);

    // selling rate inline editor
    const [editingKey, setEditingKey] = useState(null); // `${date}::${veg}`
    const [sellDraft, setSellDraft] = useState("");

    /* ------------ Date options ------------ */
    const daysInMonth = useMemo(
        () => new Date(year, month + 1, 0).getDate(),
        [year, month]
    );

    useEffect(() => {
        // keep selected date valid on month/year change
        const currentDay = new Date(dateStr).getDate();
        const possible = ymd(
            new Date(year, month, Math.min(currentDay, daysInMonth))
        );
        setDateStr(possible);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [year, month, daysInMonth]);

    /* ------------ Fetch from CORRECT path: Shop/<BRANCH_KEY> ------------ */
    useEffect(() => {
        setLoading(true);
        const ref = firebaseDB.child(DB_PATH);
        console.log("PurchaseDetails: Fetching from:", DB_PATH);

        const off = ref.on(
            "value",
            (snap) => {
                const raw = snap.val() || {};
                console.log("PurchaseDetails: Raw data received:", raw);

                // Robustly flatten any nested key/key structures
                const flat = flattenRows(raw).map((row) => {
                    const quantity = safeNum(row?.quantity);
                    const price = safeNum(row?.price);
                    return {
                        ...row,
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
                console.log("PurchaseDetails: Processed rows:", flat.length, flat);
                setAllRows(flat);
                setLoading(false);
            },
            (err) => {
                console.error("PurchaseDetails: Firebase read error:", err);
                setAllRows([]);
                setLoading(false);
            }
        );

        return () => ref.off("value", off);
    }, []);

    /* ------------ Lookups ------------ */
    const byDateVeg = useMemo(() => {
        const map = {};
        for (const r of allRows) {
            if (!r.date || !r.subCategory) continue;
            map[`${r.date}::${r.subCategory}`] = r;
        }
        return map;
    }, [allRows]);

    const getRow = (veg, d = dateStr) => byDateVeg[`${d}::${veg}`] || null;

    // Daily (selected date) → group by mainCategory, items as cards
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

    // Monthly price tracker columns = all veg names in month
    const vegAll = useMemo(() => {
        const s = new Set();
        for (const r of allRows) if (r.subCategory) s.add(r.subCategory);
        return Array.from(s).sort((a, b) => a.localeCompare(b, "te-IN"));
    }, [allRows]);

    /* ------------ Write (upsert) back to CORRECT path ------------ */
    const upsert = async (veg, patch, date = dateStr, mainCategoryGuess = "") => {
        const listRef = firebaseDB.child(DB_PATH);
        const existing = getRow(veg, date);
        const id = existing?.id || listRef.push().key;

        // keep/guess mainCategory
        let mainCategory = existing?.mainCategory || mainCategoryGuess || "";
        if (!mainCategory) {
            const sameDate = allRows.find(
                (r) => r.date === date && r.subCategory === veg && r.mainCategory
            );
            const anyDate = allRows.find(
                (r) => r.subCategory === veg && r.mainCategory
            );
            mainCategory = sameDate?.mainCategory || anyDate?.mainCategory || "";
        }

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
            id,
            date,
            mainCategory,
            subCategory: veg,
            quantity,
            price,
            sellingRate,
            total: quantity * price,
            ...(existing?.createdAt
                ? {}
                : {
                    createdAt: new Date().toISOString(),
                    createdById: authUser?.uid || authUser?.dbId || "",
                    createdByName: getUserName(authUser),
                }),
            updatedAt: new Date().toISOString(),
            updatedById: authUser?.uid || authUser?.dbId || "",
            updatedByName: getUserName(authUser),
        };

        console.log("PurchaseDetails: Saving to:", `${DB_PATH}/${id}`, payload);

        // ✅ write directly under the correct path: Shop/<branch>/<id>
        await listRef.child(id).set(payload);

        // optimistic
        setAllRows((prev) => {
            const next = prev.filter((r) => r.id !== id);
            next.push(payload);
            return next;
        });
    };

    /* ------------ Selling-Rate editor helpers ------------ */
    const beginEditSelling = (veg) => {
        const r = getRow(veg);
        setEditingKey(`${dateStr}::${veg}`);
        setSellDraft(r?.sellingRate ?? "");
    };
    const cancelEditSelling = () => {
        setEditingKey(null);
        setSellDraft("");
    };
    const saveEditSelling = async (veg) => {
        await upsert(veg, { sellingRate: sellDraft });
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
                <strong>Database Path:</strong> {DB_PATH} |{" "}
                <strong>Items Loaded:</strong> {allRows.length} | <strong>Date:</strong>{" "}
                {dateStr}
            </div>

            {/* Controls */}
            <div className="d-flex flex-wrap align-items-center justify-content-between mb-3">
                <div className="d-flex gap-2 align-items-center">
                    <select
                        className="form-select form-select-sm bg-dark text-light border-secondary"
                        value={month}
                        onChange={(e) => setMonth(parseInt(e.target.value, 10))}
                        style={{ width: 140 }}
                    >
                        {[
                            "Jan",
                            "Feb",
                            "Mar",
                            "Apr",
                            "May",
                            "Jun",
                            "Jul",
                            "Aug",
                            "Sep",
                            "Oct",
                            "Nov",
                            "Dec",
                        ].map((m, i) => (
                            <option key={m} value={i}>
                                {m}
                            </option>
                        ))}
                    </select>
                    <select
                        className="form-select form-select-sm bg-dark text-light border-secondary"
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
                        className="form-select form-select-sm bg-dark text-light border-secondary"
                        value={dateStr}
                        onChange={(e) => setDateStr(e.target.value)}
                        style={{ width: 150 }}
                    >
                        {Array.from({ length: daysInMonth }, (_, i) =>
                            ymd(new Date(year, month, i + 1))
                        ).map((d) => (
                            <option key={d} value={d}>
                                {d}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="small text-info">
                    {/* Branch: <span className="text-warning">{BRANCH_KEY}</span> • Date:{" "} */}
                    <span className="text-warning">{dateStr}</span>
                </div>
            </div>

            {/* ===================== DAILY PURCHASE (TABLE-LIKE CARDS) ===================== */}
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
                    {/* Table Header */}


                    {/* Data Rows */}
                    <div className="mb-4">
                        {/* Table Header */}
                        <div className="row g-0 mb-2 rounded-top" style={{
                            background: 'linear-gradient(135deg, #1f2937 0%, #374151 100%)',
                            borderBottom: '2px solid #4b5563'
                        }}>
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
                                        <div className="d-flex align-items-center ps-3 py-2 rounded" style={{
                                            background: 'rgba(59, 130, 246, 0.1)',
                                            borderLeft: '4px solid #3b82f6'
                                        }}>
                                            <i className="fas fa-tag text-info me-2"></i>
                                            <h5 className="text-warning mb-0 small fw-bold">{grp.title}</h5>
                                        </div>
                                    </div>
                                </div>

                                {/* Items */}
                                {grp.items.map((item, index) => {
                                    const totalNow = item.total ?? safeNum(item.quantity) * safeNum(item.price);
                                    const key = `${item.date}::${item.subCategory}`;
                                    const isEditing = editingKey === key;
                                    const isEven = index % 2 === 0;

                                    return (
                                        <div
                                            className={`row g-0 align-items-center py-2 ${isEven ? '' : 'bg-gray-800'}`}
                                            key={item.id || key}
                                            style={{
                                                borderBottom: '1px solid #374151',
                                                borderLeft: '2px solid transparent',
                                                borderRight: '2px solid transparent',
                                                background: isEven ? 'rgba(17, 24, 39, 0.7)' : 'rgba(31, 41, 55, 0.7)',
                                                transition: 'all 0.2s ease',
                                                margin: '1px 0'
                                            }}
                                        >
                                            {/* Vegetable Name */}
                                            <div className="col-md-2 ps-3">
                                                <div className="d-flex align-items-center">
                                                    <i className="fas fa-carrot text-warning me-2"></i>
                                                    <div>
                                                        <strong className="text-light d-block" style={{ fontSize: '0.8rem' }}>
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
                                                            fontSize: '0.85rem',
                                                            background: 'rgba(6, 182, 212, 0.15)',
                                                            border: '1px solid rgba(6, 182, 212, 0.3)',
                                                            minWidth: '50px'
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
                                                        className="text-light fw-semibold px-2 py-1 rounded"
                                                        style={{
                                                            fontSize: '0.85rem',
                                                            background: 'rgba(59, 130, 246, 0.15)',
                                                            border: '1px solid rgba(59, 130, 246, 0.3)',
                                                            minWidth: '70px'
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
                                                            fontSize: '0.85rem',
                                                            background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                                                            border: '1px solid rgba(16, 185, 129, 0.5)'
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
                                                            fontSize: '0.8rem',
                                                            background: 'rgba(139, 92, 246, 0.15)',
                                                            border: '1px solid rgba(139, 92, 246, 0.3)',
                                                            maxWidth: '120px',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap'
                                                        }}
                                                        title={item.createdByName || item.updatedByName || 'Unknown'}
                                                    >
                                                        <i className="fas fa-user me-1 text-info"></i>
                                                        {item.createdByName || item.updatedByName || 'Unknown'}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Selling Rate - Editable */}
                                            <div className="col-md-4 text-center">
                                                <div className="d-flex align-items-center justify-content-center">
                                                    {isEditing ? (
                                                        <div className="d-flex gap-2 align-items-center">
                                                            <div className="input-group input-group-sm" style={{ maxWidth: '150px' }}>
                                                                <span className="input-group-text bg-dark border-secondary text-light">₹</span>
                                                                <input
                                                                    type="number"
                                                                    className="form-control form-control-sm text-center border-secondary bg-dark text-light"
                                                                    value={sellDraft}
                                                                    onChange={(e) => setSellDraft(e.target.value)}
                                                                    autoFocus
                                                                    style={{ minWidth: '80px' }}
                                                                />
                                                            </div>
                                                            <button
                                                                className="btn btn-sm btn-success px-2 d-flex align-items-center gap-1"
                                                                onClick={() => saveEditSelling(item.subCategory)}
                                                                title="Save"
                                                                style={{ minWidth: '60px' }}
                                                            >
                                                                <i className="fas fa-check small"></i>
                                                                Save
                                                            </button>
                                                            <button
                                                                className="btn btn-sm btn-danger px-2 d-flex align-items-center gap-1"
                                                                onClick={cancelEditSelling}
                                                                title="Cancel"
                                                                style={{ minWidth: '60px' }}
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
                                                                onClick={() => beginEditSelling(item.subCategory)}
                                                                title="Click to edit selling rate"
                                                                style={{
                                                                    background: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)',
                                                                    border: '1px solid rgba(245, 158, 11, 0.5)',
                                                                    fontSize: '0.85rem',
                                                                    transition: 'all 0.2s ease',
                                                                    cursor: 'pointer'
                                                                }}
                                                                onMouseEnter={(e) => {
                                                                    e.target.style.transform = 'scale(1.05)';
                                                                    e.target.style.boxShadow = '0 4px 12px rgba(245, 158, 11, 0.3)';
                                                                }}
                                                                onMouseLeave={(e) => {
                                                                    e.target.style.transform = 'scale(1)';
                                                                    e.target.style.boxShadow = 'none';
                                                                }}
                                                            >
                                                                <i className="fas fa-rupee-sign me-1"></i>
                                                                {item?.sellingRate || "0"}
                                                            </span>
                                                            <small className="text-muted d-none d-md-block">Click to edit</small>
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
                                <th style={{ minWidth: 100, textAlign: "center" }}>Date</th>
                                {vegAll.map((veg) => (
                                    <th
                                        key={veg}
                                        className="text-center"
                                        style={{ minWidth: 120 }}
                                    >
                                        <div className="d-flex align-items-center justify-content-center">
                                            <i className="fas fa-carrot text-warning me-1 small"></i>
                                            {veg}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(
                                (dayNum) => {
                                    const fullDate = ymd(new Date(year, month, dayNum));
                                    const isToday = fullDate === ymd(new Date());
                                    return (
                                        <tr key={dayNum} className={isToday ? "table-active" : ""}>
                                            <th
                                                className="fw-semibold text-center"
                                                style={{
                                                    background: isToday ? "rgba(13, 202, 240, 0.2)" : "",
                                                }}
                                            >
                                                <div>
                                                    <div>{dayNum}</div>
                                                    <small
                                                        className="text-muted"
                                                        style={{ fontSize: "0.7rem" }}
                                                    >
                                                        {new Date(year, month, dayNum).toLocaleDateString(
                                                            "en",
                                                            { weekday: "short" }
                                                        )}
                                                    </small>
                                                </div>
                                            </th>
                                            {vegAll.map((veg) => {
                                                const row = byDateVeg[`${fullDate}::${veg}`];
                                                const price = safeNum(row?.price);
                                                return (
                                                    <td
                                                        key={`${dayNum}-${veg}`}
                                                        className="text-center"
                                                        style={{
                                                            background: isToday
                                                                ? "rgba(13, 202, 240, 0.1)"
                                                                : "",
                                                        }}
                                                    >
                                                        {price ? (
                                                            <span className="badge bg-info small">
                                                                <i className="fas fa-rupee-sign me-1"></i>
                                                                {price}
                                                            </span>
                                                        ) : (
                                                            <span className="text-muted">—</span>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    );
                                }
                            )}
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
        .table td {
          border-color: #374151 !important;
          background-color: #111827 !important;
        }
        .small {
          font-size: 0.875rem;
        }
      `}</style>
        </div>
    );
}
