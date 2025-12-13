import { NextRequest } from 'next/server'
import { rateLimit, AUTH_RATE_LIMIT, MUTATION_RATE_LIMIT } from '@/lib/rate-limit'

// Mock NextRequest
function createMockRequest(ip: string = '127.0.0.1'): NextRequest {
  return {
    headers: new Headers({
      'x-forwarded-for': ip,
    }),
  } as NextRequest
}

describe('Rate Limiting', () => {
  beforeEach(() => {
    // Clear rate limit store before each test
    jest.clearAllMocks()
  })

  describe('rateLimit', () => {
    it('devrait autoriser les premières requêtes', () => {
      const req = createMockRequest('192.168.1.1')
      const config = { maxRequests: 5, windowMs: 60000 }

      const result = rateLimit(req, config)
      
      expect(result.success).toBe(true)
      expect(result.remaining).toBe(4)
    })

    it('devrait bloquer après la limite', () => {
      const req = createMockRequest('192.168.1.2')
      const config = { maxRequests: 3, windowMs: 60000 }

      // Faire 3 requêtes (limite)
      rateLimit(req, config)
      rateLimit(req, config)
      rateLimit(req, config)

      // La 4ème devrait être bloquée
      const result = rateLimit(req, config)
      
      expect(result.success).toBe(false)
      expect(result.remaining).toBe(0)
      expect(result.retryAfter).toBeDefined()
    })

    it('devrait différencier les IPs', () => {
      const req1 = createMockRequest('192.168.1.1')
      const req2 = createMockRequest('192.168.1.2')
      const config = { maxRequests: 2, windowMs: 60000 }

      // IP1: 2 requêtes OK
      expect(rateLimit(req1, config).success).toBe(true)
      expect(rateLimit(req1, config).success).toBe(true)
      
      // IP1: 3ème bloquée
      expect(rateLimit(req1, config).success).toBe(false)
      
      // IP2: Toujours OK (différente IP)
      expect(rateLimit(req2, config).success).toBe(true)
    })

    it('devrait utiliser userId si fourni', () => {
      const req = createMockRequest('192.168.1.1')
      const config = { maxRequests: 2, windowMs: 60000 }
      const userId = 'user-123'

      // 2 requêtes avec userId
      expect(rateLimit(req, config, userId).success).toBe(true)
      expect(rateLimit(req, config, userId).success).toBe(true)
      
      // 3ème bloquée pour cet userId
      expect(rateLimit(req, config, userId).success).toBe(false)
      
      // Mais OK pour un autre userId
      expect(rateLimit(req, config, 'user-456').success).toBe(true)
    })

    it('devrait retourner les bons headers', () => {
      const req = createMockRequest('192.168.1.3')
      const config = { maxRequests: 5, windowMs: 60000 }

      const result = rateLimit(req, config)
      
      expect(result.limit).toBe(5)
      expect(result.remaining).toBe(4)
      expect(result.reset).toBeGreaterThan(0)
    })
  })

  describe('Configurations prédéfinies', () => {
    it('AUTH_RATE_LIMIT devrait être restrictif', () => {
      expect(AUTH_RATE_LIMIT.maxRequests).toBe(5)
      expect(AUTH_RATE_LIMIT.windowMs).toBe(5 * 60 * 1000) // 5 minutes
    })

    it('MUTATION_RATE_LIMIT devrait être modéré', () => {
      expect(MUTATION_RATE_LIMIT.maxRequests).toBe(20)
      expect(MUTATION_RATE_LIMIT.windowMs).toBe(60 * 1000) // 1 minute
    })
  })
})
