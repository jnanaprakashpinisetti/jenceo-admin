// DisplayExitWorkers.js
import React, { useState, useEffect, useRef } from 'react';
import firebaseDB from '../../firebase';
import editIcon from '../../assets/eidt.svg';
import viewIcon from '../../assets/view.svg';
import returnIcon from '../../assets/return.svg';
import WorkerModal from './Modal/WorkerModal';

const LANG_OPTIONS = [
  "Telugu", "English", "Hindi", "Urdu", "Kannada", "Malayalam", "Tamil", "Bengali", "Marathi"
];
const HOUSE_SKILL_OPTIONS = [
  "Nursing", "Patient Care", "Care Taker", "Old Age Care", "Baby Care", "Bedside Attender",
  "Supporting", "Maid", "Cook", "House Keeper", "Chauffeur", "Cleaner", "Compounder", "Diaper", "Elder Care"
];

const NURSING_TASKS = [
  "Vital Signs Monitoring",
  "BP Check",
  "Sugar Check (Glucometer)",
  "Medication Administration",
  "IV/IM Injection",
  "IV Cannulation",
  "IV Infusion",
  "Wound Dressing",
  "Catheter Care",
  "Catheterization",
  "Ryle's Tube / NG Feeding",
  "Ryles/Nasogastric Feeding",
  "NG Tube Care",
  "PEG Feeding",
  "Nebulization",
  "Suctioning",
  "Oxygen Support",
  "Tracheostomy Care",
  "Bedsore Care",
  "Positioning & Mobility",
  "Bed Bath & Hygiene",
  "Diaper Change",
  "Urine Bag Change",
  "Post-Operative Care",
];

// Department configuration for exit workers
const ACTIVE_EXIT_DEPARTMENTS = {
  "Home Care": "WorkerData/HomeCare/Existing",
  "Housekeeping": "WorkerData/Housekeeping/Existing",
  "Office & Administrative": "WorkerData/Office/Existing",
  "Customer Service": "WorkerData/Customer/Existing",
  "Management & Supervision": "WorkerData/Management/Existing",
  "Security": "WorkerData/Security/Existing",
  "Driving & Logistics": "WorkerData/Driving/Existing",
  "Technical & Maintenance": "WorkerData/Technical/Existing",
  "Retail & Sales": "WorkerData/Retail/Existing",
  "Industrial & Labor": "WorkerData/Industrial/Existing",
  "Others": "WorkerData/Others/Existing"
};

