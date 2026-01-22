// Rate limiting utilities
export interface RateLimitConfig {
  max: number
  windowMs: number
  message?: string
}

export class RateLimiter {
  public attempts = new Map<string, number[]>()
  
  checkLimit(key: string, maxAttempts: number, windowMs: number): boolean {
    const now = Date.now()
    const attempts = this.attempts.get(key) || []
    
    // Remove old attempts outside the window
    const validAttempts = attempts.filter(time => now - time < windowMs)
    
    if (validAttempts.length >= maxAttempts) {
      return false
    }
    
    validAttempts.push(now)
    this.attempts.set(key, validAttempts)
    return true
  }
}

export const rateLimiter = new RateLimiter()

// Rate limit constants
export const API_RATE_LIMIT = {
  max: 100, // requests
  windowMs: 15 * 60 * 1000, // 15 minutes
}

export const MUTATION_RATE_LIMIT = {
  max: 20, // requests
  windowMs: 60 * 1000, // 1 minute
}

export const AUTH_RATE_LIMIT = {
  max: 5, // requests
  windowMs: 15 * 60 * 1000, // 15 minutes
}

export const SETUP_RATE_LIMIT = {
  max: 10, // requests - plus permissif pour permettre plusieurs tentatives lors du setup initial
  windowMs: 5 * 60 * 1000, // 5 minutes
}

export const EXPORT_RATE_LIMIT = {
  max: 3, // requests
  windowMs: 60 * 60 * 1000, // 1 hour
}

// Fonction rateLimit pour le middleware API
import { NextRequest } from "next/server"

export function rateLimitMiddleware(
  req: NextRequest,
  config: { max: number; windowMs: number; message?: string },
  userId: string | null = null
): { success: boolean; limit?: number; remaining?: number } {
  // Créer une clé unique basée sur l'IP et l'utilisateur
  const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0] || 
                    req.headers.get("x-real-ip") || 
                    "unknown"
  const key = userId ? `user:${userId}` : `ip:${ipAddress}`
  
  const now = Date.now()
  const attempts = rateLimiter.attempts.get(key) || []
  
  // Nettoyer les tentatives anciennes
  const validAttempts = attempts.filter((time: number) => now - time < config.windowMs)
  
  const remaining = Math.max(0, config.max - validAttempts.length)
  const success = validAttempts.length < config.max
  
  if (success) {
    validAttempts.push(now)
    rateLimiter.attempts.set(key, validAttempts)
  }
  
  return {
    success,
    limit: config.max,
    remaining: success ? remaining - 1 : 0
  }
}

// Alias pour compatibilité
export const rateLimit = rateLimitMiddleware

export const createRateLimitResponse = (result?: { limit?: number; remaining?: number }, message?: string) => {
  return new Response(JSON.stringify({
    error: message || "Trop de requêtes. Veuillez réessayer plus tard.",
    limit: result?.limit,
    remaining: result?.remaining
  }), {
    status: 429,
    headers: {
      'Content-Type': 'application/json',
      'Retry-After': '60'
    }
  })
}