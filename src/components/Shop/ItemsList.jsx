import React, { useState, useMemo, useEffect } from 'react';

const ItemsList = ({
    PurchaseItems,
    loadingItems,
    totalAmount,
    onAddItem,
    onRefresh,
    categoryTranslations,
    getTranslation,
    onPayAmount,
    onCreateBill,
    onUpdateItemStatus,
    refreshTrigger,
    onShareBill // New prop for sharing bills
}) => {
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedItems, setSelectedItems] = useState([]);
    const [localItems, setLocalItems] = useState([]);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showDiscardModal, setShowDiscardModal] = useState(false);
    const [activeTab, setActiveTab] = useState('current'); // 'current' or 'old'
    const [oldItemsPage, setOldItemsPage] = useState(1);
    const [oldItemsPerPage, setOldItemsPerPage] = useState(10);
    const [oldItemsFilter, setOldItemsFilter] = useState({
        date: '',
        category: '',
        search: ''
    });
    const [modalConfig, setModalConfig] = useState({
        title: '',
        message: '',
        onConfirm: null,
        type: '' // 'confirm', 'success', 'discard'
    });

    // Generate bill number
    const generateBillNumber = (items = []) => {
        const timestamp = new Date().getTime().toString().slice(-6);
        const itemCount = items.length.toString().padStart(3, '0');
        return `JC-BILL-${timestamp}-${itemCount}`;
    };

    // Format date to short format (Dec-11)
    const formatDateShort = (dateString) => {
        if (!dateString) return 'Invalid Date';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return 'Invalid Date';
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        } catch (error) {
            return 'Invalid Date';
        }
    };

    // Format date for display in table
    const formatDateFull = (dateString) => {
        if (!dateString) return 'Invalid Date';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return 'Invalid Date';
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'short'
            });
        } catch (error) {
            return 'Invalid Date';
        }
    };

    // Separate items into current (pending) and old (paid)
    const { currentItems, oldItems } = useMemo(() => {
        const current = localItems.filter(item => item.status !== 'paid');
        const old = localItems.filter(item => item.status === 'paid');
        return { currentItems: current, oldItems: old };
    }, [localItems]);

    // Group current items by date
    const itemsByDate = useMemo(() => {
        const grouped = {};
        currentItems.forEach(item => {
            if (!item.date) return;

            try {
                const date = new Date(item.date);
                if (isNaN(date.getTime())) return;

                const dateKey = date.toISOString().split('T')[0];
                if (!grouped[dateKey]) {
                    grouped[dateKey] = [];
                }
                grouped[dateKey].push({
                    ...item,
                    displayDate: formatDateFull(item.date)
                });
            } catch (error) {
                // Silent error handling for invalid dates
            }
        });
        return grouped;
    }, [currentItems]);

    // Get all unique dates sorted (newest first) for current items
    const availableDates = useMemo(() => {
        return Object.keys(itemsByDate).sort((a, b) => new Date(b) - new Date(a));
    }, [itemsByDate]);

    // Filter and paginate old items
    const filteredOldItems = useMemo(() => {
        let filtered = [...oldItems];

        // Apply date filter
        if (oldItemsFilter.date) {
            filtered = filtered.filter(item => {
                const itemDate = new Date(item.date).toISOString().split('T')[0];
                return itemDate === oldItemsFilter.date;
            });
        }

        // Apply category filter
        if (oldItemsFilter.category) {
            filtered = filtered.filter(item =>
                item.mainCategory === oldItemsFilter.category ||
                item.subCategory === oldItemsFilter.category
            );
        }

        // Apply search filter
        if (oldItemsFilter.search) {
            const searchTerm = oldItemsFilter.search.toLowerCase();
            filtered = filtered.filter(item =>
                item.subCategory?.toLowerCase().includes(searchTerm) ||
                item.mainCategory?.toLowerCase().includes(searchTerm) ||
                item.notes?.toLowerCase().includes(searchTerm)
            );
        }

        return filtered.sort((a, b) => new Date(b.paymentDate || b.date) - new Date(a.paymentDate || a.date));
    }, [oldItems, oldItemsFilter]);

    // Paginate old items
    const paginatedOldItems = useMemo(() => {
        const startIndex = (oldItemsPage - 1) * oldItemsPerPage;
        return filteredOldItems.slice(startIndex, startIndex + oldItemsPerPage);
    }, [filteredOldItems, oldItemsPage, oldItemsPerPage]);

    // Get unique dates and categories for old items filters
    const oldItemsDates = useMemo(() => {
        const dates = [...new Set(oldItems.map(item => new Date(item.date).toISOString().split('T')[0]))];
        return dates.sort((a, b) => new Date(b) - new Date(a));
    }, [oldItems]);

    const oldItemsCategories = useMemo(() => {
        const categories = new Set();
        oldItems.forEach(item => {
            if (item.mainCategory) categories.add(item.mainCategory);
            if (item.subCategory) categories.add(item.subCategory);
        });
        return Array.from(categories).sort();
    }, [oldItems]);

    // Calculate total for selected items
    const selectedTotal = useMemo(() => {
        return selectedItems.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0);
    }, [selectedItems]);

    const pendingStats = useMemo(() => {
        const pendingItems = currentItems;
        const pendingAmount = pendingItems.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0);

        const pendingDates = new Set();
        pendingItems.forEach(item => {
            if (item.date) {
                try {
                    const date = new Date(item.date);
                    if (!isNaN(date.getTime())) {
                        pendingDates.add(date.toISOString().split('T')[0]);
                    }
                } catch (error) {
                    // Skip invalid dates
                }
            }
        });

        return {
            pendingAmount,
            pendingItemsCount: pendingItems.length,
            pendingDays: pendingDates.size,
            totalItems: localItems.length,
            paidItemsCount: oldItems.length
        };
    }, [currentItems, oldItems, localItems]);

    // Handle select all for current date
    const handleSelectAll = (checked, date) => {
        const dateItems = itemsByDate[date] || [];
        const selectableItems = dateItems.filter(item => item.status !== 'paid');

        const updatedSelectedItems = checked
            ? [...selectedItems, ...selectableItems.filter(item => !selectedItems.includes(item))]
            : selectedItems.filter(item => !dateItems.includes(item));
        setSelectedItems(updatedSelectedItems);
    };

    // Handle individual item selection
    const handleItemSelect = (item, checked) => {
        if (item.status === 'paid') return;

        const updatedSelectedItems = checked
            ? [...selectedItems, item]
            : selectedItems.filter(selected => selected.id !== item.id);
        setSelectedItems(updatedSelectedItems);
    };

    // Check if all items in a date are selected
    const isDateAllSelected = (date) => {
        const dateItems = itemsByDate[date] || [];
        const selectableItems = dateItems.filter(item => item.status !== 'paid');
        return selectableItems.length > 0 && selectableItems.every(item => selectedItems.includes(item));
    };

    // Check if any item in a date is selected
    const isDatePartiallySelected = (date) => {
        const dateItems = itemsByDate[date] || [];
        const selectableItems = dateItems.filter(item => item.status !== 'paid');
        return selectableItems.some(item => selectedItems.includes(item)) &&
            !selectableItems.every(item => selectedItems.includes(item));
    };

    // Handle pay amount - items will automatically move to old tab
    const handlePayAmount = () => {
        if (selectedItems.length === 0) {
            showModal('warning', 'No Items Selected', 'Please select items to make a payment.');
            return;
        }

        const payableItems = selectedItems.filter(item => item.status !== 'paid');

        if (payableItems.length === 0) {
            showModal('info', 'Items Already Paid', 'Selected items are already paid.');
            return;
        }

        showModal('confirm', 'Confirm Payment',
            `Are you sure you want to process payment for ${payableItems.length} items totaling ₹${selectedTotal.toFixed(2)}?`,
            () => {
                // Clear selection immediately when payment is confirmed
                setSelectedItems([]);
                // Pass the actual item objects, not just IDs
                onPayAmount(payableItems, selectedTotal);
            }
        );
    };

    // Handle share bill for date group
    const handleShareDateBill = (date) => {
        const dateItems = itemsByDate[date] || [];
        if (dateItems.length === 0) return;

        const billNumber = generateBillNumber(dateItems);
        if (onShareBill) {
            onShareBill(dateItems, billNumber, `Bill for ${formatDateFull(date)}`);
        }
    };

    // Handle share bill for individual item
    const handleShareItemBill = (item) => {
        const billNumber = generateBillNumber([item]);
        if (onShareBill) {
            onShareBill([item], billNumber, `Bill for ${item.subCategory}`);
        }
    };

    // Handle share selected items bill
    const handleShareSelectedBill = () => {
        if (selectedItems.length === 0) {
            showModal('warning', 'No Items Selected', 'Please select items to share bill.');
            return;
        }

        const billNumber = generateBillNumber(selectedItems);
        if (onShareBill) {
            onShareBill(selectedItems, billNumber, 'Selected Items Bill');
        }
    };

    // Update local items when PurchaseItems changes
    useEffect(() => {
        setLocalItems(PurchaseItems);
        // Clear selection when items change
        setSelectedItems([]);
    }, [PurchaseItems, refreshTrigger]);

    // Handle create bill with confirmation
    const handleCreateBill = () => {
        if (selectedItems.length === 0) {
            showModal('warning', 'No Items Selected', 'Please select items to create a bill.');
            return;
        }

        showModal('confirm', 'Create Bill',
            `Create bill for ${selectedItems.length} items totaling ₹${selectedTotal.toFixed(2)}?`,
            () => onCreateBill(selectedItems, selectedTotal)
        );
    };

    // Handle clear selection with confirmation
    const handleClearSelection = () => {
        if (selectedItems.length === 0) return;

        showModal('discard', 'Clear Selection',
            `Are you sure you want to clear ${selectedItems.length} selected items?`,
            () => setSelectedItems([])
        );
    };

    // Handle add item
    const handleAddItem = () => {
        if (onAddItem) {
            onAddItem();
        } else {
            showModal('error', 'Feature Unavailable', 'Add item functionality is not available at the moment.');
        }
    };

    // Show modal helper function
    const showModal = (type, title, message, onConfirm = null) => {
        setModalConfig({
            title,
            message,
            onConfirm,
            type
        });

        switch (type) {
            case 'confirm':
                setShowConfirmModal(true);
                break;
            case 'success':
                setShowSuccessModal(true);
                break;
            case 'discard':
            case 'warning':
            case 'error':
            case 'info':
                setShowDiscardModal(true);
                break;
            default:
                setShowConfirmModal(true);
        }
    };

    // Handle modal confirm
    const handleConfirm = () => {
        if (modalConfig.onConfirm) {
            modalConfig.onConfirm();
        }
        setShowConfirmModal(false);
        setShowDiscardModal(false);
    };

    // Handle modal cancel/close
    const handleCancel = () => {
        setShowConfirmModal(false);
        setShowDiscardModal(false);
        setShowSuccessModal(false);
    };

    // Get modal icon and color based on type
    const getModalConfig = (type) => {
        switch (type) {
            case 'success':
                return { icon: 'check-circle', color: 'success', btnColor: 'success' };
            case 'warning':
                return { icon: 'exclamation-triangle', color: 'warning', btnColor: 'warning' };
            case 'error':
                return { icon: 'times-circle', color: 'danger', btnColor: 'danger' };
            case 'info':
                return { icon: 'info-circle', color: 'info', btnColor: 'info' };
            case 'discard':
                return { icon: 'trash', color: 'danger', btnColor: 'danger' };
            default:
                return { icon: 'question-circle', color: 'primary', btnColor: 'primary' };
        }
    };

    // Reset old items filters
    const resetOldItemsFilters = () => {
        setOldItemsFilter({
            date: '',
            category: '',
            search: ''
        });
        setOldItemsPage(1);
    };

    if (loadingItems) {
        return (
            <div className="text-center py-4">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
                <p className="mt-2 text-muted">Loading items...</p>
            </div>
        );
    }

    if (localItems.length === 0) {
        return (
            <div className="text-center py-5">
                <div className="text-muted mb-3">
                    <i className="fas fa-shopping-cart fa-3x"></i>
                </div>
                <h5 className="text-muted">No Items Found</h5>
                <p className="text-muted">No items have been added for this customer yet.</p>
                <button
                    className="btn btn-success mt-3"
                    onClick={handleAddItem}
                    style={{
                        background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                        border: "none",
                        borderRadius: "10px",
                        padding: "10px 20px"
                    }}
                >
                    <i className="fas fa-plus me-2"></i>
                    Add First Item
                </button>
            </div>
        );
    }

    const modalStyle = getModalConfig(modalConfig.type);

    return (
        <div>
            {/* Summary Cards */}
            <div className="row mb-4">
                <div className="col-md-3">
                    <div className="card border-0 text-center h-100" style={{
                        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                        borderRadius: "12px"
                    }}>
                        <div className="card-body py-3">
                            <i className="fas fa-coins fa-2x text-warning mb-2"></i>
                            <h6 className="text-white mb-1">Total Balance</h6>
                            <h5 className="text-white fw-bold">₹{totalAmount.toFixed(2)}</h5>
                        </div>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="card border-0 text-center h-100" style={{
                        background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
                        borderRadius: "12px"
                    }}>
                        <div className="card-body py-3">
                            <i className="fas fa-clock fa-2x text-warning mb-2"></i>
                            <h6 className="text-white mb-1">Pending Amount</h6>
                            <h5 className="text-white fw-bold">₹{pendingStats.pendingAmount.toFixed(2)}</h5>
                        </div>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="card border-0 text-center h-100" style={{
                        background: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
                        borderRadius: "12px"
                    }}>
                        <div className="card-body py-3">
                            <i className="fas fa-calendar-day fa-2x text-info mb-2"></i>
                            <h6 className="text-white mb-1">Pending Days</h6>
                            <h5 className="text-white fw-bold">{pendingStats.pendingDays} days</h5>
                        </div>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="card border-0 text-center h-100" style={{
                        background: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
                        borderRadius: "12px"
                    }}>
                        <div className="card-body py-3">
                            <i className="fas fa-shopping-cart fa-2x text-success mb-2"></i>
                            <h6 className="text-white mb-1">Total Items</h6>
                            <h5 className="text-white fw-bold">{pendingStats.totalItems}</h5>
                        </div>
                    </div>
                </div>
            </div>

            {/* Header with Actions */}
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h5 className="text-warning mb-0">
                    <i className="fas fa-shopping-cart me-2"></i>
                    Purchase History
                </h5>
                <div className="d-flex align-items-center gap-2">
                    {selectedItems.length > 0 && activeTab === 'current' && (
                        <span className="badge bg-warning fs-6 me-2">
                            Selected: {selectedItems.length} items (₹{selectedTotal.toFixed(2)})
                        </span>
                    )}
                    <button
                        className="btn btn-success btn-sm fw-bold"
                        onClick={handleAddItem}
                        style={{
                            background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                            border: "none",
                            borderRadius: "8px",
                            padding: "8px 16px"
                        }}
                    >
                        <i className="fas fa-plus me-2"></i>
                        Add Items
                    </button>
                    <button
                        className="btn btn-info btn-sm fw-bold"
                        onClick={onRefresh}
                        style={{
                            background: "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)",
                            border: "none",
                            borderRadius: "8px",
                            padding: "8px 16px"
                        }}
                    >
                        <i className="fas fa-sync-alt me-2"></i>
                        Refresh
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="mb-4">
                <ul className="nav nav-tabs nav-justified">
                    <li className="nav-item">
                        <button
                            className={`nav-link ${activeTab === 'current' ? 'active text-warning fw-bold' : 'text-light'}`}
                            onClick={() => setActiveTab('current')}
                            style={{
                                background: activeTab === 'current' ? 'rgba(30, 41, 59, 0.9)' : 'transparent',
                                border: 'none',
                                borderRadius: '8px 8px 0 0'
                            }}
                        >
                            <i className="fas fa-clock me-2"></i>
                            Current Items ({currentItems.length})
                        </button>
                    </li>
                    <li className="nav-item">
                        <button
                            className={`nav-link ${activeTab === 'old' ? 'active text-success fw-bold' : 'text-light'}`}
                            onClick={() => setActiveTab('old')}
                            style={{
                                background: activeTab === 'old' ? 'rgba(30, 41, 59, 0.9)' : 'transparent',
                                border: 'none',
                                borderRadius: '8px 8px 0 0'
                            }}
                        >
                            <i className="fas fa-history me-2"></i>
                            Paid History ({oldItems.length})
                        </button>
                    </li>
                </ul>
            </div>

            {/* Current Items Tab */}
            {activeTab === 'current' && (
                <>
                    {/* Date Tabs */}
                    <div className="mb-4">
                        <div className="d-flex flex-wrap gap-2 align-items-center mb-3">
                            <span className="text-light fw-bold me-2">Filter by Date:</span>
                            <button
                                className={`btn btn-sm ${selectedDate === '' ? 'btn-primary' : 'btn-outline-primary'}`}
                                onClick={() => setSelectedDate('')}
                                style={{
                                    borderRadius: "20px",
                                    padding: "6px 12px",
                                    fontWeight: "600"
                                }}
                            >
                                All Dates
                            </button>
                            {availableDates.map(date => (
                                <button
                                    key={date}
                                    className={`btn btn-sm ${selectedDate === date ? 'btn-primary' : 'btn-outline-primary'}`}
                                    onClick={() => setSelectedDate(date === selectedDate ? '' : date)}
                                    style={{
                                        borderRadius: "20px",
                                        padding: "6px 12px",
                                        fontWeight: "600"
                                    }}
                                >
                                    {formatDateShort(date)}
                                    {itemsByDate[date]?.some(item => item.status !== 'paid') && (
                                        <span className="badge bg-danger ms-1">!</span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Action Buttons for Selected Items */}
                    {selectedItems.length > 0 && (
                        <div className="mb-4 p-3 rounded" style={{
                            background: "linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(168, 85, 247, 0.2) 100%)",
                            border: "1px solid rgba(99, 102, 241, 0.3)"
                        }}>
                            <div className="d-flex justify-content-between align-items-center">
                                <div>
                                    <span className="text-light fw-bold">
                                        <i className="fas fa-check-circle me-2 text-success"></i>
                                        {selectedItems.length} items selected • Total: ₹{selectedTotal.toFixed(2)}
                                    </span>
                                </div>
                                <div className="d-flex gap-2">
                                    <button
                                        className="btn btn-success btn-sm fw-bold"
                                        onClick={handlePayAmount}
                                        style={{
                                            background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                                            border: "none",
                                            borderRadius: "8px",
                                            padding: "8px 16px"
                                        }}
                                    >
                                        <i className="fas fa-credit-card me-2"></i>
                                        Pay Amount
                                    </button>
                                    <button
                                        className="btn btn-warning btn-sm fw-bold"
                                        onClick={handleCreateBill}
                                        style={{
                                            background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                                            border: "none",
                                            borderRadius: "8px",
                                            padding: "8px 16px"
                                        }}
                                    >
                                        <i className="fas fa-receipt me-2"></i>
                                        Create Bill
                                    </button>
                                    <button
                                        className="btn btn-info btn-sm fw-bold"
                                        onClick={handleShareSelectedBill}
                                        style={{
                                            background: "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)",
                                            border: "none",
                                            borderRadius: "8px",
                                            padding: "8px 16px"
                                        }}
                                    >
                                        <i className="bi bi-share me-2"></i>
                                        Share Bill
                                    </button>
                                    <button
                                        className="btn btn-outline-light btn-sm fw-bold"
                                        onClick={handleClearSelection}
                                        style={{
                                            borderRadius: "8px",
                                            padding: "8px 16px"
                                        }}
                                    >
                                        <i className="fas fa-times me-2"></i>
                                        Clear
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Items Tables by Date */}
                    <div className="space-y-3">
                        {Object.entries(itemsByDate)
                            .filter(([date]) => !selectedDate || date === selectedDate)
                            .sort(([dateA], [dateB]) => new Date(dateB) - new Date(dateA))
                            .map(([date, items]) => {
                                const dateTotal = items.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0);
                                const pendingItems = items.filter(item => item.status !== 'paid');
                                const pendingItemsCount = pendingItems.length;
                                const paidItems = items.filter(item => item.status === 'paid').length;
                                const pendingAmount = pendingItems.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0);

                                return (
                                    <div key={date} className="card border-0 shadow-sm" style={{
                                        background: "linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.9) 100%)",
                                        borderRadius: "12px",
                                        border: "1px solid rgba(99, 102, 241, 0.2)"
                                    }}>
                                        {/* Date Header */}
                                        <div className="card-header border-0 d-flex justify-content-between align-items-center py-3" style={{
                                            background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
                                            borderRadius: "12px 12px 0 0"
                                        }}>
                                            <div className="d-flex align-items-center gap-3">
                                                <h6 className="text-white mb-0 fw-bold">
                                                    <i className="fas fa-calendar-day me-2"></i>
                                                    {items[0]?.displayDate || 'Invalid Date'}
                                                </h6>
                                                <span className="badge bg-light text-dark">
                                                    {items.length} items
                                                </span>
                                                {pendingItemsCount > 0 ? (
                                                    <span className="badge bg-warning">
                                                        <i className="fas fa-clock me-1"></i>
                                                        {pendingItemsCount} pending
                                                    </span>
                                                ) : (
                                                    <span className="badge bg-success">
                                                        <i className="fas fa-check me-1"></i>
                                                        All paid
                                                    </span>
                                                )}
                                                <span className="badge bg-info">
                                                    ₹{dateTotal.toFixed(2)}
                                                </span>
                                            </div>
                                            <div className="d-flex align-items-center gap-2">
                                                <button
                                                    className="btn btn-outline-light btn-sm"
                                                    onClick={() => handleShareDateBill(date)}
                                                    title="Share Bill for this date"
                                                    style={{
                                                        borderRadius: "6px",
                                                        padding: "4px 8px"
                                                    }}
                                                >
                                                    <i className="bi bi-share text-info"></i>
                                                </button>
                                                {pendingItemsCount > 0 && (
                                                    <div className="form-check form-check-inline m-0">
                                                        <input
                                                            type="checkbox"
                                                            className="form-check-input"
                                                            checked={isDateAllSelected(date)}
                                                            ref={input => {
                                                                if (input) {
                                                                    input.indeterminate = isDatePartiallySelected(date);
                                                                }
                                                            }}
                                                            onChange={(e) => handleSelectAll(e.target.checked, date)}
                                                            style={{ transform: "scale(1.1)" }}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Items Table */}
                                        <div className="card-body p-0">
                                            <div className="table-responsive">
                                                <table className="table table-dark table-hover align-middle mb-0">
                                                    <thead>
                                                        <tr style={{
                                                            background: "linear-gradient(135deg, #0369a1 0%, #0c4a6e 100%)"
                                                        }}>
                                                            <th className="text-center" style={{ width: '40px' }}>
                                                                #
                                                            </th>
                                                            <th style={{ width: '200px' }}>Item Details</th>
                                                            <th className="text-center" style={{ width: '100px' }}>Quantity</th>
                                                            <th className="text-center" style={{ width: '100px' }}>Price</th>
                                                            <th className="text-center" style={{ width: '120px' }}>Total</th>
                                                            <th className="text-center" style={{ width: '100px' }}>Status</th>
                                                            <th className="text-center" style={{ width: '60px' }}>Select</th>
                                                            <th className="text-center" style={{ width: '50px' }}>Share</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {items.map((item, index) => {
                                                            const isPaid = item.status === 'paid';
                                                            const isSelected = selectedItems.includes(item);

                                                            return (
                                                                <tr
                                                                    key={item.id}
                                                                    style={{
                                                                        background: isPaid
                                                                            ? "rgba(34, 197, 94, 0.2)"
                                                                            : index % 2 === 0
                                                                                ? "rgba(30, 41, 59, 0.7)"
                                                                                : "rgba(51, 65, 85, 0.7)",
                                                                        opacity: isPaid ? 0.7 : 1,
                                                                    }}
                                                                    className={isPaid ? 'text-success' : ''}
                                                                >
                                                                    <td className="text-center fw-bold">
                                                                        {index + 1}
                                                                    </td>
                                                                    <td>
                                                                        <div>
                                                                            <div className={`fw-semibold mb-1 ${isPaid ? 'text-success' : 'text-warning'}`}>
                                                                                {item.subCategory}
                                                                                {isPaid && (
                                                                                    <i className="fas fa-check-circle ms-2 text-success" title="Paid"></i>
                                                                                )}
                                                                            </div>
                                                                            <div className="small text-muted">
                                                                                {getTranslation(item.subCategory, 'en', true, item.mainCategory)} / {getTranslation(item.subCategory, 'hi', true, item.mainCategory)}
                                                                            </div>

                                                                            {isPaid && item.paymentDate && (
                                                                                <div className="small text-success">
                                                                                    <i className="fas fa-calendar-check me-1"></i>
                                                                                    Paid on :<span className='text-warning'> {new Date(item.paymentDate).toLocaleDateString()}</span>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                    <td className="text-center fw-bold">
                                                                        {item.quantity} KG
                                                                    </td>
                                                                    <td className="text-center text-success fw-bold">
                                                                        ₹{item.price}
                                                                    </td>
                                                                    <td className="text-center fw-bold">
                                                                        <span className={isPaid ? 'text-success' : 'text-warning'}>
                                                                            ₹{item.total}
                                                                        </span>
                                                                    </td>
                                                                    <td className="text-center">
                                                                        <span className={`badge ${isPaid ? 'bg-success' : 'bg-warning'}`}>
                                                                            {isPaid ? (
                                                                                <><i className="fas fa-check me-1"></i>Paid</>
                                                                            ) : (
                                                                                <><i className="fas fa-clock me-1"></i>Pending</>
                                                                            )}
                                                                        </span>
                                                                    </td>
                                                                    <td className="text-center">
                                                                        <input
                                                                            type="checkbox"
                                                                            className="form-check-input"
                                                                            checked={isSelected}
                                                                            onChange={(e) => handleItemSelect(item, e.target.checked)}
                                                                            disabled={isPaid}
                                                                            style={{
                                                                                transform: "scale(1.1)",
                                                                                opacity: isPaid ? 0.3 : 1,
                                                                                cursor: isPaid ? 'not-allowed' : 'pointer'
                                                                            }}
                                                                        />
                                                                    </td>
                                                                    <td className="text-center">
                                                                        <button
                                                                            className="btn btn-outline-info btn-sm"
                                                                            onClick={() => handleShareItemBill(item)}
                                                                            title="Share this item bill"
                                                                            style={{
                                                                                borderRadius: "6px",
                                                                                padding: "2px 6px",
                                                                                border: "1px solid #0dcaf0"
                                                                            }}
                                                                            disabled={isPaid}
                                                                        >
                                                                            <i className="bi bi-share fa-xs"></i>
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}

                                                        {/* Daily Total Row */}
                                                        <tr style={{
                                                            background: "linear-gradient(135deg, rgba(99, 102, 241, 0.3) 0%, rgba(168, 85, 247, 0.3) 100%)",
                                                            borderTop: "2px solid rgba(255,255,255,0.2)"
                                                        }}>
                                                            <td colSpan="4" className="text-end fw-bold text-white">
                                                                Daily Total:
                                                            </td>
                                                            <td className="text-center fw-bold text-warning">
                                                                ₹{dateTotal.toFixed(2)}
                                                            </td>
                                                            <td className="text-center">
                                                                <span className="badge bg-info">
                                                                    {pendingItemsCount > 0 ? (
                                                                        <><i className="fas fa-clock me-1"></i>{pendingItemsCount} pending</>
                                                                    ) : (
                                                                        <><i className="fas fa-check me-1"></i>All paid</>
                                                                    )}
                                                                </span>
                                                            </td>
                                                            <td className="text-center">
                                                                <span className="text-muted small">
                                                                    {pendingAmount > 0 ? `Pending: ₹${pendingAmount.toFixed(2)}` : 'Clear'}
                                                                </span>
                                                            </td>
                                                            <td className="text-center">
                                                                {/* Empty cell for share column */}
                                                            </td>
                                                        </tr>
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                    </div>
                </>
            )}

            {/* Old Items Tab */}
            {activeTab === 'old' && (
                <div className="card border-0 shadow-sm" style={{
                    background: "linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.9) 100%)",
                    borderRadius: "12px",
                    border: "1px solid rgba(34, 197, 94, 0.3)"
                }}>
                    <div className="card-header border-0 py-3" style={{
                        background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
                        borderRadius: "12px 12px 0 0"
                    }}>
                        <h6 className="text-white mb-0 fw-bold">
                            <i className="fas fa-history me-2"></i>
                            Paid Items History ({oldItems.length} items)
                        </h6>
                    </div>

                    {/* Filters */}
                    <div className="card-body border-bottom">
                        <div className="row g-3">
                            <div className="col-md-3">
                                <label className="form-label text-light small fw-bold">Date</label>
                                <select
                                    className="form-select form-select-sm"
                                    value={oldItemsFilter.date}
                                    onChange={(e) => {
                                        setOldItemsFilter(prev => ({ ...prev, date: e.target.value }));
                                        setOldItemsPage(1);
                                    }}
                                >
                                    <option value="">All Dates</option>
                                    {oldItemsDates.map(date => (
                                        <option key={date} value={date}>
                                            {formatDateFull(date)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="col-md-3">
                                <label className="form-label text-light small fw-bold">Category</label>
                                <select
                                    className="form-select form-select-sm"
                                    value={oldItemsFilter.category}
                                    onChange={(e) => {
                                        setOldItemsFilter(prev => ({ ...prev, category: e.target.value }));
                                        setOldItemsPage(1);
                                    }}
                                >
                                    <option value="">All Categories</option>
                                    {oldItemsCategories.map(category => (
                                        <option key={category} value={category}>
                                            {category}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="col-md-4">
                                <label className="form-label text-light small fw-bold">Search</label>
                                <input
                                    type="text"
                                    className="form-control form-control-sm"
                                    placeholder="Search by item name or notes..."
                                    value={oldItemsFilter.search}
                                    onChange={(e) => {
                                        setOldItemsFilter(prev => ({ ...prev, search: e.target.value }));
                                        setOldItemsPage(1);
                                    }}
                                />
                            </div>
                            <div className="col-md-2 d-flex align-items-end">
                                <button
                                    className="btn btn-outline-light btn-sm w-100"
                                    onClick={resetOldItemsFilters}
                                >
                                    <i className="fas fa-refresh me-1"></i>
                                    Reset
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Items Table */}
                    <div className="card-body p-0">
                        {filteredOldItems.length === 0 ? (
                            <div className="text-center py-5 text-muted">
                                <i className="fas fa-receipt fa-3x mb-3"></i>
                                <p>No paid items found</p>
                            </div>
                        ) : (
                            <>
                                <div className="table-responsive">
                                    <table className="table table-dark table-hover align-middle mb-0">
                                        <thead>
                                            <tr style={{
                                                background: "linear-gradient(135deg, #059669 0%, #047857 100%)"
                                            }}>
                                                <th className="text-center">#</th>
                                                <th>Item Details</th>
                                                <th className="text-center">Date</th>
                                                <th className="text-center">Quantity</th>
                                                <th className="text-center">Price</th>
                                                <th className="text-center">Total</th>
                                                <th className="text-center">Paid Date</th>
                                                <th className="text-center">Share</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {paginatedOldItems.map((item, index) => {
                                                const globalIndex = (oldItemsPage - 1) * oldItemsPerPage + index + 1;
                                                return (
                                                    <tr
                                                        key={item.id}
                                                        style={{
                                                            background: index % 2 === 0
                                                                ? "rgba(34, 197, 94, 0.1)"
                                                                : "rgba(34, 197, 94, 0.05)"
                                                        }}
                                                    >
                                                        <td className="text-center fw-bold text-success">
                                                            {globalIndex}
                                                        </td>
                                                        <td>
                                                            <div>
                                                                <div className="fw-semibold text-success mb-1">
                                                                    {item.subCategory}
                                                                    <i className="fas fa-check-circle ms-2 text-success" title="Paid"></i>
                                                                </div>
                                                                <div className="small text-muted">
                                                                    {getTranslation(item.subCategory, 'en', true, item.mainCategory)} / {getTranslation(item.subCategory, 'hi', true, item.mainCategory)}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="text-center text-light">
                                                            {formatDateShort(item.date)}
                                                        </td>
                                                        <td className="text-center fw-bold text-info">
                                                            {item.quantity} KG
                                                        </td>
                                                        <td className="text-center text-success fw-bold">
                                                            ₹{item.price}
                                                        </td>
                                                        <td className="text-center fw-bold text-warning">
                                                            ₹{item.total}
                                                        </td>
                                                        <td className="text-center text-success">
                                                            {item.paymentDate ? formatDateShort(item.paymentDate) : 'N/A'}
                                                        </td>
                                                        <td className="text-center">
                                                            <button
                                                                className="btn btn-outline-info btn-sm"
                                                                onClick={() => handleShareItemBill(item)}
                                                                title="Share this item bill"
                                                                style={{
                                                                    borderRadius: "6px",
                                                                    padding: "2px 6px",
                                                                    border: "1px solid #0dcaf0"
                                                                }}
                                                            >
                                                                <i className="bi bi-share fa-xs"></i>
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Pagination */}
                                <div className="card-footer border-0 d-flex justify-content-center align-items-center">
                                    <div className="text-warning small">
                                        Showing {paginatedOldItems.length} of {filteredOldItems.length} items
                                    </div>
                                    <div className="d-flex gap-2 align-items-center border-0">
                                        <div className="btn-group">
                                            <button
                                                className="btn btn-outline-light btn-sm"
                                                onClick={() => setOldItemsPage(prev => Math.max(1, prev - 1))}
                                                disabled={oldItemsPage === 1}
                                            >
                                                <i className="fas fa-chevron-left"></i>
                                            </button>
                                            <span className="btn btn-light btn-sm disabled">
                                                Page {oldItemsPage} of {Math.ceil(filteredOldItems.length / oldItemsPerPage)}
                                            </span>
                                            <button
                                                className="btn btn-outline-light btn-sm"
                                                onClick={() => setOldItemsPage(prev => Math.min(Math.ceil(filteredOldItems.length / oldItemsPerPage), prev + 1))}
                                                disabled={oldItemsPage >= Math.ceil(filteredOldItems.length / oldItemsPerPage)}
                                            >
                                                <i className="fas fa-chevron-right"></i>
                                            </button>
                                        </div>
                                        <select
                                            className="form-select form-select-sm w-auto"
                                            value={oldItemsPerPage}
                                            onChange={(e) => {
                                                setOldItemsPerPage(Number(e.target.value));
                                                setOldItemsPage(1);
                                            }}
                                        >
                                            <option value={5}>5 per page</option>
                                            <option value={10}>10 per page</option>
                                            <option value={20}>20 per page</option>
                                            <option value={50}>50 per page</option>
                                        </select>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Confirmation Modal */}
            {(showConfirmModal || showDiscardModal) && (
                <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 shadow-lg rounded-3">
                            <div className={`modal-header border-0 text-white`} style={{
                                background: `linear-gradient(135deg, var(--bs-${modalStyle.color}) 0%, var(--bs-${modalStyle.color}-dark) 100%)`
                            }}>
                                <h6 className="modal-title mb-0">
                                    <i className={`fas fa-${modalStyle.icon} me-2`}></i>
                                    {modalConfig.title}
                                </h6>
                            </div>
                            <div className="modal-body bg-dark bg-opacity-90 text-white p-4">
                                <p className="mb-0">{modalConfig.message}</p>
                            </div>
                            <div className="modal-footer border-0 bg-dark bg-opacity-75">
                                <button
                                    type="button"
                                    className="btn btn-outline-secondary"
                                    onClick={handleCancel}
                                    style={{ borderRadius: "8px" }}
                                >
                                    <i className="fas fa-times me-2"></i>
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className={`btn btn-${modalStyle.btnColor}`}
                                    onClick={handleConfirm}
                                    style={{
                                        borderRadius: "8px",
                                        background: `linear-gradient(135deg, var(--bs-${modalStyle.btnColor}) 0%, var(--bs-${modalStyle.btnColor}-dark) 100%)`,
                                        border: "none"
                                    }}
                                >
                                    <i className="fas fa-check me-2"></i>
                                    {modalConfig.type === 'discard' ? 'Discard' : 'Confirm'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Success Modal */}
            {showSuccessModal && (
                <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 shadow-lg rounded-3">
                            <div className="modal-header border-0 text-white" style={{
                                background: "linear-gradient(135deg, #10b981 0%, #059669 100%)"
                            }}>
                                <h6 className="modal-title mb-0">
                                    <i className="fas fa-check-circle me-2"></i>
                                    Success
                                </h6>
                            </div>
                            <div className="modal-body bg-dark bg-opacity-90 text-white p-4">
                                <p className="mb-0">{modalConfig.message}</p>
                            </div>
                            <div className="modal-footer border-0 bg-dark bg-opacity-75">
                                <button
                                    type="button"
                                    className="btn btn-success"
                                    onClick={handleCancel}
                                    style={{
                                        borderRadius: "8px",
                                        background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                                        border: "none"
                                    }}
                                >
                                    <i className="fas fa-check me-2"></i>
                                    OK
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ItemsList;