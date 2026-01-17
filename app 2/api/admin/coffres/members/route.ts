import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { addCoffreMemberSchema, validateRequest } from "@/lib/validations"
import { handleApiError, createAuditLog, ApiError } from "@/lib/api-utils"
import { adminRoute } from "@/lib/api-middleware"
import { MUTATION_RATE_LIMIT } from "@/lib/rate-limit"

async function postHandler(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
      throw new ApiError(403, "Non autorisé")
    }

    const body = await req.json()
    const { coffreId, ...memberData } = body
    
    // Valider coffreId séparément
    if (!coffreId || typeof coffreId !== "string") {
      throw new ApiError(400, "ID de coffre invalide")
    }

    // Validation avec Zod
    const validation = validateRequest(addCoffreMemberSchema, memberData)
    if (!validation.success) {
      throw new ApiError(400, validation.error)
    }

    const { userId, role } = validation.data

    // Vérifier si le membre existe déjà
    const existing = await prisma.coffreMember.findUnique({
      where: {
        userId_coffreId: {
          userId,
          coffreId,
        },
      },
    })

    if (existing) {
      throw new ApiError(409, "Cet utilisateur est déjà membre de ce coffre")
    }

    // Transaction pour garantir la cohérence
    const member = await prisma.$transaction(async (tx) => {
      // Créer le membre
      const newMember = await tx.coffreMember.create({
        data: {
          coffreId,
          userId,
          role,
        },
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
          coffre: { select: { id: true, name: true } },
        },
      })

      // Créer un log d'audit avec IP/UA (dans la transaction)
      await createAuditLog({
        userId: session.user.id,
        coffreId,
        action: "MEMBER_ADDED",
        description: `${newMember.user.name} ajouté au coffre ${newMember.coffre.name} avec le rôle ${role}`,
        metadata: { addedUserId: userId, role },
        req,
        tx, // Passer le contexte de transaction
      })

      return newMember
    })

    return NextResponse.json(member, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}

// Appliquer le middleware avec rate limiting
export const POST = adminRoute(postHandler, MUTATION_RATE_LIMIT)







