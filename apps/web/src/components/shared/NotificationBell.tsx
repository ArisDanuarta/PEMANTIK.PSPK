"use client";

import React, { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { getUserNotifications, markNotificationAsRead, Notification } from "@/app/actions/notifications";
import { createBrowserClient } from "@pemantik/supabase";

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [supabase] = useState(() => createBrowserClient());
  const [rect, setRect] = useState<DOMRect | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const toggleOpen = () => {
    if (!isOpen && buttonRef.current) {
      setRect(buttonRef.current.getBoundingClientRect());
    }
    setIsOpen(!isOpen);
  };

  const fetchNotifications = async () => {
    const res = await getUserNotifications();
    if (res.success && res.data) {
      setNotifications(res.data);
    }
  };

  useEffect(() => {
    fetchNotifications();

    const fetchSessionAndSubscribe = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const channel = supabase
        .channel("public:notifications")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${session.user.id}` },
          (payload) => {
            setNotifications((prev) => [payload.new as Notification, ...prev]);
          }
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${session.user.id}` },
          (payload) => {
            setNotifications((prev) => prev.map((n) => n.id === payload.new.id ? (payload.new as Notification) : n));
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    fetchSessionAndSubscribe();
  }, [supabase]);

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // prevent closing if clicking inside
    
    // Optimistic update
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
    
    await markNotificationAsRead(id);
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
      <button
        ref={buttonRef}
        onClick={toggleOpen}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "0.5rem",
          color: "rgba(255,255,255,0.8)",
          transition: "color 0.2s"
        }}
        onMouseEnter={(e) => e.currentTarget.style.color = "#fff"}
        onMouseLeave={(e) => e.currentTarget.style.color = "rgba(255,255,255,0.8)"}
        aria-label="Notifikasi"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>
        {unreadCount > 0 && (
          <span style={{
            position: "absolute",
            top: "2px",
            right: "4px",
            backgroundColor: "var(--color-danger, #ef4444)",
            color: "white",
            fontSize: "0.6rem",
            fontWeight: "bold",
            borderRadius: "50%",
            width: "14px",
            height: "14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>



      {isOpen && typeof document !== "undefined" && createPortal(
        <>
          <div 
            style={{ position: "fixed", inset: 0, zIndex: 998 }} 
            onClick={() => setIsOpen(false)}
          />
          <div style={{
            position: "fixed",
            bottom: rect ? `calc(100vh - ${rect.top}px + 12px)` : "80px",
            left: rect ? `${rect.left}px` : "20px",
            width: "320px",
            backgroundColor: "white",
            borderRadius: "0.75rem",
            boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
            zIndex: 999,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            maxHeight: "450px"
          }}>
            <div style={{
              padding: "0.75rem 1rem",
              borderBottom: "1px solid #e5e7eb",
              backgroundColor: "#f9fafb",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <h3 style={{ margin: 0, fontSize: "0.9rem", color: "#111827", fontWeight: 600 }}>Notifikasi</h3>
            </div>
            
            <div style={{ overflowY: "auto", flex: 1 }}>
              {notifications.length === 0 ? (
                <div style={{ padding: "2rem 1rem", textAlign: "center", color: "#6b7280", fontSize: "0.85rem" }}>
                  Belum ada notifikasi
                </div>
              ) : (
                notifications.map((notif) => (
                  <div 
                    key={notif.id} 
                    style={{ 
                      padding: "0.75rem 1rem", 
                      borderBottom: "1px solid #f3f4f6",
                      backgroundColor: notif.is_read ? "white" : "#eff6ff",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.25rem"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <strong style={{ fontSize: "0.8rem", color: "#1f2937" }}>{notif.title}</strong>
                      {!notif.is_read && (
                        <button 
                          onClick={(e) => handleMarkAsRead(notif.id, e)}
                          style={{ 
                            background: "none", 
                            border: "none", 
                            color: "var(--color-primary, #102e50)", 
                            fontSize: "0.7rem",
                            cursor: "pointer",
                            padding: 0
                          }}
                        >
                          Tandai dibaca
                        </button>
                      )}
                    </div>
                    <p style={{ margin: 0, fontSize: "0.8rem", color: "#4b5563", lineHeight: 1.4 }}>
                      {notif.message}
                    </p>
                    <span style={{ fontSize: "0.65rem", color: "#9ca3af", marginTop: "0.25rem" }}>
                      {new Date(notif.created_at).toLocaleString("id-ID")}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}
