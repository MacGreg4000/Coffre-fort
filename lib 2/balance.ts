import { Prisma, PrismaClient } from "@prisma/client"

type PrismaLike = PrismaClient | Prisma.TransactionClient

function toCents(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value)
  // Arrondi au centime (Decimal(10,2) côté DB)
  return Math.round(n * 100)
}

/**
 * Calcule la balance d'un coffre.
 * Règle métier: dernier inventaire (snapshot) + ENTRY - EXIT depuis cet inventaire.
 * Important: exclure les mouvements soft-deleted (deletedAt != null).
 *
 * Retourne aussi la date/montant du dernier inventaire.
 */
export async function computeCoffreBalanceInfo(
  prisma: PrismaLike,
  coffreId: string
): Promise<{
  balance: number
  balanceCents: number
  lastInventoryDate: Date | null
  lastInventoryAmount: number
  lastInventoryAmountCents: number
}> {
  const lastInventory = await prisma.inventory.findFirst({
    where: { coffreId },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true, totalAmount: true },
  })

  const lastInventoryAmountCents = lastInventory ? toCents(lastInventory.totalAmount) : 0
  let balanceCents = lastInventoryAmountCents

  if (lastInventory) {
    const movementsAfterInventory = await prisma.movement.findMany({
      where: {
        coffreId,
        deletedAt: null,
        createdAt: { gte: lastInventory.createdAt },
        type: { in: ["ENTRY", "EXIT"] },
      },
      select: { type: true, amount: true },
    })

    movementsAfterInventory.forEach((m) => {
      const amountCents = toCents(m.amount)
      if (m.type === "ENTRY") balanceCents += amountCents
      if (m.type === "EXIT") balanceCents -= amountCents
    })
  } else {
    const allMovements = await prisma.movement.findMany({
      where: {
        coffreId,
        deletedAt: null,
        type: { in: ["ENTRY", "EXIT"] },
      },
      select: { type: true, amount: true },
      orderBy: { createdAt: "asc" },
    })

    allMovements.forEach((m) => {
      const amountCents = toCents(m.amount)
      if (m.type === "ENTRY") balanceCents += amountCents
      if (m.type === "EXIT") balanceCents -= amountCents
    })
  }

  // Normaliser -0
  if (Object.is(balanceCents, -0)) balanceCents = 0

  return {
    balanceCents,
    balance: balanceCents / 100,
    lastInventoryDate: lastInventory?.createdAt ?? null,
    lastInventoryAmountCents,
    lastInventoryAmount: lastInventoryAmountCents / 100,
  }
}

