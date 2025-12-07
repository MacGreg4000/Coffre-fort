"use client"

import { useState, useMemo } from "react"
import { Card, CardBody } from "@heroui/react"
import { Button } from "@heroui/react"
import { Tabs, Tab } from "@heroui/react"
import { Select, SelectItem } from "@heroui/react"
import { formatCurrency, formatDate } from "@/lib/utils"
import { FileText, Plus, Minus, Download, ChevronDown, ChevronUp, Activity } from "lucide-react"
import { useToast } from "@/components/ui/toast"
import { motion, AnimatePresence } from "framer-motion"

interface HistoriqueListProps {
  data: {
    movements: any[]
    inventories: any[]
    coffres: any[]
  }
}

export function HistoriqueList({ data }: HistoriqueListProps) {
  const { showToast } = useToast()
  const [selectedTab, setSelectedTab] = useState<string>("movements")
  const [selectedCoffreId, setSelectedCoffreId] = useState<string>("")
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

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

  // Filtrer les données par coffre
  const filteredMovements = useMemo(() => {
    if (!selectedCoffreId) return data.movements
    return data.movements.filter((m) => m.coffreId === selectedCoffreId)
  }, [data.movements, selectedCoffreId])

  const filteredInventories = useMemo(() => {
    if (!selectedCoffreId) return data.inventories
    return data.inventories.filter((inv) => inv.coffreId === selectedCoffreId)
  }, [data.inventories, selectedCoffreId])

  return (
    <div className="space-y-6">
      {/* Filtre par coffre */}
      {data.coffres.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <Select
            label="Filtrer par coffre"
            selectedKeys={selectedCoffreId ? [selectedCoffreId] : []}
            onSelectionChange={(keys) => {
              const selected = Array.from(keys)[0] as string
              setSelectedCoffreId(selected || "")
            }}
            className="w-full sm:w-64"
          >
            {[
              <SelectItem key="">
                Tous les coffres
              </SelectItem>,
              ...data.coffres.map((coffre) => (
                <SelectItem key={coffre.id}>
                  {coffre.name}
                </SelectItem>
              )),
            ]}
          </Select>
        </div>
      )}

      {/* Onglets centrés avec effet de coulissement */}
      <div className="flex justify-center">
        <Tabs
          selectedKey={selectedTab}
          onSelectionChange={(key) => setSelectedTab(key as string)}
          aria-label="Historique tabs"
          classNames={{
            base: "w-full max-w-md",
            tabList: "w-full",
            tab: "flex-1",
          }}
        >
          <Tab
            key="movements"
            title={
              <div className="flex items-center gap-2 justify-center">
                <Activity className="h-4 w-4" />
                <span>Mouvements</span>
              </div>
            }
          />
          <Tab
            key="inventories"
            title={
              <div className="flex items-center gap-2 justify-center">
                <FileText className="h-4 w-4" />
                <span>Inventaires</span>
              </div>
            }
          />
        </Tabs>
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
                <Card className="bg-gradient-to-br from-default-100 to-default-50 border-divider border">
                  <CardBody className="p-8">
                    <p className="text-foreground/60 text-center">
                      Aucun mouvement enregistré
                    </p>
                  </CardBody>
                </Card>
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
                      
                      <Card className="bg-gradient-to-br from-default-100 to-default-50 border-divider border">
                        <CardBody className="p-5">
                          <div className="flex items-start justify-between gap-4">
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
                                <p className="text-sm text-foreground/70 mb-3">
                                  {movement.description}
                                </p>
                              )}

                              {/* Détails des billets (toujours visibles si peu nombreux, sinon expandable) */}
                              {movement.details.length > 0 && (
                                <div>
                                  {movement.details.length <= 3 ? (
                                    <div className="flex flex-wrap gap-2">
                                      {movement.details.map((detail: any) => (
                                        <span
                                          key={detail.id}
                                          className="text-xs px-2.5 py-1 rounded-lg bg-default-200 border border-divider text-foreground/80"
                                        >
                                          {detail.quantity}x {formatCurrency(Number(detail.denomination))}
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <>
                                      <div className="flex flex-wrap gap-2 mb-2">
                                        {movement.details.slice(0, 3).map((detail: any) => (
                                          <span
                                            key={detail.id}
                                            className="text-xs px-2.5 py-1 rounded-lg bg-default-200 border border-divider text-foreground/80"
                                          >
                                            {detail.quantity}x {formatCurrency(Number(detail.denomination))}
                                          </span>
                                        ))}
                                      </div>
                                      <Button
                                        variant="light"
                                        size="sm"
                                        onPress={() => toggleExpand(movement.id)}
                                        className="text-xs"
                                      >
                                        {isExpanded ? (
                                          <>
                                            <ChevronUp className="h-3 w-3 mr-1" />
                                            Voir moins
                                          </>
                                        ) : (
                                          <>
                                            <ChevronDown className="h-3 w-3 mr-1" />
                                            Voir {movement.details.length - 3} billets supplémentaires
                                          </>
                                        )}
                                      </Button>
                                      {isExpanded && (
                                        <motion.div
                                          initial={{ opacity: 0, height: 0 }}
                                          animate={{ opacity: 1, height: "auto" }}
                                          exit={{ opacity: 0, height: 0 }}
                                          className="mt-2 flex flex-wrap gap-2"
                                        >
                                          {movement.details.slice(3).map((detail: any) => (
                                            <span
                                              key={detail.id}
                                              className="text-xs px-2.5 py-1 rounded-lg bg-default-200 border border-divider text-foreground/80"
                                            >
                                              {detail.quantity}x {formatCurrency(Number(detail.denomination))}
                                            </span>
                                          ))}
                                        </motion.div>
                                      )}
                                    </>
                                  )}
                                </div>
                              )}

                              {/* Utilisateur */}
                              <p className="text-xs text-foreground/50 mt-3">
                                Par {movement.user.name}
                              </p>
                            </div>

                            {/* Bouton d'export PDF */}
                            <Button
                              variant="light"
                              size="sm"
                              isIconOnly
                              onPress={() => handleExportPDF("movement", movement.id)}
                              className="flex-shrink-0"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardBody>
                      </Card>
                    </motion.div>
                  )
                })
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredInventories.length === 0 ? (
                <Card className="bg-gradient-to-br from-default-100 to-default-50 border-divider border">
                  <CardBody className="p-8">
                    <p className="text-foreground/60 text-center">
                      Aucun inventaire enregistré
                    </p>
                  </CardBody>
                </Card>
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
                      
                      <Card className="bg-gradient-to-br from-default-100 to-default-50 border-divider border">
                        <CardBody className="p-5">
                          <div className="flex items-start justify-between gap-4">
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
                                <p className="text-sm text-foreground/70 mb-3">
                                  {inventory.notes}
                                </p>
                              )}

                              {/* Détails des billets */}
                              {inventory.details.length > 0 && (
                                <div>
                                  {inventory.details.length <= 3 ? (
                                    <div className="flex flex-wrap gap-2">
                                      {inventory.details.map((detail: any) => (
                                        <span
                                          key={detail.id}
                                          className="text-xs px-2.5 py-1 rounded-lg bg-default-200 border border-divider text-foreground/80"
                                        >
                                          {detail.quantity}x {formatCurrency(Number(detail.denomination))}
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <>
                                      <div className="flex flex-wrap gap-2 mb-2">
                                        {inventory.details.slice(0, 3).map((detail: any) => (
                                          <span
                                            key={detail.id}
                                            className="text-xs px-2.5 py-1 rounded-lg bg-default-200 border border-divider text-foreground/80"
                                          >
                                            {detail.quantity}x {formatCurrency(Number(detail.denomination))}
                                          </span>
                                        ))}
                                      </div>
                                      <Button
                                        variant="light"
                                        size="sm"
                                        onPress={() => toggleExpand(inventory.id)}
                                        className="text-xs"
                                      >
                                        {isExpanded ? (
                                          <>
                                            <ChevronUp className="h-3 w-3 mr-1" />
                                            Voir moins
                                          </>
                                        ) : (
                                          <>
                                            <ChevronDown className="h-3 w-3 mr-1" />
                                            Voir {inventory.details.length - 3} billets supplémentaires
                                          </>
                                        )}
                                      </Button>
                                      {isExpanded && (
                                        <motion.div
                                          initial={{ opacity: 0, height: 0 }}
                                          animate={{ opacity: 1, height: "auto" }}
                                          exit={{ opacity: 0, height: 0 }}
                                          className="mt-2 flex flex-wrap gap-2"
                                        >
                                          {inventory.details.slice(3).map((detail: any) => (
                                            <span
                                              key={detail.id}
                                              className="text-xs px-2.5 py-1 rounded-lg bg-default-200 border border-divider text-foreground/80"
                                            >
                                              {detail.quantity}x {formatCurrency(Number(detail.denomination))}
                                            </span>
                                          ))}
                                        </motion.div>
                                      )}
                                    </>
                                  )}
                                </div>
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
                        </CardBody>
                      </Card>
                    </motion.div>
                  )
                })
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
