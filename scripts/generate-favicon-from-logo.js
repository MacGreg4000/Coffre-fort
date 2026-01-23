#!/usr/bin/env node

/**
 * Script pour générer les favicons à partir de logo.webp
 * Usage: node scripts/generate-favicon-from-logo.js
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
  process.exit(1);
}

const rootDir = path.join(__dirname, '..');
const publicDir = path.join(rootDir, 'public');
const sourceLogoPath = path.join(rootDir, 'logo.webp');

if (!fs.existsSync(sourceLogoPath)) {
  console.error(`❌ Fichier source non trouvé: ${sourceLogoPath}`);
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
  console.log('🎨 Génération des favicons à partir de logo.webp...\n');

  try {
    // Générer favicon.ico (32x32 pour compatibilité)
    console.log('📦 Génération de favicon.ico...');
    await sharp(sourceLogoPath)
      .resize(32, 32, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .png()
      .toFile(path.join(publicDir, 'favicon.ico'));

    // Générer les autres tailles
    for (const icon of sizes) {
      if (icon.name === 'favicon.ico') continue;
      
      console.log(`📦 Génération de ${icon.name} (${icon.size}x${icon.size})...`);
      await sharp(sourceLogoPath)
        .resize(icon.size, icon.size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
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
