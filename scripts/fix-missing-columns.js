/**
 * Script pour ajouter les colonnes manquantes aux tables inventories et coffres
 * Usage: node scripts/fix-missing-columns.js
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function fixMissingColumns() {
  const dbUrl = process.env.DATABASE_URL;

  if (!dbUrl) {
    console.error('❌ DATABASE_URL non défini dans .env');
    process.exit(1);
  }

  // Parser l'URL MySQL
  const urlMatch = dbUrl.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);

  if (!urlMatch) {
    console.error('❌ Format DATABASE_URL invalide');
    process.exit(1);
  }

  const [, user, password, host, port, database] = urlMatch;

  console.log('🔧 Correction des colonnes manquantes...');
  console.log(`   Host: ${host}`);
  console.log(`   Port: ${port}`);
  console.log(`   Database: ${database}`);
  console.log('');

  let connection;
  try {
    connection = await mysql.createConnection({
      host,
      port: parseInt(port),
      user,
      password,
      database,
      connectTimeout: 10000,
    });

    console.log('✅ Connexion réussie!');

    console.log('🔍 Vérification et ajout des colonnes manquantes...');

    // Vérifier si la colonne 'date' existe dans inventories
    console.log('   Vérification de inventories.date...');
    const [dateExists] = await connection.execute(`
      SELECT COUNT(*) as count
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'safeguard_db'
        AND TABLE_NAME = 'inventories'
        AND COLUMN_NAME = 'date'
    `);

    if (dateExists[0].count === 0) {
      console.log('   ➕ Ajout de la colonne date à inventories...');
      await connection.execute(`
        ALTER TABLE inventories
        ADD COLUMN \`date\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      `);
      console.log('   ✅ Colonne date ajoutée à inventories');
    } else {
      console.log('   ✅ Colonne date existe déjà dans inventories');
    }

    // Vérifier si la colonne 'balance' existe dans coffres
    console.log('   Vérification de coffres.balance...');
    const [balanceExists] = await connection.execute(`
      SELECT COUNT(*) as count
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'safeguard_db'
        AND TABLE_NAME = 'coffres'
        AND COLUMN_NAME = 'balance'
    `);

    if (balanceExists[0].count === 0) {
      console.log('   ➕ Ajout de la colonne balance à coffres...');
      await connection.execute(`
        ALTER TABLE coffres
        ADD COLUMN \`balance\` FLOAT NOT NULL DEFAULT 0
      `);
      console.log('   ✅ Colonne balance ajoutée à coffres');
    } else {
      console.log('   ✅ Colonne balance existe déjà dans coffres');
    }

    console.log('');
    console.log('📊 État final des colonnes:');
    console.log(`   inventories.date: ${dateExists[0].count > 0 ? '✅ EXISTS' : '❌ MISSING'}`);
    console.log(`   coffres.balance: ${balanceExists[0].count > 0 ? '✅ EXISTS' : '❌ MISSING'}`);

    if (dateExists[0].count > 0 && balanceExists[0].count > 0) {
      console.log('');
      console.log('🎉 Toutes les colonnes manquantes ont été ajoutées!');
      console.log('💡 Vous pouvez maintenant redémarrer votre application.');
    } else {
      console.log('');
      console.log('⚠️  Certaines colonnes sont encore manquantes. Vérifiez les erreurs ci-dessus.');
    }

  } catch (error) {
    console.error('❌ Erreur lors de la correction:');
    console.error(`   ${error.message}`);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

fixMissingColumns();