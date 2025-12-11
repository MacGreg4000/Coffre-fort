/**
 * Script pour créer un utilisateur admin
 * Usage: npx ts-node scripts/create-admin.ts
 */

import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  const email = process.argv[2] || "admin@safeguard.local"
  const password = process.argv[3] || "admin123"
  const name = process.argv[4] || "Administrateur"

  console.log(`Création de l'utilisateur admin: ${email}`)

  // Vérifier si l'utilisateur existe déjà
  const existing = await prisma.user.findUnique({
    where: { email },
  })

  if (existing) {
    console.log("❌ Cet utilisateur existe déjà!")
    process.exit(1)
  }

  // Hasher le mot de passe
  const hashedPassword = await bcrypt.hash(password, 10)

  // Créer l'utilisateur
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
      role: "ADMIN",
    },
  })

  console.log("✅ Utilisateur admin créé avec succès!")
  console.log(`   Email: ${user.email}`)
  console.log(`   Nom: ${user.name}`)
  console.log(`   Rôle: ${user.role}`)
  console.log(`\n⚠️  N'oubliez pas de changer le mot de passe après la première connexion!`)
}

main()
  .catch((e) => {
    console.error("❌ Erreur:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })






