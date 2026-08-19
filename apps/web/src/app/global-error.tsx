"use client";

import { useEffect } from "react";
import { writeSystemLog } from "@/app/actions/logs";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to the database as a critical system error
    writeSystemLog({
      level: "critical",
      source: "system",
      message: error.message || "Global Unhandled Error",
      details: {
        digest: error.digest,
        stack: error.stack,
        url: typeof window !== "undefined" ? window.location.href : "unknown",
      }
    });
  }, [error]);

  return (
    <html lang="id">
      <body>
        <div style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f9fafb",
          fontFamily: "system-ui, -apple-system, sans-serif",
          padding: "2rem"
        }}>
          <div style={{
            maxWidth: "500px",
            textAlign: "center",
            backgroundColor: "white",
            padding: "3rem 2rem",
            borderRadius: "1rem",
            boxShadow: "0 10px 25px rgba(0,0,0,0.05)",
            borderTop: "5px solid #ef4444"
          }}>
            <h1 style={{ fontSize: "1.75rem", color: "#111827", marginBottom: "1rem", fontWeight: 700 }}>Critical System Error</h1>
            <p style={{ color: "#4b5563", fontSize: "1rem", lineHeight: 1.6, marginBottom: "2rem" }}>
              Sebuah kesalahan fatal sistem telah terjadi. Laporan otomatis telah dikirimkan ke Super Admin.
            </p>
            <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
              <button 
                onClick={() => reset()}
                style={{ 
                  padding: "0.5rem 1.5rem", 
                  backgroundColor: "#2563eb", 
                  color: "white", 
                  border: "none", 
                  borderRadius: "0.375rem",
                  cursor: "pointer",
                  fontWeight: 500
                }}
              >
                Muat Ulang Halaman
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
