import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { BILLET_DENOMINATIONS } from "@/lib/utils"
import { updateMovementSchema, validateRequest } from "@/lib/validations"
import { handleApiError, createAuditLog, ApiError, serializeMovement } from "@/lib/api-utils"
import { invalidateCoffreCache, cache } from "@/lib/cache"
import { logger } from "@/lib/logger"

// Modifier un mouvement (uniquement pour les admins)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      throw new ApiError(401, "Non autorisé")
    }

    // Vérifier que l'utilisateur est admin
    if (session.user.role !== "ADMIN") {
      throw new ApiError(403, "Accès refusé. Seuls les administrateurs peuvent modifier les mouvements.")
    }

    const { id: movementId } = await params
    const body = await req.json()
    
    // Validation avec Zod
    const validation = validateRequest(updateMovementSchema, body)
    if (!validation.success) {
      throw new ApiError(400, validation.error)
    }

    const { type, billets, description } = validation.data

    // Vérifier que le mouvement existe et n'est pas supprimé
    const existingMovement = await prisma.movement.findFirst({
      where: { id: movementId, deletedAt: null },
      include: {
        coffre: true,
        details: true,
      },
    })

    if (!existingMovement) {
      throw new ApiError(404, "Mouvement introuvable")
    }

    // Calculer le nouveau montant total
    let totalAmount = 0
    const details: Array<{ denomination: number; quantity: number }> = []

    for (const denomination of BILLET_DENOMINATIONS) {
      const quantity = billets[denomination] || 0
      if (quantity > 0) {
        const amount = denomination * quantity
        if (type === "EXIT") {
          totalAmount -= amount
        } else {
          totalAmount += amount
        }
        details.push({ denomination, quantity })
      }
    }

    // Transaction pour garantir la cohérence
    const updatedMovement = await prisma.$transaction(async (tx) => {
      // Supprimer les anciens détails
      await tx.movementDetail.deleteMany({
        where: { movementId },
      })

      // Mettre à jour le mouvement
      const updated = await tx.movement.update({
        where: { id: movementId },
        data: {
          type,
          amount: Math.abs(totalAmount),
          description,
          details: {
            create: details.map((d) => ({
              denomination: d.denomination,
              quantity: d.quantity,
            })),
          },
        },
        include: {
          details: true,
          coffre: true,
          user: { select: { id: true, name: true, email: true } },
        },
      })

      // Créer un log d'audit avec IP/UA (dans la transaction)
      await createAuditLog({
        userId: session.user.id,
        coffreId: existingMovement.coffreId,
        movementId: updated.id,
        action: "MOVEMENT_UPDATED",
        description: `Mouvement ${type} modifié: ${Math.abs(totalAmount)}€`,
        metadata: { 
          oldAmount: Number(existingMovement.amount),
          newAmount: Math.abs(totalAmount),
          billets, 
          type 
        },
        req,
        tx, // Passer le contexte de transaction
      })

      return updated
    })

    // INVALIDER LE CACHE pour ce coffre et le dashboard
    invalidateCoffreCache(existingMovement.coffreId)
    cache.invalidatePattern(`dashboard:${session.user.id}`)
    logger.info(`Cache invalidated for coffre ${existingMovement.coffreId} after movement update`)

    return NextResponse.json(serializeMovement(updatedMovement))
  } catch (error) {
    return handleApiError(error)
  }
}

// Supprimer un mouvement (soft delete - uniquement pour les admins)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      throw new ApiError(401, "Non autorisé")
    }

    // Vérifier que l'utilisateur est admin
    if (session.user.role !== "ADMIN") {
      throw new ApiError(403, "Accès refusé. Seuls les administrateurs peuvent supprimer les mouvements.")
    }

    const { id: movementId } = await params

    // Vérifier que le mouvement existe et n'est pas déjà supprimé
    const existingMovement = await prisma.movement.findFirst({
      where: { id: movementId, deletedAt: null },
      include: {
        coffre: true,
      },
    })

    if (!existingMovement) {
      throw new ApiError(404, "Mouvement introuvable")
    }

    // Transaction pour soft delete + log
    await prisma.$transaction(async (tx) => {
      // Soft delete (marquer comme supprimé)
      await tx.movement.update({
        where: { id: movementId },
        data: { deletedAt: new Date() },
      })

      // Créer un log d'audit avec IP/UA (dans la transaction)
      await createAuditLog({
        userId: session.user.id,
        coffreId: existingMovement.coffreId,
        action: "MOVEMENT_DELETED",
        description: `Mouvement ${existingMovement.type} supprimé: ${Number(existingMovement.amount)}€`,
        metadata: { 
          movementId,
          type: existingMovement.type,
          amount: Number(existingMovement.amount),
        },
        req,
        tx, // Passer le contexte de transaction
      })
    })

    // INVALIDER LE CACHE pour ce coffre et le dashboard
    invalidateCoffreCache(existingMovement.coffreId)
    cache.invalidatePattern(`dashboard:${session.user.id}`)
    logger.info(`Cache invalidated for coffre ${existingMovement.coffreId} after movement deletion`)

    return NextResponse.json({ success: true, message: "Mouvement supprimé avec succès" })
  } catch (error) {
    return handleApiError(error)
  }
}



