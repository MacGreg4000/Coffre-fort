import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"

// ============================================
// POST /api/reserves/initialize - Initialiser les années
// ============================================
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const START_YEAR = 2013
    const END_YEAR = 2035
    const currentYear = new Date().getFullYear()

    // Vérifier les années existantes
    const existingReserves = await prisma.reserve.findMany({
      where: { userId: session.user.id },
      select: { year: true },
    })

    const existingYears = new Set(existingReserves.map((r) => r.year))
    const yearsToCreate = []

    // Créer toutes les années manquantes de 2013 à 2035
    for (let year = START_YEAR; year <= END_YEAR; year++) {
      if (!existingYears.has(year)) {
        yearsToCreate.push({
          userId: session.user.id,
          year,
          amount: 0,
          released: 0,
          releaseYear: year < currentYear ? year + 5 : null, // Année libérable = année + 5 ans si passée
        })
      }
    }

    if (yearsToCreate.length === 0) {
      return NextResponse.json({
        message: "Toutes les années sont déjà initialisées",
        count: 0,
      })
    }

    // Créer toutes les années manquantes
    await prisma.reserve.createMany({
      data: yearsToCreate,
    })

    logger.info("Années initialisées", {
      userId: session.user.id,
      count: yearsToCreate.length,
      range: `${START_YEAR}-${END_YEAR}`,
    })

    return NextResponse.json({
      message: `${yearsToCreate.length} années créées avec succès`,
      count: yearsToCreate.length,
      years: yearsToCreate.map((y) => y.year),
    })
  } catch (err) {
    logger.error("Erreur POST /api/reserves/initialize", err instanceof Error ? err : new Error(String(err)))
    return NextResponse.json(
      { error: "Erreur lors de l'initialisation des années" },
      { status: 500 }
    )
  }
}
