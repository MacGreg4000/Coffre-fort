import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { Layout } from "@/components/layout/Layout"
import { CaisseInterface } from "@/components/caisse/CaisseInterface"
import { prisma } from "@/lib/prisma"

async function getCaisseData(userId: string) {
  // Récupérer les coffres accessibles (optimisé avec select)
  const userCoffres = await prisma.coffreMember.findMany({
    where: { userId },
    select: {
      role: true,
      coffreId: true,
      coffre: {
        select: {
          id: true,
          name: true,
          description: true,
          isActive: true,
          createdAt: true,
        }
      }
    }
  })

  if (userCoffres.length === 0) {
    return []
  }

  // Récupérer les derniers inventaires EN PARALLÈLE (Promise.all au lieu de séquentiel)
  const inventoriesPromises = userCoffres.map(uc => 
    prisma.inventory.findFirst({
      where: { coffreId: uc.coffreId },
      select: {
        id: true,
        totalAmount: true,
        notes: true,
        createdAt: true,
        details: {
          select: {
            id: true,
            denomination: true,
            quantity: true,
          }
        }
      },
      orderBy: { createdAt: "desc" },
    })
  )

  const inventories = await Promise.all(inventoriesPromises)

  // Mapper les résultats
  return userCoffres.map((uc, index) => {
    const inventory = inventories[index]
    
    return {
      ...uc.coffre,
      lastInventory: inventory ? {
        ...inventory,
        totalAmount: Number(inventory.totalAmount),
        details: inventory.details.map(d => ({
          ...d,
          denomination: Number(d.denomination),
        })),
      } : null,
      role: uc.role,
    }
  })
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
        <CaisseInterface coffres={coffres} userId={session.user.id} />
      </div>
    </Layout>
  )
}

