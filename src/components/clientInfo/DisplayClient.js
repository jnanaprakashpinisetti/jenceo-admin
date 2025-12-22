// src/pages/clients/DisplayClient.js
import React, { useState, useEffect, useRef } from 'react';
import firebaseDB from '../../firebase';
import editIcon from '../../assets/eidt.svg';
import viewIcon from '../../assets/view.svg';
import deleteIcon from '../../assets/delete.svg';
import ClientModal from './ClientModal/ClientModal';

// Department configuration
const DEPARTMENTS = {
  "Home Care": "ClientData/HomeCare/Running",
  "Housekeeping": "ClientData/Housekeeping/Running",
  "Office & Administrative": "ClientData/Office/Running",
  "Customer Service": "ClientData/Customer/Running",
  "Management & Supervision": "ClientData/Management/Running",
  "Security": "ClientData/Security/Running",
  "Driving & Logistics": "ClientData/Driving/Running",
  "Technical & Maintenance": "ClientData/Technical/Running",
  "Retail & Sales": "ClientData/Retail/Running",
  "Industrial & Labor": "ClientData/Industrial/Running",
  "Others": "ClientData/Others/Running"
};

const DEPARTMENT_ORDER = [
  "Home Care",
  "Housekeeping",
  "Office & Administrative",
  "Customer Service",
  "Management & Supervision",
  "Security",
  "Driving & Logistics",
  "Technical & Maintenance",
  "Retail & Sales",
  "Industrial & Labor",
  "Others"
];

// Language options (adapted from workers)
const LANG_OPTIONS = [
  "Telugu", "English", "Hindi", "Urdu", "Kannada", "Malayalam", "Tamil", "Bengali", "Marathi"
];

// Service type options (similar to skills in workers)
const SERVICE_OPTIONS = [
  "Home Care", "Housekeeping", "Office Support", "Customer Service", 
  "Management", "Security", "Driving", "Technical", "Retail", "Industrial"
];

// Status options
const STATUS_OPTIONS = ["Running", "Closed", "Stop", "Re-open", "Re-start", "Re-place"];

