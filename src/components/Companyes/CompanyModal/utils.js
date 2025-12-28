// Utility functions for CompanyModal

export const safeNumber = (value) => {
    if (value === null || value === undefined || value === "") return 0;
    const num = Number(value);
    return Number.isNaN(num) ? 0 : num;
  };
  
  export const formatINR = (amount) => {
    const num = safeNumber(amount);
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };
  
  export const formatDateForInput = (date) => {
    if (!date) return "";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "";
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  export const parseDateSafe = (dateString) => {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      return isNaN(date.getTime()) ? null : date;
    } catch {
      return null;
    }
  };
  
  export const daysBetween = (start, end) => {
    const startDate = parseDateSafe(start);
    const endDate = parseDateSafe(end);
    if (!startDate || !endDate) return "";
    const diffTime = Math.abs(endDate - startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays.toString();
  };
  
  export const lockRows = (rows) => {
    if (!Array.isArray(rows)) return [];
    return rows.map(row => ({ ...row, __locked: true, __edited: false }));
  };
  
  export const stripLocks = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;
    
    if (Array.isArray(obj)) {
      return obj.map(item => stripLocks(item)).filter(item => item);
    }
    
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      if (key.startsWith('__')) continue;
      
      if (Array.isArray(value)) {
        result[key] = value.map(item => {
          if (typeof item === 'object' && item !== null) {
            const cleaned = {};
            for (const [k, v] of Object.entries(item)) {
              if (!k.startsWith('__')) {
                cleaned[k] = v;
              }
            }
            return cleaned;
          }
          return item;
        });
      } else if (typeof value === 'object' && value !== null) {
        result[key] = stripLocks(value);
      } else {
        result[key] = value;
      }
    }
    return result;
  };
  
  export const resolveUserName = (obj, fallback = "System") => {
    const raw = obj?.createdByName || obj?.addedByName || obj?.userName || obj?.name || fallback;
    return String(raw).trim().replace(/@.*/, "") || "System";
  };
  
  export const formatDDMMYY = (dateString) => {
    const date = parseDateSafe(dateString);
    if (!date) return "N/A";
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    return `${day}/${month}/${year}`;
  };
  
  export const formatTime12h = (dateString) => {
    const date = parseDateSafe(dateString);
    if (!date) return "";
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };
  
  export const diffDays = (dateString) => {
    const date = parseDateSafe(dateString);
    if (!date) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(date);
    target.setHours(0, 0, 0, 0);
    const diff = Math.ceil((target - today) / (1000 * 60 * 60 * 24));
    return diff;
  };
  
  export const friendlyLabel = (field) => {
    const map = {
      companyName: "Company Name",
      companyType: "Company Type",
      officialEmail: "Official Email",
      primaryMobile: "Primary Mobile",
      registrationNo: "Registration Number",
      gstinNo: "GSTIN Number",
      approvalStatus: "Approval Status",
      rating: "Rating",
    };
    return map[field] || field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
  };
  
  export const buildChangeSummaryAndFullAudit = (prev, current) => {
    const summaryChanges = [];
    const fullChanges = [];
  
    if (!prev || !current) return { summaryChanges, fullChanges };
  
    const trackedFields = [
      'companyName', 'companyType', 'officialEmail', 'primaryMobile',
      'registrationNo', 'gstinNo', 'approvalStatus', 'rating'
    ];
  
    trackedFields.forEach(field => {
      const before = prev[field];
      const after = current[field];
      
      if (String(before) !== String(after)) {
        summaryChanges.push({
          field,
          friendly: friendlyLabel(field),
          before: before || "(empty)",
          after: after || "(empty)",
          type: "summary"
        });
  
        fullChanges.push({
          field,
          before: before || "(empty)",
          after: after || "(empty)",
          timestamp: new Date().toISOString(),
          type: "update"
        });
      }
    });
  
    return { summaryChanges, fullChanges };
  };
  
  export const emptyPayment = () => ({
    paymentMethod: "cash",
    paidAmount: "",
    balance: "",
    receptNo: "",
    remarks: "",
    reminderDays: "",
    reminderDate: "",
    date: formatDateForInput(new Date()),
    refund: false,
    refundAmount: 0,
    refundDate: "",
    refundPaymentMethod: "",
    refundRemarks: "",
    __locked: false,
    __edited: false,
  });
  
  export const getInitialFormData = () => ({
    // This is for compatibility - use getInitialCompanyFormData from CompanyModal
    ...getInitialCompanyFormData()
  });
  
  export const resolveAddedByFromUsers = (obj, usersMap = {}) => {
    if (!obj || !usersMap) return null;
    
    const userId = obj.createdById || obj.addedById || obj.updatedById || obj.userId;
    if (userId && usersMap[userId]) {
      return usersMap[userId].name || usersMap[userId].displayName || usersMap[userId].email?.split('@')[0];
    }
    return null;
  };
  
  // Add this function to your utils
  export const getInitialCompanyFormData = () => ({
    // Basic Details
    companyId: "",
    companyName: "",
    companyType: "",
    businessCategory: "",
    branchType: "",
    branchName: "",
    yearOfEstablishment: "",
    ownershipType: "",
    websiteUrl: "",
    officialEmail: "",
    officialPhone: "",
    
    // Registration & Compliance
    registrationNo: "",
    cinNo: "",
    tanNo: "",
    gstinNo: "",
    labourLicenseNo: "",
    googleLocation: "",
    
    // Registered Address
    registeredDNo: "",
    registeredBuilding: "",
    registeredStreet: "",
    registeredLandmark: "",
    registeredVillage: "",
    registeredMandal: "",
    registeredDistrict: "",
    registeredState: "",
    registeredCountry: "India",
    registeredPincode: "",
    
    // Branch Address
    sameAsRegistered: false,
    branchDNo: "",
    branchBuilding: "",
    branchStreet: "",
    branchLandmark: "",
    branchVillage: "",
    branchMandal: "",
    branchDistrict: "",
    branchState: "",
    branchCountry: "India",
    branchPincode: "",
    
    // Primary Contact
    primaryContactName: "",
    primaryDesignation: "",
    primaryDepartment: "",
    primaryMobile: "",
    primaryAlternateMobile: "",
    primaryEmail: "",
    primaryPreferredMethod: "",
    
    // Secondary Contact
    secondaryContactName: "",
    secondaryDesignation: "",
    secondaryDepartment: "",
    secondaryMobile: "",
    secondaryAlternateMobile: "",
    secondaryEmail: "",
    secondaryPreferredMethod: "",
    
    // Finance Contact
    financeContactName: "",
    financeDesignation: "",
    financeMobile: "",
    financeEmail: "",
    billingAddressSame: true,
    
    // Manpower & Operations
    manpowerTypes: [],
    shiftCoverage: "",
    deploymentAreas: [],
    contractStartDate: "",
    contractEndDate: "",
    billingCycle: "",
    paymentTerms: "",
    gstApplicable: "",
    tdsApplicable: "",
    
    // Bank Details
    bankName: "",
    branchName: "",
    accountHolderName: "",
    accountNumber: "",
    ifscCode: "",
    upiId: "",
    cancelledChequeUrl: "",
    
    // Legal Documents
    companyLogoUrl: "",
    incorporationCertUrl: "",
    panCardUrl: "",
    gstCertUrl: "",
    labourLicenseUrl: "",
    pfRegUrl: "",
    esiRegUrl: "",
    agreementUrl: "",
    bondUrl: "",
    insuranceUrl: "",
    
    // System & Control
    rating: 0,
    approvalStatus: "Pending",
    approvedBy: "",
    approvalDate: "",
    createdById: "",
    createdByName: "",
    createdAt: "",
    updatedById: "",
    updatedByName: "",
    updatedAt: "",
    
    // Audit logs
    fullAuditLogs: [],
  });