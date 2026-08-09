"use client";

import React, { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { loginAction } from "../actions/auth";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false); // State baru untuk toggle password
  const [isPending, startTransition] = useTransition();

  const [maintenanceData, setMaintenanceData] = useState<{ active: boolean; message: string } | null>(null);
  const [apkUrl, setApkUrl] = useState<string | null>(null);

  React.useEffect(() => {
    // We import getSystemSettings dynamically to avoid issues if it requires server context in some setups,
    // actually it's a server action so we can import it directly.
    import("../actions/settings").then((mod) => {
      mod.getSystemSettings().then((res) => {
        if (res.success && res.data?.maintenance_mode) {
          setMaintenanceData({
            active: true,
            message: res.data.maintenance_message || "Sistem sedang dalam perbaikan rutin."
          });
        }
      });
    });

    import("@pemantik/supabase/client").then(({ createBrowserClient }) => {
      const supabase = createBrowserClient();
      supabase
        .from("app_releases" as any)
        .select("download_url")
        .eq("is_active", true)
        .order("version_code", { ascending: false })
        .limit(1)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            let url = (data as any).download_url;
            // Convert Google Drive /view link to direct download link
            if (url && url.includes("drive.google.com/file/d/")) {
              const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
              if (match && match[1]) {
                url = `https://drive.google.com/uc?export=download&id=${match[1]}`;
              }
            }
            setApkUrl(url);
          }
        });
    });
  }, []);

  const handleLogin = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await loginAction(formData);
      if (result?.error) {
        setError(result.error);
      }
    });
  };

  return (
    <div className="login-page">
      {/* -- Panel Kiri ------------------------------------------------------- */}
      <div className="login-left">
        {/* Decorative orbs */}
        <div className="login-orb login-orb-1" aria-hidden="true" />
        <div className="login-orb login-orb-2" aria-hidden="true" />
        <div className="login-orb login-orb-3" aria-hidden="true" />

        {/* Logo utama Pemantik */}
        <div className="login-logo-wrap">
          <Image
            src="/images/LOGO_PEMANTIK_PUTIH_KUNING.png"
            alt="Logo Pemantik - Pengukuran Mandiri Literasi dan Numerasi PSPK"
            width={240}
            height={93}
            priority
            className="login-logo-img"
          />
        </div>

        {/* Hero copy */}
        <div className="login-hero">
          <div className="login-hero-eyebrow">Platform Asesmen</div>
          <h1 className="login-hero-title">
            Literasi &amp;<br />
            <em>Numerasi</em>
          </h1>
          <p className="login-hero-desc" style={{ marginBottom: "2rem" }}>
            Sistem manajemen ujian berjenjang yang mendukung seluruh
            ekosistem pendidikan dari komunitas hingga ke setiap siswa.
          </p>

          <div style={{ position: "relative", zIndex: 2, marginTop: "1rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "center" }}>
              {apkUrl && (
                <a 
                  href={apkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ 
                    backgroundColor: "#f59e0b",
                    color: "#0f172a", 
                    fontWeight: "700",
                    fontSize: "1rem",
                    padding: "0.875rem 1.75rem",
                    borderRadius: "9999px",
                    display: "inline-flex", 
                    alignItems: "center", 
                    gap: "0.75rem",
                    textDecoration: "none",
                    boxShadow: "0 4px 20px rgba(245, 158, 11, 0.4)",
                    transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                    border: "none",
                    cursor: "pointer"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-3px)";
                    e.currentTarget.style.boxShadow = "0 8px 25px rgba(245, 158, 11, 0.6)";
                    e.currentTarget.style.backgroundColor = "#fbbf24";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 4px 20px rgba(245, 158, 11, 0.4)";
                    e.currentTarget.style.backgroundColor = "#f59e0b";
                  }}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                  Download Aplikasi Siswa
                </a>
              )}
              
              <Link 
                href="/siswa/login"
                style={{ 
                  backgroundColor: "rgba(255, 255, 255, 0.15)",
                  color: "#ffffff", 
                  fontWeight: "600",
                  fontSize: "1rem",
                  padding: "0.875rem 1.75rem",
                  borderRadius: "9999px",
                  display: "inline-flex", 
                  alignItems: "center", 
                  gap: "0.75rem",
                  textDecoration: "none",
                  border: "1px solid rgba(255, 255, 255, 0.3)",
                  backdropFilter: "blur(10px)",
                  transition: "all 0.2s ease"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.25)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.15)";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
                  <polyline points="10 17 15 12 10 7"></polyline>
                  <line x1="15" y1="12" x2="3" y2="12"></line>
                </svg>
                Login Siswa Web
              </Link>
            </div>
            
            {apkUrl && (
              <p style={{ 
                fontSize: "0.85rem", 
                color: "rgba(255,255,255,0.7)", 
                marginLeft: "0.75rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                marginTop: "-0.25rem"
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
                  <line x1="12" y1="18" x2="12.01" y2="18"></line>
                </svg>
                Tersedia untuk Android & Tablet
              </p>
            )}
          </div>
        </div>

        {/* Partner Logos Marquee */}
        <div className="login-partners">
          <p className="login-partners-title">Klien & Partner Pemantik:</p>
          <div className="login-partners-marquee">
            <div className="login-partners-track">
              {[...Array(2)].map((_, idx) => (
                <React.Fragment key={idx}>
                  <img src="/images/Klien & Partner Pemantik/Logo-Inspirasi.png" alt="Inspirasi" />
                  <img src="/images/Klien & Partner Pemantik/Logo-Sekolahmu.png" alt="Sekolahmu" />
                  <img src="/images/Klien & Partner Pemantik/YSS.png" alt="YSS" />
                  <img src="/images/Klien & Partner Pemantik/logoYGB.png" alt="YGB" />
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        {/* Footer branding */}
        <div className="login-left-footer">
          <span>#BerpihakKepadaAnak</span>
          <span className="login-left-footer-dot" aria-hidden="true">·</span>
          <span>PSPK © 2026</span>
        </div>
      </div>

      {/* -- Panel Kanan (Form) ------------------------------------------------ */}
      <div className="login-right">
        <div className="login-form-card animate-scale-in">
          <div className="login-form-header">
            <div className="login-form-badge">Portal</div>
            <h2 className="login-form-title">Masuk ke Sistem</h2>
            <p className="login-form-subtitle">
              Masukkan kredensial akun Anda untuk melanjutkan
            </p>
          </div>

          {maintenanceData?.active && (
            <div style={{
              backgroundColor: "#fffbeb",
              border: "1px solid #fcd34d",
              borderRadius: "0.5rem",
              padding: "1rem",
              marginBottom: "1.5rem",
              display: "flex",
              gap: "0.75rem",
              alignItems: "flex-start"
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: "0.125rem" }}>
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
              </svg>
              <div>
                <h4 style={{ color: "#92400e", fontWeight: 700, margin: "0 0 0.25rem 0", fontSize: "0.9rem" }}>Sistem Maintenance</h4>
                <p style={{ color: "#b45309", fontSize: "0.85rem", margin: 0, lineHeight: 1.4 }}>{maintenanceData.message}</p>
                <p style={{ color: "#b45309", fontSize: "0.75rem", margin: "0.5rem 0 0 0", fontStyle: "italic" }}>Hanya Super Admin yang dapat login saat ini.</p>
              </div>
            </div>
          )}

          <form onSubmit={handleLogin} className="login-form" noValidate>
            <div className="form-group">
              <label htmlFor="login-username" className="form-label">
                Username
              </label>
              <input
                id="login-username"
                name="username"
                type="text"
                className="form-input"
                placeholder="Masukkan username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                autoFocus
              />
            </div>

            <div className="form-group">
              <label htmlFor="login-password" className="form-label">
                Password
              </label>
              <div className="password-input-wrapper">
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? "text" : "password"} // Logika toggle tipe input
                  className="form-input password-input"
                  placeholder="Masukkan password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="toggle-password-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Sembunyikan sandi" : "Tampilkan sandi"}
                >
                  {showPassword ? (
                    // Ikon Eye Off (Sembunyikan)
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                  ) : (
                    // Ikon Eye (Tampilkan)
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="login-error" role="alert">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {error}
              </div>
            )}

            <button
              type="submit"
              id="login-submit-btn"
              className="btn btn-primary btn-lg"
              style={{ width: "100%", marginTop: "0.25rem" }}
              disabled={isPending || !username || !password}
            >
              {isPending ? (
                <>
                  <span className="btn-spinner" aria-hidden="true" />
                  Memproses...
                </>
              ) : (
                "Masuk"
              )}
            </button>
          </form>
        </div>
      </div>

      <style>{`
        /* -- Page Layout ------------------------------------------- */
        .login-page {
          min-height: 100vh;
          display: grid;
          grid-template-columns: 55% 45%;
        }

        /* -- Left Panel -------------------------------------------- */
        .login-left {
          background: var(--clr-biru);
          padding: 3rem 3.5rem;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 2.5rem;
          position: relative;
          overflow: hidden;
        }

        /* Decorative gradient orbs */
        .login-orb {
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
          z-index: 0;
        }
        .login-orb-1 {
          width: 520px; height: 520px;
          top: -180px; right: -160px;
          background: radial-gradient(circle, rgba(242,175,62,0.12) 0%, transparent 65%);
        }
        .login-orb-2 {
          width: 380px; height: 380px;
          bottom: -120px; left: -100px;
          background: radial-gradient(circle, rgba(8,116,170,0.2) 0%, transparent 65%);
        }
        .login-orb-3 {
          width: 200px; height: 200px;
          top: 45%; left: 55%;
          background: radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 70%);
        }

        /* Logo */
        .login-logo-wrap {
          position: relative;
          z-index: 1;
          /* Frosted glass card - sized to fit the logo */
          background: rgba(255,255,255,0.07);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: var(--radius-lg);
          padding: 0.75rem 1rem;
          display: inline-flex;
          align-items: center;
          backdrop-filter: blur(6px);
          width: fit-content;
        }
        .login-logo-img {
          width: 220px;
          height: auto;
          display: block;
        }

        /* Hero */
        .login-hero {
          position: relative;
          z-index: 1;
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .login-hero-eyebrow {
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.18em;
          color: var(--clr-kuning);
          margin-bottom: 0.875rem;
          opacity: 0.9;
        }
        .login-hero-title {
          font-family: var(--font-heading);
          font-size: clamp(2.4rem, 4vw, 3.2rem);
          font-weight: 700;
          color: #fff;
          line-height: 1.1;
          margin-bottom: 1.25rem;
          letter-spacing: -0.02em;
        }
        .login-hero-title em {
          color: var(--clr-kuning);
          font-style: italic;
        }
        .login-hero-desc {
          font-size: 1.1rem;
          color: rgba(255,255,255,0.75);
          line-height: 1.6;
          max-width: 480px;
        }

        /* Partner Marquee */
        .login-partners {
          position: relative;
          z-index: 1;
          margin-top: 1rem;
          width: 100%;
          overflow: hidden;
        }
        .login-partners-title {
          font-size: 0.85rem;
          color: rgba(255, 255, 255, 0.6);
          margin-bottom: 0.75rem;
          font-weight: 500;
        }
        .login-partners-marquee {
          width: 100%;
          overflow: hidden;
          position: relative;
          mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
          -webkit-mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
        }
        .login-partners-track {
          display: flex;
          align-items: center;
          gap: 3rem;
          width: max-content;
          animation: marquee 25s linear infinite;
        }
        .login-partners-track img {
          height: 70px;
          object-fit: contain;
          background: #ffffff;
          padding: 0px 3px;
          border-radius: 8px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.1);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .login-partners-track img:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 25px rgba(0,0,0,0.2);
        }
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(calc(-50% - 1.5rem)); }
        }

        /* Feature items */
        .login-features {
          display: flex;
          flex-direction: column;
          gap: 0.625rem;
          position: relative;
          z-index: 1;
        }
        .login-feature-item {
          display: flex;
          align-items: flex-start;
          gap: 0.875rem;
          padding: 0.875rem 1rem;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.09);
          border-radius: var(--radius-lg);
          backdrop-filter: blur(6px);
          transition: background 200ms ease, border-color 200ms ease;
        }
        .login-feature-item:hover {
          background: rgba(255,255,255,0.09);
          border-color: rgba(255,255,255,0.16);
        }
        .login-feature-icon {
          color: var(--clr-kuning);
          flex-shrink: 0;
          margin-top: 1px;
          opacity: 0.9;
        }
        .login-feature-label {
          font-weight: 600;
          color: #fff;
          font-size: 0.85rem;
          margin-bottom: 0.15rem;
        }
        .login-feature-desc {
          font-size: 0.72rem;
          color: rgba(255,255,255,0.5);
          line-height: 1.5;
        }

        /* Left footer */
        .login-left-footer {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.72rem;
          color: rgba(255,255,255,0.35);
          letter-spacing: 0.03em;
        }
        .login-left-footer-dot {
          opacity: 0.4;
        }

        /* -- Right Panel ------------------------------------------- */
        .login-right {
          background: #f3f5f7;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem 2.5rem;
        }

        .login-form-card {
          width: 100%;
          max-width: 400px;
          background: #fff;
          border-radius: var(--radius-2xl);
          box-shadow: 0 8px 40px rgba(16,46,80,0.10), 0 1px 3px rgba(16,46,80,0.06);
          border: 1px solid #e4e8ed;
          padding: 2.25rem 2.5rem;
        }

        .login-form-header {
          margin-bottom: 1.75rem;
          text-align: center;
        }
        .login-form-badge {
          display: inline-block;
          font-size: 0.65rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: var(--clr-biru);
          background: rgba(16,46,80,0.07);
          border: 1px solid rgba(16,46,80,0.12);
          border-radius: 999px;
          padding: 0.25rem 0.75rem;
          margin-bottom: 0.875rem;
        }
        .login-form-title {
          font-family: var(--font-heading);
          font-size: 1.6rem;
          font-weight: 600;
          color: var(--clr-biru);
          margin-bottom: 0.4rem;
          font-style: italic;
        }
        .login-form-subtitle {
          font-size: 0.825rem;
          color: #6c757d;
          line-height: 1.5;
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 1.125rem;
        }

        /* -- Password Input Wrapper -- */
        .password-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }
        .password-input {
          padding-right: 2.5rem; /* Memberi ruang agar teks tidak tertimpa ikon mata */
          width: 100%;
        }
        .toggle-password-btn {
          position: absolute;
          right: 0.75rem;
          background: none;
          border: none;
          color: #adb5bd;
          cursor: pointer;
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.2s ease;
        }
        .toggle-password-btn:hover {
          color: #495057;
        }

        .login-error {
          background: rgba(168,40,28,0.07);
          border: 1px solid rgba(168,40,28,0.18);
          border-radius: var(--radius-md);
          padding: 0.7rem 0.875rem;
          font-size: 0.78rem;
          color: var(--clr-merah);
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
          line-height: 1.5;
        }

        /* Divider */
        .login-divider {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin: 1.5rem 0 1rem;
          color: #adb5bd;
          font-size: 0.7rem;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .login-divider::before,
        .login-divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: #e9ecef;
        }

        /* Roles grid */
        .login-roles-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 0.375rem;
          justify-content: center;
        }
        .login-role-pill {
          font-size: 0.68rem;
          font-weight: 600;
          padding: 0.2rem 0.625rem;
          border-radius: 999px;
          border: 1.5px solid var(--role-color, #102e50);
          color: var(--role-color, #102e50);
          background: transparent;
          opacity: 0.75;
          transition: opacity 150ms ease;
        }
        .login-role-pill:hover { opacity: 1; }

        /* -- Responsive ------------------------------------------- */
        @media (max-width: 900px) {
          .login-page { grid-template-columns: 1fr; }
          .login-left {
            padding: 2.5rem 2rem;
            min-height: 45vh;
            gap: 1.5rem;
          }
          .login-logo-img { max-width: 180px; }
          .login-hero-title { font-size: 2rem; }
          .login-features { display: none; }
          .login-right { padding: 2rem 1.5rem; }
        }
      `}</style>
    </div>
  );
}
