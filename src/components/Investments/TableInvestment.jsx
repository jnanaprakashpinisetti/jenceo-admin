// TableInvestment.jsx
import React, { useEffect, useMemo, useState } from "react";
import firebaseDB from "../../firebase";
import { useAuth } from "../../context/AuthContext";

/**
 * TableInvestment.jsx
 *
 * Behavior changes:
 *  - Clarification textarea opens only for the investor who raised the record.
 *  - Default acknowledge status is "Pending".
 *  - Totals (cards, visible, grand) include only records acknowledged === "Acknowledge".
 *  - Investor filter shows unique investor names (normalized).
 *  - Styled cards for better UI.
 *
 * Props:
 *  - currentUser (string) optional - used to allow clarification submissions for the investor who created the record.
 *  - pageSizeOptions (array) optional
 */
// --- Founders (by uiId)
const FOUNDERS = new Set([
    "user_1759689202840_mk3hv8na5", // X
    "user_1759817693513_jw2nqfabw", // Y
    "user_1759817693513_jw2nqfcoz", // Z
]);

// --- Robust auth helpers (use everywhere)
function getEffectiveUserId(u) {
    return u?.dbId || u?.uid || u?.id || u?.key || null;
}
function getEffectiveUserName(u, fallback = "System") {
    const raw = u?.name || u?.displayName || u?.dbName || u?.username || u?.email || fallback || "System";
    return String(raw).trim().replace(/@.*/, "") || "System";
}

// --- Status helpers
// Compute "UI status" from stored fields + approvals
function statusFromRecord(r) {
    if (!r) return "Pending";
    // Reject takes precedence
    if (r._raw?.status === "Reject") return "Reject";
    if (r._raw?.status === "Clarification") return "Clarification";

    // Approvals logic
    const creatorId = r._raw?.createdById || r.createdById;
    const approvals = r._raw?.approvals || {};
    let approverCount = 0;
    for (const [uid, a] of Object.entries(approvals)) {
        if (uid !== creatorId && a?.approved) approverCount++;
    }
    if (approverCount >= 2) return "Approve";       // Y & Z approved
    return "Pending";                                // waiting for both
}

function badgeClass(status) {
    switch (String(status)) {
        case "Approve": return "badge bg-success";
        case "Reject": return "badge bg-danger";
        case "Clarification": return "badge bg-warning text-dark";
        default: return "badge bg-secondary"; // Pending
    }
}


// // ---- status helpers (module scope) ----
// const statusFromRecord = (r) => {
//     if (r?.status) return String(r.status);
//     const ack = String(r?.acknowledge || "Pending");
//     return ack === "Acknowledge" ? "Approve" : ack;
// };

// const badgeClass = (status) => {
//     switch (String(status)) {
//         case "Approve": return "badge bg-success";
//         case "Reject": return "badge bg-danger";
//         case "Clarification": return "badge bg-warning text-dark";
//         default: return "badge bg-secondary"; // Pending
//     }
// };

