# 🧪 Guide de Testing - SafeVault

## Installation des Dépendances de Test

```bash
npm install --save-dev \
  jest \
  @testing-library/react \
  @testing-library/jest-dom \
  @testing-library/user-event \
  jest-environment-jsdom \
  @types/jest
```

## Configuration

Les fichiers de configuration sont déjà créés :
- `jest.config.js` - Configuration Jest
- `jest.setup.js` - Setup global pour les tests
- `__tests__/` - Dossier contenant tous les tests

## Commandes

```bash
# Lancer les tests en mode watch (développement)
npm test

# Lancer tous les tests une fois
npm run test:ci

# Lancer les tests avec coverage
npm run test:coverage

# Voir le rapport de couverture
open coverage/lcov-report/index.html
```

## Structure des Tests

```
__tests__/
├── lib/
│   ├── validations.test.ts      # Tests des validations Zod
│   ├── rate-limit.test.ts       # Tests du rate limiting
│   └── api-utils.test.ts        # Tests des utilitaires API
├── components/
│   └── (à venir)                # Tests des composants React
└── api/
    └── (à venir)                # Tests d'intégration API
```

## Tests Implémentés

### ✅ Validations Zod (`validations.test.ts`)
- Validation email
- Validation mot de passe (12+ chars, maj, min, chiffre, spécial)
- Validation UUID
- Validation mouvements/coffres/inventaires

### ✅ Rate Limiting (`rate-limit.test.ts`)
- Autorisation premières requêtes
- Blocage après limite
- Différenciation par IP
- Différenciation par userId
- Headers corrects

### ✅ API Utils (`api-utils.test.ts`)
- Gestion erreurs ApiError
- Gestion erreurs Prisma
- Extraction IP/User-Agent
- Pagination
- Serialization Decimal

## Objectifs de Couverture

```javascript
// jest.config.js
coverageThreshold: {
  global: {
    branches: 50,
    functions: 50,
    lines: 50,
    statements: 50,
  },
}
```

### Couverture Actuelle (à mesurer)
```bash
npm run test:coverage
```

## Tests à Ajouter (TODO)

### Composants React
- [ ] Navbar - Navigation et thème
- [ ] CaisseInterface - Formulaire mouvements
- [ ] DashboardStats - Affichage statistiques
- [ ] HistoriqueList - Liste et filtres
- [ ] AdminPanel - Gestion utilisateurs/coffres

### Routes API (Intégration)
- [ ] POST /api/movements - Création mouvement
- [ ] GET /api/movements - Liste paginée
- [ ] PUT /api/movements/[id] - Modification (admin)
- [ ] DELETE /api/movements/[id] - Soft delete (admin)
- [ ] POST /api/inventories - Création inventaire
- [ ] GET /api/coffres/balance - Calcul balance

### Tests E2E (Playwright - optionnel)
- [ ] Flux complet : Login → Mouvement → Historique
- [ ] Flux admin : Créer utilisateur → Créer coffre
- [ ] Flux export PDF

## Bonnes Pratiques

### 1. Nommer les tests clairement
```typescript
// ✅ Bon
it('devrait rejeter un mot de passe sans majuscule', () => {})

// ❌ Mauvais
it('test password', () => {})
```

### 2. Tester les cas limites
```typescript
describe('Pagination', () => {
  it('devrait gérer page=0', () => {})
  it('devrait limiter à 100 items max', () => {})
  it('devrait calculer skip correctement', () => {})
})
```

### 3. Mocker les dépendances externes
```typescript
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
  },
}))
```

### 4. Nettoyer après chaque test
```typescript
afterEach(() => {
  jest.clearAllMocks()
})
```

## CI/CD

Les tests s'exécutent automatiquement via GitHub Actions :
- Sur chaque push vers `main` ou `develop`
- Sur chaque Pull Request
- Échec du build si tests échouent ou couverture < 50%

Voir `.github/workflows/ci.yml` pour la configuration.

## Debugging

### Afficher les logs pendant les tests
```bash
DEBUG=* npm test
```

### Exécuter un seul fichier de test
```bash
npm test validations.test.ts
```

### Exécuter un seul test
```bash
npm test -t "devrait rejeter un email invalide"
```

### Mode verbose
```bash
npm test -- --verbose
```

## Ressources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Next.js Testing](https://nextjs.org/docs/testing)

---

*Pour questions ou ajouts, voir CONTRIBUTING.md*
