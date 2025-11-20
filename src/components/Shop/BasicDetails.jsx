// src/components/Customer/BasicDetails.jsx
import React, { useMemo, useState } from 'react';

const BasicDetails = ({ customer, totalAmount, paymentHistory, PurchaseItems, Payments, Balance }) => {
    const [selectedPayment, setSelectedPayment] = useState(null);
    const [showPaymentModal, setShowPaymentModal] = useState(false);

    // Get character badge color and label
    const getCharacterInfo = (character) => {
        switch (character) {
            case 'very-good': return { color: 'success', label: 'Very Good' };
            case 'good': return { color: 'info', label: 'Good' };
            case 'average': return { color: 'warning', label: 'Average' };
            case 'bad': return { color: 'danger', label: 'Bad' };
            case 'worst': return { color: 'dark', label: 'Worst' };
            default: return { color: 'secondary', label: 'Not Rated' };
        }
    };

    // Generate payment ID in format: CustomerID-Month-Day-index
    const generatePaymentId = (payment, index) => {
        const date = new Date(payment.date);
        const month = date.toLocaleDateString('en-US', { month: 'short' });
        const day = date.getDate();
        const customerId = customer?.id?.substring(0, 3) || 'C01'; // Use first 3 chars of customer ID
        return `${customerId}-${month}-${day}-${index}`;
    };

    // UPDATED: Enhanced financialSummary using Balance data and PurchaseItems
    const financialSummary = useMemo(() => {
        // Use Balance data if available (primary source)
        if (Balance && Balance.totalPurchase !== undefined) {
            console.log('Using Balance data for financial summary:', Balance);
            return {
                totalPurchase: parseFloat(Balance.totalPurchase) || 0,
                totalPaid: parseFloat(Balance.totalPaid) || 0,
                totalPending: parseFloat(Balance.totalPending) || 0,
                lastPaymentDate: Balance.lastPaymentDate || 'N/A',
                paymentCount: Payments?.length || 0
            };
        }

        // Calculate from PurchaseItems and Payments as fallback
        let totalPurchase = 0;
        let totalPaid = 0;

        // Calculate from PurchaseItems
        if (PurchaseItems && PurchaseItems.length > 0) {
            PurchaseItems.forEach(item => {
                const itemTotal = parseFloat(item.total) || 0;
                totalPurchase += itemTotal;

                if (item.status === 'paid') {
                    totalPaid += itemTotal;
                }
            });
        }

        // Also add payments from Payments collection
        if (Payments && Payments.length > 0) {
            Payments.forEach(payment => {
                totalPaid += parseFloat(payment.amount) || 0;
            });
        }

        const totalPending = Math.max(0, totalPurchase - totalPaid);

        // Find last payment date
        let lastPaymentDate = 'N/A';
        if (Payments && Payments.length > 0) {
            const sortedPayments = [...Payments].sort((a, b) => new Date(b.date) - new Date(a.date));
            lastPaymentDate = sortedPayments[0]?.date || 'N/A';
        }

        return {
            totalPurchase,
            totalPaid,
            totalPending,
            lastPaymentDate,
            paymentCount: Payments?.length || 0
        };
    }, [PurchaseItems, Balance, Payments]);

    // Handle payment row click to show modal
    const handlePaymentRowClick = (payment, index) => {
        const paymentId = generatePaymentId(payment, index);
        setSelectedPayment({
            ...payment,
            displayId: paymentId
        });
        setShowPaymentModal(true);
    };

    // Close modal
    const handleCloseModal = () => {
        setShowPaymentModal(false);
        setSelectedPayment(null);
    };

    // UPDATED: Monthly payments calculation using Payments data
    const monthlyPayments = useMemo(() => {
        // Use Payments data for accurate monthly breakdown
        if (Payments && Payments.length > 0) {
            const monthlyData = {};

            Payments.forEach(payment => {
                if (!payment.date) return;

                const date = new Date(payment.date);
                const monthYear = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
                const monthName = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });

                if (!monthlyData[monthYear]) {
                    monthlyData[monthYear] = {
                        month: monthName,
                        totalAmount: 0,
                        paidAmount: 0,
                        balance: 0,
                        payments: []
                    };
                }

                const paymentAmount = parseFloat(payment.amount) || 0;
                monthlyData[monthYear].paidAmount += paymentAmount;
                monthlyData[monthYear].payments.push(payment);
            });

            // Calculate total amounts for each month from PurchaseItems
            if (PurchaseItems && PurchaseItems.length > 0) {
                PurchaseItems.forEach(item => {
                    if (!item.date) return;

                    const date = new Date(item.date);
                    const monthYear = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;

                    if (monthlyData[monthYear]) {
                        const itemAmount = parseFloat(item.total) || 0;
                        monthlyData[monthYear].totalAmount += itemAmount;
                    }
                });
            }

            // Calculate balance for each month
            Object.keys(monthlyData).forEach(monthKey => {
                monthlyData[monthKey].balance = monthlyData[monthKey].totalAmount - monthlyData[monthKey].paidAmount;
            });

            const monthlyArray = Object.values(monthlyData);

            // Sort by date descending
            monthlyArray.sort((a, b) => {
                const dateA = new Date(a.payments[0]?.date || 0);
                const dateB = new Date(b.payments[0]?.date || 0);
                return dateB - dateA;
            });

            return monthlyArray;
        }

        // Fallback to old calculation if no Payments data
        if (!PurchaseItems || PurchaseItems.length === 0) {
            return [];
        }

        const monthlyData = {};

        // Process paid items from PurchaseItems
        PurchaseItems.filter(item => item.status === 'paid').forEach(item => {
            if (!item.paymentDate && !item.date) return;

            const paymentDate = item.paymentDate || item.date;
            const date = new Date(paymentDate);
            const monthYear = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
            const monthName = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });

            if (!monthlyData[monthYear]) {
                monthlyData[monthYear] = {
                    month: monthName,
                    totalAmount: 0,
                    paidAmount: 0,
                    balance: 0,
                    payments: []
                };
            }

            const itemAmount = parseFloat(item.total) || 0;
            monthlyData[monthYear].totalAmount += itemAmount;
            monthlyData[monthYear].paidAmount += itemAmount;
            monthlyData[monthYear].balance = monthlyData[monthYear].totalAmount - monthlyData[monthYear].paidAmount;
            monthlyData[monthYear].payments.push({
                ...item,
                paymentDate: paymentDate
            });
        });

        const monthlyArray = Object.values(monthlyData);

        // Sort by date descending
        monthlyArray.sort((a, b) => {
            const dateA = new Date(a.payments[0]?.paymentDate || 0);
            const dateB = new Date(b.payments[0]?.paymentDate || 0);
            return dateB - dateA;
        });

        return monthlyArray;
    }, [PurchaseItems, Payments]);

    // Calculate total purchases count from purchase items
    const totalPurchasesCount = useMemo(() => {
        if (PurchaseItems && PurchaseItems.length > 0) {
            return PurchaseItems.length;
        }
        return customer?.totalPurchases || 0;
    }, [PurchaseItems, customer]);

    const characterInfo = getCharacterInfo(customer?.character);

    return (
        <div className="row g-4">
            {/* Customer Information */}
            <div className="col-md-6">
                <div className="card border-0 shadow-lg h-100" style={{
                    background: "linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.95) 100%)",
                    borderRadius: "12px",
                    border: "1px solid rgba(99, 102, 241, 0.4)",
                    backdropFilter: "blur(10px)"
                }}>
                    <div className="card-header border-0 py-3" style={{
                        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                        borderRadius: "12px 12px 0 0",
                        borderBottom: "2px solid rgba(255, 255, 255, 0.2)"
                    }}>
                        <h6 className="text-white mb-0 fw-bold d-flex align-items-center">
                            <i className="fas fa-user-circle me-2 fs-5"></i>
                            Customer Information
                        </h6>
                    </div>
                    <div className="card-body p-0">
                        <div className="table-responsive">
                            <table className="table table-dark table-borderless align-middle mb-0" style={{
                                background: "transparent"
                            }}>
                                <tbody>
                                    <tr style={{
                                        borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                                        background: "rgba(99, 102, 241, 0.1)"
                                    }}>
                                        <td className="ps-4 py-3" style={{ width: '40%', borderRight: "1px solid rgba(255, 255, 255, 0.1)" }}>
                                            <span className="text-light fw-semibold d-flex align-items-center">
                                                <i className="fas fa-signature me-2 text-info fs-6"></i>
                                                Full Name
                                            </span>
                                        </td>
                                        <td className="py-3 pe-4">
                                            <span className="text-warning fw-bold fs-6">{customer?.name || 'N/A'}</span>
                                        </td>
                                    </tr>
                                    <tr style={{
                                        borderBottom: "1px solid rgba(255, 255, 255, 0.1)"
                                    }}>
                                        <td className="ps-4 py-3" style={{ width: '40%', borderRight: "1px solid rgba(255, 255, 255, 0.1)" }}>
                                            <span className="text-light fw-semibold d-flex align-items-center">
                                                <i className="fas fa-id-card me-2 text-primary fs-6"></i>
                                                ID Number
                                            </span>
                                        </td>
                                        <td className="py-3 pe-4">
                                            <span className="text-info fw-bold fs-6">{customer?.idNo || 'N/A'}</span>
                                        </td>
                                    </tr>
                                    <tr style={{
                                        borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                                        background: "rgba(99, 102, 241, 0.1)"
                                    }}>
                                        <td className="ps-4 py-3" style={{ width: '40%', borderRight: "1px solid rgba(255, 255, 255, 0.1)" }}>
                                            <span className="text-light fw-semibold d-flex align-items-center">
                                                <i className="fas fa-phone me-2 text-success fs-6"></i>
                                                Phone Number
                                            </span>
                                        </td>
                                        <td className="py-3 pe-4">
                                            <span className="text-light fw-bold">{customer?.phone || 'N/A'}</span>
                                        </td>
                                    </tr>
                                    <tr style={{
                                        borderBottom: "1px solid rgba(255, 255, 255, 0.1)"
                                    }}>
                                        <td className="ps-4 py-3" style={{ width: '40%', borderRight: "1px solid rgba(255, 255, 255, 0.1)" }}>
                                            <span className="text-light fw-semibold d-flex align-items-center">
                                                <i className="fas fa-map-marker-alt me-2 text-warning fs-6"></i>
                                                Address
                                            </span>
                                        </td>
                                        <td className="py-3 pe-4">
                                            <span className="text-light fw-bold text-end" style={{ maxWidth: '200px', lineHeight: '1.2' }}>
                                                {customer?.address || 'N/A'}
                                            </span>
                                        </td>
                                    </tr>
                                    <tr style={{
                                        background: "rgba(99, 102, 241, 0.1)"
                                    }}>
                                        <td className="ps-4 py-3" style={{ width: '40%', borderRight: "1px solid rgba(255, 255, 255, 0.1)" }}>
                                            <span className="text-light fw-semibold d-flex align-items-center">
                                                <i className="fas fa-star me-2 text-warning fs-6"></i>
                                                Character Rating
                                            </span>
                                        </td>
                                        <td className="py-3 pe-4">
                                            <span className={`badge bg-${characterInfo.color} fw-bold px-3 py-2`} style={{
                                                fontSize: '0.75rem',
                                                borderRadius: '20px'
                                            }}>
                                                {characterInfo.label}
                                            </span>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* Financial Summary */}
            <div className="col-md-6">
                <div className="card border-0 shadow-lg h-100" style={{
                    background: "linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.95) 100%)",
                    borderRadius: "12px",
                    border: "1px solid rgba(16, 185, 129, 0.4)",
                    backdropFilter: "blur(10px)"
                }}>
                    <div className="card-header border-0 py-3" style={{
                        background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
                        borderRadius: "12px 12px 0 0",
                        borderBottom: "2px solid rgba(255, 255, 255, 0.2)"
                    }}>
                        <h6 className="text-white mb-0 fw-bold d-flex align-items-center">
                            <i className="fas fa-chart-bar me-2 fs-5"></i>
                            Financial Summary
                        </h6>
                    </div>
                    <div className="card-body p-0">
                        <div className="table-responsive">
                            <table className="table table-dark table-borderless align-middle mb-0" style={{
                                background: "transparent"
                            }}>
                                <tbody>
                                    <tr style={{
                                        borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                                        background: "rgba(16, 185, 129, 0.1)"
                                    }}>
                                        <td className="ps-4 py-3" style={{ width: '40%', borderRight: "1px solid rgba(255, 255, 255, 0.1)" }}>
                                            <span className="text-light fw-semibold d-flex align-items-center">
                                                <i className="fas fa-shopping-cart me-2 text-warning fs-6"></i>
                                                Total Purchase
                                            </span>
                                        </td>
                                        <td className="py-3 pe-4">
                                            <span className="text-warning fw-bold fs-6 d-flex align-items-center justify-content-end">
                                                ₹{financialSummary.totalPurchase.toFixed(2)}
                                                <i className="fas fa-arrow-up text-success ms-2 fs-7"></i>
                                            </span>
                                        </td>
                                    </tr>
                                    <tr style={{
                                        borderBottom: "1px solid rgba(255, 255, 255, 0.1)"
                                    }}>
                                        <td className="ps-4 py-3" style={{ width: '40%', borderRight: "1px solid rgba(255, 255, 255, 0.1)" }}>
                                            <span className="text-light fw-semibold d-flex align-items-center">
                                                <i className="fas fa-credit-card me-2 text-success fs-6"></i>
                                                Total Paid
                                            </span>
                                        </td>
                                        <td className="py-3 pe-4">
                                            <span className="text-success fw-bold fs-6 d-flex align-items-center justify-content-end">
                                                ₹{financialSummary.totalPaid.toFixed(2)}
                                                <i className="fas fa-check-circle text-success ms-2 fs-7"></i>
                                            </span>
                                        </td>
                                    </tr>
                                    <tr style={{
                                        borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                                        background: "rgba(16, 185, 129, 0.1)"
                                    }}>
                                        <td className="ps-4 py-3" style={{ width: '40%', borderRight: "1px solid rgba(255, 255, 255, 0.1)" }}>
                                            <span className="text-light fw-semibold d-flex align-items-center">
                                                <i className="fas fa-clock me-2 text-danger fs-6"></i>
                                                Pending Amount
                                            </span>
                                        </td>
                                        <td className="py-3 pe-4">
                                            <span className="text-danger fw-bold fs-6 d-flex align-items-center justify-content-end">
                                                ₹{financialSummary.totalPending.toFixed(2)}
                                                <i className="fas fa-exclamation-triangle text-danger ms-2 fs-7"></i>
                                            </span>
                                        </td>
                                    </tr>
                                    <tr style={{
                                        borderBottom: "1px solid rgba(255, 255, 255, 0.1)"
                                    }}>
                                        <td className="ps-4 py-3" style={{ width: '40%', borderRight: "1px solid rgba(255, 255, 255, 0.1)" }}>
                                            <span className="text-light fw-semibold d-flex align-items-center">
                                                <i className="fas fa-calendar-check me-2 text-info fs-6"></i>
                                                Last Payment
                                            </span>
                                        </td>
                                        <td className="py-3 pe-4">
                                            <span className="text-light fw-bold d-flex align-items-center justify-content-end">
                                                {financialSummary.lastPaymentDate}
                                                <i className="fas fa-history text-info ms-2 fs-7"></i>
                                            </span>
                                        </td>
                                    </tr>
                                    <tr style={{
                                        background: "rgba(16, 185, 129, 0.1)"
                                    }}>
                                        <td className="ps-4 py-3" style={{ width: '40%', borderRight: "1px solid rgba(255, 255, 255, 0.1)" }}>
                                            <span className="text-light fw-semibold d-flex align-items-center">
                                                <i className="fas fa-receipt me-2 text-primary fs-6"></i>
                                                Total Payments
                                            </span>
                                        </td>
                                        <td className="py-3 pe-4">
                                            <span className="text-info fw-bold d-flex align-items-center justify-content-end">
                                                {financialSummary.paymentCount}
                                                <i className="fas fa-file-invoice-dollar text-primary ms-2 fs-7"></i>
                                            </span>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* Monthly Payment History */}
            <div className="col-12">
                <div className="card border-0 shadow-lg" style={{
                    background: "linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.8) 100%)",
                    borderRadius: "15px",
                    border: "1px solid rgba(99, 102, 241, 0.3)"
                }}>
                    <div className="card-header border-0" style={{
                        background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)",
                        borderRadius: "15px 15px 0 0"
                    }}>
                        <h6 className="text-white mb-0 fw-bold">
                            <i className="fas fa-history me-2"></i>
                            Payment History
                        </h6>
                    </div>
                    <div className="card-body p-0">
                        {Payments && Payments.length === 0 ? (
                            <div className="text-center py-4 text-muted">
                                <i className="fas fa-receipt fa-2x mb-3"></i>
                                <p>No payment history available</p>
                            </div>
                        ) : (
                            <div className="table-responsive">
                                <table className="table table-dark table-hover align-middle mb-0">
                                    <thead>
                                        <tr style={{
                                            background: "linear-gradient(135deg, #0369a1 0%, #0c4a6e 100%)"
                                        }}>
                                            <th className="text-center">Date</th>
                                            <th className="text-center">Payment ID</th>
                                            <th className="text-center">Amount</th>
                                            <th className="text-center">Method</th>
                                            <th className="text-center">Items Paid</th>
                                            <th className="text-center">Notes</th>
                                            <th className="text-center">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Payments && Payments.sort((a, b) => new Date(b.date) - new Date(a.date)).map((payment, index) => (
                                            <tr
                                                key={payment.id}
                                                style={{
                                                    background: index % 2 === 0
                                                        ? "rgba(30, 41, 59, 0.7)"
                                                        : "rgba(51, 65, 85, 0.7)",
                                                    cursor: "pointer"
                                                }}
                                                onClick={() => handlePaymentRowClick(payment, index)}
                                            >
                                                <td className="text-center fw-bold text-info">
                                                    {new Date(payment.date).toLocaleDateString()}
                                                </td>
                                                <td className="text-center text-light small fw-bold">
                                                    {generatePaymentId(payment, index)}
                                                </td>
                                                <td className="text-center text-success fw-bold fs-6">
                                                    ₹{parseFloat(payment.amount).toFixed(2)}
                                                </td>
                                                <td className="text-center">
                                                    <span className="badge bg-primary text-capitalize">
                                                        {payment.method}
                                                    </span>
                                                </td>
                                                <td className="text-center text-warning fw-bold">
                                                    {payment.items?.length || 0}
                                                </td>
                                                <td className="text-center text-light">
                                                    {payment.notes || 'No notes'}
                                                </td>
                                                <td className="text-center">
                                                    <span className="badge bg-success">
                                                        <i className="fas fa-check me-1"></i>
                                                        Completed
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Payment Details Modal */}
            {showPaymentModal && selectedPayment && (
                <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,1)' }}>
                    <div className="modal-dialog modal-lg modal-dialog-centered">
                        <div className="modal-content border-0 shadow-lg" style={{
                            background: "linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.95) 100%)",
                            borderRadius: "15px",
                            border: "2px solid rgba(99, 102, 241, 0.5)"
                        }}>
                            <div className="modal-header border-0" style={{
                                background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)",
                                borderRadius: "15px 15px 0 0"
                            }}>
                                <h5 className="modal-title text-white fw-bold">
                                    <i className="fas fa-receipt me-2"></i>
                                    Payment Details  :{selectedPayment.displayId}
                                </h5>
                                <button
                                    type="button"
                                    className="btn-close btn-close-white"
                                    onClick={handleCloseModal}
                                ></button>
                            </div>
                            <div className="modal-body">
                                <div className="row g-3">
                                    <div className="col-md-6">
                                        <div className="p-3 rounded" style={{
                                            background: "rgba(99, 102, 241, 0.1)",
                                            border: "1px solid rgba(99, 102, 241, 0.3)"
                                        }}>
                                            <h6 className="text-info mb-2">
                                                <i className="fas fa-calendar me-2"></i>
                                                Payment Date
                                            </h6>
                                            <p className="text-light mb-0 fw-bold">
                                                {new Date(selectedPayment.date).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <div className="p-3 rounded" style={{
                                            background: "rgba(34, 197, 94, 0.1)",
                                            border: "1px solid rgba(34, 197, 94, 0.3)"
                                        }}>
                                            <h6 className="text-success mb-2">
                                                <i className="fas fa-money-bill-wave me-2"></i>
                                                Amount
                                            </h6>
                                            <p className="text-success fw-bold fs-5 mb-0">
                                                ₹{parseFloat(selectedPayment.amount).toFixed(2)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <div className="p-3 rounded" style={{
                                            background: "rgba(59, 130, 246, 0.1)",
                                            border: "1px solid rgba(59, 130, 246, 0.3)"
                                        }}>
                                            <h6 className="text-primary mb-2">
                                                <i className="fas fa-credit-card me-2"></i>
                                                Payment Method
                                            </h6>
                                            <p className="text-light mb-0 fw-bold text-capitalize">
                                                {selectedPayment.method}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <div className="p-3 rounded" style={{
                                            background: "rgba(245, 158, 11, 0.1)",
                                            border: "1px solid rgba(245, 158, 11, 0.3)"
                                        }}>
                                            <h6 className="text-warning mb-2">
                                                <i className="fas fa-cube me-2"></i>
                                                Items Paid
                                            </h6>
                                            <p className="text-warning fw-bold fs-5 mb-0">
                                                {selectedPayment.items?.length || 0}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="col-12">
                                        <div className="p-3 rounded" style={{
                                            background: "rgba(107, 114, 128, 0.1)",
                                            border: "1px solid rgba(107, 114, 128, 0.3)"
                                        }}>
                                            <h6 className="text-light mb-2">
                                                <i className="fas fa-sticky-note me-2"></i>
                                                Notes
                                            </h6>
                                            <p className="text-light mb-0">
                                                {selectedPayment.notes || 'No additional notes'}
                                            </p>
                                        </div>
                                    </div>
                                    {selectedPayment.items && selectedPayment.items.length > 0 && (
                                        <div className="col-12">
                                            <div className="p-3 rounded" style={{
                                                background: "rgba(16, 185, 129, 0.1)",
                                                border: "1px solid rgba(16, 185, 129, 0.3)"
                                            }}>
                                                <h6 className="text-success mb-3">
                                                    <i className="fas fa-list me-2"></i>
                                                    Items Included in this Payment
                                                </h6>
                                                <div className="table-responsive">
                                                    <table className="table table-dark table-sm table-borderless mb-0">
                                                        <thead>
                                                            <tr>
                                                                <th className="text-start">Item Name</th>
                                                                <th className="text-end">Amount</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {selectedPayment.items.map((item, idx) => (
                                                                <tr key={idx} style={{
                                                                    borderBottom: "1px solid rgba(255, 255, 255, 0.1)"
                                                                }}>
                                                                    <td className="text-light">{item.name}</td>
                                                                    <td className="text-success text-end fw-bold">
                                                                        ₹{parseFloat(item.amount).toFixed(2)}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    <div className="col-12">
                                        <div className="p-3 rounded" style={{
                                            background: "rgba(139, 92, 246, 0.1)",
                                            border: "1px solid rgba(139, 92, 246, 0.3)"
                                        }}>
                                            <h6 className="text-purple mb-2">
                                                <i className="fas fa-user me-2"></i>
                                                Processed By
                                            </h6>
                                            <p className="text-light mb-0">
                                                {selectedPayment.createdBy?.name || 'Unknown'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer border-0">
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={handleCloseModal}
                                >
                                    <i className="fas fa-times me-2"></i>
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Additional Details */}
            <div className="col-12">
                <div className="card border-0 shadow-lg" style={{
                    background: "linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.8) 100%)",
                    borderRadius: "15px",
                    border: "1px solid rgba(99, 102, 241, 0.3)"
                }}>
                    <div className="card-header border-0" style={{
                        background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                        borderRadius: "15px 15px 0 0"
                    }}>
                        <h6 className="text-white mb-0 fw-bold">
                            <i className="fas fa-info-circle me-2"></i>
                            Additional Information
                        </h6>
                    </div>
                    <div className="card-body">
                        <div className="row g-4">
                            <div className="col-md-4">
                                <div className="text-center p-3 rounded" style={{
                                    background: "rgba(99, 102, 241, 0.1)",
                                    border: "1px solid rgba(99, 102, 241, 0.3)"
                                }}>
                                    <i className="fas fa-shopping-cart fa-2x text-primary mb-2"></i>
                                    <h6 className="text-light mb-1">Total Purchases</h6>
                                    <span className="text-warning fw-bold fs-5">
                                        {totalPurchasesCount}
                                    </span>
                                </div>
                            </div>
                            <div className="col-md-4">
                                <div className="text-center p-3 rounded" style={{
                                    background: "rgba(34, 197, 94, 0.1)",
                                    border: "1px solid rgba(34, 197, 94, 0.3)"
                                }}>
                                    <i className="fas fa-credit-card fa-2x text-success mb-2"></i>
                                    <h6 className="text-light mb-1">Payments Made</h6>
                                    <span className="text-success fw-bold fs-5">
                                        {financialSummary.paymentCount}
                                    </span>
                                </div>
                            </div>
                            <div className="col-md-4">
                                <div className="text-center p-3 rounded" style={{
                                    background: "rgba(249, 115, 22, 0.1)",
                                    border: "1px solid rgba(249, 115, 22, 0.3)"
                                }}>
                                    <i className="fas fa-star fa-2x text-warning mb-2"></i>
                                    <h6 className="text-light mb-1">Customer Rating</h6>
                                    <span className="text-warning fw-bold fs-5">
                                        {customer?.rating || '4.5'}/5
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Notes Section */}
            <div className="col-12">
                <div className="card border-0 shadow-lg" style={{
                    background: "linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.8) 100%)",
                    borderRadius: "15px",
                    border: "1px solid rgba(99, 102, 241, 0.3)"
                }}>
                    <div className="card-header border-0 d-flex justify-content-between align-items-center" style={{
                        background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)",
                        borderRadius: "15px 15px 0 0"
                    }}>
                        <h6 className="text-white mb-0 fw-bold">
                            <i className="fas fa-sticky-note me-2"></i>
                            Customer Notes
                        </h6>
                        <button className="btn btn-sm btn-light">
                            <i className="fas fa-edit me-1"></i>
                            Edit
                        </button>
                    </div>
                    <div className="card-body">
                        <p className="text-light mb-0">
                            {customer?.notes || 'No notes available for this customer. Click edit to add notes.'}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BasicDetails;