// ClientInfoForm.js
import React, { useState, useRef } from "react";
import Address from "../clientInfo/Address";
import BasicInformation from "../clientInfo/BasicInformation";
import ServiceDetails from "../clientInfo/ServiceDetails";
import WorkerDetails from "../clientInfo/WorkerDetails";
import PaymentDetails from "../clientInfo/PaymentDetails";
import PatientDetails from "../clientInfo/PatientDetails";
import firebaseDB from "../../firebase";

// Helper to fetch last client ID and increment (e.g. JC00089 -> JC00090)
async function fetchLastClientId(firebaseDB) {
  try {
    const snap = await firebaseDB.child('ClientData').orderByChild('clientId').limitToLast(1).once('value');
    const val = snap.val();
    if (!val) return 'JC00001';
    const key = Object.keys(val)[0];
    const lastId = val[key].clientId || 'JC00000';
    const m = lastId.match(/^([A-Za-z]*)(\d+)$/);
    if (!m) return 'JC00001';
    const prefix = m[1] || 'JC';
    const num = parseInt(m[2], 10) + 1;
    const padded = String(num).padStart(m[2].length, '0');
    return `${prefix}${padded}`;
  } catch (err) {
    console.warn('fetchLastClientId error', err);
    return 'JC00001';
  }
}


/* -------------------
   Helpers
   ------------------- */
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
  // try dd/mm/yyyy
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

const emptyPayment = () => ({
  id: Date.now(),
  paymentMethod: "cash",
  paidAmount: "",
  balance: "",
  receptNo: "",
  remarks: "",
  reminderDays: "",
  reminderDate: "",
  date: formatDateForInput(new Date()),
});

/* -------------------
   Initial Model
   ------------------- */
const getInitialFormData = () => ({
  idNo: "",
  clientName: "",
  gender: "",
  careOf: "",
  relation: "",
  location: "",
  mobileNo1: "",
  mobileNo2: "",
  googleLocation: "",
  dNo: "",
  landMark: "",
  street: "",
  villageTown: "",
  mandal: "",
  district: "",
  state: "",
  pincode: "",
  typeOfService: "",
  servicePeriod: "",
  serviceCharges: "",
  travellingCharges: "",
  startingDate: "",
  endingDate: "",
  gapIfAny: "",
  pageNo: "",
  patientName: "",
  patentAge: "",
  serviceStatus: "",
  dropperName: "",
  aboutPatent: "",
  aboutWork: "",
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
  payments: [emptyPayment()],
});

