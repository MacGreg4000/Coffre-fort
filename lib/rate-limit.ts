import { NextRequest } from "next/server"

// ============================================
// RATE LIMITING IN-MEMORY
// ============================================
// Note: Pour du multi-instance, utiliser Redis avec @upstash/ratelimit

interface RateLimitRecord {
  count: number
  resetTime: number
}

// Stockage en mémoire (Map pour performance)
const rateLimitStore = new Map<string, RateLimitRecord>()

// Nettoyage automatique toutes les 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key)
    }
  }
}, 5 * 60 * 1000) // 5 minutes

export interface RateLimitConfig {
  /** Nombre maximum de requêtes */
  maxRequests: number
  /** Fenêtre de temps en millisecondes */
  windowMs: number
  /** Message d'erreur personnalisé */
  message?: string
}

export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: number
  retryAfter?: number
}

/**
 * Extraire l'identifiant du client (IP ou user ID)
 */
function getClientIdentifier(req: NextRequest, userId?: string): string {
  if (userId) {
    return `user:${userId}`
  }
  
  // Récupérer l'IP (supporte proxy/load balancer)
  const forwarded = req.headers.get("x-forwarded-for")
  const realIp = req.headers.get("x-real-ip")
  const ip = forwarded?.split(",")[0] || realIp || "unknown"
  
  return `ip:${ip}`
}

/**
 * Vérifier et appliquer le rate limiting
 */
export function rateLimit(
  req: NextRequest,
  config: RateLimitConfig,
  userId?: string
): RateLimitResult {
  const { maxRequests, windowMs, message } = config
  const now = Date.now()
  const identifier = getClientIdentifier(req, userId)
  
  // Récupérer ou créer l'enregistrement
  let record = rateLimitStore.get(identifier)
  
  // Si pas d'enregistrement ou expiré, créer un nouveau
  if (!record || now > record.resetTime) {
    record = {
      count: 0,
      resetTime: now + windowMs,
    }
    rateLimitStore.set(identifier, record)
  }
  
  // Incrémenter le compteur
  record.count++
  
  // Calculer les valeurs de retour
  const remaining = Math.max(0, maxRequests - record.count)
  const reset = Math.ceil(record.resetTime / 1000) // En secondes Unix
  
  // Vérifier si la limite est dépassée
  if (record.count > maxRequests) {
    const retryAfter = Math.ceil((record.resetTime - now) / 1000)
    return {
      success: false,
      limit: maxRequests,
      remaining: 0,
      reset,
      retryAfter,
    }
  }
  
  return {
    success: true,
    limit: maxRequests,
    remaining,
    reset,
  }
}

/**
 * Helper pour créer une réponse de rate limit dépassée
 */
export function createRateLimitResponse(result: RateLimitResult, message?: string) {
  const headers = new Headers({
    "X-RateLimit-Limit": result.limit.toString(),
    "X-RateLimit-Remaining": result.remaining.toString(),
    "X-RateLimit-Reset": result.reset.toString(),
  })
  
  if (result.retryAfter) {
    headers.set("Retry-After", result.retryAfter.toString())
  }
  
  return new Response(
    JSON.stringify({
      error: message || "Trop de requêtes. Veuillez réessayer plus tard.",
      retryAfter: result.retryAfter,
    }),
    {
      status: 429,
      headers,
    }
  )
}

// ============================================
// CONFIGURATIONS PRÉDÉFINIES
// ============================================

/** Rate limit strict pour l'authentification (5 tentatives / 5 minutes) */
export const AUTH_RATE_LIMIT: RateLimitConfig = {
  maxRequests: 5,
  windowMs: 5 * 60 * 1000, // 5 minutes
  message: "Trop de tentatives de connexion. Veuillez réessayer dans quelques minutes.",
}

/** Rate limit pour les mutations sensibles (20 / minute) */
export const MUTATION_RATE_LIMIT: RateLimitConfig = {
  maxRequests: 20,
  windowMs: 60 * 1000, // 1 minute
  message: "Trop de requêtes. Veuillez ralentir.",
}

/** Rate limit global pour les API (100 / minute) */
export const API_RATE_LIMIT: RateLimitConfig = {
  maxRequests: 100,
  windowMs: 60 * 1000, // 1 minute
}

/** Rate limit pour les exports PDF (3 / minute) */
export const EXPORT_RATE_LIMIT: RateLimitConfig = {
  maxRequests: 3,
  windowMs: 60 * 1000, // 1 minute
  message: "Vous générez trop d'exports. Veuillez patienter.",
}

/**
 * Middleware helper pour appliquer le rate limiting
 */
export function withRateLimit(
  config: RateLimitConfig,
  userId?: string
) {
  return (req: NextRequest): RateLimitResult | null => {
    const result = rateLimit(req, config, userId)
    return result.success ? null : result
  }
}

/**
 * Statistiques de rate limiting (pour monitoring)
 */
export function getRateLimitStats() {
  const now = Date.now()
  let activeRecords = 0
  let totalRequests = 0
  
  for (const [_, record] of rateLimitStore.entries()) {
    if (now <= record.resetTime) {
      activeRecords++
      totalRequests += record.count
    }
  }
  
  return {
    activeClients: activeRecords,
    totalRequests,
    storeSize: rateLimitStore.size,
  }
}



