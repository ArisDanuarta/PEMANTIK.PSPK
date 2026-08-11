'use client';

import React, { useState } from 'react';
import { startAssessmentSession } from '../../../../actions/assessmentActions';
import StudentConfirmDialog from '../../../../../components/siswa/StudentConfirmDialog';

interface StartSessionFormProps {
  levelId: string;
  categoryId: string;
  student: any;
  isLocked: boolean;
}

export default function StartSessionForm({ levelId, categoryId, student, isLocked }: StartSessionFormProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleInitialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked && !password.trim()) {
      setError('Password harus diisi');
      return;
    }
    setError(null);
    setShowConfirm(true);
  };

  const executeSessionStart = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await startAssessmentSession(levelId, categoryId, student, password);
      // Jika gagal
      if (result && !result.success) {
        setError(result.error);
        setLoading(false);
        setShowConfirm(false);
      }
    } catch (err) {
      setError('Terjadi kesalahan saat memulai ujian.');
      setLoading(false);
      setShowConfirm(false);
    }
  };

  return (
    <>
      <form onSubmit={handleInitialSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'flex-end' }}>
        {isLocked && (
          <div style={{ width: '100%', maxWidth: '250px' }}>
            <input
              type="text"
              placeholder="Masukkan Password Level"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid #c4c6cf',
                fontSize: '14px',
                fontFamily: 'var(--font-rubik)',
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => (e.target.style.borderColor = '#0874AA')}
              onBlur={(e) => (e.target.style.borderColor = '#c4c6cf')}
              required
            />
            {error && (
              <div style={{ color: '#BA1A1A', fontSize: '12px', marginTop: '6px', fontWeight: 500 }}>
                {error}
              </div>
            )}
          </div>
        )}
        <button 
          type="submit" 
          className="lobby-start-btn" 
          disabled={loading}
          style={{ opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          {loading ? 'Memproses...' : 'Mulai Ujian Sekarang'}
          {!loading && <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_forward</span>}
        </button>
      </form>

      <StudentConfirmDialog
        isOpen={showConfirm}
        title="Mulai Ujian?"
        description="Apakah Anda yakin ingin memulai ujian sekarang? Waktu pengerjaan akan langsung berjalan dan tidak dapat dihentikan."
        onConfirm={executeSessionStart}
        onCancel={() => setShowConfirm(false)}
        loading={loading}
      />
    </>
  );
}
