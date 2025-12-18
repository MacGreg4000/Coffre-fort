# 🏗️ Architecture de SafeVault - Guide de Compréhension

## 📊 Vue d'Ensemble

SafeVault est une application de gestion de coffres-forts avec inventaire de billets, mouvements (entrées/sorties), et suivi financier.

---

## 🔄 Flux de Données Principal

### 1. **Ajout de Billets (Page Caisse)**

```
┌─────────────────────────────────────────────────────────────────┐
│  1. L'utilisateur saisit les billets dans CaisseInterface      │
│     → Sélectionne un coffre                                     │
│     → Choisit le mode (Inventaire/Entrée/Sortie)              │
│     → Encode les quantités de billets                          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  2. Soumission → API /api/movements (POST)                      │
│     → Validation Zod des données                               │
│     → Calcul du montant total                                  │
│     → Transaction Prisma pour créer :                          │
│        • Movement (type: ENTRY/EXIT/INVENTORY)                 │
│        • MovementDetail (détails des billets)                  │
│        • Log d'audit                                           │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  3. Invalidation du Cache (CRITIQUE ✅)                         │
│     → invalidateCoffreCache(coffreId)                          │
│     → cache.invalidatePattern('dashboard:userId')              │
│     → logger.info() pour traçabilité                           │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  4. Actualisation de l'Interface                                │
│     → CaisseInterface : fetch balance → nouveau solde          │
│     → router.refresh() → revalidation des données              │
│     → Dashboard : cache invalidé → nouvelles données           │
└─────────────────────────────────────────────────────────────────┘
```

---

## 💰 Calcul de la Balance (Comment ça marche)

### API : `/api/coffres/balance`

```typescript
// LOGIQUE AVEC CACHE (5 minutes)
const balance = await getCachedBalance(coffreId, async () => {
  
  // 1. Récupérer le dernier inventaire
  const lastInventory = await prisma.inventory.findFirst({
    where: { coffreId },
    orderBy: { createdAt: "desc" }
  })

  if (lastInventory) {
    // 2. Point de départ = montant du dernier inventaire
    let balance = lastInventory.totalAmount

    // 3. Ajouter tous les mouvements APRÈS l'inventaire
    const movements = await prisma.movement.findMany({
      where: {
        coffreId,
        deletedAt: null, // ⚠️ CRITIQUE : exclure supprimés
        createdAt: { gte: lastInventory.createdAt },
        type: { in: ["ENTRY", "EXIT"] }
      }
    })

    // 4. Calculer la balance finale
    movements.forEach(mov => {
      if (mov.type === "ENTRY") balance += mov.amount
      if (mov.type === "EXIT") balance -= mov.amount
    })

    return balance
  } else {
    // Pas d'inventaire : calculer depuis le début
    const allMovements = await prisma.movement.findMany({
      where: {
        coffreId,
        deletedAt: null,
        type: { in: ["ENTRY", "EXIT"] }
      }
    })

    let balance = 0
    allMovements.forEach(mov => {
      if (mov.type === "ENTRY") balance += mov.amount
      if (mov.type === "EXIT") balance -= mov.amount
    })

    return balance
  }
})
```

### Pourquoi cette logique ?

1. **Inventaire = Point de référence fixe** : On ne recalcule pas depuis le début à chaque fois
2. **Performance** : Seulement les mouvements après inventaire (beaucoup moins de données)
3. **Cohérence** : `deletedAt: null` garantit que les mouvements supprimés ne comptent pas

---

## 📈 Dashboard (Graphiques et Statistiques)

### API : `/api/dashboard`

**Cache : 1 minute** (actualisation rapide pour refléter les changements)

#### Données Calculées :

| Métrique | Source | Filtre Critique |
|----------|--------|-----------------|
| **Total Balance** | Σ balances de tous les coffres | `deletedAt: null` |
| **Entrées Mensuelles** | Σ mouvements ENTRY du mois | `deletedAt: null` |
| **Sorties Mensuelles** | Σ mouvements EXIT du mois | `deletedAt: null` |
| **Évolution Solde** | Inventaires + mouvements | `deletedAt: null` |
| **Répartition Billets** | MovementDetail + InventoryDetail | Via mouvements non supprimés |
| **Top Utilisateurs** | Comptage mouvements par userId | `deletedAt: null` |

#### Graphiques Générés :

1. **Évolution du Solde** (Line Chart)
   - Affiche l'évolution du solde dans le temps
   - Point de départ = dernier inventaire
   - Chaque mouvement ajuste la courbe

