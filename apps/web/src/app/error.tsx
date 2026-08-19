"use client";

import { useEffect } from "react";
import { writeSystemLog } from "@/app/actions/logs";
import Link from "next/link";

export default function ErrorBoundary({
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
      source: "frontend",
      message: error.message || "Unhandled Frontend Error",
      details: {
        digest: error.digest,
        stack: error.stack,
        url: typeof window !== "undefined" ? window.location.href : "unknown",
      }
    });
  }, [error]);

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#f9fafb",
      fontFamily: "var(--font-inter)",
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
        <div style={{ 
          width: "80px", 
          height: "80px", 
          backgroundColor: "#fef2f2", 
          borderRadius: "50%", 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center",
          margin: "0 auto 1.5rem"
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: "40px", color: "#dc2626" }}>error</span>
        </div>
        <h1 style={{ fontFamily: "var(--font-lora)", fontSize: "1.75rem", color: "#111827", marginBottom: "1rem", fontWeight: 700 }}>Terjadi Kesalahan Sistem</h1>
        <p style={{ color: "#4b5563", fontSize: "1rem", lineHeight: 1.6, marginBottom: "2rem" }}>
          Maaf, terjadi kesalahan yang tidak terduga pada halaman ini. Laporan otomatis telah dikirim ke administrator.
        </p>
        <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
          <button 
            onClick={() => reset()}
            className="btn btn-primary"
            style={{ padding: "0.5rem 1.5rem", borderRadius: "var(--radius-md)" }}
          >
            Coba Lagi
          </button>
          <Link href="/" className="btn btn-outline" style={{ padding: "0.5rem 1.5rem", borderRadius: "var(--radius-md)" }}>
            Ke Beranda
          </Link>
        </div>
      </div>
    </div>
  );
}
