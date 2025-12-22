// ClientInfoForm.js (refactored)
import React, { useState, useRef, useEffect } from "react";
import firebaseDB from "../../firebase";
import { useAuth } from "../../context/AuthContext";
import "../../scss/components/_ClientInfoForm.scss";

// Department step component
import Department from "../clientInfo/Department";
import BasicInformation from "../clientInfo/BasicInformation";
import Address from "../clientInfo/Address";
import ServiceDetails from "../clientInfo/ServiceDetails";
import PatientDetails from "../clientInfo/PatientDetails";
import WorkerDetails from "../clientInfo/WorkerDetails";
import PaymentDetails from "../clientInfo/PaymentDetails";

// Department configurations
const departmentOptions = [
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

const services = {
  "Home Care": ["Nurse", "Caregiver", "Nursing Assistant", "Senior Nurse", "Head Nurse"],
  "Housekeeping": ["Cleaner", "Supervisor", "Manager", "Housekeeping Assistant"],
  "Office & Administrative": ["Clerk", "Coordinator", "Manager", "Admin Assistant", "Receptionist"],
  "Customer Service": ["CS Representative", "Support Executive", "Team Lead", "Manager"],
  "Management & Supervision": ["Supervisor", "Manager", "Team Lead", "Department Head"],
  "Security": ["Security Guard", "Security Officer", "Security Supervisor", "Security Manager"],
  "Driving & Logistics": ["Driver", "Delivery Executive", "Logistics Coordinator", "Fleet Manager"],
  "Technical & Maintenance": ["Technician", "Electrician", "Plumber", "Maintenance Supervisor"],
  "Retail & Sales": ["Sales Executive", "Store Assistant", "Sales Manager", "Retail Supervisor"],
  "Industrial & Labor": ["Laborer", "Machine Operator", "Production Supervisor", "Factory Worker"],
  "Others": ["General Worker", "Trainee", "Intern", "Contract Worker"]
};

// Service slots (morning 5am to night 9pm)
const generateServiceSlots = () => {
  const slots = [];
  for (let hour = 5; hour < 21; hour++) {
    const startHour = hour.toString().padStart(2, '0');
    const endHour = (hour + 1).toString().padStart(2, '0');
    slots.push(`${startHour}:00-${endHour}:00`);
  }
  return slots;
};

const serviceSlots = generateServiceSlots();

// Database node mapping
const dbNodeMap = {
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

// ID prefix mapping
const idPrefixMap = {
  "Home Care": "JC-HC-",
  "Housekeeping": "JC-HK-",
  "Office & Administrative": "JC-OF-",
  "Customer Service": "JC-CS-",
  "Management & Supervision": "JC-MA-",
  "Security": "JC-SE-",
  "Driving & Logistics": "JC-DR-",
  "Technical & Maintenance": "JC-TE-",
  "Retail & Sales": "JC-RE-",
  "Industrial & Labor": "JC-IN-",
  "Others": "JC-OT-"
};

// Helper: compute next ID
async function computeNextClientId(department, firebaseDBRef) {
  try {
    const dbNode = dbNodeMap[department];
    const prefix = idPrefixMap[department];
    
    if (!dbNode || !prefix) {
      return `${prefix}01`;
    }

    // Also check ExitClients for the same department
    const exitNode = dbNode.replace('/Running', '/Exit');
    
    const ids = [];
    
    // Read Running clients
    try {
      const snap = await firebaseDBRef.child(dbNode).once("value");
      if (snap.exists()) {
        snap.forEach((child) => {
          const v = child.val() || {};
          if (v.idNo) ids.push(String(v.idNo));
        });
      }
    } catch (e) {
      console.warn("fetch running clients failed", e);
    }

    // Read Exit clients
    try {
      const snap2 = await firebaseDBRef.child(exitNode).once("value");
      if (snap2.exists()) {
        snap2.forEach((child) => {
          const v = child.val() || {};
          if (v.idNo) ids.push(String(v.idNo));
        });
      }
    } catch (e) {
      console.warn("fetch exit clients failed", e);
    }

    // Filter IDs with the current prefix and extract numbers
    const prefixRegex = new RegExp(`^${prefix}(\\d+)$`);
    const numbers = ids
      .map(id => {
        const match = id.match(prefixRegex);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter(num => num > 0);

    const maxNum = numbers.length > 0 ? Math.max(...numbers) : 0;
    const nextNum = maxNum + 1;
    
    return `${prefix}${nextNum.toString().padStart(2, '0')}`;
  } catch (err) {
    console.warn("computeNextClientId error", err);
    const prefix = idPrefixMap[department] || "JC-";
    return `${prefix}01`;
  }
}

const emptyPayment = () => ({
  id: Date.now(),
  paymentMethod: "cash",
  paidAmount: "",
  balance: "",
  receptNo: "",
  remarks: "",
  reminderDays: "",
  reminderDate: "",
  date: "",
  addedById: null,
  addedByName: "",
  addedAt: "",
});

const getInitialFormData = () => ({
  // Department fields
  department: "",
  service: "",
  serviceSlot: "",
  customSlot: "",
  idNo: "",
  
  // Basic Information
  firstName: "",
  lastName: "",
  clientName: "",
  gender: "",
  careOf: "",
  relation: "",
  location: "",
  mobileNo1: "",
  mobileNo2: "",
  googleLocation: "",
  
  // Address
  dNo: "",
  landMark: "",
  street: "",
  villageTown: "",
  mandal: "",
  district: "",
  state: "",
  pincode: "",
  
  // Service Details
  typeOfService: "",
  servicePeriod: "",
  serviceCharges: "",
  travellingCharges: "",
  startingDate: "",
  endingDate: "",
  gapIfAny: "",
  pageNo: "",
  
  // Patient Details
  patientName: "",
  patentAge: "",
  serviceStatus: "",
  dropperName: "",
  aboutPatent: "",
  aboutWork: "",
  
  // Workers
  workers: [
    {
      id: Date.now(),
      workerIdNo: "",
      cName: "",
      basicSalary: "",
      startingDate: "",
      endingDate: "",
      mobile1: "",
      mobile2: "",
      remarks: "",
    },
  ],
  
  // Payments
  payments: [emptyPayment()],
  
  // Meta
  createdById: null,
  createdByName: "",
  createdAt: "",
});

export default function ClientInfoForm({ isOpen, onClose, onSaved }) {
  const TOTAL_STEPS = 7; // Department + 6 original steps
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState(getInitialFormData());
  const [errors, setErrors] = useState({});
  const [idAutoGenerated, setIdAutoGenerated] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Modals
  const [showModal, setShowModal] = useState(false);
  const [submittedClientData, setSubmittedClientData] = useState(null);
  const [dupModal, setDupModal] = useState({ show: false, idNo: "", name: "" });
  
  const { user: authUser } = useAuth() || { user: null };

  // Detect mobile
  useEffect(() => {
    const upd = () => setIsMobile(window.innerWidth <= 920);
    upd();
    let t;
    const onResize = () => { clearTimeout(t); t = setTimeout(upd, 120); };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Reset form when modal opens
  useEffect(() => {
    if (!isOpen) return;
    
    setFormData(getInitialFormData());
    setErrors({});
    setStep(1);
    setIdAutoGenerated(false);
    
  }, [isOpen]);

  // Auto-generate ID when department is selected
  useEffect(() => {
    if (!isOpen || !formData.department || idAutoGenerated) return;
    
    const generateId = async () => {
      try {
        const nextId = await computeNextClientId(formData.department, firebaseDB);
        setFormData(prev => ({ ...prev, idNo: nextId }));
        setIdAutoGenerated(true);
      } catch (err) {
        console.warn("Auto-generate client id failed", err);
      }
    };
    
    if (formData.department) {
      generateId();
    }
  }, [formData.department, isOpen]);

  const getEffectiveUserId = () => {
    const u = authUser || {};
    return (
      u.uid || u.id || u.dbId || u.key || u.dbUsername || u.username || u.email || null
    );
  };

  const getEffectiveUserName = () => {
    const u = authUser || {};
    const raw = u.name || u.displayName || u.dbName || u.username || u.dbUsername || u.email || "";
    return String(raw).replace(/@.*/, "").trim() || "System";
  };

  const handleChange = (e, section, index = null) => {
    const { name, value, type, checked } = e.target;
    
    // Reset auto-generated flag if ID is manually edited
    if (name === "idNo" && idAutoGenerated) {
      setIdAutoGenerated(false);
    }
    
    // Handle department change - reset ID and services
    if (name === "department") {
      setFormData(prev => ({ 
        ...prev, 
        [name]: value,
        service: "", // Reset service when department changes
        idNo: "" // Reset ID to be regenerated
      }));
      setIdAutoGenerated(false);
      setErrors(prev => ({ ...prev, [name]: "" }));
      return;
    }

    if (index !== null && section) {
      const updatedArray = Array.isArray(formData[section]) ? [...formData[section]] : [];
      const row = { ...(updatedArray[index] || {}) };
      
      if (name === "receiptNo") row["receptNo"] = value;
      else row[name] = value;

      // Handle reminder date calculation for payments
      if (section === "payments") {
        if (name === "reminderDays" || name === "date") {
          const days = Number(row.reminderDays) || 0;
          const base = parseDateSafe(name === "date" ? value : row.date) || new Date();
          const adjusted = days - 1;
          row.reminderDate = adjusted >= 0 ? 
            formatDateForInput(addDaysToDate(base, adjusted)) : "";
        }
      }

      updatedArray[index] = row;
      setFormData(prev => ({ ...prev, [section]: updatedArray }));
      clearFieldError(section, index, name);
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
      clearFieldError(name);
    }
  };

  const clearFieldError = (sectionOrField, index = null, fieldName = null) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      
      if (index !== null && sectionOrField && fieldName) {
        // Clear error in array section
        if (newErrors[sectionOrField] && newErrors[sectionOrField][index]) {
          delete newErrors[sectionOrField][index][fieldName];
        }
      } else {
        // Clear simple field error
        delete newErrors[sectionOrField];
      }
      
      return newErrors;
    });
  };

  const handleBlur = async (e) => {
    const { name, value } = e.target;
    
    if (name === "idNo" && value) {
      try {
        // Check all departments for duplicate ID
        const idToCheck = value.trim();
        let foundDuplicate = false;
        let foundName = "";
        
        for (const dept of departmentOptions) {
          const dbNode = dbNodeMap[dept];
          if (!dbNode) continue;
          
          const queryRef = firebaseDB.child(dbNode).orderByChild("idNo").equalTo(idToCheck);
          const snap = await queryRef.once("value");
          
          if (snap.exists()) {
            foundDuplicate = true;
            const val = snap.val();
            if (val && typeof val === "object") {
              const firstKey = Object.keys(val)[0];
              if (firstKey) {
                const client = val[firstKey];
                foundName = `${client.firstName || ""} ${client.lastName || ""}`.trim() || 
                           client.clientName || "";
              }
            }
            break;
          }
        }
        
        if (foundDuplicate) {
          setDupModal({ show: true, idNo: idToCheck, name: foundName });
          setErrors(prev => ({ ...prev, idNo: "ID already exists" }));
        }
      } catch (err) {
        console.error("Duplicate ID check failed:", err);
      }
    }
  };

  const addWorker = () => {
    const newWorker = {
      id: Date.now(),
      workerIdNo: "",
      cName: "",
      basicSalary: "",
      startingDate: "",
      endingDate: "",
      mobile1: "",
      mobile2: "",
      remarks: "",
    };
    setFormData(prev => ({ ...prev, workers: [...prev.workers, newWorker] }));
  };

  const removeWorker = (index) => {
    setFormData(prev => ({
      ...prev,
      workers: prev.workers.filter((_, i) => i !== index)
    }));
  };

  const addPayment = () => {
    const newPayment = emptyPayment();
    setFormData(prev => ({ ...prev, payments: [...prev.payments, newPayment] }));
  };

  const removePayment = (index) => {
    setFormData(prev => ({
      ...prev,
      payments: prev.payments.filter((_, i) => i !== index)
    }));
  };

  const validateStep = (currentStep) => {
    let newErrors = { ...errors };
    let isValid = true;

    switch (currentStep) {
      case 1: // Department step
        if (!formData.department) {
          newErrors.department = "Department is required";
          isValid = false;
        }
        if (!formData.service) {
          newErrors.service = "Service is required";
          isValid = false;
        }
        if (!formData.idNo || !formData.idNo.trim()) {
          newErrors.idNo = "ID No is required";
          isValid = false;
        }
        break;

      case 2: // Basic Information
        if (!formData.firstName || !formData.firstName.trim()) {
          newErrors.firstName = "First Name is required";
          isValid = false;
        }
        if (!formData.lastName || !formData.lastName.trim()) {
          newErrors.lastName = "Last Name is required";
          isValid = false;
        }
        if (!formData.gender) {
          newErrors.gender = "Gender is required";
          isValid = false;
        }
        if (!formData.mobileNo1) {
          newErrors.mobileNo1 = "Mobile No 1 is required";
          isValid = false;
        } else if (!/^\d{10}$/.test(formData.mobileNo1)) {
          newErrors.mobileNo1 = "Mobile No 1 must be exactly 10 digits";
          isValid = false;
        }
        if (formData.mobileNo2 && !/^\d{10}$/.test(formData.mobileNo2)) {
          newErrors.mobileNo2 = "Mobile No 2 must be exactly 10 digits";
          isValid = false;
        }
        if (!formData.location || !formData.location.trim()) {
          newErrors.location = "Location is required";
          isValid = false;
        }
        break;

      case 3: // Address
        if (!formData.dNo || !formData.dNo.trim()) {
          newErrors.dNo = "D.No is required";
          isValid = false;
        }
        if (!formData.villageTown || !formData.villageTown.trim()) {
          newErrors.villageTown = "Village/Town is required";
          isValid = false;
        }
        if (!formData.mandal || !formData.mandal.trim()) {
          newErrors.mandal = "Mandal is required";
          isValid = false;
        }
        if (!formData.district || !formData.district.trim()) {
          newErrors.district = "District is required";
          isValid = false;
        }
        if (!formData.state || !formData.state.trim()) {
          newErrors.state = "State is required";
          isValid = false;
        }
        if (!formData.pincode) {
          newErrors.pincode = "Pincode is required";
          isValid = false;
        } else if (!/^\d{6}$/.test(formData.pincode)) {
          newErrors.pincode = "Pincode must be 6 digits";
          isValid = false;
        }
        break;

      case 4: // Service Details
        if (!formData.typeOfService || !formData.typeOfService.trim()) {
          newErrors.typeOfService = "Type of Service is required";
          isValid = false;
        }
        if (!formData.servicePeriod || !formData.servicePeriod.trim()) {
          newErrors.servicePeriod = "Service Period is required";
          isValid = false;
        }
        if (!formData.serviceCharges) {
          newErrors.serviceCharges = "Service Charges is required";
          isValid = false;
        } else if (isNaN(Number(formData.serviceCharges)) || Number(formData.serviceCharges) <= 0) {
          newErrors.serviceCharges = "Service Charges must be a positive number";
          isValid = false;
        }
        if (!formData.startingDate) {
          newErrors.startingDate = "Starting Date is required";
          isValid = false;
        }
        if (!formData.pageNo || !formData.pageNo.trim()) {
          newErrors.pageNo = "Page No is required";
          isValid = false;
        }
        break;

      case 5: // Patient Details
        if (!formData.patientName || !formData.patientName.trim()) {
          newErrors.patientName = "Care Recipient Name is required";
          isValid = false;
        }
        if (!formData.patentAge) {
          newErrors.patentAge = "Care Recipient Age is required";
          isValid = false;
        }
        if (!formData.serviceStatus) {
          newErrors.serviceStatus = "Service Status is required";
          isValid = false;
        }
        if (!formData.dropperName || !formData.dropperName.trim()) {
          newErrors.dropperName = "Dropper Name is required";
          isValid = false;
        }
        if (!formData.aboutPatent || !formData.aboutPatent.trim()) {
          newErrors.aboutPatent = "About Patient is required";
          isValid = false;
        }
        if (!formData.aboutWork || !formData.aboutWork.trim()) {
          newErrors.aboutWork = "About Work is required";
          isValid = false;
        }
        break;

      case 6: // Worker Details
        const workersErrors = formData.workers.map((w) => {
          const e = {};
          if (!w.workerIdNo || !w.workerIdNo.trim()) {
            e.workerIdNo = "Worker ID is required";
            isValid = false;
          }
          if (!w.cName || !w.cName.trim()) {
            e.cName = "Worker Name is required";
            isValid = false;
          }
          if (!w.startingDate) {
            e.startingDate = "Starting Date is required";
            isValid = false;
          }
          if (!w.mobile1) {
            e.mobile1 = "Mobile 1 is required";
            isValid = false;
          } else if (!/^\d{10}$/.test(w.mobile1)) {
            e.mobile1 = "Mobile 1 must be exactly 10 digits";
            isValid = false;
          }
          if (w.mobile2 && !/^\d{10}$/.test(w.mobile2)) {
            e.mobile2 = "Mobile 2 must be exactly 10 digits";
            isValid = false;
          }
          return e;
        });
        newErrors.workers = workersErrors;
        break;

      case 7: // Payment Details
        const payments = formData.payments;
        let atLeastOneValid = false;
        const paymentsErrors = payments.map((p) => {
          const e = {};
          const hasValue = p.paidAmount || p.receptNo || p.date || p.paymentMethod;
          
          if (!hasValue) return e;
          
          if (!p.paymentMethod) {
            e.paymentMethod = "Payment method is required";
            isValid = false;
          }
          if (!p.paidAmount) {
            e.paidAmount = "Paid Amount is required";
            isValid = false;
          } else if (isNaN(Number(p.paidAmount)) || Number(p.paidAmount) <= 0) {
            e.paidAmount = "Paid Amount must be a positive number";
            isValid = false;
          }
          if (!p.receptNo || !String(p.receptNo).trim()) {
            e.receptNo = "Receipt No is required";
            isValid = false;
          }
          if (!p.date || !String(p.date).trim()) {
            e.date = "Payment Date is required";
            isValid = false;
          }
          
          if (Object.keys(e).length === 0) atLeastOneValid = true;
          return e;
        });
        
        if (!atLeastOneValid) {
          isValid = false;
          if (paymentsErrors.length > 0) {
            paymentsErrors[0] = {
              ...paymentsErrors[0],
              paidAmount: "Enter a valid payment",
              paymentMethod: "Payment method is required",
              receptNo: "Receipt No is required",
              date: "Payment Date is required",
            };
          }
        }
        newErrors.payments = paymentsErrors;
        break;
    }

    setErrors(newErrors);
    return isValid;
  };

  const nextStep = async () => {
    if (!validateStep(step)) return;
    setStep(prev => Math.min(TOTAL_STEPS, prev + 1));
  };

  const prevStep = () => {
    setStep(prev => Math.max(1, prev - 1));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (step < TOTAL_STEPS) {
      nextStep();
      return;
    }
    
    if (!validateStep(step)) return;

    setIsSubmitting(true);

    try {
      const nowIso = new Date().toISOString();
      const effId = getEffectiveUserId();
      const effName = getEffectiveUserName();
      
      // Construct client name from first and last name
      const clientName = `${formData.firstName || ''} ${formData.lastName || ''}`.trim() || 
                        formData.clientName || '';
      
      // Normalize payments
      const normalizedPayments = formData.payments.map((p) => ({
        ...p,
        addedById: p.addedById || effId,
        addedByName: (p.addedByName || effName).toString().replace(/@.*/, ""),
        addedAt: p.addedAt || p.timestamp || p.date || nowIso,
      }));

      // Build payload
      const dataToSave = {
        // Department info
        department: formData.department,
        service: formData.service,
        serviceSlot: formData.serviceSlot,
        customSlot: formData.customSlot,
        idNo: formData.idNo,
        
        // Basic info
        firstName: formData.firstName,
        lastName: formData.lastName,
        clientName: clientName,
        gender: formData.gender,
        careOf: formData.careOf,
        relation: formData.relation,
        location: formData.location,
        mobileNo1: formData.mobileNo1,
        mobileNo2: formData.mobileNo2,
        googleLocation: formData.googleLocation,
        
        // Address
        dNo: formData.dNo,
        landMark: formData.landMark,
        street: formData.street,
        villageTown: formData.villageTown,
        mandal: formData.mandal,
        district: formData.district,
        state: formData.state,
        pincode: formData.pincode,
        
        // Service details
        typeOfService: formData.typeOfService,
        servicePeriod: formData.servicePeriod,
        serviceCharges: formData.serviceCharges,
        travellingCharges: formData.travellingCharges,
        startingDate: formData.startingDate,
        endingDate: formData.endingDate,
        gapIfAny: formData.gapIfAny,
        pageNo: formData.pageNo,
        
        // Patient details
        patientName: formData.patientName,
        patentAge: formData.patentAge,
        serviceStatus: formData.serviceStatus,
        dropperName: formData.dropperName,
        aboutPatent: formData.aboutPatent,
        aboutWork: formData.aboutWork,
        
        // Workers
        workers: formData.workers.map(({ id, ...w }) => w),
        
        // Payments
        payments: normalizedPayments,
        
        // Meta
        createdById: effId,
        createdByName: effName,
        createdAt: nowIso,
      };

      // Determine database node
      const dbNode = dbNodeMap[formData.department] || "ClientData/Others/Running";
      
      // Save to Firebase
      const newRef = await firebaseDB.child(dbNode).push(dataToSave);
      
      if (newRef && newRef.key) {
        setSubmittedClientData({ 
          idNo: formData.idNo, 
          clientName: clientName,
          department: formData.department 
        });
        setShowModal(true);
        
        // Reset form
        setFormData(getInitialFormData());
        setErrors({});
        setStep(1);
        setIdAutoGenerated(false);
        
        // Callback
        if (typeof onSaved === "function") {
          onSaved({ id: newRef.key, ...dataToSave });
        }
      }
    } catch (err) {
      console.error("Error saving to Firebase:", err);
      alert("Error saving to Firebase: " + (err.message || err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = (currentStep) => {
    const commonProps = {
      formData,
      handleChange,
      handleBlur,
      errors,
      isViewMode: false,
      departmentOptions,
      services,
      serviceSlots,
      idDisabled: idAutoGenerated
    };

    switch (currentStep) {
      case 1:
        return <Department {...commonProps} />;
      case 2:
        return <BasicInformation {...commonProps} />;
      case 3:
        return <Address {...commonProps} />;
      case 4:
        return <ServiceDetails {...commonProps} setErrors={setErrors} />;
      case 5:
        return <PatientDetails {...commonProps} />;
      case 6:
        return <WorkerDetails 
          {...commonProps} 
          addWorker={addWorker}
          removeWorker={removeWorker}
          setErrors={setErrors}
        />;
      case 7:
        return <PaymentDetails 
          {...commonProps}
          addPayment={addPayment}
          removePayment={removePayment}
        />;
      default:
        return null;
    }
  };

  const stepTitleFor = (idx) => {
    switch (idx) {
      case 1: return "Department & Service";
      case 2: return "Basic Information";
      case 3: return "Address";
      case 4: return "Service Details";
      case 5: return "Care Recipients";
      case 6: return "Worker Details";
      case 7: return "Payment Details";
      default: return `Step ${idx}`;
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="client-form-backdrop" onClick={onClose}>
        <div className="client-form-card" onClick={(e) => e.stopPropagation()}>
          <div className="client-form-header">
            <div>
              <div className="client-form-title">Client Information Form</div>
              <div className="client-form-step-counter">Step {step} of {TOTAL_STEPS}</div>
            </div>
            <button className="client-form-close-btn" onClick={onClose}>✕</button>
          </div>

          <div className="client-form-body">
            {!isMobile && (
              <div className="client-form-sidebar">
                {Array.from({ length: TOTAL_STEPS }).map((_, i) => {
                  const idx = i + 1;
                  return (
                    <button
                      key={idx}
                      type="button"
                      className={`client-form-step-btn ${step === idx ? "active" : ""}`}
                      onClick={() => setStep(idx)}
                    >
                      {idx}. {stepTitleFor(idx)}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="client-form-content">
              {isMobile ? (
                <div>
                  {Array.from({ length: TOTAL_STEPS }).map((_, i) => {
                    const idx = i + 1;
                    return (
                      <div className="client-form-accordion-item" key={idx}>
                        <button 
                          className="client-form-accordion-header" 
                          onClick={() => setStep(idx)}
                          aria-expanded={step === idx}
                        >
                          <span>{idx}. {stepTitleFor(idx)}</span>
                          <span className="client-form-accordion-arrow">
                            {step === idx ? "▾" : "▸"}
                          </span>
                        </button>
                        {step === idx && (
                          <div className="client-form-accordion-body">
                            {renderStep(idx)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  {renderStep(step)}
                </form>
              )}
            </div>
          </div>

          <div className="client-form-footer">
            {step > 1 && (
              <button
                type="button"
                className="btn btn-secondary me-2"
                onClick={prevStep}
              >
                Previous
              </button>
            )}
            
            {step < TOTAL_STEPS ? (
              <button
                type="button"
                className="btn btn-primary"
                onClick={nextStep}
              >
                Next
              </button>
            ) : (
              <button
                type="submit"
                className="btn btn-success"
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Submitting..." : "Submit"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Success Modal */}
      {showModal && submittedClientData && (
        <div className="modal fade show" style={{ display: "block", background: "rgba(0,0,0,0.9)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-success">
                <h5 className="modal-title text-center text-white">Thank you!</h5>
                <button 
                  type="button" 
                  className="btn-close btn-white" 
                  onClick={() => { setShowModal(false); onClose(); }}
                />
              </div>
              <div className="modal-body">
                <p>Your form has been submitted successfully.</p>
                <div className="alert mt-3">
                  <strong>Client Details:</strong>
                  <div className="mt-2"><strong>ID:</strong> {submittedClientData.idNo}</div>
                  <div><strong>Department:</strong> {submittedClientData.department}</div>
                  <div><strong>Client Name:</strong> {submittedClientData.clientName}</div>
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-success" 
                  onClick={() => { setShowModal(false); onClose(); }}
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate ID Modal */}
      {dupModal.show && (
        <div className="modal fade show" style={{ display: "block", background: "rgba(0,0,0,0.9)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-danger">
                <h5 className="modal-title text-white">Duplicate Client ID</h5>
                <button 
                  type="button" 
                  className="btn-close btn-white" 
                  onClick={() => setDupModal({ show: false, idNo: "", name: "" })}
                />
              </div>
              <div className="modal-body">
                <p className="mb-0">
                  Client ID <strong>{dupModal.idNo}</strong> already exists 
                  {dupModal.name ? <> with the name: <strong>{dupModal.name}</strong></> : ""}.
                </p>
                <p className="mt-2 mb-0">Please enter a new Client ID to continue.</p>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setDupModal({ show: false, idNo: "", name: "" })}
                >
                  OK
                </button>
                <button 
                  type="button" 
                  className="btn btn-outline-danger" 
                  onClick={() => { 
                    setFormData(prev => ({ ...prev, idNo: "" })); 
                    setDupModal({ show: false, idNo: "", name: "" }); 
                    setIdAutoGenerated(false); 
                  }}
                >
                  Clear ID
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Helper functions (same as original)
const formatDateForInput = (v) => {
  if (!v && v !== 0) return "";
  const d = new Date(v);
  if (isNaN(d)) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const parseDateSafe = (v) => {
  if (!v && v !== 0) return null;
  if (v instanceof Date && !isNaN(v)) return v;
  const d = new Date(v);
  if (!isNaN(d)) return d;
  const s = String(v);
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  return null;
};

const addDaysToDate = (d, days) => {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + Number(days || 0));
  return copy;
};