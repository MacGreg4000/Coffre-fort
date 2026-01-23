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
  try {
    console.log(`getCaisseData: Fetching coffres for user ${userId}`)

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

    console.log(`getCaisseData: Found ${userCoffres.length} coffres for user ${userId}`)

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
          date: true,
          details: {
            select: {
              id: true,
              denomination: true,
              quantity: true,
            }
          }
        },
        orderBy: { date: "desc" },
      })
    )

    const inventories = await Promise.all(inventoriesPromises)
    console.log(`getCaisseData: Loaded inventories for ${inventories.filter(i => i).length} coffres`)

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
  } catch (error) {
    console.error(`getCaisseData: Error for user ${userId}:`, error)
    throw error
  }
}

async function getHistoriqueData(userId: string) {
  try {
    console.log(`getHistoriqueData: Fetching data for user ${userId}`)

    // Récupérer les coffres accessibles
    const userCoffres = await prisma.coffreMember.findMany({
      where: { userId },
      include: { coffre: true },
    })
    const coffreIds = userCoffres.map((uc) => uc.coffreId)

    console.log(`getHistoriqueData: Found ${coffreIds.length} coffre IDs for user ${userId}`)

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

    console.log(`getHistoriqueData: Loaded ${movements.length} movements`)

    // Récupérer les inventaires
    const inventories = await prisma.inventory.findMany({
      where: { coffreId: { in: coffreIds } },
      include: {
        coffre: true,
        details: true,
      },
      orderBy: { date: "desc" },
      take: 100,
    })

    console.log(`getHistoriqueData: Loaded ${inventories.length} inventories`)

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
  } catch (error) {
    console.error(`getHistoriqueData: Error for user ${userId}:`, error)
    throw error
  }
}

interface CaissePageProps {
  searchParams: Promise<{ tab?: string }>
}

export default async function CaissePage({ searchParams }: CaissePageProps) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      console.log("CaissePage: No session, redirecting to login")
      redirect("/login")
    }

    console.log(`CaissePage: Loading data for user ${session.user.id}`)

    const resolvedSearchParams = await searchParams
    const defaultTab = resolvedSearchParams.tab === "historique" ? "historique" : "encodage"

    console.log("CaissePage: Fetching caisse and historique data...")

    const [coffres, historiqueData] = await Promise.all([
      getCaisseData(session.user.id),
      getHistoriqueData(session.user.id),
    ])

    console.log(`CaissePage: Loaded ${coffres.length} coffres and ${historiqueData.movements.length} movements`)

    // Vérifier si l'utilisateur a accès à au moins un coffre
    if (coffres.length === 0) {
      console.log(`CaissePage: User ${session.user.id} has no accessible coffres`)
      return (
        <Layout>
          <div className="space-y-6">
            <div className="max-w-4xl mx-auto">
              <div className="bg-card border border-border rounded-lg p-8 text-center">
                <div className="text-6xl mb-4">🏦</div>
                <h2 className="text-2xl font-semibold text-foreground mb-4">
                  Aucun coffre accessible
                </h2>
                <p className="text-foreground/70 mb-6">
                  Vous n'avez accès à aucun coffre-fort pour le moment. Contactez un administrateur pour obtenir l'accès à un coffre.
                </p>
                <div className="text-sm text-foreground/50">
                  Si vous êtes administrateur, créez d'abord un coffre-fort dans la section Admin.
                </div>
              </div>
            </div>
          </div>
        </Layout>
      )
    }

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
  } catch (error) {
    console.error("CaissePage: Error loading page:", error)
    // Retourner une page d'erreur au lieu de planter
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Erreur serveur</h1>
          <p className="text-gray-600 mb-4">
            Une erreur inattendue s'est produite lors du chargement de la page caisse.
          </p>
          <details className="text-left bg-gray-100 p-4 rounded max-w-md mx-auto">
            <summary className="cursor-pointer font-semibold">Détails de l'erreur</summary>
            <pre className="mt-2 text-sm text-red-600 whitespace-pre-wrap">
              {error instanceof Error ? error.message : 'Erreur inconnue'}
            </pre>
          </details>
        </div>
      </div>
    )
  }
}
