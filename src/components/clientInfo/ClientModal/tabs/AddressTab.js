import React from "react";

const AddressTab = ({ formData, editMode, handleChange }) => {
  return (
    <div className="row justify-content-center">
      <div className="col-12 col-lg-10">
        <div className="card shadow-sm border-0">
          <div className="card-header bg-light border-bottom">
            <div className="d-flex align-items-center">
              <div className="bg-primary bg-opacity-10 p-2 rounded-circle me-3">
                <i className="bi bi-geo-alt text-primary fs-5"></i>
              </div>
              <div>
                <h5 className="mb-0 text-dark">Address Details</h5>
                <small className="text-muted">Complete address information</small>
              </div>
            </div>
          </div>

          <div className="card-body">
            {editMode ? (
              // Edit Mode - Form Layout
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label fw-medium">Door No</label>
                  <input
                    className="form-control"
                    name="dNo"
                    value={formData.dNo || ""}
                    onChange={handleChange}
                    disabled={!editMode}
                    placeholder="Enter door number"
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-medium">Landmark</label>
                  <input
                    className="form-control"
                    name="landMark"
                    value={formData.landMark || ""}
                    onChange={handleChange}
                    disabled={!editMode}
                    placeholder="Near landmark"
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-medium">Street</label>
                  <input
                    className="form-control"
                    name="street"
                    value={formData.street || ""}
                    onChange={handleChange}
                    disabled={!editMode}
                    placeholder="Street name"
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-medium">Village/Town</label>
                  <input
                    className="form-control"
                    name="villageTown"
                    value={formData.villageTown || ""}
                    onChange={handleChange}
                    disabled={!editMode}
                    placeholder="Village or town"
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-medium">Mandal</label>
                  <input
                    className="form-control"
                    name="mandal"
                    value={formData.mandal || ""}
                    onChange={handleChange}
                    disabled={!editMode}
                    placeholder="Mandal"
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-medium">District</label>
                  <input
                    className="form-control"
                    name="district"
                    value={formData.district || ""}
                    onChange={handleChange}
                    disabled={!editMode}
                    placeholder="District"
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-medium">State</label>
                  <input
                    className="form-control"
                    name="state"
                    value={formData.state || ""}
                    onChange={handleChange}
                    disabled={!editMode}
                    placeholder="State"
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-medium">Pincode</label>
                  <input
                    className="form-control"
                    name="pincode"
                    value={formData.pincode || ""}
                    onChange={handleChange}
                    disabled={!editMode}
                    placeholder="Pincode"
                    maxLength="6"
                  />
                </div>
              </div>
            ) : (
              // View Mode - Card Grid Layout
              <div className="row g-3">
                {/* Door No Card */}
                <div className="col-md-6">
                  <div className="border rounded p-2 h-100">
                    <div className="text-muted small mb-1">Door No</div>
                    <div className="fw-semibold fs-6">{formData.dNo || "—"}</div>
                  </div>
                </div>

                {/* Landmark Card */}
                <div className="col-md-6">
                  <div className="border rounded p-2 h-100">
                    <div className="text-muted small mb-1">Landmark</div>
                    <div className="fw-semibold fs-6">{formData.landMark || "—"}</div>
                  </div>
                </div>

                {/* Street Card - Full Width */}
                <div className="col-md-6">
                  <div className="border rounded p-3">
                    <div className="text-muted small mb-1">Street</div>
                    <div className="fw-semibold fs-6">{formData.street || "—"}</div>
                  </div>
                </div>

                {/* Village/Town Card */}
                <div className="col-md-6">
                  <div className="border rounded p-2 h-100">
                    <div className="text-muted small mb-1">Village/Town</div>
                    <div className="fw-semibold fs-6">{formData.villageTown || "—"}</div>
                  </div>
                </div>

                {/* Mandal Card */}
                <div className="col-md-6">
                  <div className="border rounded p-2 h-100">
                    <div className="text-muted small mb-1">Mandal</div>
                    <div className="fw-semibold fs-6">{formData.mandal || "—"}</div>
                  </div>
                </div>

                {/* District Card */}
                <div className="col-md-6">
                  <div className="border rounded p-2 h-100">
                    <div className="text-muted small mb-1">District</div>
                    <div className="fw-semibold fs-6">{formData.district || "—"}</div>
                  </div>
                </div>

                {/* State Card */}
                <div className="col-md-6">
                  <div className="border rounded p-2 h-100">
                    <div className="text-muted small mb-1">State</div>
                    <div className="fw-semibold fs-6">{formData.state || "—"}</div>
                  </div>
                </div>

                {/* Pincode Card */}
                <div className="col-md-6">
                  <div className="border rounded p-2 h-100">
                    <div className="text-muted small mb-1">Pincode</div>
                    <div className="fw-semibold fs-6">{formData.pincode || "—"}</div>
                  </div>
                </div>

                {/* Full Address Summary Card */}
                <div className="col-12">
                  <div className="  rounded p-3 bg-secondary  ">
                    <div className="text-muted small mb-1">Complete Address</div>
                    <div className="fw-semibold">
                      {formData.dNo || ""} {formData.street ? `, ${formData.street}` : ""}
                      {formData.landMark ? ` (Near ${formData.landMark})` : ""}
                      <br />
                      {formData.villageTown || ""}
                      {formData.mandal ? `, ${formData.mandal}` : ""}
                      {formData.district ? `, ${formData.district}` : ""}
                      {formData.state ? `, ${formData.state}` : ""}
                      {formData.pincode ? ` - ${formData.pincode}` : ""}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="card-footer bg-light border-top">
            <div className="d-flex justify-content-between align-items-center w-100">
              <small className="text-muted">
                {editMode ? (
                  <>
                    <i className="bi bi-pencil-square text-primary me-1"></i>
                    Edit mode enabled
                  </>
                ) : (
                  <>
                    <i className="bi bi-eye text-success me-1"></i>
                    View mode
                  </>
                )}
              </small>
              <div className="text-muted small border-0">
                <i className="bi bi-geo-fill me-1"></i>
                Address information
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddressTab;