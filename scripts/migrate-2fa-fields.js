#!/usr/bin/env node

/**
 * Script de migration pour ajouter les champs 2FA à la table users
 * 
 * Ce script :
 * 1. Vérifie si les colonnes 2FA existent déjà
 * 2. Ajoute les colonnes manquantes
 * 3. Synchronise Prisma avec la base de données
 * 
 * Usage: node scripts/migrate-2fa-fields.js
 * OU: npm run migrate:2fa
 */

const mysql = require("mysql2/promise")
const { execSync } = require("child_process")
require("dotenv").config()

async function checkColumnExists(connection, tableName, columnName) {
  const [rows] = await connection.execute(
    `SELECT COUNT(*) as count 
     FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = ? 
     AND COLUMN_NAME = ?`,
    [tableName, columnName]
  )

  return rows[0].count > 0
}

async function addColumn(connection, tableName, columnName, columnDefinition) {
  const exists = await checkColumnExists(connection, tableName, columnName)
  
  if (exists) {
    console.log(`✓ Colonne ${columnName} existe déjà`)
    return false
  }

  console.log(`→ Ajout de la colonne ${columnName}...`)
  await connection.execute(
    `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`
  )
  console.log(`✓ Colonne ${columnName} ajoutée avec succès`)
  return true
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    console.error("❌ DATABASE_URL n'est pas défini dans les variables d'environnement")
    process.exit(1)
  }

  // Parser l'URL de la base de données
  // Format: mysql://user:password@host:port/database
  const urlMatch = databaseUrl.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/)
  
  if (!urlMatch) {
    console.error("❌ Format de DATABASE_URL invalide. Attendu: mysql://user:password@host:port/database")
    process.exit(1)
  }

  const [, user, password, host, port, database] = urlMatch

  console.log("🔧 Migration des champs 2FA pour la table users\n")
  console.log(`📊 Connexion à la base de données: ${host}:${port}/${database}\n`)

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

    console.log("✓ Connexion à la base de données établie\n")

    let hasChanges = false

    // Vérifier et ajouter les colonnes 2FA
    if (await addColumn(connection, "users", "twoFactorEnabled", "BOOLEAN DEFAULT FALSE NOT NULL")) {
      hasChanges = true
    }

    if (await addColumn(connection, "users", "twoFactorSecret", "VARCHAR(255) NULL")) {
      hasChanges = true
    }

    if (await addColumn(connection, "users", "twoFactorBackupCodes", "JSON NULL")) {
      hasChanges = true
    }

    if (await addColumn(connection, "users", "trustedDevices", "JSON NULL")) {
      hasChanges = true
    }

    console.log("\n✅ Toutes les colonnes 2FA ont été vérifiées/ajoutées !\n")

    // Fermer la connexion
    await connection.end()

    // Synchroniser Prisma seulement si des changements ont été faits
    if (hasChanges) {
      console.log("🔄 Synchronisation de Prisma avec la base de données...\n")
      
      try {
        execSync("npx prisma generate", { stdio: "inherit" })
        console.log("\n✅ Prisma Client régénéré avec succès !\n")
      } catch (error) {
        console.error("\n⚠️  Erreur lors de la régénération de Prisma Client")
        console.error("   Exécutez manuellement: npx prisma generate\n")
      }
    } else {
      console.log("ℹ️  Aucun changement nécessaire, Prisma est déjà à jour.\n")
    }

    console.log("🎉 Migration terminée avec succès !\n")
    console.log("📝 Prochaines étapes:")
    console.log("   1. Les champs 2FA sont maintenant disponibles dans la base de données")
    console.log("   2. Vous pouvez activer la 2FA depuis la page /settings")
    console.log("   3. Les utilisateurs pourront configurer leur authentification à deux facteurs\n")

  } catch (error) {
    console.error("\n❌ Erreur lors de la migration:")
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
