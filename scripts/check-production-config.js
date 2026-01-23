/**
 * Script de vérification de la configuration de production
 * Usage: node scripts/check-production-config.js
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkProductionConfig() {
  console.log('🔍 Vérification de la configuration de production...\n');

  // 1. Vérifier les variables d'environnement essentielles
  console.log('📋 Variables d\'environnement:');
  const requiredEnvVars = [
    'DATABASE_URL',
    'NEXTAUTH_URL',
    'NEXTAUTH_SECRET',
    'NODE_ENV'
  ];

  requiredEnvVars.forEach(varName => {
    const value = process.env[varName];
    if (!value) {
      console.log(`   ❌ ${varName}: NON DÉFINI`);
    } else if (varName === 'NEXTAUTH_SECRET' && value.includes('change_in_production')) {
      console.log(`   ⚠️  ${varName}: VALEUR PAR DÉFAUT (À CHANGER EN PRODUCTION)`);
    } else if (varName === 'DATABASE_URL' && value.includes('your_secure_password')) {
      console.log(`   ⚠️  ${varName}: MOT DE PASSE PAR DÉFAUT (À CHANGER)`);
    } else {
      console.log(`   ✅ ${varName}: DÉFINI`);
    }
  });

  console.log('');

  // 2. Tester la connexion à la base de données
  console.log('🗄️  Test de connexion à la base de données:');
  const dbUrl = process.env.DATABASE_URL;

  if (!dbUrl) {
    console.log('   ❌ DATABASE_URL non défini - impossible de tester');
    return;
  }

  // Parser l'URL MySQL
  const urlMatch = dbUrl.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);

  if (!urlMatch) {
    console.log('   ❌ Format DATABASE_URL invalide');
    return;
  }

  const [, user, password, host, port, database] = urlMatch;

  let connection;
  try {
    console.log(`   Tentative de connexion à ${host}:${port}/${database}...`);
    connection = await mysql.createConnection({
      host,
      port: parseInt(port),
      user,
      password,
      database,
      connectTimeout: 10000,
    });

    console.log('   ✅ Connexion réussie');

    // Tester les tables essentielles
    const tables = ['users', 'coffres', 'inventories', 'movements'];
    console.log('\n📊 Vérification des tables:');

    for (const table of tables) {
      try {
        const [rows] = await connection.execute(`SELECT COUNT(*) as count FROM ${table}`);
        console.log(`   ✅ ${table}: ${rows[0].count} enregistrements`);
      } catch (error) {
        console.log(`   ❌ ${table}: ERREUR - ${error.message}`);
      }
    }

    // Vérifier les colonnes problématiques
    console.log('\n🏗️  Vérification des colonnes:');
    const columnChecks = [
      { table: 'inventories', column: 'date' },
      { table: 'coffres', column: 'balance' }
    ];

    for (const check of columnChecks) {
      try {
        const [rows] = await connection.execute(`
          SELECT COUNT(*) as exists_count
          FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = '${database}'
            AND TABLE_NAME = '${check.table}'
            AND COLUMN_NAME = '${check.column}'
        `);
        if (rows[0].exists_count > 0) {
          console.log(`   ✅ ${check.table}.${check.column}: existe`);
        } else {
          console.log(`   ❌ ${check.table}.${check.column}: MANQUANT`);
        }
      } catch (error) {
        console.log(`   ❌ ${check.table}.${check.column}: ERREUR - ${error.message}`);
      }
    }

  } catch (error) {
    console.log(`   ❌ Erreur de connexion: ${error.message}`);

    if (error.code === 'ECONNREFUSED') {
      console.log('   💡 Conseils:');
      console.log('      - Vérifiez que MariaDB/MySQL fonctionne sur le serveur');
      console.log('      - Vérifiez que le port est ouvert et accessible');
      console.log('      - Vérifiez les paramètres de firewall');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('   💡 Conseils:');
      console.log('      - Vérifiez le nom d\'utilisateur et le mot de passe');
      console.log('      - Vérifiez les permissions de l\'utilisateur');
    }
  } finally {
    if (connection) {
      await connection.end();
    }
  }

  console.log('\n🔧 Recommandations pour la production:');

  if (process.env.NODE_ENV !== 'production') {
    console.log('   ⚠️  Définir NODE_ENV=production');
  }

  if (process.env.NEXTAUTH_SECRET && process.env.NEXTAUTH_SECRET.includes('dev_')) {
    console.log('   ⚠️  Changer NEXTAUTH_SECRET pour un secret sécurisé en production');
  }

  console.log('   📝 Vérifiez que ces variables sont définies sur votre serveur Synology:');
  console.log('      - DATABASE_URL');
  console.log('      - NEXTAUTH_URL=https://safevault.secotech.synology.me');
  console.log('      - NEXTAUTH_SECRET');
  console.log('      - ENCRYPTION_KEY');
}

checkProductionConfig().catch(console.error);