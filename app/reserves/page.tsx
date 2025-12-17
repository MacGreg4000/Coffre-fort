import { Metadata } from "next"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"

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
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary via-blue-500 to-blue-600 bg-clip-text text-transparent">
            Réserves de Liquidation
          </h1>
          <p className="text-muted-foreground mt-2">
            Calculez les réserves que vous pouvez vous libérer depuis votre société
          </p>
        </div>
      </div>

      {/* Contenu principal - à développer */}
      <div className="glass-effect rounded-3xl p-8 border border-border/50 shadow-lg">
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-blue-500/20 flex items-center justify-center">
            <svg
              className="w-12 h-12 text-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-foreground/90">
            Page en construction
          </h2>
          <p className="text-muted-foreground max-w-md">
            Cette page permettra de calculer les réserves de liquidation disponibles.
            Le contenu sera ajouté prochainement.
          </p>
        </div>
      </div>
    </div>
  )
}
