import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createCoffreSchema, updateCoffreSchema, validateRequest } from "@/lib/validations"
import { handleApiError, createAuditLog, ApiError } from "@/lib/api-utils"
import { adminRoute } from "@/lib/api-middleware"
import { MUTATION_RATE_LIMIT } from "@/lib/rate-limit"
import { computeCoffreBalanceInfo } from "@/lib/balance"
import { cache, invalidateCoffreCache, invalidateUserCache } from "@/lib/cache"
import { z } from "zod"

async function postHandler(req: NextRequest) {
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

    // Vérifier que l'utilisateur existe bien dans la base de données
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true },
    })

    if (!user) {
      throw new ApiError(401, "Session invalide: utilisateur introuvable. Veuillez vous reconnecter.")
    }

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
          userId: user.id,
          role: "OWNER",
        },
      })

      // Créer un log d'audit avec IP/UA (dans la transaction)
      await createAuditLog({
        userId: user.id,
        coffreId: newCoffre.id,
        action: "COFFRE_CREATED",
        description: `Coffre ${name} créé`,
        metadata: { name, description },
        req,
        tx, // Passer le contexte de transaction
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

const updateCoffreRequestSchema = z.object({
  id: z.string().uuid("ID de coffre invalide"),
  data: updateCoffreSchema,
})

async function putHandler(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
      throw new ApiError(403, "Non autorisé")
    }

    const body = await req.json()
    const parsed = updateCoffreRequestSchema.safeParse(body)
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.errors[0]?.message || "Données invalides")
    }

    const { id, data } = parsed.data
    if (!data.name && !("description" in data)) {
      throw new ApiError(400, "Aucune donnée à mettre à jour")
    }

    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.coffre.findUnique({ where: { id } })
      if (!existing) {
        throw new ApiError(404, "Coffre introuvable")
      }

      const coffre = await tx.coffre.update({
        where: { id },
        data,
      })

      await createAuditLog({
        userId: session.user.id,
        coffreId: id,
        action: "COFFRE_UPDATED",
        description: `Coffre mis à jour: ${existing.name} → ${coffre.name}`,
        metadata: { before: { name: existing.name, description: existing.description }, after: { name: coffre.name, description: coffre.description } },
        req,
        tx,
      })

      return coffre
    })

    // Invalidation cache: balance/coffres/dashboard
    invalidateCoffreCache(updated.id)
    cache.invalidatePattern("dashboard:")

    return NextResponse.json({ success: true, coffre: updated })
  } catch (error) {
    return handleApiError(error)
  }
}

const deleteCoffreRequestSchema = z.object({
  id: z.string().uuid("ID de coffre invalide"),
})

async function deleteHandler(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
      throw new ApiError(403, "Non autorisé")
    }

    const body = await req.json().catch(() => ({}))
    const parsed = deleteCoffreRequestSchema.safeParse(body)
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.errors[0]?.message || "Données invalides")
    }

    const { id: coffreId } = parsed.data

    // Récupérer les membres avant suppression (pour invalidation cache)
    const members = await prisma.coffreMember.findMany({
      where: { coffreId },
      select: { userId: true },
    })
    const memberUserIds = Array.from(new Set(members.map((m) => m.userId)))

    await prisma.$transaction(async (tx) => {
      const coffre = await tx.coffre.findUnique({
        where: { id: coffreId },
        select: { id: true, name: true },
      })
      if (!coffre) {
        throw new ApiError(404, "Coffre introuvable")
      }

      // Vérifier solde == 0 (règle impérative)
      const info = await computeCoffreBalanceInfo(tx, coffreId)
      if (info.balanceCents !== 0) {
        throw new ApiError(400, `Suppression impossible: le solde du coffre n'est pas à 0 (solde actuel: ${info.balance.toFixed(2)}€)`)
      }

      // Supprimer aussi l'historique (logs) associé avant cascade
      const [movementIds, inventoryIds] = await Promise.all([
        tx.movement.findMany({ where: { coffreId }, select: { id: true } }),
        tx.inventory.findMany({ where: { coffreId }, select: { id: true } }),
      ])
      const movementIdList = movementIds.map((m) => m.id)
      const inventoryIdList = inventoryIds.map((i) => i.id)

      await tx.log.deleteMany({
        where: {
          OR: [
            { coffreId },
            ...(movementIdList.length ? [{ movementId: { in: movementIdList } }] : []),
            ...(inventoryIdList.length ? [{ inventoryId: { in: inventoryIdList } }] : []),
          ],
        },
      })

      // Suppression définitive (cascade sur movements, inventories, members, details)
      await tx.coffre.delete({ where: { id: coffreId } })
    })

    // Invalidation cache
    invalidateCoffreCache(coffreId)
    memberUserIds.forEach((userId) => {
      invalidateUserCache(userId)
      cache.invalidatePattern(`dashboard:${userId}`)
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}

// Appliquer le middleware avec rate limiting
export const POST = adminRoute(postHandler, MUTATION_RATE_LIMIT)
export const PUT = adminRoute(putHandler, MUTATION_RATE_LIMIT)
export const DELETE = adminRoute(deleteHandler, MUTATION_RATE_LIMIT)



