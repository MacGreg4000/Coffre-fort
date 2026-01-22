// Rate limiting utilities
export class RateLimiter {
  private attempts = new Map<string, number[]>()

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

export const EXPORT_RATE_LIMIT = {
  max: 3, // requests
  windowMs: 60 * 60 * 1000, // 1 hour
}

export const rateLimit = (options: { max: number; windowMs: number }) => {
  return (key: string) => rateLimiter.checkLimit(key, options.max, options.windowMs)
}

export const createRateLimitResponse = () => {
  return new Response(JSON.stringify({
    error: "Trop de requêtes. Veuillez réessayer plus tard."
  }), {
    status: 429,
    headers: {
      'Content-Type': 'application/json',
      'Retry-After': '60'
    }
  })
}