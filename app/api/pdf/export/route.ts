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
    const type = searchParams.get("type")
    const id = searchParams.get("id")

    if (!type || !id) {
      return NextResponse.json(
        { error: "Paramètres manquants" },
        { status: 400 }
      )
    }

    // Récupérer les données
    let data: any
    if (type === "movement") {
      data = await prisma.movement.findUnique({
        where: { id },
        include: {
          coffre: true,
          user: true,
          details: true,
        },
      })
    } else if (type === "inventory") {
      data = await prisma.inventory.findUnique({
        where: { id },
        include: {
          coffre: true,
          details: true,
        },
      })
    } else {
      return NextResponse.json({ error: "Type invalide" }, { status: 400 })
    }

    if (!data) {
      return NextResponse.json({ error: "Non trouvé" }, { status: 404 })
    }

    // Vérifier l'accès
    const userCoffres = await prisma.coffreMember.findMany({
      where: { userId: session.user.id },
      select: { coffreId: true },
    })
    const coffreIds = userCoffres.map((uc) => uc.coffreId)

    if (!coffreIds.includes(data.coffreId)) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
    }

    // Appeler le service Puppeteer distant
    const puppeteerUrl = process.env.PUPPETEER_BROWSER_URL || "http://localhost:3001"
    
    const response = await fetch(`${puppeteerUrl}/generate-pdf`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type,
        data,
      }),
    })

    if (!response.ok) {
      throw new Error("Erreur service PDF")
    }

    const pdfBuffer = await response.arrayBuffer()

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${type}-${id}.pdf"`,
      },
    })
  } catch (error: any) {
    console.error("Erreur export PDF:", error)
    return NextResponse.json(
      { error: error.message || "Erreur serveur" },
      { status: 500 }
    )
  }
}


