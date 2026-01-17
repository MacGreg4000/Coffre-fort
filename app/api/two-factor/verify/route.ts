import { NextRequest, NextResponse } from "next/server"
import { ApiError, handleApiError } from "@/lib/api-utils"
import { prisma } from "@/lib/prisma"
import { verifyTotpCode, decryptTotpSecret, verifyBackupCode } from "@/lib/two-factor"
import { signIn } from "next-auth/react"

/**
 * POST /api/two-factor/verify
 * Vérifier un code 2FA lors de la connexion
 * Cette route est appelée après la vérification email/password
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, code, deviceId, deviceName } = body

    if (!email || !code) {
      throw new ApiError(400, "Email et code requis")
    }

    // Récupérer l'utilisateur
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        twoFactorEnabled: true,
        twoFactorSecret: true,
        twoFactorBackupCodes: true,
        trustedDevices: true,
      },
    })

    if (!user) {
      throw new ApiError(401, "Identifiants invalides")
    }

    if (!user.twoFactorEnabled) {
      throw new ApiError(400, "La 2FA n'est pas activée pour cet utilisateur")
    }

    // Vérifier le code TOTP
    let isValid = false

    if (user.twoFactorSecret) {
      const secret = decryptTotpSecret(user.twoFactorSecret)
      isValid = verifyTotpCode(code, secret)
    }

    // Si le code TOTP n'est pas valide, vérifier les codes de récupération
    if (!isValid && user.twoFactorBackupCodes) {
      const backupCodes = user.twoFactorBackupCodes as string[]
      isValid = await verifyBackupCode(code, backupCodes)

      // Si c'est un code de récupération valide, le supprimer
      if (isValid) {
        // Trouver et supprimer le code utilisé
        const updatedCodes: string[] = []
        for (const hashedCode of backupCodes) {
          const testValid = await verifyBackupCode(code, [hashedCode])
          if (!testValid) {
            updatedCodes.push(hashedCode)
          }
        }

        await prisma.user.update({
          where: { id: user.id },
          data: {
            twoFactorBackupCodes: updatedCodes,
          },
        })
      }
    }

    if (!isValid) {
      // Logger la tentative échouée
      await prisma.log.create({
        data: {
          userId: user.id,
          action: "TWO_FACTOR_FAILED",
          description: `Tentative de vérification 2FA échouée pour ${user.email}`,
          ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown",
          userAgent: req.headers.get("user-agent") || "unknown",
        },
      }).catch(() => {})

      throw new ApiError(400, "Code de vérification invalide")
    }

    // Si un appareil de confiance est fourni, l'ajouter
    if (deviceId && deviceName && user.trustedDevices) {
      const { createTrustedDevice, isDeviceTrusted } = await import("@/lib/two-factor")
      const trustedDevices = user.trustedDevices as Array<{
        deviceId: string
        name: string
        expiresAt: number
      }>

      // Vérifier si l'appareil existe déjà
      const existingDevice = trustedDevices.find((d) => d.deviceId === deviceId)
      if (!existingDevice || !isDeviceTrusted(deviceId, trustedDevices)) {
        const newDevice = createTrustedDevice(deviceName, 30)
        trustedDevices.push(newDevice)

        await prisma.user.update({
          where: { id: user.id },
          data: {
            trustedDevices: trustedDevices,
          },
        })
      }
    }

    // Logger la vérification réussie
    await prisma.log.create({
      data: {
        userId: user.id,
        action: "TWO_FACTOR_SUCCESS",
        description: `Vérification 2FA réussie pour ${user.email}`,
        ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown",
        userAgent: req.headers.get("user-agent") || "unknown",
      },
    }).catch(() => {})

    // Retourner les informations utilisateur (la session sera créée par NextAuth)
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
