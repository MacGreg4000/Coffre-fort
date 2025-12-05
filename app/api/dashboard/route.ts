import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { startOfMonth, endOfMonth, subDays, format } from "date-fns"
import { BILLET_DENOMINATIONS } from "@/lib/utils"

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
    const thirtyDaysAgo = subDays(now, 30)

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

    // Données pour activité mensuelle (12 derniers mois)
    const twelveMonthsAgo = new Date(now)
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)
    
    // Récupérer tous les mouvements des 12 derniers mois
    const allMonthlyMovements = await prisma.movement.findMany({
      where: {
        coffreId: { in: filteredCoffreIds },
        createdAt: { gte: twelveMonthsAgo },
      },
      select: {
        createdAt: true,
      },
    })
    
    // Grouper par mois
    const monthlyActivityMap = new Map<string, number>()
    allMonthlyMovements.forEach((movement) => {
      const monthKey = format(new Date(movement.createdAt), "yyyy-MM")
      monthlyActivityMap.set(monthKey, (monthlyActivityMap.get(monthKey) || 0) + 1)
    })
    
    // Créer un tableau pour les 12 derniers mois
    const monthlyActivity = Array.from({ length: 12 }, (_, i) => {
      const date = new Date(now)
      date.setMonth(date.getMonth() - (11 - i))
      const monthKey = format(date, "yyyy-MM")
      const monthLabel = format(date, "MMM yyyy")
      return {
        month: monthLabel,
        count: monthlyActivityMap.get(monthKey) || 0,
      }
    })

    // Répartition des billets (tous les mouvements et inventaires)
    const allMovements = await prisma.movement.findMany({
      where: {
        coffreId: { in: filteredCoffreIds },
        createdAt: { gte: thirtyDaysAgo },
      },
      include: {
        details: true,
      },
    })

    const allInventories = await prisma.inventory.findMany({
      where: {
        coffreId: { in: filteredCoffreIds },
        createdAt: { gte: thirtyDaysAgo },
      },
      include: {
        details: true,
      },
    })

    // Calculer la répartition des billets
    const billDistribution = new Map<number, number>()

    // Ajouter les mouvements
    allMovements.forEach((movement) => {
      movement.details.forEach((detail) => {
        const denom = Number(detail.denomination)
        const current = billDistribution.get(denom) || 0
        billDistribution.set(denom, current + detail.quantity)
      })
    })

    // Ajouter les inventaires
    allInventories.forEach((inventory) => {
      inventory.details.forEach((detail) => {
        const denom = Number(detail.denomination)
        const current = billDistribution.get(denom) || 0
        billDistribution.set(denom, current + detail.quantity)
      })
    })

    // Top utilisateurs par activité
    const userActivity = await prisma.movement.groupBy({
      by: ["userId"],
      where: {
        coffreId: { in: filteredCoffreIds },
        createdAt: { gte: monthStart, lte: monthEnd },
      },
      _count: {
        id: true,
      },
    })

    const userIds = userActivity.map((u) => u.userId)
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true },
    })

    const userMap = new Map(users.map((u) => [u.id, u.name]))

    const coffreNames = await prisma.coffre.findMany({
      where: { id: { in: filteredCoffreIds } },
      select: { id: true, name: true },
    })

    const coffreMap = new Map(coffreNames.map((c) => [c.id, c.name]))

    // Convertir les Decimal en Number pour les mouvements
    const serializedMovements = movements.map((m) => ({
      ...m,
      amount: Number(m.amount),
      details: m.details.map((d) => ({
        ...d,
        denomination: Number(d.denomination),
      })),
    }))

    // Convertir les Decimal en Number pour les inventaires
    const serializedInventories = inventories.map((inv) => ({
      ...inv,
      totalAmount: Number(inv.totalAmount),
      details: inv.details.map((d) => ({
        ...d,
        denomination: Number(d.denomination),
      })),
    }))

    const serializedRecentInventories = recentInventories.map((inv) => ({
      ...inv,
      totalAmount: Number(inv.totalAmount),
      details: inv.details.map((d) => ({
        ...d,
        denomination: Number(d.denomination),
      })),
    }))

    // Préparer les données de répartition des billets
    const billDistributionData = BILLET_DENOMINATIONS.map((denom) => ({
      denomination: denom,
      quantity: billDistribution.get(denom) || 0,
      value: (billDistribution.get(denom) || 0) * denom,
    }))

    // Préparer les données des top utilisateurs
    const topUsersData = userActivity
      .map((u) => ({
        name: userMap.get(u.userId) || "Inconnu",
        count: u._count.id,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    return NextResponse.json({
      movements: serializedMovements,
      totalEntries,
      totalExits,
      inventories: serializedInventories,
      recentInventories: serializedRecentInventories,
      statsByCoffre: statsByCoffre.map((stat) => ({
        coffreId: stat.coffreId,
        coffreName: coffreMap.get(stat.coffreId) || "Inconnu",
        type: stat.type,
        amount: Number(stat._sum.amount || 0),
      })),
      coffres: userCoffres.map((uc) => uc.coffre),
      monthlyActivity: monthlyActivity,
      billDistribution: billDistributionData,
      topUsers: topUsersData,
    })
  } catch (error: any) {
    console.error("Erreur récupération dashboard:", error)
    return NextResponse.json(
      { error: error.message || "Erreur serveur" },
      { status: 500 }
    )
  }
}
