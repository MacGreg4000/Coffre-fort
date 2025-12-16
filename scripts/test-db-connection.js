/**
 * Script de test de connexion à la base de données
 * Usage: node scripts/test-db-connection.js
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function testConnection() {
  const dbUrl = process.env.DATABASE_URL;
  
  if (!dbUrl) {
    console.error('❌ DATABASE_URL non défini dans .env');
    process.exit(1);
  }

  // Parser l'URL MySQL
  const urlMatch = dbUrl.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
  
  if (!urlMatch) {
    console.error('❌ Format DATABASE_URL invalide');
    console.log('Format attendu: mysql://user:password@host:port/database');
    process.exit(1);
  }

  const [, user, password, host, port, database] = urlMatch;

  console.log('🔍 Test de connexion à la base de données...');
  console.log(`   Host: ${host}`);
  console.log(`   Port: ${port}`);
  console.log(`   Database: ${database}`);
  console.log(`   User: ${user}`);
  console.log('');

  try {
    const connection = await mysql.createConnection({
      host,
      port: parseInt(port),
      user,
      password,
      database,
      connectTimeout: 10000,
    });

    console.log('✅ Connexion réussie!');
    
    // Test de requête
    const [rows] = await connection.execute('SELECT 1 as test');
    console.log('✅ Test de requête réussi!');
    
    // Vérifier si la base existe
    const [databases] = await connection.execute('SHOW DATABASES');
    const dbExists = databases.some(db => db.Database === database);
    
    if (dbExists) {
      console.log(`✅ Base de données "${database}" existe`);
    } else {
      console.log(`⚠️  Base de données "${database}" n'existe pas`);
      console.log('   Créez-la avec: CREATE DATABASE ' + database + ' CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;');
    }

    // Vérifier les tables
    try {
      const [tables] = await connection.execute('SHOW TABLES');
      console.log(`✅ ${tables.length} table(s) trouvée(s)`);
    } catch (err) {
      console.log('⚠️  Impossible de lister les tables (base vide ou permissions)');
    }

    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur de connexion:');
    console.error(`   ${error.message}`);
    console.log('');
    
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('💡 Solutions possibles:');
      console.log('   1. Vérifiez que l\'utilisateur existe dans MariaDB');
      console.log('   2. Vérifiez le mot de passe');
      console.log('   3. Créez l\'utilisateur avec:');
      console.log(`      CREATE USER '${user}'@'%' IDENTIFIED BY '${password}';`);
      console.log(`      GRANT ALL PRIVILEGES ON ${database}.* TO '${user}'@'%';`);
      console.log('      FLUSH PRIVILEGES;');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('💡 Solutions possibles:');
      console.log('   1. Vérifiez que MariaDB est démarré sur le NAS');
      console.log('   2. Vérifiez que le port ' + port + ' est ouvert');
      console.log('   3. Vérifiez les paramètres de firewall sur Synology');
      console.log('   4. Essayez avec l\'adresse IP locale au lieu du domaine');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.log('💡 La base de données n\'existe pas. Créez-la avec:');
      console.log(`   CREATE DATABASE ${database} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    }
    
    process.exit(1);
  }
}

testConnection();









