#!/bin/bash
# Script pour nettoyer le cache et redémarrer le serveur de développement

echo "🧹 Nettoyage du cache Next.js..."
rm -rf .next
rm -rf node_modules/.cache

echo "📦 Vérification des dépendances..."
npm install

echo "🔄 Régénération du client Prisma..."
npx prisma generate

echo "✅ Cache nettoyé !"
echo "🔄 Redémarrez maintenant le serveur avec: npm run dev"
