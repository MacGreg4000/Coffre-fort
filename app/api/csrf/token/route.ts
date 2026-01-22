import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { createCsrfToken } from "@/lib/csrf"
import { authenticatedRoute } from "@/lib/api-middleware"
import { API_RATE_LIMIT } from "@/lib/rate-limit"

async function getHandler(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 401 }
      )
    }

    const token = createCsrfToken(session.user.id)
    
    // Créer la réponse avec le token et définir le cookie
    const response = NextResponse.json({ token })
    
    // Stocker le token dans un cookie sécurisé
    response.cookies.set('csrf-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24, // 24 heures
      path: "/"
    })
    
    return response
  } catch (error) {
    return NextResponse.json(
      { error: "Erreur lors de la génération du token CSRF" },
      { status: 500 }
    )
  }
}

export const GET = authenticatedRoute(getHandler, API_RATE_LIMIT)
