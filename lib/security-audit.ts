// Security audit utilities
export interface AuditLog {
  id: string
  action: string
  userId: string
  timestamp: Date
  details?: Record<string, any>
}

export interface SecurityEvent {
  action: string
  severity: "low" | "medium" | "high" | "critical"
  description?: string
  userId?: string
  ipAddress?: string
  userAgent?: string
  metadata?: Record<string, any>
}

// Liste des IPs bloquées (à implémenter avec une vraie base de données)
const BLOCKED_IPS = new Set<string>()

export class SecurityAuditor {
  logAction(action: string, userId: string, details?: Record<string, any>): void {
    const auditLog: AuditLog = {
      id: Math.random().toString(36).substring(7),
      action,
      userId,
      timestamp: new Date(),
      details
    }

    // In a real implementation, this would be saved to a database
    console.log('Audit log:', auditLog)
  }

  async logSecurityEvent(event: SecurityEvent, req?: Request): Promise<void> {
    console.log('Security event:', {
      ...event,
      timestamp: new Date(),
      requestInfo: req ? {
        method: req.method,
        url: req.url,
        headers: Object.fromEntries(req.headers.entries())
      } : undefined
    })
  }

  async detectAnomalies(userId: string, action: string, metadata?: Record<string, any>): Promise<boolean> {
    // Implémentation basique - à améliorer avec des règles métier
    console.log(`Anomaly detection for user ${userId}, action: ${action}`, metadata)
    return false // Pas d'anomalie détectée pour l'instant
  }
}

export const auditor = new SecurityAuditor()

// Fonctions utilitaires
export async function isIPBlocked(ip: string): Promise<boolean> {
  return BLOCKED_IPS.has(ip)
}

export async function logSecurityEvent(event: SecurityEvent, req?: Request): Promise<void> {
  return auditor.logSecurityEvent(event, req)
}

export async function detectAnomalies(userId: string, action: string, metadata?: Record<string, any>): Promise<boolean> {
  return auditor.detectAnomalies(userId, action, metadata)
}