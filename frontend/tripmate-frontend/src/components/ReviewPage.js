import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import tripmateLogo from "../assets/logo/tripmate_logo.png";
import API_URL from "../config";

export default function ReviewPage({ token, user }) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const [lowRatingFeedback, setLowRatingFeedback] = useState([]);
  const [existingReview, setExistingReview] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);
  const [visible, setVisible] = useState(false);

  const feedbackOptions = [
    "Poor user interface design",
    "Difficult to use",
    "Missing important features",
    "Slow performance",
    "Too expensive",
    "Not enough trip destinations",
    "Photo upload issues",
    "Route optimization not working well",
    "Other (please specify in comments)"
  ];

  useEffect(() => {
    if (token) {
      loadMyReview();
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
      { threshold: 0.1 }
    );
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    return () => observer.disconnect();
  }, []);

  // Mouse tracking for magnetic button
  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const loadMyReview = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/website-reviews/my`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.review) {
        setExistingReview(res.data.review);
        setRating(res.data.review.rating);
        setComment(res.data.review.comment || "");
        setLowRatingFeedback(res.data.review.low_rating_feedback || []);
        setSubmitted(true);
      }
    } catch (err) {
      console.error("Error loading review:", err);
    }
  };

  const handleFeedbackToggle = (option) => {
    setLowRatingFeedback(prev => 
      prev.includes(option) 
        ? prev.filter(item => item !== option)
        : [...prev, option]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (rating === 0) {
      alert("Please select a rating");
      return;
    }

    if (rating <= 2 && lowRatingFeedback.length === 0) {
      alert("Please select at least one reason for your low rating");
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API_URL}/api/website-reviews/`, {
        rating,
        comment: comment.trim(),
        low_rating_feedback: rating <= 2 ? lowRatingFeedback : []
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSubmitted(true);
      alert("Thank you for your review!");
    } catch (err) {
      console.error("Error submitting review:", err);
      alert(err.response?.data?.error || "Failed to submit review");
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
        @keyframes starPulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.1);
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
          {/* Hero Section */}
          <div style={{
            textAlign: "center",
            marginBottom: "clamp(48px, 8vw, 80px)",
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(20px)",
            transition: "opacity 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s, transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s"
          }}>
            <h1 style={{
              fontSize: "clamp(40px, 7vw, 64px)",
              fontWeight: "900",
              background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              marginBottom: "clamp(16px, 3vw, 24px)",
              letterSpacing: "-0.04em",
              lineHeight: "1.1",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "clamp(24px, 4vw, 32px)",
              flexWrap: "wrap"
            }}>
              <span>Review</span>
              <img 
                src={tripmateLogo} 
                alt="TripMate Logo" 
                style={{
                  height: "clamp(56px, 9vw, 96px)",
                  width: "auto",
                  objectFit: "contain"
                }}
              />
            </h1>
            <p style={{
              fontSize: "clamp(16px, 2.5vw, 20px)",
              color: "#64748b",
              fontWeight: "400",
              lineHeight: "1.6",
              maxWidth: "600px",
              margin: "0 auto"
            }}>
              Help us improve by sharing your experience
            </p>
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
            maxWidth: "900px",
            margin: "0 auto",
            opacity: visible ? 1 : 0,
            transform: visible ? "scale(1)" : "scale(0.95)",
            transition: "opacity 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s, transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s"
          }}>
            {submitted && existingReview && (
              <div style={{
                background: "linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%)",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                borderRadius: "16px",
                padding: "clamp(16px, 3vw, 20px)",
                marginBottom: "clamp(32px, 5vw, 40px)",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                animation: "fadeInUp 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)"
              }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#10b981", flexShrink: 0 }}>
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <p style={{ color: "#059669", margin: 0, fontSize: "clamp(14px, 2vw, 15px)", fontWeight: "500" }}>
                  You've already submitted a review. You can update it below.
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* Star Rating Section */}
              <div style={{ 
                marginBottom: "clamp(40px, 6vw, 48px)",
                opacity: visible ? 1 : 0,
                transform: visible ? "translateY(0)" : "translateY(20px)",
                transition: "opacity 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s, transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s"
              }}>
                <label style={{
                  display: "block",
                  fontSize: "clamp(18px, 3vw, 20px)",
                  fontWeight: "700",
                  color: "#1e293b",
                  marginBottom: "clamp(20px, 3vw, 24px)",
                  letterSpacing: "-0.01em"
                }}>
                  How would you rate TripMate? <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <div style={{
                  display: "flex",
                  gap: "clamp(8px, 1.5vw, 12px)",
                  alignItems: "center",
                  justifyContent: "center",
                  flexWrap: "wrap"
                }}>
                  {[1, 2, 3, 4, 5].map((star, idx) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoveredRating(star)}
                      onMouseLeave={() => setHoveredRating(0)}
                      style={{
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        padding: "clamp(8px, 1.5vw, 12px)",
                        borderRadius: "16px",
                        transition: "all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
                        minWidth: "clamp(56px, 8vw, 72px)",
                        minHeight: "clamp(56px, 8vw, 72px)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        opacity: visible ? 1 : 0,
                        transform: visible 
                          ? (hoveredRating >= star || rating >= star ? "scale(1.2) rotate(5deg)" : "scale(1)")
                          : "translateY(20px)",
                        animation: visible ? `fadeInUp 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) ${0.4 + idx * 0.1}s both` : "none"
                      }}
                      onMouseEnter={(e) => {
                        if (hoveredRating >= star || rating >= star) {
                          e.currentTarget.style.animation = "starPulse 0.6s ease-in-out infinite";
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.animation = "none";
                      }}
                    >
                      {(hoveredRating >= star || rating >= star) ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="clamp(32px, 5vw, 40px)" height="clamp(32px, 5vw, 40px)" viewBox="0 0 24 24" fill="#fbbf24" stroke="none" strokeWidth="0" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"/>
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="clamp(32px, 5vw, 40px)" height="clamp(32px, 5vw, 40px)" viewBox="0 0 24 24" fill="#e2e8f0" stroke="none" strokeWidth="0" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"/>
                        </svg>
                      )}
                    </button>
                  ))}
                  {rating > 0 && (
                    <span style={{
                      marginLeft: "clamp(16px, 3vw, 24px)",
                      color: "#64748b",
                      fontSize: "clamp(16px, 2.5vw, 18px)",
                      fontWeight: "600",
                      padding: "clamp(8px, 1.5vw, 12px) clamp(16px, 3vw, 24px)",
                      background: "rgba(99, 102, 241, 0.1)",
                      borderRadius: "20px",
                      border: "1px solid rgba(99, 102, 241, 0.2)",
                      animation: "fadeInUp 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)"
                    }}>
                      {rating === 1 ? "Poor" : 
                       rating === 2 ? "Fair" :
                       rating === 3 ? "Good" :
                       rating === 4 ? "Very Good" : "Excellent"}
                    </span>
                  )}
                </div>
              </div>

              {/* Low Rating Feedback - Bento Grid */}
              {rating <= 2 && rating > 0 && (
                <div style={{
                  marginBottom: "clamp(40px, 6vw, 48px)",
                  padding: "clamp(24px, 4vw, 32px)",
                  background: "linear-gradient(135deg, rgba(220, 38, 38, 0.05) 0%, rgba(239, 68, 68, 0.05) 100%)",
                  borderRadius: "24px",
                  border: "1px solid rgba(220, 38, 38, 0.2)",
                  opacity: visible ? 1 : 0,
                  transform: visible ? "translateY(0)" : "translateY(20px)",
                  transition: "opacity 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.4s, transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.4s"
                }}>
                  <label style={{
                    display: "block",
                    fontSize: "clamp(18px, 3vw, 20px)",
                    fontWeight: "700",
                    color: "#1e293b",
                    marginBottom: "clamp(20px, 3vw, 24px)",
                    letterSpacing: "-0.01em"
                  }}>
                    What could we improve? <span style={{ color: "#dc2626" }}>*</span>
                  </label>
                  <div style={{ 
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                    gap: "clamp(12px, 2vw, 16px)"
                  }}>
                    {feedbackOptions.map((option, idx) => (
                      <label
                        key={option}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "clamp(12px, 2vw, 16px)",
                          cursor: "pointer",
                          padding: "clamp(14px, 2.5vw, 18px)",
                          background: lowRatingFeedback.includes(option)
                            ? "rgba(99, 102, 241, 0.1)"
                            : "rgba(255, 255, 255, 0.5)",
                          backdropFilter: "blur(10px)",
                          WebkitBackdropFilter: "blur(10px)",
                          borderRadius: "16px",
                          border: lowRatingFeedback.includes(option)
                            ? "2px solid rgba(99, 102, 241, 0.3)"
                            : "1px solid rgba(226, 232, 240, 0.5)",
                          transition: "all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
                          opacity: visible ? 1 : 0,
                          transform: visible ? "translateY(0)" : "translateY(20px)",
                          animation: visible ? `fadeInUp 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) ${0.5 + idx * 0.05}s both` : "none"
                        }}
                        onMouseEnter={(e) => {
                          if (!lowRatingFeedback.includes(option)) {
                            e.currentTarget.style.background = "rgba(255, 255, 255, 0.8)";
                            e.currentTarget.style.transform = "translateY(-2px)";
                            e.currentTarget.style.boxShadow = "0 8px 24px rgba(0, 0, 0, 0.08)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!lowRatingFeedback.includes(option)) {
                            e.currentTarget.style.background = "rgba(255, 255, 255, 0.5)";
                            e.currentTarget.style.transform = "translateY(0)";
                            e.currentTarget.style.boxShadow = "none";
                          }
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={lowRatingFeedback.includes(option)}
                          onChange={() => handleFeedbackToggle(option)}
                          style={{
                            width: "20px",
                            height: "20px",
                            cursor: "pointer",
                            accentColor: "#6366f1"
                          }}
                        />
                        <span style={{ 
                          color: "#475569", 
                          fontSize: "clamp(14px, 2vw, 15px)",
                          fontWeight: "500",
                          lineHeight: "1.5"
                        }}>
                          {option}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Comment Section */}
              <div style={{ 
                marginBottom: "clamp(40px, 6vw, 48px)",
                opacity: visible ? 1 : 0,
                transform: visible ? "translateY(0)" : "translateY(20px)",
                transition: "opacity 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.5s, transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.5s"
              }}>
                <label style={{
                  display: "block",
                  fontSize: "clamp(18px, 3vw, 20px)",
                  fontWeight: "700",
                  color: "#1e293b",
                  marginBottom: "clamp(16px, 2.5vw, 20px)",
                  letterSpacing: "-0.01em"
                }}>
                  Additional Comments
                  <span style={{ 
                    fontSize: "clamp(14px, 2vw, 15px)",
                    fontWeight: "400",
                    color: "#94a3b8",
                    marginLeft: "8px"
                  }}>
                    (Optional)
                  </span>
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Tell us more about your experience..."
                  style={{
                    width: "100%",
                    minHeight: "clamp(140px, 20vw, 180px)",
                    padding: "clamp(16px, 3vw, 20px)",
                    border: "2px solid #e2e8f0",
                    borderRadius: "20px",
                    fontSize: "clamp(15px, 2vw, 16px)",
                    fontFamily: "inherit",
                    resize: "vertical",
                    color: "#1e293b",
                    background: "rgba(255, 255, 255, 0.8)",
                    backdropFilter: "blur(10px)",
                    WebkitBackdropFilter: "blur(10px)",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    lineHeight: "1.6"
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

              {/* Submit Button - Magnetic */}
              <MagneticButton
                type="submit"
                disabled={loading || rating === 0}
                mousePosition={mousePosition}
                style={{
                  width: "100%",
                  padding: "clamp(16px, 2.5vw, 20px)",
                  background: rating === 0 || loading
                    ? "linear-gradient(135deg, #cbd5e1 0%, #94a3b8 100%)"
                    : "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                  color: "white",
                  border: "none",
                  borderRadius: "16px",
                  cursor: rating === 0 || loading ? "not-allowed" : "pointer",
                  fontSize: "clamp(16px, 2.5vw, 18px)",
                  fontWeight: "700",
                  transition: "all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
                  boxShadow: rating === 0 || loading
                    ? "none"
                    : "0 8px 24px rgba(99, 102, 241, 0.4), 0 4px 12px rgba(99, 102, 241, 0.2)",
                  letterSpacing: "-0.01em",
                  opacity: visible ? 1 : 0,
                  transform: visible ? "translateY(0)" : "translateY(20px)",
                  animation: visible ? "fadeInUp 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.6s both" : "none"
                }}
                onMouseEnter={(e) => {
                  if (rating > 0 && !loading) {
                    e.currentTarget.style.boxShadow = "0 12px 32px rgba(99, 102, 241, 0.5), 0 8px 16px rgba(99, 102, 241, 0.3)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (rating > 0 && !loading) {
                    e.currentTarget.style.boxShadow = "0 8px 24px rgba(99, 102, 241, 0.4), 0 4px 12px rgba(99, 102, 241, 0.2)";
                  }
                }}
              >
                {loading ? "Submitting..." : submitted && existingReview ? "Update Review" : "Submit Review"}
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
