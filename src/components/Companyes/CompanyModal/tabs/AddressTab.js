import React from "react";

const AddressTab = ({ formData, editMode, handleChange }) => {
  const indianStates = [
    "Andhra Pradesh", "Telangana", "Karnataka", "Tamil Nadu", "Kerala",
    "Maharashtra", "Delhi", "Uttar Pradesh", "Gujarat", "Rajasthan",
    "Madhya Pradesh", "West Bengal", "Other"
  ];

  return (
    <div className="row">
      <div className="col-md-6">
        <h5 className="mb-3">Registered Address</h5>
        
        <div className="mb-3">
          <label className="form-label"><strong>Door No / House No *</strong></label>
          <input
            type="text"
            className="form-control"
            name="registeredDNo"
            value={formData.registeredDNo || ""}
            onChange={handleChange}
            readOnly={!editMode}
            disabled={!editMode}
          />
        </div>

        <div className="mb-3">
          <label className="form-label"><strong>Building / Apartment</strong></label>
          <input
            type="text"
            className="form-control"
            name="registeredBuilding"
            value={formData.registeredBuilding || ""}
            onChange={handleChange}
            readOnly={!editMode}
            disabled={!editMode}
          />
        </div>

        <div className="mb-3">
          <label className="form-label"><strong>Street / Road *</strong></label>
          <input
            type="text"
            className="form-control"
            name="registeredStreet"
            value={formData.registeredStreet || ""}
            onChange={handleChange}
            readOnly={!editMode}
            disabled={!editMode}
          />
        </div>

        <div className="mb-3">
          <label className="form-label"><strong>Landmark</strong></label>
          <input
            type="text"
            className="form-control"
            name="registeredLandmark"
            value={formData.registeredLandmark || ""}
            onChange={handleChange}
            readOnly={!editMode}
            disabled={!editMode}
          />
        </div>

        <div className="row">
          <div className="col-md-6">
            <div className="mb-3">
              <label className="form-label"><strong>Village / Town / City *</strong></label>
              <input
                type="text"
                className="form-control"
                name="registeredVillage"
                value={formData.registeredVillage || ""}
                onChange={handleChange}
                readOnly={!editMode}
                disabled={!editMode}
              />
            </div>
          </div>
          <div className="col-md-6">
            <div className="mb-3">
              <label className="form-label"><strong>Mandal / Taluka</strong></label>
              <input
                type="text"
                className="form-control"
                name="registeredMandal"
                value={formData.registeredMandal || ""}
                onChange={handleChange}
                readOnly={!editMode}
                disabled={!editMode}
              />
            </div>
          </div>
        </div>

        <div className="row">
          <div className="col-md-6">
            <div className="mb-3">
              <label className="form-label"><strong>District *</strong></label>
              <input
                type="text"
                className="form-control"
                name="registeredDistrict"
                value={formData.registeredDistrict || ""}
                onChange={handleChange}
                readOnly={!editMode}
                disabled={!editMode}
              />
            </div>
          </div>
          <div className="col-md-6">
            <div className="mb-3">
              <label className="form-label"><strong>State *</strong></label>
              <select
                className="form-control"
                name="registeredState"
                value={formData.registeredState || ""}
                onChange={handleChange}
                disabled={!editMode}
              >
                <option value="">Select State</option>
                {indianStates.map(state => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="mb-3">
          <label className="form-label"><strong>PIN Code *</strong></label>
          <input
            type="text"
            className="form-control"
            name="registeredPincode"
            value={formData.registeredPincode || ""}
            onChange={handleChange}
            readOnly={!editMode}
            disabled={!editMode}
            maxLength="6"
          />
        </div>
      </div>

      <div className="col-md-6">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5>Branch Address</h5>
          {editMode && (
            <div className="form-check">
              <input
                type="checkbox"
                className="form-check-input"
                name="sameAsRegistered"
                checked={formData.sameAsRegistered || false}
                onChange={handleChange}
                id="sameAsRegistered"
              />
              <label className="form-check-label" htmlFor="sameAsRegistered">
                Same as Registered Address
              </label>
            </div>
          )}
        </div>

        <div className="mb-3">
          <label className="form-label"><strong>Door No / House No</strong></label>
          <input
            type="text"
            className="form-control"
            name="branchDNo"
            value={formData.branchDNo || ""}
            onChange={handleChange}
            readOnly={!editMode || formData.sameAsRegistered}
            disabled={!editMode || formData.sameAsRegistered}
          />
        </div>

        <div className="mb-3">
          <label className="form-label"><strong>Building / Apartment</strong></label>
          <input
            type="text"
            className="form-control"
            name="branchBuilding"
            value={formData.branchBuilding || ""}
            onChange={handleChange}
            readOnly={!editMode || formData.sameAsRegistered}
            disabled={!editMode || formData.sameAsRegistered}
          />
        </div>

        <div className="mb-3">
          <label className="form-label"><strong>Street / Road</strong></label>
          <input
            type="text"
            className="form-control"
            name="branchStreet"
            value={formData.branchStreet || ""}
            onChange={handleChange}
            readOnly={!editMode || formData.sameAsRegistered}
            disabled={!editMode || formData.sameAsRegistered}
          />
        </div>

        <div className="mb-3">
          <label className="form-label"><strong>Landmark</strong></label>
          <input
            type="text"
            className="form-control"
            name="branchLandmark"
            value={formData.branchLandmark || ""}
            onChange={handleChange}
            readOnly={!editMode || formData.sameAsRegistered}
            disabled={!editMode || formData.sameAsRegistered}
          />
        </div>

        <div className="row">
          <div className="col-md-6">
            <div className="mb-3">
              <label className="form-label"><strong>Village / Town / City</strong></label>
              <input
                type="text"
                className="form-control"
                name="branchVillage"
                value={formData.branchVillage || ""}
                onChange={handleChange}
                readOnly={!editMode || formData.sameAsRegistered}
                disabled={!editMode || formData.sameAsRegistered}
              />
            </div>
          </div>
          <div className="col-md-6">
            <div className="mb-3">
              <label className="form-label"><strong>Mandal / Taluka</strong></label>
              <input
                type="text"
                className="form-control"
                name="branchMandal"
                value={formData.branchMandal || ""}
                onChange={handleChange}
                readOnly={!editMode || formData.sameAsRegistered}
                disabled={!editMode || formData.sameAsRegistered}
              />
            </div>
          </div>
        </div>

        <div className="row">
          <div className="col-md-6">
            <div className="mb-3">
              <label className="form-label"><strong>District</strong></label>
              <input
                type="text"
                className="form-control"
                name="branchDistrict"
                value={formData.branchDistrict || ""}
                onChange={handleChange}
                readOnly={!editMode || formData.sameAsRegistered}
                disabled={!editMode || formData.sameAsRegistered}
              />
            </div>
          </div>
          <div className="col-md-6">
            <div className="mb-3">
              <label className="form-label"><strong>State</strong></label>
              <select
                className="form-control"
                name="branchState"
                value={formData.branchState || ""}
                onChange={handleChange}
                disabled={!editMode || formData.sameAsRegistered}
              >
                <option value="">Select State</option>
                {indianStates.map(state => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="mb-3">
          <label className="form-label"><strong>PIN Code</strong></label>
          <input
            type="text"
            className="form-control"
            name="branchPincode"
            value={formData.branchPincode || ""}
            onChange={handleChange}
            readOnly={!editMode || formData.sameAsRegistered}
            disabled={!editMode || formData.sameAsRegistered}
            maxLength="6"
          />
        </div>
      </div>
    </div>
  );
};

export default AddressTab;