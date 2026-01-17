import { z } from "zod"

// ============================================
// VALIDATION DES VARIABLES D'ENVIRONNEMENT
// ============================================

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL est requis").startsWith("mysql://", "DATABASE_URL doit être une URL MySQL valide"),
  NEXTAUTH_SECRET: z.string().min(32, "NEXTAUTH_SECRET doit contenir au moins 32 caractères"),
  NEXTAUTH_URL: z.string().url("NEXTAUTH_URL doit être une URL valide").optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  ENCRYPTION_KEY: z.string().min(32, "ENCRYPTION_KEY doit contenir au moins 32 caractères").optional(),
})

function validateEnv() {
  try {
    const env = envSchema.parse(process.env)
    return env
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("❌ Variables d'environnement invalides:")
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join(".")}: ${err.message}`)
      })
      process.exit(1)
    }
    throw error
  }
}

// Valider au chargement du module
export const env = validateEnv()

// Log en dev (sans exposer les secrets)
if (env.NODE_ENV === "development") {
  console.log("✅ Variables d'environnement validées")
}





