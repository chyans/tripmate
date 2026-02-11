import React, { useState } from "react";
import axios from "axios";
import tripmateLogo from "../assets/logo/tripmate_logo.png";
import API_URL from "../config";

export default function Login({ onLogin, onSwitchToRegister, onBack }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await axios.post(`${API_URL}/api/auth/login`, {
        username,
        password,
      });

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      onLogin(res.data.user, res.data.token);
    } catch (err) {
      const errorData = err.response?.data;
      if (errorData?.reason) {
        // Account suspended - show both error and reason
        setError(`${errorData.error} ${errorData.reason}`);
      } else {
        setError(errorData?.error || "Login failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
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
        padding: "16px 24px",
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
          maxWidth: "420px",
          background: "white",
          borderRadius: "24px",
          padding: "clamp(32px, 6vw, 48px) clamp(24px, 4vw, 40px)",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.05) inset",
          border: "1px solid rgba(226, 232, 240, 0.5)"
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
            Welcome back
          </div>
          <div style={{
            fontSize: "15px",
            color: "#64748b",
            fontWeight: "400"
          }}>
            Sign in to continue planning your trips
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
              Username or Email
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="Enter your username or email"
              style={{
                width: "100%",
                padding: "14px 18px",
                borderRadius: "12px",
                border: "2px solid #e2e8f0",
                fontSize: "15px",
                background: "#fafafa",
                transition: "all 0.2s ease",
                outline: "none",
                fontFamily: "inherit"
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "#667eea";
                e.currentTarget.style.background = "#fff";
                e.currentTarget.style.boxShadow = "0 0 0 3px rgba(102, 126, 234, 0.1)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "#e2e8f0";
                e.currentTarget.style.background = "#fafafa";
                e.currentTarget.style.boxShadow = "none";
              }}
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
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter your password"
              style={{
                width: "100%",
                padding: "14px 18px",
                borderRadius: "12px",
                border: "2px solid #e2e8f0",
                fontSize: "15px",
                background: "#fafafa",
                transition: "all 0.2s ease",
                outline: "none",
                fontFamily: "inherit"
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "#667eea";
                e.currentTarget.style.background = "#fff";
                e.currentTarget.style.boxShadow = "0 0 0 3px rgba(102, 126, 234, 0.1)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "#e2e8f0";
                e.currentTarget.style.background = "#fafafa";
                e.currentTarget.style.boxShadow = "none";
              }}
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
            {loading ? "Signing in..." : "Sign in"}
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
            Don't have an account?
          </div>
          <button
            onClick={onSwitchToRegister}
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
            Create account
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}
