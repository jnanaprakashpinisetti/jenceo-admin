import React from "react";

const RegisteredAddress = ({ formData, errors, handleChange }) => {
  const fields = [
    ["registeredDNo", "D.No / House No *"],
    ["registeredBuilding", "Building / Apartment Name"],
    ["registeredStreet", "Street Name *"],
    ["registeredLandmark", "Landmark"],
    ["registeredVillage", "Village / Town / City *"],
    ["registeredMandal", "Mandal / Taluk"],
    ["registeredDistrict", "District *"],
    ["registeredState", "State *"],
    ["registeredCountry", "Country"],
    ["registeredPincode", "PIN Code *"],
  ];

  return (
    <div className="form-section">
      <h5>Address – Registered Office</h5>
      <div className="row">
        {fields.map(([name, label]) => (
          <Input key={name} {...{ name, label, formData, errors, handleChange }} />
        ))}
      </div>
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

export default RegisteredAddress;
