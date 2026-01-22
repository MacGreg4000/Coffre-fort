import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { BILLET_DENOMINATIONS } from "@/lib/utils"
import { createInventorySchema, validateRequest } from "@/lib/validations"
import { handleApiError, createAuditLog, ApiError, serializeInventory } from "@/lib/api-utils"
import { authenticatedRoute } from "@/lib/api-middleware"
import { MUTATION_RATE_LIMIT, API_RATE_LIMIT } from "@/lib/rate-limit"
import { invalidateCoffreCache, cache } from "@/lib/cache"
import { logger } from "@/lib/logger"

async function postHandler(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      throw new ApiError(401, "Non autorisé")
    }

    const body = await req.json()
    
    // Validation avec Zod
    const validation = validateRequest(createInventorySchema, body)
    if (!validation.success) {
      throw new ApiError(400, validation.error)
    }

    const { coffreId, billets, notes } = validation.data

    // Vérifier l'accès au coffre
    const member = await prisma.coffreMember.findUnique({
      where: {
        coffreId_userId: {
          coffreId,
          userId: session.user.id,
        },
      },
    })

    if (!member) {
      throw new ApiError(403, "Accès refusé à ce coffre")
    }

    // Calculer le montant total
    let totalAmount = 0
    const details: Array<{ denomination: number; quantity: number }> = []

    for (const denomination of BILLET_DENOMINATIONS) {
      const quantity = billets[denomination] || 0
      if (quantity > 0) {
        const amount = denomination * quantity
        totalAmount += amount
        details.push({ denomination, quantity })
      }
    }

    // Transaction pour garantir la cohérence
    const inventory = await prisma.$transaction(async (tx) => {
      // Créer l'inventaire
      const newInventory = await tx.inventory.create({
        data: {
          coffreId,
          totalAmount,
          notes,
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
        },
      })

      // Créer un log d'audit avec IP/UA (dans la transaction)
      await createAuditLog({
        userId: session.user.id,
        coffreId,
        inventoryId: newInventory.id,
        action: "INVENTORY_CREATED",
        description: `Inventaire de ${totalAmount}€`,
        metadata: { billets, totalAmount },
        req,
        tx, // Passer le contexte de transaction
      })

      return newInventory
    })

    // INVALIDER LE CACHE pour ce coffre et le dashboard
    invalidateCoffreCache(coffreId)
    cache.invalidatePattern(`dashboard:${session.user.id}`)
    logger.info(`Cache invalidated for coffre ${coffreId} after inventory creation`)

    return NextResponse.json(serializeInventory(inventory), { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}

async function getHandler(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      throw new ApiError(401, "Non autorisé")
    }

    const { searchParams } = new URL(req.url)
    const coffreId = searchParams.get("coffreId")

    // Pagination
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50")))
    const skip = (page - 1) * limit

    // Récupérer les coffres accessibles
    const userCoffres = await prisma.coffreMember.findMany({
      where: { userId: session.user.id },
      select: { coffreId: true },
    })
    const coffreIds = userCoffres.map((uc) => uc.coffreId)

    if (coffreIds.length === 0) {
      return NextResponse.json({
        data: [],
        pagination: { total: 0, page, limit, totalPages: 0, hasNextPage: false, hasPreviousPage: false }
      })
    }

    const whereClause = {
      ...(coffreId && coffreIds.includes(coffreId)
        ? { coffreId }
        : { coffreId: { in: coffreIds } }),
    }

    // Requêtes parallèles pour la pagination
    const [inventories, total] = await Promise.all([
      prisma.inventory.findMany({
        where: whereClause,
        include: {
          coffre: true,
          details: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.inventory.count({ where: whereClause })
    ])

    const serializedInventories = inventories.map(serializeInventory)

    return NextResponse.json({
      data: serializedInventories,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPreviousPage: page > 1,
      }
    })
  } catch (error) {
    return handleApiError(error)
  }
}

// Appliquer le middleware avec rate limiting
export const POST = authenticatedRoute(postHandler, MUTATION_RATE_LIMIT)
export const GET = authenticatedRoute(getHandler, API_RATE_LIMIT)
