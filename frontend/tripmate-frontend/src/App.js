import React, { useState, useEffect, useRef } from "react";
import HomePage from "./components/HomePage";
import Login from "./components/Login";
import Register from "./components/Register";
import TripList from "./components/TripList";
import TripPlanner from "./components/TripPlanner";
import DashboardHome from "./components/DashboardHome";
import ReviewPage from "./components/ReviewPage";
import EditProfile from "./components/EditProfile";
import Subscription from "./components/Subscription";
import AccountSettings from "./components/AccountSettings";
import HelpSupport from "./components/HelpSupport";
import AdminPanel from "./components/AdminPanel";
import MemoriesPage from "./components/MemoriesPage";
import NotificationPanel from "./components/NotificationPanel";
import Footer from "./components/Footer";
import tripmateLogo from "./assets/logo/tripmate_logo.png";
import axios from "axios";
import API_URL from "./config";

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [currentView, setCurrentView] = useState("home"); // "home", "login", "register", "list", "planner", "reviews", "edit-profile", "subscription", "account-settings", "help", "admin"
  const [hoveredNav, setHoveredNav] = useState(null);
  const [selectedTripId, setSelectedTripId] = useState(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [profileMenuPosition, setProfileMenuPosition] = useState({ top: 0, right: 0 });
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const profileMenuRef = useRef(null);
  const profileButtonRef = useRef(null);

  // Track window size for responsive behavior
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    // Check for existing session
    const savedToken = localStorage.getItem("token");
    const savedUser = localStorage.getItem("user");

    if (savedToken && savedUser) {
      // Verify token is still valid
      axios.post(`${API_URL}/api/auth/verify`, {}, {
        headers: { Authorization: `Bearer ${savedToken}` }
      })
      .then((res) => {
        setUser(res.data.user);
        setToken(savedToken);
        // Redirect admins to admin panel, others to home
        setCurrentView(res.data.user.is_admin ? "admin" : "home");
      })
      .catch(() => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setCurrentView("home");
      });
    }
  }, []);

  const handleLogin = (userData, userToken) => {
    setUser(userData);
    setToken(userToken);
    // Redirect admins to admin panel, others to home
    setCurrentView(userData.is_admin ? "admin" : "home");
  };

  const handleRegister = (userData, userToken) => {
    setUser(userData);
    setToken(userToken);
    // Redirect admins to admin panel, others to home
    setCurrentView(userData.is_admin ? "admin" : "home");
  };

  const handleGetStarted = () => {
    setCurrentView("register");
  };

  const handleShowLogin = () => {
    setCurrentView("login");
  };


  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setToken(null);
    setCurrentView("home");
    setSelectedTripId(null);
  };

  const handleCreateNew = (tripId = null) => {
    setSelectedTripId(tripId);
    setCurrentView("planner");
  };

  const handleBackToList = () => {
    setCurrentView("list");
    setSelectedTripId(null);
  };

  const handleBackToHome = () => {
    // Admins go to admin panel, others go to home
    setCurrentView(user?.is_admin ? "admin" : "home");
    setSelectedTripId(null);
  };

  // Close profile menu when clicking outside and update position
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target) &&
          profileButtonRef.current && !profileButtonRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    };

    const updateMenuPosition = () => {
      if (profileButtonRef.current) {
        const rect = profileButtonRef.current.getBoundingClientRect();
        setProfileMenuPosition({
          top: rect.bottom + 8,
          right: window.innerWidth - rect.right
        });
      }
    };

    if (showProfileMenu) {
      updateMenuPosition();
      document.addEventListener("mousedown", handleClickOutside);
      window.addEventListener("resize", updateMenuPosition);
      window.addEventListener("scroll", updateMenuPosition, true);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [showProfileMenu]);

  // Show home page, login, or register if not authenticated
  if (!user || !token) {
    if (currentView === "login") {
      return (
        <div className="App" style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column"
        }}>
          <div style={{ flex: "1 0 auto" }}>
            <Login
              onLogin={handleLogin}
              onSwitchToRegister={() => setCurrentView("register")}
              onBack={() => setCurrentView("home")}
            />
          </div>
          <div style={{ flexShrink: 0, marginTop: "clamp(48px, 8vw, 96px)" }}>
            <Footer />
          </div>
        </div>
      );
    }
    
    if (currentView === "register") {
      return (
        <div className="App" style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column"
        }}>
          <div style={{ flex: "1 0 auto" }}>
            <Register
              onRegister={handleRegister}
              onSwitchToLogin={() => setCurrentView("login")}
              onBack={() => setCurrentView("home")}
            />
          </div>
          <div style={{ flexShrink: 0, marginTop: "clamp(48px, 8vw, 96px)" }}>
            <Footer />
          </div>
        </div>
      );
    }

    return (
      <div className="App">
        <HomePage
          onGetStarted={handleGetStarted}
          onLogin={handleShowLogin}
        />
      </div>
    );
  }

  // Show main app if authenticated
  return (
    <div className="App" style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column"
    }}>
      <nav style={{
        background: "rgba(255, 255, 255, 0.9)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        padding: isMobile ? "10px 12px" : "clamp(12px, 2vw, 16px) clamp(16px, 3vw, 24px)",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.5) inset",
        marginBottom: "clamp(16px, 3vw, 24px)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: isMobile ? "nowrap" : "wrap",
        gap: isMobile ? "8px" : "16px",
        position: "sticky",
        top: 0,
        border: "1px solid rgba(255, 255, 255, 0.3)",
        borderRadius: "16px",
        margin: "clamp(16px, 3vw, 24px) clamp(16px, 3vw, 24px) clamp(16px, 3vw, 24px) clamp(16px, 3vw, 24px)",
        zIndex: 10000
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: isMobile ? "nowrap" : "wrap", flex: "1", minWidth: isMobile ? "0" : "200px" }}>
          <img 
            src={tripmateLogo} 
            alt="TripMate Logo" 
            onClick={() => { setCurrentView("home"); setSelectedTripId(null); }}
            style={{
              height: isMobile ? "32px" : "40px",
              width: "auto",
              objectFit: "contain",
              cursor: "pointer",
              transition: "all 0.3s ease",
              flexShrink: 0
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "scale(1.05)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
            }}
          />
          {/* Desktop Navigation */}
          <div className="desktop-nav" style={{ 
            display: "flex", 
            gap: "clamp(16px, 3vw, 32px)", 
            alignItems: "center", 
            flexWrap: "wrap" 
          }}>
            {!user.is_admin && (
              <>
                <button
                  onClick={() => { setCurrentView("home"); setSelectedTripId(null); }}
                  onMouseEnter={() => setHoveredNav("home")}
                  onMouseLeave={() => setHoveredNav(null)}
                  style={{
                    padding: "8px 12px",
                    background: hoveredNav === "home" || currentView === "home" ? "rgba(102, 126, 234, 0.1)" : "transparent",
                    color: currentView === "home" ? "#1e293b" : "#64748b",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "13px",
                    fontWeight: currentView === "home" ? "600" : "500",
                    position: "relative",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    borderRadius: "8px",
                    transform: hoveredNav === "home" ? "translateY(-2px)" : "translateY(0)",
                    boxShadow: hoveredNav === "home" ? "0 4px 12px rgba(102, 126, 234, 0.15)" : "none"
                  }}
                >
                  Home
                  <div style={{
                    position: "absolute",
                    bottom: "4px",
                    left: "12px",
                    right: "12px",
                    height: "2px",
                    background: "linear-gradient(90deg, #667eea 0%, #764ba2 100%)",
                    width: hoveredNav === "home" || currentView === "home" ? "calc(100% - 24px)" : "0%",
                    transition: "width 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                    borderRadius: "2px",
                    opacity: hoveredNav === "home" || currentView === "home" ? "1" : "0"
                  }} />
                </button>
                <button
                  onClick={() => { setCurrentView("list"); setSelectedTripId(null); }}
                  onMouseEnter={() => setHoveredNav("list")}
                  onMouseLeave={() => setHoveredNav(null)}
                  style={{
                    padding: "8px 12px",
                    background: hoveredNav === "list" || currentView === "list" ? "rgba(102, 126, 234, 0.1)" : "transparent",
                    color: currentView === "list" ? "#1e293b" : "#64748b",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "13px",
                    fontWeight: currentView === "list" ? "600" : "500",
                    position: "relative",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    borderRadius: "8px",
                    transform: hoveredNav === "list" ? "translateY(-2px)" : "translateY(0)",
                    boxShadow: hoveredNav === "list" ? "0 4px 12px rgba(102, 126, 234, 0.15)" : "none"
                  }}
                >
                  My Trips
                  <div style={{
                    position: "absolute",
                    bottom: "4px",
                    left: "12px",
                    right: "12px",
                    height: "2px",
                    background: "linear-gradient(90deg, #667eea 0%, #764ba2 100%)",
                    width: hoveredNav === "list" || currentView === "list" ? "calc(100% - 24px)" : "0%",
                    transition: "width 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                    borderRadius: "2px",
                    opacity: hoveredNav === "list" || currentView === "list" ? "1" : "0"
                  }} />
                </button>
                <button
                  onClick={() => { setCurrentView("reviews"); setSelectedTripId(null); }}
                  onMouseEnter={() => setHoveredNav("reviews")}
                  onMouseLeave={() => setHoveredNav(null)}
                  style={{
                    padding: "8px 12px",
                    background: hoveredNav === "reviews" || currentView === "reviews" ? "rgba(102, 126, 234, 0.1)" : "transparent",
                    color: currentView === "reviews" ? "#1e293b" : "#64748b",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "13px",
                    fontWeight: currentView === "reviews" ? "600" : "500",
                    position: "relative",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    borderRadius: "8px",
                    transform: hoveredNav === "reviews" ? "translateY(-2px)" : "translateY(0)",
                    boxShadow: hoveredNav === "reviews" ? "0 4px 12px rgba(102, 126, 234, 0.15)" : "none"
                  }}
                >
                  Review
                  <div style={{
                    position: "absolute",
                    bottom: "4px",
                    left: "12px",
                    right: "12px",
                    height: "2px",
                    background: "linear-gradient(90deg, #667eea 0%, #764ba2 100%)",
                    width: hoveredNav === "reviews" || currentView === "reviews" ? "calc(100% - 24px)" : "0%",
                    transition: "width 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                    borderRadius: "2px",
                    opacity: hoveredNav === "reviews" || currentView === "reviews" ? "1" : "0"
                  }} />
                </button>
              </>
            )}
            {!!user.is_premium && (
              <button
                style={{
                  padding: "8px 16px",
                  background: "#fffbeb",
                  color: "#a16207",
                  border: "none",
                  borderRadius: "10px",
                  fontSize: "13px",
                  fontWeight: "500",
                  cursor: "default",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  transform: "scale(1)"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#fef3c7";
                  e.currentTarget.style.transform = "scale(1.05) translateY(-1px)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(251, 191, 36, 0.3)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#fffbeb";
                  e.currentTarget.style.transform = "scale(1) translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <span style={{ fontSize: "14px", transition: "transform 0.3s ease", display: "inline-block" }}>⭐</span>
                Premium
              </button>
            )}
            {!!user.is_admin && (
              <button
                style={{
                  padding: "8px 16px",
                  background: "#e0e7ff",
                  color: "#667eea",
                  border: "none",
                  borderRadius: "10px",
                  fontSize: "13px",
                  fontWeight: "500",
                  cursor: "default",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  transform: "scale(1)"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#c7d2fe";
                  e.currentTarget.style.transform = "scale(1.05) translateY(-1px)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(102, 126, 234, 0.3)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#e0e7ff";
                  e.currentTarget.style.transform = "scale(1) translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <span style={{ fontSize: "14px", transition: "transform 0.3s ease", display: "inline-block" }}>👑</span>
                Admin
              </button>
            )}
          </div>
          {/* Mobile Hamburger Menu */}
          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="mobile-menu-btn"
            style={{
              display: "none",
              flexDirection: "column",
              gap: "4px",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: "8px",
              alignItems: "center",
              justifyContent: "center"
            }}
            aria-label="Toggle menu"
          >
            <div style={{
              width: "24px",
              height: "2px",
              background: "#4f46e5",
              transition: "all 0.3s ease",
              transform: showMobileMenu ? "rotate(45deg) translate(5px, 5px)" : "none"
            }} />
            <div style={{
              width: "24px",
              height: "2px",
              background: "#4f46e5",
              transition: "all 0.3s ease",
              opacity: showMobileMenu ? 0 : 1
            }} />
            <div style={{
              width: "24px",
              height: "2px",
              background: "#4f46e5",
              transition: "all 0.3s ease",
              transform: showMobileMenu ? "rotate(-45deg) translate(7px, -6px)" : "none"
            }} />
          </button>
        </div>
        <div style={{ 
          display: "flex", 
          alignItems: "center", 
          gap: isMobile ? "8px" : "12px", 
          position: "relative", 
          flexWrap: "nowrap",
          flexShrink: 0
        }}>
          {/* Notification Panel */}
          <NotificationPanel
            token={token}
            user={user}
          />

          <button
            ref={profileButtonRef}
            onClick={() => {
              if (profileButtonRef.current) {
                const rect = profileButtonRef.current.getBoundingClientRect();
                setProfileMenuPosition({
                  top: isMobile ? rect.bottom + 8 : rect.bottom + 8,
                  right: isMobile ? 16 : window.innerWidth - rect.right,
                  left: isMobile ? 16 : 'auto'
                });
              }
              setShowProfileMenu(!showProfileMenu);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: isMobile ? "6px" : "10px",
              padding: isMobile ? "6px" : "6px 12px 6px 6px",
              background: showProfileMenu ? "#f1f5f9" : "transparent",
              color: "#475569",
              border: "1px solid #e2e8f0",
              borderRadius: "24px",
              cursor: "pointer",
              fontSize: isMobile ? "12px" : "14px",
              fontWeight: "500",
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              transform: showProfileMenu ? "scale(0.98)" : "scale(1)",
              minWidth: isMobile ? "44px" : "auto",
              minHeight: isMobile ? "44px" : "auto"
            }}
            onMouseEnter={(e) => {
              if (!showProfileMenu) {
                e.currentTarget.style.background = "#f8fafc";
                e.currentTarget.style.borderColor = "#cbd5e1";
                e.currentTarget.style.transform = "scale(1.02)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.08)";
              }
            }}
            onMouseLeave={(e) => {
              if (!showProfileMenu) {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.borderColor = "#e2e8f0";
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.boxShadow = "none";
              }
            }}
          >
            <div style={{
              width: isMobile ? "28px" : "32px",
              height: isMobile ? "28px" : "32px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: isMobile ? "12px" : "14px",
              fontWeight: "600",
              flexShrink: 0,
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              transform: showProfileMenu ? "scale(1.1)" : "scale(1)",
              boxShadow: showProfileMenu ? "0 4px 12px rgba(102, 126, 234, 0.3)" : "none"
            }}>
              {(user.full_name || user.username || "").charAt(0).toUpperCase()}
            </div>
            <span className="user-name-text" style={{ 
              fontSize: isMobile ? "12px" : "14px", 
              fontWeight: "500",
              transition: "color 0.3s ease"
            }}>{user.full_name || user.username}</span>
            <span style={{ 
              fontSize: "10px", 
              color: "#94a3b8",
              transition: "transform 0.3s ease",
              display: "inline-block",
              transform: showProfileMenu ? "rotate(180deg)" : "rotate(0deg)"
            }}>▼</span>
          </button>
          
          {showProfileMenu && (
            <div
              ref={profileMenuRef}
              style={{
                position: "fixed",
                top: `${profileMenuPosition.top}px`,
                right: isMobile ? "16px" : `${profileMenuPosition.right}px`,
                left: isMobile ? "16px" : "auto",
                width: isMobile ? "calc(100% - 32px)" : "auto",
                maxWidth: isMobile ? "calc(100% - 32px)" : "320px",
                minWidth: isMobile ? "auto" : "280px",
                background: "white",
                borderRadius: "16px",
                boxShadow: "0 20px 60px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.5) inset",
                border: "1px solid rgba(255, 255, 255, 0.3)",
                zIndex: 99999,
                overflow: "hidden",
                padding: isMobile ? "12px" : "8px",
                pointerEvents: "auto",
                animation: "fadeInUp 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)"
              }}
            >
              <div style={{
                padding: isMobile ? "12px" : "16px",
                borderBottom: "1px solid #f1f5f9",
                marginBottom: "4px",
                animation: "fadeInUp 0.3s cubic-bezier(0.4, 0, 0.2, 1) 0.05s both"
              }}>
                <div style={{ 
                  fontSize: isMobile ? "14px" : "15px", 
                  fontWeight: "600", 
                  color: "#1e293b", 
                  marginBottom: "4px",
                  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text"
                }}>
                  {user.full_name || user.username}
                </div>
                <div style={{ 
                  fontSize: isMobile ? "12px" : "13px", 
                  color: "#64748b",
                  wordBreak: "break-word"
                }}>
                  {user.email || user.username}
                </div>
              </div>
              
              <button
                onClick={() => {
                  setShowProfileMenu(false);
                  setCurrentView("edit-profile");
                }}
                style={{
                  width: "100%",
                  padding: isMobile ? "14px 16px" : "12px 16px",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  fontSize: isMobile ? "14px" : "13px",
                  color: "#475569",
                  textAlign: "left",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  fontWeight: "500",
                  display: "flex",
                  alignItems: "center",
                  gap: isMobile ? "14px" : "12px",
                  borderRadius: "8px",
                  animation: "fadeInUp 0.3s cubic-bezier(0.4, 0, 0.2, 1) 0.1s both",
                  minHeight: isMobile ? "48px" : "auto"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "linear-gradient(90deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.05) 100%)";
                  e.currentTarget.style.transform = "translateX(4px)";
                  e.currentTarget.style.boxShadow = "0 2px 8px rgba(102, 126, 234, 0.1)";
                  const icon = e.currentTarget.querySelector('div');
                  if (icon) {
                    icon.style.transform = "scale(1.15) rotate(5deg)";
                    icon.style.background = "linear-gradient(135deg, #667eea 0%, #764ba2 100%)";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.transform = "translateX(0)";
                  e.currentTarget.style.boxShadow = "none";
                  const icon = e.currentTarget.querySelector('div');
                  if (icon) {
                    icon.style.transform = "scale(1) rotate(0deg)";
                    icon.style.background = "#eef2ff";
                  }
                }}
              >
                <div style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  background: "#eef2ff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "16px",
                  flexShrink: 0,
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
                }}>
                  👤
                </div>
                <span>Edit Profile</span>
              </button>
              
              {!user.is_admin && (
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    setCurrentView("subscription");
                  }}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "13px",
                    color: "#475569",
                    textAlign: "left",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    fontWeight: "500",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    borderRadius: "8px",
                    animation: "fadeInUp 0.3s cubic-bezier(0.4, 0, 0.2, 1) 0.15s both"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "linear-gradient(90deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.05) 100%)";
                    e.currentTarget.style.transform = "translateX(4px)";
                    e.currentTarget.style.boxShadow = "0 2px 8px rgba(102, 126, 234, 0.1)";
                    const icon = e.currentTarget.querySelector('div');
                    if (icon) {
                      icon.style.transform = "scale(1.15) rotate(-5deg)";
                      icon.style.background = "linear-gradient(135deg, #667eea 0%, #764ba2 100%)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.transform = "translateX(0)";
                    e.currentTarget.style.boxShadow = "none";
                    const icon = e.currentTarget.querySelector('div');
                    if (icon) {
                      icon.style.transform = "scale(1) rotate(0deg)";
                      icon.style.background = "#eef2ff";
                    }
                  }}
                >
                  <div style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    background: "#eef2ff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "16px",
                    flexShrink: 0,
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
                  }}>
                    💳
                  </div>
                  <span>Subscriptions</span>
                </button>
              )}
              
              <button
                onClick={() => {
                  setShowProfileMenu(false);
                  setCurrentView("account-settings");
                }}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "13px",
                  color: "#475569",
                  textAlign: "left",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  fontWeight: "500",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  borderRadius: "8px",
                  animation: "fadeInUp 0.3s cubic-bezier(0.4, 0, 0.2, 1) 0.2s both"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "linear-gradient(90deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.05) 100%)";
                  e.currentTarget.style.transform = "translateX(4px)";
                  e.currentTarget.style.boxShadow = "0 2px 8px rgba(102, 126, 234, 0.1)";
                  const icon = e.currentTarget.querySelector('div');
                  if (icon) {
                    icon.style.transform = "scale(1.15) rotate(15deg)";
                    icon.style.background = "linear-gradient(135deg, #667eea 0%, #764ba2 100%)";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.transform = "translateX(0)";
                  e.currentTarget.style.boxShadow = "none";
                  const icon = e.currentTarget.querySelector('div');
                  if (icon) {
                    icon.style.transform = "scale(1) rotate(0deg)";
                    icon.style.background = "#eef2ff";
                  }
                }}
              >
                <div style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  background: "#eef2ff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "16px",
                  flexShrink: 0,
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
                }}>
                  ⚙️
                </div>
                <span>Account Settings</span>
              </button>
              
              {!!user.is_admin && (
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    setCurrentView("admin");
                  }}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "13px",
                    color: "#4f46e5",
                    textAlign: "left",
                    transition: "background 0.2s ease",
                    fontWeight: "500",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    borderRadius: "8px"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#eef2ff";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <div style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    background: "#e0e7ff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "16px",
                    flexShrink: 0
                  }}>
                    👑
                  </div>
                  <span>Admin Panel</span>
                </button>
              )}
              
              {!user.is_admin && (
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    setCurrentView("help");
                  }}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "13px",
                    color: "#475569",
                    textAlign: "left",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    fontWeight: "500",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    borderRadius: "8px",
                    animation: "fadeInUp 0.3s cubic-bezier(0.4, 0, 0.2, 1) 0.25s both"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "linear-gradient(90deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.05) 100%)";
                    e.currentTarget.style.transform = "translateX(4px)";
                    e.currentTarget.style.boxShadow = "0 2px 8px rgba(102, 126, 234, 0.1)";
                    const icon = e.currentTarget.querySelector('div');
                    if (icon) {
                      icon.style.transform = "scale(1.15) rotate(-10deg)";
                      icon.style.background = "linear-gradient(135deg, #667eea 0%, #764ba2 100%)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.transform = "translateX(0)";
                    e.currentTarget.style.boxShadow = "none";
                    const icon = e.currentTarget.querySelector('div');
                    if (icon) {
                      icon.style.transform = "scale(1) rotate(0deg)";
                      icon.style.background = "#eef2ff";
                    }
                  }}
                >
                  <div style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    background: "#eef2ff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "16px",
                    flexShrink: 0,
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
                  }}>
                    ❓
                  </div>
                  <span>Help & Support</span>
                </button>
              )}
              
              <div style={{
                height: "1px",
                background: "linear-gradient(90deg, transparent 0%, #e2e8f0 50%, transparent 100%)",
                margin: "8px 0",
                animation: "fadeInUp 0.3s cubic-bezier(0.4, 0, 0.2, 1) 0.3s both"
              }} />
              
              <button
                onClick={() => {
                  setShowProfileMenu(false);
                  handleLogout();
                }}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "13px",
                  color: "#dc2626",
                  textAlign: "left",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  fontWeight: "500",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  borderRadius: "8px",
                  animation: "fadeInUp 0.3s cubic-bezier(0.4, 0, 0.2, 1) 0.35s both"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "linear-gradient(90deg, rgba(220, 38, 38, 0.1) 0%, rgba(239, 68, 68, 0.05) 100%)";
                  e.currentTarget.style.transform = "translateX(4px)";
                  e.currentTarget.style.boxShadow = "0 2px 8px rgba(220, 38, 38, 0.15)";
                  const icon = e.currentTarget.querySelector('div');
                  if (icon) {
                    icon.style.transform = "scale(1.15) rotate(10deg)";
                    icon.style.background = "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.transform = "translateX(0)";
                  e.currentTarget.style.boxShadow = "none";
                  const icon = e.currentTarget.querySelector('div');
                  if (icon) {
                    icon.style.transform = "scale(1) rotate(0deg)";
                    icon.style.background = "#fee2e2";
                  }
                }}
              >
                <div style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  background: "#fee2e2",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "16px",
                  flexShrink: 0,
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
                }}>
                  🚪
                </div>
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {showMobileMenu && (
        <div
          className="mobile-menu-overlay"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.5)",
            zIndex: 999
          }}
          onClick={() => setShowMobileMenu(false)}
        >
          <div
            style={{
              position: "absolute",
              top: "70px",
              left: 0,
              right: 0,
              background: "white",
              boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              gap: "16px"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {!user.is_admin && (
              <>
                <button
                  onClick={() => {
                    setCurrentView("home");
                    setSelectedTripId(null);
                    setShowMobileMenu(false);
                  }}
                  style={{
                    padding: "12px 16px",
                    background: currentView === "home" ? "#eef2ff" : "transparent",
                    color: currentView === "home" ? "#4f46e5" : "#1e293b",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontSize: "16px",
                    fontWeight: currentView === "home" ? "600" : "500",
                    textAlign: "left",
                    transition: "all 0.2s ease"
                  }}
                >
                  Home
                </button>
                <button
                  onClick={() => {
                    setCurrentView("list");
                    setSelectedTripId(null);
                    setShowMobileMenu(false);
                  }}
                  style={{
                    padding: "12px 16px",
                    background: currentView === "list" ? "#eef2ff" : "transparent",
                    color: currentView === "list" ? "#4f46e5" : "#1e293b",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontSize: "16px",
                    fontWeight: currentView === "list" ? "600" : "500",
                    textAlign: "left",
                    transition: "all 0.2s ease"
                  }}
                >
                  My Trips
                </button>
                <button
                  onClick={() => {
                    setCurrentView("reviews");
                    setSelectedTripId(null);
                    setShowMobileMenu(false);
                  }}
                  style={{
                    padding: "12px 16px",
                    background: currentView === "reviews" ? "#eef2ff" : "transparent",
                    color: currentView === "reviews" ? "#4f46e5" : "#1e293b",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontSize: "16px",
                    fontWeight: currentView === "reviews" ? "600" : "500",
                    textAlign: "left",
                    transition: "all 0.2s ease"
                  }}
                >
                  Review
                </button>
              </>
            )}
            <div style={{ height: "1px", background: "#e2e8f0", margin: "8px 0" }} />
            <button
              onClick={() => {
                setShowMobileMenu(false);
                setCurrentView("edit-profile");
              }}
              style={{
                padding: "12px 16px",
                background: "transparent",
                color: "#1e293b",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "16px",
                fontWeight: "500",
                textAlign: "left"
              }}
            >
              Edit Profile
            </button>
            {!user.is_admin && (
              <button
                onClick={() => {
                  setShowMobileMenu(false);
                  setCurrentView("subscription");
                }}
                style={{
                  padding: "12px 16px",
                  background: "transparent",
                  color: "#1e293b",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "16px",
                  fontWeight: "500",
                  textAlign: "left"
                }}
              >
                Subscriptions
              </button>
            )}
            <button
              onClick={() => {
                setShowMobileMenu(false);
                setCurrentView("account-settings");
              }}
              style={{
                padding: "12px 16px",
                background: "transparent",
                color: "#1e293b",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "16px",
                fontWeight: "500",
                textAlign: "left"
              }}
            >
              Account Settings
            </button>
            {!!user.is_admin && (
              <button
                onClick={() => {
                  setShowMobileMenu(false);
                  setCurrentView("admin");
                }}
                style={{
                  padding: "12px 16px",
                  background: "transparent",
                  color: "#4f46e5",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "16px",
                  fontWeight: "600",
                  textAlign: "left"
                }}
              >
                Admin Panel
              </button>
            )}
            {!user.is_admin && (
              <button
                onClick={() => {
                  setShowMobileMenu(false);
                  setCurrentView("help");
                }}
                style={{
                  padding: "12px 16px",
                  background: "transparent",
                  color: "#1e293b",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "16px",
                  fontWeight: "500",
                  textAlign: "left"
                }}
              >
                Help & Support
              </button>
            )}
            <div style={{ height: "1px", background: "#e2e8f0", margin: "8px 0" }} />
            <button
              onClick={() => {
                setShowMobileMenu(false);
                handleLogout();
              }}
              style={{
                padding: "12px 16px",
                background: "transparent",
                color: "#dc2626",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "16px",
                fontWeight: "500",
                textAlign: "left"
              }}
            >
              Logout
            </button>
          </div>
        </div>
      )}

      <div style={{ flex: "1 0 auto", display: "flex", flexDirection: "column" }}>
        {currentView === "home" ? (
          user.is_admin ? (
            <AdminPanel 
              token={token} 
              user={user} 
              onBack={handleBackToHome}
            />
          ) : (
            <DashboardHome 
              token={token} 
              user={user} 
              onCreateNew={handleCreateNew}
              onNavigateToTrips={() => setCurrentView("list")}
              onNavigateToMemories={() => setCurrentView("memories")}
            />
          )
        ) : currentView === "list" ? (
          user.is_admin ? (
            <AdminPanel 
              token={token} 
              user={user} 
              onBack={handleBackToHome}
            />
          ) : (
            <TripList token={token} onCreateNew={handleCreateNew} />
          )
        ) : currentView === "reviews" ? (
          user.is_admin ? (
            <AdminPanel 
              token={token} 
              user={user} 
              onBack={handleBackToHome}
            />
          ) : (
            <ReviewPage token={token} user={user} />
          )
        ) : currentView === "planner" ? (
          user.is_admin ? (
            <AdminPanel 
              token={token} 
              user={user} 
              onBack={handleBackToHome}
            />
          ) : (
            <TripPlanner
              token={token}
              user={user}
              tripId={selectedTripId}
              onBack={handleBackToList}
            />
          )
        ) : currentView === "edit-profile" ? (
          <EditProfile 
            token={token} 
            user={user} 
            onBack={handleBackToHome}
            onUpdateUser={(updatedUser) => {
              setUser(updatedUser);
              localStorage.setItem("user", JSON.stringify(updatedUser));
            }}
          />
        ) : currentView === "subscription" ? (
          <Subscription 
            token={token} 
            user={user} 
            onBack={handleBackToHome}
          />
        ) : currentView === "account-settings" ? (
          <AccountSettings 
            token={token} 
            user={user} 
            onBack={handleBackToHome}
            onLogout={handleLogout}
          />
        ) : currentView === "help" ? (
          <HelpSupport onBack={handleBackToHome} />
        ) : currentView === "memories" ? (
          <MemoriesPage 
            token={token} 
            user={user} 
            onBack={handleBackToHome}
          />
        ) : currentView === "admin" ? (
          <AdminPanel 
            token={token} 
            user={user} 
            onBack={handleBackToHome}
          />
        ) : user.is_admin ? (
          // Redirect any other view to admin panel for admins
          <AdminPanel 
            token={token} 
            user={user} 
            onBack={handleBackToHome}
          />
        ) : (
          <TripPlanner
            token={token}
            user={user}
            tripId={selectedTripId}
            onBack={handleBackToHome}
          />
        )}
      </div>

      {/* Global Footer - only visible when scrolling */}
      <div style={{ flexShrink: 0, marginTop: "clamp(48px, 8vw, 96px)" }}>
        <Footer />
      </div>
    </div>
  );
}

export default App;
