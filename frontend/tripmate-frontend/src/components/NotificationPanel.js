import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import API_URL from "../config";

export default function NotificationPanel({ token, user, position }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [panelPosition, setPanelPosition] = useState({ top: 0, right: 0 });
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const panelRef = useRef(null);
  const buttonRef = useRef(null);

  // Track window size for responsive behavior
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    fetchNotifications();
    // Refresh notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [token]);

  // Update panel position when opening
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      if (isMobile) {
        setPanelPosition({
          top: 60,
          right: 16,
          left: 16
        });
      } else {
        setPanelPosition({
          top: rect.bottom + 8,
          right: window.innerWidth - rect.right
        });
      }
    }
  }, [isOpen, isMobile]);

  // Close panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target) &&
          buttonRef.current && !buttonRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const fetchNotifications = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/notifications/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(response.data.notifications || []);
      setUnreadCount(response.data.unread_count || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await axios.put(`${API_URL}/api/notifications/${notificationId}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => 
        n.id === notificationId ? { ...n, is_read: true } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await axios.put(`${API_URL}/api/notifications/read-all`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      await axios.delete(`${API_URL}/api/notifications/${notificationId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Remove the deleted notification from the list
      setNotifications(prev => {
        const deleted = prev.find(n => n.id === notificationId);
        if (deleted && !deleted.is_read) {
          setUnreadCount(prevCount => Math.max(0, prevCount - 1));
        }
        return prev.filter(n => n.id !== notificationId);
      });
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  return (
    <>
      <style>{`
        @keyframes fadeInDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
      <div style={{ position: 'relative' }}>
        {/* Notification Icon Button */}
        <button
          ref={buttonRef}
          onClick={() => setIsOpen(!isOpen)}
          style={{
            position: 'relative',
            width: isMobile ? '44px' : '40px',
            height: isMobile ? '44px' : '40px',
            minWidth: isMobile ? '44px' : '40px',
            minHeight: isMobile ? '44px' : '40px',
            borderRadius: '12px',
            background: isOpen ? 'rgba(102, 126, 234, 0.1)' : (isMobile ? '#f1f5f9' : 'transparent'),
            border: isMobile ? '1.5px solid #cbd5e1' : '1px solid #e2e8f0',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            color: isMobile ? '#475569' : '#64748b',
            padding: 0
          }}
          onMouseEnter={(e) => {
            if (!isOpen) {
              e.currentTarget.style.background = '#f8fafc';
              e.currentTarget.style.borderColor = '#cbd5e1';
              e.currentTarget.style.transform = 'scale(1.05)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isOpen) {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.borderColor = '#e2e8f0';
              e.currentTarget.style.transform = 'scale(1)';
            }
          }}
        >
          <svg
            width={isMobile ? "28" : "20"}
            height={isMobile ? "28" : "20"}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={isMobile ? "2.5" : "2"}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ display: 'block', flexShrink: 0 }}
          >
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>
          {unreadCount > 0 && (
            <span
              style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                minWidth: '20px',
                height: '20px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                color: 'white',
                fontSize: '11px',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 6px',
                boxShadow: '0 2px 8px rgba(239, 68, 68, 0.4)',
                animation: unreadCount > 0 ? 'pulse 2s ease-in-out infinite' : 'none'
              }}
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* Notification Panel Dropdown */}
        {isOpen && (
          <div
            ref={panelRef}
            style={{
              position: 'fixed',
              top: isMobile ? '60px' : `${panelPosition.top}px`,
              right: isMobile ? '16px' : `${panelPosition.right}px`,
              left: isMobile ? '16px' : 'auto',
              width: isMobile ? 'calc(100% - 32px)' : '380px',
              maxWidth: isMobile ? 'calc(100% - 32px)' : '380px',
              maxHeight: isMobile ? 'calc(100vh - 100px)' : '500px',
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              borderRadius: isMobile ? '16px' : '20px',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.5) inset',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              zIndex: 99998,
              overflow: 'hidden',
              animation: 'fadeInDown 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: isMobile ? '16px' : '20px',
                borderBottom: '1px solid rgba(226, 232, 240, 0.5)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '8px'
              }}
            >
              <h3
                style={{
                  fontSize: isMobile ? '16px' : '18px',
                  fontWeight: '700',
                  color: '#1e293b',
                  margin: 0
                }}
              >
                Notifications
              </h3>
              {unreadCount > 0 && (
                <span
                  style={{
                    fontSize: '13px',
                    color: '#64748b',
                    fontWeight: '500'
                  }}
                >
                  {unreadCount} unread
                </span>
              )}
            </div>

            {/* Notifications List */}
            <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  maxHeight: isMobile ? 'calc(100vh - 200px)' : '400px',
                  WebkitOverflowScrolling: 'touch'
                }}
            >
              {loading ? (
                <div
                  style={{
                    padding: '40px',
                    textAlign: 'center',
                    color: '#64748b'
                  }}
                >
                  Loading notifications...
                </div>
              ) : notifications.length === 0 ? (
                <div
                  style={{
                    padding: '40px',
                    textAlign: 'center',
                    color: '#64748b'
                  }}
                >
                  <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔔</div>
                  <div style={{ fontSize: '15px', fontWeight: '500' }}>
                    No notifications
                  </div>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    style={{
                      padding: isMobile ? '12px 16px' : '16px 20px',
                      borderBottom: '1px solid rgba(226, 232, 240, 0.5)',
                      background: notification.is_read
                        ? 'transparent'
                        : 'rgba(99, 102, 241, 0.05)',
                      transition: 'all 0.3s',
                      position: 'relative'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = notification.is_read
                        ? 'rgba(248, 250, 252, 0.8)'
                        : 'rgba(99, 102, 241, 0.08)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = notification.is_read
                        ? 'transparent'
                        : 'rgba(99, 102, 241, 0.05)';
                    }}
                  >
                    {!notification.is_read && (
                      <div
                        style={{
                          position: 'absolute',
                          left: '8px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
                        }}
                      />
                    )}
                    <div style={{ paddingLeft: notification.is_read ? '0' : '16px' }}>
                      <p
                        style={{
                          fontSize: '14px',
                          color: '#1e293b',
                          margin: '0 0 8px 0',
                          lineHeight: '1.5',
                          fontWeight: notification.is_read ? '400' : '600'
                        }}
                      >
                        {notification.message}
                      </p>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginTop: '8px',
                          gap: '8px'
                        }}
                      >
                        <span
                          style={{
                            fontSize: '12px',
                            color: '#94a3b8'
                          }}
                        >
                          {new Date(notification.created_at).toLocaleDateString()}
                        </span>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          {!notification.is_read && (
                            <button
                              onClick={() => markAsRead(notification.id)}
                              style={{
                                padding: '4px 12px',
                                background: 'rgba(99, 102, 241, 0.1)',
                                border: 'none',
                                borderRadius: '8px',
                                color: '#6366f1',
                                fontSize: '12px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(99, 102, 241, 0.2)';
                                e.currentTarget.style.transform = 'scale(1.05)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(99, 102, 241, 0.1)';
                                e.currentTarget.style.transform = 'scale(1)';
                              }}
                            >
                              Mark as read
                            </button>
                          )}
                          <button
                            onClick={() => deleteNotification(notification.id)}
                            style={{
                              padding: '4px 8px',
                              background: 'rgba(239, 68, 68, 0.1)',
                              border: 'none',
                              borderRadius: '8px',
                              color: '#ef4444',
                              fontSize: '12px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              minWidth: '32px',
                              height: '28px'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                              e.currentTarget.style.transform = 'scale(1.05)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                              e.currentTarget.style.transform = 'scale(1)';
                            }}
                            title="Delete notification"
                          >
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M3 6h18"></path>
                              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && unreadCount > 0 && (
              <div
                style={{
                  padding: '16px 20px',
                  borderTop: '1px solid rgba(226, 232, 240, 0.5)',
                  background: 'rgba(248, 250, 252, 0.5)'
                }}
              >
                <button
                  onClick={markAllAsRead}
                style={{
                  width: '100%',
                  padding: isMobile ? '12px' : '10px',
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  border: 'none',
                  borderRadius: '12px',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  minHeight: isMobile ? '44px' : 'auto'
                }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(99, 102, 241, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  Mark all as read
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

