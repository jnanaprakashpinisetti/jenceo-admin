// TableInvestment.jsx
import React, { useEffect, useMemo, useState } from "react";
import firebaseDB from "../../firebase";

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
    const setAcknowledgeForRecord = async (id, status) => {
        if (!id) return;
        const payload = {
            acknowledge: status,
            ackBy: currentUser,
            ackAt: new Date().toISOString(),
        };
        try {
            await firebaseDB.child(`Investments/${id}`).update(payload);

            // if status is Acknowledge, optionally apply to all for same investor (keeps previous behavior)
            if (status === "Acknowledge") {
                const rec = records.find((r) => r.id === id);
                if (rec) {
                    const sameInvestor = records.filter((r) => String(r.investor || "").trim() === String(rec.investor || "").trim());
                    const updates = {};
                    sameInvestor.forEach((s) => {
                        updates[`${s.id}/acknowledge`] = "Acknowledge";
                        updates[`${s.id}/ackBy`] = currentUser;
                        updates[`${s.id}/ackAt`] = new Date().toISOString();
                    });
                    // multi-path update; firebaseDB should support update at root
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
        <div className="container py-3">
            <h4 className="mb-3">Investments</h4>

            {/* Top: cards per investor (name + acknowledged total + count) */}
            <div className="row g-3 mb-4">
                {groups.length === 0 ? (
                    <div className="col-12">
                        <div className="alert alert-secondary mb-0">No investment records found</div>
                    </div>
                ) : (
                    groups.map((g, idx) => (
                        <div key={g.investor} className="col-sm-12 col-md-4">
                            <div
                                className="card invest-card h-100 text-dark"
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
                                    <small className="text-muted">Click to open details</small>
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
                            <th>Comments</th>
                            <th>Acknowledge</th>
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
                                    <tr>
                                        <td>{startIndex + i + 1}</td>
                                        <td>{String(r.investor || "")}</td>
                                        <td>{fmtDate(r.invest_date)}</td>
                                        <td>₹{fmtCurrency(r.invest_amount)}</td>
                                        <td>{String(r.invest_to || "")}</td>
                                        <td>{String(r.invest_reference || "")}</td>
                                        <td style={{ whiteSpace: "pre-wrap", maxWidth: 220 }}>{String(r.invest_purpose || "")}</td>
                                        <td style={{ whiteSpace: "pre-wrap", maxWidth: 200 }}>{String(r.comments || "")}</td>
                                        <td style={{ minWidth: 200 }}>
                                            <select
                                                className="form-select form-select-sm mb-1"
                                                value={String(r.acknowledge || "Pending")}
                                                onChange={(e) => setAcknowledgeForRecord(r.id, e.target.value)}
                                            >
                                                <option value="Acknowledge">Acknowledge</option>
                                                <option value="Clarification">Clarification</option>
                                                <option value="Pending">Pending</option>
                                                <option value="Reject">Reject</option>
                                            </select>

                                            {/* Clarification box: only visible to the investor who created the record */}
                                            {(String(r.acknowledge) === "Clarification" || String(r.acknowledge) === "Reject")
                                                && String(r.investor || "").toLowerCase() === String(currentUser || "").toLowerCase() && (
                                                    <ClarificationBox
                                                        existing={r.ackClarification}
                                                        onSubmit={(text) => submitClarification(r.id, text)}
                                                    />
                                                )}

                                            {/* show meta */}
                                            {r.ackAt && (
                                                <div className="small text-muted mt-1">
                                                    {r.ackBy ? `${r.ackBy} • ` : ""}{r.ackAt ? new Date(r.ackAt).toLocaleString() : ""}
                                                </div>
                                            )}
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
        </div>
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
                                <div className="small text-muted">Acknowledged total: ₹{fmtCurrency(total)} • {items.length} investment{items.length > 1 ? "s" : ""}</div>
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
