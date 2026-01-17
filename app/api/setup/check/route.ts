import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { publicRoute } from "@/lib/api-middleware"
import { API_RATE_LIMIT } from "@/lib/rate-limit"
import { handleApiError } from "@/lib/api-utils"

async function getHandler(_req: NextRequest) {
  try {
    // Vérifier si la table users existe
    try {
      const userCount = await prisma.user.count()
      return NextResponse.json({
        needsSetup: userCount === 0,
        userCount,
      })
    } catch (dbError: any) {
      // Si la table n'existe pas encore (erreur de table manquante)
      if (dbError?.code === "P2021" || dbError?.message?.includes("does not exist") || dbError?.message?.includes("Table")) {
        // La base de données n'est pas encore initialisée
        return NextResponse.json({
          needsSetup: true,
          userCount: 0,
          message: "Base de données non initialisée",
        })
      }
      // Autre erreur de base de données
      throw dbError
    }
  } catch (error) {
    // En cas d'erreur, permettre le setup par sécurité
    console.error("Erreur lors de la vérification du setup:", error)
    return NextResponse.json({
      needsSetup: true,
      userCount: 0,
      error: "Erreur de connexion à la base de données",
    })
  }
}

export const GET = publicRoute(getHandler, API_RATE_LIMIT)












