"use client"

import { useState, useMemo } from "react"
import { Button } from "@heroui/react"
import { Tabs, Tab } from "@heroui/react"
import { Select, SelectItem } from "@/components/ui/select-heroui"
import { Input } from "@heroui/react"
import { Textarea } from "@heroui/react"
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure } from "@heroui/react"
import { useConfirmModal } from "@/components/ui/confirm-modal"
import { formatCurrency, formatDate, BILLET_DENOMINATIONS } from "@/lib/utils"
import { FileText, Plus, Minus, Download, ChevronDown, ChevronUp, Activity, Edit, Trash2, Filter, Search } from "lucide-react"
import { useToast } from "@/components/ui/toast"
import { motion, AnimatePresence } from "framer-motion"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { BilletInput } from "@/components/caisse/BilletInput"
import { PremiumCard, StatsCard } from "@/components/ui/premium-card"
import { getCsrfToken } from "@/lib/csrf-helper"

interface HistoriqueListProps {
  data: {
    movements: any[]
    inventories: any[]
    coffres: any[]
  }
}

export function HistoriqueList({ data }: HistoriqueListProps) {
  const { showToast } = useToast()
  const router = useRouter()
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === "ADMIN"
  const [selectedTab, setSelectedTab] = useState<string>("movements")
  const [selectedCoffreId, setSelectedCoffreId] = useState<string>("")
  const [search, setSearch] = useState<string>("")
  const [typeFilter, setTypeFilter] = useState<string>("") // "" = tous
  const [minAmount, setMinAmount] = useState<string>("")
  const [maxAmount, setMaxAmount] = useState<string>("")
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const { isOpen, onOpen, onClose } = useDisclosure()
  const { confirm, ConfirmModal } = useConfirmModal()
  const [editingMovement, setEditingMovement] = useState<any>(null)
  const [editBillets, setEditBillets] = useState<Record<number, number>>({})
  const [editType, setEditType] = useState<"ENTRY" | "EXIT">("ENTRY")
  const [editDescription, setEditDescription] = useState("")
  const [loading, setLoading] = useState(false)
  const [deletingMovementId, setDeletingMovementId] = useState<string | null>(null)

  const totalMovements = data.movements.length
  const totalInventories = data.inventories.length

  const handleExportPDF = async (type: "movement" | "inventory", id: string) => {
    try {
      const response = await fetch(`/api/pdf/export?type=${type}&id=${id}`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `${type}-${id}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        showToast("PDF exporté avec succès!", "success")
      } else {
        showToast("Erreur lors de l'export PDF", "error")
      }
    } catch (error) {
      showToast("Erreur lors de l'export PDF", "error")
    }
  }

  const toggleExpand = (id: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleEditMovement = (movement: any) => {
    setEditingMovement(movement)
    setEditType(movement.type)
    setEditDescription(movement.description || "")
    
    // Initialiser les billets depuis les détails
    const billets: Record<number, number> = {}
    movement.details.forEach((detail: any) => {
      billets[Number(detail.denomination)] = detail.quantity
    })
    setEditBillets(billets)
    onOpen()
  }

  const handleUpdateMovement = async (onCloseModal: () => void) => {
    if (!editingMovement) return

    setLoading(true)
    try {
      const csrfToken = await getCsrfToken()
      if (!csrfToken) {
        showToast("Erreur: impossible de récupérer le token de sécurité", "error")
        setLoading(false)
        return
      }

      const response = await fetch(`/api/movements/${editingMovement.id}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify({
          type: editType,
          billets: editBillets,
          description: editDescription,
        }),
      })

      if (response.ok) {
        router.refresh()
        onCloseModal()
        setEditingMovement(null)
        setEditBillets({})
        setEditDescription("")
        showToast("Mouvement modifié avec succès!", "success")
      } else {
        const error = await response.json()
        showToast(`Erreur: ${error.error || "Une erreur est survenue"}`, "error")
      }
    } catch (error) {
      showToast("Erreur lors de la modification", "error")
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteMovement = (movementId: string) => {
    // Empêcher les doubles suppressions
    if (deletingMovementId) {
      return
    }

    confirm(
      "Êtes-vous sûr de vouloir supprimer ce mouvement ? Cette action est irréversible.",
      {
        title: "Supprimer le mouvement",
        confirmLabel: "Supprimer",
        cancelLabel: "Annuler",
        confirmColor: "danger",
        isLoading: deletingMovementId === movementId,
        onConfirm: async () => {
          setDeletingMovementId(movementId)
          try {
            const csrfToken = await getCsrfToken()
            if (!csrfToken) {
              showToast("Erreur: impossible de récupérer le token de sécurité", "error")
              setDeletingMovementId(null)
              return
            }

            const response = await fetch(`/api/movements/${movementId}`, {
              method: "DELETE",
              headers: {
                "X-CSRF-Token": csrfToken,
              },
            })

            if (response.ok) {
              showToast("Mouvement supprimé avec succès!", "success")
              // Refresh après un court délai pour assurer la cohérence
              await new Promise(resolve => setTimeout(resolve, 300))
              router.refresh()
            } else {
              const error = await response.json()
              // Message plus clair si déjà supprimé
              if (response.status === 404) {
                showToast("Ce mouvement a déjà été supprimé", "info")
                router.refresh() // Forcer le refresh pour mettre à jour l'affichage
              } else {
                showToast(`Erreur: ${error.error || "Une erreur est survenue"}`, "error")
              }
            }
          } catch (error) {
            showToast("Erreur lors de la suppression", "error")
          } finally {
            setDeletingMovementId(null)
          }
        },
      }
    )
  }

  const handleBilletChange = (denomination: number, quantity: number) => {
    setEditBillets((prev) => ({
      ...prev,
      [denomination]: quantity,
    }))
  }

  // Filtrer les données par coffre
  const filteredMovements = useMemo(() => {
    let list = data.movements
    if (selectedCoffreId) list = list.filter((m) => m.coffreId === selectedCoffreId)
    if (typeFilter) list = list.filter((m) => m.type === typeFilter)

    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter((m) => {
        const hay = [
          m?.coffre?.name,
          m?.user?.name,
          m?.description,
          String(m?.amount ?? ""),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
        return hay.includes(q)
      })
    }

    const min = minAmount.trim() ? Number(minAmount.replace(",", ".")) : null
    const max = maxAmount.trim() ? Number(maxAmount.replace(",", ".")) : null
    if (min !== null && !isNaN(min)) list = list.filter((m) => Number(m.amount) >= min)
    if (max !== null && !isNaN(max)) list = list.filter((m) => Number(m.amount) <= max)

    return list
  }, [data.movements, selectedCoffreId, search, typeFilter, minAmount, maxAmount])

  const filteredInventories = useMemo(() => {
    let list = data.inventories
    if (selectedCoffreId) list = list.filter((inv) => inv.coffreId === selectedCoffreId)

    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter((inv) => {
        const hay = [
          inv?.coffre?.name,
          inv?.notes,
          String(inv?.totalAmount ?? ""),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
        return hay.includes(q)
      })
    }

    const min = minAmount.trim() ? Number(minAmount.replace(",", ".")) : null
    const max = maxAmount.trim() ? Number(maxAmount.replace(",", ".")) : null
    if (min !== null && !isNaN(min)) list = list.filter((inv) => Number(inv.totalAmount) >= min)
    if (max !== null && !isNaN(max)) list = list.filter((inv) => Number(inv.totalAmount) <= max)

    return list
  }, [data.inventories, selectedCoffreId, search, minAmount, maxAmount])

  return (
    <div className="space-y-6">
      {/* Statistiques en haut */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatsCard
          title="Mouvements"
          value={totalMovements}
          icon={<Activity className="h-5 w-5 text-primary" />}
        />
        <StatsCard
          title="Inventaires"
          value={totalInventories}
          icon={<FileText className="h-5 w-5 text-primary" />}
        />
      </div>

      {/* Section Filtres dans une carte PremiumCard */}
      <PremiumCard variant="glass" className="p-5 sm:p-6">
        <div className="space-y-5">
          {/* En-tête des filtres */}
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
              <Filter className="h-4 w-4 text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Filtres de recherche</h2>
          </div>

          {/* Filtres principaux */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {data.coffres.length > 0 && (
              <Select
                label="Coffre"
                placeholder="Tous les coffres"
                selectedKeys={selectedCoffreId ? [selectedCoffreId] : []}
                onSelectionChange={(keys) => {
                  const selected = Array.from(keys)[0] as string
                  setSelectedCoffreId(selected || "")
                }}
                className="w-full"
              >
                {[{ id: "", name: "Tous les coffres" }, ...data.coffres].map((coffre) => (
                  <SelectItem key={coffre.id}>
                    {coffre.name}
                  </SelectItem>
                ))}
              </Select>
            )}
            <Select
              label="Type de mouvement"
              placeholder="Tous"
              selectedKeys={typeFilter ? [typeFilter] : []}
              onSelectionChange={(keys) => {
                const selected = Array.from(keys)[0] as string
                setTypeFilter(selected || "")
              }}
              className="w-full"
              isDisabled={selectedTab !== "movements"}
            >
              <SelectItem key="">Tous</SelectItem>
              <SelectItem key="ENTRY">Entrée</SelectItem>
              <SelectItem key="EXIT">Sortie</SelectItem>
              <SelectItem key="INVENTORY">Inventaire</SelectItem>
            </Select>
            <Input
              label="Montant min (€)"
              placeholder="0"
              value={minAmount}
              onValueChange={setMinAmount}
              className="w-full"
            />
            <Input
              label="Montant max (€)"
              placeholder="1000"
              value={maxAmount}
              onValueChange={setMaxAmount}
              className="w-full"
            />
          </div>

          {/* Recherche globale */}
          <div>
            <Input
              label="Recherche globale"
              placeholder="Coffre, utilisateur, description, montant…"
              value={search}
              onValueChange={setSearch}
              startContent={<Search className="h-4 w-4 text-foreground/40" />}
              className="w-full"
            />
          </div>
        </div>
      </PremiumCard>

      {/* Onglets structurés */}
      <div className="flex justify-center">
        <div className="w-full max-w-2xl">
          <Tabs
            selectedKey={selectedTab}
            onSelectionChange={(key) => setSelectedTab(key as string)}
            aria-label="Historique tabs"
            classNames={{
              base: "w-full",
              tabList: "w-full bg-card/50 backdrop-blur border border-border/60 rounded-2xl p-1",
              tab: "flex-1 data-[selected=true]:bg-primary/10 data-[selected=true]:text-primary",
              tabContent: "group-data-[selected=true]:text-primary",
            }}
          >
            <Tab
              key="movements"
              title={
                <div className="flex items-center gap-2 justify-center">
                  <Activity className="h-4 w-4" />
                  <span>Mouvements ({filteredMovements.length})</span>
                </div>
              }
            />
            <Tab
              key="inventories"
              title={
                <div className="flex items-center gap-2 justify-center">
                  <FileText className="h-4 w-4" />
                  <span>Inventaires ({filteredInventories.length})</span>
                </div>
              }
            />
          </Tabs>
        </div>
      </div>

      {/* Contenu avec effet de coulissement */}
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedTab}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        >
          {selectedTab === "movements" ? (
            <div className="space-y-4">
              {filteredMovements.length === 0 ? (
                <PremiumCard variant="glass" className="p-8">
                  <div className="text-center space-y-3">
                    <div className="inline-flex items-center justify-center p-3 rounded-full bg-foreground/5">
                      <Activity className="h-6 w-6 text-foreground/40" />
                    </div>
                    <p className="text-foreground/60 font-medium">
                      Aucun mouvement enregistré
                    </p>
                    <p className="text-sm text-foreground/40">
                      Les mouvements apparaîtront ici une fois enregistrés
                    </p>
                  </div>
                </PremiumCard>
              ) : (
                filteredMovements.map((movement) => {
                  const isExpanded = expandedItems.has(movement.id)
                  const isEntry = movement.type === "ENTRY"
                  const isExit = movement.type === "EXIT"

                  return (
                    <motion.div
                      key={movement.id}
                      whileHover={{ scale: 1.01 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      className="relative group"
                    >
                      {/* Halo lumineux au survol */}
                      <div className="absolute -inset-0.5 bg-primary/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10" />
                      
                      <PremiumCard variant="glass" hover3D className="overflow-visible">
                        <div className="p-5">
                          {/* Partie haute : En-tête + Description + Boutons */}
                          <div className="flex items-start justify-between gap-4 mb-4">
                            <div className="flex-1 min-w-0">
                              {/* En-tête avec icône et informations principales */}
                              <div className="flex items-center gap-3 mb-3">
                                <div className={`p-2 rounded-lg ${
                                  isEntry 
                                    ? "bg-success/10" 
                                    : isExit 
                                    ? "bg-danger/10" 
                                    : "bg-primary/10"
                                }`}>
                                  {isEntry ? (
                                    <Plus className="h-5 w-5 text-success" />
                                  ) : isExit ? (
                                    <Minus className="h-5 w-5 text-danger" />
                                  ) : (
                                    <FileText className="h-5 w-5 text-primary" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-semibold text-primary">
                                      {movement.coffre.name}
                                    </span>
                                    <span className="text-xs text-foreground/50">
                                      {formatDate(movement.createdAt)}
                                    </span>
                                  </div>
                                  <p className={`text-2xl font-bold mt-1 ${
                                    isEntry ? "text-success" : isExit ? "text-danger" : "text-primary"
                                  }`}>
                                    {isEntry ? "+" : isExit ? "-" : ""}
                                    {formatCurrency(Number(movement.amount))}
                                  </p>
                                </div>
                              </div>

                              {/* Description */}
                              {movement.description && (
                                <p className="text-sm text-foreground/70">
                                  {movement.description}
                                </p>
                              )}

                              {/* Utilisateur */}
                              <p className="text-xs text-foreground/50 mt-2">
                                Par {movement.user.name}
                              </p>
                            </div>

                            {/* Boutons d'action */}
                            <div className="flex gap-2 flex-shrink-0">
                              <Button
                                variant="light"
                                size="sm"
                                isIconOnly
                                onPress={() => handleExportPDF("movement", movement.id)}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              {isAdmin && (
                                <>
                                  <Button
                                    variant="light"
                                    size="sm"
                                    isIconOnly
                                    color="warning"
                                    onPress={() => handleEditMovement(movement)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="light"
                                    size="sm"
                                    isIconOnly
                                    color="danger"
                                    onPress={() => handleDeleteMovement(movement.id)}
                                    isLoading={deletingMovementId === movement.id}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                                      </div>

                          {/* Détails des billets - Prend toute la largeur EN DESSOUS */}
                          {movement.details.length > 0 && (
                            <div className="border-t border-divider pt-4">
                              <div className="flex items-center justify-between mb-3">
                                <p className="text-xs font-semibold text-foreground/70 uppercase tracking-wide">
                                  Détail par billet
                                </p>
                                {movement.details.length > 3 && (
                                      <Button
                                        variant="light"
                                        size="sm"
                                        onPress={() => toggleExpand(movement.id)}
                                    className="text-xs h-6 min-w-0 px-2"
                                      >
                                        {isExpanded ? (
                                          <>
                                            <ChevronUp className="h-3 w-3 mr-1" />
                                        Réduire
                                          </>
                                        ) : (
                                          <>
                                            <ChevronDown className="h-3 w-3 mr-1" />
                                        Voir tout ({movement.details.length})
                                          </>
                                        )}
                                      </Button>
                                )}
                              </div>

                              {/* Grille responsive */}
                              <div className="space-y-2">
                                {(isExpanded || movement.details.length <= 3
                                  ? movement.details
                                  : movement.details.slice(0, 3)
                                ).map((detail: any, index: number) => (
                                        <motion.div
                                              key={detail.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className="bg-default-50 rounded-lg border border-divider p-3 hover:bg-default-100/50 transition-colors"
                                  >
                                    <div className="grid grid-cols-[1fr_auto_auto] gap-3 items-center">
                                      {/* Dénomination */}
                                      <div>
                                        <p className="text-xs text-foreground/60 mb-0.5">Billet</p>
                                        <p className="font-bold text-primary text-base">
                                          {formatCurrency(Number(detail.denomination))}
                                        </p>
                                      </div>
                                      
                                      {/* Quantité */}
                                      <div className="text-center">
                                        <p className="text-xs text-foreground/60 mb-1">Qté</p>
                                        <span className="inline-flex items-center justify-center min-w-[2.5rem] px-2.5 py-1 rounded-md bg-primary/10 text-primary font-bold text-sm">
                                          {detail.quantity}
                                            </span>
                                      </div>
                                      
                                      {/* Sous-total */}
                                      <div className="text-right">
                                        <p className="text-xs text-foreground/60 mb-0.5">Sous-total</p>
                                        <p className="font-bold text-foreground text-base">
                                          {formatCurrency(Number(detail.denomination) * detail.quantity)}
                                        </p>
                                      </div>
                                    </div>
                                        </motion.div>
                                ))}

                                {/* Footer Total */}
                                <div className="bg-default-100 rounded-lg border-2 border-primary/30 p-3">
                                  <div className="grid grid-cols-[1fr_auto_auto] gap-3 items-center">
                                    <div>
                                      <p className="text-xs font-bold text-foreground/80 uppercase">Total</p>
                                    </div>
                                    <div className="text-center">
                                      <p className="text-xs font-bold text-primary">
                                        {movement.details.reduce((sum: number, d: any) => sum + d.quantity, 0)} billets
                                      </p>
                                    </div>
                                    <div className="text-right">
                                      <p className={`font-bold text-xl ${
                                        isEntry ? "text-success" : isExit ? "text-danger" : "text-primary"
                                      }`}>
                                        {formatCurrency(Number(movement.amount))}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </PremiumCard>
                    </motion.div>
                  )
                })
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredInventories.length === 0 ? (
                <PremiumCard variant="glass" className="p-8">
                  <div className="text-center space-y-3">
                    <div className="inline-flex items-center justify-center p-3 rounded-full bg-foreground/5">
                      <FileText className="h-6 w-6 text-foreground/40" />
                    </div>
                    <p className="text-foreground/60 font-medium">
                      Aucun inventaire enregistré
                    </p>
                    <p className="text-sm text-foreground/40">
                      Les inventaires apparaîtront ici une fois enregistrés
                    </p>
                  </div>
                </PremiumCard>
              ) : (
                filteredInventories.map((inventory) => {
                  const isExpanded = expandedItems.has(inventory.id)

                  return (
                    <motion.div
                      key={inventory.id}
                      whileHover={{ scale: 1.01 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      className="relative group"
                    >
                      {/* Halo lumineux au survol */}
                      <div className="absolute -inset-0.5 bg-primary/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10" />
                      
                      <PremiumCard variant="glass" hover3D className="overflow-visible">
                        <div className="p-5">
                          {/* Partie haute : En-tête + Notes + Bouton */}
                          <div className="flex items-start justify-between gap-4 mb-4">
                            <div className="flex-1 min-w-0">
                              {/* En-tête avec icône et informations principales */}
                              <div className="flex items-center gap-3 mb-3">
                                <div className="p-2 rounded-lg bg-primary/10">
                                  <FileText className="h-5 w-5 text-primary" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-semibold text-primary">
                                      {inventory.coffre.name}
                                    </span>
                                    <span className="text-xs text-foreground/50">
                                      {formatDate(inventory.createdAt)}
                                    </span>
                                  </div>
                                  <p className="text-2xl font-bold text-primary mt-1">
                                    {formatCurrency(Number(inventory.totalAmount))}
                                  </p>
                                </div>
                              </div>

                              {/* Notes */}
                              {inventory.notes && (
                                <p className="text-sm text-foreground/70">
                                  {inventory.notes}
                                </p>
                              )}
                            </div>

                            {/* Bouton d'export PDF */}
                            <Button
                              variant="light"
                              size="sm"
                              isIconOnly
                              onPress={() => handleExportPDF("inventory", inventory.id)}
                              className="flex-shrink-0"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>

                          {/* Détails des billets - Prend toute la largeur EN DESSOUS */}
                          {inventory.details.length > 0 && (
                            <div className="border-t border-divider pt-4">
                              <div className="flex items-center justify-between mb-3">
                                <p className="text-xs font-semibold text-foreground/70 uppercase tracking-wide">
                                  Détail par billet
                                </p>
                                {inventory.details.length > 3 && (
                                  <Button
                                    variant="light"
                                    size="sm"
                                    onPress={() => toggleExpand(inventory.id)}
                                    className="text-xs h-6 min-w-0 px-2"
                                  >
                                    {isExpanded ? (
                                      <>
                                        <ChevronUp className="h-3 w-3 mr-1" />
                                        Réduire
                                      </>
                                    ) : (
                                      <>
                                        <ChevronDown className="h-3 w-3 mr-1" />
                                        Voir tout ({inventory.details.length})
                                      </>
                                    )}
                                  </Button>
                                )}
                              </div>

                              {/* Grille responsive */}
                              <div className="space-y-2">
                                {(isExpanded || inventory.details.length <= 3
                                  ? inventory.details
                                  : inventory.details.slice(0, 3)
                                ).map((detail: any, index: number) => (
                                  <motion.div
                                    key={detail.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className="bg-default-50 rounded-lg border border-divider p-3 hover:bg-default-100/50 transition-colors"
                                  >
                                    <div className="grid grid-cols-[1fr_auto_auto] gap-3 items-center">
                                      {/* Dénomination */}
                                      <div>
                                        <p className="text-xs text-foreground/60 mb-0.5">Billet</p>
                                        <p className="font-bold text-primary text-base">
                                          {formatCurrency(Number(detail.denomination))}
                                        </p>
                                      </div>
                                      
                                      {/* Quantité */}
                                      <div className="text-center">
                                        <p className="text-xs text-foreground/60 mb-1">Qté</p>
                                        <span className="inline-flex items-center justify-center min-w-[2.5rem] px-2.5 py-1 rounded-md bg-primary/10 text-primary font-bold text-sm">
                                          {detail.quantity}
                                        </span>
                                      </div>
                                      
                                      {/* Sous-total */}
                                      <div className="text-right">
                                        <p className="text-xs text-foreground/60 mb-0.5">Sous-total</p>
                                        <p className="font-bold text-foreground text-base">
                                          {formatCurrency(Number(detail.denomination) * detail.quantity)}
                                        </p>
                                      </div>
                                    </div>
                                  </motion.div>
                                ))}

                                {/* Footer Total */}
                                <div className="bg-default-100 rounded-lg border-2 border-primary/30 p-3">
                                  <div className="grid grid-cols-[1fr_auto_auto] gap-3 items-center">
                                    <div>
                                      <p className="text-xs font-bold text-foreground/80 uppercase">Total</p>
                                    </div>
                                    <div className="text-center">
                                      <p className="text-xs font-bold text-primary">
                                        {inventory.details.reduce((sum: number, d: any) => sum + d.quantity, 0)} billets
                                      </p>
                                    </div>
                                    <div className="text-right">
                                      <p className="font-bold text-xl text-primary">
                                        {formatCurrency(Number(inventory.totalAmount))}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </PremiumCard>
                    </motion.div>
                  )
                })
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Modal d'édition de mouvement */}
      <Modal isOpen={isOpen} onOpenChange={onClose} size="2xl" scrollBehavior="inside">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                Modifier le mouvement
              </ModalHeader>
              <ModalBody>
                {editingMovement && (
                  <div className="space-y-4">
                    <Select
                      label="Type de mouvement"
                      selectedKeys={[editType]}
                      onSelectionChange={(keys) => {
                        const selected = Array.from(keys)[0] as string
                        setEditType(selected as "ENTRY" | "EXIT")
                      }}
                      className="w-full"
                    >
                      <SelectItem key="ENTRY">Entrée (Ajout)</SelectItem>
                      <SelectItem key="EXIT">Sortie (Retrait)</SelectItem>
                    </Select>

                    <Textarea
                      label="Description (optionnel)"
                      value={editDescription}
                      onValueChange={setEditDescription}
                      placeholder="Ajoutez une description..."
                      minRows={2}
                    />

                    <div>
                      <p className="text-sm font-medium mb-3">Billets</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
                        {BILLET_DENOMINATIONS.map((denomination) => (
                          <BilletInput
                            key={denomination}
                            denomination={denomination}
                            quantity={editBillets[denomination] || 0}
                            onChange={handleBilletChange}
                          />
                        ))}
                      </div>
                      <div className="mt-4 p-3 rounded-lg bg-default-100">
                        <p className="text-sm text-foreground/60 mb-1">Total</p>
                        <p className={`text-xl font-bold ${
                          editType === "ENTRY" ? "text-success" : "text-danger"
                        }`}>
                          {editType === "ENTRY" ? "+" : "-"}
                          {formatCurrency(
                            Object.entries(editBillets).reduce(
                              (sum, [denom, qty]) => sum + parseFloat(denom) * qty,
                              0
                            )
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>
                  Annuler
                </Button>
                <Button
                  color="primary"
                  onPress={() => handleUpdateMovement(onClose)}
                  isLoading={loading}
                >
                  Enregistrer
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Modal de confirmation de suppression */}
      {ConfirmModal}
    </div>
  )
}
