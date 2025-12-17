import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"

// ============================================
// GESTION D'ERREURS SÉCURISÉE
// ============================================

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: unknown
  ) {
    super(message)
    this.name = "ApiError"
  }
}

export function handleApiError(error: unknown): NextResponse {
  // Log structuré de l'erreur
  if (error instanceof Error) {
    logger.error("API Error", error, { stack: error.stack })
  } else {
    logger.error("API Error (unknown)", undefined, { error: String(error) })
  }

  // Erreur connue (ApiError)
  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.statusCode }
    )
  }

  // Erreur Prisma
  if (error && typeof error === "object" && "code" in error) {
    const prismaError = error as { code: string; meta?: any }
    
    switch (prismaError.code) {
      case "P2002":
        return NextResponse.json(
          { error: "Cette ressource existe déjà" },
          { status: 409 }
        )
      case "P2025":
        return NextResponse.json(
          { error: "Ressource introuvable" },
          { status: 404 }
        )
      case "P2003":
        return NextResponse.json(
          { error: "Violation de contrainte de clé étrangère" },
          { status: 400 }
        )
      default:
        return NextResponse.json(
          { error: "Erreur de base de données" },
          { status: 500 }
        )
    }
  }

  // Erreur inconnue - Ne jamais exposer les détails
  return NextResponse.json(
    { error: "Une erreur interne est survenue" },
    { status: 500 }
  )
}

// ============================================
// EXTRACTION IP ET USER-AGENT
// ============================================

export function getClientInfo(req: NextRequest) {
  // Récupérer l'IP (supporte proxy/load balancer)
  const forwarded = req.headers.get("x-forwarded-for")
  const realIp = req.headers.get("x-real-ip")
  const ip = forwarded?.split(",")[0] || realIp || "unknown"

  // User-Agent
  const userAgent = req.headers.get("user-agent") || "unknown"

  return { ip, userAgent }
}

// ============================================
// LOGGING SÉCURISÉ
// ============================================

export async function createAuditLog({
  userId,
  coffreId,
  movementId,
  inventoryId,
  action,
  description,
  metadata,
  req,
  tx,
}: {
  userId?: string
  coffreId?: string
  movementId?: string
  inventoryId?: string
  action: string
  description?: string
  metadata?: Record<string, any>
  req: NextRequest
  tx?: any // Contexte de transaction Prisma optionnel
}) {
  const { ip, userAgent } = getClientInfo(req)

  // Sanitize metadata - supprimer les clés sensibles
  const sanitizedMetadata = metadata ? sanitizeLogMetadata(metadata) : undefined

  // Utiliser le contexte de transaction si fourni, sinon utiliser prisma directement
  const client = tx || prisma

  return client.log.create({
    data: {
      userId,
      coffreId,
      movementId,
      inventoryId,
      action,
      description,
      metadata: sanitizedMetadata ? JSON.stringify(sanitizedMetadata) : undefined,
      ipAddress: ip.substring(0, 45), // Limiter à la taille du champ
      userAgent: userAgent.substring(0, 500), // Limiter pour éviter les très longs UA
    },
  })
}

function sanitizeLogMetadata(metadata: Record<string, any>): Record<string, any> {
  const sensitiveKeys = ["password", "token", "secret", "apiKey", "apikey", "api_key"]
  const sanitized = { ...metadata }

  for (const key of Object.keys(sanitized)) {
    if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
      sanitized[key] = "[REDACTED]"
    }
  }

  return sanitized
}

// ============================================
// PAGINATION HELPER
// ============================================

export function getPaginationParams(searchParams: URLSearchParams) {
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50")))
  const skip = (page - 1) * limit

  return { page, limit, skip }
}

export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
) {
  return {
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPreviousPage: page > 1,
    },
  }
}

// ============================================
// VÉRIFICATION ORIGINE (CSRF basique)
// ============================================

export function verifyOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin")
  const referer = req.headers.get("referer")
  
  // En développement, accepter localhost
  if (process.env.NODE_ENV === "development") {
    return true
  }

  const allowedOrigins = [
    process.env.NEXTAUTH_URL,
    process.env.NEXT_PUBLIC_APP_URL,
  ].filter(Boolean)

  if (origin && allowedOrigins.some(allowed => origin.startsWith(allowed!))) {
    return true
  }

  if (referer && allowedOrigins.some(allowed => referer.startsWith(allowed!))) {
    return true
  }

  return false
}

// ============================================
// SERIALIZATION HELPERS
// ============================================

export function serializeDecimal(value: any): number {
  return typeof value === "object" && value !== null && "toNumber" in value
    ? value.toNumber()
    : Number(value)
}

export function serializeMovement(movement: any) {
  return {
    ...movement,
    amount: serializeDecimal(movement.amount),
    details: movement.details?.map((d: any) => ({
      ...d,
      denomination: serializeDecimal(d.denomination),
    })),
  }
}

export function serializeInventory(inventory: any) {
  return {
    ...inventory,
    totalAmount: serializeDecimal(inventory.totalAmount),
    details: inventory.details?.map((d: any) => ({
      ...d,
      denomination: serializeDecimal(d.denomination),
    })),
  }
}



