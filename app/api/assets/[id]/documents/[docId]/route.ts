import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { authenticatedRoute } from "@/lib/api-middleware"
import { API_RATE_LIMIT, MUTATION_RATE_LIMIT } from "@/lib/rate-limit"
import { ApiError, handleApiError, createAuditLog } from "@/lib/api-utils"
import { decrypt, isEncryptionEnabled } from "@/lib/encryption"

async function getHandler(
  _req: NextRequest,
  context: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) throw new ApiError(401, "Non autorisé")

    const { id, docId } = await context.params

    // Vérifier que l'actif existe et appartient à l'utilisateur
    const asset = await (prisma as any).asset.findUnique({
      where: { id },
      select: { userId: true },
    })

    if (!asset) throw new ApiError(404, "Actif introuvable")
    if (asset.userId !== session.user.id) throw new ApiError(403, "Accès refusé")

    const document = await (prisma as any).assetDocument.findUnique({
      where: { id: docId },
      select: {
        id: true,
        assetId: true,
        filename: true,
        mimeType: true,
        sizeBytes: true,
        data: true,
      },
    })

    if (!document) throw new ApiError(404, "Document introuvable")
    if (document.assetId !== id) throw new ApiError(403, "Document n'appartient pas à cet actif")

    // Déchiffrer les données si nécessaire
    let documentData: Buffer = Buffer.from(document.data)
    if (isEncryptionEnabled()) {
      try {
        // Tenter de déchiffrer (si les données sont chiffrées)
        const encryptedString = document.data.toString("utf-8")
        if (encryptedString.includes(":")) {
          // Format de chiffrement détecté (salt:iv:tag:data)
          documentData = decrypt(encryptedString)
        }
      } catch (error) {
        // Si le déchiffrement échoue, utiliser les données telles quelles
        console.warn("Impossible de déchiffrer le document, utilisation des données brutes")
      }
    }

    return new NextResponse(documentData as any, {
      headers: {
        "Content-Type": document.mimeType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(document.filename)}"`,
        "Content-Length": documentData.length.toString(),
        "Cache-Control": "private, max-age=3600",
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}

async function deleteHandler(
  req: NextRequest,
  context: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) throw new ApiError(401, "Non autorisé")

    const { id, docId } = await context.params

    // Vérifier que l'actif existe et appartient à l'utilisateur
    const asset = await (prisma as any).asset.findUnique({
      where: { id },
      select: { userId: true, name: true },
    })

    if (!asset) throw new ApiError(404, "Actif introuvable")
    if (asset.userId !== session.user.id) throw new ApiError(403, "Accès refusé")

    const document = await (prisma as any).assetDocument.findUnique({
      where: { id: docId },
      select: {
        id: true,
        assetId: true,
        filename: true,
      },
    })

    if (!document) throw new ApiError(404, "Document introuvable")
    if (document.assetId !== id) throw new ApiError(403, "Document n'appartient pas à cet actif")

    await prisma.$transaction(async (tx) => {
      await (tx as any).assetDocument.delete({
        where: { id: docId },
      })

      await createAuditLog({
        userId: session.user.id,
        action: "ASSET_DOCUMENT_DELETED",
        description: `Document supprimé de l'actif ${asset.name}: ${document.filename}`,
        metadata: { assetId: id, documentId: docId },
        req,
        tx,
      })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}

export const GET = authenticatedRoute(getHandler, API_RATE_LIMIT)
export const DELETE = authenticatedRoute(deleteHandler, MUTATION_RATE_LIMIT)
