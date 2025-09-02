import React, { useState } from "react";
import firebaseDB from "../../firebase";

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
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [showThankYouModal, setShowThankYouModal] = useState(false);
  const [duplicateHospital, setDuplicateHospital] = useState(null);
  const [submittedHospital, setSubmittedHospital] = useState(null); // Store submitted data

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
    if (submitStatus.success !== null) {
      setSubmitStatus({ success: null, message: "" });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.idNo.trim()) {
      newErrors.idNo = "ID No is required";
    } else if (!/^H[1-9][0-9]{0,3}$/.test(formData.idNo)) {
      newErrors.idNo = "ID must be in format H1 to H9999";
    }
    if (!formData.hospitalName.trim()) {
      newErrors.hospitalName = "Hospital Name is required";
    }
    if (!formData.location.trim()) {
      newErrors.location = "Location is required";
    }
    if (!formData.noOfBeds) {
      newErrors.noOfBeds = "Number of Beds is required";
    } else if (isNaN(formData.noOfBeds) || parseInt(formData.noOfBeds) <= 0) {
      newErrors.noOfBeds = "Please enter a valid number of beds";
    }
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    // ✅ Check for duplicate ID before showing confirm modal
    try {
      const snapshot = await firebaseDB.child("HospitalData").orderByChild("idNo").equalTo(formData.idNo).once("value");

      if (snapshot.exists() && !isEdit) {
        let dup = null;
        snapshot.forEach((child) => {
          dup = child.val();
        });
        setDuplicateHospital(dup);
        setShowDuplicateModal(true);
        return; // Stop normal flow
      }
    } catch (err) {
      console.error("Error checking duplicate ID:", err);
    }

    setShowConfirmModal(true);
  };

  const confirmSubmit = async () => {
    setShowConfirmModal(false);
    setIsSubmitting(true);
    setSubmitStatus({ success: null, message: "" });

    try {
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

      if (isEdit && initialData.id) {
        await firebaseDB.child(`HospitalData/${initialData.id}`).update(hospitalData);
        setSubmitStatus({ success: true, message: "Hospital updated successfully!" });
      } else {
        const newHospitalRef = firebaseDB.child("HospitalData").push();
        await newHospitalRef.set({ ...hospitalData, id: newHospitalRef.key, createdAt: new Date().toISOString() });
        setSubmitStatus({ success: true, message: "Hospital added successfully!" });

        // Store the submitted data before resetting the form
        setSubmittedHospital({
          idNo: formData.idNo,
          hospitalName: formData.hospitalName
        });

        // Show thank you modal for new hospital additions
        setShowThankYouModal(true);
        
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

      if (onSubmit) onSubmit(hospitalData);
    } catch (error) {
      console.error("Error saving hospital data:", error);
      setSubmitStatus({ success: false, message: `Error saving data: ${error.message}` });
    } finally {
      setIsSubmitting(false);
    }
  };

  const cancelSubmit = () => setShowConfirmModal(false);

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          const mapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
          setFormData((prev) => ({ ...prev, locationLink: mapsUrl }));
        },
        (err) => {
          console.error("Error getting location:", err);
          alert("Unable to fetch current location. Please allow location access.");
        }
      );
    } else {
      alert("Geolocation is not supported by this browser.");
    }
  };

  return (
    <div className="container">
      <div className="form-card shadow">
        <div className="form-card-header mb-4">
          <h3 className="text-center">{isEdit ? "Edit Hospital" : "Add New Hospital"}</h3>
        </div>
        <div className="form-card-body">
          {submitStatus.success !== null && (
            <div className={`alert ${submitStatus.success ? "alert-success" : "alert-danger"} mb-4`}>
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
                  disabled={isEdit}
                />
                {errors.idNo && <div className="invalid-feedback">{errors.idNo}</div>}
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
                {errors.hospitalName && <div className="invalid-feedback">{errors.hospitalName}</div>}
              </div>

              {/* Hospital Type */}
              <div className="col-md-6">
                <label htmlFor="hospitalType" className="form-label">Hospital Type</label>
                <select className="form-select" id="hospitalType" name="hospitalType" value={formData.hospitalType} onChange={handleChange}>
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
                {errors.location && <div className="invalid-feedback">{errors.location}</div>}
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
                {errors.noOfBeds && <div className="invalid-feedback">{errors.noOfBeds}</div>}
              </div>

              {/* Timing */}
              <div className="col-md-6">
                <label htmlFor="timing" className="form-label">Timing</label>
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
                <label htmlFor="address, setShowThankYouModal" className="form-label">Address</label>
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
                <label htmlFor="locationLink" className="form-label">Location Link</label>
                <div className="input-group">
                  <input
                    type="url"
                    className={`form-control ${errors.locationLink ? "is-invalid" : ""}`}
                    id="locationLink"
                    name="locationLink"
                    value={formData.locationLink}
                    onChange={handleChange}
                    placeholder="https://maps.google.com/..."
                  />
                  <button type="button" className="btn btn-outline-primary mb-0" onClick={getCurrentLocation}>
                    Location
                  </button>
                </div>
                {errors.locationLink && <div className="invalid-feedback">{errors.locationLink}</div>}
              </div>

              {/* Submit */}
              <div className="col-12 mt-4">
                <button type="submit" className="btn btn-success me-2" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      {isEdit ? "Updating..." : "Adding..."}
                    </>
                  ) : (
                    isEdit ? "Update Hospital" : "Add Hospital"
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="modal fade show" style={{ display: "block", backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Confirm {isEdit ? "Update" : "Addition"}</h5>
                <button type="button" className="btn-close" onClick={cancelSubmit}></button>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to {isEdit ? "update" : "add"} this hospital?</p>
                <p><strong>Hospital ID:</strong> {formData.idNo}</p>
                <p><strong>Hospital Name:</strong> {formData.hospitalName}</p>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={cancelSubmit}>Cancel</button>
                <button type="button" className="btn btn-primary" onClick={confirmSubmit}>
                  Confirm {isEdit ? "Update" : "Add"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Modal */}
      {showDuplicateModal && duplicateHospital && (
        <div className="modal fade show" style={{ display: "block", backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-warning">
                <h5 className="modal-title">Duplicate ID Found</h5>
                <button type="button" className="btn-close" onClick={() => setShowDuplicateModal(false)}></button>
              </div>
              <div className="modal-body">
                <p>This ID No already exists in the database.</p>
                <p><strong>ID No:</strong> {duplicateHospital.idNo}</p>
                <p><strong>Hospital Name:</strong> {duplicateHospital.hospitalName}</p>
              </div>
              <div className="modal-footer">
                <button className="btn btn-danger" onClick={() => setShowDuplicateModal(false)}>OK</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Thank You Modal - Only shows for new hospital additions */}
      {showThankYouModal && submittedHospital && (
        <div className="modal fade show" style={{ display: "block", backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-success text-white">
                <h5 className="modal-title">Thank You!</h5>
                <button type="button" className="btn-close" onClick={() => setShowThankYouModal(false)}></button>
              </div>
              <div className="modal-body text-center">
                <div className="mb-4">
                  <i className="fas fa-check-circle text-success" style={{ fontSize: "3rem" }}></i>
                </div>
                <h4>Hospital Successfully Added</h4>
                <p className="mb-1">Thank you for adding the hospital to our database.</p>
                <p><strong>Hospital ID:</strong> {submittedHospital.idNo}</p>
                <p><strong>Hospital Name:</strong> {submittedHospital.hospitalName}</p>
              </div>
              <div className="modal-footer justify-content-center">
                <button type="button" className="btn btn-success" onClick={() => setShowThankYouModal(false)}>
                  Continue
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