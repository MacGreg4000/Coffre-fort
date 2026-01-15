import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { publicRoute } from "@/lib/api-middleware"
import { AUTH_RATE_LIMIT } from "@/lib/rate-limit"
import { ApiError, createAuditLog, handleApiError } from "@/lib/api-utils"
import { createUserSchema, validateRequest } from "@/lib/validations"

async function postHandler(req: NextRequest) {
  try {
    // Vérifier qu'aucun utilisateur n'existe déjà
    const userCount = await prisma.user.count()
    
    if (userCount > 0) {
      throw new ApiError(403, "Un administrateur existe déjà. Utilisez la page de connexion.")
    }

    const body = await req.json()
    
    // Validation: réutiliser les règles fortes de création d'utilisateur
    const validation = validateRequest(createUserSchema, body)
    if (!validation.success) {
      throw new ApiError(400, validation.error)
    }

    const { email, password, name } = validation.data

    // Vérifier si l'email existe déjà (au cas où)
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      throw new ApiError(409, "Cet email est déjà utilisé")
    }

    const admin = await prisma.$transaction(async (tx) => {
      // Hasher le mot de passe (aligné avec /api/admin/users)
      const hashedPassword = await bcrypt.hash(password, 12)

      const created = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          role: "ADMIN",
          isActive: true,
        },
      })

      await createAuditLog({
        userId: created.id,
        action: "SETUP_COMPLETED",
        description: `Premier administrateur créé: ${name}`,
        metadata: { email, role: "ADMIN" },
        req,
        tx,
      })

      return created
    })

    return NextResponse.json(
      {
        success: true,
        message: "Administrateur créé avec succès",
        user: {
          id: admin.id,
          email: admin.email,
          name: admin.name,
          role: admin.role,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    return handleApiError(error)
  }
}

export const POST = publicRoute(postHandler, AUTH_RATE_LIMIT)











