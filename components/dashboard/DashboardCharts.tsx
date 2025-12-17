"use client"

import { useState, useMemo } from "react"
import { Card, CardHeader, CardBody } from "@heroui/react"
import { Button } from "@heroui/react"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js"
import { Line, Bar, Doughnut } from "react-chartjs-2"
import { formatCurrency } from "@/lib/utils"
import { motion } from "framer-motion"
import { subDays, subMonths, subYears, format } from "date-fns"

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

interface DashboardChartsProps {
  data: {
    movements: any[]
    statsByCoffre: any[]
    recentInventories?: any[]
    monthlyActivity?: any[]
    billDistribution?: any[]
    topUsers?: any[]
    allMovements?: any[] // Tous les mouvements pour l'évolution du solde
    allInventories?: any[] // Tous les inventaires pour l'évolution du solde
    totalBalance?: number // Solde total pour l'échelle Y
  }
}

type TimePeriod = "1d" | "1w" | "1m" | "1y" | "5y"

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: {
        color: "#fafafa",
        font: {
          size: 12,
        },
      },
    },
    tooltip: {
      backgroundColor: "rgba(26, 26, 26, 0.95)",
      titleColor: "#3B82F6",
      bodyColor: "#fafafa",
      borderColor: "rgba(59, 130, 246, 0.3)",
      borderWidth: 1,
      padding: 12,
      cornerRadius: 8,
    },
  },
  scales: {
    x: {
      ticks: { color: "#9ca3af" },
      grid: { color: "rgba(255, 255, 255, 0.05)" },
    },
    y: {
      ticks: { color: "#9ca3af" },
      grid: { color: "rgba(255, 255, 255, 0.05)" },
    },
  },
}

