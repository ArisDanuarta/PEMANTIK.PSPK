'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { loginStudent } from '../../actions/studentAuth';

export default function StudentLoginForm() {
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const maxLen = 6;

  const handleNumpad = (val: string) => {
    if (pin.length < maxLen) setPin(prev => prev + val);
  };
  const handleBackspace = () => {
    if (pin.length > 0) setPin(prev => prev.slice(0, -1));
  };
  const handleClear = () => setPin('');

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isLoading) return;
    if (!username || pin.length < 6) {
      setError('Mohon lengkapi Username dan PIN 6 angka.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const result = await loginStudent(username, pin);
      if (result.success) {
        router.push('/siswa/dashboard');
      } else {
        setError(result.error || 'Gagal login. Periksa kembali username dan PIN.');
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
        return;
      }
      if (document.activeElement?.id === 'username') return;
      if (e.key >= '0' && e.key <= '9') {
        if (pin.length < maxLen) setPin(prev => prev + e.key);
      } else if (e.key === 'Backspace') {
        if (pin.length > 0) setPin(prev => prev.slice(0, -1));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pin, username, isLoading, router]);

  return (
    <>
      {/* Material Symbols Icons */}
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
      />

      <style>{`
        .login-page { min-height: 100vh; display: flex; background: #f8f9ff; }
        .left-panel {
          width: 45%;
          min-height: 100vh;
          background: #102e50;
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          padding: 32px 40px;
        }
        .left-blob {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 75%; 
          padding-bottom: 75%;
          background: rgba(130, 180, 240, 0.63);
          border-radius: 30% 70% 70% 30% / 30% 30% 70% 70%;
          pointer-events: none;
          z-index: 0;
          animation: morphBlob 12s ease-in-out infinite;
        }

        @keyframes morphBlob {
          0%, 100% {
            border-radius: 30% 70% 70% 30% / 30% 30% 70% 70%;
          }
          25% {
            border-radius: 58% 42% 75% 25% / 76% 46% 54% 24%;
          }
          50% {
            border-radius: 50% 50% 33% 67% / 55% 27% 73% 45%;
          }
          75% {
            border-radius: 33% 67% 58% 42% / 63% 68% 32% 37%;
          }
        }
        .left-content { position: relative; z-index: 1; flex: 1; display: flex; flex-direction: column; }
        .left-logo { margin-bottom: 28px; }
        .left-logo img { height: 72px; object-fit: contain; }
        .left-headline {
          font-family: var(--font-noto-serif), Georgia, serif;
          font-size: 36px;
          font-weight: 700;
          color: #ffffff;
          line-height: 1.2;
          letter-spacing: -0.01em;
          margin-bottom: 12px;
        }
        .left-sub {
          font-family: var(--font-rubik), system-ui, sans-serif;
          font-size: 15px;
          color: rgba(255, 255, 255, 1);
          line-height: 1.6;
          max-width: 100%;
          margin-bottom: 40px;
        }
        .left-illustration {
          flex: 1;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding-top: 10px;
        }
        .left-illustration img {
          width: 100%;
          max-width: 280px;
          object-fit: contain;
          background: linear-gradient(145deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02));
          padding: 36px 32px;
          border-radius: 24px;
          border: 1px solid rgba(255,255,255,0.12);
          box-shadow: 
            0 10px 0 rgba(10, 25, 45, 0.6), 
            0 20px 40px rgba(0,0,0,0.4), 
            inset 0 1px 0 rgba(255,255,255,0.2);
          backdrop-filter: blur(12px);
          transform: translateY(-15px);
        }
        .left-footer {
          font-family: var(--font-rubik), system-ui, sans-serif;
          font-size: 12px;
          color: rgba(255,255,255,0.35);
        }
        .right-panel {
          width: 55%;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 48px;
          background: #f8f9ff;
        }
        .form-card {
          width: 100%;
          max-width: 380px;
          background: #ffffff;
          border-radius: 20px;
          padding: 32px 28px 28px;
          box-shadow: 0 4px 24px rgba(16,46,80,0.09);
        }
        .card-title {
          font-family: var(--font-noto-serif), Georgia, serif;
          font-size: 22px;
          font-weight: 700;
          color: #0b1c30;
          text-align: center;
          margin-bottom: 4px;
        }
        .card-subtitle {
          font-family: var(--font-rubik), system-ui, sans-serif;
          font-size: 14px;
          color: #43474e;
          text-align: center;
          margin-bottom: 24px;
        }
        .form-label {
          font-family: var(--font-rubik), system-ui, sans-serif;
          font-size: 13px;
          font-weight: 500;
          color: #0b1c30;
          display: block;
          margin-bottom: 7px;
        }
        .input-wrap { position: relative; margin-bottom: 18px; }
        .input-icon {
          position: absolute;
          left: 11px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 20px;
          color: #74777f;
          user-select: none;
          line-height: 1;
        }
        .form-input {
          width: 100%;
          padding: 10px 12px 10px 38px;
          border: 2px solid #c4c6cf;
          border-radius: 10px;
          font-family: var(--font-rubik), system-ui, sans-serif;
          font-size: 15px;
          color: #0b1c30;
          background: #ffffff;
          outline: none;
          transition: border-color 0.2s;
          box-sizing: border-box;
        }
        .form-input:focus { border-color: #001934; }
        .form-input::placeholder { color: #9ea3aa; }

        /* PIN boxes */
        .pin-row { display: flex; gap: 8px; margin-bottom: 18px; }
        .pin-box {
          flex: 1;
          height: 44px;
          border-radius: 8px;
          border: 2px solid #c4c6cf;
          background: #f8f9ff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-rubik), system-ui, sans-serif;
          font-size: 22px;
          font-weight: 700;
          color: #0b1c30;
          transition: border-color 0.2s, background 0.2s;
        }
        .pin-box.active { border-color: #feba48; }
        .pin-box.filled { border-color: #feba48; background: #feba48; color: #714b00; }

        /* Numpad */
        .numpad {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          margin-bottom: 18px;
        }
        .num-btn {
          height: 52px;
          border-radius: 10px;
          border: none;
          background: #e5eeff;
          font-family: var(--font-rubik), system-ui, sans-serif;
          font-size: 22px;
          font-weight: 700;
          color: #0b1c30;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.15s, transform 0.1s;
        }
        .num-btn:hover { background: #dce9ff; }
        .num-btn:active { transform: scale(0.94); background: #d3e4fe; }
        .num-btn.backspace {
          background: #eff4ff;
          color: #ba1a1a;
          font-size: 20px;
        }
        .num-btn.backspace:hover { background: #ffdad6; }
        .num-btn.clear-btn {
          background: #eff4ff;
          color: #001934;
          font-size: 13px;
          font-weight: 500;
        }
        .num-btn.clear-btn:hover { background: #dce9ff; }

        /* Submit */
        .submit-btn {
          width: 100%;
          padding: 14px;
          border-radius: 50px;
          border: none;
          background: #feba48;
          color: #714b00;
          font-family: var(--font-rubik), system-ui, sans-serif;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: background 0.2s, transform 0.1s, box-shadow 0.2s;
          box-shadow: 0 4px 14px rgba(254,186,72,0.35);
        }
        .submit-btn:hover { background: #f5ac30; box-shadow: 0 6px 18px rgba(254,186,72,0.45); }
        .submit-btn:active { transform: scale(0.98); }
        .submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .submit-arrow { font-size: 18px; line-height: 1; }

        .help-link {
          display: block;
          text-align: center;
          margin-top: 14px;
          font-family: var(--font-rubik), system-ui, sans-serif;
          font-size: 13px;
          font-weight: 500;
          color: #001934;
          text-decoration: none;
        }
        .help-link:hover { text-decoration: underline; }

        .error-box {
          background: #ffdad6;
          border: 1px solid #ba1a1a;
          border-radius: 10px;
          padding: 10px 14px;
          font-family: var(--font-rubik), system-ui, sans-serif;
          font-size: 13px;
          color: #93000a;
          margin-bottom: 16px;
        }

        /* Mobile */
        @media (max-width: 767px) {
          .login-page { flex-direction: column; }
          .left-panel { width: 100%; min-height: auto; padding: 24px 20px; }
          .left-blob { width: 90%; padding-bottom: 90%; }
          .left-headline { font-size: 28px; }
          .left-illustration { padding: 20px 0; }
          .left-illustration img { max-width: 200px; }
          .right-panel { width: 100%; padding: 24px 16px 40px; }
          .form-card { max-width: 100%; border-radius: 20px; }
        }
      `}</style>

      <div className="login-page">
        {/* ── Left Panel ── */}
        <div className="left-panel">
          <div className="left-blob" />
          <div className="left-content">
            {/* Logo */}
            <div className="left-logo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/PSPK_LOGO.png"
                alt="Pemantik Logo"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>

            {/* Headline */}
            <h2 className="left-headline">Kembangkan &amp; Petik Potensi Akademik Anda.</h2>
            <p className="left-sub">
              Platform pengukuran mandiri literasi dan numerasi bersama PEMANTIK
            </p>

            {/* Illustration */}
            <div className="left-illustration">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt="Pemantik brand illustration - flame and book"
                src="/images/LOGIN_PEMANTIK.png"
              />
            </div>

            {/* Footer */}
            <p className="left-footer">© 2026 Pemantik Assessment Systems</p>
          </div>
        </div>

        {/* ── Right Panel ── */}
        <div className="right-panel">
          <div className="form-card">
            <h2 className="card-title">Student Login</h2>
            <p className="card-subtitle">Enter your credentials to access your test.</p>

            {error && <div className="error-box">{error}</div>}

            <form onSubmit={handleSubmit}>
              {/* Username */}
              <label className="form-label" htmlFor="username">Student ID or Username</label>
              <div className="input-wrap">
                <span className="material-symbols-outlined input-icon">person</span>
                <input
                  className="form-input"
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  placeholder="e.g. 2023001"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>

              {/* PIN */}
              <label className="form-label">6-Digit PIN</label>
              <div className="pin-row">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className={`pin-box${i < pin.length ? ' filled' : i === pin.length ? ' active' : ''}`}
                  >
                    {i < pin.length ? '•' : ''}
                  </div>
                ))}
              </div>

              {/* Numpad */}
              <div className="numpad">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                  <button key={n} type="button" className="num-btn" onClick={() => handleNumpad(String(n))}>
                    {n}
                  </button>
                ))}
                <button type="button" className="num-btn backspace" onClick={handleBackspace} aria-label="Hapus">
                  <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>backspace</span>
                </button>
                <button type="button" className="num-btn" onClick={() => handleNumpad('0')}>0</button>
                <button type="button" className="num-btn clear-btn" onClick={handleClear}>Clear</button>
              </div>

              {/* Submit */}
              <button type="submit" className="submit-btn" disabled={isLoading}>
                <span>{isLoading ? 'Memproses...' : 'Konfirmasi'}</span>
                {!isLoading && (
                  <span className="material-symbols-outlined submit-arrow">arrow_forward</span>
                )}
              </button>

              <a href="#" className="help-link">Need help logging in?</a>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
