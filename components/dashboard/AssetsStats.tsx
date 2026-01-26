"use client"

import { useEffect, useState, useMemo } from "react"
import { Card, CardBody, CardHeader } from "@heroui/react"
import { Input, Button } from "@heroui/react"
import { Select, SelectItem } from "@/components/ui/select-heroui"
import { formatCurrency, formatDate } from "@/lib/utils"
import { Boxes, TrendingUp, TrendingDown, MapPin, Tag, Search, ArrowUpDown, ArrowUp, ArrowDown, FileText, Download, Eye } from "lucide-react"
import { motion } from "framer-motion"
import { PremiumCard } from "@/components/ui/premium-card"
import { Line, Bar, Doughnut } from "react-chartjs-2"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js"
import Link from "next/link"
import { useRouter } from "next/navigation"

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler
)

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
  documents?: Array<{ id: string }>
  createdAt: string
  updatedAt: string
}

type SortField = "name" | "category" | "coffre" | "purchasePrice" | "currentValue" | "gainLoss" | "purchaseDate" | "valuationDate"
type SortDirection = "asc" | "desc"

// Helper pour extraire les prix d'un actif
function getAssetPrices(asset: Asset) {
  const events = asset.events || []
  const purchase = events.find((e) => e.type === "PURCHASE")
  const valuation = events.find((e) => e.type === "VALUATION")
  const sale = events.find((e) => e.type === "SALE")
  
  const purchasePrice = purchase?.amount ? Number(purchase.amount) : null
  const currentValue = valuation?.amount ? Number(valuation.amount) : null
  const salePrice = sale?.amount ? Number(sale.amount) : null
  
  const gainLoss = purchasePrice && currentValue ? currentValue - purchasePrice : null
  
  return {
    purchasePrice,
    purchaseDate: purchase?.date || null,
    currentValue,
    valuationDate: valuation?.date || null,
    salePrice,
    saleDate: sale?.date || null,
    gainLoss,
    gainLossPercent: purchasePrice && gainLoss ? ((gainLoss / purchasePrice) * 100) : null,
  }
}

