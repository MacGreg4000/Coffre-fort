import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Layout } from "@/components/layout/Layout"
import { AssetsClient } from "@/components/assets/AssetsClient"
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

export default async function ActifsPage() {
  const session = await getServerSession(authOptions)
  if (!session) {
    redirect("/login")
  }

  const initialData = await getInitialData(session.user.id)

  return (
    <Layout>
      <div className="space-y-6">
        <AssetsClient initialCoffres={initialData.coffres} />
      </div>
    </Layout>
  )
}
