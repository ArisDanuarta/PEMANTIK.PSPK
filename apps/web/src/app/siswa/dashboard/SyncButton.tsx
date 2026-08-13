'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function SyncButton() {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    if (syncing) return;
    setSyncing(true);
    router.refresh();
    // Beri animasi minimal 800ms agar terasa ada proses
    await new Promise((res) => setTimeout(res, 800));
    setSyncing(false);
  };

  return (
    <>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .sync-icon-spinning {
          animation: spin 0.8s linear infinite;
          display: inline-block;
        }
      `}</style>
      <button
        className="db-hero-btn"
        aria-label="Sinkronisasi Data"
        onClick={handleSync}
        disabled={syncing}
        style={{ opacity: syncing ? 0.7 : 1, cursor: syncing ? 'not-allowed' : 'pointer' }}
      >
        <span
          className={`material-symbols-outlined${syncing ? ' sync-icon-spinning' : ''}`}
          style={{ fontSize: '20px' }}
        >
          sync
        </span>
        <span>{syncing ? 'Memuat...' : 'Sinkronisasi Data'}</span>
      </button>
    </>
  );
}