export default function TableInvestment({
    currentUser = "Admin",
    pageSizeOptions = [10, 20, 50, 100],
}) {
    const [rawData, setRawData] = useState({});
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);

    // UI state
    const [selectedInvestor, setSelectedInvestor] = useState(null);
    const [showModal, setShowModal] = useState(false);

    const [search, setSearch] = useState("");
    const [filterInvestor, setFilterInvestor] = useState("");
    const [filterAck, setFilterAck] = useState("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");

    const [sortField, setSortField] = useState("invest_date");
    const [sortOrder, setSortOrder] = useState("desc"); // asc | desc

    const [rowsPerPage, setRowsPerPage] = useState(pageSizeOptions[0]);
    const [currentPage, setCurrentPage] = useState(1);

    // status helpers
    const statusFromRecord = (r) => {
        // prefer new status; map legacy acknowledge for back-compat
        if (r.status) return String(r.status);
        const ack = String(r.acknowledge || "Pending");
        return ack === "Acknowledge" ? "Approve" : ack;
    };


    // single-record modal state
    const [showRecord, setShowRecord] = useState(false);
    const [record, setRecord] = useState(null);
    const [editStatus, setEditStatus] = useState("Pending");
    const [editComment, setEditComment] = useState("");


    // subscribe to firebase Investments
    useEffect(() => {
        const ref = firebaseDB.child("Investments");
        const listener = (snap) => {
            const val = snap.val() || {};
            setRawData(val);

            // normalize to array
            const list = [];
            Object.keys(val).forEach((key) => {
                const it = val[key] || {};

                // defensive normalization
                const investor = String(it.investor ?? it.name ?? "Unknown");
                const invest_date = String(it.invest_date ?? it.date ?? "");
                const invest_amount = Number(isNaN(Number(it.invest_amount ?? it.amount ?? 0)) ? 0 : Number(it.invest_amount ?? it.amount ?? 0));
                const invest_to = String(it.invest_to ?? it.to ?? "");
                const invest_reference = String(it.invest_reference ?? it.refNo ?? it.ref ?? "");
                const invest_purpose = String(it.invest_purpose ?? it.purpose ?? "");
                const comments = String(it.invest_comments ?? it.comments ?? "");
                const acknowledge = String(it.acknowledge ?? it.ack ?? "Pending");
                const ackClarification = it.ackClarification ?? it.ackClarify ?? null;
                const ackAt = it.ackAt ?? it.ack_at ?? it.ackAt ?? null;
                const ackBy = it.ackBy ?? it.ack_by ?? it.ackBy ?? null;

                list.push({
                    id: key,
                    investor,
                    invest_date,
                    invest_amount,
                    invest_to,
                    invest_reference,
                    invest_purpose,
                    comments,
                    acknowledge,
                    ackClarification,
                    ackAt,
                    ackBy,
                    _raw: it,
                });
            });

            // stable sort by date desc
            list.sort((a, b) => {
                const da = a.invest_date ? new Date(a.invest_date) : new Date(0);
                const db = b.invest_date ? new Date(b.invest_date) : new Date(0);
                return db - da;
            });

            setRecords(list);
            setLoading(false);
        };

        ref.on("value", listener);
        return () => ref.off("value", listener);
    }, []);

    // derived: groups by investor (unique once)
    const groups = useMemo(() => {
        const map = new Map();
        records.forEach((r) => {
            const name = String(r.investor ?? "Unknown").trim();
            if (!map.has(name)) map.set(name, []);
            map.get(name).push(r);
        });
        const arr = [];
        for (const [investor, items] of map.entries()) {
            // total counted only for acknowledged records
            const acknowledgedTotal = items.reduce((s, it) => s + (it.acknowledge === "Acknowledge" ? Number(it.invest_amount || 0) : 0), 0);
            arr.push({ investor, total: acknowledgedTotal, count: items.length, items });
        }
        // sort by acknowledged total desc
        arr.sort((a, b) => b.total - a.total);
        return arr;
    }, [records]);

    // helpers
    const fmtCurrency = (n) => {
        if (n === null || n === undefined || isNaN(Number(n))) return "0";
        return Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 });
    };
    const fmtDate = (d) => {
        if (!d) return "";
        const dt = new Date(d);
        if (isNaN(dt.getTime())) return String(d);
        return dt.toLocaleDateString("en-GB");
    };

    // filter + sort + paginate (table rows)
    const filtered = useMemo(() => {
        let list = [...records];

        if (search) {
            const q = String(search).toLowerCase();
            list = list.filter((r) =>
                String(r.investor || "").toLowerCase().includes(q) ||
                String(r.invest_purpose || "").toLowerCase().includes(q) ||
                String(r.invest_reference || "").toLowerCase().includes(q) ||
                String(r.comments || "").toLowerCase().includes(q)
            );
        }

        if (filterInvestor) list = list.filter((r) => String(r.investor || "") === filterInvestor);
        if (filterAck) list = list.filter((r) => String(r.acknowledge || "Pending") === filterAck);

        if (dateFrom) {
            const df = new Date(dateFrom);
            list = list.filter((r) => {
                const d = r.invest_date ? new Date(r.invest_date) : null;
                return d && d >= df;
            });
        }
        if (dateTo) {
            const dt = new Date(dateTo);
            list = list.filter((r) => {
                const d = r.invest_date ? new Date(r.invest_date) : null;
                return d && d <= dt;
            });
        }

        // sorting
        list.sort((a, b) => {
            let va = a[sortField], vb = b[sortField];
            if (sortField === "invest_amount") {
                va = Number(va || 0); vb = Number(vb || 0);
            } else if (sortField === "invest_date") {
                va = a.invest_date ? new Date(a.invest_date).getTime() : 0;
                vb = b.invest_date ? new Date(b.invest_date).getTime() : 0;
            } else {
                va = String(va || "").toLowerCase();
                vb = String(vb || "").toLowerCase();
            }
            if (va < vb) return sortOrder === "asc" ? -1 : 1;
            if (va > vb) return sortOrder === "asc" ? 1 : -1;
            return 0;
        });

        return list;
    }, [records, search, filterInvestor, filterAck, dateFrom, dateTo, sortField, sortOrder]);

    // pagination
    const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
    const safePage = Math.min(Math.max(1, currentPage), totalPages);
    const startIndex = (safePage - 1) * rowsPerPage;
    const paged = filtered.slice(startIndex, startIndex + rowsPerPage);

    // totals: count only acknowledged amounts
    const visibleTotal = filtered.reduce((s, r) => s + (r.acknowledge === "Acknowledge" ? Number(r.invest_amount || 0) : 0), 0);
    const grandTotalAll = records.reduce((s, r) => s + (r.acknowledge === "Acknowledge" ? Number(r.invest_amount || 0) : 0), 0);

    // open modal for investor
    const openInvestorModal = (investor) => {
        setSelectedInvestor(investor);
        setShowModal(true);
    };
    const closeModal = () => {
        setSelectedInvestor(null);
        setShowModal(false);
    };

    // update acknowledge status on a single record
    // replace setAcknowledgeForRecord in TableInvestment.jsx with this
    const setAcknowledgeForRecord = async (id, status) => {
        if (!id) return;
        const payload = {
            acknowledge: status,
            ackBy: currentUser,
            ackAt: new Date().toISOString(),
        };
        try {
            // update single record correctly under Investments/<id>
            await firebaseDB.child(`Investments/${id}`).update(payload);

            // If status is Acknowledge, optionally apply to all for same investor
            if (status === "Acknowledge") {
                const rec = records.find((r) => r.id === id);
                if (rec) {
                    const sameInvestor = records.filter(
                        (r) => String(r.investor || "").trim() === String(rec.investor || "").trim()
                    );

                    // Build multi-path updates but prefix each path with 'Investments/'
                    const updates = {};
                    sameInvestor.forEach((s) => {
                        updates[`Investments/${s.id}/acknowledge`] = "Acknowledge";
                        updates[`Investments/${s.id}/ackBy`] = currentUser;
                        updates[`Investments/${s.id}/ackAt`] = new Date().toISOString();
                    });

                    // perform multi-path update at root - ALL keys are inside Investments/
                    await firebaseDB.update(updates);
                }
            }
        } catch (err) {
            console.error("Failed to update acknowledge:", err);
            alert("Failed to update acknowledge. See console.");
        }
    };


    // submit clarification by investor (only investor can submit)
    const submitClarification = async (id, text) => {
        if (!id || !text) return;
        try {
            await firebaseDB.child(`Investments/${id}`).update({
                ackClarification: { text: String(text).trim(), by: currentUser, at: new Date().toISOString() },
                acknowledge: "Pending", // set back to pending after clarification
            });
        } catch (err) {
            console.error("Failed to submit clarification:", err);
            alert("Failed to submit clarification. See console.");
        }
    };

    // export the currently filtered rows to CSV
    const exportCSV = () => {
        if (!filtered.length) {
            alert("No rows to export");
            return;
        }
        const rows = filtered.map((r, i) => ({
            "S NO": i + 1,
            Name: String(r.investor || ""),
            Date: String(r.invest_date || ""),
            Amount: r.invest_amount,
            To: String(r.invest_to || ""),
            "Ref No": String(r.invest_reference || ""),
            Purpose: String(r.invest_purpose || ""),
            Comments: String(r.comments || ""),
            Acknowledge: String(r.acknowledge || "Pending"),
        }));
        const header = Object.keys(rows[0]).join(",");
        const csv = [header, ...rows.map((row) => Object.values(row).map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))].join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Investments-export.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // UI helpers for sorting toggles
    const toggleSort = (field) => {
        if (sortField === field) setSortOrder((s) => (s === "asc" ? "desc" : "asc"));
        else {
            setSortField(field);
            setSortOrder("desc");
        }
        setCurrentPage(1);
    };

    // unique investor list (normalized once)
    const investorOptions = useMemo(() => {
        const s = new Set(records.map((r) => String(r.investor || "").trim()).filter(Boolean));
        return Array.from(s).sort();
    }, [records]);

    // Card style helper (simple gradient accents)
    const cardAccent = (i) => {
        const accents = [
            "linear-gradient(120deg,#f6d365 0%,#fda085 100%)",
            "linear-gradient(120deg,#a1c4fd 0%,#c2e9fb 100%)",
            "linear-gradient(120deg,#f5cfeb 0%,#ff84ae 100%)",
            "linear-gradient(120deg,#fbc2eb 0%,#a6c1ee 100%)",
            "linear-gradient(120deg,#d4fc79 0%,#96e6a1 100%)",
            "linear-gradient(120deg,#f093fb 0%,#f5576c 100%)",
        ];
        return accents[i % accents.length];
    };

    return (
        <>
            <h4 className="mb-3">Investments</h4>

            {/* Top: cards per investor (name + acknowledged total + count) */}
            <div className="row g-3 mb-4">
                {groups.length === 0 ? (
                    <div className="col-12">
                        <div className="alert alert-info mb-0 text-white">No investment records found</div>
                    </div>
                ) : (
                    groups.map((g, idx) => (
                        <div key={g.investor} className="invest-wrapper col-md-4">
                            <div
                                className="invest-card h-100 text-dark"
                                role="button"
                                onClick={() => openInvestorModal(g.investor)}
                                title={`Click to view ${g.investor} investments`}
                                style={{
                                    backgroundImage: cardAccent(idx),
                                    color: "#1b1b1b",
                                    border: "none",
                                    boxShadow: "0 8px 18px rgba(0,0,0,0.12)",
                                }}
                            >
                                <div className="card-body d-flex justify-content-between align-items-center">
                                    <div>
                                        <div className="h6 mb-1" style={{ fontWeight: 700 }}>{g.investor}</div>
                                        <div className="small" style={{ opacity: 0.85 }}>{g.count} investment{g.count > 1 ? "s" : ""}</div>
                                    </div>
                                    <div className="text-end">
                                        <div className="h5 mb-0" style={{ fontWeight: 800 }}>₹{fmtCurrency(g.total)}</div>
                                    </div>
                                </div>
                                <div className="card-footer bg-transparent border-0">
                                    <small className="">Click to open details</small>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Filters / Export */}
            <div className="row align-items-center mb-3 g-2">
                <div className="col-md-3">
                    <input className="form-control" placeholder="Search name / purpose / comments..." value={search} onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }} />
                </div>

                <div className="col-md-2">
                    <select className="form-select" value={filterInvestor} onChange={(e) => { setFilterInvestor(e.target.value); setCurrentPage(1); }}>
                        <option value="">All Investors</option>
                        {investorOptions.map((inv) => <option key={inv} value={inv}>{inv}</option>)}
                    </select>
                </div>

                <div className="col-md-2">
                    <select className="form-select" value={filterAck} onChange={(e) => { setFilterAck(e.target.value); setCurrentPage(1); }}>
                        <option value="">All Status</option>
                        <option value="Acknowledge">Acknowledge</option>
                        <option value="Clarification">Clarification</option>
                        <option value="Pending">Pending</option>
                        <option value="Reject">Reject</option>
                    </select>
                </div>

                <div className="col-md-2">
                    <input type="date" className="form-control" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(1); }} />
                </div>

                <div className="col-md-2">
                    <input type="date" className="form-control" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setCurrentPage(1); }} />
                </div>

                <div className="col-md-1 text-end">
                    <button className="btn btn-sm btn-warning" onClick={exportCSV}>Export</button>
                </div>
            </div>

            {/* Main table */}
            <div className="table-responsive mb-3">
                <table className="table table-dark align-middle">
                    <thead className="table-dark">
                        <tr>
                            <th style={{ cursor: "pointer" }} onClick={() => toggleSort("invest_date")}>
                                S No {sortField === "invest_date" ? (sortOrder === "asc" ? "↑" : "↓") : ""}
                            </th>
                            <th style={{ cursor: "pointer" }} onClick={() => toggleSort("investor")}>
                                Name {sortField === "investor" ? (sortOrder === "asc" ? "↑" : "↓") : ""}
                            </th>
                            <th style={{ cursor: "pointer" }} onClick={() => toggleSort("invest_date")}>
                                Date {sortField === "invest_date" ? (sortOrder === "asc" ? "↑" : "↓") : ""}
                            </th>
                            <th style={{ cursor: "pointer" }} onClick={() => toggleSort("invest_amount")}>
                                Amount {sortField === "invest_amount" ? (sortOrder === "asc" ? "↑" : "↓") : ""}
                            </th>
                            <th>To</th>
                            <th>Ref No</th>
                            <th>Purpose</th>
                            {/* <th>Comments</th> */}
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={9}>Loading...</td></tr>
                        ) : paged.length === 0 ? (
                            <tr><td colSpan={9}>No records found</td></tr>
                        ) : (
                            paged.map((r, i) => (
                                <React.Fragment key={r.id}>
                                    <tr role="button" onClick={() => {
                                        setRecord(r);
                                        setEditStatus(statusFromRecord(r));
                                        setEditComment(String(r._raw?.statusComment || r._raw?.ackClarification?.text || ""));
                                        setShowRecord(true);
                                    }} style={{ cursor: "pointer" }}>
                                        <td>{startIndex + i + 1}</td>
                                        <td>{String(r.investor || "")}</td>
                                        <td>
                                            {fmtDate(r.invest_date)}
                                            {r._raw?.createdByName && (
                                                <div className="small-text text-info opacity-75 mt-1">
                                                    Added by <strong>{r._raw.createdByName}</strong>
                                                </div>
                                            )}
                                        </td>

                                        <td>₹{fmtCurrency(r.invest_amount)}</td>
                                        <td>{String(r.invest_to || "")}</td>
                                        <td>{String(r.invest_reference || "")}</td>
                                        <td style={{ whiteSpace: "pre-wrap", maxWidth: 220 }}>{String(r.invest_purpose || "")}</td>
                                        {/* <td style={{ whiteSpace: "pre-wrap", maxWidth: 200 }}>{String(r.comments || "")}</td> */}
                                        <td>
                                            <span className={badgeClass(statusFromRecord(r))}>
                                                {statusFromRecord(r)}
                                            </span>
                                        </td>
                                    </tr>
                                </React.Fragment>
                            ))
                        )}

                        {/* Page total row (only acknowledged amounts included) */}
                        <tr className="table-success">
                            <td colSpan={3}><strong>Visible Total (Acknowledged)</strong></td>
                            <td><strong>₹{fmtCurrency(visibleTotal)}</strong></td>
                            <td colSpan={5}></td>
                        </tr>

                        {/* Grand total all data (only acknowledged) */}
                        <tr className="table-info">
                            <td colSpan={3}><strong>Grand Total (Acknowledged All)</strong></td>
                            <td><strong>₹{fmtCurrency(grandTotalAll)}</strong></td>
                            <td colSpan={5}></td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Pagination controls */}
            <div className="d-flex justify-content-between align-items-center">
                <div>
                    Show{" "}
                    <select value={rowsPerPage} onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}>
                        {pageSizeOptions.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>{" "}
                    entries
                </div>
                <div>
                    Page {safePage} of {totalPages}
                    <button className="btn btn-sm btn-secondary ms-2" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={safePage === 1}>Prev</button>
                    <button className="btn btn-sm btn-secondary ms-2" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}>Next</button>
                </div>
            </div>

            {/* Modal for selected investor */}
            {showModal && selectedInvestor && (
                <InvestorModal
                    investor={selectedInvestor}
                    items={groups.find((g) => g.investor === selectedInvestor)?.items || []}
                    total={groups.find((g) => g.investor === selectedInvestor)?.items?.reduce((s, it) => s + (it.acknowledge === "Acknowledge" ? Number(it.invest_amount || 0) : 0), 0) || 0}
                    onClose={closeModal}
                    fmtDate={fmtDate}
                    fmtCurrency={fmtCurrency}
                />
            )}

            {showRecord && record && (
                <RecordModal
                    item={record}
                    onClose={() => { setShowRecord(false); setRecord(null); }}
                    onSaved={(update) => {
                        setRecords(prev => prev.map(it => it.id === record.id ? {
                            ...it,
                            status: update.status,
                            acknowledge: update.acknowledge,
                            _raw: { ...(it._raw || {}), ...update },
                        } : it));
                    }}
                />
            )}


        </>
    );
}

