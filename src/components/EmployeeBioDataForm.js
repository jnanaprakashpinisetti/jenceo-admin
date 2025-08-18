import React, { useState } from "react";
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

import firebaseDB from "../firebase";

const MultiStepForm = () => {
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState({});

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
    secondarySkill: "",
    workExperience: [],
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
    basicSalary:"",
    pageNo:"",
    aboutEmployeee:"",
    employeePhoto: null,
  });

  // Validation functions
  const validateMobileNumber = (mobile) => /^\d{10}$/.test(mobile);

  const isOver18 = (dateString) => {
    if (!dateString) return false;
    const today = new Date();
    const birthDate = new Date(dateString);
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      return age - 1 >= 18;
    }
    return age >= 18;
  };

  const validatePincode = (pincode) => /^\d{6}$/.test(pincode);

  const validateImage = (file) => {
    if (!file) return "Employee photo is required";

    const validTypes = ["image/jpeg", "image/png", "image/gif"];
    if (!validTypes.includes(file.type)) {
      return "Only JPG, PNG, or GIF images are allowed";
    }

    if (file.size > 200 * 1024) {
      return "Image size must be less than 200KB";
    }

    return true;
  };

  const validateStep = (step) => {
    const newErrors = {};

    switch (step) {
      case 1:
        if (formData.idNo.trim().length<7) newErrors.idNo = "Enter Valid ID No";
        if (!formData.idNo.trim()) newErrors.idNo = "Enter ID No";
        if (!formData.date) newErrors.date = "Enter Date of Joining";
        if (!formData.firstName.trim())
          newErrors.firstName = "First Name is required";
        if (!formData.lastName.trim())
          newErrors.lastName = "Last Name is required";
        if (!formData.gender) newErrors.gender = "Gender is required";
        if (!formData.dateOfBirth) {
          newErrors.dateOfBirth = "Date of Birth is required";
        } else if (!isOver18(formData.dateOfBirth)) {
          newErrors.dateOfBirth = "Must be at least 18 years old";
        }
        if (formData.years < 18) newErrors.years = "Above 18 only";
        if (formData.years > 50) newErrors.years = "Below 50 only";
        if (!formData.years) newErrors.years = "Years are required";
        if (!formData.mobileNo1) {
          newErrors.mobileNo1 = "Mobile No. 1 is required";
        } else if (!validateMobileNumber(formData.mobileNo1)) {
          newErrors.mobileNo1 = "Mobile number must be 10 digits";
        }
        if (formData.mobileNo2 && !validateMobileNumber(formData.mobileNo2)) {
          newErrors.mobileNo2 = "Mobile number must be 10 digits";
        }
        if (formData.aadharNo.length < 12)
          newErrors.aadharNo = "Must be 12 digits";
        if (!formData.aadharNo) newErrors.aadharNo = "Aadhar No is required";
        break;

      case 2:
        if (!formData.permanentAddress.trim())
          newErrors.permanentAddress = "Address is required";
        if (!formData.permanentStreet.trim())
          newErrors.permanentStreet = "Street is required";
        if (!formData.permanentVillage.trim())
          newErrors.permanentVillage = "Village/Town is required";
        if (!formData.permanentMandal.trim())
          newErrors.permanentMandal = "Mandal is required";
        if (!formData.permanentDistrict.trim())
          newErrors.permanentDistrict = "District is required";
        if (!formData.permanentState.trim())
          newErrors.permanentState = "State is required";
        if (!formData.permanentPincode) {
          newErrors.permanentPincode = "Pin Code is required";
        } else if (!validatePincode(formData.permanentPincode)) {
          newErrors.permanentPincode = "Pin code must be 6 digits";
        }
        break;

      case 3:
        if (!formData.presentAddress.trim())
          newErrors.presentAddress = "Address is required";
        if (!formData.presentStreet.trim())
          newErrors.presentStreet = "Street is required";
        if (!formData.presentVillage.trim())
          newErrors.presentVillage = "Village/Town is required";
        if (!formData.presentMandal.trim())
          newErrors.presentMandal = "Mandal is required";
        if (!formData.presentDistrict.trim())
          newErrors.presentDistrict = "District is required";
        if (!formData.presentState.trim())
          newErrors.presentState = "State is required";
        if (!formData.presentPincode) {
          newErrors.presentPincode = "Pin Code is required";
        } else if (!validatePincode(formData.presentPincode)) {
          newErrors.presentPincode = "Pin code must be 6 digits";
        }
        break;

      case 4:
        if (!formData.maritalStatus)
          newErrors.maritalStatus = "Marital Status is required";
        if (!formData.religion) newErrors.religion = "Religion is required";
        if (!formData.cast) newErrors.cast = "Cast is required";
        break;

      case 5:
        if (!formData.qualification)
          newErrors.qualification = "Qualification is required";
        if (!formData.primarySkill)
          newErrors.primarySkill = "Primary Skill is required";
        if (formData.workExperience.length === 0)
          newErrors.workExperience = "At least one work experience is required";
        if (!formData.motherTongue)
          newErrors.motherTongue = "Mother Tongue is required";
        if (!formData.languages) newErrors.languages = "Languages are required";
        break;

      case 7:
        if (!formData.emergencyContact1.name)
          newErrors.emergencyContact1 = {
            ...newErrors.emergencyContact1,
            name: "Name is required",
          };
        if (!formData.emergencyContact1.relation)
          newErrors.emergencyContact1 = {
            ...newErrors.emergencyContact1,
            relation: "Relation is required",
          };
        if (!formData.emergencyContact1.mobile1) {
          newErrors.emergencyContact1 = {
            ...newErrors.emergencyContact1,
            mobile1: "Mobile No. is required",
          };
        } else if (!validateMobileNumber(formData.emergencyContact1.mobile1)) {
          newErrors.emergencyContact1 = {
            ...newErrors.emergencyContact1,
            mobile1: "Mobile number must be 10 digits",
          };
        }
        if (
          formData.emergencyContact1.mobile2 &&
          !validateMobileNumber(formData.emergencyContact1.mobile2)
        ) {
          newErrors.emergencyContact1 = {
            ...newErrors.emergencyContact1,
            mobile2: "Mobile number must be 10 digits",
          };
        }
        break;

      case 8:
        if (!formData.emergencyContact2.name)
          newErrors.emergencyContact2 = {
            ...newErrors.emergencyContact2,
            name: "Name is required",
          };
        if (!formData.emergencyContact2.relation)
          newErrors.emergencyContact2 = {
            ...newErrors.emergencyContact2,
            relation: "Relation is required",
          };
        if (!formData.emergencyContact2.mobile1) {
          newErrors.emergencyContact2 = {
            ...newErrors.emergencyContact2,
            mobile1: "Mobile No. is required",
          };
        } else if (!validateMobileNumber(formData.emergencyContact2.mobile1)) {
          newErrors.emergencyContact2 = {
            ...newErrors.emergencyContact2,
            mobile1: "Mobile number must be 10 digits",
          };
        }
        if (
          formData.emergencyContact2.mobile2 &&
          !validateMobileNumber(formData.emergencyContact2.mobile2)
        ) {
          newErrors.emergencyContact2 = {
            ...newErrors.emergencyContact2,
            mobile2: "Mobile number must be 10 digits",
          };
        }
        break;

      case 10:
        if (formData.basicSalary.length < 5)
          newErrors.basicSalary = "Check the Salary";
        if (!formData.basicSalary) newErrors.basicSalary = "Enter valid Salary";
        if (!formData.pageNo) newErrors.pageNo = "Enter Page No";
        const imageValidation = validateImage(formData.employeePhoto);
        if (imageValidation !== true) {
          newErrors.employeePhoto = imageValidation;
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    // Mobile number validation
    if (
      name === "mobileNo1" ||
      name === "mobileNo2" ||
      name.includes("mobile1") ||
      name.includes("mobile2")
    ) {
      // Only allow numbers and limit to 10 digits
      if (value && !/^\d*$/.test(value)) return;
      if (value.length > 10) return;
    }

    // Pincode validation
    if (name.includes("Pincode")) {
      if (value && !/^\d*$/.test(value)) return;
      if (value.length > 6) return;
    }

    if (type === "checkbox") {
      if (name === "workExperience" || name === "healthIssues") {
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
          ...prev[contact],
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

    // Common required field validation
    if (!value.trim()) {
      errorMessage = `${name
        .replace(/([A-Z])/g, " $1")
        .replace(/^./, (str) => str.toUpperCase())} is required`;
      isValid = false;
    } else {
      // Field-specific validation
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
        // Handle nested fields (emergency contacts)
        if (name.includes(".")) {
          const [parent, child] = name.split(".");
          newErrors[parent] = { ...newErrors[parent], [child]: errorMessage };
        } else {
          newErrors[name] = errorMessage;
        }
      } else {
        // Remove error if field is valid
        if (name.includes(".")) {
          const [parent, child] = name.split(".");
          if (newErrors[parent]) {
            delete newErrors[parent][child];
            if (Object.keys(newErrors[parent]).length === 0) {
              delete newErrors[parent];
            }
          }
        } else {
          delete newErrors[name];
        }
      }
      return newErrors;
    });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    const validation = validateImage(file);

    if (validation === true) {
      setFormData((prev) => ({
        ...prev,
        employeePhoto: file,
      }));
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.employeePhoto;
        return newErrors;
      });
    } else {
      setErrors((prev) => ({
        ...prev,
        employeePhoto: validation,
      }));
    }
  };

  const nextStep = () => {
    if (validateStep(step)) {
      setStep(step + 1);
    }
  };

  const prevStep = () => {
    setStep(step - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (validateStep(step)) {
      console.log("Form submitted:", formData);
      alert("Form submitted successfully!");
      // Here you would add your Firebase submission logic later
      await firebaseDB.child("EmployeeBioData").push(formData, (err) => {
        if (err) {
          alert("Error");
        }
      });
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <BasicInformation
            formData={formData}
            errors={errors}
            handleChange={handleChange}
            handleBlur={handleBlur}
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
            handleBlur={handleBlur}
            nextStep={nextStep}
            prevStep={prevStep}
          />
        );
      case 6:
        return (
          <HealthDetails
            formData={formData}
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
            handleChange={handleChange}
            handleBlur={handleBlur}
            handleFileChange={handleFileChange}
            prevStep={prevStep}
            handleSubmit={handleSubmit}
            errors={errors}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="container">
      <div className="form-card shadow">
        <div className="form-card-header mb-4">
          <h3 className="text-center">Employee Registration Form</h3>
        </div>
        <div className="form-card-body">
          <div className="progress mb-4">
            <div
              className="progress-bar progress-bar-animated"
              role="progressbar"
              style={{ width: `${step * 10}%` }}
              aria-valuenow={step * 10}
              aria-valuemin="0"
              aria-valuemax="100"
            >
              {step} of 10
            </div>
          </div>

          <form onSubmit={handleSubmit}>{renderStep()}</form>
        </div>
      </div>
    </div>
  );
};

export default MultiStepForm;
