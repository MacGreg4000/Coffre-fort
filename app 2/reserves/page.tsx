import { Metadata } from "next"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { Layout } from "@/components/layout/Layout"
import ReservesClient from "@/components/reserves/ReservesClient"

export const metadata: Metadata = {
  title: "Réserves de Liquidation - SafeVault",
  description: "Calculez les réserves de liquidation disponibles depuis votre société",
}

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function ReservesPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary via-blue-500 to-blue-600 bg-clip-text text-transparent">
              Réserves de Liquidation
            </h1>
            <p className="text-muted-foreground mt-2">
              Gérez et suivez les réserves que vous pouvez vous libérer depuis votre société
            </p>
          </div>
        </div>

        {/* Composant client */}
        <ReservesClient />
      </div>
    </Layout>
  )
}


