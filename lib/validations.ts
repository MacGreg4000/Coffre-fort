// Validations utilities
import { z } from "zod"

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export const validatePassword = (password: string): boolean => {
  return password.length >= 8
}

export const validateAmount = (amount: number): boolean => {
  return !isNaN(amount) && amount >= 0
}

// Zod schemas
export const createUserSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
  name: z.string().min(1, "Le nom est requis"),
  role: z.enum(["USER", "MANAGER", "ADMIN"]).default("USER")
})

export const createCoffreSchema = z.object({
  name: z.string().min(1, "Le nom du coffre est requis"),
  description: z.string().optional()
})

export const updateCoffreSchema = z.object({
  id: z.string().min(1, "L'ID du coffre est requis"),
  data: z.object({
    name: z.string().min(1, "Le nom est requis").optional(),
    description: z.string().optional()
  })
})

export const addCoffreMemberSchema = z.object({
  coffreId: z.string().min(1, "L'ID du coffre est requis"),
  userId: z.string().min(1, "L'ID de l'utilisateur est requis"),
  role: z.enum(["MEMBER", "MANAGER", "OWNER"]).default("MEMBER")
})

// z.coerce.number() accepte les chaînes numériques (ex. "10" depuis mobile)
const billetsValueSchema = z.coerce.number().min(0)

export const createMovementSchema = z.object({
  coffreId: z.string().min(1, "L'ID du coffre est requis"),
  type: z.enum(["ENTRY", "EXIT"]),
  billets: z.record(billetsValueSchema),
  description: z.string().optional()
})

export const updateMovementSchema = z.object({
  type: z.enum(["ENTRY", "EXIT"]).optional(),
  billets: z.record(billetsValueSchema).optional(),
  description: z.string().optional()
})

export const createInventorySchema = z.object({
  coffreId: z.string().min(1, "L'ID du coffre est requis"),
  billets: z.record(billetsValueSchema),
  notes: z.string().optional()
})

export const validateRequest = (schema: z.ZodSchema, data: any) => {
  try {
    const result = schema.parse(data)
    return { success: true, data: result }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      }
    }
    return { success: false, error: 'Erreur de validation inconnue' }
  }
}