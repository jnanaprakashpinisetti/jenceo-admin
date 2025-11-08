import React, { useState } from "react";
import RichTextEditor from "../RichTextEditor";
import { PROJECT_TYPES, PROJECT_STATUS, VISIBILITY_OPTIONS, PRIORITIES } from "../constants/constants";
import { todayYMD, generateProjectKey } from "../utils/helpers";
import { cn } from "../utils/helpers";

const CreateProjectModal = ({
  showCreateProject,
  setShowCreateProject,
  users,
  currentUser,
  createProject,
  notify,
  projects
}) => {
  const [newProject, setNewProject] = useState({
    title: "",
    type: "Product",
    description: "",
    ownerId: currentUser.myId,
    startDate: "",
    targetDate: "",
    color: "#3b82f6",
    emoji: "📁",
    status: "Active",
    priority: "Medium",
    visibility: "Team"
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCreateProject = async (e) => {
    e?.preventDefault?.();
    if (!newProject.title.trim()) {
      setError("Please enter a project title.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Generate unique project key
      let projectKey = generateProjectKey(newProject.title);
      let counter = 1;
      let finalProjectKey = projectKey;
      
      // Check for duplicates and resolve collisions
      while (projects.find(p => p.projectKey === finalProjectKey)) {
        finalProjectKey = `${projectKey}${counter}`;
        counter++;
      }

      const projectData = {
        ...newProject,
        projectKey: finalProjectKey,
        ownerName: users[newProject.ownerId]?.name || currentUser.myName
      };

      await createProject(projectData);
      
      notify("Project created successfully");
      setShowCreateProject(false);
      setNewProject({
        title: "",
        type: "Product",
        description: "",
        ownerId: currentUser.myId,
        startDate: "",
        targetDate: "",
        color: "#3b82f6",
        emoji: "📁",
        status: "Active",
        priority: "Medium",
        visibility: "Team"
      });
    } catch (err) {
      setError(err.message || "Failed to create project");
    } finally {
      setLoading(false);
    }
  };

  if (!showCreateProject) return null;

  return (
    <div
      className="modal fade show"
      style={{ display: "block", background: "rgba(2,6,23,.8)" }}
      onClick={() => setShowCreateProject(false)}
    >
      <div
        className="modal-dialog modal-lg modal-dialog-centered"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-content overflow-hidden modal-content-dark">
          <div className="modal-header modal-header-grad">
            <h5 className="modal-title text-white text-truncate">
              Create New Project
            </h5>
            <button
              className="btn-close btn-close-white"
              onClick={() => setShowCreateProject(false)}
            />
          </div>

          <form onSubmit={handleCreateProject}>
            <div className="modal-body modal-body-dark">
              {error && (
                <div className="alert alert-danger py-2">{error}</div>
              )}
              <div className="row g-3">
                <div className="col-md-8">
                  <label className="form-label text-muted-200">
                    Project Title *
                  </label>
                  <input
                    className="form-control dark-input"
                    value={newProject.title}
                    onChange={(e) => setNewProject(p => ({ ...p, title: e.target.value }))}
                    placeholder="Enter project title..."
                    required
                  />
                </div>

                <div className="col-md-4">
                  <label className="form-label text-muted-200">
                    Project Type
                  </label>
                  <select
                    className="form-select dark-input"
                    value={newProject.type}
                    onChange={(e) => setNewProject(p => ({ ...p, type: e.target.value }))}
                  >
                    {Object.keys(PROJECT_TYPES).map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div className="col-12">
                  <label className="form-label text-muted-200">
                    Description
                  </label>
                  <RichTextEditor
                    value={newProject.description}
                    onChange={(html) => setNewProject(p => ({ ...p, description: html }))}
                    placeholder="Project description..."
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label text-muted-200">
                    Owner
                  </label>
                  <select
                    className="form-select dark-input"
                    value={newProject.ownerId}
                    onChange={(e) => setNewProject(p => ({ ...p, ownerId: e.target.value }))}
                  >
                    {Object.entries(users).map(([k, u]) => (
                      <option key={k} value={k}>
                        {u.name} ({u.role || "user"})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-md-6">
                  <label className="form-label text-muted-200">
                    Status
                  </label>
                  <select
                    className="form-select dark-input"
                    value={newProject.status}
                    onChange={(e) => setNewProject(p => ({ ...p, status: e.target.value }))}
                  >
                    {Object.keys(PROJECT_STATUS).map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>

                <div className="col-md-4">
                  <label className="form-label text-muted-200">
                    Priority
                  </label>
                  <select
                    className="form-select dark-input"
                    value={newProject.priority}
                    onChange={(e) => setNewProject(p => ({ ...p, priority: e.target.value }))}
                  >
                    {Object.keys(PRIORITIES).map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                <div className="col-md-4">
                  <label className="form-label text-muted-200">
                    Visibility
                  </label>
                  <select
                    className="form-select dark-input"
                    value={newProject.visibility}
                    onChange={(e) => setNewProject(p => ({ ...p, visibility: e.target.value }))}
                  >
                    {Object.entries(VISIBILITY_OPTIONS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>

                <div className="col-md-4">
                  <label className="form-label text-muted-200">
                    Emoji
                  </label>
                  <input
                    className="form-control dark-input"
                    value={newProject.emoji}
                    onChange={(e) => setNewProject(p => ({ ...p, emoji: e.target.value }))}
                    placeholder="🎯"
                    maxLength="2"
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label text-muted-200">
                    Start Date
                  </label>
                  <input
                    type="date"
                    className="form-control dark-input"
                    value={newProject.startDate}
                    onChange={(e) => setNewProject(p => ({ ...p, startDate: e.target.value }))}
                    min={todayYMD()}
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label text-muted-200">
                    Target Date
                  </label>
                  <input
                    type="date"
                    className="form-control dark-input"
                    value={newProject.targetDate}
                    onChange={(e) => setNewProject(p => ({ ...p, targetDate: e.target.value }))}
                    min={newProject.startDate || todayYMD()}
                  />
                </div>
              </div>
            </div>

            <div className="modal-footer modal-footer-dark">
              <button
                type="button"
                className="btn btn-light"
                onClick={() => setShowCreateProject(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? "Creating..." : "Create Project"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateProjectModal;