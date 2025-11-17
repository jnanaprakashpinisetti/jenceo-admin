import React, { useState, useMemo } from 'react';
import firebaseDB from '../../firebase';

const PaymentModal = ({ 
    isOpen, 
    onClose, 
    selectedItems, 
    selectedTotal, 
    onPaymentSuccess,
    customerId
}) => {
    const [paymentData, setPaymentData] = useState({
        paymentType: 'cash',
        paidAmount: '',
        checkNumber: '',
        transactionId: '',
        paymentDate: new Date().toISOString().split('T')[0],
        notes: ''
    });
    const [isProcessing, setIsProcessing] = useState(false);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    // Calculate number of days for selected items
    const numberOfDays = useMemo(() => {
        const dates = new Set();
        selectedItems.forEach(item => {
            if (item.date) dates.add(item.date);
        });
        return dates.size;
    }, [selectedItems]);

    // Calculate balance
    const balance = selectedTotal - (parseFloat(paymentData.paidAmount) || 0);

    const savePaymentToDB = async (paymentInfo) => {
        try {
            const updates = {};
            const paymentKey = `payment_${Date.now()}`;
            const isFullPayment = paymentInfo.balance === 0;

            // 1. Save payment record
            updates[`Shop/CreditData/${customerId}/Payments/${paymentKey}`] = {
                ...paymentInfo,
                id: paymentKey,
                createdAt: new Date().toISOString(),
                status: 'completed'
            };

            // 2. Update selected items status if full payment
            if (isFullPayment) {
                selectedItems.forEach(item => {
                    updates[`Shop/CreditData/${customerId}/CustomerItems/${item.id}/status`] = 'paid';
                    updates[`Shop/CreditData/${customerId}/CustomerItems/${item.id}/lastPaymentDate`] = new Date().toISOString();
                    updates[`Shop/CreditData/${customerId}/CustomerItems/${item.id}/paymentId`] = paymentKey;
                });
            } else {
                // For partial payments, update the items with partial payment info
                selectedItems.forEach(item => {
                    updates[`Shop/CreditData/${customerId}/CustomerItems/${item.id}/lastPaymentDate`] = new Date().toISOString();
                    updates[`Shop/CreditData/${customerId}/CustomerItems/${item.id}/paymentId`] = paymentKey;
                });
            }

            await firebaseDB.update(updates);
            
            return {
                id: paymentKey,
                ...paymentInfo,
                createdAt: new Date().toISOString(),
                status: 'completed'
            };
        } catch (error) {
            throw new Error(`Failed to save payment: ${error.message}`);
        }
    };

    const showError = (message) => {
        setErrorMessage(message);
        setShowErrorModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!paymentData.paidAmount || parseFloat(paymentData.paidAmount) <= 0) {
            showError('Please enter a valid payment amount');
            return;
        }

        if (balance < 0) {
            showError('Payment amount cannot exceed total amount');
            return;
        }

        if (!customerId) {
            showError('Customer information is missing. Please try again.');
            return;
        }

        // Create clean payment info
        const paymentInfo = {
            paymentType: paymentData.paymentType,
            paidAmount: parseFloat(paymentData.paidAmount),
            totalAmount: selectedTotal,
            balance: balance,
            items: selectedItems.map(item => ({
                id: item.id || '',
                subCategory: item.subCategory || '',
                quantity: item.quantity || 0,
                price: item.price || 0,
                total: item.total || 0,
                date: item.date || '',
                status: item.status || 'pending'
            })),
            customerId: customerId,
            paymentDate: new Date(paymentData.paymentDate).toISOString(),
            numberOfDays: numberOfDays,
            paymentStatus: balance === 0 ? 'fully_paid' : 'partially_paid',
            isFullPayment: balance === 0,
            ...(paymentData.paymentType === 'online' && { transactionId: paymentData.transactionId || '' }),
            ...(paymentData.paymentType === 'check' && { checkNumber: paymentData.checkNumber || '' }),
            notes: paymentData.notes || ''
        };

        setIsProcessing(true);

        try {
            const savedPayment = await savePaymentToDB(paymentInfo);
            
            if (onPaymentSuccess) {
                onPaymentSuccess(savedPayment, savedPayment.isFullPayment);
            } else {
                showError('Payment completed but there was an issue updating the interface.');
            }
            
            // Reset form
            setPaymentData({
                paymentType: 'cash',
                paidAmount: '',
                checkNumber: '',
                transactionId: '',
                paymentDate: new Date().toISOString().split('T')[0],
                notes: ''
            });

            // Show success modal
            setShowSuccessModal(true);

        } catch (error) {
            showError(`Payment failed: ${error.message}. Please try again.`);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleFullPayment = () => {
        setPaymentData(prev => ({
            ...prev,
            paidAmount: selectedTotal.toFixed(2)
        }));
    };

    const handleClose = () => {
        if (isProcessing) {
            return;
        }
        
        setPaymentData({
            paymentType: 'cash',
            paidAmount: '',
            checkNumber: '',
            transactionId: '',
            paymentDate: new Date().toISOString().split('T')[0],
            notes: ''
        });
        onClose();
    };

    const handleSuccessClose = () => {
        setShowSuccessModal(false);
        onClose();
    };

    if (!isOpen) {
        return null;
    }

    return (
        <>
            {/* Main Payment Modal */}
            <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.8)", backdropFilter: "blur(5px)" }}>
                <div className="modal-dialog modal-lg modal-dialog-centered">
                    <div className="modal-content border-0 shadow-lg" style={{
                        background: "linear-gradient(135deg, #1f2937 0%, #111827 100%)",
                        borderRadius: "20px",
                        border: "2px solid rgba(99, 102, 241, 0.3)"
                    }}>
                        <div className="modal-header border-0" style={{
                            background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
                            borderRadius: "20px 20px 0 0"
                        }}>
                            <h5 className="modal-title text-white fw-bold">
                                <i className="fas fa-credit-card me-2"></i>
                                Payment Details
                            </h5>
                            <button
                                type="button"
                                className="btn-close btn-close-white"
                                onClick={handleClose}
                                disabled={isProcessing}
                            ></button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="modal-body p-4">
                                {/* Processing Overlay */}
                                {isProcessing && (
                                    <div className="processing-overlay" style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        bottom: 0,
                                        background: 'rgba(0,0,0,0.7)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        borderRadius: '20px',
                                        zIndex: 10
                                    }}>
                                        <div className="text-center text-white">
                                            <div className="spinner-border text-primary mb-3" role="status">
                                                <span className="visually-hidden">Processing...</span>
                                            </div>
                                            <h6>Processing Payment...</h6>
                                            <p className="small mb-0">Please wait while we save your payment</p>
                                        </div>
                                    </div>
                                )}

                                {/* Summary Cards */}
                                <div className="row mb-4">
                                    <div className="col-md-4">
                                        <div className="text-center p-3 rounded" style={{
                                            background: "linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(168, 85, 247, 0.2) 100%)",
                                            border: "1px solid rgba(99, 102, 241, 0.3)"
                                        }}>
                                            <i className="fas fa-receipt fa-2x text-primary mb-2"></i>
                                            <h6 className="text-light mb-1">Total Amount</h6>
                                            <h5 className="text-warning fw-bold">₹{selectedTotal.toFixed(2)}</h5>
                                        </div>
                                    </div>
                                    <div className="col-md-4">
                                        <div className="text-center p-3 rounded" style={{
                                            background: "linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(21, 128, 61, 0.2) 100%)",
                                            border: "1px solid rgba(34, 197, 94, 0.3)"
                                        }}>
                                            <i className="fas fa-calendar-day fa-2x text-success mb-2"></i>
                                            <h6 className="text-light mb-1">Number of Days</h6>
                                            <h5 className="text-success fw-bold">{numberOfDays} days</h5>
                                        </div>
                                    </div>
                                    <div className="col-md-4">
                                        <div className="text-center p-3 rounded" style={{
                                            background: "linear-gradient(135deg, rgba(249, 115, 22, 0.2) 0%, rgba(234, 88, 12, 0.2) 100%)",
                                            border: "1px solid rgba(249, 115, 22, 0.3)"
                                        }}>
                                            <i className="fas fa-shopping-cart fa-2x text-warning mb-2"></i>
                                            <h6 className="text-light mb-1">Items Count</h6>
                                            <h5 className="text-warning fw-bold">{selectedItems.length}</h5>
                                        </div>
                                    </div>
                                </div>

                                {/* Payment Form */}
                                <div className="row g-3">
                                    <div className="col-md-6">
                                        <label className="form-label text-light fw-semibold">Payment Type *</label>
                                        <select
                                            className="form-select"
                                            value={paymentData.paymentType}
                                            onChange={(e) => setPaymentData(prev => ({ ...prev, paymentType: e.target.value }))}
                                            required
                                            disabled={isProcessing}
                                            style={{
                                                background: "rgba(30, 41, 59, 0.8)",
                                                border: "1px solid rgba(99, 102, 241, 0.5)",
                                                color: "white"
                                            }}
                                        >
                                            <option value="cash">Cash</option>
                                            <option value="online">Online</option>
                                            <option value="check">Check</option>
                                        </select>
                                    </div>

                                    <div className="col-md-6">
                                        <label className="form-label text-light fw-semibold">Payment Date *</label>
                                        <input
                                            type="date"
                                            className="form-control"
                                            value={paymentData.paymentDate}
                                            onChange={(e) => setPaymentData(prev => ({ ...prev, paymentDate: e.target.value }))}
                                            required
                                            disabled={isProcessing}
                                            style={{
                                                background: "rgba(30, 41, 59, 0.8)",
                                                border: "1px solid rgba(99, 102, 241, 0.5)",
                                                color: "white"
                                            }}
                                        />
                                    </div>

                                    <div className="col-md-8">
                                        <label className="form-label text-light fw-semibold">Paid Amount *</label>
                                        <div className="input-group">
                                            <span className="input-group-text bg-primary text-white">₹</span>
                                            <input
                                                type="number"
                                                className="form-control"
                                                value={paymentData.paidAmount}
                                                onChange={(e) => setPaymentData(prev => ({ ...prev, paidAmount: e.target.value }))}
                                                placeholder="Enter amount"
                                                required
                                                min="0"
                                                max={selectedTotal}
                                                step="0.01"
                                                disabled={isProcessing}
                                                style={{
                                                    background: "rgba(30, 41, 59, 0.8)",
                                                    border: "1px solid rgba(99, 102, 241, 0.5)",
                                                    color: "white"
                                                }}
                                            />
                                        </div>
                                    </div>

                                    <div className="col-md-4">
                                        <label className="form-label text-light fw-semibold">&nbsp;</label>
                                        <button
                                            type="button"
                                            className="btn btn-outline-warning w-100 h-100"
                                            onClick={handleFullPayment}
                                            disabled={isProcessing}
                                        >
                                            Full Payment
                                        </button>
                                    </div>

                                    {paymentData.paymentType === 'online' && (
                                        <div className="col-12">
                                            <label className="form-label text-light fw-semibold">Transaction ID</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                value={paymentData.transactionId}
                                                onChange={(e) => setPaymentData(prev => ({ ...prev, transactionId: e.target.value }))}
                                                placeholder="Enter transaction ID"
                                                disabled={isProcessing}
                                                style={{
                                                    background: "rgba(30, 41, 59, 0.8)",
                                                    border: "1px solid rgba(99, 102, 241, 0.5)",
                                                    color: "white"
                                                }}
                                            />
                                        </div>
                                    )}

                                    {paymentData.paymentType === 'check' && (
                                        <div className="col-12">
                                            <label className="form-label text-light fw-semibold">Check Number</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                value={paymentData.checkNumber}
                                                onChange={(e) => setPaymentData(prev => ({ ...prev, checkNumber: e.target.value }))}
                                                placeholder="Enter check number"
                                                disabled={isProcessing}
                                                style={{
                                                    background: "rgba(30, 41, 59, 0.8)",
                                                    border: "1px solid rgba(99, 102, 241, 0.5)",
                                                    color: "white"
                                                }}
                                            />
                                        </div>
                                    )}

                                    <div className="col-12">
                                        <label className="form-label text-light fw-semibold">Notes (Optional)</label>
                                        <textarea
                                            className="form-control"
                                            value={paymentData.notes}
                                            onChange={(e) => setPaymentData(prev => ({ ...prev, notes: e.target.value }))}
                                            placeholder="Add any notes about this payment..."
                                            rows="2"
                                            disabled={isProcessing}
                                            style={{
                                                background: "rgba(30, 41, 59, 0.8)",
                                                border: "1px solid rgba(99, 102, 241, 0.5)",
                                                color: "white"
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* Balance Summary */}
                                <div className="mt-4 p-3 rounded" style={{
                                    background: balance === 0 
                                        ? "linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(21, 128, 61, 0.2) 100%)"
                                        : "linear-gradient(135deg, rgba(249, 115, 22, 0.2) 0%, rgba(234, 88, 12, 0.2) 100%)",
                                    border: balance === 0 
                                        ? "1px solid rgba(34, 197, 94, 0.3)"
                                        : "1px solid rgba(249, 115, 22, 0.3)"
                                }}>
                                    <div className="row text-center">
                                        <div className="col-md-4">
                                            <h6 className="text-light mb-1">Total Amount</h6>
                                            <h5 className="text-warning fw-bold">₹{selectedTotal.toFixed(2)}</h5>
                                        </div>
                                        <div className="col-md-4">
                                            <h6 className="text-light mb-1">Paid Amount</h6>
                                            <h5 className="text-success fw-bold">₹{(parseFloat(paymentData.paidAmount) || 0).toFixed(2)}</h5>
                                        </div>
                                        <div className="col-md-4">
                                            <h6 className="text-light mb-1">Balance</h6>
                                            <h5 className={`fw-bold ${balance === 0 ? 'text-success' : 'text-warning'}`}>
                                                ₹{balance.toFixed(2)}
                                            </h5>
                                        </div>
                                    </div>
                                </div>

                                {/* Balance Alert */}
                                {balance > 0 ? (
                                    <div className="alert alert-warning mt-3">
                                        <i className="fas fa-exclamation-triangle me-2"></i>
                                        <strong>Partial Payment:</strong> Balance amount of <strong>₹{balance.toFixed(2)}</strong> will remain pending.
                                    </div>
                                ) : (
                                    <div className="alert alert-success mt-3">
                                        <i className="fas fa-check-circle me-2"></i>
                                        <strong>Full Payment:</strong> All selected items will be marked as paid.
                                    </div>
                                )}
                            </div>

                            <div className="modal-footer border-0">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={handleClose}
                                    disabled={isProcessing}
                                >
                                    <i className="fas fa-times me-2"></i>
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-success"
                                    disabled={isProcessing}
                                    style={{
                                        background: isProcessing 
                                            ? "linear-gradient(135deg, #6b7280 0%, #4b5563 100%)" 
                                            : "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                                        border: "none",
                                        minWidth: "120px"
                                    }}
                                >
                                    {isProcessing ? (
                                        <>
                                            <div className="spinner-border spinner-border-sm me-2" role="status">
                                                <span className="visually-hidden">Processing...</span>
                                            </div>
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            <i className="fas fa-check me-2"></i>
                                            Confirm Payment
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            {/* Error Modal */}
            {showErrorModal && (
                <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.8)" }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 shadow-lg">
                            <div className="modal-header border-0 bg-danger text-white">
                                <h5 className="modal-title fw-bold">
                                    <i className="fas fa-exclamation-triangle me-2"></i>
                                    Payment Error
                                </h5>
                            </div>
                            <div className="modal-body py-4">
                                <p className="mb-0">{errorMessage}</p>
                            </div>
                            <div className="modal-footer border-0">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => setShowErrorModal(false)}
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Success Modal */}
            {showSuccessModal && (
                <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.8)" }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 shadow-lg">
                            <div className="modal-header border-0 bg-success text-white">
                                <h5 className="modal-title fw-bold">
                                    <i className="fas fa-check-circle me-2"></i>
                                    Payment Successful
                                </h5>
                            </div>
                            <div className="modal-body py-4">
                                <p className="mb-0">
                                    Payment of <strong>₹{(parseFloat(paymentData.paidAmount) || 0).toFixed(2)}</strong> has been processed successfully.
                                    {balance === 0 ? ' All items have been marked as paid.' : ' This is a partial payment.'}
                                </p>
                            </div>
                            <div className="modal-footer border-0">
                                <button
                                    type="button"
                                    className="btn btn-success"
                                    onClick={handleSuccessClose}
                                >
                                    Continue
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default PaymentModal;