const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true
      }
    })

    console.log('Utilisateurs dans la base de données:')
    users.forEach(user => {
      console.log(`- ${user.email} (${user.name}) - ${user.role} - ${user.isActive ? 'Actif' : 'Inactif'} - Créé: ${user.createdAt}`)
    })

    if (users.length === 0) {
      console.log('Aucun utilisateur trouvé.')
    }
  } catch (error) {
    console.error('Erreur:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()