2. **Répartition des Billets** (Bar Chart)
   - Quantité de chaque dénomination (5€, 10€, 20€, etc.)
   - Couleurs réelles des billets d'euro

3. **Évolution avec Période** (Line Chart avec sélecteur)
   - 1 jour / 1 semaine / 1 mois / 1 an / 5 ans
   - Calcul dynamique du point de départ

4. **Répartition par Coffre** (Doughnut Chart)
   - Montant total par coffre
   - Couleurs distinctes

5. **Top Utilisateurs** (Bar Chart horizontal)
   - Les 5 utilisateurs les plus actifs
   - Nombre de mouvements

---

## 🔐 Système de Cache (Performance)

### Configuration

```typescript
// Cache TTL (Time To Live)
Balance:   5 minutes  → getCachedBalance()
Dashboard: 1 minute   → getCachedDashboardStats()
```

### Invalidation Automatique

**Quand le cache est-il invalidé ?**

| Action | Cache Invalidé | Raison |
|--------|---------------|--------|
| Créer mouvement | ✅ Balance + Dashboard | Données obsolètes |
| Modifier mouvement | ✅ Balance + Dashboard | Montants changés |
| Supprimer mouvement | ✅ Balance + Dashboard | Calculs modifiés |
| Créer inventaire | ✅ Balance + Dashboard | Nouveau point de référence |

### Exemple de Code

```typescript
// Après création d'un mouvement :
invalidateCoffreCache(coffreId)               // Balance du coffre
cache.invalidatePattern(`dashboard:${userId}`) // Dashboard de l'utilisateur
logger.info(`Cache invalidated for coffre ${coffreId}`)
```

---

## 🗂️ Structure des Pages

### 1. **`/dashboard`** - Vue d'Ensemble

**Rôle :** Visualisation globale des statistiques

**Données Affichées :**
- Montant total de tous les coffres
- Balance par coffre
- Graphiques d'évolution
- Top utilisateurs
- Répartition des billets

**Actualisation :**
- Automatique via cache (1 min)
- Manuelle : changer le filtre de coffre

---

### 2. **`/caisse`** - Encodage des Mouvements

**Rôle :** Saisie des billets (inventaire, entrée, sortie)

**Flux :**
1. Sélectionner un coffre
2. Affichage du solde actuel (depuis API `/api/coffres/balance`)
3. Choisir le mode (Inventaire / Entrée / Sortie)
4. Encoder les billets
5. Validation → API `/api/movements` ou `/api/inventories`
6. Actualisation du solde

**Actualisation :**
- Après soumission : fetch de la nouvelle balance
- `router.refresh()` pour revalidation

---

### 3. **`/historique`** - Liste des Mouvements

**Rôle :** Consultation et suppression des mouvements

**Données Affichées :**
- Liste des mouvements par date (desc)
- Détails des billets
- Actions : Supprimer (soft delete)

**Actualisation :**
- Après suppression : `router.refresh()`
- Cache invalidé → dashboard mis à jour

---

## 🚨 Points Critiques (Ne Pas Oublier)

### 1. **Filtre `deletedAt: null`**

⚠️ **TOUJOURS inclure ce filtre dans les requêtes de mouvements** :

```typescript
// ❌ MAUVAIS
const movements = await prisma.movement.findMany({
  where: { coffreId }
})

// ✅ BON
const movements = await prisma.movement.findMany({
  where: { 
    coffreId,
    deletedAt: null  // CRITIQUE
  }
})
```

**Pourquoi ?**
- Les mouvements supprimés ne doivent PAS être comptés
- Sinon les balances et graphiques sont faux

---

### 2. **Invalidation du Cache Obligatoire**

⚠️ **TOUJOURS invalider après mutation** :

```typescript
// Après création/modification/suppression
invalidateCoffreCache(coffreId)
cache.invalidatePattern(`dashboard:${userId}`)
```

**Pourquoi ?**
- Sans invalidation, le dashboard affiche des données périmées
- Le cache sert à optimiser, pas à cacher les changements

---

### 3. **Transactions Prisma pour Cohérence**

⚠️ **TOUJOURS utiliser des transactions pour les opérations multiples** :

```typescript
await prisma.$transaction(async (tx) => {
  // 1. Créer le mouvement
  const movement = await tx.movement.create({...})
  
  // 2. Créer les détails
  await tx.movementDetail.createMany({...})
  
  // 3. Créer le log d'audit (avec tx)
  await createAuditLog({..., tx})
})

// ✅ Soit tout réussit, soit tout échoue (atomicité)
```

