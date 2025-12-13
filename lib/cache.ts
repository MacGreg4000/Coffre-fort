import { logger } from "@/lib/logger"

// ============================================
// SYSTÈME DE CACHE IN-MEMORY
// ============================================
// Cache simple avec TTL et invalidation. Pour production avec multi-instance, utiliser Redis.

interface CacheEntry<T> {
  value: T
  expiresAt: number
}

class Cache {
  private store = new Map<string, CacheEntry<any>>()
  private defaultTTL = 5 * 60 * 1000 // 5 minutes par défaut

  constructor() {
    // Nettoyage automatique toutes les minutes
    setInterval(() => this.cleanup(), 60 * 1000)
  }

  /**
   * Récupérer une valeur du cache
   */
  get<T>(key: string): T | null {
    const entry = this.store.get(key)
    
    if (!entry) {
      return null
    }

    // Vérifier l'expiration
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key)
      logger.debug(`Cache expired: ${key}`)
      return null
    }

    logger.debug(`Cache hit: ${key}`)
    return entry.value
  }

  /**
   * Stocker une valeur dans le cache
   */
  set<T>(key: string, value: T, ttlMs?: number): void {
    const ttl = ttlMs || this.defaultTTL
    const expiresAt = Date.now() + ttl

    this.store.set(key, { value, expiresAt })
    logger.debug(`Cache set: ${key} (TTL: ${ttl}ms)`)
  }

  /**
   * Supprimer une clé spécifique
   */
  delete(key: string): void {
    this.store.delete(key)
    logger.debug(`Cache deleted: ${key}`)
  }

  /**
   * Supprimer toutes les clés correspondant à un pattern
   */
  invalidatePattern(pattern: string): void {
    let count = 0
    for (const key of this.store.keys()) {
      if (key.includes(pattern)) {
        this.store.delete(key)
        count++
      }
    }
    logger.info(`Cache invalidated pattern: ${pattern} (${count} keys)`)
  }

  /**
   * Vider tout le cache
   */
  clear(): void {
    const size = this.store.size
    this.store.clear()
    logger.info(`Cache cleared (${size} keys removed)`)
  }

  /**
   * Nettoyage des entrées expirées
   */
  private cleanup(): void {
    const now = Date.now()
    let removed = 0

    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) {
        this.store.delete(key)
        removed++
      }
    }

    if (removed > 0) {
      logger.debug(`Cache cleanup: ${removed} expired entries removed`)
    }
  }

  /**
   * Statistiques du cache
   */
  stats() {
    const now = Date.now()
    let active = 0
    let expired = 0

    for (const entry of this.store.values()) {
      if (now > entry.expiresAt) {
        expired++
      } else {
        active++
      }
    }

    return {
      total: this.store.size,
      active,
      expired,
    }
  }

  /**
   * Wrapper pour fonctions avec cache automatique
   */
  async wrap<T>(
    key: string,
    fn: () => Promise<T>,
    ttlMs?: number
  ): Promise<T> {
    // Vérifier le cache
    const cached = this.get<T>(key)
    if (cached !== null) {
      return cached
    }

    // Exécuter la fonction et cacher le résultat
    const result = await fn()
    this.set(key, result, ttlMs)
    return result
  }
}

// Export singleton
export const cache = new Cache()

// ============================================
// HELPERS SPÉCIFIQUES À L'APPLICATION
// ============================================

/**
 * Cache pour les balances de coffres (5 minutes)
 */
export async function getCachedBalance(
  coffreId: string,
  fetchFn: () => Promise<number>
): Promise<number> {
  return cache.wrap(`balance:${coffreId}`, fetchFn, 5 * 60 * 1000)
}

/**
 * Invalider le cache d'un coffre après un mouvement
 */
export function invalidateCoffreCache(coffreId: string): void {
  cache.delete(`balance:${coffreId}`)
  cache.invalidatePattern(`coffre:${coffreId}`)
}

/**
 * Cache pour les listes de coffres d'un utilisateur (2 minutes)
 */
export async function getCachedUserCoffres<T>(
  userId: string,
  fetchFn: () => Promise<T>
): Promise<T> {
  return cache.wrap(`user:${userId}:coffres`, fetchFn, 2 * 60 * 1000)
}

/**
 * Invalider le cache utilisateur après modification
 */
export function invalidateUserCache(userId: string): void {
  cache.invalidatePattern(`user:${userId}`)
}

/**
 * Cache pour les stats dashboard (1 minute)
 */
export async function getCachedDashboardStats<T>(
  userId: string,
  coffreId: string | null,
  fetchFn: () => Promise<T>
): Promise<T> {
  const key = coffreId 
    ? `dashboard:${userId}:${coffreId}` 
    : `dashboard:${userId}:all`
  return cache.wrap(key, fetchFn, 60 * 1000) // 1 minute
}
