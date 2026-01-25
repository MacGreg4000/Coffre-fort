import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { publicRoute } from "@/lib/api-middleware"
import { SETUP_RATE_LIMIT } from "@/lib/rate-limit"
import { ApiError, createAuditLog, handleApiError } from "@/lib/api-utils"
import { createUserSchema, validateRequest } from "@/lib/validations"

async function postHandler(req: NextRequest) {
  try {
    // Vérifier qu'aucun utilisateur n'existe déjà
    let userCount = 0
    try {
      userCount = await prisma.user.count()
    } catch (dbError: any) {
      // Si la table n'existe pas encore (erreur de table manquante)
      if (dbError?.code === "P2021" || dbError?.message?.includes("does not exist") || dbError?.message?.includes("Table")) {
        // La base de données n'est pas encore initialisée - permettre la création du premier admin
        console.warn("Base de données non initialisée, création du premier admin autorisée")
      } else {
        // Autre erreur de base de données
        throw dbError
      }
    }
    
    if (userCount > 0) {
      throw new ApiError(403, "Un administrateur existe déjà. Utilisez la page de connexion.")
    }

    const body = await req.json()
    
    // Validation: réutiliser les règles fortes de création d'utilisateur
    const validation = validateRequest(createUserSchema, body)
    if (!validation.success) {
      throw new ApiError(400, validation.error)
    }

    const { email, password, name } = validation.data

    // Vérifier si l'email existe déjà (au cas où)
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      throw new ApiError(409, "Cet email est déjà utilisé")
    }

    // Hasher le mot de passe (aligné avec /api/admin/users)
    const hashedPassword = await bcrypt.hash(password, 12)

    // Créer l'admin (sans transaction pour éviter les problèmes si la table logs n'existe pas)
    const admin = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: "ADMIN",
        isActive: true,
      },
    })

    // Essayer de créer un log d'audit (peut échouer si la table n'existe pas encore)
    try {
      await createAuditLog({
        userId: admin.id,
        action: "SETUP_COMPLETED",
        description: `Premier administrateur créé: ${name}`,
        metadata: { email, role: "ADMIN" },
        req,
      })
    } catch (logError: any) {
      // L'erreur est déjà gérée dans createAuditLog, mais on log pour info
      console.warn("Log d'audit non créé (normal si table logs n'existe pas encore)")
    }

    return NextResponse.json(
      {
        success: true,
        message: "Administrateur créé avec succès",
        user: {
          id: admin.id,
          email: admin.email,
          name: admin.name,
          role: admin.role,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    return handleApiError(error)
  }
}

export const POST = publicRoute(postHandler, SETUP_RATE_LIMIT)











