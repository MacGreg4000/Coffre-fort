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
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) throw new ApiError(401, "Non autorisé")

    const { id } = await context.params

    const file = await (prisma as any).passwordFile.findFirst({
      where: { id, userId: session.user.id },
      select: {
        filename: true,
        mimeType: true,
        data: true,
      },
    })

    if (!file) throw new ApiError(404, "Fichier introuvable")

    // Déchiffrer les données si nécessaire
    let fileData: Buffer = Buffer.from(file.data)
    if (isEncryptionEnabled()) {
      try {
        // Tenter de déchiffrer (si les données sont chiffrées)
        const encryptedString = file.data.toString("utf-8")
        if (encryptedString.includes(":")) {
          // Format de chiffrement détecté (salt:iv:tag:data)
          fileData = decrypt(encryptedString)
        }
      } catch (error) {
        // Si le déchiffrement échoue, utiliser les données telles quelles
        // (peut être un ancien fichier non chiffré)
        console.warn("Impossible de déchiffrer le fichier, utilisation des données brutes")
      }
    }

    return new NextResponse(fileData as any, {
      headers: {
        "Content-Type": file.mimeType || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${file.filename}"`,
      },
    })
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
      const file = await (tx as any).passwordFile.findFirst({
        where: { id, userId: session.user.id },
        select: { id: true, filename: true, sizeBytes: true, sha256: true },
      })
      if (!file) throw new ApiError(404, "Fichier introuvable")

      await createAuditLog({
        userId: session.user.id,
        action: "PASSWORD_FILE_DELETED",
        description: `Fichier supprimé: ${file.filename}`,
        metadata: { passwordFileId: file.id, sizeBytes: file.sizeBytes, sha256: file.sha256 },
        req,
        tx,
      })

      await (tx as any).passwordFile.delete({ where: { id: file.id } })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}

export const GET = authenticatedRoute(getHandler, API_RATE_LIMIT)
export const DELETE = authenticatedRoute(deleteHandler, MUTATION_RATE_LIMIT)

