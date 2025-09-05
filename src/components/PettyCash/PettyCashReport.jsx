// src/.../PettyCashReport.jsx
import React, { useEffect, useState, useRef, useMemo } from "react";
import firebaseDB from "../../firebase";
import { Tabs, Tab } from "react-bootstrap";
import * as XLSX from "xlsx";

/**
 * PettyCashReport.jsx (with monthly Main-Category cards)
 *
 * - Year tabs (2024..2035), Month tabs (Jan..Dec)
 * - Monthly cards: show main category totals + top subcategory lines
 * - Manager-only approval + Employee clarifications (existing)
 *
 * UI suggestions:
 *  - Cards are for quick scan; table below for details (implemented)
 *  - Add "Pending approvals" quick filter for managers (optional)
 *  - Consider sparkline or small trend chart inside cards (optional)
 *  - Consider caching aggregates in server / cloud function when dataset grows
 *
 * Props:
 *  - currentUser (string) optional, default "Admin"
 *  - currentUserRole ("employee" | "manager") optional, default "employee"
 */

export default function PettyCashReport({ currentUser = "Admin", currentUserRole = "employee" }) {
  const [data, setData] = useState([]);
  const [activeYear, setActiveYear] = useState(String(new Date().getFullYear()));
  const [activeMonth, setActiveMonth] = useState("");
  const [search, setSearch] = useState("");
  const [mainCategory, setMainCategory] = useState("");
  const [subCategory, setSubCategory] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const tableRef = useRef(null);

  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];

  // Years 2024..2035
  const years = Array.from({ length: 2035 - 2024 + 1 }, (_, i) => String(2024 + i));

  // Fetch Data from Realtime DB
  useEffect(() => {
    const ref = firebaseDB.child("PettyCash/admin");
    const onValue = (snapshot) => {
      if (snapshot.exists()) {
        const records = [];
        snapshot.forEach((child) => {
          records.push({ id: child.key, ...child.val() });
        });
        records.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
        setData(records);
        if (!activeYear) setActiveYear(String(new Date().getFullYear()));
        if (!activeMonth) setActiveMonth(months[new Date().getMonth()]);
      } else {
        setData([]);
      }
    };

    ref.on("value", onValue);
    return () => ref.off("value", onValue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Records for selected year and month (unfiltered)
  const recordsForYearMonth = useMemo(() => {
    const filteredByYear = data.filter((d) => {
      if (!d.date) return false;
      const dt = new Date(d.date);
      return String(dt.getFullYear()) === activeYear;
    });

    if (activeMonth) {
      return filteredByYear.filter((d) => {
        if (!d.date) return false;
        const dt = new Date(d.date);
        return months[dt.getMonth()] === activeMonth;
      });
    }
    return filteredByYear;
  }, [data, activeYear, activeMonth]);

  // Apply UI filters on top of selected year/month
  const applyFilters = (records) => {
    let recordsFiltered = [...records];

    if (search) {
      const q = search.toLowerCase();
      recordsFiltered = recordsFiltered.filter((r) =>
        (r.description || "").toLowerCase().includes(q) ||
        (r.comments || "").toLowerCase().includes(q) ||
        (r.mainCategory || "").toLowerCase().includes(q) ||
        (r.subCategory || "").toLowerCase().includes(q)
      );
    }

    if (mainCategory) recordsFiltered = recordsFiltered.filter((r) => r.mainCategory === mainCategory);
    if (subCategory) recordsFiltered = recordsFiltered.filter((r) => r.subCategory === subCategory);
    if (dateFrom) recordsFiltered = recordsFiltered.filter((r) => new Date(r.date) >= new Date(dateFrom));
    if (dateTo) recordsFiltered = recordsFiltered.filter((r) => new Date(r.date) <= new Date(dateTo));

    return recordsFiltered;
  };

  const filteredRecords = applyFilters(recordsForYearMonth);

  // pagination helpers
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / rowsPerPage));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const indexOfLast = safePage * rowsPerPage;
  const indexOfFirst = indexOfLast - rowsPerPage;
  const pageItems = filteredRecords.slice(indexOfFirst, indexOfLast);

  useEffect(() => { setCurrentPage(1); }, [search, mainCategory, subCategory, dateFrom, dateTo, activeYear, activeMonth, rowsPerPage]);

  // Export Excel (include PurchasedBy, Approval, Clarification Response)
  const exportExcel = (records, label) => {
    const exportData = records.map((r) => ({
      Date: r.date,
      "Main Category": r.mainCategory,
      "Sub Category": r.subCategory,
      Description: r.description,
      Quantity: r.quantity,
      Price: r.price,
      Total: r.total,
      Comments: r.comments,
      "Purchased By": r.employeeName || "",
      Approval: r.approval || "Pending",
      "Clarification Response": r.clarificationResponse?.text || "",
      "Clarification By": r.clarificationResponse?.responseBy || "",
      "Clarification At": r.clarificationResponse?.responseAt || "",
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${label}-PettyCash`);
    XLSX.writeFile(wb, `${label}-PettyCash.xlsx`);
  };

  // Summary: include Assets
  const categoryColors = {
    Food: "table-success",
    "Office Maintenance": "table-warning",
    Marketing: "table-secondary",
    Stationery: "table-info",
    Medical: "table-danger",
    Welfare: "table-primary",
    Assets: "table-light",
  };

  // Subcategories including Assets
  const subCategories = [
    { cat: "Food", items: ["Groceries", "Vegetables", "Non-Veg", "Curd / Milk", "Tiffins", "Meals", "Curries", "Water Cans", "Client Food", "Snacks"] },
    { cat: "Office Maintenance", items: ["Office Rent", "Electricity Bill", "Water Bill", "Internet Bill", "Mobile Bill", "Repairs & Maintenance", "Waste Disposal"] },
    { cat: "Marketing", items: ["Apana Fee", "Worker India Fee", "Lamination Covers", "Printings", "Digital Marketing", "Offline Marketing", "Adds", "Off-Food", "Off-Snacks", "Off-Breakfast", "Off-Lunch", "Off-Dinner", "Off-Staying", "Petrol", "Transport", "Health", "Others"] },
    { cat: "Stationery", items: ["Books", "Files", "Papers", "Stationery", "Office Equipment", "IT Accessories", "Others"] },
    { cat: "Medical", items: ["For Staff", "For Workers", "First Aid", "Tablets", "Insurance"] },
    { cat: "Welfare", items: ["Team Outings", "Team Lunch", "Movies", "Gifts", "Festivals", "Entertainment"] },
    {
      cat: "Assets", items: [
        "Furniture",
        "Electronics",
        "IT Equipment",
        "Kitchen Items",
        "Vehicles",
        "Lands",
        "Properties",
        "Domain",
        "Investments",
        "Software",
        "Advances",
      ]
    },
  ];

  // Build summary totals across years/months (global)
  const buildSummary = () => {
    const summary = {};
    subCategories.forEach((block) => {
      block.items.forEach((sub) => {
        summary[sub] = {};
        months.forEach((m) => (summary[sub][m] = 0));
        summary[sub]["Total"] = 0;
      });
    });

    data.forEach((d) => {
      const dateStr = d.date;
      if (!dateStr) return;
      const dt = new Date(dateStr);
      if (isNaN(dt.getTime())) return;
      const m = months[dt.getMonth()];
      const sub = d.subCategory;
      if (!sub) return;
      if (summary[sub]) {
        const amt = Number(d.total || 0);
        summary[sub][m] += amt;
        summary[sub]["Total"] += amt;
      }
    });
    return summary;
  };

  const summaryData = buildSummary();

  const monthTotals = {};
  months.forEach((m) => (monthTotals[m] = 0));
  let grandTotal = 0;
  Object.values(summaryData).forEach((row) => {
    months.forEach((m) => (monthTotals[m] += row[m]));
    grandTotal += row.Total;
  });

  /* -------------------------
     Approval and Clarification logic
     ------------------------- */

  // Manager only: can change approval. Employee: cannot change (disabled).
  // Employee (who created) gets a red textarea when approval === 'Need Clarification' or 'Reject'
  // Employee submits clarification -> saved to DB under clarificationResponse { text, responseBy, responseAt }
  // Manager can then change approval after clarificationResponse exists.

  const handleApprovalChange = async (id, value) => {
    if (!id) return;
    // enforce role: only manager can change
    if (currentUserRole !== "manager") {
      alert("Only managers can change approval.");
      return;
    }
    try {
      await firebaseDB.child(`PettyCash/admin/${id}`).update({
        approval: value,
        approvalBy: currentUser,
        approvalAt: new Date().toISOString(),
      });
      setData((prev) => prev.map((r) => (r.id === id ? { ...r, approval: value, approvalBy: currentUser, approvalAt: new Date().toISOString() } : r)));
    } catch (err) {
      console.error("Failed to update approval:", err);
      alert("Failed to update approval. See console for details.");
    }
  };

  const handleEmployeeClarificationSubmit = async (id, text) => {
    if (!id) return;
    if (!text || !text.trim()) { alert("Please enter clarification text"); return; }
    // ensure employee owns the record
    const rec = data.find((d) => d.id === id);
    if (!rec) return;
    if ((rec.employeeName || "").toLowerCase() !== (currentUser || "").toLowerCase()) {
      alert("You can only respond to clarifications for your own entries.");
      return;
    }
    try {
      const payload = {
        clarificationResponse: {
          text: text.trim(),
          responseBy: currentUser,
          responseAt: new Date().toISOString(),
        },
        // optionally set approval to Pending so manager will review
        approval: "Pending",
      };
      await firebaseDB.child(`PettyCash/admin/${id}`).update(payload);
      setData((prev) => prev.map((r) => (r.id === id ? { ...r, ...payload } : r)));
    } catch (err) {
      console.error("Failed to submit clarification:", err);
      alert("Failed to submit clarification. See console for details.");
    }
  };

  // Unique options for main/sub category filters from loaded data
  const mainOptions = [...new Set(data.map((d) => d.mainCategory).filter(Boolean))];
  const subOptions = mainCategory ? [...new Set(data.filter((d) => d.mainCategory === mainCategory).map((d) => d.subCategory).filter(Boolean))] : [];

  // small helper to check if employee should show clarif textarea
  const shouldShowClarificationBox = (item) => {
    const status = (item.approval || "Pending");
    const isClarOrReject = status === "Need Clarification" || status === "Reject";
    const employeeOwns = (item.employeeName || "").toLowerCase() === (currentUser || "").toLowerCase();
    return isClarOrReject && currentUserRole === "employee" && employeeOwns;
  };

  /* -------------------------
     Monthly main-category totals (for the selected month)
     ------------------------- */
  const monthMainCategoryTotals = useMemo(() => {
    // use recordsForYearMonth (unfiltered by search/main/sub) because cards should reflect month totals
    const totals = {};
    recordsForYearMonth.forEach((r) => {
      const main = r.mainCategory || "Uncategorized";
      totals[main] = totals[main] || { total: 0, sub: {} };
      totals[main].total += Number(r.total || 0);

      const sub = r.subCategory || "Other";
      totals[main].sub[sub] = (totals[main].sub[sub] || 0) + Number(r.total || 0);
    });
    return totals; // { main: { total: Number, sub: { subName: Number } } }
  }, [recordsForYearMonth]);

  // Helper to format number
  const fmt = (n) => Number(n || 0).toLocaleString();

  return (
    <div className="container-fluid mt-4 pettyCash-report">
      <h3 className="mb-3 opacity-85">Petty Cash Report</h3>

      {/* Year Tabs (2024..2035) */}
      <Tabs
        id="petty-cash-years"
        activeKey={activeYear}
        onSelect={(k) => {
          setActiveYear(k);
          const curYear = String(new Date().getFullYear());
          if (k === curYear) setActiveMonth(months[new Date().getMonth()]);
          else setActiveMonth("");
          setCurrentPage(1);
        }}
        className="mb-3 petty-cash-years"
      >
        {years.map((y) => (
          <Tab eventKey={y} title={y} key={y}>
            <Tabs
              id={`months-${y}`}
              activeKey={activeMonth}
              onSelect={(m) => { setActiveMonth(m); setCurrentPage(1); }}
              className="mb-3 pettycash-month"
            >
              {months.map((m) => {
                // records for this y+m
                const records = data.filter((d) => {
                  if (!d.date) return false;
                  const dt = new Date(d.date);
                  return String(dt.getFullYear()) === y && months[dt.getMonth()] === m;
                });

                // filteredRecords scoped to this month+year and current UI filters
                const filteredRecords = applyFilters(records);

                return (
                  <Tab eventKey={m} title={`${m} (${records.length})`} key={m}>
                    {/* --- Monthly cards (main category totals) --- */}
                    <div className="mb-3">
                      <h6 className="mb-2 opacity-75">Monthly Overview — Main Category Totals</h6>
                      <div className="row g-3">
                        {Object.keys(monthMainCategoryTotals).length === 0 && (
                          <div className="col-12">
                            <div className="alert alert-secondary mb-0">No data for this month</div>
                          </div>
                        )}
                        {Object.entries(monthMainCategoryTotals).map(([main, info]) => (
                          <div className="col-12 col-md-3 col-lg-2" key={main}>
                            <div className="card h-100 shadow-sm">
                              <div className="card-body">
                                <div className="d-flex justify-content-between align-items-start">
                                  <div>
                                    <h6 className="card-title mb-1">{main}</h6>
                                    <div className="text-muted small opacity-75">Category total (this month)</div>

                                  </div>
                                  <div>
                                    <h4 className="mb-0">{fmt(info.total)}</h4>
                                  </div>
                                </div>
                                <hr></hr>
                                {/* top subcategory breakdown (up to 5 rows) */}
                                <div className="mt-3">
                                  {Object.entries(info.sub)
                                    .sort((a, b) => b[1] - a[1])
                                    .slice(0, 5)
                                    .map(([subName, subAmt]) => (
                                      <div className="d-flex justify-content-between small" key={subName}>
                                        <div className="text-muted">{subName}</div>
                                        <div><strong>{fmt(subAmt)}</strong></div>
                                      </div>
                                    ))}

                                  {/* if more than 5 subcats, show indicator */}
                                  {Object.keys(info.sub).length > 5 && (
                                    <div className="small text-muted mt-1">+{Object.keys(info.sub).length - 5} more</div>
                                  )}
                                </div>
                              </div>
                              <div className="card-footer bg-transparent">
                                <small className="text-muted opacity-75">Click the category in the filters to view details in the table.</small>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Filters row + export */}
                    <div className="row mb-3">
                      <div className="col-md-3">
                        <input type="text" className="form-control" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
                      </div>
                      <div className="col-md-2">
                        <select className="form-select" value={mainCategory} onChange={(e) => { setMainCategory(e.target.value); setSubCategory(""); }}>
                          <option value="">All Main Categories</option>
                          {mainOptions.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                      </div>
                      <div className="col-md-2">
                        <select className="form-select" value={subCategory} onChange={(e) => setSubCategory(e.target.value)} disabled={!mainCategory}>
                          <option value="">All Sub Categories</option>
                          {subOptions.map((sub) => <option key={sub} value={sub}>{sub}</option>)}
                        </select>
                      </div>
                      <div className="col-md-2">
                        <input type="date" className="form-control" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                      </div>
                      <div className="col-md-2">
                        <input type="date" className="form-control" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                      </div>
                      <div className="col-md-1">
                        <button className="btn btn-primary w-100" onClick={() => exportExcel(filteredRecords, `${y}-${m}`)}>Export</button>
                      </div>
                    </div>

                    {/* Table */}
                    <div className="table-responsive" ref={tableRef}>
                      <table className="table table-dark table-hover">
                        <thead>
                          <tr>
                            <th>S.No</th>
                            <th>Date</th>
                            <th>Main Category</th>
                            <th>Sub Category</th>
                            <th>Description</th>
                            <th>Quantity</th>
                            <th>Price</th>
                            <th>Total</th>
                            <th>Comments</th>
                            <th>Purchased By</th>
                            <th>Approval</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pageItems.map((item, idx) => (
                            <React.Fragment key={item.id}>
                              <tr>
                                <td>{indexOfFirst + idx + 1}</td>
                                <td>{item.date}</td>
                                <td>{item.mainCategory}</td>
                                <td>{item.subCategory}</td>
                                <td>{item.description}</td>
                                <td>{item.quantity}</td>
                                <td>{item.price}</td>
                                <td>{item.total}</td>
                                <td style={{ maxWidth: 220, whiteSpace: "pre-wrap" }}>{item.comments}</td>
                                <td>{item.employeeName || "—"}</td>
                                <td style={{ minWidth: 220 }}>
                                  {/* Approval dropdown – enabled only for manager */}
                                  <select
                                    className="form-select form-select-sm"
                                    value={item.approval || "Pending"}
                                    onChange={(e) => handleApprovalChange(item.id, e.target.value)}
                                    disabled={currentUserRole !== "manager"}
                                  >
                                    <option value="Approve">Approve</option>
                                    <option value="Pending">Pending</option>
                                    <option value="Reject">Reject</option>
                                    <option value="Need Clarification">Need Clarification</option>
                                  </select>

                                  {/* approval meta */}
                                  {item.approvalAt && (
                                    <div><small className="text-muted">By {item.approvalBy || "Manager"} • {new Date(item.approvalAt).toLocaleString()}</small></div>
                                  )}
                                </td>
                              </tr>

                              {/* If Need Clarification or Reject AND current user is the employee who created record -> show red textarea */}
                              {shouldShowClarificationBox(item) && (
                                <tr>
                                  <td colSpan={11}>
                                    <div style={{ border: "1px solid #f5c6cb", background: "#fff5f5", padding: 12 }}>
                                      <label className="form-label">
                                        <strong className="text-danger">Clarification required — please explain</strong>
                                      </label>
                                      {/* Show existing response if any */}
                                      {item.clarificationResponse?.text ? (
                                        <div className="mb-2">
                                          <div style={{ background: "#fff", padding: 8, borderRadius: 4 }}>
                                            <div style={{ fontSize: 12, color: "#6c757d" }}>
                                              <strong>{item.clarificationResponse.responseBy}</strong> • {new Date(item.clarificationResponse.responseAt).toLocaleString()}
                                            </div>
                                            <div style={{ marginTop: 6 }}>{item.clarificationResponse.text}</div>
                                          </div>
                                        </div>
                                      ) : null}

                                      {/* If no response yet, show textarea */}
                                      {!item.clarificationResponse?.text && (
                                        <EmployeeClarificationBox
                                          recordId={item.id}
                                          onSubmit={(text) => handleEmployeeClarificationSubmit(item.id, text)}
                                        />
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          ))}

                          {/* totals row for visible records */}
                          <tr className="table-success">
                            <td colSpan={7}><strong>Page Total</strong></td>
                            <td>
                              <strong>
                                {pageItems.reduce((a, b) => a + Number(b.total || 0), 0).toLocaleString()}
                              </strong>
                            </td>
                            <td colSpan={3}></td>
                          </tr>

                          {/* overall total for this year+month (filteredRecords) */}
                          <tr className="table-info">
                            <td colSpan={7}><strong>Filtered Total</strong></td>
                            <td>
                              <strong>
                                {filteredRecords.reduce((a, b) => a + Number(b.total || 0), 0).toLocaleString()}
                              </strong>
                            </td>
                            <td colSpan={3}></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination controls */}
                    <div className="d-flex justify-content-between align-items-center mt-3">
                      <div>
                        Show{" "}
                        <select value={rowsPerPage} onChange={(e) => setRowsPerPage(Number(e.target.value))}>
                          <option value={10}>10</option>
                          <option value={20}>20</option>
                          <option value={30}>30</option>
                          <option value={50}>50</option>
                          <option value={100}>100</option>
                          <option value={150}>150</option>
                          <option value={200}>200</option>
                        </select>{" "}
                        entries
                      </div>
                      <div>
                        Page {safePage} of {totalPages || 1}
                        <button className="btn btn-sm btn-secondary ms-2" disabled={safePage === 1} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}>Prev</button>
                        <button className="btn btn-sm btn-secondary ms-2" disabled={safePage === totalPages} onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}>Next</button>
                      </div>
                    </div>
                  </Tab>
                );
              })}
            </Tabs>
          </Tab>
        ))}
      </Tabs>

      {/* Category Summary (global) */}
      <div className="d-flex justify-content-between align-items-center mb-2 mt-5">
        <h4 className="opacity-85">Category Wise Summary (All Years)</h4>
      </div>

      <div className="table-responsive">
        <table className="table table-bordered table-hover pettyCash-Category">
          <thead>
            <tr>
              <th>Main Category</th>
              <th>Sub Category</th>
              {months.map((m) => <th key={m}>{m}</th>)}
              <th>Grand Total</th>
            </tr>
          </thead>
          <tbody>
            {subCategories.map((block) => {
              const blockTotals = {};
              months.forEach((m) => (blockTotals[m] = 0));
              let blockGrand = 0;

              block.items.forEach((sub) => {
                months.forEach((m) => {
                  blockTotals[m] += summaryData[sub][m] || 0;
                });
                blockGrand += summaryData[sub]["Total"] || 0;
              });

              return (
                <React.Fragment key={block.cat}>
                  {block.items.map((sub, idx) => (
                    <tr key={sub} className={categoryColors[block.cat] || ""}>
                      {idx === 0 && (
                        <td rowSpan={block.items.length + 1}>
                          <strong>{block.cat}</strong>
                        </td>
                      )}
                      <td>{sub}</td>
                      {months.map((m) => (
                        <td key={m}>
                          {summaryData[sub][m] ? summaryData[sub][m].toLocaleString() : ""}
                        </td>
                      ))}
                      <td><strong>{summaryData[sub]["Total"] ? summaryData[sub]["Total"].toLocaleString() : ""}</strong></td>
                    </tr>
                  ))}
                  <tr className={`table-category-total ${categoryColors[block.cat] || ""}`}>
                    <td><strong>{block.cat} Total</strong></td>
                    {months.map((m) => <td key={m}><strong>{blockTotals[m].toLocaleString()}</strong></td>)}
                    <td><strong>{blockGrand.toLocaleString()}</strong></td>
                  </tr>
                </React.Fragment>
              );
            })}

            {/* Grand Totals */}
            <tr className="table-success sticky-grand-total">
              <td colSpan={2}><strong>Grand Total</strong></td>
              {months.map((m) => <td key={m}><strong>{monthTotals[m].toLocaleString()}</strong></td>)}
              <td><strong>{grandTotal.toLocaleString()}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* -------------------------
   EmployeeClarificationBox component
   ------------------------- */
function EmployeeClarificationBox({ recordId, onSubmit }) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      await onSubmit(text);
      setText("");
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <textarea
        className="form-control"
        rows={3}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Please provide explanation or supporting info..."
        style={{ borderColor: "#dc3545", background: "#fff5f5" }}
      />
      <div className="d-flex justify-content-end mt-2">
        <button className="btn btn-sm btn-danger" onClick={handleSend} disabled={sending || !text.trim()}>
          {sending ? "Submitting..." : "Submit Clarification"}
        </button>
      </div>
    </div>
  );
}
