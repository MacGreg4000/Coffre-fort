import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const isAuthPage = req.nextUrl.pathname.startsWith("/login")
    
    if (isAuthPage && token) {
      return NextResponse.redirect(new URL("/dashboard", req.url))
    }

    if (!token && !isAuthPage) {
      return NextResponse.redirect(new URL("/login", req.url))
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
)

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}

