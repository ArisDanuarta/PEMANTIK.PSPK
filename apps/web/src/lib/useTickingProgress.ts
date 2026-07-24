"use client";

import { useEffect, useRef, useState } from "react";

interface TickingProgressOptions {
  /** Perkiraan jarak waktu antar update asli dari server (ms). */
  expectedIntervalMs?: number;
  /** Kecepatan hitung minimum (unit/detik) supaya angka tidak diam total sebelum update pertama datang. */
  minStepsPerSec?: number;
  /**
   * Durasi minimum (ms) untuk "menghitung" dari nilai lama ke nilai baru,
   * walaupun update asli dari server datangnya sangat cepat atau langsung
   * loncat jauh (mis. batch kecil yang selesai dalam sekali polling).
   * Tanpa ini, kalau server balas lebih cepat dari expectedIntervalMs,
   * animasi bisa "kepencet" ke angka akhir dan kelihatan seperti loncat
   * tiba-tiba alih-alih menghitung pelan-pelan.
   */
  minDurationMs?: number;
}

/**
 * Membuat angka "menghitung" naik secara halus (1, 2, 3, 4, 5...) menuju
 * nilai asli terbaru — walaupun nilai asli itu sendiri hanya berubah
 * sesekali (per-chunk upload, atau per-poll tiap beberapa detik).
 *
 * Cara kerja: setiap kali nilai asli berubah, hook menghitung kecepatan
 * dari jarak waktu sejak update sebelumnya (delta / waktu berlalu), lalu
 * kecepatan itu DIBATASI supaya proses menghitung tidak lebih cepat dari
 * `minDurationMs` — ini mencegah kasus "0 tiba-tiba jadi selesai" saat
 * server ternyata memproses lebih cepat dari perkiraan.
 */
export function useTickingProgress(
  realValue: number,
  max: number,
  options: TickingProgressOptions = {}
) {
  const {
    expectedIntervalMs = 1500,
    minStepsPerSec = 3,
    minDurationMs = 900,
  } = options;
  const [display, setDisplay] = useState(realValue);

  const ref = useRef({
    display: realValue,
    prevReal: realValue,
    lastUpdateAt: performance.now(),
    velocity: 0, // unit per ms
  });

  // Setiap kali nilai asli (dari server) berubah, re-estimasi kecepatan
  useEffect(() => {
    const s = ref.current;
    const now = performance.now();
    const dtSinceLastReal = Math.max(1, now - s.lastUpdateAt);
    const delta = realValue - s.prevReal;

    if (delta > 0) {
      const estimatedVelocity = delta / Math.max(dtSinceLastReal, expectedIntervalMs * 0.4);
      // Batas atas kecepatan: jangan sampai proses menghitung dari
      // display saat ini ke realValue lebih cepat dari minDurationMs,
      // walaupun server sebenarnya sudah selesai jauh lebih cepat.
      const remaining = Math.max(0, realValue - s.display);
      const maxVelocityForMinDuration = remaining / minDurationMs;
      s.velocity = Math.min(estimatedVelocity, maxVelocityForMinDuration || estimatedVelocity);
    } else if (delta < 0) {
      // nilai turun (mis. reset progress) -> ikuti langsung, tanpa animasi mundur
      s.display = realValue;
    }
    s.prevReal = realValue;
    s.lastUpdateAt = now;
  }, [realValue, expectedIntervalMs, minDurationMs]);

  // Loop animasi: terus mendekati realValue tiap frame
  useEffect(() => {
    let raf: number;
    let lastFrame = performance.now();

    const tick = () => {
      const now = performance.now();
      const dt = now - lastFrame;
      lastFrame = now;
      const s = ref.current;

      if (s.display < realValue) {
        const minStep = (minStepsPerSec * dt) / 1000;
        const step = Math.max(s.velocity * dt, minStep);
        s.display = Math.min(realValue, s.display + step);
      } else if (s.display > realValue) {
        s.display = realValue;
      }

      setDisplay(Math.round(s.display));
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [realValue, minStepsPerSec]);

  return Math.min(display, max);
}