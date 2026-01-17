#!/usr/bin/env ts-node

/**
 * Script de migration pour ajouter les champs 2FA à la table users
 * 
 * Ce script :
 * 1. Vérifie si les colonnes 2FA existent déjà
 * 2. Ajoute les colonnes manquantes
 * 3. Synchronise Prisma avec la base de données
 * 
 * Usage: npx ts-node scripts/migrate-2fa-fields.ts
 */

import { PrismaClient } from "@prisma/client"
import mysql from "mysql2/promise"

const prisma = new PrismaClient()

async function checkColumnExists(connection: mysql.Connection, tableName: string, columnName: string): Promise<boolean> {
  const [rows] = await connection.execute(
    `SELECT COUNT(*) as count 
     FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = ? 
     AND COLUMN_NAME = ?`,
    [tableName, columnName]
  ) as any[]

  return rows[0].count > 0
}

async function addColumn(
  connection: mysql.Connection,
  tableName: string,
  columnName: string,
  columnDefinition: string
): Promise<void> {
  const exists = await checkColumnExists(connection, tableName, columnName)
  
  if (exists) {
    console.log(`✓ Colonne ${columnName} existe déjà`)
    return
  }

  console.log(`→ Ajout de la colonne ${columnName}...`)
  await connection.execute(
    `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`
  )
  console.log(`✓ Colonne ${columnName} ajoutée avec succès`)
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    console.error("❌ DATABASE_URL n'est pas défini dans les variables d'environnement")
    process.exit(1)
  }

  // Parser l'URL de la base de données
  const url = new URL(databaseUrl.replace("mysql://", "http://"))
  const host = url.hostname
  const port = parseInt(url.port) || 3306
  const user = url.username
  const password = url.password
  const database = url.pathname.replace("/", "")

  console.log("🔧 Migration des champs 2FA pour la table users\n")
  console.log(`📊 Connexion à la base de données: ${host}:${port}/${database}\n`)

  let connection: mysql.Connection | null = null

  try {
    // Créer la connexion MySQL
    connection = await mysql.createConnection({
      host,
      port,
      user,
      password,
      database,
    })

    console.log("✓ Connexion à la base de données établie\n")

    // Vérifier et ajouter les colonnes 2FA
    await addColumn(
      connection,
      "users",
      "twoFactorEnabled",
      "BOOLEAN DEFAULT FALSE NOT NULL"
    )

    await addColumn(
      connection,
      "users",
      "twoFactorSecret",
      "VARCHAR(255) NULL"
    )

    await addColumn(
      connection,
      "users",
      "twoFactorBackupCodes",
      "JSON NULL"
    )

    await addColumn(
      connection,
      "users",
      "trustedDevices",
      "JSON NULL"
    )

    console.log("\n✅ Toutes les colonnes 2FA ont été ajoutées avec succès !\n")

    // Fermer la connexion
    await connection.end()

    // Synchroniser Prisma
    console.log("🔄 Synchronisation de Prisma avec la base de données...\n")
    
    const { execSync } = require("child_process")
    
    try {
      execSync("npx prisma generate", { stdio: "inherit" })
      console.log("\n✅ Prisma Client régénéré avec succès !\n")
    } catch (error) {
      console.error("\n⚠️  Erreur lors de la régénération de Prisma Client")
      console.error("   Exécutez manuellement: npx prisma generate\n")
    }

    console.log("🎉 Migration terminée avec succès !\n")
    console.log("📝 Prochaines étapes:")
    console.log("   1. Les champs 2FA sont maintenant disponibles dans la base de données")
    console.log("   2. Vous pouvez activer la 2FA depuis la page /settings")
    console.log("   3. Les utilisateurs pourront configurer leur authentification à deux facteurs\n")

  } catch (error) {
    console.error("\n❌ Erreur lors de la migration:")
    console.error(error)
    
    if (connection) {
      await connection.end().catch(() => {})
    }
    
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Exécuter le script
main().catch((error) => {
  console.error("Erreur fatale:", error)
  process.exit(1)
})
