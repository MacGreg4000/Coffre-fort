import { NextRequest } from "next/server"
import crypto from "crypto"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

// ============================================
// PROTECTION CSRF (Cross-Site Request Forgery)
// ============================================

// Stockage en mémoire des tokens CSRF (pour production multi-instance, utiliser Redis)
const csrfTokens = new Map<string, { token: string; expiresAt: number }>()

// Nettoyage automatique toutes les 10 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, record] of csrfTokens.entries()) {
    if (now > record.expiresAt) {
      csrfTokens.delete(key)
    }
  }
}, 10 * 60 * 1000)

const CSRF_TOKEN_EXPIRY = 30 * 60 * 1000 // 30 minutes
const CSRF_TOKEN_LENGTH = 32

/**
 * Générer un token CSRF unique
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(CSRF_TOKEN_LENGTH).toString("hex")
}

/**
 * Créer et stocker un token CSRF pour une session
 */
export function createCsrfToken(sessionId: string): string {
  const token = generateCsrfToken()
  csrfTokens.set(sessionId, {
    token,
    expiresAt: Date.now() + CSRF_TOKEN_EXPIRY,
  })
  return token
}

/**
 * Vérifier un token CSRF
 */
export function verifyCsrfToken(sessionId: string, providedToken: string): boolean {
  const record = csrfTokens.get(sessionId)
  
  if (!record) {
    return false
  }

  if (Date.now() > record.expiresAt) {
    csrfTokens.delete(sessionId)
    return false
  }

  // Comparaison constante dans le temps pour éviter les attaques par timing
  return crypto.timingSafeEqual(
    Buffer.from(record.token),
    Buffer.from(providedToken)
  )
}

/**
 * Supprimer un token CSRF (après utilisation)
 */
export function invalidateCsrfToken(sessionId: string): void {
  csrfTokens.delete(sessionId)
}

/**
 * Middleware pour vérifier le token CSRF dans les requêtes
 */
export async function verifyCsrfMiddleware(req: NextRequest): Promise<{ valid: boolean; error?: string }> {
  // Seulement pour les méthodes qui modifient l'état
  const method = req.method
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    return { valid: true }
  }

  // Récupérer la session
  const session = await getServerSession(authOptions)
  if (!session) {
    return { valid: false, error: "Session requise pour les opérations sensibles" }
  }

  const sessionId = session.user.id

  // Récupérer le token depuis le header (priorité) ou le body
  let csrfToken = req.headers.get("X-CSRF-Token") || req.headers.get("x-csrf-token")
  
  // Si pas dans le header, essayer le body (seulement pour POST/PUT/PATCH avec JSON)
  if (!csrfToken && (method === "POST" || method === "PUT" || method === "PATCH")) {
    try {
      const body = await req.clone().json().catch(() => ({}))
      csrfToken = body.csrfToken
    } catch {
      // Si le body n'est pas JSON, ignorer
    }
  }

  if (!csrfToken || typeof csrfToken !== "string") {
    return { valid: false, error: "Token CSRF manquant" }
  }

  if (!verifyCsrfToken(sessionId, csrfToken)) {
    return { valid: false, error: "Token CSRF invalide ou expiré" }
  }

  return { valid: true }
}

/**
 * Obtenir le token CSRF pour une session (à utiliser côté client)
 */
export async function getCsrfToken(): Promise<string | null> {
  try {
    const response = await fetch("/api/csrf/token", {
      credentials: "include",
    })
    if (!response.ok) return null
    const data = await response.json()
    return data.token || null
  } catch {
    return null
  }
}
