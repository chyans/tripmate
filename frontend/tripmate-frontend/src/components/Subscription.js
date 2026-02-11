import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import API_URL from "../config";

export default function Subscription({ token, user, onBack }) {
  const [subscriptionData, setSubscriptionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [daysLeft, setDaysLeft] = useState(0);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Initialize with user prop if available
    if (user && (user.is_premium || user.is_admin)) {
      setSubscriptionData({
        is_premium: true,
        premium_expires_at: null
      });
    }
    loadSubscriptionData();
  }, [token, user]);

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
      // If element is already in view, trigger immediately
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.top < window.innerHeight + 200 && rect.bottom > -200) {
        setVisible(true);
      }
    }
    return () => observer.disconnect();
  }, []);

  // Ensure visible after loading
  useEffect(() => {
    if (!loading && containerRef.current) {
      const timer = setTimeout(() => {
        setVisible(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  // Mouse tracking for magnetic buttons
  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const loadSubscriptionData = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/account/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const userData = res.data.user;
      
      setSubscriptionData({
        is_premium: userData.is_premium || user?.is_premium || user?.is_admin || false,
        premium_expires_at: userData.premium_expires_at
      });

      if (userData.premium_expires_at) {
        const expiresDate = new Date(userData.premium_expires_at);
        const today = new Date();
        const diffTime = expiresDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        setDaysLeft(diffDays > 0 ? diffDays : 0);
      }
    } catch (err) {
      console.error("Error loading subscription:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async () => {
    if (window.confirm("Subscribe to Premium for 30 days? (This is a demo - no payment required)")) {
      try {
        await axios.post(`${API_URL}/api/premium/subscribe`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        alert("Premium subscription activated!");
        loadSubscriptionData();
      } catch (err) {
        alert(err.response?.data?.error || "Failed to subscribe");
      }
    }
  };

  const handleCancel = async () => {
    if (window.confirm("Cancel subscription? Your premium access will remain until the end of your billing period.")) {
      try {
        await axios.post(`${API_URL}/api/premium/cancel`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        alert("Subscription cancellation confirmed. Premium access will remain until expiration.");
        loadSubscriptionData();
      } catch (err) {
        alert(err.response?.data?.error || "Failed to cancel subscription");
      }
    }
  };

  if (loading) {
    return (
      <div style={{
        width: "100%",
        position: "relative",
        zIndex: 1,
        flex: "1 0 auto",
        background: "transparent"
      }}>
        <div style={{
          maxWidth: "1440px",
          width: "100%",
          margin: "0 auto",
          padding: "clamp(32px, 6vw, 64px) clamp(24px, 4vw, 48px)"
        }}>
          <SkeletonLoader />
        </div>
      </div>
    );
  }

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
        @keyframes shimmer {
          0% {
            background-position: -200px 0;
          }
          100% {
            background-position: calc(200px + 100%) 0;
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
                Subscription
              </h1>
              <p style={{
                fontSize: "clamp(15px, 2.5vw, 18px)",
                color: "#64748b",
                fontWeight: "400"
              }}>
                Manage your premium subscription
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

          {(subscriptionData?.is_premium || user?.is_premium || user?.is_admin) ? (
            <div style={{
              display: "grid",
              gap: "clamp(24px, 4vw, 32px)"
            }}>
              {/* Premium Active Card */}
              <div style={{
                background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)",
                borderRadius: "32px",
                padding: "clamp(40px, 6vw, 56px)",
                color: "white",
                boxShadow: "0 20px 60px rgba(99, 102, 241, 0.4), 0 8px 32px rgba(99, 102, 241, 0.2)",
                position: "relative",
                overflow: "hidden",
                opacity: visible ? 1 : 0,
                transform: visible ? "translateY(0)" : "translateY(20px)",
                transition: "opacity 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s, transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s",
                animation: visible ? "fadeInUp 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s both" : "none"
              }}>
                <div style={{
                  position: "absolute",
                  top: "-50%",
                  right: "-50%",
                  width: "200%",
                  height: "200%",
                  background: "radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%)",
                  pointerEvents: "none"
                }} />
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "clamp(16px, 3vw, 20px)",
                  marginBottom: "clamp(24px, 4vw, 32px)",
                  position: "relative",
                  zIndex: 1
                }}>
                  <div style={{
                    width: "clamp(56px, 8vw, 72px)",
                    height: "clamp(56px, 8vw, 72px)",
                    background: "rgba(255, 255, 255, 0.2)",
                    backdropFilter: "blur(10px)",
                    borderRadius: "16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="clamp(32px, 5vw, 40px)" height="clamp(32px, 5vw, 40px)" viewBox="0 0 24 24" fill="#fbbf24" stroke="none" strokeWidth="0" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"/>
                    </svg>
                  </div>
                  <div>
                    <h2 style={{
                      fontSize: "clamp(28px, 5vw, 36px)",
                      fontWeight: "900",
                      margin: 0,
                      letterSpacing: "-0.02em"
                    }}>
                      Premium Active
                    </h2>
                    <p style={{
                      fontSize: "clamp(16px, 2.5vw, 18px)",
                      margin: "clamp(8px, 1.5vw, 12px) 0 0 0",
                      opacity: 0.95
                    }}>
                      Your premium subscription is active
                    </p>
                  </div>
                </div>
                {subscriptionData.premium_expires_at && (
                  <div style={{
                    background: "rgba(255, 255, 255, 0.15)",
                    backdropFilter: "blur(10px)",
                    borderRadius: "20px",
                    padding: "clamp(20px, 3vw, 24px)",
                    marginTop: "clamp(24px, 4vw, 32px)",
                    position: "relative",
                    zIndex: 1
                  }}>
                    <p style={{
                      fontSize: "clamp(14px, 2vw, 15px)",
                      marginBottom: "clamp(8px, 1.5vw, 12px)",
                      opacity: 0.9
                    }}>
                      Expires: {new Date(subscriptionData.premium_expires_at).toLocaleDateString()}
                    </p>
                    <p style={{
                      fontSize: "clamp(24px, 4vw, 32px)",
                      fontWeight: "800",
                      margin: 0,
                      letterSpacing: "-0.02em"
                    }}>
                      {daysLeft} {daysLeft === 1 ? "day" : "days"} remaining
                    </p>
                  </div>
                )}
              </div>

              {/* Benefits Card */}
              <div style={{
                background: "rgba(255, 255, 255, 0.7)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                borderRadius: "24px",
                padding: "clamp(32px, 5vw, 40px)",
                boxShadow: "0 20px 60px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(255, 255, 255, 0.5) inset",
                border: "1px solid rgba(255, 255, 255, 0.3)",
                opacity: visible ? 1 : 0,
                transform: visible ? "translateY(0)" : "translateY(20px)",
                transition: "opacity 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s, transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s",
                animation: visible ? "fadeInUp 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s both" : "none"
              }}>
                <h3 style={{
                  fontSize: "clamp(22px, 3.5vw, 28px)",
                  fontWeight: "700",
                  color: "#1e293b",
                  marginBottom: "clamp(24px, 4vw, 32px)",
                  letterSpacing: "-0.01em"
                }}>
                  Premium Benefits
                </h3>
                <div style={{
                  display: "grid",
                  gap: "clamp(16px, 2.5vw, 20px)"
                }}>
                  {[
                    "Unlimited trips (no monthly limit)",
                    "Unlimited AI-powered Q&A",
                    "1GB Photo & Video uploads per trip",
                    "Export trip as MP4 video",
                    "Priority support"
                  ].map((benefit, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "clamp(12px, 2vw, 16px)",
                        padding: "clamp(12px, 2vw, 16px)",
                        background: "rgba(248, 250, 252, 0.5)",
                        borderRadius: "12px",
                        opacity: visible ? 1 : 0,
                        transform: visible ? "translateX(0)" : "translateX(-20px)",
                        transition: `opacity 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) ${0.4 + idx * 0.1}s, transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) ${0.4 + idx * 0.1}s`
                      }}
                    >
                      <div style={{
                        width: "24px",
                        height: "24px",
                        background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0
                      }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      </div>
                      <span style={{
                        color: "#475569",
                        fontSize: "clamp(15px, 2vw, 16px)",
                        fontWeight: "500"
                      }}>
                        {benefit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cancel Button */}
              <MagneticButton
                onClick={handleCancel}
                mousePosition={mousePosition}
                style={{
                  padding: "clamp(16px, 2.5vw, 20px)",
                  background: "transparent",
                  color: "#dc2626",
                  border: "2px solid #dc2626",
                  borderRadius: "16px",
                  cursor: "pointer",
                  fontSize: "clamp(16px, 2.5vw, 18px)",
                  fontWeight: "700",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  opacity: visible ? 1 : 0,
                  transform: visible ? "translateY(0)" : "translateY(20px)",
                  animation: visible ? "fadeInUp 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.6s both" : "none"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(220, 38, 38, 0.1)";
                  e.currentTarget.style.boxShadow = "0 8px 24px rgba(220, 38, 38, 0.2)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                Cancel Subscription
              </MagneticButton>
            </div>
          ) : (
            <div style={{
              display: "grid",
              gap: "clamp(24px, 4vw, 32px)"
            }}>
              {/* Free Plan Card */}
              <div style={{
                background: "rgba(255, 255, 255, 0.7)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                borderRadius: "24px",
                padding: "clamp(40px, 6vw, 56px)",
                textAlign: "center",
                boxShadow: "0 20px 60px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(255, 255, 255, 0.5) inset",
                border: "1px solid rgba(255, 255, 255, 0.3)",
                opacity: visible ? 1 : 0,
                transform: visible ? "translateY(0)" : "translateY(20px)",
                transition: "opacity 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s, transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s",
                animation: visible ? "fadeInUp 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s both" : "none"
              }}>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "clamp(24px, 4vw, 32px)"
                }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="clamp(64px, 10vw, 80px)" height="clamp(64px, 10vw, 80px)" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#6366f1" }}>
                    <path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"/>
                    <path d="M14 2v5a1 1 0 0 0 1 1h5"/>
                  </svg>
                </div>
                <h2 style={{
                  fontSize: "clamp(28px, 5vw, 36px)",
                  fontWeight: "800",
                  color: "#1e293b",
                  marginBottom: "clamp(12px, 2vw, 16px)",
                  letterSpacing: "-0.02em"
                }}>
                  Free Plan
                </h2>
                <p style={{
                  color: "#64748b",
                  fontSize: "clamp(16px, 2.5vw, 18px)",
                  margin: 0,
                  lineHeight: "1.6"
                }}>
                  Upgrade to Premium for enhanced features
                </p>
              </div>

              {/* Premium Plan Card */}
              <div style={{
                background: "rgba(255, 255, 255, 0.7)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                borderRadius: "32px",
                padding: "clamp(40px, 6vw, 56px)",
                boxShadow: "0 20px 60px rgba(99, 102, 241, 0.2), 0 0 0 2px rgba(99, 102, 241, 0.3) inset, 0 8px 32px rgba(0, 0, 0, 0.04)",
                border: "2px solid rgba(99, 102, 241, 0.3)",
                opacity: visible ? 1 : 0,
                transform: visible ? "translateY(0)" : "translateY(20px)",
                transition: "opacity 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s, transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s",
                animation: visible ? "fadeInUp 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s both" : "none"
              }}>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "clamp(32px, 5vw, 40px)"
                }}>
                  <div>
                    <h3 style={{
                      fontSize: "clamp(24px, 4vw, 32px)",
                      fontWeight: "800",
                      color: "#1e293b",
                      marginBottom: "clamp(8px, 1.5vw, 12px)",
                      letterSpacing: "-0.02em"
                    }}>
                      Premium Plan
                    </h3>
                    <p style={{
                      color: "#64748b",
                      fontSize: "clamp(16px, 2.5vw, 18px)",
                      margin: 0,
                      fontWeight: "500"
                    }}>
                      $9.99/month
                    </p>
                  </div>
                  <div style={{
                    width: "clamp(56px, 8vw, 72px)",
                    height: "clamp(56px, 8vw, 72px)",
                    background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                    borderRadius: "16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="clamp(32px, 5vw, 40px)" height="clamp(32px, 5vw, 40px)" viewBox="0 0 24 24" fill="#fbbf24" stroke="none" strokeWidth="0" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"/>
                    </svg>
                  </div>
                </div>

                <div style={{
                  display: "grid",
                  gap: "clamp(16px, 2.5vw, 20px)",
                  marginBottom: "clamp(32px, 5vw, 40px)"
                }}>
                  {[
                    "Unlimited trips (no monthly limit)",
                    "Unlimited AI-powered Q&A",
                    "1GB Photo & Video uploads per trip",
                    "Export trip as MP4 video",
                    "Priority support"
                  ].map((feature, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "clamp(12px, 2vw, 16px)",
                        opacity: visible ? 1 : 0,
                        transform: visible ? "translateX(0)" : "translateX(-20px)",
                        transition: `opacity 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) ${0.4 + idx * 0.1}s, transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) ${0.4 + idx * 0.1}s`
                      }}
                    >
                      <div style={{
                        width: "24px",
                        height: "24px",
                        background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0
                      }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      </div>
                      <span style={{
                        color: "#475569",
                        fontSize: "clamp(15px, 2vw, 16px)",
                        fontWeight: "500"
                      }}>
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>

                <MagneticButton
                  onClick={handleSubscribe}
                  mousePosition={mousePosition}
                  style={{
                    width: "100%",
                    padding: "clamp(18px, 3vw, 22px)",
                    background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                    color: "white",
                    border: "none",
                    borderRadius: "16px",
                    cursor: "pointer",
                    fontSize: "clamp(18px, 3vw, 20px)",
                    fontWeight: "700",
                    transition: "all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
                    boxShadow: "0 8px 24px rgba(99, 102, 241, 0.4), 0 4px 12px rgba(99, 102, 241, 0.2)",
                    letterSpacing: "-0.01em"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = "0 12px 32px rgba(99, 102, 241, 0.5), 0 8px 16px rgba(99, 102, 241, 0.3)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = "0 8px 24px rgba(99, 102, 241, 0.4), 0 4px 12px rgba(99, 102, 241, 0.2)";
                  }}
                >
                  Subscribe to Premium
                </MagneticButton>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// Skeleton Loader Component
function SkeletonLoader() {
  return (
    <div style={{
      display: "grid",
      gap: "clamp(24px, 4vw, 32px)"
    }}>
      <div style={{
        background: "rgba(255, 255, 255, 0.7)",
        backdropFilter: "blur(20px)",
        borderRadius: "32px",
        padding: "clamp(40px, 6vw, 56px)",
        boxShadow: "0 20px 60px rgba(0, 0, 0, 0.08)"
      }}>
        <div className="skeleton" style={{
          height: "48px",
          width: "60%",
          marginBottom: "24px",
          borderRadius: "12px"
        }} />
        <div className="skeleton" style={{
          height: "24px",
          width: "40%",
          marginBottom: "32px",
          borderRadius: "8px"
        }} />
        <div className="skeleton" style={{
          height: "120px",
          width: "100%",
          borderRadius: "16px"
        }} />
      </div>
    </div>
  );
}

// Magnetic Button Component
function MagneticButton({ children, onClick, mousePosition, style, onMouseEnter, onMouseLeave }) {
  const buttonRef = useRef(null);
  const [transform, setTransform] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!buttonRef.current) return;
    
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
  }, [mousePosition]);

  return (
    <button
      ref={buttonRef}
      onClick={onClick}
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