---

## 📊 Schéma de Dépendances

```
┌─────────────────────────────────────────────────────────────┐
│                     BASE DE DONNÉES                         │
│  ┌──────────┐  ┌───────────┐  ┌──────────┐  ┌──────────┐ │
│  │ Coffre   │  │ Movement  │  │ Inventory│  │ User     │ │
│  └──────────┘  └───────────┘  └──────────┘  └──────────┘ │
│       ↓              ↓               ↓              ↓      │
│  ┌────────────────────────────────────────────────────┐   │
│  │          MovementDetail / InventoryDetail          │   │
│  └────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                      COUCHE API                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ /movements   │  │ /inventories │  │ /balance     │    │
│  │ (CRUD)       │  │ (POST/GET)   │  │ (GET cached) │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
│                          ↓                                  │
│  ┌──────────────────────────────────────────────────────┐ │
│  │              /dashboard (GET cached)                  │ │
│  │  → Agrège toutes les données pour les graphiques     │ │
│  └──────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                   SYSTÈME DE CACHE                          │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  Key: balance:coffreId        TTL: 5 min            │ │
│  │  Key: dashboard:userId:all    TTL: 1 min            │ │
│  │  Key: dashboard:userId:coffre TTL: 1 min            │ │
│  └──────────────────────────────────────────────────────┘ │
│                Invalidation automatique :                   │
│         CREATE/UPDATE/DELETE → cache.delete()              │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                     INTERFACE UI                            │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐          │
│  │ Dashboard  │  │  Caisse    │  │ Historique │          │
│  │ (stats +   │  │ (encodage) │  │ (liste +   │          │
│  │ graphiques)│  │            │  │ suppression)          │
│  └────────────┘  └────────────┘  └────────────┘          │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Résumé des Corrections Apportées

### Avant ❌

- Cache créé mais **jamais utilisé**
- Aucune invalidation après mutations
- Mouvements supprimés comptés dans les calculs
- Dashboard affichait des données périmées
- Graphiques ne se mettaient pas à jour après ajout de billets

### Après ✅

- Cache intégré dans `/api/balance` et `/api/dashboard`
- Invalidation automatique après toutes les mutations
- Filtre `deletedAt: null` dans **toutes** les requêtes
- Dashboard se met à jour automatiquement (1 min max)
- Graphiques reflètent les vraies données en temps quasi-réel
- Logs de debug pour tracer les calculs et invalidations

---

## 📝 Checklist pour Nouvelles Fonctionnalités

Quand vous ajoutez une nouvelle fonctionnalité impliquant des mouvements ou inventaires :

- [ ] Inclure `deletedAt: null` dans les requêtes de mouvements
- [ ] Invalider le cache après mutations (`invalidateCoffreCache` + `invalidatePattern`)
- [ ] Utiliser des transactions Prisma pour les opérations multiples
- [ ] Ajouter des logs (`logger.info`) pour traçabilité
- [ ] Tester l'actualisation du dashboard après la mutation
- [ ] Vérifier que les graphiques se mettent à jour

---

## 🔧 Commandes Utiles

```bash
# Build et vérifier les types
npm run build

# Logs de debug (en dev)
# Vérifier la console pour les logs de cache :
# → "Cache hit: balance:coffreId"
# → "Cache invalidated for coffre"

# Forcer l'actualisation du cache (redémarrer le serveur)
npm run dev
```

---

## 📞 Questions Fréquentes

### Q : Le dashboard ne se met pas à jour après ajout de billets

**R :** Vérifiez que :
1. Le cache est invalidé après la mutation (logs dans la console)
2. Le filtre `deletedAt: null` est présent
3. Le TTL du cache n'est pas trop long (actuellement 1 min pour dashboard)

### Q : La balance affichée ne correspond pas aux mouvements

**R :** Vérifiez que :
1. Aucun mouvement supprimé n'est compté (`deletedAt: null` partout)
2. Le dernier inventaire est bien pris comme point de référence
3. Le cache de balance est invalidé après les mutations

### Q : Les graphiques affichent des données anciennes

**R :** Vérifiez que :
1. Le cache du dashboard est invalidé après mutations
2. Le filtre `deletedAt: null` est appliqué dans `/api/dashboard`
3. Le `router.refresh()` est appelé après soumission

---

**Document créé le :** $(date)
**Version :** 2.0 (Après corrections critiques)



