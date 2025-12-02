import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const pathname = req.nextUrl.pathname
    const isAuthPage = pathname === "/login"
    const isSetupPage = pathname === "/setup"
    const isApiRoute = pathname.startsWith("/api")
    
    // Ne pas rediriger les routes API
    if (isApiRoute) {
      return NextResponse.next()
    }
    
    // Autoriser l'accès à /setup sans authentification
    if (isSetupPage) {
      return NextResponse.next()
    }
    
    // Si l'utilisateur est connecté et essaie d'accéder à /login ou /setup, rediriger vers dashboard
    if ((isAuthPage || isSetupPage) && token) {
      return NextResponse.redirect(new URL("/dashboard", req.url))
    }

    // Si l'utilisateur n'est pas connecté et n'est pas sur /login ou /setup, rediriger vers /login
    if (!token && !isAuthPage && !isSetupPage) {
      const loginUrl = new URL("/login", req.url)
      // Éviter les boucles : ne pas ajouter callbackUrl si on vient déjà de /login ou si callbackUrl contient /login
      const currentCallback = req.nextUrl.searchParams.get("callbackUrl")
      if (currentCallback && currentCallback.includes("/login")) {
        // Boucle détectée, rediriger vers /login sans callbackUrl
        return NextResponse.redirect(loginUrl)
      }
      // Ajouter callbackUrl seulement si ce n'est pas /login
      if (pathname !== "/login") {
        loginUrl.searchParams.set("callbackUrl", pathname)
      }
      return NextResponse.redirect(loginUrl)
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Autoriser l'accès aux routes API, /login et /setup
        const pathname = req.nextUrl.pathname
        if (pathname.startsWith("/api") || pathname === "/login" || pathname === "/setup") {
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

