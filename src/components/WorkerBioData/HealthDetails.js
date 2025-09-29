const HealthDetails = ({ formData, handleChange, nextStep, prevStep }) => {
  const healthIssuesOptions = [
    "B.P",
    "Sugar",
    "Thyroid",
    "Skin Allergy",
    "Fits",
    "Sight",
    "Deaf",
    "Dumb",
  ];

  return (
    <div>
      <div className="form-card-header mb-4">
        <h3 className="text-center">Health Details</h3>
      </div>
      <hr></hr>
      <div className="row g-3">
        <div className="col-12">
          <label className="form-label">Health Issues</label>
          <div className="d-flex flex-wrap gap-3">
            {healthIssuesOptions.map((option) => (
              <div className="form-check" key={option}>
                <input
                  className="form-check-input"
                  type="checkbox"
                  name="healthIssues"
                  id={`health-${option}`}
                  value={option}
                  checked={formData.healthIssues.includes(option)}
                  onChange={handleChange}
                />
                <label
                  className="form-check-label"
                  htmlFor={`health-${option}`}
                >
                  {option}
                </label>
              </div>
            ))}
          </div>
        </div>

        <div className="col-md-6">
          <label className="form-label">Blood Group</label>
          <select
            className="form-select"
            name="bloodGroup"
            id="bloodGroup"
            value={formData.bloodGroup}
            onChange={handleChange}
          >
            <option value="">Select</option>
            <option value="A+">A+</option>
            <option value="A-">A-</option>
            <option value="B+">B+</option>
            <option value="B-">B-</option>
            <option value="AB+">AB+</option>
            <option value="AB-">AB-</option>
            <option value="O+">O+</option>
            <option value="O-">O-</option>
          </select>
        </div>

        <div className="col-md-6">
          <label className="form-label">Health Card No</label>
          <input
            className="form-control"
            type="text"
            name="healthCardNo"
            id="healthCardNo"
            value={formData.healthCardNo}
            onChange={handleChange}
          />
        </div>
        <div className="col-md-6">
          <label className="form-label">Height</label>
          <input
            className="form-control"
            type="tel"
            maxLength={2}
            name="height"
            id="height"
            value={formData.height}
            onChange={handleChange}
          />
        </div>
        <div className="col-md-6">
          <label className="form-label">Weight</label>
          <input
            className="form-control"
            type="tel"
            maxLength={2}
            name="weight"
            id="weight"
            value={formData.weight}
            onChange={handleChange}
          />
        </div>

        <div className="col-md-12">
          <label className="form-label">Other Issues</label>
          <textarea
            className="form-control"
            type="text"
            name="otherIssues"
            id="otherIssues"
            value={formData.otherIssues}
            onChange={handleChange}
            rows={3}
          />
        </div>

        {/* <div className="col-12 mt-4">
          <button
            type="button"
            className="btn btn-primary float-end"
            onClick={nextStep}
          >
            Next <i className="bi bi-arrow-right"></i>
          </button>
          <button
            type="button"
            className="btn btn-secondary me-2"
            onClick={prevStep}
          >
            <i className="bi bi-arrow-left"></i> Previous
          </button>
        </div> */}
      </div>
    </div>
  );
};

export default HealthDetails;
