import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"
import { z } from "zod"

// Validation Zod
const createReserveSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  amount: z.number().min(0),
  releaseYear: z.number().int().min(2000).max(2100).optional(),
  released: z.number().min(0).default(0),
  notes: z.string().optional(),
})

// ============================================
// GET /api/reserves - Liste des réserves
// ============================================
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    // Récupérer toutes les réserves de l'utilisateur, triées par année
    const reserves = await prisma.reserve.findMany({
      where: { userId: session.user.id },
      orderBy: { year: "asc" },
    })

    // Filtrer uniquement les réserves avec un montant > 0 pour les statistiques
    // (exclure les réserves pré-créées avec amount = 0 qui ne représentent pas de vraies réserves)
    const reservesWithAmount = reserves.filter((r) => {
      const amount = Number(r.amount)
      return amount > 0
    })

    // Calculer les statistiques uniquement sur les réserves avec montant > 0
    const total = reservesWithAmount.reduce((sum, r) => {
      return sum + Number(r.amount)
    }, 0)
    
    const totalReleased = reservesWithAmount.reduce((sum, r) => {
      return sum + Number(r.released)
    }, 0)
    
    const totalReleasable = total - totalReleased

    logger.info("Réserves récupérées", {
      userId: session.user.id,
      count: reserves.length,
      countWithAmount: reservesWithAmount.length,
      total,
      totalReleased,
      totalReleasable,
    })

    return NextResponse.json({
      reserves,
      stats: {
        total,
        totalReleased,
        totalReleasable,
        count: reservesWithAmount.length, // Compter uniquement les réserves avec montant > 0
      },
    })
  } catch (err) {
    logger.error("Erreur GET /api/reserves", err instanceof Error ? err : new Error(String(err)))
    return NextResponse.json(
      { error: "Erreur lors de la récupération des réserves" },
      { status: 500 }
    )
  }
}

// ============================================
// POST /api/reserves - Créer une réserve
// ============================================
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const body = await req.json()
    const validatedData = createReserveSchema.parse(body)

    // Vérifier si une réserve existe déjà pour cette année
    const existingReserve = await prisma.reserve.findUnique({
      where: {
        userId_year: {
          userId: session.user.id,
          year: validatedData.year,
        },
      },
    })

    if (existingReserve) {
      return NextResponse.json(
        { error: `Une réserve existe déjà pour l'année ${validatedData.year}` },
        { status: 400 }
      )
    }

    // Créer la réserve
    const reserve = await prisma.reserve.create({
      data: {
        userId: session.user.id,
        year: validatedData.year,
        amount: validatedData.amount,
        releaseYear: validatedData.releaseYear,
        released: validatedData.released,
        notes: validatedData.notes,
      },
    })

    logger.info("Réserve créée", {
      userId: session.user.id,
      reserveId: reserve.id,
      year: reserve.year,
      amount: reserve.amount,
    })

    return NextResponse.json(reserve, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Données invalides", details: err.errors },
        { status: 400 }
      )
    }

    logger.error("Erreur POST /api/reserves", err instanceof Error ? err : new Error(String(err)))
    return NextResponse.json(
      { error: "Erreur lors de la création de la réserve" },
      { status: 500 }
    )
  }
}

