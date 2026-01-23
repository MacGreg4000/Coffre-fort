/**
 * Script pour supprimer tous les utilisateurs de la base de données
 * ATTENTION: Cette action est irréversible !
 * Usage: node scripts/reset-users.js
 */

const mysql = require('mysql2/promise');
const readline = require('readline');
require('dotenv').config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askConfirmation() {
  return new Promise((resolve) => {
    rl.question('⚠️  ATTENTION: Cette action va supprimer TOUS les utilisateurs de la base de données.\n   Cette action est IRRÉVERSIBLE !\n\n   Êtes-vous sûr de vouloir continuer ? (tapez "OUI" en majuscules pour confirmer): ', (answer) => {
      resolve(answer === 'OUI');
    });
  });
}

async function resetUsers() {
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

  console.log('🔄 Réinitialisation des utilisateurs...');
  console.log(`   Host: ${host}`);
  console.log(`   Port: ${port}`);
  console.log(`   Database: ${database}`);
  console.log('');

  // Demander confirmation
  const confirmed = await askConfirmation();
  rl.close();

  if (!confirmed) {
    console.log('❌ Opération annulée par l\'utilisateur.');
    process.exit(0);
  }

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

    // Compter les utilisateurs avant suppression
    const [countResult] = await connection.execute('SELECT COUNT(*) as user_count FROM users');
    const userCount = countResult[0].user_count;

    console.log(`📊 ${userCount} utilisateur(s) trouvé(s) dans la base.`);

    if (userCount === 0) {
      console.log('ℹ️  Aucun utilisateur à supprimer.');
      return;
    }

    // Lister les utilisateurs avant suppression
    const [users] = await connection.execute('SELECT id, email, name, role FROM users');
    console.log('👥 Utilisateurs qui vont être supprimés:');
    users.forEach(user => {
      console.log(`   - ${user.name} (${user.email}) - ${user.role}`);
    });

    // Supprimer tous les utilisateurs
    console.log('\n🗑️  Suppression de tous les utilisateurs...');
    await connection.execute('DELETE FROM users');

    // Vérifier que la suppression a réussi
    const [newCountResult] = await connection.execute('SELECT COUNT(*) as user_count FROM users');
    const newUserCount = newCountResult[0].user_count;

    console.log(`✅ Suppression terminée. Il reste ${newUserCount} utilisateur(s).`);

    if (newUserCount === 0) {
      console.log('');
      console.log('🎉 La base de données a été réinitialisée !');
      console.log('💡 Vous pouvez maintenant accéder à la page /setup pour créer le premier administrateur.');
      console.log(`   URL: http://localhost:3003/setup`);
    } else {
      console.log('⚠️  Certains utilisateurs n\'ont pas pu être supprimés.');
    }

  } catch (error) {
    console.error('❌ Erreur lors de la réinitialisation:');
    console.error(`   ${error.message}`);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

resetUsers();