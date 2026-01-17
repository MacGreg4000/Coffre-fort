import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { authenticatedRoute } from "@/lib/api-middleware"
import { API_RATE_LIMIT, MUTATION_RATE_LIMIT } from "@/lib/rate-limit"
import { ApiError, handleApiError } from "@/lib/api-utils"
import {
  generateTotpSecret,
  generateTotpUrl,
  generateQRCode,
  encryptTotpSecret,
} from "@/lib/two-factor"

/**
 * GET /api/two-factor/setup
 * Générer un nouveau secret TOTP et QR code pour l'activation
 */
async function getHandler(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) throw new ApiError(401, "Non autorisé")

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true, name: true, twoFactorEnabled: true },
    })

    if (!user) throw new ApiError(404, "Utilisateur introuvable")

    // Générer un nouveau secret
    const secret = generateTotpSecret()
    const url = generateTotpUrl(user.email, secret, user.name)
    const qrCode = await generateQRCode(url)

    // Retourner le secret temporaire (sera chiffré lors de l'activation)
    return NextResponse.json({
      secret, // Secret temporaire pour l'activation
      qrCode,
      url, // URL pour les apps qui ne peuvent pas scanner le QR
    })
  } catch (error) {
    return handleApiError(error)
  }
}

/**
 * POST /api/two-factor/setup
 * Activer la 2FA avec un code de vérification
 */
async function postHandler(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) throw new ApiError(401, "Non autorisé")

    const body = await req.json()
    const { secret, code, backupCodes } = body

    if (!secret || !code) {
      throw new ApiError(400, "Secret et code requis")
    }

    // Vérifier le code TOTP
    const { verifyTotpCode } = await import("@/lib/two-factor")
    if (!verifyTotpCode(code, secret)) {
      throw new ApiError(400, "Code de vérification invalide")
    }

    // Chiffrer le secret
    const encryptedSecret = encryptTotpSecret(secret)

    // Hasher les codes de récupération
    const { hashBackupCode } = await import("@/lib/two-factor")
    const hashedBackupCodes = await Promise.all(
      (backupCodes || []).map((code: string) => hashBackupCode(code))
    )

    // Activer la 2FA
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        twoFactorEnabled: true,
        twoFactorSecret: encryptedSecret,
        twoFactorBackupCodes: hashedBackupCodes,
      },
    })

    return NextResponse.json({
      success: true,
      message: "2FA activée avec succès",
      backupCodes, // Retourner les codes une seule fois
    })
  } catch (error) {
    return handleApiError(error)
  }
}

export const GET = authenticatedRoute(getHandler, API_RATE_LIMIT)
export const POST = authenticatedRoute(postHandler, MUTATION_RATE_LIMIT)
