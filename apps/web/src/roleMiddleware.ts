import { NextResponse, type NextRequest } from "next/server";

// Role → allowed route prefix mapping
const ROLE_ROUTES: Record<string, string> = {
  super_admin: "/super-admin",
  question_admin: "/admin-soal",
  community: "/komunitas",
  school: "/sekolah",
  teacher: "/guru",
};

const PUBLIC_PATHS = ["/login", "/_next", "/api/auth", "/favicon.ico", "/images", "/icons", "/robots.txt", "/sitemap.xml"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p));
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const b64 = token.split(".")[1];
    return JSON.parse(Buffer.from(b64, "base64url").toString());
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  console.log("[Proxy] Request Pathname:", pathname);

  // Allow public paths
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // --- Try to get access token from various Supabase cookie formats ---
  let accessToken: string | undefined;

  console.log("[Proxy] Cookies present:", request.cookies.getAll().map(c => c.name));

  // Format 1: sb-access-token (set by our loginAction)
  accessToken = request.cookies.get("sb-access-token")?.value;
  console.log("[Proxy] sb-access-token found:", !!accessToken);

  // Format 2: sb-<project-ref>-auth-token (Supabase SSR format)
  if (!accessToken) {
    const projectRef = "bhrqorbjdmlewwmlajfg";
    const sessionCookie = request.cookies.get(`sb-${projectRef}-auth-token`)?.value;
    console.log("[Proxy] sb-projectRef-auth-token found:", !!sessionCookie);
    if (sessionCookie) {
      try {
        const parsed = JSON.parse(sessionCookie);
        accessToken = parsed.access_token;
      } catch { /* ignore */ }
    }
  }

  // Not authenticated → redirect to login
  if (!accessToken) {
    console.log("[Proxy] No access token found, redirecting to login");
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Decode JWT to get role claim
  const payload = decodeJwtPayload(accessToken);
  console.log("[Proxy] Decoded Payload:", payload);
  if (!payload) {
    console.log("[Proxy] Decoding payload failed");
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Check token expiry
  const exp = payload.exp as number | undefined;
  if (exp && Date.now() / 1000 > exp) {
    console.log("[Proxy] Token expired");
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Get role - our hook injects "user_role", fallback to built-in "role"
  let role = (payload.user_role ?? payload.role) as string | undefined;
  console.log("[Proxy] Initial Role from token payload:", role);

  if (!role || role === "authenticated") {
    const fallbackRole = request.cookies.get("sb-user-role")?.value;
    console.log("[Proxy] Using fallback role from cookie:", fallbackRole);
    if (fallbackRole) {
      role = fallbackRole;
    }
  }

  if (!role || !ROLE_ROUTES[role]) {
    console.log("[Proxy] Invalid or missing role, redirecting to login");
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const allowedPrefix = ROLE_ROUTES[role];

  // Root redirect → to user's dashboard
  if (pathname === "/") {
    return NextResponse.redirect(new URL(`${allowedPrefix}/dashboard`, request.url));
  }

  // Block access to other role's routes
  const routeRoles = Object.keys(ROLE_ROUTES);
  const isAccessingOtherRole = routeRoles.some(
    (r) => r !== role && pathname.startsWith(ROLE_ROUTES[r])
  );

  if (isAccessingOtherRole) {
    return NextResponse.redirect(new URL(`${allowedPrefix}/dashboard`, request.url));
  }

  // Forward claims as headers for Server Components & API routes
  const meta = (payload.user_metadata as any) || (payload.app_metadata as any) || {};
  const communityId = (payload.community_id as string) ?? meta.community_id ?? request.cookies.get("sb-community-id")?.value ?? "";
  const schoolId = (payload.school_id as string) ?? meta.school_id ?? request.cookies.get("sb-school-id")?.value ?? "";

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-user-role", role);
  requestHeaders.set("x-user-id", (payload.sub as string) ?? "");
  requestHeaders.set("x-community-id", communityId);
  requestHeaders.set("x-school-id", schoolId);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  response.headers.set("x-user-role", role);
  response.headers.set("x-user-id", (payload.sub as string) ?? "");
  response.headers.set("x-community-id", communityId);
  response.headers.set("x-school-id", schoolId);
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons|images).*)",
  ],
};
