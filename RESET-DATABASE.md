# 🔄 Réinitialisation de la Base de Données

## ⚠️ ATTENTION
Ce processus va **SUPPRIMER TOUTES LES DONNÉES** de la base de données MySQL.

## 📋 Étapes pour Réinitialiser la Base

### 1. Réinitialiser la Base de Données
```bash
# Exécuter le script de réinitialisation
npx ts-node scripts/reset-database.ts
```

Le script va:
- Supprimer toutes les tables existantes
- Laisser la base de données complètement vide

### 2. Créer les Tables (Schéma Prisma)
```bash
# Appliquer le schéma Prisma sur la base vide
npx prisma db push
```

Cette commande va créer toutes les tables selon le schéma Prisma.

### 3. Créer le Premier Administrateur
1. Accéder à `/setup` dans votre navigateur
2. Remplir le formulaire de création du premier admin
3. Le premier utilisateur créé sera automatiquement ADMIN

## ✅ Vérifications

Après la réinitialisation, vérifiez que:
- [ ] Les tables sont créées (`npx prisma db pull` pour vérifier)
- [ ] Vous pouvez accéder à `/setup`
- [ ] Vous pouvez créer le premier admin
- [ ] Vous pouvez vous connecter avec le compte admin créé

## 🔧 Dépannage

### Erreur "Table does not exist"
Si vous obtenez cette erreur après `prisma db push`:
```bash
# Vérifier que le schéma est correct
npx prisma validate

# Réessayer
npx prisma db push --force-reset
```

### Erreur de connexion MySQL
Vérifiez que `DATABASE_URL` dans `.env` est correct:
```env
DATABASE_URL="mysql://user:password@host:port/database"
```
