const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  try {
    // Créer un utilisateur de test
    const hashedPassword = await bcrypt.hash('password123', 12)

    const user = await prisma.user.upsert({
      where: { email: 'admin@test.com' },
      update: {},
      create: {
        email: 'admin@test.com',
        name: 'Admin Test',
        password: hashedPassword,
        role: 'ADMIN',
        isActive: true,
        twoFactorEnabled: false,
      },
    })

    console.log('Utilisateur de test créé:', user.email)
  } catch (error) {
    console.error('Erreur:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()