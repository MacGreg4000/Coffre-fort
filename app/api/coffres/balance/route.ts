import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getCachedBalanceInfo } from "@/lib/cache"
import { authenticatedRoute } from "@/lib/api-middleware"
import { API_RATE_LIMIT } from "@/lib/rate-limit"
import { ApiError, handleApiError } from "@/lib/api-utils"
import { logger } from "@/lib/logger"
import { computeCoffreBalanceInfo } from "@/lib/balance"

async function getHandler(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      throw new ApiError(401, "Non autorisé")
    }

    const { searchParams } = new URL(req.url)
    const coffreId = searchParams.get("coffreId")

    if (!coffreId) {
      throw new ApiError(400, "coffreId requis")
    }

    // Vérifier l'accès au coffre
    const member = await prisma.coffreMember.findUnique({
      where: {
        coffreId_userId: {
          coffreId,
          userId: session.user.id,
        },
      },
    })

    if (!member) {
      throw new ApiError(403, "Accès refusé à ce coffre")
    }

    // Utiliser le cache pour la balance + métadonnées (5 minutes)
    const result = await getCachedBalanceInfo(coffreId, async () => {
      logger.info(`Calculating balance for coffre ${coffreId}`)
      const info = await computeCoffreBalanceInfo(prisma, coffreId)
      return {
        balance: info.balance,
        lastInventoryDate: info.lastInventoryDate,
        lastInventoryAmount: info.lastInventoryAmount,
      }
    })

    return NextResponse.json(result)
  } catch (error: any) {
    return handleApiError(error)
  }
}

// Appliquer le middleware (auth + rate limiting)
export const GET = authenticatedRoute(getHandler, API_RATE_LIMIT)




