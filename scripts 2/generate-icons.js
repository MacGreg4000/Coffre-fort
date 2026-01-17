#!/usr/bin/env node

/**
 * Script pour générer les icônes PNG à partir de coffre-fort.png
 * Nécessite: npm install sharp --save-dev
 * Usage: node scripts/generate-icons.js
 */

const fs = require('fs');
const path = require('path');

// Vérifier si sharp est disponible
let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.error('❌ Le package "sharp" n\'est pas installé.');
  console.log('📦 Installation: npm install sharp --save-dev');
  console.log('\n💡 Alternative: Utilisez un outil en ligne comme:');
  console.log('   - https://realfavicongenerator.net/');
  console.log('   - https://www.appicongenerator.org/');
  console.log('   - https://favicon.io/favicon-converter/');
    console.log('\n   Téléchargez coffre-fort.png et générez les tailles suivantes:');
    console.log('   - favicon.ico (16x16, 32x32, 48x48)');
    console.log('   - icon-192x192.png');
    console.log('   - icon-512x512.png');
    console.log('   - apple-touch-icon.png (180x180)');
  process.exit(1);
}

const publicDir = path.join(__dirname, '..', 'public');
const sourceIconPath = path.join(publicDir, 'coffre-fort.png');

if (!fs.existsSync(sourceIconPath)) {
  console.error(`❌ Fichier source non trouvé: ${sourceIconPath}`);
  process.exit(1);
}

const sizes = [
  { name: 'favicon.ico', sizes: [16, 32, 48] },
  { name: 'icon-192x192.png', size: 192 },
  { name: 'icon-512x512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'favicon-16x16.png', size: 16 },
  { name: 'favicon-32x32.png', size: 32 },
];

async function generateIcons() {
  console.log('🎨 Génération des icônes à partir de coffre-fort.png...\n');

  try {
    // Générer favicon.ico (multi-taille)
    console.log('📦 Génération de favicon.ico...');
    const faviconSizes = sizes.find(s => s.name === 'favicon.ico').sizes;
    const faviconBuffers = await Promise.all(
      faviconSizes.map(size =>
        sharp(sourceIconPath)
          .resize(size, size, { fit: 'contain', background: { r: 10, g: 10, b: 10, alpha: 1 } })
          .png()
          .toBuffer()
      )
    );
    
    // Pour favicon.ico, on crée juste un PNG 32x32 (les navigateurs modernes acceptent PNG)
    await sharp(sourceIconPath)
      .resize(32, 32, { fit: 'contain', background: { r: 10, g: 10, b: 10, alpha: 1 } })
      .png()
      .toFile(path.join(publicDir, 'favicon.ico'));

    // Générer les autres tailles
    for (const icon of sizes) {
      if (icon.name === 'favicon.ico') continue;
      
      console.log(`📦 Génération de ${icon.name} (${icon.size}x${icon.size})...`);
      await sharp(sourceIconPath)
        .resize(icon.size, icon.size, { fit: 'contain', background: { r: 10, g: 10, b: 10, alpha: 1 } })
        .png()
        .toFile(path.join(publicDir, icon.name));
    }

    console.log('\n✅ Toutes les icônes ont été générées avec succès!');
    console.log('\n📁 Fichiers créés dans /public:');
    sizes.forEach(icon => {
      if (icon.name === 'favicon.ico') {
        console.log(`   - ${icon.name} (32x32)`);
      } else {
        console.log(`   - ${icon.name}`);
      }
    });
  } catch (error) {
    console.error('❌ Erreur lors de la génération:', error);
    process.exit(1);
  }
}

generateIcons();


