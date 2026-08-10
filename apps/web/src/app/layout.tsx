import type { Metadata, Viewport } from "next";
import { Lora, Inter, Rubik, Noto_Serif } from "next/font/google";
import "./globals.css";
import AppProviders from "./providers";
import { headers } from "next/headers";
import { getSystemSettings } from "./actions/settings";
import FeedbackFAB from "@/components/shared/FeedbackFAB";

// Force all routes using this root layout to be dynamically rendered (SSR).
// This is required because RootLayout calls headers() from next/headers.
// Without this, Next.js will attempt to statically pre-render pages at build
// time and throw DYNAMIC_SERVER_USAGE errors.
// See: https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config#dynamic
export const dynamic = "force-dynamic";

const lora = Lora({
  subsets: ["latin"],
  variable: "--font-lora",
  display: "swap",
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800"],
});

const notoSerif = Noto_Serif({
  subsets: ["latin"],
  variable: "--font-noto-serif",
  display: "swap",
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

const rubik = Rubik({
  subsets: ["latin"],
  variable: "--font-rubik",
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

// Resolves the canonical base URL:
// - On Vercel: VERCEL_URL is automatically injected (e.g. "my-app.vercel.app")
// - In development: falls back to localhost:3000
// See: https://nextjs.org/docs/app/api-reference/functions/generate-metadata#metadatabase
const getBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
};

export const metadata: Metadata = {
  // metadataBase is REQUIRED for absolute URLs in og:image, twitter:image, and canonical links.
  // Without this, Next.js will show a warning and images won't render properly when shared.
  // Ref: https://nextjs.org/docs/app/api-reference/functions/generate-metadata#metadatabase
  metadataBase: new URL(getBaseUrl()),
  
  verification: {
    google: "YxPpuVS3AlmNs0ZRi47tzcyx2jU_YwrXlh9bN1dfERg",
  },

  title: {
    default: "Pemantik – Platform Asesmen Literasi & Numerasi",
    template: "%s | Pemantik PSPK",
  },
  description:
    "Sistem manajemen ujian berjenjang untuk asesmen literasi dan numerasi. Mendukung Super Admin, Admin Soal, Komunitas, Sekolah, Guru, dan Anak.",
  keywords: [
    "asesmen",
    "literasi",
    "numerasi",
    "PSPK",
    "pendidikan",
    "pemantik",
    "ujian",
    "sekolah",
  ],
  authors: [{ name: "PSPK" }],
  // Canonical URL - tells Google the authoritative URL for this page
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Pemantik – Platform Asesmen Literasi & Numerasi",
    description: "Sistem manajemen ujian berjenjang untuk asesmen literasi dan numerasi.",
    siteName: "Pemantik PSPK",
    locale: "id_ID",
    type: "website",
    // og:image - gambar yang muncul saat link dibagikan di WhatsApp, Twitter, dll.
    // Path relatif dari metadataBase secara otomatis akan menjadi URL absolut.
    images: [
      {
        url: "/images/LOGO_PEMANTIK_BERWARNA.png",
        width: 1200,
        height: 630,
        alt: "Logo Pemantik PSPK – Platform Asesmen Literasi & Numerasi",
      },
    ],
  },
  // twitter:card metadata for Twitter/X sharing
  twitter: {
    card: "summary_large_image",
    title: "Pemantik – Platform Asesmen Literasi & Numerasi",
    description: "Sistem manajemen ujian berjenjang untuk asesmen literasi dan numerasi.",
    images: ["/images/LOGO_PEMANTIK_BERWARNA.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Check maintenance mode
  let isMaintenanceActive = false;
  let maintenanceMessage = "Sistem sedang dalam perbaikan rutin. Silakan kembali beberapa saat lagi.";
  let userRole = "guest";

  try {
    const headersList = await headers();
    userRole = headersList.get("x-user-role") || "guest";
    
    // Only fetch settings if user is trying to access a restricted page
    // For login page, we might still want them to login, but let's block the whole app if needed, except super admin
    const settingsReq = await getSystemSettings();
    if (settingsReq.success && settingsReq.data) {
      isMaintenanceActive = settingsReq.data.maintenance_mode === true;
      if (settingsReq.data.maintenance_message) {
        maintenanceMessage = settingsReq.data.maintenance_message;
      }
    }
  } catch (e) {
    console.error("Failed to check maintenance mode in layout", e);
  }

  // CRITICAL FIX: Do not block "guest" (unauthenticated) users here because they need to be able to see the /login page!
  // If we block guests, even Super Admins whose session expired will be completely locked out from logging in.
  // The middleware already protects restricted pages, so guests are only ever on public pages (like /login).
  const showMaintenanceBlock = isMaintenanceActive && userRole !== "super_admin" && userRole !== "guest";

  return (
    <html lang="id" className={`${lora.variable} ${inter.variable} ${notoSerif.variable} ${rubik.variable}`}>
      <head>
        {/* Material Symbols Outlined – must be loaded via <link> because next/font doesn't support it */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block"
        />
      </head>
      <body>
        {showMaintenanceBlock ? (
          <div style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#f9fafb",
            fontFamily: "var(--font-inter)",
            padding: "2rem"
          }}>
            <div style={{
              maxWidth: "500px",
              textAlign: "center",
              backgroundColor: "white",
              padding: "3rem 2rem",
              borderRadius: "1rem",
              boxShadow: "0 10px 25px rgba(0,0,0,0.05)",
              borderTop: "5px solid #f59e0b"
            }}>
              <div style={{ 
                width: "80px", 
                height: "80px", 
                backgroundColor: "#fffbeb", 
                borderRadius: "50%", 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center",
                margin: "0 auto 1.5rem"
              }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
                </svg>
              </div>
              <h1 style={{ fontFamily: "var(--font-lora)", fontSize: "1.75rem", color: "#102e50", marginBottom: "1rem", fontWeight: 700 }}>Sistem Sedang Maintenance</h1>
              <p style={{ color: "#4b5563", fontSize: "1rem", lineHeight: 1.6 }}>{maintenanceMessage}</p>
            </div>
          </div>
        ) : (
          <AppProviders>
            {children}
            <FeedbackFAB userRole={userRole} />
          </AppProviders>
        )}
      </body>
    </html>
  );
}
