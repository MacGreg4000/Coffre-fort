#!/usr/bin/env ts-node
/**
 * Script pour réinitialiser complètement la base de données MySQL
 * ATTENTION: Ce script supprime TOUTES les données et tables
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function resetDatabase() {
  console.log('🔄 Réinitialisation de la base de données...\n')
  
  try {
    // Désactiver les contraintes de clés étrangères temporairement
    await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0;')
    
    // Liste des tables à supprimer (dans l'ordre inverse des dépendances)
    const tables = [
      'logs',
      'reserves',
      'password_files',
      'asset_documents',
      'asset_events',
      'assets',
      'inventory_details',
      'inventories',
      'movement_details',
      'movements',
      'coffre_members',
      'coffres',
      'users',
      '_prisma_migrations'
    ]
    
    console.log('🗑️  Suppression des tables...')
    for (const table of tables) {
      try {
        await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS \`${table}\`;`)
        console.log(`   ✓ Table ${table} supprimée`)
      } catch (error: any) {
        // Ignorer les erreurs si la table n'existe pas
        if (!error.message?.includes("doesn't exist")) {
          console.log(`   ⚠️  Erreur lors de la suppression de ${table}: ${error.message}`)
        }
      }
    }
    
    // Réactiver les contraintes
    await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1;')
    
    console.log('\n✅ Base de données réinitialisée avec succès!')
    console.log('\n📝 Prochaines étapes:')
    console.log('   1. Exécutez: npx prisma db push')
    console.log('   2. Accédez à /setup pour créer le premier administrateur')
    
  } catch (error: any) {
    console.error('\n❌ Erreur lors de la réinitialisation:', error.message)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Demander confirmation
console.log('⚠️  ATTENTION: Ce script va supprimer TOUTES les données de la base de données!')
console.log('   Base de données:', process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@') || 'non définie')
console.log('\n   Appuyez sur Ctrl+C pour annuler, ou attendez 5 secondes...\n')

setTimeout(() => {
  resetDatabase()
}, 5000)
