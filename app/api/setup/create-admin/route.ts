import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function POST(req: NextRequest) {
  try {
    // Vérifier qu'aucun utilisateur n'existe déjà
    const userCount = await prisma.user.count()
    
    if (userCount > 0) {
      return NextResponse.json(
        { error: "Un administrateur existe déjà. Utilisez la page de connexion." },
        { status: 403 }
      )
    }

    const body = await req.json()
    const { email, password, name } = body

    // Validation
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "Tous les champs sont requis" },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Le mot de passe doit contenir au moins 6 caractères" },
        { status: 400 }
      )
    }

    // Vérifier si l'email existe déjà (au cas où)
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "Cet email est déjà utilisé" },
        { status: 400 }
      )
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10)

    // Créer l'administrateur
    const admin = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: "ADMIN",
        isActive: true,
      },
    })

    // Créer un log
    await prisma.log.create({
      data: {
        userId: admin.id,
        action: "SETUP_COMPLETED",
        description: `Premier administrateur créé: ${name}`,
        metadata: JSON.stringify({ email, role: "ADMIN" }),
      },
    })

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
  } catch (error: any) {
    console.error("Erreur création admin:", error)
    return NextResponse.json(
      { error: error.message || "Erreur serveur" },
      { status: 500 }
    )
  }
}



