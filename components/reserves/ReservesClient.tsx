"use client"

import { useState, useEffect, useMemo } from "react"
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
} from "lucide-react"
import { Button, Input, Textarea } from "@heroui/react"
import { useToast } from "@/components/ui/toast"
import { Line } from "react-chartjs-2"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
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

  // Form state
  const [formData, setFormData] = useState({
    year: new Date().getFullYear(),
    amount: 0,
    releaseYear: null as number | null,
    released: 0,
    notes: "",
  })

  // Charger les réserves
  useEffect(() => {
    fetchReserves()
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

  // Données pour le graphique
  const chartData = useMemo(() => {
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

  const chartOptions = {
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

      {/* Graphique */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="glass-effect rounded-3xl p-6 border border-border/50 shadow-lg"
      >
        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Calculator className="w-5 h-5 text-primary" />
          Évolution des Réserves
        </h3>
        <div className="h-[300px]">
          {reserves.length > 0 ? (
            <Line data={chartData} options={chartOptions} />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Aucune donnée à afficher
            </div>
          )}
        </div>
      </motion.div>

      {/* Tableau */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="glass-effect rounded-3xl p-6 border border-border/50 shadow-lg"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold">Détail des Réserves</h3>
          <Button
            color="primary"
            startContent={<Plus className="w-4 h-4" />}
            onPress={() => setIsAddingNew(true)}
            className="font-semibold"
          >
            Ajouter
          </Button>
        </div>

        {/* Formulaire d'ajout */}
        <AnimatePresence>
          {isAddingNew && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 p-4 glass-effect rounded-2xl border border-primary/30"
            >
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                <Input
                  type="number"
                  label="Année"
                  value={formData.year.toString()}
                  onChange={(e) =>
                    setFormData({ ...formData, year: parseInt(e.target.value) || 0 })
                  }
                />
                <Input
                  type="number"
                  label="Montant (€)"
                  value={formData.amount.toString()}
                  onChange={(e) =>
                    setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })
                  }
                />
                <Input
                  type="number"
                  label="Année libérable"
                  value={formData.releaseYear?.toString() || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      releaseYear: e.target.value ? parseInt(e.target.value) : null,
                    })
                  }
                />
                <Input
                  type="number"
                  label="Libéré (€)"
                  value={formData.released.toString()}
                  onChange={(e) =>
                    setFormData({ ...formData, released: parseFloat(e.target.value) || 0 })
                  }
                />
                <div className="flex gap-2">
                  <Button
                    color="success"
                    startContent={<Save className="w-4 h-4" />}
                    onPress={handleAdd}
                    className="flex-1"
                  >
                    Sauvegarder
                  </Button>
                  <Button
                    color="danger"
                    variant="light"
                    isIconOnly
                    onPress={() => setIsAddingNew(false)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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
              Aucune réserve enregistrée. Cliquez sur &quot;Ajouter&quot; pour commencer.
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
