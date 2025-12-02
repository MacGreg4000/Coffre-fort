import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { BILLET_DENOMINATIONS } from "@/lib/utils"

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const body = await req.json()
    const { coffreId, type, billets, description } = body

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

    // Calculer le montant total
    let totalAmount = 0
    const details: Array<{ denomination: number; quantity: number }> = []

    for (const denomination of BILLET_DENOMINATIONS) {
      const quantity = billets[denomination] || 0
      if (quantity > 0) {
        const amount = denomination * quantity
        if (type === "EXIT") {
          totalAmount -= amount
        } else {
          totalAmount += amount
        }
        details.push({ denomination, quantity })
      }
    }

    // Créer le mouvement
    const movement = await prisma.movement.create({
      data: {
        coffreId,
        userId: session.user.id,
        type,
        amount: Math.abs(totalAmount),
        description,
        details: {
          create: details.map((d) => ({
            denomination: d.denomination,
            quantity: d.quantity,
          })),
        },
      },
      include: {
        details: true,
        coffre: true,
      },
    })

    // Créer un log
    await prisma.log.create({
      data: {
        userId: session.user.id,
        coffreId,
        movementId: movement.id,
        action: "MOVEMENT_CREATED",
        description: `Mouvement ${type} de ${Math.abs(totalAmount)}€`,
        metadata: JSON.stringify({ billets, type }),
      },
    })

    return NextResponse.json(movement, { status: 201 })
  } catch (error: any) {
    console.error("Erreur création mouvement:", error)
    return NextResponse.json(
      { error: error.message || "Erreur serveur" },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const coffreId = searchParams.get("coffreId")

    // Récupérer les coffres accessibles
    const userCoffres = await prisma.coffreMember.findMany({
      where: { userId: session.user.id },
      select: { coffreId: true },
    })
    const coffreIds = userCoffres.map((uc) => uc.coffreId)

    const movements = await prisma.movement.findMany({
      where: {
        ...(coffreId && coffreIds.includes(coffreId)
          ? { coffreId }
          : { coffreId: { in: coffreIds } }),
      },
      include: {
        coffre: true,
        user: true,
        details: true,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    })

    return NextResponse.json(movements)
  } catch (error: any) {
    console.error("Erreur récupération mouvements:", error)
    return NextResponse.json(
      { error: error.message || "Erreur serveur" },
      { status: 500 }
    )
  }
}

