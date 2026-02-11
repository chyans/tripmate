import React, { useState, useEffect } from "react";
import axios from "axios";
import API_URL from "../config";

export default function AdminPanel({ token, user, onBack }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({
    username: "",
    email: "",
    full_name: "",
    is_admin: false,
    is_premium: false,
    is_suspended: false,
    suspended_reason: ""
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    username: "",
    email: "",
    password: "",
    full_name: "",
    account_type: "free"
  });

  useEffect(() => {
    loadUsers();
  }, [token, filterType]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const params = filterType !== "all" ? { type: filterType } : {};
      const res = await axios.get(`${API_URL}/api/admin/users`, {
        headers: { Authorization: `Bearer ${token}` },
        params
      });
      setUsers(res.data.users || []);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async () => {
    if (!searchQuery.trim()) {
      loadUsers();
      return;
    }
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/api/admin/users/search`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { q: searchQuery }
      });
      setUsers(res.data.users || []);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to search users");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user.id);
    setEditForm({
      username: user.username || "",
      email: user.email || "",
      full_name: user.full_name || "",
      is_admin: user.is_admin || false,
      is_premium: user.is_premium || false,
      is_suspended: user.is_suspended || false,
      suspended_reason: user.suspended_reason || ""
    });
    setError("");
    setSuccess("");
  };

  const handleUpdate = async () => {
    try {
      setError("");
      setSuccess("");
      await axios.put(
        `${API_URL}/api/admin/users/${editingUser}`,
        editForm,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess("User updated successfully");
      setEditingUser(null);
      loadUsers();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update user");
    }
  };

  const handleDelete = async (userId, username) => {
    if (!window.confirm(`Are you sure you want to delete user "${username}"? This action cannot be undone.`)) {
      return;
    }
    try {
      setError("");
      setSuccess("");
      await axios.delete(
        `${API_URL}/api/admin/users/${userId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess("User deleted successfully");
      loadUsers();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to delete user");
    }
  };

  const handleCreate = async () => {
    if (!createForm.username || !createForm.email || !createForm.password) {
      setError("Username, email, and password are required");
      return;
    }

    if (createForm.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    try {
      setError("");
      setSuccess("");
      await axios.post(
        `${API_URL}/api/admin/users`,
        createForm,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess("User created successfully");
      setShowCreateModal(false);
      setCreateForm({
        username: "",
        email: "",
        password: "",
        full_name: "",
        account_type: "free"
      });
      loadUsers();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create user");
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div style={{
      minHeight: "calc(100vh - 100px)",
      background: "transparent",
      display: "flex",
      flexDirection: "column",
      position: "relative",
      zIndex: 1
    }}>
      <div style={{
        padding: "clamp(16px, 4vw, 24px)",
        flex: "1"
      }}>
        <div style={{
          maxWidth: "1400px",
          margin: "0 auto",
          background: "transparent",
          padding: "clamp(24px, 4vw, 32px)"
        }}>
        {/* Header */}
        <div style={{
          marginBottom: "32px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px"
        }}>
          <div>
            <h1 style={{
              fontSize: "clamp(28px, 4vw, 36px)",
              fontWeight: "800",
              color: "#0f172a",
              marginBottom: "8px",
              letterSpacing: "-0.02em"
            }}>
              Admin Panel 👑
            </h1>
            <p style={{
              fontSize: "16px",
              color: "#64748b"
            }}>
              Manage all user accounts
            </p>
          </div>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <button
              onClick={() => setShowCreateModal(true)}
              style={{
                padding: "10px 20px",
                background: "#10b981",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "500",
                transition: "all 0.2s ease",
                display: "flex",
                alignItems: "center",
                gap: "6px"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#059669";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#10b981";
              }}
            >
              <span>+</span>
              <span>Create User</span>
            </button>
            <button
              onClick={onBack}
              style={{
                padding: "10px 20px",
                background: "#f1f5f9",
                color: "#475569",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "500",
                transition: "all 0.2s ease"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#e2e8f0";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#f1f5f9";
              }}
            >
              ← Back
            </button>
          </div>
        </div>

        {/* Search and Filter */}
        <div style={{
          background: "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          border: "1px solid rgba(255, 255, 255, 0.3)",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
          padding: "clamp(16px, 4vw, 24px)",
          borderRadius: "12px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          marginBottom: "24px",
          display: "flex",
          gap: "16px",
          flexWrap: "wrap",
          alignItems: "center"
        }}>
          <div style={{ flex: "1", minWidth: "min(200px, 100%)" }}>
            <input
              type="text"
              placeholder="Search by username, email, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && searchUsers()}
              style={{
                width: "100%",
                padding: "10px 16px",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                fontSize: "14px",
                outline: "none",
                transition: "border-color 0.2s ease"
              }}
              onFocus={(e) => e.target.style.borderColor = "#667eea"}
              onBlur={(e) => e.target.style.borderColor = "#e2e8f0"}
            />
          </div>
          <button
            onClick={searchUsers}
            style={{
              padding: "10px 20px",
              background: "#667eea",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "500",
              transition: "all 0.2s ease"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#5568d3";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#667eea";
            }}
          >
            Search
          </button>
          <select
            value={filterType}
            onChange={(e) => {
              setFilterType(e.target.value);
              setSearchQuery("");
            }}
            style={{
              padding: "10px 16px",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              fontSize: "14px",
              cursor: "pointer",
              outline: "none",
              background: "white"
            }}
          >
            <option value="all">All Users</option>
            <option value="free">Free Users</option>
            <option value="premium">Premium Users</option>
            <option value="admin">Admins</option>
          </select>
        </div>

        {/* Messages */}
        {error && (
          <div style={{
            background: "#fee2e2",
            color: "#dc2626",
            padding: "12px 16px",
            borderRadius: "8px",
            marginBottom: "24px",
            fontSize: "14px"
          }}>
            {error}
          </div>
        )}
        {success && (
          <div style={{
            background: "#d1fae5",
            color: "#059669",
            padding: "12px 16px",
            borderRadius: "8px",
            marginBottom: "24px",
            fontSize: "14px"
          }}>
            {success}
          </div>
        )}

        {/* Users Table */}
        <div style={{
          background: "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          border: "1px solid rgba(255, 255, 255, 0.3)",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
          borderRadius: "12px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          overflow: "hidden"
        }}>
          {loading ? (
            <div style={{
              padding: "clamp(40px, 8vw, 60px)",
              textAlign: "center",
              color: "#64748b"
            }}>
              Loading users...
            </div>
          ) : users.length === 0 ? (
            <div style={{
              padding: "clamp(40px, 8vw, 60px)",
              textAlign: "center",
              color: "#64748b"
            }}>
              No users found
            </div>
          ) : (
            <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
              <table style={{
                width: "100%",
                borderCollapse: "collapse",
                minWidth: "600px"
              }}>
                <thead>
                  <tr style={{
                    background: "#f8fafc",
                    borderBottom: "2px solid #e2e8f0"
                  }}>
                    <th style={{
                      padding: "clamp(12px, 2vw, 16px)",
                      textAlign: "left",
                      fontSize: "clamp(10px, 2vw, 12px)",
                      fontWeight: "600",
                      color: "#64748b",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em"
                    }}>ID</th>
                    <th style={{
                      padding: "clamp(12px, 2vw, 16px)",
                      textAlign: "left",
                      fontSize: "clamp(10px, 2vw, 12px)",
                      fontWeight: "600",
                      color: "#64748b",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em"
                    }}>Username</th>
                    <th style={{
                      padding: "clamp(12px, 2vw, 16px)",
                      textAlign: "left",
                      fontSize: "clamp(10px, 2vw, 12px)",
                      fontWeight: "600",
                      color: "#64748b",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em"
                    }}>Email</th>
                    <th style={{
                      padding: "clamp(12px, 2vw, 16px)",
                      textAlign: "left",
                      fontSize: "clamp(10px, 2vw, 12px)",
                      fontWeight: "600",
                      color: "#64748b",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em"
                    }}>Full Name</th>
                    <th style={{
                      padding: "clamp(12px, 2vw, 16px)",
                      textAlign: "left",
                      fontSize: "clamp(10px, 2vw, 12px)",
                      fontWeight: "600",
                      color: "#64748b",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em"
                    }}>Type</th>
                    <th style={{
                      padding: "clamp(12px, 2vw, 16px)",
                      textAlign: "left",
                      fontSize: "clamp(10px, 2vw, 12px)",
                      fontWeight: "600",
                      color: "#64748b",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em"
                    }}>Created</th>
                    <th style={{
                      padding: "clamp(12px, 2vw, 16px)",
                      textAlign: "left",
                      fontSize: "clamp(10px, 2vw, 12px)",
                      fontWeight: "600",
                      color: "#64748b",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em"
                    }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((userItem, index) => (
                    <tr
                      key={userItem.id}
                      style={{
                        borderBottom: index < users.length - 1 ? "1px solid #f1f5f9" : "none",
                        background: editingUser === userItem.id ? "#fef3c7" : "white"
                      }}
                    >
                      {editingUser === userItem.id ? (
                        <>
                          <td style={{ padding: "16px", fontSize: "14px", color: "#1e293b" }}>
                            {userItem.id}
                          </td>
                          <td style={{ padding: "16px" }}>
                            <input
                              type="text"
                              value={editForm.username}
                              onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                              style={{
                                width: "100%",
                                padding: "8px",
                                border: "1px solid #e2e8f0",
                                borderRadius: "6px",
                                fontSize: "14px",
                                outline: "none"
                              }}
                            />
                          </td>
                          <td style={{ padding: "16px" }}>
                            <input
                              type="email"
                              value={editForm.email}
                              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                              style={{
                                width: "100%",
                                padding: "8px",
                                border: "1px solid #e2e8f0",
                                borderRadius: "6px",
                                fontSize: "14px",
                                outline: "none"
                              }}
                            />
                          </td>
                          <td style={{ padding: "16px" }}>
                            <input
                              type="text"
                              value={editForm.full_name}
                              onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                              style={{
                                width: "100%",
                                padding: "8px",
                                border: "1px solid #e2e8f0",
                                borderRadius: "6px",
                                fontSize: "14px",
                                outline: "none"
                              }}
                            />
                          </td>
                          <td style={{ padding: "16px" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                              <label style={{ fontSize: "12px", display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                                <input
                                  type="checkbox"
                                  checked={editForm.is_admin}
                                  onChange={(e) => {
                                    const isAdmin = e.target.checked;
                                    setEditForm({ 
                                      ...editForm, 
                                      is_admin: isAdmin,
                                      is_premium: isAdmin ? false : editForm.is_premium
                                    });
                                  }}
                                />
                                <span>Admin</span>
                              </label>
                              <label style={{ fontSize: "12px", display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                                <input
                                  type="checkbox"
                                  checked={editForm.is_premium}
                                  onChange={(e) => {
                                    const isPremium = e.target.checked;
                                    setEditForm({ 
                                      ...editForm, 
                                      is_premium: isPremium,
                                      is_admin: isPremium ? false : editForm.is_admin
                                    });
                                  }}
                                />
                                <span>Premium</span>
                              </label>
                              <label style={{ fontSize: "12px", display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                                <input
                                  type="checkbox"
                                  checked={editForm.is_suspended}
                                  onChange={(e) => setEditForm({ ...editForm, is_suspended: e.target.checked })}
                                />
                                <span>Suspended</span>
                              </label>
                              {editForm.is_suspended && (
                                <input
                                  type="text"
                                  placeholder="Suspension reason..."
                                  value={editForm.suspended_reason}
                                  onChange={(e) => setEditForm({ ...editForm, suspended_reason: e.target.value })}
                                  style={{
                                    width: "100%",
                                    padding: "6px",
                                    border: "1px solid #e2e8f0",
                                    borderRadius: "4px",
                                    fontSize: "11px",
                                    outline: "none",
                                    marginTop: "4px"
                                  }}
                                />
                              )}
                            </div>
                          </td>
                          <td style={{ padding: "16px", fontSize: "14px", color: "#64748b" }}>
                            {formatDate(userItem.created_at)}
                          </td>
                          <td style={{ padding: "16px" }}>
                            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                              <button
                                onClick={handleUpdate}
                                style={{
                                  padding: "6px 12px",
                                  background: "#10b981",
                                  color: "white",
                                  border: "none",
                                  borderRadius: "6px",
                                  cursor: "pointer",
                                  fontSize: "12px",
                                  fontWeight: "500"
                                }}
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingUser(null)}
                                style={{
                                  padding: "6px 12px",
                                  background: "#64748b",
                                  color: "white",
                                  border: "none",
                                  borderRadius: "6px",
                                  cursor: "pointer",
                                  fontSize: "12px",
                                  fontWeight: "500"
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td style={{ padding: "clamp(12px, 2vw, 16px)", fontSize: "clamp(12px, 2.5vw, 14px)", color: "#1e293b", fontWeight: "500" }}>
                            {userItem.id}
                          </td>
                          <td style={{ padding: "clamp(12px, 2vw, 16px)", fontSize: "clamp(12px, 2.5vw, 14px)", color: "#1e293b" }}>
                            {userItem.username}
                          </td>
                          <td style={{ padding: "clamp(12px, 2vw, 16px)", fontSize: "clamp(12px, 2.5vw, 14px)", color: "#475569" }}>
                            {userItem.email}
                          </td>
                          <td style={{ padding: "clamp(12px, 2vw, 16px)", fontSize: "clamp(12px, 2.5vw, 14px)", color: "#475569" }}>
                            {userItem.full_name || "—"}
                          </td>
                          <td style={{ padding: "clamp(12px, 2vw, 16px)" }}>
                            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                              {userItem.is_admin && (
                                <span style={{
                                  padding: "4px 8px",
                                  background: "#e0e7ff",
                                  color: "#667eea",
                                  borderRadius: "6px",
                                  fontSize: "clamp(10px, 2vw, 11px)",
                                  fontWeight: "600"
                                }}>
                                  Admin
                                </span>
                              )}
                              {userItem.is_premium && (
                                <span style={{
                                  padding: "4px 8px",
                                  background: "#fffbeb",
                                  color: "#a16207",
                                  borderRadius: "6px",
                                  fontSize: "clamp(10px, 2vw, 11px)",
                                  fontWeight: "600"
                                }}>
                                  Premium
                                </span>
                              )}
                              {userItem.is_suspended && (
                                <span style={{
                                  padding: "4px 8px",
                                  background: "#fee2e2",
                                  color: "#dc2626",
                                  borderRadius: "6px",
                                  fontSize: "clamp(10px, 2vw, 11px)",
                                  fontWeight: "600"
                                }}>
                                  Suspended
                                </span>
                              )}
                              {!userItem.is_admin && !userItem.is_premium && !userItem.is_suspended && (
                                <span style={{
                                  padding: "4px 8px",
                                  background: "#f1f5f9",
                                  color: "#64748b",
                                  borderRadius: "6px",
                                  fontSize: "clamp(10px, 2vw, 11px)",
                                  fontWeight: "600"
                                }}>
                                  Free
                                </span>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: "clamp(12px, 2vw, 16px)", fontSize: "clamp(12px, 2.5vw, 14px)", color: "#64748b" }}>
                            {formatDate(userItem.created_at)}
                          </td>
                          <td style={{ padding: "clamp(12px, 2vw, 16px)" }}>
                            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                              <button
                                onClick={() => handleEdit(userItem)}
                                style={{
                                  padding: "6px 12px",
                                  background: "#667eea",
                                  color: "white",
                                  border: "none",
                                  borderRadius: "6px",
                                  cursor: "pointer",
                                  fontSize: "12px",
                                  fontWeight: "500",
                                  transition: "background 0.2s ease"
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = "#5568d3";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = "#667eea";
                                }}
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(userItem.id, userItem.username)}
                                style={{
                                  padding: "6px 12px",
                                  background: "#dc2626",
                                  color: "white",
                                  border: "none",
                                  borderRadius: "6px",
                                  cursor: "pointer",
                                  fontSize: "12px",
                                  fontWeight: "500",
                                  transition: "background 0.2s ease"
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = "#b91c1c";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = "#dc2626";
                                }}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div style={{ marginTop: "24px", fontSize: "14px", color: "#64748b", textAlign: "center" }}>
          Total users: {users.length}
        </div>
        </div>
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: "20px"
        }}
        onClick={() => setShowCreateModal(false)}
        >
          <div style={{
            background: "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          border: "1px solid rgba(255, 255, 255, 0.3)",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
            borderRadius: "16px",
            padding: "clamp(20px, 4vw, 32px)",
            maxWidth: "500px",
            width: "100%",
            maxHeight: "90vh",
            overflowY: "auto",
            boxShadow: "0 20px 60px rgba(0,0,0,0.3)"
          }}
          onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{
              fontSize: "clamp(22px, 4vw, 28px)",
              fontWeight: "700",
              color: "#0f172a",
              marginBottom: "24px"
            }}>
              Create New User
            </h2>

            {error && (
              <div style={{
                padding: "12px 16px",
                background: "#fee2e2",
                color: "#dc2626",
                borderRadius: "8px",
                marginBottom: "16px",
                fontSize: "14px"
              }}>
                {error}
              </div>
            )}

            <div style={{ marginBottom: "16px" }}>
              <label style={{
                display: "block",
                marginBottom: "8px",
                fontSize: "13px",
                fontWeight: "600",
                color: "#475569"
              }}>
                Username *
              </label>
              <input
                type="text"
                value={createForm.username}
                onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  fontSize: "14px",
                  outline: "none"
                }}
                placeholder="Enter username"
              />
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{
                display: "block",
                marginBottom: "8px",
                fontSize: "13px",
                fontWeight: "600",
                color: "#475569"
              }}>
                Email *
              </label>
              <input
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  fontSize: "14px",
                  outline: "none"
                }}
                placeholder="Enter email"
              />
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{
                display: "block",
                marginBottom: "8px",
                fontSize: "13px",
                fontWeight: "600",
                color: "#475569"
              }}>
                Password *
              </label>
              <input
                type="password"
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  fontSize: "14px",
                  outline: "none"
                }}
                placeholder="Enter password (min 8 characters)"
              />
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{
                display: "block",
                marginBottom: "8px",
                fontSize: "13px",
                fontWeight: "600",
                color: "#475569"
              }}>
                Full Name
              </label>
              <input
                type="text"
                value={createForm.full_name}
                onChange={(e) => setCreateForm({ ...createForm, full_name: e.target.value })}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  fontSize: "14px",
                  outline: "none"
                }}
                placeholder="Enter full name (optional)"
              />
            </div>

            <div style={{ marginBottom: "24px" }}>
              <label style={{
                display: "block",
                marginBottom: "8px",
                fontSize: "13px",
                fontWeight: "600",
                color: "#475569"
              }}>
                Account Type *
              </label>
              <select
                value={createForm.account_type}
                onChange={(e) => setCreateForm({ ...createForm, account_type: e.target.value })}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  fontSize: "14px",
                  outline: "none",
                  cursor: "pointer"
                }}
              >
                <option value="free">Free</option>
                <option value="premium">Premium</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setCreateForm({
                    username: "",
                    email: "",
                    password: "",
                    full_name: "",
                    account_type: "free"
                  });
                  setError("");
                }}
                style={{
                  padding: "10px 20px",
                  background: "#f1f5f9",
                  color: "#475569",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "500"
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                style={{
                  padding: "10px 20px",
                  background: "#10b981",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "500"
                }}
              >
                Create User
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}


