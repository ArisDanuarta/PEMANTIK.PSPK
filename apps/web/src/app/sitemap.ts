import type { MetadataRoute } from "next";

/**
 * Dynamic sitemap.xml generator for Next.js App Router.
 *
 * Mengikuti dokumentasi resmi Next.js:
 * https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap
 *
 * Sitemap ini hanya mencantumkan halaman PUBLIK yang boleh diindeks Google.
 * Halaman dashboard internal (super-admin, komunitas, dll) tidak dimasukkan
 * ke sitemap karena sudah diblokir di robots.ts.
 *
 * Properti `changeFrequency` dan `priority` digunakan sebagai petunjuk
 * bagi Googlebot untuk menentukan seberapa sering merayapi halaman tersebut.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  return [
    {
      url: `${baseUrl}/login`,
      lastModified: new Date(),
      // Halaman login adalah entry point utama aplikasi.
      // Priority 1.0 = halaman terpenting menurut sitemap spec (0.0 - 1.0).
      changeFrequency: "monthly",
      priority: 1.0,
    },
    {
      // Root URL juga dimasukkan karena ada redirect dari "/" ke "/login".
      // Ini membantu Google menemukan canonical URL.
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];
}
