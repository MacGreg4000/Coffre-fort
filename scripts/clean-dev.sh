#!/bin/bash
# Script pour nettoyer le cache et redémarrer le serveur de développement

echo "🧹 Nettoyage du cache Next.js..."
rm -rf .next

echo "📦 Vérification des dépendances..."
npm install

echo "✅ Cache nettoyé !"
echo "🔄 Redémarrez maintenant le serveur avec: npm run dev"
