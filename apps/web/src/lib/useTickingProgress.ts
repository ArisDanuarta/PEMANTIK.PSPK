"use client";

import { useEffect, useRef, useState } from "react";

interface TickingProgressOptions {
  /** Perkiraan jarak waktu antar update asli dari server (ms). */
  expectedIntervalMs?: number;
  /** Kecepatan hitung minimum (unit/detik) supaya angka tidak diam total sebelum update pertama datang. */
  minStepsPerSec?: number;
}

/**
 * Membuat angka "menghitung" naik secara halus (1, 2, 3, 4, 5...) menuju
 * nilai asli terbaru — walaupun nilai asli itu sendiri hanya berubah
 * sesekali (per-chunk upload, atau per-poll tiap beberapa detik).
 *
 * Cara kerja: setiap kali nilai asli berubah, hook menghitung kecepatan
 * dari jarak waktu sejak update sebelumnya (delta / waktu berlalu).
 * Kecepatan itu lalu dipakai untuk terus menghitung naik di antara dua
 * update asli, sehingga tidak ada momen "diam lalu meloncat".
 */
export function useTickingProgress(
  realValue: number,
  max: number,
  options: TickingProgressOptions = {}
) {
  const { expectedIntervalMs = 1500, minStepsPerSec = 3 } = options;
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
      s.velocity = delta / Math.max(dtSinceLastReal, expectedIntervalMs * 0.4);
    } else if (delta < 0) {
      // nilai turun (mis. reset progress) -> ikuti langsung, tanpa animasi mundur
      s.display = realValue;
    }
    s.prevReal = realValue;
    s.lastUpdateAt = now;
  }, [realValue, expectedIntervalMs]);

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