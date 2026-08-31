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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white text-center">
          <div className="mx-auto bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
          </div>
          <h2 className="text-xl font-bold">{title}</h2>
          <p className="text-blue-100 text-sm mt-2 opacity-90">
            Berikut adalah detail login untuk akun ini
          </p>
        </div>

        <div className="p-6">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 flex gap-3">
            <svg className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <p className="text-sm text-amber-800 font-medium">
              Simpan credential ini sekarang! Password/PIN tidak bisa dilihat lagi setelah modal ini ditutup.
            </p>
          </div>

          <div className="space-y-4">
            {credentials.username && (
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  Username
                </label>
                <div className="flex bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                  <div className="px-4 py-3 font-mono font-medium text-gray-800 flex-1 overflow-x-auto whitespace-nowrap">
                    {credentials.username}
                  </div>
                  <button
                    onClick={() => handleCopy(credentials.username!, "username")}
                    className="px-4 py-3 bg-gray-100 hover:bg-gray-200 border-l border-gray-200 transition-colors flex items-center justify-center text-gray-600 hover:text-blue-600"
                    title="Salin Username"
                  >
                    {copiedField === "username" ? (
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                    )}
                  </button>
                </div>
              </div>
            )}

            {credentials.password && (
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  Password
                </label>
                <div className="flex bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                  <div className="px-4 py-3 font-mono font-medium text-gray-800 flex-1 overflow-x-auto whitespace-nowrap">
                    {credentials.password}
                  </div>
                  <button
                    onClick={() => handleCopy(credentials.password!, "password")}
                    className="px-4 py-3 bg-gray-100 hover:bg-gray-200 border-l border-gray-200 transition-colors flex items-center justify-center text-gray-600 hover:text-blue-600"
                    title="Salin Password"
                  >
                    {copiedField === "password" ? (
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                    )}
                  </button>
                </div>
              </div>
            )}

            {credentials.pin && (
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  PIN Login (Khusus Siswa)
                </label>
                <div className="flex bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                  <div className="px-4 py-3 font-mono text-xl tracking-[0.2em] font-bold text-gray-800 flex-1 overflow-x-auto whitespace-nowrap text-center">
                    {credentials.pin}
                  </div>
                  <button
                    onClick={() => handleCopy(credentials.pin!, "pin")}
                    className="px-4 py-3 bg-gray-100 hover:bg-gray-200 border-l border-gray-200 transition-colors flex items-center justify-center text-gray-600 hover:text-blue-600"
                    title="Salin PIN"
                  >
                    {copiedField === "pin" ? (
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium rounded-lg shadow-sm transition-all focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
