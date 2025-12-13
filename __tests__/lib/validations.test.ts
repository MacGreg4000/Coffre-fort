import {
  createUserSchema,
  createMovementSchema,
  createInventorySchema,
  createCoffreSchema,
  validateRequest,
} from "@/lib/validations"

describe("Validations", () => {
  describe("createUserSchema", () => {
    it("should validate a correct user", () => {
      const validUser = {
        email: "test@example.com",
        password: "SecurePass123!",
        name: "Test User",
        role: "USER" as const,
      }

      const result = validateRequest(createUserSchema, validUser)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual(validUser)
      }
    })

    it("should reject invalid email", () => {
      const invalidUser = {
        email: "invalid-email",
        password: "SecurePass123!",
        name: "Test User",
        role: "USER" as const,
      }

      const result = validateRequest(createUserSchema, invalidUser)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain("Email invalide")
      }
    })

    it("should reject weak password", () => {
      const weakPasswords = [
        "short", // Trop court
        "nouppercase123!", // Pas de majuscule
        "NOLOWERCASE123!", // Pas de minuscule
        "NoNumbers!", // Pas de chiffre
        "NoSpecialChar123", // Pas de caractère spécial
      ]

      weakPasswords.forEach((password) => {
        const result = validateRequest(createUserSchema, {
          email: "test@example.com",
          password,
          name: "Test User",
          role: "USER" as const,
        })
        expect(result.success).toBe(false)
      })
    })

    it("should require name with at least 2 characters", () => {
      const result = validateRequest(createUserSchema, {
        email: "test@example.com",
        password: "SecurePass123!",
        name: "A",
        role: "USER" as const,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain("au moins 2 caractères")
      }
    })
  })

  describe("createMovementSchema", () => {
    it("should validate a correct movement", () => {
      const validMovement = {
        coffreId: "550e8400-e29b-41d4-a716-446655440000",
        type: "ENTRY" as const,
        billets: {
          "5": 10,
          "10": 5,
          "20": 2,
        },
        description: "Test movement",
      }

      const result = validateRequest(createMovementSchema, validMovement)
      expect(result.success).toBe(true)
    })

    it("should reject invalid UUID", () => {
      const result = validateRequest(createMovementSchema, {
        coffreId: "invalid-uuid",
        type: "ENTRY" as const,
        billets: { "5": 10 },
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain("coffre invalide")
      }
    })

    it("should reject negative billet quantities", () => {
      const result = validateRequest(createMovementSchema, {
        coffreId: "550e8400-e29b-41d4-a716-446655440000",
        type: "ENTRY" as const,
        billets: { "5": -10 },
      })

      expect(result.success).toBe(false)
    })

    it("should reject invalid movement type", () => {
      const result = validateRequest(createMovementSchema, {
        coffreId: "550e8400-e29b-41d4-a716-446655440000",
        type: "INVALID" as any,
        billets: { "5": 10 },
      })

      expect(result.success).toBe(false)
    })
  })

  describe("createCoffreSchema", () => {
    it("should validate a correct coffre", () => {
      const validCoffre = {
        name: "Main Safe",
        description: "Primary safe for cash management",
      }

      const result = validateRequest(createCoffreSchema, validCoffre)
      expect(result.success).toBe(true)
    })

    it("should allow coffre without description", () => {
      const result = validateRequest(createCoffreSchema, {
        name: "Main Safe",
      })

      expect(result.success).toBe(true)
    })

    it("should reject too short name", () => {
      const result = validateRequest(createCoffreSchema, {
        name: "A",
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain("au moins 2 caractères")
      }
    })
  })

  describe("createInventorySchema", () => {
    it("should validate a correct inventory", () => {
      const validInventory = {
        coffreId: "550e8400-e29b-41d4-a716-446655440000",
        billets: {
          "5": 100,
          "10": 50,
          "20": 25,
          "50": 10,
          "100": 5,
          "200": 2,
          "500": 1,
        },
        notes: "Monthly inventory",
      }

      const result = validateRequest(createInventorySchema, validInventory)
      expect(result.success).toBe(true)
    })

    it("should allow inventory without notes", () => {
      const result = validateRequest(createInventorySchema, {
        coffreId: "550e8400-e29b-41d4-a716-446655440000",
        billets: { "5": 100 },
      })

      expect(result.success).toBe(true)
    })
  })
})
