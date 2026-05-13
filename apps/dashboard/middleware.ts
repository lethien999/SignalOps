import { NextRequest, NextResponse } from 'next/server';
import { trace } from '@opentelemetry/api';

/**
 * Middleware to protect dashboard routes
 * Redirects unauthenticated users to /login
 */
export function middleware(request: NextRequest) {
  const tracer = trace.getTracer('signalops-dashboard');

  return tracer.startActiveSpan('dashboard.middleware', (span) => {
    try {
      const token = request.cookies.get('auth_token')?.value;
      const pathname = request.nextUrl.pathname;

      span.setAttribute('http.method', request.method);
      span.setAttribute('http.route', pathname);
      span.setAttribute('signalops.authenticated', Boolean(token));

      // Allow access to login and signup pages without token
      if (pathname === '/login' || pathname === '/signup' || pathname === '/') {
        // If user already has token and is on login page, redirect to dashboard
        if (token && (pathname === '/login' || pathname === '/signup')) {
          return NextResponse.redirect(new URL('/', request.url));
        }
        return NextResponse.next();
      }

      // For all other protected routes, require token
      if (!token) {
        return NextResponse.redirect(new URL('/login', request.url));
      }

      return NextResponse.next();
    } finally {
      span.end();
    }
  });
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
};
