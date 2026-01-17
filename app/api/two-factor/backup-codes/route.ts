import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { authenticatedRoute } from "@/lib/api-middleware"
import { MUTATION_RATE_LIMIT } from "@/lib/rate-limit"
import { ApiError, handleApiError } from "@/lib/api-utils"
import { generateBackupCodes, hashBackupCode } from "@/lib/two-factor"

/**
 * POST /api/two-factor/backup-codes
 * Régénérer les codes de récupération (nécessite un code TOTP)
 */
async function postHandler(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) throw new ApiError(401, "Non autorisé")

    const body = await req.json()
    const { code } = body

    if (!code) {
      throw new ApiError(400, "Code de vérification requis")
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        twoFactorEnabled: true,
        twoFactorSecret: true,
      },
    })

    if (!user) throw new ApiError(404, "Utilisateur introuvable")
    if (!user.twoFactorEnabled) {
      throw new ApiError(400, "La 2FA n'est pas activée")
    }

    // Vérifier le code TOTP
    if (!user.twoFactorSecret) {
      throw new ApiError(400, "Secret 2FA introuvable")
    }

    const { verifyTotpCode, decryptTotpSecret } = await import("@/lib/two-factor")
    const secret = decryptTotpSecret(user.twoFactorSecret)
    if (!verifyTotpCode(code, secret)) {
      throw new ApiError(400, "Code de vérification invalide")
    }

    // Générer de nouveaux codes de récupération
    const newBackupCodes = generateBackupCodes()
    const hashedBackupCodes = await Promise.all(
      newBackupCodes.map((code) => hashBackupCode(code))
    )

    // Mettre à jour les codes
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        twoFactorBackupCodes: hashedBackupCodes,
      },
    })

    return NextResponse.json({
      success: true,
      backupCodes: newBackupCodes, // Retourner les codes une seule fois
    })
  } catch (error) {
    return handleApiError(error)
  }
}

export const POST = authenticatedRoute(postHandler, MUTATION_RATE_LIMIT)
