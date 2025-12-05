"use client"

import { useState, useEffect } from "react"
import { Select, SelectItem } from "@heroui/react"
import { Card, CardBody } from "@heroui/react"
import { DashboardStats } from "./DashboardStats"
import { Spinner } from "@heroui/react"
import { formatCurrency } from "@/lib/utils"
import { Wallet } from "lucide-react"
import { motion } from "framer-motion"

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
  monthlyActivity?: any[]
  billDistribution?: any[]
  topUsers?: any[]
}

interface CoffreBalance {
  coffreId: string
  coffreName: string
  balance: number
}

export function DashboardClient({ initialCoffres }: DashboardClientProps) {
  const [selectedCoffreId, setSelectedCoffreId] = useState<string>("")
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [coffresBalances, setCoffresBalances] = useState<CoffreBalance[]>([])

  useEffect(() => {
    fetchDashboardData(selectedCoffreId)
  }, [selectedCoffreId])

  // Charger les balances de tous les coffres
  useEffect(() => {
    if (initialCoffres.length > 0) {
      Promise.all(
        initialCoffres.map(async (coffre) => {
          try {
            const res = await fetch(`/api/coffres/balance?coffreId=${coffre.id}`)
            if (res.ok) {
              const data = await res.json()
              return {
                coffreId: coffre.id,
                coffreName: coffre.name,
                balance: data.balance || 0,
              }
            }
            return {
              coffreId: coffre.id,
              coffreName: coffre.name,
              balance: 0,
            }
          } catch {
            return {
              coffreId: coffre.id,
              coffreName: coffre.name,
              balance: 0,
            }
          }
        })
      ).then(setCoffresBalances)
    }
  }, [initialCoffres])

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
      }
    } catch (error) {
      console.error("Erreur récupération dashboard:", error)
    } finally {
      setLoading(false)
    }
  }

  const totalBalance = coffresBalances.reduce((sum, cb) => sum + cb.balance, 0)

  if (loading && !data) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <Spinner size="lg" color="primary" />
      </div>
    )
  }

  if (!data) {
    return (
      <p className="text-foreground/60 text-center py-8">
        Aucune donnée disponible
      </p>
    )
  }

  return (
    <div className="space-y-6">
      {/* Montant total global de tous les coffres - Design compact */}
      {coffresBalances.length > 0 && (
        <motion.div
          whileHover={{ scale: 1.02 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="relative group"
        >
          {/* Halo lumineux au survol */}
          <div className="absolute -inset-0.5 bg-primary/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10" />
          
          <Card className="bg-gradient-to-br from-default-100 to-default-50 border-divider border">
            <CardBody className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Wallet className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-foreground/60 mb-0.5">Montant total</p>
                    <p className="text-xl font-bold text-primary">
                      {formatCurrency(totalBalance)}
                    </p>
                  </div>
                </div>
                
                {/* Détail par coffre - compact */}
                {coffresBalances.length > 1 && (
                  <div className="text-right">
                    <div className="space-y-1">
                      {coffresBalances.map((cb) => (
                        <div key={cb.coffreId} className="flex items-center gap-2 text-xs">
                          <span className="text-foreground/60">{cb.coffreName}:</span>
                          <span className="font-semibold text-primary">
                            {formatCurrency(cb.balance)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>
        </motion.div>
      )}

      {initialCoffres.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <Select
            label="Filtrer par coffre"
            selectedKeys={selectedCoffreId ? [selectedCoffreId] : []}
            onSelectionChange={(keys) => {
              const selected = Array.from(keys)[0] as string
              setSelectedCoffreId(selected || "")
            }}
            className="w-full sm:w-64"
          >
            {[
              <SelectItem key="">
                Tous les coffres
              </SelectItem>,
              ...initialCoffres.map((coffre) => (
                <SelectItem key={coffre.id}>
                  {coffre.name}
                </SelectItem>
              )),
            ]}
          </Select>
        </div>
      )}

      <DashboardStats data={data} />
    </div>
  )
}