const ACTIVE_RUNNING_DEPARTMENTS = {
  "Home Care": "WorkerData/HomeCare/Running",
  "Housekeeping": "WorkerData/Housekeeping/Running",
  "Office & Administrative": "WorkerData/Office/Running",
  "Customer Service": "WorkerData/Customer/Running",
  "Management & Supervision": "WorkerData/Management/Running",
  "Security": "WorkerData/Security/Running",
  "Driving & Logistics": "WorkerData/Driving/Running",
  "Technical & Maintenance": "WorkerData/Technical/Running",
  "Retail & Sales": "WorkerData/Retail/Running",
  "Industrial & Labor": "WorkerData/Industrial/Running",
  "Others": "WorkerData/Others/Running"
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

const canon = (s) => String(s || "")
  .toLowerCase()
  .normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[''`"]/g, "")
  .replace(/[^a-z0-9]+/g, " ")
  .replace(/\s+/g, " ")
  .trim();

// Aliases map - MOVED HERE to be accessible in getWorkerNursingTasks
const NURSING_ALIASES = {
  [canon("Ryle's Tube / NG Feeding")]: [
    canon("Ryle's Tube / NG Feeding"),
    canon("Ryles Tube / NG Feeding"),
    canon("Ryles/Nasogastric Feeding"),
    canon("Ryles Tube"),
    canon("NG Feeding"),
    canon("Nasogastric Feeding"),
    canon("NG feed"),
    canon("Ryle tube"),
  ],
  [canon("Catheter Care")]: [canon("Foley care"), canon("Catheter")],
  [canon("Catheterization")]: [canon("Foley insertion"), canon("Catheter Insert")],
  [canon("IV/IM Injection")]: [canon("IM Injection"), canon("IV Injection"), canon("Injection")],
  [canon("IV Cannulation")]: [canon("Cannulation"), canon("IV Line")],
  [canon("IV Infusion")]: [canon("Drip"), canon("IV Drip"), canon("IV infusion")],
  [canon("Wound Dressing")]: [canon("Dressing"), canon("Wound care")],
  [canon("Bedsore Care")]: [canon("Pressure sore care"), canon("Bed sore dressing")],
  [canon("Tracheostomy Care")]: [canon("Trache care"), canon("Tracheostomy")],
  [canon("Sugar Check (Glucometer)")]: [canon("Sugar Check"), canon("Glucometer"), canon("Blood sugar")],
  [canon("BP Check")]: [canon("Blood Pressure"), canon("BP monitoring")],
  [canon("Nebulization")]: [canon("Nebuliser"), canon("Nebulizer"), canon("Nebulisation")],
  [canon("Suctioning")]: [canon("Oral suction"), canon("Airway suction")],
  [canon("Oxygen Support")]: [canon("O2 support"), canon("Oxygen"), canon("Oxygen therapy")],
  [canon("PEG Feeding")]: [canon("PEG feed")],
  [canon("Diaper Change")]: [canon("Diaper"), canon("Diaper changing")],
  [canon("Urine Bag Change")]: [canon("Urine bag"), canon("Urinary bag")],
  [canon("Positioning & Mobility")]: [canon("Mobility"), canon("Positioning"), canon("Repositioning")],
  [canon("Bed Bath & Hygiene")]: [canon("Bed bath"), canon("Hygiene")],
  [canon("Medication Administration")]: [canon("Med admin"), canon("Medication")],
  [canon("Vital Signs Monitoring")]: [canon("Vitals"), canon("Vitals monitoring")],
  [canon("Post-Operative Care")]: [canon("Post op care"), canon("Post-operative")],
  [canon("NG Tube Care")]: [canon("NG Tube"), canon("Nasogastric tube")],
};

export default function DisplayExitWorkers() {
  const [allEmployees, setAllEmployees] = useState({});
  const [filteredEmployees, setFilteredEmployees] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [activeTab, setActiveTab] = useState("Home Care");

  // New unified filters
  const [skillMode, setSkillMode] = useState("single");
  const [ageRange, setAgeRange] = useState({ min: "", max: "" });
  const [experienceRange, setExperienceRange] = useState({ min: "", max: "" });
  const [dutyFilter, setDutyFilter] = useState("All");
  const [selectedLanguages, setSelectedLanguages] = useState([]);
  const [selectedHouseSkills, setSelectedHouseSkills] = useState([]);
  const [showJobRoles, setShowJobRoles] = useState(false);

  const [selectedRoles, setSelectedRoles] = useState([]);
  const [selectedGender, setSelectedGender] = useState([]);
  const [timeFormat, setTimeFormat] = useState("all");

  // Show panel only when "Nursing" pill is active
  const [showNursingPanel, setShowNursingPanel] = useState(false);
  const [selectedNursingTasks, setSelectedNursingTasks] = useState([]);
  const [nursingTasksMode, setNursingTasksMode] = useState("all");

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
    Others: false,
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [employeeCounts, setEmployeeCounts] = useState({});

  // Return flow states
  const [showReturnConfirm, setShowReturnConfirm] = useState(false);
  const [employeeToReturn, setEmployeeToReturn] = useState(null);
  const [showReturnedModal, setShowReturnedModal] = useState(false);
  const [showReturnReasonModal, setShowReturnReasonModal] = useState(false);
  const [returnReasonForm, setReturnReasonForm] = useState({ reasonType: "", comment: "" });

  const [returnError, setReturnError] = useState(null);
  const [reasonError, setReasonError] = useState(null);
  const [commentError, setCommentError] = useState(null);

  // refs for focusing
  const reasonSelectRef = useRef(null);
  const commentRef = useRef(null);

  const normalizeArray = (v) =>
    Array.isArray(v)
      ? v.filter(Boolean)
      : v
        ? String(v).split(",").map((s) => s.trim()).filter(Boolean)
        : [];

  // Return canonical NURSING_TASKS that match the employee's canonical list
  const getWorkerNursingTasks = (w) => {
    const pools = [
      w?.nursingWorks,
      w?.nursingTasks,
      w?.nurseTasks,
      w?.nurseWorks,
      w?.homeCareSkills,
      w?.skills,
      w?.primarySkills,
      w?.otherSkills,
      w?.additionalSkills,
      w?.nursingSkills,
    ];

    // Flatten all skills and convert to lowercase for comparison
    const allSkills = []
      .concat(...pools.map(normalizeArray))
      .map(s => String(s).toLowerCase().trim())
      .filter(s => s);

    // Return only the nursing tasks that actually exist in the worker's skills
    const foundTasks = NURSING_TASKS.filter(nursingTask => {
      const taskLower = nursingTask.toLowerCase().trim();

      // Direct match
      if (allSkills.includes(taskLower)) {
        return true;
      }

      // Check for aliases
      const aliases = NURSING_ALIASES[canon(nursingTask)] || [];
      const aliasMatch = aliases.some(alias => allSkills.includes(alias));
      return aliasMatch;
    });

    return foundTasks;
  };

  // Fetch all exit employees from all departments
  useEffect(() => {
    const fetchAllEmployees = async () => {
      setLoading(true);
      try {
        const employeesByDept = {};
        const counts = {};

        for (const [deptName, dbPath] of Object.entries(ACTIVE_EXIT_DEPARTMENTS)) {
          try {
            const snapshot = await firebaseDB.child(dbPath).once('value');
            if (snapshot.exists()) {
              const employeesData = [];
              snapshot.forEach((childSnapshot) => {
                employeesData.push({
                  id: childSnapshot.key,
                  department: deptName,
                  dbPath: dbPath,
                  ...childSnapshot.val()
                });
              });

              // Sort employees by ID number in descending order
              const sortedEmployees = sortEmployeesDescending(employeesData);
              employeesByDept[deptName] = sortedEmployees;
              counts[deptName] = sortedEmployees.length;
            } else {
              employeesByDept[deptName] = [];
              counts[deptName] = 0;
            }
          } catch (err) {
            console.error(`Error fetching ${deptName}:`, err);
            employeesByDept[deptName] = [];
            counts[deptName] = 0;
          }
        }

        setAllEmployees(employeesByDept);
        setFilteredEmployees(employeesByDept);
        setEmployeeCounts(counts);

        // Calculate total pages for active tab
        const activeEmployees = employeesByDept[activeTab] || [];
        setTotalPages(Math.ceil(activeEmployees.length / rowsPerPage));
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchAllEmployees();
  }, []);

  // Filter employees based on search term and filters
  useEffect(() => {
    const applyFilters = (employees) => {
      let filtered = [...employees];

      // — Search —
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filtered = filtered.filter((employee) =>
          (employee.firstName && employee.firstName.toLowerCase().includes(term)) ||
          (employee.lastName && employee.lastName.toLowerCase().includes(term)) ||
          (employee.idNo && employee.idNo.toLowerCase().includes(term)) ||
          (employee.employeeId && employee.employeeId.toLowerCase().includes(term)) ||
          (employee.primarySkill && employee.primarySkill.toLowerCase().includes(term)) ||
          (employee.gender && employee.gender.toLowerCase().includes(term))
        );
      }

      // — Gender —
      const activeGenderFilters = Object.keys(genderFilters).filter((key) => genderFilters[key]);
      if (activeGenderFilters.length > 0) {
        filtered = filtered.filter(
          (employee) => employee.gender && activeGenderFilters.includes(employee.gender)
        );
      }

      // — Primary "skillFilters" —
      const activeSkillFilters = Object.keys(skillFilters).filter((key) => skillFilters[key]);
      if (activeSkillFilters.length > 0) {
        filtered = filtered.filter(
          (employee) => employee.primarySkill && activeSkillFilters.includes(employee.primarySkill)
        );
      }

      // === New unified filters start ===

      // Duty
      if (dutyFilter !== "All") {
        filtered = filtered.filter((e) => (e.status || "On Duty") === dutyFilter);
      }

      // Languages & Housekeeping skills with Any/All logic
      const hasLangSel = selectedLanguages.length > 0;
      const hasHouseSel = selectedHouseSkills.length > 0;
      const normArr = (v) =>
        Array.isArray(v)
          ? v
          : typeof v === "string"
            ? v.split(",").map((s) => s.trim()).filter(Boolean)
            : [];

      filtered = filtered.filter((e) => {
        // Languages
        const langs = normArr(e.languages || e.language || e.knownLanguages || e.speaks).map((s) =>
          s.toLowerCase()
        );
        const wantLangs = selectedLanguages.map((s) => s.toLowerCase());
        if (hasLangSel) {
          if (skillMode === "single") {
            if (!wantLangs.some((s) => langs.includes(s))) return false;
          } else {
            if (!wantLangs.every((s) => langs.includes(s))) return false;
          }
        }

        // Housekeeping skills
        const skillsArr = []
          .concat(
            normArr(e.houseSkills),
            normArr(e.skills),
            normArr(e.otherSkills),
            normArr(e.primarySkill),
            normArr(e.primarySkills),
            normArr(e.homeCareSkills)
          )
          .map((s) => String(s).toLowerCase());

        const wantSkills = selectedHouseSkills.map((s) => s.toLowerCase());
        if (hasHouseSel) {
          if (skillMode === "single") {
            if (!wantSkills.some((s) => skillsArr.includes(s))) return false;
          } else {
            if (!wantSkills.every((s) => skillsArr.includes(s))) return false;
          }
        }

        // Age
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
        const takeNum = (v) => {
          if (v == null) return null;
          const m = String(v).match(/(\d+(?:\.\d+)?)/);
          return m ? Number(m[1]) : null;
        };
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

      // === Nursing sub-tasks filter ===
      const nursingSelected = selectedHouseSkills.map((s) => s.toLowerCase()).includes("nursing");

      if (nursingSelected && selectedNursingTasks.length > 0) {
        filtered = filtered.filter((e) => {
          // Check if this employee has nursing in their skills
          const hasNursingSkill = () => {
            const normArr = (v) =>
              Array.isArray(v)
                ? v
                : typeof v === "string"
                  ? v.split(",").map((s) => s.trim()).filter(Boolean)
                  : [];

            const allSkills = []
              .concat(
                normArr(e.houseSkills),
                normArr(e.skills),
                normArr(e.otherSkills),
                normArr(e.primarySkill),
                normArr(e.primarySkills),
                normArr(e.homeCareSkills),
                normArr(e.nursingWorks)
              )
              .map((s) => String(s).toLowerCase());

            return allSkills.includes("nursing");
          };

          if (!hasNursingSkill()) {
            return false;
          }

          const workerTasks = getWorkerNursingTasks(e);

          if (nursingTasksMode === "all") {
            const hasAllTasks = selectedNursingTasks.every(task =>
              workerTasks.some(workerTask =>
                workerTask.toLowerCase() === task.toLowerCase()
              )
            );
            return hasAllTasks;
          } else {
            const hasAnyTask = selectedNursingTasks.some(task =>
              workerTasks.some(workerTask =>
                workerTask.toLowerCase() === task.toLowerCase()
              )
            );
            return hasAnyTask;
          }
        });
      }

      // === Other Skills (Job Roles) ===
      const hasOtherSel = selectedRoles.length > 0;
      if (hasOtherSel) {
        const wantOther = selectedRoles.map((s) => s.toLowerCase());

        filtered = filtered.filter((e) => {
          const normArr = (v) =>
            Array.isArray(v)
              ? v
              : typeof v === "string"
                ? v.split(",").map((s) => s.trim()).filter(Boolean)
                : [];

          const allSkills = []
            .concat(
              normArr(e.houseSkills),
              normArr(e.skills),
              normArr(e.otherSkills),
              normArr(e.primarySkill),
              normArr(e.homeCareSkills),
              normArr(e.nursingWorks),
              normArr(e.additionalSkills),
              normArr(e.jobRoles),
            )
            .map((s) => String(s).toLowerCase());

          return skillMode === "single"
            ? wantOther.some((s) => allSkills.includes(s))
            : wantOther.every((s) => allSkills.includes(s));
        });
      }

      return filtered;
    };

    // Apply filters to all departments
    const newFiltered = {};
    Object.keys(allEmployees).forEach(dept => {
      newFiltered[dept] = applyFilters(allEmployees[dept]);
    });

    setFilteredEmployees(newFiltered);

    // Calculate total pages for active tab
    const activeEmployees = newFiltered[activeTab] || [];
    setTotalPages(Math.ceil(activeEmployees.length / rowsPerPage));
    setCurrentPage(1);
  }, [
    allEmployees,
    searchTerm,
    genderFilters,
    skillFilters,
    rowsPerPage,
    dutyFilter,
    selectedLanguages,
    selectedHouseSkills,
    skillMode,
    ageRange,
    experienceRange,
    selectedNursingTasks,
    nursingTasksMode,
    selectedRoles,
    activeTab
  ]);

  // Update total pages when active tab or rowsPerPage changes
  useEffect(() => {
    const activeEmployees = filteredEmployees[activeTab] || [];
    setTotalPages(Math.ceil(activeEmployees.length / rowsPerPage));
    setCurrentPage(1);
  }, [filteredEmployees, activeTab, rowsPerPage]);

  // Toggle Housekeeping Skill pill (drives Nursing panel)
  const handleHouseSkillClick = (s) => {
    setSelectedHouseSkills((prev) => {
      const on = prev.includes(s);
      const next = on ? prev.filter((x) => x !== s) : [...prev, s];

      const nursingOn = next.map((x) => x.toLowerCase()).includes("nursing");
      setShowNursingPanel(nursingOn);

      // If Nursing turned OFF, clear sub-task selection + reset mode
      if (!nursingOn) {
        setSelectedNursingTasks([]);
        setNursingTasksMode("all");
      }

      return next;
    });
  };

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

      // For other prefixes
      const prefixMap = {
        "HKW-": "Housekeeping",
        "OW-": "Office & Administrative",
        "CW-": "Customer Service",
        "MW-": "Management & Supervision",
        "SW-": "Security",
        "DW-": "Driving & Logistics",
        "TW-": "Technical & Maintenance",
        "RW-": "Retail & Sales",
        "IW-": "Industrial & Labor"
      };

      // Try to extract numbers from any prefix format
      const extractNumber = (id) => {
        for (const prefix in prefixMap) {
          if (id.startsWith(prefix)) {
            return parseInt(id.replace(prefix, '')) || 0;
          }
        }
        // Try to find any number at the end
        const match = id.match(/(\d+)$/);
        return match ? parseInt(match[1]) : 0;
      };

      const numA = extractNumber(idA);
      const numB = extractNumber(idB);

      if (numA !== numB) {
        return numB - numA;
      }

      // For string IDs
      return idB.localeCompare(idA);
    });
  };

  // Calculate current employees to display
  const currentEmployees = () => {
    const employees = filteredEmployees[activeTab] || [];
    const indexOfLastEmployee = currentPage * rowsPerPage;
    const indexOfFirstEmployee = indexOfLastEmployee - rowsPerPage;
    return employees.slice(indexOfFirstEmployee, indexOfLastEmployee);
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

  // Return flow functions
  const openReturnConfirm = (employee) => {
    setEmployeeToReturn(employee);
    setShowReturnConfirm(true);
  };

  const closeReturnConfirm = () => {
    setShowReturnConfirm(false);
    setEmployeeToReturn(null);
    setReturnError(null);
    setReasonError(null);
    setCommentError(null);
  };

  const handleReturnConfirmed = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!employeeToReturn) return;
    setShowReturnConfirm(false);
    setReturnReasonForm({ reasonType: "", comment: "" });
    setReturnError(null);
    setReasonError(null);
    setCommentError(null);
    setShowReturnReasonModal(true);

    setTimeout(() => {
      if (reasonSelectRef.current) reasonSelectRef.current.focus();
    }, 50);
  };

  const validateReturnForm = () => {
    let ok = true;
    setReasonError(null);
    setCommentError(null);

    if (!returnReasonForm.reasonType) {
      setReasonError('Please select a reason for return.');
      ok = false;
    }
    if (!returnReasonForm.comment || !String(returnReasonForm.comment).trim()) {
      setCommentError('Please enter a comment for return (mandatory).');
      ok = false;
    }

    setTimeout(() => {
      if (!ok) {
        if (!returnReasonForm.reasonType && reasonSelectRef.current) {
          reasonSelectRef.current.focus();
          reasonSelectRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return;
        }
        if ((!returnReasonForm.comment || !String(returnReasonForm.comment).trim()) && commentRef.current) {
          commentRef.current.focus();
          commentRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }, 0);

    return ok;
  };

  const submitReturnWithReason = async (e) => {
    if (e?.preventDefault) e.preventDefault();

    if (!employeeToReturn) {
      setReturnError("No employee selected");
      return;
    }

    if (!validateReturnForm()) return;

    const { id, department, ...rest } = employeeToReturn;

    const runningPath = ACTIVE_RUNNING_DEPARTMENTS[department];
    const existingPath = ACTIVE_EXIT_DEPARTMENTS[department];

    if (!runningPath || !existingPath) {
      setReturnError("Invalid department mapping");
      return;
    }

    try {
      const returnInfo = {
        reasonType: returnReasonForm.reasonType,
        comment: returnReasonForm.comment.trim(),
        returnedAt: new Date().toISOString(),
        returnedBy: "UI",
      };

      // ✅ USE FULL PATHS (firebaseDB IS ROOT)
      const updates = {};
      updates[`${runningPath}/${id}`] = {
        ...rest,
        __returnInfo: returnInfo,
      };
      updates[`${existingPath}/${id}`] = null;

      // ✅ THIS WILL NOW UPDATE FIREBASE
      await firebaseDB.update(updates);

      // UI cleanup
      setAllEmployees((prev) => ({
        ...prev,
        [department]: prev[department].filter((e) => e.id !== id),
      }));

      setFilteredEmployees((prev) => ({
        ...prev,
        [department]: prev[department].filter((e) => e.id !== id),
      }));

      setEmployeeCounts((prev) => ({
        ...prev,
        [department]: Math.max(0, (prev[department] || 1) - 1),
      }));

      setShowReturnReasonModal(false);
      setShowReturnedModal(true);
      setEmployeeToReturn(null);
    } catch (err) {
      console.error("Return failed:", err);
      setReturnError("Failed to move employee back to Running");
    }
  };

  const closeReturnedModal = () => {
    setShowReturnedModal(false);
  };

  const handleSave = async (updatedEmployee) => {
    try {
      await firebaseDB.child(`${updatedEmployee.dbPath}/${updatedEmployee.id}`).update(updatedEmployee);
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

  // Check if any filter is active
  const hasActiveFilters = Boolean(
    Object.values(genderFilters).some(Boolean) ||
    Object.values(skillFilters).some(Boolean) ||
    selectedLanguages.length ||
    selectedHouseSkills.length ||
    selectedNursingTasks.length ||
    (nursingTasksMode !== "all") ||
    selectedRoles.length ||
    dutyFilter !== "All" ||
    skillMode !== "single" ||
    ageRange.min || ageRange.max ||
    experienceRange.min || experienceRange.max ||
    searchTerm
  );

  // Reset all filters
  const resetFilters = () => {
    setGenderFilters({
      Male: false,
      Female: false
    });
    setSkillFilters({
      Cook: false,
      'Baby Care': false,
      'House Made': false,
      Nursing: false,
      'Elder Care': false,
      Diaper: false,
      'Patient Care': false,
      Others: false,
    });
    setSelectedLanguages([]);
    setSelectedHouseSkills([]);
    setSelectedNursingTasks([]);
    setNursingTasksMode("all");
    setShowNursingPanel(false);
    setSelectedRoles([]);
    setShowJobRoles(false);
    setDutyFilter("All");
    setSkillMode("single");
    setAgeRange({ min: "", max: "" });
    setExperienceRange({ min: "", max: "" });
    setSearchTerm("");
  };

  if (loading) return <div className="text-center my-5">Loading exit employees...</div>;
  if (error) return <div className="alert alert-danger">Error: {error}</div>;

  // Get current tab employees
  const activeEmployees = filteredEmployees[activeTab] || [];
  const currentTabEmployees = currentEmployees();
  const totalFiltered = activeEmployees.length;

  return (
    <div className='displayWorker'>
      {/* Department Tabs */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="p-3 bg-dark border border-secondary rounded-3 border-opacity-">
            <h5 className="mb-3 text-center text-info">Exit Departments</h5>
            <div className="d-flex flex-wrap gap-2 justify-content-center">
              {DEPARTMENT_ORDER.map(dept => {
                const count = employeeCounts[dept] || 0;
                const filteredCount = (filteredEmployees[dept] || []).length;
                const isActive = activeTab === dept;
                return (
                  <button
                    key={dept}
                    type="button"
                    className={`btn btn-sm ${isActive ? "btn-info" : "btn-outline-info"} position-relative`}
                    onClick={() => {
                      setActiveTab(dept);
                      setCurrentPage(1);
                    }}
                  >
                    {dept}
                    <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                      {filteredCount}
                      <span className="visually-hidden">employees</span>
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
                  Total: {employeeCounts[activeTab] || 0} |
                  Showing: {totalFiltered} {totalFiltered !== (employeeCounts[activeTab] || 0) ? `(Filtered)` : ''}
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
                    placeholder={`Search ${activeTab} exit employees...`}
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
          <div className="p-3 bg-dark border border-secondary rounded-3 border-opacity-25  workerFilter">
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

      {/* Languages & Housekeeping Skills Row */}
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
            <h6 className="mb-2 text-warning">Housekeeping Skills</h6>
            <div className="d-flex flex-wrap gap-2">
              {HOUSE_SKILL_OPTIONS.map(s => {
                const on = selectedHouseSkills.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    className={`btn btn-sm ${on ? "btn-warning text-black" : "btn-outline-warning"} rounded-pill`}
                    onClick={() => handleHouseSkillClick(s)}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {showNursingPanel && (
        <div className="col-12">
          <div className="p-3 mt-2 border rounded-3 bg-dark bg-opacity-50 mb-3">
            <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
              <div className="d-flex align-items-center gap-2">
                <h6 className="mb-0 text-info">Nursing Tasks</h6>
                <span className="badge bg-secondary">
                  {nursingTasksMode === "all" ? "Match: ALL" : "Match: ANY"}
                </span>
              </div>
              <div className="btn-group btn-group-sm">
                <button
                  type="button"
                  className={`btn ${nursingTasksMode === "all" ? "btn-info" : "btn-outline-info"}`}
                  onClick={() => setNursingTasksMode("all")}
                >
                  All
                </button>
                <button
                  type="button"
                  className={`btn ${nursingTasksMode === "any" ? "btn-info" : "btn-outline-info"}`}
                  onClick={() => setNursingTasksMode("any")}
                >
                  Any
                </button>
              </div>
            </div>

            <div className="d-flex flex-wrap gap-2 mt-2">
              {NURSING_TASKS.map((ns) => {
                const on = selectedNursingTasks.includes(ns);
                return (
                  <button
                    key={ns}
                    type="button"
                    className={`btn btn-sm rounded-pill ${on ? "btn-danger  text-dark" : "btn-outline-danger "}`}
                    onClick={() => {
                      const nursingOn = selectedHouseSkills.map(x => x.toLowerCase()).includes("nursing");
                      if (!nursingOn) {
                        setSelectedHouseSkills(prev => [...prev, "Nursing"]);
                        setShowNursingPanel(true);
                      }
                      setSelectedNursingTasks(prev =>
                        prev.includes(ns) ? prev.filter(x => x !== ns) : [...prev, ns]
                      );
                    }}
                  >
                    {ns}
                  </button>
                );
              })}
              {!!selectedNursingTasks.length && (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-warning ms-1"
                  onClick={() => setSelectedNursingTasks([])}
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showJobRoles && (
        <div className="p-3 bg-dark border rounded-3 mb-3">
          <h6 className="mb-2 text-warning">Other Skills</h6>
          <div className="row g-3">
            {/* Office & Administrative */}
            <div className="col-md-3 col-lg-3">
              <div className="category-section">
                <h6 className="category-heading text-primary mb-2">
                  Office & Administrative
                </h6>
                <div className="d-flex flex-wrap gap-2">
                  {[
                    "Computer Operating",
                    "Data Entry",
                    "Office Assistant",
                    "Receptionist",
                    "Front Desk Executive",
                    "Admin Assistant",
                    "Office Boy",
                    "Peon",
                    "Office Attendant",
                  ].map((r) => {
                    const active = selectedRoles.includes(r);
                    return (
                      <button
                        key={r}
                        className={`btn btn-sm ${active ? "btn-primary" : "btn-outline-primary"
                          } rounded-pill`}
                        onClick={() =>
                          setSelectedRoles((prev) =>
                            active
                              ? prev.filter((x) => x !== r)
                              : [...prev, r]
                          )
                        }
                      >
                        {r}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Customer Service & Telecommunication */}
            <div className="col-md-3 col-lg-3">
              <div className="category-section">
                <h6 className="category-heading text-success mb-2">
                  Customer Service
                </h6>
                <div className="d-flex flex-wrap gap-2">
                  {[
                    "Tele Calling",
                    "Customer Support",
                    "Telemarketing",
                    "BPO Executive",
                    "Call Center Agent",
                    "Customer Care Executive",
                  ].map((r) => {
                    const active = selectedRoles.includes(r);
                    return (
                      <button
                        key={r}
                        className={`btn btn-sm ${active ? "btn-success" : "btn-outline-success"
                          } rounded-pill`}
                        onClick={() =>
                          setSelectedRoles((prev) =>
                            active
                              ? prev.filter((x) => x !== r)
                              : [...prev, r]
                          )
                        }
                      >
                        {r}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Management & Supervision */}
            <div className="col-md-3 col-lg-3">
              <div className="category-section">
                <h6 className="category-heading text-warning mb-2">
                  Management & Supervision
                </h6>
                <div className="d-flex flex-wrap gap-2">
                  {[
                    "Supervisor",
                    "Manager",
                    "Team Leader",
                    "Site Supervisor",
                    "Project Coordinator",
                  ].map((r) => {
                    const active = selectedRoles.includes(r);
                    return (
                      <button
                        key={r}
                        className={`btn btn-sm ${active ? "btn-warning" : "btn-outline-warning"
                          } rounded-pill`}
                        onClick={() =>
                          setSelectedRoles((prev) =>
                            active
                              ? prev.filter((x) => x !== r)
                              : [...prev, r]
                          )
                        }
                      >
                        {r}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Security */}
            <div className="col-md-3 col-lg-3">
              <div className="category-section">
                <h6 className="category-heading text-danger mb-2">
                  Security
                </h6>
                <div className="d-flex flex-wrap gap-2">
                  {[
                    "Security Guard",
                    "Security Supervisor",
                    "Gatekeeper",
                    "Watchman",
                  ].map((r) => {
                    const active = selectedRoles.includes(r);
                    return (
                      <button
                        key={r}
                        className={`btn btn-sm ${active ? "btn-danger" : "btn-outline-danger"
                          } rounded-pill`}
                        onClick={() =>
                          setSelectedRoles((prev) =>
                            active
                              ? prev.filter((x) => x !== r)
                              : [...prev, r]
                          )
                        }
                      >
                        {r}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Driving & Logistics */}
            <div className="col-md-3 col-lg-3">
              <div className="category-section">
                <h6 className="category-heading text-info mb-2">
                  Driving & Logistics
                </h6>
                <div className="d-flex flex-wrap gap-2">
                  {[
                    "Driving",
                    "Delivery Boy",
                    "Delivery Executive",
                    "Rider",
                    "Driver",
                    "Car Driver",
                    "Bike Rider",
                    "Logistics Helper",
                  ].map((r) => {
                    const active = selectedRoles.includes(r);
                    return (
                      <button
                        key={r}
                        className={`btn btn-sm ${active ? "btn-info" : "btn-outline-info"
                          } rounded-pill`}
                        onClick={() =>
                          setSelectedRoles((prev) =>
                            active
                              ? prev.filter((x) => x !== r)
                              : [...prev, r]
                          )
                        }
                      >
                        {r}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Technical & Maintenance - Updated Color */}
            <div className="col-md-3 col-lg-3">
              <div className="category-section">
                <h6 className="category-heading text-warning mb-2">
                  Technical & Maintenance
                </h6>
                <div className="d-flex flex-wrap gap-2">
                  {[
                    "Electrician",
                    "Plumber",
                    "Carpenter",
                    "Painter",
                    "Mason",
                    "AC Technician",
                    "Mechanic",
                    "Maintenance Staff",
                    "House Keeping",
                    "Housekeeping Supervisor",
                  ].map((r) => {
                    const active = selectedRoles.includes(r);
                    return (
                      <button
                        key={r}
                        className={`btn btn-sm ${active ? "btn-warning" : "btn-outline-warning"
                          } rounded-pill`}
                        onClick={() =>
                          setSelectedRoles((prev) =>
                            active
                              ? prev.filter((x) => x !== r)
                              : [...prev, r]
                          )
                        }
                      >
                        {r}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Retail & Sales */}
            <div className="col-md-3 col-lg-3">
              <div className="category-section">
                <h6 className="category-heading text-primary mb-2">
                  Retail & Sales
                </h6>
                <div className="d-flex flex-wrap gap-2">
                  {[
                    "Sales Boy",
                    "Sales Girl",
                    "Store Helper",
                    "Retail Assistant",
                    "Shop Attendant",
                  ].map((r) => {
                    const active = selectedRoles.includes(r);
                    return (
                      <button
                        key={r}
                        className={`btn btn-sm ${active ? "btn-primary" : "btn-outline-primary"
                          } rounded-pill`}
                        onClick={() =>
                          setSelectedRoles((prev) =>
                            active
                              ? prev.filter((x) => x !== r)
                              : [...prev, r]
                          )
                        }
                      >
                        {r}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Industrial & Labor */}
            <div className="col-md-3 col-lg-3">
              <div className="category-section">
                <h6 className="category-heading text-danger mb-2">
                  Industrial & Labor
                </h6>
                <div className="d-flex flex-wrap gap-2">
                  {[
                    "Labour",
                    "Helper",
                    "Loading Unloading",
                    "Warehouse Helper",
                    "Factory Worker",
                    "Production Helper",
                    "Packaging Staff",
                  ].map((r) => {
                    const active = selectedRoles.includes(r);
                    return (
                      <button
                        key={r}
                        className={`btn btn-sm ${active ? "btn-danger" : "btn-outline-danger"
                          } rounded-pill`}
                        onClick={() =>
                          setSelectedRoles((prev) =>
                            active
                              ? prev.filter((x) => x !== r)
                              : [...prev, r]
                          )
                        }
                      >
                        {r}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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

      {/* Employees Table */}
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
            {currentTabEmployees.length > 0 ? (
              currentTabEmployees.map((employee) => (
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
                    </small>
                  </td>
                  <td>
                    {employee.firstName} {employee.lastName}
                    <div className="">
                      {[1, 2, 3, 4, 5].map((n) => {
                        const filled = n <= Number(employee.rating || 0);
                        let color = "text-secondary";
                        if (filled) {
                          if (employee.rating >= 4) color = "text-success";
                          else if (employee.rating === 3) color = "text-warning";
                          else color = "text-danger";
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
                      {/* <button
                        type="button"
                        className="btn btn-sm me-2"
                        title="Edit"
                        onClick={(e) => { e.stopPropagation(); handleEdit(employee); }}
                      >
                        <img src={editIcon} alt="edit Icon" style={{ width: '15px', height: '15px' }} />
                      </button> */}
                      <button
                        type="button"
                        className="btn btn-sm"
                        title="Return to Active"
                        onClick={(e) => {
                          e.stopPropagation();
                          openReturnConfirm(employee);
                        }}
                      >
                        <img src={returnIcon} alt="return Icon" style={{ width: '14px', height: '18px' }} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8" className="text-center py-4">
                  No exit employees found in {activeTab} matching your search criteria
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Bottom Pagination */}
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

      {/* Return Confirm Modal */}
      {showReturnConfirm && employeeToReturn && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1" role="dialog" aria-modal="true">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Confirm Return</h5>
                <button type="button" className="btn-close" onClick={closeReturnConfirm}></button>
              </div>
              <div className="modal-body">
                <p>Move this employee back to active employees?</p>
                <p><strong>ID:</strong> {employeeToReturn.employeeId || employeeToReturn.idNo || employeeToReturn.id}</p>
                <p><strong>Name:</strong> {employeeToReturn.firstName} {employeeToReturn.lastName}</p>
                <p><strong>Department:</strong> {employeeToReturn.department}</p>
                <small className="text-muted">
                  This will move the record from <strong>Exit/Existing</strong> to <strong>Running</strong> department.
                </small>
                {returnError && <div className="text-danger mt-2">{returnError}</div>}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeReturnConfirm}>Cancel</button>
                <button type="button" className="btn btn-primary" onClick={handleReturnConfirmed}>Yes, Return</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Return Reason Modal */}
      {showReturnReasonModal && employeeToReturn && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1" role="dialog" aria-modal="true">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Reason for Returning Worker</h5>
                <button type="button" className="btn-close" onClick={() => setShowReturnReasonModal(false)}></button>
              </div>
              <div className="modal-body">
                {returnError && <div className="alert alert-danger">{returnError}</div>}

                <div className="mb-3">
                  <label className="form-label"><strong>Reason</strong></label>
                  <select
                    ref={reasonSelectRef}
                    className={`form-select ${reasonError ? 'is-invalid' : ''}`}
                    value={returnReasonForm.reasonType}
                    onChange={(e) => { setReturnReasonForm(prev => ({ ...prev, reasonType: e.target.value })); setReasonError(null); setReturnError(null); }}
                  >
                    <option value="">Select Reason</option>
                    <option value="Re-Join">Re-Join</option>
                    <option value="Return">Return</option>
                    <option value="Good attitude">Good attitude</option>
                    <option value="One more chance">One more chance</option>
                    <option value="Recommendation">Recommendation</option>
                  </select>
                  {reasonError && <div className="invalid-feedback" style={{ display: 'block' }}>{reasonError}</div>}
                </div>
                <div className="mb-3">
                  <label className="form-label"><strong>Comment (mandatory)</strong></label>
                  <textarea
                    ref={commentRef}
                    className={`form-control ${commentError ? 'is-invalid' : ''}`}
                    rows={4}
                    value={returnReasonForm.comment}
                    onChange={(e) => { setReturnReasonForm(prev => ({ ...prev, comment: e.target.value })); setCommentError(null); setReturnError(null); }}
                  />
                  {commentError && <div className="invalid-feedback" style={{ display: 'block' }}>{commentError}</div>}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowReturnReasonModal(false)}>Cancel</button>
                <button type="button" className="btn btn-primary" onClick={submitReturnWithReason}>Return Worker</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Returned Success Modal */}
      {showReturnedModal && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1" role="dialog" aria-modal="true">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-success text-white">
                <h5 className="modal-title">Employee Returned</h5>
                <button type="button" className="btn-close" onClick={closeReturnedModal}></button>
              </div>
              <div className="modal-body">
                Employee moved back to <strong>Running</strong> department successfully.
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-success" onClick={closeReturnedModal}>Done</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedEmployee && (
        <WorkerModal
          employee={selectedEmployee}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSave={handleSave}
          isEditMode={isEditMode}
        />
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