/* -------------------------
   ClarificationBox - shown to investor (currentUser) when row ack is Clarification or Reject
   ------------------------- */
function ClarificationBox({ existing, onSubmit }) {
    const [text, setText] = useState(existing?.text || "");
    const [sending, setSending] = useState(false);

    const handleSend = async () => {
        if (!text || !text.trim()) return;
        setSending(true);
        try {
            await onSubmit(text.trim());
            setText("");
        } catch (err) {
            console.error(err);
            alert("Failed to send clarification");
        } finally {
            setSending(false);
        }
    };

    return (
        <div>
            <textarea
                className="form-control form-control-sm mb-1"
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={2}
                placeholder="Provide clarification..."
                style={{ borderColor: "#dc3545", background: "#fff5f5" }}
            />
            <div className="d-flex justify-content-end">
                <button className="btn btn-sm btn-danger" onClick={handleSend} disabled={sending || !text.trim()}>
                    {sending ? "Sending..." : "Submit"}
                </button>
            </div>
        </div>
    );
}

/* -------------------------
   InvestorModal - shows detailed table of investor items
   ------------------------- */
function InvestorModal({ investor, items = [], total = 0, onClose, fmtDate, fmtCurrency }) {
    return (
        <div className="modal fade show d-block" tabIndex="-1" style={{ background: "rgba(0,0,0,0.5)" }}>
            <div className="modal-dialog modal-xl modal-dialog-scrollable">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">Investments — {investor}</h5>
                        <button type="button" className="btn-close" onClick={onClose}></button>
                    </div>

                    <div className="modal-body">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <div>
                                <strong>{investor}</strong>
                                <div className="small ">Acknowledged total: ₹{fmtCurrency(total)} • {items.length} investment{items.length > 1 ? "s" : ""}</div>
                            </div>
                            <div>
                                <button className="btn btn-sm btn-secondary me-2" onClick={() => {
                                    if (!items.length) return;
                                    const payload = items.map((it, i) => ({
                                        "S NO": i + 1,
                                        Name: it.investor,
                                        Date: it.invest_date,
                                        Amount: it.invest_amount,
                                        To: it.invest_to,
                                        "Ref No": it.invest_reference,
                                        Purpose: it.invest_purpose,
                                        Comments: it.comments || "",
                                        Acknowledge: it.acknowledge || "Pending",
                                    }));
                                    const header = Object.keys(payload[0]).join(",");
                                    const csv = [header, ...payload.map(r => Object.values(r).map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))].join("\n");
                                    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement("a");
                                    a.href = url;
                                    a.download = `${investor}-investments.csv`;
                                    a.click();
                                    URL.revokeObjectURL(url);
                                }}>Export CSV</button>

                                <button className="btn btn-primary" onClick={onClose}>Close</button>
                            </div>
                        </div>

                        <div className="table-responsive">
                            <table className="table table-dark table-hover">
                                <thead className="table-light">
                                    <tr>
                                        <th>S No</th>
                                        <th>Date</th>
                                        <th>Amount</th>
                                        <th>To</th>
                                        <th>Ref No</th>
                                        <th>Purpose</th>
                                        <th>Comments</th>
                                        <th>Ack Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.length === 0 && <tr><td colSpan={8}>No records</td></tr>}
                                    {items.map((it, idx) => (
                                        <tr key={it.id}>
                                            <td>{idx + 1}</td>
                                            <td>{fmtDate(it.invest_date)}</td>
                                            <td>₹{fmtCurrency(it.invest_amount)}</td>
                                            <td>{String(it.invest_to || "")}</td>
                                            <td>{String(it.invest_reference || "")}</td>
                                            <td style={{ whiteSpace: "pre-wrap" }}>{String(it.invest_purpose || "")}</td>
                                            <td style={{ whiteSpace: "pre-wrap" }}>{String(it.comments || "")}</td>
                                            <td>{String(it.acknowledge || "Pending")}</td>
                                        </tr>
                                    ))}

                                    <tr className="table-success">
                                        <td colSpan={2}><strong>Total (Acknowledged)</strong></td>
                                        <td><strong>₹{fmtCurrency(total)}</strong></td>
                                        <td colSpan={5}></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}

