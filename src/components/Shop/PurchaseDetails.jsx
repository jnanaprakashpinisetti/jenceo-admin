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

const getBranchKey = (user) => {
  return "FqFoRqVwq7Pu2BFmOFA98tU2m5X2"; // Fixed branch key
};

const getUserName = (user) =>
  user?.name || user?.username || user?.displayName || (user?.email ? user.email.replace(/@.*/, "") : "") || "User";
const getUserRole = (user) => (user?.role && String(user.role)) || (user?.permissions ? "admin" : "user");

export default function PurchaseDetails() {
  const { user: authUser } = useAuth?.() || {};
  const branchKey = getBranchKey(authUser);
  const actorName = getUserName(authUser);
  const actorRole = String(getUserRole(authUser) || "").toLowerCase();

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0..11
  const [dateStr, setDateStr] = useState(ymd(now));   // yyyy-mm-dd

  const [allRows, setAllRows] = useState([]);
  const [loading, setLoading] = useState(true);

  // inline editor (selling rate)
  const [editingKey, setEditingKey] = useState(null);
  const [sellDraft, setSellDraft] = useState("");

  /* ------------ Date options ------------ */
  const daysInMonth = useMemo(() => new Date(year, month + 1, 0).getDate(), [year, month]);
  const dateOptions = useMemo(() => {
    const arr = Array.from({ length: daysInMonth }, (_, i) => ymd(new Date(year, month, i + 1)));
    if (!arr.includes(dateStr)) {
      const fallback = (now.getFullYear() === year && now.getMonth() === month) ? ymd(now) : arr[0];
      setDateStr(fallback);
    }
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month, daysInMonth]);

  /* ------------ Fetch: CORRECT path JenCeo-DataBase/Shop/FqFoRqVwq7Pu2BFmOFA98tU2m5X2 ------------ */
  useEffect(() => {
    setLoading(true);
    const ref = firebaseDB.child(`JenCeo-DataBase/Shop/${branchKey}`);
    console.log("Fetching from:", `JenCeo-DataBase/Shop/${branchKey}`); // Debug log
    
    const off = ref.on("value", (snap) => {
      const v = snap.val() || {};
      console.log("Raw data received:", v); // Debug log
      
      const arr = Object.values(v)
        .filter(Boolean)
        .map((row) => ({
          ...row,
          date: row?.date || "",
          mainCategory: row?.mainCategory || "",
          subCategory: row?.subCategory || "",
          quantity: Number(row?.quantity || 0),
          price: Number(row?.price || 0),
          sellingRate: Number(row?.sellingRate || 0),
          total:
            row?.total != null
              ? Number(row.total)
              : Number(row?.quantity || 0) * Number(row?.price || 0),
        }));
      console.log("Processed rows:", arr); // Debug log
      setAllRows(arr);
      setLoading(false);
    }, (error) => {
      console.error("Firebase read error:", error);
      setLoading(false);
    });
    
    return () => ref.off("value", off);
  }, [branchKey]);

  /* ------------ Lookups ------------ */
  const byDateVeg = useMemo(() => {
    const map = {};
    for (const r of allRows) {
      if (!r.date || !r.subCategory) continue;
      map[`${r.date}::${r.subCategory}`] = r;
    }
    return map;
  }, [allRows]);

  // Columns for tracker: all vegs that exist (from DB)
  const vegAll = useMemo(() => {
    const s = new Set();
    for (const r of allRows) if (r.subCategory) s.add(r.subCategory);
    return Array.from(s).sort((a, b) => a.localeCompare(b, "te-IN"));
  }, [allRows]);

  // Group by category for cards layout
  const purchasesByCategory = useMemo(() => {
    const rows = allRows.filter((r) => r.date === dateStr);
    const categoryMap = new Map();
    
    for (const r of rows) {
      if (!r.mainCategory || !r.subCategory) continue;
      if (!categoryMap.has(r.mainCategory)) {
        categoryMap.set(r.mainCategory, []);
      }
      categoryMap.get(r.mainCategory).push(r);
    }
    
    // Sort categories and items within categories
    const sortedCategories = Array.from(categoryMap.keys()).sort((a, b) => a.localeCompare(b, "te-IN"));
    const result = new Map();
    sortedCategories.forEach(cat => {
      const items = categoryMap.get(cat).sort((a, b) => a.subCategory.localeCompare(b.subCategory, "te-IN"));
      result.set(cat, items);
    });
    
    return result;
  }, [allRows, dateStr]);

  const getRow = (veg, d = dateStr) => byDateVeg[`${d}::${veg}`] || null;

  /* ------------ Mutations ------------ */
  const upsert = async (veg, patch) => {
    const listRef = firebaseDB.child(`JenCeo-DataBase/Shop/${branchKey}`);
    const existing = getRow(veg);
    const id = existing?.id || listRef.push().key;

    // mainCategory keep/infer
    let mainCat = existing?.mainCategory || "";
    if (!mainCat) {
      const sameDate = allRows.filter((r) => r.date === dateStr && r.subCategory === veg && r.mainCategory);
      if (sameDate[0]?.mainCategory) mainCat = sameDate[0].mainCategory;
      if (!mainCat) {
        const any = allRows.find((r) => r.subCategory === veg && r.mainCategory);
        if (any) mainCat = any.mainCategory;
      }
    }

    const quantity = "quantity" in patch ? Number(patch.quantity) || 0 : Number(existing?.quantity || 0);
    const price = "price" in patch ? Number(patch.price) || 0 : Number(existing?.price || 0);
    const sellingRate = "sellingRate" in patch ? Number(patch.sellingRate) || 0 : Number(existing?.sellingRate || 0);

    const payload = {
      id,
      date: dateStr,
      mainCategory: mainCat,
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
            createdByName: actorName,
            createdByRole: actorRole,
          }),
      updatedAt: new Date().toISOString(),
      updatedById: authUser?.uid || authUser?.dbId || "",
      updatedByName: actorName,
      updatedByRole: actorRole,
    };

    console.log("Saving to Firebase:", payload); // Debug log
    await firebaseDB.child(`JenCeo-DataBase/Shop/${branchKey}/${id}`).set(payload);

    // optimistic update
    setAllRows((prev) => {
      const next = prev.filter((r) => r.id !== id);
      next.push(payload);
      return next;
    });
  };

  const onEditSelling = (veg) => {
    const row = getRow(veg);
    setEditingKey(`${dateStr}::${veg}`);
    setSellDraft(row?.sellingRate ?? "");
  };
  
  const onCancelSelling = () => {
    setEditingKey(null);
    setSellDraft("");
  };
  
  const onSaveSelling = async (veg) => {
    await upsert(veg, { sellingRate: Number(sellDraft) || 0 });
    onCancelSelling();
  };

  /* ------------ Years for dropdown ------------ */
  const yearsAround = useMemo(() => {
    const cur = new Date().getFullYear();
    return Array.from({ length: 7 }, (_, i) => cur - 3 + i);
  }, []);

  return (
    <div className="p-3 bg-dark border rounded-3">
      {/* Controls */}
      <div className="d-flex flex-wrap align-items-center justify-content-between mb-4">
        <div className="d-flex gap-2 align-items-center">
          <select
            className="form-select form-select-sm bg-dark text-light border-secondary"
            value={month}
            onChange={(e) => setMonth(parseInt(e.target.value, 10))}
            style={{ width: 140 }}
          >
            {["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((m, i) => (
              <option key={m} value={i}>{m}</option>
            ))}
          </select>
          <select
            className="form-select form-select-sm bg-dark text-light border-secondary"
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value, 10))}
            style={{ width: 110 }}
          >
            {yearsAround.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <select
            className="form-select form-select-sm bg-dark text-light border-secondary"
            value={dateStr}
            onChange={(e) => setDateStr(e.target.value)}
            style={{ width: 150 }}
          >
            {dateOptions.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        <div className="small text-info">
          Branch: <span className="text-warning">{branchKey}</span> • Date:{" "}
          <span className="text-warning">{dateStr}</span>
        </div>
      </div>

      {/* ===================== Daily Purchases - Cards Layout ===================== */}
      <div className="mb-5">
        <h4 className="text-warning mb-4 border-bottom pb-2">
          <i className="fas fa-shopping-basket me-2"></i>
          Daily Purchases
        </h4>
        
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-2 text-muted">Loading purchase data...</p>
          </div>
        ) : purchasesByCategory.size === 0 ? (
          <div className="text-center py-5">
            <div className="text-muted mb-3">
              <i className="fas fa-shopping-cart fa-3x"></i>
            </div>
            <h5 className="text-muted">No purchases for selected date</h5>
            <p className="text-muted">Select a different date to view purchases</p>
          </div>
        ) : (
          Array.from(purchasesByCategory.entries()).map(([category, items]) => (
            <div key={category} className="mb-4">
              <h5 className="text-info mb-3 ps-2 border-start border-info border-3">
                <i className="fas fa-tag me-2"></i>
                {category}
              </h5>
              <div className="row g-3">
                {items.map((item) => (
                  <div key={item.id} className="col-xl-4 col-lg-6 col-md-6">
                    <div className="card bg-gray-800 border-0 h-100 shadow hover-lift">
                      <div className="card-body">
                        {/* Item Header */}
                        <div className="d-flex justify-content-between align-items-start mb-3">
                          <h6 className="card-title text-light mb-0">
                            <i className="fas fa-carrot me-2 text-warning"></i>
                            {item.subCategory}
                          </h6>
                          <span className="badge bg-dark text-light small">{item.mainCategory}</span>
                        </div>
                        
                        {/* Quantity and Price Inputs */}
                        <div className="row g-2 mb-3">
                          <div className="col-6">
                            <div className="bg-dark rounded p-2 text-center">
                              <small className="text-muted d-block">
                                <i className="fas fa-weight me-1"></i>
                                Quantity
                              </small>
                              <input
                                type="number"
                                className="form-control form-control-sm bg-dark border-0 text-light text-center p-0 mt-1"
                                defaultValue={item.quantity || ""}
                                onBlur={(e) => upsert(item.subCategory, { quantity: e.target.value })}
                                min={0}
                                style={{ fontSize: '0.9rem' }}
                              />
                            </div>
                          </div>
                          <div className="col-6">
                            <div className="bg-dark rounded p-2 text-center">
                              <small className="text-muted d-block">
                                <i className="fas fa-rupee-sign me-1"></i>
                                Price
                              </small>
                              <input
                                type="number"
                                className="form-control form-control-sm bg-dark border-0 text-light text-center p-0 mt-1"
                                defaultValue={item.price || ""}
                                onBlur={(e) => upsert(item.subCategory, { price: e.target.value })}
                                min={0}
                                style={{ fontSize: '0.9rem' }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Total and Selling Rate */}
                        <div className="row g-2">
                          <div className="col-6">
                            <div className="bg-success rounded p-2 text-center">
                              <small className="text-light d-block">
                                <i className="fas fa-calculator me-1"></i>
                                Total
                              </small>
                              <strong className="text-light">₹{item.total || 0}</strong>
                            </div>
                          </div>
                          <div className="col-6">
                            <div className="bg-warning rounded p-2 text-center">
                              <small className="text-dark d-block fw-bold">
                                <i className="fas fa-tags me-1"></i>
                                Selling Rate
                              </small>
                              {editingKey === `${dateStr}::${item.subCategory}` ? (
                                <div className="d-flex gap-1 mt-1">
                                  <input
                                    type="number"
                                    className="form-control form-control-sm text-dark text-center p-0"
                                    value={sellDraft}
                                    onChange={(e) => setSellDraft(e.target.value)}
                                    style={{ fontSize: '0.8rem' }}
                                    autoFocus
                                  />
                                  <button 
                                    className="btn btn-sm btn-success p-0 px-1"
                                    onClick={() => onSaveSelling(item.subCategory)}
                                    title="Save"
                                  >
                                    <i className="fas fa-check"></i>
                                  </button>
                                  <button 
                                    className="btn btn-sm btn-danger p-0 px-1"
                                    onClick={onCancelSelling}
                                    title="Cancel"
                                  >
                                    <i className="fas fa-times"></i>
                                  </button>
                                </div>
                              ) : (
                                <span
                                  role="button"
                                  className="text-dark fw-bold d-block mt-1"
                                  onClick={() => onEditSelling(item.subCategory)}
                                  title="Click to edit selling rate"
                                >
                                  ₹{item.sellingRate || "0"}
                                  <small className="ms-1 text-dark opacity-75">
                                    <i className="fas fa-edit"></i>
                                  </small>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* ===================== Monthly Price Tracker Table ===================== */}
      <div>
        <h4 className="text-warning mb-3 border-bottom pb-2">
          <i className="fas fa-calendar-alt me-2"></i>
          Monthly Price Tracker
        </h4>
        <div className="table-responsive">
          <table className="table table-dark table-bordered align-middle">
            <thead>
              <tr>
                <th style={{ minWidth: 80, textAlign: "center" }}>Day</th>
                {vegAll.map((veg) => (
                  <th key={veg} className="text-center" style={{ minWidth: 120 }}>{veg}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((dayNum) => {
                const fullDate = ymd(new Date(year, month, dayNum));
                return (
                  <tr key={dayNum}>
                    <th className="fw-semibold text-center bg-secondary">{dayNum}</th>
                    {vegAll.map((veg) => {
                      const row = getRow(veg, fullDate);
                      const price = Number(row?.price || 0);
                      return (
                        <td key={`${dayNum}-${veg}`} className="text-center">
                          {price ? (
                            <span className="badge bg-info">
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
              })}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        .bg-gray-800 {
          background-color: #2d3748 !important;
        }
        .hover-lift {
          transition: all 0.3s ease;
        }
        .hover-lift:hover {
          transform: translateY(-5px);
          box-shadow: 0 8px 25px rgba(0,0,0,0.4) !important;
        }
        .form-control {
          background: rgba(255,255,255,0.08) !important;
          border: 1px solid rgba(255,255,255,0.15) !important;
          color: #fff !important;
        }
        .form-control:focus {
          background: rgba(255,255,255,0.12) !important;
          border-color: #0dcaf0 !important;
          color: #fff !important;
          box-shadow: 0 0 0 0.2rem rgba(13, 202, 240, 0.25) !important;
        }
        .badge[role="button"] { 
          cursor: pointer; 
          transition: all 0.2s ease;
        }
        .badge[role="button"]:hover {
          transform: scale(1.05);
        }
      `}</style>
    </div>
  );
}