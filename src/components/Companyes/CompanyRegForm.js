// CompanyRegForm.js
import React, { useEffect, useRef, useState } from "react";
import firebaseDB, { storageRef, uploadFile, getDownloadURL } from "../../firebase";

import BasicDetails from "./BasicDetails";
import RegistrationCompliance from "./RegistrationCompliance";
import RegisteredAddress from "./RegisteredAddress";
import BranchAddress from "./BranchAddress";
import PrimaryContact from "./PrimaryContact";
import SecondaryContact from "./SecondaryContact";
import FinanceContact from "./FinanceContact";
import ManpowerOperations from "./ManpowerOperations";
import BankDetails from "./BankDetails";
import LegalDocuments from "./LegalDocuments";
import RatingApproval from "./RatingApproval";

import { useAuth } from "../../context/AuthContext";
import { COMPANY_PATHS, getCompanyPathByCategory } from "../../utils/dataPaths"; // Adjust path as needed


const DEFAULT_LOGO_URL = "https://firebasestorage.googleapis.com/v0/b/jenceo-admin.firebasestorage.app/o/OfficeFiles%2Fcompany-placeholder.jpg?alt=media&token=placeholder";

const TOTAL_STEPS = 11;

const initialFormData = {
  // Basic Details
  companyId: "", // Auto-generated: CO-HC-01, CO-HK-01, etc.
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
  cancelledChequeFile: null,
  cancelledChequeUrl: "",
  
  // Legal Documents
  companyLogoFile: null,
  companyLogoUrl: "",
  companyLogoPreview: "",
  incorporationCertFile: null,
  incorporationCertUrl: "",
  panCardFile: null,
  panCardUrl: "",
  gstCertFile: null,
  gstCertUrl: "",
  labourLicenseFile: null,
  labourLicenseUrl: "",
  pfRegFile: null,
  pfRegUrl: "",
  esiRegFile: null,
  esiRegUrl: "",
  agreementFile: null,
  agreementUrl: "",
  bondFile: null,
  bondUrl: "",
  insuranceFile: null,
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
};

const getEffectiveUserId = (u) =>
  u?.dbId || u?.uid || u?.id || u?.key || null;

const getEffectiveUserName = (u, fallback = "System") => {
  const raw =
    u?.name ||
    u?.displayName ||
    u?.dbName ||
    u?.username ||
    u?.email ||
    fallback ||
    "System";
  return String(raw).trim().replace(/@.*/, "") || "System";
};

