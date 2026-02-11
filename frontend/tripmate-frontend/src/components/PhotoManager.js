import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import API_URL from "../config";

export default function PhotoManager({ locations, onPhotosUpdate, tripId, token, photos: photosProp, user }) {
  const [photos, setPhotos] = useState(photosProp || {});
  const fileInputRef = useRef(null);

  // Sync with parent photos prop when it changes
  useEffect(() => {
    if (photosProp) {
      setPhotos(photosProp);
    }
  }, [photosProp]);

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    
    if (!tripId) {
      alert("Please save your trip first before uploading photos");
      return;
    }

    const formData = new FormData();
    files.forEach((file) => {
      formData.append("photos", file);
    });
    formData.append("trip_id", tripId);
    // Use a neutral internal key but don't surface it in the UI
    formData.append("location_name", "Trip Photos");

    try {
      const res = await axios.post(`${API_URL}/api/photos/upload`, formData, {
        headers: { 
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`
        },
      });
      
      const newPhotos = res.data.photos || [];
      const locationKey = "Trip Photos";
      setPhotos((prev) => {
        const updated = {
          ...prev,
          [locationKey]: [...(prev[locationKey] || []), ...newPhotos],
        };
        if (onPhotosUpdate) {
          onPhotosUpdate(updated);
        }
        return updated;
      });
    } catch (error) {
      console.error("Error uploading photos:", error);
      let errorMessage = "Failed to upload photos. ";
      if (error.response?.data) {
        if (error.response.data.error) {
          errorMessage += error.response.data.error;
        }
        if (error.response.data.message) {
          errorMessage += " " + error.response.data.message;
        }
      } else {
        errorMessage += error.message || "Please try again.";
      }
      alert(errorMessage);
    }
  };

  const deletePhoto = async (locationName, photoId) => {
    try {
      await axios.delete(`${API_URL}/api/photos/${photoId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPhotos((prev) => {
        const updated = {
          ...prev,
          [locationName]: prev[locationName]?.filter((p) => p.id !== photoId) || [],
        };
        // Remove location key if no photos left
        if (updated[locationName] && updated[locationName].length === 0) {
          delete updated[locationName];
        }
        if (onPhotosUpdate) {
          onPhotosUpdate(updated);
        }
        return updated;
      });
    } catch (error) {
      console.error("Error deleting photo:", error);
      alert("Failed to delete photo");
    }
  };

  return (
    <div style={{ 
      background: "rgba(255, 255, 255, 0.7)",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      borderRadius: "24px", 
      padding: "clamp(32px, 5vw, 48px)", 
      marginTop: "clamp(24px, 4vw, 32px)",
      boxShadow: "0 20px 60px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(255, 255, 255, 0.5) inset, 0 4px 16px rgba(0, 0, 0, 0.04)",
      border: "1px solid rgba(255, 255, 255, 0.3)",
      transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)"
    }}>
      <div style={{ marginBottom: "clamp(24px, 4vw, 32px)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
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
              <path d="M13.997 4a2 2 0 0 1 1.76 1.05l.486.9A2 2 0 0 0 18.003 7H20a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1.997a2 2 0 0 0 1.759-1.048l.489-.904A2 2 0 0 1 10.004 4z"/>
              <circle cx="12" cy="13" r="3"/>
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
            Photo & Video Gallery
          </h3>
        </div>
        <span style={{ 
          fontSize: "12px", 
          color: (user?.is_premium || user?.is_admin) ? "#667eea" : "#f59e0b", 
          fontWeight: "600", 
          background: (user?.is_premium || user?.is_admin) 
            ? "linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)" 
            : "linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(251, 191, 36, 0.1) 100%)", 
          padding: "8px 14px", 
          borderRadius: "12px",
          border: `1px solid ${(user?.is_premium || user?.is_admin) ? "rgba(102, 126, 234, 0.2)" : "rgba(245, 158, 11, 0.2)"}`,
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)"
        }}>
          Storage: {(user?.is_premium || user?.is_admin) ? "1GB" : "100MB"} per trip
        </span>
      </div>
      
      <div style={{ marginBottom: "clamp(24px, 4vw, 32px)" }}>
        <button
          onClick={() => fileInputRef.current?.click()}
          style={{
            padding: "clamp(12px, 2vw, 14px) clamp(24px, 4vw, 28px)",
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "white",
            border: "none",
            borderRadius: "14px",
            cursor: "pointer",
            fontSize: "clamp(14px, 2vw, 15px)",
            fontWeight: "600",
            transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
            boxShadow: "0 8px 24px rgba(102, 126, 234, 0.3)",
            display: "flex",
            alignItems: "center",
            gap: "10px"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-2px) scale(1.02)";
            e.currentTarget.style.boxShadow = "0 12px 32px rgba(102, 126, 234, 0.4)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0) scale(1)";
            e.currentTarget.style.boxShadow = "0 8px 24px rgba(102, 126, 234, 0.3)";
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          Upload Photos & Videos
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,video/*"
        onChange={handleFileSelect}
        style={{ display: "none" }}
      />

      {(() => {
        // Safely handle photos object
        if (!photos || typeof photos !== 'object' || Object.keys(photos).length === 0) {
          return (
            <div style={{
              textAlign: "center",
              padding: "clamp(32px, 5vw, 48px)",
              color: "#94a3b8",
              fontSize: "clamp(14px, 2vw, 16px)"
            }}>
              No photos or videos yet. Upload some to get started!
            </div>
          );
        }

        // Get all photos from all locations
        const allPhotosList = Object.entries(photos)
          .filter(([_, locationPhotos]) => locationPhotos && Array.isArray(locationPhotos) && locationPhotos.length > 0)
          .flatMap(([_, locationPhotos]) => locationPhotos)
          .filter(photo => photo != null);
        
        // If no photos, show empty state
        if (allPhotosList.length === 0) {
          return (
            <div style={{
              textAlign: "center",
              padding: "clamp(32px, 5vw, 48px)",
              color: "#94a3b8",
              fontSize: "clamp(14px, 2vw, 16px)"
            }}>
              No photos or videos yet. Upload some to get started!
            </div>
          );
        }

        // Render photos grid
        return (
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", 
        gap: "clamp(16px, 3vw, 20px)" 
      }}>
            {allPhotosList.map((photo) => {
            const isVideo = photo.filename?.toLowerCase().endsWith('.mp4') || 
                           photo.filename?.toLowerCase().endsWith('.mov') ||
                           photo.url?.includes('.mp4') ||
                           photo.url?.includes('.mov');
            
            return (
              <div 
                key={photo.id} 
                style={{ 
                  position: "relative",
                  borderRadius: "16px",
                  overflow: "hidden",
                  boxShadow: "0 4px 16px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.04) inset",
                  transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                  cursor: "pointer"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-4px) scale(1.02)";
                  e.currentTarget.style.boxShadow = "0 12px 32px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(102, 126, 234, 0.2) inset";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0) scale(1)";
                  e.currentTarget.style.boxShadow = "0 4px 16px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.04) inset";
                }}
              >
                {isVideo ? (
                  <video
                    src={`${API_URL}${photo.url}`}
                    style={{
                      width: "100%",
                      height: "160px",
                      objectFit: "cover",
                      display: "block"
                    }}
                    controls
                    muted
                  />
                ) : (
                  <img
                    src={`${API_URL}${photo.url}`}
                    alt={photo.filename}
                    style={{
                      width: "100%",
                      height: "160px",
                      objectFit: "cover",
                      display: "block"
                    }}
                  />
                )}
                <button
                  onClick={() => deletePhoto("Trip Photos", photo.id)}
                  style={{
                    position: "absolute",
                    top: "10px",
                    right: "10px",
                    background: "rgba(239, 68, 68, 0.95)",
                    backdropFilter: "blur(10px)",
                    WebkitBackdropFilter: "blur(10px)",
                    color: "white",
                    border: "none",
                    borderRadius: "50%",
                    width: "28px",
                    height: "28px",
                    cursor: "pointer",
                    fontSize: "16px",
                    fontWeight: "600",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 4px 12px rgba(239, 68, 68, 0.4)",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "scale(1.1)";
                    e.currentTarget.style.background = "rgba(220, 38, 38, 1)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "scale(1)";
                    e.currentTarget.style.background = "rgba(239, 68, 68, 0.95)";
                  }}
                >
                  ×
                </button>
              </div>
            );
            })}
      </div>
        );
      })()}
    </div>
  );
}