export default function ClientInfoForm({ isOpen, onClose }) {
  const [step, setStep] = useState(1);
  const totalSteps = 6;
  const [formData, setFormData] = useState(getInitialFormData());
  // errors: top-level keys and arrays for workers/payments
  const [errors, setErrors] = useState({ workers: [{}], payments: [{}] });

  const [showModal, setShowModal] = useState(false);
  const [submittedClientData, setSubmittedClientData] = useState(null);

  const [dupModal, setDupModal] = useState({ show: false, idNo: "", name: "" });

  const stepTitles = [
    "",
    "Basic Information",
    "Address",
    "Service Details",
    "Care Recipients Details ",
    "Worker Details",
    "Payment Details",
  ];

  // capture last clicked button (fallback for submit detection)
  const lastClickedButtonRef = useRef(null);

  /* -------------------
     Change handler
     - When editing payments.reminderDays auto-compute reminderDate (subtract 1)
     - When editing payments.date and reminderDays exists -> recompute reminderDate
     ------------------- */
  const handleChange = (e, section, index = null) => {
    const { name, value } = e.target;

    if (index !== null && section) {
      const updatedArray = Array.isArray(formData[section]) ? [...formData[section]] : [];
      const row = { ...(updatedArray[index] || {}) };
      // normalize receipt field possibly named 'receiptNo' by other UI
      if (name === "receiptNo") row["receptNo"] = value;
      else row[name] = value;

      // payments special logic
      if (section === "payments") {
        // reminderDays changed -> recompute reminderDate (subtract 1 day)
        if (name === "reminderDays") {
          const days = Number(value) || 0;
          const base = parseDateSafe(row.date) || new Date();
          const adjusted = days - 1; // subtract 1 as requested
          if (adjusted >= 0) row.reminderDate = formatDateForInput(addDaysToDate(base, adjusted));
          else row.reminderDate = "";
        }
        // if date changed and reminderDays exists -> recompute (subtract 1)
        if (name === "date" && row.reminderDays) {
          const days = Number(row.reminderDays) || 0;
          const base = parseDateSafe(value) || new Date();
          const adjusted = days - 1;
          if (adjusted >= 0) row.reminderDate = formatDateForInput(addDaysToDate(base, adjusted));
          else row.reminderDate = "";
        }
      }

      updatedArray[index] = row;
      setFormData((prev) => ({ ...prev, [section]: updatedArray }));

      // clear field-level error for this row
      if (section === "workers" || section === "payments") {
        const arrErrs = (errors[section] || []).map((obj, i) => (i === index ? { ...(obj || {}), [name]: "" } : obj));
        setErrors((prev) => ({ ...prev, [section]: arrErrs }));
      } else {
        setErrors((prev) => ({ ...prev, [name]: "" }));
      }
    } else {
      // top-level
      setFormData((prev) => ({ ...prev, [name]: value }));
      setErrors((prev) => ({ ...prev, [name]: "" }));
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

    setFormData((prev) => ({ ...prev, workers: [...(prev.workers || []), newWorker] }));
    setErrors((prev) => ({ ...prev, workers: [...(prev.workers || []), {}] }));
  };

  const removeWorker = (index) => {
    setFormData((prev) => ({ ...prev, workers: (prev.workers || []).filter((_, i) => i !== index) }));
    setErrors((prev) => ({ ...prev, workers: (prev.workers || []).filter((_, i) => i !== index) }));
  };

  const addPayment = () => {
    const newPayment = emptyPayment();
    setFormData((prev) => ({ ...prev, payments: [...(prev.payments || []), newPayment] }));
    setErrors((prev) => ({ ...prev, payments: [...(prev.payments || []), {}] }));
  };

  const removePayment = (index) => {
    setFormData((prev) => ({ ...prev, payments: (prev.payments || []).filter((_, i) => i !== index) }));
    setErrors((prev) => ({ ...prev, payments: (prev.payments || []).filter((_, i) => i !== index) }));
  };

  /* -------------------
     Validation (step-specific)
     - For payments: skip rows that are completely empty
     ------------------- */
  const validateStep = (currentStep) => {
    let newErrors = { ...errors };
    let isValid = true;

    // Step 1
    if (currentStep === 1) {
      if (!formData.idNo || !formData.idNo.trim()) {
        newErrors.idNo = "ID No is required";
        isValid = false;
      } else if (!/^JC\d{5}$/.test(formData.idNo)) {
        newErrors.idNo = "ID No must be (e.g., JC00001)";
        isValid = false;
      }
      if (!formData.clientName || !formData.clientName.trim()) {
        newErrors.clientName = "Client Name is required";
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
    }

    // Step 2
    if (currentStep === 2) {
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
    }

    // Step 3
    if (currentStep === 3) {
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
    }

    // Step 4
    if (currentStep === 4) {
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
    }

    // Step 5
    if (currentStep === 5) {
      const workersErrors = (formData.workers || []).map((w) => {
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
    }

    // Step 6 (Payments) — skip empty rows
    if (currentStep === 6) {
      const payments = Array.isArray(formData.payments) ? formData.payments : [];
      const paymentsErrors = payments.map((p) => {
        const e = {};
        // treat row as empty if no significant fields
        const hasValue =
          (p.paidAmount && String(p.paidAmount).trim() !== "") ||
          (p.receptNo && String(p.receptNo).trim() !== "") ||
          (p.date && String(p.date).trim() !== "");
        if (!hasValue) {
          // leave e empty (no validation)
          return e;
        }

        if (!p.paymentMethod) {
          e.paymentMethod = "Payment Method is required";
          isValid = false;
        }
        if (p.paidAmount === "" || p.paidAmount === null || typeof p.paidAmount === "undefined") {
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
        return e;
      });
      newErrors.payments = paymentsErrors;
    }

    setErrors((prev) => ({ ...prev, ...newErrors }));
    return isValid;
  };

  /* -------------------
     nextStep: when entering step 6 clear payment errors and ensure payments exist
     ------------------- */
  const nextStep = async () => {
    if (!validateStep(step)) return;

    // duplicate ID check when leaving step 1
    if (step === 1) {
      try {
        const idToCheck = (formData.idNo || "").trim();
        const queryRef = firebaseDB.child("ClientData").orderByChild("idNo").equalTo(idToCheck);
        const snap = await queryRef.once("value");
        if (snap.exists()) {
          let foundName = "";
          const val = snap.val();
          if (val && typeof val === "object") {
            const firstKey = Object.keys(val)[0];
            if (firstKey) foundName = val[firstKey]?.clientName || "";
          }
          setDupModal({ show: true, idNo: idToCheck, name: foundName });
          return;
        }
      } catch (err) {
        console.error("Duplicate ID check failed:", err);
        // continue if check fails (don't block users)
      }
    }

    const next = Math.min(totalSteps, step + 1);

    if (next === 6) {
      // ensure payments exists
      if (!Array.isArray(formData.payments) || formData.payments.length === 0) {
        setFormData((prev) => ({ ...prev, payments: [emptyPayment()] }));
      }
      // clear payment errors so they don't show automatically
      setErrors((prev) => ({ ...prev, payments: (formData.payments || []).map(() => ({})) }));
    }

    setStep(next);
  };

  const prevStep = () => setStep((s) => Math.max(1, s - 1));

  /* -------------------
     handleSubmit (final save)
     - Only the explicit final submit button (id="client-submit-button") is allowed to persist.
     - Any other submit (enter key or a child button lacking type) will be treated as Next (or ignored).
     ------------------- */
  const handleSubmit = async (e) => {
    e.preventDefault();

    // identify submitter (modern browsers expose nativeEvent.submitter)
    const submitter = (e && e.nativeEvent && e.nativeEvent.submitter) || null;
    const lastClicked = lastClickedButtonRef.current || null;
    const active = (typeof document !== "undefined" && document.activeElement) ? document.activeElement : null;

    const finalSubmitId = "client-submit-button";
    const triggeredByFinalButton = (
      (submitter && submitter.id === finalSubmitId) ||
      (lastClicked && lastClicked.id === finalSubmitId) ||
      (active && active.id === finalSubmitId)
    );

    // If not triggered by final submit control, treat as Next (prevent accidental saves).
    if (!triggeredByFinalButton && step < totalSteps) {
      if (!validateStep(step)) return;
      const next = Math.min(totalSteps, step + 1);
      if (next === 6) {
        if (!Array.isArray(formData.payments) || formData.payments.length === 0) {
          setFormData((prev) => ({ ...prev, payments: [emptyPayment()] }));
        }
        setErrors((prev) => ({ ...prev, payments: (formData.payments || []).map(() => ({})) }));
      }
      setStep(next);
      return;
    }

    // If we reached here and it's not triggered by final button, block (safety).
    if (!triggeredByFinalButton) {
      return;
    }

    // Only when final submit button triggered and on last step do we save.
    if (step < totalSteps) {
      // final button somehow triggered before reaching last step — block it.
      return;
    }

    if (!validateStep(step)) return;

    try {
      const dataToSave = {
        ...formData,
        workers: (formData.workers || []).map(({ id, ...rest }) => rest),
        payments: (formData.payments || []).map(({ id, ...rest }) => rest),
      };

      const newRef = await firebaseDB.child("ClientData").push(dataToSave);
      if (newRef && newRef.key) {
        setSubmittedClientData({ idNo: formData.idNo, clientName: formData.clientName });
        setShowModal(true);
        setFormData(getInitialFormData());
        setErrors({ workers: [{}], payments: [{}] });
        setStep(1);
      }
    } catch (err) {
      console.error(err);
      alert("Error saving to Firebase: " + (err.message || err));
    }
  };

  // NOTE: Worker data pulling logic removed as previously requested.
  // WorkerDetails will receive the same props, except no onWorkerIdBlur.

  const renderStep = () => {
    switch (step) {
      case 1:
        return <BasicInformation formData={formData} handleChange={handleChange} errors={errors} isViewMode={false} />;
      case 2:
        return <Address formData={formData} handleChange={handleChange} errors={errors} isViewMode={false} />;
      case 3:
        return <ServiceDetails formData={formData} handleChange={handleChange} errors={errors} setErrors={setErrors} isViewMode={false} />;
      case 4:
        return <PatientDetails formData={formData} handleChange={handleChange} errors={errors} isViewMode={false} />;
      case 5:
        // removed onWorkerIdBlur per your request
        return <WorkerDetails formData={formData} handleChange={handleChange} addWorker={addWorker} removeWorker={removeWorker} errors={errors} setErrors={setErrors} isViewMode={false} />;
      case 6:
        return <PaymentDetails formData={formData} handleChange={handleChange} addPayment={addPayment} removePayment={removePayment} errors={errors} isViewMode={false} />;
      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal fade show" style={{ display: "block", backgroundColor: "rgba(3,3,3,0.9)" }}>
      <div className="modal-dialog modal-xl modal-dialog-centered client-form">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Client Information Form</h5>
            <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
          </div>

          <div className="modal-body">
            <div className="px-4 pt-3">
              <p className="text-center steps">Step {step} of {totalSteps}</p>
              <div className="progress mb-3">
                <div className="progress-bar bg-primary" role="progressbar" style={{ width: `${(step / totalSteps) * 100}%` }} />
              </div>
              <h4 className="text-center mb-3 form-steps">{stepTitles[step]}</h4>
            </div>

            {/* capture click events to remember the last clicked button (fallback detection)
                and prevent Enter key accidental submit when on intermediate steps */}
            <form
              onSubmit={handleSubmit}
              onClickCapture={(e) => {
                try {
                  const btn = e.target.closest && e.target.closest("button");
                  if (btn) lastClickedButtonRef.current = btn;
                } catch (err) {
                  // ignore
                }
              }}
              onKeyDown={(e) => {
                // Prevent Enter from submitting the form when user is on intermediate steps.
                // Allow Enter in textarea inputs.
                if (e.key === "Enter" && step < totalSteps) {
                  const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : "";
                  if (tag !== "textarea") {
                    e.preventDefault();
                    // don't auto-advance on Enter; user should click Next.
                  }
                }
              }}
            >
              <div className="card-body">{renderStep()}</div>

              <div className="card-footer d-flex justify-content-end w-100">
                {step > 1 && (
                  <button
                    type="button"
                    className="btn btn-secondary me-2"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={(e) => {
                      e.preventDefault();
                      prevStep();
                    }}
                  >
                    Previous
                  </button>
                )}

                {step < totalSteps ? (
                  // Defensive Next button: prevents default before navigating so it can never trigger a submit.
                  <button
                    type="button"
                    className="btn btn-primary"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={(e) => {
                      e.preventDefault();
                      // ensure navigation only
                      nextStep();
                    }}
                  >
                    Next
                  </button>
                ) : (
                  <button id="client-submit-button" type="submit" className="btn btn-success">Submit</button>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Submit-success modal */}
      {showModal && (
        <div className="modal fade show" style={{ display: "block", background: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header"><h5 className="modal-title text-center">Thank you!</h5><button type="button" className="btn-close" onClick={() => { setShowModal(false); onClose(); }} /></div>
              <div className="modal-body">
                <p>Your form has been submitted successfully.</p>
                {submittedClientData && (
                  <div className="alert mt-3"><strong>Client Details:</strong><div className="mt-2"><strong>ID:</strong> {submittedClientData.idNo}</div><div><strong>Client Name:</strong> {submittedClientData.clientName}</div></div>
                )}
              </div>
              <div className="modal-footer"><button type="button" className="btn btn-primary" onClick={() => { setShowModal(false); onClose(); }}>OK</button></div>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate ID modal */}
      {dupModal.show && (
        <div className="modal fade show" style={{ display: "block", background: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-danger"><h5 className="modal-title text-white">Duplicate Client ID</h5><button type="button" className="btn-close btn-white" onClick={() => setDupModal({ show: false, idNo: "", name: "" })} /></div>
              <div className="modal-body">
                <p className="mb-0">Client ID <strong>{dupModal.idNo}</strong> already exists {dupModal.name ? <>with the name: <strong>{dupModal.name}</strong></> : ""}.</p>
                <p className="mt-2 mb-0">Please enter a new Client ID to continue.</p>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setDupModal({ show: false, idNo: "", name: "" })}>OK</button>
                <button type="button" className="btn btn-outline-danger" onClick={() => { setFormData((prev) => ({ ...prev, idNo: "" })); setDupModal({ show: false, idNo: "", name: "" }); }}>Clear ID</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}