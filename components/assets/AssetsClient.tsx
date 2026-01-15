"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardBody, Button, Input, Textarea, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure } from "@heroui/react"
import { Select, SelectItem } from "@/components/ui/select-heroui"
import { useToast } from "@/components/ui/toast"
import { formatCurrency } from "@/lib/utils"
import { Plus, Trash2, Tag, MapPin, TrendingUp, TrendingDown, BadgeEuro } from "lucide-react"
import { motion } from "framer-motion"
import { useConfirmModal } from "@/components/ui/confirm-modal"

type CoffreLite = { id: string; name: string }

type Asset = {
  id: string
  name: string
  category?: string | null
  description?: string | null
  coffreId?: string | null
  coffre?: CoffreLite | null
  events?: Array<{ id: string; type: string; amount?: number | null; date: string }>
  createdAt: string
  updatedAt: string
}

// Helper pour extraire les prix pertinents d'un actif
// Les événements sont déjà triés par date décroissante, donc on prend le premier de chaque type
function getAssetPrices(asset: Asset) {
  const events = asset.events || []
  // Trouver le dernier événement de chaque type (premier dans la liste triée par date desc)
  const purchase = events.find((e) => e.type === "PURCHASE")
  const sale = events.find((e) => e.type === "SALE")
  const valuation = events.find((e) => e.type === "VALUATION")
  
  return {
    purchasePrice: purchase?.amount ? Number(purchase.amount) : null,
    purchaseDate: purchase?.date || null,
    salePrice: sale?.amount ? Number(sale.amount) : null,
    saleDate: sale?.date || null,
    marketValue: valuation?.amount ? Number(valuation.amount) : null,
    valuationDate: valuation?.date || null,
  }
}

