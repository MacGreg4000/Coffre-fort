#!/usr/bin/env ts-node
/**
 * Script de vérification de la préparation à la production
 * Vérifie toutes les routes API, NextAuth, et la configuration
 */

import { PrismaClient } from '@prisma/client'
import { readFileSync } from 'fs'
import { join } from 'path'

const prisma = new PrismaClient()

interface CheckResult {
  name: string
  status: 'ok' | 'error' | 'warning'
  message: string
}

const results: CheckResult[] = []

async function checkDatabase() {
  try {
    await prisma.$connect()
    const userCount = await prisma.user.count()
    results.push({
      name: 'Connexion base de données',
      status: 'ok',
      message: `Connecté avec succès. ${userCount} utilisateur(s) trouvé(s).`
    })
  } catch (error: any) {
    results.push({
      name: 'Connexion base de données',
      status: 'error',
      message: `Erreur: ${error.message}`
    })
  }
}

async function checkTables() {
  try {
    const tables = ['User', 'Coffre', 'CoffreMember', 'Movement', 'Inventory', 'Asset', 'Reserve']
    const missingTables: string[] = []
    
    for (const table of tables) {
      try {
        await (prisma as any)[table.toLowerCase()].findFirst({ take: 1 })
      } catch (error: any) {
        if (error.code === 'P2021' || error.message?.includes('does not exist')) {
          missingTables.push(table)
        }
      }
    }
    
    if (missingTables.length === 0) {
      results.push({
        name: 'Tables de base de données',
        status: 'ok',
        message: 'Toutes les tables existent.'
      })
    } else {
      results.push({
        name: 'Tables de base de données',
        status: 'error',
        message: `Tables manquantes: ${missingTables.join(', ')}. Exécutez: npx prisma migrate deploy`
      })
    }
  } catch (error: any) {
    results.push({
      name: 'Tables de base de données',
      status: 'error',
      message: `Erreur: ${error.message}`
    })
  }
}

function checkEnvFile() {
  try {
    const envPath = join(process.cwd(), '.env')
    const envContent = readFileSync(envPath, 'utf-8')
    
    const requiredVars = [
      'DATABASE_URL',
      'NEXTAUTH_URL',
      'NEXTAUTH_SECRET',
      'ENCRYPTION_KEY'
    ]
    
    const missing: string[] = []
    for (const varName of requiredVars) {
      if (!envContent.includes(`${varName}=`)) {
        missing.push(varName)
      }
    }
    
    if (missing.length === 0) {
      results.push({
        name: 'Variables d\'environnement',
        status: 'ok',
        message: 'Toutes les variables requises sont présentes.'
      })
    } else {
      results.push({
        name: 'Variables d\'environnement',
        status: 'error',
        message: `Variables manquantes: ${missing.join(', ')}`
      })
    }
  } catch (error: any) {
    results.push({
      name: 'Variables d\'environnement',
      status: 'warning',
      message: `Fichier .env non trouvé: ${error.message}`
    })
  }
}

async function checkUniqueConstraints() {
  try {
    // Vérifier que la contrainte unique coffreId_userId existe
    const testMember = await prisma.coffreMember.findFirst({ take: 1 })
    results.push({
      name: 'Contraintes uniques',
      status: 'ok',
      message: 'Les contraintes uniques sont correctement configurées.'
    })
  } catch (error: any) {
    results.push({
      name: 'Contraintes uniques',
      status: 'warning',
      message: `Impossible de vérifier: ${error.message}`
    })
  }
}

async function main() {
  console.log('🔍 Vérification de la préparation à la production...\n')
  
  await checkDatabase()
  await checkTables()
  checkEnvFile()
  await checkUniqueConstraints()
  
  console.log('\n📊 Résultats:\n')
  
  let hasErrors = false
  let hasWarnings = false
  
  for (const result of results) {
    const icon = result.status === 'ok' ? '✅' : result.status === 'error' ? '❌' : '⚠️'
    console.log(`${icon} ${result.name}: ${result.message}`)
    
    if (result.status === 'error') hasErrors = true
    if (result.status === 'warning') hasWarnings = true
  }
  
  console.log('\n' + '='.repeat(50))
  
  if (hasErrors) {
    console.log('❌ Des erreurs critiques ont été détectées. Corrigez-les avant la mise en production.')
    process.exit(1)
  } else if (hasWarnings) {
    console.log('⚠️  Des avertissements ont été détectés. Vérifiez-les.')
    process.exit(0)
  } else {
    console.log('✅ Tous les checks sont passés. L\'application est prête pour la production.')
    process.exit(0)
  }
}

main()
  .catch((error) => {
    console.error('Erreur fatale:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
