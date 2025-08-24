import React, { useState } from "react";

import { storageRef, uploadFile, getDownloadURL } from "../firebase";
import firebaseDB from "../firebase";

import BasicInformation from "../components/employeeBioData/BasicInformation";
import PermanentAddress from "../components/employeeBioData/PermanentAddress";
import PresentAddress from "../components/employeeBioData/PresentAddress";
import PersonalInformation from "../components/employeeBioData/PersonalInformation";
import QualificationSkills from "../components/employeeBioData/QualificationSkills";
import HealthDetails from "../components/employeeBioData/HealthDetails";
import EmergencyContact1 from "../components/employeeBioData/EmergencyContact1";
import EmergencyContact2 from "../components/employeeBioData/EmergencyContact2";
import EmergencyContact3 from "../components/employeeBioData/EmergencyContact3";
import BankDetails from "../components/employeeBioData/BankDetails";

/* ----------------------------- Lightweight Success Modal ----------------------------- */
const SuccessModal = ({ open, onClose, info }) => {
  if (!open) return null;
  const { idNo, name, recordId } = info || {};
  return (
    <div
      className="fixed-top d-flex align-items-center justify-content-center"
      style={{ inset: 0, background: "rgba(0,0,0,.6)", zIndex: 1060 }}
      role="dialog"
      aria-modal="true"
    >
      <div className="alert-card shadow-lg" style={{ width: "min(520px, 92vw)" }}>
        <div className="card-header bg-success text-white">
          <strong>Employee Saved</strong>
        </div>
        <div className="card-body">
          <div className="alert mb-3">
            <div className="d-flex align-items-center gap-2">
              <span className="bi bi-check2-circle" aria-hidden="true" />
              <div>
                <div className="fw-bold">Form submitted successfully!</div>
                <small className="text-muted">The record has been created in the database.</small>
              </div>
            </div>
          </div>

          <div className="row g-2">
            <div className="col-12">
              <div className="d-flex justify-content-between">
                <span className="text-muted">Employee ID (idNo)</span>
                <strong>{idNo || "N/A"}</strong>
              </div>
            </div>
            <div className="col-12">
              <div className="d-flex justify-content-between">
                <span className="text-muted">Employee Name</span>
                <strong>{name || "N/A"}</strong>
              </div>
            </div>
            <div className="col-12">
              <div className="d-flex justify-content-between">
                <span className="text-muted">Database Record ID</span>
                <code className="small">{recordId || "N/A"}</code>
              </div>
            </div>
          </div>
        </div>
        <div className="card-footer d-flex justify-content-end">
          <button className="btn btn-success" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
};
/* -------------------------------------------------------------------- */

const MultiStepForm = () => {
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Success modal state
  const [successOpen, setSuccessOpen] = useState(false);
  const [successInfo, setSuccessInfo] = useState({ idNo: "", name: "", recordId: "" });

  const [formData, setFormData] = useState({
    // Basic Information
    idNo: "",
    date: "",
    firstName: "",
    lastName: "",
    gender: "",
    dateOfBirth: "",
    years: "",
    co: "",
    mobileNo1: "",
    mobileNo2: "",
    aadharNo: "",
    localId: "",
    // Permanent Address
    permanentAddress: "",
    permanentStreet: "",
    permanentLandmark: "",
    permanentVillage: "",
    permanentMandal: "",
    permanentDistrict: "",
    permanentState: "",
    permanentPincode: "",
    // Present Address
    presentAddress: "",
    presentStreet: "",
    presentLandmark: "",
    presentVillage: "",
    presentMandal: "",
    presentDistrict: "",
    presentState: "",
    presentPincode: "",
    // Personal Information
    maritalStatus: "",
    dateOfMarriage: "",
    marriageYears: "",
    childName1: "",
    childName2: "",
    religion: "",
    cast: "",
    // Qualification & Skills
    qualification: "",
    schoolCollege: "",
    primarySkill: "",
    workExperince: "",
    workingSkills: [],
    motherTongue: "",
    languages: "",
    // Health Details
    healthIssues: [],
    otherIssues: "",
    // Emergency Contacts
    emergencyContact1: {
      name: "",
      relation: "",
      address: "",
      village: "",
      mandal: "",
      state: "",
      mobile1: "",
      mobile2: "",
    },
    emergencyContact2: {
      name: "",
      relation: "",
      address: "",
      village: "",
      mandal: "",
      state: "",
      mobile1: "",
      mobile2: "",
    },
    emergencyContact3: {
      name: "",
      relation: "",
      address: "",
      village: "",
      mandal: "",
      state: "",
      mobile1: "",
      mobile2: "",
    },
    // Bank Details
    accountNo: "",
    bankName: "",
    branchName: "",
    ifscCode: "",
    phonePayNo: "",
    phonePayName: "",
    googlePayNo: "",
    googlePayName: "",
    basicSalary: "",
    pageNo: "",
    aboutEmployee: "",
    // Photo
    employeePhoto: null,        // final URL (after upload)
    employeePhotoFile: null,    // File object (before upload)
  });

  // ------------ Validation helpers ------------
  const validateMobileNumber = (mobile) => /^\d{10}$/.test(mobile);

  const isOver18 = (dateString) => {
    if (!dateString) return false;
    const today = new Date();
    const birthDate = new Date(dateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age -= 1;
    }
    return age >= 18;
  };

  const validatePincode = (pincode) => /^\d{6}$/.test(pincode);

  const validateImage = (file) => {
    if (!file) return "Employee photo is required";
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif"];
    if (!validTypes.includes(file.type)) {
      return "Only JPG, PNG, or GIF images are allowed.";
    }
    if (file.size > 200 * 1024) {
      return "Image size must be less than 200KB.";
    }
    return true;
  };

  const validateStep = (s) => {
    const newErrors = {};

    switch (s) {
      case 1: {
        if (!formData.idNo.trim()) newErrors.idNo = "Enter ID No";
        else if (formData.idNo.trim().length < 7) newErrors.idNo = "Enter Valid ID No";

        if (!formData.date) newErrors.date = "Enter Date of Joining";
        if (!formData.firstName.trim()) newErrors.firstName = "First Name is required";
        if (!formData.lastName.trim()) newErrors.lastName = "Last Name is required";
        if (!formData.gender) newErrors.gender = "Gender is required";

        if (!formData.dateOfBirth) newErrors.dateOfBirth = "Date of Birth is required";
        else if (!isOver18(formData.dateOfBirth)) newErrors.dateOfBirth = "Must be at least 18 years old";

        if (!formData.years) newErrors.years = "Years are required";
        else if (Number(formData.years) < 18) newErrors.years = "Above 18 only";
        else if (Number(formData.years) > 50) newErrors.years = "Below 50 only";

        if (!formData.mobileNo1) newErrors.mobileNo1 = "Mobile No. 1 is required";
        else if (!validateMobileNumber(formData.mobileNo1)) newErrors.mobileNo1 = "Mobile number must be 10 digits";
        if (formData.mobileNo2 && !validateMobileNumber(formData.mobileNo2))
          newErrors.mobileNo2 = "Mobile number must be 10 digits";

        // Photo validation (Step 1)
        const imageValidation = validateImage(formData.employeePhotoFile);
        if (imageValidation !== true) newErrors.employeePhoto = imageValidation;
        break;
      }

      case 2:
        if (!formData.permanentAddress.trim()) newErrors.permanentAddress = "Address is required";
        if (!formData.permanentStreet.trim()) newErrors.permanentStreet = "Street is required";
        if (!formData.permanentVillage.trim()) newErrors.permanentVillage = "Village/Town is required";
        if (!formData.permanentMandal.trim()) newErrors.permanentMandal = "Mandal is required";
        if (!formData.permanentDistrict.trim()) newErrors.permanentDistrict = "District is required";
        if (!formData.permanentState.trim()) newErrors.permanentState = "State is required";
        if (!formData.permanentPincode) newErrors.permanentPincode = "Pin Code is required";
        else if (!validatePincode(formData.permanentPincode)) newErrors.permanentPincode = "Pin code must be 6 digits";
        break;

      case 3:
        if (!formData.presentAddress.trim()) newErrors.presentAddress = "Address is required";
        if (!formData.presentStreet.trim()) newErrors.presentStreet = "Street is required";
        if (!formData.presentVillage.trim()) newErrors.presentVillage = "Village/Town is required";
        if (!formData.presentMandal.trim()) newErrors.presentMandal = "Mandal is required";
        if (!formData.presentDistrict.trim()) newErrors.presentDistrict = "District is required";
        if (!formData.presentState.trim()) newErrors.presentState = "State is required";
        if (!formData.presentPincode) newErrors.presentPincode = "Pin Code is required";
        else if (!validatePincode(formData.presentPincode)) newErrors.presentPincode = "Pin code must be 6 digits";
        break;

      case 4:
        if (!formData.maritalStatus) newErrors.maritalStatus = "Marital Status is required";
        if (!formData.religion) newErrors.religion = "Religion is required";
        if (!formData.cast) newErrors.cast = "Cast is required";
        break;

      case 5:
        if (!formData.qualification) newErrors.qualification = "Qualification is required";
        if (!formData.primarySkill) newErrors.primarySkill = "Primary Skill is required";
        if (formData.workingSkills.length === 0) newErrors.workingSkills = "At least one work experience is required";
        if (!formData.motherTongue) newErrors.motherTongue = "Mother Tongue is required";
        if (!formData.languages) newErrors.languages = "Languages are required";
        break;

      case 7: {
        const ec1 = {};
        if (!formData.emergencyContact1.name) ec1.name = "Name is required";
        if (!formData.emergencyContact1.relation) ec1.relation = "Relation is required";
        if (!formData.emergencyContact1.mobile1) ec1.mobile1 = "Mobile No. is required";
        else if (!validateMobileNumber(formData.emergencyContact1.mobile1)) ec1.mobile1 = "Mobile number must be 10 digits";
        if (formData.emergencyContact1.mobile2 && !validateMobileNumber(formData.emergencyContact1.mobile2))
          ec1.mobile2 = "Mobile number must be 10 digits";
        if (Object.keys(ec1).length) newErrors.emergencyContact1 = ec1;
        break;
      }

      case 8: {
        const ec2 = {};
        if (!formData.emergencyContact2.name) ec2.name = "Name is required";
        if (!formData.emergencyContact2.relation) ec2.relation = "Relation is required";
        if (!formData.emergencyContact2.mobile1) ec2.mobile1 = "Mobile No. is required";
        else if (!validateMobileNumber(formData.emergencyContact2.mobile1)) ec2.mobile1 = "Mobile number must be 10 digits";
        if (formData.emergencyContact2.mobile2 && !validateMobileNumber(formData.emergencyContact2.mobile2))
          ec2.mobile2 = "Mobile number must be 10 digits";
        if (Object.keys(ec2).length) newErrors.emergencyContact2 = ec2;
        break;
      }

      case 10: {
        if (!formData.basicSalary) newErrors.basicSalary = "Enter valid Salary";
        else if (String(formData.basicSalary).length < 5) newErrors.basicSalary = "Check the Salary";
        if (!formData.pageNo) newErrors.pageNo = "Enter Page No";
        break;
      }

      default:
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ------------ Handlers ------------
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (
      name === "mobileNo1" ||
      name === "mobileNo2" ||
      name.includes("mobile1") ||
      name.includes("mobile2")
    ) {
      if (value && !/^\d*$/.test(value)) return;
      if (value.length > 10) return;
    }

    if (name.includes("Pincode")) {
      if (value && !/^\d*$/.test(value)) return;
      if (value.length > 6) return;
    }

    if (type === "checkbox") {
      if (name === "workingSkills" || name === "healthIssues") {
        setFormData((prev) => ({
          ...prev,
          [name]: checked
            ? [...prev[name], value]
            : prev[name].filter((item) => item !== value),
        }));
      }
    } else if (name.includes("emergencyContact")) {
      const [contact, field] = name.split(".");
      setFormData((prev) => ({
        ...prev,
        [contact]: {
          ...(prev[contact] || {}),
          [field]: value,
        },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    let isValid = true;
    let errorMessage = "";

    if (!value.trim()) {
      errorMessage = `${name.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())} is required`;
      isValid = false;
    } else {
      switch (name) {
        case "mobileNo1":
        case "mobileNo2":
        case "emergencyContact1.mobile1":
        case "emergencyContact1.mobile2":
        case "emergencyContact2.mobile1":
        case "emergencyContact2.mobile2":
          isValid = validateMobileNumber(value);
          errorMessage = "Mobile number must be 10 digits";
          break;
        case "permanentPincode":
        case "presentPincode":
          isValid = validatePincode(value);
          errorMessage = "Pin code must be 6 digits";
          break;
        case "dateOfBirth":
          isValid = isOver18(value);
          errorMessage = "Must be at least 18 years old";
          break;
        default:
          isValid = true;
      }
    }

    setErrors((prev) => {
      const newErrors = { ...prev };
      if (!isValid) {
        if (name.includes(".")) {
          const [parent, child] = name.split(".");
          newErrors[parent] = { ...(newErrors[parent] || {}), [child]: errorMessage };
        } else {
          newErrors[name] = errorMessage;
        }
      } else {
        if (name.includes(".")) {
          const [parent, child] = name.split(".");
          if (newErrors[parent]) {
            delete newErrors[parent][child];
            if (Object.keys(newErrors[parent]).length === 0) delete newErrors[parent];
          }
        } else {
          delete newErrors[name];
        }
      }
      return newErrors;
    });
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    const validation = validateImage(file);

    if (validation === true) {
      setFormData((prev) => ({
        ...prev,
        employeePhotoFile: file,
      }));
      setErrors((prev) => {
        const ne = { ...prev };
        delete ne.employeePhoto;
        return ne;
      });
    } else {
      setErrors((prev) => ({ ...prev, employeePhoto: validation }));
    }
  };

  const nextStep = () => {
    if (validateStep(step)) setStep((s) => s + 1);
  };

  const prevStep = () => setStep((s) => s - 1);

  const resetForm = () => {
    setFormData({
      idNo: "",
      date: "",
      firstName: "",
      lastName: "",
      gender: "",
      dateOfBirth: "",
      years: "",
      co: "",
      mobileNo1: "",
      mobileNo2: "",
      aadharNo: "",
      localId: "",
      permanentAddress: "",
      permanentStreet: "",
      permanentLandmark: "",
      permanentVillage: "",
      permanentMandal: "",
      permanentDistrict: "",
      permanentState: "",
      permanentPincode: "",
      presentAddress: "",
      presentStreet: "",
      presentLandmark: "",
      presentVillage: "",
      presentMandal: "",
      presentDistrict: "",
      presentState: "",
      presentPincode: "",
      maritalStatus: "",
      dateOfMarriage: "",
      marriageYears: "",
      childName1: "",
      childName2: "",
      religion: "",
      cast: "",
      qualification: "",
      schoolCollege: "",
      primarySkill: "",
      workExperince: "",
      workingSkills: [],
      motherTongue: "",
      languages: "",
      healthIssues: [],
      otherIssues: "",
      emergencyContact1: {
        name: "",
        relation: "",
        address: "",
        village: "",
        mandal: "",
        state: "",
        mobile1: "",
        mobile2: "",
      },
      emergencyContact2: {
        name: "",
        relation: "",
        address: "",
        village: "",
        mandal: "",
        state: "",
        mobile1: "",
        mobile2: "",
      },
      emergencyContact3: {
        name: "",
        relation: "",
        address: "",
        village: "",
        mandal: "",
        state: "",
        mobile1: "",
        mobile2: "",
      },
      accountNo: "",
      bankName: "",
      branchName: "",
      ifscCode: "",
      phonePayNo: "",
      phonePayName: "",
      googlePayNo: "",
      googlePayName: "",
      basicSalary: "",
      pageNo: "",
      aboutEmployee: "",
      employeePhoto: null,
      employeePhotoFile: null,
    });
    setErrors({});
    setStep(1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep(step)) return;

    setIsSubmitting(true);
    try {
      // Upload photo if provided
      let photoURL = null;
      if (formData.employeePhotoFile) {
        const ext = formData.employeePhotoFile.name.split(".").pop();
        const fileName = `employee-photos/${formData.idNo}-${Date.now()}.${ext}`;
        const fileRef = storageRef.child(fileName);
        const snapshot = await uploadFile(fileRef, formData.employeePhotoFile);
        photoURL = await getDownloadURL(snapshot.ref);
      }

      const submitData = {
        ...formData,
        employeePhoto: photoURL,
      };
      delete submitData.employeePhotoFile; // don't store File in DB

      // Push to DB — capture the generated key
      const listRef = firebaseDB.child("EmployeeBioData");
      const newRef = listRef.push();
      await newRef.set(submitData);

      const recordId = newRef.key;
      const name = `${formData.firstName || ""} ${formData.lastName || ""}`.trim();

      // Open success modal with details
      setSuccessInfo({ idNo: formData.idNo, name, recordId });
      setSuccessOpen(true);

      // Reset the form
      resetForm();
    } catch (error) {
      alert("Error submitting form: " + error.message);
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ------------ Step renderer ------------
  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <BasicInformation
            formData={formData}
            errors={errors}
            handleChange={handleChange}
            handleBlur={handleBlur}
            handleFileChange={handleFileChange}
            nextStep={nextStep}
          />
        );
      case 2:
        return (
          <PermanentAddress
            formData={formData}
            errors={errors}
            handleChange={handleChange}
            handleBlur={handleBlur}
            nextStep={nextStep}
            prevStep={prevStep}
          />
        );
      case 3:
        return (
          <PresentAddress
            formData={formData}
            errors={errors}
            handleChange={handleChange}
            handleBlur={handleBlur}
            nextStep={nextStep}
            prevStep={prevStep}
          />
        );
      case 4:
        return (
          <PersonalInformation
            formData={formData}
            errors={errors}
            handleChange={handleChange}
            handleBlur={handleBlur}
            nextStep={nextStep}
            prevStep={prevStep}
          />
        );
      case 5:
        return (
          <QualificationSkills
            formData={formData}
            errors={errors}
            handleChange={handleChange}
            nextStep={nextStep}
            prevStep={prevStep}
          />
        );
      case 6:
        return (
          <HealthDetails
            formData={formData}
            errors={errors}
            handleChange={handleChange}
            nextStep={nextStep}
            prevStep={prevStep}
          />
        );
      case 7:
        return (
          <EmergencyContact1
            formData={formData}
            errors={errors}
            handleChange={handleChange}
            handleBlur={handleBlur}
            nextStep={nextStep}
            prevStep={prevStep}
          />
        );
      case 8:
        return (
          <EmergencyContact2
            formData={formData}
            errors={errors}
            handleChange={handleChange}
            handleBlur={handleBlur}
            nextStep={nextStep}
            prevStep={prevStep}
          />
        );
      case 9:
        return (
          <EmergencyContact3
            formData={formData}
            errors={errors}
            handleChange={handleChange}
            handleBlur={handleBlur}
            nextStep={nextStep}
            prevStep={prevStep}
          />
        );
      case 10:
        return (
          <BankDetails
            formData={formData}
            errors={errors}
            handleChange={handleChange}
            handleBlur={handleBlur}
            prevStep={prevStep}
            handleSubmit={handleSubmit}
            isSubmitting={isSubmitting}
          />
        );
      default:
        return null;
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit}>{renderStep()}</form>

      {/* Success modal */}
      <SuccessModal
        open={successOpen}
        info={successInfo}
        onClose={() => setSuccessOpen(false)}
      />
    </>
  );
};

export default MultiStepForm;
