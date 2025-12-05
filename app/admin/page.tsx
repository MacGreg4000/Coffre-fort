import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { Layout } from "@/components/layout/Layout"
import { AdminPanel } from "@/components/admin/AdminPanel"
import { prisma } from "@/lib/prisma"

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

  return { users, coffres }
}

export default async function AdminPage() {
  const session = await getServerSession(authOptions)
  if (!session) {
    redirect("/login")
  }

  if (session.user.role !== "ADMIN") {
    redirect("/dashboard")
  }

  const data = await getAdminData()

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-4xl font-bold text-cyber-gold mb-2">Administration</h1>
          <p className="text-muted-foreground">
            Gestion des utilisateurs et coffres
          </p>
        </div>

        <AdminPanel data={data} />
      </div>
    </Layout>
  )
}



