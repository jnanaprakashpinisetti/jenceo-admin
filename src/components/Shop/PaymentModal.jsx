// PaymentModal.jsx - COMPLETELY REWRITTEN VERSION
import React, { useState, useEffect } from 'react';
import firebaseDB from '../../firebase';
import { useAuth } from '../../context/AuthContext';

const PaymentModal = ({ isOpen, onClose, selectedItems, selectedTotal, onPaymentSuccess, customerId, customerData, PurchaseItems }) => {
    const { user: authUser } = useAuth?.() || {};
    const [processingPayment, setProcessingPayment] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState(selectedTotal);
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [paymentNotes, setPaymentNotes] = useState('');
    const [customerBalance, setCustomerBalance] = useState(null);

    // Load customer balance data
    useEffect(() => {
        const loadCustomerBalance = async () => {
            if (!customerId) return;
            
            try {
                const balanceRef = firebaseDB.child(`Shop/CreditData/${customerId}/Balance`);
                const snapshot = await balanceRef.once('value');
                const balanceData = snapshot.val();
                setCustomerBalance(balanceData);
            } catch (error) {
                console.error('Error loading customer balance:', error);
            }
        };

        if (isOpen && customerId) {
            loadCustomerBalance();
        }
    }, [isOpen, customerId]);

    // Reset form when modal opens
    useEffect(() => {
        if (isOpen) {
            setPaymentAmount(selectedTotal);
            setPaymentMethod('cash');
            setPaymentNotes('');
        }
    }, [isOpen, selectedTotal]);

    // UPDATED: Update item status in PurchaseItems
    // In PaymentModal.jsx - UPDATE the updateItemStatusInFirebase function
const updateItemStatusInFirebase = async (customerId, itemIds, status) => {
    try {
        const updates = {};
        const timestamp = new Date().toISOString();
        
        itemIds.forEach(itemId => {
            // Use the correct path structure
            const itemPath = `Shop/CreditData/${customerId}/PurchaseItems/${itemId}`;
            updates[`${itemPath}/status`] = status;
            updates[`${itemPath}/lastPaymentDate`] = timestamp;
            
            if (status === 'paid') {
                updates[`${itemPath}/paymentDate`] = timestamp;
                updates[`${itemPath}/paymentMethod`] = paymentMethod;
                updates[`${itemPath}/lastUpdated`] = timestamp;
            }
        });

        console.log('Updating item status:', updates);
        await firebaseDB.update(updates);
        console.log('Item status updated successfully');
        return true;
    } catch (error) {
        console.error('Error updating item status:', error);
        throw error;
    }
};

    // UPDATED: Save payment record to Payments collection
    const savePaymentRecord = async (paymentData) => {
        try {
            const paymentId = firebaseDB.child(`Shop/CreditData/${customerId}/Payments`).push().key;
            const timestamp = new Date().toISOString();

            const paymentRecord = {
                id: paymentId,
                customerId: customerId,
                customerName: customerData?.name || 'Unknown Customer',
                date: new Date().toISOString().split('T')[0],
                timestamp: timestamp,
                amount: parseFloat(paymentData.amount),
                method: paymentData.method,
                notes: paymentData.notes || '',
                items: paymentData.items.map(item => ({
                    id: item.id,
                    name: item.subCategory,
                    amount: parseFloat(item.total) || 0
                })),
                isFullPayment: paymentData.isFullPayment,
                status: 'completed',
                createdBy: {
                    uid: authUser?.uid || 'unknown',
                    name: authUser?.name || authUser?.displayName || authUser?.email || 'Unknown User'
                },
                createdAt: timestamp
            };

            await firebaseDB.child(`Shop/CreditData/${customerId}/Payments/${paymentId}`).set(paymentRecord);
            console.log('Payment record saved successfully');
            return paymentRecord;
        } catch (error) {
            console.error('Error saving payment record:', error);
            throw error;
        }
    };

    // UPDATED: Update customer balance
    // UPDATED: Update customer balance with correct calculations
const updateCustomerBalance = async (paymentAmount, isFullPayment) => {
    try {
        const balanceRef = firebaseDB.child(`Shop/CreditData/${customerId}/Balance`);
        const snapshot = await balanceRef.once('value');
        const currentBalance = snapshot.val() || {
            totalPurchase: 0,
            totalPaid: 0,
            totalPending: 0,
            lastPaymentDate: null,
            lastUpdated: new Date().toISOString()
        };

        // Calculate total purchase from all items
        let totalPurchase = 0;
        if (PurchaseItems && PurchaseItems.length > 0) {
            totalPurchase = PurchaseItems.reduce((sum, item) => {
                return sum + (parseFloat(item.total) || 0);
            }, 0);
        }

        // Calculate new balance values
        const newTotalPaid = parseFloat(currentBalance.totalPaid || 0) + parseFloat(paymentAmount);
        const newTotalPending = Math.max(0, totalPurchase - newTotalPaid);

        const updatedBalance = {
            totalPurchase: totalPurchase,
            totalPaid: newTotalPaid,
            totalPending: newTotalPending,
            lastPaymentDate: new Date().toISOString().split('T')[0],
            lastUpdated: new Date().toISOString()
        };

        await balanceRef.set(updatedBalance);
        console.log('Customer balance updated:', updatedBalance);
        return updatedBalance;
    } catch (error) {
        console.error('Error updating customer balance:', error);
        throw error;
    }
};

    // UPDATED: Main payment processing function
    const handleSubmitPayment = async () => {
        if (!paymentAmount || paymentAmount <= 0) {
            alert('Please enter a valid payment amount');
            return;
        }

        if (paymentAmount > selectedTotal) {
            alert('Payment amount cannot exceed the selected items total');
            return;
        }

        setProcessingPayment(true);
        try {
            // Filter only pending items that can be paid
            const payableItems = selectedItems.filter(item => item.status !== 'paid');
            
            if (payableItems.length === 0) {
                alert('No pending items to pay');
                setProcessingPayment(false);
                return;
            }

            console.log('Processing payment for items:', payableItems);

            const isFullPayment = parseFloat(paymentAmount) >= parseFloat(selectedTotal);
            const itemIds = payableItems.map(item => item.id);

            // 1. Save payment record
            const paymentRecord = await savePaymentRecord({
                amount: paymentAmount,
                method: paymentMethod,
                notes: paymentNotes,
                items: payableItems,
                isFullPayment: isFullPayment
            });

            // 2. Update customer balance
            await updateCustomerBalance(paymentAmount, isFullPayment);

            // 3. If full payment, update all payable items to paid
            if (isFullPayment) {
                await updateItemStatusInFirebase(customerId, itemIds, 'paid');
            }

            // 4. Call success callback
            if (onPaymentSuccess) {
                onPaymentSuccess({
                    amount: paymentAmount,
                    method: paymentMethod,
                    date: new Date().toISOString(),
                    items: payableItems,
                    paymentRecord: paymentRecord,
                    isFullPayment: isFullPayment
                }, isFullPayment);
            }

            console.log('Payment processed successfully');
            
        } catch (error) {
            console.error('Payment processing error:', error);
            alert('Payment failed: ' + (error.message || 'Unknown error occurred'));
        } finally {
            setProcessingPayment(false);
        }
    };

    if (!isOpen) return null;

    const balanceAfterPayment = selectedTotal - paymentAmount;

    return (
        <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.8)", backdropFilter: "blur(5px)" }}>
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content border-0 shadow-lg" style={{
                    background: "linear-gradient(135deg, #1f2937 0%, #111827 100%)",
                    borderRadius: "20px",
                    border: "2px solid rgba(16, 185, 129, 0.3)",
                    boxShadow: "0 25px 50px -12px rgba(16, 185, 129, 0.25)"
                }}>
                    {/* Header */}
                    <div className="modal-header border-0 p-3" style={{
                        background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
                        padding: "1.5rem 1.5rem 1rem 1.5rem"
                    }}>
                        <div className="d-flex align-items-center w-100">
                            <div className="flex-shrink-0">
                                <i className="fas fa-credit-card fa-2x text-white"></i>
                            </div>
                            <div className="flex-grow-1 ms-3">
                                <h4 className="modal-title text-white fw-bold mb-1">
                                    Process Payment
                                </h4>
                                <p className="text-white-50 mb-0 small">
                                    {customerData?.name} • {selectedItems.length} items selected
                                </p>
                            </div>
                            <button
                                type="button"
                                className="btn-close btn-close-white flex-shrink-0"
                                onClick={onClose}
                                disabled={processingPayment}
                                style={{ filter: "brightness(0.8)" }}
                            ></button>
                        </div>
                    </div>

                    <div className="modal-body p-4">
                        {/* Payment Summary */}
                        <div className="alert border-0 mb-4" style={{
                            background: "linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(37, 99, 235, 0.05) 100%)",
                            borderLeft: "4px solid #3b82f6",
                            borderRadius: "12px"
                        }}>
                            <div className="d-flex justify-content-between align-items-center">
                                <div>
                                    <h6 className="text-white fw-bold mb-1">
                                        <i className="fas fa-receipt me-2"></i>
                                        Payment Summary
                                    </h6>
                                    <div className="text-light small">
                                        <div>Selected Items: <strong>{selectedItems.length}</strong></div>
                                        <div>Total Due: <strong className="text-warning">₹{selectedTotal.toFixed(2)}</strong></div>
                                    </div>
                                </div>
                                <div className="text-end">
                                    <div className="badge fw-bold px-3 py-2" style={{
                                        background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                                        border: "1px solid rgba(245, 158, 11, 0.5)",
                                        fontSize: "0.9rem"
                                    }}>
                                        Total: ₹{selectedTotal.toFixed(2)}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Payment Amount */}
                        <div className="mb-4">
                            <label className="form-label fw-semibold text-white mb-2">
                                <i className="fas fa-rupee-sign me-2 text-success"></i>
                                Payment Amount <span className="text-danger">*</span>
                            </label>
                            <div className="input-group">
                                <span className="input-group-text bg-dark border-secondary text-white">
                                    <i className="fas fa-indian-rupee-sign"></i>
                                </span>
                                <input 
                                    type="number" 
                                    className="form-control bg-dark text-white border-secondary" 
                                    value={paymentAmount}
                                    onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                                    max={selectedTotal}
                                    min="0"
                                    step="0.01"
                                    disabled={processingPayment}
                                    placeholder="Enter payment amount"
                                />
                            </div>
                            <div className="d-flex justify-content-between mt-2">
                                <small className="text-info">
                                    Max: ₹{selectedTotal.toFixed(2)}
                                </small>
                                <small className={balanceAfterPayment === 0 ? "text-success" : "text-warning"}>
                                    Balance: ₹{balanceAfterPayment.toFixed(2)}
                                </small>
                            </div>
                        </div>

                        {/* Payment Method */}
                        <div className="mb-4">
                            <label className="form-label fw-semibold text-white mb-2">
                                <i className="fas fa-credit-card me-2 text-primary"></i>
                                Payment Method
                            </label>
                            <select 
                                className="form-select bg-dark text-white border-secondary"
                                value={paymentMethod}
                                onChange={(e) => setPaymentMethod(e.target.value)}
                                disabled={processingPayment}
                            >
                                <option value="cash">Cash</option>
                                <option value="card">Card</option>
                                <option value="upi">UPI</option>
                                <option value="bank">Bank Transfer</option>
                                <option value="cheque">Cheque</option>
                            </select>
                        </div>

                        {/* Payment Notes */}
                        <div className="mb-4">
                            <label className="form-label fw-semibold text-white mb-2">
                                <i className="fas fa-sticky-note me-2 text-info"></i>
                                Payment Notes (Optional)
                            </label>
                            <textarea 
                                className="form-control bg-dark text-white border-secondary" 
                                rows="2"
                                value={paymentNotes}
                                onChange={(e) => setPaymentNotes(e.target.value)}
                                disabled={processingPayment}
                                placeholder="Add any notes about this payment..."
                            />
                        </div>

                        {/* Quick Amount Buttons */}
                        <div className="mb-4">
                            <label className="form-label fw-semibold text-white mb-2">
                                <i className="fas fa-bolt me-2 text-warning"></i>
                                Quick Amount
                            </label>
                            <div className="d-flex flex-wrap gap-2">
                                {[selectedTotal * 0.25, selectedTotal * 0.5, selectedTotal * 0.75, selectedTotal].map((amount, index) => (
                                    <button
                                        key={index}
                                        type="button"
                                        className="btn btn-outline-warning btn-sm"
                                        onClick={() => setPaymentAmount(parseFloat(amount.toFixed(2)))}
                                        disabled={processingPayment}
                                        style={{ borderRadius: "8px" }}
                                    >
                                        ₹{amount.toFixed(2)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Final Summary */}
                        <div className="alert border-0 mt-3" style={{
                            background: balanceAfterPayment === 0 
                                ? "linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(22, 163, 74, 0.05) 100%)"
                                : "linear-gradient(135deg, rgba(249, 115, 22, 0.1) 0%, rgba(234, 88, 12, 0.05) 100%)",
                            borderLeft: balanceAfterPayment === 0 ? "4px solid #22c55e" : "4px solid #f97316",
                            borderRadius: "12px"
                        }}>
                            <div className="d-flex justify-content-between align-items-center">
                                <div>
                                    <h6 className={balanceAfterPayment === 0 ? "text-success fw-bold mb-1" : "text-warning fw-bold mb-1"}>
                                        <i className={`fas ${balanceAfterPayment === 0 ? "fa-check-circle" : "fa-info-circle"} me-2`}></i>
                                        {balanceAfterPayment === 0 ? "Full Payment" : "Partial Payment"}
                                    </h6>
                                    <div className="small text-light">
                                        Amount: <strong>₹{paymentAmount.toFixed(2)}</strong>
                                        {balanceAfterPayment > 0 && (
                                            <span> • Remaining: <strong>₹{balanceAfterPayment.toFixed(2)}</strong></span>
                                        )}
                                    </div>
                                </div>
                                {balanceAfterPayment === 0 && (
                                    <i className="fas fa-check-circle text-success fa-lg"></i>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="modal-footer border-0 pt-0 px-4 pb-4">
                        <div className="d-flex gap-3 w-100">
                            <button 
                                type="button" 
                                className="btn flex-fill py-3 fw-bold border-0"
                                onClick={onClose}
                                disabled={processingPayment}
                                style={{
                                    background: "linear-gradient(135deg, #4b5563 0%, #374151 100%)",
                                    color: "white",
                                    borderRadius: "15px",
                                    transition: "all 0.3s ease"
                                }}
                            >
                                <i className="fas fa-times me-2"></i>
                                Cancel
                            </button>
                            <button 
                                type="button" 
                                className="btn flex-fill py-3 fw-bold border-0"
                                onClick={handleSubmitPayment}
                                disabled={processingPayment || paymentAmount <= 0 || paymentAmount > selectedTotal}
                                style={{
                                    background: processingPayment 
                                        ? "linear-gradient(135deg, #6b7280 0%, #4b5563 100%)"
                                        : "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                                    color: "white",
                                    borderRadius: "15px",
                                    transition: "all 0.3s ease",
                                    opacity: (paymentAmount <= 0 || paymentAmount > selectedTotal) ? 0.6 : 1
                                }}
                            >
                                {processingPayment ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm me-2"></span>
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
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PaymentModal;