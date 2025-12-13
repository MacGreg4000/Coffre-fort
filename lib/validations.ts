import { z } from "zod"

// ============================================
// SCHÉMAS DE VALIDATION ZOD
// ============================================

// Utilisateurs
export const createUserSchema = z.object({
  email: z.string().email("Email invalide").max(255),
  password: z
    .string()
    .min(12, "Le mot de passe doit contenir au moins 12 caractères")
    .max(128, "Le mot de passe est trop long")
    .regex(/[A-Z]/, "Le mot de passe doit contenir au moins une majuscule")
    .regex(/[a-z]/, "Le mot de passe doit contenir au moins une minuscule")
    .regex(/[0-9]/, "Le mot de passe doit contenir au moins un chiffre")
    .regex(/[^A-Za-z0-9]/, "Le mot de passe doit contenir au moins un caractère spécial"),
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères").max(255),
  role: z.enum(["USER", "MANAGER", "ADMIN"]).default("USER"),
})

export const loginSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(1, "Mot de passe requis"),
})

// Coffres
export const createCoffreSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères").max(255),
  description: z.string().max(1000).optional(),
})

export const updateCoffreSchema = createCoffreSchema.partial()

// Mouvements
const billetsSchema = z.object({
  "5": z.number().int().min(0).max(10000).optional().default(0),
  "10": z.number().int().min(0).max(10000).optional().default(0),
  "20": z.number().int().min(0).max(10000).optional().default(0),
  "50": z.number().int().min(0).max(10000).optional().default(0),
  "100": z.number().int().min(0).max(10000).optional().default(0),
  "200": z.number().int().min(0).max(10000).optional().default(0),
  "500": z.number().int().min(0).max(10000).optional().default(0),
})

export const createMovementSchema = z.object({
  coffreId: z.string().uuid("ID de coffre invalide"),
  type: z.enum(["ENTRY", "EXIT", "INVENTORY"]),
  billets: billetsSchema,
  description: z.string().max(1000).optional(),
})

export const updateMovementSchema = z.object({
  type: z.enum(["ENTRY", "EXIT", "INVENTORY"]),
  billets: billetsSchema,
  description: z.string().max(1000).optional(),
})

// Inventaires
export const createInventorySchema = z.object({
  coffreId: z.string().uuid("ID de coffre invalide"),
  billets: billetsSchema,
  notes: z.string().max(1000).optional(),
})

// Membres de coffre
export const addCoffreMemberSchema = z.object({
  userId: z.string().uuid("ID utilisateur invalide"),
  role: z.enum(["OWNER", "MANAGER", "MEMBER"]).default("MEMBER"),
})

// Pagination
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

// Query params communs
export const coffreIdQuerySchema = z.object({
  coffreId: z.string().uuid("ID de coffre invalide").optional(),
})

export const idParamSchema = z.object({
  id: z.string().uuid("ID invalide"),
})

// Helper pour valider et gérer les erreurs
export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
  try {
    const validated = schema.parse(data)
    return { success: true, data: validated }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0]
      return { success: false, error: firstError.message }
    }
    return { success: false, error: "Validation échouée" }
  }
}
