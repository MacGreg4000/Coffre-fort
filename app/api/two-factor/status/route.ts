import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { authenticatedRoute } from "@/lib/api-middleware"
import { API_RATE_LIMIT } from "@/lib/rate-limit"
import { ApiError, handleApiError } from "@/lib/api-utils"

/**
 * GET /api/two-factor/status
 * Obtenir le statut de la 2FA pour l'utilisateur connecté
 */
async function getHandler(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) throw new ApiError(401, "Non autorisé")

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        twoFactorEnabled: true,
      },
    })

    if (!user) throw new ApiError(404, "Utilisateur introuvable")

    return NextResponse.json({
      enabled: user.twoFactorEnabled || false,
    })
  } catch (error) {
    return handleApiError(error)
  }
}

export const GET = authenticatedRoute(getHandler, API_RATE_LIMIT)
