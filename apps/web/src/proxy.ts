import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { proxy as roleProxy } from './roleMiddleware';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Hanya proses jika path berawalan /siswa
  if (pathname.startsWith('/siswa')) {
    // Abaikan proteksi untuk halaman login
    if (pathname === '/siswa/login') {
      return NextResponse.next();
    }

    // Periksa cookie JWT
    const token = request.cookies.get('student_jwt')?.value;

    if (!token) {
      // Redirect ke login jika tidak ada token
      const url = request.nextUrl.clone();
      url.pathname = '/siswa/login';
      return NextResponse.redirect(url);
    }
    
    return NextResponse.next();
  }

  // Delegasikan rute lain ke roleMiddleware
  return await roleProxy(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - icons
     * - images
     */
    '/((?!api|_next/static|_next/image|favicon.ico|icons|images).*)',
  ],
};
