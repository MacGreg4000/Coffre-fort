import { Layout } from "@/components/layout/Layout"
import { DashboardClient } from "@/components/dashboard/DashboardClient"

// Page simplifiée pour éviter les problèmes Next.js 15
export default function DashboardPage() {
  return (
    <Layout>
      <div className="space-y-6">
        <DashboardClient initialCoffres={[]} />
      </div>
    </Layout>
  )
}
