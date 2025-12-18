import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    // Vérifier si au moins un utilisateur existe
    const userCount = await prisma.user.count()

    return NextResponse.json({
      needsSetup: userCount === 0,
      userCount,
    })
  } catch (error: any) {
    console.error("Erreur vérification setup:", error)
    return NextResponse.json(
      { error: "Erreur serveur", needsSetup: false },
      { status: 500 }
    )
  }
}












