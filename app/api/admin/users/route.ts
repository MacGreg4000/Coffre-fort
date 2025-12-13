import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { createUserSchema, validateRequest } from "@/lib/validations"
import { handleApiError, createAuditLog, ApiError } from "@/lib/api-utils"

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
      throw new ApiError(403, "Non autorisé")
    }

    const body = await req.json()
    
    // Validation avec Zod
    const validation = validateRequest(createUserSchema, body)
    if (!validation.success) {
      throw new ApiError(400, validation.error)
    }

    const { email, password, name, role } = validation.data

    // Vérifier si l'email existe déjà
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      throw new ApiError(409, "Cet email est déjà utilisé")
    }

    // Transaction pour garantir la cohérence
    const user = await prisma.$transaction(async (tx) => {
      // Hasher le mot de passe (12 rounds pour sécurité renforcée)
      const hashedPassword = await bcrypt.hash(password, 12)

      // Créer l'utilisateur
      const newUser = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          role,
        },
      })

      // Créer un log d'audit avec IP/UA
      await createAuditLog({
        userId: session.user.id,
        action: "USER_CREATED",
        description: `Utilisateur ${name} créé avec le rôle ${role}`,
        metadata: { email, role, createdUserId: newUser.id },
        req,
      })

      return newUser
    })

    return NextResponse.json(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      { status: 201 }
    )
  } catch (error) {
    return handleApiError(error)
  }
}







