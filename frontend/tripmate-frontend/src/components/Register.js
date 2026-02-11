import React, { useState } from "react";
import axios from "axios";
import tripmateLogo from "../assets/logo/tripmate_logo.png";
import API_URL from "../config";

export default function Register({ onRegister, onSwitchToLogin, onBack }) {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    full_name: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);

    try {
      const res = await axios.post(`${API_URL}/api/auth/register`, {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        full_name: formData.full_name,
      });

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      onRegister(res.data.user, res.data.token);
    } catch (err) {
      setError(err.response?.data?.error || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "14px 18px",
    borderRadius: "12px",
    border: "2px solid #e2e8f0",
    fontSize: "15px",
    background: "#fafafa",
    transition: "all 0.2s ease",
    outline: "none",
    fontFamily: "inherit"
  };

  const inputFocus = (e) => {
    e.currentTarget.style.borderColor = "#667eea";
    e.currentTarget.style.background = "#fff";
    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(102, 126, 234, 0.1)";
  };

  const inputBlur = (e) => {
    e.currentTarget.style.borderColor = "#e2e8f0";
    e.currentTarget.style.background = "#fafafa";
    e.currentTarget.style.boxShadow = "none";
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#ffffff",
      display: "flex",
      flexDirection: "column",
      paddingTop: "80px",
      position: "relative"
    }}>
      {/* TripMate Header - Fixed at top */}
      <nav style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        background: "rgba(255, 255, 255, 0.95)",
        padding: "clamp(12px, 2vw, 16px) clamp(16px, 3vw, 24px)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        zIndex: 1000,
        backdropFilter: "blur(10px)"
      }}>
        <div style={{ 
          display: "flex",
          alignItems: "center",
          gap: "12px"
        }}>
          <img 
            src={tripmateLogo} 
            alt="TripMate Logo" 
            style={{
              height: "40px",
              width: "auto",
              objectFit: "contain"
            }}
          />
        </div>
      </nav>

      <div style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "clamp(16px, 3vw, 24px)"
      }}>
        <div style={{
          width: "100%",
          maxWidth: "480px",
          background: "white",
          borderRadius: "24px",
          padding: "clamp(32px, 6vw, 48px) clamp(24px, 4vw, 40px)",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.05) inset",
          border: "1px solid rgba(226, 232, 240, 0.5)",
          maxHeight: "90vh",
          overflowY: "auto"
        }}>
        {onBack && (
          <button
            onClick={onBack}
            style={{
              marginBottom: "32px",
              padding: "8px 0",
              background: "transparent",
              color: "#64748b",
              border: "none",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "500",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              transition: "color 0.2s ease"
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = "#475569"}
            onMouseLeave={(e) => e.currentTarget.style.color = "#64748b"}
          >
            ← Back
          </button>
        )}
        
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <div style={{
            fontSize: "32px",
            fontWeight: "800",
            color: "#1e293b",
            marginBottom: "8px",
            letterSpacing: "-0.02em"
          }}>
            Create account
          </div>
          <div style={{
            fontSize: "15px",
            color: "#64748b",
            fontWeight: "400"
          }}>
            Start planning your next adventure
          </div>
        </div>

        {error && (
          <div style={{
            padding: "14px 16px",
            background: "#fef2f2",
            color: "#dc2626",
            borderRadius: "12px",
            marginBottom: "24px",
            fontSize: "14px",
            border: "1px solid #fecaca",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}>
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "20px" }}>
            <label style={{
              display: "block",
              marginBottom: "10px",
              fontSize: "13px",
              fontWeight: "600",
              color: "#475569",
              textTransform: "uppercase",
              letterSpacing: "0.5px"
            }}>
              Username
            </label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              placeholder="Choose a username"
              style={inputStyle}
              onFocus={inputFocus}
              onBlur={inputBlur}
            />
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label style={{
              display: "block",
              marginBottom: "10px",
              fontSize: "13px",
              fontWeight: "600",
              color: "#475569",
              textTransform: "uppercase",
              letterSpacing: "0.5px"
            }}>
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="Enter your email"
              style={inputStyle}
              onFocus={inputFocus}
              onBlur={inputBlur}
            />
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label style={{
              display: "block",
              marginBottom: "10px",
              fontSize: "13px",
              fontWeight: "600",
              color: "#475569",
              textTransform: "uppercase",
              letterSpacing: "0.5px"
            }}>
              Full Name <span style={{ fontWeight: "400", textTransform: "none", fontSize: "12px", color: "#94a3b8" }}>(optional)</span>
            </label>
            <input
              type="text"
              name="full_name"
              value={formData.full_name}
              onChange={handleChange}
              placeholder="Your full name"
              style={inputStyle}
              onFocus={inputFocus}
              onBlur={inputBlur}
            />
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label style={{
              display: "block",
              marginBottom: "10px",
              fontSize: "13px",
              fontWeight: "600",
              color: "#475569",
              textTransform: "uppercase",
              letterSpacing: "0.5px"
            }}>
              Password
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="Create a password"
              style={inputStyle}
              onFocus={inputFocus}
              onBlur={inputBlur}
            />
          </div>

          <div style={{ marginBottom: "32px" }}>
            <label style={{
              display: "block",
              marginBottom: "10px",
              fontSize: "13px",
              fontWeight: "600",
              color: "#475569",
              textTransform: "uppercase",
              letterSpacing: "0.5px"
            }}>
              Confirm Password
            </label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              placeholder="Confirm your password"
              style={inputStyle}
              onFocus={inputFocus}
              onBlur={inputBlur}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "16px",
              background: loading ? "#cbd5e1" : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "white",
              border: "none",
              borderRadius: "12px",
              fontSize: "16px",
              fontWeight: "600",
              cursor: loading ? "not-allowed" : "pointer",
              transition: "all 0.2s ease",
              boxShadow: loading ? "none" : "0 4px 12px rgba(102, 126, 234, 0.4)",
              letterSpacing: "-0.01em"
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 6px 20px rgba(102, 126, 234, 0.5)";
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(102, 126, 234, 0.4)";
              }
            }}
          >
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <div style={{
          textAlign: "center",
          marginTop: "32px",
          paddingTop: "32px",
          borderTop: "1px solid #e2e8f0"
        }}>
          <div style={{
            fontSize: "14px",
            color: "#64748b",
            marginBottom: "16px"
          }}>
            Already have an account?
          </div>
          <button
            onClick={onSwitchToLogin}
            style={{
              background: "transparent",
              border: "2px solid #e2e8f0",
              color: "#475569",
              cursor: "pointer",
              padding: "12px 24px",
              borderRadius: "12px",
              fontSize: "14px",
              fontWeight: "600",
              transition: "all 0.2s ease",
              width: "100%"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "#667eea";
              e.currentTarget.style.color = "#667eea";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "#e2e8f0";
              e.currentTarget.style.color = "#475569";
            }}
          >
            Sign in
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}
