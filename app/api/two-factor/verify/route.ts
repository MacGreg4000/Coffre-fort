import { NextRequest, NextResponse } from "next/server"
import { ApiError, handleApiError } from "@/lib/api-utils"
import { prisma } from "@/lib/prisma"
import { verifyTotpCode, decryptTotpSecret, verifyBackupCode, parseTrustedDevices, isDeviceTrusted } from "@/lib/two-factor"
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
      const backupCodes: string[] = JSON.parse(user.twoFactorBackupCodes)
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
            twoFactorBackupCodes: updatedCodes.length > 0 ? JSON.stringify(updatedCodes) : null,
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
    // Enveloppé dans un try-catch pour ne pas bloquer la connexion si la sauvegarde échoue
    if (deviceId && deviceName) {
      try {
        const trustedDevices = parseTrustedDevices(user.trustedDevices)

        const existingDevice = trustedDevices.find((d) => d.deviceId === deviceId)
        if (!existingDevice || !isDeviceTrusted(deviceId, trustedDevices)) {
          const newDevice = {
            deviceId: deviceId,
            name: deviceName,
            expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 jours
          }
          if (existingDevice) {
            const index = trustedDevices.findIndex((d) => d.deviceId === deviceId)
            trustedDevices[index] = newDevice
          } else {
            trustedDevices.push(newDevice)
          }
        } else {
          existingDevice.expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000
        }

        await prisma.user.update({
          where: { id: user.id },
          data: {
            trustedDevices: JSON.stringify(trustedDevices),
          },
        })
      } catch (trustedDeviceError) {
        console.error("Erreur lors de la sauvegarde de l'appareil de confiance:", trustedDeviceError)
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
