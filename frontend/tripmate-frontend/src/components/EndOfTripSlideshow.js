import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import API_URL from "../config";

export default function EndOfTripSlideshow({ photos, tripName, locations, routeData, token, user, onBackToPlanner, onShare }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const intervalIdRef = useRef(null);

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
          timeout: 300000, // 5 minutes timeout for video processing
          onDownloadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percentCompleted = Math.round(
                20 + (progressEvent.loaded * 80) / progressEvent.total
              );
              setExportProgress(percentCompleted);
            } else {
              setExportProgress(50); // Indeterminate progress
            }
          }
        }
      );

      setExportProgress(90);
      
      // Check if response is an error (check content type)
      const contentType = response.headers['content-type'] || '';
      if (contentType.includes('application/json')) {
        const text = await response.data.text();
        const error = JSON.parse(text);
        throw new Error(error.error || "Export failed");
      }
      
      // Verify it's actually a video file
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
        // Try to read error message from blob
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
        color: "white"
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
      minHeight: "100vh",
      background: "#0f172a",
      display: "flex",
      flexDirection: "column",
      color: "white"
    }}>
      {/* Header */}
      <div style={{
        padding: "24px 32px",
        borderBottom: "1px solid rgba(255,255,255,0.1)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }}>
        <div>
          <h1 style={{
            fontSize: "24px",
            fontWeight: "700",
            margin: 0,
            marginBottom: "4px"
          }}>
            {tripName || "Trip Slideshow"}
          </h1>
          <p style={{
            fontSize: "14px",
            color: "#94a3b8",
            margin: 0
          }}>
            {currentIndex + 1} / {allPhotos.length}
          </p>
        </div>
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          style={{
            padding: "8px 16px",
            background: "rgba(255,255,255,0.1)",
            backdropFilter: "blur(8px)",
            color: "white",
            border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "500",
            transition: "all 0.2s"
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
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        padding: "32px"
      }}>
        <button
          onClick={goToPrevious}
          style={{
            position: "absolute",
            left: "32px",
            padding: "12px 20px",
            background: "rgba(255,255,255,0.1)",
            backdropFilter: "blur(8px)",
            color: "white",
            border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: "12px",
            cursor: "pointer",
            fontSize: "16px",
            fontWeight: "500",
            transition: "all 0.2s",
            zIndex: 10
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.2)";
            e.currentTarget.style.transform = "scale(1.05)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.1)";
            e.currentTarget.style.transform = "scale(1)";
          }}
        >
          ← Previous
        </button>

        <div style={{
          maxWidth: "90vw",
          maxHeight: "70vh",
          position: "relative"
        }}>
          {(() => {
            const isVideo = currentPhoto.filename?.toLowerCase().endsWith('.mp4') || 
                           currentPhoto.filename?.toLowerCase().endsWith('.mov') ||
                           currentPhoto.url?.includes('.mp4') ||
                           currentPhoto.url?.includes('.mov');
            
            return isVideo ? (
              <video
                src={`${API_URL}${currentPhoto.url}`}
                controls
                autoPlay={isPlaying}
                style={{
                  maxWidth: "100%",
                  maxHeight: "70vh",
                  objectFit: "contain",
                  borderRadius: "12px",
                  boxShadow: "0 20px 60px rgba(0,0,0,0.5)"
                }}
              />
            ) : (
              <img
                src={`${API_URL}${currentPhoto.url}`}
                alt={currentPhoto.filename}
                style={{
                  maxWidth: "100%",
                  maxHeight: "70vh",
                  objectFit: "contain",
                  borderRadius: "12px",
                  boxShadow: "0 20px 60px rgba(0,0,0,0.5)"
                }}
              />
            );
          })()}
          {currentPhoto.location && (
            <div style={{
              position: "absolute",
              bottom: "-40px",
              left: "50%",
              transform: "translateX(-50%)",
              padding: "8px 16px",
              background: "rgba(0,0,0,0.6)",
              backdropFilter: "blur(8px)",
              borderRadius: "20px",
              fontSize: "14px",
              color: "white"
            }}>
              📍 {currentPhoto.location}
            </div>
          )}
        </div>

        <button
          onClick={goToNext}
          style={{
            position: "absolute",
            right: "32px",
            padding: "12px 20px",
            background: "rgba(255,255,255,0.1)",
            backdropFilter: "blur(8px)",
            color: "white",
            border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: "12px",
            cursor: "pointer",
            fontSize: "16px",
            fontWeight: "500",
            transition: "all 0.2s",
            zIndex: 10
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.2)";
            e.currentTarget.style.transform = "scale(1.05)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.1)";
            e.currentTarget.style.transform = "scale(1)";
          }}
        >
          Next →
        </button>
      </div>

      {/* Export Section */}
      <div style={{
        padding: "24px 32px",
        borderTop: "1px solid rgba(255,255,255,0.1)",
        background: "rgba(255,255,255,0.05)",
        backdropFilter: "blur(8px)"
      }}>
        <div style={{
          background: "rgba(255,255,255,0.1)",
          borderRadius: "12px",
          padding: "24px",
          textAlign: "center",
          border: "1px solid rgba(255,255,255,0.2)"
        }}>
          <h3 style={{ marginBottom: "16px", fontSize: "18px", fontWeight: "600", color: "white" }}>
            🎬 Export Trip Recap {!user?.is_premium && !user?.is_admin && <span style={{ fontSize: "12px", color: "#fbbf24", fontWeight: "400" }}>(Premium Only)</span>}
          </h3>
          <p style={{ marginBottom: "20px", color: "#cbd5e1", fontSize: "14px" }}>
            Create a beautiful video slideshow of your trip with photos and route information
          </p>
          
          {isExporting && (
            <div style={{ marginBottom: "16px" }}>
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
              padding: "12px 32px",
              background: isExporting || Object.keys(photos || {}).length === 0 || (!user?.is_premium && !user?.is_admin) ? "rgba(203,213,225,0.3)" : "#667eea",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: isExporting || Object.keys(photos || {}).length === 0 || (!user?.is_premium && !user?.is_admin) ? "not-allowed" : "pointer",
              fontSize: "16px",
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
        padding: "24px 32px",
        borderTop: "1px solid rgba(255,255,255,0.1)",
        display: "flex",
        gap: "12px",
        justifyContent: "center",
        flexWrap: "wrap"
      }}>
        {onShare && (
          <button
            onClick={onShare}
            style={{
              padding: "12px 24px",
              background: "rgba(255,255,255,0.1)",
              backdropFilter: "blur(8px)",
              color: "white",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: "10px",
              cursor: "pointer",
              fontSize: "14px",
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
            padding: "12px 24px",
            background: "rgba(255,255,255,0.1)",
            backdropFilter: "blur(8px)",
            color: "white",
            border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: "10px",
            cursor: "pointer",
            fontSize: "14px",
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



