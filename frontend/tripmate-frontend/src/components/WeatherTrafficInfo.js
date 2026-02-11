import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_URL from "../config";

export default function WeatherTrafficInfo({ locations, routeMode, directions }) {
  const [weatherData, setWeatherData] = useState({});
  const [trafficData, setTrafficData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    // Extract traffic data from directions response
    if (directions && directions.routes && directions.routes.length > 0) {
      const route = directions.routes[0];
      if (route.legs && route.legs.length > 0) {
        let totalDuration = 0;
        let totalDurationInTraffic = 0;
        
        // Extract origin and destination from first and last legs
        const firstLeg = route.legs[0];
        const lastLeg = route.legs[route.legs.length - 1];
        
        // Try to get location names from locations prop first, fallback to addresses
        let origin = 'Origin';
        let destination = 'Destination';
        
        if (locations && locations.length > 0) {
          // First location is origin
          origin = locations[0]?.name || firstLeg.start_address || 'Origin';
          // Last location is destination
          destination = locations[locations.length - 1]?.name || lastLeg.end_address || 'Destination';
        } else {
          origin = firstLeg.start_address || 'Origin';
          destination = lastLeg.end_address || 'Destination';
        }
        
        route.legs.forEach(leg => {
          totalDuration += leg.duration?.value || 0;
          totalDurationInTraffic += leg.duration_in_traffic?.value || leg.duration?.value || 0;
        });
        
        const delay = totalDurationInTraffic - totalDuration;
        const delayMinutes = Math.round(delay / 60);
        
        setTrafficData({
          duration: totalDuration,
          durationInTraffic: totalDurationInTraffic,
          delayMinutes: delayMinutes,
          status: delayMinutes <= 5 ? 'good' : delayMinutes <= 15 ? 'moderate' : 'heavy',
          origin: origin,
          destination: destination
        });
      }
    }
  }, [directions]);

  useEffect(() => {
    if (!locations || locations.length === 0) {
      return;
    }

    // Fetch weather/traffic for driving and mixed routes (mixed routes have driving segments)
    if (routeMode !== 'DRIVING' && routeMode !== 'MIXED') {
      return;
    }

    fetchWeatherAndTraffic();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locations, routeMode]);

  const fetchWeatherAndTraffic = async () => {
    setLoading(true);
    const weatherPromises = [];

    try {
      // Fetch weather only for destinations (skip the first location which is the origin)
      const destinations = locations.length > 1 ? locations.slice(1) : [];
      
      for (const location of destinations) {
        if (location.lat && location.lng) {
          weatherPromises.push(
            axios.get(`${API_URL}/api/weather`, {
              params: { lat: location.lat, lng: location.lng }
            }).then(response => ({
              location: location.name,
              data: response.data
            })).catch(error => {
              console.error(`Error fetching weather for ${location.name}:`, error);
              return { location: location.name, data: null };
            })
          );
        }
      }

      const weatherResults = await Promise.all(weatherPromises);
      const weatherMap = {};
      weatherResults.forEach(result => {
        if (result.data) {
          weatherMap[result.location] = result.data;
        }
      });
      setWeatherData(weatherMap);
      setLastUpdated(new Date());

      // Traffic data will be extracted from Google Directions API response
      // This is handled in the parent component
    } catch (error) {
      console.error('Error fetching weather/traffic:', error);
    } finally {
      setLoading(false);
    }
  };

  const getWeatherIcon = (iconCode) => {
    if (!iconCode) return '🌤️';
    return `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
  };

  const getTrafficStatus = (duration, durationInTraffic) => {
    if (!duration || !durationInTraffic) return null;
    
    const delay = durationInTraffic - duration;
    const delayMinutes = Math.round(delay / 60);
    
    if (delayMinutes <= 5) {
      return { status: 'good', text: 'No Traffic', color: '#10b981' };
    } else if (delayMinutes <= 15) {
      return { status: 'moderate', text: `+${delayMinutes} min delay`, color: '#f59e0b' };
    } else {
      return { status: 'heavy', text: `+${delayMinutes} min delay`, color: '#ef4444' };
    }
  };

  if (routeMode !== 'DRIVING' && routeMode !== 'MIXED') {
    return null;
  }

  return (
    <div style={{
      marginTop: 'clamp(24px, 4vw, 32px)',
      marginBottom: 'clamp(24px, 4vw, 32px)',
      padding: 'clamp(28px, 5vw, 36px)',
      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.95) 100%)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderRadius: '24px',
      border: '1px solid rgba(255, 255, 255, 0.5)',
      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(255, 255, 255, 0.5) inset, 0 4px 16px rgba(0, 0, 0, 0.04)',
      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
      animation: 'fadeIn 0.6s ease-out'
    }}>
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes shimmer {
          0% { background-position: -1000px 0; }
          100% { background-position: 1000px 0; }
        }
      `}</style>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 'clamp(20px, 3vw, 24px)',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <h3 style={{
          fontSize: 'clamp(20px, 4vw, 24px)',
          fontWeight: '700',
          margin: 0,
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #a855f7 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          letterSpacing: '-0.02em'
        }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#fbbf24' }}>
            <circle cx="12" cy="12" r="4"/>
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
          </svg>
          Weather & Traffic Conditions
        </h3>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap'
        }}>
          {lastUpdated && (
            <span style={{
              fontSize: 'clamp(11px, 2vw, 12px)',
              color: '#64748b',
              fontWeight: '500',
              background: 'rgba(100, 116, 139, 0.1)',
              padding: '6px 12px',
              borderRadius: '10px',
              border: '1px solid rgba(100, 116, 139, 0.2)'
            }}>
              Updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={fetchWeatherAndTraffic}
            disabled={loading}
            style={{
              padding: 'clamp(8px, 1.5vw, 10px) clamp(16px, 3vw, 20px)',
              background: loading 
                ? 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)'
                : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none',
              borderRadius: '12px',
              color: 'white',
              fontSize: 'clamp(12px, 2vw, 13px)',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              opacity: loading ? 0.7 : 1,
              boxShadow: loading 
                ? '0 4px 12px rgba(148, 163, 184, 0.3)'
                : '0 4px 16px rgba(102, 126, 234, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(102, 126, 234, 0.4)';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(102, 126, 234, 0.3)';
              }
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }}>
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.3"/>
            </svg>
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {trafficData && (
        <div style={{
          marginBottom: 'clamp(20px, 3vw, 24px)',
          padding: 'clamp(20px, 4vw, 24px)',
          background: trafficData.status === 'good' 
            ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(5, 150, 105, 0.08) 100%)' 
            : trafficData.status === 'moderate'
            ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(217, 119, 6, 0.08) 100%)'
            : 'linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(220, 38, 38, 0.08) 100%)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          borderRadius: '20px',
          border: `1px solid ${
            trafficData.status === 'good' 
              ? 'rgba(16, 185, 129, 0.3)' 
              : trafficData.status === 'moderate'
              ? 'rgba(245, 158, 11, 0.3)'
              : 'rgba(239, 68, 68, 0.3)'
          }`,
          boxShadow: `0 8px 24px ${
            trafficData.status === 'good' 
              ? 'rgba(16, 185, 129, 0.15)' 
              : trafficData.status === 'moderate'
              ? 'rgba(245, 158, 11, 0.15)'
              : 'rgba(239, 68, 68, 0.15)'
          }`,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '3px',
            background: trafficData.status === 'good' 
              ? 'linear-gradient(90deg, #10b981, #059669)' 
              : trafficData.status === 'moderate'
              ? 'linear-gradient(90deg, #f59e0b, #d97706)'
              : 'linear-gradient(90deg, #ef4444, #dc2626)',
            borderRadius: '20px 20px 0 0'
          }}/>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '14px',
                background: trafficData.status === 'good' 
                  ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' 
                  : trafficData.status === 'moderate'
                  ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                  : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: `0 4px 12px ${
                  trafficData.status === 'good' 
                    ? 'rgba(16, 185, 129, 0.4)' 
                    : trafficData.status === 'moderate'
                    ? 'rgba(245, 158, 11, 0.4)'
                    : 'rgba(239, 68, 68, 0.4)'
                }`
              }}>
                {trafficData.status === 'good' ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                ) : trafficData.status === 'moderate' ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 9v4M12 17h.01"/>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                )}
              </div>
              <div>
                <div style={{
                  fontSize: 'clamp(16px, 3vw, 18px)',
                  fontWeight: '700',
                  color: '#1e293b',
                  marginBottom: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <span>Traffic Status</span>
                  <span style={{
                    fontSize: 'clamp(9px, 1.5vw, 10px)',
                    padding: '4px 10px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    borderRadius: '8px',
                    color: 'white',
                    fontWeight: '700',
                    letterSpacing: '0.5px',
                    boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)'
                  }}>
                    LIVE
                  </span>
                </div>
                <div style={{
                  fontSize: 'clamp(13px, 2.5vw, 14px)',
                  color: '#64748b',
                  fontWeight: '500',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}>
                  <div>
                    {trafficData.status === 'good' 
                      ? 'No significant traffic delays'
                      : trafficData.status === 'moderate'
                      ? `Moderate traffic: +${trafficData.delayMinutes} minutes`
                      : `Heavy traffic: +${trafficData.delayMinutes} minutes delay`
                    }
                  </div>
                  {trafficData.origin && trafficData.destination && (
                    <div style={{
                      fontSize: 'clamp(11px, 2vw, 12px)',
                      color: '#94a3b8',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      flexWrap: 'wrap',
                      marginTop: '6px',
                      padding: '8px 12px',
                      background: 'rgba(148, 163, 184, 0.08)',
                      borderRadius: '8px',
                      border: '1px solid rgba(148, 163, 184, 0.15)'
                    }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#667eea' }}>
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                      </svg>
                      <span style={{ fontWeight: '600', color: '#64748b' }}>Route:</span>
                      <span style={{ color: '#475569', fontWeight: '500' }}>{trafficData.origin}</span>
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#94a3b8', margin: '0 4px' }}>
                        <path d="M5 12h14M12 5l7 7-7 7"/>
                      </svg>
                      <span style={{ color: '#475569', fontWeight: '500' }}>{trafficData.destination}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div style={{
              fontSize: 'clamp(18px, 3.5vw, 22px)',
              fontWeight: '800',
              background: trafficData.status === 'good' 
                ? 'linear-gradient(135deg, #059669 0%, #10b981 100%)' 
                : trafficData.status === 'moderate'
                ? 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)'
                : 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              letterSpacing: '-0.02em'
            }}>
              {trafficData.status === 'good' ? 'Clear' : trafficData.status === 'moderate' ? 'Moderate' : 'Heavy'}
            </div>
          </div>
          <div style={{
            fontSize: 'clamp(11px, 2vw, 12px)',
            color: '#94a3b8',
            fontStyle: 'italic',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            paddingTop: '12px',
            borderTop: '1px solid rgba(148, 163, 184, 0.2)'
          }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            <span>Based on current traffic conditions as of {new Date().toLocaleString()}</span>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ 
          textAlign: 'center', 
          padding: 'clamp(32px, 5vw, 40px)', 
          color: '#64748b',
          fontSize: 'clamp(14px, 2.5vw, 16px)',
          fontWeight: '500'
        }}>
          Loading weather and traffic information...
        </div>
      ) : Object.keys(weatherData).length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: 'clamp(32px, 5vw, 40px)', 
          color: '#94a3b8',
          fontSize: 'clamp(13px, 2.5vw, 14px)',
          fontStyle: 'italic'
        }}>
          Weather information will be displayed here once available.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(16px, 3vw, 20px)' }}>
          {Object.entries(weatherData).map(([locationName, weather]) => {
            if (!weather) return null;

            return (
              <div
                key={locationName}
                style={{
                  padding: 'clamp(20px, 4vw, 24px)',
                  background: weather.is_good_weather 
                    ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(5, 150, 105, 0.08) 100%)' 
                    : 'linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(220, 38, 38, 0.08) 100%)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  borderRadius: '20px',
                  border: `1px solid ${weather.is_good_weather ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                  boxShadow: `0 8px 24px ${weather.is_good_weather ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)'}`,
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '3px',
                  background: weather.is_good_weather 
                    ? 'linear-gradient(90deg, #10b981, #059669)' 
                    : 'linear-gradient(90deg, #ef4444, #dc2626)',
                  borderRadius: '20px 20px 0 0'
                }}/>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: 'clamp(16px, 3vw, 20px)'
                }}>
                  <div>
                    <div style={{
                      fontSize: 'clamp(18px, 3.5vw, 20px)',
                      fontWeight: '700',
                      color: '#1e293b',
                      marginBottom: '6px',
                      letterSpacing: '-0.01em'
                    }}>
                      {locationName}
                    </div>
                    <div style={{
                      fontSize: 'clamp(13px, 2.5vw, 14px)',
                      color: '#64748b',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      flexWrap: 'wrap',
                      fontWeight: '500'
                    }}>
                      <span>{weather.location}, {weather.country}</span>
                      <span style={{
                        fontSize: 'clamp(11px, 2vw, 12px)',
                        color: '#94a3b8',
                        fontStyle: 'italic',
                        background: 'rgba(148, 163, 184, 0.1)',
                        padding: '2px 8px',
                        borderRadius: '6px'
                      }}>
                        Current conditions
                      </span>
                    </div>
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}>
                    {weather.icon && (
                      <img
                        src={getWeatherIcon(weather.icon)}
                        alt={weather.description}
                        style={{ 
                          width: 'clamp(56px, 8vw, 64px)', 
                          height: 'clamp(56px, 8vw, 64px)',
                          filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1))'
                        }}
                      />
                    )}
                    <div>
                      <div style={{
                        fontSize: 'clamp(28px, 5vw, 32px)',
                        fontWeight: '800',
                        background: 'linear-gradient(135deg, #1e293b 0%, #475569 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        letterSpacing: '-0.02em'
                      }}>
                        {weather.temperature}°C
                      </div>
                      <div style={{
                        fontSize: 'clamp(11px, 2vw, 12px)',
                        color: '#94a3b8',
                        fontWeight: '500'
                      }}>
                        Feels like {weather.feels_like}°C
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  gap: 'clamp(12px, 2.5vw, 16px)',
                  flexWrap: 'wrap',
                  marginTop: 'clamp(16px, 3vw, 20px)',
                  paddingTop: 'clamp(16px, 3vw, 20px)',
                  borderTop: '1px solid rgba(148, 163, 184, 0.2)'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: 'clamp(13px, 2.5vw, 14px)',
                    color: '#475569',
                    fontWeight: '500',
                    background: 'rgba(71, 85, 105, 0.08)',
                    padding: '8px 14px',
                    borderRadius: '10px'
                  }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                      <polyline points="14 2 14 8 20 8"/>
                    </svg>
                    <span>{weather.description}</span>
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: 'clamp(13px, 2.5vw, 14px)',
                    color: '#475569',
                    fontWeight: '500',
                    background: 'rgba(71, 85, 105, 0.08)',
                    padding: '8px 14px',
                    borderRadius: '10px'
                  }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2"/>
                      <path d="M9.6 4.6A2 2 0 1 1 11 8H2"/>
                      <path d="M12.6 19.4A2 2 0 1 0 14 16H2"/>
                    </svg>
                    <span>{weather.wind_speed} km/h</span>
                  </div>
                  {weather.visibility && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: 'clamp(13px, 2.5vw, 14px)',
                      color: '#475569',
                      fontWeight: '500',
                      background: 'rgba(71, 85, 105, 0.08)',
                      padding: '8px 14px',
                      borderRadius: '10px'
                    }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                      <span>{weather.visibility} km visibility</span>
                    </div>
                  )}
                </div>

                <div style={{
                  marginTop: 'clamp(16px, 3vw, 20px)',
                  padding: 'clamp(10px, 2vw, 12px) clamp(16px, 3vw, 20px)',
                  background: weather.is_good_weather 
                    ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.1) 100%)' 
                    : 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(220, 38, 38, 0.1) 100%)',
                  borderRadius: '12px',
                  fontSize: 'clamp(13px, 2.5vw, 14px)',
                  fontWeight: '600',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  border: `1px solid ${weather.is_good_weather ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                }}>
                  {weather.is_good_weather ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="12" y1="8" x2="12" y2="12"/>
                      <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                  )}
                  <span style={{
                    color: weather.is_good_weather ? '#059669' : '#dc2626',
                    fontWeight: '600'
                  }}>
                    {weather.is_good_weather ? 'Good conditions for travel' : 'Challenging weather conditions'}
                  </span>
                  <span style={{
                    fontSize: 'clamp(11px, 2vw, 12px)',
                    color: '#94a3b8',
                    fontWeight: '500',
                    marginLeft: '4px'
                  }}>
                    • {new Date().toLocaleDateString()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

