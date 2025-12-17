# 📖 Guide Utilisateur - SafeVault

## 🎯 Qu'est-ce que SafeVault ?

SafeVault est une application de gestion de coffres-forts permettant de :
- **Gérer plusieurs coffres** avec des membres différents
- **Encoder des billets** (inventaires, entrées, sorties)
- **Suivre les balances** en temps réel
- **Visualiser des statistiques** et graphiques détaillés
- **Tracer l'historique** de tous les mouvements

---

## 🗺️ Les 3 Pages Principales

### 1. 📊 **Dashboard** - Vue d'Ensemble

**URL :** `/dashboard`

**À quoi ça sert ?**
- Voir **toutes** les informations financières d'un coup d'œil
- Comprendre l'évolution de vos coffres dans le temps
- Identifier les tendances (entrées, sorties, utilisateurs actifs)

#### Ce que vous voyez :

| Zone | Information | Mise à Jour |
|------|-------------|-------------|
| **En-tête** | Montant total de tous vos coffres | Temps réel |
| **Détail par coffre** | Balance individuelle de chaque coffre | Temps réel |
| **Graphique 1** | Évolution du solde (ligne) | Automatique |
| **Graphique 2** | Répartition des billets (barres) | Automatique |
| **Graphique 3** | Évolution avec sélecteur de période | Automatique |
| **Graphique 4** | Répartition par coffre (camembert) | Automatique |
| **Graphique 5** | Top utilisateurs actifs | Automatique |

#### Comment l'utiliser ?

1. **Filtre par coffre** : 
   - Par défaut : tous les coffres
   - Sélectionnez un coffre pour voir uniquement ses stats

2. **Sélecteur de période** (Graphique 3) :
   - `1j` : dernières 24 heures
   - `1sem` : dernière semaine
   - `1mois` : dernier mois
   - `1an` : dernière année
   - `5ans` : 5 dernières années

3. **Actualisation** :
   - Automatique toutes les **1 minute**
   - Manuelle : changez le filtre de coffre ou rechargez la page

---

### 2. 💰 **Caisse** - Encodage des Mouvements

**URL :** `/caisse`

**À quoi ça sert ?**
- **Encoder des billets** dans un coffre
- **Voir le solde actuel** du coffre sélectionné
- **Enregistrer 3 types d'opérations** :
  - 📋 **Inventaire** : Comptage complet du coffre
  - ➕ **Entrée** : Ajout de billets
  - ➖ **Sortie** : Retrait de billets

#### Comment l'utiliser ?

```
┌────────────────────────────────────────────────────────────┐
│  1. SÉLECTIONNER UN COFFRE                                 │
│     → Liste déroulante de vos coffres accessibles          │
└────────────────────────────────────────────────────────────┘
                          ↓
┌────────────────────────────────────────────────────────────┐
│  2. VOIR LE SOLDE ACTUEL                                   │
│     → Affiché automatiquement après sélection              │
│     → Montant en temps réel                                │
└────────────────────────────────────────────────────────────┘
                          ↓
┌────────────────────────────────────────────────────────────┐
│  3. CHOISIR LE MODE                                        │
│     📋 Inventaire : Comptage complet                       │
│     ➕ Entrée     : Ajout de fonds                         │
│     ➖ Sortie     : Retrait de fonds                       │
└────────────────────────────────────────────────────────────┘
                          ↓
┌────────────────────────────────────────────────────────────┐
│  4. ENCODER LES BILLETS                                    │
│     → Grille avec toutes les dénominations                 │
│     → Cliquez sur + ou - pour ajuster les quantités       │
│     → Total calculé automatiquement                        │
└────────────────────────────────────────────────────────────┘
                          ↓
┌────────────────────────────────────────────────────────────┐
│  5. AJOUTER UNE DESCRIPTION (optionnel)                    │
│     → Ex: "Recette du 15/01" ou "Retrait ATM"             │
└────────────────────────────────────────────────────────────┘
                          ↓
┌────────────────────────────────────────────────────────────┐
│  6. VALIDER                                                │
│     → Bouton "Enregistrer l'inventaire/entrée/sortie"     │
│     → Confirmation avec toast vert                         │
│     → Solde actualisé immédiatement                        │
└────────────────────────────────────────────────────────────┘
```

#### Les Dénominations

| Billet | Couleur Réelle | Saisie |
|--------|---------------|--------|
| 5 €    | Gris          | +/- |
| 10 €   | Rouge         | +/- |
| 20 €   | Bleu          | +/- |
| 50 €   | Orange        | +/- |
| 100 €  | Vert          | +/- |
| 200 €  | Jaune         | +/- |
| 500 €  | Violet        | +/- |

#### Exemple Concret

**Situation :** Vous avez fait une recette et vous voulez l'enregistrer.

1. Sélectionnez le coffre "Caisse Principale"
2. Solde actuel affiché : **1 250,00 €**
3. Choisissez le mode : **Entrée** (➕)
4. Encodez les billets :
   - 10 × 20€ = 200€
   - 5 × 50€ = 250€
   - 2 × 100€ = 200€
   - **Total : 650,00 €**
