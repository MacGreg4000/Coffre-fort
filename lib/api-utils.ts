import { NextResponse } from "next/server"
import { auditor } from "./security-audit"
import { prisma } from "./prisma"

export class ApiError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

export function handleApiError(error: unknown): NextResponse {
  console.error('API Error:', error)

  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.statusCode }
    )
  }

  if (error instanceof Error) {
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    )
  }

  return NextResponse.json(
    { error: "Erreur inconnue" },
    { status: 500 }
  )
}

// Surcharges pour createAuditLog
export function createAuditLog(
  action: string,
  userId: string,
  details?: Record<string, any>
): void
export async function createAuditLog(options: {
  userId: string
  action: string
  description?: string
  coffreId?: string
  metadata?: Record<string, any>
  req?: Request
  tx?: any
}): Promise<void>
export async function createAuditLog(
  actionOrOptions: string | {
    userId: string
    action: string
    description?: string
    coffreId?: string
    metadata?: Record<string, any>
    req?: Request
    tx?: any
  },
  userId?: string,
  details?: Record<string, any>
): Promise<void> | void {
  // Version avec objet (nouvelle signature)
  if (typeof actionOrOptions === 'object') {
    const options = actionOrOptions
    const { userId, action, description, metadata } = options
    
    // Si une transaction est fournie, utiliser Prisma pour créer le log
    if (options.tx) {
      try {
        await options.tx.log.create({
          data: {
            userId,
            coffreId: options.coffreId || null,
            action,
            description: description || action,
            metadata: metadata ? JSON.stringify(metadata) : null,
            ipAddress: options.req ? (options.req.headers.get('x-forwarded-for')?.split(',')[0] || null) : null,
            userAgent: options.req ? options.req.headers.get('user-agent') || null : null,
          },
        })
      } catch (error: any) {
        // Si la table logs n'existe pas encore, ignorer l'erreur
        if (error?.code === "P2021" || error?.message?.includes("does not exist") || error?.message?.includes("Table")) {
          console.warn("Table logs n'existe pas encore, log d'audit ignoré")
        } else {
          throw error
        }
      }
    } else {
      // Essayer d'utiliser Prisma directement
      try {
        await prisma.log.create({
          data: {
            userId,
            coffreId: options.coffreId || null,
            action,
            description: description || action,
            metadata: metadata ? JSON.stringify(metadata) : null,
            ipAddress: options.req ? (options.req.headers.get('x-forwarded-for')?.split(',')[0] || null) : null,
            userAgent: options.req ? options.req.headers.get('user-agent') || null : null,
          },
        })
      } catch (error: any) {
        // Si la table logs n'existe pas encore, utiliser l'auditor simple
        if (error?.code === "P2021" || error?.message?.includes("does not exist") || error?.message?.includes("Table")) {
          auditor.logAction(action, userId, { description, ...metadata })
        } else {
          throw error
        }
      }
    }
    return
  }
  
  // Version simple (ancienne signature)
  if (typeof actionOrOptions === 'string' && userId) {
    auditor.logAction(actionOrOptions, userId, details)
  }
}

export function createSuccessResponse(data: any, status: number = 200): NextResponse {
  return NextResponse.json(data, { status })
}

export function serializeMovement(movement: any) {
  return {
    id: movement.id,
    coffreId: movement.coffreId,
    userId: movement.userId,
    type: movement.type,
    amount: movement.amount,
    description: movement.description,
    billets: movement.billets,
    createdAt: movement.createdAt
  }
}

export function serializeInventory(inventory: any) {
  return {
    id: inventory.id,
    coffreId: inventory.coffreId,
    userId: inventory.userId,
    amount: inventory.amount,
    billets: inventory.billets,
    notes: inventory.notes,
    date: inventory.date
  }
}