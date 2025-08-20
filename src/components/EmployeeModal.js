import React, { useState, useEffect } from 'react';

const EmployeeModal = ({ employee, isOpen, onClose, onSave, onDelete, isEditMode }) => {
    const [formData, setFormData] = useState({});
    const [status, setStatus] = useState('On Duty');

    useEffect(() => {
        if (employee) {
            setFormData(employee);
            setStatus(employee.status || 'On Duty');
        }
    }, [employee]);

    if (!isOpen) return null;

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleNestedInputChange = (parent, field, value) => {
        setFormData(prev => ({
            ...prev,
            [parent]: {
                ...prev[parent],
                [field]: value
            }
        }));
    };

    const handleArrayChange = (field, value, index) => {
        const currentArray = formData[field] || [];
        const newArray = [...currentArray];

        if (value && !newArray.includes(value)) {
            if (index !== undefined) {
                newArray[index] = value;
            } else {
                newArray.push(value);
            }
        }

        setFormData(prev => ({ ...prev, [field]: newArray }));
    };

    const removeArrayItem = (field, index) => {
        const currentArray = formData[field] || [];
        const newArray = currentArray.filter((_, i) => i !== index);
        setFormData(prev => ({ ...prev, [field]: newArray }));
    };

    const handleSave = () => {
        onSave({ ...formData, status });
    };

    const handleDelete = () => {
        if (window.confirm('Are you sure you want to delete this employee? This action cannot be undone.')) {
            onDelete(formData.id);
        }
    };

    const renderInputField = (label, name, value, type = 'text', placeholder = '') => (
        <div className="bio-info">
            <label className="form-label"><strong>{label}</strong></label>
            <input
                type={type}
                className="form-control form-control-sm"
                name={name}
                value={value || ''}
                onChange={handleInputChange}
                disabled={!isEditMode}
                placeholder={placeholder}
            />
        </div>
    );

    const renderSelectField = (label, name, value, options) => (
        <div className="bio-info">
            <label className="form-label"><strong>{label}</strong></label>
            <select
                className="form-select form-select-sm"
                name={name}
                value={value || ''}
                onChange={handleInputChange}
                disabled={!isEditMode}
            >
                <option value="">Select {label}</option>
                {options.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                ))}
            </select>
        </div>
    );

    const renderArrayField = (label, field, placeholder = 'Add item') => (
        <div className="bio-info">
            <label className="form-label"><strong>{label}</strong></label>
            <div className="d-flex">
                <input
                    type="text"
                    className="form-control form-control-sm me-2"
                    placeholder={placeholder}
                    onKeyPress={(e) => {
                        if (e.key === 'Enter' && e.target.value) {
                            handleArrayChange(field, e.target.value);
                            e.target.value = '';
                            e.preventDefault();
                        }
                    }}
                    disabled={!isEditMode}
                />
            </div>
            <div className="d-flex flex-wrap gap-1">
                {(formData[field] || []).map((item, index) => (
                    <span key={index} className="badge bg-secondary d-flex align-items-center">
                        {item}
                        {isEditMode && (
                            <button
                                type="button"
                                className="btn-close btn-close-white ms-1"
                                style={{ fontSize: '0.6rem' }}
                                onClick={() => removeArrayItem(field, index)}
                            />
                        )}
                    </span>
                ))}
            </div>
        </div>
    );

    const renderEmergencyContact = (contactKey, title) => {
        const contact = formData[contactKey] || {};

        return (
            <div className="modal-card">
                <div className="modal-card-header bg-light py-1">
                    <strong>{title}</strong>
                </div>
                <div className="modal-card-body py-2">
                    <div className="row">
                        <div className="col-md-4">
                            {renderInputField("Name", `${contactKey}.name`, contact.name)}
                            {renderInputField("Village", `${contactKey}.village`, contact.village)}
                            {renderInputField("Mobile 1", `${contactKey}.mobile1`, contact.mobile1)}
                        </div>
                        <div className="col-md-4">
                            {renderInputField("Relation", `${contactKey}.relation`, contact.relation)}
                            {renderInputField("Mandal / Dist", `${contactKey}.mandal`, contact.mandal)}
                            {renderInputField("Mobile 2", `${contactKey}.mobile2`, contact.mobile2)}
                        </div>
                        <div className="col-md-4">
                            {renderInputField("D.No", `${contactKey}.address`, contact.address)}
                            {renderInputField("State", `${contactKey}.state`, contact.state)}

                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // Determine modal class based on mode
    const modalClass = isEditMode ? 'editEmployee' : 'viewEmployee';

    return (
        <div className={`modal fade show ${modalClass}`} style={{ display: 'block', backgroundColor: 'rgba(0, 0, 0, 0.81)' }}>
            <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
                <div className="modal-content" >
                    <div className="modal-header bg-primary text-white">
                        <h3 className="modal-title">
                            {isEditMode ? 'Edit Employee - ' : ''}
                            {formData.idNo || formData.employeeId || 'N/A'} - {formData.firstName || formData.firstName} {formData.lastName || formData.lastName}
                        </h3>
                        <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
                    </div>
                    <div className="modal-body">

                        {/* Status Dropdown */}
                        <div className="row mb-3 status">
                            <div className="col-md-4">
                                <label className="form-label"><strong>Status</strong></label>
                                <select
                                    className="form-select"
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value)}
                                    disabled={!isEditMode}
                                >
                                    <option value="On Duty">On Duty</option>
                                    <option value="Off Duty">Off Duty</option>
                                    <option value="Resigned">Resigned</option>
                                    <option value="Absconder">Absconder</option>
                                    <option value="Terminated">Terminated</option>
                                </select>
                            </div>

                        </div>

                        {/* Basic Information */}
                        <div className="modal-card mb-3">
                            <div className="modal-card-header bg-secondary text-white">
                                <h4 className="mb-0">Basic Information</h4>
                            </div>
                            <div className="modal-card-body">
                                <div className="row">
                                    <div className="col-md-4">
                                        {renderInputField("ID No", "idNo", formData.idNo || formData.employeeId)}
                                        {renderSelectField("Gender", "gender", formData.gender, [
                                            { value: "Male", label: "Male" },
                                            { value: "Female", label: "Female" },
                                            { value: "Other", label: "Other" }
                                        ])}

                                        {renderInputField("C/o", "co", formData.co)}
                                        {renderInputField("Date of Joining", "date", formData.date || formData.dateOfJoining, "date")}


                                    </div>
                                    <div className="col-md-4">
                                        {renderInputField("First Name", "firstName", formData.firstName)}
                                        {renderInputField("Date of Birth", "dateOfBirth", formData.dateOfBirth, "date")}
                                        {renderInputField("Aadhar No", "aadharNo", formData.aadharNo)}
                                        {renderInputField("Mobile 1", "mobileNo1", formData.mobileNo1, "tel")}




                                    </div>

                                    <div className="col-md-4">
                                        {renderInputField("Last Name", "lastName", formData.lastName)}
                                        {renderInputField("Age", "years", formData.years, "number")}
                                        {renderInputField("Local ID", "localId", formData.localId)}
                                        {renderInputField("Mobile 2", "mobileNo2", formData.mobileNo2, "tel")}
                                    </div>

                                </div>
                            </div>
                        </div>

                        {/* Permanent Address */}
                        <div className="modal-card mb-3">
                            <div className="modal-card-header bg-secondary text-white">
                                <h4 className="mb-0">Permanent Address</h4>
                            </div>
                            <div className="modal-card-body">
                                <div className="row">
                                    <div className="col-md-4">
                                        {renderInputField("D.No", "permanentAddress", formData.permanentAddress)}
                                        {renderInputField("Village", "permanentVillage", formData.permanentVillage)}
                                        {renderInputField("State", "permanentState", formData.permanentState)}
                                    </div>
                                    <div className="col-md-4">
                                        {renderInputField("Street", "permanentStreet", formData.permanentStreet)}
                                        {renderInputField("Mandal", "permanentMandal", formData.permanentMandal)}
                                        {renderInputField("Pincode", "permanentPincode", formData.permanentPincode)}
                                    </div>

                                    <div className="col-md-4">
                                        {renderInputField("Landmark", "permanentLandmark", formData.permanentLandmark)}
                                        {renderInputField("District", "permanentDistrict", formData.permanentDistrict)}

                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Present Address */}
                        <div className="modal-card mb-3">
                            <div className="modal-card-header bg-secondary text-white">
                                <h4 className="mb-0">Present Address</h4>
                            </div>
                            <div className="modal-card-body">
                                <div className="row">
                                    <div className="col-md-4">
                                        {renderInputField("D.No", "presentAddress", formData.presentAddress)}
                                        {renderInputField("Village", "presentVillage", formData.presentVillage)}
                                        {renderInputField("State", "presentState", formData.presentState)}
                                    </div>
                                    <div className="col-md-4">
                                        {renderInputField("Street", "presentStreet", formData.presentStreet)}
                                        {renderInputField("Mandal", "presentMandal", formData.presentMandal)}
                                        {renderInputField("Pincode", "presentPincode", formData.presentPincode)}
                                    </div>
                                    <div className="col-md-4">
                                        {renderInputField("Landmark", "presentLandmark", formData.presentLandmark)}
                                        {renderInputField("District", "presentDistrict", formData.presentDistrict)}

                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Personal Information */}
                        <div className="modal-card mb-3">
                            <div className="modal-card-header bg-secondary text-white">
                                <h4 className="mb-0">Personal Information</h4>
                            </div>
                            <div className="modal-card-body">
                                <div className="row">
                                    <div className="col-md-4">
                                        {renderSelectField("Marital Status", "maritalStatus", formData.maritalStatus, [
                                            { value: "Single", label: "Single" },
                                            { value: "Married", label: "Married" },
                                            { value: "Divorced", label: "Divorced" },
                                            { value: "Widowed", label: "Widowed" }
                                        ])}
                                        {renderInputField("Child 1", "childName1", formData.childName1)}
                                        {renderInputField("Caste", "cast", formData.cast)}
                                    </div>
                                    <div className="col-md-4">
                                        {renderInputField("Date of Marriage", "dateOfMarriage", formData.dateOfMarriage, "date")}
                                        {renderInputField("Child 2", "childName2", formData.childName2)}
                                    </div>
                                    <div className="col-md-4">
                                        {renderInputField("Marriage Years", "marriageYears", formData.marriageYears, "number")}
                                        {renderInputField("Religion", "religion", formData.religion)}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Qualification & Skills */}
                        <div className="modal-card mb-3">
                            <div className="modal-card-header bg-secondary text-white">
                                <h4 className="mb-0">Qualification & Skills</h4>
                            </div>
                            <div className="modal-card-body">
                                <div className="row">
                                    <div className="col-md-4">
                                        {renderInputField("Qualification", "qualification", formData.qualification)}
                                        {renderInputField("Work Experience", "workExperince", formData.workExperince, "text")}
                                        {renderInputField("Mother Tongue", "motherTongue", formData.motherTongue)}
                                    </div>
                                    <div className="col-md-4">
                                        {renderInputField("School/College", "schoolCollege", formData.schoolCollege)}
                                        {renderArrayField("Working Skills", "workingSkills", "Add skill")}

                                    </div>
                                    <div className="col-md-4">
                                        {renderInputField("Primary Skill", "primarySkill", formData.primarySkill)}
                                        {renderInputField("Languages", "languages", formData.languages)}

                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Health Details */}
                        <div className="modal-card mb-3">
                            <div className="modal-card-header bg-secondary text-white">
                                <h4 className="mb-0">Health Details</h4>
                            </div>
                            <div className="modal-card-body">
                                <div className="row">
                                    <div className="col-md-6">
                                        {renderArrayField("Health Issues", "healthIssues", "Add health issue")}
                                    </div>
                                    <div className="col-md-6">
                                        {renderInputField("Other Issues", "otherIssues", formData.otherIssues)}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Emergency Contacts */}
                        <div className="modal-card mb-3">
                            <div className="modal-card-header bg-secondary text-white">
                                <h4 className="mb-0">Emergency Contacts</h4>
                            </div>
                            <div className="modal-card-body">
                                {renderEmergencyContact("emergencyContact1", "Emergency Contact 1")}
                                {renderEmergencyContact("emergencyContact2", "Emergency Contact 2")}
                                {renderEmergencyContact("emergencyContact3", "Emergency Contact 3")}
                            </div>
                        </div>

                        {/* Bank Details */}
                        <div className="modal-card mb-3">
                            <div className="modal-card-header bg-secondary text-white">
                                <h4 className="mb-0">Bank Details</h4>
                            </div>
                            <div className="modal-card-body">
                                <div className="row">
                                    <div className="col-md-6">
                                        {renderInputField("Account No", "accountNo", formData.accountNo)}
                                        {renderInputField("Branch Name", "branchName", formData.branchName)}
                                        {renderInputField("PhonePe Number", "phonePayNo", formData.phonePayNo)}
                                        {renderInputField("Google Pay Number", "googlePayNo", formData.googlePayNo)}
                                        {renderInputField("Basic Salary", "basicSalary", formData.basicSalary, "number")}

                                    </div>
                                    <div className="col-md-6">
                                        {renderInputField("Bank Name", "bankName", formData.bankName)}
                                        {renderInputField("IFSC Code", "ifscCode", formData.ifscCode)}
                                        {renderInputField("PhonePe Name", "phonePayName", formData.phonePayName)}
                                        {renderInputField("Google Pay Name", "googlePayName", formData.googlePayName)}
                                        {renderInputField("Page No", "pageNo", formData.pageNo)}
                                    </div>
                                </div>
                                <div className="mb-2">
                                    <label className="form-label"><strong>About Employee</strong></label>
                                    <textarea
                                        className="form-control"
                                        name="aboutEmployeee"
                                        value={formData.aboutEmployeee || ''}
                                        onChange={handleInputChange}
                                        disabled={!isEditMode}
                                        rows="3"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Employee Photo */}
                        {formData.employeePhoto && (
                            <div className="modal-card mb-3">
                                <div className="modal-card-header bg-info text-white">
                                    <h4 className="mb-0">Employee Photo</h4>
                                </div>
                                <div className="modal-card-body text-center">
                                    <img
                                        src={formData.employeePhoto}
                                        alt="Employee"
                                        style={{ maxWidth: '300px', maxHeight: '300px', objectFit: 'cover' }}
                                        className="rounded img-fluid"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="modal-footer">
                        {isEditMode ? (
                            <>
                                <button type="button" className="btn btn-secondary" onClick={onClose}>
                                    Cancel
                                </button>
                                <button type="button" className="btn btn-success" onClick={handleSave}>
                                    Save Changes
                                </button>

                            </>
                        ) : (
                            <>
                                {/* Delete Employee button , if you want you can enable it */}
                                {/* <button type="button" className="btn btn-danger" onClick={handleDelete}>
                  Delete Employee
                </button> */}
                                <button type="button" className="btn btn-secondary" onClick={onClose}>
                                    Close
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EmployeeModal;