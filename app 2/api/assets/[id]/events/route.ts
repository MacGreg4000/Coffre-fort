import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { authenticatedRoute } from "@/lib/api-middleware"
import { MUTATION_RATE_LIMIT } from "@/lib/rate-limit"
import { ApiError, handleApiError, createAuditLog } from "@/lib/api-utils"
import { z } from "zod"

const createEventSchema = z.object({
  type: z.enum(["PURCHASE", "SALE", "VALUATION"]),
  date: z.string().datetime().optional(),
  amount: z.number().min(0).optional(),
  notes: z.string().max(2000).optional(),
})

async function postHandler(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) throw new ApiError(401, "Non autorisé")

    const { id: assetId } = await context.params
    const body = await req.json()
    const parsed = createEventSchema.safeParse(body)
    if (!parsed.success) throw new ApiError(400, parsed.error.errors[0]?.message || "Données invalides")

    const event = await prisma.$transaction(async (tx) => {
      const asset = await (tx as any).asset.findFirst({
        where: { id: assetId, userId: session.user.id },
      })
      if (!asset) throw new ApiError(404, "Actif introuvable")

      const created = await (tx as any).assetEvent.create({
        data: {
          assetId,
          type: parsed.data.type,
          date: parsed.data.date ? new Date(parsed.data.date) : new Date(),
          amount: typeof parsed.data.amount === "number" ? parsed.data.amount : undefined,
          notes: parsed.data.notes,
        },
      })

      await createAuditLog({
        userId: session.user.id,
        coffreId: asset.coffreId || undefined,
        action: "ASSET_EVENT_CREATED",
        description: `Événement ${parsed.data.type} ajouté à l'actif ${asset.name}`,
        metadata: { assetId, eventId: created.id, type: parsed.data.type, amount: parsed.data.amount },
        req,
        tx,
      })

      return created
    })

    return NextResponse.json({ event }, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}

export const POST = authenticatedRoute(postHandler, MUTATION_RATE_LIMIT)

