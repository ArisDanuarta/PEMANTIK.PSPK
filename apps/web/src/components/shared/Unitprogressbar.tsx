"use client";

import { useEffect, useRef, useState } from "react";

// Path shape asli logo Pemantik (diekstrak dari SVG, sudah disederhanakan
// jadi 2 path datar).
const PATH_YELLOW =
  "M 266.9375 368.101562 C 266.550781 389.734375 264.878906 411.441406 260.742188 432.542969 C 254.894531 462.347656 245.597656 491.324219 231.859375 518.714844 C 227.894531 526.605469 224.34375 534.683594 219.492188 542.097656 C 217.347656 545.375 214.9375 548.347656 210.382812 547.085938 C 206.050781 545.890625 204.847656 542.363281 204.441406 538.410156 C 203.15625 525.925781 203.175781 513.335938 200.347656 500.976562 C 199.15625 495.773438 197.089844 490.902344 195.460938 485.945312 C 190.226562 470.007812 182.898438 454.933594 174.335938 440.425781 C 157.152344 411.324219 134.519531 386.371094 113.640625 360.109375 C 91.34375 332.0625 71.363281 302.679688 60.742188 268.15625 C 56.429688 254.144531 53.441406 239.527344 52.71875 224.683594 C 51.859375 206.945312 53.097656 189.359375 56.742188 171.976562 C 62.0625 146.65625 70.402344 122.339844 80.316406 98.421875 C 92.972656 67.898438 109.65625 39.566406 125.800781 10.90625 C 127.417969 8.035156 129.515625 5.414062 131.542969 2.796875 C 132.824219 1.144531 134.699219 0.140625 136.808594 0.632812 C 139.417969 1.246094 139.785156 3.648438 140.15625 5.847656 C 140.339844 6.933594 140.453125 8.070312 140.34375 9.15625 C 138.902344 22.988281 141.8125 36.597656 143.6875 50.058594 C 145.425781 62.535156 150.382812 74.625 154.46875 86.695312 C 162.941406 111.695312 177.589844 133.355469 192.777344 154.558594 C 199.203125 163.527344 205.820312 172.390625 211.929688 181.574219 C 221.488281 195.941406 229.164062 211.351562 236.1875 227.128906 C 244.441406 245.699219 251.210938 264.828125 255.886719 284.507812 C 260.039062 301.988281 263.984375 319.554688 264.636719 337.800781 C 264.988281 347.839844 267.445312 357.871094 266.9375 368.101562 Z";

const PATH_ORANGE =
  "M 3.09375 375.144531 C 0.6875 361.050781 0.460938 346.84375 1.59375 332.632812 C 2 327.542969 3.113281 322.46875 4.320312 317.492188 C 5.054688 314.453125 7.433594 312.359375 10.699219 312.699219 C 13.914062 313.035156 16.550781 314.726562 17.296875 318.296875 C 22.492188 343.152344 33.808594 365.273438 49.03125 385.207031 C 56.945312 395.570312 66.285156 404.875 75.75 414.101562 C 94.40625 432.277344 117.054688 445.542969 135.105469 464.277344 C 145.273438 474.828125 154.613281 485.980469 161.859375 498.851562 C 174.761719 521.757812 182.566406 546.230469 184.8125 572.378906 C 185.910156 585.128906 184.039062 597.863281 182.835938 610.558594 C 182.488281 614.1875 181.03125 617.792969 176.832031 618.171875 C 172.773438 618.53125 170.171875 615.496094 169.253906 612.019531 C 165.820312 599.054688 158.070312 588.398438 149.53125 578.875 C 138.425781 566.496094 125.917969 555.296875 112.515625 545.265625 C 88.558594 527.339844 64.277344 509.683594 45.917969 485.617188 C 31.742188 467.042969 20.628906 446.71875 12.730469 424.570312 C 7.003906 408.5 3.601562 392.152344 3.09375 375.144531 Z";

