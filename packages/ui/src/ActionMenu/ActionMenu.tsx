import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

export interface ActionMenuItem {
  label: string;
  onClick: () => void;
  variant?: "default" | "danger" | "success" | "warning";
  disabled?: boolean;
}

export interface ActionMenuProps {
  actions: ActionMenuItem[];
}

export function ActionMenu({ actions }: ActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [coords, setCoords] = useState({ top: 0, right: 0 });

  useEffect(() => {
    function handleClickOutside() {
      setIsOpen(false);
    }
    function handleScroll() {
      setIsOpen(false);
    }

    if (isOpen) {
      setTimeout(() => {
        document.addEventListener("mousedown", handleClickOutside);
        window.addEventListener("scroll", handleScroll, true); 
        window.addEventListener("resize", handleScroll);
      }, 0);
    }
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleScroll);
    };
  }, [isOpen]);

  const toggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOpen && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + 4,
        right: document.documentElement.clientWidth - rect.right,
      });
    }
    setIsOpen(!isOpen);
  };

  if (actions.length === 0) return null;

  return (
    <>
      <button
        ref={btnRef}
        onClick={toggleMenu}
        style={{
          background: "transparent",
          border: "none",
          cursor: "pointer",
          padding: "0.25rem 0.5rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#6b7280",
          borderRadius: "0.375rem",
          transition: "all 0.2s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(0,0,0,0.05)")}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="1" />
          <circle cx="12" cy="5" r="1" />
          <circle cx="12" cy="19" r="1" />
        </svg>
      </button>

      {isOpen && typeof document !== "undefined" && createPortal(
        <div
          onMouseDown={(e) => e.stopPropagation()} 
          style={{
            position: "fixed",
            right: coords.right,
            top: coords.top,
            background: "rgba(255, 255, 255, 0.85)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            border: "1px solid rgba(255, 255, 255, 0.3)",
            boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05), 0 0 0 1px rgba(0,0,0,0.05)",
            borderRadius: "0.5rem",
            padding: "0.5rem",
            minWidth: "160px",
            zIndex: 99999,
            display: "flex",
            flexDirection: "column",
            gap: "0.25rem",
          }}
        >
          {actions.map((action, i) => {
            let color = "#374151";
            let hoverBg = "rgba(0,0,0,0.05)";
            
            if (action.variant === "danger") {
              color = "#dc2626";
              hoverBg = "rgba(220, 38, 38, 0.1)";
            } else if (action.variant === "success") {
              color = "#10b981";
              hoverBg = "rgba(16, 185, 129, 0.1)";
            }

            return (
              <button
                key={i}
                disabled={action.disabled}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                  action.onClick();
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  textAlign: "left",
                  padding: "0.5rem 0.75rem",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  color: action.disabled ? "#9ca3af" : color,
                  cursor: action.disabled ? "not-allowed" : "pointer",
                  borderRadius: "0.375rem",
                  width: "100%",
                  transition: "all 0.15s",
                  opacity: action.disabled ? 0.6 : 1,
                }}
                onMouseEnter={(e) => !action.disabled && (e.currentTarget.style.backgroundColor = hoverBg)}
                onMouseLeave={(e) => !action.disabled && (e.currentTarget.style.backgroundColor = "transparent")}
              >
                {action.label}
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </>
  );
}
