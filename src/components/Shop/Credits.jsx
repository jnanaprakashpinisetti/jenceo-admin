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
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // Filter states
    const [filters, setFilters] = useState({
        search: "",
        reminderDate: "",
        amountOperator: ">",
        amountValue: ""
    });

    // Debug function to check Firebase paths
    const debugFirebasePaths = async () => {
        try {
            console.log("=== FIREBASE PATH DEBUG ===");

            // Test different paths
            const pathsToTest = [
                "Shop/CreditData",
                "CreditData"
            ];

            for (const path of pathsToTest) {
                try {
                    const ref = firebaseDB.child(path);
                    const snapshot = await ref.once('value');
                    console.log(`Path "${path}":`, snapshot.val());
                } catch (error) {
                    console.log(`Path "${path}" error:`, error.message);
                }
            }

            console.log("=== END DEBUG ===");
        } catch (error) {
            console.error("Debug error:", error);
        }
    };

    // In Credits.jsx - UPDATE THE useEffect for loading customers
    useEffect(() => {
        setLoading(true);

        // Use the correct path
        const correctPath = "Shop/CreditData";

        const loadCustomers = async () => {
            try {
                console.log(`Loading from path: ${correctPath}`);
                const ref = firebaseDB.child(correctPath);
                const snapshot = await ref.once('value');
                const raw = snapshot.val() || {};

                console.log(`Data from path "${correctPath}":`, raw);

                if (Object.keys(raw).length > 0) {
                    processCustomerData(raw);
                } else {
                    setCustomers([]);
                    setFilteredCustomers([]);
                    setLoading(false);
                }
            } catch (error) {
                console.log(`Path "${correctPath}" failed:`, error.message);
                setCustomers([]);
                setFilteredCustomers([]);
                setLoading(false);
            }
        };

        const processCustomerData = (raw) => {
            const customersList = [];

            console.log("Processing raw data:", raw);

            for (const [customerId, customerData] of Object.entries(raw)) {
                // Skip if customerData is null/undefined or if it's nested data structure
                if (!customerData || typeof customerData !== 'object') {
                    continue;
                }

                // Check if this looks like a customer record (has name or idNo)
                const hasCustomerFields = customerData.name || customerData.idNo;
                const isNestedData = customerId === "PurchaseItems" || customerId === "Balance" || customerId === "Payments";

                if (hasCustomerFields && !isNestedData) {
                    // Calculate balance from customer items
                    const balance = calculateBalanceFromItems(customerData);

                    customersList.push({
                        id: customerId,
                        name: customerData.name || 'Unnamed Customer',
                        idNo: customerData.idNo || 'N/A',
                        gender: customerData.gender || 'N/A',
                        character: customerData.character || 'average',
                        mobileNo: customerData.mobileNo || '',
                        place: customerData.place || '',
                        reminderDate: customerData.reminderDate || '',
                        balance: balance,
                        ...customerData
                    });
                }
            }

            console.log("Processed customers list:", customersList);

            setCustomers(customersList);
            setFilteredCustomers(customersList);
            setLoading(false);
        };

        loadCustomers();

    }, [refreshTrigger]);

    // Calculate balance from customer items
    const calculateBalanceFromItems = (customerData) => {
        if (!customerData) return 0;

        let totalBalance = 0;

        // Check if PurchaseItems exists and has data
        if (customerData.PurchaseItems && typeof customerData.PurchaseItems === 'object') {
            const items = customerData.PurchaseItems;

            // Handle both array and object formats
            const itemsArray = Array.isArray(items) ? items : Object.values(items);

            itemsArray.forEach(item => {
                // Only include pending items in balance calculation
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
            amountValue: ""
        });
    };

    const handleRowClick = (customer) => {
        setSelectedCustomer(customer);
        setShowModal(true);
    };

    const handleEdit = (customer, e) => {
        e.stopPropagation();
        // Handle edit logic
        console.log("Edit customer:", customer);
    };

    const handleDelete = (customer, e) => {
        e.stopPropagation();
        if (window.confirm(`Are you sure you want to delete customer ${customer.name}?`)) {
            // Try different paths for deletion
            const deletePaths = [
                `Shop/CreditData/${customer.id}`,
                `Shop/CreditData/${customer.id}`,
                `CreditData/${customer.id}`
            ];

            const tryDelete = async () => {
                for (const path of deletePaths) {
                    try {
                        await firebaseDB.child(path).remove();
                        console.log(`Successfully deleted from path: ${path}`);
                        setCustomers(prev => prev.filter(c => c.id !== customer.id));
                        setRefreshTrigger(prev => prev + 1);
                        return;
                    } catch (error) {
                        console.log(`Delete failed for path ${path}:`, error.message);
                    }
                }
                alert("Error deleting customer from all paths");
            };

            tryDelete();
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

    const formatPhoneNumber = (phone) => {
        if (!phone) return "N/A";
        const cleaned = phone.toString().replace(/\D/g, '');
        if (cleaned.length === 10) {
            return cleaned.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
        }
        return phone;
    };

    // Get reminder date (placeholder)
    const getReminderDate = (customer) => {
        return customer.reminderDate || "2024-12-31";
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
            {/* Debug Info */}
            <div className="alert alert-info mb-3">
                <h6>Debug Info:</h6>
                <p>Total Customers: {customers.length}</p>
                <p>Filtered Customers: {filteredCustomers.length}</p>
                <p>Loading: {loading.toString()}</p>
                <div className="d-flex gap-2 mt-2">
                    <button
                        className="btn btn-sm btn-warning"
                        onClick={() => console.log('Customers:', customers, 'Filtered:', filteredCustomers)}
                    >
                        Log Data to Console
                    </button>
                    <button
                        className="btn btn-sm btn-info"
                        onClick={debugFirebasePaths}
                    >
                        Debug Firebase Paths
                    </button>
                    <button
                        className="btn btn-sm btn-success"
                        onClick={refreshCustomerData}
                    >
                        Refresh Data
                    </button>
                </div>
            </div>

            {/* Header */}
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h4 className="text-warning mb-0">
                    <i className="bi bi-users me-2"></i>
                    Customers List
                </h4>
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
                        <div className="col-md-3">
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
                                <th className="text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredCustomers.map((customer, index) => {
                                const characterInfo = getCharacterInfo(customer.character);
                                const balance = customer.balance || 0;
                                const reminderDate = getReminderDate(customer);

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
                                            <span className="badge bg-warning text-dark">
                                                {reminderDate}
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
                        console.log("Customer created:", customerData);
                    }}
                    onCancel={() => setShowCustomerForm(false)}
                />
            )}
        </div>
    );
};

// Main Credits Component
export default function Credits() {
    return <CustomerList />;
}