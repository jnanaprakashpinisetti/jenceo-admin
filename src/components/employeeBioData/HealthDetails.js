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
        <div className="col-12">
          <label className="form-label">Other Issues</label>
          <input
            className="form-control"
            type="text"
            name="otherIssues"
            id="otherIssues"
            value={formData.otherIssues}
            onChange={handleChange}
          />
        </div>

        <div className="col-12 mt-4">
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
        </div>
      </div>
    </div>
  );
};

export default HealthDetails;
