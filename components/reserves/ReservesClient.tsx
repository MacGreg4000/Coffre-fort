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
          // NE PAS envoyer l'année (elle ne change jamais)
          amount: reserve.amount,
          releaseYear: reserve.releaseYear,
          released: reserve.released,
          notes: reserve.notes,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Erreur lors de la modification")
      }

      showToast("Réserve modifiée avec succès", "success")
      setEditingId(null)
      fetchReserves()
    } catch (error: any) {
      showToast(error.message || "Erreur lors de la modification", "error")
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
      const margin = 15
      const headerHeight = 35
      let yPos = headerHeight

      // Fonction helper pour dessiner un header professionnel
      const drawHeader = (pageNum: number, totalPages: number) => {
        // Bandeau bleu en haut
        doc.setFillColor(59, 130, 246)
        doc.rect(0, 0, pageWidth, headerHeight, "F")
        
        // Titre principal
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(22)
        doc.setFont("helvetica", "bold")
        doc.text("RÉSERVES DE LIQUIDATION", pageWidth / 2, 18, { align: "center" })
        
        // Sous-titre
        doc.setFontSize(9)
        doc.setFont("helvetica", "normal")
        doc.setTextColor(255, 255, 255)
        doc.text(
          `Rapport financier - ${new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}`,
          pageWidth / 2,
          28,
          { align: "center" }
        )
        
        // Ligne de séparation
        doc.setDrawColor(200, 200, 200)
        doc.setLineWidth(0.5)
        doc.line(0, headerHeight, pageWidth, headerHeight)
      }

      // Fonction helper pour footer
      const drawFooter = (pageNum: number, totalPages: number) => {
        const footerY = pageHeight - 15
        
        // Ligne de séparation
        doc.setDrawColor(200, 200, 200)
        doc.setLineWidth(0.3)
        doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5)
        
        // Numéro de page
        doc.setFontSize(8)
        doc.setTextColor(100, 100, 100)
        doc.setFont("helvetica", "normal")
        doc.text(
          `Page ${pageNum} / ${totalPages}`,
          pageWidth / 2,
          footerY,
          { align: "center" }
        )
        
        // Logo/Nom app
        doc.text(
          "SafeVault",
          pageWidth - margin,
          footerY,
          { align: "right" }
        )
      }

      // Page 1 - Header
      drawHeader(1, 1)

      // Section Résumé Financier avec titre stylisé
      yPos += 5
      doc.setFontSize(16)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(30, 30, 30)
      doc.text("RÉSUMÉ FINANCIER", margin, yPos)
      
      yPos += 10

      // Cartes statistiques améliorées avec bordures arrondies simulées
      const cardWidth = (pageWidth - 2 * margin - 10) / 3
      const cardHeight = 32
      const cardSpacing = 5

      // Carte 1: Total
      doc.setFillColor(59, 130, 246)
      doc.roundedRect(margin, yPos, cardWidth, cardHeight, 2, 2, "F")
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(9)
      doc.setFont("helvetica", "normal")
      doc.text("TOTAL RÉSERVES", margin + cardWidth / 2, yPos + 10, { align: "center" })
      doc.setFontSize(16)
      doc.setFont("helvetica", "bold")
      doc.text(`${formatCurrency(stats.total)} €`, margin + cardWidth / 2, yPos + 22, { align: "center" })

      // Carte 2: Libéré
      doc.setFillColor(34, 197, 94)
      doc.roundedRect(margin + cardWidth + cardSpacing, yPos, cardWidth, cardHeight, 2, 2, "F")
      doc.setFontSize(9)
      doc.setFont("helvetica", "normal")
      doc.text("LIBÉRÉ", margin + cardWidth + cardSpacing + cardWidth / 2, yPos + 10, { align: "center" })
      doc.setFontSize(16)
      doc.setFont("helvetica", "bold")
      doc.text(`${formatCurrency(stats.totalReleased)} €`, margin + cardWidth + cardSpacing + cardWidth / 2, yPos + 22, { align: "center" })

      // Carte 3: Disponible
      doc.setFillColor(251, 146, 60)
      doc.roundedRect(margin + 2 * (cardWidth + cardSpacing), yPos, cardWidth, cardHeight, 2, 2, "F")
      doc.setFontSize(9)
      doc.setFont("helvetica", "normal")
      doc.text("DISPONIBLE", margin + 2 * (cardWidth + cardSpacing) + cardWidth / 2, yPos + 10, { align: "center" })
      doc.setFontSize(16)
      doc.setFont("helvetica", "bold")
      doc.text(`${formatCurrency(stats.totalReleasable)} €`, margin + 2 * (cardWidth + cardSpacing) + cardWidth / 2, yPos + 22, { align: "center" })

      yPos += cardHeight + 20

      // Graphique 1: Évolution avec titre stylisé
      if (lineChartRef.current) {
        doc.setFontSize(14)
        doc.setFont("helvetica", "bold")
        doc.setTextColor(30, 30, 30)
        doc.text("ÉVOLUTION DES RÉSERVES", margin, yPos)
        
        yPos += 3
        doc.setFontSize(9)
        doc.setFont("helvetica", "italic")
        doc.setTextColor(100, 100, 100)
        doc.text("Évolution chronologique des montants de réserves", margin, yPos)
        
        yPos += 8

        const chartImage = lineChartRef.current.toBase64Image()
        const chartWidth = pageWidth - 2 * margin
        const chartHeight = 70
        doc.addImage(chartImage, "PNG", margin, yPos, chartWidth, chartHeight)
        yPos += chartHeight + 15
      }

      // Nouvelle page si nécessaire
      if (yPos > pageHeight - 100) {
        doc.addPage()
        drawHeader(2, 2)
        yPos = headerHeight + 10
      }

      // Graphique 2: Répartition par décennie
      if (barChartRef.current && reserves.length > 0) {
        doc.setFontSize(14)
        doc.setFont("helvetica", "bold")
        doc.setTextColor(30, 30, 30)
        doc.text("RÉPARTITION PAR DÉCENNIE", margin, yPos)
        
        yPos += 3
        doc.setFontSize(9)
        doc.setFont("helvetica", "italic")
        doc.setTextColor(100, 100, 100)
        doc.text("Agrégation des montants par période de 10 ans", margin, yPos)
        
        yPos += 8

        const chartImage = barChartRef.current.toBase64Image()
        const chartWidth = pageWidth - 2 * margin
        const chartHeight = 70
        doc.addImage(chartImage, "PNG", margin, yPos, chartWidth, chartHeight)
        yPos += chartHeight + 15
      }

      // Nouvelle page pour le tableau
      doc.addPage()
      drawHeader(3, 3)
      yPos = headerHeight + 10

      // Tableau des réserves avec titre
      doc.setFontSize(14)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(30, 30, 30)
      doc.text("DÉTAIL DES RÉSERVES", margin, yPos)
      
      yPos += 3
      doc.setFontSize(9)
      doc.setFont("helvetica", "italic")
      doc.setTextColor(100, 100, 100)
      doc.text(`Total : ${reserves.length} années (2013-2055)`, margin, yPos)
      
      yPos += 10

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
        theme: "striped",
        headStyles: {
          fillColor: [30, 30, 30],
          textColor: [255, 255, 255],
          fontSize: 10,
          fontStyle: "bold",
          halign: "center",
          cellPadding: 4,
        },
        bodyStyles: {
          fontSize: 9,
          halign: "center",
          cellPadding: 3,
          textColor: [50, 50, 50],
        },
        alternateRowStyles: {
          fillColor: [248, 249, 250],
        },
        columnStyles: {
          0: { halign: "center", fontStyle: "bold" },
          1: { halign: "right", fontStyle: "bold", textColor: [59, 130, 246] },
          2: { halign: "center" },
          3: { halign: "right", textColor: [34, 197, 94] },
          4: { halign: "right", textColor: [251, 146, 60], fontStyle: "bold" },
        },
        foot: [[
          "TOTAL",
          `${formatCurrency(stats.total)} €`,
          "",
          `${formatCurrency(stats.totalReleased)} €`,
          `${formatCurrency(stats.totalReleasable)} €`,
        ]],
        footStyles: {
          fillColor: [240, 240, 240],
          fontSize: 10,
          fontStyle: "bold",
          halign: "center",
          textColor: [30, 30, 30],
        },
        margin: { left: margin, right: margin },
        styles: {
          lineColor: [200, 200, 200],
          lineWidth: 0.3,
        },
      })

      // Graphique 3: Doughnut
      const finalY = (doc as any).lastAutoTable?.finalY || yPos + 100
      
      if (finalY < pageHeight - 100 && doughnutChartRef.current) {
        yPos = finalY + 20
        doc.setFontSize(14)
        doc.setFont("helvetica", "bold")
        doc.setTextColor(30, 30, 30)
        doc.text("RÉPARTITION LIBÉRÉ / DISPONIBLE", margin, yPos)
        
        yPos += 3
        doc.setFontSize(9)
        doc.setFont("helvetica", "italic")
        doc.setTextColor(100, 100, 100)
        doc.text("Visualisation du ratio entre montants libérés et disponibles", margin, yPos)
        
        yPos += 8

        const chartImage = doughnutChartRef.current.toBase64Image()
        const chartSize = 75
        doc.addImage(chartImage, "PNG", (pageWidth - chartSize) / 2, yPos, chartSize, chartSize)
      } else if (doughnutChartRef.current) {
        doc.addPage()
        const totalPages = doc.internal.pages.length - 1
        drawHeader(totalPages, totalPages)
        yPos = headerHeight + 10
        
        doc.setFontSize(14)
        doc.setFont("helvetica", "bold")
        doc.setTextColor(30, 30, 30)
        doc.text("RÉPARTITION LIBÉRÉ / DISPONIBLE", margin, yPos)
        
        yPos += 3
        doc.setFontSize(9)
        doc.setFont("helvetica", "italic")
        doc.setTextColor(100, 100, 100)
        doc.text("Visualisation du ratio entre montants libérés et disponibles", margin, yPos)
        
        yPos += 8

        const chartImage = doughnutChartRef.current.toBase64Image()
        const chartSize = 80
        doc.addImage(chartImage, "PNG", (pageWidth - chartSize) / 2, yPos, chartSize, chartSize)
      }

      // Footer sur toutes les pages
      const pageCount = doc.internal.pages.length - 1
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        drawFooter(i, pageCount)
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
                    <span className="font-semibold">{reserve.year}</span>
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

