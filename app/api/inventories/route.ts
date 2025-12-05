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
    const { coffreId, billets, notes } = body

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
        totalAmount += amount
        details.push({ denomination, quantity })
      }
    }

    // Créer l'inventaire
    const inventory = await prisma.inventory.create({
      data: {
        coffreId,
        totalAmount,
        notes,
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
        inventoryId: inventory.id,
        action: "INVENTORY_CREATED",
        description: `Inventaire de ${totalAmount}€`,
        metadata: JSON.stringify({ billets }),
      },
    })

    // Convertir les Decimal en Number
    const serializedInventory = {
      ...inventory,
      totalAmount: Number(inventory.totalAmount),
      details: inventory.details.map((d) => ({
        ...d,
        denomination: Number(d.denomination),
      })),
    }

    return NextResponse.json(serializedInventory, { status: 201 })
  } catch (error: any) {
    console.error("Erreur création inventaire:", error)
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

    const inventories = await prisma.inventory.findMany({
      where: {
        ...(coffreId && coffreIds.includes(coffreId)
          ? { coffreId }
          : { coffreId: { in: coffreIds } }),
      },
      include: {
        coffre: true,
        details: true,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    })

    // Convertir les Decimal en Number
    const serializedInventories = inventories.map((inv) => ({
      ...inv,
      totalAmount: Number(inv.totalAmount),
      details: inv.details.map((d) => ({
        ...d,
        denomination: Number(d.denomination),
      })),
    }))

    return NextResponse.json(serializedInventories)
  } catch (error: any) {
    console.error("Erreur récupération inventaires:", error)
    return NextResponse.json(
      { error: error.message || "Erreur serveur" },
      { status: 500 }
    )
  }
}



