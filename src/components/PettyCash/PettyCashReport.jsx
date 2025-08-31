import React, { useEffect, useState, useRef } from "react";
import firebaseDB from "../../firebase";
import { Tabs, Tab, OverlayTrigger, Tooltip } from "react-bootstrap";
import * as XLSX from "xlsx";

export default function PettyCashReport() {
  const [data, setData] = useState([]);
  const [activeMonth, setActiveMonth] = useState("");
  const [search, setSearch] = useState("");
  const [mainCategory, setMainCategory] = useState("");
  const [subCategory, setSubCategory] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const [freezeColumns, setFreezeColumns] = useState(true);
  const [freezeHeader, setFreezeHeader] = useState(true);
  const tableRef = useRef(null);

  const months = [
    "Jan","Feb","Mar","Apr","May","Jun",
    "Jul","Aug","Sep","Oct","Nov","Dec"
  ];

  // Fetch Data
  useEffect(() => {
    firebaseDB.child("PettyCash/admin").on("value", (snapshot) => {
      if (snapshot.exists()) {
        const records = [];
        snapshot.forEach((child) => {
          records.push({ id: child.key, ...child.val() });
        });
        setData(records);

        if (!activeMonth) {
          const curMonth = months[new Date().getMonth()];
          setActiveMonth(curMonth);
        }
      }
    });
    return () => firebaseDB.child("PettyCash/admin").off();
  }, []);

  // Month Data + Filters
  const getMonthData = (month) => {
    let records = data.filter(
      (d) => months[new Date(d.date).getMonth()] === month
    );

    if (search) {
      records = records.filter(
        (item) =>
          (item.description || "").toLowerCase().includes(search.toLowerCase()) ||
          (item.comments || "").toLowerCase().includes(search.toLowerCase()) ||
          (item.mainCategory || "").toLowerCase().includes(search.toLowerCase()) ||
          (item.subCategory || "").toLowerCase().includes(search.toLowerCase())
      );
    }
    if (mainCategory) {
      records = records.filter((r) => r.mainCategory === mainCategory);
    }
    if (subCategory) {
      records = records.filter((r) => r.subCategory === subCategory);
    }
    if (dateFrom) {
      records = records.filter((r) => new Date(r.date) >= new Date(dateFrom));
    }
    if (dateTo) {
      records = records.filter((r) => new Date(r.date) <= new Date(dateTo));
    }

    return records;
  };

  // Export Excel
  const exportExcel = (records, month) => {
    const ws = XLSX.utils.json_to_sheet(records);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${month}-PettyCash`);
    XLSX.writeFile(wb, `${month}-PettyCash.xlsx`);
  };

  // Summary Data
  const categoryColors = {
    Food: "table-success",
    "Office Maintenance": "table-warning",
    Marketing: "table-secondary",
    Stationery: "table-info",
    Medical: "table-danger",
    Welfare: "table-primary",
  };

  const subCategories = [
    { cat: "Food", items: ["Groceries","Vegetables","Non-Veg","Curd / Milk","Tiffins","Meals","Curries","Water","Snacks"] },
    { cat: "Office Maintenance", items: ["Rent","Current Bill","Internet","Mobile Bill"] },
    { cat: "Marketing", items: ["Meals (Mkt)","Breakfast","Snacks (Mkt)","Drinks","Staying","Petrol","Digital Marketing"] },
    { cat: "Stationery", items: ["Books","Files","Lamination Covers","Printings","Papers"] },
    { cat: "Medical", items: ["For Staff","For Workers","First Aid","Tablets","Insurance"] },
    { cat: "Welfare", items: ["Team Outings","Team Lunch","Movies","Gifts","Festivals","Entertainment"] },
  ];

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
      const m = months[new Date(d.date).getMonth()];
      const sub = d.subCategory;
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

  // Pagination
  const paginate = (records) => {
    const indexOfLast = currentPage * rowsPerPage;
    const indexOfFirst = indexOfLast - rowsPerPage;
    return records.slice(indexOfFirst, indexOfLast);
  };

  return (
    <div className="container-fluid mt-4 pettyCash-report">
      <h3 className="mb-3 opacity-75">Petty Cash Report</h3>

      {/* Month Tabs */}
      <Tabs
        id="petty-cash-tabs"
        activeKey={activeMonth}
        onSelect={(k) => {
          setActiveMonth(k);
          setCurrentPage(1);
        }}
        className="custom-tabs mb-3"
      >
        {months.map((m) => {
          const records = getMonthData(m);
          const totalPages = Math.ceil(records.length / rowsPerPage);

          return (
            <Tab eventKey={m} title={m} key={m}>
              {records.length > 0 ? (
                <>
                  {/* Filters */}
                  <div className="row mb-3">
                    <div className="col-md-3">
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Search..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </div>
                    <div className="col-md-2">
                      <select
                        className="form-select"
                        value={mainCategory}
                        onChange={(e) => {
                          setMainCategory(e.target.value);
                          setSubCategory("");
                        }}
                      >
                        <option value="">All Main Categories</option>
                        {[...new Set(data.map((d) => d.mainCategory))].map(
                          (cat, idx) => (
                            <option key={idx} value={cat}>
                              {cat}
                            </option>
                          )
                        )}
                      </select>
                    </div>
                    <div className="col-md-2">
                      <select
                        className="form-select"
                        value={subCategory}
                        onChange={(e) => setSubCategory(e.target.value)}
                        disabled={!mainCategory}
                      >
                        <option value="">All Sub Categories</option>
                        {[...new Set(
                          data
                            .filter((d) => d.mainCategory === mainCategory)
                            .map((d) => d.subCategory)
                        )].map((sub, idx) => (
                          <option key={idx} value={sub}>
                            {sub}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-2">
                      <input
                        type="date"
                        className="form-control"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                      />
                    </div>
                    <div className="col-md-2">
                      <input
                        type="date"
                        className="form-control"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                      />
                    </div>
                    <div className="col-md-1">
                      <button
                        className="btn btn-primary w-100"
                        onClick={() => exportExcel(records, m)}
                      >
                        Export
                      </button>
                    </div>
                  </div>

                  {/* Table */}
                  <div className="table-responsive">
                    <table className="table table-dark table-hover">
                      <thead className="table-dark">
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
                        </tr>
                      </thead>
                      <tbody>
                        {paginate(records).map((item, idx) => (
                          <tr key={item.id}>
                            <td>{idx + 1 + (currentPage - 1) * rowsPerPage}</td>
                            <td>{item.date}</td>
                            <td>{item.mainCategory}</td>
                            <td>{item.subCategory}</td>
                            <td>{item.description}</td>
                            <td>{item.quantity}</td>
                            <td>{item.price}</td>
                            <td>{item.total}</td>
                            <td>{item.comments}</td>
                          </tr>
                        ))}
                        <tr className="table-success">
                          <td colSpan="7"><strong>Total</strong></td>
                          <td colSpan="2">
                            <strong>
                              {records.reduce(
                                (a, b) => a + Number(b.total || 0),
                                0
                              ).toLocaleString()}
                            </strong>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  <div className="d-flex justify-content-between align-items-center mt-3">
                    <div>
                      Show{" "}
                      <select
                        value={rowsPerPage}
                        onChange={(e) => setRowsPerPage(Number(e.target.value))}
                      >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={30}>30</option>
                      </select>{" "}
                      entries
                    </div>
                    <div>
                      Page {currentPage} of {totalPages || 1}
                      <button
                        className="btn btn-sm btn-secondary ms-2"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage((p) => p - 1)}
                      >
                        Prev
                      </button>
                      <button
                        className="btn btn-sm btn-secondary ms-2"
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage((p) => p + 1)}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <p className="mt-3">No data for {m}</p>
              )}
            </Tab>
          );
        })}
      </Tabs>

      {/* Summary Controls */}
      <div className="d-flex justify-content-between align-items-center mb-2 mt-5">
        <h4 className="opacity-75">Category Wise Summary</h4>

        
        {/* *************** Toggle and untoggle header funcanality *************** */}
        {/* 
        <div className="d-flex gap-2">
          <OverlayTrigger placement="top" overlay={<Tooltip>Toggle freeze/unfreeze first 2 columns</Tooltip>}>
            <button
              className="btn btn-sm btn-outline-primary"
              onClick={() => setFreezeColumns(!freezeColumns)}
            >
              {freezeColumns ? "Unfreeze Columns" : "Freeze Columns"}
            </button>
          </OverlayTrigger>

          <OverlayTrigger placement="top" overlay={<Tooltip>Toggle freeze/unfreeze header row</Tooltip>}>
            <button
              className="btn btn-sm btn-outline-secondary"
              onClick={() => setFreezeHeader(!freezeHeader)}
            >
              {freezeHeader ? "Unfreeze Header" : "Freeze Header"}
            </button>
          </OverlayTrigger>

          <OverlayTrigger placement="top" overlay={<Tooltip>Reset table view (freeze + scroll reset)</Tooltip>}>
            <button
              className="btn btn-sm btn-outline-danger"
              onClick={() => {
                setFreezeColumns(true);
                setFreezeHeader(true);
                if (tableRef.current) {
                  tableRef.current.scrollLeft = 0;
                  tableRef.current.scrollTop = 0;
                }
              }}
            >
              Reset View
            </button>
          </OverlayTrigger>
        </div>
         */}
      </div>

      {/* Summary Table */}
      <div className="table-responsive" ref={tableRef}>
        <table
          className={`table table-bordered table-hover pettyCash-Category 
            ${freezeColumns ? "freeze-enabled" : ""} 
            ${freezeHeader ? "freeze-header" : ""}`}
        >
          <thead className="catagory-header">
            <tr>
              <th>Main Category</th>
              <th>Sub Category</th>
              {months.map((m) => (
                <th key={m}>{m}</th>
              ))}
              <th>Grand Total</th>
            </tr>
          </thead>
          <tbody>
            {subCategories.map((block) => {
              // Compute block totals
              const blockTotals = {};
              months.forEach((m) => (blockTotals[m] = 0));
              let blockGrand = 0;

              block.items.forEach((sub) => {
                months.forEach((m) => (blockTotals[m] += summaryData[sub][m]));
                blockGrand += summaryData[sub]["Total"];
              });

              return (
                <React.Fragment key={block.cat}>
                  {block.items.map((sub, idx) => (
                    <tr key={sub} className={categoryColors[block.cat]}>
                      {idx === 0 && (
                        <td rowSpan={block.items.length + 1}>
                          <strong>{block.cat}</strong>
                        </td>
                      )}
                      <td>{sub}</td>
                      {months.map((m) => (
                        <td key={m}>
                          {summaryData[sub][m]
                            ? summaryData[sub][m].toLocaleString()
                            : ""}
                        </td>
                      ))}
                      <td>
                        <strong>
                          {summaryData[sub]["Total"]
                            ? summaryData[sub]["Total"].toLocaleString()
                            : ""}
                        </strong>
                      </td>
                    </tr>
                  ))}
                  {/* Category total row */}
                  <tr className={`table-category-total ${categoryColors[block.cat]}`}>
                    <td><strong>{block.cat} Total</strong></td>
                    {months.map((m) => (
                      <td key={m}>
                        <strong>{blockTotals[m].toLocaleString()}</strong>
                      </td>
                    ))}
                    <td><strong>{blockGrand.toLocaleString()}</strong></td>
                  </tr>
                </React.Fragment>
              );
            })}
            {/* Grand Totals */}
            <tr className="table-success sticky-grand-total">
              <td colSpan={2}><strong>Grand Total</strong></td>
              {months.map((m) => (
                <td key={m}>
                  <strong>{monthTotals[m].toLocaleString()}</strong>
                </td>
              ))}
              <td><strong>{grandTotal.toLocaleString()}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
