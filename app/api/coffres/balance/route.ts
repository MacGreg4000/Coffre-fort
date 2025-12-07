import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

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

    // Récupérer le dernier inventaire
    const lastInventory = await prisma.inventory.findFirst({
      where: { coffreId },
      orderBy: { createdAt: "desc" },
    })

    // Si pas d'inventaire, retourner 0
    if (!lastInventory) {
      return NextResponse.json({ balance: 0, lastInventoryDate: null })
    }

    // Calculer le solde : dernier inventaire + entrées - sorties depuis le dernier inventaire
    const movements = await prisma.movement.findMany({
      where: {
        coffreId,
        createdAt: { gte: lastInventory.createdAt },
        type: { in: ["ENTRY", "EXIT"] },
      },
    })

    let balance = Number(lastInventory.totalAmount)
    movements.forEach((movement) => {
      if (movement.type === "ENTRY") {
        balance += Number(movement.amount)
      } else if (movement.type === "EXIT") {
        balance -= Number(movement.amount)
      }
    })

    return NextResponse.json({
      balance,
      lastInventoryDate: lastInventory.createdAt,
      lastInventoryAmount: Number(lastInventory.totalAmount),
    })
  } catch (error: any) {
    console.error("Erreur calcul balance:", error)
    return NextResponse.json(
      { error: error.message || "Erreur serveur" },
      { status: 500 }
    )
  }
}


