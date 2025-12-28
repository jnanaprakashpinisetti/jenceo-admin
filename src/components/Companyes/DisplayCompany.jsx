// src/pages/companies/DisplayCompany.jsx
import React, { useState, useEffect, useRef } from 'react';
import firebaseDB from '../../firebase';
import editIcon from '../../assets/eidt.svg';
import viewIcon from '../../assets/view.svg';
import deleteIcon from '../../assets/delete.svg';

// CompanyModal is not created yet, so we'll use a placeholder or create it later
// import CompanyModal from './CompanyModal/CompanyModal';

// Temporary placeholder for CompanyModal until you create it
const CompanyModal = ({ company, isOpen, onClose, onSave, isEditMode }) => {
  if (!isOpen) return null;
  
  return (
    <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1" role="dialog" aria-modal="true">
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content">
          <div className="modal-header bg-dark text-white">
            <h5 className="modal-title">
              {isEditMode ? 'Edit Company' : 'View Company'} - {company.companyName}
            </h5>
            <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
          </div>
          <div className="modal-body bg-dark text-white">
            <div className="row">
              <div className="col-md-6">
                <p><strong>Company ID:</strong> {company.companyId}</p>
                <p><strong>Name:</strong> {company.companyName}</p>
                <p><strong>Type:</strong> {company.companyType}</p>
                <p><strong>Ownership:</strong> {company.ownershipType}</p>
                <p><strong>Year Established:</strong> {company.yearOfEstablishment}</p>
              </div>
              <div className="col-md-6">
                <p><strong>Primary Contact:</strong> {company.primaryContactName}</p>
                <p><strong>Mobile:</strong> {company.primaryMobile}</p>
                <p><strong>Email:</strong> {company.officialEmail}</p>
                <p><strong>Location:</strong> {company.registeredDistrict}, {company.registeredState}</p>
                <p><strong>Status:</strong> <span className={`badge ${company.approvalStatus === 'Approved' ? 'bg-success' : company.approvalStatus === 'Pending' ? 'bg-warning' : 'bg-danger'}`}>
                  {company.approvalStatus}
                </span></p>
              </div>
            </div>
            {isEditMode && (
              <div className="mt-3">
                <p className="text-warning">Edit functionality will be implemented in the full CompanyModal component</p>
              </div>
            )}
          </div>
          <div className="modal-footer bg-dark">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Close</button>
            {isEditMode && (
              <button type="button" className="btn btn-primary" onClick={() => onSave(company)}>Save Changes</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Default logo image
const DEFAULT_COMPANY_LOGO = "https://firebasestorage.googleapis.com/v0/b/jenceo-admin.firebasestorage.app/o/OfficeFiles%2FSample-Photo.jpg?alt=media&token=01855b47-c9c2-490e-b400-05851192dde7";

// Updated COMPANY_CATEGORIES to match CompanyRegForm.js paths
const COMPANY_CATEGORIES = {
  "Home Care Companies": "CompanyData/HomeCare/Running",
  "Housekeeping Companies": "CompanyData/Housekeeping/Running",
  "Office & Corporate Companies": "CompanyData/Office/Running",
  "Factory & Manufacturing Companies": "CompanyData/Factorys/Running",
  "Industrial Companies": "CompanyData/Industrial/Running",
  "Construction Companies": "CompanyData/Construction/Running",
  "Retail & Shop Companies": "CompanyData/Retail/Running",
  "Hospital & Healthcare Companies": "CompanyData/Hospital/Running",
  "Hotel & Hospitality Companies": "CompanyData/Hotel/Running",
  "Warehouse & Logistics Companies": "CompanyData/Warehouse/Running",
  "Security Service Companies": "CompanyData/Security/Running",
  "Driving & Transport Companies": "CompanyData/Driving/Running",
  "Technical & Maintenance Companies": "CompanyData/Technical/Running",
  "Customer Service & BPO Companies": "CompanyData/CustomerService/Running",
  "Management & Admin Companies": "CompanyData/Management/Running",
  "Government & Public Sector Companies": "CompanyData/Government/Running",
  "Education & Institution Companies": "CompanyData/Education/Running",
  "Other Companies": "CompanyData/Others/Running"
};

const CATEGORY_ORDER = [
  "Home Care Companies",
  "Housekeeping Companies",
  "Office & Corporate Companies",
  "Factory & Manufacturing Companies",
  "Industrial Companies",
  "Construction Companies",
  "Retail & Shop Companies",
  "Hospital & Healthcare Companies",
  "Hotel & Hospitality Companies",
  "Warehouse & Logistics Companies",
  "Security Service Companies",
  "Driving & Transport Companies",
  "Technical & Maintenance Companies",
  "Customer Service & BPO Companies",
  "Management & Admin Companies",
  "Government & Public Sector Companies",
  "Education & Institution Companies",
  "Other Companies"
];

// Filter options
const BUSINESS_TYPE_OPTIONS = [
  "Home Care", "Housekeeping", "Office / Corporate", "Factory / Manufacturing",
  "Industrial", "Construction", "Retail / Shop", "Hospital / Healthcare",
  "Hotel / Hospitality", "Warehouse / Logistics", "Security Services",
  "Driving / Transport", "Technical / Maintenance", "Customer Service / BPO",
  "Management / Administration", "Government / Public Sector",
  "Education / Institutions", "Others"
];

const OWNERSHIP_OPTIONS = [
  "Sole Proprietorship", "Partnership", "Private Limited", "Public Limited",
  "LLP", "Government", "Non-Profit", "Other"
];

const STATE_OPTIONS = [
  "Andhra Pradesh", "Telangana", "Karnataka", "Tamil Nadu", "Kerala",
  "Maharashtra", "Delhi", "Uttar Pradesh", "Gujarat", "Rajasthan",
  "Madhya Pradesh", "West Bengal", "Other"
];

const APPROVAL_STATUS_OPTIONS = ["Pending", "Approved", "Rejected", "On Hold"];

// Reminder filter options
const REMINDER_FILTER_OPTIONS = [
  { value: "all", label: "All Reminders" },
  { value: "overdue", label: "Overdue" },
  { value: "today", label: "Today" },
  { value: "tomorrow", label: "Tomorrow" },
  { value: "upcoming", label: "Upcoming" },
  { value: "none", label: "No Reminder" }
];

export default function DisplayCompany() {
  const [allCompanies, setAllCompanies] = useState({});
  const [filteredCompanies, setFilteredCompanies] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [activeTab, setActiveTab] = useState("Home Care Companies");

  // Simplified filters - removed unnecessary ones
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedApprovalStatus, setSelectedApprovalStatus] = useState("All");
  const [reminderFilter, setReminderFilter] = useState("all"); // New reminder filter
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [companyCounts, setCompanyCounts] = useState({});

  // Reminder counts state
  const [reminderCounts, setReminderCounts] = useState({
    overdue: 0,
    today: 0,
    tomorrow: 0,
    upcoming: 0
  });

  // Delete states
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState(null);
  const [showDeleteReasonModal, setShowDeleteReasonModal] = useState(false);
  const [showDeleteSuccessModal, setShowDeleteSuccessModal] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const [reasonError, setReasonError] = useState(null);
  const [commentError, setCommentError] = useState(null);
  const [deleteReasonForm, setDeleteReasonForm] = useState({ reasonType: "", comment: "" });

  // Refs for validation
  const reasonSelectRef = useRef(null);
  const commentRef = useRef(null);

  // Date helper functions from WorkerCalleDisplay
  const parseDate = (v) => {
    if (!v) return null;
    if (typeof v === "object" && v && "seconds" in v)
      return new Date(v.seconds * 1000);
    if (v instanceof Date && !isNaN(v.getTime())) return v;
    if (typeof v === "number") {
      const n = new Date(v);
      return isNaN(n.getTime()) ? null : n;
    }
    if (typeof v === "string") {
      const s = v.trim();
      if (!s) return null;
      const iso = new Date(s);
      if (!isNaN(iso.getTime())) return iso;
      const parts = s.split(/[\/-]/);
      if (parts.length === 3) {
        let y, m, d;
        if (parts[0].length === 4) {
          y = +parts[0];
          m = +parts[1] - 1;
          d = +parts[2];
        } else if (+parts[0] > 12) {
          d = +parts[0];
          m = +parts[1] - 1;
          y = +parts[2];
        } else {
          m = +parts[0] - 1;
          d = +parts[1];
          y = +parts[2];
        }
        const dt = new Date(y, m, d);
        if (!isNaN(dt.getTime())) return dt;
      }
    }
    const dt = new Date(v);
    return isNaN(dt.getTime()) ? null : dt;
  };

  const isValidDate = (d) => d instanceof Date && !isNaN(d.getTime());

  const daysUntil = (v) => {
    const d = parseDate(v);
    if (!isValidDate(d)) return Number.POSITIVE_INFINITY;
    const startOfDay = (date) => {
      const x = new Date(date);
      x.setHours(0, 0, 0, 0);
      return x;
    };
    return Math.ceil(
      (startOfDay(d) - startOfDay(new Date())) / (1000 * 60 * 60 * 24)
    );
  };

  // Calculate reminder counts for active tab
  const calculateReminderCounts = (companies) => {
    const counts = {
      overdue: 0,
      today: 0,
      tomorrow: 0,
      upcoming: 0
    };

    companies.forEach((company) => {
      const endDate = company.contractEndDate;
      if (!endDate) return;

      const du = daysUntil(endDate);
      if (!isFinite(du)) return;

      if (du < 0) {
        counts.overdue++;
      } else if (du === 0) {
        counts.today++;
      } else if (du === 1) {
        counts.tomorrow++;
      } else if (du > 1 && du <= 30) {
        counts.upcoming++;
      }
    });

    return counts;
  };

  // Fetch all companies from all categories
  useEffect(() => {
    const fetchAllCompanies = async () => {
      setLoading(true);
      try {
        const companiesByCategory = {};
        const counts = {};
        
        for (const [categoryName, dbPath] of Object.entries(COMPANY_CATEGORIES)) {
          try {
            const snapshot = await firebaseDB.child(dbPath).once('value');
            if (snapshot.exists()) {
              const companiesData = [];
              snapshot.forEach((childSnapshot) => {
                const companyData = childSnapshot.val();
                companiesData.push({
                  id: childSnapshot.key,
                  category: categoryName,
                  dbPath: dbPath,
                  ...companyData
                });
              });
              
              // Sort companies by ID number in descending order
              const sortedCompanies = sortCompaniesDescending(companiesData);
              companiesByCategory[categoryName] = sortedCompanies;
              counts[categoryName] = sortedCompanies.length;
            } else {
              companiesByCategory[categoryName] = [];
              counts[categoryName] = 0;
            }
          } catch (err) {
            console.error(`Error fetching ${categoryName}:`, err);
            companiesByCategory[categoryName] = [];
            counts[categoryName] = 0;
          }
        }
        
        setAllCompanies(companiesByCategory);
        setFilteredCompanies(companiesByCategory);
        setCompanyCounts(counts);
        
        // Calculate total pages for active tab
        const activeCompanies = companiesByCategory[activeTab] || [];
        setTotalPages(Math.ceil(activeCompanies.length / rowsPerPage));
        
        // Calculate reminder counts for active tab
        const reminderCounts = calculateReminderCounts(activeCompanies);
        setReminderCounts(reminderCounts);
        
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchAllCompanies();
  }, []);

  // Filter companies based on search term and filters
  useEffect(() => {
    const applyFilters = (companies) => {
      let filtered = [...companies];

      // — Search —
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filtered = filtered.filter((company) =>
          (company.companyName && company.companyName.toLowerCase().includes(term)) ||
          (company.companyId && company.companyId.toLowerCase().includes(term)) ||
          (company.primaryContactName && company.primaryContactName.toLowerCase().includes(term)) ||
          (company.officialEmail && company.officialEmail.toLowerCase().includes(term)) ||
          (company.registrationNo && company.registrationNo.toLowerCase().includes(term)) ||
          (company.gstinNo && company.gstinNo.toLowerCase().includes(term)) ||
          (company.registeredDistrict && company.registeredDistrict.toLowerCase().includes(term)) ||
          (company.primaryMobile && company.primaryMobile.toLowerCase().includes(term))
        );
      }

      // — Approval Status —
      if (selectedApprovalStatus !== "All") {
        filtered = filtered.filter((company) => 
          (company.approvalStatus || "Pending") === selectedApprovalStatus
        );
      }

      // — Reminder Filter — (new)
      if (reminderFilter !== "all") {
        switch (reminderFilter) {
          case "overdue":
            filtered = filtered.filter((company) => {
              const du = daysUntil(company.contractEndDate);
              return isFinite(du) && du < 0;
            });
            break;
          case "today":
            filtered = filtered.filter((company) => {
              const du = daysUntil(company.contractEndDate);
              return isFinite(du) && du === 0;
            });
            break;
          case "tomorrow":
            filtered = filtered.filter((company) => {
              const du = daysUntil(company.contractEndDate);
              return isFinite(du) && du === 1;
            });
            break;
          case "upcoming":
            filtered = filtered.filter((company) => {
              const du = daysUntil(company.contractEndDate);
              return isFinite(du) && du > 1 && du <= 30;
            });
            break;
          case "none":
            filtered = filtered.filter((company) => 
              !company.contractEndDate
            );
            break;
          default:
            break;
        }
      }

      return filtered;
    };

    // Apply filters to all categories
    const newFiltered = {};
    Object.keys(allCompanies).forEach(category => {
      newFiltered[category] = applyFilters(allCompanies[category]);
    });
    
    setFilteredCompanies(newFiltered);
    
    // Calculate total pages for active tab
    const activeCompanies = newFiltered[activeTab] || [];
    setTotalPages(Math.ceil(activeCompanies.length / rowsPerPage));
    
    // Calculate reminder counts for active tab
    const reminderCounts = calculateReminderCounts(activeCompanies);
    setReminderCounts(reminderCounts);
    
    setCurrentPage(1);
  }, [
    allCompanies,
    searchTerm,
    selectedApprovalStatus,
    reminderFilter,
    activeTab,
    rowsPerPage
  ]);

  // Update total pages and reminder counts when active tab or rowsPerPage changes
  useEffect(() => {
    const activeCompanies = filteredCompanies[activeTab] || [];
    setTotalPages(Math.ceil(activeCompanies.length / rowsPerPage));
    
    // Calculate reminder counts for active tab
    const reminderCounts = calculateReminderCounts(activeCompanies);
    setReminderCounts(reminderCounts);
    
    setCurrentPage(1);
  }, [filteredCompanies, activeTab, rowsPerPage]);

  const sortCompaniesDescending = (companiesData) => {
    return [...companiesData].sort((a, b) => {
      const getNumber = (id) => {
        if (!id) return 0;
        const match = String(id).match(/(\d+)(?!.*\d)/);
        return match ? parseInt(match[1], 10) : 0;
      };

      const idA = a.companyId || a.id || '';
      const idB = b.companyId || b.id || '';

      const numA = getNumber(idA);
      const numB = getNumber(idB);

      // DESC order
      if (numA !== numB) return numB - numA;

      // fallback string compare
      return idB.localeCompare(idA);
    });
  };

  // Calculate current companies to display
  const currentCompanies = () => {
    const companies = filteredCompanies[activeTab] || [];
    const indexOfLastCompany = currentPage * rowsPerPage;
    const indexOfFirstCompany = indexOfLastCompany - rowsPerPage;
    return companies.slice(indexOfFirstCompany, indexOfLastCompany);
  };

  // Change page
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Handle rows per page change
  const handleRowsPerPageChange = (e) => {
    setRowsPerPage(parseInt(e.target.value));
  };

  // Handle search input change
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  // Generate page numbers for pagination
  const pageNumbers = [];
  for (let i = 1; i <= totalPages; i++) {
    pageNumbers.push(i);
  }

  // Show limited page numbers with ellipsis for many pages
  const getDisplayedPageNumbers = () => {
    if (totalPages <= 7) {
      return pageNumbers;
    }

    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages];
    }

    if (currentPage >= totalPages - 3) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }

    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
  };

  const handleView = (company) => {
    setSelectedCompany(company);
    setIsEditMode(false);
    setIsModalOpen(true);
  };

  const handleEdit = (company) => {
    setSelectedCompany(company);
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  const openDeleteConfirm = (company) => {
    setCompanyToDelete(company);
    setShowDeleteConfirm(true);
  };

  const closeDeleteConfirm = () => {
    setShowDeleteConfirm(false);
  };

  // Check if any filter is active
  const hasActiveFilters = Boolean(
    selectedApprovalStatus !== "All" ||
    searchTerm ||
    reminderFilter !== "all"
  );

  // Reset all filters
  const resetFilters = () => {
    setSelectedApprovalStatus("All");
    setSearchTerm("");
    setReminderFilter("all");
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  // Format reminder text
  const getReminderText = (company) => {
    const endDate = company.contractEndDate;
    if (!endDate) return { text: 'No Contract', class: 'text-secondary' };
    
    const du = daysUntil(endDate);
    if (!isFinite(du)) return { text: 'N/A', class: 'text-secondary' };
    
    if (du < 0) return { text: `${Math.abs(du)} days overdue`, class: 'text-danger' };
    if (du === 0) return { text: 'Ends today', class: 'text-warning' };
    if (du === 1) return { text: 'Ends tomorrow', class: 'text-info' };
    if (du <= 7) return { text: `Ends in ${du} days`, class: 'text-warning' };
    if (du <= 30) return { text: `Ends in ${du} days`, class: 'text-success' };
    return { text: `Ends in ${du} days`, class: 'text-success' };
  };

  // When user confirms on the first confirm -> open reason modal
  const handleDeleteConfirmProceed = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setShowDeleteConfirm(false);
    setDeleteReasonForm({ reasonType: "", comment: "" });
    setDeleteError(null);
    setReasonError(null);
    setCommentError(null);
    setShowDeleteReasonModal(true);

    setTimeout(() => {
      if (reasonSelectRef.current) reasonSelectRef.current.focus();
    }, 50);
  };

  // Validate locally and show inline errors
  const validateDeleteForm = () => {
    let ok = true;
    setReasonError(null);
    setCommentError(null);

    if (!deleteReasonForm.reasonType) {
      setReasonError("Please select a reason.");
      ok = false;
    }
    if (!deleteReasonForm.comment || !deleteReasonForm.comment.trim()) {
      setCommentError("Comment is mandatory.");
      ok = false;
    }

    setTimeout(() => {
      if (!ok) {
        if (reasonError && reasonSelectRef.current) {
          reasonSelectRef.current.focus();
          reasonSelectRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return;
        }
        if (commentError && commentRef.current) {
          commentRef.current.focus();
          commentRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return;
        }
        if (!deleteReasonForm.reasonType && reasonSelectRef.current) {
          reasonSelectRef.current.focus();
          reasonSelectRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else if ((!deleteReasonForm.comment || !deleteReasonForm.comment.trim()) && commentRef.current) {
          commentRef.current.focus();
          commentRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }, 0);

    return ok;
  };

  // When user submits reason -> actually perform delete / move
  const handleDeleteSubmitWithReason = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    // local validation first
    const ok = validateDeleteForm();
    if (!ok) {
      return;
    }

    if (!companyToDelete) {
      setDeleteError("No company selected for deletion.");
      return;
    }

    const { id, dbPath } = companyToDelete;
    try {
      // read company data
      const snapshot = await firebaseDB.child(`${dbPath}/${id}`).once("value");
      const companyData = snapshot.val();
      if (!companyData) {
        setDeleteError("Company data not found");
        return;
      }

      // Create archive path - Updated to match new structure
      const archivePath = dbPath.replace("CompanyData/", "CompanyArchive/").replace("/Running", "");
      
      // Create exit path if it doesn't exist
      const archiveRef = firebaseDB.child(archivePath);
      
      // attach removal metadata
      const payloadToArchive = { 
        ...companyData,
        originalId: id,
        movedAt: new Date().toISOString(),
        removalReason: deleteReasonForm.reasonType,
        removalComment: deleteReasonForm.comment,
        removedBy: 'UI',
        removedAt: new Date().toISOString()
      };

      // Save company record under Archive
      await firebaseDB.child(`${archivePath}/${id}`).set(payloadToArchive);
      
      // Remove from original location
      await firebaseDB.child(`${dbPath}/${id}`).remove();
      
      // Update local state
      setAllCompanies(prev => ({
        ...prev,
        [companyToDelete.category]: prev[companyToDelete.category].filter(company => company.id !== id)
      }));
      
      // success -> close modal, clear states and show success modal
      setShowDeleteReasonModal(false);
      setCompanyToDelete(null);
      setShowDeleteSuccessModal(true);
      setDeleteError(null);
      setReasonError(null);
      setCommentError(null);
    } catch (err) {
      console.error(err);
      setDeleteError('Error deleting company: ' + (err.message || err));
    }
  };

  const handleSave = async (updatedCompany) => {
    try {
      await firebaseDB.child(`${updatedCompany.dbPath}/${updatedCompany.id}`).update(updatedCompany);
      setIsModalOpen(false);
    } catch (err) {
      setError('Error updating company: ' + err.message);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedCompany(null);
    setIsEditMode(false);
  };

  // Status badge styling
  const getApprovalStatusBadgeClass = (status) => {
    switch (status) {
      case 'Approved': return 'bg-success';
      case 'Pending': return 'bg-warning';
      case 'Rejected': return 'bg-danger';
      case 'On Hold': return 'bg-info';
      default: return 'bg-secondary';
    }
  };

  // Rating stars display
  const renderRatingStars = (rating) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    return (
      <div className="d-flex">
        {[...Array(fullStars)].map((_, i) => (
          <span key={`full-${i}`} className="text-warning">★</span>
        ))}
        {hasHalfStar && <span className="text-warning">☆</span>}
        {[...Array(emptyStars)].map((_, i) => (
          <span key={`empty-${i}`} className="text-secondary">☆</span>
        ))}
        <span className="ms-1 small">({rating})</span>
      </div>
    );
  };

  // Get company logo URL
  const getCompanyLogo = (company) => {
    // Check for logo fields in priority order
    const logoFields = [
      'companyLogoUrl',
      'logoUrl',
      'logo',
      'companyLogo',
      'photoUrl',
      'photo'
    ];
    
    for (const field of logoFields) {
      if (company[field]) {
        return company[field];
      }
    }
    
    return DEFAULT_COMPANY_LOGO;
  };

  // Handle reminder badge click
  const handleReminderBadgeClick = (type) => {
    setReminderFilter(type);
  };

  if (loading) return <div className="text-center my-5">Loading companies...</div>;
  if (error) return <div className="alert alert-danger">Error: {error}</div>;

  // Get current tab companies
  const activeCompanies = filteredCompanies[activeTab] || [];
  const currentTabCompanies = currentCompanies();
  const totalFiltered = activeCompanies.length;

  return (
    <div className='displayCompany'>
      {/* Category Tabs */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="p-3 bg-dark border border-secondary rounded-3 border-opacity-">
            <h5 className="mb-3 text-center text-warning">Company Categories</h5>
            <div className="d-flex flex-wrap gap-2 justify-content-center">
              {CATEGORY_ORDER.map(category => {
                const count = companyCounts[category] || 0;
                const filteredCount = (filteredCompanies[category] || []).length;
                const isActive = activeTab === category;
                return (
                  <button
                    key={category}
                    type="button"
                    className={`btn btn-sm ${isActive ? "btn-warning" : "btn-outline-warning"} position-relative`}
                    onClick={() => {
                      setActiveTab(category);
                      setCurrentPage(1);
                    }}
                  >
                    {category.replace(' Companies', '')}
                    <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                      {filteredCount}
                      <span className="visually-hidden">companies</span>
                    </span>
                    {!isActive && count > 0 && (
                      <small className="d-block text-muted">Total: {count}</small>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Active Category Info */}
      <div className="row mb-3">
        <div className="col-12">
          <div className="p-3 bg-dark border border-warning rounded-3 border-opacity-25">
            <div className="row align-items-center">
              <div className="col-md-3">
                <h4 className="text-warning mb-0">{activeTab}</h4>
                <p className="text-info mb-0">
                  Total: {companyCounts[activeTab] || 0} | 
                  Showing: {totalFiltered} {totalFiltered !== (companyCounts[activeTab] || 0) ? `(Filtered)` : ''}
                </p>
              </div>
              <div className="col-md-9">
                <div className="input-group">
                  <span className="input-group-text">
                    <i className="bi bi-search"></i>
                  </span>
                  <input
                    type="text"
                    className="form-control search-bar"
                    placeholder={`Search ${activeTab}...`}
                    value={searchTerm}
                    onChange={handleSearchChange}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reminder Badges - Added as requested */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="alert alert-info text-info d-flex justify-content-around flex-wrap reminder-badges mb-4">
            <span 
              role="button" 
              className={`reminder-badge overdue ${reminderFilter === 'overdue' ? 'active' : ''}`}
              onClick={() => handleReminderBadgeClick('overdue')}
            >
              Overdue: <strong>{reminderCounts.overdue}</strong>
            </span>
            <span 
              role="button" 
              className={`reminder-badge today ${reminderFilter === 'today' ? 'active' : ''}`}
              onClick={() => handleReminderBadgeClick('today')}
            >
              Today: <strong>{reminderCounts.today}</strong>
            </span>
            <span 
              role="button" 
              className={`reminder-badge tomorrow ${reminderFilter === 'tomorrow' ? 'active' : ''}`}
              onClick={() => handleReminderBadgeClick('tomorrow')}
            >
              Tomorrow: <strong>{reminderCounts.tomorrow}</strong>
            </span>
            <span 
              role="button" 
              className={`reminder-badge upcoming ${reminderFilter === 'upcoming' ? 'active' : ''}`}
              onClick={() => handleReminderBadgeClick('upcoming')}
            >
              Upcoming: <strong>{reminderCounts.upcoming}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Filters Row - Simplified with only Approval Status and Reminder Filter */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="p-3 bg-dark border border-secondary rounded-3 border-opacity-25 companyFilter">
            <div className="row g-3 align-items-center">
              {/* Approval Status Filter */}
              <div className="col-lg-3 col-md-4">
                <label className="form-label small mb-2 text-info">Approval Status</label>
                <select
                  className="form-select form-select-sm"
                  value={selectedApprovalStatus}
                  onChange={(e) => setSelectedApprovalStatus(e.target.value)}
                >
                  <option value="All">All Status</option>
                  {APPROVAL_STATUS_OPTIONS.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>

              {/* Reminder Filter */}
              <div className="col-lg-3 col-md-4">
                <label className="form-label small mb-2 text-warning">Contract Reminder</label>
                <select
                  className="form-select form-select-sm"
                  value={reminderFilter}
                  onChange={(e) => setReminderFilter(e.target.value)}
                >
                  {REMINDER_FILTER_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Reset filter */}
              <div className="col-lg-2 col-md-4 text-center">
                <label className="form-label small mb-2 text-warning">Reset Filters</label>
                <div className="d-flex flex-column align-items-center gap-2">
                  <button
                    type="button"
                    className={`btn btn-outline-warning btn-sm mt-2 reset-btn ${hasActiveFilters ? "btn-pulse" : ""}`}
                    onClick={resetFilters}
                  >
                    Reset Filters
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pagination Controls */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="chec-box-card">
            <div className="card-body py-2 filter-wrapper">
              <div className="row w-100">
                <div className="col-md-3 d-flex align-items-center">
                  <p className='text-warning mb-0'>
                    Showing: {(currentPage - 1) * rowsPerPage + 1} - {Math.min(currentPage * rowsPerPage, totalFiltered)} / {totalFiltered}
                  </p>
                </div>

                <div className="col-md-6 d-flex align-items-center justify-content-center">
                  {totalPages > 1 && (
                    <nav aria-label="Company pagination" className="pagination-wrapper">
                      <ul className="pagination justify-content-center align-items-center">
                        {/* First page button */}
                        <li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}>
                          <button
                            type="button"
                            className="page-link"
                            aria-label="First"
                            onClick={() => paginate(1)}
                            disabled={currentPage === 1}
                          >
                            «
                          </button>
                        </li>

                        {/* Previous page */}
                        <li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}>
                          <button
                            type="button"
                            className="page-link"
                            aria-label="Previous"
                            onClick={() => paginate(currentPage - 1)}
                            disabled={currentPage === 1}
                          >
                            ‹
                          </button>
                        </li>

                        {/* Page numbers */}
                        {getDisplayedPageNumbers().map((number, index) => (
                          <li
                            key={index}
                            className={`page-item ${number === currentPage ? "active" : ""} ${number === "..." ? "disabled" : ""
                              }`}
                          >
                            {number === "..." ? (
                              <span className="page-link">…</span>
                            ) : (
                              <button
                                type="button"
                                className="page-link"
                                onClick={() => paginate(number)}
                              >
                                {number}
                              </button>
                            )}
                          </li>
                        ))}

                        {/* Next page */}
                        <li className={`page-item ${currentPage === totalPages ? "disabled" : ""}`}>
                          <button
                            type="button"
                            className="page-link"
                            aria-label="Next"
                            onClick={() => paginate(currentPage + 1)}
                            disabled={currentPage === totalPages}
                          >
                            ›
                          </button>
                        </li>

                        {/* Last page button */}
                        <li className={`page-item ${currentPage === totalPages ? "disabled" : ""}`}>
                          <button
                            type="button"
                            className="page-link"
                            aria-label="Last"
                            onClick={() => paginate(totalPages)}
                            disabled={currentPage === totalPages}
                          >
                            »
                          </button>
                        </li>
                      </ul>
                    </nav>
                  )}
                </div>
                <div className="col-md-3 d-flex align-items-center justify-content-end">
                  <span className="me-2">Show</span>
                  <select
                    className="form-select form-select-sm"
                    style={{ width: '80px' }}
                    value={rowsPerPage}
                    onChange={handleRowsPerPageChange}
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={30}>30</option>
                    <option value={40}>40</option>
                    <option value={50}>50</option>
                  </select>
                  <span className="ms-2">entries</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Companies Table with Logo Column - Updated with Reminder */}
      <div className="table-responsive mb-3">
        <table className="table table-dark table-hover">
          <thead className="table-dark">
            <tr>
              <th>Logo</th>
              <th>Company ID ↓</th>
              <th>Company Name</th>
              <th>Primary Contact</th>
              <th>Location</th>
              <th>Business Type</th>
              <th>Rating</th>
              <th>Status</th>
              <th>Reminder</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentTabCompanies.length > 0 ? (
              currentTabCompanies.map((company) => {
                const reminderInfo = getReminderText(company);
                return (
                  <tr key={company.id} onClick={(e) => { e.stopPropagation(); handleView(company); }} style={{ cursor: 'pointer' }}>
                    {/* Company Logo */}
                    <td>
                      <img
                        src={getCompanyLogo(company)}
                        alt={`${company.companyName} logo`}
                        style={{
                          width: '50px',
                          height: '50px',
                          objectFit: 'cover',
                          borderRadius: '8px',
                          border: '2px solid #444'
                        }}
                        onError={(e) => {
                          e.target.src = DEFAULT_COMPANY_LOGO;
                        }}
                        referrerPolicy="no-referrer"
                      />
                    </td>
                    
                    <td>
                      <strong>{company.companyId || 'N/A'}</strong>
                      <small className="small-text d-block mt-1 text-info opacity-75">
                        By <strong>{company.createdByName || "System"}</strong>
                      </small>
                    </td>
                    <td>
                      {company.companyName || 'N/A'}
                      {company.branchName && (
                        <small className="d-block text-muted">Branch: {company.branchName}</small>
                      )}
                    </td>
                    <td>
                      {company.primaryContactName || 'N/A'}
                      {company.primaryMobile && (
                        <div className="mt-1">
                          <a href={`tel:${company.primaryMobile}`} className="btn btn-sm btn-info me-1" onClick={(e) => e.stopPropagation()}>
                            Call
                          </a>
                          <a
                            className="btn btn-sm btn-warning"
                            href={`https://wa.me/${company.primaryMobile.replace(/\D/g, '')}?text=${encodeURIComponent(
                              `Hello ${company.primaryContactName}, This is from JenCeo regarding ${company.companyName}`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                          >
                            WAP
                          </a>
                        </div>
                      )}
                    </td>
                    <td>
                      {company.registeredDistrict || 'N/A'}
                      {company.registeredState && (
                        <small className="d-block text-muted">{company.registeredState}</small>
                      )}
                    </td>
                    <td>
                      {company.companyType || 'N/A'}
                      {company.ownershipType && (
                        <small className="d-block text-muted">{company.ownershipType}</small>
                      )}
                    </td>
                    <td>
                      {renderRatingStars(company.rating || 0)}
                    </td>
                    <td>
                      <span className={`badge ${getApprovalStatusBadgeClass(company.approvalStatus)}`}>
                        {company.approvalStatus || 'Pending'}
                      </span>
                    </td>
                    <td className={reminderInfo.class}>
                      {reminderInfo.text}
                      {company.contractEndDate && (
                        <small className="d-block text-muted">
                          {formatDate(company.contractEndDate)}
                        </small>
                      )}
                    </td>
                    <td>
                      <div className="d-flex">
                        <button
                          type="button"
                          className="btn btn-sm me-2"
                          title="View"
                          onClick={(e) => { e.stopPropagation(); handleView(company); }}
                        >
                          <img src={viewIcon} alt="view Icon" style={{ opacity: 0.6, width: '18px', height: '18px' }} />
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm me-2"
                          title="Edit"
                          onClick={(e) => { e.stopPropagation(); handleEdit(company); }}
                        >
                          <img src={editIcon} alt="edit Icon" style={{ width: '15px', height: '15px' }} />
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm"
                          title="Delete"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCompanyToDelete(company);
                            setShowDeleteConfirm(true);
                          }}
                        >
                          <img src={deleteIcon} alt="delete Icon" style={{ width: '14px', height: '14px' }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="10" className="text-center py-4">
                  No companies found in {activeTab} matching your search criteria
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Bottom Pagination */}
      <div className='d-flex align-items-center justify-content-center'>
        {totalPages > 1 && (
          <nav aria-label="Company pagination" className="pagination-wrapper">
            <ul className="pagination justify-content-center align-items-center">
              {/* First page button */}
              <li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}>
                <button
                  type="button"
                  className="page-link"
                  aria-label="First"
                  onClick={() => paginate(1)}
                  disabled={currentPage === 1}
                >
                  «
                </button>
              </li>

              {/* Previous page */}
              <li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}>
                <button
                  type="button"
                  className="page-link"
                  aria-label="Previous"
                  onClick={() => paginate(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  ‹
                </button>
              </li>

              {/* Page numbers */}
              {getDisplayedPageNumbers().map((number, index) => (
                <li
                  key={index}
                  className={`page-item ${number === currentPage ? "active" : ""} ${number === "..." ? "disabled" : ""
                    }`}
                >
                  {number === "..." ? (
                    <span className="page-link">…</span>
                  ) : (
                    <button
                      type="button"
                      className="page-link"
                      onClick={() => paginate(number)}
                    >
                      {number}
                    </button>
                  )}
                </li>
              ))}

              {/* Next page */}
              <li className={`page-item ${currentPage === totalPages ? "disabled" : ""}`}>
                <button
                  type="button"
                  className="page-link"
                  aria-label="Next"
                  onClick={() => paginate(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  ›
                </button>
              </li>

              {/* Last page button */}
              <li className={`page-item ${currentPage === totalPages ? "disabled" : ""}`}>
                <button
                  type="button"
                  className="page-link"
                  aria-label="Last"
                  onClick={() => paginate(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  »
                </button>
              </li>
            </ul>
          </nav>
        )}
      </div>

      {/* Delete Success Modal */}
      {showDeleteSuccessModal && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1" role="dialog" aria-modal="true">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-success text-white">
                <h5 className="modal-title">Moved Successfully</h5>
                <button type="button" className="btn-close" onClick={() => setShowDeleteSuccessModal(false)}></button>
              </div>
              <div className="modal-body">
                Company moved to Archive successfully.
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-success" onClick={() => setShowDeleteSuccessModal(false)}>Done</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Global delete/server error */}
      {deleteError && !showDeleteReasonModal && (
        <div className="alert alert-danger mt-2">{deleteError}</div>
      )}

      {selectedCompany && (
        <CompanyModal
          company={selectedCompany}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSave={handleSave}
          isEditMode={isEditMode}
        />
      )}

      {/* Delete Confirm Modal */}
      {showDeleteConfirm && companyToDelete && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1" role="dialog" aria-modal="true">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Confirm Delete</h5>
                <button type="button" className="btn-close" onClick={() => setShowDeleteConfirm(false)}></button>
              </div>
              <div className="modal-body">
                <p>Do you want to move the Company to Archive?</p>
                <p><strong>ID:</strong> {companyToDelete.companyId || companyToDelete.id}</p>
                <p><strong>Name:</strong> {companyToDelete.companyName}</p>
                <p><strong>Category:</strong> {companyToDelete.category}</p>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
                <button type="button" className="btn btn-danger" onClick={handleDeleteConfirmProceed}>Move to Archive</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Reason Modal */}
      {showDeleteReasonModal && companyToDelete && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1" role="dialog" aria-modal="true">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Reason for Archiving Company</h5>
                <button type="button" className="btn-close" onClick={() => setShowDeleteReasonModal(false)}></button>
              </div>
              <div className="modal-body">
                {deleteError && <div className="alert alert-danger">{deleteError}</div>}

                <div className="mb-3">
                  <label className="form-label"><strong>Reason</strong></label>
                  <select
                    ref={reasonSelectRef}
                    className={`form-select ${reasonError ? 'is-invalid' : ''}`}
                    value={deleteReasonForm.reasonType}
                    onChange={(e) => {
                      setDeleteReasonForm(prev => ({ ...prev, reasonType: e.target.value }));
                      setReasonError(null);
                    }}
                  >
                    <option value="">Select Reason</option>
                    <option value="Contract Expired">Contract Expired</option>
                    <option value="Contract Terminated">Contract Terminated</option>
                    <option value="Company Closed">Company Closed</option>
                    <option value="Merged with Another">Merged with Another</option>
                    <option value="Poor Performance">Poor Performance</option>
                    <option value="Other">Other</option>
                  </select>
                  {reasonError && <div className="invalid-feedback" style={{ display: 'block' }}>{reasonError}</div>}
                </div>
                <div className="mb-3">
                  <label className="form-label"><strong>Comment (mandatory)</strong></label>
                  <textarea
                    ref={commentRef}
                    className={`form-control ${commentError ? 'is-invalid' : ''}`}
                    rows={4}
                    value={deleteReasonForm.comment}
                    onChange={(e) => {
                      setDeleteReasonForm(prev => ({ ...prev, comment: e.target.value }));
                      setCommentError(null);
                    }}
                  />
                  {commentError && <div className="invalid-feedback" style={{ display: 'block' }}>{commentError}</div>}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowDeleteReasonModal(false)}>Cancel</button>
                <button type="button" className="btn btn-danger" onClick={handleDeleteSubmitWithReason}>Archive Company</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}