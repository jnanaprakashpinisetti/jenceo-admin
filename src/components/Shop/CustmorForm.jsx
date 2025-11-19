// src/components/Customer/CustomerForm.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import firebaseDB from '../../firebase';

const CustomerForm = ({ onSuccess, onCancel }) => {
    const { currentUser, user } = useAuth();
    const authUser = currentUser || user;

    const [formData, setFormData] = useState({
        idNo: '',
        name: '',
        gender: '',
        character: '',
        place: '',
        mobileNo: '',
        mobileNo2: '',
        date: new Date().toISOString().split('T')[0] // Default to today's date
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Character options
    const characterOptions = [
        { value: '', label: 'Select Character', disabled: true },
        { value: 'very-good', label: 'Very Good' },
        { value: 'good', label: 'Good' },
        { value: 'average', label: 'Average' },
        { value: 'bad', label: 'Bad' },
        { value: 'worst', label: 'Worst' }
    ];

    // Generate dynamic ID on component mount
    useEffect(() => {
        generateDynamicId();
    }, []);

    const generateDynamicId = async () => {
        try {
            // Fetch existing customers from CreditData path (not ShopCustomers)
            const snapshot = await firebaseDB.child('Shop/CreditData').once('value');
            const customers = snapshot.val() || {};
    
            // Find the highest C- number
            let maxNumber = 0;
            Object.values(customers).forEach(customer => {
                if (customer && customer.idNo && customer.idNo.startsWith('C-')) {
                    const num = parseInt(customer.idNo.substring(2));
                    if (num > maxNumber) {
                        maxNumber = num;
                    }
                }
            });
    
            // Generate next ID (C-01, C-02, etc.)
            const nextId = `C-${String(maxNumber + 1).padStart(2, '0')}`;
    
            setFormData(prev => ({
                ...prev,
                idNo: nextId
            }));
        } catch (error) {
            console.error('Error generating ID:', error);
            // Fallback ID
            setFormData(prev => ({
                ...prev,
                idNo: 'C-01'
            }));
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const validateForm = () => {
        if (!formData.name.trim()) {
            setError('Name is required');
            return false;
        }

        if (!formData.idNo.trim()) {
            setError('ID No is required');
            return false;
        }

        // Basic mobile number validation
        if (formData.mobileNo && !/^\d{10}$/.test(formData.mobileNo)) {
            setError('Mobile No must be 10 digits');
            return false;
        }

        if (formData.mobileNo2 && !/^\d{10}$/.test(formData.mobileNo2)) {
            setError('Mobile No 2 must be 10 digits');
            return false;
        }

        // Date validation
        if (!formData.date) {
            setError('Date is required');
            return false;
        }

        setError('');
        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setLoading(true);
        setError('');

        try {
            const customerId = firebaseDB.child('Shop/CreditData').push().key;
            const timestamp = Date.now();

            const customerRecord = {
                id: customerId,
                // Basic Information
                idNo: formData.idNo.trim(),
                name: formData.name.trim(),
                gender: formData.gender,
                character: formData.character,
                place: formData.place.trim(),
                mobileNo: formData.mobileNo.trim(),
                mobileNo2: formData.mobileNo2.trim(),
                date: formData.date,

                // Audit Information
                createdBy: {
                    uid: authUser?.uid || 'unknown',
                    name: authUser?.name || authUser?.displayName || authUser?.email || 'Unknown User',
                    email: authUser?.email || 'unknown@example.com'
                },
                createdAt: timestamp,
                createdDate: new Date(timestamp).toISOString(),

                // System Information
                lastUpdated: timestamp,
                updatedBy: {
                    uid: authUser?.uid || 'unknown',
                    name: authUser?.name || authUser?.displayName || authUser?.email || 'Unknown User'
                },

                // Status Information
                status: 'active',
                isActive: true,

                // Search Optimization
                searchName: formData.name.trim().toLowerCase(),
                searchPlace: formData.place.trim().toLowerCase(),
                searchMobile: formData.mobileNo.trim(),
                searchIdNo: formData.idNo.trim().toLowerCase()
            };

            // Remove empty optional fields
            Object.keys(customerRecord).forEach(key => {
                if (customerRecord[key] === '' || customerRecord[key] === null || customerRecord[key] === undefined) {
                    delete customerRecord[key];
                }
            });

            // Check if ID already exists
            const snapshot = await firebaseDB.child('Shop/CreditData').orderByChild('idNo').equalTo(formData.idNo).once('value');
            if (snapshot.exists()) {
                setError('Customer ID already exists. Please use a different ID.');
                setLoading(false);
                return;
            }

            // Save to Firebase
            await firebaseDB.child(`Shop/CreditData/${customerId}`).set(customerRecord);

            // Log the activity
            await firebaseDB.child('AuditLogs').push({
                action: 'create_customer',
                byUid: authUser?.uid || 'unknown',
                targetId: customerId,
                details: {
                    customerName: formData.name.trim(),
                    customerId: formData.idNo.trim(),
                    place: formData.place.trim(),
                    gender: formData.gender,
                    character: formData.character
                },
                timestamp: timestamp
            });

            // Reset form and generate new ID
            setFormData({
                idNo: '',
                name: '',
                gender: '',
                character: '',
                place: '',
                mobileNo: '',
                mobileNo2: '',
                date: new Date().toISOString().split('T')[0]
            });

            // Generate new ID for next entry
            generateDynamicId();

            // Show success message
            if (onSuccess) {
                onSuccess(customerRecord);
            } else {
                alert('Customer added successfully!');
            }

        } catch (error) {
            console.error('Error adding customer:', error);
            setError(`Failed to add customer: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        setFormData({
            idNo: '',
            name: '',
            gender: '',
            character: '',
            place: '',
            mobileNo: '',
            mobileNo2: '',
            date: new Date().toISOString().split('T')[0]
        });
        setError('');
        generateDynamicId();
    };

    // Get character badge color
    const getCharacterBadgeColor = (character) => {
        switch (character) {
            case 'very-good': return 'success';
            case 'good': return 'info';
            case 'average': return 'warning';
            case 'bad': return 'danger';
            case 'worst': return 'dark';
            default: return 'secondary';
        }
    };

    return (
        <div className="modal fade show d-block" tabIndex="-1" style={{ background: "rgba(0,0,0,0.9)" }}>
            <div className="modal-dialog modal-lg modal-dialog-centered" style={{ maxWidth: "600px", justifyContent: "center", borderRadius: "10px" }}>
                <div className="modal-content border-0 shadow-lg rounded-4">
                    <div className="modal-header bg-dark text-white py-3" style={{ borderColor: "#333" }}>
                        <h6 className="modal-title mb-0 text-warning">
                            <i className="fas fa-user-plus me-2"></i>
                            Add New Customer
                        </h6>
                        <button
                            type="button"
                            className="btn-close btn-close-white"
                            onClick={onCancel}
                            disabled={loading}
                        ></button>
                    </div>

                    <div className="modal-body p-4 bg-dark bg-opacity-90">
                        {/* Error Alert */}
                        {error && (
                            <div className="alert alert-danger alert-dismissible fade show py-2 mb-3" role="alert">
                                <i className="fas fa-exclamation-triangle me-2"></i>
                                <small>{error}</small>
                                <button
                                    type="button"
                                    className="btn-close btn-close-white"
                                    onClick={() => setError('')}
                                ></button>
                            </div>
                        )}

                        <form onSubmit={handleSubmit}>
                            {/* First Row - 2 columns */}
                            <div className="row g-3 mb-3">
                                {/* ID No Field - Auto-generated */}
                                <div className="col-md-6">
                                    <label className="form-label text-primary small mb-1 fw-semibold">
                                        <i className="fas fa-id-card me-2"></i>
                                        ID No <span className="text-danger">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="idNo"
                                        className="form-control form-control-sm bg-dark text-white border-secondary"
                                        value={formData.idNo}
                                        onChange={handleChange}
                                        required
                                        disabled={loading}

                                    />
                                    <small className="text-info">
                                        <i className="fas fa-info-circle me-1"></i>
                                        Auto-generated customer ID
                                    </small>
                                </div>

                                {/* Date Field */}
                                <div className="col-md-6">
                                    <label className="form-label text-primary small mb-1 fw-semibold">
                                        <i className="fas fa-calendar-alt me-2"></i>
                                        Date <span className="text-danger">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        name="date"
                                        className="form-control form-control-sm bg-dark text-white border-secondary"
                                        value={formData.date}
                                        onChange={handleChange}
                                        required
                                        disabled={loading}

                                    />
                                </div>
                            </div>

                            {/* Second Row - 2 columns */}
                            <div className="row g-3 mb-3">
                                {/* Name Field - Required */}
                                <div className="col-md-6">
                                    <label className="form-label text-primary small mb-1 fw-semibold">
                                        <i className="fas fa-user me-2"></i>
                                        Name <span className="text-danger">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="name"
                                        className="form-control form-control-sm bg-dark text-white border-secondary"
                                        placeholder="Enter customer name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        required
                                        disabled={loading}

                                    />
                                </div>

                                {/* Gender Field */}
                                <div className="col-md-6">
                                    <label className="form-label text-primary small mb-1 fw-semibold">
                                        <i className="fas fa-venus-mars me-2"></i>
                                        Gender
                                    </label>
                                    <select
                                        name="gender"
                                        className="form-select form-select-sm bg-dark text-white border-secondary"
                                        value={formData.gender}
                                        onChange={handleChange}
                                        disabled={loading}

                                    >
                                        <option value="">Select Gender</option>
                                        <option value="male">Male</option>
                                        <option value="female">Female</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                            </div>

                            {/* Third Row - 2 columns */}
                            <div className="row g-3 mb-3">
                                {/* Character Field */}
                                <div className="col-md-6">
                                    <label className="form-label text-primary small mb-1 fw-semibold">
                                        <i className="fas fa-star me-2"></i>
                                        Character
                                    </label>
                                    <select
                                        name="character"
                                        className="form-select form-select-sm bg-dark text-white border-secondary"
                                        value={formData.character}
                                        onChange={handleChange}
                                        disabled={loading}

                                    >
                                        {characterOptions.map(option => (
                                            <option
                                                key={option.value}
                                                value={option.value}
                                                disabled={option.disabled}
                                            >
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                    {formData.character && (
                                        <small className={`text-${getCharacterBadgeColor(formData.character)} mt-1 d-block`}>
                                            <i className="fas fa-info-circle me-1"></i>
                                            Selected: {characterOptions.find(opt => opt.value === formData.character)?.label}
                                        </small>
                                    )}
                                </div>

                                {/* Place Field */}
                                <div className="col-md-6">
                                    <label className="form-label text-primary small mb-1 fw-semibold">
                                        <i className="fas fa-map-marker-alt me-2"></i>
                                        Place
                                    </label>
                                    <input
                                        type="text"
                                        name="place"
                                        className="form-control form-control-sm bg-dark text-white border-secondary"
                                        placeholder="Enter place"
                                        value={formData.place}
                                        onChange={handleChange}
                                        disabled={loading}

                                    />
                                </div>
                            </div>

                            {/* Fourth Row - 2 columns */}
                            <div className="row g-3 mb-4">
                                {/* Mobile No Field */}
                                <div className="col-md-6">
                                    <label className="form-label text-primary small mb-1 fw-semibold">
                                        <i className="fas fa-mobile-alt me-2"></i>
                                        Mobile No
                                    </label>
                                    <input
                                        type="tel"
                                        name="mobileNo"
                                        className="form-control form-control-sm bg-dark text-white border-secondary"
                                        placeholder="10-digit mobile number"
                                        value={formData.mobileNo}
                                        onChange={handleChange}
                                        pattern="[0-9]{10}"
                                        maxLength="10"
                                        disabled={loading}

                                    />
                                </div>

                                {/* Mobile No 2 Field */}
                                <div className="col-md-6">
                                    <label className="form-label text-primary small mb-1 fw-semibold">
                                        <i className="fas fa-mobile me-2"></i>
                                        Mobile No 2
                                    </label>
                                    <input
                                        type="tel"
                                        name="mobileNo2"
                                        className="form-control form-control-sm bg-dark text-white border-secondary"
                                        placeholder="Alternate mobile number"
                                        value={formData.mobileNo2}
                                        onChange={handleChange}
                                        pattern="[0-9]{10}"
                                        maxLength="10"
                                        disabled={loading}

                                    />
                                </div>
                            </div>



                            {/* Form Actions */}
                            <div className="row mt-4">
                                <div className="col-12">
                                    <div className="d-flex gap-3 justify-content-center">
                                        <button
                                            type="button"
                                            className="btn btn-outline-secondary btn-sm px-4 m-0"
                                            onClick={handleReset}
                                            disabled={loading}
                                            style={{
                                                borderRadius: "8px",
                                                border: "1px solid #6b7280"
                                            }}
                                        >
                                            <i className="fas fa-redo me-2"></i>
                                            Reset
                                        </button>

                                        <button
                                            type="button"
                                            className="btn btn-outline-danger btn-sm px-4 m-0"
                                            onClick={onCancel}
                                            disabled={loading}
                                            style={{
                                                borderRadius: "8px",
                                                border: "1px solid #ef4444"
                                            }}
                                        >
                                            <i className="fas fa-times me-2"></i>
                                            Cancel
                                        </button>

                                        <button
                                            type="submit"
                                            className="btn btn-warning btn-sm px-4 fw-semibold m-0"
                                            disabled={loading || !formData.name.trim() || !formData.idNo.trim()}
                                            style={{
                                                borderRadius: "8px",
                                                background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                                                border: "none"
                                            }}
                                        >
                                            {loading ? (
                                                <>
                                                    <span className="spinner-border spinner-border-sm me-2"></span>
                                                    Adding...
                                                </>
                                            ) : (
                                                <>
                                                    <i className="fas fa-save me-2"></i>
                                                    Add Customer
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CustomerForm;