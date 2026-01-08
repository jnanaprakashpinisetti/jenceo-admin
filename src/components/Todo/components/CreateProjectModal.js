import React, { useState, useEffect, useMemo } from "react";
import RichTextEditor from "../RichTextEditor";
import { PROJECT_TYPES, PROJECT_STATUS, VISIBILITY_OPTIONS, PRIORITIES } from "../constants/constants";
import { todayYMD, generateProjectKey } from "../utils/helpers";
import { cn } from "../utils/helpers";

// Import the UserSearchDropdown component
import UserSearchDropdown from "./UserSearchDropdown";

// Project-related emoji options - using consistent color/style
const PROJECT_EMOJI_OPTIONS = [
  "🎯", "🚀", "📊", "💡", "🔧", "🎨", "📈", "🌟",
  "🏗️", "🔄", "📦", "🔒", "📋", "⚡", "🔍", "📌",
  "📍", "🔖", "📎", "📝", "📄", "📑", "📒", "📓",
  "📔", "📕", "📗", "📘", "📙", "📚", "📖", "🔗",
  "🧩", "🏆", "💎", "🎫", "🔮", "🏁", "✏️", "🖋️",
  "📐", "📏", "🔑", "🔐", "🔓", "🔔", "📣", "📢",
  "💻", "📱", "🖥️", "💾", "📀", "🖨️", "⌨️", "🖱️",
  "📡", "📶", "📳", "📴", "☎️", "📞", "📠", "📧",
  "📨", "📩", "📤", "📥", "📦", "📫", "📪", "📬",
  "📭", "📮", "🏢", "🏭", "🏪", "🏫", "🏬", "🏣",
  "🏤", "🏥", "🏦", "🏨", "🏩", "🏪", "🏫", "🏰",
  "💼", "📁", "📂", "📅", "📆", "🗒️", "🗓️", "📇",
  "📈", "📉", "📊", "📋", "📌", "📍", "📎", "🖇️",
  "📏", "📐", "✂️", "🗃️", "🗄️", "🗑️", "🔒", "🔓",
  "🔏", "🔐", "🔑", "🗝️", "🔨", "⛏️", "⚒️", "🛠️",
  "🗡️", "⚔️", "🔫", "🏹", "🛡️", "🔧", "🔩", "⚙️",
  "🗜️", "⚖️", "🔗", "⛓️", "🧰", "🧲", "🪛", "🔌",
  "💡", "🔦", "🕯️", "🧯", "🛢️", "💸", "💵", "💰"
];

const ITEMS_PER_PAGE = 12;