export function AssetsStats() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [assets, setAssets] = useState<Asset[]>([])
  const [error, setError] = useState<string | null>(null)
  
  // Filtres
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedCoffres, setSelectedCoffres] = useState<string[]>([])
  const [minValue, setMinValue] = useState("")
  const [maxValue, setMaxValue] = useState("")
  
  // Tri et pagination
  const [sortField, setSortField] = useState<SortField>("name")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  useEffect(() => {
    fetchAssets()
    // Rafraîchir les données toutes les 30 secondes pour mettre à jour les graphiques
    const interval = setInterval(() => {
      fetchAssets()
    }, 30000)
    return () => clearInterval(interval)
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

  // Calculer les statistiques enrichies
  const stats = useMemo(() => {
    const assetsWithPrices = assets.map(asset => ({
      ...asset,
      prices: getAssetPrices(asset),
    }))

    const totalAssets = assets.length
    const assetsWithValue = assetsWithPrices.filter(a => a.prices.currentValue !== null)
    const totalValue = assetsWithValue.reduce((sum, a) => sum + (a.prices.currentValue || 0), 0)
    
    const assetsWithPurchase = assetsWithPrices.filter(a => a.prices.purchasePrice !== null)
    const totalPurchaseValue = assetsWithPurchase.reduce((sum, a) => sum + (a.prices.purchasePrice || 0), 0)
    const totalGainLoss = assetsWithPrices
      .filter(a => a.prices.gainLoss !== null)
      .reduce((sum, a) => sum + (a.prices.gainLoss || 0), 0)
    
    const assetsWithoutValuation = assets.filter(a => {
      const prices = getAssetPrices(a)
      return prices.currentValue === null
    }).length

    // Top performers (plus-value)
    const topPerformers = [...assetsWithPrices]
      .filter(a => a.prices.gainLoss !== null && a.prices.gainLoss > 0)
      .sort((a, b) => (b.prices.gainLoss || 0) - (a.prices.gainLoss || 0))
      .slice(0, 3)

    // Worst performers (moins-value)
    const worstPerformers = [...assetsWithPrices]
      .filter(a => a.prices.gainLoss !== null && a.prices.gainLoss < 0)
      .sort((a, b) => (a.prices.gainLoss || 0) - (b.prices.gainLoss || 0))
      .slice(0, 3)

    return {
      totalAssets,
      totalValue,
      totalPurchaseValue,
      totalGainLoss,
      assetsWithoutValuation,
      topPerformers,
      worstPerformers,
      assetsWithPrices,
    }
  }, [assets])

  // Données filtrées et triées
  const filteredAndSortedAssets = useMemo(() => {
    let filtered = stats.assetsWithPrices

    // Filtre recherche
    if (searchQuery) {
      filtered = filtered.filter(a =>
        a.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Filtre catégories
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(a => {
        const category = a.category || "Non catégorisé"
        return selectedCategories.includes(category)
      })
    }

    // Filtre coffres
    if (selectedCoffres.length > 0) {
      filtered = filtered.filter(a => {
        const coffreName = a.coffre?.name || "Non localisé"
        return selectedCoffres.includes(coffreName)
      })
    }

    // Filtre valeur min/max
    if (minValue) {
      const min = parseFloat(minValue)
      if (!isNaN(min)) {
        filtered = filtered.filter(a => (a.prices.currentValue || 0) >= min)
      }
    }
    if (maxValue) {
      const max = parseFloat(maxValue)
      if (!isNaN(max)) {
        filtered = filtered.filter(a => (a.prices.currentValue || 0) <= max)
      }
    }

    // Tri
    filtered.sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (sortField) {
        case "name":
          aValue = a.name.toLowerCase()
          bValue = b.name.toLowerCase()
          break
        case "category":
          aValue = (a.category || "Non catégorisé").toLowerCase()
          bValue = (b.category || "Non catégorisé").toLowerCase()
          break
        case "coffre":
          aValue = (a.coffre?.name || "Non localisé").toLowerCase()
          bValue = (b.coffre?.name || "Non localisé").toLowerCase()
          break
        case "purchasePrice":
          aValue = a.prices.purchasePrice ?? 0
          bValue = b.prices.purchasePrice ?? 0
          break
        case "currentValue":
          aValue = a.prices.currentValue ?? 0
          bValue = b.prices.currentValue ?? 0
          break
        case "gainLoss":
          aValue = a.prices.gainLoss ?? 0
          bValue = b.prices.gainLoss ?? 0
          break
        case "purchaseDate":
          aValue = a.prices.purchaseDate ? new Date(a.prices.purchaseDate).getTime() : 0
          bValue = b.prices.purchaseDate ? new Date(b.prices.purchaseDate).getTime() : 0
          break
        case "valuationDate":
          aValue = a.prices.valuationDate ? new Date(a.prices.valuationDate).getTime() : 0
          bValue = b.prices.valuationDate ? new Date(b.prices.valuationDate).getTime() : 0
          break
        default:
          return 0
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1
      return 0
    })

    return filtered
  }, [stats.assetsWithPrices, searchQuery, selectedCategories, selectedCoffres, minValue, maxValue, sortField, sortDirection])

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedAssets.length / itemsPerPage)
  const paginatedAssets = filteredAndSortedAssets.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  // Options uniques pour les filtres
  const uniqueCategories = useMemo(() => {
    const cats = new Set<string>()
    assets.forEach(a => {
      cats.add(a.category || "Non catégorisé")
    })
    return Array.from(cats).sort()
  }, [assets])

  const uniqueCoffres = useMemo(() => {
    const coffres = new Set<string>()
    assets.forEach(a => {
      coffres.add(a.coffre?.name || "Non localisé")
    })
    return Array.from(coffres).sort()
  }, [assets])

  // Graphique : Évolution de la valeur totale par mois/année
  const evolutionData = useMemo(() => {
    // Collecter tous les événements avec montants (PURCHASE, VALUATION, SALE)
    const allEvents = assets.flatMap(a => 
      (a.events || [])
        .filter(e => e.amount && e.amount > 0)
        .map(e => ({
          date: e.date,
          amount: Number(e.amount),
          type: e.type,
          assetId: a.id,
        }))
    )

    if (allEvents.length === 0) {
      // Si pas d'événements, utiliser la date de création des actifs avec leur valeur actuelle
      const assetsByMonth = new Map<string, number>()
      stats.assetsWithPrices.forEach(asset => {
        if (asset.prices.currentValue) {
          const date = new Date(asset.createdAt)
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
          assetsByMonth.set(monthKey, (assetsByMonth.get(monthKey) || 0) + asset.prices.currentValue)
        }
      })
      
      const sortedMonths = Array.from(assetsByMonth.entries()).sort((a, b) => a[0].localeCompare(b[0]))
      
      // Calculer les valeurs cumulées
      let cumulative = 0
      const cumulativeValues = sortedMonths.map(([, value]) => {
        cumulative += value
        return cumulative
      })
      
      return {
        labels: sortedMonths.map(([month]) => {
          const [year, monthNum] = month.split('-')
          return `${monthNum}/${year}`
        }),
        values: cumulativeValues,
      }
    }

    // Grouper par mois et calculer la valeur totale cumulée
    const monthlyData = new Map<string, number>()
    
    // Trier les événements par date
    allEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    // Pour chaque mois, calculer la valeur totale des actifs à ce moment
    const monthsSet = new Set<string>()
    allEvents.forEach(event => {
      const date = new Date(event.date)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      monthsSet.add(monthKey)
    })

    // Pour chaque mois, calculer la valeur totale actuelle de tous les actifs qui existaient à ce moment
    const sortedMonths = Array.from(monthsSet).sort((a, b) => a.localeCompare(b))
    const monthlyValues: number[] = []

    sortedMonths.forEach(month => {
      const [year, monthNum] = month.split('-')
      const monthDate = new Date(parseInt(year), parseInt(monthNum) - 1)
      
      // Calculer la valeur totale des actifs à ce moment
      let totalValue = 0
      stats.assetsWithPrices.forEach(asset => {
        const assetCreatedDate = new Date(asset.createdAt)
        if (assetCreatedDate <= monthDate) {
          // Trouver la dernière évaluation avant ou à ce mois
          const relevantEvents = (asset.events || [])
            .filter(e => {
              const eventDate = new Date(e.date)
              return eventDate <= monthDate && e.type === "VALUATION" && e.amount
            })
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          
          if (relevantEvents.length > 0) {
            totalValue += Number(relevantEvents[0].amount)
          } else if (asset.prices.currentValue) {
            // Si pas d'évaluation historique, utiliser la valeur actuelle
            totalValue += asset.prices.currentValue
          }
        }
      })
      
      monthlyValues.push(totalValue)
    })

    return {
      labels: sortedMonths.map(([year, monthNum]) => `${monthNum}/${year}`),
      values: monthlyValues,
    }
  }, [assets, stats.assetsWithPrices])

  // Graphique : Top 10 actifs les plus précieux
  const top10Data = useMemo(() => {
    return [...stats.assetsWithPrices]
      .filter(a => a.prices.currentValue !== null)
      .sort((a, b) => (b.prices.currentValue || 0) - (a.prices.currentValue || 0))
      .slice(0, 10)
  }, [stats.assetsWithPrices])

  // Graphique : Performance (plus-value/moins-value)
  const performanceData = useMemo(() => {
    const withGainLoss = stats.assetsWithPrices.filter(a => a.prices.gainLoss !== null)
    return {
      positive: withGainLoss.filter(a => (a.prices.gainLoss || 0) > 0).length,
      negative: withGainLoss.filter(a => (a.prices.gainLoss || 0) < 0).length,
      neutral: withGainLoss.filter(a => (a.prices.gainLoss || 0) === 0).length,
    }
  }, [stats.assetsWithPrices])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 text-foreground/40" />
    return sortDirection === "asc" 
      ? <ArrowUp className="h-3 w-3 text-primary" />
      : <ArrowDown className="h-3 w-3 text-primary" />
  }

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
            const value = formatCurrency(context.parsed.y || context.parsed)
            return `${label}: ${value}`
          },
        },
      },
    },
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

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between flex-wrap gap-4">
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

      {/* Cartes statistiques */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <PremiumCard variant="gradient" hover3D glow>
          <div className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20 border border-primary/30">
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-foreground/60 font-medium">Valeur totale</p>
                <p className="text-lg font-bold text-foreground">{formatCurrency(stats.totalValue)}</p>
              </div>
            </div>
          </div>
        </PremiumCard>

        <PremiumCard variant="gradient" hover3D glow>
          <div className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/20 border border-success/30">
                <Boxes className="h-4 w-4 text-success" />
              </div>
              <div>
                <p className="text-xs text-foreground/60 font-medium">Total actifs</p>
                <p className="text-lg font-bold text-foreground">{stats.totalAssets}</p>
              </div>
            </div>
          </div>
        </PremiumCard>

        <PremiumCard variant="gradient" hover3D glow>
          <div className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg border ${stats.totalGainLoss >= 0 ? 'bg-success/20 border-success/30' : 'bg-danger/20 border-danger/30'}`}>
                {stats.totalGainLoss >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-success" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-danger" />
                )}
              </div>
              <div>
                <p className="text-xs text-foreground/60 font-medium">Plus-value totale</p>
                <p className={`text-lg font-bold ${stats.totalGainLoss >= 0 ? 'text-success' : 'text-danger'}`}>
                  {formatCurrency(stats.totalGainLoss)}
                </p>
              </div>
            </div>
          </div>
        </PremiumCard>

        <PremiumCard variant="gradient" hover3D glow>
          <div className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/20 border border-warning/30">
                <Tag className="h-4 w-4 text-warning" />
              </div>
              <div>
                <p className="text-xs text-foreground/60 font-medium">Sans évaluation</p>
                <p className="text-lg font-bold text-foreground">{stats.assetsWithoutValuation}</p>
              </div>
            </div>
          </div>
        </PremiumCard>
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Évolution de la valeur totale - Toujours affiché */}
        <Card className="bg-card/70 backdrop-blur border border-border/60">
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Évolution de la valeur totale</h3>
            </div>
          </CardHeader>
          <CardBody>
            <div className="h-64">
              {evolutionData.labels.length > 0 ? (
                <Line
                  data={{
                    labels: evolutionData.labels,
                    datasets: [
                      {
                        label: "Valeur totale (€)",
                        data: evolutionData.values,
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
                  }}
                  options={{
                    ...chartOptions,
                    scales: {
                      y: {
                        beginAtZero: true,
                        ticks: {
                          callback: (value: any) => formatCurrency(value),
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
                  }}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-foreground/60">
                  <div className="text-center">
                    <TrendingUp className="h-12 w-12 mx-auto mb-2 text-foreground/30" />
                    <p className="text-sm">Aucune donnée d&apos;évolution disponible</p>
                    <p className="text-xs text-foreground/50 mt-1">Ajoutez des événements d&apos;évaluation pour voir l&apos;évolution</p>
                  </div>
                </div>
              )}
            </div>
          </CardBody>
        </Card>

        {/* Top 10 actifs */}
        {top10Data.length > 0 && (
          <Card className="bg-card/70 backdrop-blur border border-border/60">
            <CardHeader>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">Top 10 actifs les plus précieux</h3>
              </div>
            </CardHeader>
            <CardBody>
              <div className="h-64">
                <Bar
                  data={{
                    labels: top10Data.map(a => a.name.length > 20 ? a.name.substring(0, 20) + "..." : a.name),
                    datasets: [
                      {
                        label: "Valeur (€)",
                        data: top10Data.map(a => a.prices.currentValue || 0),
                        backgroundColor: "rgba(59, 130, 246, 0.8)",
                        borderColor: "#3B82F6",
                        borderWidth: 2,
                      },
                    ],
                  }}
                  options={{
                    ...chartOptions,
                    indexAxis: "y" as const,
                  }}
                />
              </div>
            </CardBody>
          </Card>
        )}

        {/* Performance */}
        {(performanceData.positive > 0 || performanceData.negative > 0 || performanceData.neutral > 0) && (
          <Card className="bg-card/70 backdrop-blur border border-border/60">
            <CardHeader>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">Performance des actifs</h3>
              </div>
            </CardHeader>
            <CardBody>
              <div className="h-64">
                <Doughnut
                  data={{
                    labels: ["Plus-value", "Moins-value", "Neutre"],
                    datasets: [
                      {
                        data: [performanceData.positive, performanceData.negative, performanceData.neutral],
                        backgroundColor: [
                          "rgba(34, 197, 94, 0.8)",
                          "rgba(239, 68, 68, 0.8)",
                          "rgba(156, 163, 175, 0.8)",
                        ],
                        borderColor: ["#22c55e", "#ef4444", "#9ca3af"],
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

        {/* Répartition par catégorie */}
        {uniqueCategories.length > 0 && (
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
                    labels: uniqueCategories,
                    datasets: [
                      {
                        data: uniqueCategories.map(cat => {
                          return stats.assetsWithPrices
                            .filter(a => (a.category || "Non catégorisé") === cat)
                            .reduce((sum, a) => sum + (a.prices.currentValue || 0), 0)
                        }),
                        backgroundColor: [
                          "rgba(59, 130, 246, 0.8)",
                          "rgba(34, 197, 94, 0.8)",
                          "rgba(239, 68, 68, 0.8)",
                          "rgba(245, 158, 11, 0.8)",
                          "rgba(168, 85, 247, 0.8)",
                          "rgba(236, 72, 153, 0.8)",
                        ],
                        borderColor: ["#3B82F6", "#22c55e", "#ef4444", "#f59e0b", "#a855f7", "#ec4899"],
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

      {/* Filtres et recherche */}
      <Card className="bg-card/70 backdrop-blur border border-border/60">
        <CardHeader>
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Search className="h-4 w-4" />
            Filtres et recherche
          </h3>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Input
              placeholder="Rechercher un actif..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setCurrentPage(1)
              }}
              startContent={<Search className="h-4 w-4 text-foreground/40" />}
              size="sm"
            />
            <Select
              label="Catégorie"
              placeholder="Toutes"
              selectedKeys={selectedCategories}
              onSelectionChange={(keys) => {
                setSelectedCategories(Array.from(keys) as string[])
                setCurrentPage(1)
              }}
              selectionMode="multiple"
              size="sm"
            >
              {uniqueCategories.map(cat => (
                <SelectItem key={cat}>{cat}</SelectItem>
              ))}
            </Select>
            <Select
              label="Localisation"
              placeholder="Toutes"
              selectedKeys={selectedCoffres}
              onSelectionChange={(keys) => {
                setSelectedCoffres(Array.from(keys) as string[])
                setCurrentPage(1)
              }}
              selectionMode="multiple"
              size="sm"
            >
              {uniqueCoffres.map(coffre => (
                <SelectItem key={coffre}>{coffre}</SelectItem>
              ))}
            </Select>
            <Input
              type="number"
              placeholder="Valeur min"
              value={minValue}
              onChange={(e) => {
                setMinValue(e.target.value)
                setCurrentPage(1)
              }}
              size="sm"
              startContent={<span className="text-foreground/40 text-xs">€</span>}
            />
            <Input
              type="number"
              placeholder="Valeur max"
              value={maxValue}
              onChange={(e) => {
                setMaxValue(e.target.value)
                setCurrentPage(1)
              }}
              size="sm"
              startContent={<span className="text-foreground/40 text-xs">€</span>}
            />
          </div>
        </CardBody>
      </Card>

      {/* Tableau dynamique */}
      {filteredAndSortedAssets.length > 0 ? (
        <Card className="bg-card/70 backdrop-blur border border-border/60">
          <CardHeader className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">
              {filteredAndSortedAssets.length} actif{filteredAndSortedAssets.length > 1 ? "s" : ""} trouvé{filteredAndSortedAssets.length > 1 ? "s" : ""}
            </h3>
            <div className="flex items-center gap-2">
              <Select
                selectedKeys={[itemsPerPage.toString()]}
                onSelectionChange={(keys) => {
                  setItemsPerPage(Number(Array.from(keys)[0]))
                  setCurrentPage(1)
                }}
                size="sm"
                className="w-24"
              >
                <SelectItem key="10">10</SelectItem>
                <SelectItem key="25">25</SelectItem>
                <SelectItem key="50">50</SelectItem>
              </Select>
            </div>
          </CardHeader>
          <CardBody>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/60">
                    <th className="text-left p-2 text-xs font-semibold text-foreground/70">
                      <button
                        onClick={() => handleSort("name")}
                        className="flex items-center gap-1 hover:text-primary transition-colors"
                      >
                        Nom <SortIcon field="name" />
                      </button>
                    </th>
                    <th className="text-left p-2 text-xs font-semibold text-foreground/70">
                      <button
                        onClick={() => handleSort("category")}
                        className="flex items-center gap-1 hover:text-primary transition-colors"
                      >
                        Catégorie <SortIcon field="category" />
                      </button>
                    </th>
                    <th className="text-left p-2 text-xs font-semibold text-foreground/70">
                      <button
                        onClick={() => handleSort("coffre")}
                        className="flex items-center gap-1 hover:text-primary transition-colors"
                      >
                        Localisation <SortIcon field="coffre" />
                      </button>
                    </th>
                    <th className="text-right p-2 text-xs font-semibold text-foreground/70">
                      <button
                        onClick={() => handleSort("purchasePrice")}
                        className="flex items-center gap-1 hover:text-primary transition-colors ml-auto"
                      >
                        Prix achat <SortIcon field="purchasePrice" />
                      </button>
                    </th>
                    <th className="text-right p-2 text-xs font-semibold text-foreground/70">
                      <button
                        onClick={() => handleSort("currentValue")}
                        className="flex items-center gap-1 hover:text-primary transition-colors ml-auto"
                      >
                        Valeur actuelle <SortIcon field="currentValue" />
                      </button>
                    </th>
                    <th className="text-right p-2 text-xs font-semibold text-foreground/70">
                      <button
                        onClick={() => handleSort("gainLoss")}
                        className="flex items-center gap-1 hover:text-primary transition-colors ml-auto"
                      >
                        Plus-value <SortIcon field="gainLoss" />
                      </button>
                    </th>
                    <th className="text-center p-2 text-xs font-semibold text-foreground/70">
                      Documents
                    </th>
                    <th className="text-center p-2 text-xs font-semibold text-foreground/70">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedAssets.map((asset) => {
                    const prices = asset.prices
                    return (
                      <tr key={asset.id} className="border-b border-border/30 hover:bg-card/50 transition-colors">
                        <td className="p-2 text-sm font-medium">{asset.name}</td>
                        <td className="p-2 text-sm text-foreground/70">
                          {asset.category || "Non catégorisé"}
                        </td>
                        <td className="p-2 text-sm text-foreground/70">
                          {asset.coffre?.name || "Non localisé"}
                        </td>
                        <td className="p-2 text-sm text-right">
                          {prices.purchasePrice ? formatCurrency(prices.purchasePrice) : "-"}
                        </td>
                        <td className="p-2 text-sm text-right font-semibold">
                          {prices.currentValue ? formatCurrency(prices.currentValue) : "-"}
                        </td>
                        <td className="p-2 text-sm text-right">
                          {prices.gainLoss !== null ? (
                            <span className={prices.gainLoss >= 0 ? "text-success" : "text-danger"}>
                              {prices.gainLoss >= 0 ? "+" : ""}{formatCurrency(prices.gainLoss)}
                              {prices.gainLossPercent !== null && (
                                <span className="text-xs ml-1">
                                  ({prices.gainLossPercent >= 0 ? "+" : ""}{prices.gainLossPercent.toFixed(1)}%)
                                </span>
                              )}
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="p-2 text-center">
                          <span className="text-xs text-foreground/60">
                            {asset.documents?.length || 0}
                          </span>
                        </td>
                        <td className="p-2 text-center">
                          <Button
                            size="sm"
                            variant="light"
                            isIconOnly
                            onPress={() => router.push(`/actifs?id=${asset.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/60">
                <p className="text-xs text-foreground/60">
                  Page {currentPage} sur {totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="flat"
                    onPress={() => setCurrentPage(p => Math.max(1, p - 1))}
                    isDisabled={currentPage === 1}
                  >
                    Précédent
                  </Button>
                  <Button
                    size="sm"
                    variant="flat"
                    onPress={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    isDisabled={currentPage === totalPages}
                  >
                    Suivant
                  </Button>
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      ) : (
        <Card className="bg-card/70">
          <CardBody className="text-center py-8">
            <Boxes className="h-12 w-12 text-foreground/30 mx-auto mb-4" />
            <p className="text-foreground/60 mb-4">
              {searchQuery || selectedCategories.length > 0 || selectedCoffres.length > 0 || minValue || maxValue
                ? "Aucun actif ne correspond aux filtres"
                : "Aucun actif enregistré"}
            </p>
            {!searchQuery && selectedCategories.length === 0 && selectedCoffres.length === 0 && !minValue && !maxValue && (
              <Link href="/actifs">
                <Button color="primary" size="sm">
                  Ajouter un actif
                </Button>
              </Link>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  )
}