export default function DisplayClient() {
  const [allClients, setAllClients] = useState({});
  const [filteredClients, setFilteredClients] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [activeTab, setActiveTab] = useState("Home Care");

  // Unified filters (similar to workers)
  const [skillMode, setSkillMode] = useState("single");
  const [ageRange, setAgeRange] = useState({ min: "", max: "" });
  const [experienceRange, setExperienceRange] = useState({ min: "", max: "" });
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedLanguages, setSelectedLanguages] = useState([]);
  const [selectedServices, setSelectedServices] = useState([]);
  const [showJobRoles, setShowJobRoles] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [selectedGender, setSelectedGender] = useState([]);
  const [timeFormat, setTimeFormat] = useState("all");

  // Search and filters
  const [searchTerm, setSearchTerm] = useState('');
  const [genderFilters, setGenderFilters] = useState({
    Male: false,
    Female: false
  });
  const [serviceFilters, setServiceFilters] = useState({});

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [clientCounts, setClientCounts] = useState({});

  // Delete states
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [clientToDelete, setClientToDelete] = useState(null);
  const [showDeleteReasonModal, setShowDeleteReasonModal] = useState(false);
  const [showDeleteSuccessModal, setShowDeleteSuccessModal] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const [reasonError, setReasonError] = useState(null);
  const [commentError, setCommentError] = useState(null);
  const [deleteReasonForm, setDeleteReasonForm] = useState({ reasonType: "", comment: "" });

  // Refs for validation
  const reasonSelectRef = useRef(null);
  const commentRef = useRef(null);

  // Normalize array function
  const normalizeArray = (v) =>
    Array.isArray(v)
      ? v.filter(Boolean)
      : v
        ? String(v).split(",").map((s) => s.trim()).filter(Boolean)
        : [];

  // Fetch all clients from all departments
  useEffect(() => {
    const fetchAllClients = async () => {
      setLoading(true);
      try {
        const clientsByDept = {};
        const counts = {};
        
        for (const [deptName, dbPath] of Object.entries(DEPARTMENTS)) {
          try {
            const snapshot = await firebaseDB.child(dbPath).once('value');
            if (snapshot.exists()) {
              const clientsData = [];
              snapshot.forEach((childSnapshot) => {
                clientsData.push({
                  id: childSnapshot.key,
                  department: deptName,
                  dbPath: dbPath,
                  ...childSnapshot.val()
                });
              });
              
              // Sort clients by ID number in descending order
              const sortedClients = sortClientsDescending(clientsData);
              clientsByDept[deptName] = sortedClients;
              counts[deptName] = sortedClients.length;
            } else {
              clientsByDept[deptName] = [];
              counts[deptName] = 0;
            }
          } catch (err) {
            console.error(`Error fetching ${deptName}:`, err);
            clientsByDept[deptName] = [];
            counts[deptName] = 0;
          }
        }
        
        setAllClients(clientsByDept);
        setFilteredClients(clientsByDept);
        setClientCounts(counts);
        
        // Calculate total pages for active tab
        const activeClients = clientsByDept[activeTab] || [];
        setTotalPages(Math.ceil(activeClients.length / rowsPerPage));
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchAllClients();
  }, []);

  // Filter clients based on search term and filters
  useEffect(() => {
    const applyFilters = (clients) => {
      let filtered = [...clients];

      // — Search —
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filtered = filtered.filter((client) =>
          (client.clientName && client.clientName.toLowerCase().includes(term)) ||
          (client.idNo && client.idNo.toLowerCase().includes(term)) ||
          (client.location && client.location.toLowerCase().includes(term)) ||
          (client.typeOfService && client.typeOfService.toLowerCase().includes(term)) ||
          (client.mobileNo1 && client.mobileNo1.toLowerCase().includes(term))
        );
      }

      // — Gender —
      const activeGenderFilters = Object.keys(genderFilters).filter((key) => genderFilters[key]);
      if (activeGenderFilters.length > 0) {
        filtered = filtered.filter(
          (client) => client.gender && activeGenderFilters.includes(client.gender)
        );
      }

      // — Status filter —
      if (statusFilter !== "All") {
        filtered = filtered.filter((c) => (c.serviceStatus || "Running") === statusFilter);
      }

      // — Languages —
      const hasLangSel = selectedLanguages.length > 0;
      if (hasLangSel) {
        const normArr = (v) =>
          Array.isArray(v)
            ? v
            : typeof v === "string"
              ? v.split(",").map((s) => s.trim()).filter(Boolean)
              : [];

        filtered = filtered.filter((c) => {
          const langs = normArr(c.languages || c.language || c.knownLanguages || c.speaks).map((s) =>
            s.toLowerCase()
          );
          const wantLangs = selectedLanguages.map((s) => s.toLowerCase());
          
          if (skillMode === "single") {
            return wantLangs.some((s) => langs.includes(s));
          } else {
            return wantLangs.every((s) => langs.includes(s));
          }
        });
      }

      // — Services —
      const hasServiceSel = selectedServices.length > 0;
      if (hasServiceSel) {
        const normArr = (v) =>
          Array.isArray(v)
            ? v
            : typeof v === "string"
              ? v.split(",").map((s) => s.trim()).filter(Boolean)
              : [];

        filtered = filtered.filter((c) => {
          const services = normArr(c.typeOfService || c.serviceType || c.services).map((s) =>
            s.toLowerCase()
          );
          const wantServices = selectedServices.map((s) => s.toLowerCase());
          
          if (skillMode === "single") {
            return wantServices.some((s) => services.includes(s));
          } else {
            return wantServices.every((s) => services.includes(s));
          }
        });
      }

      // — Age filter —
      if (ageRange.min || ageRange.max) {
        filtered = filtered.filter((c) => {
          const calcAge = (dob, fallback) => {
            if (fallback != null && !isNaN(fallback)) return Number(fallback);
            const d = new Date(dob);
            if (!(d instanceof Date) || isNaN(d.getTime())) return null;
            const today = new Date();
            let a = today.getFullYear() - d.getFullYear();
            const m = today.getMonth() - d.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < d.getDate())) a--;
            return a;
          };
          const age = calcAge(c.dateOfBirth || c.dob || c.birthDate, c.age);
          if (ageRange.min && age != null && age < parseInt(ageRange.min, 10)) return false;
          if (ageRange.max && age != null && age > parseInt(ageRange.max, 10)) return false;
          return true;
        });
      }

      // — Experience filter —
      if (experienceRange.min || experienceRange.max) {
        filtered = filtered.filter((c) => {
          const takeNum = (v) => {
            if (v == null) return null;
            const m = String(v).match(/(\d+(?:\.\d+)?)/);
            return m ? Number(m[1]) : null;
          };
          const rawExp = takeNum(c.workExperience || c.experience || c.expYears || c.totalExperience || c.years);
          const minRaw = String(experienceRange.min ?? "").trim();
          const maxRaw = String(experienceRange.max ?? "").trim();
          const minActive = minRaw !== "" && !Number.isNaN(Number(minRaw));
          const maxActive = maxRaw !== "" && !Number.isNaN(Number(maxRaw));
          
          if (minActive || maxActive) {
            if (rawExp == null || Number.isNaN(rawExp)) return false;
            const years = Math.max(0, rawExp);
            if (minActive && years < Number(minRaw)) return false;
            if (maxActive && years > Number(maxRaw)) return false;
          }
          return true;
        });
      }

      return filtered;
    };

    // Apply filters to all departments
    const newFiltered = {};
    Object.keys(allClients).forEach(dept => {
      newFiltered[dept] = applyFilters(allClients[dept]);
    });
    
    setFilteredClients(newFiltered);
    
    // Calculate total pages for active tab
    const activeClients = newFiltered[activeTab] || [];
    setTotalPages(Math.ceil(activeClients.length / rowsPerPage));
    setCurrentPage(1);
  }, [
    allClients,
    searchTerm,
    genderFilters,
    serviceFilters,
    rowsPerPage,
    statusFilter,
    selectedLanguages,
    selectedServices,
    skillMode,
    ageRange,
    experienceRange,
    activeTab
  ]);

  // Update total pages when active tab or rowsPerPage changes
  useEffect(() => {
    const activeClients = filteredClients[activeTab] || [];
    setTotalPages(Math.ceil(activeClients.length / rowsPerPage));
    setCurrentPage(1);
  }, [filteredClients, activeTab, rowsPerPage]);

