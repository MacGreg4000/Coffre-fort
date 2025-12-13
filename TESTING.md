# 🧪 Guide de Tests - SafeVault

## Configuration

### Installation
```bash
npm install
```

### Variables d'environnement pour tests
Les variables de test sont configurées automatiquement dans `jest.setup.js`.

## Lancer les tests

```bash
# Mode watch (développement)
npm test

# Run une fois
npm test -- --watchAll=false

# Avec couverture
npm run test:coverage

# CI/CD
npm run test:ci
```

## Structure des tests

```
__tests__/
├── lib/
│   ├── validations.test.ts    # Tests validations Zod
│   └── rate-limit.test.ts     # Tests rate limiting
├── api/
│   └── (à venir) Tests d'intégration API
└── e2e/
    └── (à venir) Tests end-to-end
```

## Couverture de code

Objectifs de couverture :
- **Branches**: 70%
- **Functions**: 70%
- **Lines**: 70%
- **Statements**: 70%

Zones critiques à 100% :
- `lib/validations.ts`
- `lib/rate-limit.ts`
- `lib/api-utils.ts`

## Mocking

### Prisma
```typescript
import { prisma } from "@/lib/prisma"
jest.mock("@/lib/prisma")
```

### NextAuth
```typescript
import { getServerSession } from "next-auth"
jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}))
```

## Tests à écrire (TODO)

### Tests d'intégration API
- [ ] POST /api/movements
- [ ] GET /api/movements (pagination)
- [ ] PUT /api/movements/[id]
- [ ] DELETE /api/movements/[id]
- [ ] POST /api/inventories
- [ ] POST /api/admin/users
- [ ] Rate limiting sur routes

### Tests E2E
- [ ] Flux de login
- [ ] Création d'un mouvement
- [ ] Création d'un inventaire
- [ ] Export PDF
- [ ] Gestion admin

## CI/CD

GitHub Actions s'exécute automatiquement sur :
- Push sur `main` et `develop`
- Pull requests

Étapes :
1. ✅ Lint + TypeCheck
2. ✅ Tests unitaires
3. ✅ Build
4. ✅ Audit sécurité

Voir `.github/workflows/ci.yml` pour la configuration.

## Bonnes pratiques

1. **Nommer les tests clairement**
   ```typescript
   it("should reject weak passwords", () => {})
   ```

2. **Tester les cas limites**
   - Valeurs nulles/undefined
   - Chaînes vides
   - Nombres négatifs
   - UUIDs invalides

3. **Isoler les tests**
   - Pas de dépendances entre tests
   - Nettoyer après chaque test
   - Utiliser `beforeEach`/`afterEach`

4. **Snapshots avec parcimonie**
   - Préférer les assertions explicites
   - Snapshots uniquement pour UI complexe

## Debugging

```bash
# Run un seul fichier
npm test validations.test.ts

# Run avec debug
node --inspect-brk node_modules/.bin/jest --runInBand

# Verbose output
npm test -- --verbose
```

## Ressources

- [Jest Documentation](https://jestjs.io/)
- [Testing Library](https://testing-library.com/)
- [Next.js Testing](https://nextjs.org/docs/testing)
