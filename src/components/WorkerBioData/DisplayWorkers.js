import React, { useState, useEffect, useRef } from 'react';
import firebaseDB from '../../firebase';
import editIcon from '../../assets/eidt.svg';
import viewIcon from '../../assets/view.svg';
import deleteIcon from '../../assets/delete.svg';
import WorkerModal from './WorkerModal';

const LANG_OPTIONS = [
    "Telugu", "English", "Hindi", "Urdu", "Kannada", "Malayalam", "Tamil", "Bengali", "Marathi"
];
const HOUSE_SKILL_OPTIONS = [
    "Nursing", "Patient Care", "Care Taker", "Old Age Care", "Baby Care", "Bedside Attender",
    "Supporting", "Maid", "Cook", "House Keeper", "Chauffeur", "Cleaner", "Compounder", "Diaper", "Elder Care"
];


export default function DisplayWorkers() {
    const [employees, setEmployees] = useState([]);
    const [filteredEmployees, setFilteredEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);

    // New unified filters
    const [skillMode, setSkillMode] = useState("single"); // 'single' (Any) or 'multi' (All)
    const [ageRange, setAgeRange] = useState({ min: "", max: "" });
    const [experienceRange, setExperienceRange] = useState({ min: "", max: "" });
    const [dutyFilter, setDutyFilter] = useState("All"); // All | On Duty | Off Duty
    const [selectedLanguages, setSelectedLanguages] = useState([]);
    const [selectedHouseSkills, setSelectedHouseSkills] = useState([]);


    // Search and filters
    const [searchTerm, setSearchTerm] = useState('');
    const [genderFilters, setGenderFilters] = useState({
        Male: false,
        Female: false
    });
    const [skillFilters, setSkillFilters] = useState({
        Cook: false,
        'Baby Care': false,
        'House Made': false,
        Nursing: false,
        'Elder Care': false,
        Diaper: false,
        'Patient Care': false,
        Cook: false,
        Others: false,

    });

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        const fetchEmployees = () => {
            try {
                firebaseDB.child("EmployeeBioData").on('value', (snapshot) => {
                    if (snapshot.exists()) {
                        const employeesData = [];
                        snapshot.forEach((childSnapshot) => {
                            employeesData.push({
                                id: childSnapshot.key,
                                ...childSnapshot.val()
                            });
                        });

                        // Sort employees by ID number in descending order
                        const sortedEmployees = sortEmployeesDescending(employeesData);
                        setEmployees(sortedEmployees);
                        setFilteredEmployees(sortedEmployees);
                        setTotalPages(Math.ceil(sortedEmployees.length / rowsPerPage));
                    } else {
                        setEmployees([]);
                        setFilteredEmployees([]);
                        setTotalPages(1);
                    }
                    setLoading(false);
                });
            } catch (err) {
                setError(err.message);
                setLoading(false);
            }
        };

        fetchEmployees();

        return () => {
            firebaseDB.child("EmployeeBioData").off('value');
        };
    }, []); // eslint-disable-line

    // Filter employees based on search term and filters
    useEffect(() => {
        let filtered = employees;

        // Apply search filter
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(employee =>
                (employee.firstName && employee.firstName.toLowerCase().includes(term)) ||
                (employee.lastName && employee.lastName.toLowerCase().includes(term)) ||
                (employee.idNo && employee.idNo.toLowerCase().includes(term)) ||
                (employee.employeeId && employee.employeeId.toLowerCase().includes(term)) ||
                (employee.primarySkill && employee.primarySkill.toLowerCase().includes(term)) ||
                (employee.gender && employee.gender.toLowerCase().includes(term))
            );
        }

        // Apply gender filters
        const activeGenderFilters = Object.keys(genderFilters).filter(key => genderFilters[key]);
        if (activeGenderFilters.length > 0) {
            filtered = filtered.filter(employee =>
                employee.gender && activeGenderFilters.includes(employee.gender)
            );
        }

        // Apply skill filters
        const activeSkillFilters = Object.keys(skillFilters).filter(key => skillFilters[key]);
        if (activeSkillFilters.length > 0) {
            filtered = filtered.filter(employee =>
                employee.primarySkill && activeSkillFilters.includes(employee.primarySkill)
            );
        }

        // New filters start

        // Duty filter
        if (dutyFilter !== "All") {
            filtered = filtered.filter(e => (e.status || "On Duty") === dutyFilter);
        }

        // Languages & Housekeeping skills with Any/All logic
        const hasLangSel = selectedLanguages.length > 0;
        const hasHouseSel = selectedHouseSkills.length > 0;
        const normArr = (v) => Array.isArray(v) ? v : (typeof v === 'string' ? v.split(',').map(s => s.trim()).filter(Boolean) : []);

        filtered = filtered.filter(e => {
            // Langs
            const langs = normArr(e.languages || e.language || e.knownLanguages || e.speaks).map(s => s.toLowerCase());
            const wantLangs = selectedLanguages.map(s => s.toLowerCase());
            if (hasLangSel) {
                if (skillMode === "single") {
                    if (!wantLangs.some(s => langs.includes(s))) return false;
                } else {
                    if (!wantLangs.every(s => langs.includes(s))) return false;
                }
            }

            // Housekeeping Skills
            const skillsArr = normArr(e.houseSkills || e.skills || e.otherSkills || e.primarySkill).map(s => String(s).toLowerCase());
            const wantSkills = selectedHouseSkills.map(s => s.toLowerCase());
            if (hasHouseSel) {
                if (skillMode === "single") {
                    if (!wantSkills.some(s => skillsArr.includes(s))) return false;
                } else {
                    if (!wantSkills.every(s => skillsArr.includes(s))) return false;
                }
            }

            // Age (from DOB or age field)
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
            const age = calcAge(e.dateOfBirth || e.dob || e.birthDate, e.age);
            if (ageRange.min && age != null && age < parseInt(ageRange.min, 10)) return false;
            if (ageRange.max && age != null && age > parseInt(ageRange.max, 10)) return false;

            // Experience
            const takeNum = (v) => { if (v == null) return null; const m = String(v).match(/(\d+(?:\.\d+)?)/); return m ? Number(m[1]) : null; };
            const rawExp = takeNum(e.workExperince || e.experience || e.expYears || e.totalExperience || e.years);
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

        // New filters end

        setFilteredEmployees(filtered);
        setTotalPages(Math.ceil(filtered.length / rowsPerPage));
        setCurrentPage(1);
    }, [employees, searchTerm, genderFilters, skillFilters, rowsPerPage, dutyFilter, selectedLanguages, selectedHouseSkills, skillMode, ageRange, experienceRange]);

    // Update total pages when rowsPerPage changes
    useEffect(() => {
        setTotalPages(Math.ceil(filteredEmployees.length / rowsPerPage));
    }, [filteredEmployees, rowsPerPage]);

    const sortEmployeesDescending = (employeesData) => {
        return employeesData.sort((a, b) => {
            // Get the ID numbers
            const idA = a.idNo || a.employeeId || '';
            const idB = b.idNo || b.employeeId || '';

            // For JW00001 pattern
            if (idA.startsWith('JW') && idB.startsWith('JW')) {
                const numA = parseInt(idA.replace('JW', '')) || 0;
                const numB = parseInt(idB.replace('JW', '')) || 0;
                return numB - numA;
            }

            // For numeric IDs
            if (!isNaN(idA) && !isNaN(idB)) {
                return parseInt(idB) - parseInt(idA);
            }

            // For string IDs
            return idB.localeCompare(idA);
        });
    };

    // Calculate current employees to display
    const indexOfLastEmployee = currentPage * rowsPerPage;
    const indexOfFirstEmployee = indexOfLastEmployee - rowsPerPage;
    const currentEmployees = filteredEmployees.slice(indexOfFirstEmployee, indexOfLastEmployee);

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

    // Handle skill filter change
    const handleSkillFilterChange = (skill) => {
        setSkillFilters(prev => ({
            ...prev,
            [skill]: !prev[skill]
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

    const handleView = (employee) => {
        setSelectedEmployee(employee);
        setIsEditMode(false);
        setIsModalOpen(true);
    };

    const handleEdit = (employee) => {
        setSelectedEmployee(employee);
        setIsEditMode(true);
        setIsModalOpen(true);
    };

    // Delete states + inline validation states
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [employeeToDelete, setEmployeeToDelete] = useState(null);
    const [showDeleteReasonModal, setShowDeleteReasonModal] = useState(false);
    const [showDeleteSuccessModal, setShowDeleteSuccessModal] = useState(false);
    const [deleteError, setDeleteError] = useState(null); // server/general error
    const [reasonError, setReasonError] = useState(null); // inline for select
    const [commentError, setCommentError] = useState(null); // inline for textarea
    const [deleteReasonForm, setDeleteReasonForm] = useState({ reasonType: "", comment: "" });

    // refs for validation focusing
    const reasonSelectRef = useRef(null);
    const commentRef = useRef(null);

    // call to open confirmation first
    const openDeleteConfirm = (employee) => {
        setEmployeeToDelete(employee);
        setShowDeleteConfirm(true);
    };

    const closeDeleteConfirm = () => {
        setShowDeleteConfirm(false);
        // keep employeeToDelete until modal closed/handled
    };

    // Check if any filter is active
    const hasActiveFilters = Boolean(
        Object.values(genderFilters).some(Boolean) ||
        Object.values(skillFilters).some(Boolean) ||
        selectedLanguages.length ||
        selectedHouseSkills.length ||
        dutyFilter !== "All" ||
        skillMode !== "single" ||
        ageRange.min || ageRange.max ||
        experienceRange.min || experienceRange.max ||
        searchTerm
    );

    // Reset all filters
    const resetFilters = () => {
        setGenderFilters({});
        setSkillFilters({});
        setSelectedLanguages([]);
        setSelectedHouseSkills([]);
        setDutyFilter("All");
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
        setDeleteError(null); // CLEAR previous server errors when opening reason modal
        setReasonError(null);
        setCommentError(null);
        setShowDeleteReasonModal(true);

        // focus the select (reason) short delay to ensure element mounted
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

        // focus first invalid field and scroll into view
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
                // If errors set in this tick, choose based on current form fields:
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

        if (!employeeToDelete) {
            setDeleteError("No employee selected for deletion.");
            return;
        }

        const { id } = employeeToDelete;
        try {
            // read employee data
            const snapshot = await firebaseDB.child(`EmployeeBioData/${id}`).once("value");
            const employeeData = snapshot.val();
            if (!employeeData) {
                setDeleteError("Employee data not found");
                // keep modal open for user
                return;
            }

            // attach removal metadata
            const payloadToExit = { ...employeeData };

            // Save employee record under ExitEmployees (without top-level removal fields)
            await firebaseDB.child(`ExitEmployees/${id}`).set(payloadToExit);

            // push removal entry into the item's removalHistory array
            const removalEntry = {
                removedAt: new Date().toISOString(),
                removedBy: (deleteReasonForm && deleteReasonForm.by) || 'UI',
                removalReason: deleteReasonForm.reasonType || '',
                removalComment: deleteReasonForm.comment ? deleteReasonForm.comment.trim() : ''
            };
            await firebaseDB.child(`ExitEmployees/${id}/removalHistory`).push(removalEntry);
            await firebaseDB.child(`EmployeeBioData/${id}`).remove();
            // success -> close modal, clear states and show success modal
            setShowDeleteReasonModal(false);
            setEmployeeToDelete(null);
            setShowDeleteSuccessModal(true);
            setDeleteError(null);
            setReasonError(null);
            setCommentError(null);
        } catch (err) {
            console.error(err);
            // keep the reason modal open and show server error (and allow retry)
            setDeleteError('Error deleting employee: ' + (err.message || err));
        }
    };

    const handleDelete = async (employeeId) => {
        try {
            const employeeRef = firebaseDB.child(`EmployeeBioData/${employeeId}`);
            const snapshot = await employeeRef.once('value');
            const employeeData = snapshot.val();

            if (employeeData) {
                await firebaseDB.child(`ExitEmployees/${employeeId}`).set(employeeData);
                const removalEntrySimple = { removedAt: new Date().toISOString(), removedBy: 'UI', removalReason: '', removalComment: '' };
                await firebaseDB.child(`ExitEmployees/${employeeId}/removalHistory`).push(removalEntrySimple);

                await employeeRef.remove();
                alert('Employee moved to ExitEmployees successfully!');
            }
        } catch (err) {
            setError('Error deleting employee: ' + err.message);
        }
    };

    const handleSave = async (updatedEmployee) => {
        try {
            await firebaseDB.child(`EmployeeBioData/${updatedEmployee.id}`).update(updatedEmployee);
            setIsModalOpen(false);
        } catch (err) {
            setError('Error updating employee: ' + err.message);
        }
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedEmployee(null);
        setIsEditMode(false);
    };

    if (loading) return <div className="text-center my-5">Loading employees...</div>;
    if (error) return <div className="alert alert-danger">Error: {error}</div>;

    return (
        <div className='displayWorker'>
            {/* Search Bar */}
            <div className="row mb-3">
                <div className="col-md-6 m-auto">
                    <div className="input-group">
                        <span className="input-group-text">
                            <i className="bi bi-search"></i>
                        </span>
                        <input
                            type="text"
                            className="form-control search-bar"
                            placeholder="Search by name, ID, skill, or gender..."
                            value={searchTerm}
                            onChange={handleSearchChange}
                        />
                    </div>
                </div>
            </div>

            {/* Unified Filters Row (added) */}
            <div className="row mb-4">
                <div className="col-12">
                    <div className="p-3 bg-dark border border-secondary rounded-3  workerFilter">
                        <div className="row g-3 align-items-center">
                            {/* Gender */}
                            <div className="col-lg-2 col-md-3 text-center">
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

                            {/* Duty filter */}
                            <div className="col-lg-2 col-md-4 text-center">
                                <label className="form-label text-info small mb-2">Duty</label>
                                <div className="d-flex gap-2 justify-content-center">
                                    {[
                                        { label: "All", value: "All" },
                                        { label: "Duty", value: "On Duty" },
                                        { label: "Off Duty", value: "Off Duty" }
                                    ].map(opt => (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            className={`btn ${dutyFilter === opt.value ? "btn-info" : "btn-outline-info"} btn-sm`}
                                            onClick={() => setDutyFilter(opt.value)}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Reset filter */}

                            <div className="col-lg-2 col-md-4 text-center">
                                <label className="form-label small mb-2 text-warning">Reset Filters</label>
                                <div className="d-flex flex-column align-items-center gap-2">
                                    {/* Reset button */}
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

            {/* Languages & Housekeeping Skills Row (two columns) */}
            <div className="row g-3 mb-4">
                <div className="col-md-6">
                    <div className="p-3 bg-dark border border-secondary rounded-3 h-100">
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
                    <div className="p-3 bg-dark border border-secondary rounded-3 h-100">
                        <h6 className="mb-2 text-warning">Housekeeping Skills</h6>
                        <div className="d-flex flex-wrap gap-2">
                            {HOUSE_SKILL_OPTIONS.map(s => {
                                const on = selectedHouseSkills.includes(s);
                                return (
                                    <button
                                        key={s}
                                        type="button"
                                        className={`btn btn-sm ${on ? "btn-warning text-black" : "btn-outline-warning"} rounded-pill`}
                                        onClick={() => setSelectedHouseSkills(prev => on ? prev.filter(x => x !== s) : [...prev, s])}
                                    >
                                        {s}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Filter Checkboxes */}
            <div className="row mb-4">
                <div className="col-12">
                    <div className="chec-box-card">
                        <div className="card-body py-2 filter-wrapper">
                            <div className="row w-100">
                                <div className="col-md-3 d-flex align-items-center">
                                    <p className='text-warning mb-0'> Showing: {indexOfFirstEmployee + 1} - {Math.min(indexOfLastEmployee, filteredEmployees.length)} / {filteredEmployees.length}</p>
                                </div>

                                <div className="col-md-6 d-flex align-items-center justify-content-center">
                                    {totalPages > 1 && (
                                        <nav aria-label="Employee pagination" className="pagination-wrapper">
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

            <div className="table-responsive mb-3">
                <table className="table table-dark table-hover">
                    <thead className="table-dark">
                        <tr>
                            <th>Photo</th>
                            <th>ID No ↓</th>
                            <th>Name</th>
                            <th>Gender</th>
                            <th>Primary Skill</th>
                            <th>Experience</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {currentEmployees.length > 0 ? (
                            currentEmployees.map((employee) => (
                                <tr key={employee.id} onClick={(e) => { e.stopPropagation(); handleView(employee); }} style={{ cursor: 'pointer' }}>
                                    <td>
                                        {employee.employeePhoto ? (
                                            <img
                                                src={employee.employeePhoto}
                                                alt="Employee"
                                                style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '50%' }}
                                            />
                                        ) : (
                                            <div
                                                style={{
                                                    width: '50px',
                                                    height: '50px',
                                                    backgroundColor: '#4c4b4b',
                                                    borderRadius: '50%',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}
                                            >
                                            </div>
                                        )}
                                    </td>
                                    <td>
                                        <strong>{employee.employeeId || employee.idNo || 'N/A'}</strong>
                                        <small className="small-text d-block mt-1 text-info opacity-75">
                                            By <strong>{employee.createdByName || "System"}</strong>
                                            {/* Date and Time */}
                                            {/* {employee.createdAt && (
                                                <>
                                                    {" "}
                                                    on{" "}
                                                    {new Date(employee.createdAt).toLocaleDateString("en-GB", {
                                                        day: "2-digit",
                                                        month: "2-digit",
                                                        year: "2-digit",
                                                    })}{" "}
                                                    {new Date(employee.createdAt).toLocaleTimeString("en-GB", {
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                        hour12: true,
                                                    })}
                                                </>
                                            )} */}
                                        </small>
                                    </td>
                                    <td>{employee.firstName} {employee.lastName}
                                        <div className="">
                                            {[1, 2, 3, 4, 5].map((n) => {
                                                const filled = n <= Number(employee.rating || 0);
                                                let color = "text-secondary";
                                                if (filled) {
                                                    if (employee.rating >= 4) color = "text-success";     // green for 4–5
                                                    else if (employee.rating === 3) color = "text-warning"; // yellow for 3
                                                    else color = "text-danger";                             // red for 1–2
                                                }
                                                return (
                                                    <i
                                                        key={n}
                                                        className={`bi ${filled ? "bi-star-fill" : "bi-star"} ${color}`}
                                                        style={{ fontSize: "0.7rem", marginRight: 2 }}
                                                        title={`${employee.rating || 0}/5`}
                                                    />
                                                );
                                            })}
                                        </div>
                                    </td>
                                    <td>{employee.gender || 'N/A'}</td>
                                    <td>{employee.primarySkill || 'N/A'}</td>
                                    <td>{employee.workExperince ? `${employee.workExperince}` : 'N/A'}</td>
                                    <td>
                                        <span className={`badge ${getStatusBadgeClass(employee.status)}`}>
                                            {employee.status || 'On Duty'}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="d-flex">
                                            <button
                                                type="button"
                                                className="btn btn-sm me-2"
                                                title="View"
                                                onClick={(e) => { e.stopPropagation(); handleView(employee); }}
                                            >
                                                <img src={viewIcon} alt="view Icon" style={{ opacity: 0.6, width: '18px', height: '18px' }} />
                                            </button>
                                            <button
                                                type="button"
                                                className="btn btn-sm me-2"
                                                title="Edit"
                                                onClick={(e) => { e.stopPropagation(); handleEdit(employee); }}
                                            >
                                                <img src={editIcon} alt="edit Icon" style={{ width: '15px', height: '15px' }} />
                                            </button>
                                            <button
                                                type="button"
                                                className="btn btn-sm"
                                                title="Delete"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setEmployeeToDelete(employee);
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
                                <td colSpan="8" className="text-center py-4">
                                    No employees found matching your search criteria
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination controls */}
            <div className='d-flex align-items-center justify-content-center'>
                {totalPages > 1 && (
                    <nav aria-label="Employee pagination" className="pagination-wrapper">
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
                                <h5 className="modal-title">Deleted</h5>
                                <button type="button" className="btn-close" onClick={() => setShowDeleteSuccessModal(false)}></button>
                            </div>
                            <div className="modal-body">
                                Employee moved to ExitEmployees successfully.
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-success" onClick={() => setShowDeleteSuccessModal(false)}>Done</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Global delete/server error (keeps showing outside modals) */}
            {deleteError && !showDeleteReasonModal && (
                <div className="alert alert-danger mt-2">{deleteError}</div>
            )}

            {selectedEmployee && (
                <WorkerModal
                    employee={selectedEmployee}
                    isOpen={isModalOpen}
                    onClose={handleCloseModal}
                    onSave={handleSave}
                    onDelete={handleDelete}
                    isEditMode={isEditMode}
                />
            )}

            {/* Delete Confirm Modal */}
            {showDeleteConfirm && employeeToDelete && (
                <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1" role="dialog" aria-modal="true">
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Confirm Delete</h5>
                                <button type="button" className="btn-close" onClick={() => setShowDeleteConfirm(false)}></button>
                            </div>
                            <div className="modal-body">
                                <p>Do you want to delete the Worker ?</p>
                                <p><strong>ID:</strong> {employeeToDelete.employeeId || employeeToDelete.idNo || employeeToDelete.id}</p>
                                <p><strong>Name:</strong> {employeeToDelete.firstName} {employeeToDelete.lastName}</p>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
                                <button type="button" className="btn btn-danger" onClick={handleDeleteConfirmProceed}>Yes</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Reason Modal (mandatory comment + dropdown) */}
            {showDeleteReasonModal && employeeToDelete && (
                <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1" role="dialog" aria-modal="true">
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Reason for Removing Worker</h5>
                                <button type="button" className="btn-close" onClick={() => setShowDeleteReasonModal(false)}></button>
                            </div>
                            <div className="modal-body">
                                {/* show server/general error at top of modal if exists */}
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
                                        <option value="Resign">Resign</option>
                                        <option value="Termination">Termination</option>
                                        <option value="Absconder">Absconder</option>
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
                                <button type="button" className="btn btn-danger" onClick={handleDeleteSubmitWithReason}>Remove Worker</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}

// Helper function for status badge styling
const getStatusBadgeClass = (status) => {
    switch (status) {
        case 'On Duty': return 'bg-success';
        case 'Off Duty': return 'bg-secondary';
        case 'Resigned': return 'bg-warning';
        case 'Absconder': return 'bg-danger';
        case 'Terminated': return 'bg-dark';
        default: return 'bg-info';
    }
};
