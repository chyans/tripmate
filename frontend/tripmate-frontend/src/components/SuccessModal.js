import React, { useEffect, useState, useRef } from "react";

export default function SuccessModal({ isOpen, onClose, onNavigate, message = "Your itinerary has been synchronized.", title = "Success!", showConfetti = true }) {
  const [checkmarkDrawn, setCheckmarkDrawn] = useState(false);
  const [confettiActive, setConfettiActive] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const checkmarkRef = useRef(null);
  const confettiContainerRef = useRef(null);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose();
      setIsExiting(false);
      setCheckmarkDrawn(false);
      setConfettiActive(false);
    }, 300);
  };

  const handleContinue = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose();
      setIsExiting(false);
      setCheckmarkDrawn(false);
      setConfettiActive(false);
      if (onNavigate) {
        onNavigate();
      }
    }, 300);
  };

  useEffect(() => {
    if (isOpen) {
      // Trigger haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate([50, 30, 50]);
      }

      // Play success sound (optional - using Web Audio API)
      try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = "sine";
        
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
      } catch (e) {
        // Audio not supported or failed
      }

      // Animate checkmark drawing
      setTimeout(() => {
        setCheckmarkDrawn(true);
        if (showConfetti) {
          setConfettiActive(true);
          createConfetti();
        }
      }, 300);
    } else {
      setCheckmarkDrawn(false);
      setConfettiActive(false);
    }
  }, [isOpen, showConfetti]);

  const createConfetti = () => {
    if (!confettiContainerRef.current) return;

    const colors = ["#667eea", "#764ba2", "#f093fb", "#4facfe", "#00f2fe", "#10b981"];
    const confettiCount = 50;

    for (let i = 0; i < confettiCount; i++) {
      const confetti = document.createElement("div");
      const size = Math.random() * 8 + 4;
      const x = Math.random() * 100;
      const delay = Math.random() * 0.5;
      const duration = Math.random() * 1 + 1.5;
      const color = colors[Math.floor(Math.random() * colors.length)];

      confetti.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        background: ${color};
        left: ${x}%;
        top: 50%;
        border-radius: ${Math.random() > 0.5 ? "50%" : "2px"};
        opacity: 0;
        pointer-events: none;
        animation: confetti-fall ${duration}s ease-out ${delay}s forwards;
      `;

      confettiContainerRef.current.appendChild(confetti);

      setTimeout(() => {
        if (confetti.parentNode) {
          confetti.parentNode.removeChild(confetti);
        }
      }, (duration + delay) * 1000);
    }
  };

  if (!isOpen && !isExiting) return null;

  return (
    <>
      <style>{`
        @keyframes confetti-fall {
          0% {
            opacity: 1;
            transform: translateY(0) rotate(0deg);
          }
          100% {
            opacity: 0;
            transform: translateY(400px) rotate(720deg);
          }
        }
        @keyframes checkmark-draw {
          0% {
            stroke-dashoffset: 100;
          }
          100% {
            stroke-dashoffset: 0;
          }
        }
        @keyframes circle-pop {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          50% {
            transform: scale(1.1);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        @keyframes modal-enter {
          0% {
            transform: scale(0.9) translateY(20px);
            opacity: 0;
          }
          60% {
            transform: scale(1.05) translateY(-5px);
          }
          100% {
            transform: scale(1) translateY(0);
            opacity: 1;
          }
        }
        @keyframes modal-exit {
          0% {
            transform: scale(1) translateY(0);
            opacity: 1;
          }
          100% {
            transform: scale(0.9) translateY(20px);
            opacity: 0;
          }
        }
        @keyframes backdrop-fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes backdrop-fade-out {
          from {
            opacity: 1;
          }
          to {
            opacity: 0;
          }
        }
      `}</style>
      
      {/* Backdrop */}
      <div
        onClick={handleClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.4)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          zIndex: 99999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
          animation: isExiting ? "backdrop-fade-out 0.3s ease-out" : "backdrop-fade-in 0.3s ease-out"
        }}
      >
        {/* Modal Container */}
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            background: "white",
            borderRadius: "32px",
            padding: "clamp(32px, 5vw, 48px)",
            maxWidth: "500px",
            width: "100%",
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.5) inset",
            position: "relative",
            overflow: "hidden",
            animation: isExiting 
              ? "modal-exit 0.3s cubic-bezier(0.4, 0, 0.2, 1)" 
              : "modal-enter 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
            textAlign: "center"
          }}
        >
          {/* Close Button (X) */}
          <button
            onClick={handleClose}
            style={{
              position: "absolute",
              top: "20px",
              right: "20px",
              width: "40px",
              height: "40px",
              borderRadius: "12px",
              background: "rgba(0, 0, 0, 0.05)",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              zIndex: 10
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(0, 0, 0, 0.1)";
              e.currentTarget.style.transform = "rotate(90deg) scale(1.1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(0, 0, 0, 0.05)";
              e.currentTarget.style.transform = "rotate(0deg) scale(1)";
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                color: "#64748b",
                transition: "color 0.3s"
              }}
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>

          {/* Confetti Container */}
          {showConfetti && (
            <div
              ref={confettiContainerRef}
              style={{
                position: "absolute",
                inset: 0,
                pointerEvents: "none",
                overflow: "hidden",
                borderRadius: "32px"
              }}
            />
          )}

          {/* Checkmark Circle with Animation */}
          <div
            style={{
              width: "100px",
              height: "100px",
              margin: "0 auto 24px",
              position: "relative",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <div
              style={{
                position: "absolute",
                width: "100px",
                height: "100px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                animation: "circle-pop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
                boxShadow: "0 8px 24px rgba(16, 185, 129, 0.3)"
              }}
            />
            <svg
              ref={checkmarkRef}
              width="60"
              height="60"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                position: "relative",
                zIndex: 1
              }}
            >
              <path 
                d="M20 6L9 17l-5-5" 
                style={{
                  strokeDasharray: 100,
                  strokeDashoffset: checkmarkDrawn ? 0 : 100,
                  transition: "stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)"
                }}
              />
            </svg>
          </div>

          {/* Title */}
          <h2
            style={{
              fontSize: "clamp(28px, 4vw, 36px)",
              fontWeight: "800",
              color: "#0f172a",
              margin: "0 0 12px 0",
              letterSpacing: "-0.02em"
            }}
          >
            {title}
          </h2>

          {/* Message */}
          <p
            style={{
              fontSize: "clamp(15px, 2vw, 17px)",
              color: "#64748b",
              margin: "0 0 32px 0",
              lineHeight: "1.6",
              fontWeight: "500"
            }}
          >
            {message}
          </p>

          {/* Action Button */}
          <button
            onClick={handleContinue}
            style={{
              padding: "16px 40px",
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "white",
              border: "none",
              borderRadius: "16px",
              fontSize: "16px",
              fontWeight: "700",
              cursor: "pointer",
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              boxShadow: "0 8px 24px rgba(102, 126, 234, 0.3)",
              position: "relative",
              overflow: "hidden"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px) scale(1.02)";
              e.currentTarget.style.boxShadow = "0 12px 32px rgba(102, 126, 234, 0.5)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0) scale(1)";
              e.currentTarget.style.boxShadow = "0 8px 24px rgba(102, 126, 234, 0.3)";
            }}
          >
            Continue to Dashboard
          </button>
        </div>
      </div>
    </>
  );
}

