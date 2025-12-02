"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { formatCurrency, formatDate } from "@/lib/utils"
import { FileText, Plus, Minus, Download } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface HistoriqueListProps {
  data: {
    movements: any[]
    inventories: any[]
  }
}

export function HistoriqueList({ data }: HistoriqueListProps) {
  const [selectedItem, setSelectedItem] = useState<string | null>(null)

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
      } else {
        alert("Erreur lors de l'export PDF")
      }
    } catch (error) {
      alert("Erreur lors de l'export PDF")
    }
  }

  return (
    <Tabs defaultValue="movements" className="space-y-4">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="movements">Mouvements</TabsTrigger>
        <TabsTrigger value="inventories">Inventaires</TabsTrigger>
      </TabsList>

      <TabsContent value="movements">
        <Card className="cyber-card">
          <CardHeader>
            <CardTitle>Mouvements de caisse</CardTitle>
          </CardHeader>
          <CardContent>
            {data.movements.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Aucun mouvement enregistré
              </p>
            ) : (
              <div className="space-y-4">
                {data.movements.map((movement) => (
                  <motion.div
                    key={movement.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-lg bg-cyber-dark border border-cyber-gold/20 hover:border-cyber-gold/50 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {movement.type === "ENTRY" ? (
                            <Plus className="h-5 w-5 text-green-400" />
                          ) : movement.type === "EXIT" ? (
                            <Minus className="h-5 w-5 text-red-400" />
                          ) : (
                            <FileText className="h-5 w-5 text-blue-400" />
                          )}
                          <span className="font-semibold text-cyber-gold">
                            {movement.coffre.name}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {formatDate(movement.createdAt)}
                          </span>
                        </div>
                        <p className="text-lg font-bold text-foreground mb-1">
                          {formatCurrency(Number(movement.amount))}
                        </p>
                        {movement.description && (
                          <p className="text-sm text-muted-foreground">
                            {movement.description}
                          </p>
                        )}
                        <div className="mt-2 flex flex-wrap gap-2">
                          {movement.details.map((detail: any) => (
                            <span
                              key={detail.id}
                              className="text-xs px-2 py-1 rounded bg-cyber-dark-lighter border border-cyber-gold/20"
                            >
                              {detail.quantity}x {formatCurrency(Number(detail.denomination))}
                            </span>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          Par {movement.user.name}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleExportPDF("movement", movement.id)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="inventories">
        <Card className="cyber-card">
          <CardHeader>
            <CardTitle>Inventaires</CardTitle>
          </CardHeader>
          <CardContent>
            {data.inventories.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Aucun inventaire enregistré
              </p>
            ) : (
              <div className="space-y-4">
                {data.inventories.map((inventory) => (
                  <motion.div
                    key={inventory.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-lg bg-cyber-dark border border-cyber-gold/20 hover:border-cyber-gold/50 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="h-5 w-5 text-cyber-gold" />
                          <span className="font-semibold text-cyber-gold">
                            {inventory.coffre.name}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {formatDate(inventory.createdAt)}
                          </span>
                        </div>
                        <p className="text-2xl font-bold text-cyber-gold mb-1">
                          {formatCurrency(Number(inventory.totalAmount))}
                        </p>
                        {inventory.notes && (
                          <p className="text-sm text-muted-foreground mt-2">
                            {inventory.notes}
                          </p>
                        )}
                        <div className="mt-2 flex flex-wrap gap-2">
                          {inventory.details.map((detail: any) => (
                            <span
                              key={detail.id}
                              className="text-xs px-2 py-1 rounded bg-cyber-dark-lighter border border-cyber-gold/20"
                            >
                              {detail.quantity}x {formatCurrency(Number(detail.denomination))}
                            </span>
                          ))}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleExportPDF("inventory", inventory.id)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}

