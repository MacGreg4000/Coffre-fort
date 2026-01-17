import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { authenticatedRoute } from "@/lib/api-middleware"
import { MUTATION_RATE_LIMIT } from "@/lib/rate-limit"
import { ApiError, handleApiError, createAuditLog } from "@/lib/api-utils"
import { z } from "zod"

const updateEventSchema = z.object({
  type: z.enum(["PURCHASE", "SALE", "VALUATION"]).optional(),
  date: z.string().datetime().optional(),
  amount: z.number().min(0).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
})

async function putHandler(
  req: NextRequest,
  context: { params: Promise<{ id: string; eventId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) throw new ApiError(401, "Non autorisé")

    const { id: assetId, eventId } = await context.params
    const body = await req.json()
    const parsed = updateEventSchema.safeParse(body)
    if (!parsed.success) throw new ApiError(400, parsed.error.errors[0]?.message || "Données invalides")

    const event = await prisma.$transaction(async (tx) => {
      // Vérifier que l'actif existe et appartient à l'utilisateur
      const asset = await (tx as any).asset.findFirst({
        where: { id: assetId, userId: session.user.id },
      })
      if (!asset) throw new ApiError(404, "Actif introuvable")

      // Vérifier que l'événement existe et appartient à cet actif
      const existingEvent = await (tx as any).assetEvent.findFirst({
        where: { id: eventId, assetId },
      })
      if (!existingEvent) throw new ApiError(404, "Événement introuvable")

      // Préparer les données de mise à jour
      const updateData: any = {}
      if (parsed.data.type !== undefined) updateData.type = parsed.data.type
      if (parsed.data.date !== undefined) updateData.date = new Date(parsed.data.date)
      if (parsed.data.amount !== undefined) updateData.amount = parsed.data.amount === null ? null : parsed.data.amount
      if (parsed.data.notes !== undefined) updateData.notes = parsed.data.notes

      // Mettre à jour l'événement
      const updated = await (tx as any).assetEvent.update({
        where: { id: eventId },
        data: updateData,
      })

      await createAuditLog({
        userId: session.user.id,
        coffreId: asset.coffreId || undefined,
        action: "ASSET_EVENT_UPDATED",
        description: `Événement ${existingEvent.type} modifié pour l'actif ${asset.name}`,
        metadata: { assetId, eventId, type: updated.type, amount: updated.amount },
        req,
        tx,
      })

      return updated
    })

    return NextResponse.json({ event })
  } catch (error) {
    return handleApiError(error)
  }
}

async function deleteHandler(
  req: NextRequest,
  context: { params: Promise<{ id: string; eventId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) throw new ApiError(401, "Non autorisé")

    const { id: assetId, eventId } = await context.params

    await prisma.$transaction(async (tx) => {
      // Vérifier que l'actif existe et appartient à l'utilisateur
      const asset = await (tx as any).asset.findFirst({
        where: { id: assetId, userId: session.user.id },
      })
      if (!asset) throw new ApiError(404, "Actif introuvable")

      // Vérifier que l'événement existe et appartient à cet actif
      const existingEvent = await (tx as any).assetEvent.findFirst({
        where: { id: eventId, assetId },
      })
      if (!existingEvent) throw new ApiError(404, "Événement introuvable")

      // Supprimer l'événement
      await (tx as any).assetEvent.delete({
        where: { id: eventId },
      })

      await createAuditLog({
        userId: session.user.id,
        coffreId: asset.coffreId || undefined,
        action: "ASSET_EVENT_DELETED",
        description: `Événement ${existingEvent.type} supprimé de l'actif ${asset.name}`,
        metadata: { assetId, eventId, type: existingEvent.type },
        req,
        tx,
      })

      return { success: true }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}

export const PUT = authenticatedRoute(putHandler, MUTATION_RATE_LIMIT)
export const DELETE = authenticatedRoute(deleteHandler, MUTATION_RATE_LIMIT)
