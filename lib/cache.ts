// Cache utilities
export class Cache {
  private cache = new Map<string, any>()

  get(key: string): any {
    return this.cache.get(key)
  }

  set(key: string, value: any): void {
    this.cache.set(key, value)
  }

  has(key: string): boolean {
    return this.cache.has(key)
  }

  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
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

export const getCachedBalanceInfo = async (coffreId: string, calculateFunction?: () => Promise<any>) => {
  const cacheKey = `balance:${coffreId}`
  const cached = cache.get(cacheKey)

  if (cached && !calculateFunction) {
    return cached
  }

  if (calculateFunction) {
    const result = await calculateFunction()
    cache.set(cacheKey, result)
    return result
  }

  return cached
}

export const setCachedBalanceInfo = (coffreId: string, balanceInfo: any): void => {
  const cacheKey = `balance:${coffreId}`
  cache.set(cacheKey, balanceInfo)
}

export const getCachedDashboardStats = (userId: string, coffreId?: string, calculateFunction?: () => Promise<any>) => {
  const cacheKey = `dashboard:${userId}:${coffreId || 'all'}`
  const cached = cache.get(cacheKey)

  if (cached && !calculateFunction) {
    return cached
  }

  if (calculateFunction) {
    // Cette fonction devrait être appelée de manière asynchrone
    // Pour l'instant, on retourne null et laisse l'appelant gérer
    return null
  }

  return cached
}

export const setCachedDashboardStats = (userId: string, coffreId: string | undefined, stats: any): void => {
  const cacheKey = `dashboard:${userId}:${coffreId || 'all'}`
  cache.set(cacheKey, stats)
}