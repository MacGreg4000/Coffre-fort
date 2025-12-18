"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import {
  TrendingUp,
  Wallet,
  PiggyBank,
  Calculator,
} from "lucide-react"
import { Line, Bar, Doughnut } from "react-chartjs-2"
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

// Enregistrer les composants Chart.js
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

type Reserve = {
  id: string
  year: number
  amount: number
  releaseYear: number | null
  released: number
  notes: string | null
  createdAt: string
  updatedAt: string
}

type Stats = {
  total: number
  totalReleased: number
  totalReleasable: number
  count: number
}

export function ReservesSummary() {
  const router = useRouter()
  const [reserves, setReserves] = useState<Reserve[]>([])
  const [stats, setStats] = useState<Stats>({
    total: 0,
    totalReleased: 0,
    totalReleasable: 0,
    count: 0,
  })
  const [loading, setLoading] = useState(true)

  // Charger les réserves + initialiser les années si besoin
  useEffect(() => {
    const initializeAndFetch = async () => {
      try {
        // Initialiser les années (2013-2055) si pas encore fait
        await fetch("/api/reserves/initialize", { method: "POST" })
        // Puis charger les réserves
        await fetchReserves()
      } catch (error) {
        console.error("Erreur initialisation:", error)
        fetchReserves() // Charger quand même
      }
    }
    initializeAndFetch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchReserves = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/reserves")
      if (!response.ok) throw new Error("Erreur lors du chargement")

      const data = await response.json()
      setReserves(data.reserves || [])
      setStats(data.stats || { total: 0, totalReleased: 0, totalReleasable: 0, count: 0 })
    } catch (error) {
      console.error("Erreur:", error)
    } finally {
      setLoading(false)
    }
  }

  // Graphique 1: Évolution des montants
  const lineChartData = useMemo(() => {
    const sortedReserves = [...reserves].sort((a, b) => a.year - b.year)
    
    return {
      labels: sortedReserves.map((r) => r.year.toString()),
      datasets: [
        {
          label: "Montant (€)",
          data: sortedReserves.map((r) => Number(r.amount)),
          borderColor: "#3B82F6",
          backgroundColor: "rgba(59, 130, 246, 0.1)",
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: "#3B82F6",
          pointBorderColor: "#ffffff",
          pointBorderWidth: 2,
        },
      ],
    }
  }, [reserves])

  // Graphique 2: Répartition par décennie
  const barChartData = useMemo(() => {
    const decades = new Map<string, number>()
    
    reserves.forEach((r) => {
      const decade = `${Math.floor(r.year / 10) * 10}s`
      decades.set(decade, (decades.get(decade) || 0) + Number(r.amount))
    })
    
    const sortedDecades = Array.from(decades.entries()).sort((a, b) => a[0].localeCompare(b[0]))
    
    return {
      labels: sortedDecades.map(([decade]) => decade),
      datasets: [
        {
          label: "Montant par Décennie (€)",
          data: sortedDecades.map(([, amount]) => amount),
          backgroundColor: [
            "rgba(59, 130, 246, 0.7)",
            "rgba(34, 197, 94, 0.7)",
            "rgba(251, 146, 60, 0.7)",
            "rgba(168, 85, 247, 0.7)",
            "rgba(236, 72, 153, 0.7)",
          ],
          borderColor: [
            "#3B82F6",
            "#22c55e",
            "#fb923c",
            "#a855f7",
            "#ec4899",
          ],
          borderWidth: 2,
        },
      ],
    }
  }, [reserves])

  // Graphique 3: Répartition Libéré vs Disponible
  const doughnutChartData = useMemo(() => {
    return {
      labels: ["Libéré", "Disponible"],
      datasets: [
        {
          data: [stats.totalReleased, stats.totalReleasable],
          backgroundColor: [
            "rgba(34, 197, 94, 0.7)",
            "rgba(251, 146, 60, 0.7)",
          ],
          borderColor: [
            "#22c55e",
            "#fb923c",
          ],
          borderWidth: 2,
        },
      ],
    }
  }, [stats])

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        padding: 12,
        titleFont: { size: 14, weight: "bold" as const },
        bodyFont: { size: 13 },
        callbacks: {
          label: (context: any) => {
            return `Montant: ${context.parsed.y.toLocaleString("fr-FR")} €`
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value: any) => `${value.toLocaleString("fr-FR")} €`,
        },
        grid: {
          color: "rgba(255, 255, 255, 0.05)",
        },
      },
      x: {
        grid: {
          color: "rgba(255, 255, 255, 0.05)",
        },
      },
    },
  }

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        padding: 12,
        callbacks: {
          label: (context: any) => {
            return `Total: ${context.parsed.y.toLocaleString("fr-FR")} €`
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value: any) => `${value.toLocaleString("fr-FR")} €`,
        },
        grid: {
          color: "rgba(255, 255, 255, 0.05)",
        },
      },
      x: {
        grid: {
          display: false,
        },
      },
    },
  }

  const doughnutChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom" as const,
        labels: {
          padding: 15,
          font: { size: 12 },
        },
      },
      tooltip: {
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        padding: 12,
        callbacks: {
          label: (context: any) => {
            const value = context.parsed
            const percentage = ((value / stats.total) * 100).toFixed(1)
            return `${context.label}: ${value.toLocaleString("fr-FR")} € (${percentage}%)`
          },
        },
      },
    },
  }

  // Format number
  const formatCurrency = (value: number) => {
    return value.toLocaleString("fr-FR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Cartes statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-effect rounded-3xl p-6 border border-border/50 shadow-lg"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Réserves</p>
              <p className="text-3xl font-bold bg-gradient-to-r from-blue-500 to-blue-600 bg-clip-text text-transparent">
                {formatCurrency(stats.total)} €
              </p>
            </div>
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500/20 to-blue-600/20 flex items-center justify-center">
              <Wallet className="w-6 h-6 text-blue-500" />
            </div>
          </div>
        </motion.div>

        {/* Libéré */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-effect rounded-3xl p-6 border border-border/50 shadow-lg"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Libéré</p>
              <p className="text-3xl font-bold bg-gradient-to-r from-green-500 to-emerald-600 bg-clip-text text-transparent">
                {formatCurrency(stats.totalReleased)} €
              </p>
            </div>
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-600/20 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-500" />
            </div>
          </div>
        </motion.div>

        {/* Libérable */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-effect rounded-3xl p-6 border border-border/50 shadow-lg"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Disponible</p>
              <p className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-amber-600 bg-clip-text text-transparent">
                {formatCurrency(stats.totalReleasable)} €
              </p>
            </div>
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500/20 to-amber-600/20 flex items-center justify-center">
              <PiggyBank className="w-6 h-6 text-orange-500" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Graphique 1: Évolution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-effect rounded-3xl p-6 border border-border/50 shadow-lg"
        >
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Évolution des Réserves
          </h3>
          <div className="h-[300px]">
            {reserves.length > 0 ? (
              <Line data={lineChartData} options={lineChartOptions} />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Aucune donnée à afficher
              </div>
            )}
          </div>
        </motion.div>

        {/* Graphique 2: Répartition par décennie */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass-effect rounded-3xl p-6 border border-border/50 shadow-lg"
        >
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-green-500" />
            Répartition par Décennie
          </h3>
          <div className="h-[300px]">
            {reserves.length > 0 ? (
              <Bar data={barChartData} options={barChartOptions} />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Aucune donnée à afficher
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Graphique 3: Doughnut */}
      {reserves.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="glass-effect rounded-3xl p-6 border border-border/50 shadow-lg"
        >
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <PiggyBank className="w-5 h-5 text-orange-500" />
            Répartition Libéré / Disponible
          </h3>
          <div className="h-[300px] flex items-center justify-center">
            <div className="w-full max-w-md h-full">
              <Doughnut data={doughnutChartData} options={doughnutChartOptions} />
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}
