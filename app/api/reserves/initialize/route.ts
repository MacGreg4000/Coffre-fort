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
    const END_YEAR = 2055

    // Vérifier les années existantes
    const existingReserves = await prisma.reserve.findMany({
      where: { userId: session.user.id },
      select: { year: true, id: true, releaseYear: true },
    })

    const existingYears = new Set(existingReserves.map((r) => r.year))
    const yearsToCreate = []
    const yearsToUpdate = []

    // Créer toutes les années manquantes de 2013 à 2055
    for (let year = START_YEAR; year <= END_YEAR; year++) {
      if (!existingYears.has(year)) {
        yearsToCreate.push({
          userId: session.user.id,
          year,
          amount: 0,
          released: 0,
          releaseYear: year + 5, // Année libérable = toujours année + 5 ans
        })
      }
    }

    // Mettre à jour les années existantes qui n'ont pas d'année libérable
    for (const reserve of existingReserves) {
      if (reserve.releaseYear === null) {
        yearsToUpdate.push({
          id: reserve.id,
          releaseYear: reserve.year + 5,
        })
      }
    }

    // Créer toutes les années manquantes
    if (yearsToCreate.length > 0) {
      await prisma.reserve.createMany({
        data: yearsToCreate,
      })
    }

    // Mettre à jour les années existantes sans année libérable
    if (yearsToUpdate.length > 0) {
      await Promise.all(
        yearsToUpdate.map((update) =>
          prisma.reserve.update({
            where: { id: update.id },
            data: { releaseYear: update.releaseYear },
          })
        )
      )
    }

    logger.info("Années initialisées et mises à jour", {
      userId: session.user.id,
      created: yearsToCreate.length,
      updated: yearsToUpdate.length,
      range: `${START_YEAR}-${END_YEAR}`,
    })

    return NextResponse.json({
      message: `${yearsToCreate.length} années créées, ${yearsToUpdate.length} années mises à jour`,
      created: yearsToCreate.length,
      updated: yearsToUpdate.length,
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


