import React, { useMemo } from "react";

/**
 * Designation (Job & Payroll) — follows the same Bootstrap-ish structure as BankDetails
 * Required fields: Department, Designation, Basic Salary, Page No
 */
const DEPARTMENT_ROLES = {
  "Founders": [
    "Founder",
    "Co-Founder",
    "Managing Director",
    "Executive Director"
  ],
  "Management / Executive": [
    "CEO",
    "COO",
    "General Manager",
    "Assistant General Manager",
    "Branch / Unit Manager"
  ],
  "Human Resources (HR)": [
    "HR Manager",
    "HR Executive",
    "Talent Acquisition Specialist",
    "Payroll Executive",
    "HR Assistant"
  ],
  "Finance & Accounts": [
    "Chief Accountant",
    "Accounts Manager",
    "Accountant",
    "Billing Executive",
    "Finance Analyst"
  ],
  "Administration": [
    "Admin Manager",
    "Admin Coordinator",
    "Front Office Executive",
    "Admin Assistent",
    "Receptionist"
  ],
  "Operations": [
    "Operations Manager",
    "Operations Executive",
    "Field Supervisor",
    "Coordinator",
    "Operations Assistant"
  ],
  "Information Technology (IT)": [
    "IT Manager",
    "System Administrator",
    "Software Developer",
    "Web Developer",
    "Network Engineer",
    "Technical Support Engineer",
    "QA Tester"
  ],
  "Engineering / Technical": [
    "Project Engineer",
    "Mechanical Engineer",
    "Electrical Engineer",
    "Civil Engineer",
    "Technician"
  ],
  "Design / Creative": [
    "Creative Director",
    "UI/UX Designer",
    "Graphic Designer",
    "Animator / Video Editor",
    "Brand Designer"
  ],
  "Sales & Marketing": [
    "Sales Manager",
    "Marketing Executive",
    "Business Development Executive",
    "Sales Coordinator",
    "Digital Marketing Specialist"
  ],
  "Customer Support / Service": [
    "Customer Service Manager",
    "Support Executive",
    "Call Center Agent",
    "Helpdesk Associate"
  ],
  "Procurement / Purchase": [
    "Purchase Manager",
    "Procurement Officer",
    "Vendor Coordinator",
    "Storekeeper"
  ],
  "Quality Assurance (QA)": [
    "QA Manager",
    "QA Engineer",
    "Quality Inspector"
  ],
  "Legal & Compliance": [
    "Legal Advisor",
    "Compliance Officer",
    "Contract Manager"
  ],
  "Research & Development (R&D)": [
    "R&D Manager",
    "Research Analyst",
    "Product Analyst"
  ],
  "Training & Development": [
    "Training Manager",
    "L&D Executive",
    "Trainer / Mentor"
  ],
  "Security / Facility": [
    "Security Manager",
    "Security Officer",
    "Housekeeping Supervisor",
    "Maintenance Staff"
  ],
  "Logistics / Fleet": [
    "Fleet Manager",
    "Driver Supervisor",
    "Dispatcher",
    "Driver"
  ]
};

