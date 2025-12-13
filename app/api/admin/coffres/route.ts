import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createCoffreSchema, validateRequest } from "@/lib/validations"
import { handleApiError, createAuditLog, ApiError } from "@/lib/api-utils"

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
      throw new ApiError(403, "Non autorisé")
    }

    const body = await req.json()
    
    // Validation avec Zod
    const validation = validateRequest(createCoffreSchema, body)
    if (!validation.success) {
      throw new ApiError(400, validation.error)
    }

    const { name, description } = validation.data

    // Transaction pour garantir la cohérence
    const coffre = await prisma.$transaction(async (tx) => {
      // Créer le coffre
      const newCoffre = await tx.coffre.create({
        data: {
          name,
          description,
        },
      })

      // Ajouter le créateur comme OWNER
      await tx.coffreMember.create({
        data: {
          coffreId: newCoffre.id,
          userId: session.user.id,
          role: "OWNER",
        },
      })

      // Créer un log d'audit avec IP/UA
      await createAuditLog({
        userId: session.user.id,
        coffreId: newCoffre.id,
        action: "COFFRE_CREATED",
        description: `Coffre ${name} créé`,
        metadata: { name, description },
        req,
      })

      return newCoffre
    })

    return NextResponse.json(
      {
        id: coffre.id,
        name: coffre.name,
        description: coffre.description,
        createdAt: coffre.createdAt,
        updatedAt: coffre.updatedAt,
      },
      { status: 201 }
    )
  } catch (error) {
    return handleApiError(error)
  }
}



