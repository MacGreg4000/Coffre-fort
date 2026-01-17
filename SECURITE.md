# 🔒 Améliorations de Sécurité - SafeGuard

## Vue d'ensemble

Ce document décrit les améliorations de sécurité implémentées pour renforcer la protection de l'application SafeGuard contre les attaques courantes et les accès non autorisés.

## ✅ Améliorations Implémentées

### 1. Content Security Policy (CSP) Stricte

**Fichier**: `next.config.js`

- **CSP complète** avec directives strictes pour limiter les sources autorisées
- **Blocage des frames** (`frame-ancestors 'none'`)
- **Upgrade des connexions** non sécurisées vers HTTPS
- **Restriction des sources** pour scripts, styles, images, etc.

**Impact**: Protection contre les attaques XSS et clickjacking.

---

### 2. Protection CSRF Renforcée

**Fichiers**: 
- `lib/csrf.ts` - Système de tokens CSRF
- `app/api/csrf/token/route.ts` - Endpoint pour obtenir un token
- `lib/api-middleware.ts` - Intégration dans le middleware

**Fonctionnalités**:
- Génération de tokens CSRF uniques par session
- Vérification obligatoire pour toutes les mutations (POST, PUT, PATCH, DELETE)
- Tokens avec expiration (30 minutes)
- Comparaison constante dans le temps (timing-safe) pour éviter les attaques par timing

**Utilisation côté client**:
```typescript
// Obtenir un token CSRF
const token = await getCsrfToken()

// Inclure dans les requêtes
fetch('/api/endpoint', {
  method: 'POST',
  headers: {
    'X-CSRF-Token': token
  },
  body: JSON.stringify({ ... })
})
```

**Impact**: Protection contre les attaques Cross-Site Request Forgery.

---

### 3. Chiffrement des Données Sensibles

**Fichier**: `lib/encryption.ts`

**Fonctionnalités**:
- **Algorithme**: AES-256-GCM (chiffrement symétrique avec authentification)
- **Dérivation de clé**: PBKDF2 avec 100,000 itérations
- **Format**: `salt:iv:tag:encryptedData` (tous en base64)
- **Chiffrement automatique** des documents uploadés si `ENCRYPTION_KEY` est configurée

**Routes protégées**:
- `/api/assets/[id]/documents` - Documents d'actifs
- `/api/password-files` - Fichiers de mots de passe

**Configuration**:
```bash
# Générer une clé de chiffrement (32+ caractères)
openssl rand -base64 32

# Ajouter dans .env
ENCRYPTION_KEY=votre_cle_generee_ici
```

**Impact**: Protection des données sensibles même en cas de compromission de la base de données.

---

### 4. Validation Renforcée des Fichiers

**Fichier**: `lib/file-validation.ts`

**Fonctionnalités**:
- **Validation des types MIME** autorisés
- **Vérification des extensions** de fichiers
- **Blocage des extensions dangereuses** (.exe, .bat, .js, .php, etc.)
- **Limites de taille** par type de fichier
- **Sanitization des noms de fichiers** (suppression des caractères dangereux)
- **Calcul SHA-256** pour l'intégrité
- **Vérification de correspondance** entre extension et type MIME

**Types autorisés**:
- Documents: PDF, DOC, DOCX, XLS, XLSX, TXT, CSV
- Images: JPEG, PNG, GIF, WEBP
- Archives: ZIP (pour exports)

**Limites de taille**:
- Images: 5 MB
- Documents: 10 MB
- Archives: 50 MB

**Impact**: Protection contre les uploads malveillants et les attaques par injection de fichiers.

---

### 5. Audit de Sécurité et Détection d'Anomalies

**Fichier**: `lib/security-audit.ts`

**Fonctionnalités**:
- **Logging des événements de sécurité** avec niveaux de sévérité
- **Détection d'anomalies**:
  - Connexions depuis plusieurs IPs différentes
  - Tentatives de connexion échouées multiples
  - Actions sensibles fréquentes
- **Blocage d'IP** après trop de tentatives échouées
- **Alertes critiques** pour les événements de sécurité majeurs

**Événements loggés**:
- Tentatives d'accès non autorisées
- Tokens CSRF invalides
- Rate limit dépassé
- Permissions insuffisantes
- Origines non autorisées
- IPs bloquées

**Impact**: Visibilité sur les tentatives d'attaque et capacité de réaction rapide.

---

### 6. Vérification d'Origine Renforcée

**Fichier**: `lib/api-utils.ts`

**Améliorations**:
- Vérification stricte de l'origine (Origin header)
- Vérification du referer
- Vérification du host
- Comparaison d'URLs complètes (pas seulement préfixes)
- Logging des tentatives d'accès depuis des origines non autorisées

**Impact**: Protection supplémentaire contre les attaques CSRF et les requêtes cross-origin malveillantes.

---

### 7. Middleware API Amélioré

**Fichier**: `lib/api-middleware.ts`

**Nouvelles vérifications**:
1. **Blocage d'IP** avant toute autre vérification
2. **Vérification d'origine** renforcée
3. **Rate limiting** avec logging
4. **Authentification** avec détection d'anomalies
5. **Vérification CSRF** pour les mutations
6. **Logging de sécurité** pour tous les événements suspects

**Ordre d'exécution**:
```
1. Vérification IP bloquée
2. Vérification origine
3. Rate limiting
4. Authentification
5. Détection d'anomalies
6. Vérification CSRF (mutations)
7. Exécution du handler
```

