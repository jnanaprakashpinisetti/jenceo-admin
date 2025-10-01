// src/components/PettyCash/PettyCashDeleteReport.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import firebaseDB from "../../firebase";
import { Tabs, Tab } from "react-bootstrap";
import * as XLSX from "xlsx";

/**
 * PettyCashDeleteReport.jsx
 * - Shows only REJECTED or DELETED entries from PettyCashDeleteReport path
 * - No calculations, no action dropdowns
 */

function parseDateString(input) {
    if (!input) return null;
    if (input instanceof Date && !isNaN(input)) return input;
    const native = new Date(input);
    if (!isNaN(native)) return native;
    return null;
}

const monthsList = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function looksLikeRecord(obj) {
    if (!obj || typeof obj !== "object") return false;
    const keys = Object.keys(obj);
    const hints = ["date", "description", "price", "total", "mainCategory", "subCategory", "approval", "comments"];
    return keys.some(k => hints.includes(k));
}

function flattenRecords(node, keyPath = []) {
    const out = [];
    if (!node || typeof node !== "object") return out;
    if (looksLikeRecord(node)) {
        const relPath = keyPath.join("/");
        const idGuess = keyPath[keyPath.length - 1] || Math.random().toString(36).slice(2);
        out.push({ id: idGuess, _relPath: relPath, ...node });
        return out;
    }
    Object.entries(node).forEach(([k, v]) => {
        if (v && typeof v === "object") out.push(...flattenRecords(v, [...keyPath, k]));
    });
    return out;
}

