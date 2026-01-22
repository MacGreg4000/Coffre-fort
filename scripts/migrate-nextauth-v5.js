const fs = require('fs');
const path = require('path');

// Liste des fichiers à modifier
const filesToUpdate = [
  'app/api/assets/route.ts',
  'app/api/assets/[id]/route.ts',
  'app/api/assets/[id]/events/route.ts',
  'app/api/assets/[id]/events/[eventId]/route.ts',
  'app/api/assets/[id]/documents/route.ts',
  'app/api/assets/[id]/documents/[docId]/route.ts',
  'app/api/dashboard/route.ts',
  'app/api/admin/coffres/route.ts',
  'app/api/admin/coffres/members/route.ts',
  'app/api/admin/users/route.ts',
  'app/api/coffres/balance/route.ts',
  'app/api/csrf/token/route.ts',
  'app/api/export/offline/route.ts',
  'app/api/inventories/route.ts',
  'app/api/movements/route.ts',
  'app/api/movements/[id]/route.ts',
  'app/api/password-files/route.ts',
  'app/api/password-files/[id]/route.ts',
  'app/api/pdf/export/route.ts',
  'app/api/reserves/route.ts',
  'app/api/reserves/[id]/route.ts',
  'app/api/reserves/initialize/route.ts',
  'app/api/two-factor/status/route.ts',
  'app/api/two-factor/setup/route.ts',
  'app/api/two-factor/disable/route.ts',
  'app/api/two-factor/backup-codes/route.ts',
  'app/caisse/page.tsx',
  'app/dashboard/page.tsx',
  'app/password-files/page.tsx',
  'app/reserves/page.tsx',
  'app/admin/page.tsx',
  'app/actifs/page.tsx',
  'lib/api-middleware.ts'
];

function updateFile(filePath) {
  try {
    const fullPath = path.join(process.cwd(), filePath);
    if (!fs.existsSync(fullPath)) {
      console.log(`Fichier non trouvé: ${filePath}`);
      return;
    }

    let content = fs.readFileSync(fullPath, 'utf8');

    // Supprimer d'abord tous les imports authOptions
    content = content.replace(
      /import.*authOptions.*from.*["']@\/lib\/auth["']\s*;?/g,
      ''
    );

    // Remplacer les imports getServerSession
    content = content.replace(
      /import { getServerSession } from ["']next-auth["']\s*;?/g,
      'import { getServerSession } from "@/lib/auth"'
    );

    // Remplacer les appels getServerSession
    content = content.replace(
      /getServerSession\(authOptions\)/g,
      'getServerSession()'
    );

    fs.writeFileSync(fullPath, content);
    console.log(`✅ Mis à jour: ${filePath}`);
  } catch (error) {
    console.error(`❌ Erreur avec ${filePath}:`, error.message);
  }
}

console.log('🚀 Migration NextAuth v5 - Mise à jour des imports...');

filesToUpdate.forEach(updateFile);

console.log('✅ Migration terminée !');