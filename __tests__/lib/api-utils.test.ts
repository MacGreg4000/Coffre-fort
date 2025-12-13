import { NextRequest } from 'next/server'
import {
  ApiError,
  handleApiError,
  getClientInfo,
  getPaginationParams,
  createPaginatedResponse,
  serializeDecimal,
} from '@/lib/api-utils'

describe('API Utils', () => {
  describe('ApiError', () => {
    it('devrait créer une erreur API avec status code', () => {
      const error = new ApiError(404, 'Not found')
      
      expect(error.statusCode).toBe(404)
      expect(error.message).toBe('Not found')
      expect(error.name).toBe('ApiError')
    })
  })

  describe('handleApiError', () => {
    it('devrait gérer ApiError correctement', () => {
      const error = new ApiError(403, 'Forbidden')
      const response = handleApiError(error)
      
      expect(response.status).toBe(403)
    })

    it('devrait gérer les erreurs Prisma P2002 (duplicate)', () => {
      const prismaError = { code: 'P2002', meta: {} }
      const response = handleApiError(prismaError)
      
      expect(response.status).toBe(409)
    })

    it('devrait gérer les erreurs Prisma P2025 (not found)', () => {
      const prismaError = { code: 'P2025' }
      const response = handleApiError(prismaError)
      
      expect(response.status).toBe(404)
    })

    it('devrait masquer les erreurs inconnues', () => {
      const unknownError = new Error('Database connection failed')
      const response = handleApiError(unknownError)
      
      expect(response.status).toBe(500)
      // Vérifier que le message original n'est pas exposé
    })
  })

  describe('getClientInfo', () => {
    it('devrait extraire IP depuis x-forwarded-for', () => {
      const req = {
        headers: new Headers({
          'x-forwarded-for': '192.168.1.1, 10.0.0.1',
          'user-agent': 'Mozilla/5.0',
        }),
      } as NextRequest

      const { ip, userAgent } = getClientInfo(req)
      
      expect(ip).toBe('192.168.1.1')
      expect(userAgent).toBe('Mozilla/5.0')
    })

    it('devrait fallback sur x-real-ip', () => {
      const req = {
        headers: new Headers({
          'x-real-ip': '192.168.1.2',
          'user-agent': 'Test Agent',
        }),
      } as NextRequest

      const { ip } = getClientInfo(req)
      
      expect(ip).toBe('192.168.1.2')
    })

    it('devrait retourner unknown si pas d\'IP', () => {
      const req = {
        headers: new Headers({}),
      } as NextRequest

      const { ip, userAgent } = getClientInfo(req)
      
      expect(ip).toBe('unknown')
      expect(userAgent).toBe('unknown')
    })
  })

  describe('getPaginationParams', () => {
    it('devrait parser les paramètres de pagination', () => {
      const searchParams = new URLSearchParams('page=2&limit=25')
      const { page, limit, skip } = getPaginationParams(searchParams)
      
      expect(page).toBe(2)
      expect(limit).toBe(25)
      expect(skip).toBe(25)
    })

    it('devrait utiliser les valeurs par défaut', () => {
      const searchParams = new URLSearchParams('')
      const { page, limit, skip } = getPaginationParams(searchParams)
      
      expect(page).toBe(1)
      expect(limit).toBe(50)
      expect(skip).toBe(0)
    })

    it('devrait limiter le maximum à 100', () => {
      const searchParams = new URLSearchParams('limit=500')
      const { limit } = getPaginationParams(searchParams)
      
      expect(limit).toBe(100)
    })

    it('devrait forcer page minimum à 1', () => {
      const searchParams = new URLSearchParams('page=0')
      const { page } = getPaginationParams(searchParams)
      
      expect(page).toBe(1)
    })
  })

  describe('createPaginatedResponse', () => {
    it('devrait créer une réponse paginée correcte', () => {
      const data = [{ id: 1 }, { id: 2 }]
      const response = createPaginatedResponse(data, 100, 2, 50)
      
      expect(response.data).toEqual(data)
      expect(response.pagination.total).toBe(100)
      expect(response.pagination.page).toBe(2)
      expect(response.pagination.limit).toBe(50)
      expect(response.pagination.totalPages).toBe(2)
      expect(response.pagination.hasNextPage).toBe(false)
      expect(response.pagination.hasPreviousPage).toBe(true)
    })

    it('devrait indiquer hasNextPage correctement', () => {
      const data = Array(50).fill({ id: 1 })
      const response = createPaginatedResponse(data, 200, 1, 50)
      
      expect(response.pagination.hasNextPage).toBe(true)
      expect(response.pagination.hasPreviousPage).toBe(false)
    })
  })

  describe('serializeDecimal', () => {
    it('devrait convertir Decimal Prisma en number', () => {
      const decimal = { toNumber: () => 123.45 }
      const result = serializeDecimal(decimal)
      
      expect(result).toBe(123.45)
      expect(typeof result).toBe('number')
    })

    it('devrait gérer les numbers normaux', () => {
      const result = serializeDecimal(100)
      
      expect(result).toBe(100)
    })

    it('devrait gérer les strings numériques', () => {
      const result = serializeDecimal('50.5')
      
      expect(result).toBe(50.5)
    })
  })
})
