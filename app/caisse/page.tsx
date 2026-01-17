import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { Layout } from "@/components/layout/Layout"
import { CaisseInterfaceFusionnee } from "@/components/caisse/CaisseInterfaceFusionnee"
import { prisma } from "@/lib/prisma"

// Forcer la revalidation à chaque requête (pas de cache)
export const dynamic = 'force-dynamic'
export const revalidate = 0

async function getCaisseData(userId: string) {
  // Récupérer les coffres accessibles (optimisé avec select)
  const userCoffres = await prisma.coffreMember.findMany({
    where: { 
      userId,
      coffre: {
        isActive: true, // Filtrer uniquement les coffres actifs
      }
    },
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

async function getHistoriqueData(userId: string) {
  // Récupérer les coffres accessibles
  const userCoffres = await prisma.coffreMember.findMany({
    where: { userId },
    include: { coffre: true },
  })
  const coffreIds = userCoffres.map((uc) => uc.coffreId)

  // Récupérer les mouvements (exclure les supprimés)
  const movements = await prisma.movement.findMany({
    where: { 
      coffreId: { in: coffreIds },
      deletedAt: null, // CRITIQUE : Exclure les mouvements supprimés
    },
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

  return { 
    movements: serializedMovements, 
    inventories: serializedInventories,
    coffres: userCoffres.map((uc) => uc.coffre)
  }
}

interface CaissePageProps {
  searchParams: Promise<{ tab?: string }>
}

export default async function CaissePage({ searchParams }: CaissePageProps) {
  const session = await getServerSession(authOptions)
  if (!session) {
    redirect("/login")
  }

  const resolvedSearchParams = await searchParams
  const defaultTab = resolvedSearchParams.tab === "historique" ? "historique" : "encodage"
  const [coffres, historiqueData] = await Promise.all([
    getCaisseData(session.user.id),
    getHistoriqueData(session.user.id),
  ])

  return (
    <Layout>
      <div className="space-y-6">
        <CaisseInterfaceFusionnee 
          coffres={coffres} 
          userId={session.user.id}
          historiqueData={historiqueData}
          defaultTab={defaultTab}
        />
      </div>
    </Layout>
  )
}
