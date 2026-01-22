import { NextResponse } from "next/server"
import { auditor } from "./security-audit"

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

export function createAuditLog(
  action: string,
  userId: string,
  details?: Record<string, any>
): void {
  auditor.logAction(action, userId, details)
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