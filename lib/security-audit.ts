import { NextRequest } from "next/server"
import { prisma } from "./prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "./auth"

// ============================================
// AUDIT DE SÉCURITÉ ET DÉTECTION D'ANOMALIES
// ============================================

export interface SecurityEvent {
  action: string
  severity: "low" | "medium" | "high" | "critical"
  userId?: string
  description: string
  metadata?: Record<string, any>
  ipAddress?: string
  userAgent?: string
}

/**
 * Logger un événement de sécurité
 */
export async function logSecurityEvent(
  event: SecurityEvent,
  req?: NextRequest
): Promise<void> {
  try {
    const ipAddress = req
      ? req.headers.get("x-forwarded-for")?.split(",")[0] ||
        req.headers.get("x-real-ip") ||
        "unknown"
      : event.ipAddress || "unknown"

    const userAgent = req
      ? req.headers.get("user-agent") || "unknown"
      : event.userAgent || "unknown"

    // Créer le log dans la base de données
    await prisma.log.create({
      data: {
        userId: event.userId,
        action: `SECURITY_${event.action}`,
        description: event.description,
        metadata: event.metadata ? JSON.stringify(event.metadata) : undefined,
        ipAddress,
        userAgent,
      },
    })

    // Si l'événement est critique, envoyer une alerte
    if (event.severity === "critical") {
      console.error(`🚨 ALERTE SÉCURITÉ CRITIQUE: ${event.description}`, {
        severity: event.severity,
        userId: event.userId,
        ipAddress,
        metadata: event.metadata,
      })
      // TODO: Envoyer une notification (email, SMS, webhook, etc.)
    }
  } catch (error) {
    // Ne pas faire échouer la requête si le log échoue
    console.error("Erreur lors du log de sécurité:", error)
  }
}

/**
 * Détecter les anomalies de sécurité
 */
export async function detectAnomalies(
  userId: string,
  req: NextRequest
): Promise<{ suspicious: boolean; reason?: string }> {
  const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown"
  const userAgent = req.headers.get("user-agent") || "unknown"

  try {
    // 1. Vérifier les connexions récentes depuis différentes IPs
    const recentLogs = await prisma.log.findMany({
      where: {
        userId,
        action: "LOGIN_SUCCESS",
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Dernières 24h
        },
      },
      select: {
        ipAddress: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 10,
    })

    const uniqueIPs = new Set(recentLogs.map(log => log.ipAddress).filter(Boolean))
    if (uniqueIPs.size > 3 && !uniqueIPs.has(ipAddress)) {
      await logSecurityEvent({
        action: "SUSPICIOUS_LOGIN_LOCATION",
        severity: "high",
        userId,
        description: `Connexion depuis une nouvelle IP: ${ipAddress}. L'utilisateur s'est connecté depuis ${uniqueIPs.size} IPs différentes dans les dernières 24h`,
        metadata: { ipAddress, previousIPs: Array.from(uniqueIPs) },
        ipAddress,
        userAgent,
      }, req)
      return { suspicious: true, reason: "Nouvelle localisation détectée" }
    }

    // 2. Vérifier les tentatives de connexion échouées récentes
    const failedLogins = await prisma.log.findMany({
      where: {
        userId,
        action: "LOGIN_FAILED",
        createdAt: {
          gte: new Date(Date.now() - 60 * 60 * 1000), // Dernière heure
        },
      },
      take: 5,
    })

    if (failedLogins.length >= 3) {
      await logSecurityEvent({
        action: "MULTIPLE_FAILED_LOGINS",
        severity: "medium",
        userId,
        description: `${failedLogins.length} tentatives de connexion échouées dans la dernière heure`,
        metadata: { count: failedLogins.length },
        ipAddress,
        userAgent,
      }, req)
      return { suspicious: true, reason: "Trop de tentatives échouées" }
    }

    // 3. Vérifier les actions sensibles fréquentes
    const sensitiveActions = await prisma.log.findMany({
      where: {
        userId,
        action: {
          in: ["MOVEMENT_CREATED", "MOVEMENT_DELETED", "INVENTORY_CREATED", "COFFRE_CREATED"],
        },
        createdAt: {
          gte: new Date(Date.now() - 5 * 60 * 1000), // Dernières 5 minutes
        },
      },
      take: 20,
    })

    if (sensitiveActions.length > 15) {
      await logSecurityEvent({
        action: "RAPID_SENSITIVE_ACTIONS",
        severity: "medium",
        userId,
        description: `${sensitiveActions.length} actions sensibles dans les 5 dernières minutes`,
        metadata: { count: sensitiveActions.length },
        ipAddress,
        userAgent,
      }, req)
      return { suspicious: true, reason: "Activité suspecte détectée" }
    }

    return { suspicious: false }
  } catch (error) {
    console.error("Erreur lors de la détection d'anomalies:", error)
    return { suspicious: false }
  }
}

/**
 * Vérifier si une IP est bloquée
 */
export async function isIPBlocked(ipAddress: string): Promise<boolean> {
  // TODO: Implémenter un système de blocage IP (Redis ou base de données)
  // Pour l'instant, vérifier dans les logs récents
  try {
    const recentFailedLogins = await prisma.log.findMany({
      where: {
        ipAddress,
        action: "LOGIN_FAILED",
        createdAt: {
          gte: new Date(Date.now() - 15 * 60 * 1000), // Dernières 15 minutes
        },
      },
      take: 10,
    })

    // Bloquer si plus de 10 tentatives échouées en 15 minutes
    return recentFailedLogins.length >= 10
  } catch {
    return false
  }
}

/**
 * Logger une tentative d'accès non autorisé
 */
export async function logUnauthorizedAccess(
  action: string,
  req: NextRequest,
  details?: Record<string, any>
): Promise<void> {
  const session = await getServerSession(authOptions)
  
  await logSecurityEvent({
    action: "UNAUTHORIZED_ACCESS",
    severity: "high",
    userId: session?.user?.id,
    description: `Tentative d'accès non autorisé: ${action}`,
    metadata: {
      attemptedAction: action,
      path: req.nextUrl.pathname,
      method: req.method,
      ...details,
    },
    ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown",
    userAgent: req.headers.get("user-agent") || "unknown",
  }, req)
}
