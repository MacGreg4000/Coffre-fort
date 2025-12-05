import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { Layout } from "@/components/layout/Layout"
import { HistoriqueList } from "@/components/historique/HistoriqueList"
import { prisma } from "@/lib/prisma"

async function getHistoriqueData(userId: string) {
  // Récupérer les coffres accessibles
  const userCoffres = await prisma.coffreMember.findMany({
    where: { userId },
    select: { coffreId: true },
  })
  const coffreIds = userCoffres.map((uc) => uc.coffreId)

  // Récupérer les mouvements
  const movements = await prisma.movement.findMany({
    where: { coffreId: { in: coffreIds } },
    include: {
      coffre: true,
      user: true,
      details: true,
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  })

  // Récupérer les inventaires
  const inventories = await prisma.inventory.findMany({
    where: { coffreId: { in: coffreIds } },
    include: {
      coffre: true,
      details: true,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  })

  // Convertir les Decimal en Number
  const serializedMovements = movements.map((m) => ({
    ...m,
    amount: Number(m.amount),
    details: m.details.map((d) => ({
      ...d,
      denomination: Number(d.denomination),
    })),
  }))

  const serializedInventories = inventories.map((inv) => ({
    ...inv,
    totalAmount: Number(inv.totalAmount),
    details: inv.details.map((d) => ({
      ...d,
      denomination: Number(d.denomination),
    })),
  }))

  return { movements: serializedMovements, inventories: serializedInventories }
}

export default async function HistoriquePage() {
  const session = await getServerSession(authOptions)
  if (!session) {
    redirect("/login")
  }

  const data = await getHistoriqueData(session.user.id)

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1">Historique</h1>
        </div>

        <HistoriqueList data={data} />
      </div>
    </Layout>
  )
}

