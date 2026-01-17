"use client"

import { useState, useEffect } from "react"
import { Card, CardBody } from "@heroui/react"
import { Button } from "@heroui/react"
import { Select, SelectItem } from "@/components/ui/select-heroui"
import { Tabs, Tab } from "@heroui/react"
import { BilletInput } from "./BilletInput"
import { formatCurrency, BILLET_DENOMINATIONS } from "@/lib/utils"
import { Plus, Minus, FileText, Wallet } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useToast } from "@/components/ui/toast"
import { Textarea } from "@heroui/react"
import { motion, AnimatePresence } from "framer-motion"
import { PremiumCard } from "@/components/ui/premium-card"

interface CaisseInterfaceProps {
  coffres: any[]
  userId: string
}

type Mode = "INVENTORY" | "ENTRY" | "EXIT"

export function CaisseInterface({ coffres, userId }: CaisseInterfaceProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { showToast } = useToast()
  const [selectedCoffre, setSelectedCoffre] = useState<string | null>(null)
  const [balance, setBalance] = useState<number | null>(null)
  const [loadingBalance, setLoadingBalance] = useState(false)

  useEffect(() => {
    const coffreId = searchParams.get("coffre")
    if (coffreId && coffres.some((c) => c.id === coffreId)) {
      setSelectedCoffre(coffreId)
    }
  }, [searchParams, coffres])

  // Charger le solde du coffre sélectionné
  useEffect(() => {
    if (selectedCoffre) {
      setLoadingBalance(true)
      fetch(`/api/coffres/balance?coffreId=${selectedCoffre}`)
        .then((res) => {
          if (!res.ok) throw new Error('Erreur API')
          return res.json()
        })
        .then((data) => {
          if (data.error) {
            console.error('Erreur balance:', data.error)
            setBalance(0)
          } else {
            setBalance(data.balance ?? 0)
          }
          setLoadingBalance(false)
        })
        .catch((err) => {
          console.error('Erreur chargement balance:', err)
          setBalance(0)
          setLoadingBalance(false)
        })
    } else {
      setBalance(null)
    }
  }, [selectedCoffre])

  const [mode, setMode] = useState<Mode>("ENTRY")
  const [billets, setBillets] = useState<Record<number, number>>({})
  const [description, setDescription] = useState("")
  const [loading, setLoading] = useState(false)

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
    if (!selectedCoffre) {
      showToast("Veuillez sélectionner un coffre avant d'enregistrer un mouvement", "error")
      return
    }

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
        const balanceRes = await fetch(`/api/coffres/balance?coffreId=${selectedCoffre}`)
        const balanceData = await balanceRes.json()
        setBalance(balanceData.balance || 0)
        showToast("Mouvement enregistré avec succès!", "success")
      } else {
        const error = await response.json()
        showToast(`Erreur: ${error.error || error.message || "Une erreur est survenue"}`, "error")
      }
    } catch (error) {
      showToast("Erreur lors de l'enregistrement", "error")
    } finally {
      setLoading(false)
    }
  }

  const handleInventory = async () => {
    if (!selectedCoffre) {
      showToast("Veuillez sélectionner un coffre avant d'enregistrer un inventaire", "error")
      return
    }

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
        const balanceRes = await fetch(`/api/coffres/balance?coffreId=${selectedCoffre}`)
        const balanceData = await balanceRes.json()
        setBalance(balanceData.balance || 0)
        showToast("Inventaire enregistré avec succès!", "success")
      } else {
        const error = await response.json()
        showToast(`Erreur: ${error.error || error.message || "Une erreur est survenue"}`, "error")
      }
    } catch (error) {
      showToast("Erreur lors de l'enregistrement", "error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="grid gap-4 md:grid-cols-[1.1fr_0.9fr] items-center">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Wallet className="h-4 w-4" />
            Gestion des mouvements
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-foreground">
            Encodage caisse
          </h1>
          <p className="text-foreground/70">
            Choisissez un coffre, encodez un inventaire ou un mouvement avec un aperçu clair
            du total saisi. L’interface est fluide et responsive.
          </p>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        {coffres.length === 0 ? (
          <div className="w-full sm:w-72 p-4 rounded-xl border border-warning/30 bg-warning/10">
            <p className="text-sm text-warning font-medium">
              Aucun coffre disponible. Contactez un administrateur pour être ajouté à un coffre.
            </p>
          </div>
        ) : (
          <Select
            label="Coffre"
            placeholder="Sélectionnez un coffre"
            isRequired
            selectedKeys={selectedCoffre ? [selectedCoffre] : []}
            onSelectionChange={(keys) => {
              const selected = Array.from(keys)[0] as string
              setSelectedCoffre(selected || null)
            }}
            className="w-full sm:w-72"
          >
            {coffres.map((coffre) => (
              <SelectItem key={coffre.id}>
                {coffre.name}
              </SelectItem>
            ))}
          </Select>
        )}
          </div>
      </div>

      {selectedCoffre && (
          <PremiumCard
            variant="gradient"
            hover3D
            glow
            className="overflow-visible"
          >
            <div className="p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <motion.div 
                    className="p-3 rounded-xl bg-primary/20 border border-primary/30"
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 400, damping: 15 }}
                  >
                    <Wallet className="h-5 w-5 text-primary" />
                  </motion.div>
                  <div>
                    <p className="text-xs text-foreground/60 mb-1 font-medium">Montant actuel</p>
                    <motion.p 
                      className="text-2xl sm:text-3xl font-bold text-primary"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 200, damping: 15 }}
                    >
                      {loadingBalance ? (
                        <span className="text-foreground/30 animate-pulse">Chargement...</span>
                      ) : balance !== null ? (
                        formatCurrency(balance)
                      ) : (
                        <span className="text-foreground/30">0,00 €</span>
                      )}
                    </motion.p>
                  </div>
                </div>
              </div>
        </div>
          </PremiumCard>
      )}
      </div>

      {selectedCoffre && (
          <PremiumCard
            variant="glass"
            hover3D
            glow
            className="overflow-visible"
          >
            <div className="p-5 sm:p-6 space-y-6">
              {/* Mode sélection avec Tabs HeroUI - Centré */}
              <div className="flex justify-center">
                <Tabs
                  selectedKey={mode}
                  onSelectionChange={(key) => setMode(key as Mode)}
                  aria-label="Mode de saisie"
                  classNames={{
                    base: "w-full max-w-xl",
                    tabList: "w-full",
                    tab: "flex-1",
                  }}
                >
                  <Tab
                    key="INVENTORY"
                    title={
                      <div className="flex items-center gap-2 justify-center">
                        <FileText className="h-4 w-4" />
                        <span>Inventaire</span>
                      </div>
                    }
                  />
                  <Tab
                    key="ENTRY"
                    title={
                      <div className="flex items-center gap-2 justify-center">
                        <Plus className="h-4 w-4" />
                        <span>Entrée</span>
                      </div>
                    }
                  />
                  <Tab
                    key="EXIT"
                    title={
                      <div className="flex items-center gap-2 justify-center">
                        <Minus className="h-4 w-4" />
                        <span>Sortie</span>
                      </div>
                    }
                  />
                </Tabs>
              </div>

              {/* Saisie des billets avec effet de coulissement */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={mode}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  className="space-y-5"
                >
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                      {BILLET_DENOMINATIONS.map((denomination) => (
                        <BilletInput
                          key={denomination}
                          denomination={denomination}
                          quantity={billets[denomination] || 0}
                          onChange={handleBilletChange}
                        />
                      ))}
                    </div>

                  <Card className="bg-muted/40 border border-border/60">
                    <CardBody className="p-4 flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground/80">
                        Total saisi
                          </span>
                          <span className="text-2xl font-bold text-primary">
                            {formatCurrency(calculateTotal())}
                          </span>
                      </CardBody>
                    </Card>

                  {/* Description et bouton */}
                  <div className="space-y-4">
                    <Textarea
                      label="Description (optionnel)"
                      value={description}
                      onValueChange={setDescription}
                      placeholder="Ajoutez une note..."
                      minRows={2}
                    />

                    <Button
                      onPress={mode === "INVENTORY" ? handleInventory : handleSubmit}
                      isLoading={loading}
                      isDisabled={calculateTotal() === 0}
                      color="primary"
                      size="lg"
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
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </PremiumCard>
      )}
    </div>
  )
}
