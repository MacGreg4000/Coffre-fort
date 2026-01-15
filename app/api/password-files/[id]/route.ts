import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { authenticatedRoute } from "@/lib/api-middleware"
import { API_RATE_LIMIT, MUTATION_RATE_LIMIT } from "@/lib/rate-limit"
import { ApiError, handleApiError, createAuditLog } from "@/lib/api-utils"

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

    return new NextResponse(file.data, {
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

