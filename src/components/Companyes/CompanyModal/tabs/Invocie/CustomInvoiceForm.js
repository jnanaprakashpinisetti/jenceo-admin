import React, { useState, useEffect } from 'react';

const CustomInvoiceForm = ({ 
  invoiceData, 
  onApply, 
  onClose, 
  company, 
  workers, 
  invoiceMode,
  searchWorkerGlobally,
  normalizeWorker,
  resolvePhoto,
  calculateDaysCount,
  calculateInvoiceAmount,
  formatAmount
}) => {
  const [formData, setFormData] = useState(invoiceData);
  const defaultCompanyPhoto = "https://firebasestorage.googleapis.com/v0/b/jenceo-admin.firebasestorage.app/o/OfficeFiles%2FSample-Photo.jpg?alt=media&token=01855b47-c9c2-490e-b400-05851192dde7";

  useEffect(() => {
    setFormData(invoiceData);
  }, [invoiceData]);

  const handleWorkerIdChange = async (e) => {
    const workerId = e.target.value;
    const updatedData = {
      workerId: workerId,
      workerName: '',
      workerDepartment: '',
      workerPhone: '',
      workerPhoto: ''
    };

    setFormData(prev => ({
      ...prev,
      ...updatedData
    }));

    if (workerId && workerId.trim().length >= 3) {
      try {
        let foundWorker = workers.find(w =>
          (w.workerId && w.workerId === workerId.trim()) ||
          (w.idNo && w.idNo === workerId.trim())
        );

        if (!foundWorker) {
          foundWorker = await searchWorkerGlobally(workerId.trim());
        }

        if (foundWorker) {
          const normalized = normalizeWorker(foundWorker);
          setFormData(prev => ({
            ...prev,
            workerName: normalized.workerName,
            workerDepartment: normalized.department,
            workerPhone: normalized.phone,
            workerPhoto: normalized.photo,
            workerId: normalized.workerId || workerId,
            workerSnapshot: normalized
          }));
        }
      } catch (error) {
        console.error("Error auto-filling worker:", error);
      }
    }
  };

  const handleServiceDateChange = (e) => {
    const serviceDate = e.target.value;
    const updatedData = {
      serviceDate,
      endDate: formData.endDate || '',
      invoiceAmount: '',
      dayAmount: formData.dayAmount || company?.serviceCharges || '',
      travelingCharges: formData.travelingCharges || '',
      extraCharges: formData.extraCharges || '',
      gapIfAny: formData.gapIfAny || '',
      remarks: formData.remarks || '',
      additionalComments: formData.additionalComments || '',
      thankYouType: formData.thankYouType || 'default',
      customThankYou: formData.customThankYou || '',
      workerId: formData.workerId || '',
      workerName: formData.workerName || '',
      workerDepartment: formData.workerDepartment || '',
      workerPhone: formData.workerPhone || '',
      workerPhoto: resolvePhoto(formData.workerPhoto || ''),
      invoiceDate: formData.invoiceDate || new Date().toISOString().split('T')[0],
      workerSnapshot: formData.workerSnapshot
    };

    setFormData(prev => ({
      ...prev,
      ...updatedData
    }));
  };

  const handleEndDateChange = (e) => {
    const endDate = e.target.value;
    setFormData(prev => ({
      ...prev,
      endDate
    }));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleApply = () => {
    onApply(formData);
  };

  const calculateFormDaysCount = () => {
    const startDate = formData.serviceDate;
    const endDate = formData.endDate;
    return calculateDaysCount(startDate, endDate);
  };

  return (
    <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 1060 }}>
      <div className="modal-dialog modal-lg modal-dialog-centered">
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header bg-primary text-white">
            <h5 className="modal-title">
              Custom Invoice Details
            </h5>
            <button
              type="button"
              className="btn-close btn-close-white"
              onClick={onClose}
            />
          </div>
          <div className="modal-body">
            <div className="row g-3">
              <div className="col-12 mb-4">
                <h6 className="border-bottom pb-2 mb-3">
                  <i className="bi bi-person-badge me-2"></i>
                  Worker Details
                </h6>
                <div className="row g-3">
                  <div className="col-md-4">
                    <label className="form-label"><strong>Employee ID</strong></label>
                    <input
                      type="text"
                      className="form-control"
                      name="workerId"
                      value={formData.workerId}
                      onChange={handleWorkerIdChange}
                      placeholder="Enter employee ID to auto-fill"
                    />
                    <small className="form-text text-info">
                      Enter Worker ID to auto-fill details (searches both company and global databases)
                    </small>

                    {/* Employee Photo Display */}
                    <div className="mt-3 text-center">
                      <label className="form-label"><strong>Employee Photo</strong></label>
                      <div className="border rounded p-2" style={{ backgroundColor: '#f8f9fa' }}>
                        <img
                          src={formData.workerPhoto || defaultCompanyPhoto}
                          alt="Employee"
                          className="img-fluid rounded"
                          style={{
                            maxHeight: '120px',
                            width: 'auto',
                            border: '1px solid #dee2e6',
                            objectFit: 'cover'
                          }}
                          onError={(e) => {
                            e.target.src = defaultCompanyPhoto;
                            e.target.style.border = '1px solid #ff6b6b';
                            e.target.alt = 'Default Photo (No photo available)';
                          }}
                        />
                        <div className="mt-2 small">
                          {formData.workerPhoto ? (
                            <span className="text-success">
                              <i className="bi bi-check-circle-fill me-1"></i>
                              Photo available
                            </span>
                          ) : (
                            <span className="text-danger">
                              <i className="bi bi-exclamation-triangle-fill me-1"></i>
                              Using default photo
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="col-md-8">
                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label">Employee Name</label>
                        <input
                          type="text"
                          className="form-control"
                          name="workerName"
                          value={formData.workerName}
                          disabled={invoiceMode === "edit"}
                          readOnly
                        />
                      </div>

                      <div className="col-md-6">
                        <label className="form-label">Department</label>
                        <input
                          type="text"
                          className="form-control"
                          name="workerDepartment"
                          value={formData.workerDepartment}
                          disabled={invoiceMode === "edit"}
                          readOnly
                        />
                      </div>

                      <div className="col-md-6">
                        <label className="form-label">Contact No</label>
                        <input
                          type="text"
                          className="form-control"
                          name="workerPhone"
                          value={formData.workerPhone}
                          disabled={invoiceMode === "edit"}
                          readOnly
                        />
                      </div>

                      <div className="col-md-6">
                        <label className="form-label">Worker Status</label>
                        <div className="form-control" style={{
                          backgroundColor: formData.workerId ? '#e7f7ff' : '#fff3cd',
                          color: formData.workerId ? '#0c5460' : '#856404',
                          fontWeight: 'bold'
                        }}>
                          {formData.workerId ? (
                            <span className="text-success">
                              <i className="bi bi-person-check me-1"></i>
                              Worker identified
                            </span>
                          ) : (
                            <span className="text-warning">
                              <i className="bi bi-person-x me-1"></i>
                              No worker selected
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-12 mb-4">
                <h6 className="border-bottom pb-2 mb-3">
                  <i className="bi bi-calendar-check me-2"></i>
                  Invoice Details
                </h6>
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label"><strong>Service Date *</strong></label>
                    <input
                      type="date"
                      className="form-control"
                      name="serviceDate"
                      value={formData.serviceDate}
                      onChange={handleServiceDateChange}
                      required
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label"><strong>End Date</strong></label>
                    <input
                      type="date"
                      className="form-control"
                      name="endDate"
                      value={formData.endDate}
                      onChange={handleEndDateChange}
                      min={formData.serviceDate}
                    />
                    <small className="form-text small small-text">
                      Specify service end date
                    </small>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label"><strong>Days Count</strong></label>
                    <div className="form-control" style={{ backgroundColor: '#e7f3ff', fontWeight: 'bold', color: '#0266f2' }}>
                      {calculateFormDaysCount()} days
                    </div>
                    <small className="form-text">
                      (Including starting date)
                    </small>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label"><strong>Day Amount (₹) *</strong></label>
                    <input
                      type="number"
                      className="form-control"
                      name="dayAmount"
                      value={formData.dayAmount}
                      onChange={handleInputChange}
                      placeholder="Enter per day amount"
                      step="0.01"
                      min="0"
                      required
                    />
                    <small className="form-text text-info">
                      Per day service charge
                    </small>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label"><strong>Invoice Date</strong></label>
                    <input
                      type="date"
                      className="form-control"
                      name="invoiceDate"
                      value={formData.invoiceDate}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label"><strong>Next Payment Due Date</strong></label>
                    <input
                      type="date"
                      className="form-control"
                      name="nextPaymentDate"
                      value={formData.nextPaymentDate || ''}
                      onChange={(e) => {
                        handleInputChange({
                          target: {
                            name: 'nextPaymentDate',
                            value: e.target.value || null
                          }
                        });
                      }}
                      placeholder="Select next payment due date"
                    />
                    <small className="form-text small small-text">
                      Optional: Clear to remove due date
                    </small>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label"><strong>Gap if any</strong></label>
                    <input
                      type="text"
                      className="form-control"
                      name="gapIfAny"
                      value={formData.gapIfAny}
                      onChange={handleInputChange}
                      placeholder="Enter any service gaps..."
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label"><strong>Traveling Charges (₹)</strong></label>
                    <input
                      type="number"
                      className="form-control"
                      name="travelingCharges"
                      value={formData.travelingCharges}
                      onChange={handleInputChange}
                      placeholder="₹0.00"
                      step="0.01"
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label"><strong>Extra Charges (₹)</strong></label>
                    <input
                      type="number"
                      className="form-control"
                      name="extraCharges"
                      value={formData.extraCharges}
                      onChange={handleInputChange}
                      placeholder="₹0.00"
                      step="0.01"
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label"><strong>Calculated Amount</strong></label>
                    <div className="form-control" style={{ backgroundColor: '#fff3cd', fontWeight: 'bold', color: '#856404' }}>
                      ₹{formatAmount(calculateInvoiceAmount(calculateFormDaysCount(), formData.dayAmount))}
                    </div>
                    <small className="form-text text-warning">
                      Days ({calculateFormDaysCount()}) × Amount (₹{formatAmount(formData.dayAmount)})
                    </small>
                  </div>

                  <div className="col-md-12">
                    <label className="form-label"><strong>Additional Comments</strong></label>
                    <textarea
                      className="form-control"
                      rows="3"
                      name="additionalComments"
                      value={formData.additionalComments}
                      onChange={handleInputChange}
                      placeholder="Enter any additional comments or notes..."
                    />
                  </div>

                  <div className="col-md-12">
                    <label className="form-label"><strong>Remarks</strong></label>
                    <textarea
                      className="form-control"
                      rows="3"
                      name="remarks"
                      value={formData.remarks}
                      onChange={handleInputChange}
                      placeholder="Enter remarks..."
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleApply}
            >
              Apply to Invoice
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomInvoiceForm;