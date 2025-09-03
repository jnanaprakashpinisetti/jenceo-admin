import React, { useState, useEffect } from "react";
import { firebaseDB } from "../../firebase";
import * as XLSX from "xlsx";
import editIcon from '../../assets/eidt.svg';
import viewIcon from '../../assets/view.svg';
import deleteIcon from '../../assets/delete.svg';

const EnquiriesDisplay = () => {
  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterThrough, setFilterThrough] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [reminderCounts, setReminderCounts] = useState({
    overdue: 0,
    today: 0,
    tomorrow: 0,
    upcoming: 0,
  });
  const [activeYear, setActiveYear] = useState(2025);

  const recordsPerPage = 10;

  // Fetch enquiries
  useEffect(() => {
    setLoading(true);
    firebaseDB.child("EnquiryData").on("value", (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const list = Object.keys(data).map((key) => ({
          id: key,
          ...data[key],
        }));
        list.sort((a, b) => new Date(b.date) - new Date(a.date));
        setEnquiries(list);
        updateReminderCounts(list);
      } else {
        setEnquiries([]);
        setReminderCounts({ overdue: 0, today: 0, tomorrow: 0, upcoming: 0 });
      }
      setLoading(false);
    });
  }, []);

  // Reminder counts
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

  // Reminder class
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

  // Filters
  const filteredEnquiries = enquiries.filter((enq) => {
    return (
      (enq.name?.toLowerCase().includes(search.toLowerCase()) ||
        enq.mobile?.includes(search) ||
        enq.service?.toLowerCase().includes(search.toLowerCase()) ||
        enq.through?.toLowerCase().includes(search.toLowerCase())) &&
      (filterStatus ? enq.status === filterStatus : true) &&
      (filterThrough ? enq.through === filterThrough : true)
    );
  });

  // Pagination
  const indexOfLast = currentPage * recordsPerPage;
  const indexOfFirst = indexOfLast - recordsPerPage;
  const currentEnquiries = filteredEnquiries.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(filteredEnquiries.length / recordsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const getDisplayedPageNumbers = () => {
    const delta = 2;
    const range = [];
    for (
      let i = Math.max(2, currentPage - delta);
      i <= Math.min(totalPages - 1, currentPage + delta);
      i++
    ) {
      range.push(i);
    }
    if (currentPage - delta > 2) range.unshift("...");
    if (currentPage + delta < totalPages - 1) range.push("...");
    range.unshift(1);
    if (totalPages > 1) range.push(totalPages);
    return range;
  };

  // Month-wise summary
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const years = Array.from({ length: 11 }, (_, i) => 2025 + i); // 2025 → 2035
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

  // Export to Excel
  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filteredEnquiries);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Enquiries");
    XLSX.writeFile(wb, "Enquiries.xlsx");
  };

  // Reset filters
  const resetFilters = () => {
    setSearch("");
    setFilterStatus("");
    setFilterThrough("");
    setCurrentPage(1);
  };

  // Action buttons
  const handleView = (enquiry) => {
    console.log("View enquiry:", enquiry);
  };

  const handleEdit = (enquiry) => {
    console.log("Edit enquiry:", enquiry);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this enquiry?")) {
      await firebaseDB.child(`EnquiryData/${id}`).remove();
      setEnquiries((prev) => prev.filter((e) => e.id !== id));
    }
  };

  return (
    <div className="container mt-4">
      <h3 className="mb-3">Enquiries</h3>

      {/* Reminder counts */}
      <div className="alert alert-info d-flex justify-content-around">
        <span>Overdue: <strong>{reminderCounts.overdue}</strong></span>
        <span>Today: <strong>{reminderCounts.today}</strong></span>
        <span>Tomorrow: <strong>{reminderCounts.tomorrow}</strong></span>
        <span>Upcoming: <strong>{reminderCounts.upcoming}</strong></span>
      </div>

      {/* Search + Filter */}
      <div className="row mb-3">
        <div className="col-md-3">
          <input
            type="text"
            className="form-control"
            placeholder="Search by name, mobile, service..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="col-md-3">
          <select
            className="form-select"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">All Status</option>
            <option>Enquiry</option>
            <option>Pending</option>
            <option>On Boarding</option>
            <option>No Response</option>
          </select>
        </div>
        <div className="col-md-3">
          <select
            className="form-select"
            value={filterThrough}
            onChange={(e) => setFilterThrough(e.target.value)}
          >
            <option value="">All Through</option>
            {throughOptions.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>
        <div className="col-md-3 d-flex gap-2">
          <button className="btn btn-success flex-fill" onClick={exportToExcel}>
            Export Excel
          </button>
          <button className="btn btn-secondary flex-fill" onClick={resetFilters}>
            Reset
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center my-4">
          <div className="spinner-border text-primary" role="status"></div>
        </div>
      ) : filteredEnquiries.length === 0 ? (
        <div className="alert alert-warning">No records found.</div>
      ) : (
        <div className="table-responsive">
          <table className="table table-dark table-hover">
            <thead className="table-dark sticky-top">
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
                <tr key={enq.id}>
                  <td>{indexOfFirst + idx + 1}</td>
                  <td>{enq.name}</td>
                  <td>{enq.gender}</td>
                  <td>
                    <a href={`tel:${enq.mobile}`} className="btn btn-sm btn-info me-2">Call</a>
                    <a href={`https://wa.me/${enq.mobile}`} target="_blank" rel="noreferrer" className="btn btn-sm btn-warning">WAP</a>
                  </td>
                  <td>{enq.service}</td>
                  <td>{enq.amount}</td>
                  <td>{enq.through}</td>
                  <td>{enq.status}</td>
                  <td className={getReminderClass(enq.reminderDate)}>{enq.reminderDate || "-"}</td>
                  <td>
                    <button className="btn btn-sm " onClick={() => handleView(enq)}>
                      <img src={viewIcon} alt="view Icon" style={{ opacity: 0.6, width: '18px', height: '18px' }} />
                    </button>
                    <button className="btn btn-sm " onClick={() => handleEdit(enq)}>
                       <img src={editIcon} alt="edit Icon" style={{ width: '15px', height: '15px' }} />
                    </button>
                    <button className="btn btn-sm " onClick={() => handleDelete(enq.id)}>
                       <img src={deleteIcon} alt="delete Icon" style={{ width: '14px', height: '14px' }} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination controls */}
      {totalPages > 1 && (
        <nav aria-label="Enquiry pagination" className="pagination-wrapper mt-3">
          <ul className="pagination justify-content-center">
            <li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}>
              <button
                className="page-link"
                onClick={() => paginate(currentPage - 1)}
                disabled={currentPage === 1}
              >
                Previous
              </button>
            </li>

            {getDisplayedPageNumbers().map((number, index) => (
              <li
                key={index}
                className={`page-item ${number === currentPage ? "active" : ""} ${
                  number === "..." ? "disabled" : ""
                }`}
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
              <button
                className="page-link"
                onClick={() => paginate(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next
              </button>
            </li>
          </ul>
        </nav>
      )}

      {/* Month-wise summary */}
      <h4 className="mt-5">Month-wise Enquiry Summary</h4>
      <ul className="nav nav-tabs mb-3">
        {years.map((y) => (
          <li className="nav-item" key={y}>
            <button
              className={`nav-link ${activeYear === y ? "active" : ""}`}
              onClick={() => setActiveYear(y)}
            >
              {y}
            </button>
          </li>
        ))}
      </ul>
      <div className="table-responsive">
        <table className="table table-dark table-hover">
          <thead className="table-secondary sticky-top">
            <tr>
              <th>Through</th>
              {months.map((m) => (
                <th key={m}>{m}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {throughOptions.map((t) => (
              <tr key={t}>
                <td>{t}</td>
                {summaryData[t].map((count, idx) => (
                  <td key={idx}>{count}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EnquiriesDisplay;
