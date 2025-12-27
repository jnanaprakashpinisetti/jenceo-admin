import React from "react";

const BranchAddress = ({ formData, errors, handleChange }) => {
  const fields = [
    ["branchDNo", "D.No / House No *"],
    ["branchBuilding", "Building / Apartment Name"],
    ["branchStreet", "Street Name *"],
    ["branchLandmark", "Landmark"],
    ["branchVillage", "Village / Town / City *"],
    ["branchMandal", "Mandal / Taluk"],
    ["branchDistrict", "District *"],
    ["branchState", "State *"],
    ["branchCountry", "Country"],
    ["branchPincode", "PIN Code *"],
  ];

  return (
    <div className="form-section">
      <h5>Address – Branch / Site Office</h5>

      <div className="form-check mb-3">
        <input
          type="checkbox"
          className="form-check-input"
          name="sameAsRegistered"
          checked={formData.sameAsRegistered}
          onChange={handleChange}
        />
        <label className="form-check-label">Same as Registered Address</label>
      </div>

      {!formData.sameAsRegistered && (
        <div className="row">
          {fields.map(([name, label]) => (
            <Input key={name} {...{ name, label, formData, errors, handleChange }} />
          ))}
        </div>
      )}
    </div>
  );
};

const Input = ({ name, label, formData, errors, handleChange }) => (
  <div className="col-md-6 mb-3">
    <label>{label}</label>
    <input
      type="text"
      name={name}
      value={formData[name] || ""}
      onChange={handleChange}
      className={`form-control ${errors[name] ? "is-invalid" : ""}`}
    />
    {errors[name] && <div className="invalid-feedback">{errors[name]}</div>}
  </div>
);

export default BranchAddress;
