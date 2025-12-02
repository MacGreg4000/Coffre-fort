import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const pathname = req.nextUrl.pathname
    const isAuthPage = pathname === "/login"
    const isApiRoute = pathname.startsWith("/api")
    
    // Ne pas rediriger les routes API
    if (isApiRoute) {
      return NextResponse.next()
    }
    
    // Si l'utilisateur est connecté et essaie d'accéder à /login, rediriger vers dashboard
    if (isAuthPage && token) {
      return NextResponse.redirect(new URL("/dashboard", req.url))
    }

    // Si l'utilisateur n'est pas connecté et n'est pas sur /login, rediriger vers /login
    if (!token && !isAuthPage) {
      const loginUrl = new URL("/login", req.url)
      // Éviter les boucles en ne passant pas de callbackUrl si on vient déjà de /login
      if (!req.nextUrl.searchParams.get("callbackUrl")?.includes("/login")) {
        loginUrl.searchParams.set("callbackUrl", pathname)
      }
      return NextResponse.redirect(loginUrl)
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Autoriser l'accès aux routes API et à /login
        const pathname = req.nextUrl.pathname
        if (pathname.startsWith("/api") || pathname === "/login") {
          return true
        }
        return !!token
      },
    },
  }
)

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}

