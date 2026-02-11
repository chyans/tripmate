import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_URL from "../config";

export default function MemoriesPage({ token, user, onBack }) {
  const [photosByTrip, setPhotosByTrip] = useState([]);
  const [allPhotos, setAllPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedView, setSelectedView] = useState('grid'); // 'grid' or 'by-trip'
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMediaType, setFilterMediaType] = useState('all'); // 'all', 'image', 'video'
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [photoToDelete, setPhotoToDelete] = useState(null);

  useEffect(() => {
    fetchAllPhotos();
  }, [token]);

  const fetchAllPhotos = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/photos/user/all`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setPhotosByTrip(response.data.photos_by_trip || []);
      
      // Flatten all photos for grid view
      const flattened = [];
      response.data.photos_by_trip.forEach(trip => {
        trip.photos.forEach(photo => {
          flattened.push({ ...photo, trip_name: trip.trip_name, trip_id: trip.trip_id });
        });
      });
      setAllPhotos(flattened);
    } catch (error) {
      console.error('Error fetching photos:', error);
      alert('Failed to load photos. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePhoto = async (photoId) => {
    try {
      await axios.delete(`${API_URL}/api/photos/${photoId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Find trip_id from photoToDelete
      const tripId = photoToDelete?.trip_id;
      
      // Update state
      if (tripId) {
        setPhotosByTrip(prev => prev.map(trip => {
          if (trip.trip_id === tripId) {
            return {
              ...trip,
              photos: trip.photos.filter(p => p.id !== photoId)
            };
          }
          return trip;
        }));
      }
      
      setAllPhotos(prev => prev.filter(p => p.id !== photoId));
      setShowDeleteConfirm(false);
      setPhotoToDelete(null);
      setSelectedPhoto(null);
    } catch (error) {
      console.error('Error deleting photo:', error);
      alert('Failed to delete photo. Please try again.');
    }
  };

  const filteredPhotos = allPhotos.filter(photo => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        photo.filename.toLowerCase().includes(query) ||
        photo.location_name?.toLowerCase().includes(query) ||
        photo.trip_name?.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }
    
    // Media type filter
    if (filterMediaType !== 'all') {
      if (filterMediaType === 'image' && photo.media_type !== 'image') return false;
      if (filterMediaType === 'video' && photo.media_type !== 'video') return false;
    }
    
    return true;
  });

  const filteredTrips = photosByTrip.filter(trip => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return trip.trip_name.toLowerCase().includes(query) ||
             trip.photos.some(p => 
               p.filename.toLowerCase().includes(query) ||
               p.location_name?.toLowerCase().includes(query)
             );
    }
    return true;
  }).map(trip => ({
    ...trip,
    photos: trip.photos.filter(photo => {
      if (filterMediaType !== 'all') {
        if (filterMediaType === 'image' && photo.media_type !== 'image') return false;
        if (filterMediaType === 'video' && photo.media_type !== 'video') return false;
      }
      return true;
    })
  })).filter(trip => trip.photos.length > 0);

  const openPhotoViewer = (photo) => {
    setSelectedPhoto(photo);
  };

  const closePhotoViewer = () => {
    setSelectedPhoto(null);
  };

  const navigatePhoto = (direction) => {
    const currentIndex = filteredPhotos.findIndex(p => p.id === selectedPhoto.id);
    let newIndex;
    if (direction === 'next') {
      newIndex = (currentIndex + 1) % filteredPhotos.length;
    } else {
      newIndex = (currentIndex - 1 + filteredPhotos.length) % filteredPhotos.length;
    }
    setSelectedPhoto(filteredPhotos[newIndex]);
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <div style={{
          textAlign: 'center',
          color: 'white'
        }}>
          <div style={{
            fontSize: '24px',
            fontWeight: '700',
            marginBottom: '16px'
          }}>
            Loading your memories...
          </div>
          <div style={{
            width: '50px',
            height: '50px',
            border: '4px solid rgba(255,255,255,0.3)',
            borderTop: '4px solid white',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto'
          }}></div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      padding: 'clamp(24px, 4vw, 48px)',
      paddingTop: 'clamp(80px, 8vw, 120px)'
    }}>
      {/* Header */}
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto 40px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div>
          <h1 style={{
            fontSize: 'clamp(32px, 5vw, 48px)',
            fontWeight: '900',
            color: '#1e293b',
            marginBottom: '8px',
            letterSpacing: '-0.02em'
          }}>
            📸 Your Memories
          </h1>
          <p style={{
            fontSize: 'clamp(15px, 2vw, 18px)',
            color: '#64748b'
          }}>
            {allPhotos.length} {allPhotos.length === 1 ? 'photo' : 'photos'} across {photosByTrip.length} {photosByTrip.length === 1 ? 'trip' : 'trips'}
          </p>
        </div>
        <button
          onClick={onBack}
          style={{
            padding: '12px 24px',
            background: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(10px)',
            border: '2px solid rgba(102, 126, 234, 0.3)',
            borderRadius: '12px',
            color: '#667eea',
            fontSize: '15px',
            fontWeight: '700',
            cursor: 'pointer',
            transition: 'all 0.3s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
            e.currentTarget.style.color = 'white';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.9)';
            e.currentTarget.style.color = '#667eea';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          ← Back
        </button>
      </div>

      {/* Search and Filters */}
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto 32px',
        display: 'flex',
        gap: '16px',
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        <div style={{
          flex: '1',
          minWidth: '250px',
          position: 'relative'
        }}>
          <input
            type="text"
            placeholder="🔍 Search photos by trip, location, or filename..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '14px 20px 14px 48px',
              borderRadius: '12px',
              border: '2px solid rgba(226, 232, 240, 0.8)',
              fontSize: '15px',
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)',
              outline: 'none',
              transition: 'all 0.3s'
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#667eea';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'rgba(226, 232, 240, 0.8)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
        </div>
        
        <select
          value={filterMediaType}
          onChange={(e) => setFilterMediaType(e.target.value)}
          style={{
            padding: '14px 20px',
            borderRadius: '12px',
            border: '2px solid rgba(226, 232, 240, 0.8)',
            fontSize: '15px',
            background: 'rgba(255, 255, 255, 0.95)',
            cursor: 'pointer',
            outline: 'none'
          }}
        >
          <option value="all">All Media</option>
          <option value="image">Photos Only</option>
          <option value="video">Videos Only</option>
        </select>

        <div style={{
          display: 'flex',
          gap: '8px',
          background: 'rgba(255, 255, 255, 0.95)',
          padding: '4px',
          borderRadius: '12px',
          border: '2px solid rgba(226, 232, 240, 0.8)'
        }}>
          <button
            onClick={() => setSelectedView('grid')}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              background: selectedView === 'grid' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'transparent',
              color: selectedView === 'grid' ? 'white' : '#64748b',
              fontSize: '14px',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.3s'
            }}
          >
            Grid View
          </button>
          <button
            onClick={() => setSelectedView('by-trip')}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              background: selectedView === 'by-trip' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'transparent',
              color: selectedView === 'by-trip' ? 'white' : '#64748b',
              fontSize: '14px',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.3s'
            }}
          >
            By Trip
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {selectedView === 'grid' ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
            gap: '20px'
          }}>
            {filteredPhotos.map(photo => (
              <div
                key={photo.id}
                style={{
                  position: 'relative',
                  aspectRatio: '1',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  background: '#e2e8f0',
                  cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
                  transition: 'all 0.3s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0,0, 0.1)';
                }}
                onClick={() => openPhotoViewer(photo)}
              >
                {photo.media_type === 'video' ? (
                  <video
                    src={`${API_URL}${photo.url}`}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
                ) : (
                  <img
                    src={`${API_URL}${photo.url}`}
                    alt={photo.filename}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
                )}
                <div style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
                  padding: '16px',
                  color: 'white'
                }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>
                    {photo.trip_name}
                  </div>
                  <div style={{ fontSize: '11px', opacity: 0.9 }}>
                    {photo.location_name || 'Unknown location'}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setPhotoToDelete(photo);
                    setShowDeleteConfirm(true);
                  }}
                  style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: 'rgba(239, 68, 68, 0.9)',
                    border: 'none',
                    color: 'white',
                    fontSize: '18px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.3s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(239, 68, 68, 1)';
                    e.currentTarget.style.transform = 'scale(1.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.9)';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {filteredTrips.map(trip => (
              <div
                key={trip.trip_id}
                style={{
                  background: 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: '20px',
                  padding: '24px',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)'
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '20px'
                }}>
                  <div>
                    <h3 style={{
                      fontSize: '24px',
                      fontWeight: '800',
                      color: '#1e293b',
                      marginBottom: '4px'
                    }}>
                      {trip.trip_name}
                    </h3>
                    <p style={{
                      fontSize: '14px',
                      color: '#64748b'
                    }}>
                      {trip.photos.length} {trip.photos.length === 1 ? 'photo' : 'photos'}
                      {trip.start_date && trip.end_date && (
                        <span> • {new Date(trip.start_date).toLocaleDateString()} - {new Date(trip.end_date).toLocaleDateString()}</span>
                      )}
                    </p>
                  </div>
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                  gap: '16px'
                }}>
                  {trip.photos.map(photo => (
                    <div
                      key={photo.id}
                      style={{
                        position: 'relative',
                        aspectRatio: '1',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        background: '#e2e8f0',
                        cursor: 'pointer',
                        transition: 'all 0.3s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.05)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                      onClick={() => openPhotoViewer(photo)}
                    >
                      {photo.media_type === 'video' ? (
                        <video
                          src={`${API_URL}${photo.url}`}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                          }}
                        />
                      ) : (
                        <img
                          src={`${API_URL}${photo.url}`}
                          alt={photo.filename}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                          }}
                        />
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPhotoToDelete(photo);
                          setShowDeleteConfirm(true);
                        }}
                        style={{
                          position: 'absolute',
                          top: '8px',
                          right: '8px',
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          background: 'rgba(239, 68, 68, 0.9)',
                          border: 'none',
                          color: 'white',
                          fontSize: '16px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredPhotos.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '80px 20px',
            color: '#64748b'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📷</div>
            <div style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>
              No photos found
            </div>
            <div style={{ fontSize: '15px' }}>
              {searchQuery || filterMediaType !== 'all' 
                ? 'Try adjusting your search or filters'
                : 'Start adding photos to your trips to see them here!'}
            </div>
          </div>
        )}
      </div>

      {/* Photo Viewer Modal */}
      {selectedPhoto && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.95)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={closePhotoViewer}
        >
          <div
            style={{
              maxWidth: '90vw',
              maxHeight: '90vh',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {selectedPhoto.media_type === 'video' ? (
              <video
                src={`${API_URL}${selectedPhoto.url}`}
                controls
                autoPlay
                style={{
                  maxWidth: '100%',
                  maxHeight: '90vh',
                  borderRadius: '12px'
                }}
              />
            ) : (
              <img
                src={`${API_URL}${selectedPhoto.url}`}
                alt={selectedPhoto.filename}
                style={{
                  maxWidth: '100%',
                  maxHeight: '90vh',
                  borderRadius: '12px',
                  objectFit: 'contain'
                }}
              />
            )}
            <div style={{
              position: 'absolute',
              bottom: '20px',
              left: '20px',
              right: '20px',
              background: 'rgba(0, 0, 0, 0.7)',
              padding: '16px',
              borderRadius: '12px',
              color: 'white'
            }}>
              <div style={{ fontSize: '18px', fontWeight: '700', marginBottom: '4px' }}>
                {selectedPhoto.trip_name}
              </div>
              <div style={{ fontSize: '14px', opacity: 0.9 }}>
                {selectedPhoto.location_name || 'Unknown location'}
              </div>
            </div>
            <button
              onClick={closePhotoViewer}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                color: 'white',
                fontSize: '24px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ×
            </button>
            {filteredPhotos.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigatePhoto('prev');
                  }}
                  style={{
                    position: 'absolute',
                    left: '20px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.2)',
                    border: 'none',
                    color: 'white',
                    fontSize: '24px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  ‹
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigatePhoto('next');
                  }}
                  style={{
                    position: 'absolute',
                    right: '20px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.2)',
                    border: 'none',
                    color: 'white',
                    fontSize: '24px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  ›
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && photoToDelete && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            zIndex: 10001,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => {
            setShowDeleteConfirm(false);
            setPhotoToDelete(null);
          }}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '20px',
              padding: '32px',
              maxWidth: '400px',
              width: '100%'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{
              fontSize: '20px',
              fontWeight: '700',
              color: '#1e293b',
              marginBottom: '16px'
            }}>
              Delete Photo?
            </h3>
            <p style={{
              fontSize: '15px',
              color: '#64748b',
              marginBottom: '24px'
            }}>
              Are you sure you want to delete this photo? This action cannot be undone.
            </p>
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setPhotoToDelete(null);
                }}
                style={{
                  padding: '12px 24px',
                  background: 'rgba(226, 232, 240, 0.8)',
                  border: 'none',
                  borderRadius: '10px',
                  color: '#64748b',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeletePhoto(photoToDelete.id)}
                style={{
                  padding: '12px 24px',
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  border: 'none',
                  borderRadius: '10px',
                  color: 'white',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

