// src/components/Customer/CustomerForm.jsx
import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import firebaseDB from '../../firebase';

const CustomerForm = ({ onSuccess, onCancel }) => {
    const { currentUser, user } = useAuth();
    const authUser = currentUser || user;

    const [formData, setFormData] = useState({
        name: '',
        place: '',
        mobileNo: '',
        mobileNo2: ''
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

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

        // Basic mobile number validation
        if (formData.mobileNo && !/^\d{10}$/.test(formData.mobileNo)) {
            setError('Mobile No must be 10 digits');
            return false;
        }

        if (formData.mobileNo2 && !/^\d{10}$/.test(formData.mobileNo2)) {
            setError('Mobile No 2 must be 10 digits');
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
                name: formData.name.trim(),
                place: formData.place.trim(),
                mobileNo: formData.mobileNo.trim(),
                mobileNo2: formData.mobileNo2.trim(),

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
                searchMobile: formData.mobileNo.trim()
            };

            // Remove empty optional fields
            Object.keys(customerRecord).forEach(key => {
                if (customerRecord[key] === '' || customerRecord[key] === null || customerRecord[key] === undefined) {
                    delete customerRecord[key];
                }
            });

            // Save to Firebase
            await firebaseDB.child(`Shop/CreditData/${customerId}`).set(customerRecord);

            // Log the activity
            await firebaseDB.child('AuditLogs').push({
                action: 'create_customer',
                byUid: authUser?.uid || 'unknown',
                targetId: customerId,
                details: {
                    customerName: formData.name.trim(),
                    place: formData.place.trim()
                },
                timestamp: timestamp
            });

            // Reset form
            setFormData({
                name: '',
                place: '',
                mobileNo: '',
                mobileNo2: ''
            });

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
            name: '',
            place: '',
            mobileNo: '',
            mobileNo2: ''
        });
        setError('');
    };

    return (
        <div className="modal fade show d-block" tabIndex="-1" style={{ background: "rgba(0,0,0,0.9)" }}>
            <div className="modal-dialog modal-sm modal-dialog-centered">
                <div className="modal-content border-0 shadow-lg rounded-4">
                    <div className="modal-header bg-dark text-white py-2" style={{ borderColor: "#333" }}>
                        <h6 className="modal-title mb-0 text-warning ">
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

                    <div className="modal-body p-3 bg-dark bg-opacity-90">
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
                            <div className="row g-2">
                                {/* Name Field - Required */}
                                <div className="col-12">
                                    <label className="form-label text-primary small mb-1">
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

                                {/* Place Field */}
                                <div className="col-12">
                                    <label className="form-label text-primary small mb-1">
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

                                {/* Mobile No Field */}
                                <div className="col-12">
                                    <label className="form-label text-primary small mb-1">
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
                                <div className="col-12">
                                    <label className="form-label text-primary small mb-1">
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
                            <div className="row mt-3">
                                <div className="col-12">
                                    <div className="d-flex gap-3 justify-content-center">
                                        <button
                                            type="button"
                                            className="btn btn-outline-secondary btn-sm m-0"
                                            onClick={handleReset}
                                            disabled={loading}
                                        >
                                            <i className="fas fa-redo me-1"></i>
                                            Reset
                                        </button>

                                        <button
                                            type="submit"
                                            className="btn btn-warning btn-sm m-0"
                                            disabled={loading || !formData.name.trim()}
                                        >
                                            {loading ? (
                                                <>
                                                    <span className="spinner-border spinner-border-sm me-1"></span>
                                                    Adding...
                                                </>
                                            ) : (
                                                <>
                                                    <i className="fas fa-save me-1"></i>
                                                    Add
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