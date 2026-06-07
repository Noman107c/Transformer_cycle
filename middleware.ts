import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect /admin/* routes (except /admin/login)
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    const token = request.cookies.get('admin_token')?.value;

    if (!token) {
      const loginUrl = new URL('/admin/login', request.url);
      return NextResponse.redirect(loginUrl);
    }

    // Quick token structure check (full verify happens in API routes)
    try {
      const parts = token.split('.');
      if (parts.length !== 3) throw new Error('Invalid token');
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      if (!payload.id || payload.role !== 'admin') throw new Error('Not admin');
      if (payload.exp && payload.exp < Date.now() / 1000) throw new Error('Expired');
    } catch {
      const loginUrl = new URL('/admin/login', request.url);
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete('admin_token');
      return response;
    }
  }

  // Redirect /admin/login to /admin/dashboard if already logged in
  if (pathname === '/admin/login') {
    const token = request.cookies.get('admin_token')?.value;
    if (token) {
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
          if (payload.id && payload.role === 'admin' && payload.exp > Date.now() / 1000) {
            return NextResponse.redirect(new URL('/admin/dashboard', request.url));
          }
        }
      } catch {}
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
