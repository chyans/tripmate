import React, { useState, useEffect, useImperativeHandle, forwardRef } from "react";
import axios from "axios";
import API_URL from "../config";

/**
 * TripTimeline Component (refactored)
 *
 * Narrative-driven, interactive timeline:
 * - Stepper-style layout connected by a vertical line
 * - Inline City + Activity fields per photo
 * - Subtle delete on hover
 * - Glassmorphism cards with micro-interactions
 *
 * Exposes a `save()` method via ref so the parent can trigger
 * timeline saves when the trip itself is saved.
 */
const TripTimeline = forwardRef(function TripTimeline({ tripId, token, onBack, onPhotoDeleted }, ref) {
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [photoEdits, setPhotoEdits] = useState({});
  const [groupNameEdits, setGroupNameEdits] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (tripId && token) {
      loadTimeline();
    }
  }, [tripId, token]);

  const loadTimeline = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await axios.get(
        `${API_URL}/api/photos/trip/${tripId}/timeline`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setTimeline(res.data.timeline || []);
    } catch (err) {
      console.error("Error loading timeline:", err);
      setError(err.response?.data?.error || "Failed to load timeline");
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateTimeStr) => {
    if (!dateTimeStr) return "Unknown date";
    try {
      const date = new Date(dateTimeStr);
      return date.toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return dateTimeStr;
    }
  };

  const handleEditChange = (photoId, field, value) => {
    setPhotoEdits((prev) => ({
      ...prev,
      [photoId]: {
        ...(prev[photoId] || {}),
        [field]: value
      }
    }));
  };

  // Determine if there are any unsaved edits
  const hasUnsavedChanges =
    Object.keys(photoEdits).length > 0 ||
    Object.keys(groupNameEdits).length > 0;

  // Batch-save all pending edits
  const saveAllChanges = async () => {
    if (!hasUnsavedChanges) return;
    setSaving(true);

    try {
      const requests = [];

      // Save per-photo city + activity edits
      for (const [photoId, edits] of Object.entries(photoEdits)) {
        const payload = {};
        if (edits.city !== undefined && edits.city.trim()) {
          payload.city = edits.city.trim();
        }
        if (edits.activity !== undefined) {
          payload.activities = edits.activity.trim();
        }
        if (Object.keys(payload).length > 0) {
          requests.push(
            axios.patch(
              `${API_URL}/api/photos/${photoId}/geotag`,
              payload,
              { headers: { Authorization: `Bearer ${token}` } }
            )
          );
        }
      }

      // Save group-name edits (apply to every photo in the group)
      for (const [siteIndexStr, newName] of Object.entries(groupNameEdits)) {
        const trimmed = newName.trim();
        if (!trimmed) continue;
        const siteIndex = Number(siteIndexStr);
        const group = timeline[siteIndex];
        if (!group) continue;
        group.photos.forEach((photo) => {
          requests.push(
            axios.patch(
        `${API_URL}/api/photos/${photo.id}/geotag`,
        { city: trimmed },
        { headers: { Authorization: `Bearer ${token}` } }
            )
          );
        });
      }

      await Promise.all(requests);
      setPhotoEdits({});
      setGroupNameEdits({});
      await loadTimeline();
    } catch (err) {
      console.error("Error saving changes:", err);
      alert("Some changes could not be saved. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    onBack();
  };

  // Expose save to parent via ref so trip save also saves timeline edits
  useImperativeHandle(ref, () => ({
    save: saveAllChanges,
    hasUnsavedChanges,
  }));

  const deletePhoto = async (photoId) => {
    if (!window.confirm("Are you sure you want to delete this photo?")) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/api/photos/${photoId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await loadTimeline();
      if (onPhotoDeleted) {
        onPhotoDeleted(photoId);
      }
    } catch (err) {
      console.error("Error deleting photo:", err);
      alert("Failed to delete photo");
    }
  };

  if (loading) {
    return (
      <div className="w-full py-10 text-center text-slate-500 text-sm">
        Loading timeline...
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full py-10 text-center text-sm text-rose-600">
        {error}
      </div>
    );
  }

  if (timeline.length === 0) {
    return (
      <div className="w-full py-10 text-center text-slate-500">
        <p className="mb-3">
          No photos found for this trip. Upload some photos to start building
          your story.
        </p>
        {onBack && (
          <button
            onClick={handleBack}
            className="inline-flex items-center rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-2 text-sm font-semibold text-white shadow-md hover:shadow-lg hover:translate-y-[-1px] transition"
          >
            Back
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="w-full max-h-[70vh] overflow-y-auto px-4 sm:px-6 py-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 bg-clip-text text-transparent">
            Trip Timeline
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Photos arranged as a story in time – add where you were and what you
            were doing.
          </p>
        </div>
        <div className="flex items-center gap-2">
        {onBack && (
          <button
              onClick={handleBack}
            className="rounded-xl border border-slate-200/80 bg-white/70 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-slate-600 shadow-sm backdrop-blur hover:bg-white hover:-translate-y-[1px] transition"
          >
            Back
          </button>
        )}
        </div>
      </div>

      {/* Stepper Timeline */}
      <div className="space-y-8">
        {timeline.map((siteGroup, siteIndex) => (
          <section
            key={siteGroup.site_name || `site-${siteIndex}`}
            className="relative rounded-3xl bg-white/60 border border-white/70 shadow-[0_18px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl px-4 sm:px-6 py-5"
          >
            {/* Group header (no label for generic groups) */}
            <header className="flex items-center gap-3 pb-4 border-b border-slate-100/80 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-100 via-sky-100 to-violet-100 text-indigo-500 shadow-inner">
                <span className="text-lg">📍</span>
              </div>
                <div className="flex-1">
                {siteGroup.detected_city || siteGroup.detected_country ? (
                  <h3 className="text-base sm:text-lg font-semibold text-slate-900">
                    {siteGroup.site_name}
                  </h3>
                ) : (
                  <input
                    type="text"
                    value={groupNameEdits[siteIndex] ?? siteGroup.site_name ?? ""}
                    onChange={(e) =>
                      setGroupNameEdits((prev) => ({
                        ...prev,
                        [siteIndex]: e.target.value
                      }))
                    }
                    placeholder="Where was this taken?"
                    className="w-full rounded-lg border border-slate-200/70 bg-white/70 px-3 py-1.5 text-base sm:text-lg font-semibold text-slate-900 placeholder-slate-400 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition"
                  />
                )}
                <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                    {siteGroup.photos.length}{" "}
                    {siteGroup.photos.length === 1 ? "photo" : "photos"}
                  </p>
                </div>
            </header>

            {/* Vertical line for this group */}
            <div className="relative pl-6 sm:pl-8">
              <div className="pointer-events-none absolute left-[11px] sm:left-[13px] top-3 bottom-3 w-px bg-slate-200/80" />

              <div className="space-y-6">
                {siteGroup.photos.map((photo, idx) => {
                  const edits = photoEdits[photo.id] || {};
                  const autoCity =
                    photo.detectedCity ||
                    photo.geocoded_location ||
                    siteGroup.site_name ||
                    "";
                  const cityValue =
                    edits.city !== undefined ? edits.city : "";
                  const cityPlaceholder = autoCity
                    ? autoCity
                    : "Where was this taken?";
                  const activityValue =
                    edits.activity !== undefined ? edits.activity : (photo.activity_notes || "");

                  const isVideo =
                    photo.media_type === "video" ||
                    photo.filename?.toLowerCase().endsWith(".mp4") ||
                    photo.filename?.toLowerCase().endsWith(".mov") ||
                    photo.url?.includes(".mp4") ||
                    photo.url?.includes(".mov");

                  return (
                    <div
                      key={photo.id}
                      className="relative flex gap-4 sm:gap-5 items-stretch"
                    >
                      {/* Step dot */}
                      <div className="absolute left-0 top-6 -translate-x-1.5 sm:-translate-x-1">
                        <div className="h-3 w-3 rounded-full bg-indigo-500 border-2 border-white shadow shadow-indigo-200" />
                      </div>

                      {/* Card */}
                      <article className="group flex-1 flex flex-col sm:flex-row gap-3 sm:gap-4 rounded-2xl border border-white/70 bg-white/60 shadow-md backdrop-blur-xl overflow-hidden transform transition hover:scale-[1.02] hover:shadow-xl">
                        {/* Media */}
                        <div className="relative w-full sm:w-1/3 md:w-1/4 aspect-video overflow-hidden">
                          {isVideo ? (
                            <video
                              src={`${API_URL}${photo.url}`}
                              className="h-full w-full object-cover"
                              muted
                            />
                          ) : (
                            <img
                              src={`${API_URL}${photo.url}`}
                              alt={photo.location_name || ""}
                              className="h-full w-full object-cover"
                            />
                          )}

                          {/* Subtle delete button, only on hover */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deletePhoto(photo.id);
                            }}
                            className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-rose-500/90 text-[11px] font-bold text-white shadow-md opacity-0 group-hover:opacity-100 transition"
                          >
                            ×
                          </button>
                        </div>

                        {/* Narrative content */}
                        <div className="flex-1 flex flex-col justify-between px-3 sm:px-4 py-3">
                          <div className="space-y-2">
                            {/* City field */}
                            <input
                              type="text"
                              value={cityValue}
                              onChange={(e) =>
                                handleEditChange(
                                  photo.id,
                                  "city",
                                  e.target.value
                                )
                              }
                              placeholder={cityPlaceholder}
                              className="w-full rounded-lg border border-white/70 bg-white/70 px-3 py-2 text-sm font-medium text-slate-900 placeholder-slate-400 shadow-inner outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                            />

                            {/* Activity field (local narrative only) */}
                            <input
                              type="text"
                              value={activityValue}
                              onChange={(e) =>
                                handleEditChange(
                                  photo.id,
                                  "activity",
                                  e.target.value
                                )
                              }
                              placeholder="What were you doing?"
                              className="w-full rounded-lg border border-white/70 bg-white/60 px-3 py-2 text-xs text-slate-700 placeholder-slate-400 shadow-inner outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                            />
                          </div>

                          {/* Date / meta */}
                          <div className="mt-3 flex items-center text-[11px] text-slate-400">
                            <span>{formatDateTime(photo.taken_at || photo.uploaded_at)}</span>
                          </div>
                        </div>
                      </article>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        ))}
      </div>

      {/* Photo viewer modal (unchanged, for immersive view) */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 px-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-[90vw]"
            onClick={(e) => e.stopPropagation()}
          >
            {selectedPhoto.media_type === "video" ||
            selectedPhoto.filename?.toLowerCase().endsWith(".mp4") ||
            selectedPhoto.filename?.toLowerCase().endsWith(".mov") ? (
              <video
                src={`${API_URL}${selectedPhoto.url}`}
                controls
                autoPlay
                className="max-h-[90vh] max-w-full rounded-2xl shadow-2xl"
              />
            ) : (
              <img
                src={`${API_URL}${selectedPhoto.url}`}
                alt={selectedPhoto.filename}
                className="max-h-[90vh] max-w-full rounded-2xl shadow-2xl"
              />
            )}
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute -top-10 right-0 rounded-full bg-white/20 px-3 py-1 text-xs font-medium text-white backdrop-blur hover:bg-white/30 transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

export default TripTimeline;
