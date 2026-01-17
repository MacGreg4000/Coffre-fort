#!/usr/bin/env node

/**
 * Script pour réinitialiser complètement la base de données
 * 
 * ⚠️ ATTENTION: Ce script supprime TOUTES les données et tables existantes !
 * 
 * Usage: node scripts/reset-database.js
 * OU: npm run db:reset
 */

const mysql = require("mysql2/promise")
const { execSync } = require("child_process")
require("dotenv").config()

async function main() {
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    console.error("❌ DATABASE_URL n'est pas défini dans les variables d'environnement")
    process.exit(1)
  }

  // Parser l'URL de la base de données
  const urlMatch = databaseUrl.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/)
  
  if (!urlMatch) {
    console.error("❌ Format de DATABASE_URL invalide. Attendu: mysql://user:password@host:port/database")
    process.exit(1)
  }

  const [, user, password, host, port, database] = urlMatch

  console.log("⚠️  RÉINITIALISATION COMPLÈTE DE LA BASE DE DONNÉES\n")
  console.log(`📊 Base de données: ${host}:${port}/${database}\n`)
  console.log("⚠️  ATTENTION: Toutes les données seront supprimées !\n")

  // Demander confirmation
  const readline = require("readline")
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  const answer = await new Promise((resolve) => {
    rl.question("Êtes-vous sûr de vouloir continuer ? (tapez 'OUI' pour confirmer): ", resolve)
  })

  rl.close()

  if (answer !== "OUI") {
    console.log("\n❌ Opération annulée.\n")
    process.exit(0)
  }

  let connection = null

  try {
    // Créer la connexion MySQL
    connection = await mysql.createConnection({
      host,
      port: parseInt(port),
      user,
      password,
      database,
    })

    console.log("\n✓ Connexion à la base de données établie\n")

    // Récupérer la liste de toutes les tables
    console.log("→ Récupération de la liste des tables...")
    const [tables] = await connection.execute(
      `SELECT TABLE_NAME 
       FROM INFORMATION_SCHEMA.TABLES 
       WHERE TABLE_SCHEMA = ? 
       AND TABLE_TYPE = 'BASE TABLE'`,
      [database]
    )

    if (tables.length === 0) {
      console.log("✓ Aucune table à supprimer\n")
    } else {
      console.log(`→ Suppression de ${tables.length} table(s)...\n`)

      // Désactiver temporairement les vérifications de clés étrangères
      await connection.execute("SET FOREIGN_KEY_CHECKS = 0")

      // Supprimer toutes les tables
      for (const table of tables) {
        const tableName = table.TABLE_NAME
        console.log(`  → Suppression de la table: ${tableName}`)
        await connection.execute(`DROP TABLE IF EXISTS \`${tableName}\``)
      }

      // Réactiver les vérifications de clés étrangères
      await connection.execute("SET FOREIGN_KEY_CHECKS = 1")

      console.log("\n✓ Toutes les tables ont été supprimées\n")
    }

    // Fermer la connexion
    await connection.end()

    // Recréer la base de données avec Prisma
    console.log("🔄 Recréation de la base de données avec Prisma...\n")

    try {
      execSync("npx prisma db push --force-reset --accept-data-loss", { 
        stdio: "inherit",
        env: { ...process.env }
      })
      console.log("\n✅ Base de données recréée avec succès !\n")
    } catch (error) {
      console.error("\n❌ Erreur lors de la recréation de la base de données")
      console.error("   Essayez manuellement: npx prisma db push --force-reset --accept-data-loss\n")
      process.exit(1)
    }

    // Régénérer le client Prisma
    console.log("🔄 Régénération du client Prisma...\n")
    
    try {
      execSync("npx prisma generate", { stdio: "inherit" })
      console.log("\n✅ Prisma Client régénéré avec succès !\n")
    } catch (error) {
      console.error("\n⚠️  Erreur lors de la régénération de Prisma Client")
      console.error("   Exécutez manuellement: npx prisma generate\n")
    }

    console.log("🎉 Réinitialisation terminée avec succès !\n")
    console.log("📝 Prochaines étapes:")
    console.log("   1. La base de données est maintenant vide avec le schéma complet (incluant 2FA)")
    console.log("   2. Créez un administrateur avec: npm run setup:admin")
    console.log("   3. Vous pouvez maintenant utiliser toutes les fonctionnalités, y compris la 2FA\n")

  } catch (error) {
    console.error("\n❌ Erreur lors de la réinitialisation:")
    console.error(error.message || error)
    
    if (connection) {
      await connection.end().catch(() => {})
    }
    
    process.exit(1)
  }
}

// Exécuter le script
main().catch((error) => {
  console.error("Erreur fatale:", error)
  process.exit(1)
})
