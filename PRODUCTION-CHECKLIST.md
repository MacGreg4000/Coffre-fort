# ✅ Checklist de Mise en Production - SafeVault

## 🔧 Configuration Base de Données

### 1. Configuration MySQL
- [ ] Vérifier que `DATABASE_URL` est correctement configuré dans `.env`
- [ ] Format attendu: `mysql://user:password@host:port/database`
- [ ] Tester la connexion: `npx prisma db pull`

### 2. Migrations Prisma
```bash
# Générer le client Prisma
npx prisma generate

# Appliquer les migrations (production)
npx prisma migrate deploy

# OU si première fois, créer les tables
npx prisma db push
```

### 3. Vérifier les tables
Les tables suivantes doivent exister:
- `users`
- `coffres`
- `coffre_members`
- `movements`
- `movement_details`
- `inventories`
- `inventory_details`
- `assets`
- `asset_events`
- `asset_documents`
- `password_files`
- `reserves`
- `logs`

## 🔐 Configuration NextAuth

### Variables d'environnement requises
- [ ] `NEXTAUTH_URL` - URL publique de l'application (ex: `https://safevault.secotech.synology.me`)
- [ ] `NEXTAUTH_SECRET` - Clé secrète (générer avec: `openssl rand -base64 32`)

### Vérifications
- [ ] Tous les appels `getServerSession()` utilisent `authOptions`
- [ ] Les callbacks JWT et session fonctionnent correctement
- [ ] Le rôle utilisateur est correctement récupéré

## 🛡️ Sécurité

### Variables d'environnement
- [ ] `ENCRYPTION_KEY` - Clé de chiffrement (32+ caractères, générer avec: `openssl rand -base64 32`)
- [ ] `NODE_ENV=production`

### Vérifications CSRF
- [ ] Les tokens CSRF sont générés et validés correctement
- [ ] En production, la vérification CSRF est active
- [ ] Les cookies CSRF sont sécurisés (httpOnly, secure, sameSite)

## 📡 Routes API - Vérifications

### Routes critiques vérifiées
- [x] `/api/setup/create-admin` - Gère l'absence de tables
- [x] `/api/admin/coffres/members` - Clé composite corrigée (`coffreId_userId`)
- [x] `/api/assets` - Validation CUID au lieu d'UUID
- [x] `/api/assets/[id]` - Validation CUID au lieu d'UUID
- [x] `/api/movements` - Clé composite correcte
- [x] `/api/inventories` - Clé composite correcte
- [x] `/api/coffres/balance` - Clé composite correcte
- [x] `/api/reserves` - Champs `released` et `notes` ajoutés

### Clés composites Prisma
Toutes les routes utilisent maintenant `coffreId_userId` (ordre correct selon le schéma):
```prisma
@@unique([coffreId, userId])
```

## 🧪 Tests de Production

### Script de vérification
```bash
# Exécuter le script de vérification
npx ts-node scripts/check-production-readiness.ts
```

### Tests manuels à effectuer
1. [ ] Création du premier admin (`/setup`)
2. [ ] Connexion avec compte admin
3. [ ] Accès à la page admin (`/admin`)
4. [ ] Création d'un coffre
5. [ ] Ajout d'un membre à un coffre
6. [ ] Création d'un mouvement
7. [ ] Création d'un inventaire
8. [ ] Création d'un actif
9. [ ] Modification d'une réserve
10. [ ] Export offline

## 🚀 Déploiement

### Étapes finales
1. [ ] Vérifier que toutes les variables d'environnement sont définies
2. [ ] Exécuter `npx prisma migrate deploy` pour créer les tables
3. [ ] Vérifier les logs pour les erreurs
4. [ ] Tester l'authentification
5. [ ] Tester les routes API principales
6. [ ] Vérifier les performances (cache, index)

## 📝 Notes Importantes

### Problèmes corrigés
- ✅ Clé composite `coffreId_userId` corrigée dans toutes les routes
- ✅ Validation CUID au lieu d'UUID
- ✅ Gestion des erreurs de base de données (tables manquantes)
- ✅ NextAuth configuré avec fallback DB pour les rôles
- ✅ CSRF configuré pour développement et production

### Points d'attention
- La base de données MySQL doit être accessible depuis le serveur
- Les migrations Prisma doivent être appliquées avant le premier démarrage
- Le fichier `.env` doit contenir toutes les variables requises
- En production, `NODE_ENV=production` doit être défini
