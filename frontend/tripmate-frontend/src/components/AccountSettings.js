import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import API_URL from "../config";

export default function AccountSettings({ token, user, onBack, onLogout }) {
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notificationsEnabled, setNotificationsEnabled] = useState(user?.notifications_enabled !== false);
  const [updatingNotifications, setUpdatingNotifications] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (user?.notifications_enabled !== undefined) {
      setNotificationsEnabled(user.notifications_enabled !== false);
    }
  }, [user]);

  // Scroll reveal animation
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
        }
      },
      { threshold: 0.1 }
    );
    if (containerRef.current) {
      observer.observe(containerRef.current);
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

  const handleNotificationsToggle = async () => {
    const newValue = !notificationsEnabled;
    setUpdatingNotifications(true);
    
    try {
      await axios.put(
        `${API_URL}/api/account/`,
        { notifications_enabled: newValue },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setNotificationsEnabled(newValue);
    } catch (err) {
      console.error("Error updating notifications:", err);
      alert(err.response?.data?.error || "Failed to update notification settings");
    } finally {
      setUpdatingNotifications(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation.toLowerCase() !== "delete") {
      setError("Please type 'delete' to confirm");
      return;
    }

    if (!window.confirm("Are you absolutely sure? This action cannot be undone. All your trips, photos, and data will be permanently deleted.")) {
      return;
    }

    setLoading(true);
    setError("");
    
    try {
      await axios.delete(`${API_URL}/api/account/`, {
        data: { confirmation: deleteConfirmation },
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert("Account deleted successfully");
      if (onLogout) {
        onLogout();
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to delete account");
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
      setDeleteConfirmation("");
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
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .toggle-switch {
          position: relative;
          width: 56px;
          height: 32px;
          background: #cbd5e1;
          border-radius: 16px;
          cursor: pointer;
          transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .toggle-switch.active {
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
        }
        .toggle-switch::after {
          content: '';
          position: absolute;
          top: 4px;
          left: 4px;
          width: 24px;
          height: 24px;
          background: white;
          border-radius: 50%;
          transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        }
        .toggle-switch.active::after {
          transform: translateX(24px);
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
            transition: "opacity 0.8s cubic-bezier(0.34, 1.56, 0.64, 1), transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)"
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
            transition: "opacity 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s, transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s"
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
                Account Settings
              </h1>
              <p style={{
                fontSize: "clamp(15px, 2.5vw, 18px)",
                color: "#64748b",
                fontWeight: "400"
              }}>
                Manage your account preferences and privacy
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

          {/* Bento Grid Layout */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "clamp(24px, 4vw, 32px)",
            marginBottom: "clamp(32px, 5vw, 40px)"
          }}>
            {/* Privacy Card */}
            <div style={{
              background: "rgba(255, 255, 255, 0.7)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              borderRadius: "24px",
              padding: "clamp(28px, 4vw, 36px)",
              boxShadow: "0 20px 60px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(255, 255, 255, 0.5) inset, 0 8px 32px rgba(0, 0, 0, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.3)",
              opacity: visible ? 1 : 0,
              transform: visible ? "translateY(0)" : "translateY(20px)",
              transition: "opacity 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s, transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s",
              animation: visible ? "fadeInUp 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s both" : "none"
            }}>
              <div style={{
                width: "48px",
                height: "48px",
                background: "linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)",
                borderRadius: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "clamp(20px, 3vw, 24px)"
              }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#6366f1" }}>
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </div>
              <h2 style={{
                fontSize: "clamp(20px, 3vw, 24px)",
                fontWeight: "700",
                color: "#1e293b",
                marginBottom: "clamp(12px, 2vw, 16px)",
                letterSpacing: "-0.01em"
              }}>
                Privacy
              </h2>
              <p style={{
                color: "#64748b",
                fontSize: "clamp(14px, 2vw, 15px)",
                lineHeight: "1.6",
                margin: 0
              }}>
                Your account information is kept private and secure. We never share your personal data with third parties.
              </p>
            </div>

            {/* Notifications Card */}
            <div style={{
              background: "rgba(255, 255, 255, 0.7)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              borderRadius: "24px",
              padding: "clamp(28px, 4vw, 36px)",
              boxShadow: "0 20px 60px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(255, 255, 255, 0.5) inset, 0 8px 32px rgba(0, 0, 0, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.3)",
              opacity: visible ? 1 : 0,
              transform: visible ? "translateY(0)" : "translateY(20px)",
              transition: "opacity 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s, transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s",
              animation: visible ? "fadeInUp 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s both" : "none"
            }}>
              <div style={{
                width: "48px",
                height: "48px",
                background: "linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)",
                borderRadius: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "clamp(20px, 3vw, 24px)"
              }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#6366f1" }}>
                  <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
              </div>
              <h2 style={{
                fontSize: "clamp(20px, 3vw, 24px)",
                fontWeight: "700",
                color: "#1e293b",
                marginBottom: "clamp(20px, 3vw, 24px)",
                letterSpacing: "-0.01em"
              }}>
                Notifications
              </h2>
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "clamp(16px, 2.5vw, 20px)",
                background: "rgba(248, 250, 252, 0.5)",
                borderRadius: "16px",
                border: "1px solid rgba(226, 232, 240, 0.5)"
              }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", flex: 1 }}>
                  <span style={{ 
                    color: "#475569", 
                    fontSize: "clamp(15px, 2vw, 16px)", 
                    fontWeight: "600" 
                  }}>
                    In-app Notifications
                  </span>
                  <span style={{ 
                    color: "#94a3b8", 
                    fontSize: "clamp(13px, 2vw, 14px)",
                    lineHeight: "1.4"
                  }}>
                    Receive notifications about your trips and updates
                  </span>
                </div>
                <div
                  className={`toggle-switch ${notificationsEnabled ? "active" : ""}`}
                  onClick={!updatingNotifications ? handleNotificationsToggle : undefined}
                  style={{
                    cursor: updatingNotifications ? "not-allowed" : "pointer",
                    opacity: updatingNotifications ? 0.6 : 1,
                    marginLeft: "clamp(16px, 3vw, 24px)",
                    flexShrink: 0
                  }}
                />
              </div>
            </div>
          </div>

          {/* Danger Zone - Full Width */}
          <div style={{
            background: "linear-gradient(135deg, rgba(220, 38, 38, 0.05) 0%, rgba(239, 68, 68, 0.05) 100%)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderRadius: "24px",
            padding: "clamp(32px, 5vw, 40px)",
            border: "1px solid rgba(220, 38, 38, 0.2)",
            boxShadow: "0 20px 60px rgba(220, 38, 38, 0.08), 0 0 0 1px rgba(220, 38, 38, 0.1) inset",
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(20px)",
            transition: "opacity 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.5s, transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.5s",
            animation: visible ? "fadeInUp 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.5s both" : "none"
          }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "clamp(12px, 2vw, 16px)",
              marginBottom: "clamp(16px, 2.5vw, 20px)"
            }}>
              <div style={{
                width: "48px",
                height: "48px",
                background: "rgba(220, 38, 38, 0.1)",
                borderRadius: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0
              }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#dc2626" }}>
                  <path d="M3 6h18"/>
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                </svg>
              </div>
              <div>
                <h2 style={{
                  fontSize: "clamp(22px, 3.5vw, 28px)",
                  fontWeight: "700",
                  color: "#dc2626",
                  marginBottom: "clamp(8px, 1.5vw, 12px)",
                  letterSpacing: "-0.01em"
                }}>
                  Danger Zone
                </h2>
                <p style={{
                  color: "#991b1b",
                  fontSize: "clamp(14px, 2vw, 15px)",
                  margin: 0,
                  lineHeight: "1.5"
                }}>
                  Once you delete your account, there is no going back. Please be certain.
                </p>
              </div>
            </div>

            {!showDeleteConfirm ? (
              <MagneticButton
                onClick={() => setShowDeleteConfirm(true)}
                mousePosition={mousePosition}
                style={{
                  padding: "clamp(14px, 2.5vw, 18px) clamp(24px, 4vw, 32px)",
                  background: "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)",
                  color: "white",
                  border: "none",
                  borderRadius: "12px",
                  cursor: "pointer",
                  fontSize: "clamp(15px, 2vw, 16px)",
                  fontWeight: "700",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  boxShadow: "0 8px 24px rgba(220, 38, 38, 0.3)"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "linear-gradient(135deg, #b91c1c 0%, #991b1b 100%)";
                  e.currentTarget.style.boxShadow = "0 12px 32px rgba(220, 38, 38, 0.4)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)";
                  e.currentTarget.style.boxShadow = "0 8px 24px rgba(220, 38, 38, 0.3)";
                }}
              >
                Delete Account
              </MagneticButton>
            ) : (
              <div style={{
                background: "rgba(255, 255, 255, 0.5)",
                borderRadius: "16px",
                padding: "clamp(20px, 3vw, 24px)",
                border: "1px solid rgba(220, 38, 38, 0.2)"
              }}>
                {error && (
                  <div style={{
                    background: "rgba(220, 38, 38, 0.1)",
                    border: "1px solid rgba(220, 38, 38, 0.3)",
                    borderRadius: "12px",
                    padding: "clamp(12px, 2vw, 16px)",
                    marginBottom: "clamp(16px, 2.5vw, 20px)",
                    color: "#dc2626",
                    fontSize: "clamp(14px, 2vw, 15px)",
                    fontWeight: "500"
                  }}>
                    {error}
                  </div>
                )}
                <p style={{
                  color: "#991b1b",
                  fontSize: "clamp(14px, 2vw, 15px)",
                  marginBottom: "clamp(12px, 2vw, 16px)",
                  fontWeight: "600"
                }}>
                  Type <strong>"delete"</strong> to confirm:
                </p>
                <input
                  type="text"
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  placeholder="Type 'delete'"
                  style={{
                    width: "100%",
                    padding: "clamp(14px, 2.5vw, 18px)",
                    border: "2px solid rgba(220, 38, 38, 0.3)",
                    borderRadius: "12px",
                    fontSize: "clamp(15px, 2vw, 16px)",
                    marginBottom: "clamp(16px, 2.5vw, 20px)",
                    background: "rgba(255, 255, 255, 0.8)",
                    backdropFilter: "blur(10px)",
                    WebkitBackdropFilter: "blur(10px)",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "#dc2626";
                    e.currentTarget.style.boxShadow = "0 0 0 4px rgba(220, 38, 38, 0.1)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "rgba(220, 38, 38, 0.3)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
                <div style={{ display: "flex", gap: "clamp(12px, 2vw, 16px)", flexWrap: "wrap" }}>
                  <MagneticButton
                    onClick={handleDeleteAccount}
                    disabled={loading}
                    mousePosition={mousePosition}
                    style={{
                      padding: "clamp(14px, 2.5vw, 18px) clamp(24px, 4vw, 32px)",
                      background: loading 
                        ? "linear-gradient(135deg, #cbd5e1 0%, #94a3b8 100%)"
                        : "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)",
                      color: "white",
                      border: "none",
                      borderRadius: "12px",
                      cursor: loading ? "not-allowed" : "pointer",
                      fontSize: "clamp(15px, 2vw, 16px)",
                      fontWeight: "700",
                      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                      boxShadow: loading ? "none" : "0 8px 24px rgba(220, 38, 38, 0.3)"
                    }}
                  >
                    {loading ? "Deleting..." : "Confirm Delete"}
                  </MagneticButton>
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeleteConfirmation("");
                      setError("");
                    }}
                    style={{
                      padding: "clamp(14px, 2.5vw, 18px) clamp(24px, 4vw, 32px)",
                      background: "rgba(255, 255, 255, 0.7)",
                      backdropFilter: "blur(10px)",
                      WebkitBackdropFilter: "blur(10px)",
                      color: "#64748b",
                      border: "1px solid rgba(226, 232, 240, 0.5)",
                      borderRadius: "12px",
                      cursor: "pointer",
                      fontSize: "clamp(15px, 2vw, 16px)",
                      fontWeight: "600",
                      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(255, 255, 255, 0.9)";
                      e.currentTarget.style.transform = "translateY(-2px)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "rgba(255, 255, 255, 0.7)";
                      e.currentTarget.style.transform = "translateY(0)";
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// Magnetic Button Component
function MagneticButton({ children, onClick, mousePosition, style, disabled, onMouseEnter, onMouseLeave }) {
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
