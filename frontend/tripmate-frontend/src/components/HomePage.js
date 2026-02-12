import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import Footer from "./Footer";
import tripmateLogo from "../assets/logo/tripmate_logo.png";
import API_URL from "../config";

export default function HomePage({ onGetStarted, onLogin }) {
  const [hoveredCard, setHoveredCard] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const heroRef = useRef(null);
  const featuresRef = useRef(null);
  const testimonialsRef = useRef(null);
  const pricingRef = useRef(null);
  
  // Default fallback reviews shown when DB has no matching reviews
  const fallbackReviews = [
    {
      username: "Nicholas",
      full_name: "Nicholas",
      rating: 5,
      comment: "TripMate made planning my Japan trip so much easier. I just added my stops, it sorted the route, and the AI chat actually gave me solid restaurant picks in Tokyo. Budget tracker was handy too — kept me from overspending on ramen."
    },
    {
      username: "John",
      full_name: "John",
      rating: 5,
      comment: "Used this for a road trip across Europe with friends. Loved being able to upload photos by location and see everything on a timeline after. The whole trip planning flow is clean and simple, no clutter."
    },
    {
      username: "Alexa",
      full_name: "Alexa",
      rating: 4,
      comment: "Really nice app for organising travel. The route planner and weather info saved me a lot of time. Premium was worth it for the video recap — turned all my Bali photos into a highlight reel I could share with family."
    }
  ];

  // Fetch reviews from database
  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/website-reviews/`);
        const allReviews = response.data.reviews || [];
        
        // Filter for specific usernames: Nicholas, John, Alexa
        const targetUsernames = ["nicholas", "john", "alexa"];
        const matched = {};
        
        for (const review of allReviews) {
          const uname = (review.username || "").toLowerCase();
          const fname = (review.full_name || "").toLowerCase();
          
          for (const target of targetUsernames) {
            if (!matched[target] && (uname === target || fname === target || uname.includes(target) || fname.includes(target))) {
              matched[target] = review;
              break;
            }
          }
          if (Object.keys(matched).length >= 3) break;
        }
        
        // Build final list: use DB review if found, otherwise use fallback
        const final = fallbackReviews.map((fb) => {
          const key = fb.username.toLowerCase();
          return matched[key] || fb;
        });
        
        setReviews(final);
      } catch (error) {
        console.error("Error fetching reviews:", error);
        // Use fallback reviews if fetch fails entirely
        setReviews(fallbackReviews);
      } finally {
        setReviewsLoading(false);
      }
    };
    
    fetchReviews();
  }, []);

  // Scroll reveal animations
  useEffect(() => {
    const observerOptions = {
      threshold: 0.05,
      rootMargin: "0px 0px 200px 0px" // Trigger 200px before element enters viewport
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = "1";
          entry.target.style.transform = "translateY(0) scale(1)";
          entry.target.style.transition = "opacity 0.8s cubic-bezier(0.34, 1.56, 0.64, 1), transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)";
        }
      });
    }, observerOptions);

    const refs = [heroRef, featuresRef, testimonialsRef, pricingRef].filter(Boolean);
    refs.forEach((ref) => {
      if (ref.current) {
        observer.observe(ref.current);
        // If element is already in view, trigger immediately
        const rect = ref.current.getBoundingClientRect();
        if (rect.top < window.innerHeight + 200 && rect.bottom > -200) {
          ref.current.style.opacity = "1";
          ref.current.style.transform = "translateY(0) scale(1)";
          ref.current.style.transition = "opacity 0.8s cubic-bezier(0.34, 1.56, 0.64, 1), transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)";
        }
      }
    });

    return () => {
      refs.forEach((ref) => {
        if (ref.current) observer.unobserve(ref.current);
      });
    };
  }, []);

  return (
    <>
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(80px) scale(0.9);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes slideInFromBottom {
          from {
            opacity: 0;
            transform: translateY(100px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.05);
          }
        }
        .features-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: clamp(24px, 4vw, 32px);
        }
        @media (max-width: 1024px) {
          .features-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 768px) {
          .features-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
      <div style={{ 
        minHeight: "100vh", 
        background: "#ffffff",
        position: "relative",
        width: "100%"
      }}>
        {/* Navigation */}
        <nav style={{
          background: "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          padding: "clamp(12px, 2vw, 16px) clamp(16px, 3vw, 24px)",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05), 0 0 0 1px rgba(255, 255, 255, 0.5) inset",
          border: "1px solid rgba(255, 255, 255, 0.3)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          position: "sticky",
          top: 0,
          zIndex: 100,
          flexWrap: "wrap",
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
          <div style={{ display: "flex", gap: "clamp(12px, 2vw, 16px)", alignItems: "center", flexWrap: "wrap" }}>
            <button
              onClick={onLogin}
              style={{
                padding: "clamp(8px, 1.5vw, 10px) clamp(20px, 3vw, 24px)",
                background: "rgba(255, 255, 255, 0.7)",
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
                color: "#64748b",
                border: "1px solid rgba(226, 232, 240, 0.5)",
                borderRadius: "12px",
                cursor: "pointer",
                fontSize: "clamp(13px, 2vw, 14px)",
                fontWeight: "600",
                transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(248, 250, 252, 0.9)";
                e.currentTarget.style.borderColor = "#cbd5e1";
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 8px 24px rgba(0, 0, 0, 0.08)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.7)";
                e.currentTarget.style.borderColor = "rgba(226, 232, 240, 0.5)";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              Log in
            </button>
            <button
              onClick={onGetStarted}
              style={{
                padding: "clamp(10px, 1.5vw, 12px) clamp(24px, 3vw, 28px)",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: "white",
                border: "none",
                borderRadius: "12px",
                cursor: "pointer",
                fontSize: "clamp(13px, 2vw, 14px)",
                fontWeight: "700",
                transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 8px 24px rgba(102, 126, 234, 0.4)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(102, 126, 234, 0.3)";
              }}
            >
              Sign up
            </button>
          </div>
        </nav>

        <div style={{
          width: "100%",
          maxWidth: "1440px",
          margin: "0 auto",
          padding: "clamp(48px, 8vw, 80px) clamp(32px, 6vw, 80px)",
          background: "transparent"
        }}>
          {/* Hero Section */}
          <section 
            ref={heroRef}
            style={{
              textAlign: "center",
              marginBottom: "clamp(64px, 10vw, 96px)",
              opacity: 0,
              transform: "translateY(20px)",
              transition: "opacity 0.4s ease-out, transform 0.4s ease-out"
            }}
          >
            <h1 style={{
              fontSize: "clamp(48px, 8vw, 72px)",
              fontWeight: "900",
              background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #a855f7 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              marginBottom: "clamp(16px, 3vw, 24px)",
              letterSpacing: "-0.04em",
              lineHeight: "1.1",
              animation: "fadeInUp 0.8s ease-out"
            }}>
              One Website for all your travel planning needs
            </h1>
            <p style={{
              fontSize: "clamp(16px, 2.5vw, 20px)",
              color: "#64748b",
              marginBottom: "clamp(32px, 5vw, 48px)",
              lineHeight: "1.7",
              maxWidth: "700px",
              marginLeft: "auto",
              marginRight: "auto",
              fontWeight: "400",
              letterSpacing: "0.02em"
            }}>
              Plan optimized routes, capture your trip memories, and relive your adventures seamlessly - all in one place.
            </p>
            <div style={{ 
              display: "flex", 
              gap: "clamp(16px, 2.5vw, 20px)", 
              justifyContent: "center", 
              flexWrap: "wrap"
            }}>
              <button
                onClick={onGetStarted}
                style={{
                  padding: "clamp(16px, 2.5vw, 20px) clamp(32px, 5vw, 48px)",
                  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  color: "white",
                  border: "none",
                  borderRadius: "16px",
                  cursor: "pointer",
                  fontSize: "clamp(16px, 2.5vw, 18px)",
                  fontWeight: "700",
                  transition: "all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
                  boxShadow: "0 8px 24px rgba(102, 126, 234, 0.4)",
                  letterSpacing: "-0.01em"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-4px) scale(1.02)";
                  e.currentTarget.style.boxShadow = "0 12px 32px rgba(102, 126, 234, 0.5)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0) scale(1)";
                  e.currentTarget.style.boxShadow = "0 8px 24px rgba(102, 126, 234, 0.4)";
                }}
              >
                Start planning
              </button>
              <button
                onClick={onLogin}
                style={{
                  padding: "clamp(16px, 2.5vw, 20px) clamp(32px, 5vw, 48px)",
                  background: "rgba(255, 255, 255, 0.7)",
                  backdropFilter: "blur(20px)",
                  WebkitBackdropFilter: "blur(20px)",
                  color: "#64748b",
                  border: "1px solid rgba(226, 232, 240, 0.5)",
                  borderRadius: "16px",
                  cursor: "pointer",
                  fontSize: "clamp(16px, 2.5vw, 18px)",
                  fontWeight: "600",
                  transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                  letterSpacing: "-0.01em"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.9)";
                  e.currentTarget.style.borderColor = "#cbd5e1";
                  e.currentTarget.style.transform = "translateY(-4px)";
                  e.currentTarget.style.boxShadow = "0 8px 24px rgba(0, 0, 0, 0.08)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.7)";
                  e.currentTarget.style.borderColor = "rgba(226, 232, 240, 0.5)";
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                Log in
              </button>
            </div>
          </section>

          {/* Features Section */}
          <section 
            ref={featuresRef}
            style={{
              marginBottom: "clamp(64px, 10vw, 96px)",
              opacity: 0,
              transform: "translateY(20px)",
              transition: "opacity 0.4s ease-out 0.1s, transform 0.4s ease-out 0.1s"
            }}
          >
            <div style={{ textAlign: "center", marginBottom: "clamp(48px, 6vw, 64px)" }}>
              <h2 style={{
                fontSize: "clamp(36px, 6vw, 48px)",
                fontWeight: "900",
                background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #a855f7 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                marginBottom: "clamp(16px, 2.5vw, 20px)",
                letterSpacing: "-0.03em",
                lineHeight: "1.2"
              }}>
                Your routes and memories in one view
              </h2>
              <p style={{
                fontSize: "clamp(16px, 2.5vw, 18px)",
                color: "#64748b",
                maxWidth: "600px",
                margin: "0 auto",
                lineHeight: "1.6",
                fontWeight: "400"
              }}>
                No more switching between different apps, tabs, and tools to keep track of your travel plans.
              </p>
            </div>

            <div className="features-grid">
              {[
                {
                  iconType: "map",
                  title: "Route Optimization",
                  description: "Auto-arrange the best route for a smooth and efficient trip using advanced algorithms."
                },
                {
                  iconType: "camera",
                  title: "Photo Memories",
                  description: "Upload and organize photos. Create beautiful slideshows of your journey."
                },
                {
                  iconType: "bot",
                  title: "AI Assistant",
                  description: "Ask questions about your destinations and get AI-powered insights."
                },
                {
                  iconType: "budget",
                  title: "Budget Tracking",
                  description: "Set budgets, track expenses, and get alerts when you exceed your spending limits."
                },
                {
                  iconType: "video",
                  title: "Video Export",
                  description: "Export your trip as a beautiful MP4 video recap with photos and route."
                },
                {
                  iconType: "route",
                  title: "Smart Routing",
                  description: "Intelligently chooses between driving and flying based on distance and efficiency."
                }
              ].map((feature, idx) => (
                <div
                  key={idx}
                  style={{
                    background: "rgba(255, 255, 255, 0.7)",
                    backdropFilter: "blur(20px)",
                    WebkitBackdropFilter: "blur(20px)",
                    padding: "clamp(32px, 5vw, 40px)",
                    borderRadius: "24px",
                    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(255, 255, 255, 0.5) inset, 0 4px 16px rgba(0, 0, 0, 0.04)",
                    border: "1px solid rgba(255, 255, 255, 0.3)",
                    transition: "all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
                    textAlign: "center",
                    opacity: 0,
                    transform: "translateY(20px)",
                    animation: `fadeInUp 0.4s ease-out ${0.15 + idx * 0.05}s forwards`
                  }}
                  onMouseEnter={(e) => {
                    setHoveredCard(idx);
                    e.currentTarget.style.transform = "translateY(-12px) scale(1.02) rotateY(2deg)";
                    e.currentTarget.style.boxShadow = "0 24px 64px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(255, 255, 255, 0.6) inset, 0 8px 32px rgba(0, 0, 0, 0.08)";
                    e.currentTarget.style.borderColor = "rgba(102, 126, 234, 0.3)";
                  }}
                  onMouseLeave={(e) => {
                    setHoveredCard(null);
                    e.currentTarget.style.transform = "translateY(0) scale(1) rotateY(0deg)";
                    e.currentTarget.style.boxShadow = "0 8px 32px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(255, 255, 255, 0.5) inset, 0 4px 16px rgba(0, 0, 0, 0.04)";
                    e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.3)";
                  }}
                >
                  <div style={{ 
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    marginBottom: "clamp(20px, 3vw, 24px)",
                    height: "clamp(56px, 7vw, 64px)",
                    transition: "transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
                    transform: hoveredCard === idx ? "scale(1.15) rotate(5deg)" : "scale(1)"
                  }}>
                    <FeatureIcon iconType={feature.iconType} />
                  </div>
                  <h3 style={{
                    fontSize: "clamp(22px, 3vw, 26px)",
                    fontWeight: "800",
                    marginBottom: "clamp(12px, 2vw, 16px)",
                    color: "#1e293b",
                    letterSpacing: "-0.02em",
                    lineHeight: "1.3"
                  }}>
                    {feature.title}
                  </h3>
                  <p style={{
                    fontSize: "clamp(15px, 2vw, 16px)",
                    color: "#64748b",
                    lineHeight: "1.7",
                    fontWeight: "400"
                  }}>
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Testimonials Section */}
          <section 
            ref={testimonialsRef}
            style={{
              marginBottom: "clamp(64px, 10vw, 96px)",
              opacity: 0,
              transform: "translateY(80px) scale(0.95)",
              transition: "opacity 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s, transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s"
            }}
          >
            <div style={{ textAlign: "center", marginBottom: "clamp(48px, 6vw, 64px)" }}>
              <h2 style={{
                fontSize: "clamp(36px, 6vw, 48px)",
                fontWeight: "900",
                background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #a855f7 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                marginBottom: "clamp(16px, 2.5vw, 20px)",
                letterSpacing: "-0.03em",
                lineHeight: "1.2"
              }}>
                What travelers are saying
              </h2>
              <p style={{
                fontSize: "clamp(16px, 2.5vw, 18px)",
                color: "#64748b",
                maxWidth: "600px",
                margin: "0 auto",
                fontWeight: "400"
              }}>
                Join thousands of travelers who are planning better trips with TripMate
              </p>
            </div>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: "clamp(24px, 4vw, 32px)"
            }}>
              {reviewsLoading ? (
                // Loading state - show placeholder cards
                [1, 2, 3].map((idx) => (
                  <div
                    key={idx}
                    style={{
                      background: "rgba(255, 255, 255, 0.7)",
                      backdropFilter: "blur(20px)",
                      WebkitBackdropFilter: "blur(20px)",
                      padding: "clamp(32px, 5vw, 40px)",
                      borderRadius: "24px",
                      boxShadow: "0 8px 32px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(255, 255, 255, 0.5) inset",
                      border: "1px solid rgba(255, 255, 255, 0.3)",
                      minHeight: "200px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#64748b"
                    }}
                  >
                    Loading...
                  </div>
                ))
              ) : reviews.length > 0 ? (
                // Display reviews from database
                reviews.map((review, idx) => (
                <div
                  key={idx}
                  style={{
                    background: "rgba(255, 255, 255, 0.7)",
                    backdropFilter: "blur(20px)",
                    WebkitBackdropFilter: "blur(20px)",
                    padding: "clamp(32px, 5vw, 40px)",
                    borderRadius: "24px",
                    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(255, 255, 255, 0.5) inset",
                    border: "1px solid rgba(255, 255, 255, 0.3)",
                    transition: "all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
                    opacity: 0,
                    transform: "translateY(80px) scale(0.9) rotateX(10deg)",
                    animation: `fadeInUp 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) ${0.3 + idx * 0.15}s forwards`,
                    position: "relative",
                    zIndex: 1
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-12px) scale(1.08)";
                    e.currentTarget.style.boxShadow = "0 24px 80px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.7) inset, 0 12px 48px rgba(0, 0, 0, 0.1)";
                    e.currentTarget.style.borderColor = "rgba(102, 126, 234, 0.4)";
                    e.currentTarget.style.zIndex = "10";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0) scale(1)";
                    e.currentTarget.style.boxShadow = "0 8px 32px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(255, 255, 255, 0.5) inset";
                    e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.3)";
                    e.currentTarget.style.zIndex = "1";
                  }}
                >
                  <div style={{
                    display: "flex",
                    gap: "4px",
                    marginBottom: "clamp(16px, 2.5vw, 20px)"
                  }}>
                    {[...Array(review.rating || 5)].map((_, i) => (
                      <svg key={i} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="#fbbf24" stroke="none" strokeWidth="0" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"/>
                      </svg>
                    ))}
                  </div>
                  <p style={{
                    fontSize: "clamp(15px, 2vw, 16px)",
                    color: "#475569",
                    lineHeight: "1.7",
                    marginBottom: "clamp(16px, 2.5vw, 20px)",
                    fontWeight: "400"
                  }}>
                    {review.comment || review.text || ''}
                  </p>
                  <p style={{
                    fontSize: "clamp(14px, 2vw, 15px)",
                    fontWeight: "600",
                    color: "#1e293b"
                  }}>
                    - {review.full_name || review.username || 'Anonymous'}
                  </p>
                </div>
                ))
              ) : (
                // Fallback if no reviews found
                <div style={{
                  gridColumn: "1 / -1",
                  textAlign: "center",
                  padding: "clamp(32px, 5vw, 40px)",
                  color: "#64748b"
                }}>
                  No reviews available at the moment.
                </div>
              )}
            </div>
          </section>

          {/* Pricing Section */}
          <section 
            ref={pricingRef}
            style={{
              marginBottom: "clamp(64px, 10vw, 96px)",
              opacity: 0,
              transform: "translateY(80px) scale(0.95)",
              transition: "opacity 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s, transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s"
            }}
          >
            <div style={{ textAlign: "center", marginBottom: "clamp(48px, 6vw, 64px)" }}>
              <h2 style={{
                fontSize: "clamp(36px, 6vw, 48px)",
                fontWeight: "900",
                background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #a855f7 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                marginBottom: "clamp(16px, 2.5vw, 20px)",
                letterSpacing: "-0.03em",
                lineHeight: "1.2"
              }}>
                Start Free, Upgrade When Ready
              </h2>
              <p style={{
                fontSize: "clamp(16px, 2.5vw, 18px)",
                color: "#64748b",
                maxWidth: "600px",
                margin: "0 auto",
                fontWeight: "400"
              }}>
                TripMate is free to use with core features. Premium includes unlimited trips and advanced features.
              </p>
            </div>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: "clamp(32px, 5vw, 48px)",
              maxWidth: "900px",
              margin: "0 auto"
            }}>
              {/* Free Plan */}
              <div style={{
                background: "rgba(255, 255, 255, 0.7)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                padding: "clamp(40px, 5vw, 48px)",
                borderRadius: "32px",
                boxShadow: "0 8px 32px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(255, 255, 255, 0.5) inset",
                border: "1px solid rgba(255, 255, 255, 0.3)",
                transition: "all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
                opacity: 0,
                transform: "translateY(80px) scale(0.9) rotateX(10deg)",
                animation: "fadeInUp 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.4s forwards",
                position: "relative",
                zIndex: 1
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-12px) scale(1.08)";
                e.currentTarget.style.boxShadow = "0 24px 80px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.7) inset, 0 12px 48px rgba(0, 0, 0, 0.1)";
                e.currentTarget.style.zIndex = "10";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0) scale(1)";
                e.currentTarget.style.boxShadow = "0 8px 32px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(255, 255, 255, 0.5) inset";
                e.currentTarget.style.zIndex = "1";
              }}
              >
                <h3 style={{
                  fontSize: "clamp(28px, 4vw, 32px)",
                  fontWeight: "800",
                  marginBottom: "clamp(12px, 2vw, 16px)",
                  color: "#1e293b",
                  letterSpacing: "-0.02em"
                }}>
                  Free Plan
                </h3>
                <div style={{
                  fontSize: "clamp(56px, 8vw, 72px)",
                  fontWeight: "900",
                  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  marginBottom: "8px",
                  lineHeight: "1"
                }}>
                  S$0
                </div>
                <p style={{
                  fontSize: "clamp(15px, 2vw, 17px)",
                  color: "#64748b",
                  marginBottom: "clamp(32px, 4vw, 40px)",
                  fontWeight: "400"
                }}>
                  Perfect for getting started
                </p>
                <ul style={{
                  listStyle: "none",
                  padding: 0,
                  margin: 0,
                  marginBottom: "clamp(32px, 4vw, 40px)"
                }}>
                  {["Up to 2 trips per month", "Photo & Video upload (100 MB per trip)", "AI-powered Q&A (5 per trip)", "Budget planning", "Route optimization", "Google Maps integration", "Slideshow generation"].map((item, i) => (
                    <li key={i} style={{ 
                      padding: "clamp(12px, 2vw, 14px) 0", 
                      color: "#475569", 
                      fontSize: "clamp(15px, 2vw, 16px)",
                      fontWeight: "500",
                      borderBottom: i < 6 ? "1px solid rgba(226, 232, 240, 0.5)" : "none" 
                    }}>
                      {item}
                    </li>
                  ))}
                </ul>
                <p style={{
                  fontSize: "clamp(12px, 1.5vw, 13px)",
                  color: "#94a3b8",
                  textAlign: "center",
                  fontWeight: "400"
                }}>
                  No credit card required • Always free
                </p>
              </div>

              {/* Premium Plan */}
              <div style={{
                background: "rgba(255, 255, 255, 0.7)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                padding: "clamp(40px, 5vw, 48px)",
                borderRadius: "32px",
                boxShadow: "0 20px 60px rgba(99, 102, 241, 0.2), 0 0 0 2px rgba(99, 102, 241, 0.3) inset, 0 8px 32px rgba(0, 0, 0, 0.04)",
                border: "2px solid rgba(99, 102, 241, 0.3)",
                position: "relative",
                transition: "all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
                opacity: 0,
                transform: "translateY(80px) scale(0.9) rotateX(-10deg)",
                animation: "fadeInUp 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.5s forwards"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-16px) scale(1.1)";
                e.currentTarget.style.boxShadow = "0 32px 100px rgba(99, 102, 241, 0.4), 0 0 0 2px rgba(99, 102, 241, 0.5) inset, 0 16px 64px rgba(0, 0, 0, 0.12)";
                e.currentTarget.style.borderColor = "rgba(99, 102, 241, 0.6)";
                e.currentTarget.style.zIndex = "10";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0) scale(1)";
                e.currentTarget.style.boxShadow = "0 20px 60px rgba(99, 102, 241, 0.2), 0 0 0 2px rgba(99, 102, 241, 0.3) inset, 0 8px 32px rgba(0, 0, 0, 0.04)";
                e.currentTarget.style.borderColor = "rgba(99, 102, 241, 0.3)";
                e.currentTarget.style.zIndex = "1";
              }}
              >
                <div style={{
                  position: "absolute",
                  top: "-16px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  color: "white",
                  padding: "8px 24px",
                  borderRadius: "24px",
                  fontSize: "clamp(12px, 1.5vw, 13px)",
                  fontWeight: "700",
                  boxShadow: "0 4px 16px rgba(102, 126, 234, 0.4)"
                }}>
                  POPULAR
                </div>
                <h3 style={{
                  fontSize: "clamp(28px, 4vw, 32px)",
                  fontWeight: "800",
                  marginTop: "clamp(8px, 1.5vw, 12px)",
                  marginBottom: "clamp(12px, 2vw, 16px)",
                  color: "#1e293b",
                  letterSpacing: "-0.02em"
                }}>
                  Premium Plan
                </h3>
                <div style={{
                  fontSize: "clamp(56px, 8vw, 72px)",
                  fontWeight: "900",
                  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  marginBottom: "8px",
                  lineHeight: "1"
                }}>
                  S$9.99<span style={{ fontSize: "clamp(18px, 3vw, 24px)", color: "#64748b", fontWeight: "400" }}>/month</span>
                </div>
                <p style={{
                  fontSize: "clamp(15px, 2vw, 17px)",
                  color: "#64748b",
                  marginBottom: "clamp(32px, 4vw, 40px)",
                  fontWeight: "400"
                }}>
                  For serious travelers
                </p>
                <ul style={{
                  listStyle: "none",
                  padding: 0,
                  margin: 0,
                  marginBottom: "clamp(32px, 4vw, 40px)"
                }}>
                  {["Everything in Free, plus:", "Unlimited trips (no monthly limit)", "Unlimited AI-powered Q&A", "1GB Photo & Video uploads", "Export trip recap to MP4"].map((item, i) => (
                    <li key={i} style={{ 
                      padding: "clamp(12px, 2vw, 14px) 0", 
                      color: "#475569", 
                      fontSize: "clamp(15px, 2vw, 16px)",
                      fontWeight: i === 0 ? "700" : "500",
                      borderBottom: i < 4 ? "1px solid rgba(226, 232, 240, 0.5)" : "none" 
                    }}>
                      {item}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={onGetStarted}
                  style={{
                    width: "100%",
                    padding: "clamp(16px, 2.5vw, 18px)",
                    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    color: "white",
                    border: "none",
                    borderRadius: "16px",
                    cursor: "pointer",
                    fontSize: "clamp(16px, 2.5vw, 18px)",
                    fontWeight: "700",
                    transition: "all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
                    boxShadow: "0 8px 24px rgba(102, 126, 234, 0.4), 0 4px 12px rgba(102, 126, 234, 0.2)",
                    marginBottom: "clamp(16px, 2vw, 20px)",
                    letterSpacing: "-0.01em"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 12px 32px rgba(102, 126, 234, 0.5), 0 8px 16px rgba(102, 126, 234, 0.3)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 8px 24px rgba(102, 126, 234, 0.4), 0 4px 12px rgba(102, 126, 234, 0.2)";
                  }}
                >
                  Get Premium
                </button>
                <p style={{
                  fontSize: "clamp(12px, 1.5vw, 13px)",
                  color: "#94a3b8",
                  textAlign: "center",
                  fontWeight: "400"
                }}>
                  S$9.99/month • Cancel anytime
                </p>
              </div>
            </div>
          </section>
        </div>

        <div style={{ marginTop: "clamp(48px, 8vw, 96px)" }}>
          <Footer />
        </div>
      </div>
    </>
  );
}

// Feature Icon Component
function FeatureIcon({ iconType }) {
  const iconSize = "clamp(40px, 6vw, 48px)";
  const iconColor = "#667eea";

  if (iconType === "map") {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: iconColor }}>
        <path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z"/>
        <path d="M15 5.764v15"/>
        <path d="M9 3.236v15"/>
      </svg>
    );
  }
  if (iconType === "camera") {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: iconColor }}>
        <path d="M13.997 4a2 2 0 0 1 1.76 1.05l.486.9A2 2 0 0 0 18.003 7H20a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1.997a2 2 0 0 0 1.759-1.048l.489-.904A2 2 0 0 1 10.004 4z"/>
        <circle cx="12" cy="13" r="3"/>
      </svg>
    );
  }
  if (iconType === "bot") {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: iconColor }}>
        <path d="M12 8V4H8"/>
        <rect width="16" height="12" x="4" y="8" rx="2"/>
        <path d="M2 14h2"/>
        <path d="M20 14h2"/>
        <path d="M15 13v2"/>
        <path d="M9 13v2"/>
      </svg>
    );
  }
  if (iconType === "budget") {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: iconColor }}>
        <circle cx="12" cy="12" r="10"/>
        <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/>
        <path d="M12 18V6"/>
      </svg>
    );
  }
  if (iconType === "video") {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: iconColor }}>
        <path d="M20.2 6 3 11l-.9-2.4c-.3-1.1.3-2.2 1.3-2.5l13.5-4c1.1-.3 2.2.3 2.5 1.3Z"/>
        <path d="m6.2 5.3 3.1 3.9"/>
        <path d="m12.4 3.4 3.1 4"/>
        <path d="M3 11h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>
      </svg>
    );
  }
  if (iconType === "route") {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: iconColor }}>
        <path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z"/>
        <path d="M15 5.764v15"/>
        <path d="M9 3.236v15"/>
      </svg>
    );
  }
  return null;
}
