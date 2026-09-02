"use client";

import React, { useState } from "react";

export interface Credentials {
  username?: string;
  password?: string;
  pin?: string;
}

interface CredentialModalProps {
  isOpen: boolean;
  onClose: () => void;
  credentials: Credentials | null;
  title?: string;
}

export default function CredentialModal({
  isOpen,
  onClose,
  credentials,
  title = "Credential Akun Berhasil Dibuat",
}: CredentialModalProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!isOpen || !credentials) return null;

  const handleCopy = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error("Failed to copy", err);
    }
  };

  const CopyIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );

  const CheckIcon = ({ size = 4 }: { size?: number }) => (
    <svg className={`w-${size} h-${size} text-green-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
    </svg>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Modal: max-h dibatasi, flex column agar footer selalu kelihatan */}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 overflow-hidden">

        {/* HEADER — compact, tidak scroll */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-600 px-6 pt-5 pb-4 text-white text-center shrink-0">
          <div className="mx-auto bg-white/20 w-10 h-10 rounded-full flex items-center justify-center mb-3">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-base font-bold leading-tight">{title}</h2>
          <p className="text-blue-100 text-xs mt-1 opacity-90">
            Berikut detail login untuk akun ini
          </p>
        </div>

        {/* BODY — bisa scroll jika konten panjang */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {/* Warning banner */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 flex gap-2.5 items-start">
            <svg className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs text-amber-800 font-medium leading-snug">
              Simpan credential ini sekarang! Password/PIN tidak bisa dilihat lagi setelah modal ini ditutup.
            </p>
          </div>

          {/* Username */}
          {credentials.username && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Username
              </label>
              <div className="flex bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                <div className="px-3 py-2.5 font-mono font-medium text-gray-800 flex-1 overflow-x-auto whitespace-nowrap text-sm">
                  {credentials.username}
                </div>
                <button
                  onClick={() => handleCopy(credentials.username!, "username")}
                  className="px-3 py-2.5 bg-gray-100 hover:bg-blue-50 border-l border-gray-200 transition-colors flex items-center justify-center text-gray-500 hover:text-blue-600"
                  title="Salin Username"
                >
                  {copiedField === "username" ? <CheckIcon /> : <CopyIcon />}
                </button>
              </div>
            </div>
          )}

          {/* Password */}
          {credentials.password && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Password
              </label>
              <div className="flex bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                <div className="px-3 py-2.5 font-mono font-medium text-gray-800 flex-1 overflow-x-auto whitespace-nowrap text-sm">
                  {credentials.password}
                </div>
                <button
                  onClick={() => handleCopy(credentials.password!, "password")}
                  className="px-3 py-2.5 bg-gray-100 hover:bg-blue-50 border-l border-gray-200 transition-colors flex items-center justify-center text-gray-500 hover:text-blue-600"
                  title="Salin Password"
                >
                  {copiedField === "password" ? <CheckIcon /> : <CopyIcon />}
                </button>
              </div>
            </div>
          )}

          {/* PIN */}
          {credentials.pin && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                PIN Login (Khusus Siswa)
              </label>
              <div className="flex bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                <div className="px-3 py-2.5 font-mono text-lg tracking-[0.25em] font-bold text-gray-800 flex-1 overflow-x-auto whitespace-nowrap text-center text-sm">
                  {credentials.pin}
                </div>
                <button
                  onClick={() => handleCopy(credentials.pin!, "pin")}
                  className="px-3 py-2.5 bg-gray-100 hover:bg-blue-50 border-l border-gray-200 transition-colors flex items-center justify-center text-gray-500 hover:text-blue-600"
                  title="Salin PIN"
                >
                  {copiedField === "pin" ? <CheckIcon /> : <CopyIcon />}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER — selalu terlihat di bawah, tidak ikut scroll */}
        <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold rounded-lg shadow-sm transition-all focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
