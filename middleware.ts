import { NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  // Auth check removed as per user request.
  // Direct access to /admin and /api/admin is now allowed.
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
