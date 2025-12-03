"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"
import { TrendingUp, TrendingDown, Wallet, Activity } from "lucide-react"
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
  const totalMovements = data.movements.length

  const stats = [
    {
      title: "Entrées du mois",
      value: formatCurrency(data.totalEntries),
      icon: TrendingUp,
      color: "text-green-400",
      bgColor: "bg-green-400/10",
    },
    {
      title: "Sorties du mois",
      value: formatCurrency(data.totalExits),
      icon: TrendingDown,
      color: "text-red-400",
      bgColor: "bg-red-400/10",
    },
    {
      title: "Solde net",
      value: formatCurrency(netAmount),
      icon: Wallet,
      color: "text-blue-400",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Mouvements",
      value: totalMovements.toString(),
      icon: Activity,
      color: "text-blue-400",
      bgColor: "bg-blue-400/10",
    },
  ]

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="cyber-card hover:shadow-md transition-all">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-foreground/70">
                  {stat.title}
                </CardTitle>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className={`text-xl sm:text-2xl lg:text-3xl font-bold ${stat.color}`}>
                  {stat.value}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <DashboardCharts data={data} />

      {/* Derniers inventaires */}
      <Card className="cyber-card">
        <CardHeader>
          <CardTitle>Derniers inventaires</CardTitle>
        </CardHeader>
        <CardContent>
          {data.inventories.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Aucun inventaire enregistré
            </p>
          ) : (
            <div className="space-y-4">
              {data.inventories.map((inventory) => (
                <motion.div
                  key={inventory.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center justify-between p-4 rounded-lg bg-cyber-dark border border-blue-500/10 hover:border-blue-500/20 transition-all hover:scale-[1.02]"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-blue-400 truncate">
                      {inventory.coffre.name}
                    </p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {new Date(inventory.createdAt).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <p className="text-lg sm:text-xl font-bold text-foreground">
                      {formatCurrency(Number(inventory.totalAmount))}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

