"use client"

import { useState, useEffect } from "react"
import { Card, CardHeader, CardBody } from "@heroui/react"
import { Button } from "@heroui/react"
import { Select, SelectItem } from "@heroui/react"
import { Tabs, Tab } from "@heroui/react"
import { BilletInput } from "./BilletInput"
import { formatCurrency, BILLET_DENOMINATIONS } from "@/lib/utils"
import { Plus, Minus, FileText, Wallet } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useToast } from "@/components/ui/toast"
import { Textarea } from "@heroui/react"

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

  const [mode, setMode] = useState<Mode>("INVENTORY")
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
      {/* En-tête avec sélection du coffre et montant global */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex-1 w-full sm:w-auto">
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
                <SelectItem key={coffre.id} value={coffre.id}>
                  {coffre.name}
                </SelectItem>
              ))}
            </Select>
          </div>
        </div>
        
        {/* Montant global - toujours visible et proéminent */}
        {selectedCoffre && (
          <Card className="bg-gradient-to-br from-primary/20 to-primary/5 border-primary/30">
            <CardBody>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-foreground/60 mb-1">Montant actuel du coffre</div>
                  <div className="text-4xl sm:text-5xl font-bold text-primary">
                    {loadingBalance ? (
                      <span className="text-foreground/30 animate-pulse">Chargement...</span>
                    ) : balance !== null ? (
                      formatCurrency(balance)
                    ) : (
                      <span className="text-foreground/30">0,00 €</span>
                    )}
                  </div>
                </div>
                <Wallet className="h-12 w-12 text-primary/30" />
              </div>
            </CardBody>
          </Card>
        )}
      </div>

      {selectedCoffre && (
        <Card>
          <CardBody className="pt-6 space-y-6">
            {/* Mode sélection avec Tabs HeroUI */}
            <Tabs
              selectedKey={mode}
              onSelectionChange={(key) => setMode(key as Mode)}
              aria-label="Mode de saisie"
            >
              <Tab
                key="INVENTORY"
                title={
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span>Inventaire</span>
                  </div>
                }
              />
              <Tab
                key="ENTRY"
                title={
                  <div className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    <span>Entrée</span>
                  </div>
                }
              />
              <Tab
                key="EXIT"
                title={
                  <div className="flex items-center gap-2">
                    <Minus className="h-4 w-4" />
                    <span>Sortie</span>
                  </div>
                }
              />
            </Tabs>

            {/* Saisie des billets */}
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

              <Card className="mt-4 bg-default-100">
                <CardBody>
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
          </CardBody>
        </Card>
      )}
    </div>
  )
}
