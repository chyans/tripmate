import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import API_URL from "../config";

export default function EndOfTripSlideshow({ photos, tripName, locations, routeData, token, user, onBackToPlanner, onShare }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const intervalIdRef = useRef(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const allPhotos = Object.entries(photos || {}).flatMap(([location, locationPhotos]) =>
    locationPhotos.map((photo) => ({ ...photo, location }))
  );

  useEffect(() => {
    if (isPlaying && allPhotos.length > 0) {
      intervalIdRef.current = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % allPhotos.length);
      }, 4000);
      return () => {
        if (intervalIdRef.current) {
          clearInterval(intervalIdRef.current);
        }
      };
    } else if (intervalIdRef.current) {
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }
  }, [isPlaying, allPhotos.length]);

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + allPhotos.length) % allPhotos.length);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % allPhotos.length);
  };

  const handleExport = async () => {
    if (Object.keys(photos || {}).length === 0) {
      alert("No photos to export");
      return;
    }

    setIsExporting(true);
    setExportProgress(10);

    try {
      setExportProgress(20);
      const response = await axios.post(
        `${API_URL}/api/export/video`,
        {
          locations: locations || [],
          photos: photos,
          routeData: routeData || {}
        },
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: "blob",
          timeout: 300000,
          onDownloadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percentCompleted = Math.round(
                20 + (progressEvent.loaded * 80) / progressEvent.total
              );
              setExportProgress(percentCompleted);
            } else {
              setExportProgress(50);
            }
          }
        }
      );

      setExportProgress(90);
      
      const contentType = response.headers['content-type'] || '';
      if (contentType.includes('application/json')) {
        const text = await response.data.text();
        const error = JSON.parse(text);
        throw new Error(error.error || "Export failed");
      }
      
      if (!contentType.includes('video') && !contentType.includes('application/octet-stream')) {
        const text = await response.data.text();
        try {
          const error = JSON.parse(text);
          throw new Error(error.error || "Export failed");
        } catch {
          throw new Error("Invalid response from server");
        }
      }

      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      const optimizedRoute = routeData?.optimizedRoute || [];
      const destinationName = optimizedRoute.length > 0 ? optimizedRoute[optimizedRoute.length - 1]?.name : (tripName || "trip");
      link.setAttribute("download", `${destinationName}-recap-${Date.now()}.mp4`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setExportProgress(100);
      setTimeout(() => {
        alert("Video exported successfully! Check your downloads folder.");
      }, 500);
    } catch (error) {
      console.error("Error exporting video:", error);
      let errorMessage = "Failed to export video. ";
      if (error.response?.data) {
        if (error.response.data instanceof Blob) {
          try {
            const text = await error.response.data.text();
            const errorData = JSON.parse(text);
            errorMessage += errorData.error || "";
          } catch {
            errorMessage += "Please try again.";
          }
        } else {
          errorMessage += error.response.data.error || "Please try again.";
        }
      } else {
        errorMessage += error.message || "Please try again.";
      }
      alert(errorMessage);
    } finally {
      setIsExporting(false);
      setTimeout(() => setExportProgress(0), 2000);
    }
  };

  if (allPhotos.length === 0) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "#0f172a",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "white",
        padding: "16px"
      }}>
        <div style={{ textAlign: "center" }}>
          <h2 style={{ fontSize: "24px", marginBottom: "16px" }}>No photos to display</h2>
          <button
            onClick={onBackToPlanner}
            style={{
              padding: "12px 24px",
              background: "#667eea",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "600"
            }}
          >
            Back to Trip Planner
          </button>
        </div>
      </div>
    );
  }

  const currentPhoto = allPhotos[currentIndex];
  const canExport = (user?.is_premium || user?.is_admin) && !isExporting;

  return (
    <div style={{
      height: "100vh",
      background: "#0f172a",
      display: "flex",
      flexDirection: "column",
      color: "white",
      overflow: "auto"
    }}>
      {/* Header */}
      <div style={{
        padding: isMobile ? "12px 16px" : "24px 32px",
        borderBottom: "1px solid rgba(255,255,255,0.1)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "12px"
      }}>
        <div style={{ minWidth: 0 }}>
          <h1 style={{
            fontSize: isMobile ? "18px" : "24px",
            fontWeight: "700",
            margin: 0,
            marginBottom: "2px",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis"
          }}>
            {tripName || "Trip Slideshow"}
          </h1>
          <p style={{
            fontSize: isMobile ? "12px" : "14px",
            color: "#94a3b8",
            margin: 0
          }}>
            {currentIndex + 1} / {allPhotos.length}
          </p>
        </div>
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          style={{
            padding: isMobile ? "8px 12px" : "8px 16px",
            background: "rgba(255,255,255,0.1)",
            backdropFilter: "blur(8px)",
            color: "white",
            border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: isMobile ? "13px" : "14px",
            fontWeight: "500",
            transition: "all 0.2s",
            flexShrink: 0
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.2)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.1)";
          }}
        >
          {isPlaying ? "⏸ Pause" : "▶ Play"}
        </button>
      </div>

      {/* Main Slideshow Area */}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: isMobile ? "16px 0" : "32px 0",
        minHeight: 0
      }}>
        {/* 16:9 container + nav buttons wrapper */}
        <div style={{
          position: "relative",
          width: "100%",
          maxWidth: "1920px",
          padding: isMobile ? "0 48px" : "0 80px",
          boxSizing: "border-box"
        }}>
          {/* Previous Button – pinned to the left edge of the wrapper */}
          <button
            onClick={goToPrevious}
            style={{
              position: "absolute",
              left: isMobile ? "4px" : "16px",
              top: "50%",
              transform: "translateY(-50%)",
              width: isMobile ? "36px" : "44px",
              height: isMobile ? "36px" : "44px",
              padding: 0,
              background: "rgba(255,255,255,0.15)",
              backdropFilter: "blur(8px)",
              color: "white",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: "50%",
              cursor: "pointer",
              fontSize: isMobile ? "18px" : "20px",
              fontWeight: "500",
              transition: "all 0.2s",
              zIndex: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.25)";
              e.currentTarget.style.transform = "translateY(-50%) scale(1.1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.15)";
              e.currentTarget.style.transform = "translateY(-50%) scale(1)";
            }}
          >
            ‹
          </button>

          {/* 16:9 media container */}
          <div style={{
            width: "100%",
            aspectRatio: "16 / 9",
            background: "#000",
            borderRadius: isMobile ? "8px" : "12px",
            overflow: "hidden",
            position: "relative",
            boxShadow: "0 20px 60px rgba(0,0,0,0.5)"
          }}>
            {(() => {
              const isVideo = currentPhoto.filename?.toLowerCase().endsWith('.mp4') ||
                             currentPhoto.filename?.toLowerCase().endsWith('.mov') ||
                             currentPhoto.url?.includes('.mp4') ||
                             currentPhoto.url?.includes('.mov');

              const mediaStyle = {
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block"
              };

              return isVideo ? (
                <video
                  key={currentPhoto.url}
                  src={`${API_URL}${currentPhoto.url}`}
                  controls
                  autoPlay={isPlaying}
                  style={mediaStyle}
                />
              ) : (
                <img
                  key={currentPhoto.url}
                  src={`${API_URL}${currentPhoto.url}`}
                  alt={currentPhoto.filename}
                  style={mediaStyle}
                />
              );
            })()}
          </div>

          {/* Next Button – pinned to the right edge of the wrapper */}
          <button
            onClick={goToNext}
            style={{
              position: "absolute",
              right: isMobile ? "4px" : "16px",
              top: "50%",
              transform: "translateY(-50%)",
              width: isMobile ? "36px" : "44px",
              height: isMobile ? "36px" : "44px",
              padding: 0,
              background: "rgba(255,255,255,0.15)",
              backdropFilter: "blur(8px)",
              color: "white",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: "50%",
              cursor: "pointer",
              fontSize: isMobile ? "18px" : "20px",
              fontWeight: "500",
              transition: "all 0.2s",
              zIndex: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.25)";
              e.currentTarget.style.transform = "translateY(-50%) scale(1.1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.15)";
              e.currentTarget.style.transform = "translateY(-50%) scale(1)";
            }}
          >
            ›
          </button>
        </div>

        {/* Location label below the container */}
        {currentPhoto.location && (
          <div style={{
            marginTop: "12px",
            padding: "6px 16px",
            background: "rgba(255,255,255,0.08)",
            backdropFilter: "blur(8px)",
            borderRadius: "20px",
            fontSize: isMobile ? "12px" : "14px",
            color: "#94a3b8",
            whiteSpace: "nowrap",
            maxWidth: "80vw",
            overflow: "hidden",
            textOverflow: "ellipsis"
          }}>
            📍 {currentPhoto.location}
          </div>
        )}
      </div>

      {/* Export Section */}
      <div style={{
        padding: isMobile ? "12px 16px" : "24px 32px",
        borderTop: "1px solid rgba(255,255,255,0.1)",
        background: "rgba(255,255,255,0.05)",
        backdropFilter: "blur(8px)"
      }}>
        <div style={{
          background: "rgba(255,255,255,0.1)",
          borderRadius: isMobile ? "10px" : "12px",
          padding: isMobile ? "16px" : "24px",
          textAlign: "center",
          border: "1px solid rgba(255,255,255,0.2)"
        }}>
          <h3 style={{ marginBottom: isMobile ? "8px" : "16px", fontSize: isMobile ? "15px" : "18px", fontWeight: "600", color: "white" }}>
            🎬 Export Trip Recap {!user?.is_premium && !user?.is_admin && <span style={{ fontSize: "12px", color: "#fbbf24", fontWeight: "400" }}>(Premium Only)</span>}
          </h3>
          <p style={{ marginBottom: isMobile ? "12px" : "20px", color: "#cbd5e1", fontSize: isMobile ? "12px" : "14px" }}>
            Create a video slideshow of your trip
          </p>
          
          {isExporting && (
            <div style={{ marginBottom: "12px" }}>
              <div style={{
                width: "100%",
                height: "8px",
                background: "rgba(255,255,255,0.2)",
                borderRadius: "4px",
                overflow: "hidden"
              }}>
                <div style={{
                  width: `${exportProgress}%`,
                  height: "100%",
                  background: "#667eea",
                  transition: "width 0.3s"
                }} />
              </div>
              <p style={{ marginTop: "8px", fontSize: "12px", color: "#cbd5e1" }}>
                Exporting... {exportProgress}%
              </p>
            </div>
          )}

          <button
            onClick={handleExport}
            disabled={isExporting || Object.keys(photos || {}).length === 0 || (!user?.is_premium && !user?.is_admin)}
            style={{
              padding: isMobile ? "10px 24px" : "12px 32px",
              background: isExporting || Object.keys(photos || {}).length === 0 || (!user?.is_premium && !user?.is_admin) ? "rgba(203,213,225,0.3)" : "#667eea",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: isExporting || Object.keys(photos || {}).length === 0 || (!user?.is_premium && !user?.is_admin) ? "not-allowed" : "pointer",
              fontSize: isMobile ? "14px" : "16px",
              fontWeight: "600",
              transition: "all 0.2s",
              opacity: isExporting || Object.keys(photos || {}).length === 0 || (!user?.is_premium && !user?.is_admin) ? 0.6 : 1
            }}
            onMouseEnter={(e) => {
              if (!isExporting && Object.keys(photos || {}).length > 0 && (user?.is_premium || user?.is_admin)) {
                e.currentTarget.style.background = "#5568d3";
                e.currentTarget.style.transform = "translateY(-1px)";
              }
            }}
            onMouseLeave={(e) => {
              if (!isExporting && Object.keys(photos || {}).length > 0 && (user?.is_premium || user?.is_admin)) {
                e.currentTarget.style.background = "#667eea";
                e.currentTarget.style.transform = "translateY(0)";
              }
            }}
          >
            {isExporting ? "Exporting..." : (!user?.is_premium && !user?.is_admin) ? "Upgrade to Premium" : "Export to MP4"}
          </button>
        </div>
      </div>

      {/* Action Bar */}
      <div style={{
        padding: isMobile ? "12px 16px" : "24px 32px",
        borderTop: "1px solid rgba(255,255,255,0.1)",
        display: "flex",
        gap: isMobile ? "8px" : "12px",
        justifyContent: "center",
        flexWrap: "wrap"
      }}>
        {onShare && (
          <button
            onClick={onShare}
            style={{
              padding: isMobile ? "10px 16px" : "12px 24px",
              background: "rgba(255,255,255,0.1)",
              backdropFilter: "blur(8px)",
              color: "white",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: "10px",
              cursor: "pointer",
              fontSize: isMobile ? "13px" : "14px",
              fontWeight: "600",
              transition: "all 0.2s"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.2)";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.1)";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            📤 Share
          </button>
        )}
        <button
          onClick={onBackToPlanner}
          style={{
            padding: isMobile ? "10px 16px" : "12px 24px",
            background: "rgba(255,255,255,0.1)",
            backdropFilter: "blur(8px)",
            color: "white",
            border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: "10px",
            cursor: "pointer",
            fontSize: isMobile ? "13px" : "14px",
            fontWeight: "600",
            transition: "all 0.2s"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.2)";
            e.currentTarget.style.transform = "translateY(-1px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.1)";
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          ← Back to Trip Planner
        </button>
      </div>
    </div>
  );
}
