import React from 'react';

const ProfileTabs = ({ activeTab, setActiveTab }) => {
  return (
    <div className="d-flex border-bottom mb-4">
      <button
        className={`btn btn-tab ${activeTab === 'profile' ? 'active' : ''}`}
        onClick={() => setActiveTab('profile')}
      >
        <i className="bi bi-person me-2"></i>Profile
      </button>
      <button
        className={`btn btn-tab ${activeTab === 'security' ? 'active' : ''}`}
        onClick={() => setActiveTab('security')}
      >
        <i className="bi bi-shield-lock me-2"></i>Security
      </button>
      <button
        className={`btn btn-tab ${activeTab === 'activity' ? 'active' : ''}`}
        onClick={() => setActiveTab('activity')}
      >
        <i className="bi bi-clock-history me-2"></i>Activity
      </button>
      <button
        className={`btn btn-tab ${activeTab === 'insights' ? 'active' : ''}`}
        onClick={() => setActiveTab('insights')}
      >
        <i className="bi bi-graph-up me-2"></i>Security Insights
      </button>
    </div>
  );
};

export default ProfileTabs;