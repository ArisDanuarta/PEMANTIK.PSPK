'use client';

import React, { useEffect } from 'react';

interface StudentConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function StudentConfirmDialog({
  isOpen,
  title,
  description,
  confirmText = 'Ya, Lanjutkan',
  cancelText = 'Batal',
  onConfirm,
  onCancel,
  loading = false,
}: StudentConfirmDialogProps) {
  // Cegah scroll saat dialog terbuka
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 25, 52, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px',
        backdropFilter: 'blur(4px)',
        fontFamily: 'var(--font-rubik), system-ui, sans-serif'
      }}
      onClick={(e) => {
        // Tutup jika background diklik (opsional, tapi lebih baik jika dicegah saat loading)
        if (e.target === e.currentTarget && !loading) {
          onCancel();
        }
      }}
    >
      <div 
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '24px',
          width: '100%',
          maxWidth: '420px',
          padding: '32px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          animation: 'modalSlideUp 0.3s ease-out forwards',
        }}
      >
        <style>{`
          @keyframes modalSlideUp {
            from { opacity: 0; transform: translateY(20px) scale(0.95); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
          .std-dialog-cancel {
            background: #f8f9ff;
            color: #43474e;
            border: 1px solid #e5eeff;
            border-radius: 50px;
            padding: 12px 24px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            flex: 1;
          }
          .std-dialog-cancel:hover { background: #eef1fb; }
          .std-dialog-cancel:disabled { opacity: 0.6; cursor: not-allowed; }
          
          .std-dialog-confirm {
            background: #feba48;
            color: #714b00;
            border: none;
            border-radius: 50px;
            padding: 12px 24px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.2s;
            box-shadow: 0 4px 14px rgba(254,186,72,0.3);
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
          }
          .std-dialog-confirm:hover { background: #f5ac30; }
          .std-dialog-confirm:active { transform: scale(0.97); }
          .std-dialog-confirm:disabled { opacity: 0.7; cursor: not-allowed; transform: none; }
        `}</style>
        
        <div style={{
          width: '64px',
          height: '64px',
          backgroundColor: 'rgba(254,186,72,0.15)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '20px'
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: '32px', color: '#feba48' }}>
            help_outline
          </span>
        </div>

        <h3 style={{
          margin: '0 0 12px',
          fontSize: '22px',
          fontWeight: 700,
          color: '#001934'
        }}>
          {title}
        </h3>
        
        <div style={{
          margin: '0 0 32px',
          fontSize: '15px',
          color: '#43474e',
          lineHeight: 1.6
        }}>
          {description}
        </div>

        <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
          <button 
            className="std-dialog-cancel" 
            onClick={onCancel}
            disabled={loading}
          >
            {cancelText}
          </button>
          <button 
            className="std-dialog-confirm" 
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Memproses...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
