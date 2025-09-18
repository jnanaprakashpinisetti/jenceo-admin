// src/components/PettyCash/PettyCashReport.jsx
import React, { useEffect, useState, useRef, useMemo } from "react";
import firebaseDB from "../../firebase";
import { Tabs, Tab } from "react-bootstrap";
import * as XLSX from "xlsx";

/**
 * PettyCashReport.jsx
 *
 * - Dynamic years
 * - Includes Transport & Travel and Others in category summary
 * - Reset filters button before Export
 * - Page total + Filtered total rows in table footer
 * - Slightly improved Tabs usage (mountOnEnter / unmountOnExit) so styling behaves better
 *
 * NOTE: keep file path / imports consistent with your project layout.
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
        records.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
        setData(records);
        // sensible defaults if not set
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

  // Filters
  const applyFilters = (records) => {
    let recordsFiltered = records.slice();

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

  const filteredRecords = useMemo(() => applyFilters(recordsForYearMonth), [recordsForYearMonth, search, mainCategory, subCategory, dateFrom, dateTo]);

  // pagination helpers
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / rowsPerPage));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const indexOfLast = safePage * rowsPerPage;
  const indexOfFirst = indexOfLast - rowsPerPage;
  const pageItems = filteredRecords.slice(indexOfFirst, indexOfLast);

  useEffect(() => { setCurrentPage(1); }, [search, mainCategory, subCategory, dateFrom, dateTo, activeYear, activeMonth, rowsPerPage]);

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
      "Clarification Response": r.clarificationResponse?.text || "",
      "Clarification By": r.clarificationResponse?.responseBy || "",
      "Clarification At": r.clarificationResponse?.responseAt || "",
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${label}-PettyCash`);
    XLSX.writeFile(wb, `${label}-PettyCash.xlsx`);
  };

  // Category summary definitions (add Transport & Travel and Others)
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

  // Subcategories including Transport & Travel and Others placeholder
  const subCategories = [
    { cat: "Food", items: ["Groceries", "Vegetables", "Fruits", "Non-Veg", "Curd / Milk", "Tiffins", "Meals", "Curries", "Rice Bag", "Water Cans", "Client Food", "Snacks"] },
    { cat: "Transport & Travel", items: ["Petrol", "Staff Transport", "Worker Transport", "Business Trips", "Vehicle Maintenance", "Vehicle Insurance", "Vehicle Documents", "Vehicle Fine"] },
    { cat: "Office Maintenance", items: ["Office Rent", "Electricity Bill", "Water Bill", "Internet Bill", "Mobile Bill", "Repairs & Maintenance", "Waste Disposal"] },
    { cat: "Marketing", items: ["Apana Fee", "Worker India Fee", "Lamination Covers", "Printings", "Digital Marketing", "Offline Marketing", "Adds", "Off-Food", "Off-Snacks", "Off-Breakfast", "Off-Lunch", "Off-Dinner", "Off-Staying", "Petrol", "Transport", "Health", "Others"] },
    { cat: "Stationery", items: ["Books", "Files", "Papers", "Stationery", "Office Equipment", "IT Accessories", "Others"] },
    { cat: "Medical", items: ["For Staff", "For Workers", "First Aid", "Tablets", "Insurance"] },
    { cat: "Welfare", items: ["Team Outings", "Team Lunch", "Movies", "Gifts", "Festivals", "Entertainment"] },
    { cat: "Assets", items: ["Furniture", "Electronics", "IT Equipment", "Kitchen Items", "Vehicles", "Lands", "Properties", "Domain", "Investments", "Software", "Advances"] },
    // Others: free-form subcategories will be added dynamically
    { cat: "Others", items: [] },
  ];

  // Build a map for summary with months + total
  const summaryData = useMemo(() => {
    const summary = {};
    // initialize known subcategories
    subCategories.forEach(block => {
      if (block.items && block.items.length) {
        block.items.forEach(sub => {
          summary[sub] = {};
          months.forEach(m => summary[sub][m] = 0);
          summary[sub]["Total"] = 0;
        });
      }
    });

    // We'll also collect "Others" free-form subcategories
    const othersMap = {}; // subCategoryText -> initialized row

    data.forEach((rec) => {
      const dt = rec.date ? new Date(rec.date) : null;
      const m = (dt && !isNaN(dt)) ? months[dt.getMonth()] : "Unknown";
      const t = Number(rec.total || rec.price || 0) || 0;
      const main = rec.mainCategory || "Unspecified";
      const sub = rec.subCategory || "Unspecified";

      // handle Others mainCategory specially
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

      // find if sub is known -> add
      if (summary[sub]) {
        summary[sub][m] = (summary[sub][m] || 0) + t;
        summary[sub]["Total"] = (summary[sub]["Total"] || 0) + t;
      } else {
        // a subcategory not pre-registered — create one (helps include dynamic Transport etc)
        summary[sub] = {};
        months.forEach(mm => summary[sub][mm] = 0);
        summary[sub]["Total"] = 0;
        summary[sub][m] = (summary[sub][m] || 0) + t;
        summary[sub]["Total"] += t;
      }
    });

    // merge othersMap entries into summary under their own keys
    Object.keys(othersMap).forEach((key) => {
      summary[key] = othersMap[key];
    });

    return summary;
  }, [data, months, subCategories]);

  // compute month totals & grand total
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

  // totals for table (page total & filtered total)
  const pageTotal = useMemo(() => {
    return pageItems.reduce((s, r) => s + (Number(r.total || 0) || 0), 0);
  }, [pageItems]);

  const filteredTotal = useMemo(() => {
    return filteredRecords.reduce((s, r) => s + (Number(r.total || 0) || 0), 0);
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

  // handle Export click (reset main/sub as requested, then export)
  const handleExportClick = (records) => {
    // Reset main/sub filters (per your earlier request)
    setMainCategory("");
    setSubCategory("");
    const label = `${activeYear}-${activeMonth || "all"}`;
    exportExcel(records, label);
  };

  // UI options for main/sub dropdowns
  const mainOptions = useMemo(() => {
    const set = new Set();
    data.forEach(d => { if (d.mainCategory) set.add(d.mainCategory); });
    set.add("Others"); // ensure Others available
    return Array.from(set).sort();
  }, [data]);

  const subOptions = useMemo(() => {
    if (!mainCategory) return [];
    const set = new Set();
    data.forEach(d => {
      if (d.mainCategory === mainCategory && d.subCategory) set.add(d.subCategory);
    });
    return Array.from(set).sort();
  }, [data, mainCategory]);

  // compute others keys (sub-keys that are not part of known subCategories arrays)
  const othersKeys = useMemo(() => {
    const knownSet = new Set();
    subCategories.forEach(block => (block.items || []).forEach(i => knownSet.add(i)));
    // keys in summaryData not present in knownSet are 'others' (freeform subs + newly created)
    return Object.keys(summaryData).filter(k => !knownSet.has(k));
  }, [summaryData, subCategories]);

  // compute totals for Others block
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

  return (
    <div className="pettyCashReport">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3>Petty Cash Report</h3>
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
          <Tab eventKey={y} title={y} key={y}>
            {/* month tabs inside each year */}
            <div className="mb-3">
              <div className="d-flex gap-2 flex-wrap">
                {months.map((m) => (
                  <button
                    key={m}
                    className={`btn btn-sm ${activeMonth === m ? "btn-primary" : "btn-outline-secondary"}`}
                    onClick={() => { setActiveMonth(m); setCurrentPage(1); }}
                  >
                    {m}
                  </button>
                ))}
                <button
                  className={`btn btn-sm ${activeMonth === "" ? "btn-primary" : "btn-outline-secondary"}`}
                  onClick={() => { setActiveMonth(""); setCurrentPage(1); }}
                >
                  All months
                </button>
              </div>
            </div>

            {/* Filters row + reset + export */}
            <div className="row mb-3 g-2 align-items-center">
              <div className="col-md-4">
                <input type="text" className="form-control" placeholder="Search." value={search} onChange={(e) => setSearch(e.target.value)} />
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
              <div className="col-md-1">
                <input type="date" className="form-control" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              </div>
              <div className="col-md-1">
                <input type="date" className="form-control" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </div>

              {/* Reset + Export buttons column */}
              <div className="col-md-1 d-flex flex-row gap-2">
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
                    <th>Approval</th>
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
                      <td style={{ minWidth: 220 }}>
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
                      </td>
                    </tr>
                  ))}
                </tbody>

                {/* table footer: page total + filtered total */}
                <tfoot>
                  <tr className="table-secondary">
                    <td colSpan={7} className="text-end"><strong>Page Total</strong></td>
                    <td><strong>{pageTotal.toLocaleString()}</strong></td>
                    <td colSpan={3}></td>
                  </tr>
                  <tr className="table-secondary">
                    <td colSpan={7} className="text-end"><strong>Filtered Total</strong></td>
                    <td><strong>{filteredTotal.toLocaleString()}</strong></td>
                    <td colSpan={3}></td>
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

      {/* Category Summary (global) */}
      <div className="d-flex justify-content-between align-items-center mb-2 mt-5">
        <h4 className="opacity-85">Category Wise Summary (All Years)</h4>
      </div>

      <div className="table-responsive">
        <table className="table table-bordered table-hover pettyCash-Category table-sm table-striped align-middle">
          <thead className="table-light">
            <tr>
              <th>Main Category</th>
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
                return (
                  <React.Fragment key={block.cat}>
                    {block.items.map((sub, idx) => (
                      <tr key={block.cat + "-" + sub} className={categoryColors[block.cat] || ""}>
                        {idx === 0 && (
                          <td rowSpan={block.items.length + 1} style={{ verticalAlign: "middle" }}>
                            <strong>{block.cat}</strong>
                          </td>
                        )}
                        <td>{sub}</td>
                        {months.map((m) => (
                          <td key={m} className="text-end">
                            {summaryData[sub] && summaryData[sub][m] ? summaryData[sub][m].toLocaleString() : ""}
                          </td>
                        ))}
                        <td className="text-end"><strong>{summaryData[sub] && summaryData[sub]["Total"] ? summaryData[sub]["Total"].toLocaleString() : ""}</strong></td>
                      </tr>
                    ))}
                    <tr className={`table-category-total ${categoryColors[block.cat] || ""}`}>
                      <td><strong>{block.cat} Total</strong></td>
                      {months.map((m) => <td key={m} className="text-end"><strong>{blockTotals[m].toLocaleString()}</strong></td>)}
                      <td className="text-end"><strong>{blockGrand.toLocaleString()}</strong></td>
                    </tr>
                  </React.Fragment>
                );
              }

              return null;
            })}

            {/* Render "Others" entries (free-form sub categories that don't belong to the above lists) */}
            {othersKeys.map((subKey, idx) => (
              <tr key={"other-" + subKey} className="table-warning">
                <td>{idx === 0 ? <strong>Others</strong> : ""}</td>
                <td>{subKey}</td>
                {months.map((m) => <td key={m} className="text-end">{summaryData[subKey][m] ? summaryData[subKey][m].toLocaleString() : ""}</td>)}
                <td className="text-end"><strong>{summaryData[subKey]["Total"] ? summaryData[subKey]["Total"].toLocaleString() : ""}</strong></td>
              </tr>
            ))}

            {/* Others total row (only if there are othersKeys) */}
            {othersKeys.length > 0 && (
              <tr className= "table-category-total-others" >
                <td colSpan={1}><strong>Others Total</strong></td>
                <td></td>
                {months.map((m) => <td key={m} className="text-end"><strong>{othersTotals[m].toLocaleString()}</strong></td>)}
                <td className="text-end"><strong>{othersTotals["Total"].toLocaleString()}</strong></td>
              </tr>
            )}

            {/* Grand Totals */}
            <tr className="table-success sticky-grand-total">
              <td colSpan={2}><strong>Grand Total</strong></td>
              {months.map((m) => <td key={m} className="text-end"><strong>{monthTotals[m].toLocaleString()}</strong></td>)}
              <td className="text-end"><strong>{grandTotal.toLocaleString()}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
