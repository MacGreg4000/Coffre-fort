import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { ApiError, handleApiError } from "@/lib/api-utils"
import bcrypt from "bcryptjs"

/**
 * POST /api/auth/check-2fa
 * Vérifier si un utilisateur a la 2FA activée (après vérification email/password)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, password } = body

    if (!email || !password) {
      throw new ApiError(400, "Email et mot de passe requis")
    }

    // Vérifier les identifiants
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        password: true,
        isActive: true,
        twoFactorEnabled: true,
      },
    })

    if (!user || !user.isActive) {
      throw new ApiError(401, "Identifiants invalides")
    }

    // Vérifier le mot de passe
    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      throw new ApiError(401, "Identifiants invalides")
    }

    // Retourner si la 2FA est activée
    return NextResponse.json({
      twoFactorEnabled: user.twoFactorEnabled || false,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
