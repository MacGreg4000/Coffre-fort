# Icônes SafeGuard

Ce dossier contient toutes les icônes et favicons pour l'application SafeGuard.

## Fichiers

- **favicon.svg** : Favicon SVG moderne (utilisé par les navigateurs modernes)
- **favicon.ico** : Favicon classique (compatibilité anciens navigateurs)
- **favicon-16x16.png** : Favicon 16x16
- **favicon-32x32.png** : Favicon 32x32
- **apple-touch-icon.png** : Icône pour iPhone/iPad (180x180)
- **icon-192x192.png** : Icône PWA 192x192
- **icon-512x512.png** : Icône PWA 512x512
- **icon.svg** : Source SVG pour générer toutes les icônes

## Régénération des icônes

Si vous modifiez `icon.svg`, vous pouvez régénérer toutes les icônes avec :

```bash
npm run generate-icons
```

Ou directement :

```bash
node scripts/generate-icons.js
```

## Design

L'icône représente un coffre-fort avec :
- Un design moderne en bleu (#3B82F6)
- Une serrure centrale
- Des coins arrondis
- Un fond sombre (#0a0a0a)

## Notes

- Les icônes sont optimisées pour l'affichage sur iPhone/iPad
- Le favicon SVG est utilisé en priorité par les navigateurs modernes
- Les PNG sont générés pour la compatibilité maximale

