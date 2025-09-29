// src/components/Enquiries/EnquiriesDisplay.jsx
import React, { useState, useEffect } from "react";
import firebaseDB from "../../firebase";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";
import editIcon from "../../assets/eidt.svg";
import viewIcon from "../../assets/view.svg";
import deleteIcon from "../../assets/delete.svg";
import EnquiryModal from "./EnquiryModal";

const EnquiriesDisplay = () => {
  // State management for enquiries data and UI controls
  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterThrough, setFilterThrough] = useState("");
  const [filterReminder, setFilterReminder] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(10);
  const [reminderCounts, setReminderCounts] = useState({
    overdue: 0,
    today: 0,
    tomorrow: 0,
    upcoming: 0,
  });
  const [activeYear, setActiveYear] = useState(new Date().getFullYear());
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteItem, setDeleteItem] = useState(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [sortBy, setSortBy] = useState("date");

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("view");
  const [selectedEnquiry, setSelectedEnquiry] = useState(null);

  // Fetch enquiries from Firebase
  const fetchEnquiries = () => {
    firebaseDB.child("EnquiryData").once("value", (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const list = Object.keys(data).map((key) => ({
          id: key,
          ...data[key],
        }));
        setEnquiries(list);
        updateReminderCounts(list);
      } else {
        setEnquiries([]);
        setReminderCounts({ overdue: 0, today: 0, tomorrow: 0, upcoming: 0 });
      }
    });
  };

  // Initial data fetch on component mount
  useEffect(() => {
    setLoading(true);
    const ref = firebaseDB.child("EnquiryData");
    const handler = (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const list = Object.keys(data).map((key) => ({
          id: key,
          ...data[key],
        }));
        setEnquiries(list);
        updateReminderCounts(list);
      } else {
        setEnquiries([]);
        setReminderCounts({ overdue: 0, today: 0, tomorrow: 0, upcoming: 0 });
      }
      setLoading(false);
    };
    ref.on("value", handler);
    return () => ref.off("value", handler);
  }, []);

  // Calculate reminder counts based on dates
  const updateReminderCounts = (list) => {
    const today = new Date();
    const tStr = today.toISOString().split("T")[0];
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    const tmStr = tomorrow.toISOString().split("T")[0];

    let counts = { overdue: 0, today: 0, tomorrow: 0, upcoming: 0 };

    list.forEach((enq) => {
      if (!enq.reminderDate) return;
      if (enq.reminderDate < tStr) counts.overdue++;
      else if (enq.reminderDate === tStr) counts.today++;
      else if (enq.reminderDate === tmStr) counts.tomorrow++;
      else counts.upcoming++;
    });
    setReminderCounts(counts);
  };

  // Determine CSS class for reminder dates based on urgency
  const getReminderClass = (date) => {
    if (!date) return "";
    const today = new Date();
    const tStr = today.toISOString().split("T")[0];
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    const tmStr = tomorrow.toISOString().split("T")[0];

    if (date < tStr) return "reminder-overdue";
    if (date === tStr) return "reminder-today";
    if (date === tmStr) return "reminder-tomorrow";
    return "reminder-upcoming";
  };

  // Determine CSS class for status with color coding
  const getStatusClass = (status) => {
    switch (status) {
      case "Enquiry":
        return "status-enquiry"; // Light blue
      case "Pending":
        return "status-pending"; // Yellow
      case "On Boarding":
        return "status-onboarding"; // Green
      case "No Response":
        return "status-noresponse"; // Red
      default:
        return "";
    }
  };

  // Filtering + Sorting logic
  const filteredEnquiries = enquiries
    .filter((enq) => {
      const matchesSearch =
        String(enq.name || "").toLowerCase().includes(search.toLowerCase()) ||
        String(enq.mobile || "").includes(search) ||
        String(enq.service || "").toLowerCase().includes(search.toLowerCase()) ||
        String(enq.through || "").toLowerCase().includes(search.toLowerCase());
      const matchesStatus = filterStatus
        ? String(enq.status || "").toLowerCase() === String(filterStatus).toLowerCase()
        : true;
      const matchesThrough = filterThrough
        ? String(enq.through || "").toLowerCase() === String(filterThrough).toLowerCase()
        : true;
      const matchesReminder = filterReminder ? getReminderClass(enq.reminderDate) === filterReminder : true;
      return matchesSearch && matchesStatus && matchesThrough && matchesReminder;
    })
    .sort((a, b) => {
      if (sortBy === "name") return (a.name || "").localeCompare(b.name || "");
      if (sortBy === "amount") return (b.amount || 0) - (a.amount || 0);
      if (sortBy === "reminderDate") {
        if (!a.reminderDate && !b.reminderDate) return 0;
        if (!a.reminderDate) return 1;
        if (!b.reminderDate) return -1;
        return new Date(a.reminderDate) - new Date(b.reminderDate);
      }
      return new Date(b.date || 0) - new Date(a.date || 0);
    });

  // Pagination logic
  const indexOfLast = currentPage * recordsPerPage;
  const indexOfFirst = indexOfLast - recordsPerPage;
  const currentEnquiries = filteredEnquiries.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(filteredEnquiries.length / recordsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const getDisplayedPageNumbers = () => {
    if (totalPages <= 1) return [1];

    const delta = 2;
    const range = [];
    for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
      range.push(i);
    }
    if (currentPage - delta > 2) range.unshift("...");
    if (currentPage + delta < totalPages - 1) range.push("...");
    range.unshift(1);
    if (totalPages > 1) range.push(totalPages);
    return range;
  };

  // Month-wise summary data preparation
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const years = Array.from(
    new Set(enquiries.filter((e) => e.date).map((e) => new Date(e.date).getFullYear()))
  ).sort((a, b) => a - b);
  const throughOptions = [
    "Poster",
    "Reference",
    "Hospital-Agent",
    "Medical Cover",
    "JustDial",
    "Facebook",
    "Instagram",
    "LinkedIn",
    "YouTube",
    "Website",
    "Google",
  ];

  const getSummaryData = (year) => {
    const summaryData = {};
    throughOptions.forEach((t) => {
      summaryData[t] = Array(12).fill(0);
    });

    enquiries.forEach((enq) => {
      if (enq.through && enq.date) {
        const d = new Date(enq.date);
        if (d.getFullYear() === year && summaryData[enq.through]) {
          const month = d.getMonth();
          summaryData[enq.through][month]++;
        }
      }
    });

    return summaryData;
  };

  const summaryData = getSummaryData(activeYear);

  // Export functions
  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filteredEnquiries);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Enquiries");
    XLSX.writeFile(wb, "Enquiries.xlsx");
  };

  const exportToCSV = () => {
    const ws = XLSX.utils.json_to_sheet(filteredEnquiries);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "Enquiries.csv";
    link.click();
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text("Enquiries Report", 14, 10);

    if (doc.autoTable) {
      doc.autoTable({
        head: [["Name", "Mobile", "Service", "Amount", "Through", "Status", "Reminder Date"]],
        body: filteredEnquiries.map((e) => [
          e.name || "",
          e.mobile || "",
          e.service || "",
          e.amount || "",
          e.through || "",
          e.status || "",
          e.reminderDate || "",
        ]),
      });
    } else {
      // fallback if autoTable not available
      filteredEnquiries.forEach((e, i) => {
        doc.text(
          `${i + 1}. ${e.name} | ${e.mobile} | ${e.service} | ${e.amount} | ${e.through} | ${e.status} | ${e.reminderDate}`,
          10,
          20 + i * 10
        );
      });
    }

    doc.save("Enquiries.pdf");
  };

  // Reset all filters
  const resetFilters = () => {
    setSearch("");
    setFilterStatus("");
    setFilterThrough("");
    setFilterReminder("");
    setSortBy("date");
    setCurrentPage(1);
  };

  // Modal handlers
  const handleView = (enquiry) => {
    setSelectedEnquiry(enquiry);
    setModalMode("view");
    setShowModal(true);
  };

  const handleEdit = (enquiry) => {
    setSelectedEnquiry(enquiry);
    setModalMode("edit");
    setShowModal(true);
  };

  // Delete functionality (move to DeletedEnquiries + save reason as comment)
  const confirmDelete = (enquiry) => {
    setDeleteItem(enquiry);
    setDeleteReason("");
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    try {
      const deleteComment = {
        text: `Deleted Reason: ${deleteReason}`.trim(),
        date: new Date().toISOString(),
        id: Date.now(),
      };
      const existing = Array.isArray(deleteItem.comments) ? deleteItem.comments : [];
      const updatedComments = [deleteComment, ...existing];

      const payload = {
        ...deleteItem,
        comments: updatedComments,
        deleteReason: deleteReason,
        deletedAt: new Date().toISOString(),
        originalId: deleteItem.id,
      };

      const newRef = firebaseDB.child("DeletedEnquiries").push();
      await newRef.set(payload);
      await firebaseDB.child(`EnquiryData/${deleteItem.id}`).remove();

      setEnquiries((prev) => prev.filter((e) => e.id !== deleteItem.id));
      setShowDeleteModal(false);
      setDeleteItem(null);
      setDeleteReason("");
    } catch (error) {
      console.error("Error moving to DeletedEnquiries:", error);
      alert("There was an error deleting the enquiry. Please try again.");
    }
  };

  return (
    <div className="container-fluid mt-4">
      <h3 className="mb-3">Enquiries</h3>

      {/* Reminder counts with clickable badges */}
      <div className="alert alert-info d-flex justify-content-around flex-wrap reminder-badges">
        <span className="reminder-badge overdue" onClick={() => setFilterReminder("reminder-overdue")}>
          Overdue: <strong>{reminderCounts.overdue}</strong>
        </span>
        <span className="reminder-badge today" onClick={() => setFilterReminder("reminder-today")}>
          Today: <strong>{reminderCounts.today}</strong>
        </span>
        <span className="reminder-badge tomorrow" onClick={() => setFilterReminder("reminder-tomorrow")}>
          Tomorrow: <strong>{reminderCounts.tomorrow}</strong>
        </span>
        <span className="reminder-badge upcoming" onClick={() => setFilterReminder("reminder-upcoming")}>
          Upcoming: <strong>{reminderCounts.upcoming}</strong>
        </span>
      </div>

      {/* Search + Filter controls */}
      <div className="row mb-3">
        <div className="col-md-3 mb-2">
          <input
            type="text"
            className="form-control"
            placeholder="Search by name, mobile, service..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="col-md-2 mb-2">
          <select className="form-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">All Status</option>
            <option>Enquiry</option>
            <option>Pending</option>
            <option>On Boarding</option>
            <option>No Response</option>
          </select>
        </div>
        <div className="col-md-2 mb-2">
          <select className="form-select" value={filterThrough} onChange={(e) => setFilterThrough(e.target.value)}>
            <option value="">All Through</option>
            {throughOptions.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>
        <div className="col-md-2 mb-2">
          <select className="form-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="date">Sort by Date</option>
            <option value="name">Sort by Name</option>
            <option value="amount">Sort by Amount</option>
            <option value="reminderDate">Sort by Reminder Date</option>
          </select>
        </div>
        <div className="col-md-3 d-flex gap-2 flex-wrap">
          <button className="btn btn-success flex-fill mb-2" onClick={exportToExcel} disabled>
            Excel
          </button>
          <button className="btn btn-info flex-fill mb-2" onClick={exportToCSV} disabled>
            CSV
          </button>
          {/* <button className="btn btn-danger flex-fill mb-2" onClick={exportToPDF}>
            PDF
          </button> */}
          <button className="btn btn-secondary flex-fill mb-2" onClick={resetFilters}>
            Reset
          </button>
        </div>
      </div>

      {/* Main enquiries table */}
      {loading ? (
        <div className="text-center my-4">
          <div className="spinner-border text-primary" role="status"></div>
        </div>
      ) : filteredEnquiries.length === 0 ? (
        <div className="alert alert-warning">No records found.</div>
      ) : (
        <div className="table-responsive">
          <table className="table table-dark table-hover">
            <thead className="table-dark">
              <tr>
                <th>S.No</th>
                <th>Name</th>
                <th>Gender</th>
                <th>Mobile No</th>
                <th>Service</th>
                <th>Amount</th>
                <th>Through</th>
                <th>Status</th>
                <th>Reminder Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentEnquiries.map((enq, idx) => (
                <tr
                  key={enq.id}
                  style={{ cursor: "pointer" }}
                  onClick={(e) => {
                    if (e.target.closest("button,a,.btn")) return;
                    handleView(enq);
                  }}
                >
                  <td>{indexOfFirst + idx + 1}</td>
                  <td>{enq.name}</td>
                  <td>{enq.gender}</td>
                  <td>
                    <a href={`tel:${enq.mobile}`} className="btn btn-sm btn-info me-2">
                      Call
                    </a>
                    <a
                      href={`https://wa.me/${String(enq.mobile || "").replace(/\D/g, "")}?text=${encodeURIComponent(
                        "Hello, This is Sudheer from JenCeo Home Care Services"
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-sm btn-warning"
                    >
                      WAP
                    </a>
                  </td>
                  <td>{enq.service}</td>
                  <td>{enq.amount}</td>
                  <td>{enq.through}</td>
                  {/* Status with color coding */}
                  <td className={getStatusClass(enq.status)}>
                    <span className="status-badge">{enq.status}</span>
                  </td>
                  <td className={getReminderClass(enq.reminderDate)}>
                    <span className="reminder-date">{enq.reminderDate || "-"}</span>
                  </td>
                  <td>
                    <button className="btn btn-sm  me-1" onClick={() => handleView(enq)}>
                      <img src={viewIcon} alt="view" width="18" height="18" />
                    </button>
                    <button className="btn btn-sm  me-1" onClick={() => handleEdit(enq)}>
                      <img src={editIcon} alt="edit" width="15" height="15" />
                    </button>
                    <button className="btn btn-sm" onClick={() => confirmDelete(enq)}>
                      <img src={deleteIcon} alt="delete" width="14" height="14" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination controls */}
      <div className="d-flex justify-content-between align-items-center mt-3 flex-wrap">
        <div className="mb-2">
          <select
            className="form-select form-select-sm w-auto"
            value={recordsPerPage}
            onChange={(e) => {
              setRecordsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
          >
            <option value={10}>10 / Rows</option>
            <option value={25}>25 / Rows</option>
            <option value={50}>50 / Rows</option>
            <option value={100}>100 / Rows</option>
          </select>
        </div>
        {totalPages > 1 && (
          <nav aria-label="Enquiry pagination" className="pagination-wrapper mb-2">
            <ul className="pagination justify-content-center">
              <li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}>
                <button className="page-link" onClick={() => paginate(currentPage - 1)} disabled={currentPage === 1}>
                  Previous
                </button>
              </li>
              {getDisplayedPageNumbers().map((number, index) => (
                <li
                  key={index}
                  className={`page-item ${number === currentPage ? "active" : ""} ${number === "..." ? "disabled" : ""}`}
                >
                  {number === "..." ? (
                    <span className="page-link">...</span>
                  ) : (
                    <button className="page-link" onClick={() => paginate(number)}>
                      {number}
                    </button>
                  )}
                </li>
              ))}
              <li className={`page-item ${currentPage === totalPages ? "disabled" : ""}`}>
                <button className="page-link" onClick={() => paginate(currentPage + 1)} disabled={currentPage === totalPages}>
                  Next
                </button>
              </li>
            </ul>
          </nav>
        )}
      </div>
      <hr />

      {/* Month-wise summary table */}
      <h4 className="mt-5">Month-wise Enquiry Summary</h4>
      <div className="summary-tabs-container">
        <ul className="nav nav-tabs summary-tabs mb-3">
          {years.map((y) => (
            <li className="nav-item" key={y}>
              <button className={`nav-link summary-tab ${activeYear === y ? "active" : ""}`} onClick={() => setActiveYear(y)}>
                {y}
              </button>
            </li>
          ))}
        </ul>
        <div className="table-responsive summary-table-container">
          <table className="table table-dark summary-table table-hover">
            <thead className="summary-table-header">
              <tr>
                <th>Through</th>
                {months.map((m) => (
                  <th key={m}>{m}</th>
                ))}
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {throughOptions.map((t) => (
                <tr key={t} className="summary-table-row">
                  <td className="source-name">{t}</td>
                  {summaryData[t].map((count, idx) => (
                    <td key={idx} className={count > 0 ? "has-data" : ""}>
                      {count > 0 ? count : ""}
                    </td>
                  ))}
                  <td className="total-cell">{summaryData[t].reduce((a, b) => a + b, 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-warning">
                <h5 className="modal-title">Confirm Delete</h5>
                <button type="button" className="btn-close" onClick={() => setShowDeleteModal(false)}></button>
              </div>
              <div className="modal-body">
                <p className="mb-2">
                  Please enter a delete reason. The enquiry will be moved to Deleted Enquiries and the reason will be saved and shown in the modal comments.
                </p>
                <textarea
                  className="form-control"
                  rows={4}
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  placeholder="Delete reason..."
                ></textarea>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>
                  Cancel
                </button>
                <button className="btn btn-primary" onClick={handleDelete} disabled={!deleteReason.trim()}>
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enquiry Modal for view/edit */}
      {showModal && selectedEnquiry && (
        <EnquiryModal
          show={showModal}
          onClose={() => setShowModal(false)}
          enquiry={selectedEnquiry}
          mode={modalMode}
          currentUser="Admin"
          onSaveSuccess={() => fetchEnquiries()}
        />
      )}
    </div>
  );
};

export default EnquiriesDisplay;
