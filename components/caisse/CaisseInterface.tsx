"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BilletInput } from "./BilletInput"
import { formatCurrency, BILLET_DENOMINATIONS } from "@/lib/utils"
import { Wallet, Plus, Minus, FileText } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"

interface CaisseInterfaceProps {
  coffres: any[]
  userId: string
}

type Mode = "INVENTORY" | "ENTRY" | "EXIT"

export function CaisseInterface({ coffres, userId }: CaisseInterfaceProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [selectedCoffre, setSelectedCoffre] = useState<string | null>(
    coffres[0]?.id || null
  )

  // Si un coffre est spécifié dans l'URL, le sélectionner
  useEffect(() => {
    const coffreId = searchParams.get("coffre")
    if (coffreId && coffres.some((c) => c.id === coffreId)) {
      setSelectedCoffre(coffreId)
    }
  }, [searchParams, coffres])
  const [mode, setMode] = useState<Mode>("INVENTORY")
  const [billets, setBillets] = useState<Record<number, number>>({})
  const [description, setDescription] = useState("")
  const [loading, setLoading] = useState(false)

  const selectedCoffreData = coffres.find((c) => c.id === selectedCoffre)

  const handleBilletChange = (denomination: number, quantity: number) => {
    setBillets((prev) => ({
      ...prev,
      [denomination]: quantity,
    }))
  }

  const calculateTotal = () => {
    return Object.entries(billets).reduce(
      (sum, [denom, qty]) => sum + parseFloat(denom) * qty,
      0
    )
  }

  const handleSubmit = async () => {
    if (!selectedCoffre) return

    setLoading(true)
    try {
      const response = await fetch("/api/movements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coffreId: selectedCoffre,
          type: mode,
          billets,
          description,
        }),
      })

      if (response.ok) {
        router.refresh()
        setBillets({})
        setDescription("")
        alert("Mouvement enregistré avec succès!")
      } else {
        const error = await response.json()
        alert(`Erreur: ${error.message || "Une erreur est survenue"}`)
      }
    } catch (error) {
      alert("Erreur lors de l'enregistrement")
    } finally {
      setLoading(false)
    }
  }

  const handleInventory = async () => {
    if (!selectedCoffre) return

    setLoading(true)
    try {
      const response = await fetch("/api/inventories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coffreId: selectedCoffre,
          billets,
          notes: description,
        }),
      })

      if (response.ok) {
        router.refresh()
        setBillets({})
        setDescription("")
        alert("Inventaire enregistré avec succès!")
      } else {
        const error = await response.json()
        alert(`Erreur: ${error.message || "Une erreur est survenue"}`)
      }
    } catch (error) {
      alert("Erreur lors de l'enregistrement")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Sélection du coffre */}
      <Card className="cyber-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Sélectionner un coffre
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {coffres.map((coffre) => (
              <motion.button
                key={coffre.id}
                onClick={() => setSelectedCoffre(coffre.id)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`p-4 rounded-lg border-2 transition-all ${
                  selectedCoffre === coffre.id
                    ? "border-cyber-gold glow-gold bg-cyber-gold/10"
                    : "border-cyber-gold/20 hover:border-cyber-gold/50"
                }`}
              >
                <p className="font-semibold text-cyber-gold">{coffre.name}</p>
                {coffre.lastInventory && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Dernier inventaire:{" "}
                    {formatCurrency(Number(coffre.lastInventory.totalAmount))}
                  </p>
                )}
              </motion.button>
            ))}
          </div>
        </CardContent>
      </Card>

      {selectedCoffre && (
        <>
          {/* Mode sélection */}
          <Card className="cyber-card">
            <CardHeader>
              <CardTitle>Mode de saisie</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <motion.button
                  onClick={() => setMode("INVENTORY")}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    mode === "INVENTORY"
                      ? "border-cyber-gold glow-gold bg-cyber-gold/10"
                      : "border-cyber-gold/20 hover:border-cyber-gold/50"
                  }`}
                >
                  <FileText className="h-6 w-6 mx-auto mb-2 text-cyber-gold" />
                  <p className="font-semibold">Inventaire</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Comptage initial
                  </p>
                </motion.button>

                <motion.button
                  onClick={() => setMode("ENTRY")}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    mode === "ENTRY"
                      ? "border-cyber-gold glow-gold bg-cyber-gold/10"
                      : "border-cyber-gold/20 hover:border-cyber-gold/50"
                  }`}
                >
                  <Plus className="h-6 w-6 mx-auto mb-2 text-green-400" />
                  <p className="font-semibold">Entrée</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Ajout de fonds
                  </p>
                </motion.button>

                <motion.button
                  onClick={() => setMode("EXIT")}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    mode === "EXIT"
                      ? "border-cyber-gold glow-gold bg-cyber-gold/10"
                      : "border-cyber-gold/20 hover:border-cyber-gold/50"
                  }`}
                >
                  <Minus className="h-6 w-6 mx-auto mb-2 text-red-400" />
                  <p className="font-semibold">Sortie</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Retrait de fonds
                  </p>
                </motion.button>
              </div>
            </CardContent>
          </Card>

          {/* Saisie des billets */}
          <Card className="cyber-card">
            <CardHeader>
              <CardTitle>
                {mode === "INVENTORY"
                  ? "Comptage des billets"
                  : mode === "ENTRY"
                  ? "Billets ajoutés"
                  : "Billets retirés"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                {BILLET_DENOMINATIONS.map((denomination) => (
                  <BilletInput
                    key={denomination}
                    denomination={denomination}
                    quantity={billets[denomination] || 0}
                    onChange={handleBilletChange}
                  />
                ))}
              </div>

              <div className="mt-6 p-4 sm:p-6 rounded-lg bg-cyber-dark border border-cyber-gold/30">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <span className="text-base sm:text-lg font-semibold text-foreground">
                    Total:
                  </span>
                  <span className="text-xl sm:text-2xl lg:text-3xl font-bold text-cyber-gold">
                    {formatCurrency(calculateTotal())}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Description (optionnel)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-3 rounded-lg bg-cyber-dark border border-cyber-gold/30 text-foreground focus:outline-none focus:ring-2 focus:ring-cyber-gold"
                  rows={3}
                  placeholder="Ajoutez une note..."
                />
              </div>

              <Button
                onClick={mode === "INVENTORY" ? handleInventory : handleSubmit}
                disabled={loading || calculateTotal() === 0}
                className="w-full"
              >
                {loading
                  ? "Enregistrement..."
                  : mode === "INVENTORY"
                  ? "Enregistrer l'inventaire"
                  : mode === "ENTRY"
                  ? "Enregistrer l'entrée"
                  : "Enregistrer la sortie"}
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

