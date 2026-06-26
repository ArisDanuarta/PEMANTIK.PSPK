"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ToastType = "success" | "error" | "warning" | "info";

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number; // ms, default 4000. 0 = manual close only
}

interface ToastContextValue {
  toasts: Toast[];
  toast: (opts: Omit<Toast, "id">) => string;
  dismiss: (id: string) => void;
  dismissAll: () => void;
  // Convenience shortcuts
  success: (title: string, description?: string) => string;
  error: (title: string, description?: string) => string;
  warning: (title: string, description?: string) => string;
  info: (title: string, description?: string) => string;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const toast = useCallback(
    (opts: Omit<Toast, "id">): string => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const duration = opts.duration ?? 4000;
      setToasts((prev) => [...prev.slice(-4), { ...opts, id, duration }]);
      if (duration > 0) {
        const timer = setTimeout(() => dismiss(id), duration);
        timers.current.set(id, timer);
      }
      return id;
    },
    [dismiss]
  );

  const success = useCallback(
    (title: string, description?: string) =>
      toast({ type: "success", title, description }),
    [toast]
  );
  const error = useCallback(
    (title: string, description?: string) =>
      toast({ type: "error", title, description }),
    [toast]
  );
  const warning = useCallback(
    (title: string, description?: string) =>
      toast({ type: "warning", title, description }),
    [toast]
  );
  const info = useCallback(
    (title: string, description?: string) =>
      toast({ type: "info", title, description }),
    [toast]
  );
  const dismissAll = useCallback(() => {
    timers.current.forEach((t) => clearTimeout(t));
    timers.current.clear();
    setToasts([]);
  }, []);

  // cleanup on unmount
  useEffect(
    () => () => {
      timers.current.forEach((t) => clearTimeout(t));
    },
    []
  );

  return (
    <ToastContext.Provider
      value={{ toasts, toast, dismiss, dismissAll, success, error, warning, info }}
    >
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

// ─── Toast icons ──────────────────────────────────────────────────────────────

const ICONS: Record<ToastType, React.ReactNode> = {
  success: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  ),
  error: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  ),
  warning: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  info: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
};

// ─── Single Toast Item ────────────────────────────────────────────────────────

function ToastItem({
  t,
  onDismiss,
}: {
  t: Toast;
  onDismiss: (id: string) => void;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // slight delay for enter animation
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(() => onDismiss(t.id), 250);
  };

  return (
    <div
      role="alert"
      aria-live="polite"
      data-type={t.type}
      className="pemantik-toast"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateX(0)" : "translateX(120%)",
        transition: "opacity 0.25s ease, transform 0.3s cubic-bezier(0.34,1.56,0.64,1)",
      }}
    >
      <span className="pemantik-toast-icon">{ICONS[t.type]}</span>
      <div className="pemantik-toast-body">
        <div className="pemantik-toast-title">{t.title}</div>
        {t.description && (
          <div className="pemantik-toast-desc">{t.description}</div>
        )}
      </div>
      <button
        onClick={handleDismiss}
        className="pemantik-toast-close"
        aria-label="Tutup notifikasi"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}

// ─── Toast Container ──────────────────────────────────────────────────────────

function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current as any;
    if (!el) return;
    
    if (toasts.length > 0) {
      try {
        if (typeof el.showPopover === "function" && !el.matches(":popover-open")) {
          el.showPopover();
        }
      } catch (e) {}
    } else {
      try {
        if (typeof el.hidePopover === "function" && el.matches(":popover-open")) {
          el.hidePopover();
        }
      } catch (e) {}
    }
  }, [toasts.length]);

  return (
    <div
      ref={containerRef}
      /* @ts-ignore */
      popover="manual"
      aria-label="Notifikasi"
      className="pemantik-toast-container"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} t={t} onDismiss={onDismiss} />
      ))}

      <style>{`
        /* ── Toast Container ───────────────────────────────────────────── */
        .pemantik-toast-container {
          position: fixed;
          inset: unset;
          top: 1.25rem;
          right: 1.25rem;
          z-index: 999999;
          display: flex;
          flex-direction: column;
          gap: 0.625rem;
          width: 340px;
          max-width: calc(100vw - 2.5rem);
          pointer-events: none;
          background: transparent;
          border: none;
          padding: 0;
          margin: 0;
        }

        /* ── Single Toast ──────────────────────────────────────────────── */
        .pemantik-toast {
          pointer-events: all;
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 0.875rem 1rem;
          background: #ffffff;
          border-radius: 12px;
          box-shadow:
            0 4px 6px -1px rgba(0,0,0,0.08),
            0 10px 15px -3px rgba(0,0,0,0.06);
          border-left: 4px solid transparent;
          position: relative;
          overflow: hidden;
        }

        /* Warna per tipe */
        .pemantik-toast[data-type="success"] { border-left-color: #16a34a; }
        .pemantik-toast[data-type="error"]   { border-left-color: #a8281c; }
        .pemantik-toast[data-type="warning"] { border-left-color: #f2af3e; }
        .pemantik-toast[data-type="info"]    { border-left-color: #0874aa; }

        /* Icon */
        .pemantik-toast-icon {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          margin-top: 1px;
        }
        .pemantik-toast[data-type="success"] .pemantik-toast-icon { color: #16a34a; }
        .pemantik-toast[data-type="error"]   .pemantik-toast-icon { color: #a8281c; }
        .pemantik-toast[data-type="warning"] .pemantik-toast-icon { color: #d97706; }
        .pemantik-toast[data-type="info"]    .pemantik-toast-icon { color: #0874aa; }

        /* Body */
        .pemantik-toast-body { flex: 1; min-width: 0; }
        .pemantik-toast-title {
          font-family: var(--font-body, 'Inter', sans-serif);
          font-size: 0.875rem;
          font-weight: 600;
          color: #102e50;
          line-height: 1.3;
        }
        .pemantik-toast-desc {
          font-size: 0.8125rem;
          color: #6b7280;
          margin-top: 0.125rem;
          line-height: 1.4;
        }

        /* Close button */
        .pemantik-toast-close {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          border-radius: 6px;
          background: transparent;
          border: none;
          cursor: pointer;
          color: #9ca3af;
          transition: background 0.15s, color 0.15s;
          margin-top: -1px;
        }
        .pemantik-toast-close:hover {
          background: #f3f4f6;
          color: #374151;
        }

        @media (max-width: 480px) {
          .pemantik-toast-container {
            top: auto;
            bottom: 1rem;
            right: 0.75rem;
            left: 0.75rem;
            width: auto;
          }
        }
      `}</style>
    </div>
  );
}