const sortClientsDescending = (clientsData) => {
  return [...clientsData].sort((a, b) => {
    const getNumber = (id) => {
      if (!id) return 0;
      const match = String(id).match(/(\d+)(?!.*\d)/); // last number
      return match ? parseInt(match[1], 10) : 0;
    };

    const idA = a.idNo || a.clientId || '';
    const idB = b.idNo || b.clientId || '';

    const numA = getNumber(idA);
    const numB = getNumber(idB);

    // DESC order
    if (numA !== numB) return numB - numA;

    // fallback string compare
    return idB.localeCompare(idA);
  });
};


  // Calculate current clients to display
  const currentClients = () => {
    const clients = filteredClients[activeTab] || [];
    const indexOfLastClient = currentPage * rowsPerPage;
    const indexOfFirstClient = indexOfLastClient - rowsPerPage;
    return clients.slice(indexOfFirstClient, indexOfLastClient);
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

  // Handle gender filter change
  const handleGenderFilterChange = (gender) => {
    setGenderFilters(prev => ({
      ...prev,
      [gender]: !prev[gender]
    }));
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

  const handleView = (client) => {
    setSelectedClient(client);
    setIsEditMode(false);
    setIsModalOpen(true);
  };

  const handleEdit = (client) => {
    setSelectedClient(client);
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  const openDeleteConfirm = (client) => {
    setClientToDelete(client);
    setShowDeleteConfirm(true);
  };

  const closeDeleteConfirm = () => {
    setShowDeleteConfirm(false);
  };

  // Check if any filter is active
  const hasActiveFilters = Boolean(
    Object.values(genderFilters).some(Boolean) ||
    Object.values(serviceFilters).some(Boolean) ||
    selectedLanguages.length ||
    selectedServices.length ||
    statusFilter !== "All" ||
    skillMode !== "single" ||
    ageRange.min || ageRange.max ||
    experienceRange.min || experienceRange.max ||
    searchTerm
  );

  // Reset all filters
  const resetFilters = () => {
    setGenderFilters({});
    setServiceFilters({});
    setSelectedLanguages([]);
    setSelectedServices([]);
    setStatusFilter("All");
    setSkillMode("single");
    setAgeRange({ min: "", max: "" });
    setExperienceRange({ min: "", max: "" });
    setSearchTerm("");
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

    if (!clientToDelete) {
      setDeleteError("No client selected for deletion.");
      return;
    }

    const { id, dbPath } = clientToDelete;
    try {
      // read client data
      const snapshot = await firebaseDB.child(`${dbPath}/${id}`).once("value");
      const clientData = snapshot.val();
      if (!clientData) {
        setDeleteError("Client data not found");
        return;
      }

      // Create exit path by replacing "Running" with "ExitClients"
      const exitPath = dbPath.replace("/Running", "/ExitClients");
      
      // attach removal metadata
      const payloadToExit = { 
        ...clientData,
        originalId: id,
        movedAt: new Date().toISOString()
      };

      // Save client record under ExitClients
      await firebaseDB.child(`${exitPath}/${id}`).set(payloadToExit);

      // push removal entry into the item's removalHistory array
      const removalEntry = {
        removedAt: new Date().toISOString(),
        removedBy: (deleteReasonForm && deleteReasonForm.by) || 'UI',
        removalReason: deleteReasonForm.reasonType || '',
        removalComment: deleteReasonForm.comment ? deleteReasonForm.comment.trim() : ''
      };
      await firebaseDB.child(`${exitPath}/${id}/removalHistory`).push(removalEntry);
      
      // Remove from original location
      await firebaseDB.child(`${dbPath}/${id}`).remove();
      
      // Update local state
      setAllClients(prev => ({
        ...prev,
        [clientToDelete.department]: prev[clientToDelete.department].filter(client => client.id !== id)
      }));
      
      // success -> close modal, clear states and show success modal
      setShowDeleteReasonModal(false);
      setClientToDelete(null);
      setShowDeleteSuccessModal(true);
      setDeleteError(null);
      setReasonError(null);
      setCommentError(null);
    } catch (err) {
      console.error(err);
      setDeleteError('Error deleting client: ' + (err.message || err));
    }
  };

  const handleSave = async (updatedClient) => {
    try {
      await firebaseDB.child(`${updatedClient.dbPath}/${updatedClient.id}`).update(updatedClient);
      setIsModalOpen(false);
    } catch (err) {
      setError('Error updating client: ' + err.message);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedClient(null);
    setIsEditMode(false);
  };

  // Status badge styling
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Running': return 'bg-success';
      case 'Closed': return 'bg-secondary';
      case 'Stop': return 'bg-warning';
      case 'Re-open': return 'bg-info';
      case 'Re-start': return 'bg-primary';
      case 'Re-place': return 'bg-dark';
      default: return 'bg-info';
    }
  };

  if (loading) return <div className="text-center my-5">Loading clients...</div>;
  if (error) return <div className="alert alert-danger">Error: {error}</div>;

  // Get current tab clients
  const activeClients = filteredClients[activeTab] || [];
  const currentTabClients = currentClients();
  const totalFiltered = activeClients.length;

  return (
    <div className='displayClient'>
      {/* Department Tabs */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="p-3 bg-dark border border-secondary rounded-3 border-opacity-">
            <h5 className="mb-3 text-center text-warning">Departments</h5>
            <div className="d-flex flex-wrap gap-2 justify-content-center">
              {DEPARTMENT_ORDER.map(dept => {
                const count = clientCounts[dept] || 0;
                const filteredCount = (filteredClients[dept] || []).length;
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
                    {dept}
                    <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                      {filteredCount}
                      <span className="visually-hidden">clients</span>
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
                <h4 className="text-warning mb-0">{activeTab}</h4>
                <p className="text-info mb-0">
                  Total: {clientCounts[activeTab] || 0} | 
                  Showing: {totalFiltered} {totalFiltered !== (clientCounts[activeTab] || 0) ? `(Filtered)` : ''}
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
                    placeholder={`Search ${activeTab} clients...`}
                    value={searchTerm}
                    onChange={handleSearchChange}
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
          <div className="p-3 bg-dark border border-secondary rounded-3 border-opacity-25 clientFilter">
            <div className="row g-3 align-items-center">
              {/* Gender */}
              <div className="col-lg-1 col-md-3 text-center">
                <label className="form-label text-warning small mb-2">Gender</label>
                <div className="d-flex gap-2 justify-content-center">
                  {["Male", "Female"].map(g => {
                    const on = !!genderFilters[g];
                    return (
                      <button
                        key={g}
                        type="button"
                        className={`btn ${on ? "btn-warning" : "btn-outline-warning"} btn-sm`}
                        onClick={() => handleGenderFilterChange(g)}
                      >
                        {g}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Skill Match Mode */}
              <div className="col-lg-2 col-md-3 text-center">
                <label className="form-label text-info small mb-2">Skill Match</label>
                <div className="d-flex gap-2 justify-content-center">
                  <button
                    type="button"
                    className={`btn ${skillMode === "single" ? "btn-info" : "btn-outline-info"} btn-sm`}
                    onClick={() => setSkillMode("single")}
                  >
                    One Skill
                  </button>
                  <button
                    type="button"
                    className={`btn ${skillMode === "multi" ? "btn-info" : "btn-outline-info"} btn-sm`}
                    onClick={() => setSkillMode("multi")}
                  >
                    Multi Skills
                  </button>
                </div>
              </div>

              {/* Age filter */}
              <div className="col-lg-2 col-md-6 text-center">
                <label className="form-label text-info small mb-1">Age (18 - 55)</label>
                <div className="d-flex gap-2">
                  <input
                    type="number"
                    min={18} max={60}
                    className="form-control form-control-sm"
                    placeholder="Min-18"
                    value={ageRange.min}
                    onChange={(e) => setAgeRange(r => ({ ...r, min: e.target.value }))}
                    style={{ color: "#707070ff" }}
                  />
                  <input
                    type="number"
                    min={18} max={55}
                    className="form-control form-control-sm"
                    placeholder="Max-55"
                    value={ageRange.max}
                    onChange={(e) => setAgeRange(r => ({ ...r, max: e.target.value }))}
                    style={{ color: "#707070ff" }}
                  />
                </div>
              </div>

              {/* Experience filter */}
              <div className="col-lg-2 col-md-6 text-center">
                <label className="form-label text-info small mb-1">Experience (Yrs)</label>
                <div className="d-flex gap-2">
                  <input
                    type="number"
                    min={0} step="0.5"
                    className="form-control form-control-sm"
                    placeholder="Min"
                    value={experienceRange.min}
                    onChange={(e) => setExperienceRange(r => ({ ...r, min: e.target.value }))}
                    style={{ color: "#707070ff" }}
                  />
                  <input
                    type="number"
                    min={0} step="0.5"
                    className="form-control form-control-sm"
                    placeholder="Max"
                    value={experienceRange.max}
                    onChange={(e) => setExperienceRange(r => ({ ...r, max: e.target.value }))}
                    style={{ color: "#707070ff" }}
                  />
                </div>
              </div>

              {/* Status filter */}
              <div className="col-lg-2 col-md-4 text-center">
                <label className="form-label text-info small mb-2">Status</label>
                <div className="d-flex gap-2 justify-content-center">
                  {[
                    { label: "All", value: "All" },
                    { label: "Running", value: "Running" },
                    { label: "Closed", value: "Closed" },
                    { label: "Stop", value: "Stop" }
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`btn ${statusFilter === opt.value ? "btn-info" : "btn-outline-info"} btn-sm`}
                      onClick={() => setStatusFilter(opt.value)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="col-lg-1 col-md-2 text-center">
                <label className="form-label text-warning small mb-2">
                  Other Skills
                </label>
                <div className="d-flex justify-content-center align-items-center gap-2 toggle-pill">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id="showJobRoles"
                    checked={showJobRoles}
                    onChange={(e) => {
                      const val = e.target.checked;
                      setShowJobRoles(val);
                      if (!val) setSelectedRoles([]);
                    }}
                  />
                  <label
                    className="form-check-label text-white small fw-bold"
                    htmlFor="showJobRoles"
                  >
                    {showJobRoles ? "ON" : "OFF"}
                  </label>
                </div>
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

      {/* Languages & Services Row */}
      <div className="row g-3 mb-4">
        <div className="col-md-6">
          <div className="p-3 bg-dark border border-secondary rounded-3 border-opacity-25 h-100">
            <h6 className="mb-2 text-info">Languages</h6>
            <div className="d-flex flex-wrap gap-2">
              {LANG_OPTIONS.map(l => {
                const on = selectedLanguages.includes(l);
                return (
                  <button
                    key={l}
                    type="button"
                    className={`btn btn-sm ${on ? "btn-info text-dark" : "btn-outline-info"} rounded-pill`}
                    onClick={() => setSelectedLanguages(prev => on ? prev.filter(x => x !== l) : [...prev, l])}
                  >
                    {l}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="p-3 bg-dark border border-secondary rounded-3 border-opacity-25 h-100">
            <h6 className="mb-2 text-warning">Services</h6>
            <div className="d-flex flex-wrap gap-2">
              {SERVICE_OPTIONS.map(s => {
                const on = selectedServices.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    className={`btn btn-sm ${on ? "btn-warning text-black" : "btn-outline-warning"} rounded-pill`}
                    onClick={() => setSelectedServices(prev => on ? prev.filter(x => x !== s) : [...prev, s])}
                  >
                    {s}
                  </button>
                );
              })}
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
                    <nav aria-label="Client pagination" className="pagination-wrapper">
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

      {/* Clients Table */}
      <div className="table-responsive mb-3">
        <table className="table table-dark table-hover">
          <thead className="table-dark">
            <tr>
              <th>ID No ↓</th>
              <th>Client Name</th>
              <th>Location</th>
              <th>Type of Service</th>
              <th>Mobile No</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentTabClients.length > 0 ? (
              currentTabClients.map((client) => (
                <tr key={client.id} onClick={(e) => { e.stopPropagation(); handleView(client); }} style={{ cursor: 'pointer' }}>
                  <td>
                    <strong>{client.idNo || client.clientId || 'N/A'}</strong>
                    <small className="small-text d-block mt-1 text-info opacity-75">
                      By <strong>{client.createdByName || "System"}</strong>
                    </small>
                  </td>
                  <td>
                    {client.clientName || 'N/A'}
                  </td>
                  <td>{client.location || 'N/A'}</td>
                  <td>{client.typeOfService || 'N/A'}</td>
                  <td>
                    {client.mobileNo1 ? (
                      <div className="d-flex flex-column">
                        <span>{client.mobileNo1}</span>
                        <div className="mt-1">
                          <a href={`tel:${client.mobileNo1}`} className="btn btn-sm btn-info me-1" onClick={(e) => e.stopPropagation()}>
                            Call
                          </a>
                          <a
                            className="btn btn-sm btn-warning"
                            href={`https://wa.me/${client.mobileNo1.replace(/\D/g, '')}?text=${encodeURIComponent(
                              'Hello, This is Sudheer From JenCeo Home Care Services'
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                          >
                            WAP
                          </a>
                        </div>
                      </div>
                    ) : 'N/A'}
                  </td>
                  <td>
                    <span className={`badge ${getStatusBadgeClass(client.serviceStatus)}`}>
                      {client.serviceStatus || 'Running'}
                    </span>
                  </td>
                  <td>
                    <div className="d-flex">
                      <button
                        type="button"
                        className="btn btn-sm me-2"
                        title="View"
                        onClick={(e) => { e.stopPropagation(); handleView(client); }}
                      >
                        <img src={viewIcon} alt="view Icon" style={{ opacity: 0.6, width: '18px', height: '18px' }} />
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm me-2"
                        title="Edit"
                        onClick={(e) => { e.stopPropagation(); handleEdit(client); }}
                      >
                        <img src={editIcon} alt="edit Icon" style={{ width: '15px', height: '15px' }} />
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm"
                        title="Delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          setClientToDelete(client);
                          setShowDeleteConfirm(true);
                        }}
                      >
                        <img src={deleteIcon} alt="delete Icon" style={{ width: '14px', height: '14px' }} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="text-center py-4">
                  No clients found in {activeTab} matching your search criteria
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Bottom Pagination */}
      <div className='d-flex align-items-center justify-content-center'>
        {totalPages > 1 && (
          <nav aria-label="Client pagination" className="pagination-wrapper">
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
                Client moved to ExitClients successfully.
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

      {selectedClient && (
        <ClientModal
          client={selectedClient}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSave={handleSave}
          isEditMode={isEditMode}
        />
      )}

      {/* Delete Confirm Modal */}
      {showDeleteConfirm && clientToDelete && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1" role="dialog" aria-modal="true">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Confirm Delete</h5>
                <button type="button" className="btn-close" onClick={() => setShowDeleteConfirm(false)}></button>
              </div>
              <div className="modal-body">
                <p>Do you want to delete the Client ?</p>
                <p><strong>ID:</strong> {clientToDelete.idNo || clientToDelete.clientId || clientToDelete.id}</p>
                <p><strong>Name:</strong> {clientToDelete.clientName}</p>
                <p><strong>Department:</strong> {clientToDelete.department}</p>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
                <button type="button" className="btn btn-danger" onClick={handleDeleteConfirmProceed}>Yes</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Reason Modal */}
      {showDeleteReasonModal && clientToDelete && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1" role="dialog" aria-modal="true">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Reason for Removing Client</h5>
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
                    <option value="Contract Closed">Contract Closed</option>
                    <option value="Contract Terminated">Contract Terminated</option>
                    <option value="Contract Stopped">Contract Stopped</option>
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
                <button type="button" className="btn btn-danger" onClick={handleDeleteSubmitWithReason}>Remove Client</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}