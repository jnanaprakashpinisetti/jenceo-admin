// src/pages/companies/DisplayExistCompany.jsx
import React, { useState, useEffect, useRef } from 'react';
import firebaseDB from '../../firebase';
import editIcon from '../../assets/eidt.svg';
import viewIcon from '../../assets/view.svg';
import returnIcon from '../../assets/return.svg';
import CompanyModal from './CompanyModal/CompanyModal';

// Default logo image
const DEFAULT_COMPANY_LOGO = "https://firebasestorage.googleapis.com/v0/b/jenceo-admin.firebasestorage.app/o/OfficeFiles%2FSample-Photo.jpg?alt=media&token=01855b47-c9c2-490e-b400-05851192dde7";

// Existing departments configuration (from Existing to Running)
const EXISTING_DEPARTMENTS = {
  "Home Care Companies": "CompanyData/HomeCare/Existing",
  "Housekeeping Companies": "CompanyData/Housekeeping/Existing",
  "Office & Corporate Companies": "CompanyData/Office/Existing",
  "Factory & Manufacturing Companies": "CompanyData/Factorys/Existing",
  "Industrial Companies": "CompanyData/Industrial/Existing",
  "Construction Companies": "CompanyData/Construction/Existing",
  "Retail & Shop Companies": "CompanyData/Retail/Existing",
  "Hospital & Healthcare Companies": "CompanyData/Hospital/Existing",
  "Hotel & Hospitality Companies": "CompanyData/Hotel/Existing",
  "Warehouse & Logistics Companies": "CompanyData/Warehouse/Existing",
  "Security Service Companies": "CompanyData/Security/Existing",
  "Driving & Transport Companies": "CompanyData/Driving/Existing",
  "Technical & Maintenance Companies": "CompanyData/Technical/Existing",
  "Customer Service & BPO Companies": "CompanyData/CustomerService/Existing",
  "Management & Admin Companies": "CompanyData/Management/Existing",
  "Government & Public Sector Companies": "CompanyData/Government/Existing",
  "Education & Institution Companies": "CompanyData/Education/Existing",
  "Other Companies": "CompanyData/Others/Existing"
};

