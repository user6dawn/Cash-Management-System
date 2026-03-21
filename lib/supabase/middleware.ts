import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import {
  getReauthTimestampFromCookie,
  isReauthExpired,
  REAUTH_COOKIE,
} from '@/lib/auth/reauth'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const reauthTimestamp = getReauthTimestampFromCookie(request.headers.get('cookie') ?? '')
  const requiresReauth = isReauthExpired(reauthTimestamp)

  if (user && requiresReauth) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('reauth', '1')

    const redirectResponse = NextResponse.redirect(loginUrl)
    redirectResponse.cookies.set({
      name: REAUTH_COOKIE,
      value: '',
      expires: new Date(0),
      path: '/',
    })

    return redirectResponse
  }

  if (
    !user &&
    (request.nextUrl.pathname.startsWith('/dashboard') ||
      request.nextUrl.pathname === '/accounts' ||
      request.nextUrl.pathname === '/transactions' ||
      request.nextUrl.pathname === '/investments')
  ) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (
    user &&
    !requiresReauth &&
    (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/signup')
  ) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}
