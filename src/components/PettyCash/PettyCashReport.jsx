// src/.../PettyCashReport.jsx
import React, { useEffect, useState, useRef, useMemo } from "react";
import firebaseDB from "../../firebase";
import { Tabs, Tab } from "react-bootstrap";
import * as XLSX from "xlsx";

/**
 * PettyCashReport.jsx
 * - Top level Year tabs (2024..2035)
 * - Inner Month tabs (Jan..Dec)
 * - Purchased By column (employeeName)
 * - Approval dropdown (Approve/ Pending / Reject / Need Clarification) -> writes to DB
 * - Assets added to category summary
 */

export default function PettyCashReport() {
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
    "Jan","Feb","Mar","Apr","May","Jun",
    "Jul","Aug","Sep","Oct","Nov","Dec"
  ];

  // Years 2024..2035
  const years = Array.from({ length: 2035 - 2024 + 1 }, (_, i) => String(2024 + i));

  // Fetch Data
  useEffect(() => {
    const ref = firebaseDB.child("PettyCash/admin");
    const onValue = (snapshot) => {
      if (snapshot.exists()) {
        const records = [];
        snapshot.forEach((child) => {
          records.push({ id: child.key, ...child.val() });
        });
        // Sort by date descending for convenience
        records.sort((a,b) => new Date(b.date || 0) - new Date(a.date || 0));
        setData(records);

        // initialize activeYear/month if not set
        if (!activeYear) {
          setActiveYear(String(new Date().getFullYear()));
        }
        if (!activeMonth) {
          const curMonth = months[new Date().getMonth()];
          setActiveMonth(curMonth);
        }
      } else {
        setData([]);
      }
    };

    ref.on("value", onValue);
    return () => ref.off("value", onValue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filtering by selected Year & Month
  const recordsForYearMonth = useMemo(() => {
    // filter by year
    const filteredByYear = data.filter((d) => {
      if (!d.date) return false;
      const dt = new Date(d.date);
      return String(dt.getFullYear()) === activeYear;
    });

    // if month selected, filter by month as well
    if (activeMonth) {
      return filteredByYear.filter((d) => {
        if (!d.date) return false;
        const dt = new Date(d.date);
        return months[dt.getMonth()] === activeMonth;
      });
    }
    return filteredByYear;
  }, [data, activeYear, activeMonth]);

  // Apply search / main / sub / date range filters on top of year/month selection
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

    if (mainCategory) {
      recordsFiltered = recordsFiltered.filter((r) => r.mainCategory === mainCategory);
    }
    if (subCategory) {
      recordsFiltered = recordsFiltered.filter((r) => r.subCategory === subCategory);
    }
    if (dateFrom) {
      recordsFiltered = recordsFiltered.filter((r) => new Date(r.date) >= new Date(dateFrom));
    }
    if (dateTo) {
      recordsFiltered = recordsFiltered.filter((r) => new Date(r.date) <= new Date(dateTo));
    }

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

  // Export Excel (include PurchasedBy and Approval)
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

  // Subcategories including Assets (spellings as requested)
  const subCategories = [
    { cat: "Food", items: ["Groceries","Vegetables","Non-Veg","Curd / Milk","Tiffins","Meals","Curries","Water Cans","Client Food","Snacks"] },
    { cat: "Office Maintenance", items: ["Office Rent","Electricity Bill","Water Bill","Internet Bill","Mobile Bill","Repairs & Maintenance","Waste Disposal"] },
    { cat: "Marketing", items: ["Apana Fee","Worker India Fee","Lamination Covers","Printings","Digital Marketing","Offline Marketing","Adds","Off-Food","Off-Snacks","Off-Breakfast","Off-Lunch","Off-Dinner","Off-Staying","Petrol","Transport","Health","Others"] },
    { cat: "Stationery", items: ["Books","Files","Papers","Stationery","Office Equipment","IT Accessories","Others"] },
    { cat: "Medical", items: ["For Staff","For Workers","First Aid","Tablets","Insurance"] },
    { cat: "Welfare", items: ["Team Outings","Team Lunch","Movies","Gifts","Festivals","Entertainment"] },
    // Assets category and its subcategories (exact names you provided)
    { cat: "Assets", items: [
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
      ] },
  ];

  // Build summary totals across years/months similar to previous implementation
  const buildSummary = () => {
    const summary = {};
    subCategories.forEach((block) => {
      block.items.forEach((sub) => {
        summary[sub] = {};
        months.forEach((m) => (summary[sub][m] = 0));
        summary[sub]["Total"] = 0;
      });
    });

    // include all data (not filtered by year) so category summary is global (similar to previous)
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

  // Approval change handler: writes to DB
  const handleApprovalChange = async (id, value) => {
    if (!id) return;
    try {
      await firebaseDB.child(`PettyCash/admin/${id}`).update({
        approval: value,
        approvalBy: "Manager",
        approvalAt: new Date().toISOString(),
      });
      // local update for responsiveness
      setData((prev) => prev.map((r) => (r.id === id ? { ...r, approval: value, approvalBy: "Manager", approvalAt: new Date().toISOString() } : r)));
    } catch (err) {
      console.error("Failed to update approval:", err);
      alert("Failed to update approval. See console for details.");
    }
  };

  // Unique options for main/sub category filters from loaded data
  const mainOptions = [...new Set(data.map((d) => d.mainCategory).filter(Boolean))];
  const subOptions = mainCategory ? [...new Set(data.filter((d) => d.mainCategory === mainCategory).map((d) => d.subCategory).filter(Boolean))] : [];

  return (
    <div className="container-fluid mt-4 pettyCash-report">
      <h3 className="mb-3 opacity-85">Petty Cash Report</h3>

      {/* Year Tabs (2024..2035) */}
      <Tabs
        id="petty-cash-years"
        activeKey={activeYear}
        onSelect={(k) => {
          setActiveYear(k);
          // reset month to current month if year matches current year, otherwise unset
          const curYear = String(new Date().getFullYear());
          if (k === curYear) {
            setActiveMonth(months[new Date().getMonth()]);
          } else {
            setActiveMonth("");
          }
          setCurrentPage(1);
        }}
        className="mb-3 petty-cash-years"
      >
        {years.map((y) => (
          <Tab eventKey={y} title={y} key={y}>
            {/* inner month tabs */}
            <Tabs
              id={`months-${y}`}
              activeKey={activeMonth}
              onSelect={(m) => { setActiveMonth(m); setCurrentPage(1); }}
              className="mb-3 pettycash-month"
            >
              {months.map((m) => {
                // compute records for this year+month for preview counts
                const records = data.filter((d) => {
                  if (!d.date) return false;
                  const dt = new Date(d.date);
                  return String(dt.getFullYear()) === y && months[dt.getMonth()] === m;
                });
                return (
                  <Tab eventKey={m} title={`${m} (${records.length})`} key={m}>
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
                                <select
                                  className="form-select form-select-sm"
                                  value={item.approval || "Pending"}
                                  onChange={(e) => handleApprovalChange(item.id, e.target.value)}
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
                          ))}

                          {/* totals row for visible records */}
                          <tr className="table-success">
                            <td colSpan={7}><strong>Page Total</strong></td>
                            <td>
                              <strong>
                                {pageItems.reduce((a,b) => a + Number(b.total || 0), 0).toLocaleString()}
                              </strong>
                            </td>
                            <td colSpan={3}></td>
                          </tr>

                          {/* overall total for this year+month (filteredRecords) */}
                          <tr className="table-info">
                            <td colSpan={7}><strong>Filtered Total</strong></td>
                            <td>
                              <strong>
                                {filteredRecords.reduce((a,b) => a + Number(b.total || 0), 0).toLocaleString()}
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

      {/* Category Summary */}
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
              // compute block totals
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
