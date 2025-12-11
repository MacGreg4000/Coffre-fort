"use client"

import { Card, CardBody } from "@heroui/react"
import { formatCurrency } from "@/lib/utils"
import { TrendingUp, TrendingDown, Wallet, Activity } from "lucide-react"
import { DashboardCharts } from "./DashboardCharts"
import { motion } from "framer-motion"

interface DashboardStatsProps {
  data: {
    totalEntries: number
    totalExits: number
    movements: any[]
    inventories: any[]
    recentInventories?: any[]
    statsByCoffre: any[]
    coffres: any[]
    monthlyActivity?: any[]
    allMovements?: any[]
    allInventories?: any[]
    totalBalance?: number
  }
}

export function DashboardStats({ data }: DashboardStatsProps) {
  const netAmount = data.totalEntries - data.totalExits
  const totalMovements = data.movements.length
  
  // Calculer la moyenne mensuelle
  const avgMonthlyActivity = data.monthlyActivity 
    ? data.monthlyActivity.reduce((sum: number, month: any) => sum + month.count, 0) / Math.max(data.monthlyActivity.length, 1)
    : 0

  const stats = [
    {
      title: "Entrées du mois",
      value: formatCurrency(data.totalEntries),
      icon: TrendingUp,
    },
    {
      title: "Sorties du mois",
      value: formatCurrency(data.totalExits),
      icon: TrendingDown,
    },
    {
      title: "Solde net",
      value: formatCurrency(netAmount),
      icon: Wallet,
    },
    {
      title: "Mouvements",
      value: totalMovements.toString(),
      subtitle: `${avgMonthlyActivity.toFixed(1)}/mois en moyenne`,
      icon: Activity,
    },
  ]

  return (
    <div className="space-y-8">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <motion.div
              key={stat.title}
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="relative group h-full"
            >
              {/* Halo lumineux au survol */}
              <div className="absolute -inset-0.5 bg-primary/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10" />
              
              <Card className="bg-card/70 backdrop-blur border border-border/60 h-full">
                <CardBody className="p-5 sm:p-6 flex flex-col h-full">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                  <div className="flex-1 flex flex-col justify-between">
                    <p className="text-sm text-foreground/60 mb-1">{stat.title}</p>
                    <p className="text-3xl font-semibold text-primary mb-1">
                      {stat.value}
                    </p>
                    <p className="text-xs text-foreground/50 min-h-[16px]">
                      {stat.subtitle || "\u00A0"}
                    </p>
                  </div>
                </CardBody>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {/* Charts */}
      <DashboardCharts data={data} />
    </div>
  )
}
