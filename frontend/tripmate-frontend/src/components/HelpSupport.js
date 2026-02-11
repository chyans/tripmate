import React, { useState, useEffect, useRef } from "react";

export default function HelpSupport({ onBack }) {
  const [openSection, setOpenSection] = useState(null);
  const [visible, setVisible] = useState(false);
  const containerRef = useRef(null);
  const sectionRefs = useRef([]);

  const RocketIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
      <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/>
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>
    </svg>
  );

  const CameraIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13.997 4a2 2 0 0 1 1.76 1.05l.486.9A2 2 0 0 0 18.003 7H20a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1.997a2 2 0 0 0 1.759-1.048l.489-.904A2 2 0 0 1 10.004 4z"/>
      <circle cx="12" cy="13" r="3"/>
    </svg>
  );

  const SettingsIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );

  const WrenchIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.106-3.105c.32-.322.863-.22.983.218a6 6 0 0 1-8.259 7.057l-7.91 7.91a1 1 0 0 1-2.999-3l7.91-7.91a6 6 0 0 1 7.057-8.259c.438.12.54.662.219.984z"/>
    </svg>
  );

  const faqSections = [
    {
      title: "Getting Started",
      icon: <RocketIcon />,
      items: [
        {
          q: "How do I create my first trip?",
          a: "Click on 'Create New Trip' from the home page or trips list. Enter your starting point and destinations, then click 'Plan & Save Trip' to get an optimized route."
        },
        {
          q: "How does route optimization work?",
          a: "TripMate uses advanced algorithms to find the shortest route visiting all your destinations. It tries all possible orders and picks the one with the shortest total distance."
        },
        {
          q: "Can I change my trip after creating it?",
          a: "Yes! Open your trip from 'My Trips' and you can edit the name, description, destinations, and other details. Click 'Update Trip' to save changes."
        }
      ]
    },
    {
      title: "Photos & Memories",
      icon: <CameraIcon />,
      items: [
        {
          q: "How do I upload photos?",
          a: "After saving a trip, scroll down to the Photo Gallery section. Click 'Upload Photos' and select images from your device. Photos are organized by location."
        },
        {
          q: "What's the photo & video size limit?",
          a: "Free users can upload up to 100MB total of photos and videos per trip. Premium users can upload up to 1GB total per trip. There is no per-file size limit."
        },
        {
          q: "How do I view my photos?",
          a: "Photos appear in the Photo Gallery section of your trip. When you end a trip, a slideshow will automatically display all your trip photos."
        }
      ]
    },
    {
      title: "Premium Features",
      icon: "⭐",
      items: [
        {
          q: "What's included in Premium?",
          a: "Premium includes unlimited AI-powered Q&A, video export of your trips, larger photo & video upload limits (1GB per trip), and priority support."
        },
        {
          q: "How do I subscribe to Premium?",
          a: "Go to your profile menu and select 'Subscription'. Click 'Subscribe to Premium' to activate your 30-day subscription."
        },
        {
          q: "Can I cancel my subscription?",
          a: "Yes, you can cancel anytime from the Subscription page. Your premium access will remain active until the end of your billing period."
        }
      ]
    },
    {
      title: "Technical Support",
      icon: <WrenchIcon />,
      items: [
        {
          q: "I can't save my trip",
          a: "Ensure you're logged in and have a valid session. Try refreshing the page or logging out and back in. Check that all required fields are filled."
        },
        {
          q: "Photos won't upload",
          a: "Check that your total upload size is under the limit (100MB per trip for free users, 1GB per trip for premium users). Ensure your trip is saved first, and try using a different browser if issues persist."
        }
      ]
    },
    {
      title: "Account & Settings",
      icon: <SettingsIcon />,
      items: [
        {
          q: "How do I change my password?",
          a: "Go to 'Edit Profile' from your profile menu. Enter your current password and new password, then click 'Save Changes'."
        },
        {
          q: "Can I delete my account?",
          a: "Yes, you can delete your account from Account Settings. This will permanently delete all your trips, photos, and data. This action cannot be undone."
        },
        {
          q: "How do I update my email?",
          a: "Go to 'Edit Profile' and update your email address. Make sure the new email isn't already registered to another account."
        }
      ]
    }
  ];

  // Scroll reveal animation
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
        }
      },
      { threshold: 0.05, rootMargin: "200px 0px 0px 0px" }
    );
    if (containerRef.current) {
      observer.observe(containerRef.current);
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.top < window.innerHeight + 200 && rect.bottom > -200) {
        setVisible(true);
      }
    }
    return () => observer.disconnect();
  }, []);

  // Observe FAQ sections for staggered animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.style.opacity = "1";
            entry.target.style.transform = "translateY(0)";
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
    );

    sectionRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => {
      sectionRefs.current.forEach((ref) => {
        if (ref) observer.unobserve(ref);
      });
    };
  }, []);

  const toggleSection = (index) => {
    setOpenSection(openSection === index ? null : index);
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
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
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
      <div style={{
        width: "100%",
        position: "relative",
        zIndex: 1,
        flex: "1 0 auto",
        background: "transparent",
        minHeight: "100vh"
      }}>
        <div 
          ref={containerRef}
          style={{
            maxWidth: "1200px",
            width: "100%",
            margin: "0 auto",
            padding: "clamp(32px, 6vw, 64px) clamp(24px, 4vw, 48px)",
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(30px)",
            transition: "opacity 0.8s cubic-bezier(0.34, 1.56, 0.64, 1), transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)"
          }}
        >
          {/* Header */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "clamp(40px, 6vw, 56px)",
            flexWrap: "wrap",
            gap: "20px",
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(20px)",
            transition: "opacity 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s, transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s"
          }}>
            <div>
              <h1 style={{
                fontSize: "clamp(36px, 6vw, 48px)",
                fontWeight: "900",
                background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                marginBottom: "clamp(8px, 1.5vw, 12px)",
                letterSpacing: "-0.04em",
                lineHeight: "1.1"
              }}>
                Help & Support
              </h1>
              <p style={{
                fontSize: "clamp(15px, 2.5vw, 18px)",
                color: "#64748b",
                fontWeight: "400"
              }}>
                Find answers to common questions and get support
              </p>
            </div>
            {onBack && (
              <button
                onClick={onBack}
                style={{
                  padding: "clamp(10px, 2vw, 12px) clamp(20px, 3vw, 24px)",
                  background: "rgba(255, 255, 255, 0.7)",
                  backdropFilter: "blur(20px)",
                  WebkitBackdropFilter: "blur(20px)",
                  color: "#64748b",
                  border: "1px solid rgba(226, 232, 240, 0.5)",
                  borderRadius: "12px",
                  cursor: "pointer",
                  fontSize: "clamp(14px, 2vw, 15px)",
                  fontWeight: "600",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.04)"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.9)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 8px 24px rgba(0, 0, 0, 0.08)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.7)";
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.04)";
                }}
              >
                Back
              </button>
            )}
          </div>

          {/* Contact Section */}
          <div style={{
            background: "linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderRadius: "24px",
            padding: "clamp(32px, 5vw, 40px)",
            marginBottom: "clamp(40px, 6vw, 56px)",
            border: "1px solid rgba(99, 102, 241, 0.2)",
            boxShadow: "0 20px 60px rgba(99, 102, 241, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.5) inset",
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(20px)",
            transition: "opacity 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s, transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s",
            animation: visible ? "fadeInUp 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s both" : "none"
          }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              marginBottom: "20px"
            }}>
              <div style={{
                width: "56px",
                height: "56px",
                background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                borderRadius: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "28px",
                animation: "float 3s ease-in-out infinite"
              }}>
                💬
              </div>
              <div>
                <h2 style={{
                  fontSize: "clamp(22px, 3.5vw, 28px)",
                  fontWeight: "700",
                  color: "#1e293b",
                  marginBottom: "4px",
                  letterSpacing: "-0.01em"
                }}>
                  Need More Help?
                </h2>
                <p style={{
                  color: "#64748b",
                  fontSize: "clamp(14px, 2vw, 16px)",
                  margin: 0
                }}>
                  Can't find what you're looking for? Contact our support team
                </p>
              </div>
            </div>
            <div style={{
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              marginTop: "24px"
            }}>
              <a
                href="mailto:support@tripmate.com"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "16px 20px",
                  background: "rgba(255, 255, 255, 0.6)",
                  backdropFilter: "blur(10px)",
                  borderRadius: "12px",
                  color: "#475569",
                  fontSize: "clamp(14px, 2vw, 16px)",
                  fontWeight: "500",
                  textDecoration: "none",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  border: "1px solid rgba(255, 255, 255, 0.3)"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.9)";
                  e.currentTarget.style.transform = "translateX(4px)";
                  e.currentTarget.style.boxShadow = "0 4px 16px rgba(99, 102, 241, 0.2)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.6)";
                  e.currentTarget.style.transform = "translateX(0)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <span style={{ fontSize: "20px" }}>📧</span>
                <span>support@tripmate.com</span>
              </a>
            </div>
          </div>

          {/* FAQ Sections */}
          <div style={{
            display: "grid",
            gap: "clamp(20px, 3vw, 24px)"
          }}>
            {faqSections.map((section, sectionIndex) => (
              <div
                key={sectionIndex}
                ref={(el) => {
                  if (el) sectionRefs.current[sectionIndex] = el;
                }}
                style={{
                  background: "rgba(255, 255, 255, 0.7)",
                  backdropFilter: "blur(20px)",
                  WebkitBackdropFilter: "blur(20px)",
                  borderRadius: "24px",
                  overflow: "hidden",
                  boxShadow: "0 20px 60px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(255, 255, 255, 0.5) inset",
                  border: "1px solid rgba(255, 255, 255, 0.3)",
                  opacity: 0,
                  transform: "translateY(20px)",
                  transition: "opacity 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)"
                }}
              >
                <button
                  onClick={() => toggleSection(sectionIndex)}
                  style={{
                    width: "100%",
                    padding: "clamp(20px, 3vw, 24px)",
                    background: openSection === sectionIndex 
                      ? "linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)"
                      : "transparent",
                    border: "none",
                    borderRadius: openSection === sectionIndex ? "24px 24px 0 0" : "24px",
                    cursor: "pointer",
                    textAlign: "left",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "16px",
                    transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)"
                  }}
                  onMouseEnter={(e) => {
                    if (openSection !== sectionIndex) {
                      e.currentTarget.style.background = "rgba(99, 102, 241, 0.05)";
                      e.currentTarget.style.transform = "translateX(4px)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (openSection !== sectionIndex) {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.transform = "translateX(0)";
                    }
                  }}
                >
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "16px"
                  }}>
                    <div style={{
                      width: "48px",
                      height: "48px",
                      background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                      borderRadius: "12px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "24px",
                      flexShrink: 0,
                      boxShadow: "0 4px 16px rgba(99, 102, 241, 0.3)",
                      color: "white"
                    }}>
                      {section.icon}
                    </div>
                    <h3 style={{
                      fontSize: "clamp(18px, 2.5vw, 22px)",
                      fontWeight: "700",
                      color: "#1e293b",
                      margin: 0,
                      letterSpacing: "-0.01em"
                    }}>
                      {section.title}
                    </h3>
                  </div>
                  <div style={{
                    width: "32px",
                    height: "32px",
                    background: openSection === sectionIndex 
                      ? "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)"
                      : "rgba(99, 102, 241, 0.1)",
                    borderRadius: "8px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: openSection === sectionIndex ? "white" : "#6366f1",
                    fontSize: "20px",
                    fontWeight: "700",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    transform: openSection === sectionIndex ? "rotate(180deg)" : "rotate(0deg)"
                  }}>
                    {openSection === sectionIndex ? "−" : "+"}
                  </div>
                </button>

                {openSection === sectionIndex && (
                  <div style={{
                    padding: "clamp(20px, 3vw, 24px)",
                    background: "rgba(248, 250, 252, 0.5)",
                    borderTop: "1px solid rgba(226, 232, 240, 0.5)",
                    animation: "fadeInUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)"
                  }}>
                    <div style={{
                      display: "grid",
                      gap: "clamp(20px, 3vw, 24px)"
                    }}>
                      {section.items.map((item, itemIndex) => (
                        <div
                          key={itemIndex}
                          style={{
                            padding: "clamp(16px, 2.5vw, 20px)",
                            background: "rgba(255, 255, 255, 0.6)",
                            backdropFilter: "blur(10px)",
                            borderRadius: "16px",
                            border: "1px solid rgba(226, 232, 240, 0.5)",
                            opacity: 0,
                            transform: "translateX(-20px)",
                            animation: `slideInRight 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) ${itemIndex * 0.1}s forwards`,
                            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = "translateX(4px)";
                            e.currentTarget.style.boxShadow = "0 4px 16px rgba(99, 102, 241, 0.1)";
                            e.currentTarget.style.borderColor = "rgba(99, 102, 241, 0.3)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = "translateX(0)";
                            e.currentTarget.style.boxShadow = "none";
                            e.currentTarget.style.borderColor = "rgba(226, 232, 240, 0.5)";
                          }}
                        >
                          <h4 style={{
                            fontSize: "clamp(16px, 2vw, 18px)",
                            fontWeight: "700",
                            color: "#1e293b",
                            marginBottom: "12px",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px"
                          }}>
                            <span style={{
                              width: "6px",
                              height: "6px",
                              background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                              borderRadius: "50%",
                              flexShrink: 0
                            }}></span>
                            {item.q}
                          </h4>
                          <p style={{
                            fontSize: "clamp(14px, 2vw, 16px)",
                            color: "#64748b",
                            margin: 0,
                            lineHeight: "1.7",
                            paddingLeft: "14px"
                          }}>
                            {item.a}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
