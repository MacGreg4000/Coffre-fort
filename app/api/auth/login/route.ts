import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { ApiError, handleApiError } from "@/lib/api-utils"
import bcrypt from "bcryptjs"
import { verifyTotpCode, decryptTotpSecret, verifyBackupCode, isDeviceTrusted, parseTrustedDevices } from "@/lib/two-factor"

/**
 * POST /api/auth/login
 * Connexion personnalisée avec support 2FA
 * Retourne un token temporaire si 2FA est requise, ou les infos utilisateur si connexion réussie
 */
export async function POST(req: NextRequest) {
  try {
    let body: any
    try {
      body = await req.json()
    } catch {
      throw new ApiError(400, "Corps de la requête invalide")
    }
    const { email, password, twoFactorCode, deviceId, deviceName } = body

    if (!email || !password) {
      throw new ApiError(400, "Email et mot de passe requis")
    }

    // Récupérer l'utilisateur
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        password: true,
        isActive: true,
        twoFactorEnabled: true,
        twoFactorSecret: true,
        twoFactorBackupCodes: true,
        trustedDevices: true,
      },
    })

    if (!user || !user.isActive) {
      // Pause pour ralentir les attaques par timing
      await new Promise((resolve) => setTimeout(resolve, 1000))
      throw new ApiError(401, "Identifiants invalides")
    }

    // Vérifier le mot de passe
    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      // Logger la tentative échouée
      await prisma.log
        .create({
          data: {
            action: "LOGIN_FAILED",
            description: `Tentative de connexion échouée pour ${email}`,
            metadata: JSON.stringify({ email }),
            ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown",
            userAgent: req.headers.get("user-agent") || "unknown",
          },
        })
        .catch(() => {})

      // Pause pour ralentir les attaques par timing
      await new Promise((resolve) => setTimeout(resolve, 1000))
      throw new ApiError(401, "Identifiants invalides")
    }

    // Si la 2FA est activée
    if (user.twoFactorEnabled) {
      // Vérifier si l'appareil est de confiance
      if (deviceId && user.trustedDevices) {
        const trustedDevices = parseTrustedDevices(user.trustedDevices)
        if (isDeviceTrusted(deviceId, trustedDevices)) {
          // Appareil de confiance, connexion directe
          await prisma.log.create({
            data: {
              userId: user.id,
              action: "LOGIN_SUCCESS",
              description: `Connexion réussie (appareil de confiance) pour ${user.name}`,
              ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown",
              userAgent: req.headers.get("user-agent") || "unknown",
            },
          }).catch(() => {})

          return NextResponse.json({
            success: true,
            user: {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role,
            },
            trustedDevice: true,
          })
        }
      }

      // Si pas de code 2FA fourni, demander la vérification
      if (!twoFactorCode) {
        return NextResponse.json({
          requiresTwoFactor: true,
          message: "Code de vérification 2FA requis",
        })
      }

      // Vérifier le code 2FA
      let isValid = false

      if (user.twoFactorSecret) {
        const secret = decryptTotpSecret(user.twoFactorSecret)
        isValid = verifyTotpCode(twoFactorCode, secret)
      }

      // Si le code TOTP n'est pas valide, vérifier les codes de récupération
      if (!isValid && user.twoFactorBackupCodes) {
        const backupCodes: string[] = JSON.parse(user.twoFactorBackupCodes)
        isValid = await verifyBackupCode(twoFactorCode, backupCodes)

        // Si c'est un code de récupération valide, le supprimer
        if (isValid) {
          const { hashBackupCode } = await import("@/lib/two-factor")
          const hashedInput = hashBackupCode(twoFactorCode)
          const updatedCodes = backupCodes.filter(hashedCode => hashedCode !== hashedInput)

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

          // Vérifier si l'appareil existe déjà
          const existingDevice = trustedDevices.find((d) => d.deviceId === deviceId)
          if (!existingDevice) {
            const newDevice = {
              deviceId: deviceId,
              name: deviceName,
              expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 jours
            }
            trustedDevices.push(newDevice)
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
          // Ne pas bloquer la connexion si la sauvegarde de l'appareil de confiance échoue
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
    }

    // Logger la connexion réussie
    await prisma.log.create({
      data: {
        userId: user.id,
        action: "LOGIN_SUCCESS",
        description: `Connexion réussie pour ${user.name}`,
        ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown",
        userAgent: req.headers.get("user-agent") || "unknown",
      },
    }).catch(() => {})

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
