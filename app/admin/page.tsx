import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Layout } from "@/components/layout/Layout"
import { AdminPanel } from "@/components/admin/AdminPanel"
import { prisma } from "@/lib/prisma"
import { computeCoffreBalanceInfo } from "@/lib/balance"

async function getAdminData() {
  const users = await prisma.user.findMany({
    include: {
      coffreMembers: {
        include: {
          coffre: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  const coffres = await prisma.coffre.findMany({
    include: {
      members: {
        include: {
          user: true,
        },
      },
      _count: {
        select: {
          movements: true,
          inventories: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  // Calculer la balance de chaque coffre (en parallèle) pour pouvoir renommer/supprimer avec règles serveur
  const coffresWithBalance = await Promise.all(
    coffres.map(async (coffre) => {
      const info = await computeCoffreBalanceInfo(prisma, coffre.id)
      return { ...coffre, balance: info.balance }
    })
  )

  return { users, coffres: coffresWithBalance }
}

export default async function AdminPage() {
  const session = await getServerSession(authOptions)
  if (!session) {
    redirect("/login")
  }

  // Vérifier que l'utilisateur a le rôle ADMIN
  const userRole = session.user?.role
  
  // Si le rôle n'est pas ADMIN, vérifier directement en base de données
  if (userRole !== "ADMIN") {
    // Vérifier en base de données au cas où la session n'est pas à jour
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })
    
    if (dbUser?.role !== "ADMIN") {
      redirect("/dashboard")
    }
  }

  const data = await getAdminData()

  return (
    <Layout>
      <div className="space-y-6">
        <AdminPanel data={data} />
      </div>
    </Layout>
  )
}



