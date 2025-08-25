import React, { useState } from "react";
import firebaseDB from "../../firebase"; // Adjust path as needed

const HospitalForm = ({ onSubmit, initialData = {}, isEdit = false }) => {
  const [formData, setFormData] = useState({
    idNo: initialData.idNo || "",
    hospitalName: initialData.hospitalName || "",
    hospitalType: initialData.hospitalType || "",
    location: initialData.location || "",
    noOfBeds: initialData.noOfBeds || "",
    timing: initialData.timing || "",
    address: initialData.address || "",
    locationLink: initialData.locationLink || "",
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState({ success: null, message: "" });
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }

    // Clear submit status when user makes changes
    if (submitStatus.success !== null) {
      setSubmitStatus({ success: null, message: "" });
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // ID No validation (H followed by 1-9999)
    if (!formData.idNo.trim()) {
      newErrors.idNo = "ID No is required";
    } else if (!/^H[1-9][0-9]{0,3}$/.test(formData.idNo)) {
      newErrors.idNo = "ID must be in format H1 to H9999";
    }

    // Hospital Name validation
    if (!formData.hospitalName.trim()) {
      newErrors.hospitalName = "Hospital Name is required";
    }

    // Location validation
    if (!formData.location.trim()) {
      newErrors.location = "Location is required";
    }

    // No of Beds validation
    if (!formData.noOfBeds) {
      newErrors.noOfBeds = "Number of Beds is required";
    } else if (isNaN(formData.noOfBeds) || parseInt(formData.noOfBeds) <= 0) {
      newErrors.noOfBeds = "Please enter a valid number of beds";
    }

    // Location Link validation (if provided)
    if (formData.locationLink && !isValidUrl(formData.locationLink)) {
      newErrors.locationLink = "Please enter a valid URL";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidUrl = (string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    // Show confirmation modal instead of submitting directly
    setShowConfirmModal(true);
  };

  const confirmSubmit = async () => {
    setShowConfirmModal(false);
    setIsSubmitting(true);
    setSubmitStatus({ success: null, message: "" });

    try {
      // Prepare data for Firebase
      const hospitalData = {
        idNo: formData.idNo,
        hospitalName: formData.hospitalName,
        hospitalType: formData.hospitalType,
        location: formData.location,
        noOfBeds: parseInt(formData.noOfBeds),
        timing: formData.timing,
        address: formData.address,
        locationLink: formData.locationLink,
        createdAt: isEdit ? initialData.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Save to Firebase
      if (isEdit && initialData.id) {
        // Update existing hospital
        await firebaseDB.child(`HospitalData/${initialData.id}`).update(hospitalData);
        setSubmitStatus({ 
          success: true, 
          message: "Hospital updated successfully!" 
        });
      } else {
        // Add new hospital
        const newHospitalRef = firebaseDB.child("HospitalData").push();
        await newHospitalRef.set({
          ...hospitalData,
          id: newHospitalRef.key, // Store the Firebase-generated ID
          createdAt: new Date().toISOString(),
        });
        setSubmitStatus({ 
          success: true, 
          message: "Hospital added successfully!" 
        });
        
        // Clear form after successful submission for new entries
        if (!isEdit) {
          setFormData({
            idNo: "",
            hospitalName: "",
            hospitalType: "",
            location: "",
            noOfBeds: "",
            timing: "",
            address: "",
            locationLink: "",
          });
        }
      }

      // Call the onSubmit callback if provided
      if (onSubmit) {
        onSubmit(hospitalData);
      }

    } catch (error) {
      console.error("Error saving hospital data:", error);
      setSubmitStatus({ 
        success: false, 
        message: `Error saving data: ${error.message}` 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const cancelSubmit = () => {
    setShowConfirmModal(false);
  };

  const handleCancel = () => {
    // You can add navigation logic here or pass a cancel callback
    console.log("Form cancelled");
    // If you want to reset the form on cancel
    if (!isEdit) {
      setFormData({
        idNo: "",
        hospitalName: "",
        hospitalType: "",
        location: "",
        noOfBeds: "",
        timing: "",
        address: "",
        locationLink: "",
      });
    }
    setErrors({});
    setSubmitStatus({ success: null, message: "" });
  };

  return (
    <div className="container">
      <div className="form-card shadow">
        <div className="form-card-header mb-4">
          <h3 className="text-center">
            {isEdit ? "Edit Hospital" : "Add New Hospital"}
          </h3>
        </div>
        <div className="form-card-body">
          {/* Status Message */}
          {submitStatus.success !== null && (
            <div className={`alert ${submitStatus.success ? 'alert-success' : 'alert-danger'} mb-4`}>
              {submitStatus.message}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="row g-3">
              {/* ID No */}
              <div className="col-md-6">
                <label htmlFor="idNo" className="form-label">
                  ID No<span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  className={`form-control ${errors.idNo ? "is-invalid" : ""}`}
                  id="idNo"
                  name="idNo"
                  value={formData.idNo}
                  onChange={handleChange}
                  placeholder="Enter ID (e.g., H1, H25, H9999)"
                  maxLength="5"
                  disabled={isEdit} // Disable ID editing for existing records
                />
                {errors.idNo && (
                  <div className="invalid-feedback">{errors.idNo}</div>
                )}
            
              </div>

              {/* Hospital Name */}
              <div className="col-md-6">
                <label htmlFor="hospitalName" className="form-label">
                  Hospital Name<span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  className={`form-control ${errors.hospitalName ? "is-invalid" : ""}`}
                  id="hospitalName"
                  name="hospitalName"
                  value={formData.hospitalName}
                  onChange={handleChange}
                  placeholder="Enter hospital name"
                />
                {errors.hospitalName && (
                  <div className="invalid-feedback">{errors.hospitalName}</div>
                )}
              </div>

              {/* Hospital Type */}
              <div className="col-md-6">
                <label htmlFor="hospitalType" className="form-label">
                  Hospital Type
                </label>
                <select
                  className="form-select"
                  id="hospitalType"
                  name="hospitalType"
                  value={formData.hospitalType}
                  onChange={handleChange}
                >
                  <option value="">Select Hospital Type</option>
                  <option value="Government">Government</option>
                  <option value="Private">Private</option>
                  <option value="Community">Community Health Center</option>
                  <option value="Specialty">Specialty Hospital</option>
                  <option value="Multi-Specialty">Multi-Specialty Hospital</option>
                  <option value="Clinic">Clinic</option>
                </select>
              </div>

              {/* Location */}
              <div className="col-md-6">
                <label htmlFor="location" className="form-label">
                  Location<span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  className={`form-control ${errors.location ? "is-invalid" : ""}`}
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="Enter location"
                />
                {errors.location && (
                  <div className="invalid-feedback">{errors.location}</div>
                )}
              </div>

              {/* No of Beds */}
              <div className="col-md-6">
                <label htmlFor="noOfBeds" className="form-label">
                  No of Beds<span className="text-danger">*</span>
                </label>
                <input
                  type="number"
                  className={`form-control ${errors.noOfBeds ? "is-invalid" : ""}`}
                  id="noOfBeds"
                  name="noOfBeds"
                  value={formData.noOfBeds}
                  onChange={handleChange}
                  placeholder="Enter number of beds"
                  min="1"
                />
                {errors.noOfBeds && (
                  <div className="invalid-feedback">{errors.noOfBeds}</div>
                )}
              </div>

              {/* Timing */}
              <div className="col-md-6">
                <label htmlFor="timing" className="form-label">
                  Timing
                </label>
                <input
                  type="text"
                  className="form-control"
                  id="timing"
                  name="timing"
                  value={formData.timing}
                  onChange={handleChange}
                  placeholder="e.g., 24/7, 9AM-9PM"
                />
              </div>

              {/* Address */}
              <div className="col-12">
                <label htmlFor="address" className="form-label">
                  Address
                </label>
                <textarea
                  className="form-control"
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  rows="3"
                  placeholder="Enter full address"
                />
              </div>

              {/* Location Link */}
              <div className="col-12">
                <label htmlFor="locationLink" className="form-label">
                  Location Link
                </label>
                <input
                  type="url"
                  className={`form-control ${errors.locationLink ? "is-invalid" : ""}`}
                  id="locationLink"
                  name="locationLink"
                  value={formData.locationLink}
                  onChange={handleChange}
                  placeholder="https://maps.google.com/..."
                />
                {errors.locationLink && (
                  <div className="invalid-feedback">{errors.locationLink}</div>
                )}
                <div className="form-text">
                  Enter Google Maps link or other location URL
                </div>
              </div>

              {/* Form Actions */}
              <div className="col-12 mt-4">
                <button 
                  type="submit" 
                  className="btn btn-success me-2"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <span
                        className="spinner-border spinner-border-sm me-2"
                        role="status"
                        aria-hidden="true"
                      ></span>
                      {isEdit ? "Updating..." : "Adding..."}
                    </>
                  ) : (
                    isEdit ? "Update Hospital" : "Add Hospital"
                  )}
                </button>
                {/* <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={handleCancel}
                  disabled={isSubmitting}
                >
                  Cancel
                </button> */}
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Confirm {isEdit ? 'Update' : 'Addition'}</h5>
                <button type="button" className="btn-close" onClick={cancelSubmit}></button>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to {isEdit ? 'update' : 'add'} this hospital?</p>
                <div className="">
                  <div className="card-body">
                    <p><strong>Hospital ID:</strong> {formData.idNo}</p>
                    <p><strong>Hospital Name:</strong> {formData.hospitalName}</p>
                    <p><strong>Location:</strong> {formData.location}</p>
                    <p><strong>Type:</strong> {formData.hospitalType || 'Not specified'}</p>
                    <p><strong>Beds:</strong> {formData.noOfBeds}</p>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={cancelSubmit}>
                  Cancel
                </button>
                <button type="button" className="btn btn-primary" onClick={confirmSubmit}>
                  Confirm {isEdit ? 'Update' : 'Add'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HospitalForm;