interface PemantikLogoProgressProps {
  value: number;
  max: number;
  size?: number;
  durationMs?: number;
  emptyColor?: string;
  showLabel?: boolean;
  /** Dipertahankan untuk kompatibilitas prop lama; tidak lagi dipakai (lihat catatan di bawah). */
  waveAmplitude?: number;
  waveSpeedSec?: number;
  className?: string;
}

/**
 * Logo Pemantik yang "terisi" warna aslinya (kuning + oranye) secara
 * bertahap dari bawah ke atas sesuai progres value/max.
 *
 * CATATAN PERBAIKAN:
 * Versi sebelumnya pakai SVG <clipPath> bersarang dengan path gelombang
 * kompleks yang di-reference lewat id dinamis — pendekatan itu rapuh
 * (gampang gagal render "stuck abu-abu" di beberapa kondisi browser/SSR)
 * dan susah di-debug. Versi ini pakai CSS `clip-path: inset()` biasa di
 * elemen langsung (tanpa id-referencing sama sekali), yang jauh lebih
 * robust dan predictable di semua browser: layer abu-abu ditumpuk di
 * atas layer warna, lalu bagian bawah layer abu-abu "dipotong" sesuai
 * persentase progres sehingga warna di baliknya kelihatan.
 *
 * Contoh pemakaian:
 *   <PemantikLogoProgress value={7} max={10} />
 *   <PemantikLogoProgress value={uploadedRows} max={totalRows} size={220} />
 */
export default function PemantikLogoProgress({
  value,
  max,
  size = 160,
  durationMs = 900,
  emptyColor = "#d3d1c7",
  showLabel = true,
  className,
}: PemantikLogoProgressProps) {
  const percent = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;

  // Animasi dari nilai sebelumnya ke nilai baru, bukan loncat langsung,
  // supaya efek "fill" kelihatan naik pelan-pelan.
  const [displayPercent, setDisplayPercent] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const start = displayPercent;
    const delta = percent - start;
    const startTime = performance.now();

    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const tick = (now: number) => {
      const t = Math.min(1, (now - startTime) / durationMs);
      // easeOutCubic biar akhir animasinya kerasa halus melambat
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayPercent(start + delta * eased);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [percent, durationMs]);

  // Potong layer ABU-ABU dari bawah sebesar displayPercent%, sehingga
  // layer WARNA di baliknya kelihatan untuk bagian yang sudah "terisi".
  const grayClip = `inset(0 0 ${displayPercent}% 0)`;

  return (
    <div
      className={className}
      style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 8 }}
    >
      <div style={{ position: "relative", width: size, height: size }}>
        {/* Layer bawah: warna asli, selalu penuh */}
        <svg
          viewBox="0 0 768 768"
          width={size}
          height={size}
          xmlns="http://www.w3.org/2000/svg"
          style={{ position: "absolute", inset: 0 }}
          role="img"
          aria-label={`Progres ${Math.round(percent)} persen`}
        >
          <g transform="translate(249,73)">
            <path fill="#f6c716" d={PATH_YELLOW} />
            <path fill="#e97e0e" d={PATH_ORANGE} />
          </g>
        </svg>

        {/* Layer atas: abu-abu, dipotong dari bawah sesuai progres via CSS clip-path */}
        <svg
          viewBox="0 0 768 768"
          width={size}
          height={size}
          xmlns="http://www.w3.org/2000/svg"
          style={{ position: "absolute", inset: 0, clipPath: grayClip, WebkitClipPath: grayClip }}
          aria-hidden="true"
        >
          <g transform="translate(249,73)">
            <path fill={emptyColor} d={PATH_YELLOW} />
            <path fill={emptyColor} d={PATH_ORANGE} />
          </g>
        </svg>
      </div>

      {showLabel && (
        <span style={{ fontSize: 14, fontWeight: 500, color: "#444441" }}>
          {Math.round((displayPercent / 100) * max)}/{max} ({Math.round(displayPercent)}%)
        </span>
      )}
    </div>
  );
}