export function AssetsClient({ initialCoffres }: { initialCoffres: CoffreLite[] }) {
  const { showToast } = useToast()
  const { confirm, ConfirmModal } = useConfirmModal()
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [assets, setAssets] = useState<Asset[]>([])

  const [form, setForm] = useState({
    name: "",
    category: "",
    description: "",
    coffreId: "" as string, // "" = non localisé
  })

  const fetchAssets = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/assets")
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Erreur API")
      setAssets(data.assets || [])
    } catch (e: any) {
      showToast(e.message || "Erreur lors du chargement des actifs", "error")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAssets()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleCreate = async () => {
    if (!form.name.trim()) {
      showToast("Nom requis", "error")
      return
    }
    setSaving(true)
    try {
      const res = await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          category: form.category.trim() || undefined,
          description: form.description.trim() || undefined,
          coffreId: form.coffreId ? form.coffreId : null,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || "Erreur lors de la création")
      showToast("Actif créé", "success")
      setForm({ name: "", category: "", description: "", coffreId: "" })
      await fetchAssets()
    } catch (e: any) {
      showToast(e.message || "Erreur lors de la création", "error")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (asset: Asset) => {
    confirm(`Supprimer l'actif "${asset.name}" ?`, {
      title: "Supprimer l'actif",
      confirmLabel: "Supprimer",
      cancelLabel: "Annuler",
      confirmColor: "danger",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/assets/${asset.id}`, { method: "DELETE" })
          const data = await res.json().catch(() => ({}))
          if (!res.ok) throw new Error(data?.error || "Erreur lors de la suppression")
          showToast("Actif supprimé", "success")
          await fetchAssets()
        } catch (e: any) {
          showToast(e.message || "Erreur lors de la suppression", "error")
        }
      },
    })
  }

  const [eventAsset, setEventAsset] = useState<Asset | null>(null)
  const [eventForm, setEventForm] = useState({
    type: "VALUATION" as "PURCHASE" | "SALE" | "VALUATION",
    amount: "",
    notes: "",
  })
  const [eventSaving, setEventSaving] = useState(false)

  const openEventModal = (asset: Asset) => {
    setEventAsset(asset)
    setEventForm({ type: "VALUATION", amount: "", notes: "" })
    onOpen()
  }

  const handleCreateEvent = async () => {
    if (!eventAsset) return
    setEventSaving(true)
    try {
      const amountNum =
        eventForm.amount.trim() === ""
          ? undefined
          : Number(eventForm.amount.replace(",", "."))
      if (typeof amountNum === "number" && isNaN(amountNum)) {
        throw new Error("Montant invalide")
      }
      if (typeof amountNum === "number" && amountNum < 0) {
        throw new Error("Le montant doit être positif")
      }

      const res = await fetch(`/api/assets/${eventAsset.id}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: eventForm.type,
          amount: typeof amountNum === "number" ? amountNum : undefined,
          notes: eventForm.notes.trim() || undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || "Erreur lors de l'ajout")

      showToast("Événement ajouté", "success")
      onClose()
      setEventAsset(null)
      await fetchAssets()
    } catch (e: any) {
      showToast(e.message || "Erreur lors de l'ajout", "error")
    } finally {
      setEventSaving(false)
    }
  }

  const totals = useMemo(() => {
    let purchase = 0
    let sale = 0
    let valuation = 0
    assets.forEach((a) => {
      const last = a.events?.[0]
      if (!last) return
      const amt = Number(last.amount || 0)
      if (last.type === "PURCHASE") purchase += amt
      if (last.type === "SALE") sale += amt
      if (last.type === "VALUATION") valuation += amt
    })
    return { purchase, sale, valuation }
  }, [assets])

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <Tag className="h-5 w-5 text-primary" />
          Actifs & Avoirs
        </h2>
        <p className="text-muted-foreground">
          Enregistrez vos actifs (or, montres, voitures…) et leurs événements (achat, vente, estimation). Vous pouvez aussi les localiser dans un coffre.
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card/70 backdrop-blur border border-border/60">
          <CardBody className="p-5">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-success" />
              <div>
                <p className="text-xs text-foreground/60">Achats (dernier event)</p>
                <p className="text-lg font-bold text-success">{formatCurrency(totals.purchase)}</p>
              </div>
            </div>
          </CardBody>
        </Card>
        <Card className="bg-card/70 backdrop-blur border border-border/60">
          <CardBody className="p-5">
            <div className="flex items-center gap-3">
              <TrendingDown className="h-5 w-5 text-danger" />
              <div>
                <p className="text-xs text-foreground/60">Ventes (dernier event)</p>
                <p className="text-lg font-bold text-danger">{formatCurrency(totals.sale)}</p>
              </div>
            </div>
          </CardBody>
        </Card>
        <Card className="bg-card/70 backdrop-blur border border-border/60">
          <CardBody className="p-5">
            <div className="flex items-center gap-3">
              <BadgeEuro className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs text-foreground/60">Estimations (dernier event)</p>
                <p className="text-lg font-bold text-primary">{formatCurrency(totals.valuation)}</p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Create */}
      <Card className="bg-card/70 backdrop-blur border border-border/60">
        <CardBody className="p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-primary">
            <Plus className="h-4 w-4" />
            Ajouter un actif
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Nom"
              value={form.name}
              onValueChange={(v) => setForm((p) => ({ ...p, name: v }))}
              placeholder="Ex: 1 lingot d’or, Rolex Submariner, Porsche…"
              isRequired
            />
            <Input
              label="Catégorie (optionnel)"
              value={form.category}
              onValueChange={(v) => setForm((p) => ({ ...p, category: v }))}
              placeholder="OR / MONTRE / VOITURE / AUTRE…"
            />
            <Select
              label="Localisation (coffre)"
              placeholder="Non localisé"
              selectedKeys={form.coffreId ? [form.coffreId] : []}
              onSelectionChange={(keys) => {
                const selected = Array.from(keys)[0] as string
                setForm((p) => ({ ...p, coffreId: selected || "" }))
              }}
              className="md:col-span-2"
            >
              {initialCoffres.map((c) => (
                <SelectItem key={c.id}>{c.name}</SelectItem>
              ))}
            </Select>
            <Textarea
              label="Description (optionnel)"
              value={form.description}
              onValueChange={(v) => setForm((p) => ({ ...p, description: v }))}
              placeholder="Numéro de série, emplacement précis, notes…"
              minRows={2}
              className="md:col-span-2"
            />
          </div>
          <Button color="primary" onPress={handleCreate} isLoading={saving} className="w-full sm:w-auto">
            Créer l’actif
          </Button>
        </CardBody>
      </Card>

      {/* List */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-foreground/60">Chargement…</div>
        ) : assets.length === 0 ? (
          <Card className="bg-card/70 backdrop-blur border border-border/60">
            <CardBody className="p-6 text-foreground/70">Aucun actif enregistré.</CardBody>
          </Card>
        ) : (
          assets.map((asset) => {
            const prices = getAssetPrices(asset)
            const lastEvent = asset.events?.[0]
            return (
              <motion.div key={asset.id} whileHover={{ scale: 1.01 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
                <Card className="bg-card/70 backdrop-blur border border-border/60">
                  <CardBody className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-primary truncate">{asset.name}</p>
                          {asset.category && (
                            <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary">{asset.category}</span>
                          )}
                        </div>
                        <div className="mt-1 text-xs text-foreground/60 flex items-center gap-2 flex-wrap">
                          {asset.coffre?.name ? (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {asset.coffre.name}
                            </span>
                          ) : (
                            <span className="opacity-70">Non localisé</span>
                          )}
                        </div>
                        {asset.description && <p className="mt-2 text-sm text-foreground/75">{asset.description}</p>}
                        
                        {/* Informations de prix */}
                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-border/30">
                          {prices.purchasePrice !== null && (
                            <div className="flex flex-col gap-1">
                              <p className="text-xs text-foreground/50">Prix d&apos;achat</p>
                              <p className="text-sm font-semibold text-success">{formatCurrency(prices.purchasePrice)}</p>
                              {prices.purchaseDate && (
                                <p className="text-xs text-foreground/40">
                                  {new Date(prices.purchaseDate).toLocaleDateString("fr-FR")}
                                </p>
                              )}
                            </div>
                          )}
                          {prices.salePrice !== null && (
                            <div className="flex flex-col gap-1">
                              <p className="text-xs text-foreground/50">Prix de vente</p>
                              <p className="text-sm font-semibold text-danger">{formatCurrency(prices.salePrice)}</p>
                              {prices.saleDate && (
                                <p className="text-xs text-foreground/40">
                                  {new Date(prices.saleDate).toLocaleDateString("fr-FR")}
                                </p>
                              )}
                            </div>
                          )}
                          {prices.marketValue !== null && (
                            <div className="flex flex-col gap-1">
                              <p className="text-xs text-foreground/50">Valeur marché</p>
                              <p className="text-sm font-semibold text-primary">{formatCurrency(prices.marketValue)}</p>
                              {prices.valuationDate && (
                                <p className="text-xs text-foreground/40">
                                  {new Date(prices.valuationDate).toLocaleDateString("fr-FR")}
                                </p>
                              )}
                            </div>
                          )}
                          {prices.purchasePrice === null && prices.salePrice === null && prices.marketValue === null && (
                            <div className="col-span-3 text-xs text-foreground/50 italic">
                              Aucun prix enregistré. Ajoutez un événement (achat, vente ou estimation).
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <Button variant="bordered" size="sm" onPress={() => openEventModal(asset)}>
                          Ajouter événement
                        </Button>
                        <Button isIconOnly color="danger" variant="light" size="sm" onPress={() => handleDelete(asset)} aria-label="Supprimer">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              </motion.div>
            )
          })
        )}
      </div>

      <Modal isOpen={isOpen} onOpenChange={onClose} size="lg">
        <ModalContent>
          {(close) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                Ajouter un événement
                {eventAsset?.name ? (
                  <span className="text-xs text-foreground/60">{eventAsset.name}</span>
                ) : null}
              </ModalHeader>
              <ModalBody>
                <Select
                  label="Type"
                  selectedKeys={[eventForm.type]}
                  onSelectionChange={(keys) => {
                    const selected = Array.from(keys)[0] as any
                    setEventForm((p) => ({ ...p, type: selected }))
                  }}
                >
                  <SelectItem key="PURCHASE">Achat</SelectItem>
                  <SelectItem key="SALE">Vente</SelectItem>
                  <SelectItem key="VALUATION">Estimation</SelectItem>
                </Select>

                <Input
                  label="Montant (optionnel)"
                  placeholder="Ex: 1200,00"
                  value={eventForm.amount}
                  onValueChange={(v) => setEventForm((p) => ({ ...p, amount: v }))}
                />
                <Textarea
                  label="Notes (optionnel)"
                  value={eventForm.notes}
                  onValueChange={(v) => setEventForm((p) => ({ ...p, notes: v }))}
                  minRows={2}
                />
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={close}>
                  Annuler
                </Button>
                <Button color="primary" onPress={handleCreateEvent} isLoading={eventSaving}>
                  Ajouter
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {ConfirmModal}
    </div>
  )
}

