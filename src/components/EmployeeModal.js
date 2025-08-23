import React, { useState, useEffect } from "react";

const EmployeeModal = ({ employee, isOpen, onClose, onSave, onDelete, isEditMode }) => {
    const [formData, setFormData] = useState({});
    const [status, setStatus] = useState("On Duty");
    const [activeTab, setActiveTab] = useState("basic");

    // validation errors
    const [paymentErrors, setPaymentErrors] = useState([]);   // [{field: 'message'} per section]
    const [workErrors, setWorkErrors] = useState([]);         // [{field: 'message'} per section]

    const blankPayment = () => ({
        date: "",
        clientName: "",
        days: "",
        amount: "",
        typeOfPayment: "",
        bookNo: "",
        status: "",
        remarks: "",
        __locked: false, // new = editable & removable
    });

    const blankWork = () => ({
        clientId: "",
        clientName: "",
        location: "",
        days: "",
        fromDate: "",
        toDate: "",
        serviceType: "",
        remarks: "",
        __locked: false, // new = editable & removable
    });

    const lockArray = (arr) => (Array.isArray(arr) ? arr.map((r) => ({ ...r, __locked: true })) : []);

    useEffect(() => {
        if (employee) {
            setFormData({
                ...employee,
                // treat incoming items as existing (locked)
                payments:
                    Array.isArray(employee.payments) && employee.payments.length
                        ? lockArray(employee.payments)
                        : [blankPayment()],
                workDetails:
                    Array.isArray(employee.workDetails) && employee.workDetails.length
                        ? lockArray(employee.workDetails)
                        : [blankWork()],
            });
            setStatus(employee.status || "On Duty");
            setPaymentErrors((employee.payments || []).map(() => ({})).length ? (employee.payments || []).map(() => ({})) : [{}]);
            setWorkErrors((employee.workDetails || []).map(() => ({})).length ? (employee.workDetails || []).map(() => ({})) : [{}]);
        }
    }, [employee]);

    if (!isOpen) return null;

    /* ----------------------- generic handlers ----------------------- */
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleArrayChange = (section, index, field, value) => {
        setFormData((prev) => {
            const arr = [...(prev[section] || [])];
            const row = { ...(arr[index] || {}) };
            if (row.__locked) return prev; // safety: don't edit locked rows
            row[field] = value;
            arr[index] = row;
            return { ...prev, [section]: arr };
        });

        // clear that specific error
        if (section === "payments") {
            setPaymentErrors((prev) => {
                const next = [...(prev || [])];
                next[index] = { ...(next[index] || {}), [field]: "" };
                return next;
            });
        }
        if (section === "workDetails") {
            setWorkErrors((prev) => {
                const next = [...(prev || [])];
                next[index] = { ...(next[index] || {}), [field]: "" };
                return next;
            });
        }
    };

    const addPaymentSection = () => {
        setFormData((prev) => ({ ...prev, payments: [...(prev.payments || []), blankPayment()] }));
        setPaymentErrors((prev) => [...(prev || []), {}]);
    };

    const addWorkSection = () => {
        setFormData((prev) => ({ ...prev, workDetails: [...(prev.workDetails || []), blankWork()] }));
        setWorkErrors((prev) => [...(prev || []), {}]);
    };

    const removePaymentSection = (index) => {
        setFormData((prev) => {
            const list = [...(prev.payments || [])];
            if (list[index]?.__locked) return prev; // cannot remove locked
            list.splice(index, 1);
            return { ...prev, payments: list.length ? list : [blankPayment()] };
        });
        setPaymentErrors((prev) => {
            const next = [...(prev || [])];
            next.splice(index, 1);
            return next.length ? next : [{}];
        });
    };

    const removeWorkSection = (index) => {
        setFormData((prev) => {
            const list = [...(prev.workDetails || [])];
            if (list[index]?.__locked) return prev; // cannot remove locked
            list.splice(index, 1);
            return { ...prev, workDetails: list.length ? list : [blankWork()] };
        });
        setWorkErrors((prev) => {
            const next = [...(prev || [])];
            next.splice(index, 1);
            return next.length ? next : [{}];
        });
    };

    /* ----------------------- validation ----------------------- */
    const validate = () => {
        let ok = true;

        // Payments required: date, clientName, days, amount, typeOfPayment, status
        const pErrs = (formData.payments || []).map((p) => {
            const e = {};
            if (!p.date) e.date = "Date is required";
            if (!p.clientName) e.clientName = "Client Name is required";
            if (!p.days) e.days = "Days is required";
            else if (Number(p.days) <= 0 || isNaN(Number(p.days))) e.days = "Days must be a positive number";
            if (!p.amount) e.amount = "Amount is required";
            else if (Number(p.amount) <= 0 || isNaN(Number(p.amount))) e.amount = "Amount must be a positive number";
            if (!p.typeOfPayment) e.typeOfPayment = "Type of payment is required";
            if (!p.status) e.status = "Status is required";
            if (Object.keys(e).length) ok = false;
            return e;
        });
        setPaymentErrors(pErrs.length ? pErrs : [{}]);

        // Work required: clientId, clientName, days, fromDate, toDate, serviceType
        const wErrs = (formData.workDetails || []).map((w) => {
            const e = {};
            if (!w.clientId) e.clientId = "Client ID is required";
            if (!w.clientName) e.clientName = "Client Name is required";
            if (!w.days) e.days = "Days is required";
            else if (Number(w.days) <= 0 || isNaN(Number(w.days))) e.days = "Days must be a positive number";
            if (!w.fromDate) e.fromDate = "From date is required";
            if (!w.toDate) e.toDate = "To date is required";
            if (w.fromDate && w.toDate && new Date(w.fromDate) > new Date(w.toDate)) {
                e.toDate = "To date must be after From date";
            }
            if (!w.serviceType) e.serviceType = "Service type is required";
            if (Object.keys(e).length) ok = false;
            return e;
        });
        setWorkErrors(wErrs.length ? wErrs : [{}]);

        return ok;
    };

    const handleSave = () => {
        if (!validate()) {
            if ((paymentErrors || []).some((e) => Object.keys(e).length) || (formData.payments || []).some((p) => !p.date)) {
                setActiveTab("payment");
            } else if ((workErrors || []).some((e) => Object.keys(e).length)) {
                setActiveTab("working");
            }
            return;
        }

        // Save outgoing WITHOUT helper flags
        const payload = {
            ...formData,
            payments: (formData.payments || []).map(({ __locked, ...rest }) => rest),
            workDetails: (formData.workDetails || []).map(({ __locked, ...rest }) => rest),
            status,
        };
        onSave(payload);

        // 1) After Save: mark all current rows as locked (old -> disabled)
        setFormData((prev) => ({
            ...prev,
            payments: (prev.payments || []).map((p) => ({ ...p, __locked: true })),
            workDetails: (prev.workDetails || []).map((w) => ({ ...w, __locked: true })),
        }));
    };

    const handleDelete = () => {
        if (window.confirm("Are you sure you want to delete this employee? This action cannot be undone.")) {
            onDelete(formData.id);
        }
    };

    /* ----------------------- small UI helpers ----------------------- */
    const renderInputField = (label, name, value, type = "text", placeholder = "", disabled = false) => (
        <div className="mb-3">
            <label className="form-label">
                <strong>{label}</strong>
            </label>
            <input
                type={type}
                className="form-control form-control-sm"
                name={name}
                value={value || ""}
                onChange={handleInputChange}
                disabled={disabled || !isEditMode}
                placeholder={placeholder}
            />
        </div>
    );

    const renderSelectField = (label, name, value, options) => (
        <div className="mb-3">
            <label className="form-label">
                <strong>{label}</strong>
            </label>
            <select
                className="form-select form-select-sm"
                name={name}
                value={value || ""}
                onChange={handleInputChange}
                disabled={!isEditMode}
            >
                <option value="">Select {label}</option>
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        </div>
    );

    const renderArrayField = (label, field, placeholder = "Add item") => (
        <div className="mb-3">
            <label className="form-label">
                <strong>{label}</strong>
            </label>
            <div className="d-flex">
                <input
                    type="text"
                    className="form-control form-control-sm me-2"
                    placeholder={placeholder}
                    onKeyPress={(e) => {
                        if (e.key === "Enter" && e.target.value) {
                            const currentArray = formData[field] || [];
                            if (!currentArray.includes(e.target.value)) {
                                setFormData((prev) => ({ ...prev, [field]: [...currentArray, e.target.value] }));
                            }
                            e.target.value = "";
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
                                style={{ fontSize: "0.6rem" }}
                                onClick={() =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        [field]: prev[field].filter((_, i) => i !== index),
                                    }))
                                }
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
            <div className="modal-card mb-3">
                <div className="modal-card-header bg-light py-1">
                    <strong>{title}</strong>
                </div>
                <div className="modal-card-body py-2">
                    <div className="row">
                        <div className="col-md-4">{renderInputField("Name", `${contactKey}.name`, contact.name)}</div>
                        <div className="col-md-4">{renderInputField("Relation", `${contactKey}.relation`, contact.relation)}</div>
                        <div className="col-md-4">{renderInputField("D.No", `${contactKey}.address`, contact.address)}</div>
                    </div>
                    <div className="row">
                        <div className="col-md-4">{renderInputField("Village", `${contactKey}.village`, contact.village)}</div>
                        <div className="col-md-4">{renderInputField("Mandal / Dist", `${contactKey}.mandal`, contact.mandal)}</div>
                        <div className="col-md-4">{renderInputField("State", `${contactKey}.state`, contact.state)}</div>
                    </div>
                    <div className="row">
                        <div className="col-md-4">{renderInputField("Mobile 1", `${contactKey}.mobile1`, contact.mobile1)}</div>
                        <div className="col-md-4">{renderInputField("Mobile 2", `${contactKey}.mobile2`, contact.mobile2)}</div>
                    </div>
                </div>
            </div>
        );
    };

    const modalClass = isEditMode ? "editEmployee" : "viewEmployee";
    const Err = ({ msg }) =>
        msg ? <div className="text-danger mt-1" style={{ fontSize: ".85rem" }}>{msg}</div> : null;

    return (
        <div className={`modal fade show ${modalClass}`} style={{ display: "block", backgroundColor: "rgba(0, 0, 0, 0.81)" }}>
            <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
                <div className="modal-content">
                    <div className="modal-header bg-primary text-white">
                        <h3 className="modal-title">
                            {isEditMode ? "Edit Employee - " : ""}
                            {formData.idNo || formData.employeeId || "N/A"} - {formData.firstName || ""} {formData.lastName || ""}
                        </h3>
                        <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
                    </div>

                    <div className="modal-body">
                        {/* Tabs */}
                        <ul className="nav nav-tabs" id="employeeTabs" role="tablist">
                            {[
                                ["basic", "Basic Info"],
                                ["address", "Address"],
                                ["personal", "Personal Info"],
                                ["qualification", "Qualification & Skills"],
                                ["health", "Health Details"],
                                ["emergency", "Emergency Contacts"],
                                ["bank", "Bank Details"],
                                ["payment", "Payment"],
                                ["working", "Working"],
                            ].map(([key, label]) => (
                                <li className="nav-item" role="presentation" key={key}>
                                    <button className={`nav-link ${activeTab === key ? "active" : ""}`} onClick={() => setActiveTab(key)}>
                                        {label}
                                    </button>
                                </li>
                            ))}
                        </ul>

                        <div className="tab-content p-3">
                            {/* Status */}
                            <div className="row mb-3 status">
                                <div className="col-md-4">
                                    <label className="form-label">
                                        <strong>Status</strong>
                                    </label>
                                    <select className="form-select" value={status} onChange={(e) => setStatus(e.target.value)} disabled={!isEditMode}>
                                        <option value="On Duty">On Duty</option>
                                        <option value="Off Duty">Off Duty</option>
                                        <option value="Resigned">Resigned</option>
                                        <option value="Absconder">Absconder</option>
                                        <option value="Terminated">Terminated</option>
                                    </select>
                                </div>
                            </div>

                            {/* Basic */}
                            {activeTab === "basic" && (
                                <div className="modal-card mb-3">
                                    <div className="modal-card-header bg-secondary text-white">
                                        <h4 className="mb-0">Basic Information</h4>
                                    </div>
                                    <div className="modal-card-body">
                                        <div className="row">
                                            <div className="col-md-4">
                                                {/* Disabled in edit mode */}
                                                {renderInputField("ID No", "idNo", formData.idNo || formData.employeeId, "text", "", true)}
                                            </div>
                                            <div className="col-md-4">{renderInputField("First Name", "firstName", formData.firstName)}</div>
                                            <div className="col-md-4">{renderInputField("Last Name", "lastName", formData.lastName)}</div>
                                        </div>

                                        <div className="row">
                                            <div className="col-md-4">
                                                {renderSelectField("Gender", "gender", formData.gender, [
                                                    { value: "Male", label: "Male" },
                                                    { value: "Female", label: "Female" },
                                                    { value: "Other", label: "Other" },
                                                ])}
                                            </div>
                                            <div className="col-md-4">{renderInputField("Date of Birth", "dateOfBirth", formData.dateOfBirth, "date")}</div>
                                            <div className="col-md-4">{renderInputField("Age", "years", formData.years, "number")}</div>
                                        </div>

                                        <div className="row">
                                            <div className="col-md-4">{renderInputField("C/o", "co", formData.co)}</div>
                                            <div className="col-md-4">{renderInputField("Aadhar No", "aadharNo", formData.aadharNo)}</div>
                                            <div className="col-md-4">{renderInputField("Local ID", "localId", formData.localId)}</div>
                                        </div>

                                        <div className="row">
                                            <div className="col-md-4">
                                                {renderInputField("Date of Joining", "date", formData.date || formData.dateOfJoining, "date")}
                                            </div>
                                            <div className="col-md-4">{renderInputField("Mobile 1", "mobileNo1", formData.mobileNo1, "tel")}</div>
                                            <div className="col-md-4">{renderInputField("Mobile 2", "mobileNo2", formData.mobileNo2, "tel")}</div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Address */}
                            {activeTab === "address" && (
                                <>
                                    <div className="modal-card mb-3">
                                        <div className="modal-card-header bg-secondary text-white">
                                            <h4 className="mb-0">Permanent Address</h4>
                                        </div>
                                        <div className="modal-card-body">
                                            <div className="row">
                                                <div className="col-md-4">{renderInputField("D.No", "permanentAddress", formData.permanentAddress)}</div>
                                                <div className="col-md-4">{renderInputField("Street", "permanentStreet", formData.permanentStreet)}</div>
                                                <div className="col-md-4">{renderInputField("Landmark", "permanentLandmark", formData.permanentLandmark)}</div>
                                            </div>
                                            <div className="row">
                                                <div className="col-md-4">{renderInputField("Village", "permanentVillage", formData.permanentVillage)}</div>
                                                <div className="col-md-4">{renderInputField("Mandal", "permanentMandal", formData.permanentMandal)}</div>
                                                <div className="col-md-4">{renderInputField("District", "permanentDistrict", formData.permanentDistrict)}</div>
                                            </div>
                                            <div className="row">
                                                <div className="col-md-4">{renderInputField("State", "permanentState", formData.permanentState)}</div>
                                                <div className="col-md-4">{renderInputField("Pincode", "permanentPincode", formData.permanentPincode)}</div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="modal-card mb-3">
                                        <div className="modal-card-header bg-secondary text-white">
                                            <h4 className="mb-0">Present Address</h4>
                                        </div>
                                        <div className="modal-card-body">
                                            <div className="row">
                                                <div className="col-md-4">{renderInputField("D.No", "presentAddress", formData.presentAddress)}</div>
                                                <div className="col-md-4">{renderInputField("Street", "presentStreet", formData.presentStreet)}</div>
                                                <div className="col-md-4">{renderInputField("Landmark", "presentLandmark", formData.presentLandmark)}</div>
                                            </div>
                                            <div className="row">
                                                <div className="col-md-4">{renderInputField("Village", "presentVillage", formData.presentVillage)}</div>
                                                <div className="col-md-4">{renderInputField("Mandal", "presentMandal", formData.presentMandal)}</div>
                                                <div className="col-md-4">{renderInputField("District", "presentDistrict", formData.presentDistrict)}</div>
                                            </div>
                                            <div className="row">
                                                <div className="col-md-4">{renderInputField("State", "presentState", formData.presentState)}</div>
                                                <div className="col-md-4">{renderInputField("Pincode", "presentPincode", formData.presentPincode)}</div>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* Personal */}
                            {activeTab === "personal" && (
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
                                                    { value: "Widowed", label: "Widowed" },
                                                ])}
                                            </div>
                                            <div className="col-md-4">{renderInputField("Date of Marriage", "dateOfMarriage", formData.dateOfMarriage, "date")}</div>
                                            <div className="col-md-4">{renderInputField("Marriage Years", "marriageYears", formData.marriageYears, "number")}</div>
                                        </div>
                                        <div className="row">
                                            <div className="col-md-4">{renderInputField("Child 1", "childName1", formData.childName1)}</div>
                                            <div className="col-md-4">{renderInputField("Child 2", "childName2", formData.childName2)}</div>
                                            <div className="col-md-4">{renderInputField("Religion", "religion", formData.religion)}</div>
                                        </div>
                                        <div className="row">
                                            <div className="col-md-4">{renderInputField("Caste", "cast", formData.cast)}</div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Qualification & Skills */}
                            {activeTab === "qualification" && (
                                <div className="modal-card mb-3">
                                    <div className="modal-card-header bg-secondary text-white">
                                        <h4 className="mb-0">Qualification & Skills</h4>
                                    </div>
                                    <div className="modal-card-body">
                                        <div className="row">
                                            <div className="col-md-4">{renderInputField("Qualification", "qualification", formData.qualification)}</div>
                                            <div className="col-md-4">{renderInputField("School/College", "schoolCollege", formData.schoolCollege)}</div>
                                            <div className="col-md-4">{renderInputField("Primary Skill", "primarySkill", formData.primarySkill)}</div>
                                        </div>
                                        <div className="row">
                                            <div className="col-md-4">{renderInputField("Work Experience", "workExperince", formData.workExperince, "text")}</div>
                                            <div className="col-md-4">{renderArrayField("Working Skills", "workingSkills", "Add skill")}</div>
                                            <div className="col-md-4">{renderInputField("Languages", "languages", formData.languages)}</div>
                                        </div>
                                        <div className="row">
                                            <div className="col-md-4">{renderInputField("Mother Tongue", "motherTongue", formData.motherTongue)}</div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Health */}
                            {activeTab === "health" && (
                                <div className="modal-card mb-3">
                                    <div className="modal-card-header bg-secondary text-white">
                                        <h4 className="mb-0">Health Details</h4>
                                    </div>
                                    <div className="modal-card-body">
                                        <div className="row">
                                            <div className="col-md-6">{renderArrayField("Health Issues", "healthIssues", "Add health issue")}</div>
                                            <div className="col-md-6">{renderInputField("Other Issues", "otherIssues", formData.otherIssues)}</div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Emergency */}
                            {activeTab === "emergency" && (
                                <div className="modal-card mb-3">
                                    <div className="modal-card-header bg-secondary text-white">
                                        <h4 className="mb-0">Emergency Contacts</h4>
                                    </div>
                                    <div className="modal-card-body">
                                        {renderEmergencyContact("emergencyContact1", "Emergency Contact 1")}
                                        <hr />
                                        {renderEmergencyContact("emergencyContact2", "Emergency Contact 2")}
                                        <hr />
                                        {renderEmergencyContact("emergencyContact3", "Emergency Contact 3")}
                                    </div>
                                </div>
                            )}

                            {/* Bank */}
                            {activeTab === "bank" && (
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
                                            <label className="form-label">
                                                <strong>About Employee</strong>
                                            </label>
                                            <textarea
                                                className="form-control"
                                                name="aboutEmployeee"
                                                value={formData.aboutEmployeee || ""}
                                                onChange={handleInputChange}
                                                disabled={!isEditMode}
                                                rows="3"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Payment */}
                            {activeTab === "payment" && (
                                <div className="modal-card mb-3">
                                    <div className="modal-card-header bg-secondary text-white">
                                        <h4 className="mb-0">Payment</h4>
                                    </div>
                                    <div className="modal-card-body">
                                        {(formData.payments || []).map((p, i) => {
                                            const locked = !!p.__locked;
                                            const invalidClass = (field) => (paymentErrors[i]?.[field] ? " is-invalid" : "");
                                            return (
                                                <div key={i} className="border rounded p-3 mb-3">
                                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                                        <h6 className="mb-0">
                                                            Payment #{i + 1} {locked && <span className="badge bg-secondary ms-2">Locked</span>}
                                                        </h6>
                                                        {isEditMode && !locked && (
                                                            <button className="btn btn-outline-danger btn-sm" onClick={() => removePaymentSection(i)}>
                                                                Remove
                                                            </button>
                                                        )}
                                                    </div>

                                                    <div className="row">
                                                        <div className="col-md-3 mb-2">
                                                            <label className="form-label">Date *</label>
                                                            <input
                                                                type="date"
                                                                className={`form-control form-control-sm${invalidClass("date")}`}
                                                                value={p.date || ""}
                                                                onChange={(e) => handleArrayChange("payments", i, "date", e.target.value)}
                                                                disabled={!isEditMode || locked}
                                                            />
                                                            <Err msg={paymentErrors[i]?.date} />
                                                        </div>
                                                        <div className="col-md-3 mb-2">
                                                            <label className="form-label">Client Name *</label>
                                                            <input
                                                                type="text"
                                                                className={`form-control form-control-sm${invalidClass("clientName")}`}
                                                                value={p.clientName || ""}
                                                                onChange={(e) => handleArrayChange("payments", i, "clientName", e.target.value)}
                                                                disabled={!isEditMode || locked}
                                                            />
                                                            <Err msg={paymentErrors[i]?.clientName} />
                                                        </div>
                                                        <div className="col-md-2 mb-2">
                                                            <label className="form-label">Days *</label>
                                                            <input
                                                                type="number"
                                                                className={`form-control form-control-sm${invalidClass("days")}`}
                                                                value={p.days || ""}
                                                                onChange={(e) => handleArrayChange("payments", i, "days", e.target.value)}
                                                                disabled={!isEditMode || locked}
                                                            />
                                                            <Err msg={paymentErrors[i]?.days} />
                                                        </div>
                                                        <div className="col-md-2 mb-2">
                                                            <label className="form-label">Amount *</label>
                                                            <input
                                                                type="number"
                                                                className={`form-control form-control-sm${invalidClass("amount")}`}
                                                                value={p.amount || ""}
                                                                onChange={(e) => handleArrayChange("payments", i, "amount", e.target.value)}
                                                                disabled={!isEditMode || locked}
                                                            />
                                                            <Err msg={paymentErrors[i]?.amount} />
                                                        </div>
                                                        <div className="col-md-2 mb-2">
                                                            <label className="form-label">Type of payment *</label>
                                                            <select
                                                                className={`form-select form-select-sm${invalidClass("typeOfPayment")}`}
                                                                value={p.typeOfPayment || ""}
                                                                onChange={(e) => handleArrayChange("payments", i, "typeOfPayment", e.target.value)}
                                                                disabled={!isEditMode || locked}
                                                            >
                                                                <option value="">Select</option>
                                                                <option value="cash">Cash</option>
                                                                <option value="online">Online</option>
                                                                <option value="cheque">Cheque</option>
                                                            </select>
                                                            <Err msg={paymentErrors[i]?.typeOfPayment} />
                                                        </div>
                                                    </div>

                                                    <div className="row">
                                                        <div className="col-md-2 mb-2">
                                                            <label className="form-label">Book No</label>
                                                            <input
                                                                type="text"
                                                                className="form-control form-control-sm"
                                                                value={p.bookNo || ""}
                                                                onChange={(e) => handleArrayChange("payments", i, "bookNo", e.target.value)}
                                                                disabled={!isEditMode || locked}
                                                            />
                                                        </div>
                                                        <div className="col-md-2 mb-2">
                                                            <label className="form-label">Status *</label>
                                                            <select
                                                                className={`form-select form-select-sm${invalidClass("status")}`}
                                                                value={p.status || ""}
                                                                onChange={(e) => handleArrayChange("payments", i, "status", e.target.value)}
                                                                disabled={!isEditMode || locked}
                                                            >
                                                                <option value="">Select</option>
                                                                <option value="pending">Pending</option>
                                                                <option value="paid">Paid</option>
                                                                <option value="partial">Partial</option>
                                                            </select>
                                                            <Err msg={paymentErrors[i]?.status} />
                                                        </div>
                                                        <div className="col-md-8 mb-2">
                                                            <label className="form-label">Remarks</label>
                                                            <input
                                                                type="text"
                                                                className="form-control form-control-sm"
                                                                value={p.remarks || ""}
                                                                onChange={(e) => handleArrayChange("payments", i, "remarks", e.target.value)}
                                                                disabled={!isEditMode || locked}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {isEditMode && (
                                            <button type="button" className="btn btn-primary btn-sm" onClick={addPaymentSection}>
                                                Add Payment
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Working */}
                            {activeTab === "working" && (
                                <div className="modal-card mb-3">
                                    <div className="modal-card-header bg-secondary text-white">
                                        <h4 className="mb-0">Working</h4>
                                    </div>
                                    <div className="modal-card-body">
                                        {(formData.workDetails || []).map((w, i) => {
                                            const locked = !!w.__locked;
                                            const invalidClass = (field) => (workErrors[i]?.[field] ? " is-invalid" : "");
                                            return (
                                                <div key={i} className="border rounded p-3 mb-3">
                                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                                        <h6 className="mb-0">
                                                            Work #{i + 1} {locked && <span className="badge bg-secondary ms-2">Locked</span>}
                                                        </h6>
                                                        {isEditMode && !locked && (
                                                            <button className="btn btn-outline-danger btn-sm" onClick={() => removeWorkSection(i)}>
                                                                Remove
                                                            </button>
                                                        )}
                                                    </div>

                                                    <div className="row">
                                                        <div className="col-md-3 mb-2">
                                                            <label className="form-label">Client ID *</label>
                                                            <input
                                                                type="text"
                                                                className={`form-control form-control-sm${invalidClass("clientId")}`}
                                                                value={w.clientId || ""}
                                                                onChange={(e) => handleArrayChange("workDetails", i, "clientId", e.target.value)}
                                                                disabled={!isEditMode || locked}
                                                            />
                                                            <Err msg={workErrors[i]?.clientId} />
                                                        </div>
                                                        <div className="col-md-3 mb-2">
                                                            <label className="form-label">Client Name *</label>
                                                            <input
                                                                type="text"
                                                                className={`form-control form-control-sm${invalidClass("clientName")}`}
                                                                value={w.clientName || ""}
                                                                onChange={(e) => handleArrayChange("workDetails", i, "clientName", e.target.value)}
                                                                disabled={!isEditMode || locked}
                                                            />
                                                            <Err msg={workErrors[i]?.clientName} />
                                                        </div>
                                                        <div className="col-md-2 mb-2">
                                                            <label className="form-label">Location</label>
                                                            <input
                                                                type="text"
                                                                className="form-control form-control-sm"
                                                                value={w.location || ""}
                                                                onChange={(e) => handleArrayChange("workDetails", i, "location", e.target.value)}
                                                                disabled={!isEditMode || locked}
                                                            />
                                                        </div>
                                                        <div className="col-md-2 mb-2">
                                                            <label className="form-label">Days *</label>
                                                            <input
                                                                type="number"
                                                                className={`form-control form-control-sm${invalidClass("days")}`}
                                                                value={w.days || ""}
                                                                onChange={(e) => handleArrayChange("workDetails", i, "days", e.target.value)}
                                                                disabled={!isEditMode || locked}
                                                            />
                                                            <Err msg={workErrors[i]?.days} />
                                                        </div>
                                                        <div className="col-md-2 mb-2">
                                                            <label className="form-label">Service Type *</label>
                                                            <input
                                                                type="text"
                                                                className={`form-control form-control-sm${invalidClass("serviceType")}`}
                                                                value={w.serviceType || ""}
                                                                onChange={(e) => handleArrayChange("workDetails", i, "serviceType", e.target.value)}
                                                                disabled={!isEditMode || locked}
                                                            />
                                                            <Err msg={workErrors[i]?.serviceType} />
                                                        </div>
                                                    </div>

                                                    <div className="row">
                                                        <div className="col-md-3 mb-2">
                                                            <label className="form-label">From (Date) *</label>
                                                            <input
                                                                type="date"
                                                                className={`form-control form-control-sm${invalidClass("fromDate")}`}
                                                                value={w.fromDate || ""}
                                                                onChange={(e) => handleArrayChange("workDetails", i, "fromDate", e.target.value)}
                                                                disabled={!isEditMode || locked}
                                                            />
                                                            <Err msg={workErrors[i]?.fromDate} />
                                                        </div>
                                                        <div className="col-md-3 mb-2">
                                                            <label className="form-label">To (Date) *</label>
                                                            <input
                                                                type="date"
                                                                className={`form-control form-control-sm${invalidClass("toDate")}`}
                                                                value={w.toDate || ""}
                                                                onChange={(e) => handleArrayChange("workDetails", i, "toDate", e.target.value)}
                                                                disabled={!isEditMode || locked}
                                                            />
                                                            <Err msg={workErrors[i]?.toDate} />
                                                        </div>
                                                        <div className="col-md-6 mb-2">
                                                            <label className="form-label">Remarks</label>
                                                            <input
                                                                type="text"
                                                                className="form-control form-control-sm"
                                                                value={w.remarks || ""}
                                                                onChange={(e) => handleArrayChange("workDetails", i, "remarks", e.target.value)}
                                                                disabled={!isEditMode || locked}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {isEditMode && (
                                            <button type="button" className="btn btn-primary btn-sm" onClick={addWorkSection}>
                                                Add Work Details
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
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
                                        style={{ maxWidth: "300px", maxHeight: "300px", objectFit: "cover" }}
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
                            <button type="button" className="btn btn-secondary" onClick={onClose}>
                                Close
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EmployeeModal;
