import React, { useState, useEffect } from "react";
import axios from "axios";
import Footer from "./Footer";
import ExportButton from "./ExportButton";
import API_URL from "../config";

export default function Slideshow({ photos, locations, routeData, token, user, onClose, onBackToTrip }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [intervalId, setIntervalId] = useState(null);

  const allPhotos = Object.entries(photos || {}).flatMap(([location, locationPhotos]) =>
    locationPhotos.map((photo) => ({ ...photo, location }))
  );

  useEffect(() => {
    if (isPlaying && allPhotos.length > 0) {
      const id = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % allPhotos.length);
      }, 3000);
      setIntervalId(id);
      return () => clearInterval(id);
    } else if (intervalId) {
      clearInterval(intervalId);
    }
  }, [isPlaying, allPhotos.length]);

  if (allPhotos.length === 0) {
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
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "transparent",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          minHeight: "100vh",
          padding: "clamp(24px, 4vw, 48px)",
          paddingTop: "clamp(100px, 12vw, 120px)"
        }}>
          <div style={{
            background: "rgba(255, 255, 255, 0.7)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderRadius: "32px",
            padding: "clamp(48px, 6vw, 64px)",
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(255, 255, 255, 0.5) inset",
            border: "1px solid rgba(255, 255, 255, 0.3)",
            textAlign: "center",
            maxWidth: "600px",
            animation: "fadeInUp 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)"
          }}>
            <h1 style={{ 
              fontSize: "clamp(32px, 5vw, 40px)", 
              fontWeight: "900", 
              marginBottom: "clamp(16px, 3vw, 24px)",
              background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #a855f7 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              letterSpacing: "-0.02em"
            }}>
              End of Trip
            </h1>
            <p style={{ 
              color: "#64748b", 
              marginBottom: "clamp(32px, 4vw, 40px)",
              fontSize: "clamp(15px, 2vw, 16px)",
              lineHeight: "1.6"
            }}>
              No photos to display
            </p>
            <button
              onClick={onBackToTrip || onClose}
              style={{
                padding: "clamp(14px, 2vw, 16px) clamp(32px, 4vw, 40px)",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: "white",
                border: "none",
                borderRadius: "14px",
                cursor: "pointer",
                fontSize: "clamp(14px, 2vw, 15px)",
                fontWeight: "600",
                transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                boxShadow: "0 8px 24px rgba(102, 126, 234, 0.4)"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-3px) scale(1.02)";
                e.currentTarget.style.boxShadow = "0 12px 32px rgba(102, 126, 234, 0.5)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0) scale(1)";
                e.currentTarget.style.boxShadow = "0 8px 24px rgba(102, 126, 234, 0.4)";
              }}
            >
              Back to Trip Planner
            </button>
          </div>
        
        {/* Footer */}
        <footer style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          padding: "40px 24px",
          background: "rgba(79, 70, 229, 0.05)",
          color: "#475569",
          textAlign: "center",
          borderTop: "1px solid rgba(226, 232, 240, 0.5)"
        }}>
          <div style={{ 
            fontSize: "20px", 
            fontWeight: "800", 
            marginBottom: "16px", 
            color: "#667eea",
            letterSpacing: "-0.02em"
          }}>
            TripMate
          </div>
          <p style={{ fontSize: "15px", marginBottom: "24px", color: "#64748b" }}>
            Your all-in-one travel planning companion
          </p>
          <p style={{ fontSize: "13px", color: "#94a3b8" }}>
            © 2026 TripMate. All rights reserved.
          </p>
        </footer>
      </div>
      </>
    );
  }

  const currentPhoto = allPhotos[currentIndex];

  const handleShare = () => {
    // Share functionality - can be implemented later
    alert("Share to Social Media feature coming soon!");
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
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }
      `}</style>
      {/* Backdrop overlay */}
      <div style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "#ffffff",
        zIndex: 9999
      }} />
      <div style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "transparent",
        display: "flex",
        flexDirection: "column",
        zIndex: 10000,
        minHeight: "100vh",
        overflow: "auto",
        paddingTop: "clamp(80px, 10vw, 100px)"
      }}>
        {/* Hero Header Section */}
        <div style={{
          background: "rgba(255, 255, 255, 0.7)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          paddingTop: "clamp(48px, 6vw, 64px)",
          paddingBottom: "clamp(32px, 5vw, 48px)",
          paddingLeft: "clamp(24px, 4vw, 48px)",
          paddingRight: "clamp(24px, 4vw, 48px)",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(255, 255, 255, 0.5) inset",
          borderBottom: "1px solid rgba(255, 255, 255, 0.3)",
          animation: "fadeInUp 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)",
          position: "relative",
          zIndex: 1
        }}>
          <div style={{
            maxWidth: "1400px",
            margin: "0 auto",
            textAlign: "center"
          }}>
            <h1 style={{
              fontSize: "clamp(36px, 6vw, 56px)",
              fontWeight: "900",
              background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #a855f7 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              letterSpacing: "-0.04em",
              marginTop: 0,
              marginBottom: "clamp(12px, 2vw, 16px)",
              marginLeft: 0,
              marginRight: 0,
              lineHeight: "1.1",
              paddingTop: 0
            }}>
              End of Trip
            </h1>
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "clamp(16px, 3vw, 24px)",
              flexWrap: "wrap"
            }}>
              <div style={{
                padding: "clamp(8px, 1.5vw, 12px) clamp(16px, 3vw, 24px)",
                background: "rgba(102, 126, 234, 0.1)",
                borderRadius: "16px",
                border: "1px solid rgba(102, 126, 234, 0.2)",
                fontSize: "clamp(14px, 2vw, 16px)",
                color: "#667eea",
                fontWeight: "600"
              }}>
                {currentIndex + 1} / {allPhotos.length} Photos
              </div>
            </div>
          </div>
        </div>

      {/* Main Content Area */}
      <div style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "clamp(24px, 4vw, 64px) 0",
        maxWidth: "1400px",
        margin: "0 auto",
        width: "100%",
        position: "relative"
      }}>
        {/* Wrapper: nav buttons + 16:9 container */}
        <div style={{
          position: "relative",
          width: "100%",
          maxWidth: "1920px",
          padding: "0 clamp(48px, 8vw, 120px)",
          boxSizing: "border-box"
        }}>
          {/* Left Navigation Arrow */}
          <button
            onClick={() => setCurrentIndex((prev) => (prev - 1 + allPhotos.length) % allPhotos.length)}
            style={{
              position: "absolute",
              left: "clamp(4px, 2vw, 32px)",
              top: "50%",
              transform: "translateY(-50%)",
              background: "rgba(255, 255, 255, 0.9)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              color: "#667eea",
              border: "2px solid rgba(102, 126, 234, 0.2)",
              borderRadius: "50%",
              width: "clamp(40px, 6vw, 64px)",
              height: "clamp(40px, 6vw, 64px)",
              cursor: "pointer",
              fontSize: "clamp(20px, 3vw, 28px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 10,
              boxShadow: "0 8px 24px rgba(102, 126, 234, 0.2)",
              transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "linear-gradient(135deg, #667eea 0%, #764ba2 100%)";
              e.currentTarget.style.color = "white";
              e.currentTarget.style.borderColor = "#667eea";
              e.currentTarget.style.transform = "translateY(-50%) scale(1.1)";
              e.currentTarget.style.boxShadow = "0 12px 32px rgba(102, 126, 234, 0.4)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.9)";
              e.currentTarget.style.color = "#667eea";
              e.currentTarget.style.borderColor = "rgba(102, 126, 234, 0.2)";
              e.currentTarget.style.transform = "translateY(-50%) scale(1)";
              e.currentTarget.style.boxShadow = "0 8px 24px rgba(102, 126, 234, 0.2)";
            }}
          >
            ‹
          </button>

          {/* Central Display Area — 16:9 */}
          <div style={{
            width: "100%",
            aspectRatio: "16 / 9",
            background: "rgba(30, 41, 59, 0.95)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderRadius: "clamp(12px, 2vw, 32px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1) inset",
            overflow: "hidden",
            animation: "slideIn 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s both"
          }}>
            {isPlaying ? (
              <img
                key={currentIndex}
                src={`${API_URL}${currentPhoto.url}`}
                alt={currentPhoto.filename}
                onClick={() => setIsPlaying(false)}
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  cursor: "pointer",
                  animation: "fadeInUp 0.5s ease-out"
                }}
              />
            ) : (
              <button
                onClick={() => setIsPlaying(true)}
                style={{
                  background: "rgba(255, 255, 255, 0.95)",
                  backdropFilter: "blur(10px)",
                  WebkitBackdropFilter: "blur(10px)",
                  border: "none",
                  borderRadius: "50%",
                  width: "clamp(60px, 10vw, 100px)",
                  height: "clamp(60px, 10vw, 100px)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "clamp(24px, 4vw, 40px)",
                  color: "#667eea",
                  zIndex: 10,
                  paddingLeft: "6px",
                  boxShadow: "0 8px 32px rgba(102, 126, 234, 0.3)",
                  transition: "all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
                  animation: "float 3s ease-in-out infinite"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "scale(1.15)";
                  e.currentTarget.style.background = "linear-gradient(135deg, #667eea 0%, #764ba2 100%)";
                  e.currentTarget.style.color = "white";
                  e.currentTarget.style.boxShadow = "0 12px 40px rgba(102, 126, 234, 0.5)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.95)";
                  e.currentTarget.style.color = "#667eea";
                  e.currentTarget.style.boxShadow = "0 8px 32px rgba(102, 126, 234, 0.3)";
                }}
              >
                ▶
              </button>
            )}
          </div>

          {/* Right Navigation Arrow */}
          <button
            onClick={() => setCurrentIndex((prev) => (prev + 1) % allPhotos.length)}
            style={{
              position: "absolute",
              right: "clamp(4px, 2vw, 32px)",
              top: "50%",
              transform: "translateY(-50%)",
              background: "rgba(255, 255, 255, 0.9)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              color: "#667eea",
              border: "2px solid rgba(102, 126, 234, 0.2)",
              borderRadius: "50%",
              width: "clamp(40px, 6vw, 64px)",
              height: "clamp(40px, 6vw, 64px)",
              cursor: "pointer",
              fontSize: "clamp(20px, 3vw, 28px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 10,
              boxShadow: "0 8px 24px rgba(102, 126, 234, 0.2)",
              transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "linear-gradient(135deg, #667eea 0%, #764ba2 100%)";
              e.currentTarget.style.color = "white";
              e.currentTarget.style.borderColor = "#667eea";
              e.currentTarget.style.transform = "translateY(-50%) scale(1.1)";
              e.currentTarget.style.boxShadow = "0 12px 32px rgba(102, 126, 234, 0.4)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.9)";
              e.currentTarget.style.color = "#667eea";
              e.currentTarget.style.borderColor = "rgba(102, 126, 234, 0.2)";
              e.currentTarget.style.transform = "translateY(-50%) scale(1)";
              e.currentTarget.style.boxShadow = "0 8px 24px rgba(102, 126, 234, 0.2)";
            }}
          >
            ›
          </button>
        </div>
      </div>

      {/* Export Button Section */}
      {locations && routeData && token && user && (
        <div style={{
          padding: "clamp(24px, 4vw, 32px)",
          maxWidth: "1400px",
          margin: "0 auto",
          width: "100%",
          animation: "fadeInUp 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.4s both"
        }}>
          <ExportButton
            locations={locations}
            photos={photos}
            routeData={routeData}
            token={token}
            user={user}
          />
        </div>
      )}

      {/* Action Buttons */}
      <div style={{
        padding: "clamp(24px, 4vw, 32px)",
        maxWidth: "1400px",
        margin: "0 auto",
        width: "100%",
        animation: "fadeInUp 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.5s both"
      }}>
        <div style={{
          display: "flex",
          gap: "clamp(12px, 2vw, 16px)",
          justifyContent: "center",
          flexWrap: "wrap"
        }}>
          <button
            onClick={handleShare}
            style={{
              padding: "clamp(14px, 2vw, 16px) clamp(28px, 4vw, 36px)",
              background: "rgba(255, 255, 255, 0.7)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              color: "#667eea",
              border: "2px solid rgba(102, 126, 234, 0.3)",
              borderRadius: "14px",
              cursor: "pointer",
              fontSize: "clamp(14px, 2vw, 15px)",
              fontWeight: "600",
              transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
              boxShadow: "0 4px 16px rgba(0, 0, 0, 0.08)"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "linear-gradient(135deg, #667eea 0%, #764ba2 100%)";
              e.currentTarget.style.color = "white";
              e.currentTarget.style.borderColor = "#667eea";
              e.currentTarget.style.transform = "translateY(-3px) scale(1.02)";
              e.currentTarget.style.boxShadow = "0 8px 24px rgba(102, 126, 234, 0.4)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.7)";
              e.currentTarget.style.color = "#667eea";
              e.currentTarget.style.borderColor = "rgba(102, 126, 234, 0.3)";
              e.currentTarget.style.transform = "translateY(0) scale(1)";
              e.currentTarget.style.boxShadow = "0 4px 16px rgba(0, 0, 0, 0.08)";
            }}
          >
            Share to Social Media
          </button>
          <button
            onClick={onBackToTrip || onClose}
            style={{
              padding: "clamp(14px, 2vw, 16px) clamp(28px, 4vw, 36px)",
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "white",
              border: "none",
              borderRadius: "14px",
              cursor: "pointer",
              fontSize: "clamp(14px, 2vw, 15px)",
              fontWeight: "600",
              transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
              boxShadow: "0 8px 24px rgba(102, 126, 234, 0.4)"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-3px) scale(1.02)";
              e.currentTarget.style.boxShadow = "0 12px 32px rgba(102, 126, 234, 0.5)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0) scale(1)";
              e.currentTarget.style.boxShadow = "0 8px 24px rgba(102, 126, 234, 0.4)";
            }}
          >
            Back to Trip Planner
          </button>
        </div>
      </div>

      <Footer />
      </div>
    </>
  );
}