export default function Designation({
  formData,
  handleChange,
  handleBlur,
  errors,
  prevStep,
  nextStep
}) {
  const departments = useMemo(() => Object.keys(DEPARTMENT_ROLES), []);
  const designations = useMemo(
    () => DEPARTMENT_ROLES[formData.department] || [],
    [formData.department]
  );

  return (
    <div className="bank-details-form">
      <div className="form-card-header mb-4">
        <h3 className="text-center">Designation / Job & Payroll</h3>
      </div>
      <hr />

      <div className="row g-3">
        {/* Department */}
        <div className="col-md-6">
          <label htmlFor="department" className="form-label">
            Department <span className="star">*</span>
          </label>
          <select
            id="department"
            name="department"
            className={`form-select ${errors.department ? "is-invalid" : ""}`}
            value={formData.department || ""}
            onChange={handleChange}
            onBlur={handleBlur}
          >
            <option value="">-- Select Department --</option>
            {departments.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          {errors.department && <div className="invalid-feedback">{errors.department}</div>}
        </div>

        {/* Designation */}
        <div className="col-md-6">
          <label htmlFor="designation" className="form-label">
            Designation <span className="star">*</span>
          </label>
          <select
            id="designation"
            name="designation"
            className={`form-select ${errors.designation ? "is-invalid" : ""}`}
            value={formData.designation || ""}
            onChange={handleChange}
            onBlur={handleBlur}
            disabled={!formData.department}
          >
            <option value="">{formData.department ? "-- Select Designation --" : "Select Department first"}</option>
            {designations.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          {errors.designation && <div className="invalid-feedback">{errors.designation}</div>}
        </div>

        {/* Supervisor ID */}
        <div className="col-md-6">
          <label htmlFor="superiorId" className="form-label">Superior ID</label>
          <input
            type="text"
            id="superiorId"
            name="superiorId"
            className="form-control"
            value={formData.superiorId || ""}
            onChange={handleChange}
            onBlur={handleBlur}
          />
        </div>

        {/* Supervisor Name */}
        <div className="col-md-6">
          <label htmlFor="superiorName" className="form-label">Superior Name</label>
          <input
            type="text"
            id="superiorName"
            name="superiorName"
            className="form-control"
            value={formData.superiorName || ""}
            onChange={handleChange}
            onBlur={handleBlur}
          />
        </div>

        {/* Basic Salary */}
        <div className="col-md-6">
          <label htmlFor="basicSalary" className="form-label">
            Basic Salary <span className="star">*</span>
          </label>
          <input
            type="tel"
            id="basicSalary"
            name="basicSalary"
            className={`form-control ${errors.basicSalary ? "is-invalid" : ""}`}
            value={formData.basicSalary || ""}
            onChange={handleChange}
            onBlur={handleBlur}
            maxLength={7}
          />
          {errors.basicSalary && <div className="invalid-feedback">{errors.basicSalary}</div>}
        </div>

        {/* Allowance */}
        <div className="col-md-6">
          <label htmlFor="allowance" className="form-label">Allowance</label>
          <input
            type="tel"
            id="allowance"
            name="allowance"
            className="form-control"
            value={formData.allowance || ""}
            onChange={handleChange}
            onBlur={handleBlur}
            maxLength={7}
          />
        </div>

        {/* HRA */}
        <div className="col-md-6">
          <label htmlFor="hra" className="form-label">HRA</label>
          <input
            type="tel"
            id="hra"
            name="hra"
            className="form-control"
            value={formData.hra || ""}
            onChange={handleChange}
            onBlur={handleBlur}
            maxLength={7}
          />
        </div>

        {/* Travel Allowance */}
        <div className="col-md-6">
          <label htmlFor="travelAllowance" className="form-label">Travel Allowance</label>
          <input
            type="tel"
            id="travelAllowance"
            name="travelAllowance"
            className="form-control"
            value={formData.travelAllowance || ""}
            onChange={handleChange}
            onBlur={handleBlur}
            maxLength={7}
          />
        </div>

        {/* PAN No */}
        <div className="col-md-6">
          <label htmlFor="panNo" className="form-label">PAN No</label>
          <input
            type="text"
            id="panNo"
            name="panNo"
            className="form-control"
            style={{ textTransform: "uppercase" }}
            value={formData.panNo || ""}
            onChange={handleChange}
            onBlur={handleBlur}
            maxLength={10}
          />
        </div>

        {/* PF No */}
        <div className="col-md-6">
          <label htmlFor="pfNo" className="form-label">PF No</label>
          <input
            type="text"
            id="pfNo"
            name="pfNo"
            className="form-control"
            value={formData.pfNo || ""}
            onChange={handleChange}
            onBlur={handleBlur}
          />
        </div>

        {/* Insurance No */}
        <div className="col-md-6">
          <label htmlFor="insuranceNo" className="form-label">Insurance No</label>
          <input
            type="text"
            id="insuranceNo"
            name="insuranceNo"
            className="form-control"
            value={formData.insuranceNo || ""}
            onChange={handleChange}
            onBlur={handleBlur}
          />
        </div>

        {/* Health Card No */}
        <div className="col-md-6">
          <label htmlFor="healthCardNo" className="form-label">Health Card No</label>
          <input
            type="text"
            id="healthCardNo"
            name="healthCardNo"
            className="form-control"
            value={formData.healthCardNo || ""}
            onChange={handleChange}
            onBlur={handleBlur}
          />
        </div>

        {/* User ID */}
        <div className="col-md-6">
          <label htmlFor="userId" className="form-label">User ID</label>
          <input
            type="text"
            id="userId"
            name="userId"
            className="form-control"
            value={formData.userId || ""}
            onChange={handleChange}
            onBlur={handleBlur}
          />
        </div>

        {/* Password */}
        <div className="col-md-6">
          <label htmlFor="password" className="form-label">Password</label>
          <input
            type="text"
            id="password"
            name="password"
            className="form-control"
            value={formData.password || ""}
            onChange={handleChange}
            onBlur={handleBlur}
          />
        </div>

        {/* Role */}
        <div className="col-md-6">
          <label htmlFor="role" className="form-label">Role</label>
          <input
            type="text"
            id="role"
            name="role"
            className="form-control"
            value={formData.role || ""}
            onChange={handleChange}
            onBlur={handleBlur}
          />
        </div>

        {/* Page No */}
        <div className="col-md-6">
          <label htmlFor="pageNo" className="form-label">
            Page No <span className="star">*</span>
          </label>
          <input
            type="tel"
            id="pageNo"
            name="pageNo"
            className={`form-control ${errors.pageNo ? "is-invalid" : ""}`}
            value={formData.pageNo || ""}
            onChange={handleChange}
            onBlur={handleBlur}
            maxLength={4}
          />
          {errors.pageNo && <div className="invalid-feedback">{errors.pageNo}</div>}
        </div>
      </div>

      {/* Footer actions are handled by the parent form's Prev/Next buttons */}
    </div>
  );
}