export function DashboardCharts({ data }: DashboardChartsProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>("1m")
  // Graphique 1: Évolution du solde cumulé dans le temps
  const balanceEvolutionData = (() => {
    const recentInventories = data.recentInventories || []
    const movements = data.movements || []
    
    // Trier tous les événements (inventaires + mouvements) par date
    const allEvents: Array<{ date: Date; type: 'inventory' | 'movement'; amount: number }> = []
    
    // Ajouter les inventaires
    recentInventories.forEach((inv: any) => {
      allEvents.push({
        date: new Date(inv.createdAt),
        type: 'inventory',
        amount: Number(inv.totalAmount),
      })
    })
    
    // Ajouter les mouvements
    movements.forEach((mov: any) => {
      if (mov.type === "ENTRY") {
        allEvents.push({
          date: new Date(mov.createdAt),
          type: 'movement',
          amount: Number(mov.amount),
        })
      } else if (mov.type === "EXIT") {
        allEvents.push({
          date: new Date(mov.createdAt),
          type: 'movement',
          amount: -Number(mov.amount),
        })
      }
    })
    
    // Trier par date
    allEvents.sort((a, b) => a.date.getTime() - b.date.getTime())
    
    // Calculer le solde cumulé
    let currentBalance = 0
    const balanceData: Array<{ date: string; balance: number }> = []
    
    // Si on a des inventaires, utiliser le dernier comme point de départ
    if (recentInventories.length > 0) {
      const lastInventory = recentInventories
        .map((inv: any) => ({ date: new Date(inv.createdAt), amount: Number(inv.totalAmount) }))
        .sort((a: any, b: any) => b.date.getTime() - a.date.getTime())[0]
      
      // Trouver tous les mouvements après le dernier inventaire
      const movementsAfterInventory = allEvents.filter(
        (e) => e.date > lastInventory.date && e.type === 'movement'
      )
      
      // Calculer le solde à partir du dernier inventaire
      currentBalance = lastInventory.amount
      balanceData.push({
        date: lastInventory.date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
        balance: currentBalance,
      })
      
      // Ajouter les mouvements après l'inventaire
      movementsAfterInventory.forEach((event) => {
        currentBalance += event.amount
        balanceData.push({
          date: event.date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
          balance: currentBalance,
        })
      })
    } else {
      // Pas d'inventaire, calculer depuis le début
      allEvents.forEach((event) => {
        if (event.type === 'inventory') {
          currentBalance = event.amount
        } else {
          currentBalance += event.amount
        }
        balanceData.push({
          date: event.date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
          balance: currentBalance,
        })
      })
    }
    
    // Si pas de données, retourner un tableau vide
    if (balanceData.length === 0) {
      return {
        labels: [],
        datasets: [],
      }
    }
    
    return {
      labels: balanceData.map((d) => d.date),
      datasets: [
        {
          label: "Solde",
          data: balanceData.map((d) => d.balance),
          borderColor: "#3B82F6",
          backgroundColor: "rgba(59, 130, 246, 0.1)",
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
      ],
    }
  })()

  // Graphique 2: Répartition des billets avec couleurs réelles des billets d'euro
  const billDistributionData = (() => {
    const bills = data.billDistribution || []
    
    // Couleurs réelles des billets d'euro
    const euroBillColors: Record<number, { bg: string; border: string }> = {
      5: { bg: "rgba(128, 128, 128, 0.8)", border: "#808080" },      // Gris
      10: { bg: "rgba(255, 99, 132, 0.8)", border: "#FF6384" },    // Rose/Rouge
      20: { bg: "rgba(54, 162, 235, 0.8)", border: "#36A2EB" },     // Bleu
      50: { bg: "rgba(255, 159, 64, 0.8)", border: "#FF9F40" },     // Orange
      100: { bg: "rgba(75, 192, 192, 0.8)", border: "#4BC0C0" },    // Vert/Turquoise
      200: { bg: "rgba(255, 206, 86, 0.8)", border: "#FFCE56" },    // Jaune
      500: { bg: "rgba(153, 102, 255, 0.8)", border: "#9966FF" },   // Violet/Mauve
    }
    
    return {
      labels: bills.map((b: any) => `${b.denomination}€`),
      datasets: [
        {
          label: "Quantité de billets",
          data: bills.map((b: any) => b.quantity),
          backgroundColor: bills.map((b: any) => 
            euroBillColors[b.denomination]?.bg || "rgba(59, 130, 246, 0.8)"
          ),
          borderColor: bills.map((b: any) => 
            euroBillColors[b.denomination]?.border || "#3B82F6"
          ),
          borderWidth: 2,
        },
      ],
    }
  })()

  // Graphique 3: Évolution du solde avec sélecteur de période
  const balanceEvolutionPeriodData = useMemo(() => {
    const allMovements = data.allMovements || data.movements || []
    const allInventories = data.allInventories || data.recentInventories || []
    const totalBalance = data.totalBalance || 0

    // Calculer la date de début selon la période
    const now = new Date()
    let startDate: Date
    switch (selectedPeriod) {
      case "1d":
        startDate = subDays(now, 1)
        break
      case "1w":
        startDate = subDays(now, 7)
        break
      case "1m":
        startDate = subMonths(now, 1)
        break
      case "1y":
        startDate = subYears(now, 1)
        break
      case "5y":
        startDate = subYears(now, 5)
        break
      default:
        startDate = subMonths(now, 1)
    }

    // Filtrer les événements selon la période
    const allEvents: Array<{ date: Date; type: 'inventory' | 'movement'; amount: number }> = []
    
    // Ajouter les inventaires dans la période
    allInventories.forEach((inv: any) => {
      const invDate = new Date(inv.createdAt)
      if (invDate >= startDate) {
        allEvents.push({
          date: invDate,
          type: 'inventory',
          amount: Number(inv.totalAmount),
        })
      }
    })
    
    // Ajouter les mouvements dans la période
    allMovements.forEach((mov: any) => {
      const movDate = new Date(mov.createdAt)
      if (movDate >= startDate) {
        if (mov.type === "ENTRY") {
          allEvents.push({
            date: movDate,
            type: 'movement',
            amount: Number(mov.amount),
          })
        } else if (mov.type === "EXIT") {
          allEvents.push({
            date: movDate,
            type: 'movement',
            amount: -Number(mov.amount),
          })
        }
      }
    })
    
    // Trier par date
    allEvents.sort((a, b) => a.date.getTime() - b.date.getTime())
    
    // Trouver le dernier inventaire avant la période pour avoir le solde de départ
    const inventoriesBeforePeriod = (data.allInventories || data.recentInventories || [])
      .filter((inv: any) => new Date(inv.createdAt) < startDate)
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    
    let startingBalance = 0
    if (inventoriesBeforePeriod.length > 0) {
      const lastInventoryBefore = inventoriesBeforePeriod[0]
      startingBalance = Number(lastInventoryBefore.totalAmount)
      
      // Ajouter les mouvements entre le dernier inventaire et le début de la période
      const movementsBeforePeriod = (data.allMovements || data.movements || [])
        .filter((mov: any) => {
          const movDate = new Date(mov.createdAt)
          return movDate >= new Date(lastInventoryBefore.createdAt) && movDate < startDate
        })
      
      movementsBeforePeriod.forEach((mov: any) => {
        if (mov.type === "ENTRY") {
          startingBalance += Number(mov.amount)
        } else if (mov.type === "EXIT") {
          startingBalance -= Number(mov.amount)
        }
      })
    } else {
      // Pas d'inventaire avant, calculer depuis le début
      const movementsBeforePeriod = (data.allMovements || data.movements || [])
        .filter((mov: any) => new Date(mov.createdAt) < startDate)
      
      movementsBeforePeriod.forEach((mov: any) => {
        if (mov.type === "ENTRY") {
          startingBalance += Number(mov.amount)
        } else if (mov.type === "EXIT") {
          startingBalance -= Number(mov.amount)
        }
      })
    }
    
    // Calculer le solde cumulé
    let currentBalance = startingBalance
    const balanceData: Array<{ date: string; balance: number; timestamp: number }> = []
    
    // Ajouter le point de départ si on a un solde initial
    if (startingBalance > 0 || allEvents.length > 0) {
      balanceData.push({
        date: format(startDate, "dd/MM/yyyy HH:mm"),
        balance: startingBalance,
        timestamp: startDate.getTime(),
      })
    }
    
    allEvents.forEach((event) => {
      if (event.type === 'inventory') {
        currentBalance = event.amount
      } else {
        currentBalance += event.amount
      }
      balanceData.push({
        date: format(event.date, selectedPeriod === "1d" ? "HH:mm" : selectedPeriod === "1w" ? "dd/MM HH:mm" : "dd/MM/yyyy"),
        balance: currentBalance,
        timestamp: event.date.getTime(),
      })
    })
    
    // Si pas de données, retourner un tableau vide
    if (balanceData.length === 0) {
      return {
        chartData: {
          labels: [],
          datasets: [],
        },
        maxBalance: totalBalance || 0,
      }
    }
    
    // Trouver le solde max pour l'échelle
    const maxBalanceInPeriod = Math.max(...balanceData.map(d => d.balance), totalBalance || 0)
    const minBalanceInPeriod = Math.min(...balanceData.map(d => d.balance), 0)
    const maxBalance = Math.max(maxBalanceInPeriod, Math.abs(minBalanceInPeriod) * 0.1) // Ajouter 10% de marge
    
    const chartData = {
      labels: balanceData.map((d) => d.date),
      datasets: [
        {
          label: "Solde",
          data: balanceData.map((d) => d.balance),
          borderColor: "#3B82F6",
          backgroundColor: "rgba(59, 130, 246, 0.1)",
          fill: true,
          tension: 0.4,
          pointRadius: selectedPeriod === "1d" ? 3 : 2,
          pointHoverRadius: 5,
          pointBackgroundColor: "#3B82F6",
          pointBorderColor: "#ffffff",
          pointBorderWidth: 2,
        },
      ],
    }
    
    return { chartData, maxBalance }
  }, [data, selectedPeriod])

  // Graphique 4: Répartition par coffre (solde net par coffre)
  const coffreDistributionData = (() => {
    const stats = data.statsByCoffre || []
    const coffreMap = new Map<string, number>()
    
    // Calculer le solde net par coffre (ENTRY - EXIT)
    stats.forEach((stat: any) => {
      const existing = coffreMap.get(stat.coffreName) || 0
      
      // ENTRY → ajouter, EXIT → soustraire
      if (stat.type === "ENTRY") {
        coffreMap.set(stat.coffreName, existing + stat.amount)
      } else if (stat.type === "EXIT") {
        coffreMap.set(stat.coffreName, existing - stat.amount)
      }
    })
    
    const entries = Array.from(coffreMap.entries())
    return {
      labels: entries.map(([name]) => name),
      datasets: [
        {
          data: entries.map(([, value]) => value),
          backgroundColor: [
            "rgba(59, 130, 246, 0.8)",
            "rgba(34, 197, 94, 0.8)",
            "rgba(239, 68, 68, 0.8)",
            "rgba(245, 158, 11, 0.8)",
            "rgba(168, 85, 247, 0.8)",
          ],
          borderColor: [
            "#3B82F6",
            "#22c55e",
            "#ef4444",
            "#f59e0b",
            "#a855f7",
          ],
          borderWidth: 2,
        },
      ],
    }
  })()

  // Graphique 5: Top utilisateurs
  const topUsersData = (() => {
    const users = data.topUsers || []
    return {
      labels: users.map((u: any) => u.name),
      datasets: [
        {
          label: "Nombre de mouvements",
          data: users.map((u: any) => u.count),
          backgroundColor: "rgba(59, 130, 246, 0.6)",
          borderColor: "#3B82F6",
          borderWidth: 2,
          borderRadius: 6,
        },
      ],
    }
  })()

  return (
    <div className="space-y-6">
      {/* Graphique 1: Évolution du solde */}
      <motion.div
        whileHover={{ scale: 1.01 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className="relative group"
      >
        {/* Halo lumineux au survol */}
        <div className="absolute -inset-0.5 bg-primary/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10" />
        
        <Card className="bg-card/70 backdrop-blur border border-border/60 shadow-[var(--shadow-1)]">
          <CardHeader>
            <h3 className="text-lg font-semibold">Évolution du solde</h3>
          </CardHeader>
          <CardBody>
            <div className="h-80">
              {balanceEvolutionData.labels.length === 0 ? (
                <div className="h-full flex items-center justify-center text-foreground/60">
                  Aucune donnée disponible
                </div>
              ) : (
                <Line 
                  data={balanceEvolutionData} 
                  options={{
                    ...chartOptions,
                    plugins: {
                      ...chartOptions.plugins,
                      legend: {
                        display: false,
                      },
                      tooltip: {
                        ...chartOptions.plugins.tooltip,
                        backgroundColor: "rgba(18, 18, 20, 0.92)",
                        borderColor: "rgba(59, 130, 246, 0.35)",
                        callbacks: {
                          label: (context: any) => {
                            return `Solde: ${formatCurrency(context.parsed.y)}`
                          },
                        },
                      },
                    },
                  }} 
                />
              )}
            </div>
          </CardBody>
        </Card>
      </motion.div>

      {/* Graphiques en grille */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Graphique 2: Répartition des billets */}
        <motion.div
          whileHover={{ scale: 1.01 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="relative group"
        >
          {/* Halo lumineux au survol */}
          <div className="absolute -inset-0.5 bg-primary/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10" />
          
          <Card className="bg-card/70 backdrop-blur border border-border/60 shadow-[var(--shadow-1)]">
            <CardHeader>
              <h3 className="text-lg font-semibold">Répartition des billets</h3>
            </CardHeader>
            <CardBody>
              <div className="h-64">
                <Bar
                  data={billDistributionData}
                  options={{
                    ...chartOptions,
                    indexAxis: "y" as const,
                    plugins: {
                      ...chartOptions.plugins,
                      legend: {
                        display: false,
                      },
                    },
                  }}
                />
              </div>
            </CardBody>
          </Card>
        </motion.div>

        {/* Graphique 3: Évolution du solde avec sélecteur de période */}
        <motion.div
          whileHover={{ scale: 1.01 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="relative group"
        >
          {/* Halo lumineux au survol */}
          <div className="absolute -inset-0.5 bg-primary/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10" />
          
          <Card className="bg-card/70 backdrop-blur border border-border/60 shadow-[var(--shadow-1)]">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h3 className="text-lg font-semibold">Évolution du solde</h3>
              <div className="flex gap-2 flex-wrap">
                {(["1d", "1w", "1m", "1y", "5y"] as TimePeriod[]).map((period) => {
                  const isSelected = selectedPeriod === period
                  return (
                    <Button
                      key={period}
                      size="sm"
                      variant={isSelected ? "solid" : "bordered"}
                      color={isSelected ? "primary" : "default"}
                      onPress={() => setSelectedPeriod(period)}
                      className="min-w-12"
                    >
                      {period === "1d" ? "1j" : period === "1w" ? "1sem" : period === "1m" ? "1mois" : period === "1y" ? "1an" : "5ans"}
                    </Button>
                  )
                })}
              </div>
            </CardHeader>
            <CardBody>
              <div className="h-64">
                {balanceEvolutionPeriodData.chartData.labels.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-foreground/60">
                    Aucune donnée disponible
                  </div>
                ) : (
                  <Line 
                    data={balanceEvolutionPeriodData.chartData} 
                    options={{
                      ...chartOptions,
                      scales: {
                        ...chartOptions.scales,
                        y: {
                          ...chartOptions.scales.y,
                          min: 0,
                          max: balanceEvolutionPeriodData.maxBalance,
                          ticks: {
                            ...chartOptions.scales.y.ticks,
                            callback: function(value: any) {
                              return formatCurrency(value)
                            },
                          },
                        },
                      },
                      plugins: {
                        ...chartOptions.plugins,
                        legend: {
                          display: false,
                        },
                        tooltip: {
                          ...chartOptions.plugins.tooltip,
                          callbacks: {
                            label: (context: any) => {
                              return `Solde: ${formatCurrency(context.parsed.y)}`
                            },
                          },
                        },
                      },
                    }} 
                  />
                )}
              </div>
            </CardBody>
          </Card>
        </motion.div>

        {/* Graphique 4: Répartition par coffre */}
        <motion.div
          whileHover={{ scale: 1.01 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="relative group"
        >
          {/* Halo lumineux au survol */}
          <div className="absolute -inset-0.5 bg-primary/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10" />
          
          <Card className="bg-card/70 backdrop-blur border border-border/60 shadow-[var(--shadow-1)]">
            <CardHeader>
              <h3 className="text-lg font-semibold">Répartition par coffre</h3>
            </CardHeader>
            <CardBody>
              <div className="h-64">
                <Doughnut
                  data={coffreDistributionData}
                  options={{
                    ...chartOptions,
                    plugins: {
                      ...chartOptions.plugins,
                      legend: {
                        ...chartOptions.plugins.legend,
                        position: "bottom" as const,
                        labels: { color: "#a0aec0" },
                      },
                    },
                  }}
                />
              </div>
            </CardBody>
          </Card>
        </motion.div>

        {/* Graphique 5: Top utilisateurs */}
        {data.topUsers && data.topUsers.length > 0 && (
          <motion.div
            whileHover={{ scale: 1.01 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="relative group"
          >
            {/* Halo lumineux au survol */}
            <div className="absolute -inset-0.5 bg-primary/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10" />
            
            <Card className="bg-card/70 backdrop-blur border border-border/60 shadow-[var(--shadow-1)]">
              <CardHeader>
                <h3 className="text-lg font-semibold">Top utilisateurs (activité)</h3>
              </CardHeader>
              <CardBody>
                <div className="h-64">
                  <Bar
                    data={topUsersData}
                    options={{
                      ...chartOptions,
                      indexAxis: "y" as const,
                    plugins: {
                      ...chartOptions.plugins,
                      legend: {
                        display: false,
                      },
                      tooltip: {
                        ...chartOptions.plugins.tooltip,
                        backgroundColor: "rgba(18, 18, 20, 0.92)",
                        borderColor: "rgba(59, 130, 246, 0.35)",
                      },
                    },
                    }}
                  />
                </div>
              </CardBody>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  )
}
