# SafeGuard - Gestion de Fonds de Caisse

Application de gestion de fonds de caisse pour Synology avec MariaDB.

## 🚀 Stack Technique

- **Framework**: Next.js 15 (App Router)
- **Base de données**: MariaDB 10
- **ORM**: Prisma
- **Authentification**: NextAuth.js
- **UI**: Tailwind CSS + Framer Motion
- **Graphiques**: Recharts
- **PDF**: Puppeteer distant (port 3001)

## 📋 Prérequis

- Node.js (installé via Centre de Paquets Synology)
- MariaDB 10 sur Synology (port 3306 ou 3307)
- PM2 pour la gestion des processus

## 🔧 Installation

### 1. Configuration de la base de données

Créez la base de données sur votre NAS via phpMyAdmin :

```sql
CREATE DATABASE safeguard_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'safeguard_user'@'%' IDENTIFIED BY 'Secotech2023!';
GRANT ALL PRIVILEGES ON safeguard_db.* TO 'safeguard_user'@'%';
FLUSH PRIVILEGES;
```

### 2. Configuration de l'environnement

Copiez `env.example` vers `.env` et configurez :

```bash
DATABASE_URL="mysql://safeguard_user:Secotech2023!@secotech.synology.me:3306/safeguard_db"
PUPPETEER_BROWSER_URL="http://localhost:3001"
PORT=3003
NEXTAUTH_SECRET="votre_secret_ici" # Générer avec: openssl rand -base64 32
```

### 3. Installation des dépendances

```bash
npm install
```

### 4. Génération du client Prisma

```bash
npm run prisma:generate
```

### 5. Migration de la base de données

Depuis votre PC (avec accès au NAS) :

```bash
npm run prisma:push
```

### 6. Création d'un utilisateur admin (optionnel)

Vous pouvez créer un utilisateur admin via l'interface web après le premier lancement, ou utiliser un script SQL :

```sql
-- Le mot de passe doit être hashé avec bcrypt
-- Utilisez l'interface web pour créer le premier admin
```

## 🏃 Démarrage

### Développement (local)

```bash
npm run dev
```

### Production (sur NAS)

```bash
npm run build
npm start
```

### Avec PM2 (recommandé sur NAS)

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## 📁 Structure du projet

```
SafeVault2/
├── app/                    # Pages Next.js 15 (App Router)
│   ├── api/               # Routes API
│   ├── dashboard/         # Page Dashboard
│   ├── caisse/            # Page Gestion de Caisse
│   ├── historique/       # Page Historique
│   ├── admin/             # Page Administration
│   └── login/             # Page de connexion
├── components/            # Composants React
│   ├── ui/               # Composants UI de base
│   ├── layout/           # Layout et Navigation
│   ├── dashboard/        # Composants Dashboard
│   ├── caisse/           # Composants Caisse
│   ├── historique/       # Composants Historique
│   └── admin/            # Composants Admin
├── lib/                  # Utilitaires
│   ├── prisma.ts         # Client Prisma
│   ├── auth.ts           # Configuration NextAuth
│   └── utils.ts          # Fonctions utilitaires
├── prisma/               # Prisma
│   └── schema.prisma     # Schéma de base de données
└── types/                # Types TypeScript
```

## 🔐 Authentification

L'application utilise NextAuth.js avec authentification par credentials. Les mots de passe sont hashés avec bcrypt.

### Rôles utilisateurs

- **ADMIN**: Accès complet (gestion utilisateurs, coffres)
- **MANAGER**: Gestion des coffres assignés
- **USER**: Consultation et inventaire

### Rôles coffre

- **OWNER**: Tous les droits sur le coffre
- **MANAGER**: Gestion et inventaire
- **MEMBER**: Consultation et inventaire

## 💰 Fonctionnalités

### Gestion de Caisse

- **Inventaire**: Comptage initial des billets
- **Entrée**: Ajout de fonds
- **Sortie**: Retrait de fonds
- Billets supportés: 5€, 10€, 20€, 50€, 100€, 200€, 500€

### Dashboard

- KPI mensuels (entrées, sorties, solde net)
- Graphiques d'évolution (LineChart)
- Répartition par coffre (PieChart)
- Derniers inventaires

### Historique

- Consultation de tous les mouvements
- Consultation de tous les inventaires
- Export PDF (nécessite service Puppeteer)

### Administration

- Gestion des utilisateurs
- Gestion des coffres
- Attribution des permissions

## 🔌 Service PDF (Puppeteer)

L'application nécessite un service Puppeteer distant sur le port 3001 pour générer les PDFs.

Le service doit exposer un endpoint POST `/generate-pdf` qui accepte :

```json
{
  "type": "movement" | "inventory",
  "data": { ... }
}
```

Et retourne un PDF en binaire.

## 🐛 Dépannage

### Erreur de connexion à la base de données

- Vérifiez que MariaDB est démarré sur le NAS
- Vérifiez le port (3306 ou 3307)
- Vérifiez les identifiants dans `.env`
- Vérifiez que le port est accessible depuis votre PC (pour les migrations)

### Erreur Prisma

```bash
# Régénérer le client
npm run prisma:generate

# Réinitialiser la base (ATTENTION: supprime les données)
npx prisma db push --force-reset
```

### PM2 ne démarre pas

- Vérifiez le chemin dans `ecosystem.config.js`
- Vérifiez que Node.js est dans le PATH
- Vérifiez les permissions du dossier

## 📝 Notes importantes

- Les migrations Prisma doivent être faites depuis votre PC (accès réseau au NAS)
- Le build et l'exécution se font sur le NAS
- L'URL de la base de données change selon l'environnement (PC vs NAS)
- Le service Puppeteer doit être configuré séparément

## 📄 Licence

Propriétaire - Secotech










