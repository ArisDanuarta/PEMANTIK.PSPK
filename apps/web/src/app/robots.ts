import type { MetadataRoute } from "next";

/**
 * Dynamic robots.txt generator for Next.js App Router.
 *
 * Mengikuti dokumentasi resmi Next.js:
 * https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots
 *
 * Strategi:
 * - Halaman publik (/login) → BOLEH diindeks Google
 * - Semua halaman dashboard sensitif → DIBLOKIR dari Googlebot
 *   Ini penting karena aplikasi ini adalah sistem internal manajemen ujian.
 *   Halaman seperti /super-admin, /komunitas, /sekolah, /guru TIDAK boleh
 *   muncul di hasil pencarian Google.
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  return {
    rules: [
      {
        // Aturan untuk Googlebot dan semua crawler
        userAgent: "*",
        // Halaman yang BOLEH diakses dan diindeks oleh crawler
        allow: [
          "/",        // Root (redirect ke /login)
          "/login",   // Halaman login (halaman publik utama)
        ],
        // Halaman yang DIBLOKIR dari crawler — halaman internal sistem
        disallow: [
          "/super-admin/",
          "/admin-soal/",
          "/komunitas/",
          "/sekolah/",
          "/guru/",
          "/api/",      // Blokir semua API routes dari crawler
        ],
      },
    ],
    // Referensikan sitemap agar Google bisa menemukannya secara otomatis
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
