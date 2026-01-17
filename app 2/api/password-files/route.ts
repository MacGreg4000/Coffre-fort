import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { authenticatedRoute } from "@/lib/api-middleware"
import { API_RATE_LIMIT, MUTATION_RATE_LIMIT } from "@/lib/rate-limit"
import { ApiError, handleApiError, createAuditLog } from "@/lib/api-utils"
import crypto from "crypto"

async function getHandler(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) throw new ApiError(401, "Non autorisé")

    const files = await (prisma as any).passwordFile.findMany({
      where: { userId: session.user.id },
      select: {
        id: true,
        filename: true,
        mimeType: true,
        sizeBytes: true,
        sha256: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ files })
  } catch (error) {
    return handleApiError(error)
  }
}

async function postHandler(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) throw new ApiError(401, "Non autorisé")

    const form = await req.formData()
    const file = form.get("file")
    if (!file || !(file instanceof File)) {
      throw new ApiError(400, "Fichier manquant (champ: file)")
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const sha256 = crypto.createHash("sha256").update(buffer).digest("hex")

    const created = await prisma.$transaction(async (tx) => {
      const saved = await (tx as any).passwordFile.create({
        data: {
          userId: session.user.id,
          filename: file.name.substring(0, 255),
          mimeType: (file.type || "application/octet-stream").substring(0, 150),
          sizeBytes: buffer.length,
          sha256,
          data: buffer,
        },
        select: {
          id: true,
          filename: true,
          mimeType: true,
          sizeBytes: true,
          sha256: true,
          createdAt: true,
        },
      })

      await createAuditLog({
        userId: session.user.id,
        action: "PASSWORD_FILE_UPLOADED",
        description: `Fichier importé: ${saved.filename}`,
        metadata: { passwordFileId: saved.id, sizeBytes: saved.sizeBytes, sha256: saved.sha256 },
        req,
        tx,
      })

      return saved
    })

    return NextResponse.json({ file: created }, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}

export const GET = authenticatedRoute(getHandler, API_RATE_LIMIT)
export const POST = authenticatedRoute(postHandler, MUTATION_RATE_LIMIT)

