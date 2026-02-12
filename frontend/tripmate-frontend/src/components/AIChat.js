import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import { useFreeQuota } from "../hooks/useFreeQuota";
import API_URL from "../config";

export default function AIChat({ locations, photos, token, user, tripId }) {
  // Extract destination from locations (first is origin, rest are destinations)
  const getDestinationMessage = () => {
    if (!locations || locations.length === 0) {
      return "Hi! I can answer questions about the places you've visited on your trip. What would you like to know?";
    }
    
    const destinationNames = locations.length > 1 
      ? locations.slice(1).map(loc => loc.name).filter(Boolean)
      : locations.map(loc => loc.name).filter(Boolean);
    
    if (destinationNames.length > 0) {
      const destinationsStr = destinationNames.join(" and ");
      return `Hi! I can help you with your trip to ${destinationsStr}. What would you like to know?`;
    }
    
    return "Hi! I can answer questions about the places you've visited on your trip. What would you like to know?";
  };

  const [messages, setMessages] = useState([
    { role: "assistant", content: getDestinationMessage() }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const pendingMessageIdRef = useRef(null); // Track pending message to prevent double increments

  // Use the free quota hook
  const {
    used: questionsUsed,
    limit,
    remaining,
    isInitialized,
    incrementOptimistic,
    rollback,
    updateFromServer,
    syncFromServer
  } = useFreeQuota(user?.id, user?.is_premium, 5);

  // Removed auto-scroll to keep user at their current scroll position
  // const scrollToBottom = () => {
  //   messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  // };

  // useEffect(() => {
  //   scrollToBottom();
  // }, [messages]);

  // Sync quota from backend on mount and when tripId changes
  useEffect(() => {
    if (!user?.is_premium && tripId && isInitialized) {
      syncFromServer(async () => {
        const res = await axios.get(`${API_URL}/api/ai/chat/usage`, {
          params: { trip_id: tripId },
          headers: { Authorization: `Bearer ${token}` }
        });
        return res.data.questions_used;
      });
    }
  }, [tripId, user?.is_premium, token, isInitialized, syncFromServer]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    // Check if free user has reached limit
    if (!user?.is_premium && questionsUsed >= limit) {
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: `Free plan allows ${limit} AI questions per trip. Upgrade to Premium for unlimited questions.`
      }]);
      return;
    }

    // Generate unique message ID to prevent double increments
    const clientMessageId = `${Date.now()}-${Math.random()}`;
    
    // Prevent double-send if same message ID
    if (pendingMessageIdRef.current === clientMessageId) {
      return;
    }
    pendingMessageIdRef.current = clientMessageId;

    const userMessage = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    const messageToSend = input;
    setInput("");
    setIsLoading(true);

    // Step 1: Optimistic increment (before API call)
    if (!user?.is_premium) {
      incrementOptimistic();
    }

    try {
      // Send last 4 messages for context (2 user + 2 assistant)
      const conversationHistory = messages.slice(-4).map(msg => ({
        role: msg.role,
        content: msg.content
      }));
      
      const res = await axios.post(`${API_URL}/api/ai/chat`, {
        message: messageToSend,
        locations: locations,
        photos: photos,
        trip_id: tripId,
        conversation_history: conversationHistory
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Step 2: On success, update from server response (backend is source of truth)
      if (res.status === 200) {
        setMessages((prev) => [...prev, { role: "assistant", content: res.data.response }]);
        
        if (!user?.is_premium) {
          console.log("[AIChat] Server response:", res.data);
          console.log("[AIChat] questions_used from server:", res.data.questions_used, "type:", typeof res.data.questions_used);
          
          // Always sync from backend after successful response to ensure accuracy
          // This is more reliable than trusting the response value which might be 0 if there was an error
          setTimeout(async () => {
            try {
              const usageRes = await axios.get(`${API_URL}/api/ai/chat/usage`, {
                params: { trip_id: tripId },
                headers: { Authorization: `Bearer ${token}` }
              });
              const serverCount = usageRes.data.questions_used;
              console.log("[AIChat] Synced from usage endpoint:", serverCount);
              if (serverCount !== undefined && serverCount !== null) {
                updateFromServer(serverCount);
              }
            } catch (syncError) {
              console.error("[AIChat] Error syncing from usage endpoint:", syncError);
              // Only use response value if it's not 0 (0 might indicate an error)
              if (res.data.questions_used !== undefined && res.data.questions_used !== null && res.data.questions_used > 0) {
                updateFromServer(res.data.questions_used);
              } else {
                console.warn("[AIChat] Response has invalid questions_used value, keeping current count");
              }
            }
          }, 200); // Small delay to ensure backend has committed
          
          // Update immediately from response if it's a valid non-zero value
          // (Don't update if it's 0, as that might indicate an error - wait for sync instead)
          if (res.data.questions_used !== undefined && res.data.questions_used !== null && res.data.questions_used > 0) {
            updateFromServer(res.data.questions_used);
          }
        }
      }
    } catch (error) {
      console.error("Error getting AI response:", error);
      const errorResponse = error.response;
      
      // Step 3: On error, rollback the optimistic increment
      if (!user?.is_premium) {
        rollback();
      }
      
      // Check if it's a limit reached error (403)
      if (errorResponse?.status === 403) {
        const errorMessage = errorResponse?.data?.message || errorResponse?.data?.error || "AI chat limit reached";
        setMessages((prev) => [...prev, {
          role: "assistant",
          content: errorMessage
        }]);
        // Update from server if available (might be at limit)
        if (errorResponse?.data?.questions_used !== undefined) {
          updateFromServer(errorResponse.data.questions_used);
        }
        setInput("");
      } else {
        // Other errors - show error message
        const errorMessage = errorResponse?.data?.error || errorResponse?.data?.message || "Sorry, I encountered an error. Please try again.";
        setMessages((prev) => [...prev, {
          role: "assistant",
          content: errorMessage
        }]);
      }
    } finally {
      setIsLoading(false);
      pendingMessageIdRef.current = null; // Clear pending message ID
    }
  };

  const isMobile = window.innerWidth <= 768;

  return (
    <div style={{
      background: "rgba(255, 255, 255, 0.7)",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      borderRadius: isMobile ? "16px" : "24px",
      padding: isMobile ? "16px" : "clamp(32px, 5vw, 48px)",
      marginTop: "clamp(16px, 4vw, 32px)",
      boxShadow: "0 20px 60px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(255, 255, 255, 0.5) inset, 0 4px 16px rgba(0, 0, 0, 0.04)",
      border: "1px solid rgba(255, 255, 255, 0.3)",
      display: "flex",
      flexDirection: "column",
      height: isMobile ? "clamp(350px, 55vh, 450px)" : "clamp(500px, 60vh, 600px)",
      transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)"
    }}>
      <div style={{ marginBottom: "clamp(20px, 3vw, 24px)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
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
              <path d="M12 8V4H8"/>
              <rect width="16" height="12" x="4" y="8" rx="2"/>
              <path d="M2 14h2"/>
              <path d="M20 14h2"/>
              <path d="M15 13v2"/>
              <path d="M9 13v2"/>
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
            Ask About Your Trip
          </h3>
        </div>
        {!user?.is_premium && tripId != null && (
          <span style={{ 
            fontSize: "12px", 
            color: "#f59e0b", 
            fontWeight: "600", 
            background: "linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(251, 191, 36, 0.1) 100%)", 
            padding: "8px 14px", 
            borderRadius: "12px",
            border: "1px solid rgba(245, 158, 11, 0.2)",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)"
          }}>
            Free: {questionsUsed}/{limit} questions used
          </span>
        )}
        {!!user?.is_premium && (
          <span style={{ 
            fontSize: "12px", 
            color: "#667eea", 
            fontWeight: "600", 
            background: "linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)", 
            padding: "8px 14px", 
            borderRadius: "12px",
            border: "1px solid rgba(102, 126, 234, 0.2)",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)"
          }}>
            Premium: Unlimited
          </span>
        )}
      </div>
      
      <div style={{
        flex: 1,
        overflowY: "auto",
        marginBottom: "clamp(16px, 3vw, 20px)",
        padding: "clamp(16px, 3vw, 20px)",
        background: "rgba(248, 250, 252, 0.6)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        borderRadius: "18px",
        border: "1px solid rgba(255, 255, 255, 0.4)",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04) inset"
      }}>
        {messages.map((msg, idx) => (
          <div
            key={idx}
            style={{
              marginBottom: "clamp(12px, 2vw, 16px)",
              textAlign: msg.role === "user" ? "right" : "left"
            }}
          >
            <div
              style={{
                display: "inline-block",
                padding: "clamp(12px, 2vw, 14px) clamp(16px, 3vw, 20px)",
                borderRadius: "18px",
                background: msg.role === "user" 
                  ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" 
                  : "rgba(255, 255, 255, 0.8)",
                backdropFilter: msg.role === "assistant" ? "blur(10px)" : "none",
                WebkitBackdropFilter: msg.role === "assistant" ? "blur(10px)" : "none",
                color: msg.role === "user" ? "white" : "#1e293b",
                maxWidth: "75%",
                fontSize: "clamp(13px, 2vw, 14px)",
                lineHeight: "1.6",
                whiteSpace: "pre-wrap",
                boxShadow: msg.role === "user" 
                  ? "0 4px 16px rgba(102, 126, 234, 0.3)" 
                  : "0 2px 8px rgba(0, 0, 0, 0.06), 0 0 0 1px rgba(0, 0, 0, 0.02) inset",
                border: msg.role === "assistant" ? "1px solid rgba(255, 255, 255, 0.4)" : "none",
                fontWeight: msg.role === "user" ? "500" : "400",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
              }}
              onMouseEnter={(e) => {
                if (msg.role === "assistant") {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(102, 126, 234, 0.1) inset";
                }
              }}
              onMouseLeave={(e) => {
                if (msg.role === "assistant") {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.06), 0 0 0 1px rgba(0, 0, 0, 0.02) inset";
                }
              }}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div style={{ 
            textAlign: "left", 
            color: "#64748b", 
            fontSize: "clamp(13px, 2vw, 14px)",
            fontStyle: "italic",
            padding: "12px 16px",
            background: "rgba(255, 255, 255, 0.6)",
            borderRadius: "12px",
            display: "inline-block"
          }}>
            Thinking...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div style={{ display: "flex", gap: isMobile ? "8px" : "clamp(10px, 2vw, 12px)", flexShrink: 0 }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleSend()}
          placeholder={!user?.is_premium && questionsUsed >= limit ? "Limit reached - Upgrade to Premium" : "Ask about your trip..."}
          disabled={!user?.is_premium && questionsUsed >= limit}
          style={{
            flex: 1,
            minWidth: 0,
            padding: isMobile ? "12px 14px" : "clamp(12px, 2vw, 14px) clamp(16px, 3vw, 20px)",
            borderRadius: isMobile ? "12px" : "14px",
            border: "1px solid rgba(226, 232, 240, 0.8)",
            fontSize: isMobile ? "16px" : "clamp(13px, 2vw, 14px)",
            background: "rgba(255, 255, 255, 0.8)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            outline: "none"
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "#667eea";
            e.currentTarget.style.boxShadow = "0 0 0 3px rgba(102, 126, 234, 0.1)";
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.95)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "rgba(226, 232, 240, 0.8)";
            e.currentTarget.style.boxShadow = "none";
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.8)";
          }}
        />
        <button
          onClick={handleSend}
          disabled={isLoading || (!user?.is_premium && questionsUsed >= limit)}
          style={{
            padding: isMobile ? "12px 18px" : "clamp(12px, 2vw, 14px) clamp(24px, 4vw, 28px)",
            background: (isLoading || (!user?.is_premium && questionsUsed >= limit))
              ? "linear-gradient(135deg, #94a3b8 0%, #64748b 100%)" 
              : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "white",
            border: "none",
            borderRadius: isMobile ? "12px" : "14px",
            cursor: (isLoading || (!user?.is_premium && questionsUsed >= limit)) ? "not-allowed" : "pointer",
            opacity: (!user?.is_premium && questionsUsed >= limit) ? 0.6 : 1,
            fontSize: isMobile ? "14px" : "clamp(13px, 2vw, 14px)",
            fontWeight: "600",
            transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
            boxShadow: isLoading 
              ? "0 4px 12px rgba(148, 163, 184, 0.3)" 
              : "0 4px 16px rgba(102, 126, 234, 0.3)",
            whiteSpace: "nowrap",
            flexShrink: 0
          }}
          onMouseEnter={(e) => {
            if (!isLoading) {
              e.currentTarget.style.transform = "translateY(-2px) scale(1.02)";
              e.currentTarget.style.boxShadow = "0 8px 24px rgba(102, 126, 234, 0.4)";
            }
          }}
          onMouseLeave={(e) => {
            if (!isLoading) {
              e.currentTarget.style.transform = "translateY(0) scale(1)";
              e.currentTarget.style.boxShadow = "0 4px 16px rgba(102, 126, 234, 0.3)";
            }
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}

