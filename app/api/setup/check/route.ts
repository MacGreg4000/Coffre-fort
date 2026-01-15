import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { publicRoute } from "@/lib/api-middleware"
import { API_RATE_LIMIT } from "@/lib/rate-limit"
import { handleApiError } from "@/lib/api-utils"

async function getHandler(_req: NextRequest) {
  try {
    const userCount = await prisma.user.count()
    return NextResponse.json({
      needsSetup: userCount === 0,
      userCount,
    })
  } catch (error) {
    return handleApiError(error)
  }
}

export const GET = publicRoute(getHandler, API_RATE_LIMIT)