const CompanyRegForm = ({ isOpen = false, onClose = () => { }, onSaved }) => {
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const [existingCompany, setExistingCompany] = useState(null);
  const [showIdExistsModal, setShowIdExistsModal] = useState(false);

  const [successOpen, setSuccessOpen] = useState(false);
  const [successInfo, setSuccessInfo] = useState({ companyId: "", name: "", recordId: "" });

  const firstRender = useRef(true);

  const [formData, setFormData] = useState({ ...initialFormData });

  // helpers
  const validateMobileNumber = (mobile) => /^\d{10}$/.test(String(mobile || ""));
  const validatePincode = (p) => /^\d{6}$/.test(String(p || ""));
  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || ""));
  const validateWebsite = (url) => {
    if (!url) return true;
    try {
      new URL(url.startsWith('http') ? url : `https://${url}`);
      return true;
    } catch {
      return false;
    }
  };

  const { user: authUser } = useAuth?.() || {};
  const effectiveUserId = getEffectiveUserId(authUser);
  const effectiveUserName = getEffectiveUserName(authUser);

  useEffect(() => {
    const upd = () => setIsMobile(window.innerWidth <= 920);
    upd();
    let t;
    const onResize = () => { clearTimeout(t); t = setTimeout(upd, 120); };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Reset form when modal opens
  useEffect(() => {
    if (!isOpen) return;

    setFormData({ 
      ...initialFormData,
      createdById: effectiveUserId,
      createdByName: effectiveUserName,
      createdAt: new Date().toISOString(),
    });
    setErrors({});
    setStep(1);
  }, [isOpen]);

  // Duplicate ID check - searches across all categories
  const checkDuplicateId = async (companyId) => {
    if (!companyId) return null;
    try {
      // Check in all company categories
      const categories = Object.keys(COMPANY_PATHS);
      
      for (const category of categories) {
        const path = COMPANY_PATHS[category];
        const ref = firebaseDB.child(path);
        const q = await ref.orderByChild("companyId").equalTo(companyId).once("value");
        const val = q.val();
        if (val) {
          const key = Object.keys(val)[0];
          return { recordId: key, ...val[key], categoryPath: path };
        }
      }
      return null;
    } catch (err) {
      console.error("checkDuplicateId error:", err);
      return null;
    }
  };

  // Auto-generate Company ID based on company type - counts across all categories
  useEffect(() => {
    const generateCompanyId = async () => {
      if (!formData.companyType || formData.companyId) return;
      
      const prefixMap = {
        "Home Care": "HC",
        "Housekeeping": "HK",
        "Office / Corporate": "OF",
        "Factory / Manufacturing": "FM",
        "Industrial": "IN",
        "Construction": "CN",
        "Retail / Shop": "RT",
        "Hospital / Healthcare": "HH",
        "Hotel / Hospitality": "HT",
        "Warehouse / Logistics": "WL",
        "Security Services": "SS",
        "Driving / Transport": "DT",
        "Technical / Maintenance": "TM",
        "Customer Service / BPO": "CS",
        "Management / Administration": "MA",
        "Government / Public Sector": "GV",
        "Education / Institutions": "ED",
        "Others": "OT"
      };
      
      const prefix = prefixMap[formData.companyType] || "CO";
      
      try {
        // Count ALL companies across ALL categories
        let totalCount = 0;
        const categories = Object.keys(COMPANY_PATHS);
        
        for (const category of categories) {
          const path = COMPANY_PATHS[category];
          const ref = firebaseDB.child(path);
          const snapshot = await ref.once("value");
          const companies = snapshot.val() || {};
          totalCount += Object.keys(companies).length;
        }
        
        const newId = `CO-${prefix}-${(totalCount + 1).toString().padStart(3, '0')}`;
        setFormData(prev => ({ ...prev, companyId: newId }));
      } catch (err) {
        console.error("Error generating ID:", err);
      }
    };
    
    generateCompanyId();
  }, [formData.companyType]);

  // central change handler
  const handleChange = (e) => {
    if (!e || !e.target) return;
    const { name, value, type, checked, files } = e.target;

    if (name === "mobile" || name.includes("Mobile") || name === "officialPhone") {
      if (value && !/^\d*$/.test(value)) return;
      if (value.length > 10) return;
    }
    
    if (name.includes("Pincode")) {
      if (value && !/^\d*$/.test(value)) return;
      if (value.length > 6) return;
    }

    if (type === "checkbox" && name === "sameAsRegistered") {
      if (checked) {
        setFormData((prev) => ({
          ...prev,
          branchDNo: prev.registeredDNo || "",
          branchBuilding: prev.registeredBuilding || "",
          branchStreet: prev.registeredStreet || "",
          branchLandmark: prev.registeredLandmark || "",
          branchVillage: prev.registeredVillage || "",
          branchMandal: prev.registeredMandal || "",
          branchDistrict: prev.registeredDistrict || "",
          branchState: prev.registeredState || "",
          branchCountry: prev.registeredCountry || "",
          branchPincode: prev.registeredPincode || "",
          sameAsRegistered: true,
        }));
      } else {
        setFormData((prev) => ({ ...prev, sameAsRegistered: false }));
      }
      return;
    }

    if (type === "checkbox" && name === "billingAddressSame") {
      setFormData((prev) => ({ ...prev, billingAddressSame: checked }));
      return;
    }

    if (type === "checkbox" && (name === "manpowerTypes" || name === "deploymentAreas")) {
      setFormData((prev) => {
        const arr = prev[name] || [];
        return { ...prev, [name]: checked ? [...arr, value] : arr.filter((x) => x !== value) };
      });
      return;
    }

    if (type === "file") {
      const file = files?.[0] || null;
      if (!file) return;

      // Validation based on file type
      let maxSize = 5 * 1024 * 1024; // 5MB default
      let allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "application/pdf"];
      
      if (name === "companyLogoFile") {
        maxSize = 100 * 1024; // 100KB
        allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif"];
        
        // Create preview
        const reader = new FileReader();
        reader.onload = (ev) => {
          setFormData((prev) => ({
            ...prev,
            companyLogoPreview: ev.target.result,
            companyLogoUrl: ev.target.result,
          }));
        };
        reader.readAsDataURL(file);
      } else if (name === "cancelledChequeFile") {
        maxSize = 2 * 1024 * 1024; // 2MB
      }

      if (!allowedTypes.includes(file.type)) {
        setErrors((prev) => ({ 
          ...prev, 
          [name]: `File type not allowed. Allowed: ${allowedTypes.join(', ')}` 
        }));
        return;
      }

      if (file.size > maxSize) {
        const sizeMB = (maxSize / (1024 * 1024)).toFixed(1);
        setErrors((prev) => ({ 
          ...prev, 
          [name]: `File must be less than ${sizeMB}MB` 
        }));
        return;
      }

      setFormData((prev) => ({ ...prev, [name]: file }));
      setErrors((prev) => {
        const n = { ...prev };
        if (n[name]) delete n[name];
        return n;
      });
      return;
    }

    // Handle nested objects (for contacts)
    if (name.includes(".")) {
      const [parent, field] = name.split(".");
      setFormData((prev) => ({ 
        ...prev, 
        [parent]: { ...(prev[parent] || {}), [field]: value } 
      }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => {
      const n = { ...prev };
      if (n[name]) delete n[name];
      return n;
    });
  };

  const handleBlur = async (e) => {
    if (!e || !e.target) return;
    const { name, value } = e.target;
    if (!name) return;

    const fieldErrors = {};
    
    if (name.includes("Mobile") || name === "officialPhone") {
      if (value && !validateMobileNumber(value)) {
        fieldErrors[name] = "Mobile number must be 10 digits";
      }
    }
    
    if (name.includes("Email")) {
      if (value && !validateEmail(value)) {
        fieldErrors[name] = "Enter a valid email address";
      }
    }
    
    if (name === "websiteUrl") {
      if (value && !validateWebsite(value)) {
        fieldErrors[name] = "Enter a valid website URL";
      }
    }
    
    if (name.includes("Pincode")) {
      if (value && !validatePincode(value)) {
        fieldErrors[name] = "Pin code must be 6 digits";
      }
    }
    
    if (name === "companyId") {
      const id = (value || "").trim();
      if (id) {
        try {
          const existing = await checkDuplicateId(id);
          if (existing) {
            setExistingCompany(existing);
            setShowIdExistsModal(true);
            fieldErrors.companyId = `Company ID already exists for ${existing.companyName || ""}`;
          }
        } catch (err) {
          console.warn("Duplicate check failed", err);
        }
      }
    }

    setErrors((prev) => ({ ...prev, ...fieldErrors }));
  };

  // validation helpers & validators
  const checkValidationForStep = (s) => {
    const e = {};
    switch (s) {
      case 1: { // Basic Details
        if (!formData.companyName || formData.companyName.trim() === "") 
          e.companyName = "Company Name is required";
        if (!formData.companyType) 
          e.companyType = "Company Type is required";
        if (!formData.companyId || formData.companyId.trim() === "") 
          e.companyId = "Company ID is required";
        if (!formData.officialEmail) 
          e.officialEmail = "Official Email is required";
        else if (!validateEmail(formData.officialEmail))
          e.officialEmail = "Enter a valid email address";
        if (formData.officialPhone && !validateMobileNumber(formData.officialPhone))
          e.officialPhone = "Phone number must be 10 digits";
        if (formData.websiteUrl && !validateWebsite(formData.websiteUrl))
          e.websiteUrl = "Enter a valid website URL";
        break;
      }

      case 2: { // Registration & Compliance
        if (!formData.registrationNo || formData.registrationNo.trim() === "")
          e.registrationNo = "Registration No is required";
        if (!formData.gstinNo || formData.gstinNo.trim() === "")
          e.gstinNo = "GSTIN No is required";
        break;
      }

      case 3: { // Registered Address
        if (!formData.registeredDNo || formData.registeredDNo.trim() === "") 
          e.registeredDNo = "D.No/House No is required";
        if (!formData.registeredStreet || formData.registeredStreet.trim() === "") 
          e.registeredStreet = "Street Name is required";
        if (!formData.registeredVillage || formData.registeredVillage.trim() === "") 
          e.registeredVillage = "Village/Town/City is required";
        if (!formData.registeredDistrict || formData.registeredDistrict.trim() === "") 
          e.registeredDistrict = "District is required";
        if (!formData.registeredState || formData.registeredState.trim() === "") 
          e.registeredState = "State is required";
        if (!formData.registeredPincode) 
          e.registeredPincode = "PIN Code is required";
        else if (!validatePincode(formData.registeredPincode))
          e.registeredPincode = "PIN Code must be 6 digits";
        break;
      }

      case 4: { // Branch Address
        if (!formData.sameAsRegistered) {
          if (!formData.branchDNo || formData.branchDNo.trim() === "") 
            e.branchDNo = "D.No/House No is required";
          if (!formData.branchStreet || formData.branchStreet.trim() === "") 
            e.branchStreet = "Street Name is required";
          if (!formData.branchVillage || formData.branchVillage.trim() === "") 
            e.branchVillage = "Village/Town/City is required";
          if (!formData.branchDistrict || formData.branchDistrict.trim() === "") 
            e.branchDistrict = "District is required";
          if (!formData.branchState || formData.branchState.trim() === "") 
            e.branchState = "State is required";
          if (!formData.branchPincode) 
            e.branchPincode = "PIN Code is required";
          else if (!validatePincode(formData.branchPincode))
            e.branchPincode = "PIN Code must be 6 digits";
        }
        break;
      }

      case 5: { // Primary Contact
        if (!formData.primaryContactName || formData.primaryContactName.trim() === "")
          e.primaryContactName = "Contact Person Name is required";
        if (!formData.primaryDesignation || formData.primaryDesignation.trim() === "")
          e.primaryDesignation = "Designation is required";
        if (!formData.primaryMobile)
          e.primaryMobile = "Mobile No is required";
        else if (!validateMobileNumber(formData.primaryMobile))
          e.primaryMobile = "Mobile number must be 10 digits";
        if (formData.primaryEmail && !validateEmail(formData.primaryEmail))
          e.primaryEmail = "Enter a valid email address";
        if (!formData.primaryPreferredMethod)
          e.primaryPreferredMethod = "Preferred Contact Method is required";
        break;
      }

      case 6: { // Secondary Contact
        if (!formData.secondaryContactName || formData.secondaryContactName.trim() === "")
          e.secondaryContactName = "Contact Person Name is required";
        if (!formData.secondaryDesignation || formData.secondaryDesignation.trim() === "")
          e.secondaryDesignation = "Designation is required";
        if (!formData.secondaryMobile)
          e.secondaryMobile = "Mobile No is required";
        else if (!validateMobileNumber(formData.secondaryMobile))
          e.secondaryMobile = "Mobile number must be 10 digits";
        if (formData.secondaryEmail && !validateEmail(formData.secondaryEmail))
          e.secondaryEmail = "Enter a valid email address";
        if (!formData.secondaryPreferredMethod)
          e.secondaryPreferredMethod = "Preferred Contact Method is required";
        break;
      }

      case 7: { // Finance Contact
        if (!formData.financeContactName || formData.financeContactName.trim() === "")
          e.financeContactName = "Finance Contact Name is required";
        if (formData.financeMobile && !validateMobileNumber(formData.financeMobile))
          e.financeMobile = "Mobile number must be 10 digits";
        if (formData.financeEmail && !validateEmail(formData.financeEmail))
          e.financeEmail = "Enter a valid email address";
        break;
      }

      case 8: { // Manpower & Operations
        if (!formData.contractStartDate)
          e.contractStartDate = "Contract Start Date is required";
        if (!formData.contractEndDate)
          e.contractEndDate = "Contract End Date is required";
        if (!formData.billingCycle)
          e.billingCycle = "Billing Cycle is required";
        if (!formData.paymentTerms)
          e.paymentTerms = "Payment Terms are required";
        if (!formData.gstApplicable)
          e.gstApplicable = "GST Applicable status is required";
        if (!formData.tdsApplicable)
          e.tdsApplicable = "TDS Applicable status is required";
        
        // Validate dates
        if (formData.contractStartDate && formData.contractEndDate) {
          const start = new Date(formData.contractStartDate);
          const end = new Date(formData.contractEndDate);
          if (end <= start) {
            e.contractEndDate = "End date must be after start date";
          }
        }
        break;
      }

      case 9: { // Bank Details
        if (!formData.bankName || formData.bankName.trim() === "")
          e.bankName = "Bank Name is required";
        if (!formData.accountHolderName || formData.accountHolderName.trim() === "")
          e.accountHolderName = "Account Holder Name is required";
        if (!formData.accountNumber || formData.accountNumber.trim() === "")
          e.accountNumber = "Account Number is required";
        if (!formData.ifscCode || formData.ifscCode.trim() === "")
          e.ifscCode = "IFSC Code is required";
        if (formData.upiId && !validateMobileNumber(formData.upiId.split('@')[0]))
          e.upiId = "Enter a valid UPI ID";
        break;
      }

      case 10: { // Legal Documents
        if (!formData.companyLogoFile)
          e.companyLogoFile = "Company Logo is required";
        if (!formData.panCardFile)
          e.panCardFile = "PAN Card Copy is required";
        if (!formData.gstCertFile)
          e.gstCertFile = "GST Certificate is required";
        break;
      }

      case 11: { // Rating & Approval
        if (!formData.rating || formData.rating < 1 || formData.rating > 5)
          e.rating = "Rating must be between 1 and 5";
        break;
      }

      default:
        break;
    }
    return e;
  };

  const mapErrorsForChildren = (errs) => {
    const out = {};
    Object.keys(errs || {}).forEach((k) => {
      if (k.includes(".")) {
        const parts = k.split(".");
        let cur = out;
        for (let i = 0; i < parts.length; i++) {
          const p = parts[i];
          if (i === parts.length - 1) cur[p] = errs[k];
          else { cur[p] = cur[p] || {}; cur = cur[p]; }
        }
      } else {
        out[k] = errs[k];
      }
    });
    return out;
  };

  const validateCurrentStep = (s) => {
    const e = checkValidationForStep(s);
    if (Object.keys(e).length > 0) {
      const nested = mapErrorsForChildren(e);
      setErrors((prev) => ({ ...prev, ...e, ...nested }));
      setTimeout(() => {
        const firstKey = Object.keys(e)[0];
        const sel = `[name="${firstKey}"]`;
        const el = document.querySelector(sel);
        if (el && el.focus) el.focus();
      }, 50);
      return false;
    }
    setErrors((prev) => {
      const n = { ...prev };
      Object.keys(e).forEach((k) => { if (n[k]) delete n[k]; });
      return n;
    });
    return true;
  };

  const validateAllAndJump = async () => {
    for (let s = 1; s <= TOTAL_STEPS; s += 1) {
      const e = checkValidationForStep(s);
      if (Object.keys(e).length > 0) {
        const nested = mapErrorsForChildren(e);
        setErrors((prev) => ({ ...prev, ...e, ...nested }));
        setStep(s);
        setTimeout(() => {
          const firstKey = Object.keys(e)[0];
          const el = document.querySelector(`[name="${firstKey}"]`);
          if (el && el.focus) el.focus();
        }, 80);
        return false;
      }
    }
    
    // Check for duplicate company ID
    const id = (formData.companyId || "").trim();
    if (id) {
      const existing = await checkDuplicateId(id);
      if (existing) {
        setExistingCompany(existing);
        setShowIdExistsModal(true);
        setErrors((prev) => ({ ...prev, companyId: "Company ID already exists" }));
        setStep(1);
        return false;
      }
    }
    
    return true;
  };

  // Upload all files and return URLs
  const uploadFiles = async () => {
    const fileUploads = {};
    
    // List of file fields
    const fileFields = [
      { field: 'companyLogoFile', name: 'company-logo' },
      { field: 'cancelledChequeFile', name: 'cancelled-cheque' },
      { field: 'incorporationCertFile', name: 'incorporation-cert' },
      { field: 'panCardFile', name: 'pan-card' },
      { field: 'gstCertFile', name: 'gst-cert' },
      { field: 'labourLicenseFile', name: 'labour-license' },
      { field: 'pfRegFile', name: 'pf-reg' },
      { field: 'esiRegFile', name: 'esi-reg' },
      { field: 'agreementFile', name: 'agreement' },
      { field: 'bondFile', name: 'bond' },
      { field: 'insuranceFile', name: 'insurance' },
    ];
    
    for (const { field, name } of fileFields) {
      const file = formData[field];
      if (file) {
        const ext = file.name.split('.').pop();
        const fileName = `companies/${formData.companyId || 'unknown'}/${name}-${Date.now()}.${ext}`;
        const fileRef = storageRef.child(fileName);
        const snap = await uploadFile(fileRef, file);
        const url = await getDownloadURL(snap.ref);
        fileUploads[field.replace('File', 'Url')] = url;
      } else {
        fileUploads[field.replace('File', 'Url')] = field === 'companyLogoFile' ? DEFAULT_LOGO_URL : '';
      }
    }
    
    return fileUploads;
  };

  // Submit handler
  const handlePrimaryAction = async (ev) => {
    ev?.preventDefault?.();
    
    if (step < TOTAL_STEPS) {
      if (validateCurrentStep(step)) setStep((s) => Math.min(TOTAL_STEPS, s + 1));
      return;
    }
    
    if (!(await validateAllAndJump())) return;

    setIsSubmitting(true);
    try {
      // Upload all files
      const fileUrls = await uploadFiles();
      
      const nowIso = new Date().toISOString();
      const submitData = {
        ...formData,
        ...fileUrls,
        rating: Number(formData.rating || 0),
        approvalStatus: formData.approvalStatus || "Pending",
        updatedById: effectiveUserId,
        updatedByName: effectiveUserName,
        updatedAt: nowIso,
        createdById: formData.createdById || effectiveUserId,
        createdByName: formData.createdByName || effectiveUserName,
        createdAt: formData.createdAt || nowIso,
      };

      // Remove file objects from submit data
      Object.keys(formData).forEach(key => {
        if (key.endsWith('File')) delete submitData[key];
      });
      delete submitData.companyLogoPreview;

      // Get the correct Firebase path based on company type
      const categoryPath = getCompanyPathByCategory(formData.companyType);
      
      // Save to database in the correct category path
      const ref = firebaseDB.child(categoryPath);
      const newRef = ref.push();
      await newRef.set(submitData);
      const recordId = newRef.key;

      setSuccessInfo({ 
        companyId: formData.companyId, 
        name: formData.companyName, 
        recordId,
        categoryPath 
      });
      setSuccessOpen(true);

      if (typeof onSaved === "function") {
        try { onSaved({ id: recordId, ...submitData }); } catch { }
      }

      // RESET FORM
      setFormData({ ...initialFormData });
      setErrors({});
      setStep(1);
    } catch (err) {
      console.error("submit error", err);
      alert("Error submitting form: " + (err?.message || err));
    } finally { setIsSubmitting(false); }
  };

  const handlePrev = (ev) => {
    ev?.preventDefault?.();
    if (step > 1) setStep((s) => s - 1);
  };

  const renderStep = (s) => {
    const childErrors = mapErrorsForChildren(errors);
    const common = {
      formData,
      errors: childErrors,
      handleChange,
      handleBlur,
      handleFileChange: handleChange,
      setErrors,
      nextStep: () => setStep((p) => Math.min(TOTAL_STEPS, p + 1)),
      prevStep: () => setStep((p) => Math.max(1, p - 1)),
    };
    
    switch (s) {
      case 1: return <BasicDetails {...common} />;
      case 2: return <RegistrationCompliance {...common} />;
      case 3: return <RegisteredAddress {...common} />;
      case 4: return <BranchAddress {...common} />;
      case 5: return <PrimaryContact {...common} />;
      case 6: return <SecondaryContact {...common} />;
      case 7: return <FinanceContact {...common} />;
      case 8: return <ManpowerOperations {...common} />;
      case 9: return <BankDetails {...common} />;
      case 10: return <LegalDocuments {...common} />;
      case 11:
        return (
          <RatingApproval
            {...common}
            handleSubmit={handlePrimaryAction}
            isSubmitting={isSubmitting}
          />
        );
      default:
        return null;
    }
  };

  // Success modal
  const SuccessModal = ({ open, onClose, info }) => {
    if (!open) return null;
    const { companyId, name } = info || {};
    return (
      <div className="wb-success-backdrop" onClick={onClose}>
        <div className="wb-success-card bg-warning" onClick={(e) => e.stopPropagation()}>
          <div className="wb-success-title text-black">Company Registered Successfully</div>
          <div className="wb-success-sub text-black">Company ID: {companyId || "—"}</div>
          <div className="wb-success-sub text-black">{name || "—"}</div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
            <button className="btn btn-primary" onClick={() => { setSuccessOpen(false); }}>Done</button>
          </div>
        </div>
      </div>
    );
  };

  // ID Exists modal
  const IdExistsModal = () => {
    if (!showIdExistsModal || !existingCompany) return null;
    return (
      <div className="modal-backdrop-custom" role="dialog" aria-modal="true" onClick={() => setShowIdExistsModal(false)}>
        <div className="modal-card-custom" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header-custom">
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: "linear-gradient(135deg,#ff7a7a,#ffb677)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700 }}>
                ID
              </div>
              <div>
                <h5 style={{ margin: 0 }}>Company ID Already Exists</h5>
                <small style={{ color: "#6b7280" }}>Please choose a different ID</small>
              </div>
            </div>
            <button className="btn-close-custom" aria-label="Close" onClick={() => setShowIdExistsModal(false)}>✕</button>
          </div>

          <div className="modal-body-custom">
            <p style={{ marginBottom: 8 }}>This Company ID is already associated with an existing company:</p>
            <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 6, marginBottom: 8 }}>
              <div style={{ color: "#6b7280" }}>Company Name</div>
              <div style={{ fontWeight: 600 }}>{existingCompany.companyName || "N/A"}</div>
              <div style={{ color: "#6b7280" }}>Company ID</div>
              <div style={{ fontFamily: "monospace", color: "#0f172a" }}>{existingCompany.companyId || "N/A"}</div>
              <div style={{ color: "#6b7280" }}>Category</div>
              <div style={{ fontWeight: 600 }}>{existingCompany.categoryPath?.split('/')[1] || "N/A"}</div>
            </div>
            <div style={{ color: "#6b7280", fontSize: 13 }}>
              You can close this dialog and modify the Company ID, or contact administration if this is unexpected.
            </div>
          </div>

          <div className="modal-footer-custom">
            <button className="btn btn-secondary" onClick={() => setShowIdExistsModal(false)}>Close</button>
          </div>
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="wb-backdrop" onClick={onClose}>
        <div className="wb-card" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="companyFormTitle">
          <div className="wb-header">
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div id="companyFormTitle" className="wb-title">Company Registration Form</div>
              <div className="wb-step-counter">Step {step} of {TOTAL_STEPS}</div>
            </div>
            <div>
              <button className="wb-close-btn" title="Close" onClick={onClose}>✕</button>
            </div>
          </div>

          <div className="wb-body">
            {!isMobile && (
              <div className="wb-sidebar" aria-hidden>
                {Array.from({ length: TOTAL_STEPS }).map((_, i) => {
                  const idx = i + 1;
                  return (
                    <button
                      key={idx}
                      type="button"
                      className={`wb-step-btn ${step === idx ? "active" : ""}`}
                      onClick={() => setStep(idx)}
                    >
                      {idx}. {stepTitleFor(idx)}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="wb-content">
              {isMobile ? (
                <div>
                  {Array.from({ length: TOTAL_STEPS }).map((_, i) => {
                    const idx = i + 1;
                    return (
                      <div className="wb-accordion-item" key={idx}>
                        <button className="wb-accordion-header" onClick={() => setStep(idx)} aria-expanded={step === idx}>
                          <span>{idx}. {stepTitleFor(idx)}</span>
                          <span className="wb-accordion-arrow">{step === idx ? "▾" : "▸"}</span>
                        </button>
                        {step === idx && <div className="wb-accordion-body">{renderStep(idx)}</div>}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div>{renderStep(step)}</div>
              )}
            </div>
          </div>

          <div className="wb-footer">
            <button className="wb-secondary-btn me-2" onClick={handlePrev} disabled={step <= 1}>Previous</button>
            <button className="wb-primary-btn" onClick={handlePrimaryAction} disabled={isSubmitting}>
              {step < TOTAL_STEPS ? "Continue" : (isSubmitting ? "Saving..." : "Submit")}
            </button>
          </div>
        </div>
      </div>

      <SuccessModal open={successOpen} onClose={() => setSuccessOpen(false)} info={successInfo} />
      <IdExistsModal />
    </>
  );
};

function stepTitleFor(idx) {
  switch (idx) {
    case 1: return "Basic Details";
    case 2: return "Registration & Compliance";
    case 3: return "Registered Address";
    case 4: return "Branch Address";
    case 5: return "Primary Contact";
    case 6: return "Secondary Contact";
    case 7: return "Finance Contact";
    case 8: return "Manpower & Operations";
    case 9: return "Bank Details";
    case 10: return "Legal Documents";
    case 11: return "Rating & Approval";
    default: return `Step ${idx}`;
  }
}

export default CompanyRegForm;