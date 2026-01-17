import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Layout } from "@/components/layout/Layout"
import { TwoFactorSettings } from "@/components/settings/TwoFactorSettings"

export default async function SettingsPage() {
  const session = await getServerSession(authOptions)
  if (!session) {
    redirect("/login")
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Paramètres</h1>
          <p className="text-foreground/70 mt-2">
            Gérez les paramètres de sécurité de votre compte
          </p>
        </div>
        <TwoFactorSettings />
      </div>
    </Layout>
  )
}
