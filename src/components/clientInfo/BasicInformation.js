import React from "react";

export default function BasicInformation({ formData, handleChange, errors = {}, isViewMode = false, idDisabled = false }) {
  // Function to get current location
  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
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

  const openGoogleMaps = () => {
    if (formData.googleLocation) {
      if (formData.googleLocation.includes(',')) {
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${formData.googleLocation}`);
      } else {
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(formData.googleLocation)}`);
      }
    } else if (formData.location) {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(formData.location)}`);
    }
  };

  return (
    <>
      <div className="row">
        <div className="col-md-6">
          <div className="form-group">
            <label>First Name<span className="text-danger">*</span></label>
            <input
              type="text"
              className={`form-control ${errors.firstName ? "is-invalid" : ""}`}
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              // onBlur={handleBlur}
              readOnly={isViewMode}
            />
            {errors.firstName && <div className="invalid-feedback">{errors.firstName}</div>}
          </div>
        </div>
        
        <div className="col-md-6">
          <div className="form-group">
            <label>Last Name<span className="text-danger">*</span></label>
            <input
              type="text"
              className={`form-control ${errors.lastName ? "is-invalid" : ""}`}
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              // onBlur={handleBlur}
              readOnly={isViewMode}
            />
            {errors.lastName && <div className="invalid-feedback">{errors.lastName}</div>}
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-md-6">
                    <div className="form-group">
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
        
        <div className="col-md-6">
          <div className="form-group">
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
      </div>

      <div className="row">
        <div className="col-md-6">
          <div className="form-group">
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
        
        <div className="col-md-6">
          <div className="form-group">
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
      </div>

 

      <div className="row">
        <div className="col-md-6">
          <div className="form-group">
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
          <div className="form-group">
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

      {/* Google Location */}
      <div className="row">
        <div className="col-md-12">
          <div className="form-group">
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