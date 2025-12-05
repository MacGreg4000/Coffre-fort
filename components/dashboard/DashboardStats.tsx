"use client"

import { Card, CardHeader, CardBody } from "@heroui/react"
import { formatCurrency } from "@/lib/utils"
import { TrendingUp, TrendingDown, Wallet } from "lucide-react"
import { DashboardCharts } from "./DashboardCharts"

interface DashboardStatsProps {
  data: {
    totalEntries: number
    totalExits: number
    movements: any[]
    inventories: any[]
    recentInventories?: any[]
    statsByCoffre: any[]
    coffres: any[]
  }
}

export function DashboardStats({ data }: DashboardStatsProps) {
  const netAmount = data.totalEntries - data.totalExits

  return (
    <div className="space-y-6">
      {/* Stats principales - simplifiées */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-success/20 to-success/5 border-success/30">
          <CardBody className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground/60 mb-1">Entrées du mois</p>
                <p className="text-2xl font-bold text-success">
                  {formatCurrency(data.totalEntries)}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-success/50" />
            </div>
          </CardBody>
        </Card>

        <Card className="bg-gradient-to-br from-danger/20 to-danger/5 border-danger/30">
          <CardBody className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground/60 mb-1">Sorties du mois</p>
                <p className="text-2xl font-bold text-danger">
                  {formatCurrency(data.totalExits)}
                </p>
              </div>
              <TrendingDown className="h-8 w-8 text-danger/50" />
            </div>
          </CardBody>
        </Card>

        <Card className="bg-gradient-to-br from-primary/20 to-primary/5 border-primary/30">
          <CardBody className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground/60 mb-1">Solde net</p>
                <p className="text-2xl font-bold text-primary">
                  {formatCurrency(netAmount)}
                </p>
              </div>
              <Wallet className="h-8 w-8 text-primary/50" />
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Charts */}
      <DashboardCharts data={data} />

      {/* Derniers inventaires - simplifié */}
      {data.inventories.length > 0 && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Derniers inventaires</h3>
          </CardHeader>
          <CardBody>
            <div className="space-y-2">
              {data.inventories.map((inventory) => (
                <div
                  key={inventory.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-default-100 border border-divider"
                >
                  <div>
                    <p className="font-medium text-foreground">{inventory.coffre.name}</p>
                    <p className="text-xs text-foreground/50">
                      {new Date(inventory.createdAt).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                  <p className="text-lg font-bold text-primary">
                    {formatCurrency(Number(inventory.totalAmount))}
                  </p>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  )
}
