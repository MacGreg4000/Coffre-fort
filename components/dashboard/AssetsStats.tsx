"use client"

import { useEffect, useState } from "react"
import { Card, CardBody, CardHeader } from "@heroui/react"
import { formatCurrency } from "@/lib/utils"
import { Boxes, TrendingUp, MapPin, Tag } from "lucide-react"
import { motion } from "framer-motion"
import { PremiumCard } from "@/components/ui/premium-card"
import { Doughnut } from "react-chartjs-2"
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js"
import Link from "next/link"
import { Button } from "@heroui/react"

ChartJS.register(ArcElement, Tooltip, Legend)

interface Asset {
  id: string
  name: string
  category: string | null
  coffre: { id: string; name: string } | null
  events: Array<{
    id: string
    type: string
    amount: number | null
    date: string
  }>
}

export function AssetsStats() {
  const [loading, setLoading] = useState(true)
  const [assets, setAssets] = useState<Asset[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchAssets()
  }, [])

  const fetchAssets = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/assets")
      if (!res.ok) throw new Error("Erreur API")
      const data = await res.json()
      setAssets(data.assets || [])
    } catch (e: any) {
      setError(e.message || "Erreur")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-32 bg-card/50 rounded-xl animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-card/50 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="bg-card/70">
        <CardBody>
          <p className="text-foreground/60">Erreur: {error}</p>
        </CardBody>
      </Card>
    )
  }

  // Calculer les stats
  const totalAssets = assets.length
  const assetsWithValue = assets.filter((a) => {
    const lastEvent = a.events?.[0]
    return lastEvent && lastEvent.amount && lastEvent.amount > 0
  })

  const totalValue = assetsWithValue.reduce((sum, a) => {
    const lastEvent = a.events?.[0]
    if (lastEvent?.amount) return sum + Number(lastEvent.amount)
    return sum
  }, 0)

  // Répartition par catégorie
  const categoryMap = new Map<string, number>()
  assets.forEach((a) => {
    const category = a.category || "Non catégorisé"
    const lastEvent = a.events?.[0]
    const value = lastEvent?.amount ? Number(lastEvent.amount) : 0
    categoryMap.set(category, (categoryMap.get(category) || 0) + value)
  })

  const categoryData = Array.from(categoryMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  // Répartition par coffre
  const coffreMap = new Map<string, number>()
  assets.forEach((a) => {
    const coffreName = a.coffre?.name || "Non localisé"
    const lastEvent = a.events?.[0]
    const value = lastEvent?.amount ? Number(lastEvent.amount) : 0
    coffreMap.set(coffreName, (coffreMap.get(coffreName) || 0) + value)
  })

  const coffreData = Array.from(coffreMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom" as const,
        labels: { color: "#a0aec0", font: { size: 11 } },
      },
      tooltip: {
        backgroundColor: "rgba(26, 26, 26, 0.95)",
        titleColor: "#3B82F6",
        bodyColor: "#fafafa",
        borderColor: "rgba(59, 130, 246, 0.3)",
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (context: any) => {
            const label = context.label || ""
            const value = formatCurrency(context.parsed)
            return `${label}: ${value}`
          },
        },
      },
    },
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Boxes className="h-5 w-5 text-primary" />
            Statistiques des actifs
          </h2>
          <p className="text-muted-foreground mt-2">
            Vue d&apos;ensemble de vos actifs (or, montres, voitures, etc.)
          </p>
        </div>
        <Link href="/actifs">
          <Button color="primary" variant="flat" size="sm">
            Gérer les actifs
          </Button>
        </Link>
      </div>

      {/* Carte principale : Valeur totale */}
      <PremiumCard variant="gradient" hover3D glow shimmer>
        <div className="p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <motion.div
              className="p-3 rounded-xl bg-primary/20 border border-primary/30 backdrop-blur"
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
            >
              <TrendingUp className="h-5 w-5 text-primary" />
            </motion.div>
            <div>
              <p className="text-xs text-foreground/60 mb-1 font-medium">Valeur totale estimée</p>
              <motion.p
                className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
              >
                {formatCurrency(totalValue)}
              </motion.p>
              <p className="text-xs text-foreground/50 flex items-center gap-1.5 mt-0.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                {totalAssets} actif{totalAssets > 1 ? "s" : ""} enregistré{totalAssets > 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </div>
      </PremiumCard>

      {/* Stats détaillées */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Répartition par catégorie */}
        {categoryData.length > 0 && (
          <Card className="bg-card/70 backdrop-blur border border-border/60">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">Par catégorie</h3>
              </div>
            </CardHeader>
            <CardBody>
              <div className="h-64">
                <Doughnut
                  data={{
                    labels: categoryData.map(([cat]) => cat),
                    datasets: [
                      {
                        data: categoryData.map(([, value]) => value),
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
                  }}
                  options={chartOptions}
                />
              </div>
            </CardBody>
          </Card>
        )}

        {/* Répartition par coffre */}
        {coffreData.length > 0 && (
          <Card className="bg-card/70 backdrop-blur border border-border/60">
            <CardHeader>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">Par localisation</h3>
              </div>
            </CardHeader>
            <CardBody>
              <div className="h-64">
                <Doughnut
                  data={{
                    labels: coffreData.map(([coffre]) => coffre),
                    datasets: [
                      {
                        data: coffreData.map(([, value]) => value),
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
                  }}
                  options={chartOptions}
                />
              </div>
            </CardBody>
          </Card>
        )}
      </div>

      {totalAssets === 0 && (
        <Card className="bg-card/70">
          <CardBody className="text-center py-8">
            <Boxes className="h-12 w-12 text-foreground/30 mx-auto mb-4" />
            <p className="text-foreground/60 mb-4">Aucun actif enregistré</p>
            <Link href="/actifs">
              <Button color="primary" size="sm">
                Ajouter un actif
              </Button>
            </Link>
          </CardBody>
        </Card>
      )}
    </div>
  )
}
