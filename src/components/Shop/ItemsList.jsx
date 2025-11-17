import React, { useState, useMemo, useEffect } from 'react';

const ItemsList = ({ 
    customerItems, 
    loadingItems, 
    totalAmount, 
    onAddItem, 
    onRefresh,
    categoryTranslations,
    getTranslation,
    onPayAmount,
    onCreateBill,
    onUpdateItemStatus,
    refreshTrigger
}) => {
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedItems, setSelectedItems] = useState([]);
    const [localItems, setLocalItems] = useState([]);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showDiscardModal, setShowDiscardModal] = useState(false);
    const [modalConfig, setModalConfig] = useState({
        title: '',
        message: '',
        onConfirm: null,
        type: '' // 'confirm', 'success', 'discard'
    });

    // Sync local items with prop changes
    useEffect(() => {
        setLocalItems(customerItems);
    }, [customerItems, refreshTrigger]);

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

    // Group items by date
    const itemsByDate = useMemo(() => {
        const grouped = {};
        localItems.forEach(item => {
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
    }, [localItems]);

    // Get all unique dates sorted (newest first)
    const availableDates = useMemo(() => {
        return Object.keys(itemsByDate).sort((a, b) => new Date(b) - new Date(a));
    }, [itemsByDate]);

    // Calculate total for selected items
    const selectedTotal = useMemo(() => {
        return selectedItems.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0);
    }, [selectedItems]);

    // Calculate pending amount and items
    const pendingStats = useMemo(() => {
        const pendingItems = localItems.filter(item => item.status !== 'paid');
        const pendingAmount = pendingItems.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0);
        
        const pendingDates = new Set();
        pendingItems.forEach(item => {
            if (item.date) pendingDates.add(item.date);
        });
        
        return {
            pendingAmount,
            pendingItemsCount: pendingItems.length,
            pendingDays: pendingDates.size,
            totalItems: localItems.length
        };
    }, [localItems]);

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

    // Handle pay amount with confirmation
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
            () => onPayAmount(payableItems, selectedTotal)
        );
    };

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
                    {selectedItems.length > 0 && (
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
                        const pendingItems = items.filter(item => item.status !== 'paid').length;
                        const paidItems = items.filter(item => item.status === 'paid').length;
                        
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
                                        {pendingItems > 0 ? (
                                            <span className="badge bg-warning">
                                                <i className="fas fa-clock me-1"></i>
                                                {pendingItems} pending
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
                                    {pendingItems > 0 && (
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
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {items.map((item, index) => (
                                                    <tr 
                                                        key={item.id} 
                                                        style={{
                                                            background: item.status === 'paid' 
                                                                ? "rgba(34, 197, 94, 0.1)" 
                                                                : index % 2 === 0
                                                                    ? "rgba(30, 41, 59, 0.7)"
                                                                    : "rgba(51, 65, 85, 0.7)",
                                                            opacity: item.status === 'paid' ? 0.7 : 1
                                                        }}
                                                    >
                                                        <td className="text-center fw-bold text-muted">
                                                            {index + 1}
                                                        </td>
                                                        <td>
                                                            <div>
                                                                <div className="fw-semibold text-warning mb-1">
                                                                    {item.subCategory}
                                                                </div>
                                                                <div className="small text-muted">
                                                                    {getTranslation(item.subCategory, 'en', true, item.mainCategory)}
                                                                </div>
                                                                <div className="small text-muted">
                                                                    {getTranslation(item.subCategory, 'hi', true, item.mainCategory)}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="text-center fw-bold">
                                                            {item.quantity} KG
                                                        </td>
                                                        <td className="text-center text-success fw-bold">
                                                            ₹{item.price}
                                                        </td>
                                                        <td className="text-center text-warning fw-bold">
                                                            ₹{item.total}
                                                        </td>
                                                        <td className="text-center">
                                                            <span className={`badge ${item.status === 'paid' ? 'bg-success' : 'bg-warning'}`}>
                                                                {item.status === 'paid' ? (
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
                                                                checked={selectedItems.includes(item)}
                                                                onChange={(e) => handleItemSelect(item, e.target.checked)}
                                                                disabled={item.status === 'paid'}
                                                                style={{ 
                                                                    transform: "scale(1.1)",
                                                                    opacity: item.status === 'paid' ? 0.5 : 1,
                                                                    cursor: item.status === 'paid' ? 'not-allowed' : 'pointer'
                                                                }}
                                                            />
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
            </div>

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