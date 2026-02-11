import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import API_URL from "../config";

export default function EditProfile({ token, user, onBack, onUpdateUser }) {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    full_name: "",
    current_password: "",
    new_password: "",
    confirm_password: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (token) {
      loadUserData();
    } else {
      setError("Authentication required. Please log in again.");
    }
  }, [token]);

  // Scroll reveal animation
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
        }
      },
      { threshold: 0.05, rootMargin: "200px 0px 0px 0px" }
    );
    if (containerRef.current) {
      observer.observe(containerRef.current);
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.top < window.innerHeight + 200 && rect.bottom > -200) {
        setVisible(true);
      }
    }
    return () => observer.disconnect();
  }, []);

  // Mouse tracking for magnetic buttons
  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const loadUserData = async () => {
    if (!token) {
      setError("Authentication required. Please log in again.");
      return;
    }

    try {
      const res = await axios.get(`${API_URL}/api/account/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.data && res.data.user) {
        const userData = res.data.user;
        setFormData({
          username: userData.username || "",
          email: userData.email || "",
          full_name: userData.full_name || "",
          current_password: "",
          new_password: "",
          confirm_password: ""
        });
        setError(""); // Clear any previous errors
      } else {
        setError("Invalid response from server");
      }
    } catch (err) {
      console.error("Error loading user data:", err);
      const errorMessage = err.response?.data?.error || err.message || "Failed to load profile data";
      setError(errorMessage);
      
      // If unauthorized, suggest re-login
      if (err.response?.status === 401) {
        setError("Session expired. Please log in again.");
      }
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError("");
    setSuccess("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    // Validate password if changing
    if (formData.new_password) {
      if (!formData.current_password) {
        setError("Current password is required to change password");
        setLoading(false);
        return;
      }
      if (formData.new_password.length < 8) {
        setError("New password must be at least 8 characters");
        setLoading(false);
        return;
      }
      if (formData.new_password !== formData.confirm_password) {
        setError("New passwords do not match");
        setLoading(false);
        return;
      }
    }

    try {
      const updateData = {
        email: formData.email,
        full_name: formData.full_name
      };

      if (formData.new_password) {
        updateData.password = formData.new_password;
        updateData.current_password = formData.current_password;
      }

      await axios.put(`${API_URL}/api/account/`, updateData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setSuccess("Profile updated successfully!");
      
      // Update user in parent component
      if (onUpdateUser) {
        const updatedUser = { ...user, email: formData.email, full_name: formData.full_name };
        onUpdateUser(updatedUser);
      }

      // Clear password fields
      setFormData({
        ...formData,
        current_password: "",
        new_password: "",
        confirm_password: ""
      });
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
      <div style={{
        width: "100%",
        position: "relative",
        zIndex: 1,
        flex: "1 0 auto",
        background: "transparent"
      }}>
        <div 
          ref={containerRef}
          style={{
            maxWidth: "1440px",
            width: "100%",
            margin: "0 auto",
            padding: "clamp(32px, 6vw, 64px) clamp(24px, 4vw, 48px)",
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(30px)",
            transition: "opacity 0.4s ease-out, transform 0.4s ease-out"
          }}
        >
          {/* Header */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "clamp(40px, 6vw, 56px)",
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(20px)",
            transition: "opacity 0.4s ease-out 0.1s, transform 0.4s ease-out 0.1s"
          }}>
            <div>
              <h1 style={{
                fontSize: "clamp(36px, 6vw, 48px)",
                fontWeight: "900",
                background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                marginBottom: "clamp(8px, 1.5vw, 12px)",
                letterSpacing: "-0.04em",
                lineHeight: "1.1"
              }}>
                Edit Profile
              </h1>
              <p style={{
                fontSize: "clamp(15px, 2.5vw, 18px)",
                color: "#64748b",
                fontWeight: "400"
              }}>
                Update your account information and preferences
              </p>
            </div>
            {onBack && (
              <button
                onClick={onBack}
                style={{
                  padding: "clamp(10px, 2vw, 12px) clamp(20px, 3vw, 24px)",
                  background: "rgba(255, 255, 255, 0.7)",
                  backdropFilter: "blur(20px)",
                  WebkitBackdropFilter: "blur(20px)",
                  color: "#64748b",
                  border: "1px solid rgba(226, 232, 240, 0.5)",
                  borderRadius: "12px",
                  cursor: "pointer",
                  fontSize: "clamp(14px, 2vw, 15px)",
                  fontWeight: "600",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.04)"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.9)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 8px 24px rgba(0, 0, 0, 0.08)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.7)";
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.04)";
                }}
              >
                Back
              </button>
            )}
          </div>

          {/* Main Form Card - Glassmorphism */}
          <div style={{
            background: "rgba(255, 255, 255, 0.7)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderRadius: "32px",
            padding: "clamp(40px, 6vw, 64px) clamp(32px, 5vw, 56px)",
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(255, 255, 255, 0.5) inset, 0 8px 32px rgba(0, 0, 0, 0.04)",
            border: "1px solid rgba(255, 255, 255, 0.3)",
            maxWidth: "800px",
            margin: "0 auto",
            opacity: visible ? 1 : 0,
            transform: visible ? "scale(1)" : "scale(0.95)",
            transition: "opacity 0.4s ease-out 0.2s, transform 0.4s ease-out 0.2s"
          }}>
            {error && (
              <div style={{
                background: "linear-gradient(135deg, rgba(220, 38, 38, 0.1) 0%, rgba(239, 68, 68, 0.1) 100%)",
                border: "1px solid rgba(220, 38, 38, 0.3)",
                borderRadius: "16px",
                padding: "clamp(16px, 3vw, 20px)",
                marginBottom: "clamp(24px, 4vw, 32px)",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                animation: "fadeInUp 0.4s ease-out"
              }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#dc2626", flexShrink: 0 }}>
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <p style={{ color: "#dc2626", margin: 0, fontSize: "clamp(14px, 2vw, 15px)", fontWeight: "500" }}>
                  {error}
                </p>
              </div>
            )}

            {success && (
              <div style={{
                background: "linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%)",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                borderRadius: "16px",
                padding: "clamp(16px, 3vw, 20px)",
                marginBottom: "clamp(24px, 4vw, 32px)",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                animation: "fadeInUp 0.4s ease-out"
              }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#10b981", flexShrink: 0 }}>
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <p style={{ color: "#059669", margin: 0, fontSize: "clamp(14px, 2vw, 15px)", fontWeight: "500" }}>
                  {success}
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* User Information Section */}
              <div style={{
                marginBottom: "clamp(40px, 6vw, 48px)",
                opacity: visible ? 1 : 0,
                transform: visible ? "translateY(0)" : "translateY(20px)",
                transition: "opacity 0.4s ease-out 0.3s, transform 0.4s ease-out 0.3s"
              }}>
                <h2 style={{
                  fontSize: "clamp(22px, 3.5vw, 28px)",
                  fontWeight: "700",
                  color: "#1e293b",
                  marginBottom: "clamp(24px, 4vw, 32px)",
                  letterSpacing: "-0.01em"
                }}>
                  User Information
                </h2>

                <div style={{ display: "grid", gap: "clamp(24px, 4vw, 32px)" }}>
                  {/* Username */}
                  <div>
                    <label style={{
                      display: "block",
                      fontSize: "clamp(15px, 2vw, 16px)",
                      fontWeight: "600",
                      color: "#1e293b",
                      marginBottom: "clamp(10px, 1.5vw, 12px)",
                      letterSpacing: "-0.01em"
                    }}>
                      Username
                    </label>
                    <input
                      type="text"
                      value={formData.username}
                      disabled
                      style={{
                        width: "100%",
                        padding: "clamp(14px, 2.5vw, 18px)",
                        border: "2px solid #e2e8f0",
                        borderRadius: "16px",
                        fontSize: "clamp(15px, 2vw, 16px)",
                        background: "rgba(248, 250, 252, 0.8)",
                        backdropFilter: "blur(10px)",
                        WebkitBackdropFilter: "blur(10px)",
                        color: "#64748b",
                        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
                      }}
                    />
                    <p style={{
                      fontSize: "clamp(13px, 2vw, 14px)",
                      color: "#94a3b8",
                      marginTop: "clamp(8px, 1.5vw, 10px)",
                      margin: 0
                    }}>
                      Username cannot be changed
                    </p>
                  </div>

                  {/* Full Name */}
                  <div>
                    <label style={{
                      display: "block",
                      fontSize: "clamp(15px, 2vw, 16px)",
                      fontWeight: "600",
                      color: "#1e293b",
                      marginBottom: "clamp(10px, 1.5vw, 12px)",
                      letterSpacing: "-0.01em"
                    }}>
                      Full Name
                    </label>
                    <input
                      type="text"
                      name="full_name"
                      value={formData.full_name}
                      onChange={handleChange}
                      style={{
                        width: "100%",
                        padding: "clamp(14px, 2.5vw, 18px)",
                        border: "2px solid #e2e8f0",
                        borderRadius: "16px",
                        fontSize: "clamp(15px, 2vw, 16px)",
                        background: "rgba(255, 255, 255, 0.8)",
                        backdropFilter: "blur(10px)",
                        WebkitBackdropFilter: "blur(10px)",
                        color: "#1e293b",
                        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = "#6366f1";
                        e.currentTarget.style.background = "rgba(255, 255, 255, 0.95)";
                        e.currentTarget.style.boxShadow = "0 0 0 4px rgba(99, 102, 241, 0.1), 0 8px 24px rgba(0, 0, 0, 0.08)";
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = "#e2e8f0";
                        e.currentTarget.style.background = "rgba(255, 255, 255, 0.8)";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label style={{
                      display: "block",
                      fontSize: "clamp(15px, 2vw, 16px)",
                      fontWeight: "600",
                      color: "#1e293b",
                      marginBottom: "clamp(10px, 1.5vw, 12px)",
                      letterSpacing: "-0.01em"
                    }}>
                      Email <span style={{ color: "#dc2626" }}>*</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      style={{
                        width: "100%",
                        padding: "clamp(14px, 2.5vw, 18px)",
                        border: "2px solid #e2e8f0",
                        borderRadius: "16px",
                        fontSize: "clamp(15px, 2vw, 16px)",
                        background: "rgba(255, 255, 255, 0.8)",
                        backdropFilter: "blur(10px)",
                        WebkitBackdropFilter: "blur(10px)",
                        color: "#1e293b",
                        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = "#6366f1";
                        e.currentTarget.style.background = "rgba(255, 255, 255, 0.95)";
                        e.currentTarget.style.boxShadow = "0 0 0 4px rgba(99, 102, 241, 0.1), 0 8px 24px rgba(0, 0, 0, 0.08)";
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = "#e2e8f0";
                        e.currentTarget.style.background = "rgba(255, 255, 255, 0.8)";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Change Password Section */}
              <div style={{
                marginTop: "clamp(40px, 6vw, 48px)",
                paddingTop: "clamp(32px, 5vw, 40px)",
                borderTop: "1px solid rgba(226, 232, 240, 0.5)",
                opacity: visible ? 1 : 0,
                transform: visible ? "translateY(0)" : "translateY(20px)",
                transition: "opacity 0.4s ease-out 0.4s, transform 0.4s ease-out 0.4s"
              }}>
                <h3 style={{
                  fontSize: "clamp(22px, 3.5vw, 28px)",
                  fontWeight: "700",
                  color: "#1e293b",
                  marginBottom: "clamp(12px, 2vw, 16px)",
                  letterSpacing: "-0.01em"
                }}>
                  Change Password
                </h3>
                <p style={{
                  fontSize: "clamp(14px, 2vw, 15px)",
                  color: "#64748b",
                  marginBottom: "clamp(24px, 4vw, 32px)",
                  fontWeight: "400"
                }}>
                  Leave blank if you don't want to change your password
                </p>

                <div style={{ display: "grid", gap: "clamp(24px, 4vw, 32px)" }}>
                  {/* Current Password */}
                  <div>
                    <label style={{
                      display: "block",
                      fontSize: "clamp(15px, 2vw, 16px)",
                      fontWeight: "600",
                      color: "#1e293b",
                      marginBottom: "clamp(10px, 1.5vw, 12px)",
                      letterSpacing: "-0.01em"
                    }}>
                      Current Password
                    </label>
                    <input
                      type="password"
                      name="current_password"
                      value={formData.current_password}
                      onChange={handleChange}
                      style={{
                        width: "100%",
                        padding: "clamp(14px, 2.5vw, 18px)",
                        border: "2px solid #e2e8f0",
                        borderRadius: "16px",
                        fontSize: "clamp(15px, 2vw, 16px)",
                        background: "rgba(255, 255, 255, 0.8)",
                        backdropFilter: "blur(10px)",
                        WebkitBackdropFilter: "blur(10px)",
                        color: "#1e293b",
                        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = "#6366f1";
                        e.currentTarget.style.background = "rgba(255, 255, 255, 0.95)";
                        e.currentTarget.style.boxShadow = "0 0 0 4px rgba(99, 102, 241, 0.1), 0 8px 24px rgba(0, 0, 0, 0.08)";
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = "#e2e8f0";
                        e.currentTarget.style.background = "rgba(255, 255, 255, 0.8)";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    />
                  </div>

                  {/* New Password */}
                  <div>
                    <label style={{
                      display: "block",
                      fontSize: "clamp(15px, 2vw, 16px)",
                      fontWeight: "600",
                      color: "#1e293b",
                      marginBottom: "clamp(10px, 1.5vw, 12px)",
                      letterSpacing: "-0.01em"
                    }}>
                      New Password
                    </label>
                    <input
                      type="password"
                      name="new_password"
                      value={formData.new_password}
                      onChange={handleChange}
                      style={{
                        width: "100%",
                        padding: "clamp(14px, 2.5vw, 18px)",
                        border: "2px solid #e2e8f0",
                        borderRadius: "16px",
                        fontSize: "clamp(15px, 2vw, 16px)",
                        background: "rgba(255, 255, 255, 0.8)",
                        backdropFilter: "blur(10px)",
                        WebkitBackdropFilter: "blur(10px)",
                        color: "#1e293b",
                        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = "#6366f1";
                        e.currentTarget.style.background = "rgba(255, 255, 255, 0.95)";
                        e.currentTarget.style.boxShadow = "0 0 0 4px rgba(99, 102, 241, 0.1), 0 8px 24px rgba(0, 0, 0, 0.08)";
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = "#e2e8f0";
                        e.currentTarget.style.background = "rgba(255, 255, 255, 0.8)";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    />
                  </div>

                  {/* Confirm New Password */}
                  <div>
                    <label style={{
                      display: "block",
                      fontSize: "clamp(15px, 2vw, 16px)",
                      fontWeight: "600",
                      color: "#1e293b",
                      marginBottom: "clamp(10px, 1.5vw, 12px)",
                      letterSpacing: "-0.01em"
                    }}>
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      name="confirm_password"
                      value={formData.confirm_password}
                      onChange={handleChange}
                      style={{
                        width: "100%",
                        padding: "clamp(14px, 2.5vw, 18px)",
                        border: "2px solid #e2e8f0",
                        borderRadius: "16px",
                        fontSize: "clamp(15px, 2vw, 16px)",
                        background: "rgba(255, 255, 255, 0.8)",
                        backdropFilter: "blur(10px)",
                        WebkitBackdropFilter: "blur(10px)",
                        color: "#1e293b",
                        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = "#6366f1";
                        e.currentTarget.style.background = "rgba(255, 255, 255, 0.95)";
                        e.currentTarget.style.boxShadow = "0 0 0 4px rgba(99, 102, 241, 0.1), 0 8px 24px rgba(0, 0, 0, 0.08)";
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = "#e2e8f0";
                        e.currentTarget.style.background = "rgba(255, 255, 255, 0.8)";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button - Magnetic */}
              <MagneticButton
                type="submit"
                disabled={loading}
                mousePosition={mousePosition}
                style={{
                  width: "100%",
                  padding: "clamp(16px, 2.5vw, 20px)",
                  background: loading
                    ? "linear-gradient(135deg, #cbd5e1 0%, #94a3b8 100%)"
                    : "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                  color: "white",
                  border: "none",
                  borderRadius: "16px",
                  cursor: loading ? "not-allowed" : "pointer",
                  fontSize: "clamp(16px, 2.5vw, 18px)",
                  fontWeight: "700",
                  transition: "all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
                  boxShadow: loading
                    ? "none"
                    : "0 8px 24px rgba(99, 102, 241, 0.4), 0 4px 12px rgba(99, 102, 241, 0.2)",
                  marginTop: "clamp(32px, 5vw, 40px)",
                  letterSpacing: "-0.01em",
                  opacity: visible ? 1 : 0,
                  transform: visible ? "translateY(0)" : "translateY(20px)",
                  animation: visible ? "fadeInUp 0.4s ease-out 0.5s both" : "none"
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.currentTarget.style.boxShadow = "0 12px 32px rgba(99, 102, 241, 0.5), 0 8px 16px rgba(99, 102, 241, 0.3)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading) {
                    e.currentTarget.style.boxShadow = "0 8px 24px rgba(99, 102, 241, 0.4), 0 4px 12px rgba(99, 102, 241, 0.2)";
                  }
                }}
              >
                {loading ? "Saving..." : "Save Changes"}
              </MagneticButton>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}

// Magnetic Button Component
function MagneticButton({ children, onClick, mousePosition, style, type, disabled, onMouseEnter, onMouseLeave }) {
  const buttonRef = useRef(null);
  const [transform, setTransform] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!buttonRef.current || disabled) return;
    
    const rect = buttonRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const distanceX = mousePosition.x - centerX;
    const distanceY = mousePosition.y - centerY;
    const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
    
    if (distance < 150) {
      const force = (150 - distance) / 150;
      setTransform({
        x: distanceX * force * 0.1,
        y: distanceY * force * 0.1
      });
    } else {
      setTransform({ x: 0, y: 0 });
    }
  }, [mousePosition, disabled]);

  return (
    <button
      ref={buttonRef}
      type={type || "button"}
      onClick={onClick}
      disabled={disabled}
      style={{
        ...style,
        transform: `translate(${transform.x}px, ${transform.y}px) ${style?.transform || ""}`,
        transition: "transform 0.2s ease-out"
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {children}
    </button>
  );
}