function RecordModal({ item, onClose, onSaved }) {
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState("Pending");
    const [comment, setComment] = useState("");

    const { user: authUser } = useAuth?.() || {};
    const myId = getEffectiveUserId(authUser);
    const myName = getEffectiveUserName(authUser);

    const creatorId = item?._raw?.createdById || item?.createdById || null;
    const isCreator = myId && creatorId && myId === creatorId;
    const approvals = item?._raw?.approvals || {};
    const statusHistory = Array.isArray(item?._raw?.statusHistory) ? item._raw.statusHistory : [];

    // Founders map (fallback labels only). Real names are fetched below.
    const FOUNDER_LABELS = {
        "user_1759689202840_mk3hv8na5": "X",
        "user_1759817693513_jw2nqfabw": "Y",
        "user_1759817693513_jw2nqfcoz": "Z",
    };

    // Compute the two approvers dynamically (all founders except the creator)
    const approverUids = Array.from(FOUNDERS).filter((uid) => uid !== creatorId);

    // --- Dynamically resolve real names for Approval-1/2 (from approvals/by or Users/<uid>) ---
    const [approverNames, setApproverNames] = useState({});
    useEffect(() => {
        if (!item) return;

        // base: use whatever is already in approvals[uid].by (if present)
        const base = {};
        approverUids.forEach((uid) => {
            base[uid] = approvals?.[uid]?.by || base[uid] || null;
        });

        setApproverNames((prev) => ({ ...prev, ...base }));

        // fetch from DB if missing
        const fetchName = async (uid) => {
            try {
                // try /Users/<uid>, then /users/<uid>
                const snap1 = await firebaseDB.child(`Users/${uid}`).get();
                const snap2 = snap1.exists() ? null : await firebaseDB.child(`users/${uid}`).get();
                const val = snap1.exists() ? snap1.val() : snap2?.val() || {};
                const nm =
                    val.name ||
                    val.displayName ||
                    val.dbName ||
                    val.username ||
                    (val.email ? String(val.email).replace(/@.*/, "") : "") ||
                    null;
                if (nm) setApproverNames((prev) => ({ ...prev, [uid]: nm }));
            } catch {
                /* ignore */
            }
        };

        approverUids.forEach((uid) => {
            if (!base[uid]) fetchName(uid);
        });

        // also set current status/comment from record
        setStatus(statusFromRecord(item));
        setComment(item._raw?.statusComment || "");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [item, creatorId]);

    const fmt = (d) => (d ? new Date(d).toLocaleString("en-GB") : "");

    // Helper for approver card meta
    const approverMeta = (uid) => {
        const a = approvals?.[uid] || {};
        const name = approverNames[uid] || FOUNDER_LABELS[uid] || "Founder";
        const at = a.at ? new Date(a.at).toLocaleString("en-GB") : null;
        let st = "Pending";
        if (a.rejected) st = "Reject";
        else if (a.clarification) st = "Clarification";
        else if (a.approved) st = "Approve";
        return { name, at, status: st };
    };

    const saveStatus = async () => {
        if (!item?.id || !myId) return;
        setSaving(true);
        try {
            const now = new Date().toISOString();
            const nextApprovals = { ...(approvals || {}) };
            let nextStatus = "Pending";
            let rejectFlag = false;
            let clarificationFlag = false;

            // Only founders can act
            if (FOUNDERS.has(myId)) {
                if (status === "Approve") {
                    nextApprovals[myId] = {
                        approved: true,
                        rejected: false,
                        clarification: false,
                        comment: comment || "",
                        by: myName,
                        at: now,
                    };
                } else if (status === "Reject") {
                    nextApprovals[myId] = {
                        approved: false,
                        rejected: true,
                        clarification: false,
                        comment: comment || "",
                        by: myName,
                        at: now,
                    };
                    rejectFlag = true;
                } else if (status === "Clarification") {
                    nextApprovals[myId] = {
                        approved: false,
                        rejected: false,
                        clarification: true,
                        comment: comment || "",
                        by: myName,
                        at: now,
                    };
                    clarificationFlag = true;
                } else {
                    // Pending: clear my explicit flags
                    const prev = nextApprovals[myId] || {};
                    nextApprovals[myId] = {
                        ...prev,
                        approved: false,
                        rejected: false,
                        clarification: false,
                        comment: comment || prev.comment || "",
                        by: myName,
                        at: now,
                    };
                }
            }

            // Compute final status
            if (rejectFlag) {
                nextStatus = "Reject";
            } else if (clarificationFlag) {
                nextStatus = "Clarification";
            } else {
                // Count approvals from non-creator founders
                let approverCount = 0;
                for (const [uid, a] of Object.entries(nextApprovals)) {
                    if (uid !== creatorId && a?.approved) approverCount++;
                }
                nextStatus = approverCount >= 2 ? "Approve" : "Pending";
            }

            // Legacy mirror
            const acknowledge = nextStatus === "Approve" ? "Acknowledge" : nextStatus;

            // Append status history
            const nextHistory = [
                ...statusHistory,
                { by: myName, byId: myId, at: now, status: nextStatus, text: comment || "" },
            ];

            const update = {
                status: nextStatus,
                acknowledge,
                statusComment: comment || null,
                statusBy: myName,
                statusAt: now,
                approvals: nextApprovals,
                statusHistory: nextHistory,
            };

            await firebaseDB.child(`Investments/${item.id}`).update(update);

            // reflect to parent
            onSaved && onSaved(update);

            // ✅ reset the status comment after save (so it shows empty immediately)
            setComment("");

            onClose();
        } catch (e) {
            alert("Failed to update status.");
        } finally {
            setSaving(false);
        }
    };

    const [ap1, ap2] = approverUids.map(approverMeta);

    return (
        <div className="modal fade show d-block" tabIndex="-1" style={{ background: "rgba(0,0,0,0.5)" }}>
            <div className="modal-dialog modal-lg modal-dialog-scrollable">
                <div className="modal-content" style={{ border: "none", borderRadius: "12px", overflow: "hidden" }}>
                    <div className="modal-header" style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", color: "white", borderBottom: "none", padding: "1.5rem" }}>
                        <div className="d-flex align-items-center w-100">
                            <div className="flex-grow-1">
                                <h5 className="modal-title mb-1" style={{ fontWeight: 600 }}>📊 Investment Details</h5>
                                <div className="small opacity-85">Investment Overview & Status Management</div>
                            </div>
                            <button type="button" className="btn-close btn-close-white" onClick={onClose} disabled={saving}></button>
                        </div>
                    </div>

                    <div className="modal-body" style={{ background: "#f8f9fa", padding: 0 }}>
                        {!item ? null : (
                            <div className="container-fluid p-4">
                                <div className="card bg-white mb-4" style={{ border: "none", borderRadius: 10, boxShadow: "0 2px 15px rgba(0,0,0,0.08)" }}>
                                    <div className="card-body p-4">
                                        <div className="row g-4">
                                            <div className="col-12 d-flex justify-content-between align-items-end mb-3">
                                                <div>
                                                    <div className="small mb-1">Investment Amount</div>
                                                    <div className="h3 fw-bold text-primary">₹{(Number(item.invest_amount || 0)).toLocaleString("en-IN")}</div>
                                                </div>
                                                <span className={badgeClass(status) + " fs-6 px-3 py-2"}>{status}</span>
                                            </div>

                                            <div className="col-md-6">
                                                <div className="card bg-light border-0 h-100"><div className="card-body">
                                                    <div className="small mb-2">👤 Investor</div>
                                                    <div className="h6 mb-0 text-dark">{item.investor || "—"}</div>
                                                </div></div>
                                            </div>
                                            <div className="col-md-6">
                                                <div className="card bg-light border-0 h-100"><div className="card-body">
                                                    <div className="small mb-2">📅 Date</div>
                                                    <div className="fw-semibold text-dark">{item.invest_date ? new Date(item.invest_date).toLocaleDateString("en-GB") : "—"}</div>
                                                </div></div>
                                            </div>

                                            <div className="col-md-6">
                                                <div className="card bg-light border-0 h-100"><div className="card-body">
                                                    <div className="small mb-2">🎯 To</div>
                                                    <div className="text-dark">{item.invest_to || "—"}</div>
                                                </div></div>
                                            </div>
                                            <div className="col-md-6">
                                                <div className="card bg-light border-0 h-100"><div className="card-body">
                                                    <div className="small mb-2">🔗 Ref No</div>
                                                    <div className="text-dark">{item.invest_reference || "—"}</div>
                                                </div></div>
                                            </div>

                                            <div className="col-md-6">
                                                <div className="card bg-light border-0"><div className="card-body">
                                                    <div className="small mb-2">🎯 Purpose</div>
                                                    <div style={{ whiteSpace: "pre-wrap" }} className="text-dark mb-2">{item.invest_purpose || "—"}</div>
                                                </div></div>
                                            </div>

                                            <div className="col-md-6">
                                                <div className="card bg-light border-0"><div className="card-body">
                                                    <div className="small mb-2">Status</div>
                                                    <select
                                                        className="form-select"
                                                        value={status}
                                                        onChange={(e) => setStatus(e.target.value)}
                                                        disabled={saving || isCreator}
                                                        title={isCreator ? "Creator cannot change status" : ""}
                                                        style={{ borderRadius: 8, border: "none" }}
                                                    >
                                                        <option value="Pending">⏳ Pending</option>
                                                        <option value="Approve">✅ Approve</option>
                                                        <option value="Reject">❌ Reject</option>
                                                        <option value="Clarification">❓ Clarification</option>
                                                    </select>
                                                    {isCreator && <div className="form-text text-warning mt-1">You created this entry. Only other founders can approve or change status.</div>}
                                                </div></div>
                                            </div>

                                            <div className="col-12">
                                                <div className="card bg-light border-0"><div className="card-body">
                                                    <div className="small mb-2">💬 Comments</div>
                                                    <div style={{ whiteSpace: "pre-wrap" }} className="text-dark">{item.comments || "—"}</div>
                                                </div></div>
                                            </div>

                                            {/* Creator + Dynamic Approver Cards */}
                                            <div className="row g-3">
                                                <div className="col-4">
                                                    <div className="card border-0 h-100" style={{ background: "linear-gradient(135deg,#f093fb 0%,#f5576c 100%)", color: "white" }}>
                                                        <div className="card-body">
                                                            <div className="small opacity-85 mb-2">👤 Created By</div>
                                                            <div className="d-flex justify-content-between align-items-center">
                                                                <strong>{item._raw?.createdByName || "System"}</strong>

                                                            </div>
                                                            <div>
                                                                {item._raw?.createdAt ? <span className="small-text text-white opacity-85">{fmt(item._raw.createdAt)}</span> : null}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="col-4">
                                                    {approverUids[0] ? (() => {
                                                        const m = approverMeta(approverUids[0]);
                                                        return (
                                                            <div className="card border-0 h-100" style={{ background: "linear-gradient(135deg,#84fab0 0%,#8fd3f4 100%)", color: "white" }}>
                                                                <div className="card-body">
                                                                    <div className="small opacity-85 mb-2">👤 Approval-1</div>
                                                                    <div className="d-flex justify-content-between align-items-center">
                                                                        <strong>{m.name}</strong>
                                                                        {/* <span className={badgeClass(m.status)}>{m.status}</span> */}
                                                                    </div>
                                                                    <div>
                                                                        {m.at ? <div className="small-text text-white opacity-85 mt-1">{m.at}</div> : null}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })() : null}
                                                </div>

                                                <div className="col-4">
                                                    {approverUids[1] ? (() => {
                                                        const m = approverMeta(approverUids[1]);
                                                        return (
                                                            <div className="card border-0 h-100" style={{ background: "linear-gradient(135deg,#FCCF31 0%,#F55555 100%)", color: "white" }}>
                                                                <div className="card-body">
                                                                    <div className="small opacity-85 mb-2">👤 Approval-2</div>
                                                                    <div className="d-flex justify-content-between align-items-center">
                                                                        <strong>{m.name}</strong>
                                                                        {/* <span className={badgeClass(m.status)}>{m.status}</span> */}
                                                                    </div>
                                                                    <div>
                                                                        {m.at ? <div className="small opacity-85 mt-1">{m.at}</div> : null}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })() : null}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Status Comment Card + history */}
                                <div className="card" style={{ border: "none", borderRadius: 10, boxShadow: "0 2px 15px rgba(0,0,0,0.08)", background: "linear-gradient(135deg,#4facfe 0%,#00f2fe 100%)", color: "white" }}>
                                    <div className="card-body p-4">
                                        <div className="row g-3">
                                            <h6 className="text-white mb-1" style={{ fontWeight: 600 }}>🔄 Status Comments</h6>

                                            {!!statusHistory?.length && (
                                                <div className="col-12">
                                                    <div className="small text-white mb-2">Previous updates</div>
                                                    <ul className="list-unstyled mb-2">
                                                        {statusHistory.map((h, i) => (
                                                            <li key={i} className="mb-2 card bg-white">
                                                                <div className="card-body">
                                                                    {/* <div>{h.text ? (<><span className={badgeClass(h.status)} style={{ marginRight: 8 }}>{h.status}</span> — {h.text}</>) : null}</div> */}
                                                                    <div>{h.text}</div>
                                                                    <div className="small-text opacity-75 mt-2">
                                                                        <>{h.by || "—"}</>
                                                                        {h.at ? <> • {fmt(h.at)}</> : null}
                                                                    </div>
                                                                </div>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}

                                            <div className="col-12">
                                                <textarea
                                                    className="form-control"
                                                    rows={2}
                                                    value={comment}
                                                    onChange={(e) => setComment(e.target.value)}
                                                    placeholder="Reason / note for this status..."
                                                    disabled={saving || isCreator}
                                                    style={{ borderRadius: 8, border: "none" }}
                                                />
                                                {isCreator && <div className="form-text text-warning">You created this entry. Only other founders can add status comments.</div>}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="modal-footer" style={{ background: "white", borderTop: "1px solid #e9ecef", padding: "1.25rem 1.5rem" }}>
                        <div className="d-flex justify-content-between w-100 align-items-center">
                            <div className="d-flex align-items-center">
                                <span className="small me-2">Current Status:</span>
                                <span className={badgeClass(status) + " px-3 py-2"}>{status}</span>
                            </div>
                            <div>
                                <button className="btn btn-outline-secondary me-2" onClick={onClose} disabled={saving} style={{ borderRadius: 8, padding: "0.5rem 1.25rem" }}>
                                    Close
                                </button>
                                <button
                                    className="btn btn-primary"
                                    onClick={saveStatus}
                                    disabled={saving || isCreator}
                                    style={{ borderRadius: 8, padding: "0.5rem 1.25rem", background: "linear-gradient(135deg,#667eea 0%,#764ba2 100%)", border: "none" }}
                                >
                                    {saving ? (<><span className="spinner-border spinner-border-sm me-2"></span>Saving...</>) : ("💾 Save Changes")}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}


