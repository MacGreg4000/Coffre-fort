import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { startOfMonth, endOfMonth } from "date-fns"

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const coffreId = searchParams.get("coffreId")
    const now = new Date()
    const monthStart = startOfMonth(now)
    const monthEnd = endOfMonth(now)

    // Récupérer les coffres accessibles par l'utilisateur
    const userCoffres = await prisma.coffreMember.findMany({
      where: { userId: session.user.id },
      include: { coffre: true },
    })
    const coffreIds = userCoffres.map((cm) => cm.coffreId)

    // Si un coffre est sélectionné, vérifier qu'il est accessible
    const filteredCoffreIds = coffreId && coffreIds.includes(coffreId)
      ? [coffreId]
      : coffreIds

    // Statistiques mensuelles (mouvements)
    const movements = await prisma.movement.findMany({
      where: {
        coffreId: { in: filteredCoffreIds },
        createdAt: { gte: monthStart, lte: monthEnd },
      },
      include: {
        coffre: true,
        user: true,
        details: true,
      },
      orderBy: { createdAt: "desc" },
    })

    // Calculer les totaux
    const totalEntries = movements
      .filter((m) => m.type === "ENTRY")
      .reduce((sum, m) => sum + Number(m.amount), 0)

    const totalExits = movements
      .filter((m) => m.type === "EXIT")
      .reduce((sum, m) => sum + Number(m.amount), 0)

    // Derniers inventaires
    const inventories = await prisma.inventory.findMany({
      where: {
        coffreId: { in: filteredCoffreIds },
      },
      include: {
        coffre: true,
        details: true,
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    })

    // Données pour graphiques (par coffre) - mouvements
    const statsByCoffre = await prisma.movement.groupBy({
      by: ["coffreId", "type"],
      where: {
        coffreId: { in: filteredCoffreIds },
        createdAt: { gte: monthStart, lte: monthEnd },
      },
      _sum: {
        amount: true,
      },
    })

    // Données des inventaires pour les graphiques (derniers 30 jours)
    const thirtyDaysAgo = new Date(now)
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const recentInventories = await prisma.inventory.findMany({
      where: {
        coffreId: { in: filteredCoffreIds },
        createdAt: { gte: thirtyDaysAgo },
      },
      include: {
        coffre: true,
        details: true,
      },
      orderBy: { createdAt: "asc" },
    })

    const coffreNames = await prisma.coffre.findMany({
      where: { id: { in: filteredCoffreIds } },
      select: { id: true, name: true },
    })

    const coffreMap = new Map(coffreNames.map((c) => [c.id, c.name]))

    return NextResponse.json({
      movements,
      totalEntries,
      totalExits,
      inventories,
      recentInventories,
      statsByCoffre: statsByCoffre.map((stat) => ({
        coffreId: stat.coffreId,
        coffreName: coffreMap.get(stat.coffreId) || "Inconnu",
        type: stat.type,
        amount: Number(stat._sum.amount || 0),
      })),
      coffres: userCoffres.map((uc) => uc.coffre),
    })
  } catch (error: any) {
    console.error("Erreur récupération dashboard:", error)
    return NextResponse.json(
      { error: error.message || "Erreur serveur" },
      { status: 500 }
    )
  }
}


