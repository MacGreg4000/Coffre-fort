import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { rateLimit, RateLimitConfig, createRateLimitResponse } from "@/lib/rate-limit"
import { handleApiError } from "@/lib/api-utils"

// ============================================
// MIDDLEWARE API AVEC RATE LIMITING
// ============================================

export interface ApiHandlerOptions {
  /** Configuration du rate limiting (optionnel) */
  rateLimit?: RateLimitConfig
  /** Exiger une authentification */
  requireAuth?: boolean
  /** Exiger un rôle spécifique */
  requireRole?: "ADMIN" | "MANAGER" | "USER"
}

type ApiHandler = (
  req: NextRequest,
  context?: any
) => Promise<NextResponse | Response>

/**
 * Wrapper pour les routes API avec rate limiting et auth
 */
export function withApiMiddleware(
  handler: ApiHandler,
  options: ApiHandlerOptions = {}
): ApiHandler {
  return async (req: NextRequest, context?: any) => {
    try {
      // 1. Rate Limiting
      if (options.rateLimit) {
        const session = options.requireAuth
          ? await getServerSession(authOptions)
          : null
        
        const result = rateLimit(
          req,
          options.rateLimit,
          session?.user?.id
        )
        
        if (!result.success) {
          return createRateLimitResponse(result, options.rateLimit.message)
        }
      }
      
      // 2. Authentification
      if (options.requireAuth || options.requireRole) {
        const session = await getServerSession(authOptions)
        
        if (!session) {
          return NextResponse.json(
            { error: "Non autorisé" },
            { status: 401 }
          )
        }
        
        // 3. Vérification du rôle
        if (options.requireRole) {
          const roleHierarchy = { USER: 0, MANAGER: 1, ADMIN: 2 }
          const userLevel = roleHierarchy[session.user.role as keyof typeof roleHierarchy] || 0
          const requiredLevel = roleHierarchy[options.requireRole]
          
          if (userLevel < requiredLevel) {
            return NextResponse.json(
              { error: "Permissions insuffisantes" },
              { status: 403 }
            )
          }
        }
      }
      
      // 4. Exécuter le handler
      return await handler(req, context)
    } catch (error) {
      return handleApiError(error)
    }
  }
}

/**
 * Helpers pour routes courantes
 */

/** Route publique avec rate limiting standard */
export function publicRoute(handler: ApiHandler, rateLimit?: RateLimitConfig) {
  return withApiMiddleware(handler, { rateLimit })
}

/** Route authentifiée avec rate limiting */
export function authenticatedRoute(handler: ApiHandler, rateLimit?: RateLimitConfig) {
  return withApiMiddleware(handler, { requireAuth: true, rateLimit })
}

/** Route admin uniquement avec rate limiting strict */
export function adminRoute(handler: ApiHandler, rateLimit?: RateLimitConfig) {
  return withApiMiddleware(handler, {
    requireAuth: true,
    requireRole: "ADMIN",
    rateLimit,
  })
}

/** Route manager ou admin avec rate limiting */
export function managerRoute(handler: ApiHandler, rateLimit?: RateLimitConfig) {
  return withApiMiddleware(handler, {
    requireAuth: true,
    requireRole: "MANAGER",
    rateLimit,
  })
}

