// Balance calculation utilities
export const calculateBalance = (entries: number[], exits: number[]): number => {
  const totalEntries = entries.reduce((sum, amount) => sum + amount, 0)
  const totalExits = exits.reduce((sum, amount) => sum + amount, 0)
  return totalEntries - totalExits
}

export const computeCoffreBalanceInfo = async (prisma: any, coffreId: string) => {
  // Récupérer le dernier inventaire
  const lastInventory = await prisma.inventory.findFirst({
    where: { coffreId },
    orderBy: { date: 'desc' },
  })

  let balance = 0
  let lastInventoryAmount = 0
  let lastInventoryDate = null

  if (lastInventory) {
    lastInventoryAmount = Number(lastInventory.totalAmount)
    lastInventoryDate = lastInventory.date.toISOString()
    balance = lastInventoryAmount

    // Calculer les mouvements depuis le dernier inventaire
    const movements = await prisma.movement.findMany({
      where: {
        coffreId,
        deletedAt: null,
        createdAt: { gte: lastInventory.date }
      },
      select: { type: true, amount: true }
    })

    movements.forEach((movement: any) => {
      if (movement.type === 'ENTRY') {
        balance += Number(movement.amount)
      } else if (movement.type === 'EXIT') {
        balance -= Number(movement.amount)
      }
    })
  } else {
    // Pas d'inventaire, calculer depuis tous les mouvements
    const movements = await prisma.movement.findMany({
      where: {
        coffreId,
        deletedAt: null
      },
      select: { type: true, amount: true }
    })

    movements.forEach((movement: any) => {
      if (movement.type === 'ENTRY') {
        balance += Number(movement.amount)
      } else if (movement.type === 'EXIT') {
        balance -= Number(movement.amount)
      }
    })
  }

  return {
    balance,
    lastInventoryDate,
    lastInventoryAmount,
  }
}