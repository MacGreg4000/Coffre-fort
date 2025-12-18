import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getCachedBalance } from "@/lib/cache"
import { logger } from "@/lib/logger"

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const coffreId = searchParams.get("coffreId")

    if (!coffreId) {
      return NextResponse.json({ error: "coffreId requis" }, { status: 400 })
    }

    // Vérifier l'accès au coffre
    const member = await prisma.coffreMember.findUnique({
      where: {
        userId_coffreId: {
          userId: session.user.id,
          coffreId,
        },
      },
    })

    if (!member) {
      return NextResponse.json(
        { error: "Accès refusé à ce coffre" },
        { status: 403 }
      )
    }

    // Utiliser le cache pour la balance (5 minutes)
    const balance = await getCachedBalance(coffreId, async () => {
      logger.info(`Calculating balance for coffre ${coffreId}`)

    // Récupérer le dernier inventaire
    const lastInventory = await prisma.inventory.findFirst({
      where: { coffreId },
      orderBy: { createdAt: "desc" },
    })

      let calculatedBalance = 0

      if (lastInventory) {
        // Si on a un inventaire, l'utiliser comme point de départ
        calculatedBalance = Number(lastInventory.totalAmount)

    // Calculer le solde : dernier inventaire + entrées - sorties depuis le dernier inventaire
    const movements = await prisma.movement.findMany({
      where: {
        coffreId,
            deletedAt: null, // Important : exclure les mouvements supprimés
        createdAt: { gte: lastInventory.createdAt },
        type: { in: ["ENTRY", "EXIT"] },
      },
    })

    movements.forEach((movement) => {
      if (movement.type === "ENTRY") {
            calculatedBalance += Number(movement.amount)
          } else if (movement.type === "EXIT") {
            calculatedBalance -= Number(movement.amount)
          }
        })
      } else {
        // Pas d'inventaire : calculer la balance à partir de tous les mouvements
        const allMovements = await prisma.movement.findMany({
          where: {
            coffreId,
            deletedAt: null, // Important : exclure les mouvements supprimés
            type: { in: ["ENTRY", "EXIT"] },
          },
          orderBy: { createdAt: "asc" },
        })

        allMovements.forEach((movement) => {
          if (movement.type === "ENTRY") {
            calculatedBalance += Number(movement.amount)
      } else if (movement.type === "EXIT") {
            calculatedBalance -= Number(movement.amount)
      }
        })
      }

      return calculatedBalance
    })

    // Récupérer les infos du dernier inventaire pour le retour
    const lastInventory = await prisma.inventory.findFirst({
      where: { coffreId },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({
      balance,
      lastInventoryDate: lastInventory?.createdAt || null,
      lastInventoryAmount: lastInventory ? Number(lastInventory.totalAmount) : 0,
    })
  } catch (error: any) {
    console.error("Erreur calcul balance:", error)
    return NextResponse.json(
      { error: error.message || "Erreur serveur" },
      { status: 500 }
    )
  }
}




