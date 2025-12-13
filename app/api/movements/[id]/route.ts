import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { BILLET_DENOMINATIONS } from "@/lib/utils"

// Modifier un mouvement (uniquement pour les admins)
export async function PUT(
  req: NextRequest,
  { params }: { params?: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    // Vérifier que l'utilisateur est admin
    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Accès refusé. Seuls les administrateurs peuvent modifier les mouvements." },
        { status: 403 }
      )
    }

    const movementId = params?.id
    if (!movementId) {
      return NextResponse.json({ error: "Identifiant manquant" }, { status: 400 })
    }
    const body = await req.json()
    const { type, billets, description } = body

    // Vérifier que le mouvement existe
    const existingMovement = await prisma.movement.findUnique({
      where: { id: movementId },
      include: {
        coffre: true,
        details: true,
      },
    })

    if (!existingMovement) {
      return NextResponse.json(
        { error: "Mouvement introuvable" },
        { status: 404 }
      )
    }

    // Calculer le nouveau montant total
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

    // Supprimer les anciens détails
    await prisma.movementDetail.deleteMany({
      where: { movementId },
    })

    // Mettre à jour le mouvement
    const updatedMovement = await prisma.movement.update({
      where: { id: movementId },
      data: {
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
        user: true,
      },
    })

    // Créer un log
    await prisma.log.create({
      data: {
        userId: session.user.id,
        coffreId: existingMovement.coffreId,
        movementId: updatedMovement.id,
        action: "MOVEMENT_UPDATED",
        description: `Mouvement ${type} modifié: ${Math.abs(totalAmount)}€`,
        metadata: JSON.stringify({ 
          oldAmount: Number(existingMovement.amount),
          newAmount: Math.abs(totalAmount),
          billets, 
          type 
        }),
      },
    })

    // Convertir les Decimal en Number
    const serializedMovement = {
      ...updatedMovement,
      amount: Number(updatedMovement.amount),
      details: updatedMovement.details.map((d) => ({
        ...d,
        denomination: Number(d.denomination),
      })),
    }

    return NextResponse.json(serializedMovement)
  } catch (error: any) {
    console.error("Erreur modification mouvement:", error)
    return NextResponse.json(
      { error: error.message || "Erreur serveur" },
      { status: 500 }
    )
  }
}

// Supprimer un mouvement (uniquement pour les admins)
export async function DELETE(
  req: NextRequest,
  { params }: { params?: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    // Vérifier que l'utilisateur est admin
    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Accès refusé. Seuls les administrateurs peuvent supprimer les mouvements." },
        { status: 403 }
      )
    }

    const movementId = params?.id
    if (!movementId) {
      return NextResponse.json({ error: "Identifiant manquant" }, { status: 400 })
    }

    // Vérifier que le mouvement existe
    const existingMovement = await prisma.movement.findUnique({
      where: { id: movementId },
      include: {
        coffre: true,
      },
    })

    if (!existingMovement) {
      return NextResponse.json(
        { error: "Mouvement introuvable" },
        { status: 404 }
      )
    }

    // Créer un log avant la suppression
    await prisma.log.create({
      data: {
        userId: session.user.id,
        coffreId: existingMovement.coffreId,
        action: "MOVEMENT_DELETED",
        description: `Mouvement ${existingMovement.type} supprimé: ${Number(existingMovement.amount)}€`,
        metadata: JSON.stringify({ 
          movementId,
          type: existingMovement.type,
          amount: Number(existingMovement.amount),
        }),
      },
    })

    // Supprimer le mouvement (les détails seront supprimés automatiquement grâce à onDelete: Cascade)
    await prisma.movement.delete({
      where: { id: movementId },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Erreur suppression mouvement:", error)
    return NextResponse.json(
      { error: error.message || "Erreur serveur" },
      { status: 500 }
    )
  }
}

