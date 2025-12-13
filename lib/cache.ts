// ============================================
// CACHE IN-MEMORY SIMPLE
// ============================================
// Pour production multi-instance: migrer vers Redis

interface CacheEntry<T> {
  value: T
  expiresAt: number
}

class SimpleCache {
  private store = new Map<string, CacheEntry<any>>()
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor() {
    // Nettoyage automatique toutes les 5 minutes
    if (typeof window === 'undefined') {
      this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000)
    }
  }

  /**
   * Définir une valeur dans le cache
   */
  set<T>(key: string, value: T, ttlSeconds: number = 300): void {
    const expiresAt = Date.now() + ttlSeconds * 1000
    this.store.set(key, { value, expiresAt })
  }

  /**
   * Récupérer une valeur du cache
   */
  get<T>(key: string): T | null {
    const entry = this.store.get(key)
    
    if (!entry) {
      return null
    }
    
    // Vérifier si expiré
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key)
      return null
    }
    
    return entry.value as T
  }

  /**
   * Récupérer ou calculer une valeur
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttlSeconds: number = 300
  ): Promise<T> {
    // Essayer de récupérer depuis le cache
    const cached = this.get<T>(key)
    if (cached !== null) {
      return cached
    }
    
    // Calculer la valeur
    const value = await factory()
    
    // Stocker dans le cache
    this.set(key, value, ttlSeconds)
    
    return value
  }

  /**
   * Invalider une clé
   */
  invalidate(key: string): void {
    this.store.delete(key)
  }

  /**
   * Invalider toutes les clés commençant par un préfixe
   */
  invalidatePrefix(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key)
      }
    }
  }

  /**
   * Vider tout le cache
   */
  clear(): void {
    this.store.clear()
  }

  /**
   * Nettoyer les entrées expirées
   */
  private cleanup(): void {
    const now = Date.now()
    let cleaned = 0
    
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) {
        this.store.delete(key)
        cleaned++
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 Cache cleanup: ${cleaned} entries removed`)
    }
  }

  /**
   * Statistiques du cache
   */
  getStats() {
    const now = Date.now()
    let expired = 0
    let valid = 0
    
    for (const entry of this.store.values()) {
      if (now > entry.expiresAt) {
        expired++
      } else {
        valid++
      }
    }
    
    return {
      total: this.store.size,
      valid,
      expired,
    }
  }

  /**
   * Nettoyer à la destruction
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }
    this.clear()
  }
}

// Export singleton
export const cache = new SimpleCache()

// ============================================
// HELPERS POUR CACHING DE DONNÉES COMMUNES
// ============================================

/**
 * Cache des balances de coffres (5 minutes)
 */
export async function getCachedCoffreBalance(
  coffreId: string,
  fetcher: () => Promise<number>
): Promise<number> {
  return cache.getOrSet(`balance:${coffreId}`, fetcher, 300)
}

/**
 * Invalider le cache de balance d'un coffre
 */
export function invalidateCoffreBalance(coffreId: string): void {
  cache.invalidate(`balance:${coffreId}`)
}

/**
 * Cache des données utilisateur (10 minutes)
 */
export async function getCachedUser<T>(
  userId: string,
  fetcher: () => Promise<T>
): Promise<T> {
  return cache.getOrSet(`user:${userId}`, fetcher, 600)
}

/**
 * Cache des coffres accessibles (5 minutes)
 */
export async function getCachedUserCoffres<T>(
  userId: string,
  fetcher: () => Promise<T>
): Promise<T> {
  return cache.getOrSet(`user-coffres:${userId}`, fetcher, 300)
}

/**
 * Invalider tout le cache d'un utilisateur
 */
export function invalidateUserCache(userId: string): void {
  cache.invalidatePrefix(`user:${userId}`)
  cache.invalidatePrefix(`user-coffres:${userId}`)
}
