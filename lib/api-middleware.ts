import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { rateLimit, RateLimitConfig, createRateLimitResponse } from "@/lib/rate-limit"
import { handleApiError, verifyOrigin } from "@/lib/api-utils"
import { verifyCsrfMiddleware } from "@/lib/csrf"
import { isIPBlocked, logSecurityEvent, detectAnomalies } from "@/lib/security-audit"

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
      // 0. Vérifier si l'IP est bloquée
      const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown"
      if (ipAddress !== "unknown" && await isIPBlocked(ipAddress)) {
        await logSecurityEvent({
          action: "BLOCKED_IP_ACCESS",
          severity: "high",
          description: `Tentative d'accès depuis une IP bloquée: ${ipAddress}`,
          ipAddress,
          userAgent: req.headers.get("user-agent") || "unknown",
        }, req)
        
        return NextResponse.json(
          { error: "Accès refusé" },
          { status: 403 }
        )
      }

      // 1. Vérification d'origine (CSRF basique)
      // Exclure les routes de setup, authentification, two-factor et csrf de la vérification d'origine
      const isExcludedRoute = req.nextUrl.pathname.startsWith("/api/setup") || 
                              req.nextUrl.pathname.startsWith("/api/auth") ||
                              req.nextUrl.pathname.startsWith("/api/two-factor") ||
                              req.nextUrl.pathname.startsWith("/api/csrf")
      
      if (!isExcludedRoute && !verifyOrigin(req)) {
        await logSecurityEvent({
          action: "INVALID_ORIGIN",
          severity: "high",
          description: `Tentative d'accès depuis une origine non autorisée: ${req.headers.get("origin") || req.headers.get("referer") || "unknown"}`,
          ipAddress,
          userAgent: req.headers.get("user-agent") || "unknown",
        }, req)
        
        return NextResponse.json(
          { error: "Origine non autorisée" },
          { status: 403 }
        )
      }

      // 2. Rate Limiting
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
          await logSecurityEvent({
            action: "RATE_LIMIT_EXCEEDED",
            severity: "medium",
            userId: session?.user?.id,
            description: `Rate limit dépassé pour ${req.nextUrl.pathname}`,
            metadata: { limit: result.limit, remaining: result.remaining },
            ipAddress,
            userAgent: req.headers.get("user-agent") || "unknown",
          }, req)
          
          return createRateLimitResponse(result, options.rateLimit.message)
        }
      }
      
      // 3. Authentification
      let session = null
      if (options.requireAuth || options.requireRole) {
        session = await getServerSession(authOptions)
        
        if (!session) {
          await logSecurityEvent({
            action: "UNAUTHENTICATED_ACCESS",
            severity: "medium",
            description: `Tentative d'accès non authentifié à ${req.nextUrl.pathname}`,
            ipAddress,
            userAgent: req.headers.get("user-agent") || "unknown",
          }, req)
          
          return NextResponse.json(
            { error: "Non autorisé" },
            { status: 401 }
          )
        }
        
        // 4. Vérification du rôle
        if (options.requireRole) {
          const roleHierarchy = { USER: 0, MANAGER: 1, ADMIN: 2 }
          const userLevel = roleHierarchy[session.user.role as keyof typeof roleHierarchy] || 0
          const requiredLevel = roleHierarchy[options.requireRole]
          
          if (userLevel < requiredLevel) {
            await logSecurityEvent({
              action: "INSUFFICIENT_PERMISSIONS",
              severity: "high",
              userId: session.user.id,
              description: `Tentative d'accès avec permissions insuffisantes à ${req.nextUrl.pathname}. Rôle: ${session.user.role}, Requis: ${options.requireRole}`,
              metadata: { userRole: session.user.role, requiredRole: options.requireRole },
              ipAddress,
              userAgent: req.headers.get("user-agent") || "unknown",
            }, req)
            
            return NextResponse.json(
              { error: "Permissions insuffisantes" },
              { status: 403 }
            )
          }
        }

        // 5. Détection d'anomalies pour les utilisateurs authentifiés
        if (session.user.id) {
          const anomalies = await detectAnomalies(session.user.id, req)
          if (anomalies.suspicious) {
            // Logger mais ne pas bloquer (juste alerter)
            console.warn(`Anomalie détectée pour l'utilisateur ${session.user.id}: ${anomalies.reason}`)
          }
        }
      }

      // 6. Vérification CSRF pour les mutations (POST, PUT, PATCH, DELETE)
      // Exclure les routes two-factor de la vérification CSRF (elles ont leur propre système de sécurité)
      const isTwoFactorRoute = req.nextUrl.pathname.startsWith("/api/two-factor")
      
      if (!isTwoFactorRoute && ["POST", "PUT", "PATCH", "DELETE"].includes(req.method) && (options.requireAuth || options.requireRole)) {
        const csrfCheck = await verifyCsrfMiddleware(req)
        if (!csrfCheck.valid) {
          await logSecurityEvent({
            action: "CSRF_TOKEN_INVALID",
            severity: "high",
            userId: session?.user?.id,
            description: `Tentative de mutation sans token CSRF valide: ${req.nextUrl.pathname}`,
            metadata: { error: csrfCheck.error },
            ipAddress,
            userAgent: req.headers.get("user-agent") || "unknown",
          }, req)
          
          return NextResponse.json(
            { error: csrfCheck.error || "Token CSRF invalide" },
            { status: 403 }
          )
        }
      }
      
      // 7. Exécuter le handler
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





