import React, { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import API_URL from "../config";

export default function TripList({ token, onCreateNew }) {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [openMenuId, setOpenMenuId] = useState(null);
  const [filter, setFilter] = useState("all"); // "all", "ongoing", "past"
  const [tripPhotos, setTripPhotos] = useState({}); // Map of trip_id to first photo
  const menuRefs = useRef({});
  const cardRefs = useRef([]);

  const loadTrips = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/api/trips/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const tripsData = res.data.trips;
      setTrips(tripsData);
      
      // Fetch first photo for each trip
      const photosMap = {};
      const photoPromises = tripsData.map(async (trip) => {
        try {
          const photoRes = await axios.get(`${API_URL}/api/photos/trip/${trip.id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (photoRes.data.photos && photoRes.data.photos.length > 0) {
            // Get first photo (already ordered by uploaded_at ASC)
            photosMap[trip.id] = photoRes.data.photos[0];
          }
        } catch (err) {
          // Silently fail if photos can't be loaded for a trip
          console.error(`Error loading photos for trip ${trip.id}:`, err);
        }
      });
      
      await Promise.all(photoPromises);
      setTripPhotos(photosMap);
    } catch (err) {
      console.error("Error loading trips:", err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadTrips();
  }, [loadTrips]);

  // Intersection Observer for scroll reveal animations
  useEffect(() => {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: "0px 0px -50px 0px"
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = "1";
          entry.target.style.transform = "translateY(0) rotateX(0deg)";
        }
      });
    }, observerOptions);

    cardRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => {
      cardRefs.current.forEach((ref) => {
        if (ref) observer.unobserve(ref);
      });
    };
  }, [trips, filter]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadTrips();
      return;
    }

    try {
      const res = await axios.get(
        `${API_URL}/api/trips/search?q=${encodeURIComponent(searchQuery)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTrips(res.data.trips);
    } catch (err) {
      console.error("Error searching trips:", err);
    }
  };

  const deleteTrip = async (tripId) => {
    if (!window.confirm("Are you sure you want to delete this trip? This action cannot be undone.")) {
      return;
    }
    try {
      await axios.delete(`${API_URL}/api/trips/${tripId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      loadTrips();
      setOpenMenuId(null);
    } catch (err) {
      console.error("Error deleting trip:", err);
      alert("Failed to delete trip. Please try again.");
    }
  };

  const duplicateTrip = async (trip) => {
    try {
      const tripData = {
        name: `${trip.name} (Copy)`,
        description: trip.description || "",
        origin: trip.origin,
        destinations: trip.destinations || [],
        optimized_route: trip.optimized_route || [],
        total_distance_km: trip.total_distance_km,
        route_mode: trip.route_mode || "DRIVING",
        travel_preference: trip.travel_preference || "auto",
        budget: trip.budget
      };

      await axios.post(`${API_URL}/api/trips/`, tripData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      loadTrips();
      setOpenMenuId(null);
    } catch (err) {
      console.error("Error duplicating trip:", err);
      if (err.response?.status === 403) {
        // Monthly trip limit reached
        const errorMsg = err.response.data?.message || err.response.data?.error || "Monthly trip limit reached. Free plan allows up to 2 trips per month. Upgrade to Premium for unlimited trips.";
        alert(errorMsg);
      } else {
      alert("Failed to duplicate trip. Please try again.");
      }
    }
  };

  const startTripAgain = async (tripId) => {
    try {
      await axios.put(`${API_URL}/api/trips/${tripId}`, {
        end_date: null
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      loadTrips();
      setOpenMenuId(null);
      alert("Trip started again successfully!");
    } catch (err) {
      console.error("Error starting trip again:", err);
      alert("Failed to start trip again. Please try again.");
    }
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openMenuId && menuRefs.current[openMenuId] && !menuRefs.current[openMenuId].contains(event.target)) {
        setOpenMenuId(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [openMenuId]);

  if (loading) {
    return (
      <div style={{ 
        textAlign: "center", 
        padding: "50px", 
        color: "#64748b",
        minHeight: "60vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}>
        <div style={{
          fontSize: "18px",
          fontWeight: "500"
        }}>
          Loading trips...
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      width: "100%", 
      display: "flex", 
      flexDirection: "column", 
      position: "relative", 
      zIndex: 1, 
      flex: "1 0 auto",
      background: "transparent",
      minHeight: "100vh",
      padding: "clamp(24px, 4vw, 48px) 0"
    }}>
      <div style={{ 
        maxWidth: "1600px", 
        width: "100%", 
        margin: "0 auto", 
        padding: "0 clamp(16px, 4vw, 32px)", 
        flex: "1", 
        display: "flex", 
        flexDirection: "column"
      }}>
        {/* Header Section */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "clamp(32px, 5vw, 48px)",
          flexWrap: "wrap",
          gap: "20px"
        }}>
          <div>
            <h1 style={{ 
              fontSize: "clamp(32px, 5vw, 48px)", 
              fontWeight: "800", 
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              letterSpacing: "-0.03em",
              margin: "0 0 8px 0",
              lineHeight: "1.1"
            }}>
              My Trips
            </h1>
            <p style={{
              fontSize: "clamp(14px, 2vw, 16px)",
              color: "#64748b",
              margin: 0,
              fontWeight: "500"
            }}>
              Manage and explore your travel adventures
            </p>
          </div>
          <button
            onClick={onCreateNew}
            style={{
              padding: "14px 28px",
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "white",
              border: "none",
              borderRadius: "16px",
              fontSize: "15px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
              boxShadow: "0 8px 24px rgba(102, 126, 234, 0.3)",
              position: "relative",
              overflow: "hidden"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-3px) scale(1.02)";
              e.currentTarget.style.boxShadow = "0 12px 32px rgba(102, 126, 234, 0.4)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0) scale(1)";
              e.currentTarget.style.boxShadow = "0 8px 24px rgba(102, 126, 234, 0.3)";
            }}
          >
            <span style={{ position: "relative", zIndex: 1 }}>+ New Trip</span>
          </button>
        </div>

        {/* Search and Filter Section */}
        <div style={{ 
          marginBottom: "clamp(32px, 4vw, 48px)", 
          display: "flex", 
          gap: "16px", 
          alignItems: "center",
          flexWrap: "wrap"
        }}>
          <div style={{
            flex: "1",
            minWidth: "280px",
            position: "relative"
          }}>
            <div style={{
              position: "absolute",
              left: "18px",
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: "18px",
              color: "#94a3b8",
              zIndex: 1,
              transition: "all 0.3s ease"
            }}>
              🔍
            </div>
            <input
              type="text"
              placeholder="Search trips..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSearch()}
              style={{
                width: "100%",
                padding: "14px 18px 14px 48px",
                borderRadius: "24px",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                fontSize: "15px",
                background: "rgba(255, 255, 255, 0.7)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.08)",
                fontWeight: "500"
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "rgba(102, 126, 234, 0.5)";
                e.currentTarget.style.boxShadow = "0 8px 32px rgba(102, 126, 234, 0.2), 0 0 0 4px rgba(102, 126, 234, 0.1)";
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.95)";
                const icon = e.currentTarget.previousElementSibling;
                if (icon) {
                  icon.style.color = "#667eea";
                  icon.style.transform = "translateY(-50%) scale(1.1)";
                }
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.2)";
                e.currentTarget.style.boxShadow = "0 4px 16px rgba(0, 0, 0, 0.08)";
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.7)";
                const icon = e.currentTarget.previousElementSibling;
                if (icon) {
                  icon.style.color = "#94a3b8";
                  icon.style.transform = "translateY(-50%) scale(1)";
                }
              }}
            />
          </div>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            {["all", "ongoing", "past"].map((filterType) => (
              <button
                key={filterType}
                onClick={() => setFilter(filterType)}
                style={{
                  padding: "12px 24px",
                  background: filter === filterType 
                    ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" 
                    : "rgba(255, 255, 255, 0.7)",
                  backdropFilter: "blur(20px)",
                  WebkitBackdropFilter: "blur(20px)",
                  color: filter === filterType ? "white" : "#64748b",
                  border: filter === filterType ? "none" : "1px solid rgba(255, 255, 255, 0.3)",
                  borderRadius: "16px",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  textTransform: "capitalize",
                  boxShadow: filter === filterType 
                    ? "0 4px 16px rgba(102, 126, 234, 0.3)" 
                    : "0 2px 8px rgba(0, 0, 0, 0.05)"
                }}
                onMouseEnter={(e) => {
                  if (filter !== filterType) {
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.9)";
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.1)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (filter !== filterType) {
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.7)";
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.05)";
                  }
                }}
              >
                {filterType}
              </button>
            ))}
          </div>
        </div>

        {trips.length === 0 ? (
          <div style={{
            textAlign: "center",
            padding: "80px 20px",
            background: "rgba(255, 255, 255, 0.7)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderRadius: "24px",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(255, 255, 255, 0.5) inset",
            border: "1px solid rgba(255, 255, 255, 0.3)"
          }}>
            <p style={{ fontSize: "18px", color: "#64748b", marginBottom: "24px", fontWeight: "500" }}>
              {searchQuery ? "No trips match your search" : "You haven't created any trips yet"}
            </p>
            <button
              onClick={onCreateNew}
              style={{
                padding: "14px 32px",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: "white",
                border: "none",
                borderRadius: "16px",
                fontSize: "16px",
                fontWeight: "600",
                cursor: "pointer",
                transition: "all 0.3s ease",
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
        ) : (() => {
          const ongoingTrips = trips.filter(trip => !trip.end_date);
          const pastTrips = trips.filter(trip => trip.end_date);
          
          const showOngoing = filter === "all" || filter === "ongoing";
          const showPast = filter === "all" || filter === "past";
          
          return (
            <>
              {showOngoing && ongoingTrips.length > 0 && (
                <>
                  {filter === "all" && (
                    <h2 style={{
                      fontSize: "clamp(20px, 3vw, 24px)",
                      fontWeight: "700",
                      color: "#1e293b",
                      marginBottom: "24px",
                      marginTop: "0"
                    }}>
                      Ongoing
                    </h2>
                  )}
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                    gap: "clamp(24px, 3vw, 32px)",
                    marginBottom: showOngoing && showPast && ongoingTrips.length > 0 && pastTrips.length > 0 ? "56px" : "0"
                  }}>
                    {ongoingTrips.map((trip, index) => (
                      <TripCard
                        key={trip.id}
                        trip={trip}
                        firstPhoto={tripPhotos[trip.id]}
                        onCreateNew={onCreateNew}
                        openMenuId={openMenuId}
                        setOpenMenuId={setOpenMenuId}
                        menuRefs={menuRefs}
                        duplicateTrip={duplicateTrip}
                        startTripAgain={startTripAgain}
                        deleteTrip={deleteTrip}
                        index={index}
                        cardRef={(el) => {
                          if (el) cardRefs.current.push(el);
                        }}
                      />
                    ))}
                  </div>
                </>
              )}
              {showPast && pastTrips.length > 0 && (
                <>
                  {showOngoing && ongoingTrips.length > 0 && filter === "all" && (
                    <div style={{
                      height: "1px",
                      background: "linear-gradient(90deg, transparent 0%, rgba(226, 232, 240, 0.5) 50%, transparent 100%)",
                      marginBottom: "40px",
                      marginTop: "24px"
                    }} />
                  )}
                  {filter === "all" && (
                    <h2 style={{
                      fontSize: "clamp(20px, 3vw, 24px)",
                      fontWeight: "700",
                      color: "#1e293b",
                      marginBottom: "24px",
                      marginTop: "0"
                    }}>
                      Past
                    </h2>
                  )}
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                    gap: "clamp(24px, 3vw, 32px)"
                  }}>
                    {pastTrips.map((trip, index) => (
                      <TripCard
                        key={trip.id}
                        trip={trip}
                        firstPhoto={tripPhotos[trip.id]}
                        onCreateNew={onCreateNew}
                        openMenuId={openMenuId}
                        setOpenMenuId={setOpenMenuId}
                        menuRefs={menuRefs}
                        duplicateTrip={duplicateTrip}
                        startTripAgain={startTripAgain}
                        deleteTrip={deleteTrip}
                        index={ongoingTrips.length + index}
                        cardRef={(el) => {
                          if (el) cardRefs.current.push(el);
                        }}
                      />
                    ))}
                  </div>
                </>
              )}
              {filter === "ongoing" && ongoingTrips.length === 0 && (
                <div style={{
                  textAlign: "center",
                  padding: "60px 20px",
                  background: "rgba(255, 255, 255, 0.7)",
                  backdropFilter: "blur(20px)",
                  WebkitBackdropFilter: "blur(20px)",
                  borderRadius: "24px",
                  boxShadow: "0 8px 32px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(255, 255, 255, 0.5) inset",
                  border: "1px solid rgba(255, 255, 255, 0.3)"
                }}>
                  <p style={{ fontSize: "16px", color: "#64748b", fontWeight: "500" }}>
                    No ongoing trips
                  </p>
                </div>
              )}
              {filter === "past" && pastTrips.length === 0 && (
                <div style={{
                  textAlign: "center",
                  padding: "60px 20px",
                  background: "rgba(255, 255, 255, 0.7)",
                  backdropFilter: "blur(20px)",
                  WebkitBackdropFilter: "blur(20px)",
                  borderRadius: "24px",
                  boxShadow: "0 8px 32px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(255, 255, 255, 0.5) inset",
                  border: "1px solid rgba(255, 255, 255, 0.3)"
                }}>
                  <p style={{ fontSize: "16px", color: "#64748b", fontWeight: "500" }}>
                    No past trips
                  </p>
                </div>
              )}
            </>
          );
        })()}
      </div>
    </div>
  );
}

function TripCard({ trip, firstPhoto, onCreateNew, openMenuId, setOpenMenuId, menuRefs, duplicateTrip, startTripAgain, deleteTrip, index, cardRef }) {
  const [imageHover, setImageHover] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      ref={cardRef}
      style={{
        background: "rgba(255, 255, 255, 0.7)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderRadius: "24px",
        padding: "0",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(255, 255, 255, 0.5) inset",
        transition: "all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
        position: "relative",
        border: "1px solid rgba(255, 255, 255, 0.3)",
        overflow: "hidden",
        opacity: 0,
        transform: "translateY(30px) rotateX(5deg)",
        animation: `fadeInUp 0.6s cubic-bezier(0.4, 0, 0.2, 1) ${index * 0.1}s forwards`,
        cursor: "pointer"
      }}
      onMouseEnter={(e) => {
        setIsHovered(true);
        e.currentTarget.style.transform = "translateY(-12px) scale(1.03) rotateY(2deg)";
        e.currentTarget.style.boxShadow = "0 24px 80px rgba(102, 126, 234, 0.25), 0 0 0 1px rgba(102, 126, 234, 0.2) inset, 0 0 40px rgba(102, 126, 234, 0.15)";
        e.currentTarget.style.borderColor = "rgba(102, 126, 234, 0.4)";
        setImageHover(true);
      }}
      onMouseLeave={(e) => {
        setIsHovered(false);
        e.currentTarget.style.transform = "translateY(0) scale(1) rotateY(0deg)";
        e.currentTarget.style.boxShadow = "0 8px 32px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(255, 255, 255, 0.5) inset";
        e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.3)";
        setImageHover(false);
      }}
    >
      {/* Cover Image */}
      <div
        style={{
          width: "100%",
          height: "200px",
          background: firstPhoto 
            ? "transparent" 
            : "linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)",
          position: "relative",
          overflow: "hidden"
        }}
        onMouseEnter={() => setImageHover(true)}
        onMouseLeave={() => setImageHover(false)}
      >
        {firstPhoto ? (
          <>
            {firstPhoto.media_type === 'video' || 
             firstPhoto.filename?.toLowerCase().endsWith('.mp4') || 
             firstPhoto.filename?.toLowerCase().endsWith('.mov') ||
             firstPhoto.url?.includes('.mp4') || 
             firstPhoto.url?.includes('.mov') ? (
              <video
                src={`${API_URL}${firstPhoto.url}`}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  transition: "transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
                  transform: imageHover ? "scale(1.1)" : "scale(1)"
                }}
                muted
                playsInline
              />
            ) : (
              <img
                src={`${API_URL}${firstPhoto.url}`}
                alt={trip.name}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  transition: "transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
                  transform: imageHover ? "scale(1.1)" : "scale(1)"
                }}
              />
            )}
            {/* Overlay gradient for better text readability */}
            <div style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(to bottom, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.1) 100%)",
              pointerEvents: "none"
            }} />
          </>
        ) : (
        <div style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(135deg, rgba(102, 126, 234, 0.3) 0%, rgba(118, 75, 162, 0.3) 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
          transform: imageHover ? "scale(1.1)" : "scale(1)"
        }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "rgba(255, 255, 255, 0.9)" }}>
            <path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z"/>
            <path d="M15 5.764v15"/>
            <path d="M9 3.236v15"/>
          </svg>
        </div>
        )}
        {/* Status Badge */}
        {trip.end_date ? (
          <div style={{
            position: "absolute",
            top: "16px",
            left: "16px",
            padding: "6px 14px",
            background: "rgba(100, 116, 139, 0.9)",
            backdropFilter: "blur(10px)",
            color: "white",
            borderRadius: "20px",
            fontSize: "12px",
            fontWeight: "600",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)"
          }}>
            Past
          </div>
        ) : (
          <div style={{
            position: "absolute",
            top: "16px",
            left: "16px",
            padding: "6px 14px",
            background: "rgba(16, 185, 129, 0.9)",
            backdropFilter: "blur(10px)",
            color: "white",
            borderRadius: "20px",
            fontSize: "12px",
            fontWeight: "600",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)"
          }}>
            Ongoing
          </div>
        )}
      </div>

      <div style={{ padding: "28px" }}>
        <div
          onClick={() => onCreateNew(trip.id)}
          style={{
            cursor: "pointer"
          }}
        >
          <h3 style={{
            fontSize: "clamp(24px, 3vw, 28px)",
            fontWeight: "800",
            marginBottom: "20px",
            color: "#0f172a",
            letterSpacing: "-0.02em",
            lineHeight: "1.2",
            transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
            transform: isHovered ? "translateX(4px)" : "translateX(0)",
            background: isHovered ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" : "transparent",
            WebkitBackgroundClip: isHovered ? "text" : "unset",
            WebkitTextFillColor: isHovered ? "transparent" : "#0f172a",
            backgroundClip: isHovered ? "text" : "unset"
          }}>
            {trip.name}
          </h3>
          <div style={{ 
            fontSize: "15px",
            color: "#475569",
            lineHeight: "1.8"
          }}>
            {trip.origin && (
              <div style={{ 
                marginBottom: "12px",
                transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                transform: isHovered ? "translateX(4px)" : "translateX(0)"
              }}>
                <span style={{ 
                  fontWeight: "700", 
                  color: "#667eea", 
                  fontSize: "13px",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  transition: "all 0.4s ease"
                }}>From</span>
                <div style={{ 
                  fontSize: "16px", 
                  fontWeight: "600",
                  color: "#1e293b",
                  marginTop: "4px",
                  transition: "color 0.4s ease"
                }}>
                  {trip.origin.name || "Unknown"}
                </div>
              </div>
            )}
            {trip.destinations && trip.destinations.length > 0 && (
              <div style={{ 
                marginBottom: "12px",
                transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                transform: isHovered ? "translateX(4px)" : "translateX(0)"
              }}>
                <span style={{ 
                  fontWeight: "700", 
                  color: "#764ba2", 
                  fontSize: "13px",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  transition: "all 0.4s ease"
                }}>To</span>
                <div style={{ 
                  fontSize: "16px", 
                  fontWeight: "600",
                  color: "#1e293b",
                  marginTop: "4px",
                  transition: "color 0.4s ease"
                }}>
                  {trip.destinations.map(d => d.name).filter(Boolean).join(", ") || "Unknown"}
                </div>
              </div>
            )}
            {trip.start_date && (
              <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px solid rgba(226, 232, 240, 0.5)" }}>
                <span style={{ 
                  fontSize: "13px",
                  color: "#94a3b8",
                  fontWeight: "500"
                }}>
                  {new Date(trip.start_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
            )}
          </div>
        </div>
        
        {/* Menu Button */}
        <div
          ref={(el) => (menuRefs.current[trip.id] = el)}
          style={{
            position: "absolute",
            top: "16px",
            right: "16px",
            zIndex: 10
          }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              setOpenMenuId(openMenuId === trip.id ? null : trip.id);
            }}
            style={{
              padding: "8px",
              background: "rgba(255, 255, 255, 0.9)",
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(255, 255, 255, 0.3)",
              borderRadius: "12px",
              cursor: "pointer",
              fontSize: "20px",
              color: "#64748b",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "36px",
              height: "36px",
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 1)";
              e.currentTarget.style.color = "#475569";
              e.currentTarget.style.transform = "scale(1.1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.9)";
              e.currentTarget.style.color = "#64748b";
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            ⋯
          </button>
          {openMenuId === trip.id && (
            <div
              style={{
                position: "absolute",
                top: "44px",
                right: "0",
                background: "rgba(255, 255, 255, 0.95)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                borderRadius: "16px",
                boxShadow: "0 12px 40px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.5) inset",
                border: "1px solid rgba(255, 255, 255, 0.3)",
                minWidth: "200px",
                zIndex: 1000,
                overflow: "hidden",
                animation: "fadeInUp 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
              }}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  duplicateTrip(trip);
                }}
                style={{
                  width: "100%",
                  padding: "14px 20px",
                  background: "transparent",
                  border: "none",
                  borderBottom: "1px solid rgba(241, 245, 249, 0.5)",
                  cursor: "pointer",
                  fontSize: "14px",
                  color: "#475569",
                  textAlign: "left",
                  transition: "all 0.2s ease",
                  fontWeight: "500"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(248, 250, 252, 0.8)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
                Duplicate
              </button>
              {trip.end_date && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    startTripAgain(trip.id);
                  }}
                  style={{
                    width: "100%",
                    padding: "14px 20px",
                    background: "transparent",
                    border: "none",
                    borderBottom: "1px solid rgba(241, 245, 249, 0.5)",
                    cursor: "pointer",
                    fontSize: "14px",
                    color: "#16a34a",
                    textAlign: "left",
                    transition: "all 0.2s ease",
                    fontWeight: "500"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(240, 253, 244, 0.8)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  Start Trip Again
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm(`Are you sure you want to delete "${trip.name}"? This action cannot be undone.`)) {
                    deleteTrip(trip.id);
                  }
                }}
                style={{
                  width: "100%",
                  padding: "14px 20px",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "14px",
                  color: "#dc2626",
                  textAlign: "left",
                  transition: "all 0.2s ease",
                  fontWeight: "500"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(254, 242, 242, 0.8)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
