import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { ApiError, handleApiError } from "@/lib/api-utils"
import bcrypt from "bcryptjs"
import { verifyTotpCode, decryptTotpSecret, verifyBackupCode, isDeviceTrusted } from "@/lib/two-factor"

/**
 * POST /api/auth/login
 * Connexion personnalisée avec support 2FA
 * Retourne un token temporaire si 2FA est requise, ou les infos utilisateur si connexion réussie
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
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
        const trustedDevices = user.trustedDevices as Array<{
          deviceId: string
          expiresAt: number
        }>
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
        const backupCodes = user.twoFactorBackupCodes as string[]
        isValid = await verifyBackupCode(twoFactorCode, backupCodes)

        // Si c'est un code de récupération valide, le supprimer
        if (isValid) {
          const updatedCodes: string[] = []
          for (const hashedCode of backupCodes) {
            const testValid = await verifyBackupCode(twoFactorCode, [hashedCode])
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
      if (deviceId && deviceName) {
        const { createTrustedDevice } = await import("@/lib/two-factor")
        const trustedDevices = (user.trustedDevices as Array<{
          deviceId: string
          name: string
          expiresAt: number
        }>) || []

        // Vérifier si l'appareil existe déjà
        const existingDevice = trustedDevices.find((d) => d.deviceId === deviceId)
        if (!existingDevice) {
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
