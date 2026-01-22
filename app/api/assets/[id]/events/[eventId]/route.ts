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
  amount: z.number().min(0).optional(),
  notes: z.string().max(2000).optional(),
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

    const updated = await prisma.$transaction(async (tx) => {
      // Vérifier que l'actif existe et appartient à l'utilisateur
      const asset = await tx.asset.findFirst({
        where: { id: assetId, userId: session.user.id },
      })
      if (!asset) throw new ApiError(404, "Actif introuvable")

      // Vérifier que l'événement existe et appartient à l'actif
      const existingEvent = await tx.assetEvent.findFirst({
        where: {
          id: eventId,
          assetId: assetId
        },
      })
      if (!existingEvent) throw new ApiError(404, "Événement introuvable")

      // Préparer les données de mise à jour
      const updateData: any = {}
      if (parsed.data.type !== undefined) updateData.type = parsed.data.type
      if (parsed.data.date !== undefined) updateData.date = new Date(parsed.data.date)
      if (parsed.data.amount !== undefined) updateData.amount = parsed.data.amount
      if (parsed.data.notes !== undefined) updateData.notes = parsed.data.notes

      const event = await tx.assetEvent.update({
        where: { id: eventId },
        data: updateData,
      })

      await createAuditLog({
        userId: session.user.id,
        coffreId: asset.coffreId || undefined,
        action: "ASSET_EVENT_UPDATED",
        description: `Événement modifié pour l'actif ${asset.name}`,
        metadata: { assetId, eventId, changes: parsed.data },
        req,
        tx,
      })

      return event
    })

    return NextResponse.json({ event: updated })
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
      const asset = await tx.asset.findFirst({
        where: { id: assetId, userId: session.user.id },
      })
      if (!asset) throw new ApiError(404, "Actif introuvable")

      // Vérifier que l'événement existe et appartient à l'actif
      const event = await tx.assetEvent.findFirst({
        where: {
          id: eventId,
          assetId: assetId
        },
      })
      if (!event) throw new ApiError(404, "Événement introuvable")

      await createAuditLog({
        userId: session.user.id,
        coffreId: asset.coffreId || undefined,
        action: "ASSET_EVENT_DELETED",
        description: `Événement supprimé de l'actif ${asset.name}`,
        metadata: { assetId, eventId, eventType: event.type },
        req,
        tx,
      })

      // Supprimer l'événement
      await tx.assetEvent.delete({
        where: { id: eventId }
      })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}

async function getHandler(
  req: NextRequest,
  context: { params: Promise<{ id: string; eventId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) throw new ApiError(401, "Non autorisé")

    const { id: assetId, eventId } = await context.params

    // Vérifier que l'actif existe et appartient à l'utilisateur
    const asset = await prisma.asset.findFirst({
      where: { id: assetId, userId: session.user.id },
    })
    if (!asset) throw new ApiError(404, "Actif introuvable")

    // Récupérer l'événement
    const event = await prisma.assetEvent.findFirst({
      where: {
        id: eventId,
        assetId: assetId
      },
    })
    if (!event) throw new ApiError(404, "Événement introuvable")

    return NextResponse.json({ event })
  } catch (error) {
    return handleApiError(error)
  }
}

export const GET = authenticatedRoute(getHandler, MUTATION_RATE_LIMIT)
export const PUT = authenticatedRoute(putHandler, MUTATION_RATE_LIMIT)
export const DELETE = authenticatedRoute(deleteHandler, MUTATION_RATE_LIMIT)