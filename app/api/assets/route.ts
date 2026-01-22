import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { authenticatedRoute } from "@/lib/api-middleware"
import { API_RATE_LIMIT, MUTATION_RATE_LIMIT } from "@/lib/rate-limit"
import { ApiError, handleApiError, createAuditLog } from "@/lib/api-utils"
import { z } from "zod"

// Validation CUID (format: c + 24 caractères alphanumériques)
const cuidRegex = /^c[a-z0-9]{24}$/

const createAssetSchema = z.object({
  name: z.string().min(2).max(255),
  category: z.string().max(100).optional(),
  description: z.string().max(2000).optional(),
  coffreId: z.string().regex(cuidRegex, "ID de coffre invalide (format CUID requis)").nullable().optional(),
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

    const { name, category, description, coffreId } = parsed.data
    const normalizedCoffreId = coffreId ?? null

    // Si une localisation coffre est fournie, vérifier que l'utilisateur y a accès
    if (normalizedCoffreId) {
      const member = await prisma.coffreMember.findUnique({
        where: {
          coffreId_userId: { coffreId: normalizedCoffreId, userId: session.user.id },
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

      await createAuditLog({
        userId: session.user.id,
        coffreId: normalizedCoffreId || undefined,
        action: "ASSET_CREATED",
        description: `Actif créé: ${name}`,
        metadata: { assetId: created.id, category },
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

