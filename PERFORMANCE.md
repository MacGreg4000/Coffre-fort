# ⚡ Guide d'Optimisation & Performance - SafeVault

## Cache Implémenté

### Cache In-Memory
Le système de cache in-memory est actif pour :

#### Balances de coffres (TTL: 5 minutes)
```typescript
import { getCachedBalance, invalidateCoffreCache } from "@/lib/cache"

// Utilisation
const balance = await getCachedBalance(coffreId, async () => {
  return await fetchBalanceFromDB(coffreId)
})

// Invalidation après mouvement
invalidateCoffreCache(coffreId)
```

#### Listes utilisateur (TTL: 2 minutes)
```typescript
import { getCachedUserCoffres, invalidateUserCache } from "@/lib/cache"

const coffres = await getCachedUserCoffres(userId, fetchFn)
```

#### Stats dashboard (TTL: 1 minute)
```typescript
import { getCachedDashboardStats } from "@/lib/cache"

const stats = await getCachedDashboardStats(userId, coffreId, fetchFn)
```

### Cache API
```typescript
import { cache } from "@/lib/cache"

// Wrapper automatique
const data = await cache.wrap("key", async () => {
  return await expensiveOperation()
}, 60000) // TTL en ms

// Stats
const stats = cache.stats()
console.log(`Cache: ${stats.active} active, ${stats.expired} expired`)
```

## Optimisations Base de Données

### Index Composés
Ajoutés dans `prisma/schema.prisma` :
- `(coffreId, createdAt)` sur movements
- `(userId, createdAt)` sur movements

### Requêtes Optimisées
- ✅ `select` spécifique au lieu de `include` complet
- ✅ Pagination avec `skip`/`take`
- ✅ Requêtes parallèles avec `Promise.all()`
- ✅ Transactions pour cohérence

```typescript
// ✅ BON - Requêtes parallèles
const [movements, total] = await Promise.all([
  prisma.movement.findMany({ skip, take: limit }),
  prisma.movement.count()
])

// ❌ MAU VAIS - Séquentiel
const movements = await prisma.movement.findMany({ skip, take: limit })
const total = await prisma.movement.count()
```

## Frontend

### Images
```tsx
// Utiliser next/image
import Image from "next/image"

<Image
  src="/logo.png"
  width={200}
  height={100}
  alt="Logo"
  priority // Pour images above-the-fold
/>
```

### Lazy Loading
```tsx
import dynamic from "next/dynamic"

// Charger composant lourd dynamiquement
const HeavyChart = dynamic(() => import("@/components/HeavyChart"), {
  loading: () => <Spinner />,
  ssr: false, // Si pas nécessaire côté serveur
})
```

### Mémoïsation
```tsx
import { useMemo, useCallback } from "react"

// Calculs coûteux
const expensiveValue = useMemo(() => {
  return heavyCalculation(data)
}, [data])

// Callbacks stables
const handleClick = useCallback(() => {
  doSomething()
}, [])
```

### Virtualisation pour longues listes
```bash
npm install react-window
```

```tsx
import { FixedSizeList } from "react-window"

<FixedSizeList
  height={600}
  itemCount={1000}
  itemSize={50}
  width="100%"
>
  {({ index, style }) => (
    <div style={style}>Item {index}</div>
  )}
</FixedSizeList>
```

## Rate Limiting

### Configuration actuelle
- **Login**: Timing attack protection (1s delay)
- **Mutations**: 20 req/min
- **API GET**: 100 req/min
- **Export PDF**: 3 req/min

### Monitoring
```typescript
import { getRateLimitStats } from "@/lib/rate-limit"

const stats = getRateLimitStats()
console.log(`${stats.activeClients} clients, ${stats.totalRequests} requêtes`)
```

## Logging Structuré

### Utilisation
```typescript
import { logger } from "@/lib/logger"

// Niveaux
logger.error("Critical error", error, { userId, action })
logger.warn("Warning message", { context })
logger.info("Info message", { details })
logger.debug("Debug info", { data })

// Helpers
logger.apiRequest("GET", "/api/movements", userId, 150) // 150ms
logger.userAction("CREATE_MOVEMENT", userId, { amount: 100 })
logger.performance("fetchData", 1500) // Warn si > 1s
```

### Mesure de performance
```typescript
import { measurePerformance } from "@/lib/logger"

const result = await measurePerformance("expensiveOperation", async () => {
  return await heavyTask()
})
// Log automatique du temps d'exécution
```

## Métriques à Surveiller

### Backend
- Temps de réponse API (cible: <200ms)
- Taux d'erreur (<1%)
- Hit rate du cache (>70%)
- Requêtes DB par endpoint (<5)

### Frontend
- First Contentful Paint (<1.5s)
- Time to Interactive (<3.5s)
- Cumulative Layout Shift (<0.1)
- Largest Contentful Paint (<2.5s)

## Outils de Monitoring

### Lighthouse
```bash
npm install -g @lhci/cli
lhci autorun --collect.numberOfRuns=3
```

### Bundle Analyzer
```bash
npm install --save-dev @next/bundle-analyzer
```

```js
// next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

module.exports = withBundleAnalyzer(nextConfig)
```

```bash
ANALYZE=true npm run build
```

## Migration vers Redis (Production Multi-Instance)

### Installation
```bash
npm install ioredis
```

### Configuration
```typescript
// lib/redis.ts
import Redis from "ioredis"

export const redis = new Redis(process.env.REDIS_URL)

// Remplacer cache in-memory
export async function getCached<T>(key: string): Promise<T | null> {
  const cached = await redis.get(key)
  return cached ? JSON.parse(cached) : null
}

export async function setCached(key: string, value: any, ttl: number) {
  await redis.setex(key, ttl, JSON.stringify(value))
}
```

## Checklist Production

- [x] Cache implémenté
- [x] Index DB optimisés
- [x] Rate limiting actif
- [x] Logs structurés
- [x] Transactions Prisma
- [x] Pagination API
- [ ] CDN pour assets statiques
- [ ] Redis (si multi-instance)
- [ ] Compression gzip/brotli
- [ ] Service Worker PWA
- [ ] Monitoring temps réel

## Ressources

- [Next.js Performance](https://nextjs.org/docs/advanced-features/measuring-performance)
- [Prisma Best Practices](https://www.prisma.io/docs/guides/performance-and-optimization)
- [Web.dev Performance](https://web.dev/performance/)