5. Description : "Recette du 15/01/2025"
6. Validez → **Nouveau solde : 1 900,00 €** ✅

---

### 3. 📜 **Historique** - Liste des Mouvements

**URL :** `/historique`

**À quoi ça sert ?**
- **Consulter** tous les mouvements passés
- **Supprimer** un mouvement si nécessaire (réservé aux admins)
- **Vérifier** les détails de chaque opération

#### Ce que vous voyez :

| Colonne | Information |
|---------|-------------|
| **Date** | Date et heure du mouvement |
| **Coffre** | Nom du coffre concerné |
| **Type** | Inventaire / Entrée / Sortie |
| **Montant** | Valeur en € |
| **Utilisateur** | Qui a fait l'opération |
| **Description** | Note ajoutée (si présente) |
| **Actions** | Bouton Supprimer (admins) |

#### Comment l'utiliser ?

1. **Voir la liste** :
   - Classée par date (plus récent en premier)
   - Pagination automatique

2. **Filtrer** (si disponible) :
   - Par coffre
   - Par date
   - Par utilisateur

3. **Supprimer un mouvement** (admins uniquement) :
   - Cliquez sur l'icône de corbeille
   - Confirmez la suppression
   - **Important** : La suppression est "soft" → le mouvement est marqué comme supprimé mais reste en base de données pour l'audit
   - Le solde et les graphiques se mettent à jour automatiquement

---

## ⚡ Fonctionnalités Clés

### 🔄 Actualisation Automatique

**Dashboard :**
- ✅ Se met à jour automatiquement toutes les **1 minute**
- ✅ Affiche les nouvelles données après ajout de billets
- ✅ Graphiques synchronisés en temps quasi-réel

**Caisse :**
- ✅ Solde actualisé après chaque validation
- ✅ Interface réinitialisée après enregistrement

**Historique :**
- ✅ Liste mise à jour après suppression
- ✅ Pagination dynamique

---

### 🎨 Interface Moderne

- **Design Glassmorphism** : Effet de verre avec flou et transparence
- **Animations Fluides** : Transitions douces avec Framer Motion
- **Responsive** : Adapté à tous les écrans (mobile, tablette, desktop)
- **Dark/Light Mode** : Thème sombre/clair selon vos préférences
- **Effets 3D** : Hover avec profondeur sur les cartes
- **Gradient Dynamique** : Fond animé avec dégradés bleus

---

### 🔒 Sécurité

- **Authentification** : NextAuth.js avec sessions sécurisées
- **Rôles** : ADMIN, MANAGER, USER (permissions différentes)
- **Audit Trail** : Tous les mouvements sont tracés avec IP/User-Agent
- **Soft Delete** : Les suppressions sont réversibles (marquage uniquement)
- **Rate Limiting** : Protection contre les abus (5 requêtes par minute pour les mutations)

---

### 📊 Système de Cache Intelligent

**Pourquoi c'est important ?**
- ⚡ **Performance** : Réponses instantanées pour les données fréquemment consultées
- 🔄 **Actualisation** : Invalidation automatique après chaque changement
- 💾 **Économie** : Moins de requêtes à la base de données

**Comment ça fonctionne ?**

```
┌────────────────────────────────────────────────────────────┐
│  Vous ajoutez des billets dans la caisse                   │
└────────────────────────────────────────────────────────────┘
                          ↓
┌────────────────────────────────────────────────────────────┐
│  Le cache est automatiquement invalidé                     │
│  → Balance du coffre                                       │
│  → Dashboard de l'utilisateur                              │
└────────────────────────────────────────────────────────────┘
                          ↓
┌────────────────────────────────────────────────────────────┐
│  La prochaine consultation affiche les nouvelles données   │
│  → Pas besoin de recharger manuellement                    │
└────────────────────────────────────────────────────────────┘
```

---

## 🎯 Scénarios d'Utilisation

### Scénario 1 : Comptage Initial (Inventaire)

**Situation :** Vous démarrez avec un coffre vide et voulez enregistrer son contenu initial.

1. **Page Caisse** → Sélectionnez le coffre
2. Mode : **Inventaire** 📋
3. Encodez tous les billets présents
4. Description : "Inventaire initial - 15/01/2025"
5. Validez → ✅ **Inventaire enregistré**
6. **Dashboard** → Vérifiez le montant total

---

### Scénario 2 : Ajout de Fonds (Entrée)

**Situation :** Vous recevez de l'argent et voulez l'ajouter au coffre.

1. **Page Caisse** → Sélectionnez le coffre
2. Vérifiez le solde actuel affiché
3. Mode : **Entrée** ➕
4. Encodez uniquement les billets ajoutés (pas tout le coffre)
5. Description : "Recette magasin - 15/01"
6. Validez → ✅ **Entrée enregistrée**
7. **Solde** mis à jour immédiatement
8. **Dashboard** → Graphique actualisé en 1 minute max

