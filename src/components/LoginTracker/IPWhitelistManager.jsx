// components/DashBoard/IPWhitelistManager.jsx
import React, { useState, useEffect } from 'react';
import { ipWhitelistManager } from './trackUserLogin';

const IPWhitelistManager = () => {
    const [whitelist, setWhitelist] = useState({});
    const [newIP, setNewIP] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [restrictionEnabled, setRestrictionEnabled] = useState(false);

    const loadWhitelist = async () => {
        setLoading(true);
        try {
            const list = await ipWhitelistManager.getWhitelistedIPs();
            setWhitelist(list);
            
            // Load restriction setting
            const restrictionSetting = await ipWhitelistManager.getRestrictionSetting();
            setRestrictionEnabled(restrictionSetting.enabled);
        } catch (error) {
            console.error('Error loading whitelist:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadWhitelist();
    }, []);

    const handleAddIP = async () => {
        if (!newIP) return;

        setLoading(true);
        try {
            const result = await ipWhitelistManager.addToWhitelist(newIP, description);
            if (result.success) {
                setNewIP('');
                setDescription('');
                await loadWhitelist();
            }
        } catch (error) {
            console.error('Error adding IP:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveIP = async (ipId) => {
        if (!window.confirm('Are you sure you want to remove this IP from whitelist?')) return;

        setLoading(true);
        try {
            await ipWhitelistManager.removeFromWhitelist(ipId);
            await loadWhitelist();
        } catch (error) {
            console.error('Error removing IP:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleIP = async (ipId, currentStatus) => {
        setLoading(true);
        try {
            await ipWhitelistManager.toggleIPStatus(ipId, !currentStatus);
            await loadWhitelist();
        } catch (error) {
            console.error('Error toggling IP status:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleRestriction = async () => {
        setLoading(true);
        try {
            await ipWhitelistManager.setRestrictionSetting(!restrictionEnabled);
            setRestrictionEnabled(!restrictionEnabled);
            
            if (!restrictionEnabled) {
                alert('IP Restriction Enabled: Only whitelisted IPs can access the website');
            } else {
                alert('IP Restriction Disabled: All IPs can access the website');
            }
        } catch (error) {
            console.error('Error toggling restriction:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="card bg-dark border-warning">
            <div className="card-header bg-warning bg-opacity-25 border-warning">
                <div className="d-flex justify-content-between align-items-center">
                    <h6 className="mb-0 text-white">
                        <i className="fas fa-shield-alt me-2"></i>
                        IP Whitelist Management
                    </h6>
                    <div className="form-check form-switch">
                        <input
                            className="form-check-input"
                            type="checkbox"
                            checked={restrictionEnabled}
                            onChange={handleToggleRestriction}
                            disabled={loading}
                        />
                        <label className="form-check-label text-white">
                            {restrictionEnabled ? 'Restriction Enabled' : 'Restriction Disabled'}
                        </label>
                    </div>
                </div>
            </div>
            <div className="card-body">
                {/* Restriction Alert */}
                {restrictionEnabled && (
                    <div className="alert alert-warning alert-dismissible fade show" role="alert">
                        <i className="fas fa-exclamation-triangle me-2"></i>
                        <strong>IP Restriction Active:</strong> Only whitelisted IPs can access the website
                        <button type="button" className="btn-close btn-close-white" data-bs-dismiss="alert"></button>
                    </div>
                )}

                {/* Add IP Form */}
                <div className="row mb-4">
                    <div className="col-md-4">
                        <label className="form-label text-warning">IP Address</label>
                        <input
                            type="text"
                            className="form-control bg-dark text-white border-secondary"
                            placeholder="e.g., 192.168.1.1"
                            value={newIP}
                            onChange={(e) => setNewIP(e.target.value)}
                        />
                    </div>
                    <div className="col-md-4">
                        <label className="form-label text-warning">Description</label>
                        <input
                            type="text"
                            className="form-control bg-dark text-white border-secondary"
                            placeholder="e.g., Office Network"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>
                    <div className="col-md-4 d-flex align-items-end">
                        <button
                            className="btn btn-outline-warning w-100"
                            onClick={handleAddIP}
                            disabled={loading || !newIP}
                        >
                            <i className="fas fa-plus me-2"></i>
                            Add to Whitelist
                        </button>
                    </div>
                </div>

                {/* Whitelist Table */}
                <div className="table-responsive">
                    <table className="table table-dark table-hover">
                        <thead>
                            <tr>
                                <th>Status</th>
                                <th>IP Address</th>
                                <th>Description</th>
                                <th>Created</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.values(whitelist).length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="text-center py-4">
                                        <i className="fas fa-inbox fa-2x text-muted mb-2"></i>
                                        <p className="text-muted">No whitelisted IPs</p>
                                    </td>
                                </tr>
                            ) : (
                                Object.values(whitelist).map((ip) => (
                                    <tr key={ip.id}>
                                        <td>
                                            <div className="form-check form-switch">
                                                <input
                                                    className="form-check-input"
                                                    type="checkbox"
                                                    checked={ip.active}
                                                    onChange={() => handleToggleIP(ip.id, ip.active)}
                                                    disabled={loading}
                                                />
                                            </div>
                                        </td>
                                        <td>
                                            <code className="text-info">{ip.ip}</code>
                                        </td>
                                        <td>
                                            <small className="text-muted">{ip.description}</small>
                                        </td>
                                        <td>
                                            <small className="text-white">
                                                {new Date(ip.createdAt).toLocaleDateString()}
                                            </small>
                                        </td>
                                        <td>
                                            <button
                                                className="btn btn-sm btn-outline-danger"
                                                onClick={() => handleRemoveIP(ip.id)}
                                                disabled={loading}
                                            >
                                                <i className="bi bi-trash"></i>
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default IPWhitelistManager;