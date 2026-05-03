import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const pathname = request.nextUrl.pathname;

  // --- CATCH STRAY AUTH CODES ---
  // If an OAuth code lands on any page other than /auth/callback, redirect it there.
  const code = request.nextUrl.searchParams.get('code');
  if (code && pathname !== '/auth/callback') {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/callback';
    return NextResponse.redirect(url);
  }

  // --- Determine if this route actually needs an auth check ---
  const isAdminRoute = pathname.startsWith('/admin');
  const isProtectedRoute =
    pathname.startsWith('/settings') ||
    pathname.startsWith('/notifications');
  const isAuthRoute = pathname === '/login' || pathname === '/register' || pathname === '/forgot-password';

  // Public routes (feed, posts, school pages, etc.) pass through instantly
  // without hitting Supabase — prevents MIDDLEWARE_INVOCATION_TIMEOUT when
  // Supabase is slow or unreachable.
  if (!isAdminRoute && !isProtectedRoute && !isAuthRoute) {
    return supabaseResponse;
  }

  // --- Routes below need auth — wrap in try/catch so Supabase downtime
  //     doesn't take down the entire site ---
  try {
    // --- ADMIN ROUTES ---
    if (isAdminRoute) {
      const isAdminLogin = pathname === '/admin/login';

      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        const url = request.nextUrl.clone();
        url.pathname = '/feed';
        return NextResponse.redirect(url);
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      const isAdmin = profile?.role === 'ADMIN';

      if (!isAdmin) {
        const url = request.nextUrl.clone();
        url.pathname = '/feed';
        return NextResponse.redirect(url);
      }

      if (isAdminLogin) {
        const url = request.nextUrl.clone();
        url.pathname = '/admin';
        return NextResponse.redirect(url);
      }

      return supabaseResponse;
    }

    // --- PROTECTED & AUTH ROUTES ---
    const { data: { user } } = await supabase.auth.getUser();

    if (!user && isProtectedRoute) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }

    if (user && isAuthRoute) {
      const url = request.nextUrl.clone();
      url.pathname = '/feed';
      return NextResponse.redirect(url);
    }
  } catch (err) {
    console.error('Middleware: Supabase auth check failed, passing through:', err);
    // If Supabase is down and route is protected, redirect to login
    if (isProtectedRoute) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
    // For admin routes when Supabase is down, redirect to feed
    if (isAdminRoute) {
      const url = request.nextUrl.clone();
      url.pathname = '/feed';
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
