import React from "react";

const HeaderActions = ({ 
  backendOK, 
  setShowAdd, 
  setShowCreateProject,
  projects 
}) => {
  return (
    <div className="d-flex align-items-center gap-2">
      {/* NEW: Create Project Button */}
      <button
        className="btn btn-outline-warning"
        onClick={() => setShowCreateProject(true)}
        disabled={!backendOK}
        title="Create new project"
      >
        📁 Create Project
      </button>

      {/* Existing Create Task Button */}
      <button
        className="btn btn-warning"
        onClick={() => setShowAdd(true)}
        disabled={!backendOK || projects.length === 0}
        title={projects.length === 0 ? "Create a project first" : "Create new task"}
      >
        + Create Task
      </button>
    </div>
  );
};

export default HeaderActions;