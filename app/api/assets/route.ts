import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { authenticatedRoute } from "@/lib/api-middleware"
import { API_RATE_LIMIT, MUTATION_RATE_LIMIT } from "@/lib/rate-limit"
import { ApiError, handleApiError, createAuditLog } from "@/lib/api-utils"
import { z } from "zod"

const createAssetSchema = z.object({
  name: z.string().min(2).max(255),
  category: z.string().max(100).optional(),
  description: z.string().max(2000).optional(),
  coffreId: z.string().uuid().nullable().optional(),
  event: z.object({
    type: z.enum(["PURCHASE", "SALE", "VALUATION"]),
    amount: z.number().min(0),
    date: z.string().datetime().optional(),
    notes: z.string().max(2000).optional(),
  }).optional(),
})

async function getHandler(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) throw new ApiError(401, "Non autorisé")

    const assets = await (prisma as any).asset.findMany({
      where: { userId: session.user.id },
      include: {
        coffre: { select: { id: true, name: true } },
        events: { 
          orderBy: { date: "desc" },
          // Récupérer tous les événements pour calculer prix d'achat, vente et valeur marché
        },
        documents: {
          select: {
            id: true,
            filename: true,
            mimeType: true,
            sizeBytes: true,
            documentType: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { updatedAt: "desc" },
    })

    return NextResponse.json({ assets })
  } catch (error) {
    return handleApiError(error)
  }
}

async function postHandler(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) throw new ApiError(401, "Non autorisé")

    const body = await req.json()
    const parsed = createAssetSchema.safeParse(body)
    if (!parsed.success) throw new ApiError(400, parsed.error.errors[0]?.message || "Données invalides")

    const { name, category, description, coffreId, event } = parsed.data
    const normalizedCoffreId = coffreId ?? null

    // Si une localisation coffre est fournie, vérifier que l'utilisateur y a accès
    if (normalizedCoffreId) {
      const member = await prisma.coffreMember.findUnique({
        where: {
          userId_coffreId: { userId: session.user.id, coffreId: normalizedCoffreId },
        },
        select: { id: true },
      })
      if (!member) throw new ApiError(403, "Accès refusé à ce coffre")
    }

    const asset = await prisma.$transaction(async (tx) => {
      const created = await (tx as any).asset.create({
        data: {
          userId: session.user.id,
          coffreId: normalizedCoffreId,
          name,
          category,
          description,
        },
      })

      // Créer l'événement si fourni
      if (event) {
        await (tx as any).assetEvent.create({
          data: {
            assetId: created.id,
            type: event.type,
            date: event.date ? new Date(event.date) : new Date(),
            amount: event.amount,
            notes: event.notes || null,
          },
        })
      }

      await createAuditLog({
        userId: session.user.id,
        coffreId: normalizedCoffreId || undefined,
        action: "ASSET_CREATED",
        description: `Actif créé: ${name}${event ? ` avec événement ${event.type}` : ""}`,
        metadata: { assetId: created.id, category, eventType: event?.type },
        req,
        tx,
      })

      return created
    })

    return NextResponse.json({ asset }, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}

export const GET = authenticatedRoute(getHandler, API_RATE_LIMIT)
export const POST = authenticatedRoute(postHandler, MUTATION_RATE_LIMIT)

