import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { Layout } from "@/components/layout/Layout"
import { DashboardStats } from "@/components/dashboard/DashboardStats"
import { prisma } from "@/lib/prisma"
import { startOfMonth, endOfMonth } from "date-fns"

async function getDashboardData(userId: string) {
  const now = new Date()
  const monthStart = startOfMonth(now)
  const monthEnd = endOfMonth(now)

  // Récupérer les coffres accessibles par l'utilisateur
  const userCoffres = await prisma.coffreMember.findMany({
    where: { userId },
    include: { coffre: true },
  })
  const coffreIds = userCoffres.map((cm) => cm.coffreId)

  // Statistiques mensuelles
  const movements = await prisma.movement.findMany({
    where: {
      coffreId: { in: coffreIds },
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
      coffreId: { in: coffreIds },
    },
    include: {
      coffre: true,
      details: true,
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  })

  // Données pour graphiques (par coffre)
  const statsByCoffre = await prisma.movement.groupBy({
    by: ["coffreId", "type"],
    where: {
      coffreId: { in: coffreIds },
      createdAt: { gte: monthStart, lte: monthEnd },
    },
    _sum: {
      amount: true,
    },
  })

  const coffreNames = await prisma.coffre.findMany({
    where: { id: { in: coffreIds } },
    select: { id: true, name: true },
  })

  const coffreMap = new Map(coffreNames.map((c) => [c.id, c.name]))

  return {
    movements,
    totalEntries,
    totalExits,
    inventories,
    statsByCoffre: statsByCoffre.map((stat) => ({
      coffreId: stat.coffreId,
      coffreName: coffreMap.get(stat.coffreId) || "Inconnu",
      type: stat.type,
      amount: Number(stat._sum.amount || 0),
    })),
    coffres: userCoffres.map((uc) => uc.coffre),
  }
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session) {
    redirect("/login")
  }

  const data = await getDashboardData(session.user.id)

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-cyber-gold mb-2">Dashboard</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Vue d'ensemble de vos coffres et statistiques
          </p>
        </div>

        <DashboardStats data={data} />
      </div>
    </Layout>
  )
}

