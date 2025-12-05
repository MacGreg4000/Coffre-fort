"use client"

import { useState, useEffect } from "react"
import { Select, SelectItem } from "@heroui/react"
import { Card, CardBody } from "@heroui/react"
import { DashboardStats } from "./DashboardStats"
import { Spinner } from "@heroui/react"
import { formatCurrency } from "@/lib/utils"
import { Wallet } from "lucide-react"

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
      {/* Montant total global de tous les coffres */}
      {coffresBalances.length > 0 && (
        <Card className="bg-gradient-to-br from-primary/20 to-primary/5 border-primary/30">
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-foreground/60 mb-1">Montant total de tous les coffres</div>
                <div className="text-4xl sm:text-5xl font-bold text-primary">
                  {formatCurrency(totalBalance)}
                </div>
              </div>
              <Wallet className="h-12 w-12 text-primary/30" />
            </div>
            
            {/* Détail par coffre */}
            {coffresBalances.length > 1 && (
              <div className="mt-4 pt-4 border-t border-divider space-y-2">
                {coffresBalances.map((cb) => (
                  <div key={cb.coffreId} className="flex items-center justify-between text-sm">
                    <span className="text-foreground/70">{cb.coffreName}</span>
                    <span className="font-semibold text-primary">
                      {formatCurrency(cb.balance)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
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
            <SelectItem key="" value="">
              Tous les coffres
            </SelectItem>
            {initialCoffres.map((coffre) => (
              <SelectItem key={coffre.id} value={coffre.id}>
                {coffre.name}
              </SelectItem>
            ))}
          </Select>
        </div>
      )}

      <DashboardStats data={data} />
    </div>
  )
}
