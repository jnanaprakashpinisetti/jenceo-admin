import React from 'react';

const PaymentModal = ({ 
  paymentData, 
  setPaymentData, 
  setShowPaymentModal, 
  handlePaymentSubmit,
  generatedInvoiceNumber,
  company,
  formatAmount,
  calculateTotalAmount,
  invoiceData,
  paymentDetails
}) => {
  return (
    <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 1070 }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header bg-primary text-white">
            <h5 className="modal-title">
              <i className="bi bi-cash-stack me-2"></i>
              Record Payment
            </h5>
            <button
              type="button"
              className="btn-close btn-close-white"
              onClick={() => setShowPaymentModal(false)}
            />
          </div>
          <div className="modal-body">
            <div className="alert alert-info">
              <i className="bi bi-info-circle me-2"></i>
              Record a new payment for the current invoice.
            </div>

            <div className="mb-3">
              <label className="form-label"><strong>Amount Paid (₹)*</strong></label>
              <input
                type="number"
                className="form-control"
                value={paymentData.amount}
                onChange={(e) => setPaymentData(prev => ({ ...prev, amount: e.target.value }))}
                placeholder="Enter amount"
                step="0.01"
                min="0"
                required
              />
            </div>

            <div className="mb-3">
              <label className="form-label"><strong>Payment Date*</strong></label>
              <input
                type="date"
                className="form-control"
                value={paymentData.date}
                onChange={(e) => setPaymentData(prev => ({ ...prev, date: e.target.value }))}
                required
              />
            </div>

            <div className="mb-3">
              <label className="form-label"><strong>Remarks</strong></label>
              <textarea
                className="form-control"
                rows="3"
                value={paymentData.remarks}
                onChange={(e) => setPaymentData(prev => ({ ...prev, remarks: e.target.value }))}
                placeholder="Enter payment remarks..."
              />
            </div>

            <div className="alert alert-warning">
              <i className="bi bi-exclamation-triangle me-2"></i>
              <strong>Current Invoice Details:</strong><br />
              Invoice #: {generatedInvoiceNumber}<br />
              Company: {company?.companyName || 'N/A'}<br />
              Total Amount: ₹{formatAmount(calculateTotalAmount(invoiceData))}<br />
              Paid So Far: ₹{formatAmount(paymentDetails?.totalPaid || 0)}
            </div>
          </div>
          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowPaymentModal(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handlePaymentSubmit}
              disabled={!paymentData.amount || !paymentData.date}
            >
              <i className="bi bi-check-lg me-1"></i>
              Record Payment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;