function normPath(p) {
    return String(p || "").replace(/\/+/g, "/").replace(/\/$/, "").replace(/^\//, "");
}

export default function PettyCashDeleteReport({ currentUser = "Admin" }) {
    const [data, setData] = useState([]);
    const [activeYear, setActiveYear] = useState(String(new Date().getFullYear()));
    const [activeMonth, setActiveMonth] = useState("");
    const [search, setSearch] = useState("");
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);
    const [statusTab, setStatusTab] = useState("All"); // All | Rejected | Delete

    const [detailsOpen, setDetailsOpen] = useState(false);
    const [detailsItem, setDetailsItem] = useState(null);

    // Fetch ONLY from DeleteReport path
    useEffect(() => {
        const candidateRoots = ["PettyCashDeleteReport"];
        const detach = [];
        const pathData = {};
        const handleSnapshot = (path) => (snapshot) => {
            const next = [];
            if (snapshot && snapshot.exists && snapshot.exists()) {
                const rootVal = snapshot.val();
                const flattened = flattenRecords(rootVal, []);
                flattened.forEach((val) => {
                    const pd = parseDateString(val.date || val.createdAt);
                    const safeDate = pd ? pd.toISOString().slice(0, 10) : (val.date || "");
                    const rel = normPath(val._relPath || val.id || "");
                    const fullPath = normPath(`${path}/${rel}`);
                    const id = `${fullPath}`;
                    next.push({
                        id,
                        ...val,
                        _parsedDate: pd,
                        _safeDate: safeDate,
                        _fullPath: fullPath,
                        // Determine action type from deleteInfo or approval
                        _actionType: val.deleteInfo?.actionType || val.approval || "Unknown"
                    });
                });
            }
            pathData[path] = next;
            const mergedMap = new Map();
            Object.values(pathData).flat().forEach((rec) => {
                if (!mergedMap.has(rec._fullPath)) mergedMap.set(rec._fullPath, rec);
            });
            const merged = Array.from(mergedMap.values()).sort((a, b) => {
                const da = a._parsedDate ? a._parsedDate.getTime() : 0;
                const db = b._parsedDate ? b._parsedDate.getTime() : 0;
                return db - da;
            });
            setData(merged);
        };
        const handleError = (err) => console.error("Firebase error:", err);
        candidateRoots.forEach((root) => {
            const ref = firebaseDB.child(root);
            ref.on("value", handleSnapshot(root), handleError);
            detach.push(() => ref.off("value", handleSnapshot(root)));
        });
        return () => detach.forEach((fn) => fn());
    }, []);

    const statusColorClass = (status) => {
        const s = String(status || "Pending").toLowerCase();
        if (s === "approved") return "badge bg-success";
        if (s === "rejected") return "badge bg-danger";
        if (s === "delete") return "badge bg-secondary";
        return "badge bg-warning text-dark";
    };

    const recordMatchesDeleteOrReject = (r) => {
        const actionType = r._actionType?.toLowerCase();
        if (statusTab.toLowerCase() === "delete") return actionType === "delete";
        if (statusTab.toLowerCase() === "rejected") return actionType === "rejected";
        return actionType === "delete" || actionType === "rejected";
    };

    const years = useMemo(() => {
        const setY = new Set();
        data.forEach(d => { const dt = d._parsedDate; if (dt) setY.add(String(dt.getFullYear())); });
        return (setY.size ? Array.from(setY) : [String(new Date().getFullYear())]).sort((a, b) => Number(b) - Number(a));
    }, [data]);

    const recordsForYearMonth = useMemo(() => {
        const filteredByYear = data.filter(d => d._parsedDate && String(d._parsedDate.getFullYear()) === activeYear);
        const filteredByStatus = filteredByYear.filter(recordMatchesDeleteOrReject);
        if (activeMonth) return filteredByStatus.filter(d => d._parsedDate && monthsList[d._parsedDate.getMonth()] === activeMonth);
        return filteredByStatus;
    }, [data, activeYear, activeMonth, statusTab]);

    const filteredRecords = useMemo(() => {
        let out = recordsForYearMonth.slice();
        if (search) {
            const q = String(search).toLowerCase();
            out = out.filter((r) =>
                String(r.description || "").toLowerCase().includes(q) ||
                String(r.comments || "").toLowerCase().includes(q) ||
                String(r.deleteInfo?.reason || "").toLowerCase().includes(q)
            );
        }
        return out;
    }, [recordsForYearMonth, search]);

    const totalPages = Math.max(1, Math.ceil(filteredRecords.length / rowsPerPage));
    const safePage = Math.min(Math.max(1, currentPage), totalPages);
    const indexOfLast = safePage * rowsPerPage;
    const indexOfFirst = indexOfLast - rowsPerPage;
    const pageItems = filteredRecords.slice(indexOfFirst, indexOfLast);

    const exportExcel = (records, label) => {
        const exportData = records.map((r) => ({
            Date: r._safeDate || r.date || "",
            "Main Category": r.mainCategory,
            "Sub Category": r.subCategory,
            Description: r.description,
            Quantity: r.quantity,
            Price: r.price,
            Total: r.total,
            Comments: r.comments,
            "Purchased By": r.employeeName || "",
            "Action Type": r._actionType,
            "Reason": r.deleteInfo?.reason || "",
            "Action By": r.deleteInfo?.movedBy || "",
            "Action At": r.deleteInfo?.movedAt || "",
            "Original Path": r.originalPath || ""
        }));
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, `${label}-DeletedRecords`);
        XLSX.writeFile(wb, `${label}-DeletedRecords.xlsx`);
    };

    return (
        <div className="pettyCashReport">
            <div className="actionBar">
                <h3>Petty Cash Delete / Reject Report</h3>
                <div className="btn-group">
                    {["All", "Rejected", "Delete"].map(s => (
                        <button key={s} className={`btn btn-sm ${statusTab.toLowerCase() === s.toLowerCase() ? "btn-primary" : "btn-outline-info"}`} onClick={() => { setStatusTab(s); setCurrentPage(1); }}>
                            {s}
                        </button>
                    ))}
                </div>
            </div>

            {/* Search and Export */}
            <div className="row mb-3 g-2 align-items-center">
                <div className="col-md-6">
                    <input type="text" className="form-control" placeholder="Search in description, comments, or reason" value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <div className="col-md-6 d-flex justify-content-end">
                    <button className="btn btn-primary btn-sm" onClick={() => exportExcel(filteredRecords, `${activeYear}-${activeMonth || "all"}-${statusTab}`)} title="Export deleted records">Export</button>
                </div>
            </div>

            <Tabs activeKey={activeYear} onSelect={(k) => { setActiveYear(String(k)); setActiveMonth(""); setCurrentPage(1); }}>
                {years.map((y) => (
                    <Tab eventKey={y} title={`${y}`} key={y}>
                        {/* Month buttons */}
                        <div className="mb-3">
                            <div className="d-flex gap-2 flex-wrap">
                                {monthsList.map((m) => (
                                    <button key={m} className={`btn btn-sm ${activeMonth === m ? "btn-primary" : "btn-outline-info"}`} onClick={() => { setActiveMonth(m); setCurrentPage(1); }}>
                                        {m}
                                    </button>
                                ))}
                                <button className={`btn btn-sm ${activeMonth === "" ? "btn-primary" : "btn-outline-info"}`} onClick={() => { setActiveMonth(""); setCurrentPage(1); }}>
                                    All months
                                </button>
                            </div>
                        </div>

                        <div className="table-responsive">
                            <table className="table table-dark table-hover table-sm align-middle">
                                <thead>
                                    <tr>
                                        <th>S.No</th>
                                        <th>Date</th>
                                        <th>Main Cat</th>
                                        <th>Sub Cat</th>
                                        <th>Description</th>
                                        <th>Total</th>
                                        <th>Action Type</th>
                                        <th>Reason</th>
                                        <th>Action By</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pageItems.map((item, idx) => (
                                        <tr key={item.id} style={{ cursor: "pointer" }} onClick={() => { setDetailsItem(item); setDetailsOpen(true); }}>
                                            <td>{indexOfFirst + idx + 1}</td>
                                            <td>{item._safeDate || item.date}</td>
                                            <td>{item.mainCategory || "—"}</td>
                                            <td>{item.subCategory || "—"}</td>
                                            <td>{item.description || "—"}</td>
                                            <td><strong>{Number(item.total ?? 0).toLocaleString()}</strong></td>
                                            <td><span className={statusColorClass(item._actionType)}>{item._actionType || "—"}</span></td>
                                            <td>{item.deleteInfo?.reason || "—"}</td>
                                            <td>{item.deleteInfo?.movedBy || "—"}</td>
                                        </tr>
                                    ))}
                                    {pageItems.length === 0 && (
                                        <tr>
                                            <td colSpan="9" className="text-center text-muted py-4">
                                                No {statusTab.toLowerCase() === "all" ? "" : statusTab} records found for {activeYear}{activeMonth ? ` - ${activeMonth}` : ''}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {filteredRecords.length > 0 && (
                            <div className="d-flex justify-content-between align-items-center mt-3">
                                <div>Showing {filteredRecords.length} deleted/rejected items</div>
                                <div className="d-flex gap-2 align-items-center">
                                    <button className="btn btn-sm btn-outline-secondary" onClick={() => setCurrentPage(p => Math.max(1, p - 1))}>Prev</button>
                                    <div>Page {safePage} / {totalPages}</div>
                                    <button className="btn btn-sm btn-outline-secondary" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}>Next</button>
                                </div>
                            </div>
                        )}
                    </Tab>
                ))}
            </Tabs>

            {/* Details Modal */}
            {detailsOpen && detailsItem && (
                <div className="modal fade show" style={{ display: "block", backgroundColor: "rgba(0,0,0,0.5)" }} onClick={() => { setDetailsOpen(false); setDetailsItem(null); }}>
                    <div className="modal-dialog modal-lg modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-content">
                            <div className="modal-header" style={{ background: "#dc3545", color: "#fff" }}>
                                <h5 className="modal-title">Deleted/Rejected Entry Details</h5>
                                <button type="button" className="btn-close" onClick={() => { setDetailsOpen(false); setDetailsItem(null); }}></button>
                            </div>
                            <div className="modal-body p-4">
                                <div className="row g-3">
                                    <div className="col-md-6"><strong>Date:</strong><div>{detailsItem._safeDate || detailsItem.date || "-"}</div></div>
                                    <div className="col-md-6"><strong>Action Type:</strong><div><span className={statusColorClass(detailsItem._actionType)}>{detailsItem._actionType || "-"}</span></div></div>
                                    <div className="col-md-6"><strong>Main Category:</strong><div>{detailsItem.mainCategory || "-"}</div></div>
                                    <div className="col-md-6"><strong>Sub Category:</strong><div>{detailsItem.subCategory || "-"}</div></div>
                                    <div className="col-12"><strong>Description:</strong><div style={{ whiteSpace: "pre-wrap" }}>{detailsItem.description || "-"}</div></div>
                                    <div className="col-12"><strong>Comments:</strong><div style={{ whiteSpace: "pre-wrap" }}>{detailsItem.comments || "-"}</div></div>
                                    <div className="col-md-4"><strong>Quantity:</strong><div>{detailsItem.quantity ?? "-"}</div></div>
                                    <div className="col-md-4"><strong>Price:</strong><div>{detailsItem.price ?? "-"}</div></div>
                                    <div className="col-md-4"><strong>Total:</strong><div><strong>{Number(detailsItem.total ?? 0).toLocaleString()}</strong></div></div>
                                    <div className="col-md-6"><strong>Purchased By:</strong><div>{detailsItem.employeeName || "-"}</div></div>
                                    <div className="col-md-6"><strong>Action By:</strong><div>{detailsItem.deleteInfo?.movedBy || "-"}</div></div>
                                    <div className="col-12"><strong>Reason:</strong><div className="alert alert-warning mb-0">{detailsItem.deleteInfo?.reason || "-"}</div></div>
                                    <div className="col-md-6"><strong>Action Date:</strong><div>{detailsItem.deleteInfo?.movedAt ? new Date(detailsItem.deleteInfo.movedAt).toLocaleString() : "-"}</div></div>
                                    <div className="col-md-6"><strong>Original Path:</strong><div><code>{detailsItem.originalPath || "-"}</code></div></div>
                                    <div className="col-12"><strong>Current Path:</strong><div><code>{detailsItem._fullPath || "-"}</code></div></div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-secondary" onClick={() => { setDetailsOpen(false); setDetailsItem(null); }}>Close</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}