// Helper function to resolve user by uid
const resolveUserByUid = (users, uid) => {
  if (!uid || !users) return null;

  // 1️⃣ Direct key match (best case)
  if (users[uid]) return users[uid];

  // 2️⃣ Fallback: search by internal uid field
  return Object.values(users).find(u => u.uid === uid) || null;
};

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
    ownerId: currentUser.id || currentUser.myId,
    startDate: "",
    targetDate: "",
    color: "#3b82f6",
    emoji: "🎯",
    status: "Active",
    priority: "Medium",
    visibility: "Team"
  });

  // State for team selection
  const [showTeamSelection, setShowTeamSelection] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [teamSearchTerm, setTeamSearchTerm] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Get current owner user object using the resolver
  const ownerUser = resolveUserByUid(users, newProject.ownerId);
  const ownerName = ownerUser?.name || currentUser.myName || currentUser.name;

  // Filter users for team selection
  const filteredUsersForTeam = useMemo(() => {
    return Object.entries(users || {}).filter(([id, user]) => {
      if (!teamSearchTerm.trim()) return true;
      const term = teamSearchTerm.toLowerCase();
      return (
        user.name?.toLowerCase().includes(term) ||
        user.role?.toLowerCase().includes(term) ||
        id.toLowerCase().includes(term) ||
        (user.email && user.email.toLowerCase().includes(term)) ||
        (user.idNo && user.idNo.toLowerCase().includes(term))
      );
    });
  }, [users, teamSearchTerm]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredUsersForTeam.length / ITEMS_PER_PAGE);
  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredUsersForTeam.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredUsersForTeam, currentPage]);

  // Reset pagination when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [teamSearchTerm]);

  // Handle visibility change
  const handleVisibilityChange = (visibility) => {
    setNewProject(p => ({ ...p, visibility }));

    // Open team selection modal for Private or Team
    if (visibility === "Private" || visibility === "Team") {
      // Start with current user selected for Private
      if (visibility === "Private") {
        setSelectedMembers([currentUser.id || currentUser.myId]);
      } else {
        // For Team, select current user by default
        setSelectedMembers([currentUser.id || currentUser.myId]);
      }
      setShowTeamSelection(true);
    }
  };

  // Handle team member toggle
  const handleTeamMemberToggle = (userId) => {
    setSelectedMembers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  // Handle select all team members
  const handleSelectAllTeam = () => {
    const allUserIds = filteredUsersForTeam.map(([userId]) => userId);
    setSelectedMembers(allUserIds);
  };

  // Handle clear all team members
  const handleClearTeam = () => {
    setSelectedMembers([]);
  };

  // Handle emoji selection
  const handleEmojiSelect = (emoji) => {
    setNewProject(p => ({ ...p, emoji }));
    setShowEmojiPicker(false);
  };

  // Handle reset search
  const handleResetSearch = () => {
    setTeamSearchTerm("");
    setCurrentPage(1);
  };

  // Handle page change
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleCreateProject = async (e) => {
    e?.preventDefault?.();

    // Validate form
    if (!newProject.title.trim()) {
      setError("Please enter a project title.");
      return;
    }

    // For Organization visibility, create project directly
    if (newProject.visibility === "Organization") {
      await createProjectWithTeam(Object.keys(users));
      return;
    }

    // For Private or Team, open modal if not already open
    if (!showTeamSelection && (newProject.visibility === "Private" || newProject.visibility === "Team")) {
      setSelectedMembers([currentUser.id || currentUser.myId]);
      setShowTeamSelection(true);
      return;
    }
  };

  // Helper function to create project with team members
  const createProjectWithTeam = async (teamMemberIds) => {
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

      // Prepare team members data
      const teamMembers = {};
      teamMemberIds.forEach(memberId => {
        teamMembers[memberId] = true;
      });

      // Get owner user using resolver
      const ownerUser = resolveUserByUid(users, newProject.ownerId);

      const projectData = {
        ...newProject,

        // 🔑 Firebase reference - use actual uid field if available
        ownerUid: ownerUser?.uid || newProject.ownerId,

        // ✅ Real business ID (THIS WAS FAILING BEFORE)
        ownerIdNo: ownerUser?.idNo || "",

        ownerName: ownerUser?.name || "",

        projectKey: finalProjectKey,
        teamMembers,
        createdAt: Date.now(),
        updatedAt: Date.now(),

        totalTasks: 0,
        completedTasks: 0,
        progress: 0
      };

      await createProject(projectData);

      notify("Project created successfully");
      setShowCreateProject(false);
      setShowTeamSelection(false);
      setNewProject({
        title: "",
        type: "Product",
        description: "",
        ownerId: currentUser.id || currentUser.myId,
        startDate: "",
        targetDate: "",
        color: "#3b82f6",
        emoji: "🎯",
        status: "Active",
        priority: "Medium",
        visibility: "Team"
      });
      setSelectedMembers([]);
      setTeamSearchTerm("");
      setCurrentPage(1);
    } catch (err) {
      setError(err.message || "Failed to create project");
    } finally {
      setLoading(false);
    }
  };

  // Handle team selection completion
  const handleTeamSelectionComplete = async () => {
    if (selectedMembers.length === 0) {
      notify("Please select at least one team member", "error");
      return;
    }

    await createProjectWithTeam(selectedMembers);
  };

  // Handle cancel from team selection modal
  const handleTeamSelectionCancel = () => {
    setShowTeamSelection(false);
    setTeamSearchTerm("");
    setCurrentPage(1);
    // Reset to Team visibility if user cancels
    if (selectedMembers.length === 0) {
      setNewProject(p => ({ ...p, visibility: "Team" }));
    }
  };

  // Render pagination buttons
  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          className={`btn btn-sm ${currentPage === i ? 'btn-primary' : 'btn-outline-primary'}`}
          onClick={() => handlePageChange(i)}
          disabled={currentPage === i}
        >
          {i}
        </button>
      );
    }

    return (
      <div className="d-flex justify-content-center align-items-center gap-1 mt-3">
        <button
          className="btn btn-sm btn-outline-primary"
          onClick={() => handlePageChange(1)}
          disabled={currentPage === 1}
        >
          ««
        </button>
        <button
          className="btn btn-sm btn-outline-primary"
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          «
        </button>
        {pages}
        <button
          className="btn btn-sm btn-outline-primary"
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          »
        </button>
        <button
          className="btn btn-sm btn-outline-primary"
          onClick={() => handlePageChange(totalPages)}
          disabled={currentPage === totalPages}
        >
          »»
        </button>
      </div>
    );
  };

  if (!showCreateProject) return null;

  return (
    <>
      {/* Main Create Project Modal */}
      <div
        className="modal fade show"
        style={{
          display: "block",
          background: "rgba(2,6,23,.8)",
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1050,
          overflowY: "auto"
        }}
        onClick={() => setShowCreateProject(false)}
      >
        <div
          className="modal-dialog modal-lg modal-dialog-centered"
          onClick={(e) => e.stopPropagation()}
          style={{ maxHeight: "90vh", margin: "auto" }}
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
              <div className="modal-body modal-body-dark" style={{ overflowY: "auto", maxHeight: "calc(90vh - 150px)" }}>
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
                    <UserSearchDropdown
                      users={users}
                      value={newProject.ownerId}
                      onChange={(value) => setNewProject(p => ({ ...p, ownerId: value }))}
                    />
                    {/* Fixed: Use resolveUserByUid to get the correct user object */}
                    {(() => {
                      const currentOwner = resolveUserByUid(users, newProject.ownerId);
                      return currentOwner?.idNo ? (
                        <div className="form-text text-muted-300 small mt-1">
                          Business ID: {currentOwner.idNo}
                        </div>
                      ) : null;
                    })()}
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

                  {/* Priority, Visibility, and Emoji in a single row */}
                  <div className="col-md-3">
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

                  <div className="col-md-3">
                    <label className="form-label text-muted-200">
                      Visibility
                    </label>
                    <select
                      className="form-select dark-input"
                      value={newProject.visibility}
                      onChange={(e) => handleVisibilityChange(e.target.value)}
                    >
                      <option value="Organization">Organization</option>
                      <option value="Team">Team</option>
                      <option value="Private">Private</option>
                    </select>
                    <div className="form-text text-muted-300 small mt-1">
                      {newProject.visibility === "Organization" && "Visible to all organization members"}
                      {newProject.visibility === "Team" && "Visible to selected team members"}
                      {newProject.visibility === "Private" && "Visible only to selected individuals"}
                    </div>
                  </div>

                  <div className="col-md-3">
                    <label className="form-label text-muted-200">
                      Emoji
                    </label>
                    <div className="position-relative">
                      <div
                        className="form-control dark-input d-flex align-items-center gap-2 cursor-pointer"
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        style={{ minHeight: "38px" }}
                      >
                        <span className="fs-5">{newProject.emoji}</span>
                        <span className="text-muted-300 ms-auto">▼</span>
                      </div>

                      {showEmojiPicker && (
                        <div
                          className="emoji-picker"
                          style={{
                            position: "absolute",
                            top: "100%",
                            left: 0,
                            right: 0,
                            background: "#1e293b",
                            border: "1px solid #334155",
                            borderRadius: "8px",
                            padding: "10px",
                            zIndex: 1000,
                            maxHeight: "250px",
                            overflowY: "auto",
                            marginTop: "5px",
                            boxShadow: "0 4px 20px rgba(0,0,0,0.3)"
                          }}
                        >
                          <div className="row g-2">
                            {PROJECT_EMOJI_OPTIONS.map((emoji, index) => (
                              <div key={index} className="col-2 text-center">
                                <button
                                  type="button"
                                  className="btn btn-sm w-100 p-2"
                                  onClick={() => handleEmojiSelect(emoji)}
                                  title={emoji}
                                >
                                  {emoji}
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="col-md-3">
                    <label className="form-label text-muted-200">
                      Project Color
                    </label>
                    <div className="d-flex align-items-center gap-2">
                      <input
                        type="color"
                        className="form-control form-control-color dark-input"
                        value={newProject.color}
                        onChange={(e) => setNewProject(p => ({ ...p, color: e.target.value }))}
                        title="Choose project color"
                        style={{ height: "38px", width: "50px", padding: "2px" }}
                      />
                      <div className="flex-grow-1">
                        <input
                          type="text"
                          className="form-control dark-input"
                          value={newProject.color}
                          onChange={(e) => setNewProject(p => ({ ...p, color: e.target.value }))}
                          placeholder="#3b82f6"
                          maxLength={7}
                        />
                      </div>
                    </div>
                    <div className="form-text text-muted-300 small mt-1">
                      This color will be used for project cards and tasks
                    </div>
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

                  {/* Additional Features */}
                  <div className="col-md-4">
                    <label className="form-label text-muted-200">
                      Budget (₹)
                    </label>
                    <input
                      type="number"
                      className="form-control dark-input"
                      min="0"
                      step="1000"
                      value={newProject.budget || ""}
                      onChange={(e) => setNewProject(p => ({ ...p, budget: parseInt(e.target.value) || "" }))}
                      placeholder="Optional"
                    />
                  </div>

                  <div className="col-md-4">
                    <label className="form-label text-muted-200">
                      Estimated Duration (days)
                    </label>
                    <input
                      type="number"
                      className="form-control dark-input"
                      min="1"
                      max="365"
                      value={newProject.duration || ""}
                      onChange={(e) => setNewProject(p => ({ ...p, duration: parseInt(e.target.value) || "" }))}
                      placeholder="Optional"
                    />
                  </div>

                  <div className="col-md-4">
                    <label className="form-label text-muted-200">
                      Tags
                    </label>
                    <input
                      type="text"
                      className="form-control dark-input"
                      value={newProject.tags || ""}
                      onChange={(e) => setNewProject(p => ({ ...p, tags: e.target.value }))}
                      placeholder="e.g., urgent,feature,bug"
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
                  {loading ? "Creating..." : "Continue"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Team Selection Modal */}
      {showTeamSelection && (
        <div className="modal-overlay" onClick={handleTeamSelectionCancel}>
          <div className="modal-modern modal-xl" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header bg-primary text-white">
              <h6 className="mb-0">
                {newProject.visibility === "Private"
                  ? "Select Individuals for Private Access"
                  : "Select Team Members"}
                <small className="d-block text-white-80 mt-1">
                  Project: {newProject.title || "Untitled"} • {filteredUsersForTeam.length} users found
                  {/* Fixed: Use resolveUserByUid to get the correct user object */}
                  {(() => {
                    const currentOwner = resolveUserByUid(users, newProject.ownerId);
                    return currentOwner?.idNo ? (
                      <span className="ms-2">
                        • Owner ID: {currentOwner.idNo}
                      </span>
                    ) : null;
                  })()}
                </small>
              </h6>
              <button
                className="btn btn-sm btn-light"
                onClick={handleTeamSelectionCancel}
              >
                Close
              </button>
            </div>
            <div className="modal-body p-3" style={{ background: "#0f172a", maxHeight: '70vh', overflowY: 'auto' }}>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div className="text-white-80">
                  <span className="text-info">Selected: {selectedMembers.length}</span>
                  <span className="text-muted-300 mx-2">•</span>
                  <span className="text-warning">Page {currentPage} of {totalPages}</span>
                </div>
                <div className="d-flex gap-2">
                  <button
                    className="btn btn-sm btn-outline-info"
                    onClick={handleSelectAllTeam}
                    title="Select all users"
                  >
                    Select All
                  </button>
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    onClick={handleClearTeam}
                    title="Clear selection"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              {/* Search Input with Reset */}
              <div className="mb-3 position-relative">
                <div className="input-group">
                  <span className="input-group-text dark-input">🔍</span>
                  <input
                    type="text"
                    className="form-control dark-input"
                    placeholder="Search by name, role, email, or ID..."
                    value={teamSearchTerm}
                    onChange={(e) => setTeamSearchTerm(e.target.value)}
                  />
                  {teamSearchTerm && (
                    <button
                      className="btn btn-outline-danger"
                      type="button"
                      onClick={handleResetSearch}
                      title="Reset search"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <div className="form-text text-muted-300 small mt-1">
                  Search by: Name • Role • Email • User ID • Business ID
                </div>
              </div>

              {/* User List */}
              {filteredUsersForTeam.length === 0 ? (
                <div className="text-center text-muted-300 py-4">
                  <div className="fs-4 mb-2">👤 No users found</div>
                  {teamSearchTerm ? (
                    <p>No users match "{teamSearchTerm}". Try a different search term.</p>
                  ) : (
                    <p>No users available in the system.</p>
                  )}
                </div>
              ) : (
                <>
                  <div className="row g-2 mb-3">
                    {paginatedUsers.map(([userId, user]) => (
                      <div key={userId} className="col-md-6 col-lg-4">
                        <div className={`team-member-item d-flex align-items-center gap-3 p-2 rounded ${selectedMembers.includes(userId) ? 'bg-primary bg-opacity-25 border border-primary' : 'bg-dark bg-opacity-50'}`}>
                          <input
                            type="checkbox"
                            className="form-check-input"
                            checked={selectedMembers.includes(userId)}
                            onChange={() => handleTeamMemberToggle(userId)}
                            id={`member-${userId}`}
                          />
                          <label htmlFor={`member-${userId}`} className="d-flex align-items-center gap-3 flex-grow-1 cursor-pointer">
                            {user.photoURL ? (
                              <img
                                src={user.photoURL}
                                alt={user.name}
                                className="avatar avatar-sm"
                                style={{ objectFit: "cover" }}
                              />
                            ) : (
                              <span className="avatar avatar-sm avatar-fallback">
                                {(user.name || "U")
                                  .split(" ")
                                  .map((s) => s[0])
                                  .join("")
                                  .slice(0, 2)
                                  .toUpperCase()}
                              </span>
                            )}
                            <div className="flex-grow-1">
                              <div className="text-white-90">
                                {user.name}
                                {userId === (currentUser.id || currentUser.myId) && (
                                  <span className="ms-2 badge bg-info">You</span>
                                )}
                              </div>
                              <div className="small text-muted-300">
                                <div className="d-flex justify-content-between align-items-center">
                                  <span>{user.role || "user"}</span>
                                  <span className="text-info small" title="Business ID">
                                    ID: {user.idNo || "N/A"}
                                  </span>
                                </div>
                                {user.email && (
                                  <div className="text-truncate" title={user.email}>
                                    {user.email}
                                  </div>
                                )}
                              </div>
                            </div>
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pagination */}
                  {renderPagination()}

                  {/* Summary */}
                  <div className="d-flex justify-content-between align-items-center mt-3 pt-3 border-top border-secondary">
                    <div className="text-muted-300 small">
                      <span className="text-info">💡 Tip:</span> {newProject.visibility === "Private"
                        ? "Only selected individuals will see this project."
                        : "Selected members will have access to this project."}
                    </div>
                    <div className="d-flex gap-2">
                      <button
                        className="btn btn-light"
                        onClick={handleTeamSelectionCancel}
                      >
                        Back
                      </button>
                      <button
                        className="btn btn-primary"
                        onClick={handleTeamSelectionComplete}
                        disabled={selectedMembers.length === 0}
                      >
                        {selectedMembers.length === 0 ? (
                          "Select Members"
                        ) : (
                          <>
                            Create Project <span className="badge bg-light text-dark ms-2">{selectedMembers.length}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CreateProjectModal;