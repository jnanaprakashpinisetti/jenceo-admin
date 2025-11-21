// src/components/Customer/BasicDetails.jsx
import React, { useMemo, useState, useEffect } from 'react';

const BasicDetails = ({ customer, totalAmount, paymentHistory, PurchaseItems, Payments, Balance }) => {
    const [selectedPayment, setSelectedPayment] = useState(null);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const paymentsPerPage = 5;
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredPayments, setFilteredPayments] = useState([]);

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

    // FIXED: Generate payment ID in format: CustomerID-PurchaseDate-index
    const generatePaymentId = (payment, index) => {
        try {
            const date = new Date(payment.date);
            const month = date.toLocaleDateString('en-US', { month: 'short' });
            const day = date.getDate().toString().padStart(2, '0');
            const customerId = customer?.idNo?.substring(0, 4) || 'C-01';
            const purchaseDate = payment.purchaseDate ? new Date(payment.purchaseDate) : date;
            const purchaseMonth = purchaseDate.toLocaleDateString('en-US', { month: 'short' });
            const purchaseDay = purchaseDate.getDate().toString().padStart(2, '0');
            
            return `${customerId}-${purchaseMonth}-${purchaseDay}-${index + 1}`;
        } catch (error) {
            const customerId = customer?.idNo?.substring(0, 4) || 'C-01';
            return `${customerId}-${index + 1}`;
        }
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

        // Enhanced calculation from PurchaseItems and Payments
        let totalPurchase = 0;
        let totalPaid = 0;

        // Calculate from PurchaseItems (all items)
        if (PurchaseItems && PurchaseItems.length > 0) {
            PurchaseItems.forEach(item => {
                const itemTotal = parseFloat(item.total) || 0;
                totalPurchase += itemTotal;
            });
        }

        // Calculate total paid from Payments collection
        if (Payments && Payments.length > 0) {
            Payments.forEach(payment => {
                totalPaid += parseFloat(payment.amount) || 0;
            });
        }

        // Also add paid amounts from PurchaseItems with status 'paid'
        if (PurchaseItems && PurchaseItems.length > 0) {
            PurchaseItems.forEach(item => {
                if (item.status === 'paid') {
                    const itemTotal = parseFloat(item.total) || 0;
                    // Only add if not already counted in Payments
                    if (!Payments || Payments.length === 0) {
                        totalPaid += itemTotal;
                    }
                }
            });
        }

        const totalPending = Math.max(0, totalPurchase - totalPaid);

        // Find last payment date
        let lastPaymentDate = 'N/A';
        if (Payments && Payments.length > 0) {
            const sortedPayments = [...Payments].sort((a, b) => new Date(b.date) - new Date(a.date));
            lastPaymentDate = sortedPayments[0]?.date ? new Date(sortedPayments[0].date).toLocaleDateString() : 'N/A';
        }

        console.log('Financial Summary:', {
            totalPurchase,
            totalPaid,
            totalPending,
            lastPaymentDate,
            paymentCount: Payments?.length || 0
        });

        return {
            totalPurchase,
            totalPaid,
            totalPending,
            lastPaymentDate,
            paymentCount: Payments?.length || 0
        };
    }, [PurchaseItems, Balance, Payments]);

    // FIXED: Handle payment row click to show modal with proper details
    const handlePaymentRowClick = (payment, index) => {
        const paymentId = generatePaymentId(payment, index);
        setSelectedPayment({
            ...payment,
            displayId: paymentId,
            // Ensure all required fields are present
            date: payment.date || 'N/A',
            amount: payment.amount || 0,
            method: payment.method || 'Cash',
            notes: payment.notes || 'No notes',
            items: payment.items || []
        });
        setShowPaymentModal(true);
    };

    // Close modal
    const handleCloseModal = () => {
        setShowPaymentModal(false);
        setSelectedPayment(null);
    };

    // FIXED: Set reminder function
    const handleSetReminder = () => {
        const customerName = customer?.name || 'Customer';
        const pendingAmount = financialSummary.totalPending;
        
        if (pendingAmount > 0) {
            const message = `Reminder: ${customerName} has a pending amount of ₹${pendingAmount.toFixed(2)}. Please follow up for payment.`;
            
            // For now, show an alert. You can integrate with actual reminder system later
            alert(message);
            
            // Here you can integrate with:
            // 1. Browser notifications
            // 2. Calendar API
            // 3. Email/SMS service
            // 4. Local storage for reminders
            
            console.log('Reminder set for:', customerName, 'Amount:', pendingAmount);
        } else {
            alert('No pending amount for this customer.');
        }
    };

    useEffect(() => {
        if (Payments && Payments.length > 0) {
            const filtered = Payments.filter(payment =>
                payment.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                payment.method?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                payment.amount?.toString().includes(searchTerm) ||
                generatePaymentId(payment, 0).toLowerCase().includes(searchTerm.toLowerCase())
            );
            setFilteredPayments(filtered);
        } else {
            setFilteredPayments([]);
        }
    }, [Payments, searchTerm]);

    const handleSharePaymentToWhatsApp = (payment) => {
        const message = `*Payment Receipt*\n\n` +
            `*Payment ID:* ${payment.displayId}\n` +
            `*Customer:* ${customer?.name || 'N/A'}\n` +
            `*Amount:* ₹${parseFloat(payment.amount).toFixed(2)}\n` +
            `*Date:* ${new Date(payment.date).toLocaleDateString()}\n` +
            `*Method:* ${payment.method}\n` +
            `*Items Paid:* ${payment.items?.length || 0}\n` +
            `*Notes:* ${payment.notes || 'No notes'}\n\n` +
            `Thank you for your payment!`;

        const encodedMessage = encodeURIComponent(message);
        const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;

        window.open(whatsappUrl, '_blank');
    };

    const exportPaymentsToCSV = () => {
        if (!Payments || Payments.length === 0) return;

        const headers = ['Payment ID', 'Date', 'Amount', 'Method', 'Items Count', 'Notes'];
        const csvData = Payments.map((payment, index) => [
            generatePaymentId(payment, index),
            new Date(payment.date).toLocaleDateString(),
            payment.amount,
            payment.method,
            payment.items?.length || 0,
            payment.notes || ''
        ]);

        const csvContent = [headers, ...csvData]
            .map(row => row.map(field => `"${field}"`).join(','))
            .join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `payments_${customer?.name || 'customer'}_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
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

    // Pagination logic
    const sortedPayments = Payments ? [...Payments].sort((a, b) => new Date(b.date) - new Date(a.date)) : [];
    const indexOfLastPayment = currentPage * paymentsPerPage;
    const indexOfFirstPayment = indexOfLastPayment - paymentsPerPage;
    const currentPayments = sortedPayments.slice(indexOfFirstPayment, indexOfLastPayment);
    const totalPages = Math.ceil(sortedPayments.length / paymentsPerPage);

    const handlePageChange = (pageNumber) => {
        setCurrentPage(pageNumber);
    };

    const characterInfo = getCharacterInfo(customer?.character);

    return (
        <div className="row g-4">
            <div className="col-12">
                <div className="card border-0 shadow-lg" style={{
                    background: "linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.8) 100%)",
                    borderRadius: "15px",
                    border: "1px solid rgba(245, 158, 11, 0.3)"
                }}>
                    <div className="card-header border-0" style={{
                        background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                        borderRadius: "15px 15px 0 0"
                    }}>
                        <h6 className="text-white mb-0 fw-bold">
                            <i className="bi bi-lightning me-2"></i>
                            Quick Actions
                        </h6>
                    </div>
                    <div className="card-body">
                        <div className="row g-3">
                            <div className="col-md-3">
                                <button className="btn btn-success w-100" onClick={exportPaymentsToCSV}>
                                    <i className="bi bi-file-earmark-excel me-2"></i>
                                    Export CSV
                                </button>
                            </div>
                            <div className="col-md-3">
                                <button className="btn btn-info w-100" onClick={() => window.print()}>
                                    <i className="bi bi-printer me-2"></i>
                                    Print Summary
                                </button>
                            </div>
                            <div className="col-md-3">
                                <button className="btn btn-warning w-100" onClick={handleSharePaymentToWhatsApp}>
                                    <i className="bi bi-whatsapp me-2"></i>
                                    Share Summary
                                </button>
                            </div>
                            <div className="col-md-3">
                                <button className="btn btn-primary w-100" onClick={handleSetReminder}>
                                    <i className="bi bi-bell me-2"></i>
                                    Set Reminder
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
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
                            <i className="bi bi-person-circle me-2 fs-5"></i>
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
                                                <i className="bi bi-person me-2 text-info fs-6"></i>
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
                                                <i className="bi bi-card-text me-2 text-primary fs-6"></i>
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
                                                <i className="bi bi-telephone me-2 text-success fs-6"></i>
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
                                                <i className="bi bi-geo-alt me-2 text-warning fs-6"></i>
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
                                                <i className="bi bi-star me-2 text-warning fs-6"></i>
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
                            <i className="bi bi-graph-up me-2 fs-5"></i>
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
                                                <i className="bi bi-cart me-2 text-warning fs-6"></i>
                                                Total Purchase
                                            </span>
                                        </td>
                                        <td className="py-3 pe-4">
                                            <span className="text-warning fw-bold fs-6 d-flex align-items-center justify-content-end">
                                                ₹{financialSummary.totalPurchase.toFixed(2)}
                                                <i className="bi bi-arrow-up text-success ms-2 fs-7"></i>
                                            </span>
                                        </td>
                                    </tr>
                                    <tr style={{
                                        borderBottom: "1px solid rgba(255, 255, 255, 0.1)"
                                    }}>
                                        <td className="ps-4 py-3" style={{ width: '40%', borderRight: "1px solid rgba(255, 255, 255, 0.1)" }}>
                                            <span className="text-light fw-semibold d-flex align-items-center">
                                                <i className="bi bi-credit-card me-2 text-success fs-6"></i>
                                                Total Paid
                                            </span>
                                        </td>
                                        <td className="py-3 pe-4">
                                            <span className="text-success fw-bold fs-6 d-flex align-items-center justify-content-end">
                                                ₹{financialSummary.totalPaid.toFixed(2)}
                                                <i className="bi bi-check-circle text-success ms-2 fs-7"></i>
                                            </span>
                                        </td>
                                    </tr>
                                    <tr style={{
                                        borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                                        background: "rgba(16, 185, 129, 0.1)"
                                    }}>
                                        <td className="ps-4 py-3" style={{ width: '40%', borderRight: "1px solid rgba(255, 255, 255, 0.1)" }}>
                                            <span className="text-light fw-semibold d-flex align-items-center">
                                                <i className="bi bi-clock me-2 text-danger fs-6"></i>
                                                Pending Amount
                                            </span>
                                        </td>
                                        <td className="py-3 pe-4">
                                            <span className="text-danger fw-bold fs-6 d-flex align-items-center justify-content-end">
                                                ₹{financialSummary.totalPending.toFixed(2)}
                                                <i className="bi bi-exclamation-triangle text-danger ms-2 fs-7"></i>
                                            </span>
                                        </td>
                                    </tr>
                                    <tr style={{
                                        borderBottom: "1px solid rgba(255, 255, 255, 0.1)"
                                    }}>
                                        <td className="ps-4 py-3" style={{ width: '40%', borderRight: "1px solid rgba(255, 255, 255, 0.1)" }}>
                                            <span className="text-light fw-semibold d-flex align-items-center">
                                                <i className="bi bi-calendar-check me-2 text-info fs-6"></i>
                                                Last Payment
                                            </span>
                                        </td>
                                        <td className="py-3 pe-4">
                                            <span className="text-light fw-bold d-flex align-items-center justify-content-end">
                                                {financialSummary.lastPaymentDate}
                                                <i className="bi bi-clock-history text-info ms-2 fs-7"></i>
                                            </span>
                                        </td>
                                    </tr>
                                    <tr style={{
                                        background: "rgba(16, 185, 129, 0.1)"
                                    }}>
                                        <td className="ps-4 py-3" style={{ width: '40%', borderRight: "1px solid rgba(255, 255, 255, 0.1)" }}>
                                            <span className="text-light fw-semibold d-flex align-items-center">
                                                <i className="bi bi-receipt me-2 text-primary fs-6"></i>
                                                Total Payments
                                            </span>
                                        </td>
                                        <td className="py-3 pe-4">
                                            <span className="text-info fw-bold d-flex align-items-center justify-content-end">
                                                {financialSummary.paymentCount}
                                                <i className="bi bi-file-earmark-text text-primary ms-2 fs-7"></i>
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
                            <i className="bi bi-clock-history me-2"></i>
                            Payment History
                        </h6>
                    </div>
                    <div className="card-body p-0">
                        {Payments && Payments.length === 0 ? (
                            <div className="text-center py-4 text-muted">
                                <i className="bi bi-receipt fa-2x mb-3"></i>
                                <p>No payment history available</p>
                            </div>
                        ) : (
                            <>
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
                                                <th className="text-center">View</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {currentPayments.map((payment, index) => (
                                                <tr
                                                    key={payment.id}
                                                    style={{
                                                        background: index % 2 === 0
                                                            ? "rgba(30, 41, 59, 0.7)"
                                                            : "rgba(51, 65, 85, 0.7)",
                                                        cursor: "pointer"
                                                    }}
                                                    onClick={() => handlePaymentRowClick(payment, index + (currentPage - 1) * paymentsPerPage)}
                                                >
                                                    <td className="text-center fw-bold text-info">
                                                        {new Date(payment.date).toLocaleDateString()}
                                                    </td>
                                                    <td className="text-center text-light small fw-bold">
                                                        {generatePaymentId(payment, index + (currentPage - 1) * paymentsPerPage)}
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
                                                            <i className="bi bi-check me-1"></i>
                                                            Completed
                                                        </span>
                                                    </td>
                                                    <td className="text-center">
                                                        <i className="bi bi-eye text-info fs-5"></i>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Pagination */}
                                {totalPages > 1 && (
                                    <div className="d-flex justify-content-center mt-4 pb-3">
                                        <nav>
                                            <ul className="pagination mb-0">
                                                <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                                                    <button
                                                        className="page-link"
                                                        onClick={() => handlePageChange(currentPage - 1)}
                                                        disabled={currentPage === 1}
                                                    >
                                                        <i className="bi bi-chevron-left"></i>
                                                    </button>
                                                </li>

                                                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                                    <li key={page} className={`page-item ${currentPage === page ? 'active' : ''}`}>
                                                        <button
                                                            className="page-link"
                                                            onClick={() => handlePageChange(page)}
                                                        >
                                                            {page}
                                                        </button>
                                                    </li>
                                                ))}

                                                <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                                                    <button
                                                        className="page-link"
                                                        onClick={() => handlePageChange(currentPage + 1)}
                                                        disabled={currentPage === totalPages}
                                                    >
                                                        <i className="bi bi-chevron-right"></i>
                                                    </button>
                                                </li>
                                            </ul>
                                        </nav>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* FIXED: Payment Details Modal with proper content */}
            {showPaymentModal && selectedPayment && (
                <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
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
                                    <i className="bi bi-receipt me-2"></i>
                                    Payment Details: {selectedPayment.displayId}
                                </h5>
                                <div className="d-flex gap-2">
                                    <button
                                        type="button"
                                        className="btn btn-success btn-sm"
                                        onClick={() => handleSharePaymentToWhatsApp(selectedPayment)}
                                    >
                                        <i className="bi bi-whatsapp me-1"></i>
                                        Share
                                    </button>
                                    <button
                                        type="button"
                                        className="btn-close btn-close-white"
                                        onClick={handleCloseModal}
                                    ></button>
                                </div>
                            </div>
                            <div className="modal-body">
                                {/* Payment Date at the top */}
                                <div className="row mb-4">
                                    <div className="col-12">
                                        <div className="p-3 rounded text-center" style={{
                                            background: "rgba(59, 130, 246, 0.2)",
                                            border: "1px solid rgba(59, 130, 246, 0.5)"
                                        }}>
                                            <h6 className="text-info mb-1">
                                                <i className="bi bi-calendar me-2"></i>
                                                Payment Date
                                            </h6>
                                            <h5 className="text-light fw-bold mb-0">
                                                {new Date(selectedPayment.date).toLocaleDateString('en-US', {
                                                    weekday: 'long',
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric'
                                                })}
                                            </h5>
                                        </div>
                                    </div>
                                </div>

                                {/* Payment Details */}
                                <div className="row g-3">
                                    <div className="col-md-6">
                                        <div className="card border-0 h-100" style={{
                                            background: "rgba(16, 185, 129, 0.1)",
                                            border: "1px solid rgba(16, 185, 129, 0.3)"
                                        }}>
                                            <div className="card-body">
                                                <h6 className="text-success mb-3">
                                                    <i className="bi bi-currency-rupee me-2"></i>
                                                    Payment Information
                                                </h6>
                                                <div className="space-y-2">
                                                    <div className="d-flex justify-content-between">
                                                        <span className="text-light">Amount:</span>
                                                        <span className="text-warning fw-bold">₹{parseFloat(selectedPayment.amount).toFixed(2)}</span>
                                                    </div>
                                                    <div className="d-flex justify-content-between">
                                                        <span className="text-light">Method:</span>
                                                        <span className="text-info fw-bold text-capitalize">{selectedPayment.method}</span>
                                                    </div>
                                                    <div className="d-flex justify-content-between">
                                                        <span className="text-light">Status:</span>
                                                        <span className="badge bg-success">Completed</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <div className="card border-0 h-100" style={{
                                            background: "rgba(59, 130, 246, 0.1)",
                                            border: "1px solid rgba(59, 130, 246, 0.3)"
                                        }}>
                                            <div className="card-body">
                                                <h6 className="text-primary mb-3">
                                                    <i className="bi bi-info-circle me-2"></i>
                                                    Additional Information
                                                </h6>
                                                <div className="space-y-2">
                                                    <div className="d-flex justify-content-between">
                                                        <span className="text-light">Items Paid:</span>
                                                        <span className="text-warning fw-bold">{selectedPayment.items?.length || 0}</span>
                                                    </div>
                                                    <div className="d-flex justify-content-between">
                                                        <span className="text-light">Full Payment:</span>
                                                        <span className={selectedPayment.isFullPayment ? "text-success fw-bold" : "text-warning fw-bold"}>
                                                            {selectedPayment.isFullPayment ? 'Yes' : 'No'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Notes Section */}
                                {selectedPayment.notes && selectedPayment.notes !== 'No notes' && (
                                    <div className="row mt-4">
                                        <div className="col-12">
                                            <div className="card border-0" style={{
                                                background: "rgba(245, 158, 11, 0.1)",
                                                border: "1px solid rgba(245, 158, 11, 0.3)"
                                            }}>
                                                <div className="card-body">
                                                    <h6 className="text-warning mb-3">
                                                        <i className="bi bi-sticky me-2"></i>
                                                        Payment Notes
                                                    </h6>
                                                    <p className="text-light mb-0">{selectedPayment.notes}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Items List */}
                                {selectedPayment.items && selectedPayment.items.length > 0 && (
                                    <div className="row mt-4">
                                        <div className="col-12">
                                            <div className="card border-0" style={{
                                                background: "rgba(99, 102, 241, 0.1)",
                                                border: "1px solid rgba(99, 102, 241, 0.3)"
                                            }}>
                                                <div className="card-header bg-transparent border-0">
                                                    <h6 className="text-primary mb-0">
                                                        <i className="bi bi-list-check me-2"></i>
                                                        Paid Items ({selectedPayment.items.length})
                                                    </h6>
                                                </div>
                                                <div className="card-body">
                                                    <div className="table-responsive">
                                                        <table className="table table-dark table-sm table-borderless">
                                                            <thead>
                                                                <tr>
                                                                    <th>Item Name</th>
                                                                    <th className="text-center">Quantity</th>
                                                                    <th className="text-end">Amount</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {selectedPayment.items.map((item, index) => (
                                                                    <tr key={index}>
                                                                        <td className="text-light">{item.name || item.subCategory || 'Unknown Item'}</td>
                                                                        <td className="text-center text-warning">{item.quantity || 'N/A'}</td>
                                                                        <td className="text-end text-success">₹{parseFloat(item.amount || item.total || 0).toFixed(2)}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer border-0">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={handleCloseModal}
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

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
                            <i className="bi bi-journal-text me-2"></i>
                            Customer Notes
                        </h6>
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