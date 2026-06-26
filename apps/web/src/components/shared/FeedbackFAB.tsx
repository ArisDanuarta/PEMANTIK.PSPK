"use client";

import React, { useState, useTransition } from "react";
import { Button, Modal, useToast } from "@pemantik/ui";
import { submitFeedbackAction } from "@/app/actions/logs";
import { usePathname } from "next/navigation";

export default function FeedbackFAB({ userRole }: { userRole: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const { success: showSuccessToast, error: showErrorToast } = useToast();
  const pathname = usePathname();

  // Hanya tampil untuk role tertentu (Admin Soal juga bisa lapor bug ke Super Admin)
  if (!["community", "school", "teacher", "question_admin"].includes(userRole)) {
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    startTransition(async () => {
      const res = await submitFeedbackAction(message, pathname || "/");
      if (res.success) {
        showSuccessToast("Berhasil", "Terima kasih! Masukan Anda telah terkirim.");
        setIsOpen(false);
        setMessage("");
      } else {
        showErrorToast("Gagal", res.error || "Gagal mengirim masukan.");
      }
    });
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: "fixed",
          bottom: "2rem",
          right: "2rem",
          width: "56px",
          height: "56px",
          borderRadius: "50%",
          backgroundColor: "var(--color-primary, #102e50)",
          color: "white",
          border: "none",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          zIndex: 9999,
          transition: "transform 0.2s, box-shadow 0.2s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "scale(1.05)";
          e.currentTarget.style.boxShadow = "0 6px 16px rgba(0,0,0,0.2)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)";
          e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
        }}
        aria-label="Berikan Masukan"
        title="Berikan Masukan / Lapor Bug"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg> 
      </button>
{/*  */}
      <Modal open={isOpen} onClose={() => setIsOpen(false)} title="Lapor Bug / Masukan">
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1rem" }}>
          <p style={{ color: "#4b5563", fontSize: "0.9rem", margin: 0 }}>
            Punya masukan, ide fitur, atau menemukan bug? Tuliskan di bawah ini agar tim Super Admin bisa menindaklanjutinya.
          </p>
          <textarea
            className="form-input"
            rows={5}
            placeholder="Deskripsikan masukan atau bug yang Anda temukan..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            style={{ width: "100%", resize: "vertical" }}
            required
            disabled={isPending}
          />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "1rem" }}>
            <Button variant="secondary" onClick={() => setIsOpen(false)} disabled={isPending}>
              Batal
            </Button>
            <Button type="submit" variant="primary" disabled={isPending || !message.trim()}>
              {isPending ? "Mengirim..." : "Kirim Masukan"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
