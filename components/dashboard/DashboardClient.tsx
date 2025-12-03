"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Select } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { DashboardStats } from "./DashboardStats"
import { Loader2 } from "lucide-react"

interface DashboardClientProps {
  initialCoffres: any[]
}

interface DashboardData {
  movements: any[]
  totalEntries: number
  totalExits: number
  inventories: any[]
  recentInventories: any[]
  statsByCoffre: any[]
  coffres: any[]
}

export function DashboardClient({ initialCoffres }: DashboardClientProps) {
  const [selectedCoffreId, setSelectedCoffreId] = useState<string>("")
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData(selectedCoffreId)
  }, [selectedCoffreId])

  const fetchDashboardData = async (coffreId: string) => {
    setLoading(true)
    try {
      const url = coffreId
        ? `/api/dashboard?coffreId=${coffreId}`
        : "/api/dashboard"
      const response = await fetch(url)
      if (response.ok) {
        const dashboardData = await response.json()
        setData(dashboardData)
      } else {
        console.error("Erreur récupération dashboard")
      }
    } catch (error) {
      console.error("Erreur récupération dashboard:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading && !data) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-blue-400 mb-2">
            Dashboard
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Vue d&apos;ensemble de vos coffres et statistiques
          </p>
        </div>
        <p className="text-muted-foreground text-center py-8">
          Aucune donnée disponible
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-blue-400 mb-2">
            Dashboard
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Vue d&apos;ensemble de vos coffres et statistiques
          </p>
        </div>

        {initialCoffres.length > 0 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col gap-2 min-w-[200px] sm:min-w-[250px]"
          >
            <Label htmlFor="coffre-select" className="text-sm text-muted-foreground">
              Filtrer par coffre
            </Label>
            <Select
              id="coffre-select"
              value={selectedCoffreId}
              onChange={(e) => setSelectedCoffreId(e.target.value)}
            >
              <option value="">Tous les coffres</option>
              {initialCoffres.map((coffre) => (
                <option key={coffre.id} value={coffre.id}>
                  {coffre.name}
                </option>
              ))}
            </Select>
          </motion.div>
        )}
      </div>

      <DashboardStats data={data} />
    </div>
  )
}

