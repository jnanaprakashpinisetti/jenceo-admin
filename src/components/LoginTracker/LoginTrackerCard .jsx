// components/DashBoard/LoginTrackerCard.jsx
import React, { useState } from 'react';
import LoginTrackingDashboard from './LoginTrackingDashboard ';

const LoginTrackerCard = () => {
    const [showModal, setShowModal] = useState(false);

    return (
        <>
            <div className="card bg-dark border-info h-100" style={{ cursor: 'pointer' }} onClick={() => setShowModal(true)}>
                <div className="card-body">
                    <div className="d-flex justify-content-between align-items-center">
                        <div>
                            <h6 className="card-title text-muted">Login Activity</h6>
                            <h4 className="text-info">
                                <i className="fas fa-shield-alt me-2"></i>
                                Track Logins
                            </h4>
                        </div>
                        <div className="align-self-center">
                            <i className="fas fa-external-link-alt fa-2x text-info opacity-50"></i>
                        </div>
                    </div>
                    <small className="text-warning">Click to view login tracking dashboard</small>
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
                    <div className="modal-dialog modal-fullscreen">
                        <div className="modal-content bg-dark">
                            <div className="modal-header border-secondary">
                                <h5 className="modal-title text-info">
                                    <i className="fas fa-shield-alt me-2"></i>
                                    Login Tracking Dashboard
                                </h5>
                                <button
                                    type="button"
                                    className="btn-close btn-close-white"
                                    onClick={() => setShowModal(false)}
                                ></button>
                            </div>
                            <div className="modal-body p-0">
                                <LoginTrackingDashboard />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default LoginTrackerCard;