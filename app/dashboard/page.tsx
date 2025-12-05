import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { Layout } from "@/components/layout/Layout"
import { DashboardClient } from "@/components/dashboard/DashboardClient"
import { prisma } from "@/lib/prisma"

async function getInitialData(userId: string) {
  // Récupérer les coffres accessibles par l'utilisateur
  const userCoffres = await prisma.coffreMember.findMany({
    where: { userId },
    include: { coffre: true },
  })

  return {
    coffres: userCoffres.map((uc) => uc.coffre),
  }
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session) {
    redirect("/login")
  }

  const initialData = await getInitialData(session.user.id)

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1">Dashboard</h1>
        </div>
        <DashboardClient initialCoffres={initialData.coffres} />
      </div>
    </Layout>
  )
}
