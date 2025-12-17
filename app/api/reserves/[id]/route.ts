import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"
import { z } from "zod"

// Validation Zod
const updateReserveSchema = z.object({
  year: z.number().int().min(2000).max(2100).optional(),
  amount: z.number().min(0).optional(),
  releaseYear: z.number().int().min(2000).max(2100).optional(),
  released: z.number().min(0).optional(),
  notes: z.string().optional(),
})

// ============================================
// PUT /api/reserves/[id] - Modifier une réserve
// ============================================
export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const { id: reserveId } = await context.params
    const body = await req.json()
    const validatedData = updateReserveSchema.parse(body)

    // Vérifier que la réserve existe et appartient à l'utilisateur
    const existingReserve = await prisma.reserve.findUnique({
      where: { id: reserveId },
    })

    if (!existingReserve) {
      return NextResponse.json({ error: "Réserve introuvable" }, { status: 404 })
    }

    if (existingReserve.userId !== session.user.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 })
    }

    // Si l'année change, vérifier qu'il n'y a pas de conflit
    if (validatedData.year && validatedData.year !== existingReserve.year) {
      const conflictingReserve = await prisma.reserve.findUnique({
        where: {
          userId_year: {
            userId: session.user.id,
            year: validatedData.year,
          },
        },
      })

      if (conflictingReserve && conflictingReserve.id !== reserveId) {
        return NextResponse.json(
          { error: `Une réserve existe déjà pour l'année ${validatedData.year}` },
          { status: 400 }
        )
      }
    }

    // Mettre à jour la réserve
    const updatedReserve = await prisma.reserve.update({
      where: { id: reserveId },
      data: validatedData,
    })

    logger.info("Réserve modifiée", {
      userId: session.user.id,
      reserveId: updatedReserve.id,
      changes: validatedData,
    })

    return NextResponse.json(updatedReserve)
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Données invalides", details: err.errors },
        { status: 400 }
      )
    }

    logger.error("Erreur PUT /api/reserves/[id]", err instanceof Error ? err : new Error(String(err)))
    return NextResponse.json(
      { error: "Erreur lors de la modification de la réserve" },
      { status: 500 }
    )
  }
}

// ============================================
// DELETE /api/reserves/[id] - Supprimer une réserve
// ============================================
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const { id: reserveId } = await context.params

    // Vérifier que la réserve existe et appartient à l'utilisateur
    const existingReserve = await prisma.reserve.findUnique({
      where: { id: reserveId },
    })

    if (!existingReserve) {
      return NextResponse.json({ error: "Réserve introuvable" }, { status: 404 })
    }

    if (existingReserve.userId !== session.user.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 })
    }

    // Supprimer la réserve
    await prisma.reserve.delete({
      where: { id: reserveId },
    })

    logger.info("Réserve supprimée", {
      userId: session.user.id,
      reserveId,
      year: existingReserve.year,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    logger.error("Erreur DELETE /api/reserves/[id]", err instanceof Error ? err : new Error(String(err)))
    return NextResponse.json(
      { error: "Erreur lors de la suppression de la réserve" },
      { status: 500 }
    )
  }
}
