# Configuration PWA - SafeGuard

## Icônes requises

Pour que l'application fonctionne comme une Progressive Web App (PWA), vous devez créer deux icônes :

1. **icon-192x192.png** - 192x192 pixels
2. **icon-512x512.png** - 512x512 pixels

### Comment créer les icônes

1. **Option 1 : Outil en ligne**
   - Allez sur https://realfavicongenerator.net/
   - Uploadez votre logo SafeGuard
   - Générez les icônes aux bonnes tailles
   - Téléchargez et placez-les dans `/public/`

2. **Option 2 : Design manuel**
   - Créez une icône avec le logo SafeGuard (Wallet icon)
   - Fond : Noir (#0a0a0a)
   - Couleur principale : Or (#FFD700)
   - Format : PNG avec transparence
   - Tailles : 192x192 et 512x512 pixels

3. **Option 3 : Script automatique**
   ```bash
   # Si vous avez ImageMagick installé
   convert logo.png -resize 192x192 public/icon-192x192.png
   convert logo.png -resize 512x512 public/icon-512x512.png
   ```

## Installation sur smartphone

### iOS (Safari)
1. Ouvrez Safari sur votre iPhone/iPad
2. Allez sur l'URL de votre application
3. Appuyez sur le bouton "Partager" (carré avec flèche)
4. Sélectionnez "Sur l'écran d'accueil"
5. L'application apparaîtra comme une app native

### Android (Chrome)
1. Ouvrez Chrome sur votre Android
2. Allez sur l'URL de votre application
3. Appuyez sur le menu (3 points)
4. Sélectionnez "Ajouter à l'écran d'accueil"
5. L'application apparaîtra comme une app native

## Fonctionnalités PWA

- ✅ Installation sur l'écran d'accueil
- ✅ Mode standalone (sans barre d'adresse)
- ✅ Thème sombre optimisé
- ✅ Responsive design mobile-first
- ✅ Raccourcis vers Caisse et Dashboard
- ✅ Support des safe areas (iPhone avec encoche)

## Optimisations mobiles

- ✅ Menu hamburger pour navigation mobile
- ✅ Tailles de police adaptatives
- ✅ Inputs optimisés pour mobile (inputMode="numeric")
- ✅ Touch targets de 44x44px minimum
- ✅ Prévention du zoom sur focus (iOS)
- ✅ Animations optimisées avec Framer Motion






