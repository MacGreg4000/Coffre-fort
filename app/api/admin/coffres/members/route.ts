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
    const { coffreId, userId, role } = body

    // Vérifier si le membre existe déjà
    const existing = await prisma.coffreMember.findUnique({
      where: {
        userId_coffreId: {
          userId,
          coffreId,
        },
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: "Cet utilisateur est déjà membre de ce coffre" },
        { status: 400 }
      )
    }

    // Créer le membre
    const member = await prisma.coffreMember.create({
      data: {
        coffreId,
        userId,
        role: role || "MEMBER",
      },
      include: {
        user: true,
        coffre: true,
      },
    })

    // Créer un log
    await prisma.log.create({
      data: {
        userId: session.user.id,
        coffreId,
        action: "MEMBER_ADDED",
        description: `${member.user.name} ajouté au coffre ${member.coffre.name}`,
        metadata: JSON.stringify({ role }),
      },
    })

    return NextResponse.json(member, { status: 201 })
  } catch (error: any) {
    console.error("Erreur ajout membre:", error)
    return NextResponse.json(
      { error: error.message || "Erreur serveur" },
      { status: 500 }
    )
  }
}

