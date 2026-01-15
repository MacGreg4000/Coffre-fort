#!/bin/bash
# Script de nettoyage et rebuild pour SafeVault
# Usage: ./scripts/clean-build.sh

echo "🧹 Nettoyage du cache Next.js..."
rm -rf .next

echo "📦 Rebuild de l'application..."
npm run build

echo "✅ Nettoyage terminé !"
