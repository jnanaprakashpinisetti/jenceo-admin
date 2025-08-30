import React from "react";

export default function BasicInformation({ formData, handleChange, errors = {}, isViewMode = false }) {
  // Function to get current location
  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          // Reverse geocode to get address (you might want to use Google Maps Geocoding API)
          // For now, we'll just store the coordinates
          handleChange({
            target: {
              name: "googleLocation",
              value: `${latitude},${longitude}`
            }
          });
        },
        (error) => {
          console.error("Error getting location:", error);
          alert("Unable to get your location. Please make sure location services are enabled.");
        }
      );
    } else {
      alert("Geolocation is not supported by this browser.");
    }
  };

  // Function to open Google Maps with directions
  const openGoogleMaps = () => {
    if (formData.googleLocation) {
      // If we have coordinates, use them directly
      if (formData.googleLocation.includes(',')) {
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${formData.googleLocation}`);
      } else {
        // Otherwise use the address
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(formData.googleLocation)}`);
      }
    } else if (formData.location) {
      // Fallback to the location field
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(formData.location)}`);
    }
  };

  return (
    <>
      <div className="row">
        <div className="col-md-6">
          {/* ID No */}
          <div className="form-group mb-3">
            <label>ID No<span className="text-danger">*</span></label>
            <input
              type="text"
              className={`form-control ${errors.idNo ? "is-invalid" : ""}`}
              name="idNo"
              value={formData.idNo}
              onChange={handleChange}
              placeholder="JC00001"
              maxLength={7}
              readOnly={isViewMode}
            />
            {errors.idNo && <div className="invalid-feedback">{errors.idNo}</div>}
          </div>
        </div>
        <div className="col-md-6">
          {/* Client Name */}
          <div className="form-group mb-3">
            <label>Client Name<span className="text-danger">*</span></label>
            <input
              type="text"
              className={`form-control ${errors.clientName ? "is-invalid" : ""}`}
              name="clientName"
              value={formData.clientName}
              onChange={handleChange}
              readOnly={isViewMode}
            />
            {errors.clientName && <div className="invalid-feedback">{errors.clientName}</div>}
          </div>
        </div>
      </div>
      <div className="row">
        <div className="col-md-6">
          {/* Gender */}
          <div className="form-group mb-3">
            <label>Gender<span className="text-danger">*</span></label>
            <select
              className={`form-control ${errors.gender ? "is-invalid" : ""}`}
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              disabled={isViewMode}
            >
              <option value="">Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
            {errors.gender && <div className="invalid-feedback">{errors.gender}</div>}
          </div>
        </div>
        <div className="col-md-6">
          {/* Care Of */}
          <div className="form-group mb-3">
            <label>Care Of</label>
            <input
              type="text"
              className="form-control"
              name="careOf"
              value={formData.careOf}
              onChange={handleChange}
              readOnly={isViewMode}
            />
          </div>
        </div>
      </div>
      <div className="row">
        <div className="col-md-6">
          {/* Relation */}
          <div className="form-group mb-3">
            <label>Relation</label>
            <input
              type="text"
              className="form-control"
              name="relation"
              value={formData.relation}
              onChange={handleChange}
              readOnly={isViewMode}
            />
          </div>
        </div>
        <div className="col-md-6">
          {/* Location */}
          <div className="form-group mb-3">
            <label>Location<span className="text-danger">*</span></label>
            <input
              type="text"
              className={`form-control ${errors.location ? "is-invalid" : ""}`}
              name="location"
              value={formData.location}
              onChange={handleChange}
              readOnly={isViewMode}
            />
            {errors.location && <div className="invalid-feedback">{errors.location}</div>}
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-md-6">
          {/* Mobile No 1 */}
          <div className="form-group mb-3">
            <label>Mobile No 1<span className="text-danger">*</span></label>
            <input
              type="tel"
              className={`form-control ${errors.mobileNo1 ? "is-invalid" : ""}`}
              name="mobileNo1"
              value={formData.mobileNo1}
              onChange={handleChange}
              maxLength="10"
              readOnly={isViewMode}
            />
            {errors.mobileNo1 && <div className="invalid-feedback">{errors.mobileNo1}</div>}
          </div>
        </div>

        <div className="col-md-6">
          {/* Mobile No 2 */}
          <div className="form-group mb-3">
            <label>Mobile No 2</label>
            <input
              type="tel"
              className={`form-control ${errors.mobileNo2 ? "is-invalid" : ""}`}
              name="mobileNo2"
              value={formData.mobileNo2}
              onChange={handleChange}
              maxLength="10"
              readOnly={isViewMode}
            />
            {errors.mobileNo2 && <div className="invalid-feedback">{errors.mobileNo2}</div>}
          </div>
        </div>
      </div>

      {/* Google Location Field */}
      <div className="row">
        <div className="col-md-12">
          <div className="form-group mb-3">
            <label>Google Location</label>
            <div className="input-group">
              <input
                type="text"
                className={`form-control ${errors.googleLocation ? "is-invalid" : ""}`}
                name="googleLocation"
                value={formData.googleLocation || ''}
                onChange={handleChange}
                placeholder="Click the button to get your current location"
                readOnly={isViewMode}
              />
              {!isViewMode ? (
                <button
                  className="btn btn-outline-secondary mb-0"
                  type="button"
                  onClick={getCurrentLocation}
                >
                  Get Current Location
                </button>
              ) : (
                <button
                  className="btn btn-outline-primary mb-0"
                  type="button"
                  onClick={openGoogleMaps}
                >
                  Open in Google Maps
                </button>
              )}
            </div>
            {errors.googleLocation && <div className="invalid-feedback">{errors.googleLocation}</div>}
          </div>
        </div>
      </div>
    </>
  );
}