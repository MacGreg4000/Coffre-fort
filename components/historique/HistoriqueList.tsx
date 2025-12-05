"use client"

import { useState } from "react"
import { Card, CardHeader, CardBody } from "@heroui/react"
import { Button } from "@heroui/react"
import { Tabs, Tab } from "@heroui/react"
import { formatCurrency, formatDate } from "@/lib/utils"
import { FileText, Plus, Minus, Download } from "lucide-react"
import { useToast } from "@/components/ui/toast"

interface HistoriqueListProps {
  data: {
    movements: any[]
    inventories: any[]
  }
}

export function HistoriqueList({ data }: HistoriqueListProps) {
  const { showToast } = useToast()

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

  return (
    <Tabs aria-label="Historique tabs" defaultSelectedKey="movements">
      <Tab
        key="movements"
        title="Mouvements"
      >
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Mouvements de caisse</h3>
          </CardHeader>
          <CardBody>
            {data.movements.length === 0 ? (
              <p className="text-foreground/60 text-center py-8">
                Aucun mouvement enregistré
              </p>
            ) : (
              <div className="space-y-4">
                {data.movements.map((movement) => (
                  <Card key={movement.id} className="bg-default-100">
                    <CardBody>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {movement.type === "ENTRY" ? (
                              <Plus className="h-5 w-5 text-success" />
                            ) : movement.type === "EXIT" ? (
                              <Minus className="h-5 w-5 text-danger" />
                            ) : (
                              <FileText className="h-5 w-5 text-primary" />
                            )}
                            <span className="font-semibold text-primary">
                              {movement.coffre.name}
                            </span>
                            <span className="text-sm text-foreground/60">
                              {formatDate(movement.createdAt)}
                            </span>
                          </div>
                          <p className="text-lg font-bold text-foreground mb-1">
                            {formatCurrency(Number(movement.amount))}
                          </p>
                          {movement.description && (
                            <p className="text-sm text-foreground/60">
                              {movement.description}
                            </p>
                          )}
                          <div className="mt-2 flex flex-wrap gap-2">
                            {movement.details.map((detail: any) => (
                              <span
                                key={detail.id}
                                className="text-xs px-2 py-1 rounded bg-default-200 border border-divider"
                              >
                                {detail.quantity}x {formatCurrency(Number(detail.denomination))}
                              </span>
                            ))}
                          </div>
                          <p className="text-xs text-foreground/50 mt-2">
                            Par {movement.user.name}
                          </p>
                        </div>
                        <Button
                          variant="light"
                          size="sm"
                          isIconOnly
                          onPress={() => handleExportPDF("movement", movement.id)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardBody>
                  </Card>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </Tab>

      <Tab
        key="inventories"
        title="Inventaires"
      >
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Inventaires</h3>
          </CardHeader>
          <CardBody>
            {data.inventories.length === 0 ? (
              <p className="text-foreground/60 text-center py-8">
                Aucun inventaire enregistré
              </p>
            ) : (
              <div className="space-y-4">
                {data.inventories.map((inventory) => (
                  <Card key={inventory.id} className="bg-default-100">
                    <CardBody>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <FileText className="h-5 w-5 text-primary" />
                            <span className="font-semibold text-primary">
                              {inventory.coffre.name}
                            </span>
                            <span className="text-sm text-foreground/60">
                              {formatDate(inventory.createdAt)}
                            </span>
                          </div>
                          <p className="text-2xl font-bold text-primary mb-1">
                            {formatCurrency(Number(inventory.totalAmount))}
                          </p>
                          {inventory.notes && (
                            <p className="text-sm text-foreground/60 mt-2">
                              {inventory.notes}
                            </p>
                          )}
                          <div className="mt-2 flex flex-wrap gap-2">
                            {inventory.details.map((detail: any) => (
                              <span
                                key={detail.id}
                                className="text-xs px-2 py-1 rounded bg-default-200 border border-divider"
                              >
                                {detail.quantity}x {formatCurrency(Number(detail.denomination))}
                              </span>
                            ))}
                          </div>
                        </div>
                        <Button
                          variant="light"
                          size="sm"
                          isIconOnly
                          onPress={() => handleExportPDF("inventory", inventory.id)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardBody>
                  </Card>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </Tab>
    </Tabs>
  )
}
