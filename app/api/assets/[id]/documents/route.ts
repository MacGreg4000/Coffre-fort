import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { authenticatedRoute } from "@/lib/api-middleware"
import { API_RATE_LIMIT, MUTATION_RATE_LIMIT } from "@/lib/rate-limit"
import { ApiError, handleApiError, createAuditLog } from "@/lib/api-utils"
import crypto from "crypto"

async function getHandler(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) throw new ApiError(401, "Non autorisé")

    const { id } = await context.params

    // Vérifier que l'actif existe et appartient à l'utilisateur
    const asset = await (prisma as any).asset.findUnique({
      where: { id },
      select: { userId: true },
    })

    if (!asset) throw new ApiError(404, "Actif introuvable")
    if (asset.userId !== session.user.id) throw new ApiError(403, "Accès refusé")

    const documents = await (prisma as any).assetDocument.findMany({
      where: { assetId: id },
      select: {
        id: true,
        filename: true,
        mimeType: true,
        sizeBytes: true,
        sha256: true,
        documentType: true,
        notes: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ documents })
  } catch (error) {
    return handleApiError(error)
  }
}

async function postHandler(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) throw new ApiError(401, "Non autorisé")

    const { id } = await context.params

    // Vérifier que l'actif existe et appartient à l'utilisateur
    const asset = await (prisma as any).asset.findUnique({
      where: { id },
      select: { userId: true, name: true },
    })

    if (!asset) throw new ApiError(404, "Actif introuvable")
    if (asset.userId !== session.user.id) throw new ApiError(403, "Accès refusé")

    const form = await req.formData()
    const file = form.get("file")
    const documentType = form.get("documentType") as string | null
    const notes = form.get("notes") as string | null

    if (!file || !(file instanceof File)) {
      throw new ApiError(400, "Fichier manquant (champ: file)")
    }

    // Limite de taille : 10MB par fichier
    const MAX_SIZE = 10 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      throw new ApiError(413, `Fichier trop volumineux (max: ${MAX_SIZE / (1024 * 1024)}MB)`)
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const sha256 = crypto.createHash("sha256").update(buffer).digest("hex")

    const created = await prisma.$transaction(async (tx) => {
      const saved = await (tx as any).assetDocument.create({
        data: {
          assetId: id,
          userId: session.user.id,
          filename: file.name.substring(0, 255),
          mimeType: (file.type || "application/octet-stream").substring(0, 150),
          sizeBytes: buffer.length,
          sha256,
          data: buffer,
          documentType: documentType?.substring(0, 100) || null,
          notes: notes?.substring(0, 2000) || null,
        },
        select: {
          id: true,
          filename: true,
          mimeType: true,
          sizeBytes: true,
          sha256: true,
          documentType: true,
          notes: true,
          createdAt: true,
        },
      })

      await createAuditLog({
        userId: session.user.id,
        action: "ASSET_DOCUMENT_UPLOADED",
        description: `Document ajouté à l'actif ${asset.name}: ${saved.filename}`,
        metadata: { 
          assetId: id, 
          documentId: saved.id, 
          documentType: saved.documentType,
          sizeBytes: saved.sizeBytes,
          sha256: saved.sha256 
        },
        req,
        tx,
      })

      return saved
    })

    return NextResponse.json({ document: created }, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}

export const GET = authenticatedRoute(getHandler, API_RATE_LIMIT)
export const POST = authenticatedRoute(postHandler, MUTATION_RATE_LIMIT)
