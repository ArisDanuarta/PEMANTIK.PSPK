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

export type ConfirmVariant = "danger" | "warning" | "info";

export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;   // default: "Ya, Lanjutkan"
  cancelLabel?: string;    // default: "Batal"
  variant?: ConfirmVariant; // default: "danger"
}

interface ConfirmState extends ConfirmOptions {
  resolve: (confirmed: boolean) => void;
}

interface ConfirmContextValue {
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function useConfirm(): ConfirmContextValue {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used inside <ConfirmProvider>");
  return ctx;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ConfirmState | null>(null);
  const [visible, setVisible] = useState(false);

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({ ...opts, resolve });
      // tick so state is set before animation starts
      requestAnimationFrame(() => setVisible(true));
    });
  }, []);

  const handleResponse = (confirmed: boolean) => {
    setVisible(false);
    setTimeout(() => {
      state?.resolve(confirmed);
      setState(null);
    }, 220);
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {state && (
        <ConfirmDialog
          {...state}
          visible={visible}
          onConfirm={() => handleResponse(true)}
          onCancel={() => handleResponse(false)}
        />
      )}
    </ConfirmContext.Provider>
  );
}

// ─── Variant config ────────────────────────────────────────────────────────────

const VARIANT_CONFIG: Record<
  ConfirmVariant,
  { iconBg: string; iconColor: string; confirmBg: string; confirmHover: string; icon: React.ReactNode }
> = {
  danger: {
    iconBg: "#fef2f2",
    iconColor: "#a8281c",
    confirmBg: "#a8281c",
    confirmHover: "#8b211700",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
  warning: {
    iconBg: "#fffbeb",
    iconColor: "#d97706",
    confirmBg: "#d97706",
    confirmHover: "#b45309",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
  },
  info: {
    iconBg: "#eff6ff",
    iconColor: "#0874aa",
    confirmBg: "#102e50",
    confirmHover: "#0a1f38",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
  },
};

// ─── Dialog Component ─────────────────────────────────────────────────────────

interface ConfirmDialogProps extends ConfirmState {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmDialog({
  title,
  description,
  confirmLabel = "Ya, Lanjutkan",
  cancelLabel = "Batal",
  variant = "danger",
  visible,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cfg = VARIANT_CONFIG[variant];
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Trap focus & Esc to cancel
  useEffect(() => {
    cancelRef.current?.focus();
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onCancel]);

  // Prevent body scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <>
      {/* Backdrop */}
      <div
        className="pemantik-confirm-backdrop"
        style={{ opacity: visible ? 1 : 0 }}
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby={description ? "confirm-desc" : undefined}
        className="pemantik-confirm-dialog"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "translate(-50%, -50%) scale(1)" : "translate(-50%, calc(-50% - 12px)) scale(0.97)",
          transition: "opacity 0.22s ease, transform 0.25s cubic-bezier(0.34,1.56,0.64,1)",
        }}
      >
        {/* Icon */}
        <div
          className="pemantik-confirm-icon-wrap"
          style={{ background: cfg.iconBg, color: cfg.iconColor }}
        >
          {cfg.icon}
        </div>

        {/* Text */}
        <div className="pemantik-confirm-text">
          <h2 id="confirm-title" className="pemantik-confirm-title">
            {title}
          </h2>
          {description && (
            <p id="confirm-desc" className="pemantik-confirm-desc">
              {description}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="pemantik-confirm-actions">
          <button
            ref={cancelRef}
            type="button"
            className="pemantik-confirm-btn pemantik-confirm-btn-cancel"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className="pemantik-confirm-btn pemantik-confirm-btn-confirm"
            style={{ "--confirm-bg": cfg.confirmBg } as React.CSSProperties}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>

      <style>{`
        /* ── Backdrop ───────────────────────────────────────────────────── */
        .pemantik-confirm-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(10, 20, 40, 0.55);
          backdrop-filter: blur(3px);
          z-index: 9000;
          transition: opacity 0.22s ease;
          cursor: pointer;
        }

        /* ── Dialog ─────────────────────────────────────────────────────── */
        .pemantik-confirm-dialog {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 9001;
          width: 420px;
          max-width: calc(100vw - 2rem);
          background: #ffffff;
          border-radius: 18px;
          padding: 2rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          box-shadow:
            0 20px 60px rgba(0,0,0,0.18),
            0 4px 12px rgba(0,0,0,0.08);
        }

        /* ── Icon wrap ──────────────────────────────────────────────────── */
        .pemantik-confirm-icon-wrap {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        /* ── Text ───────────────────────────────────────────────────────── */
        .pemantik-confirm-title {
          font-family: var(--font-heading, 'Lora', serif);
          font-size: 1.125rem;
          font-weight: 700;
          color: #102e50;
          margin: 0;
          line-height: 1.3;
        }
        .pemantik-confirm-desc {
          font-family: var(--font-body, 'Inter', sans-serif);
          font-size: 0.875rem;
          color: #6b7280;
          margin: 0.25rem 0 0;
          line-height: 1.5;
        }

        /* ── Actions ────────────────────────────────────────────────────── */
        .pemantik-confirm-actions {
          display: flex;
          gap: 0.625rem;
          justify-content: flex-end;
          margin-top: 0.5rem;
        }

        .pemantik-confirm-btn {
          font-family: var(--font-body, 'Inter', sans-serif);
          font-size: 0.875rem;
          font-weight: 600;
          padding: 0.5625rem 1.25rem;
          border-radius: 8px;
          border: none;
          cursor: pointer;
          transition: background 0.15s, box-shadow 0.15s, transform 0.1s;
          min-width: 88px;
        }
        .pemantik-confirm-btn:active { transform: scale(0.97); }

        .pemantik-confirm-btn-cancel {
          background: transparent;
          color: #6b7280;
          border: 1.5px solid #e5e7eb;
        }
        .pemantik-confirm-btn-cancel:hover {
          background: #f9fafb;
          border-color: #d1d5db;
          color: #374151;
        }

        .pemantik-confirm-btn-confirm {
          background: var(--confirm-bg, #a8281c);
          color: #ffffff;
          box-shadow: 0 1px 3px rgba(0,0,0,0.15);
        }
        .pemantik-confirm-btn-confirm:hover {
          filter: brightness(0.88);
          box-shadow: 0 3px 8px rgba(0,0,0,0.2);
        }

        @media (max-width: 480px) {
          .pemantik-confirm-dialog { padding: 1.5rem; border-radius: 14px; }
          .pemantik-confirm-actions { flex-direction: column-reverse; }
          .pemantik-confirm-btn { width: 100%; justify-content: center; }
        }
      `}</style>
    </>
  );
}
