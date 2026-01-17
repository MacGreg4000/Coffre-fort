/**
 * Script pour réinitialiser le mot de passe d'un utilisateur admin
 * Usage: npx ts-node scripts/reset-admin-password.ts [email] [nouveau-mot-de-passe]
 */

import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  const email = process.argv[2] || "admin@safeguard.local"
  const newPassword = process.argv[3]

  if (!newPassword) {
    console.error("❌ Erreur: Vous devez fournir un nouveau mot de passe")
    console.log("\nUsage:")
    console.log("  npx ts-node scripts/reset-admin-password.ts [email] [nouveau-mot-de-passe]")
    console.log("\nExemple:")
    console.log("  npx ts-node scripts/reset-admin-password.ts admin@safeguard.local monNouveauMotDePasse")
    process.exit(1)
  }

  console.log(`Réinitialisation du mot de passe pour: ${email}`)

  // Vérifier si l'utilisateur existe
  const user = await prisma.user.findUnique({
    where: { email },
  })

  if (!user) {
    console.error(`❌ Erreur: Aucun utilisateur trouvé avec l'email "${email}"`)
    console.log("\nUtilisateurs existants:")
    const allUsers = await prisma.user.findMany({
      select: { email: true, name: true, role: true },
    })
    if (allUsers.length === 0) {
      console.log("  (Aucun utilisateur dans la base de données)")
    } else {
      allUsers.forEach((u) => {
        console.log(`  - ${u.email} (${u.name}) - ${u.role}`)
      })
    }
    process.exit(1)
  }

  if (user.role !== "ADMIN") {
    console.warn(`⚠️  Attention: L'utilisateur "${email}" n'est pas un ADMIN (rôle actuel: ${user.role})`)
    console.log("Le mot de passe sera quand même réinitialisé.")
  }

  // Vérifier la longueur du mot de passe
  if (newPassword.length < 8) {
    console.error("❌ Erreur: Le mot de passe doit contenir au moins 8 caractères")
    process.exit(1)
  }

  // Hasher le nouveau mot de passe
  const hashedPassword = await bcrypt.hash(newPassword, 12)

  // Mettre à jour le mot de passe
  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      isActive: true, // S'assurer que l'utilisateur est actif
    },
  })

  console.log("✅ Mot de passe réinitialisé avec succès!")
  console.log(`   Email: ${user.email}`)
  console.log(`   Nom: ${user.name}`)
  console.log(`   Rôle: ${user.role}`)
  console.log(`\n📝 Vous pouvez maintenant vous connecter avec le nouveau mot de passe.`)
}

main()
  .catch((e) => {
    console.error("❌ Erreur:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
