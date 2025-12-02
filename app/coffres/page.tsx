import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { Layout } from "@/components/layout/Layout"
import { CoffresList } from "@/components/coffres/CoffresList"
import { prisma } from "@/lib/prisma"

async function getCoffresData(userId: string) {
  // Récupérer les coffres accessibles par l'utilisateur
  const userCoffres = await prisma.coffreMember.findMany({
    where: { userId },
    include: {
      coffre: {
        include: {
          members: {
            include: {
              user: true,
            },
          },
          _count: {
            select: {
              movements: true,
              inventories: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  // Récupérer le dernier inventaire pour chaque coffre
  const coffresWithDetails = await Promise.all(
    userCoffres.map(async (uc) => {
      const lastInventory = await prisma.inventory.findFirst({
        where: { coffreId: uc.coffreId },
        include: { details: true },
        orderBy: { createdAt: "desc" },
      })

      const lastMovement = await prisma.movement.findFirst({
        where: { coffreId: uc.coffreId },
        orderBy: { createdAt: "desc" },
      })

      return {
        ...uc.coffre,
        role: uc.role,
        lastInventory,
        lastMovement,
      }
    })
  )

  return coffresWithDetails
}

export default async function CoffresPage() {
  const session = await getServerSession(authOptions)
  if (!session) {
    redirect("/login")
  }

  const coffres = await getCoffresData(session.user.id)
  const isAdmin = session.user.role === "ADMIN"

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-cyber-gold mb-2">
              Mes Coffres
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Gérez vos coffres et consultez leurs statistiques
            </p>
          </div>
          {isAdmin && (
            <a href="/admin">
              <button className="px-4 py-2 rounded-lg bg-cyber-gold text-cyber-dark font-semibold hover:bg-cyber-gold-dark transition-colors">
                Administration
              </button>
            </a>
          )}
        </div>

        <CoffresList coffres={coffres} userId={session.user.id} isAdmin={isAdmin} />
      </div>
    </Layout>
  )
}