---

### Scénario 3 : Retrait de Fonds (Sortie)

**Situation :** Vous retirez de l'argent du coffre.

1. **Page Caisse** → Sélectionnez le coffre
2. Vérifiez le solde actuel affiché
3. Mode : **Sortie** ➖
4. Encodez les billets retirés
5. Description : "Retrait ATM - 15/01"
6. Validez → ✅ **Sortie enregistrée**
7. **Solde** diminué immédiatement
8. **Dashboard** → Graphique actualisé

---

### Scénario 4 : Vérification de l'Historique

**Situation :** Vous voulez vérifier qui a fait quoi.

1. **Page Historique** → Consultez la liste
2. Triez par date, coffre, ou utilisateur
3. Cliquez sur un mouvement pour voir les détails
4. Si nécessaire (et admin), supprimez un mouvement erroné
5. **Dashboard** → Vérifiez que les graphiques sont cohérents

---

### Scénario 5 : Suivi de l'Évolution

**Situation :** Vous voulez voir comment votre coffre évolue dans le temps.

1. **Page Dashboard** → Sélectionnez le coffre
2. **Graphique "Évolution du solde"** → Sélectionnez la période (1sem, 1mois, 1an)
3. Analysez la courbe :
   - Montée = Entrées
   - Descente = Sorties
   - Plateau = Pas de mouvement
4. **Graphique "Top utilisateurs"** → Voyez qui est le plus actif
5. **Graphique "Répartition des billets"** → Identifiez les dénominations les plus fréquentes

---

## 🆘 Résolution de Problèmes

### ❌ Le dashboard n'affiche pas les nouvelles données

**Solution :**
1. Attendez **1 minute** (cache automatique)
2. Changez le filtre de coffre puis revenez à "Tous les coffres"
3. Rechargez la page (F5)

---

### ❌ La balance affichée semble incorrecte

**Causes possibles :**
1. Un mouvement a été récemment supprimé → Attendez 1 minute (cache)
2. Vérifiez l'historique pour voir si tous les mouvements sont cohérents
3. Si le problème persiste, contactez un administrateur

---

### ❌ Impossible de supprimer un mouvement

**Causes possibles :**
1. Vous n'êtes pas **admin** (seuls les admins peuvent supprimer)
2. Le mouvement a déjà été supprimé → Il apparaît encore à cause du cache (actualisez)

---

### ❌ Les graphiques sont vides

**Causes possibles :**
1. Aucun mouvement n'a été enregistré → Ajoutez des billets dans la caisse
2. Le coffre sélectionné n'a pas d'historique → Changez de coffre ou sélectionnez "Tous les coffres"

---

## 💡 Conseils d'Utilisation

### ✅ Bonnes Pratiques

1. **Inventaire Régulier** : Faites un inventaire complet tous les mois pour corriger les écarts
2. **Descriptions Claires** : Ajoutez toujours une description aux mouvements (facilite le suivi)
3. **Vérification Quotidienne** : Consultez le dashboard tous les jours pour détecter les anomalies
4. **Audit Trail** : Consultez l'historique régulièrement pour vérifier les actions

---

### ❌ Erreurs à Éviter

1. **Pas d'inventaire de référence** : Sans inventaire, les calculs partent de 0 (peut être incorrect)
2. **Descriptions vagues** : "Mouvement" ou "Test" ne sont pas utiles pour l'audit
3. **Oublier de valider** : Vérifiez toujours que le toast de confirmation apparaît
4. **Suppression abusive** : Ne supprimez un mouvement que si vous êtes certain qu'il est erroné

---

## 📞 Support

### 🐛 Signaler un Bug

Si vous rencontrez un problème :
1. Notez l'heure exacte et l'action effectuée
2. Prenez une capture d'écran si possible
3. Vérifiez la console du navigateur (F12 → Console)
4. Contactez l'administrateur avec ces informations

---

### 💬 Demander une Fonctionnalité

Vous avez une idée d'amélioration ?
1. Décrivez clairement le besoin
2. Expliquez le cas d'usage
3. Proposez une solution si possible

---

## 🎓 Glossaire

| Terme | Définition |
|-------|-----------|
| **Coffre** | Conteneur virtuel de billets (ex: "Caisse Principale") |
| **Inventaire** | Comptage complet du contenu d'un coffre à un instant T |
| **Entrée** | Ajout de billets dans un coffre |
| **Sortie** | Retrait de billets d'un coffre |
| **Balance** | Solde actuel d'un coffre (calculé depuis le dernier inventaire) |
| **Mouvement** | Opération d'entrée ou de sortie (pas inventaire) |
| **Soft Delete** | Suppression logique (marquage) au lieu de suppression physique |
| **Cache** | Mémoire temporaire pour accélérer les consultations |
| **Audit Trail** | Journal de toutes les actions effectuées |

---

**Document créé le :** $(date)
**Version :** 1.0

