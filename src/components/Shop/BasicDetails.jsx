// src/components/Customer/BasicDetails.jsx
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import firebaseDB from '../../firebase'; // Add this import

const BasicDetails = ({ customer, totalAmount, paymentHistory, PurchaseItems, Payments, Balance }) => {
    const [selectedPayment, setSelectedPayment] = useState(null);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [paymentsPerPage, setPaymentsPerPage] = useState(5);
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredPayments, setFilteredPayments] = useState([]);
    const [selectedPayments, setSelectedPayments] = useState([]);
    const [filters, setFilters] = useState({
        paymentDate: '',
        purchaseDate: '',
        paymentId: '',
        amount: '',
        method: ''
    });
    const [reminderDate, setReminderDate] = useState('');
    const [reminders, setReminders] = useState([]);
    const [isLoadingReminders, setIsLoadingReminders] = useState(false);

    // Load reminders from Firebase - FIXED to save to customer data
    useEffect(() => {
        const loadReminders = async () => {
            setIsLoadingReminders(true);
            try {
                if (customer?.id) {
                    const correctPath = `Shop/CreditData/${customer.id}`;
                    const snapshot = await firebaseDB.child(correctPath).once('value');
                    const customerData = snapshot.val();
                    
                    if (customerData && customerData.reminders) {
                        let remindersList = [];
                        if (Array.isArray(customerData.reminders)) {
                            remindersList = customerData.reminders;
                        } else if (typeof customerData.reminders === 'object') {
                            remindersList = Object.values(customerData.reminders);
                        }
                        
                        // Update status based on current date
                        const updatedReminders = remindersList.map(reminder => ({
                            ...reminder,
                            status: getReminderStatus(reminder.date)
                        }));
                        
                        setReminders(updatedReminders);
                    }
                }
            } catch (error) {
                console.error('Error loading reminders:', error);
                // Fallback to localStorage
                const savedReminders = localStorage.getItem(`customer_reminders_${customer?.id}`);
                if (savedReminders) {
                    setReminders(JSON.parse(savedReminders));
                }
            } finally {
                setIsLoadingReminders(false);
            }
        };

        if (customer?.id) {
            loadReminders();
        }
    }, [customer?.id]);

    // Save reminders to Firebase customer data
    const saveRemindersToCustomer = async (remindersList) => {
        try {
            if (customer?.id) {
                const correctPath = `Shop/CreditData/${customer.id}`;
                
                // Update the customer's reminders in Firebase
                await firebaseDB.child(correctPath).update({
                    reminders: remindersList.reduce((acc, reminder, index) => {
                        acc[index] = reminder;
                        return acc;
                    }, {}),
                    lastReminderUpdate: new Date().toISOString()
                });
            }
        } catch (error) {
            console.error('Error saving reminders to customer:', error);
            // Fallback to localStorage
            localStorage.setItem(`customer_reminders_${customer?.id}`, JSON.stringify(remindersList));
        }
    };

    // Update reminder status dynamically based on current date
    const updateReminderStatus = (remindersList) => {
        return remindersList.map(reminder => ({
            ...reminder,
            status: getReminderStatus(reminder.date)
        }));
    };

    // Update reminders status when component mounts or date changes
    useEffect(() => {
        if (reminders.length > 0) {
            const updatedReminders = updateReminderStatus(reminders);
            // Only update if status changed
            const hasChanges = reminders.some((reminder, index) =>
                reminder.status !== updatedReminders[index].status
            );
            if (hasChanges) {
                setReminders(updatedReminders);
                saveRemindersToCustomer(updatedReminders);
            }
        }
    }, [reminders.length]);

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

    // Helper function to get purchase date with fallback
    const getPurchaseDate = (payment) => {
        if (payment.purchaseDate && payment.purchaseDate !== 'N/A') {
            return payment.purchaseDate;
        }
        // Check if payment has items with dates
        if (payment.items && payment.items.length > 0) {
            // Try to get date from first item
            const firstItem = payment.items[0];
            if (firstItem.date) return firstItem.date;
            if (firstItem.purchaseDate) return firstItem.purchaseDate;
            if (firstItem.createdAt) return firstItem.createdAt;
        }
        // Fallback to payment date
        return payment.date;
    };

    // FIXED: Generate payment ID in format: CustomerID-PurchaseDate-index
    const generatePaymentId = useCallback((payment, index) => {
        try {
            const purchaseDate = getPurchaseDate(payment);
            const date = purchaseDate ? new Date(purchaseDate) : new Date(payment.date);
            const month = date.toLocaleDateString('en-US', { month: 'short' });
            const day = date.getDate().toString().padStart(2, '0');
            const customerId = customer?.idNo?.substring(0, 4) || 'C-01';

            return `${customerId}-${month}-${day}-${index + 1}`;
        } catch (error) {
            const customerId = customer?.idNo?.substring(0, 4) || 'C-01';
            return `${customerId}-${index + 1}`;
        }
    }, [customer?.idNo]);

    // UPDATED: Enhanced financialSummary using Balance data and PurchaseItems - FIXED calculation
    const financialSummary = useMemo(() => {
        // Use Balance data if available (primary source)
        if (Balance && Balance.totalPurchase !== undefined && Balance.totalPaid !== undefined) {
            const totalPurchase = parseFloat(Balance.totalPurchase) || 0;
            const totalPaid = parseFloat(Balance.totalPaid) || 0;
            const totalPending = Math.max(0, totalPurchase - totalPaid);

            return {
                totalPurchase,
                totalPaid,
                totalPending,
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

                // If item is paid, add to totalPaid
                if (item.status === 'paid' || item.paymentStatus === 'paid') {
                    totalPaid += itemTotal;
                }
            });
        }

        // Calculate total paid from Payments collection (for backward compatibility)
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
            lastPaymentDate = sortedPayments[0]?.date ? new Date(sortedPayments[0].date).toLocaleDateString() : 'N/A';
        }

        return {
            totalPurchase,
            totalPaid,
            totalPending,
            lastPaymentDate,
            paymentCount: Payments?.length || 0
        };
    }, [PurchaseItems, Balance, Payments]);

    // FIXED: Handle payment row click to show modal with proper details AND scroll to top
    const handlePaymentRowClick = (payment, index) => {
        // Prevent default behavior that causes scroll issues
        const paymentId = generatePaymentId(payment, index);
        const updatedPayment = {
            ...payment,
            displayId: paymentId,
            // Ensure all required fields are present
            date: payment.date || 'N/A',
            amount: payment.amount || 0,
            method: payment.method || 'Cash',
            notes: payment.notes || 'No notes',
            items: payment.items || [],
            attachments: payment.attachments || [],
            purchaseDate: payment.purchaseDate || getPurchaseDate(payment) || 'N/A'
        };

        setSelectedPayment(updatedPayment);
        setShowPaymentModal(true);

        // Scroll to top when modal opens
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Close modal
    const handleCloseModal = () => {
        setShowPaymentModal(false);
        setSelectedPayment(null);
    };

    // Get reminder status based on date
    const getReminderStatus = (dateString) => {
        if (!dateString) return 'unknown';

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const reminderDate = new Date(dateString);
        reminderDate.setHours(0, 0, 0, 0);

        const timeDiff = reminderDate.getTime() - today.getTime();
        const dayDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

        if (dayDiff === 0) return 'today';
        if (dayDiff === 1) return 'tomorrow';
        if (dayDiff < 0) return 'overdue';
        if (dayDiff > 1 && dayDiff <= 7) return 'upcoming';
        return 'future';
    };

    // FIXED: Set reminder function with calendar and save to Firebase customer data
    const handleSetReminder = async () => {
        const today = new Date().toISOString().split('T')[0];
        const defaultDate = new Date();
        defaultDate.setDate(defaultDate.getDate() + 7); // Default to 7 days from now

        const reminderDateInput = prompt('Enter reminder date (YYYY-MM-DD):', defaultDate.toISOString().split('T')[0]);

        if (!reminderDateInput) return;

        const newReminder = {
            id: Date.now().toString(),
            date: reminderDateInput,
            customerId: customer?.id,
            customerName: customer?.name,
            pendingAmount: financialSummary.totalPending,
            status: getReminderStatus(reminderDateInput),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const updatedReminders = [...reminders, newReminder];
        setReminders(updatedReminders);
        await saveRemindersToCustomer(updatedReminders);

        alert(`Reminder set for ${new Date(reminderDateInput).toLocaleDateString()}`);
    };

    // Get reminder status color and label
    const getReminderStatusInfo = (status) => {
        switch (status) {
            case 'today': return { color: 'warning', label: 'Today', bgColor: 'rgba(245, 158, 11, 0.3)' };
            case 'tomorrow': return { color: 'info', label: 'Tomorrow', bgColor: 'rgba(59, 130, 246, 0.3)' };
            case 'overdue': return { color: 'danger', label: 'Overdue', bgColor: 'rgba(239, 68, 68, 0.3)' };
            case 'upcoming': return { color: 'success', label: 'Upcoming', bgColor: 'rgba(16, 185, 129, 0.3)' };
            case 'future': return { color: 'secondary', label: 'Future', bgColor: 'rgba(100, 116, 139, 0.3)' };
            default: return { color: 'secondary', label: 'Unknown', bgColor: 'rgba(100, 116, 139, 0.3)' };
        }
    };

    // Handle checkbox selection
    const handleCheckboxChange = (paymentId, isChecked) => {
        if (isChecked) {
            setSelectedPayments(prev => [...prev, paymentId]);
        } else {
            setSelectedPayments(prev => prev.filter(id => id !== paymentId));
        }
    };

    // Handle select all checkboxes
    const handleSelectAll = (isChecked) => {
        if (isChecked) {
            const allPaymentIds = sortedPayments.map(payment => payment.id);
            setSelectedPayments(allPaymentIds);
        } else {
            setSelectedPayments([]);
        }
    };

    // Share selected payments to WhatsApp
    const handleShareSelectedToWhatsApp = () => {
        if (selectedPayments.length === 0) {
            alert('Please select at least one payment to share.');
            return;
        }

        const selectedPaymentData = sortedPayments.filter(payment =>
            selectedPayments.includes(payment.id)
        );

        let message = `*Payment Summary for ${customer?.name || 'Customer'}*\n\n`;
        message += `*Customer:* ${customer?.name || 'N/A'}\n`;
        message += `*Phone:* ${customer?.phone || 'N/A'}\n`;
        message += `*Total Selected Payments:* ${selectedPayments.length}\n`;
        message += `*Total Amount:* ₹${selectedPaymentData.reduce((sum, payment) => sum + parseFloat(payment.amount || 0), 0).toFixed(2)}\n\n`;
        message += `*Payment Details:*\n`;

        selectedPaymentData.forEach((payment, index) => {
            const paymentId = generatePaymentId(payment, index);
            message += `\n${index + 1}. *Payment ID:* ${paymentId}\n`;
            message += `   *Date:* ${new Date(payment.date).toLocaleDateString()}\n`;
            message += `   *Purchase Date:* ${payment.purchaseDate ? new Date(payment.purchaseDate).toLocaleDateString() : 'N/A'}\n`;
            message += `   *Amount:* ₹${parseFloat(payment.amount).toFixed(2)}\n`;
            message += `   *Method:* ${payment.method}\n`;
        });

        message += `\nThank you for your business!`;

        const encodedMessage = encodeURIComponent(message);
        const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;

        window.open(whatsappUrl, '_blank');
    };

    // FIXED: NEW FUNCTION - Share single payment details to WhatsApp
    const handleShareSinglePaymentToWhatsApp = (payment) => {
        if (!payment) {
            alert('No payment data to share.');
            return;
        }

        const formatDate = (dateString) => {
            if (!dateString || dateString === 'N/A') return 'N/A';
            try {
                const date = new Date(dateString);
                const formattedDate = date.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
                const shortDate = date.toLocaleDateString('en-GB'); // DD/MM/YYYY format
                return `${formattedDate} (${shortDate})`;
            } catch (error) {
                return 'N/A';
            }
        };

        let message = `*Payment Details*\n\n`;
        message += `*Customer:* ${customer?.name || 'N/A'}\n`;
        message += `*Phone:* ${customer?.phone || 'N/A'}\n`;
        message += `*Payment ID:* ${payment.displayId || 'N/A'}\n\n`;
        message += `*Payment Date:* ${formatDate(payment.date)}\n`;
        message += `*Purchase Date:* ${formatDate(payment.purchaseDate)}\n`;
        message += `*Amount:* ₹${parseFloat(payment.amount || 0).toFixed(2)}\n`;
        message += `*Payment Method:* ${payment.method || 'Cash'}\n\n`;

        if (payment.items && payment.items.length > 0) {
            message += `*Items (${payment.items.length}):*\n`;
            payment.items.forEach((item, index) => {
                const itemName = item.name || item.productName || item.itemName || item.subCategory || 'Item';

                // FIXED: Get correct quantity value
                let quantity = 0;
                if (item.quantity !== undefined && item.quantity !== null) {
                    quantity = parseFloat(item.quantity);
                } else if (item.qty !== undefined && item.qty !== null) {
                    quantity = parseFloat(item.qty);
                } else if (item.Qty !== undefined && item.Qty !== null) {
                    quantity = parseFloat(item.Qty);
                } else if (item.Quantity !== undefined && item.Quantity !== null) {
                    quantity = parseFloat(item.Quantity);
                }

                const unit = item.unit || item.Unit || item.uom || item.UOM || 'units';

                // FIXED: Get correct price value
                let price = 0;
                if (item.price !== undefined && item.price !== null) {
                    price = parseFloat(item.price);
                } else if (item.Price !== undefined && item.Price !== null) {
                    price = parseFloat(item.Price);
                } else if (item.rate !== undefined && item.rate !== null) {
                    price = parseFloat(item.rate);
                } else if (item.Rate !== undefined && item.Rate !== null) {
                    price = parseFloat(item.Rate);
                }

                // FIXED: Calculate amount correctly
                let amount = 0;
                if (item.amount !== undefined && item.amount !== null) {
                    amount = parseFloat(item.amount);
                } else if (item.total !== undefined && item.total !== null) {
                    amount = parseFloat(item.total);
                } else if (item.Total !== undefined && item.Total !== null) {
                    amount = parseFloat(item.Total);
                } else if (quantity > 0 && price > 0) {
                    amount = quantity * price;
                }

                message += `${index + 1}. ${itemName}: ${quantity} ${unit} @ ₹${price.toFixed(2)} = ₹${amount.toFixed(2)}\n`;
            });

            const totalAmount = payment.items.reduce((sum, item) => {
                let itemAmount = 0;
                if (item.amount !== undefined && item.amount !== null) {
                    itemAmount = parseFloat(item.amount);
                } else if (item.total !== undefined && item.total !== null) {
                    itemAmount = parseFloat(item.total);
                } else if (item.Total !== undefined && item.Total !== null) {
                    itemAmount = parseFloat(item.Total);
                }
                return sum + itemAmount;
            }, 0);

            message += `\n*Sub Total:* ₹${totalAmount.toFixed(2)}\n`;
        }

        message += `\n*Payment Status:* Completed ✅\n`;
        message += `\nThank you for your business!`;

        const encodedMessage = encodeURIComponent(message);
        const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
        window.open(whatsappUrl, '_blank');
    };

    // FIXED: Apply filters properly
    useEffect(() => {
        if (Payments && Payments.length > 0) {
            let filtered = Payments;

            // Apply search term filter
            if (searchTerm.trim()) {
                const searchTermLower = searchTerm.toLowerCase().trim();
                filtered = filtered.filter(payment => {
                    const paymentId = generatePaymentId(payment, 0).toLowerCase();
                    const notes = payment.notes?.toLowerCase() || '';
                    const method = payment.method?.toLowerCase() || '';
                    const amount = payment.amount?.toString() || '';

                    return paymentId.includes(searchTermLower) ||
                        notes.includes(searchTermLower) ||
                        method.includes(searchTermLower) ||
                        amount.includes(searchTermLower);
                });
            }

            // Apply individual filters
            if (filters.paymentDate) {
                filtered = filtered.filter(payment => {
                    if (!payment.date) return false;
                    const paymentDate = new Date(payment.date).toISOString().split('T')[0];
                    return paymentDate === filters.paymentDate;
                });
            }

            if (filters.purchaseDate) {
                filtered = filtered.filter(payment => {
                    const purchaseDate = getPurchaseDate(payment);
                    if (!purchaseDate || purchaseDate === 'N/A') return false;
                    const purchaseDateFormatted = new Date(purchaseDate).toISOString().split('T')[0];
                    return purchaseDateFormatted === filters.purchaseDate;
                });
            }

            if (filters.paymentId) {
                filtered = filtered.filter(payment => {
                    const paymentId = generatePaymentId(payment, 0).toLowerCase();
                    return paymentId.includes(filters.paymentId.toLowerCase());
                });
            }

            if (filters.amount) {
                filtered = filtered.filter(payment => {
                    const amount = payment.amount?.toString() || '';
                    return amount.includes(filters.amount);
                });
            }

            if (filters.method) {
                filtered = filtered.filter(payment => {
                    const method = payment.method?.toLowerCase() || '';
                    return method.includes(filters.method.toLowerCase());
                });
            }

            setFilteredPayments(filtered);
        } else {
            setFilteredPayments([]);
        }
        setCurrentPage(1); // Reset to first page when filters change
    }, [Payments, searchTerm, filters, customer?.idNo, generatePaymentId]);

    const exportPaymentsToCSV = () => {
        if (!Payments || Payments.length === 0) return;

        const headers = ['Payment ID', 'Payment Date', 'Purchase Date', 'Amount', 'Method', 'Items Count'];
        const csvData = Payments.map((payment, index) => [
            generatePaymentId(payment, index),
            new Date(payment.date).toLocaleDateString(),
            getPurchaseDate(payment) ? new Date(getPurchaseDate(payment)).toLocaleDateString() : 'N/A',
            payment.amount,
            payment.method,
            payment.items?.length || 0
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

    // Calculate total purchases count from purchase items
    const totalPurchasesCount = useMemo(() => {
        if (PurchaseItems && PurchaseItems.length > 0) {
            return PurchaseItems.length;
        }
        return customer?.totalPurchases || 0;
    }, [PurchaseItems, customer]);

    // Pagination logic
    const sortedPayments = filteredPayments.length > 0 ? [...filteredPayments].sort((a, b) => new Date(b.date) - new Date(a.date)) : [];
    const indexOfLastPayment = currentPage * paymentsPerPage;
    const indexOfFirstPayment = indexOfLastPayment - paymentsPerPage;
    const currentPayments = sortedPayments.slice(indexOfFirstPayment, indexOfLastPayment);
    const totalPages = Math.ceil(sortedPayments.length / paymentsPerPage);

    // Calculate total amount for current filtered payments
    const totalFilteredAmount = useMemo(() => {
        return sortedPayments.reduce((total, payment) => total + parseFloat(payment.amount || 0), 0);
    }, [sortedPayments]);

    const handlePageChange = (pageNumber) => {
        setCurrentPage(pageNumber);
    };

    const handleFilterChange = (filterName, value) => {
        setFilters(prev => ({
            ...prev,
            [filterName]: value
        }));
    };

    const clearFilters = () => {
        setFilters({
            paymentDate: '',
            purchaseDate: '',
            paymentId: '',
            amount: '',
            method: ''
        });
        setSearchTerm('');
        setCurrentPage(1);
    };

    // FIXED: Enhanced function to get item details correctly
    const getItemDetails = (item) => {
        // Get item name
        const itemName = item.name || item.productName || item.itemName || item.ItemName || item.subCategory || 'Unknown Item';

        // FIXED: Get quantity with proper field mapping and default to 1 if not found
        let quantity = 1;
        if (item.quantity !== undefined && item.quantity !== null && !isNaN(parseFloat(item.quantity))) {
            quantity = parseFloat(item.quantity);
        } else if (item.qty !== undefined && item.qty !== null && !isNaN(parseFloat(item.qty))) {
            quantity = parseFloat(item.qty);
        } else if (item.Qty !== undefined && item.Qty !== null && !isNaN(parseFloat(item.Qty))) {
            quantity = parseFloat(item.Qty);
        } else if (item.Quantity !== undefined && item.Quantity !== null && !isNaN(parseFloat(item.Quantity))) {
            quantity = parseFloat(item.Quantity);
        } else if (item.amount !== undefined && item.amount !== null && !isNaN(parseFloat(item.amount))) {
            // If only amount is available, try to calculate quantity from amount/price
            quantity = 1;
        }

        // FIXED: Get unit with fallbacks
        const quantityUnit = item.unit || item.Unit || item.uom || item.UOM || 'units';

        // FIXED: Get price with proper field mapping
        let price = 0;
        if (item.price !== undefined && item.price !== null && !isNaN(parseFloat(item.price))) {
            price = parseFloat(item.price);
        } else if (item.Price !== undefined && item.Price !== null && !isNaN(parseFloat(item.Price))) {
            price = parseFloat(item.Price);
        } else if (item.rate !== undefined && item.rate !== null && !isNaN(parseFloat(item.rate))) {
            price = parseFloat(item.rate);
        } else if (item.Rate !== undefined && item.Rate !== null && !isNaN(parseFloat(item.Rate))) {
            price = parseFloat(item.Rate);
        } else if (item.total && quantity > 0 && !isNaN(parseFloat(item.total))) {
            // Calculate price from total/quantity
            price = parseFloat(item.total) / quantity;
        } else if (item.Total && quantity > 0 && !isNaN(parseFloat(item.Total))) {
            price = parseFloat(item.Total) / quantity;
        } else if (item.amount && quantity > 0 && !isNaN(parseFloat(item.amount))) {
            price = parseFloat(item.amount) / quantity;
        }

        // FIXED: Calculate amount correctly
        let amount = 0;
        if (item.amount !== undefined && item.amount !== null && !isNaN(parseFloat(item.amount))) {
            amount = parseFloat(item.amount);
        } else if (item.total !== undefined && item.total !== null && !isNaN(parseFloat(item.total))) {
            amount = parseFloat(item.total);
        } else if (item.Total !== undefined && item.Total !== null && !isNaN(parseFloat(item.Total))) {
            amount = parseFloat(item.Total);
        } else if (quantity > 0 && price > 0) {
            amount = quantity * price;
        }

        return {
            name: itemName,
            quantity,
            unit: quantityUnit,
            price,
            amount
        };
    };

    // FIXED: Remove reminder function
    const handleRemoveReminder = async (reminderId) => {
        const updatedReminders = reminders.filter(r => r.id !== reminderId);
        setReminders(updatedReminders);
        await saveRemindersToCustomer(updatedReminders);
    };

    // FIXED: Date formatting function for both full and short formats
    const formatDateDisplay = (dateString) => {
        if (!dateString || dateString === 'N/A') return 'N/A';

        try {
            const date = new Date(dateString);
            const formattedDate = date.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            const shortDate = date.toLocaleDateString('en-GB'); // DD/MM/YYYY format
            return `${formattedDate} (${shortDate})`;
        } catch (error) {
            return 'N/A';
        }
    };

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

            {/* Reminders Section */}
            {reminders.length > 0 && (
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
                                <i className="bi bi-bell me-2"></i>
                                Reminders ({reminders.length})
                                {isLoadingReminders && (
                                    <span className="spinner-border spinner-border-sm ms-2" role="status">
                                        <span className="visually-hidden">Loading...</span>
                                    </span>
                                )}
                            </h6>
                        </div>
                        <div className="card-body">
                            <div className="row g-3">
                                {reminders.map((reminder) => {
                                    const statusInfo = getReminderStatusInfo(reminder.status);
                                    return (
                                        <div key={reminder.id} className="col-md-3">
                                            <div className="p-3 rounded" style={{
                                                background: statusInfo.bgColor,
                                                border: `2px solid rgba(var(--bs-${statusInfo.color}-rgb), 0.7)`
                                            }}>
                                                <div className="d-flex justify-content-between align-items-center mb-2">
                                                    <span className="fw-bold text-light">
                                                        {new Date(reminder.date).toLocaleDateString()}
                                                    </span>
                                                    <span className={`badge bg-${statusInfo.color} px-3 py-1`}>
                                                        <i className="bi bi-clock me-1"></i>
                                                        {statusInfo.label}
                                                    </span>
                                                </div>
                                                <div className="small text-light">
                                                    <i className="bi bi-currency-rupee me-1"></i>
                                                    Pending: ₹{parseFloat(reminder.pendingAmount || 0).toFixed(2)}
                                                </div>
                                                <div className="small text-light mt-1">
                                                    <i className="bi bi-person me-1"></i>
                                                    {reminder.customerName || customer?.name}
                                                </div>
                                                <button
                                                    className="btn btn-sm btn-outline-danger mt-3 w-100"
                                                    onClick={() => handleRemoveReminder(reminder.id)}
                                                >
                                                    <i className="bi bi-trash me-1"></i>
                                                    Remove
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}

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
                            <div className="col-md-2">
                                <button className="btn btn-success w-100" onClick={exportPaymentsToCSV}>
                                    <i className="bi bi-file-earmark-excel me-2"></i>
                                    Export CSV
                                </button>
                            </div>
                            <div className="col-md-2">
                                <button className="btn btn-info w-100" onClick={() => window.print()}>
                                    <i className="bi bi-printer me-2"></i>
                                    Print Summary
                                </button>
                            </div>
                            <div className="col-md-3">
                                <button className="btn btn-warning w-100" onClick={handleShareSelectedToWhatsApp}>
                                    <i className="bi bi-whatsapp me-2"></i>
                                    Share Selected ({selectedPayments.length})
                                </button>
                            </div>
                            <div className="col-md-3">
                                <button className="btn btn-primary w-100" onClick={handleSetReminder}>
                                    <i className="bi bi-bell me-2"></i>
                                    Set Reminder
                                </button>
                            </div>
                            <div className="col-md-2">
                                <select
                                    className="form-select"
                                    value={paymentsPerPage}
                                    onChange={(e) => {
                                        setPaymentsPerPage(Number(e.target.value));
                                        setCurrentPage(1);
                                    }}
                                >
                                    <option value="5">Show 5</option>
                                    <option value="10">Show 10</option>
                                    <option value="20">Show 20</option>
                                    <option value="50">Show 50</option>
                                    <option value="100">Show 100</option>
                                </select>
                            </div>
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
                    <div className="card-body">
                        {/* Filters Section */}
                        <div className="row g-3 mb-4 text-center">
                            <div className="col-md-2">
                                <label className="form-label text-light small">Payment Date</label>
                                <input
                                    type="date"
                                    className="form-control form-control-sm"
                                    value={filters.paymentDate}
                                    onChange={(e) => handleFilterChange('paymentDate', e.target.value)}
                                />
                            </div>
                            <div className="col-md-2">
                                <label className="form-label text-light small">Purchase Date</label>
                                <input
                                    type="date"
                                    className="form-control form-control-sm"
                                    value={filters.purchaseDate}
                                    onChange={(e) => handleFilterChange('purchaseDate', e.target.value)}
                                />
                            </div>
                            <div className="col-md-2">
                                <label className="form-label text-light small">Payment ID</label>
                                <input
                                    type="text"
                                    className="form-control form-control-sm"
                                    placeholder="Search Payment ID"
                                    value={filters.paymentId}
                                    onChange={(e) => handleFilterChange('paymentId', e.target.value)}
                                />
                            </div>
                            <div className="col-md-2">
                                <label className="form-label text-light small">Amount</label>
                                <input
                                    type="number"
                                    className="form-control form-control-sm"
                                    placeholder="Amount"
                                    value={filters.amount}
                                    onChange={(e) => handleFilterChange('amount', e.target.value)}
                                />
                            </div>
                            <div className="col-md-2">
                                <label className="form-label text-light small">Method</label>
                                <select
                                    className="form-select form-select-sm"
                                    value={filters.method}
                                    onChange={(e) => handleFilterChange('method', e.target.value)}
                                >
                                    <option value="">All Methods</option>
                                    <option value="cash">Cash</option>
                                    <option value="online">Online</option>
                                    <option value="card">Card</option>
                                    <option value="upi">UPI</option>
                                </select>
                            </div>
                            <div className="col-md-1">
                                <label className="form-label text-light small">Search</label>
                                <input
                                    type="text"
                                    className="form-control form-control-sm"
                                    placeholder="Search..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div className="col-md-1 d-flex align-items-end">
                                <button className="btn btn-outline-light btn-sm w-100" onClick={clearFilters}>
                                    Clear
                                </button>
                            </div>
                        </div>

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
                                                <th className="text-center" style={{ width: '50px' }}>
                                                    <input
                                                        type="checkbox"
                                                        className="form-check-input"
                                                        onChange={(e) => handleSelectAll(e.target.checked)}
                                                        checked={selectedPayments.length === sortedPayments.length && sortedPayments.length > 0}
                                                    />
                                                </th>
                                                <th className="text-center">Payment Date</th>
                                                <th className="text-center">Purchase Date</th>
                                                <th className="text-center">Payment ID</th>
                                                <th className="text-center">Amount</th>
                                                <th className="text-center">Method</th>
                                                <th className="text-center">Items Paid</th>
                                                <th className="text-center">Status</th>
                                                <th className="text-center">View</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {currentPayments.map((payment, index) => (
                                                <tr
                                                    key={payment.id || index}
                                                    style={{
                                                        background: index % 2 === 0
                                                            ? "rgba(30, 41, 59, 0.7)"
                                                            : "rgba(51, 65, 85, 0.7)",
                                                        cursor: "pointer"
                                                    }}
                                                    onClick={() => handlePaymentRowClick(payment, index + (currentPage - 1) * paymentsPerPage)}
                                                >
                                                    <td className="text-center" onClick={(e) => e.stopPropagation()}>
                                                        <input
                                                            type="checkbox"
                                                            className="form-check-input"
                                                            checked={selectedPayments.includes(payment.id)}
                                                            onChange={(e) => handleCheckboxChange(payment.id, e.target.checked)}
                                                        />
                                                    </td>
                                                    <td className="text-center fw-bold text-info">
                                                        {payment.date ? new Date(payment.date).toLocaleDateString('en-US') : 'N/A'}
                                                    </td>
                                                    <td className="text-center fw-bold text-warning">
                                                        {(() => {
                                                            const purchaseDate = getPurchaseDate(payment);
                                                            return purchaseDate
                                                                ? new Date(purchaseDate).toLocaleDateString('en-US')
                                                                : 'N/A';
                                                        })()}
                                                    </td>
                                                    <td className="text-center text-light small fw-bold">
                                                        {generatePaymentId(payment, index + (currentPage - 1) * paymentsPerPage)}
                                                    </td>
                                                    <td className="text-center text-success fw-bold fs-6">
                                                        ₹{parseFloat(payment.amount || 0).toFixed(2)}
                                                    </td>
                                                    <td className="text-center">
                                                        <span className="badge bg-primary text-capitalize">
                                                            {payment.method || 'Cash'}
                                                        </span>
                                                    </td>
                                                    <td className="text-center text-warning fw-bold">
                                                        {payment.items?.length || 0}
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
                                            {/* Total Amount Row */}
                                            <tr style={{
                                                background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
                                                borderTop: '2px solid rgba(255, 255, 255, 0.3)'
                                            }}>
                                                <td colSpan="4" className="text-end fw-bold text-white">
                                                    <i className="bi bi-calculator me-2"></i>
                                                    Total Amount:
                                                </td>
                                                <td className="text-center fw-bold fs-5 text-white">
                                                    ₹{totalFilteredAmount.toFixed(2)}
                                                </td>
                                                <td colSpan="4"></td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                {/* Pagination */}
                                {totalPages > 1 && (
                                    <div className="d-flex justify-content-between align-items-center mt-4 pb-3">
                                      
                                        <nav style={{ background: "transparent", padding: 0, margin: "auto", width:'auto' }}>
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
                                              <div className="text-warning small">
                                            Showing {indexOfFirstPayment + 1} to {Math.min(indexOfLastPayment, sortedPayments.length)} of {sortedPayments.length} entries
                                        </div>
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
                <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.9)' }}>
                    <div className="modal-dialog modal-lg modal-dialog-centered">
                        <div className="modal-content border-0 shadow-lg" style={{
                            background: "linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.95) 100%)",
                            borderRadius: "15px",
                            border: "2px solid rgba(99, 102, 241, 0.5)"
                        }}>
                            <div className="modal-header border-0 justify-content-between" style={{
                                background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)",
                                borderRadius: "15px 15px 0 0"
                            }}>
                                <h5 className="modal-title text-white fw-bold">
                                    <i className="bi bi-receipt me-2"></i>
                                    Payment Details: {selectedPayment.displayId}
                                </h5>
                                <div className="d-flex gap-2 align-items-center">
                                    <button
                                        type="button"
                                        className="btn btn-success btn-sm"
                                        onClick={() => handleShareSinglePaymentToWhatsApp(selectedPayment)}
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
                                {/* Payment and Purchase Dates - FIXED with proper formatting */}
                                <div className="row mb-4">
                                    <div className="col-md-6">
                                        <div className="p-3 rounded text-center" style={{
                                            background: "rgba(59, 130, 246, 0.2)",
                                            border: "1px solid rgba(59, 130, 246, 0.5)"
                                        }}>
                                            <h6 className="text-info mb-1">
                                                <i className="bi bi-calendar me-2"></i>
                                                Payment Date
                                            </h6>
                                            <h5 className="text-light fw-bold mb-0">
                                                {formatDateDisplay(selectedPayment.date)}
                                            </h5>
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <div className="p-3 rounded text-center" style={{
                                            background: "rgba(245, 158, 11, 0.2)",
                                            border: "1px solid rgba(245, 158, 11, 0.5)"
                                        }}>
                                            <h6 className="text-warning mb-1">
                                                <i className="bi bi-cart me-2"></i>
                                                Purchase Date
                                            </h6>
                                            <h5 className="text-light fw-bold mb-0">
                                                {formatDateDisplay(selectedPayment.purchaseDate)}
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

                                {/* Items List - FIXED quantity and price calculation */}
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
                                                                    <th>S.No</th>
                                                                    <th>Item Name</th>
                                                                    <th className="text-center">Quantity</th>
                                                                    <th className="text-center">Price</th>
                                                                    <th className="text-end">Amount</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {selectedPayment.items.map((item, index) => {
                                                                    // FIXED: Use enhanced item details function
                                                                    const itemDetails = getItemDetails(item);

                                                                    return (
                                                                        <tr key={index}>
                                                                            <td className="text-light">{index + 1}</td>
                                                                            <td className="text-light">
                                                                                {itemDetails.name}
                                                                            </td>
                                                                            <td className="text-center text-warning fw-bold">
                                                                                {itemDetails.quantity} {itemDetails.unit}
                                                                            </td>
                                                                            <td className="text-center text-info fw-bold">
                                                                                ₹{itemDetails.price.toFixed(2)}
                                                                            </td>
                                                                            <td className="text-end text-success fw-bold">
                                                                                ₹{itemDetails.amount.toFixed(2)}
                                                                            </td>
                                                                        </tr>
                                                                    );
                                                                })}

                                                                {/* Enhanced Total Row */}
                                                                {selectedPayment.items && selectedPayment.items.length > 0 && (
                                                                    <>
                                                                        <tr style={{
                                                                            borderTop: '2px solid rgba(255, 255, 255, 0.3)',
                                                                            background: 'rgba(16, 185, 129, 0.2)'
                                                                        }}>
                                                                            <td colSpan="4" className="text-end fw-bold text-light">
                                                                                <i className="bi bi-calculator me-2"></i>
                                                                                Items Sub Total:
                                                                            </td>
                                                                            <td className="text-end fw-bold text-success">
                                                                                ₹{selectedPayment.items.reduce((total, item) => {
                                                                                    const itemDetails = getItemDetails(item);
                                                                                    return total + itemDetails.amount;
                                                                                }, 0).toFixed(2)}
                                                                            </td>
                                                                        </tr>
                                                                        <tr style={{
                                                                            background: 'rgba(59, 130, 246, 0.2)'
                                                                        }}>
                                                                            <td colSpan="4" className="text-end fw-bold text-light">
                                                                                <i className="bi bi-receipt me-2"></i>
                                                                                Payment Amount:
                                                                            </td>
                                                                            <td className="text-end fw-bold fs-5 text-primary">
                                                                                ₹{parseFloat(selectedPayment.amount).toFixed(2)}
                                                                            </td>
                                                                        </tr>
                                                                        {Math.abs(selectedPayment.items.reduce((total, item) => {
                                                                            const itemDetails = getItemDetails(item);
                                                                            return total + itemDetails.amount;
                                                                        }, 0) - parseFloat(selectedPayment.amount)) > 0.01 && (
                                                                                <tr style={{
                                                                                    background: 'rgba(245, 158, 11, 0.2)'
                                                                                }}>
                                                                                    <td colSpan="4" className="text-end fw-bold text-light">
                                                                                        <i className="bi bi-info-circle me-2"></i>
                                                                                        Difference:
                                                                                    </td>
                                                                                    <td className="text-end fw-bold text-warning">
                                                                                        ₹{(parseFloat(selectedPayment.amount) - selectedPayment.items.reduce((total, item) => {
                                                                                            const itemDetails = getItemDetails(item);
                                                                                            return total + itemDetails.amount;
                                                                                        }, 0)).toFixed(2)}
                                                                                    </td>
                                                                                </tr>
                                                                            )}
                                                                    </>
                                                                )}
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

BasicDetails.propTypes = {
    customer: PropTypes.shape({
        id: PropTypes.string,
        name: PropTypes.string,
        idNo: PropTypes.string,
        phone: PropTypes.string,
        address: PropTypes.string,
        character: PropTypes.string,
        notes: PropTypes.string,
        totalPurchases: PropTypes.number
    }),
    totalAmount: PropTypes.number,
    paymentHistory: PropTypes.array,
    PurchaseItems: PropTypes.array,
    Payments: PropTypes.array,
    Balance: PropTypes.shape({
        totalPurchase: PropTypes.number,
        totalPaid: PropTypes.number,
        totalPending: PropTypes.number,
        lastPaymentDate: PropTypes.string
    })
};

BasicDetails.defaultProps = {
    customer: {},
    totalAmount: 0,
    paymentHistory: [],
    PurchaseItems: [],
    Payments: [],
    Balance: null
};

export default BasicDetails;