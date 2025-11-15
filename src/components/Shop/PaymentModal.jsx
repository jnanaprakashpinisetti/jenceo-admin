// src/components/Customer/PaymentModal.jsx
import React, { useState, useMemo } from 'react';

const PaymentModal = ({ 
    isOpen, 
    onClose, 
    selectedItems, 
    selectedTotal, 
    onPaymentSuccess,
    customerId,
    onUpdateItemStatus // ADDED: Proper callback for updating item status
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

    // Enhanced save payment function with better error handling
    const savePaymentToDB = async (paymentInfo) => {
        try {
            // Simulate API delay
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // Validate payment data
            if (!paymentInfo.paidAmount || paymentInfo.paidAmount <= 0) {
                throw new Error('Invalid payment amount');
            }

            if (paymentInfo.balance < 0) {
                throw new Error('Payment amount exceeds total amount');
            }

            // Generate a mock payment ID
            const mockPaymentId = 'pay_' + Math.random().toString(36).substr(2, 9);
            
            return {
                id: mockPaymentId,
                ...paymentInfo,
                createdAt: new Date().toISOString(),
                status: 'completed'
            };
        } catch (error) {
            console.error('Error saving payment:', error);
            throw new Error(`Failed to save payment: ${error.message}`);
        }
    };

    // Enhanced update item status function
    const updateItemStatus = async (itemId, status) => {
        try {
            // Simulate API delay
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Call the parent component's update function if provided
            if (onUpdateItemStatus) {
                return await onUpdateItemStatus(itemId, status);
            }
            
            // Fallback to console log if no callback provided
            console.log(`Updating item ${itemId} to status: ${status}`);
            return { success: true, itemId, status };
        } catch (error) {
            console.error('Error updating item status:', error);
            throw new Error(`Failed to update item status: ${error.message}`);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!paymentData.paidAmount || parseFloat(paymentData.paidAmount) <= 0) {
            alert('Please enter a valid payment amount');
            return;
        }

        if (balance < 0) {
            alert('Payment amount cannot exceed total amount');
            return;
        }

        const paymentInfo = {
            ...paymentData,
            paidAmount: parseFloat(paymentData.paidAmount),
            totalAmount: selectedTotal,
            balance: balance,
            items: selectedItems.map(item => ({
                id: item.id,
                subCategory: item.subCategory,
                quantity: item.quantity,
                price: item.price,
                total: item.total,
                date: item.date
            })),
            customerId: customerId,
            paymentDate: new Date(paymentData.paymentDate).toISOString(),
            numberOfDays: numberOfDays,
            status: balance === 0 ? 'fully_paid' : 'partially_paid',
            createdAt: new Date().toISOString()
        };

        setIsProcessing(true);

        try {
            // Save payment to database
            console.log('Saving payment:', paymentInfo);
            const savedPayment = await savePaymentToDB(paymentInfo);
            
            // Update item statuses if full payment
            if (balance === 0) {
                console.log('Updating item statuses to paid');
                const updatePromises = selectedItems.map(item =>
                    updateItemStatus(item.id, 'paid')
                );
                
                const updateResults = await Promise.all(updatePromises);
                console.log('Item status updates completed:', updateResults);
            }

            console.log('Payment successful:', savedPayment);
            
            // Call the success callback with proper parameters
            if (onPaymentSuccess) {
                onPaymentSuccess(savedPayment, balance === 0);
            }
            
            // Reset form and close modal
            setPaymentData({
                paymentType: 'cash',
                paidAmount: '',
                checkNumber: '',
                transactionId: '',
                paymentDate: new Date().toISOString().split('T')[0],
                notes: ''
            });
            
            onClose();
            
        } catch (error) {
            console.error('Payment failed:', error);
            alert(`Payment failed: ${error.message}. Please try again.`);
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
        if (isProcessing) return; // Prevent closing while processing
        
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

    // Real API integration functions (commented out for now)
    /*
    const savePaymentToRealAPI = async (paymentInfo) => {
        const response = await fetch('/api/payments', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(paymentInfo)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to save payment');
        }

        return await response.json();
    };

    const updateItemStatusRealAPI = async (itemId, status) => {
        const response = await fetch(`/api/items/${itemId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ status })
        });

        if (!response.ok) {
            throw new Error('Failed to update item status');
        }

        return await response.json();
    };
    */

    if (!isOpen) return null;

    return (
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
    );
};

export default PaymentModal;