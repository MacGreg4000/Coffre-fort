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

  return { movements, inventories }
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
          <h1 className="text-4xl font-bold text-cyber-gold mb-2">Historique</h1>
          <p className="text-muted-foreground">
            Consultation de tous les mouvements et inventaires
          </p>
        </div>

        <HistoriqueList data={data} />
      </div>
    </Layout>
  )
}

