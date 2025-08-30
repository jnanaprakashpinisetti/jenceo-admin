import React, { useState } from "react";
import Address from "../clientInfo/Address";
import BasicInformation from "../clientInfo/BasicInformation";
import ServiceDetails from "../clientInfo/ServiceDetails";
import WorkerDetails from "../clientInfo/WorkerDetails";
import PaymentDetails from "../clientInfo/PaymentDetails";
import PatientDetails from "../clientInfo/PatientDetails";
import firebaseDB from "../../firebase";

const getInitialFormData = () => ({
  idNo: "",
  clientName: "",
  gender: "",
  careOf: "",
  relation: "",
  location: "",
  mobileNo1: "",
  mobileNo2: "",
  googleLocation: '',
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
  payments: [
    {
      id: Date.now(),
      paymentMethod: "cash",
      paidAmount: "",
      balance: "",
      receptNo: "",
      remarks: "",
      reminderDate: "",
    },
  ],
});

export default function ClientInfoForm() {
  const [step, setStep] = useState(1);
  const totalSteps = 6;
  const [formData, setFormData] = useState(getInitialFormData());
  const [errors, setErrors] = useState({ workers: [{}], payments: [{}] });
  const [showModal, setShowModal] = useState(false);

  const stepTitles = [
    "",
    "Basic Information",
    "Address",
    "Service Details",
    "Care Recipients Details ",
    "Worker Details",
    "Payment Details",
  ];

  const handleChange = (e, section, index = null) => {
    const { name, value } = e.target;

    if (index !== null) {
      const updatedArray = [...formData[section]];
      updatedArray[index] = { ...updatedArray[index], [name]: value };
      setFormData({ ...formData, [section]: updatedArray });

      if (section === "workers" || section === "payments") {
        const arrErrs = (errors[section] || []).map((obj, i) =>
          i === index ? { ...obj, [name]: "" } : obj
        );
        setErrors({ ...errors, [section]: arrErrs });
      }
    } else {
      setFormData({ ...formData, [name]: value });
      setErrors({ ...errors, [name]: "" });
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

    setFormData({
      ...formData,
      workers: [...formData.workers, newWorker],
    });
    setErrors({
      ...errors,
      workers: [...(errors.workers || []), {}],
    });
  };

  const removeWorker = (index) => {
    setFormData({
      ...formData,
      workers: formData.workers.filter((_, i) => i !== index),
    });
    setErrors({
      ...errors,
      workers: (errors.workers || []).filter((_, i) => i !== index),
    });
  };

  const addPayment = () => {
    const newPayment = {
      id: Date.now(),
      paymentMethod: "cash",
      paidAmount: "",
      balance: "",
      receptNo: "",
      remarks: "",
      reminderDate: "",
    };

    setFormData({
      ...formData,
      payments: [...formData.payments, newPayment],
    });
    setErrors({
      ...errors,
      payments: [...(errors.payments || []), {}],
    });
  };

  const removePayment = (index) => {
    setFormData({
      ...formData,
      payments: formData.payments.filter((_, i) => i !== index),
    });
    setErrors({
      ...errors,
      payments: (errors.payments || []).filter((_, i) => i !== index),
    });
  };

  // this function to get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // COMPREHENSIVE VALIDATION FUNCTION
  const validateStep = (currentStep) => {
    let newErrors = { ...errors };
    let isValid = true;

    // Step 1: Basic Info
    if (currentStep === 1) {
      if (!formData.idNo.trim()) {
        newErrors.idNo = "ID No is required";
        isValid = false;
      } else if (!/^JC\d{5}$/.test(formData.idNo)) {
        newErrors.idNo = "ID No must be (e.g., JC00001)";
        isValid = false;
      }
      if (!formData.clientName.trim()) {
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
      if (!formData.location.trim()) {
        newErrors.location = "Location is required";
        isValid = false;
      }
    }

    // Step 2: Address
    if (currentStep === 2) {
      if (!formData.dNo.trim()) {
        newErrors.dNo = "D.No is required";
        isValid = false;
      }
      if (!formData.villageTown.trim()) {
        newErrors.villageTown = "Village/Town is required";
        isValid = false;
      }
      if (!formData.mandal.trim()) {
        newErrors.mandal = "Mandal is required";
        isValid = false;
      }
      if (!formData.district.trim()) {
        newErrors.district = "District is required";
        isValid = false;
      }
      if (!formData.state.trim()) {
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

    // Step 3: Service Details
    if (currentStep === 3) {
      if (!formData.typeOfService.trim()) {
        newErrors.typeOfService = "Type of Service is required";
        isValid = false;
      }
      if (!formData.servicePeriod.trim()) {
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
      if (!formData.pageNo.trim()) {
        newErrors.pageNo = "Page No is required";
        isValid = false;
      }
    }

    // Step 4: Care Recipients Details
    if (currentStep === 4) {
      if (!formData.patientName.trim()) {
        newErrors.patientName = "Care Recipients Name is required";
        isValid = false;
      }
      if (!formData.patentAge) {
        newErrors.patentAge = "Care Recipients Age is required";
        isValid = false;
      }
      if (!formData.serviceStatus) {
        newErrors.serviceStatus = "Service Status is required";
        isValid = false;
      }
      if (!formData.dropperName.trim()) {
        newErrors.dropperName = "Dropper Name is required";
        isValid = false;
      }
      if (!formData.aboutPatent.trim()) {
        newErrors.aboutPatent = "About Patient is required";
        isValid = false;
      }
      if (!formData.aboutWork.trim()) {
        newErrors.aboutWork = "About Work is required";
        isValid = false;
      }
    }

    // Step 5: Worker Details
    if (currentStep === 5) {
      const workersErrors = formData.workers.map((w, idx) => {
        const e = {};
        if (!w.workerIdNo.trim()) {
          e.workerIdNo = "Worker ID is required";
          isValid = false;
        }
        if (!w.cName.trim()) {
          e.cName = "Worker Name is required";
          isValid = false;
        }
        if (!w.basicSalary) {
          e.basicSalary = "Basic Salary is required";
          isValid = false;
        } else if (isNaN(Number(w.basicSalary)) || Number(w.basicSalary) <= 0) {
          e.basicSalary = "Basic Salary must be a positive number";
          isValid = false;
        }
        if (!w.startingDate) {
          e.startingDate = "Starting Date is required";
          isValid = false;
        }
        // Ending date can be empty or a future date (no validation required)
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

    // Step 6: Payment Details
    if (currentStep === 6) {
      const paymentsErrors = formData.payments.map((p, idx) => {
        const e = {};
        if (!p.paymentMethod) {
          e.paymentMethod = "Payment Method is required";
          isValid = false;
        }
        if (!p.paidAmount) {
          e.paidAmount = "Paid Amount is required";
          isValid = false;
        } else if (isNaN(Number(p.paidAmount)) || Number(p.paidAmount) <= 0) {
          e.paidAmount = "Paid Amount must be a positive number";
          isValid = false;
        } else if (p.paidAmount.length > 5) {
          e.paidAmount = "Paid Amount must be 5 digits or less";
          isValid = false;
        }
        if (!p.balance) {
          e.balance = "Balance is required";
          isValid = false;
        } else if (isNaN(Number(p.balance)) || Number(p.balance) < 0) {
          e.balance = "Balance must be a valid number";
          isValid = false;
        }
        if (!p.receptNo.trim()) {
          e.receptNo = "Receipt No is required";
          isValid = false;
        }
        return e;
      });
      newErrors.payments = paymentsErrors;
    }

    setErrors(newErrors);
    return isValid;
  };

  const nextStep = () => {
    if (validateStep(step)) {
      setStep(step + 1);
    }
  };

  const prevStep = () => setStep(step - 1);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep(step)) return;

    try {
      // Remove temporary IDs before saving
      const dataToSave = {
        ...formData,
        workers: formData.workers.map(({ id, ...worker }) => worker),
        payments: formData.payments.map(({ id, ...payment }) => payment)
      };

      const newRef = await firebaseDB.child("ClientData").push(dataToSave);
      if (newRef && newRef.key) {
        setShowModal(true);
        setFormData(getInitialFormData());
        setErrors({ workers: [{}], payments: [{}] });
        setStep(1);
      }
    } catch (err) {
      console.error(err);
      alert("Error saving to Firebase: " + err.message);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <BasicInformation formData={formData} handleChange={handleChange} errors={errors} />
        );
      case 2:
        return <Address formData={formData} handleChange={handleChange} errors={errors} />;
      case 3:
        return <ServiceDetails formData={formData} handleChange={handleChange} errors={errors} />;
      case 4:
        return <PatientDetails formData={formData} handleChange={handleChange} errors={errors} />;
      case 5:
        return (
          <WorkerDetails
            formData={formData}
            handleChange={handleChange}
            addWorker={addWorker}
            removeWorker={removeWorker}
            errors={errors}
          />
        );
      case 6:
        return (
          <PaymentDetails
            formData={formData}
            handleChange={handleChange}
            addPayment={addPayment}
            removePayment={removePayment}
            errors={errors}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="container mt-4">
      <div className="form-card">
        <div className="card-header">
          <h3 className="text-center mb-0">Client Information Form</h3>
        </div>

        <div className="px-4 pt-3">
          <p className="text-center">
            Step {step} of {totalSteps}
          </p>
          <div className="progress mb-3">
            <div
              className="progress-bar bg-primary "
              role="progressbar"
              style={{ width: `${(step / totalSteps) * 100}%` }}
            />
          </div>
          <h4 className="text-center mb-3">{stepTitles[step]}</h4>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="card-body">{renderStep()}</div>

          <div className="card-footer d-flex justify-content-end w-100">
            {step > 1 && (
              <button type="button" className="btn btn-secondary" onClick={prevStep}>
                Previous
              </button>
            )}
            {step < totalSteps ? (
              <button type="button" className="btn btn-primary" onClick={nextStep}>
                Next
              </button>
            ) : (
              <button type="submit" className="btn btn-success">
                Submit
              </button>
            )}
          </div>
        </form>
      </div>

      {showModal && (
        <div className="modal fade show" style={{ display: "block", background: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Thank you!</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowModal(false)}
                  aria-label="Close"
                />
              </div>
              <div className="modal-body">
                <p>Your form has been submitted successfully.</p>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-primary" onClick={() => setShowModal(false)}>
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}