"use client"

import { useState, useEffect } from "react"
import { Card, CardBody } from "@heroui/react"
import { Button } from "@heroui/react"
import { Select, SelectItem } from "@heroui/react"
import { Tabs, Tab } from "@heroui/react"
import { BilletInput } from "./BilletInput"
import { formatCurrency, BILLET_DENOMINATIONS } from "@/lib/utils"
import { Plus, Minus, FileText, Wallet } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useToast } from "@/components/ui/toast"
import { Textarea } from "@heroui/react"
import { motion, AnimatePresence } from "framer-motion"

interface CaisseInterfaceProps {
  coffres: any[]
  userId: string
}

type Mode = "INVENTORY" | "ENTRY" | "EXIT"

export function CaisseInterface({ coffres, userId }: CaisseInterfaceProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { showToast } = useToast()
  const [selectedCoffre, setSelectedCoffre] = useState<string | null>(
    coffres[0]?.id || null
  )
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
        const balanceRes = await fetch(`/api/coffres/balance?coffreId=${selectedCoffre}`)
        const balanceData = await balanceRes.json()
        setBalance(balanceData.balance || 0)
        showToast("Mouvement enregistré avec succès!", "success")
      } else {
        const error = await response.json()
        showToast(`Erreur: ${error.message || "Une erreur est survenue"}`, "error")
      }
    } catch (error) {
      showToast("Erreur lors de l'enregistrement", "error")
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
        const balanceRes = await fetch(`/api/coffres/balance?coffreId=${selectedCoffre}`)
        const balanceData = await balanceRes.json()
        setBalance(balanceData.balance || 0)
        showToast("Inventaire enregistré avec succès!", "success")
      } else {
        const error = await response.json()
        showToast(`Erreur: ${error.message || "Une erreur est survenue"}`, "error")
      }
    } catch (error) {
      showToast("Erreur lors de l'enregistrement", "error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Sélection du coffre */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <Select
          label="Coffre"
          selectedKeys={selectedCoffre ? [selectedCoffre] : []}
          onSelectionChange={(keys) => {
            const selected = Array.from(keys)[0] as string
            setSelectedCoffre(selected || null)
          }}
          className="w-full sm:w-64"
        >
          {coffres.map((coffre) => (
            <SelectItem key={coffre.id}>
              {coffre.name}
            </SelectItem>
          ))}
        </Select>
      </div>

      {/* Montant global - Centré sur la page */}
      {selectedCoffre && (
        <div className="flex justify-center">
          <motion.div
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="relative group"
          >
            {/* Halo lumineux au survol */}
            <div className="absolute -inset-0.5 bg-primary/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10" />
            
            <Card className="bg-gradient-to-br from-default-100 to-default-50 border-divider border">
              <CardBody className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Wallet className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-foreground/60 mb-0.5">Montant actuel</p>
                    <p className="text-xl font-bold text-primary">
                      {loadingBalance ? (
                        <span className="text-foreground/30 animate-pulse">Chargement...</span>
                      ) : balance !== null ? (
                        formatCurrency(balance)
                      ) : (
                        <span className="text-foreground/30">0,00 €</span>
                      )}
                    </p>
                  </div>
                </div>
              </CardBody>
            </Card>
          </motion.div>
        </div>
      )}

      {selectedCoffre && (
        <motion.div
          whileHover={{ scale: 1.01 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="relative group"
        >
          {/* Halo lumineux au survol */}
          <div className="absolute -inset-0.5 bg-primary/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10" />
          
          <Card className="bg-gradient-to-br from-default-100 to-default-50 border-divider border">
            <CardBody className="p-6 space-y-6">
              {/* Mode sélection avec Tabs HeroUI - Centré */}
              <div className="flex justify-center">
                <Tabs
                  selectedKey={mode}
                  onSelectionChange={(key) => setMode(key as Mode)}
                  aria-label="Mode de saisie"
                  classNames={{
                    base: "w-full max-w-md",
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
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                >
                  <div>
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

                    <Card className="mt-4 bg-default-100 border-divider border">
                      <CardBody className="p-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-foreground/70">
                            Total saisi:
                          </span>
                          <span className="text-2xl font-bold text-primary">
                            {formatCurrency(calculateTotal())}
                          </span>
                        </div>
                      </CardBody>
                    </Card>
                  </div>

                  {/* Description et bouton */}
                  <div className="space-y-4 mt-6">
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
            </CardBody>
          </Card>
        </motion.div>
      )}
    </div>
  )
}
