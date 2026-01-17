import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { Layout } from "@/components/layout/Layout"
import { PasswordFilesClient } from "@/components/passwords/PasswordFilesClient"

export default async function PasswordFilesPage() {
  const session = await getServerSession(authOptions)
  if (!session) {
    redirect("/login")
  }

  return (
    <Layout>
      <div className="space-y-6">
        <PasswordFilesClient />
      </div>
    </Layout>
  )
}
