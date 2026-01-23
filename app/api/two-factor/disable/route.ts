import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { authenticatedRoute } from "@/lib/api-middleware"
import { MUTATION_RATE_LIMIT } from "@/lib/rate-limit"
import { ApiError, handleApiError } from "@/lib/api-utils"
import { verifyTotpCode, decryptTotpSecret } from "@/lib/two-factor"

/**
 * POST /api/two-factor/disable
 * Désactiver la 2FA (nécessite un code de vérification)
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

    // Vérifier le code TOTP ou le code de récupération
    let isValid = false

    if (user.twoFactorSecret) {
      const secret = decryptTotpSecret(user.twoFactorSecret)
      isValid = verifyTotpCode(code, secret)
    }

    // Si le code TOTP n'est pas valide, vérifier les codes de récupération
    if (!isValid) {
      const userWithBackupCodes = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          twoFactorBackupCodes: true,
        },
      })

      if (userWithBackupCodes?.twoFactorBackupCodes) {
        const { verifyBackupCode } = await import("@/lib/two-factor")
        const backupCodes: string[] = JSON.parse(userWithBackupCodes.twoFactorBackupCodes)
        isValid = await verifyBackupCode(code, backupCodes)

        // Si c'est un code de récupération valide, le supprimer
        if (isValid) {
          const { hashBackupCode } = await import("@/lib/two-factor")
          const hashedInput = hashBackupCode(code)
          const updatedCodes = backupCodes.filter(hashedCode => hashedCode !== hashedInput)
          
          await prisma.user.update({
            where: { id: session.user.id },
            data: {
              twoFactorBackupCodes: updatedCodes.length > 0 ? JSON.stringify(updatedCodes) : null,
            },
          })
        }
      }
    }

    if (!isValid) {
      throw new ApiError(400, "Code de vérification invalide")
    }

    // Désactiver la 2FA
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorBackupCodes: undefined,
        trustedDevices: undefined,
      },
    })

    return NextResponse.json({
      success: true,
      message: "2FA désactivée avec succès",
    })
  } catch (error) {
    return handleApiError(error)
  }
}

export const POST = authenticatedRoute(postHandler, MUTATION_RATE_LIMIT)
