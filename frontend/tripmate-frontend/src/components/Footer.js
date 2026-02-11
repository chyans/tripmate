import React from "react";
import tripmateLogo from "../assets/logo/tripmate_logo.png";

export default function Footer() {
  const footerSections = [
    {
      title: "GET STARTED",
      links: [
        { label: "Dashboard", href: "#" },
        { label: "Plan Trip", href: "#" },
        { label: "My Trips", href: "#" },
        { label: "Trip Reviews", href: "#" },
      ]
    },
    {
      title: "RESOURCES",
      links: [
        { label: "Help & Support", href: "#" },
        { label: "Documentation", href: "#" },
        { label: "FAQs", href: "#" },
        { label: "Features", href: "#" },
      ]
    },
    {
      title: "PLANS",
      links: [
        { label: "Free Plan", href: "#" },
        { label: "Premium Plan", href: "#" },
        { label: "Pricing", href: "#" },
        { label: "Compare Plans", href: "#" },
      ]
    },
    {
      title: "ACCOUNT",
      links: [
        { label: "Profile Settings", href: "#" },
        { label: "Account Settings", href: "#" },
        { label: "Subscriptions", href: "#" },
      ]
    },
    {
      title: "COMPANY",
      links: [
        { label: "About Us", href: "#" },
        { label: "Blog", href: "#" },
        { label: "Careers", href: "#" },
        { label: "Contact", href: "#" },
      ]
    },
    {
      title: "SOCIAL",
      links: [
        { label: "Twitter", href: "#" },
        { label: "Facebook", href: "#" },
        { label: "LinkedIn", href: "#" },
        { label: "Instagram", href: "#" },
      ]
    }
  ];

  return (
    <footer style={{
      width: "100%",
      background: "#100f2c",
      color: "white",
      padding: "clamp(24px, 4vw, 36px) clamp(24px, 4vw, 48px)",
      marginTop: "auto",
      boxSizing: "border-box"
    }}>
      {/* Top Section - Logo */}
      <div style={{
        marginBottom: "clamp(20px, 3vw, 28px)",
        display: "flex",
        alignItems: "center",
        gap: "10px"
      }}>
        <img 
          src={tripmateLogo} 
          alt="TripMate Logo" 
          style={{
            height: "40px",
            width: "auto",
            objectFit: "contain"
          }}
        />
      </div>

      {/* Middle Section - Navigation Columns */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
        gap: "clamp(16px, 3vw, 28px)",
        marginBottom: "clamp(20px, 3vw, 28px)"
      }}>
        {footerSections.map((section, index) => (
          <div key={index}>
            <h3 style={{
              fontSize: "clamp(11px, 1.4vw, 12px)",
              fontWeight: "600",
              color: "rgba(255, 255, 255, 0.9)",
              marginBottom: "10px",
              letterSpacing: "0.05em",
              textTransform: "uppercase"
            }}>
              {section.title}
            </h3>
            <ul style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              display: "flex",
              flexDirection: "column",
              gap: "8px"
            }}>
              {section.links.map((link, linkIndex) => (
                <li key={linkIndex}>
                  <a
                    href={link.href}
                    onClick={(e) => {
                      e.preventDefault();
                      // Handle navigation if needed
                    }}
                    style={{
                      fontSize: "clamp(13px, 1.8vw, 14px)",
                      color: "rgba(255, 255, 255, 0.7)",
                      textDecoration: "none",
                      transition: "color 0.2s ease",
                      display: "block",
                      cursor: "pointer"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "rgba(255, 255, 255, 0.9)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = "rgba(255, 255, 255, 0.7)";
                    }}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Bottom Section */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "12px",
        paddingTop: "clamp(16px, 3vw, 24px)",
        borderTop: "1px solid rgba(255, 255, 255, 0.1)"
      }}>
        {/* Copyright */}
        <div style={{
          fontSize: "clamp(12px, 1.5vw, 13px)",
          color: "rgba(255, 255, 255, 0.6)",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          flexWrap: "wrap"
        }}>
          <span>©{new Date().getFullYear()} TripMate</span>
          <span style={{ color: "rgba(255, 255, 255, 0.4)" }}>•</span>
          <a
            href="#"
            onClick={(e) => e.preventDefault()}
            style={{
              color: "rgba(255, 255, 255, 0.6)",
              textDecoration: "none",
              transition: "color 0.2s ease"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "rgba(255, 255, 255, 0.8)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "rgba(255, 255, 255, 0.6)";
            }}
          >
            Terms
          </a>
          <a
            href="#"
            onClick={(e) => e.preventDefault()}
            style={{
              color: "rgba(255, 255, 255, 0.6)",
              textDecoration: "none",
              transition: "color 0.2s ease"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "rgba(255, 255, 255, 0.8)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "rgba(255, 255, 255, 0.6)";
            }}
          >
            Privacy
          </a>
        </div>

        {/* System Status Button */}
        <button
          style={{
            padding: "8px 16px",
            background: "transparent",
            border: "1px solid rgba(102, 126, 234, 0.5)",
            borderRadius: "6px",
            color: "white",
            fontSize: "clamp(11px, 1.3vw, 12px)",
            fontWeight: "500",
            cursor: "pointer",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            transition: "all 0.2s ease",
            whiteSpace: "nowrap"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "rgba(102, 126, 234, 0.8)";
            e.currentTarget.style.background = "rgba(102, 126, 234, 0.1)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "rgba(102, 126, 234, 0.5)";
            e.currentTarget.style.background = "transparent";
          }}
        >
          All Systems Operational
        </button>
      </div>
    </footer>
  );
}
