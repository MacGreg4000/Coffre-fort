import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { Layout } from "@/components/layout/Layout"
import { CaisseInterface } from "@/components/caisse/CaisseInterface"
import { prisma } from "@/lib/prisma"

async function getCaisseData(userId: string) {
  // Récupérer les coffres accessibles
  const userCoffres = await prisma.coffreMember.findMany({
    where: { userId },
    include: { coffre: true },
  })

  // Récupérer le dernier inventaire pour chaque coffre
  const coffresWithInventory = await Promise.all(
    userCoffres.map(async (uc) => {
      const lastInventory = await prisma.inventory.findFirst({
        where: { coffreId: uc.coffreId },
        include: { details: true },
        orderBy: { createdAt: "desc" },
      })

      return {
        ...uc.coffre,
        lastInventory,
        role: uc.role,
      }
    })
  )

  return coffresWithInventory
}

export default async function CaissePage() {
  const session = await getServerSession(authOptions)
  if (!session) {
    redirect("/login")
  }

  const coffres = await getCaisseData(session.user.id)

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-4xl font-bold text-cyber-gold mb-2">Gestion de Caisse</h1>
          <p className="text-muted-foreground">
            Inventaire et mouvements de fonds
          </p>
        </div>

        <CaisseInterface coffres={coffres} userId={session.user.id} />
      </div>
    </Layout>
  )
}