// Running departments for returning companies
const RUNNING_DEPARTMENTS = {
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

const DEPARTMENT_ORDER = [
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

const APPROVAL_STATUS_OPTIONS = ["Pending", "Approved", "Rejected", "On Hold"];

export default function DisplayExitCompany() {
  const [allCompanies, setAllCompanies] = useState({});
  const [filteredCompanies, setFilteredCompanies] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [activeTab, setActiveTab] = useState("Home Care Companies");

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedApprovalStatus, setSelectedApprovalStatus] = useState("All");
  const [selectedBusinessTypes, setSelectedBusinessTypes] = useState([]);
  const [selectedOwnershipTypes, setSelectedOwnershipTypes] = useState([]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [companyCounts, setCompanyCounts] = useState({});

  // Action (Return/Revert) states
  const [showActionConfirm, setShowActionConfirm] = useState(false);
  const [companyToAct, setCompanyToAct] = useState(null);
  const [showActionDetails, setShowActionDetails] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [reasonError, setReasonError] = useState(null);
  const [commentError, setCommentError] = useState(null);
  const [actionForm, setActionForm] = useState({ reason: "", comment: "" });
  const [actionType, setActionType] = useState(null); // "return" or "revert"

  // Refs for validation
  const reasonSelectRef = useRef(null);
  const commentRef = useRef(null);

  // Fetch all existing companies from all departments
  useEffect(() => {
    const fetchAllCompanies = async () => {
      setLoading(true);
      try {
        const companiesByDept = {};
        const counts = {};

        for (const [deptName, dbPath] of Object.entries(EXISTING_DEPARTMENTS)) {
          try {
            const snapshot = await firebaseDB.child(dbPath).once('value');
            if (snapshot.exists()) {
              const companiesData = [];
              snapshot.forEach((childSnapshot) => {
                companiesData.push({
                  id: childSnapshot.key,
                  department: deptName,
                  dbPath: dbPath,
                  ...childSnapshot.val()
                });
              });

              // Sort companies by ID number in descending order
              const sortedCompanies = sortCompaniesDescending(companiesData);
              companiesByDept[deptName] = sortedCompanies;
              counts[deptName] = sortedCompanies.length;
            } else {
              companiesByDept[deptName] = [];
              counts[deptName] = 0;
            }
          } catch (err) {
            console.error(`Error fetching ${deptName}:`, err);
            companiesByDept[deptName] = [];
            counts[deptName] = 0;
          }
        }

        setAllCompanies(companiesByDept);
        setFilteredCompanies(companiesByDept);
        setCompanyCounts(counts);

        // Calculate total pages for active tab
        const activeCompanies = companiesByDept[activeTab] || [];
        setTotalPages(Math.ceil(activeCompanies.length / rowsPerPage));
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

      // — Business Types —
      if (selectedBusinessTypes.length > 0) {
        filtered = filtered.filter((company) => {
          const companyType = company.companyType || company.businessType || '';
          return selectedBusinessTypes.includes(companyType);
        });
      }

      // — Ownership Types —
      if (selectedOwnershipTypes.length > 0) {
        filtered = filtered.filter((company) => {
          const ownershipType = company.ownershipType || '';
          return selectedOwnershipTypes.includes(ownershipType);
        });
      }

      return filtered;
    };

    // Apply filters to all departments
    const newFiltered = {};
    Object.keys(allCompanies).forEach(dept => {
      newFiltered[dept] = applyFilters(allCompanies[dept]);
    });

    setFilteredCompanies(newFiltered);

    // Calculate total pages for active tab
    const activeCompanies = newFiltered[activeTab] || [];
    setTotalPages(Math.ceil(activeCompanies.length / rowsPerPage));
    setCurrentPage(1);
  }, [
    allCompanies,
    searchTerm,
    selectedApprovalStatus,
    selectedBusinessTypes,
    selectedOwnershipTypes,
    rowsPerPage,
    activeTab
  ]);

  // Update total pages when active tab or rowsPerPage changes
  useEffect(() => {
    const activeCompanies = filteredCompanies[activeTab] || [];
    setTotalPages(Math.ceil(activeCompanies.length / rowsPerPage));
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

  // Open confirm (step 1)
  const openActionConfirm = (company, type = "revert") => {
    setCompanyToAct(company);
    setActionType(type);
    setShowActionConfirm(true);
  };

  const closeActionConfirm = () => {
    setShowActionConfirm(false);
    setCompanyToAct(null);
  };

  // Open details (step 2)
  const openActionDetails = () => {
    setShowActionConfirm(false);
    setShowActionDetails(true);
  };

  const closeActionDetails = () => {
    setShowActionDetails(false);
    setActionForm({ reason: "", comment: "" });
    setReasonError(null);
    setCommentError(null);
    setCompanyToAct(null);
    setActionType(null);
  };

  // Validate action form
  const validateActionForm = () => {
    let ok = true;
    setReasonError(null);
    setCommentError(null);

    if (!actionForm.reason) {
      setReasonError("Please select a reason.");
      ok = false;
    }
    if (!actionForm.comment || !actionForm.comment.trim()) {
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
        if (!actionForm.reason && reasonSelectRef.current) {
          reasonSelectRef.current.focus();
          reasonSelectRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else if ((!actionForm.comment || !actionForm.comment.trim()) && commentRef.current) {
          commentRef.current.focus();
          commentRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }, 0);

    return ok;
  };

  // Finalise action: restore to Running, push to returnHistory, remove from Existing
  const handleActionFinal = async () => {
    if (!companyToAct) return;

    const ok = validateActionForm();
    if (!ok) return;

    const { id, department } = companyToAct;

    const existingDbPath = EXISTING_DEPARTMENTS[department];
    const runningDbPath = RUNNING_DEPARTMENTS[department];

    if (!existingDbPath || !runningDbPath) {
      setActionError(`Invalid department path for ${department}`);
      return;
    }

    try {
      const now = new Date().toISOString();
      const user = window?.CURRENT_USER_NAME || "System";

      // 1️⃣ Read company from Existing
      const snapshot = await firebaseDB.child(`${existingDbPath}/${id}`).once("value");
      const companyData = snapshot.val();

      if (!companyData) {
        setActionError("Company data not found in Existing");
        return;
      }

      // 2️⃣ Prepare restored payload
      const restoredCompany = {
        ...companyData,
        approvalStatus: "Running",
        restoredAt: now,
        restoredBy: user,
        restoredFromExisting: true
      };

      // Clean up removal metadata if exists
      delete restoredCompany.removalReason;
      delete restoredCompany.removalComment;
      delete restoredCompany.removedBy;
      delete restoredCompany.removedAt;
      delete restoredCompany.originalPath;

      // 3️⃣ Restore to SAME department → Running
      await firebaseDB.child(`${runningDbPath}/${id}`).set(restoredCompany);

      // 4️⃣ Add return history (both sides)
      const historyEntry = {
        returnedAt: now,
        returnedBy: user,
        reason: actionForm.reason,
        comment: actionForm.comment.trim(),
        actionType
      };

      await firebaseDB.child(`${runningDbPath}/${id}/returnHistory`).push(historyEntry);
      await firebaseDB.child(`${existingDbPath}/${id}/returnHistory`).push(historyEntry);

      // 5️⃣ Remove from Existing
      await firebaseDB.child(`${existingDbPath}/${id}`).remove();

      // 6️⃣ Update UI state
      setAllCompanies(prev => ({
        ...prev,
        [department]: prev[department].filter(c => c.id !== id)
      }));

      setFilteredCompanies(prev => ({
        ...prev,
        [department]: prev[department].filter(c => c.id !== id)
      }));

      setCompanyCounts(prev => ({
        ...prev,
        [department]: Math.max((prev[department] || 1) - 1, 0)
      }));

      closeActionDetails();
      setShowSuccessModal(true);
      setActionError(null);

    } catch (err) {
      console.error("Restore failed:", err);
      setActionError("Error restoring company: " + err.message);
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

  // Check if any filter is active
  const hasActiveFilters = Boolean(
    selectedApprovalStatus !== "All" ||
    selectedBusinessTypes.length > 0 ||
    selectedOwnershipTypes.length > 0 ||
    searchTerm
  );

  // Reset all filters
  const resetFilters = () => {
    setSelectedApprovalStatus("All");
    setSelectedBusinessTypes([]);
    setSelectedOwnershipTypes([]);
    setSearchTerm("");
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

  // Status badge styling
  const getApprovalStatusBadgeClass = (status) => {
    switch (status) {
      case 'Approved': return 'bg-success';
      case 'Running': return 'bg-success';
      case 'Pending': return 'bg-warning';
      case 'Rejected': return 'bg-danger';
      case 'On Hold': return 'bg-info';
      case 'Existing': return 'bg-secondary';
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

  if (loading) return <div className="text-center my-5">Loading existing companies...</div>;
  if (error) return <div className="alert alert-danger">Error: {error}</div>;

  // Get current tab companies
  const activeCompanies = filteredCompanies[activeTab] || [];
  const currentTabCompanies = currentCompanies();
  const totalFiltered = activeCompanies.length;

  return (
    <div className='displayExistCompany'>
      {/* Department Tabs */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="p-3 bg-dark border border-secondary rounded-3 border-opacity-">
            <h5 className="mb-3 text-center text-warning">Existing Company Categories</h5>
            <div className="d-flex flex-wrap gap-2 justify-content-center">
              {DEPARTMENT_ORDER.map(dept => {
                const count = companyCounts[dept] || 0;
                const filteredCount = (filteredCompanies[dept] || []).length;
                const isActive = activeTab === dept;
                return (
                  <button
                    key={dept}
                    type="button"
                    className={`btn btn-sm ${isActive ? "btn-warning" : "btn-outline-warning"} position-relative`}
                    onClick={() => {
                      setActiveTab(dept);
                      setCurrentPage(1);
                    }}
                  >
                    {dept.replace(' Companies', '')}
                    <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                      {filteredCount}
                      <span className="visually-hidden">existing companies</span>
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

      {/* Active Department Info */}
      <div className="row mb-3">
        <div className="col-12">
          <div className="p-3 bg-dark border border-warning rounded-3 border-opacity-25">
            <div className="row align-items-center">
              <div className="col-md-3">
                <h4 className="text-warning mb-0">{activeTab} (Existing)</h4>
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
                    placeholder={`Search ${activeTab} existing companies...`}
                    value={searchTerm}
                    onChange={handleSearchChange}
                    style={{ backgroundColor: '#2d3748', color: 'white' }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Unified Filters Row */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="p-3 bg-dark border border-secondary rounded-3 border-opacity-25 companyFilter">
            <div className="row g-3 align-items-center">
              {/* Approval Status Filter */}
              <div className="col-lg-3 col-md-4 text-center">
                <label className="form-label text-info small mb-2">Approval Status</label>
                <div className="d-flex gap-2 justify-content-center">
                  {["All", ...APPROVAL_STATUS_OPTIONS].map(status => (
                    <button
                      key={status}
                      type="button"
                      className={`btn ${selectedApprovalStatus === status ? "btn-info" : "btn-outline-info"} btn-sm`}
                      onClick={() => setSelectedApprovalStatus(status)}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              {/* Business Type Filters */}
              <div className="col-lg-3 col-md-4 text-center">
                <label className="form-label text-warning small mb-2">Business Types</label>
                <select
                  className="form-select form-select-sm"
                  value=""
                  onChange={(e) => {
                    if (e.target.value && !selectedBusinessTypes.includes(e.target.value)) {
                      setSelectedBusinessTypes([...selectedBusinessTypes, e.target.value]);
                    }
                  }}
                  style={{ backgroundColor: '#2d3748', color: '#a0aec0' }}
                >
                  <option value="">Select Business Type</option>
                  {BUSINESS_TYPE_OPTIONS.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                {selectedBusinessTypes.length > 0 && (
                  <div className="mt-2 d-flex flex-wrap gap-1 justify-content-center">
                    {selectedBusinessTypes.map(type => (
                      <span key={type} className="badge bg-warning text-dark">
                        {type}
                        <button
                          type="button"
                          className="ms-1 btn-close btn-close-white"
                          onClick={() => setSelectedBusinessTypes(prev => prev.filter(t => t !== type))}
                          style={{ fontSize: '0.6rem' }}
                        ></button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Ownership Type Filters */}
              <div className="col-lg-3 col-md-4 text-center">
                <label className="form-label text-warning small mb-2">Ownership Types</label>
                <select
                  className="form-select form-select-sm"
                  value=""
                  onChange={(e) => {
                    if (e.target.value && !selectedOwnershipTypes.includes(e.target.value)) {
                      setSelectedOwnershipTypes([...selectedOwnershipTypes, e.target.value]);
                    }
                  }}
                  style={{ backgroundColor: '#2d3748', color: '#a0aec0' }}
                >
                  <option value="">Select Ownership Type</option>
                  {OWNERSHIP_OPTIONS.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                {selectedOwnershipTypes.length > 0 && (
                  <div className="mt-2 d-flex flex-wrap gap-1 justify-content-center">
                    {selectedOwnershipTypes.map(type => (
                      <span key={type} className="badge bg-warning text-dark">
                        {type}
                        <button
                          type="button"
                          className="ms-1 btn-close btn-close-white"
                          onClick={() => setSelectedOwnershipTypes(prev => prev.filter(t => t !== type))}
                          style={{ fontSize: '0.6rem' }}
                        ></button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Reset filter */}
              <div className="col-lg-3 col-md-4 text-center">
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
                    style={{ width: '80px', backgroundColor: '#2d3748', color: 'white' }}
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

      {/* Companies Table */}
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
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentTabCompanies.length > 0 ? (
              currentTabCompanies.map((company) => (
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
                      {company.approvalStatus || 'Existing'}
                    </span>
                    {company.removedAt && (
                      <small className="d-block text-muted">
                        Moved: {formatDate(company.removedAt)}
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
                        title="Return/Revert"
                        onClick={(e) => {
                          e.stopPropagation();
                          openActionConfirm(company, "revert");
                        }}
                      >
                        <img src={returnIcon} alt="return Icon" style={{ width: '14px', height: '14px', transform: "rotate(90deg)" }} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="9" className="text-center py-4">
                  No existing companies found in {activeTab} matching your search criteria
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

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1" role="dialog" aria-modal="true">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-success text-white">
                <h5 className="modal-title">Successfully Restored</h5>
                <button type="button" className="btn-close" onClick={() => setShowSuccessModal(false)}></button>
              </div>
              <div className="modal-body">
                Company has been restored to running companies successfully.
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-success" onClick={() => setShowSuccessModal(false)}>Done</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Global action error */}
      {actionError && !showActionDetails && (
        <div className="alert alert-danger mt-2">{actionError}</div>
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

      {/* Action Confirm Modal */}
      {showActionConfirm && companyToAct && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1" role="dialog" aria-modal="true">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Confirm Restore</h5>
                <button type="button" className="btn-close" onClick={closeActionConfirm}></button>
              </div>
              <div className="modal-body">
                <p>Do you want to restore this company to running companies?</p>
                <p><strong>ID:</strong> {companyToAct.companyId || companyToAct.id}</p>
                <p><strong>Name:</strong> {companyToAct.companyName}</p>
                <p><strong>Department:</strong> {companyToAct.department}</p>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeActionConfirm}>Cancel</button>
                <button type="button" className="btn btn-primary" onClick={openActionDetails}>Yes</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Details Modal */}
      {showActionDetails && companyToAct && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1" role="dialog" aria-modal="true">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Restore Details</h5>
                <button type="button" className="btn-close" onClick={closeActionDetails}></button>
              </div>
              <div className="modal-body">
                {actionError && <div className="alert alert-danger">{actionError}</div>}

                <div className="mb-3">
                  <label className="form-label"><strong>Reason</strong></label>
                  <select
                    ref={reasonSelectRef}
                    className={`form-select ${reasonError ? 'is-invalid' : ''}`}
                    value={actionForm.reason}
                    onChange={(e) => {
                      setActionForm(prev => ({ ...prev, reason: e.target.value }));
                      setReasonError(null);
                    }}
                    style={{ backgroundColor: '#2d3748', color: 'white' }}
                  >
                    <option value="">Select Reason</option>
                    <option value="Re-open">Re-open</option>
                    <option value="Re-start">Re-start</option>
                    <option value="New-Start">New-Start</option>
                    <option value="Renewal">Renewal</option>
                    <option value="Contract Renewed">Contract Renewed</option>
                    <option value="Services Required Again">Services Required Again</option>
                    <option value="Financial Issues Resolved">Financial Issues Resolved</option>
                  </select>
                  {reasonError && <div className="invalid-feedback" style={{ display: 'block' }}>{reasonError}</div>}
                </div>
                <div className="mb-3">
                  <label className="form-label"><strong>Comment (mandatory)</strong></label>
                  <textarea
                    ref={commentRef}
                    className={`form-control ${commentError ? 'is-invalid' : ''}`}
                    rows={4}
                    value={actionForm.comment}
                    onChange={(e) => {
                      setActionForm(prev => ({ ...prev, comment: e.target.value }));
                      setCommentError(null);
                    }}
                    style={{ backgroundColor: '#2d3748', color: 'white' }}
                  />
                  {commentError && <div className="invalid-feedback" style={{ display: 'block' }}>{commentError}</div>}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeActionDetails}>Cancel</button>
                <button type="button" className="btn btn-primary" onClick={handleActionFinal}>Restore Company</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}