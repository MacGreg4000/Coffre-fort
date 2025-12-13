import {
  createUserSchema,
  createMovementSchema,
  createInventorySchema,
  createCoffreSchema,
  validateRequest,
} from '@/lib/validations'

describe('Validations Zod', () => {
  describe('createUserSchema', () => {
    it('devrait valider un utilisateur valide', () => {
      const validUser = {
        email: 'test@example.com',
        password: 'StrongP@ssw0rd123',
        name: 'Test User',
        role: 'USER' as const,
      }

      const result = validateRequest(createUserSchema, validUser)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.email).toBe(validUser.email)
      }
    })

    it('devrait rejeter un email invalide', () => {
      const invalidUser = {
        email: 'invalid-email',
        password: 'StrongP@ssw0rd123',
        name: 'Test User',
        role: 'USER' as const,
      }

      const result = validateRequest(createUserSchema, invalidUser)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('Email invalide')
      }
    })

    it('devrait rejeter un mot de passe trop court', () => {
      const invalidUser = {
        email: 'test@example.com',
        password: 'Short1!',
        name: 'Test User',
        role: 'USER' as const,
      }

      const result = validateRequest(createUserSchema, invalidUser)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('12 caractères')
      }
    })

    it('devrait rejeter un mot de passe sans majuscule', () => {
      const invalidUser = {
        email: 'test@example.com',
        password: 'weakp@ssw0rd123',
        name: 'Test User',
        role: 'USER' as const,
      }

      const result = validateRequest(createUserSchema, invalidUser)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('majuscule')
      }
    })

    it('devrait rejeter un mot de passe sans caractère spécial', () => {
      const invalidUser = {
        email: 'test@example.com',
        password: 'WeakPassword123',
        name: 'Test User',
        role: 'USER' as const,
      }

      const result = validateRequest(createUserSchema, invalidUser)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('caractère spécial')
      }
    })
  })

  describe('createMovementSchema', () => {
    it('devrait valider un mouvement valide', () => {
      const validMovement = {
        coffreId: '123e4567-e89b-12d3-a456-426614174000',
        type: 'ENTRY' as const,
        billets: {
          5: 10,
          10: 5,
          20: 2,
        },
        description: 'Test movement',
      }

      const result = validateRequest(createMovementSchema, validMovement)
      expect(result.success).toBe(true)
    })

    it('devrait rejeter un UUID invalide', () => {
      const invalidMovement = {
        coffreId: 'invalid-uuid',
        type: 'ENTRY' as const,
        billets: { 5: 10 },
      }

      const result = validateRequest(createMovementSchema, invalidMovement)
      expect(result.success).toBe(false)
    })

    it('devrait rejeter des quantités négatives', () => {
      const invalidMovement = {
        coffreId: '123e4567-e89b-12d3-a456-426614174000',
        type: 'ENTRY' as const,
        billets: { 5: -10 },
      }

      const result = validateRequest(createMovementSchema, invalidMovement)
      expect(result.success).toBe(false)
    })

    it('devrait rejeter des quantités trop grandes', () => {
      const invalidMovement = {
        coffreId: '123e4567-e89b-12d3-a456-426614174000',
        type: 'ENTRY' as const,
        billets: { 5: 99999 },
      }

      const result = validateRequest(createMovementSchema, invalidMovement)
      expect(result.success).toBe(false)
    })
  })

  describe('createCoffreSchema', () => {
    it('devrait valider un coffre valide', () => {
      const validCoffre = {
        name: 'Caisse Principale',
        description: 'Description du coffre',
      }

      const result = validateRequest(createCoffreSchema, validCoffre)
      expect(result.success).toBe(true)
    })

    it('devrait rejeter un nom trop court', () => {
      const invalidCoffre = {
        name: 'A',
        description: 'Description',
      }

      const result = validateRequest(createCoffreSchema, invalidCoffre)
      expect(result.success).toBe(false)
    })

    it('devrait accepter un coffre sans description', () => {
      const validCoffre = {
        name: 'Caisse Principale',
      }

      const result = validateRequest(createCoffreSchema, validCoffre)
      expect(result.success).toBe(true)
    })
  })
})
