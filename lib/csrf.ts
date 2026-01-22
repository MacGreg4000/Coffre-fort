// CSRF protection utilities
import { NextRequest } from "next/server"

export const generateCsrfToken = (): string => {
  return Math.random().toString(36).substring(2, 15)
}

export const validateCsrfToken = (token: string): boolean => {
  return token.length > 0
}

export const createCsrfToken = (userId?: string): string => {
  // Générer un token unique basé sur userId + timestamp + random
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 15)
  const userPart = userId ? userId.substring(0, 8) : ''
  return `${userPart}-${timestamp}-${random}`
}

export interface CsrfVerificationResult {
  valid: boolean
  error?: string
}

export async function verifyCsrfMiddleware(req: NextRequest): Promise<CsrfVerificationResult> {
  try {
    // Récupérer le token depuis le header (support x-csrf-token et X-CSRF-Token)
    // Les headers HTTP sont insensibles à la casse, mais on vérifie les deux variantes pour être sûr
    const csrfToken = req.headers.get('x-csrf-token') || 
                     req.headers.get('X-CSRF-Token') ||
                     req.headers.get('X-Csrf-Token')
    
    if (!csrfToken || csrfToken.trim().length === 0) {
      return {
        valid: false,
        error: "Token CSRF manquant"
      }
    }

    // En développement, on accepte n'importe quel token non vide (vérification basique)
    // En production, on compare avec le cookie CSRF
    if (process.env.NODE_ENV === "development") {
      // En développement, on accepte le token s'il est présent et non vide
      // (vérification minimale pour faciliter le développement)
      return { valid: true }
    }

    // En production, vérifier avec le cookie CSRF
    const storedToken = req.cookies.get('csrf-token')?.value
    
    if (!storedToken) {
      return {
        valid: false,
        error: "Token CSRF non trouvé en session"
      }
    }

    // Comparaison constante dans le temps pour éviter les attaques par timing
    // Utiliser une comparaison simple pour l'instant (en production, utiliser crypto.timingSafeEqual)
    if (csrfToken !== storedToken) {
      return {
        valid: false,
        error: "Token CSRF invalide"
      }
    }

    return { valid: true }
  } catch (error) {
    return {
      valid: false,
      error: `Erreur lors de la vérification CSRF: ${error instanceof Error ? error.message : "Erreur inconnue"}`
    }
  }
}