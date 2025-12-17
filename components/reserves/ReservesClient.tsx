"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  TrendingUp,
  Wallet,
  PiggyBank,
  Calculator,
  Download,
} from "lucide-react"
import { Button, Input, Textarea } from "@heroui/react"
import { useToast } from "@/components/ui/toast"
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
// @ts-ignore
import jsPDF from "jspdf"
// @ts-ignore
import autoTable from "jspdf-autotable"

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

export default function ReservesClient() {
  const router = useRouter()
  const { showToast } = useToast()
  const [reserves, setReserves] = useState<Reserve[]>([])
  const [stats, setStats] = useState<Stats>({
    total: 0,
    totalReleased: 0,
    totalReleasable: 0,
    count: 0,
  })
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [isExportingPDF, setIsExportingPDF] = useState(false)

  // Refs pour les graphiques (pour export PDF)
  const lineChartRef = useRef<any>(null)
  const barChartRef = useRef<any>(null)
  const doughnutChartRef = useRef<any>(null)

  // Form state
  const [formData, setFormData] = useState({
    year: new Date().getFullYear(),
    amount: 0,
    releaseYear: null as number | null,
    released: 0,
    notes: "",
  })

  // Charger les réserves + initialiser les années si besoin
  useEffect(() => {
    const initializeAndFetch = async () => {
      try {
        // Initialiser les années (2013-2035) si pas encore fait
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
      showToast("Erreur lors du chargement des réserves", "error")
    } finally {
      setLoading(false)
    }
  }

  // Ajouter une réserve
  const handleAdd = async () => {
    try {
      // Vérifier si l'année existe déjà
      const existingYear = reserves.find((r) => r.year === formData.year)
      if (existingYear) {
        showToast(`L'année ${formData.year} existe déjà. Modifiez-la directement dans le tableau.`, "error")
        return
      }

      const response = await fetch("/api/reserves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Erreur")
      }

      showToast("Réserve ajoutée avec succès", "success")
      setIsAddingNew(false)
      setFormData({
        year: new Date().getFullYear(),
        amount: 0,
        releaseYear: null,
        released: 0,
        notes: "",
      })
      fetchReserves()
    } catch (error: any) {
      showToast(error.message, "error")
    }
  }

  // Modifier une réserve
  const handleUpdate = async (id: string) => {
    try {
      const reserve = reserves.find((r) => r.id === id)
      if (!reserve) return

      const response = await fetch(`/api/reserves/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year: reserve.year,
          amount: reserve.amount,
          releaseYear: reserve.releaseYear,
          released: reserve.released,
          notes: reserve.notes,
        }),
      })

      if (!response.ok) throw new Error("Erreur lors de la modification")

      showToast("Réserve modifiée avec succès", "success")
      setEditingId(null)
      fetchReserves()
    } catch (error) {
      showToast("Erreur lors de la modification", "error")
    }
  }

  // Supprimer une réserve
  const handleDelete = async (id: string) => {
    if (deletingId) return

    try {
      setDeletingId(id)
      const response = await fetch(`/api/reserves/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error("Erreur lors de la suppression")

      showToast("Réserve supprimée avec succès", "success")
      setTimeout(() => {
        fetchReserves()
        setDeletingId(null)
      }, 300)
    } catch (error) {
      showToast("Erreur lors de la suppression", "error")
      setDeletingId(null)
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

  // Fonction d'export PDF
  const handleExportPDF = async () => {
    if (isExportingPDF) return
    
    try {
      setIsExportingPDF(true)
      showToast("Génération du PDF en cours...", "info")

      const doc = new jsPDF()
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      let yPos = 20

      // En-tête
      doc.setFontSize(20)
      doc.setTextColor(59, 130, 246)
      doc.text("Réserves de Liquidation", pageWidth / 2, yPos, { align: "center" })
      
      yPos += 10
      doc.setFontSize(10)
      doc.setTextColor(100, 100, 100)
      doc.text(`Généré le ${new Date().toLocaleDateString("fr-FR")} à ${new Date().toLocaleTimeString("fr-FR")}`, pageWidth / 2, yPos, { align: "center" })
      
      yPos += 15

      // Cartes statistiques
      doc.setFontSize(14)
      doc.setTextColor(0, 0, 0)
      doc.text("Résumé Financier", 14, yPos)
      yPos += 8

      const cardWidth = (pageWidth - 40) / 3
      const cardHeight = 25

      // Total
      doc.setFillColor(59, 130, 246)
      doc.rect(14, yPos, cardWidth, cardHeight, "F")
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(10)
      doc.text("Total Réserves", 14 + cardWidth / 2, yPos + 8, { align: "center" })
      doc.setFontSize(14)
      doc.text(`${formatCurrency(stats.total)} €`, 14 + cardWidth / 2, yPos + 18, { align: "center" })

      // Libéré
      doc.setFillColor(34, 197, 94)
      doc.rect(14 + cardWidth + 4, yPos, cardWidth, cardHeight, "F")
      doc.setFontSize(10)
      doc.text("Libéré", 14 + cardWidth + 4 + cardWidth / 2, yPos + 8, { align: "center" })
      doc.setFontSize(14)
      doc.text(`${formatCurrency(stats.totalReleased)} €`, 14 + cardWidth + 4 + cardWidth / 2, yPos + 18, { align: "center" })

      // Disponible
      doc.setFillColor(251, 146, 60)
      doc.rect(14 + 2 * (cardWidth + 4), yPos, cardWidth, cardHeight, "F")
      doc.setFontSize(10)
      doc.text("Disponible", 14 + 2 * (cardWidth + 4) + cardWidth / 2, yPos + 8, { align: "center" })
      doc.setFontSize(14)
      doc.text(`${formatCurrency(stats.totalReleasable)} €`, 14 + 2 * (cardWidth + 4) + cardWidth / 2, yPos + 18, { align: "center" })

      yPos += cardHeight + 15

      // Graphique 1: Évolution
      if (lineChartRef.current) {
        doc.setFontSize(12)
        doc.setTextColor(0, 0, 0)
        doc.text("Évolution des Réserves", 14, yPos)
        yPos += 5

        const chartImage = lineChartRef.current.toBase64Image()
        const chartWidth = pageWidth - 28
        const chartHeight = 60
        doc.addImage(chartImage, "PNG", 14, yPos, chartWidth, chartHeight)
        yPos += chartHeight + 10
      }

      // Nouvelle page si nécessaire
      if (yPos > pageHeight - 80) {
        doc.addPage()
        yPos = 20
      }

      // Graphique 2: Répartition par décennie
      if (barChartRef.current && reserves.length > 0) {
        doc.setFontSize(12)
        doc.text("Répartition par Décennie", 14, yPos)
        yPos += 5

        const chartImage = barChartRef.current.toBase64Image()
        const chartWidth = pageWidth - 28
        const chartHeight = 60
        doc.addImage(chartImage, "PNG", 14, yPos, chartWidth, chartHeight)
        yPos += chartHeight + 10
      }

      // Nouvelle page pour le tableau
      doc.addPage()
      yPos = 20

      // Tableau des réserves
      doc.setFontSize(14)
      doc.text("Détail des Réserves", 14, yPos)
      yPos += 8

      const tableData = reserves
        .sort((a, b) => a.year - b.year)
        .map((r) => [
          r.year.toString(),
          `${formatCurrency(Number(r.amount))} €`,
          r.releaseYear?.toString() || "-",
          `${formatCurrency(Number(r.released))} €`,
          `${formatCurrency(Number(r.amount) - Number(r.released))} €`,
        ])

      autoTable(doc, {
        startY: yPos,
        head: [["Année", "Montant", "Année Libérable", "Libéré", "Disponible"]],
        body: tableData,
        theme: "grid",
        headStyles: {
          fillColor: [59, 130, 246],
          fontSize: 10,
          fontStyle: "bold",
          halign: "center",
        },
        bodyStyles: {
          fontSize: 9,
          halign: "center",
        },
        alternateRowStyles: {
          fillColor: [245, 247, 250],
        },
        columnStyles: {
          1: { halign: "right" },
          3: { halign: "right" },
          4: { halign: "right" },
        },
        foot: [[
          "TOTAL",
          `${formatCurrency(stats.total)} €`,
          "",
          `${formatCurrency(stats.totalReleased)} €`,
          `${formatCurrency(stats.totalReleasable)} €`,
        ]],
        footStyles: {
          fillColor: [230, 230, 230],
          fontSize: 10,
          fontStyle: "bold",
          halign: "center",
        },
      })

      // Graphique 3: Doughnut (nouvelle page si espace disponible)
      const finalY = (doc as any).lastAutoTable.finalY || yPos + 100
      
      if (finalY < pageHeight - 80 && doughnutChartRef.current) {
        yPos = finalY + 15
        doc.setFontSize(12)
        doc.text("Répartition Libéré / Disponible", 14, yPos)
        yPos += 5

        const chartImage = doughnutChartRef.current.toBase64Image()
        const chartSize = 70
        doc.addImage(chartImage, "PNG", (pageWidth - chartSize) / 2, yPos, chartSize, chartSize)
      } else if (doughnutChartRef.current) {
        doc.addPage()
        yPos = 20
        doc.setFontSize(12)
        doc.text("Répartition Libéré / Disponible", 14, yPos)
        yPos += 5

        const chartImage = doughnutChartRef.current.toBase64Image()
        const chartSize = 80
        doc.addImage(chartImage, "PNG", (pageWidth - chartSize) / 2, yPos, chartSize, chartSize)
      }

      // Footer sur toutes les pages
      const pageCount = doc.internal.pages.length - 1
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setTextColor(150, 150, 150)
        doc.text(
          `Page ${i} / ${pageCount}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: "center" }
        )
        doc.text(
          "SafeVault - Gestion des Réserves",
          pageWidth - 14,
          pageHeight - 10,
          { align: "right" }
        )
      }

      // Sauvegarder le PDF
      doc.save(`reserves-liquidation-${new Date().toISOString().split("T")[0]}.pdf`)
      
      showToast("PDF exporté avec succès", "success")
    } catch (error) {
      console.error("Erreur export PDF:", error)
      showToast("Erreur lors de l'export PDF", "error")
    } finally {
      setIsExportingPDF(false)
    }
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
              <Line ref={lineChartRef} data={lineChartData} options={lineChartOptions} />
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
              <Bar ref={barChartRef} data={barChartData} options={barChartOptions} />
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
              <Doughnut ref={doughnutChartRef} data={doughnutChartData} options={doughnutChartOptions} />
            </div>
          </div>
        </motion.div>
      )}

      {/* Tableau */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="glass-effect rounded-3xl p-6 border border-border/50 shadow-lg"
      >
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <h3 className="text-xl font-semibold">Détail des Réserves ({reserves.length} années)</h3>
          <Button
            color="success"
            variant="flat"
            startContent={<Download className="w-4 h-4" />}
            onPress={handleExportPDF}
            isLoading={isExportingPDF}
            className="font-semibold"
          >
            Exporter PDF
          </Button>
        </div>

        {/* Info message */}
        <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl text-sm text-muted-foreground">
          💡 <strong>Info :</strong> Toutes les années de 2013 à 2035 sont pré-créées. Cliquez sur <strong>✏️ Éditer</strong> pour modifier les montants.
        </div>

        {/* Table header */}
        <div className="hidden md:grid grid-cols-6 gap-4 px-4 py-3 bg-muted/30 rounded-xl mb-2 font-semibold text-sm">
          <div>Année</div>
          <div className="text-right">Montant</div>
          <div className="text-center">Année Libérable</div>
          <div className="text-right">Libéré</div>
          <div className="text-right">Disponible</div>
          <div className="text-center">Actions</div>
        </div>

        {/* Table rows */}
        <div className="space-y-2">
          <AnimatePresence>
            {reserves.map((reserve, index) => {
              const available = Number(reserve.amount) - Number(reserve.released)
              const isEditing = editingId === reserve.id

              return (
                <motion.div
                  key={reserve.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.05 }}
                  className="grid grid-cols-1 md:grid-cols-6 gap-4 p-4 bg-card/30 hover:bg-card/50 rounded-xl border border-border/50 transition-all"
                >
                  {/* Année */}
                  <div className="flex items-center">
                    {isEditing ? (
                      <Input
                        type="number"
                        size="sm"
                        value={reserve.year.toString()}
                        onChange={(e) => {
                          const updated = reserves.map((r) =>
                            r.id === reserve.id
                              ? { ...r, year: parseInt(e.target.value) || 0 }
                              : r
                          )
                          setReserves(updated)
                        }}
                      />
                    ) : (
                      <span className="font-semibold">{reserve.year}</span>
                    )}
                  </div>

                  {/* Montant */}
                  <div className="flex items-center justify-end">
                    {isEditing ? (
                      <Input
                        type="number"
                        size="sm"
                        value={reserve.amount.toString()}
                        onChange={(e) => {
                          const updated = reserves.map((r) =>
                            r.id === reserve.id
                              ? { ...r, amount: parseFloat(e.target.value) || 0 }
                              : r
                          )
                          setReserves(updated)
                        }}
                      />
                    ) : (
                      <span className="font-semibold text-blue-500">
                        {formatCurrency(Number(reserve.amount))} €
                      </span>
                    )}
                  </div>

                  {/* Année libérable */}
                  <div className="flex items-center justify-center">
                    {isEditing ? (
                      <Input
                        type="number"
                        size="sm"
                        value={reserve.releaseYear?.toString() || ""}
                        onChange={(e) => {
                          const updated = reserves.map((r) =>
                            r.id === reserve.id
                              ? {
                                  ...r,
                                  releaseYear: e.target.value
                                    ? parseInt(e.target.value)
                                    : null,
                                }
                              : r
                          )
                          setReserves(updated)
                        }}
                      />
                    ) : (
                      <span>{reserve.releaseYear || "-"}</span>
                    )}
                  </div>

                  {/* Libéré */}
                  <div className="flex items-center justify-end">
                    {isEditing ? (
                      <Input
                        type="number"
                        size="sm"
                        value={reserve.released.toString()}
                        onChange={(e) => {
                          const updated = reserves.map((r) =>
                            r.id === reserve.id
                              ? { ...r, released: parseFloat(e.target.value) || 0 }
                              : r
                          )
                          setReserves(updated)
                        }}
                      />
                    ) : (
                      <span className="font-semibold text-green-500">
                        {formatCurrency(Number(reserve.released))} €
                      </span>
                    )}
                  </div>

                  {/* Disponible */}
                  <div className="flex items-center justify-end">
                    <span className="font-semibold text-orange-500">
                      {formatCurrency(available)} €
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-center gap-2">
                    {isEditing ? (
                      <>
                        <Button
                          size="sm"
                          color="success"
                          isIconOnly
                          onPress={() => handleUpdate(reserve.id)}
                        >
                          <Save className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          color="danger"
                          variant="light"
                          isIconOnly
                          onPress={() => setEditingId(null)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          color="primary"
                          variant="light"
                          isIconOnly
                          onPress={() => setEditingId(reserve.id)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          color="danger"
                          variant="light"
                          isIconOnly
                          isLoading={deletingId === reserve.id}
                          onPress={() => handleDelete(reserve.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>

          {reserves.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              Chargement des années en cours...
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
