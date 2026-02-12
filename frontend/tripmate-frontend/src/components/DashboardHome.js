import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import API_URL from "../config";

export default function DashboardHome({ token, user, onCreateNew, onNavigateToTrips, onNavigateToMemories }) {
  const [recentTrips, setRecentTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [allPhotos, setAllPhotos] = useState([]);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const heroCardRef = useRef(null);
  const memoriesCardRef = useRef(null);
  const premiumCardRef = useRef(null);
  const recentTripsRef = useRef(null);

  useEffect(() => {
    loadRecentTrips();
    fetchAllPhotos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const fetchAllPhotos = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/photos/user/all`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Flatten all photos from all trips
      const flattened = [];
      if (response.data.photos_by_trip) {
        response.data.photos_by_trip.forEach(trip => {
          trip.photos.forEach(photo => {
            flattened.push({ ...photo, trip_name: trip.trip_name, trip_id: trip.trip_id });
          });
        });
      }
      setAllPhotos(flattened);
    } catch (error) {
      console.error('Error fetching photos:', error);
      // Silently fail - don't show error if photos can't be loaded
    }
  };

  // Auto-advance slideshow
  useEffect(() => {
    if (allPhotos.length > 1) {
      const interval = setInterval(() => {
        setCurrentPhotoIndex((prev) => (prev + 1) % allPhotos.length);
      }, 3000); // Change photo every 3 seconds
      return () => clearInterval(interval);
    }
  }, [allPhotos.length]);

  // Scroll reveal animations
  useEffect(() => {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: "0px 0px -50px 0px"
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = "1";
          entry.target.style.transform = "translateY(0)";
        }
      });
    }, observerOptions);

    const refs = [heroCardRef, memoriesCardRef, premiumCardRef, recentTripsRef].filter(Boolean);
    refs.forEach((ref) => {
      if (ref.current) {
        observer.observe(ref.current);
        // If element is already in view, trigger immediately
        const rect = ref.current.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) {
          ref.current.style.opacity = "1";
          ref.current.style.transform = "translateY(0)";
        }
      }
    });

    return () => {
      refs.forEach((ref) => {
        if (ref.current) observer.unobserve(ref.current);
      });
    };
  }, []);

  // Animated mesh gradient for hero card
  useEffect(() => {
    if (!heroCardRef.current) return;
    
    let animationFrame;
    let time = 0;
    
    const animate = () => {
      time += 0.005;
      const gradient = `
        radial-gradient(circle at ${50 + Math.sin(time) * 20}% ${50 + Math.cos(time) * 20}%, rgba(102, 126, 234, 0.4) 0%, transparent 50%),
        radial-gradient(circle at ${30 + Math.cos(time * 1.2) * 15}% ${70 + Math.sin(time * 1.2) * 15}%, rgba(118, 75, 162, 0.3) 0%, transparent 50%),
        radial-gradient(circle at ${70 + Math.sin(time * 0.8) * 10}% ${30 + Math.cos(time * 0.8) * 10}%, rgba(240, 147, 251, 0.25) 0%, transparent 50%),
        linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)
      `;
      if (heroCardRef.current) {
        heroCardRef.current.style.background = gradient;
      }
      animationFrame = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
    };
  }, []);

  const loadRecentTrips = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/trips/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const sorted = res.data.trips.sort((a, b) => {
        const dateA = new Date(a.created_at || a.updated_at || 0);
        const dateB = new Date(b.created_at || b.updated_at || 0);
        return dateB - dateA;
      });
      setRecentTrips(sorted.slice(0, 3));
    } catch (err) {
      console.error("Error loading trips:", err);
    } finally {
      setLoading(false);
    }
  };

  // Ensure Recent Trips section becomes visible after loading
  useEffect(() => {
    if (!loading && recentTripsRef.current) {
      const timer = setTimeout(() => {
        if (recentTripsRef.current) {
          recentTripsRef.current.style.opacity = "1";
          recentTripsRef.current.style.transform = "translateY(0)";
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [loading]);

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
        .dashboard-bento-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: clamp(24px, 4vw, 32px);
        }
        .dashboard-recent-trips-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: clamp(24px, 4vw, 32px);
        }
        @media (max-width: 1024px) {
          .dashboard-bento-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 768px) {
          .dashboard-bento-grid {
            grid-template-columns: 1fr;
          }
          .dashboard-recent-trips-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
      <div style={{ 
        width: "100%", 
        position: "relative", 
        zIndex: 1,
        background: "transparent"
      }}>
        <div style={{ 
          width: "100%",
          maxWidth: "1440px", 
          margin: "0 auto", 
          padding: "clamp(24px, 8vw, 80px) clamp(16px, 6vw, 80px)", 
          background: "transparent",
          flex: "1 0 auto", 
          display: "flex", 
          flexDirection: "column",
          minHeight: 0
        }}>
          {/* Hero Section */}
          <div style={{ 
            marginBottom: "clamp(64px, 10vw, 96px)",
            animation: "fadeInUp 0.8s ease-out"
          }}>
            <h1 style={{
              fontSize: "clamp(48px, 8vw, 72px)",
              fontWeight: "900",
              background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #a855f7 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              marginBottom: "clamp(16px, 3vw, 24px)",
              letterSpacing: "-0.04em",
              lineHeight: "1.1"
            }}>
              Welcome back, {user.full_name || user.username}! 👋
            </h1>
            <p style={{
              fontSize: "clamp(16px, 2.5vw, 20px)",
              color: "#64748b",
              fontWeight: "400",
              lineHeight: "1.7",
              letterSpacing: "0.02em"
            }}>
              Here's an overview of your travel plans and recent activity
            </p>
          </div>

          {/* Bento Grid */}
          <div className="dashboard-bento-grid" style={{
            marginBottom: "clamp(64px, 10vw, 96px)",
            width: "100%"
          }}>
            {/* Hero Card - Plan Your Trip */}
            <div 
              ref={heroCardRef}
              style={{
                gridColumn: "span 1",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)",
                borderRadius: "32px",
                padding: "clamp(40px, 6vw, 64px)",
                boxShadow: "0 20px 60px rgba(102, 126, 234, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1) inset, 0 8px 32px rgba(0, 0, 0, 0.1)",
                border: "none",
                color: "white",
                position: "relative",
                overflow: "hidden",
                cursor: "pointer",
                transition: "all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
                opacity: 0,
                transform: "translateY(40px)",
                animation: "fadeInUp 0.8s ease-out 0.1s forwards"
              }}
              onClick={() => onCreateNew()}
              onMouseEnter={(e) => {
                setHoveredCard("hero");
                e.currentTarget.style.transform = "translateY(-12px) scale(1.02) rotateY(2deg)";
                e.currentTarget.style.boxShadow = "0 32px 80px rgba(102, 126, 234, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.2) inset, 0 12px 48px rgba(0, 0, 0, 0.15)";
              }}
              onMouseLeave={(e) => {
                setHoveredCard(null);
                e.currentTarget.style.transform = "translateY(0) scale(1) rotateY(0deg)";
                e.currentTarget.style.boxShadow = "0 20px 60px rgba(102, 126, 234, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1) inset, 0 8px 32px rgba(0, 0, 0, 0.1)";
              }}
            >
              <div style={{
                marginBottom: "clamp(24px, 4vw, 32px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-start",
                transition: "transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
                transform: hoveredCard === "hero" ? "scale(1.15) rotate(5deg)" : "scale(1)"
              }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "white", opacity: "0.95" }}>
                  <path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z"/>
                  <path d="M15 5.764v15"/>
                  <path d="M9 3.236v15"/>
                </svg>
              </div>
              <h3 style={{
                fontSize: "clamp(32px, 5vw, 40px)",
                fontWeight: "800",
                color: "white",
                marginBottom: "clamp(12px, 2vw, 16px)",
                letterSpacing: "-0.02em",
                lineHeight: "1.2"
              }}>
                Plan Your Trip
              </h3>
              <p style={{
                fontSize: "clamp(16px, 2.5vw, 18px)",
                color: "rgba(255, 255, 255, 0.95)",
                marginBottom: "clamp(32px, 5vw, 40px)",
                lineHeight: "1.7",
                fontWeight: "400"
              }}>
                Create a new trip and start planning your adventure
              </p>
              <div style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "12px",
                padding: "clamp(14px, 2.5vw, 18px) clamp(28px, 4vw, 36px)",
                background: "rgba(255, 255, 255, 0.25)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                borderRadius: "16px",
                fontSize: "clamp(15px, 2vw, 17px)",
                fontWeight: "700",
                border: "1px solid rgba(255, 255, 255, 0.4)",
                transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                position: "relative",
                overflow: "hidden"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.35)";
                e.currentTarget.style.transform = "translateX(4px)";
                e.currentTarget.style.boxShadow = "0 8px 24px rgba(255, 255, 255, 0.2)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.25)";
                e.currentTarget.style.transform = "translateX(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
              >
                Get Started →
              </div>
            </div>

            {/* Memories Card - Glassmorphism */}
            <div 
              ref={memoriesCardRef}
              style={{
                background: "rgba(255, 255, 255, 0.7)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                borderRadius: "32px",
                padding: "clamp(32px, 5vw, 48px)",
                boxShadow: "0 8px 32px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(255, 255, 255, 0.5) inset, 0 4px 16px rgba(0, 0, 0, 0.04)",
                border: "1px solid rgba(255, 255, 255, 0.3)",
                transition: "all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
                cursor: "pointer",
                opacity: 0,
                transform: "translateY(40px)",
                animation: "fadeInUp 0.8s ease-out 0.2s forwards"
              }}
              onClick={() => onCreateNew()}
              onMouseEnter={(e) => {
                setHoveredCard("memories");
                e.currentTarget.style.transform = "translateY(-12px) scale(1.03) rotateY(-2deg)";
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
                width: "72px",
                height: "72px",
                borderRadius: "20px",
                background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "clamp(24px, 4vw, 32px)",
                transition: "transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
                transform: hoveredCard === "memories" ? "scale(1.15) rotate(-5deg)" : "scale(1)",
                boxShadow: "0 8px 24px rgba(240, 147, 251, 0.3)"
              }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "white" }}>
                  <path d="M13.997 4a2 2 0 0 1 1.76 1.05l.486.9A2 2 0 0 0 18.003 7H20a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1.997a2 2 0 0 0 1.759-1.048l.489-.904A2 2 0 0 1 10.004 4z"/>
                  <circle cx="12" cy="13" r="3"/>
                </svg>
              </div>
              <h3 style={{
                fontSize: "clamp(24px, 4vw, 28px)",
                fontWeight: "800",
                color: "#0f172a",
                marginBottom: "clamp(20px, 3vw, 24px)",
                letterSpacing: "-0.02em"
              }}>
                Your Memories
              </h3>
              {allPhotos.length > 0 ? (
                <div style={{
                  width: "100%",
                  height: "200px",
                  borderRadius: "16px",
                  overflow: "hidden",
                  position: "relative",
                  background: "#e2e8f0",
                  boxShadow: "0 4px 16px rgba(0, 0, 0, 0.1)"
                }}>
                  {allPhotos.map((photo, index) => {
                    const isVideo = photo.media_type === 'video' || 
                                   photo.filename?.toLowerCase().endsWith('.mp4') || 
                                   photo.filename?.toLowerCase().endsWith('.mov') ||
                                   photo.url?.includes('.mp4') || 
                                   photo.url?.includes('.mov');
                    
                    return (
                      <div
                        key={photo.id}
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          width: "100%",
                          height: "100%",
                          opacity: index === currentPhotoIndex ? 1 : 0,
                          transition: "opacity 0.8s ease-in-out",
                          pointerEvents: index === currentPhotoIndex ? "auto" : "none"
                        }}
                      >
                        {isVideo ? (
                          <video
                            src={`${API_URL}${photo.url}`}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover"
                            }}
                            muted
                            playsInline
                          />
                        ) : (
                          <img
                            src={`${API_URL}${photo.url}`}
                            alt={photo.filename || "Memory"}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover"
                            }}
                          />
                        )}
                      </div>
                    );
                  })}
                  {/* Photo counter */}
                  <div style={{
                    position: "absolute",
                    bottom: "12px",
                    right: "12px",
                    background: "rgba(0, 0, 0, 0.6)",
                    backdropFilter: "blur(10px)",
                    WebkitBackdropFilter: "blur(10px)",
                    color: "white",
                    padding: "6px 12px",
                    borderRadius: "20px",
                    fontSize: "12px",
                    fontWeight: "600"
                  }}>
                    {currentPhotoIndex + 1} / {allPhotos.length}
                  </div>
                </div>
              ) : (
                <div style={{
                  width: "100%",
                  height: "200px",
                  borderRadius: "16px",
                  background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "2px dashed #cbd5e1"
                }}>
                  <p style={{
                    color: "#94a3b8",
                    fontSize: "14px",
                    fontWeight: "500"
                  }}>
                    Start a trip to create memories
                  </p>
                </div>
              )}
            </div>

            {/* Premium Card - Glassmorphism */}
            {!!user.is_premium && (
              <div 
                ref={premiumCardRef}
                style={{
                  background: "rgba(255, 255, 255, 0.7)",
                  backdropFilter: "blur(20px)",
                  WebkitBackdropFilter: "blur(20px)",
                  borderRadius: "32px",
                  padding: "clamp(32px, 5vw, 48px)",
                  boxShadow: "0 8px 32px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(255, 255, 255, 0.5) inset, 0 4px 16px rgba(0, 0, 0, 0.04)",
                  border: "1px solid rgba(255, 255, 255, 0.3)",
                  transition: "all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
                  cursor: "pointer",
                  opacity: 0,
                  transform: "translateY(40px)",
                  animation: "fadeInUp 0.8s ease-out 0.3s forwards"
                }}
                onMouseEnter={(e) => {
                  setHoveredCard("premium");
                  e.currentTarget.style.transform = "translateY(-12px) scale(1.03) rotateY(2deg)";
                  e.currentTarget.style.boxShadow = "0 24px 64px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(255, 255, 255, 0.6) inset, 0 8px 32px rgba(0, 0, 0, 0.08)";
                  e.currentTarget.style.borderColor = "rgba(251, 191, 36, 0.3)";
                }}
                onMouseLeave={(e) => {
                  setHoveredCard(null);
                  e.currentTarget.style.transform = "translateY(0) scale(1) rotateY(0deg)";
                  e.currentTarget.style.boxShadow = "0 8px 32px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(255, 255, 255, 0.5) inset, 0 4px 16px rgba(0, 0, 0, 0.04)";
                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.3)";
                }}
              >
                <div style={{
                  width: "72px",
                  height: "72px",
                  borderRadius: "20px",
                  background: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "clamp(24px, 4vw, 32px)",
                  transition: "transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
                  transform: hoveredCard === "premium" ? "scale(1.15) rotate(5deg)" : "scale(1)",
                  boxShadow: "0 8px 24px rgba(251, 191, 36, 0.3)"
                }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="#fbbf24" stroke="none" strokeWidth="0" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"/>
                  </svg>
                </div>
                <h3 style={{
                  fontSize: "clamp(24px, 4vw, 28px)",
                  fontWeight: "800",
                  color: "#0f172a",
                  marginBottom: "clamp(12px, 2vw, 16px)",
                  letterSpacing: "-0.02em"
                }}>
                  Premium Features
                </h3>
                <p style={{
                  fontSize: "clamp(15px, 2vw, 16px)",
                  color: "#64748b",
                  marginBottom: "clamp(24px, 4vw, 32px)",
                  lineHeight: "1.7",
                  fontWeight: "400"
                }}>
                  Access AI chat and video exports
                </p>
                <div style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "clamp(10px, 2vw, 12px) clamp(20px, 3vw, 24px)",
                  background: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)",
                  borderRadius: "14px",
                  fontSize: "clamp(13px, 2vw, 14px)",
                  color: "white",
                  fontWeight: "700",
                  boxShadow: "0 4px 16px rgba(251, 191, 36, 0.3)",
                  animation: "pulse 2s ease-in-out infinite"
                }}>
                  ✓ Premium Active
                </div>
              </div>
            )}
          </div>

          {/* Recent Trips Section */}
          {!loading && (
            <div 
              ref={recentTripsRef}
              style={{
                opacity: 0,
                transform: "translateY(40px)",
                transition: "opacity 0.8s ease-out 0.4s, transform 0.8s ease-out 0.4s",
                marginTop: "clamp(64px, 10vw, 96px)",
                width: "100%"
              }}
            >
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "clamp(32px, 5vw, 48px)"
              }}>
                <h2 style={{
                  fontSize: "clamp(32px, 5vw, 40px)",
                  fontWeight: "900",
                  background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #a855f7 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  letterSpacing: "-0.03em",
                  lineHeight: "1.2"
                }}>
                  Recent Trips
                </h2>
                {recentTrips.length > 0 && (
                  <button
                    onClick={() => onNavigateToTrips && onNavigateToTrips()}
                    style={{
                      padding: "clamp(12px, 2vw, 14px) clamp(24px, 4vw, 28px)",
                      background: "transparent",
                      color: "#667eea",
                      border: "2px solid #667eea",
                      borderRadius: "14px",
                      fontSize: "clamp(14px, 2vw, 15px)",
                      fontWeight: "700",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "linear-gradient(135deg, #667eea 0%, #764ba2 100%)";
                      e.currentTarget.style.color = "white";
                      e.currentTarget.style.transform = "translateX(4px)";
                      e.currentTarget.style.boxShadow = "0 8px 24px rgba(102, 126, 234, 0.3)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = "#667eea";
                      e.currentTarget.style.transform = "translateX(0)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    View All <span>→</span>
                  </button>
                )}
              </div>
              {recentTrips.length > 0 ? (
                <div className="dashboard-recent-trips-grid">
                  {recentTrips.map((trip, idx) => (
                    <div
                      key={trip.id}
                      onClick={() => onCreateNew(trip.id)}
                      style={{
                        background: "rgba(255, 255, 255, 0.7)",
                        backdropFilter: "blur(20px)",
                        WebkitBackdropFilter: "blur(20px)",
                        borderRadius: "24px",
                        padding: "clamp(32px, 5vw, 40px)",
                        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(255, 255, 255, 0.5) inset, 0 4px 16px rgba(0, 0, 0, 0.04)",
                        border: "1px solid rgba(255, 255, 255, 0.3)",
                        cursor: "pointer",
                        transition: "all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
                        position: "relative",
                        overflow: "hidden",
                        opacity: 0,
                        transform: "translateY(30px)",
                        animation: `fadeInUp 0.6s ease-out ${0.5 + idx * 0.1}s forwards`
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-8px) scale(1.02)";
                        e.currentTarget.style.boxShadow = "0 20px 60px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(255, 255, 255, 0.6) inset, 0 8px 32px rgba(0, 0, 0, 0.08)";
                        e.currentTarget.style.borderColor = "rgba(102, 126, 234, 0.3)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0) scale(1)";
                        e.currentTarget.style.boxShadow = "0 8px 32px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(255, 255, 255, 0.5) inset, 0 4px 16px rgba(0, 0, 0, 0.04)";
                        e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.3)";
                      }}
                    >
                      <h3 style={{
                        fontSize: "clamp(24px, 4vw, 28px)",
                        fontWeight: "800",
                        color: "#0f172a",
                        marginBottom: "clamp(20px, 3vw, 24px)",
                        letterSpacing: "-0.02em",
                        lineHeight: "1.2"
                      }}>
                        {trip.name}
                      </h3>
                      {trip.origin && (
                        <div style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                          marginBottom: "clamp(12px, 2vw, 16px)"
                        }}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#667eea", flexShrink: 0 }}>
                            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
                            <circle cx="12" cy="10" r="3"/>
                          </svg>
                          <p style={{
                            fontSize: "clamp(15px, 2vw, 16px)",
                            color: "#475569",
                            margin: 0,
                            fontWeight: "500"
                          }}>
                            <span style={{ fontWeight: "700", color: "#667eea", marginRight: "6px" }}>From:</span> {trip.origin.name || "Unknown"}
                          </p>
                        </div>
                      )}
                      {trip.destinations && trip.destinations.length > 0 && (
                        <div style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                          marginBottom: "clamp(20px, 3vw, 24px)"
                        }}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#764ba2", flexShrink: 0 }}>
                            <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>
                          </svg>
                          <p style={{
                            fontSize: "clamp(15px, 2vw, 16px)",
                            color: "#475569",
                            margin: 0,
                            fontWeight: "500"
                          }}>
                            <span style={{ fontWeight: "700", color: "#764ba2", marginRight: "6px" }}>To:</span> {trip.destinations.map(d => d.name).filter(Boolean).join(", ") || "Unknown"}
                          </p>
                        </div>
                      )}
                      {trip.end_date && (
                        <div style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "8px",
                          padding: "clamp(8px, 1.5vw, 10px) clamp(16px, 3vw, 20px)",
                          background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                          color: "white",
                          borderRadius: "20px",
                          fontSize: "clamp(12px, 2vw, 13px)",
                          fontWeight: "700",
                          boxShadow: "0 4px 16px rgba(16, 185, 129, 0.3)",
                          animation: "pulse 2s ease-in-out infinite"
                        }}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                          Completed
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{
                  background: "rgba(255, 255, 255, 0.7)",
                  backdropFilter: "blur(20px)",
                  WebkitBackdropFilter: "blur(20px)",
                  borderRadius: "24px",
                  padding: "clamp(48px, 6vw, 64px)",
                  textAlign: "center",
                  boxShadow: "0 8px 32px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(255, 255, 255, 0.5) inset",
                  border: "1px solid rgba(255, 255, 255, 0.3)"
                }}>
                  <p style={{
                    fontSize: "clamp(18px, 3vw, 22px)",
                    color: "#64748b",
                    marginBottom: "clamp(16px, 2.5vw, 20px)",
                    fontWeight: "500"
                  }}>
                    No trips yet. Start planning your first adventure!
                  </p>
                  <button
                    onClick={() => onCreateNew()}
                    style={{
                      padding: "clamp(14px, 2.5vw, 18px) clamp(28px, 4vw, 36px)",
                      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                      color: "white",
                      border: "none",
                      borderRadius: "14px",
                      fontSize: "clamp(15px, 2vw, 16px)",
                      fontWeight: "700",
                      cursor: "pointer",
                      transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                      boxShadow: "0 8px 24px rgba(102, 126, 234, 0.3)"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.boxShadow = "0 12px 32px rgba(102, 126, 234, 0.4)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "0 8px 24px rgba(102, 126, 234, 0.3)";
                    }}
                  >
                    Create Your First Trip
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
