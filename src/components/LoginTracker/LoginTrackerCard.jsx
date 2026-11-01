// LoginTracker/LoginTrackerCard.jsx
import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { normalizeUser } from './userInfo';
import LoginTrackingDashboard from './LoginTrackingDashboard';

// Admin tool: only admins see it. Pass requireAdmin={false} to turn that check off.
const LoginTrackerCard = ({ requireAdmin = true }) => {
    const [showModal, setShowModal] = useState(false);
    const auth = useAuth() || {};
    const me = normalizeUser(auth.currentUser || auth.user || {});

    if (requireAdmin && me.userType !== 'admin') return null;

    return (
        <>
            <div className="card bg-dark border-info h-100" style={{ cursor: 'pointer' }} onClick={() => setShowModal(true)}>
                <div className="card-body">
                    <div className="d-flex justify-content-between align-items-center">
                        <div>
                            <h6 className="card-title text-muted">Login Activity</h6>
                            <h4 className="text-info"><i className="bi bi-shield-check me-2" />Track Logins</h4>
                        </div>
                        <div className="align-self-center"><i className="bi bi-box-arrow-up-right fs-2 text-info opacity-50" /></div>
                    </div>
                    <small className="text-warning">Click to view the login tracking dashboard</small>
                </div>
            </div>

            {showModal && (
                <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
                    <div className="modal-dialog modal-fullscreen">
                        <div className="modal-content bg-dark">
                            <div className="modal-header border-secondary">
                                <h5 className="modal-title text-info"><i className="bi bi-shield-check me-2" />Login Tracking Dashboard</h5>
                                <button type="button" className="btn-close btn-close-white" onClick={() => setShowModal(false)} />
                            </div>
                            <div className="modal-body p-0" style={{ overflowY: 'auto' }}>
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
