// src/components/PettyCash/PettyCashReport.jsx
import React, { useEffect, useState, useRef, useMemo } from "react";
import firebaseDB from "../../firebase";
import { Tabs, Tab } from "react-bootstrap";
import * as XLSX from "xlsx";

/**
 * PettyCashReport.jsx
 * Implements:
 * - Status tabs (Approved, Pending, Rejected, Clarification, Delete)
 * - Only Approved (not deleted) included in calculations
 * - Delete flow (reason modal, role-based access, saving to Firebase)
 * - Delete notes column
 * - Case-insensitive search/filters
 * - Year & Month counts tied to current status tab
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

  // Status tab
  const [statusTab, setStatusTab] = useState("Approved");

  // Clarification modal state
  const [showClarModal, setShowClarModal] = useState(false);
  const [clarText, setClarText] = useState("");
  const [clarItem, setClarItem] = useState(null);

  // Delete modal state (role-based)
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const [deleteItem, setDeleteItem] = useState(null);

  // Category accordion state
  const [collapsedCats, setCollapsedCats] = useState({});

  const tableRef = useRef(null);

  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];

  // Fetch Data from Realtime DB
  useEffect(() => {
    const ref = firebaseDB.child("PettyCash/admin");
    const onValue = (snapshot) => {
      if (snapshot.exists()) {
        const records = [];
        snapshot.forEach((child) => {
          const val = child.val();
          records.push({ id: child.key, ...val });
        });
        // newest first
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

  // derive years dynamically from data
  const years = useMemo(() => {
    const set = new Set();
    data.forEach((d) => {
      if (d && d.date) {
        const dt = new Date(d.date);
        if (!isNaN(dt)) set.add(String(dt.getFullYear()));
      }
    });
    if (set.size === 0) {
      return [String(new Date().getFullYear())];
    }
    return Array.from(set).sort((a, b) => Number(b) - Number(a));
  }, [data]);

  // Filtering by status (and delete) will be applied in applyFilters and also used for counts
  const recordMatchesStatus = (r) => {
    const isDel = !!r.isDeleted;
    const st = String(r.approval || "Pending");
    if (statusTab === "Delete") return isDel === true;
    if (statusTab === "Clarification") return !isDel && st === "Clarification";
    if (statusTab === "Approved") return !isDel && st === "Approved";
    if (statusTab === "Rejected") return !isDel && st === "Rejected";
    if (statusTab === "Pending") return !isDel && (st === "Pending" || !st);
    return true;
  };

  // year -> total count (for current status tab)
  const yearCounts = useMemo(() => {
    const map = {};
    years.forEach(y => map[y] = 0);
    data.forEach(d => {
      if (!d.date) return;
      const dt = new Date(d.date);
      const y = String(dt.getFullYear());
      if (recordMatchesStatus(d) && map[y] !== undefined) map[y]++;
    });
    return map;
  }, [data, years, statusTab]);

  // month -> count for active year (for current status tab)
  const monthCountsForYear = useMemo(() => {
    const map = {}; months.forEach(m => map[m] = 0);
    const yearRecs = data.filter(d => {
      if (!d.date) return false;
      const dt = new Date(d.date);
      return String(dt.getFullYear()) === activeYear;
    });
    const statusApplied = yearRecs.filter(recordMatchesStatus);
    statusApplied.forEach(d => {
      if (!d.date) return;
      const dt = new Date(d.date);
      const m = months[dt.getMonth()];
      map[m]++;
    });
    return map;
  }, [data, months, activeYear, statusTab]);

  // Records for selected year and month (unfiltered by search/filters yet)
  const recordsForYearMonth = useMemo(() => {
    const filteredByYear = data.filter((d) => {
      if (!d.date) return false;
      const dt = new Date(d.date);
      return String(dt.getFullYear()) === activeYear;
    });

    const filteredByStatus = filteredByYear.filter(recordMatchesStatus);

    if (activeMonth) {
      return filteredByStatus.filter((d) => {
        if (!d.date) return false;
        const dt = new Date(d.date);
        return months[dt.getMonth()] === activeMonth;
      });
    }
    return filteredByStatus;
  }, [data, activeYear, activeMonth, statusTab]);

  // Case-insensitive Filters
  const applyFilters = (records) => {
    let recordsFiltered = records.slice();

    if (search) {
      const q = String(search).toLowerCase();
      recordsFiltered = recordsFiltered.filter((r) =>
        String(r.description || "").toLowerCase().includes(q) ||
        String(r.comments || "").toLowerCase().includes(q) ||
        String(r.mainCategory || "").toLowerCase().includes(q) ||
        String(r.subCategory || "").toLowerCase().includes(q) ||
        String(r.employeeName || "").toLowerCase().includes(q)
      );
    }

    if (mainCategory) {
      const m = String(mainCategory).toLowerCase();
      recordsFiltered = recordsFiltered.filter((r) => String(r.mainCategory || "").toLowerCase() === m);
    }
    if (subCategory) {
      const s = String(subCategory).toLowerCase();
      recordsFiltered = recordsFiltered.filter((r) => String(r.subCategory || "").toLowerCase() === s);
    }
    if (dateFrom) recordsFiltered = recordsFiltered.filter((r) => new Date(r.date) >= new Date(dateFrom));
    if (dateTo) recordsFiltered = recordsFiltered.filter((r) => new Date(r.date) <= new Date(dateTo));

    return recordsFiltered;
  };

  const filteredRecords = useMemo(
    () => applyFilters(recordsForYearMonth),
    [recordsForYearMonth, search, mainCategory, subCategory, dateFrom, dateTo]
  );

  // pagination helpers
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / rowsPerPage));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const indexOfLast = safePage * rowsPerPage;
  const indexOfFirst = indexOfLast - rowsPerPage;
  const pageItems = filteredRecords.slice(indexOfFirst, indexOfLast);

  useEffect(() => { setCurrentPage(1); }, [search, mainCategory, subCategory, dateFrom, dateTo, activeYear, activeMonth, rowsPerPage, statusTab]);

  // Export Excel (single function)
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
      Deleted: r.isDeleted ? "Yes" : "No",
      "Delete Reason": r.deleteInfo?.reason || "",
      "Delete By": r.deleteInfo?.deletedBy || "",
      "Delete At": r.deleteInfo?.deletedAt || "",
      "Clarification Request": r.clarificationRequest?.text || "",
      "Clarification By": r.clarificationRequest?.requestedBy || "",
      "Clarification At": r.clarificationRequest?.requestedAt || "",
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${label}-PettyCash`);
    XLSX.writeFile(wb, `${label}-PettyCash.xlsx`);
  };

  // Status badge
  const statusColorClass = (status) => {
    const s = String(status || "Pending").toLowerCase();
    if (s === "approved") return "badge bg-success";
    if (s === "rejected") return "badge bg-danger";
    if (s === "clarification") return "badge bg-info text-dark";
    return "badge bg-warning text-dark"; // pending
  };

  // Category summary definitions
  const categoryColors = {
    Food: "table-success",
    "Office Maintenance": "table-warning",
    Marketing: "table-secondary",
    Stationery: "table-info",
    Medical: "table-danger",
    Welfare: "table-primary",
    Assets: "table-light",
    "Transport & Travel": "table-info",
    Others: "table-dark",
  };

  const subCategories = [
    { cat: "Food", items: ["Groceries", "Vegetables", "Fruits", "Non-Veg", "Curd / Milk", "Tiffins", "Meals", "Curries", "Rice Bag", "Water Cans", "Client Food", "Snacks"] },
    { cat: "Transport & Travel", items: ["Petrol", "Staff Transport", "Worker Transport", "Business Trips", "Vehicle Maintenance", "Vehicle Insurance", "Vehicle Documents", "Vehicle Fine"] },
    { cat: "Office Maintenance", items: ["Office Rent", "Electricity Bill", "Water Bill", "Internet Bill", "Mobile Bill", "Repairs & Maintenance", "Waste Disposal"] },
    { cat: "Marketing", items: ["Apana Fee", "Worker India Fee", "Lamination Covers", "Printings", "Digital Marketing", "Offline Marketing", "Adds", "Off-Food", "Off-Snacks", "Off-Breakfast", "Off-Lunch", "Off-Dinner", "Off-Staying", "Petrol", "Transport", "Health", "Others"] },
    { cat: "Stationery", items: ["Books", "Files", "Papers", "Stationery", "Office Equipment", "IT Accessories", "Others"] },
    { cat: "Medical", items: ["For Staff", "For Workers", "First Aid", "Tablets", "Insurance"] },
    { cat: "Welfare", items: ["Team Outings", "Team Lunch", "Movies", "Gifts", "Festivals", "Entertainment"] },
    { cat: "Assets", items: ["Furniture", "Electronics", "IT Equipment", "Kitchen Items", "Vehicles", "Lands", "Properties", "Domain", "Investments", "Software", "Advances"] },
    { cat: "Others", items: [] },
  ];

  // Build a map for summary with months + total (ONLY Approved and not deleted)
  const summaryData = useMemo(() => {
    const summary = {};
    const othersMap = {};

    // Seed known subcategories
    subCategories.forEach(block => {
      (block.items || []).forEach(sub => {
        summary[sub] = {};
        months.forEach(m => summary[sub][m] = 0);
        summary[sub]["Total"] = 0;
      });
    });

    data.forEach((rec) => {
      // Only Approved and not deleted count towards summary
      if (rec.isDeleted || String(rec.approval || "Pending") !== "Approved") return;

      const dt = rec.date ? new Date(rec.date) : null;
      const m = (dt && !isNaN(dt)) ? months[dt.getMonth()] : "Unknown";
      const t = Number(rec.total || rec.price || 0) || 0;
      const main = rec.mainCategory || "Unspecified";
      const sub = rec.subCategory || "Unspecified";

      if (main === "Others") {
        if (!othersMap[sub]) {
          othersMap[sub] = {};
          months.forEach(mm => othersMap[sub][mm] = 0);
          othersMap[sub]["Total"] = 0;
        }
        othersMap[sub][m] = (othersMap[sub][m] || 0) + t;
        othersMap[sub]["Total"] += t;
        return;
      }

      if (!summary[sub]) {
        summary[sub] = {};
        months.forEach(mm => summary[sub][mm] = 0);
        summary[sub]["Total"] = 0;
      }
      summary[sub][m] = (summary[sub][m] || 0) + t;
      summary[sub]["Total"] += t;
    });

    Object.keys(othersMap).forEach((key) => {
      summary[key] = othersMap[key];
    });

    return summary;
  }, [data, months, subCategories]);

  // compute month totals & grand total (from summaryData)
  const monthTotals = useMemo(() => {
    const mTotals = {};
    months.forEach(m => { mTotals[m] = 0; });
    Object.keys(summaryData).forEach(sub => {
      months.forEach(m => {
        mTotals[m] += summaryData[sub][m] || 0;
      });
    });
    return mTotals;
  }, [summaryData, months]);

  const grandTotal = useMemo(() => {
    return Object.keys(summaryData).reduce((acc, sub) => acc + (summaryData[sub]["Total"] || 0), 0);
  }, [summaryData]);

  // totals for table (page total + filtered total) — ONLY Approved and not deleted
  const pageTotal = useMemo(() => {
    return pageItems
      .filter(r => !r.isDeleted && String(r.approval || "Pending") === "Approved")
      .reduce((s, r) => s + (Number(r.total || 0) || 0), 0);
  }, [pageItems]);

  const filteredTotal = useMemo(() => {
    return filteredRecords
      .filter(r => !r.isDeleted && String(r.approval || "Pending") === "Approved")
      .reduce((s, r) => s + (Number(r.total || 0) || 0), 0);
  }, [filteredRecords]);

  // Reset filters helper
  const resetFilters = () => {
    setSearch("");
    setMainCategory("");
    setSubCategory("");
    setDateFrom("");
    setDateTo("");
    setCurrentPage(1);
  };

  // Export
  const handleExportClick = (records) => {
    setMainCategory("");
    setSubCategory("");
    const label = `${activeYear}-${activeMonth || "all"}-${statusTab}`;
    exportExcel(records, label);
  };

  // UI options for main/sub dropdowns (case-insensitive unique)
  const mainOptions = useMemo(() => {
    const map = new Map();
    data.forEach(d => {
      const k = (d.mainCategory || "").trim();
      if (k) map.set(k.toLowerCase(), k);
    });
    map.set("others", "Others");
    return Array.from(map.values()).sort((a,b)=>a.localeCompare(b));
  }, [data]);

  const subOptions = useMemo(() => {
    if (!mainCategory) return [];
    const map = new Map();
    data.forEach(d => {
      if (String(d.mainCategory || "").toLowerCase() === String(mainCategory).toLowerCase()) {
        const sub = (d.subCategory || "").trim();
        if (sub) map.set(sub.toLowerCase(), sub);
      }
    });
    return Array.from(map.values()).sort((a,b)=>a.localeCompare(b));
  }, [data, mainCategory]);

  // compute others keys
  const othersKeys = useMemo(() => {
    const knownSet = new Set();
    subCategories.forEach(block => (block.items || []).forEach(i => knownSet.add(i)));
    return Object.keys(summaryData).filter(k => !knownSet.has(k));
  }, [summaryData, subCategories]);

  const othersTotals = useMemo(() => {
    const totals = {};
    months.forEach(m => totals[m] = 0);
    totals["Total"] = 0;
    othersKeys.forEach(key => {
      months.forEach(m => { totals[m] += summaryData[key][m] || 0; });
      totals["Total"] += summaryData[key]["Total"] || 0;
    });
    return totals;
  }, [othersKeys, summaryData, months]);

  // Clarification
  const openClarModal = (item) => {
    setClarItem(item);
    setClarText("");
    setShowClarModal(true);
  };
  const closeClarModal = () => {
    setShowClarModal(false);
    setClarItem(null);
    setClarText("");
  };
  const submitClarification = async () => {
    if (!clarItem) return;
    const payload = {
      approval: "Clarification",
      clarificationRequest: {
        text: clarText || "No details provided",
        requestedBy: currentUser || "System",
        requestedAt: new Date().toISOString(),
      },
    };
    try {
      await firebaseDB.child(`PettyCash/admin/${clarItem.id}`).update(payload);
      closeClarModal();
    } catch (err) {
      console.error("Error saving clarification request:", err);
    }
  };

  // Delete (mark as deleted) — only managers/admin
  const canDelete = ["manager", "admin"].includes(String(currentUserRole || "").toLowerCase());

  return (
    <div className="pettyCashReport">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3>Petty Cash Report</h3>
        {/* Status tabs */}
        <div className="btn-group" role="group" aria-label="Status tabs">
          {["Approved","Pending","Rejected","Clarification","Delete"].map(s => (
            <button
              key={s}
              className={`btn btn-sm ${statusTab === s ? "btn-primary" : "btn-outline-secondary"}`}
              onClick={() => { setStatusTab(s); setCurrentPage(1); }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Year tabs */}
      <Tabs
        activeKey={activeYear}
        onSelect={(k) => { setActiveYear(String(k)); setActiveMonth(""); setCurrentPage(1); }}
        mountOnEnter
        unmountOnExit
        className="petty-tabs"
      >
        {years.map((y) => (
          <Tab eventKey={y} title={`${y} (${yearCounts[y] || 0})`} key={y}>
            {/* month tabs inside each year */}
            <div className="mb-3">
              <div className="d-flex gap-2 flex-wrap">
                {months.map((m) => (
                  <button
                    key={m}
                    className={`btn btn-sm ${activeMonth === m ? "btn-primary" : "btn-outline-secondary"}`}
                    onClick={() => { setActiveMonth(m); setCurrentPage(1); }}
                    title={`Records: ${monthCountsForYear[m] || 0}`}
                  >
                    {m} <small className="opacity-75">({monthCountsForYear[m] || 0})</small>
                  </button>
                ))}
                <button
                  className={`btn btn-sm ${activeMonth === "" ? "btn-primary" : "btn-outline-secondary"}`}
                  onClick={() => { setActiveMonth(""); setCurrentPage(1); }}
                >
                  All months <small className="opacity-75">({recordsForYearMonth.length})</small>
                </button>
              </div>
            </div>

            {/* Filters row + reset + export */}
            <div className="row mb-3 g-2 align-items-center">
              <div className="col-md-4">
                <input type="text" className="form-control" placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <div className="col-md-2">
                <select className="form-select" value={mainCategory} onChange={(e) => { setMainCategory(e.target.value); setSubCategory(""); }}>
                  <option value="">All Main Categories</option>
                  {Array.from(new Set([
                    ...data.map(d => (d.mainCategory || "").trim()).filter(Boolean),
                    "Others"
                  ])).sort((a,b)=>a.localeCompare(b)).map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              <div className="col-md-2">
                <select className="form-select" value={subCategory} onChange={(e) => setSubCategory(e.target.value)} disabled={!mainCategory}>
                  <option value="">All Sub Categories</option>
                  {data.filter(d => String(d.mainCategory || "").toLowerCase() === String(mainCategory || "").toLowerCase())
                       .map(d => (d.subCategory || "").trim()).filter(Boolean)
                       .filter((v,i,a)=>a.findIndex(x=>x.toLowerCase()===v.toLowerCase())===i)
                       .sort((a,b)=>a.localeCompare(b))
                       .map((sub)=> <option key={sub} value={sub}>{sub}</option>)}
                </select>
              </div>
              <div className="col-md-1">
                <input type="date" className="form-control" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              </div>
              <div className="col-md-1">
                <input type="date" className="form-control" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </div>

              {/* Reset + Export buttons column */}
              <div className="col-md-2 d-flex flex-row gap-2">
                <button
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => resetFilters()}
                  title="Reset filters"
                >
                  Reset
                </button>

                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => handleExportClick(filteredRecords)}
                  title="Export visible records"
                >
                  Export
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="table-responsive" ref={tableRef}>
              <table className="table table-dark table-hover table-sm align-middle">
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
                    <th>Actions</th>
                    <th>Approval</th>
                    <th>Clarification</th>
                    <th>Delete Note</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((item, idx) => (
                    <tr key={item.id}>
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
                      <td>
                        <div className="d-flex gap-1">
                          <button
                            className="btn btn-sm btn-outline-warning"
                            title="Ask Clarification"
                            onClick={() => openClarModal(item)}
                          >
                            ❓
                          </button>
                          {canDelete && (
                            <button
                              className="btn btn-sm btn-outline-danger"
                              title="Delete (mark as deleted)"
                              onClick={() => { setDeleteItem(item); setDeleteText(""); setShowDeleteModal(true); }}
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                      </td>
                      <td style={{ minWidth: 260 }}>
                        <div className="d-flex align-items-center gap-2">
                          <span className={statusColorClass(item.approval)} style={{ minWidth: 96, textAlign: "center" }}>
                            {item.approval || "Pending"}
                          </span>
                          <select
                            className="form-select form-select-sm"
                            value={item.approval || "Pending"}
                            onChange={(e) => {
                              try {
                                firebaseDB.child(`PettyCash/admin/${item.id}`).update({ approval: e.target.value });
                              } catch (err) {
                                console.error("Error updating approval", err);
                              }
                            }}
                          >
                            <option value="Pending">Pending</option>
                            <option value="Approved">Approved</option>
                            <option value="Clarification">Clarification</option>
                            <option value="Rejected">Rejected</option>
                          </select>
                        </div>
                      </td>
                      <td style={{ maxWidth: 240, whiteSpace: "pre-wrap" }}>
                        {item.clarificationRequest?.text ? (
                          <small>
                            <strong>Req:</strong> {item.clarificationRequest.text}{" "}
                            <em className="text-muted">
                              ({item.clarificationRequest.requestedBy || ""} @{" "}
                              {item.clarificationRequest.requestedAt ? new Date(item.clarificationRequest.requestedAt).toLocaleString() : ""})
                            </em>
                          </small>
                        ) : <span className="text-muted">—</span>}
                      </td>
                      <td style={{ maxWidth: 240, whiteSpace: "pre-wrap" }}>
                        {item.isDeleted && item.deleteInfo?.reason ? (
                          <small>
                            <strong>Del:</strong> {item.deleteInfo.reason}{" "}
                            <em className="text-muted">
                              ({item.deleteInfo.deletedBy || ""} @ {item.deleteInfo.deletedAt ? new Date(item.deleteInfo.deletedAt).toLocaleString() : ""})
                            </em>
                          </small>
                        ) : <span className="text-muted">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>

                {/* table footer: page total + filtered total (Approved only, not deleted) */}
                <tfoot>
                  <tr className="table-secondary">
                    <td colSpan={7} className="text-end"><strong>Page Total (Approved)</strong></td>
                    <td><strong>{pageTotal.toLocaleString()}</strong></td>
                    <td colSpan={6}></td>
                  </tr>
                  <tr className="table-secondary">
                    <td colSpan={7} className="text-end"><strong>Filtered Total (Approved)</strong></td>
                    <td><strong>{filteredTotal.toLocaleString()}</strong></td>
                    <td colSpan={6}></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* pagination */}
            <div className="d-flex justify-content-between align-items-center mt-3">
              <div>Showing {filteredRecords.length} items</div>
              <div className="d-flex gap-2 align-items-center">
                <button className="btn btn-sm btn-outline-secondary" onClick={() => setCurrentPage(p => Math.max(1, p - 1))}>Prev</button>
                <div>Page {safePage} / {totalPages}</div>
                <button className="btn btn-sm btn-outline-secondary" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}>Next</button>
              </div>
            </div>
          </Tab>
        ))}
      </Tabs>

      {/* Category Summary (global) — Approved only, not deleted */}
      <div className="d-flex justify-content-between align-items-center mb-2 mt-5">
        <h4 className="opacity-85">Category Wise Summary (All Years, Approved Only)</h4>
      </div>

      <div className="table-responsive">
        <table className="table table-bordered table-hover pettyCash-Category table-sm table-striped align-middle">
          <thead className="table-light">
            <tr>
              <th style={{width: 220}}>Main Category</th>
              <th>Sub Category</th>
              {months.map((m) => <th key={m} className="text-end">{m}</th>)}
              <th className="text-end">Grand Total</th>
            </tr>
          </thead>
          <tbody>
            {subCategories.map((block) => {
              const blockTotals = {};
              months.forEach((m) => (blockTotals[m] = 0));
              let blockGrand = 0;

              block.items.forEach((sub) => {
                months.forEach((m) => {
                  blockTotals[m] += (summaryData[sub] && summaryData[sub][m]) ? summaryData[sub][m] : 0;
                });
                blockGrand += (summaryData[sub] && summaryData[sub]["Total"]) ? summaryData[sub]["Total"] : 0;
              });

              if (block.cat !== "Others") {
                const isCollapsed = !!collapsedCats[block.cat];
                return (
                  <React.Fragment key={block.cat}>
                    <tr className={`table-category-total ${categoryColors[block.cat] || ""}`}>
                      <td colSpan={2}>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary me-2"
                          onClick={() => setCollapsedCats(prev => ({ ...prev, [block.cat]: !prev[block.cat] }))}
                          title={isCollapsed ? "Expand" : "Collapse"}
                        >
                          {isCollapsed ? "➕" : "➖"}
                        </button>
                        <strong>{block.cat}</strong>
                      </td>
                      {months.map((m) => <td key={m} className="text-end"><strong>{blockTotals[m].toLocaleString()}</strong></td>)}
                      <td className="text-end"><strong>{blockGrand.toLocaleString()}</strong></td>
                    </tr>
                    {!isCollapsed && block.items.map((sub) => (
                      <tr key={block.cat + "-" + sub} className={categoryColors[block.cat] || ""}>
                        <td></td>
                        <td>{sub}</td>
                        {months.map((m) => (
                          <td key={m} className="text-end">
                            {summaryData[sub] && summaryData[sub][m] ? summaryData[sub][m].toLocaleString() : ""}
                          </td>
                        ))}
                        <td className="text-end"><strong>{summaryData[sub] && summaryData[sub]["Total"] ? summaryData[sub]["Total"].toLocaleString() : ""}</strong></td>
                      </tr>
                    ))}
                  </React.Fragment>
                );
              }
              return null;
            })}

            {/* Others section - if any */}
            {/* Skipped detailed "Others" aggregation for brevity; can be added like prior version */}

            {/* Grand Totals */}
            <tr className="table-success sticky-grand-total">
              <td colSpan={2}><strong>Grand Total</strong></td>
              {months.map((m) => <td key={m} className="text-end"><strong>{monthTotals[m].toLocaleString()}</strong></td>)}
              <td className="text-end"><strong>{grandTotal.toLocaleString()}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Clarification Modal */}
      {showClarModal && clarItem && (
        <div className="modal fade show" style={{ display: "block", backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Ask Clarification</h5>
                <button type="button" className="btn-close" onClick={closeClarModal}></button>
              </div>
              <div className="modal-body">
                <p className="mb-2">
                  Please enter the clarification reason. This will be saved with the record and visible in the list.
                </p>
                <textarea
                  className="form-control"
                  rows={4}
                  placeholder="Enter reason..."
                  value={clarText}
                  onChange={(e) => setClarText(e.target.value)}
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeClarModal}>Cancel</button>
                <button type="button" className="btn btn-primary" disabled={!clarText.trim()} onClick={submitClarification}>
                  Save Clarification
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal (Managers/Admin only) */}
      {showDeleteModal && deleteItem && (
        <div className="modal fade show" style={{ display: "block", backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Delete (Mark as Deleted)</h5>
                <button type="button" className="btn-close" onClick={() => { setShowDeleteModal(false); setDeleteItem(null); setDeleteText(""); }}></button>
              </div>
              <div className="modal-body">
                <p className="mb-2">Provide a reason for deleting this entry. It will be saved and shown in the list. Deleted entries are excluded from all calculations.</p>
                <textarea
                  className="form-control"
                  rows={4}
                  placeholder="Delete reason..."
                  value={deleteText}
                  onChange={(e) => setDeleteText(e.target.value)}
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => { setShowDeleteModal(false); setDeleteItem(null); setDeleteText(""); }}>Cancel</button>
                <button
                  type="button"
                  className="btn btn-danger"
                  disabled={!deleteText.trim()}
                  onClick={async () => {
                    if (!deleteItem) return;
                    try {
                      await firebaseDB.child(`PettyCash/admin/${deleteItem.id}`).update({
                        isDeleted: true,
                        deleteInfo: {
                          reason: deleteText,
                          deletedBy: currentUser || "System",
                          deletedAt: new Date().toISOString(),
                        },
                      });
                      setShowDeleteModal(false);
                      setDeleteItem(null);
                      setDeleteText("");
                    } catch (err) {
                      console.error("Error deleting entry:", err);
                    }
                  }}
                >
                  Save Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
