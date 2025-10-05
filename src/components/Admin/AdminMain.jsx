// src/pages/AdminUsers.jsx
import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";

export default function AdminUsers() {
  const { user, createUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    name: "",
    password: "",
    role: "user"
  });

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    
    try {
      // Validate required fields
      if (!formData.username.trim() || !formData.name.trim() || !formData.password) {
        throw new Error("Username, name, and password are required");
      }

      console.log("📝 Creating user with data:", formData);

      // Create the user with all required data
      const result = await createUser({
        username: formData.username.trim(),
        email: formData.email.trim(),
        name: formData.name.trim(),
        role: formData.role,
        password: formData.password
      });

      if (result.success) {
        setMessage(`✅ User "${formData.username}" created successfully with ID: ${result.userId}`);
        // Reset form
        setFormData({
          username: "",
          email: "",
          name: "",
          password: "",
          role: "user"
        });
      } else {
        throw new Error("User creation failed");
      }
    } catch (error) {
      console.error("❌ User creation error:", error);
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // Check if user is admin
  if (user?.role !== "admin") {
    return (
      <div className="container mt-4">
        <div className="alert alert-danger">
          <h4>Access Denied</h4>
          <p>You need administrator privileges to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <div className="row">
        <div className="col-md-8 mx-auto">
          <div className="">
            <div className="card-header">
              <h4>Create New User</h4>
            </div>
            <div className="card-body">
              {message && (
                <div className={`alert ${message.includes('✅') ? 'alert-success' : 'alert-danger'}`}>
                  {message}
                </div>
              )}
              
              <form onSubmit={handleCreateUser}>
                <div className="row">
                  <div className="col-md-6">
                    <div className="form-group mb-3">
                      <label className="form-label">Username *</label>
                      <input
                        type="text"
                        className="form-control"
                        name="username"
                        value={formData.username}
                        onChange={handleChange}
                        required
                        placeholder="Enter username"
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="form-group mb-3">
                      <label className="form-label">Email</label>
                      <input
                        type="email"
                        className="form-control"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="Enter email (optional)"
                      />
                    </div>
                  </div>
                </div>

                <div className="form-group mb-3">
                  <label className="form-label">Full Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    placeholder="Enter full name"
                  />
                </div>

                <div className="row">
                  <div className="col-md-6">
                    <div className="form-group mb-3">
                      <label className="form-label">Password *</label>
                      <input
                        type="password"
                        className="form-control"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                        placeholder="Enter password"
                        minLength="6"
                      />
                      <div className="form-text">Password must be at least 6 characters long.</div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="form-group mb-3">
                      <label className="form-label">Role *</label>
                      <select
                        className="form-control"
                        name="role"
                        value={formData.role}
                        onChange={handleChange}
                        required
                      >
                        <option value="user">User</option>
                        <option value="admin">Administrator</option>
                        <option value="manager">Manager</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="d-grid gap-2 d-md-flex justify-content-md-end">
                  <button 
                    type="button" 
                    className="btn btn-secondary me-md-2"
                    onClick={() => {
                      setFormData({
                        username: "",
                        email: "",
                        name: "",
                        password: "",
                        role: "user"
                      });
                      setMessage("");
                    }}
                    disabled={loading}
                  >
                    Clear Form
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={loading || !formData.username.trim() || !formData.name.trim() || !formData.password}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status">
                          <span className="visually-hidden">Loading...</span>
                        </span>
                        Creating User...
                      </>
                    ) : (
                      "Create User"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div className=" mt-4">
            <div className="card-header">
              <h5>User Roles Information</h5>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-4">
                  <h6>Administrator</h6>
                  <ul className="small">
                    <li>Full system access</li>
                    <li>Can create/edit users</li>
                    <li>All permissions enabled</li>
                  </ul>
                </div>
                <div className="col-md-4">
                  <h6>Manager</h6>
                  <ul className="small">
                    <li>Most system access</li>
                    <li>Can manage staff/workers</li>
                    <li>Limited admin functions</li>
                  </ul>
                </div>
                <div className="col-md-4">
                  <h6>User</h6>
                  <ul className="small">
                    <li>Basic system access</li>
                    <li>Role-based permissions</li>
                    <li>No admin functions</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}