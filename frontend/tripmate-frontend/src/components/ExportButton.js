import React, { useState } from "react";
import axios from "axios";
import SuccessModal from "./SuccessModal";
import API_URL from "../config";

export default function ExportButton({ locations, photos, routeData, token, user }) {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const handleExport = async () => {
    if (Object.keys(photos || {}).length === 0) {
      alert("Please add some photos before exporting");
      return;
    }

    setIsExporting(true);
    setProgress(5);

    // Simulate progress while the server encodes the video
    let fakeProgress = 5;
    const progressTimer = setInterval(() => {
      fakeProgress = Math.min(fakeProgress + 2, 85);
      setProgress(fakeProgress);
    }, 1000);

    try {
      const response = await axios.post(
        `${API_URL}/api/export/video`,
        {
          locations: locations,
          photos: photos,
          routeData: routeData
        },
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: "blob",
          timeout: 300000, // 5 minutes timeout for video processing
          onDownloadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percentCompleted = Math.round(
                85 + (progressEvent.loaded * 15) / progressEvent.total
              );
              setProgress(percentCompleted);
            }
          }
        }
      );
      clearInterval(progressTimer);

      setProgress(90);
      
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

      // Create download link
      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      const optimizedRoute = routeData?.optimizedRoute || [];
      const destinationName = optimizedRoute.length > 0 ? optimizedRoute[optimizedRoute.length - 1]?.name : "trip";
      link.setAttribute("download", `${destinationName}-recap-${Date.now()}.mp4`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setProgress(100);
      setTimeout(() => {
        setIsExporting(false);
        setShowSuccessModal(true);
        setProgress(0);
      }, 500);
    } catch (error) {
      clearInterval(progressTimer);
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
      setTimeout(() => setProgress(0), 2000);
    }
  };

  const hasPhotos = Object.keys(photos || {}).length > 0;
  const isPremium = user?.is_premium || user?.is_admin;

  return (
    <>
      <div style={{
        background: "rgba(255, 255, 255, 0.7)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderRadius: "24px",
        padding: "clamp(32px, 5vw, 48px)",
        marginTop: "clamp(24px, 4vw, 32px)",
        boxShadow: "0 20px 60px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(255, 255, 255, 0.5) inset, 0 4px 16px rgba(0, 0, 0, 0.04)",
        border: "1px solid rgba(255, 255, 255, 0.3)",
        textAlign: "center",
        transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)"
      }}>
        <div style={{ 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center", 
          gap: "12px", 
          marginBottom: "clamp(16px, 3vw, 20px)" 
        }}>
          <div style={{
            width: "48px",
            height: "48px",
            borderRadius: "14px",
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 8px 24px rgba(102, 126, 234, 0.3)"
          }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.2 6 3 11l-.9-2.4c-.3-1.1.3-2.2 1.3-2.5l13.5-4c1.1-.3 2.2.3 2.5 1.3Z"/>
              <path d="m6.2 5.3 3.1 3.9"/>
              <path d="m12.4 3.4 3.1 4"/>
              <path d="M3 11h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>
            </svg>
          </div>
          <h3 style={{ 
            fontSize: "clamp(20px, 4vw, 24px)", 
            fontWeight: "700", 
            margin: 0,
            background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #a855f7 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            letterSpacing: "-0.02em"
          }}>
            Export Trip Recap
            {!isPremium && (
              <span style={{ 
                fontSize: "clamp(11px, 2vw, 12px)", 
                color: "#f59e0b", 
                fontWeight: "600",
                background: "linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(251, 191, 36, 0.1) 100%)",
                padding: "4px 10px",
                borderRadius: "8px",
                marginLeft: "10px",
                display: "inline-block",
                border: "1px solid rgba(245, 158, 11, 0.2)"
              }}>
                Premium Only
              </span>
            )}
          </h3>
        </div>
        
        <p style={{ 
          marginBottom: "clamp(24px, 4vw, 32px)", 
          color: "#64748b", 
          fontSize: "clamp(14px, 2vw, 15px)",
          lineHeight: "1.6",
          maxWidth: "600px",
          margin: "0 auto clamp(24px, 4vw, 32px)"
        }}>
          Create a beautiful video slideshow of your trip with photos and route information
        </p>
        
        {isExporting && (
          <div style={{ 
            marginBottom: "clamp(24px, 4vw, 32px)",
            padding: "clamp(20px, 3vw, 24px)",
            background: "rgba(255, 255, 255, 0.6)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            borderRadius: "16px",
            border: "1px solid rgba(255, 255, 255, 0.4)",
            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)"
          }}>
            <div style={{
              width: "100%",
              height: "12px",
              background: "rgba(226, 232, 240, 0.6)",
              borderRadius: "10px",
              overflow: "hidden",
              marginBottom: "12px",
              boxShadow: "0 2px 4px rgba(0, 0, 0, 0.04) inset"
            }}>
              <div style={{
                width: `${progress}%`,
                height: "100%",
                background: "linear-gradient(90deg, #667eea 0%, #764ba2 100%)",
                transition: "width 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                borderRadius: "10px",
                boxShadow: "0 2px 8px rgba(102, 126, 234, 0.4)",
                position: "relative",
                overflow: "hidden"
              }}>
                <div style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: "linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent)",
                  animation: "shimmer 2s infinite"
                }} />
              </div>
            </div>
            <p style={{ 
              marginTop: "8px", 
              fontSize: "clamp(13px, 2vw, 14px)", 
              color: "#64748b",
              fontWeight: "600"
            }}>
              Exporting... {progress}%
            </p>
          </div>
        )}

        <button
          onClick={handleExport}
          disabled={isExporting || !hasPhotos || !isPremium}
          style={{
            padding: "clamp(14px, 2vw, 16px) clamp(32px, 5vw, 40px)",
            background: isExporting || !hasPhotos || !isPremium
              ? "linear-gradient(135deg, #cbd5e1 0%, #94a3b8 100%)"
              : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "white",
            border: "none",
            borderRadius: "14px",
            cursor: isExporting || !hasPhotos || !isPremium ? "not-allowed" : "pointer",
            fontSize: "clamp(15px, 2vw, 16px)",
            fontWeight: "700",
            transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
            boxShadow: isExporting || !hasPhotos || !isPremium
              ? "0 4px 12px rgba(148, 163, 184, 0.3)"
              : "0 8px 24px rgba(102, 126, 234, 0.4)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            justifyContent: "center",
            margin: "0 auto",
            minWidth: "200px"
          }}
          onMouseEnter={(e) => {
            if (!isExporting && hasPhotos && isPremium) {
              e.currentTarget.style.transform = "translateY(-3px) scale(1.02)";
              e.currentTarget.style.boxShadow = "0 12px 32px rgba(102, 126, 234, 0.5)";
            }
          }}
          onMouseLeave={(e) => {
            if (!isExporting && hasPhotos && isPremium) {
              e.currentTarget.style.transform = "translateY(0) scale(1)";
              e.currentTarget.style.boxShadow = "0 8px 24px rgba(102, 126, 234, 0.4)";
            }
          }}
        >
          {isExporting ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: "spin 1s linear infinite" }}>
                <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
              </svg>
              Exporting...
            </>
          ) : !isPremium ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14"/>
                <path d="M12 5v14"/>
              </svg>
              Upgrade to Premium
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              Export to MP4
            </>
          )}
        </button>

        {!hasPhotos && (
          <p style={{
            marginTop: "clamp(16px, 3vw, 20px)",
            fontSize: "clamp(12px, 2vw, 13px)",
            color: "#f59e0b",
            fontWeight: "500"
          }}>
            Add photos to your trip to create a video recap
          </p>
        )}
      </div>

      <style>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>

      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        message="Your trip recap video has been exported successfully! Check your downloads folder."
        title="Export Complete!"
        showConfetti={true}
      />
    </>
  );
}