---

## 📋 Configuration Requise

### Variables d'Environnement

Ajoutez dans votre fichier `.env`:

```bash
# Clé de chiffrement (OBLIGATOIRE en production)
# Générer avec: openssl rand -base64 32
ENCRYPTION_KEY=votre_cle_de_32_caracteres_minimum

# URLs autorisées (pour vérification d'origine)
NEXTAUTH_URL=https://votre-domaine.com
NEXT_PUBLIC_APP_URL=https://votre-domaine.com
```

### Génération de Clé de Chiffrement

```bash
# Méthode 1: OpenSSL
openssl rand -base64 32

# Méthode 2: Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## 🚀 Utilisation

### Activation du Chiffrement

Le chiffrement est **automatiquement activé** si `ENCRYPTION_KEY` est configurée dans les variables d'environnement.

**Note**: Les fichiers existants non chiffrés continueront de fonctionner. Seuls les nouveaux fichiers seront chiffrés.

### Protection CSRF

Les tokens CSRF sont **automatiquement vérifiés** pour toutes les mutations (POST, PUT, PATCH, DELETE) sur les routes protégées.

Pour obtenir un token côté client:
```typescript
import { getCsrfToken } from '@/lib/csrf'

const token = await getCsrfToken()
```

### Monitoring de Sécurité

Consultez les logs de sécurité dans la table `logs` de la base de données:

```sql
SELECT * FROM logs 
WHERE action LIKE 'SECURITY_%' 
ORDER BY createdAt DESC 
LIMIT 100;
```

---

## 🔍 Tests de Sécurité

### Vérifier la CSP

1. Ouvrez les DevTools (F12)
2. Onglet "Console"
3. Vérifiez qu'aucune erreur CSP n'apparaît

### Tester le CSRF

1. Tentez une requête POST sans token CSRF
2. Vous devriez recevoir une erreur 403 "Token CSRF invalide"

### Tester le Chiffrement

1. Uploadez un document
2. Vérifiez dans la base de données que le champ `data` contient le format chiffré (`salt:iv:tag:data`)
3. Téléchargez le document - il devrait être déchiffré automatiquement

### Tester la Validation de Fichiers

1. Tentez d'uploader un fichier .exe
2. Vous devriez recevoir une erreur "Type de fichier non autorisé"

---

## 📊 Métriques de Sécurité

Les événements de sécurité sont loggés avec les métadonnées suivantes:
- **Timestamp**: Date et heure de l'événement
- **Niveau de sévérité**: low, medium, high, critical
- **Utilisateur**: ID de l'utilisateur concerné (si applicable)
- **IP Address**: Adresse IP de la requête
- **User Agent**: Navigateur/client utilisé
- **Métadonnées**: Informations contextuelles supplémentaires

---

## 🔐 Bonnes Pratiques

1. **Générer une clé de chiffrement unique** pour chaque environnement (dev, staging, production)
2. **Ne jamais commiter** les clés de chiffrement dans le dépôt Git
3. **Rotater les clés** périodiquement (tous les 6-12 mois)
4. **Monitorer les logs de sécurité** régulièrement
5. **Configurer des alertes** pour les événements critiques
6. **Utiliser HTTPS** en production (obligatoire pour la sécurité)
7. **Maintenir les dépendances** à jour pour corriger les vulnérabilités

---

## 🛡️ Protection Contre

- ✅ **XSS** (Cross-Site Scripting) - CSP stricte
- ✅ **CSRF** (Cross-Site Request Forgery) - Tokens CSRF
- ✅ **Injection de fichiers** - Validation stricte
- ✅ **Accès non autorisés** - Authentification + autorisation
- ✅ **Brute force** - Rate limiting + blocage IP
- ✅ **Vol de données** - Chiffrement des données sensibles
- ✅ **Attaques par timing** - Comparaisons constantes dans le temps
- ✅ **Clickjacking** - Headers de sécurité (X-Frame-Options)

---

## 📝 Notes Importantes

1. **Compatibilité**: Les fichiers existants non chiffrés continueront de fonctionner. Le système détecte automatiquement si un fichier est chiffré ou non.

2. **Performance**: Le chiffrement ajoute une légère surcharge (~10-50ms par fichier selon la taille). Acceptable pour la sécurité apportée.

3. **Récupération**: En cas de perte de `ENCRYPTION_KEY`, les fichiers chiffrés ne pourront **PAS** être récupérés. Assurez-vous de sauvegarder cette clé de manière sécurisée.

4. **Multi-instance**: Le système CSRF utilise un stockage en mémoire. Pour un déploiement multi-instance, considérez l'utilisation de Redis pour le stockage des tokens.

---

## 🔄 Prochaines Étapes (Recommandations)

1. **2FA (Two-Factor Authentication)** - Ajouter l'authentification à deux facteurs
2. **Session Management** - Rotation des sessions, timeout automatique
3. **WAF (Web Application Firewall)** - Protection supplémentaire au niveau réseau
4. **Intrusion Detection System (IDS)** - Détection avancée d'intrusions
5. **Backup chiffré** - Sauvegardes automatiques des données chiffrées
6. **Audit logs externes** - Envoi des logs vers un service externe (Sentry, CloudWatch, etc.)

---

**Date de mise à jour**: 2025-01-27
**Version**: 1.0.0
