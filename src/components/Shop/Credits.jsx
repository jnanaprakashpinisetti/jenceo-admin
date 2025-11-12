// src/components/Shop/Credits.jsx
import React, { useEffect, useState } from "react";
import firebaseDB from "../../firebase";
import { useAuth } from "../../context/AuthContext";

// CustomerList Component
const CustomerList = () => {
    const { user: authUser } = useAuth?.() || {};
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState("view"); // view, edit, create

    useEffect(() => {
        setLoading(true);
        const ref = firebaseDB.child("Shop/CreditData");
        
        const handler = (snap) => {
            const raw = snap.val() || {};
            const customersList = [];
            
            // Convert object to array
            for (const [customerId, customerData] of Object.entries(raw)) {
                customersList.push({
                    id: customerId,
                    ...customerData
                });
            }
            
            setCustomers(customersList);
            setLoading(false);
        };

        const errHandler = () => {
            setCustomers([]);
            setLoading(false);
        };

        const cb = ref.on("value", handler, errHandler);
        return () => ref.off("value", cb);
    }, []);

    const handleView = (customer) => {
        setSelectedCustomer(customer);
        setModalMode("view");
        setShowModal(true);
    };

    const handleEdit = (customer) => {
        setSelectedCustomer(customer);
        setModalMode("edit");
        setShowModal(true);
    };

    const handleDelete = (customer) => {
        if (window.confirm(`Are you sure you want to delete customer ${customer.name}?`)) {
            firebaseDB.child(`Shop/CreditData/${customer.id}`).remove()
                .then(() => {
                    setCustomers(prev => prev.filter(c => c.id !== customer.id));
                })
                .catch(error => {
                    console.error("Error deleting customer:", error);
                    alert("Error deleting customer");
                });
        }
    };

    const handleCreate = () => {
        setSelectedCustomer(null);
        setModalMode("create");
        setShowModal(true);
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

    return (
        <div className="p-3 bg-dark border border-secondary rounded-3 mt-3">
            {/* Header */}
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h4 className="text-warning mb-0">
                    <i className="fas fa-users me-2"></i>
                    Customers List
                </h4>
                <button
                    className="btn btn-success"
                    onClick={handleCreate}
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

            {loading ? (
                <div className="text-center py-4">
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="mt-2 text-muted">Loading customers data...</p>
                </div>
            ) : customers.length === 0 ? (
                <div className="text-center py-5">
                    <div className="text-muted mb-3">
                        <i className="fas fa-users fa-3x"></i>
                    </div>
                    <h5 className="text-muted">No Customers Found</h5>
                    <p className="text-muted">Add your first customer to get started</p>
                    <button
                        className="btn btn-success mt-3"
                        onClick={handleCreate}
                        style={{
                            background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                            border: "none",
                            borderRadius: "10px",
                            padding: "10px 20px",
                            fontWeight: "600"
                        }}
                    >
                        <i className="fas fa-plus me-2"></i>
                        Add First Customer
                    </button>
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
                                <th>Place</th>
                                <th className="text-center">Mobile No</th>
                                <th className="text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {customers.map((customer, index) => (
                                <tr key={customer.id} style={{
                                    background: index % 2 === 0 
                                        ? "rgba(30, 41, 59, 0.7)" 
                                        : "rgba(51, 65, 85, 0.7)"
                                }}>
                                    <td className="text-center fw-bold">{index + 1}</td>
                                    <td className="text-center">
                                        <span className="badge bg-info text-dark">
                                            {customer.idNo || "N/A"}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="d-flex align-items-center">
                                            <i className="fas fa-user-circle text-warning me-2"></i>
                                            <strong>{customer.name || "Unnamed"}</strong>
                                        </div>
                                    </td>
                                    <td>
                                        <i className="fas fa-map-marker-alt text-danger me-2"></i>
                                        {customer.place || "N/A"}
                                    </td>
                                    <td className="text-center">
                                        {customer.mobile ? (
                                            <div className="d-flex justify-content-center align-items-center gap-2">
                                                <span className="fw-semibold">
                                                    {formatPhoneNumber(customer.mobile)}
                                                </span>
                                                <div className="d-flex gap-1">
                                                    <a
                                                        href={`tel:${customer.mobile}`}
                                                        className="btn btn-sm btn-success px-2 py-1"
                                                        title="Call"
                                                        style={{
                                                            background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                                                            border: "none",
                                                            borderRadius: "5px"
                                                        }}
                                                    >
                                                        <i className="fas fa-phone fa-xs"></i>
                                                    </a>
                                                    <a
                                                        href={`https://wa.me/${customer.mobile}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="btn btn-sm btn-success px-2 py-1"
                                                        title="WhatsApp"
                                                        style={{
                                                            background: "linear-gradient(135deg, #25d366 0%, #128c7e 100%)",
                                                            border: "none",
                                                            borderRadius: "5px"
                                                        }}
                                                    >
                                                        <i className="fab fa-whatsapp fa-xs"></i>
                                                    </a>
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="text-muted">N/A</span>
                                        )}
                                    </td>
                                    <td className="text-center">
                                        <div className="d-flex justify-content-center gap-2">
                                            <button
                                                className="btn btn-sm btn-info px-3"
                                                onClick={() => handleView(customer)}
                                                title="View Details"
                                                style={{
                                                    background: "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)",
                                                    border: "none",
                                                    borderRadius: "5px"
                                                }}
                                            >
                                                <i className="fas fa-eye"></i>
                                                <span className="d-none d-md-inline ms-1">View</span>
                                            </button>
                                            <button
                                                className="btn btn-sm btn-warning px-3"
                                                onClick={() => handleEdit(customer)}
                                                title="Edit Customer"
                                                style={{
                                                    background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                                                    border: "none",
                                                    borderRadius: "5px"
                                                }}
                                            >
                                                <i className="fas fa-edit"></i>
                                                <span className="d-none d-md-inline ms-1">Edit</span>
                                            </button>
                                            <button
                                                className="btn btn-sm btn-danger px-3"
                                                onClick={() => handleDelete(customer)}
                                                title="Delete Customer"
                                                style={{
                                                    background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                                                    border: "none",
                                                    borderRadius: "5px"
                                                }}
                                            >
                                                <i className="fas fa-trash"></i>
                                                <span className="d-none d-md-inline ms-1">Delete</span>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Customer Modal */}
            {showModal && (
                <CustomerModal
                    customer={selectedCustomer}
                    mode={modalMode}
                    onClose={handleCloseModal}
                    onSave={(customerData) => {
                        // Handle save logic here
                        console.log("Save customer:", customerData);
                        handleCloseModal();
                    }}
                />
            )}
        </div>
    );
};

// CustomerModal Component
const CustomerModal = ({ customer, mode, onClose, onSave }) => {
    const [activeTab, setActiveTab] = useState("basic");
    const [formData, setFormData] = useState({
        idNo: "",
        name: "",
        place: "",
        mobile: "",
        address: "",
        email: ""
    });

    // Initialize form data when customer changes
    useEffect(() => {
        if (customer && mode !== "create") {
            setFormData({
                idNo: customer.idNo || "",
                name: customer.name || "",
                place: customer.place || "",
                mobile: customer.mobile || "",
                address: customer.address || "",
                email: customer.email || ""
            });
        } else {
            setFormData({
                idNo: "",
                name: "",
                place: "",
                mobile: "",
                address: "",
                email: ""
            });
        }
    }, [customer, mode]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    const isViewMode = mode === "view";

    return (
        <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.8)", backdropFilter: "blur(5px)" }}>
            <div className="modal-dialog modal-lg modal-dialog-centered">
                <div className="modal-content overflow-hidden border-0 shadow-lg" style={{
                    background: "linear-gradient(135deg, #1f2937 0%, #111827 100%)",
                    borderRadius: "20px",
                    border: "2px solid rgba(99, 102, 241, 0.3)",
                    boxShadow: "0 25px 50px -12px rgba(99, 102, 241, 0.25)"
                }}>
                    {/* Header */}
                    <div className="modal-header border-0 pb-0" style={{
                        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                        padding: "2rem 2rem 1.5rem 2rem"
                    }}>
                        <div className="d-flex align-items-center w-100">
                            <div className="flex-shrink-0">
                                <i className="fas fa-user-circle fa-2x text-white"></i>
                            </div>
                            <div className="flex-grow-1 ms-3">
                                <h4 className="modal-title text-white fw-bold mb-1">
                                    {mode === "create" && "Add New Customer"}
                                    {mode === "edit" && "Edit Customer"}
                                    {mode === "view" && "Customer Details"}
                                </h4>
                                <p className="text-white-50 mb-0 small">
                                    {mode === "create" && "Enter customer information"}
                                    {mode === "edit" && "Update customer details"}
                                    {mode === "view" && "View customer information"}
                                </p>
                            </div>
                            <button
                                type="button"
                                className="btn-close btn-close-white flex-shrink-0"
                                onClick={onClose}
                                style={{ filter: "brightness(0.8)" }}
                            ></button>
                        </div>
                    </div>

                    {/* Tabs Navigation */}
                    <div className="px-4 pt-3">
                        <ul className="nav nav-pills nav-justified gap-2" style={{
                            background: "linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.8) 100%)",
                            borderRadius: "15px",
                            padding: "10px",
                            border: "1px solid rgba(99, 102, 241, 0.3)"
                        }}>
                            {[
                                { id: "basic", label: "Basic Details", icon: "user" },
                                { id: "credits", label: "Credits List", icon: "credit-card" },
                                { id: "bill", label: "Bill", icon: "file-invoice" }
                            ].map(tab => (
                                <li className="nav-item" key={tab.id}>
                                    <button
                                        className={`nav-link ${activeTab === tab.id ? 'active' : ''} d-flex align-items-center justify-content-center gap-2`}
                                        onClick={() => setActiveTab(tab.id)}
                                        style={{
                                            background: activeTab === tab.id
                                                ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                                                : "transparent",
                                            border: "none",
                                            color: activeTab === tab.id ? "white" : "#cbd5e1",
                                            borderRadius: "10px",
                                            padding: "12px 20px",
                                            fontWeight: "600",
                                            transition: "all 0.3s ease"
                                        }}
                                    >
                                        <i className={`fas fa-${tab.icon}`}></i>
                                        {tab.label}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Tab Content */}
                    <div className="modal-body p-4">
                        {activeTab === "basic" && (
                            <form onSubmit={handleSubmit}>
                                <div className="row g-3">
                                    <div className="col-md-6">
                                        <label className="form-label text-white fw-semibold">
                                            <i className="fas fa-id-card me-2 text-warning"></i>
                                            ID No
                                        </label>
                                        <input
                                            type="text"
                                            className="form-control border-0"
                                            name="idNo"
                                            value={formData.idNo}
                                            onChange={handleInputChange}
                                            disabled={isViewMode}
                                            style={{
                                                background: "rgba(255,255,255,0.1)",
                                                color: "white",
                                                borderRadius: "10px",
                                                border: "1px solid rgba(255,255,255,0.2)"
                                            }}
                                            placeholder="Enter customer ID"
                                        />
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label text-white fw-semibold">
                                            <i className="fas fa-user me-2 text-primary"></i>
                                            Name *
                                        </label>
                                        <input
                                            type="text"
                                            className="form-control border-0"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleInputChange}
                                            disabled={isViewMode}
                                            required
                                            style={{
                                                background: "rgba(255,255,255,0.1)",
                                                color: "white",
                                                borderRadius: "10px",
                                                border: "1px solid rgba(255,255,255,0.2)"
                                            }}
                                            placeholder="Enter customer name"
                                        />
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label text-white fw-semibold">
                                            <i className="fas fa-map-marker-alt me-2 text-danger"></i>
                                            Place
                                        </label>
                                        <input
                                            type="text"
                                            className="form-control border-0"
                                            name="place"
                                            value={formData.place}
                                            onChange={handleInputChange}
                                            disabled={isViewMode}
                                            style={{
                                                background: "rgba(255,255,255,0.1)",
                                                color: "white",
                                                borderRadius: "10px",
                                                border: "1px solid rgba(255,255,255,0.2)"
                                            }}
                                            placeholder="Enter place"
                                        />
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label text-white fw-semibold">
                                            <i className="fas fa-mobile-alt me-2 text-success"></i>
                                            Mobile No
                                        </label>
                                        <input
                                            type="tel"
                                            className="form-control border-0"
                                            name="mobile"
                                            value={formData.mobile}
                                            onChange={handleInputChange}
                                            disabled={isViewMode}
                                            style={{
                                                background: "rgba(255,255,255,0.1)",
                                                color: "white",
                                                borderRadius: "10px",
                                                border: "1px solid rgba(255,255,255,0.2)"
                                            }}
                                            placeholder="Enter mobile number"
                                        />
                                    </div>
                                    <div className="col-12">
                                        <label className="form-label text-white fw-semibold">
                                            <i className="fas fa-envelope me-2 text-info"></i>
                                            Email
                                        </label>
                                        <input
                                            type="email"
                                            className="form-control border-0"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleInputChange}
                                            disabled={isViewMode}
                                            style={{
                                                background: "rgba(255,255,255,0.1)",
                                                color: "white",
                                                borderRadius: "10px",
                                                border: "1px solid rgba(255,255,255,0.2)"
                                            }}
                                            placeholder="Enter email address"
                                        />
                                    </div>
                                    <div className="col-12">
                                        <label className="form-label text-white fw-semibold">
                                            <i className="fas fa-home me-2 text-warning"></i>
                                            Address
                                        </label>
                                        <textarea
                                            className="form-control border-0"
                                            name="address"
                                            value={formData.address}
                                            onChange={handleInputChange}
                                            disabled={isViewMode}
                                            rows="3"
                                            style={{
                                                background: "rgba(255,255,255,0.1)",
                                                color: "white",
                                                borderRadius: "10px",
                                                border: "1px solid rgba(255,255,255,0.2)"
                                            }}
                                            placeholder="Enter full address"
                                        ></textarea>
                                    </div>
                                </div>
                            </form>
                        )}

                        {activeTab === "credits" && (
                            <div className="text-center py-5">
                                <div className="text-muted mb-3">
                                    <i className="fas fa-credit-card fa-3x"></i>
                                </div>
                                <h5 className="text-muted">Credits List</h5>
                                <p className="text-muted">Credit transactions and history will be displayed here.</p>
                            </div>
                        )}

                        {activeTab === "bill" && (
                            <div className="text-center py-5">
                                <div className="text-muted mb-3">
                                    <i className="fas fa-file-invoice fa-3x"></i>
                                </div>
                                <h5 className="text-muted">Bill Management</h5>
                                <p className="text-muted">Bill generation and management features will be implemented here.</p>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    {!isViewMode && (
                        <div className="modal-footer border-0 pt-0 px-4 pb-4">
                            <div className="d-flex gap-3 w-100">
                                <button
                                    type="button"
                                    className="btn flex-fill py-3 fw-bold border-0"
                                    onClick={onClose}
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
                                    onClick={handleSubmit}
                                    style={{
                                        background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                                        color: "white",
                                        borderRadius: "15px",
                                        transition: "all 0.3s ease"
                                    }}
                                >
                                    <i className="fas fa-save me-2"></i>
                                    {mode === "create" ? "Create Customer" : "Update Customer"}
                                </button>
                            </div>
                        </div>
                    )}

                    {isViewMode && (
                        <div className="modal-footer border-0 pt-0 px-4 pb-4">
                            <button
                                type="button"
                                className="btn flex-fill py-3 fw-bold border-0"
                                onClick={onClose}
                                style={{
                                    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                                    color: "white",
                                    borderRadius: "15px",
                                    transition: "all 0.3s ease"
                                }}
                            >
                                <i className="fas fa-times me-2"></i>
                                Close
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// Main Credits Component
export default function Credits() {
    return <CustomerList />;
}