import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 })
    }

    const body = await req.json()
    const { name, description } = body

    // Créer le coffre
    const coffre = await prisma.coffre.create({
      data: {
        name,
        description,
      },
    })

    // Ajouter le créateur comme OWNER
    await prisma.coffreMember.create({
      data: {
        coffreId: coffre.id,
        userId: session.user.id,
        role: "OWNER",
      },
    })

    // Créer un log
    await prisma.log.create({
      data: {
        userId: session.user.id,
        coffreId: coffre.id,
        action: "COFFRE_CREATED",
        description: `Coffre ${name} créé`,
      },
    })

    return NextResponse.json(coffre, { status: 201 })
  } catch (error: any) {
    console.error("Erreur création coffre:", error)
    return NextResponse.json(
      { error: error.message || "Erreur serveur" },
      { status: 500 }
    )
  }
}


