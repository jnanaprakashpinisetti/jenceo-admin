// src/components/Shop/Credits.jsx
import React, { useEffect, useState } from "react";
import firebaseDB from "../../firebase";
import { useAuth } from "../../context/AuthContext";
import ShopForm from "./ShopForm";
import CustomerModal from "./CustomerModal";
import CustmorForm from "./CustmorForm";

// CustomerList Component
const CustomerList = () => {
    const { user: authUser } = useAuth?.() || {};
    const [customers, setCustomers] = useState([]);
    const [filteredCustomers, setFilteredCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [showShopForm, setShowShopForm] = useState(false);
    const [showCustomerForm, setShowCustomerForm] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showDeletedCustomersModal, setShowDeletedCustomersModal] = useState(false);
    const [deletedCustomers, setDeletedCustomers] = useState([]);
    const [customerToDelete, setCustomerToDelete] = useState(null);
    const [customerToEdit, setCustomerToEdit] = useState(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // Filter states
    const [filters, setFilters] = useState({
        search: "",
        reminderDate: "",
        amountOperator: ">",
        amountValue: "",
        reminderStatus: "all" // all, today, tomorrow, upcoming, overdue
    });

    // Check if user is admin
    const isAdmin = authUser?.email === "admin@example.com" || authUser?.role === "admin";

    // Load customers and reminders
    useEffect(() => {
        setLoading(true);
        const correctPath = "Shop/CreditData";

        const loadCustomers = async () => {
            try {
                const ref = firebaseDB.child(correctPath);
                const snapshot = await ref.once('value');
                const raw = snapshot.val() || {};

                if (Object.keys(raw).length > 0) {
                    processCustomerData(raw);
                } else {
                    setCustomers([]);
                    setFilteredCustomers([]);
                    setLoading(false);
                }
            } catch (error) {
                console.error("Error loading customers:", error);
                setCustomers([]);
                setFilteredCustomers([]);
                setLoading(false);
            }
        };

        const processCustomerData = (raw) => {
            const customersList = [];

            for (const [customerId, customerData] of Object.entries(raw)) {
                if (!customerData || typeof customerData !== 'object') {
                    continue;
                }

                const hasCustomerFields = customerData.name || customerData.idNo;
                const isNestedData = customerId === "PurchaseItems" || customerId === "Balance" || customerId === "Payments";

                if (hasCustomerFields && !isNestedData) {
                    // Calculate balance from customer items
                    const balance = calculateBalanceFromItems(customerData);

                    // Get latest reminder date
                    const latestReminder = getLatestReminder(customerData);

                    // Get reminder status
                    const reminderStatus = latestReminder.date ? getReminderStatus(latestReminder.date) : 'none';

                    customersList.push({
                        id: customerId,
                        name: customerData.name || 'Unnamed Customer',
                        idNo: customerData.idNo || 'N/A',
                        gender: customerData.gender || 'N/A',
                        character: customerData.character || 'average',
                        mobileNo: customerData.mobileNo || '',
                        place: customerData.place || '',
                        reminderDate: latestReminder.date || '',
                        reminderStatus: reminderStatus,
                        balance: balance,
                        isDeleted: customerData.isDeleted || false,
                        ...customerData
                    });
                }
            }

            // Filter out deleted customers from main list
            const activeCustomers = customersList.filter(c => !c.isDeleted);
            const deletedCustomersList = customersList.filter(c => c.isDeleted);

            setCustomers(activeCustomers);
            setDeletedCustomers(deletedCustomersList);
            setFilteredCustomers(activeCustomers);
            setLoading(false);
        };

        loadCustomers();
    }, [refreshTrigger]);

    // Get latest reminder from customer data
    const getLatestReminder = (customerData) => {
        if (!customerData.reminders) return { date: '', status: 'none' };

        // Handle both array and object formats
        let reminders = [];
        if (Array.isArray(customerData.reminders)) {
            reminders = customerData.reminders;
        } else if (typeof customerData.reminders === 'object') {
            reminders = Object.values(customerData.reminders);
        }

        // Sort by date descending and get the latest
        const sortedReminders = reminders
            .filter(r => r && r.date)
            .sort((a, b) => new Date(b.date) - new Date(a.date));

        return sortedReminders[0] || { date: '', status: 'none' };
    };

    // Get reminder status based on date (same as BasicDetails.jsx)
    const getReminderStatus = (dateString) => {
        if (!dateString) return 'none';

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

    // Get reminder status color and label
    const getReminderStatusInfo = (status) => {
        switch (status) {
            case 'today': return { color: 'warning', label: 'Today', bgColor: 'rgba(245, 158, 11, 0.3)' };
            case 'tomorrow': return { color: 'info', label: 'Tomorrow', bgColor: 'rgba(59, 130, 246, 0.3)' };
            case 'overdue': return { color: 'danger', label: 'Overdue', bgColor: 'rgba(239, 68, 68, 0.3)' };
            case 'upcoming': return { color: 'success', label: 'Upcoming', bgColor: 'rgba(16, 185, 129, 0.3)' };
            case 'future': return { color: 'secondary', label: 'Future', bgColor: 'rgba(100, 116, 139, 0.3)' };
            default: return { color: 'secondary', label: 'No Reminder', bgColor: 'rgba(100, 116, 139, 0.3)' };
        }
    };

    // Calculate balance from customer items
    const calculateBalanceFromItems = (customerData) => {
        if (!customerData) return 0;

        let totalBalance = 0;

        if (customerData.PurchaseItems && typeof customerData.PurchaseItems === 'object') {
            const items = customerData.PurchaseItems;
            const itemsArray = Array.isArray(items) ? items : Object.values(items);

            itemsArray.forEach(item => {
                if (item && item.total && item.status !== 'paid') {
                    totalBalance += parseFloat(item.total) || 0;
                }
            });
        }

        return totalBalance;
    };

    // Apply filters
    useEffect(() => {
        let filtered = customers;

        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            filtered = filtered.filter(customer =>
                customer.name?.toLowerCase().includes(searchLower) ||
                customer.idNo?.toLowerCase().includes(searchLower) ||
                customer.place?.toLowerCase().includes(searchLower) ||
                customer.mobileNo?.includes(filters.search)
            );
        }

        if (filters.reminderDate) {
            filtered = filtered.filter(customer =>
                customer.reminderDate === filters.reminderDate
            );
        }

        if (filters.amountValue) {
            const amount = parseFloat(filters.amountValue);
            if (!isNaN(amount)) {
                filtered = filtered.filter(customer => {
                    const customerBalance = customer.balance || 0;
                    if (filters.amountOperator === ">") {
                        return customerBalance > amount;
                    } else if (filters.amountOperator === "<") {
                        return customerBalance < amount;
                    } else if (filters.amountOperator === "=") {
                        return customerBalance === amount;
                    }
                    return true;
                });
            }
        }

        // Apply reminder status filter
        if (filters.reminderStatus !== "all") {
            filtered = filtered.filter(customer =>
                customer.reminderStatus === filters.reminderStatus
            );
        }

        setFilteredCustomers(filtered);
    }, [customers, filters]);

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({
            ...prev,
            [key]: value
        }));
    };

    const clearFilters = () => {
        setFilters({
            search: "",
            reminderDate: "",
            amountOperator: ">",
            amountValue: "",
            reminderStatus: "all"
        });
    };

    const handleRowClick = (customer) => {
        setSelectedCustomer(customer);
        setShowModal(true);
    };

    // Handle edit customer
    const handleEdit = (customer, e) => {
        e.stopPropagation();
        setCustomerToEdit(customer);
        setShowEditModal(true);
    };

    // Handle soft delete (mark as deleted)
    const handleDelete = (customer, e) => {
        e.stopPropagation();
        setCustomerToDelete(customer);
        setShowDeleteModal(true);
    };

    // Confirm delete (soft delete)
    const confirmDelete = async () => {
        if (!customerToDelete) return;

        try {
            const correctPath = `Shop/CreditData/${customerToDelete.id}`;
            await firebaseDB.child(correctPath).update({
                isDeleted: true,
                deletedAt: new Date().toISOString(),
                deletedBy: authUser?.email || 'unknown'
            });

            // Refresh data
            setRefreshTrigger(prev => prev + 1);
            setShowDeleteModal(false);
            setCustomerToDelete(null);
        } catch (error) {
            console.error("Error deleting customer:", error);
            alert("Error marking customer as deleted");
        }
    };

    // Restore deleted customer
    const handleRestoreCustomer = async (customerId) => {
        try {
            const correctPath = `Shop/CreditData/${customerId}`;
            await firebaseDB.child(correctPath).update({
                isDeleted: false,
                restoredAt: new Date().toISOString()
            });

            // Refresh data
            setRefreshTrigger(prev => prev + 1);
        } catch (error) {
            console.error("Error restoring customer:", error);
            alert("Error restoring customer");
        }
    };

    // Permanently delete customer (admin only)
    const handlePermanentDelete = async (customerId) => {
        if (!window.confirm("Are you sure you want to permanently delete this customer? This action cannot be undone!")) {
            return;
        }

        try {
            const correctPath = `Shop/CreditData/${customerId}`;
            await firebaseDB.child(correctPath).remove();

            // Refresh data
            setRefreshTrigger(prev => prev + 1);
        } catch (error) {
            console.error("Error permanently deleting customer:", error);
            alert("Error permanently deleting customer");
        }
    };

    const handleAddItems = (customer, e) => {
        e.stopPropagation();
        setSelectedCustomer(customer);
        setShowShopForm(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setSelectedCustomer(null);
    };

    const handleCloseEditModal = () => {
        setShowEditModal(false);
        setCustomerToEdit(null);
    };

    // Update customer data
    const handleUpdateCustomer = async (updatedData) => {
        if (!customerToEdit) return;

        try {
            const correctPath = `Shop/CreditData/${customerToEdit.id}`;
            await firebaseDB.child(correctPath).update({
                ...updatedData,
                updatedAt: new Date().toISOString(),
                updatedBy: authUser?.email || 'unknown'
            });

            // Refresh data
            setRefreshTrigger(prev => prev + 1);
            setShowEditModal(false);
            setCustomerToEdit(null);
            alert("Customer updated successfully!");
        } catch (error) {
            console.error("Error updating customer:", error);
            alert("Error updating customer");
        }
    };

    const formatPhoneNumber = (phone) => {
        if (!phone) return "N/A";
        const cleaned = phone.toString().replace(/\D/g, '');
        if (cleaned.length === 10) {
            return cleaned.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
        }
        return phone;
    };

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

    // Refresh customer data
    const refreshCustomerData = () => {
        setRefreshTrigger(prev => prev + 1);
    };

    return (
        <div className="p-3 bg-dark border border-secondary rounded-3 border-opacity-25 mt-3">

            {/* Header */}
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h4 className="text-warning mb-0">
                    <i className="bi bi-users me-2"></i>
                    Customers List
                </h4>
                <div className="d-flex gap-2">
                    {isAdmin && deletedCustomers.length > 0 && (
                        <button
                            className="btn btn-danger"
                            onClick={() => setShowDeletedCustomersModal(true)}
                            style={{
                                background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                                border: "none",
                                borderRadius: "10px",
                                padding: "10px 20px",
                                fontWeight: "600"
                            }}
                        >
                            <i className="bi bi-trash me-2"></i>
                            Deleted Customers ({deletedCustomers.length})
                        </button>
                    )}
                    <button
                        className="btn btn-success"
                        onClick={() => setShowCustomerForm(true)}
                        style={{
                            background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                            border: "none",
                            borderRadius: "10px",
                            padding: "10px 20px",
                            fontWeight: "600"
                        }}
                    >
                        <i className="fas fa-plus me-2"></i>
                        Add New Customer
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="card bg-dark border-secondary border-opacity-10 mb-4">
                <div className="card-header bg-primary bg-opacity-25">
                    <h6 className="mb-0 text-white">
                        <i className="bi bi-filter me-2"></i>
                        Filters
                    </h6>
                </div>
                <div className="card-body bg-secondary bg-opacity-10">
                    <div className="row g-3">
                        <div className="col-md-2">
                            <label className="form-label text-white small">Search</label>
                            <input
                                type="text"
                                className="form-control form-control-sm bg-dark text-white border-secondary"
                                placeholder="Search by name, ID, place, mobile..."
                                value={filters.search}
                                onChange={(e) => handleFilterChange('search', e.target.value)}
                            />
                        </div>
                        <div className="col-md-2">
                            <label className="form-label text-white small">Reminder Date</label>
                            <input
                                type="date"
                                className="form-control form-control-sm bg-dark text-white border-secondary"
                                value={filters.reminderDate}
                                onChange={(e) => handleFilterChange('reminderDate', e.target.value)}
                            />
                        </div>
                        <div className="col-md-2">
                            <label className="form-label text-white small">Reminder Status</label>
                            <select
                                className="form-select form-select-sm bg-dark text-white border-secondary"
                                value={filters.reminderStatus}
                                onChange={(e) => handleFilterChange('reminderStatus', e.target.value)}
                            >
                                <option value="all">All Reminders</option>
                                <option value="today">Today</option>
                                <option value="tomorrow">Tomorrow</option>
                                <option value="upcoming">Upcoming (7 days)</option>
                                <option value="overdue">Overdue</option>
                                <option value="future">Future</option>
                                <option value="none">No Reminder</option>
                            </select>
                        </div>
                        <div className="col-md-3">
                            <label className="form-label text-white small">Balance Amount</label>
                            <div className="input-group input-group-sm">
                                <select
                                    className="form-select bg-dark text-white border-secondary"
                                    value={filters.amountOperator}
                                    onChange={(e) => handleFilterChange('amountOperator', e.target.value)}
                                    style={{ flex: '0 0 80px' }}
                                >
                                    <option value=">">&gt;</option>
                                    <option value="<">&lt;</option>
                                    <option value="=">=</option>
                                </select>
                                <input
                                    type="number"
                                    className="form-control bg-dark text-white border-secondary"
                                    placeholder="Amount"
                                    value={filters.amountValue}
                                    onChange={(e) => handleFilterChange('amountValue', e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="col-md-2 d-flex align-items-end">
                            <button
                                className="btn btn-outline-secondary btn-sm"
                                onClick={clearFilters}
                            >
                                <i className="bi bi-times me-2"></i>
                                Clear Filters
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-4">
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="mt-2 text-muted">Loading customers data...</p>
                </div>
            ) : filteredCustomers.length === 0 ? (
                <div className="text-center py-5">
                    <div className="text-muted mb-3">
                        <i className="bi bi-users fa-3x"></i>
                    </div>
                    <h5 className="text-muted">No Customers Found</h5>
                    <p className="text-muted">
                        {customers.length === 0
                            ? "No customers found in database. Try adding a customer or check Firebase paths."
                            : "No customers match your search criteria."
                        }
                    </p>
                </div>
            ) : (
                <div className="table-responsive">
                    <table className="table table-dark table-bordered table-hover align-middle">
                        <thead>
                            <tr style={{
                                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                            }}>
                                <th className="text-center">S. No</th>
                                <th className="text-center">ID No</th>
                                <th>Name</th>
                                <th>Gender</th>
                                <th className="text-center">Rating</th>
                                <th className="text-center">Mobile No</th>
                                <th className="text-center">Balance Amount</th>
                                <th className="text-center">Reminder Date</th>
                                <th className="text-center">Reminder Status</th>
                                <th className="text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredCustomers.map((customer, index) => {
                                const characterInfo = getCharacterInfo(customer.character);
                                const balance = customer.balance || 0;
                                const reminderStatusInfo = getReminderStatusInfo(customer.reminderStatus);

                                return (
                                    <tr
                                        key={customer.id}
                                        style={{
                                            background: index % 2 === 0
                                                ? "rgba(30, 41, 59, 0.7)"
                                                : "rgba(51, 65, 85, 0.7)",
                                            cursor: "pointer"
                                        }}
                                        onClick={() => handleRowClick(customer)}
                                    >
                                        <td className="text-center fw-bold">{index + 1}</td>
                                        <td className="text-center">
                                            <span className="text-info">
                                                {customer.idNo || "N/A"}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="d-flex align-items-center">
                                                <i className="bi bi-user-circle text-warning me-2"></i>
                                                <strong>{customer.name || "Unnamed"}</strong>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`badge ${customer.gender === 'male' ? 'bg-primary' :
                                                customer.gender === 'female' ? 'bg-pink' : 'bg-secondary'
                                                }`}>
                                                {customer.gender ? customer.gender.charAt(0).toUpperCase() + customer.gender.slice(1) : "N/A"}
                                            </span>
                                        </td>
                                        <td className="text-center">
                                            <span className={`badge bg-${characterInfo.color}`}>
                                                {characterInfo.label}
                                            </span>
                                        </td>
                                        <td className="text-center">
                                            {customer.mobileNo ? (
                                                <div className="d-flex justify-content-center align-items-center gap-2">
                                                    <span className="fw-semibold">
                                                        {formatPhoneNumber(customer.mobileNo)}
                                                    </span>
                                                    <div className="d-flex gap-1">
                                                        <a
                                                            href={`tel:${customer.mobileNo}`}
                                                            className="btn btn-sm btn-info px-2 py-1"
                                                            title="Call"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <i className="bi bi-phone fa-xs"></i>
                                                        </a>
                                                        <a
                                                            href={`https://wa.me/${customer.mobileNo}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="btn btn-sm px-2 py-1"
                                                            title="WhatsApp"
                                                            onClick={(e) => e.stopPropagation()}
                                                            style={{
                                                                background: "linear-gradient(135deg, #25d366 0%, #128c7e 100%)",
                                                                border: "none",
                                                                borderRadius: "5px"
                                                            }}
                                                        >
                                                            <i className="bi bi-whatsapp fa-xs"></i>
                                                        </a>
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-muted">N/A</span>
                                            )}
                                        </td>
                                        <td className="text-center">
                                            <span className={`badge ${balance > 0 ? 'bg-danger' : 'bg-success'}`}>
                                                ₹{balance.toFixed(2)}
                                            </span>
                                        </td>
                                        <td className="text-center">
                                            {customer.reminderDate ? (
                                                <span className="badge bg-warning text-dark">
                                                    {new Date(customer.reminderDate).toLocaleDateString()}
                                                </span>
                                            ) : (
                                                <span className="badge bg-secondary">No Reminder</span>
                                            )}
                                        </td>
                                        <td className="text-center">
                                            <span className={`badge bg-${reminderStatusInfo.color}`}>
                                                {reminderStatusInfo.label}
                                            </span>
                                        </td>
                                        <td className="text-center">
                                            <div className="d-flex justify-content-center gap-2">
                                                <button
                                                    className="btn btn-sm btn-warning px-2"
                                                    onClick={(e) => handleEdit(customer, e)}
                                                    title="Edit Customer"
                                                    style={{
                                                        background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                                                        border: "none",
                                                        borderRadius: "5px"
                                                    }}
                                                >
                                                    <i className="bi bi-pencil"></i>
                                                </button>
                                                <button
                                                    className="btn btn-sm btn-success px-2"
                                                    onClick={(e) => handleAddItems(customer, e)}
                                                    title="Add Items"
                                                    style={{
                                                        background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                                                        border: "none",
                                                        borderRadius: "5px"
                                                    }}
                                                >
                                                    <i className="bi bi-cart-plus"></i>
                                                </button>
                                                <button
                                                    className="btn btn-sm btn-danger px-2"
                                                    onClick={(e) => handleDelete(customer, e)}
                                                    title="Delete Customer"
                                                    style={{
                                                        background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                                                        border: "none",
                                                        borderRadius: "5px"
                                                    }}
                                                >
                                                    <i className="bi bi-trash"></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Customer Modal */}
            {showModal && selectedCustomer && (
                <CustomerModal
                    customer={selectedCustomer}
                    onClose={handleCloseModal}
                    onDataUpdate={refreshCustomerData}
                />
            )}

            {/* Shop Form Modal */}
            {showShopForm && selectedCustomer && (
                <ShopForm
                    customer={selectedCustomer}
                    onClose={() => setShowShopForm(false)}
                    onSave={() => {
                        setShowShopForm(false);
                        refreshCustomerData();
                    }}
                    mode="customer"
                />
            )}

            {/* Customer Form Modal */}
            {showCustomerForm && (
                <CustmorForm
                    onSuccess={(customerData) => {
                        setShowCustomerForm(false);
                        refreshCustomerData();
                    }}
                    onCancel={() => setShowCustomerForm(false)}
                />
            )}

            {/* Edit Customer Modal */}
            {showEditModal && customerToEdit && (
                <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.9)' }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 shadow-lg" style={{
                            background: "linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.95) 100%)",
                            borderRadius: "15px",
                            border: "2px solid rgba(245, 158, 11, 0.5)"
                        }}>
                            <div className="modal-header border-0" style={{
                                background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                                borderRadius: "15px 15px 0 0"
                            }}>
                                <h5 className="modal-title text-white fw-bold">
                                    <i className="bi bi-pencil-square me-2"></i>
                                    Edit Customer: {customerToEdit.name}
                                </h5>
                                <button
                                    type="button"
                                    className="btn-close btn-close-white"
                                    onClick={handleCloseEditModal}
                                ></button>
                            </div>
                            <div className="modal-body">
                                <form onSubmit={(e) => {
                                    e.preventDefault();
                                    const formData = new FormData(e.target);
                                    const updatedData = {
                                        name: formData.get('name'),
                                        idNo: formData.get('idNo'),
                                        gender: formData.get('gender'),
                                        mobileNo: formData.get('mobileNo'),
                                        place: formData.get('place'),
                                        character: formData.get('character'),
                                        notes: formData.get('notes')
                                    };
                                    handleUpdateCustomer(updatedData);
                                }}>
                                    <div className="row g-3">
                                        <div className="col-md-6">
                                            <label className="form-label text-light">Full Name</label>
                                            <input
                                                type="text"
                                                className="form-control bg-dark text-white border-secondary"
                                                name="name"
                                                defaultValue={customerToEdit.name}
                                                required
                                            />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label text-light">ID Number</label>
                                            <input
                                                type="text"
                                                className="form-control bg-dark text-white border-secondary"
                                                name="idNo"
                                                defaultValue={customerToEdit.idNo}
                                            />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label text-light">Gender</label>
                                            <select
                                                className="form-select bg-dark text-white border-secondary"
                                                name="gender"
                                                defaultValue={customerToEdit.gender}
                                            >
                                                <option value="male">Male</option>
                                                <option value="female">Female</option>
                                                <option value="other">Other</option>
                                            </select>
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label text-light">Mobile Number</label>
                                            <input
                                                type="tel"
                                                className="form-control bg-dark text-white border-secondary"
                                                name="mobileNo"
                                                defaultValue={customerToEdit.mobileNo}
                                            />
                                        </div>
                                        <div className="col-md-12">
                                            <label className="form-label text-light">Address/Place</label>
                                            <input
                                                type="text"
                                                className="form-control bg-dark text-white border-secondary"
                                                name="place"
                                                defaultValue={customerToEdit.place}
                                            />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label text-light">Character Rating</label>
                                            <select
                                                className="form-select bg-dark text-white border-secondary"
                                                name="character"
                                                defaultValue={customerToEdit.character}
                                            >
                                                <option value="very-good">Very Good</option>
                                                <option value="good">Good</option>
                                                <option value="average">Average</option>
                                                <option value="bad">Bad</option>
                                                <option value="worst">Worst</option>
                                            </select>
                                        </div>
                                        <div className="col-md-12">
                                            <label className="form-label text-light">Notes</label>
                                            <textarea
                                                className="form-control bg-dark text-white border-secondary"
                                                name="notes"
                                                rows="3"
                                                defaultValue={customerToEdit.notes}
                                            />
                                        </div>
                                    </div>
                                    <div className="modal-footer border-0 mt-4">
                                        <button
                                            type="button"
                                            className="btn btn-secondary"
                                            onClick={handleCloseEditModal}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="btn btn-warning"
                                        >
                                            <i className="bi bi-check-circle me-2"></i>
                                            Update Customer
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && customerToDelete && (
                <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.9)' }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 shadow-lg" style={{
                            background: "linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.95) 100%)",
                            borderRadius: "15px",
                            border: "2px solid rgba(239, 68, 68, 0.5)"
                        }}>
                            <div className="modal-header border-0" style={{
                                background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                                borderRadius: "15px 15px 0 0"
                            }}>
                                <h5 className="modal-title text-white fw-bold">
                                    <i className="bi bi-exclamation-triangle me-2"></i>
                                    Confirm Delete
                                </h5>
                                <button
                                    type="button"
                                    className="btn-close btn-close-white"
                                    onClick={() => {
                                        setShowDeleteModal(false);
                                        setCustomerToDelete(null);
                                    }}
                                ></button>
                            </div>
                            <div className="modal-body text-center">
                                <div className="mb-4">
                                    <i className="bi bi-trash fa-3x text-danger mb-3"></i>
                                    <h5 className="text-light">Are you sure you want to remove this customer?</h5>
                                    <p className="text-muted">
                                        Customer: <strong className="text-warning">{customerToDelete.name}</strong><br />
                                        ID: <strong className="text-info">{customerToDelete.idNo}</strong>
                                    </p>
                                    <p className="text-warning small">
                                        <i className="bi bi-info-circle me-1"></i>
                                        Note: Customer will be moved to deleted customers list and can be restored later.
                                    </p>
                                </div>
                                <div className="d-flex justify-content-center gap-3">
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={() => {
                                            setShowDeleteModal(false);
                                            setCustomerToDelete(null);
                                        }}
                                    >
                                        <i className="bi bi-x-circle me-2"></i>
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-danger"
                                        onClick={confirmDelete}
                                    >
                                        <i className="bi bi-check-circle me-2"></i>
                                        Confirm Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Deleted Customers Modal */}
            {showDeletedCustomersModal && (
                <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.9)' }}>
                    <div className="modal-dialog modal-xl modal-dialog-centered">
                        <div className="modal-content border-0 shadow-lg" style={{
                            background: "linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.95) 100%)",
                            borderRadius: "15px",
                            border: "2px solid rgba(239, 68, 68, 0.5)"
                        }}>
                            <div className="modal-header border-0" style={{
                                background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                                borderRadius: "15px 15px 0 0"
                            }}>
                                <h5 className="modal-title text-white fw-bold">
                                    <i className="bi bi-trash me-2"></i>
                                    Deleted Customers ({deletedCustomers.length})
                                </h5>
                                <button
                                    type="button"
                                    className="btn-close btn-close-white"
                                    onClick={() => setShowDeletedCustomersModal(false)}
                                ></button>
                            </div>
                            <div className="modal-body">
                                {deletedCustomers.length === 0 ? (
                                    <div className="text-center py-5">
                                        <i className="bi bi-trash fa-3x text-muted mb-3"></i>
                                        <h5 className="text-muted">No Deleted Customers</h5>
                                        <p className="text-muted">All customers are active</p>
                                    </div>
                                ) : (
                                    <div className="table-responsive">
                                        <table className="table table-dark table-bordered table-hover align-middle">
                                            <thead>
                                                <tr style={{
                                                    background: "linear-gradient(135deg, #dc2626 0%, #991b1b 100%)"
                                                }}>
                                                    <th className="text-center">S. No</th>
                                                    <th>Name</th>
                                                    <th className="text-center">ID No</th>
                                                    <th className="text-center">Mobile No</th>
                                                    <th className="text-center">Balance</th>
                                                    <th className="text-center">Deleted Date</th>
                                                    <th className="text-center">Deleted By</th>
                                                    <th className="text-center">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {deletedCustomers.map((customer, index) => (
                                                    <tr key={customer.id}>
                                                        <td className="text-center fw-bold">{index + 1}</td>
                                                        <td>
                                                            <div className="d-flex align-items-center">
                                                                <i className="bi bi-user-circle text-muted me-2"></i>
                                                                <strong>{customer.name || "Unnamed"}</strong>
                                                            </div>
                                                        </td>
                                                        <td className="text-center">
                                                            <span className="text-info">{customer.idNo || "N/A"}</span>
                                                        </td>
                                                        <td className="text-center">
                                                            {customer.mobileNo ? formatPhoneNumber(customer.mobileNo) : "N/A"}
                                                        </td>
                                                        <td className="text-center">
                                                            <span className={`badge ${customer.balance > 0 ? 'bg-danger' : 'bg-success'}`}>
                                                                ₹{customer.balance?.toFixed(2) || '0.00'}
                                                            </span>
                                                        </td>
                                                        <td className="text-center">
                                                            <span className="badge bg-secondary">
                                                                {customer.deletedAt ? new Date(customer.deletedAt).toLocaleDateString() : 'Unknown'}
                                                            </span>
                                                        </td>
                                                        <td className="text-center">
                                                            <span className="text-muted">{customer.deletedBy || 'Unknown'}</span>
                                                        </td>
                                                        <td className="text-center">
                                                            <div className="d-flex justify-content-center gap-2">
                                                                <button
                                                                    className="btn btn-sm btn-success px-2"
                                                                    onClick={() => handleRestoreCustomer(customer.id)}
                                                                    title="Restore Customer"
                                                                >
                                                                    <i className="bi bi-arrow-counterclockwise"></i>
                                                                </button>
                                                                {/* <button
                                                                    className="btn btn-sm btn-danger px-2"
                                                                    onClick={() => handlePermanentDelete(customer.id)}
                                                                    title="Permanently Delete"
                                                                >
                                                                    <i className="bi bi-trash-fill"></i>
                                                                </button> */}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer border-0">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => setShowDeletedCustomersModal(false)}
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Main Credits Component
export default function Credits() {
    return <CustomerList />;
}