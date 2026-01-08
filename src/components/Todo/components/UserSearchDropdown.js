// src/components/Tasks/components/UserSearchDropdown.jsx
import React, { useState, useRef, useEffect } from "react";

const cn = (...xs) => xs.filter(Boolean).join(" ");

const UserSearchDropdown = ({ users, value, onChange, className, disabled }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Filter users based on search term
  const filteredUsers = Object.entries(users || {}).filter(([id, user]) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      user.name?.toLowerCase().includes(term) ||
      user.role?.toLowerCase().includes(term) ||
      id.toLowerCase().includes(term)
    );
  });

  // Sort users: current user first, then by name
  const sortedUsers = filteredUsers.sort(([idA, userA], [idB, userB]) => {
    // Selected user comes first
    if (idA === value) return -1;
    if (idB === value) return 1;
    // Then sort by name
    return (userA.name || "").localeCompare(userB.name || "");
  });

  const selectedUser = value ? users[value] : null;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (userId) => {
    onChange(userId);
    setIsOpen(false);
    setSearchTerm("");
  };

  return (
    <div className={cn("position-relative", className)} ref={dropdownRef}>
      {/* Selected User Display */}
      <div
        className={cn(
          "form-control dark-input d-flex align-items-center gap-2 cursor-pointer",
          disabled && "opacity-50"
        )}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        style={{ minHeight: "38px" }}
      >
        {selectedUser ? (
          <>
            {selectedUser.photoURL ? (
              <img
                src={selectedUser.photoURL}
                alt={selectedUser.name}
                className="avatar avatar-xs"
                style={{ objectFit: "cover" }}
                onError={(e) => (e.currentTarget.style.display = "none")}
              />
            ) : (
              <span className="avatar avatar-xs avatar-fallback">
                {(selectedUser.name || "U")
                  .split(" ")
                  .map((s) => s[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </span>
            )}
            <div className="flex-grow-1">
              <div className="text-white-90">{selectedUser.name}</div>
              <div className="tiny text-muted-300">
                {selectedUser.role || "user"}
              </div>
            </div>
          </>
        ) : (
          <span className="text-muted-300">Select assignee...</span>
        )}
        <span className="ms-auto">▼</span>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="dropdown-menu show w-100"
          style={{
            background: "#1e293b",
            border: "1px solid #334155",
            maxHeight: "300px",
            overflowY: "auto",
            zIndex: 1000,
          }}
        >
          {/* Search Input */}
          <div className="p-2 border-bottom border-secondary">
            <input
              type="text"
              className="form-control form-control-sm dark-input"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              autoFocus
            />
          </div>

          {/* User List */}
          <div className="py-1">
            {sortedUsers.length === 0 ? (
              <div className="px-3 py-2 text-muted-300 small">No users found</div>
            ) : (
              sortedUsers.map(([userId, user]) => (
                <button
                  key={userId}
                  className={cn(
                    "dropdown-item d-flex align-items-center gap-2",
                    userId === value && "active bg-primary"
                  )}
                  onClick={() => handleSelect(userId)}
                  style={{
                    color: userId === value ? "#fff" : "#cbd5e1",
                    background: userId === value ? "#3b82f6" : "transparent",
                  }}
                >
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.name}
                      className="avatar avatar-xs"
                      style={{ objectFit: "cover" }}
                      onError={(e) => (e.currentTarget.style.display = "none")}
                    />
                  ) : (
                    <span className="avatar avatar-xs avatar-fallback">
                      {(user.name || "U")
                        .split(" ")
                        .map((s) => s[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </span>
                  )}
                  <div className="text-start">
                    <div className="text-white-90">{user.name}</div>
                    <div className="tiny text-muted-300">{user.role || "user"}</div>
                  </div>
                  {userId === value && (
                    <span className="ms-auto">✓</span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default UserSearchDropdown;