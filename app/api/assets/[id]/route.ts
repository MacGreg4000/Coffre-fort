import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { authenticatedRoute } from "@/lib/api-middleware"
import { MUTATION_RATE_LIMIT, API_RATE_LIMIT } from "@/lib/rate-limit"
import { ApiError, handleApiError, createAuditLog } from "@/lib/api-utils"
import { z } from "zod"

// Validation CUID (format: c + 24 caractères alphanumériques)
const cuidRegex = /^c[a-z0-9]{24}$/

const updateAssetSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  category: z.string().max(100).nullable().optional(),
  description: z.string().max(2000).nullable().optional(),
  coffreId: z.string().regex(cuidRegex, "ID de coffre invalide (format CUID requis)").nullable().optional(),
})

async function getHandler(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) throw new ApiError(401, "Non autorisé")

    const { id } = await context.params

    const asset = await (prisma as any).asset.findFirst({
      where: { id, userId: session.user.id },
      include: {
        coffre: { select: { id: true, name: true } },
        events: { orderBy: { date: "desc" } },
      },
    })

    if (!asset) throw new ApiError(404, "Actif introuvable")

    return NextResponse.json({ asset })
  } catch (error) {
    return handleApiError(error)
  }
}

async function putHandler(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) throw new ApiError(401, "Non autorisé")

    const { id } = await context.params
    const body = await req.json()
    const parsed = updateAssetSchema.safeParse(body)
    if (!parsed.success) throw new ApiError(400, parsed.error.errors[0]?.message || "Données invalides")

    // Si une localisation coffre est fournie, vérifier que l'utilisateur y a accès
    if (parsed.data.coffreId) {
      const member = await prisma.coffreMember.findUnique({
        where: { coffreId_userId: { coffreId: parsed.data.coffreId, userId: session.user.id } },
        select: { id: true },
      })
      if (!member) throw new ApiError(403, "Accès refusé à ce coffre")
    }

    const updated = await prisma.$transaction(async (tx) => {
      const existing = await (tx as any).asset.findFirst({
        where: { id, userId: session.user.id },
      })
      if (!existing) throw new ApiError(404, "Actif introuvable")

      const asset = await (tx as any).asset.update({
        where: { id },
        data: parsed.data,
      })

      await createAuditLog({
        userId: session.user.id,
        coffreId: asset.coffreId || undefined,
        action: "ASSET_UPDATED",
        description: `Actif mis à jour: ${asset.name}`,
        metadata: { assetId: id, changes: parsed.data },
        req,
        tx,
      })

      return asset
    })

    return NextResponse.json({ asset: updated })
  } catch (error) {
    return handleApiError(error)
  }
}

async function deleteHandler(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) throw new ApiError(401, "Non autorisé")

    const { id } = await context.params

    await prisma.$transaction(async (tx) => {
      const asset = await (tx as any).asset.findFirst({
        where: { id, userId: session.user.id },
      })
      if (!asset) throw new ApiError(404, "Actif introuvable")

      await createAuditLog({
        userId: session.user.id,
        coffreId: asset.coffreId || undefined,
        action: "ASSET_DELETED",
        description: `Actif supprimé: ${asset.name}`,
        metadata: { assetId: id },
        req,
        tx,
      })

      // Cascade vers events via Prisma schema (onDelete: Cascade)
      await (tx as any).asset.delete({ where: { id } })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}

export const GET = authenticatedRoute(getHandler, API_RATE_LIMIT)
export const PUT = authenticatedRoute(putHandler, MUTATION_RATE_LIMIT)
export const DELETE = authenticatedRoute(deleteHandler, MUTATION_RATE_LIMIT)

