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
    
    return NextResponse.json({ token })
  } catch (error) {
    return NextResponse.json(
      { error: "Erreur lors de la génération du token CSRF" },
      { status: 500 }
    )
  }
}

export const GET = authenticatedRoute(getHandler, API_RATE_LIMIT)
