// Cache utilities avec TTL (Time To Live)
interface CacheEntry {
  value: any
  expiresAt: number
}

export class Cache {
  private cache = new Map<string, CacheEntry>()

  get(key: string): any | null {
    const entry = this.cache.get(key)
    if (!entry) return null
    
    // Vérifier si l'entrée a expiré
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return null
    }
    
    return entry.value
  }

  set(key: string, value: any, ttlMs: number = 5 * 60 * 1000): void {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlMs
    })
  }

  has(key: string): boolean {
    const entry = this.cache.get(key)
    if (!entry) return false
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return false
    }
    
    return true
  }

  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  // Invalider toutes les clés qui correspondent à un pattern
  invalidatePattern(pattern: string): void {
    const keysToDelete: string[] = []
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        keysToDelete.push(key)
      }
    }
    keysToDelete.forEach(key => this.cache.delete(key))
  }

  // Nettoyer les entrées expirées
  cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key)
      }
    }
  }
}

export const cache = new Cache()

export const invalidateCoffreCache = (coffreId: string): void => {
  // Invalidate all cache entries related to this coffre
  const keysToDelete = []
  for (const key of cache.cache.keys()) {
    if (key.includes(`coffre:${coffreId}`) || key.includes(`coffres`)) {
      keysToDelete.push(key)
    }
  }
  keysToDelete.forEach(key => cache.delete(key))
}

export const invalidateUserCache = (userId: string): void => {
  // Invalidate all cache entries related to this user
  const keysToDelete = []
  for (const key of cache.cache.keys()) {
    if (key.includes(`user:${userId}`) || key.includes(`users`)) {
      keysToDelete.push(key)
    }
  }
  keysToDelete.forEach(key => cache.delete(key))
}

export const getCachedBalanceInfo = async (coffreId: string, calculateFunction?: () => Promise<any>, ttlMs: number = 5 * 60 * 1000) => {
  const cacheKey = `balance:${coffreId}`
  const cached = cache.get(cacheKey)

  if (cached && !calculateFunction) {
    return cached
  }

  if (calculateFunction) {
    const result = await calculateFunction()
    cache.set(cacheKey, result, ttlMs)
    return result
  }

  return cached
}

export const setCachedBalanceInfo = (coffreId: string, balanceInfo: any): void => {
  const cacheKey = `balance:${coffreId}`
  cache.set(cacheKey, balanceInfo)
}

export const getCachedDashboardStats = async (userId: string, coffreId: string | undefined, calculateFunction: () => Promise<any>, ttlMs: number = 60 * 1000) => {
  const cacheKey = `dashboard:${userId}:${coffreId || 'all'}`
  const cached = cache.get(cacheKey)

  if (cached) {
    return cached
  }

  // Exécuter la fonction de calcul et mettre en cache
  const result = await calculateFunction()
  cache.set(cacheKey, result, ttlMs)
  return result
}

export const setCachedDashboardStats = (userId: string, coffreId: string | undefined, stats: any): void => {
  const cacheKey = `dashboard:${userId}:${coffreId || 'all'}`
  cache.set(cacheKey, stats)
}