# Icônes SafeGuard

Ce dossier contient toutes les icônes et favicons pour l'application SafeGuard.

## Fichiers

- **coffre-fort.png** : Source PNG principale pour générer toutes les icônes
- **favicon.ico** : Favicon classique (compatibilité anciens navigateurs)
- **favicon-16x16.png** : Favicon 16x16
- **favicon-32x32.png** : Favicon 32x32
- **apple-touch-icon.png** : Icône pour iPhone/iPad (180x180)
- **icon-192x192.png** : Icône PWA 192x192
- **icon-512x512.png** : Icône PWA 512x512

## Régénération des icônes

Si vous modifiez `coffre-fort.png`, vous pouvez régénérer toutes les icônes avec :

```bash
npm run generate-icons
```

Ou directement :

```bash
node scripts/generate-icons.js
```

## Notes

- Toutes les icônes sont générées automatiquement à partir de `coffre-fort.png`
- Les icônes sont optimisées pour l'affichage sur iPhone/iPad
- Les PNG sont générés pour la compatibilité maximale
