"use client"

import { useState, useEffect } from "react"
import { Tabs, Tab } from "@heroui/react"
import { CaisseInterface } from "./CaisseInterface"
import { HistoriqueList } from "@/components/historique/HistoriqueList"
import { Wallet, History } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

interface CaisseInterfaceFusionneeProps {
  coffres: any[]
  userId: string
  historiqueData: {
    movements: any[]
    inventories: any[]
    coffres: any[]
  }
  defaultTab?: string
}

export function CaisseInterfaceFusionnee({ 
  coffres, 
  userId, 
  historiqueData,
  defaultTab = "encodage"
}: CaisseInterfaceFusionneeProps) {
  const [selectedTab, setSelectedTab] = useState<string>(defaultTab)

  // Mettre à jour l'onglet si defaultTab change (pour la navigation)
  useEffect(() => {
    setSelectedTab(defaultTab)
  }, [defaultTab])

  return (
    <div className="space-y-6">
      {/* Onglets principaux pour Encodage / Historique */}
      <div className="flex justify-center">
        <Tabs
          selectedKey={selectedTab}
          onSelectionChange={(key) => setSelectedTab(key as string)}
          aria-label="Caisse et historique"
          classNames={{
            base: "w-full max-w-xl",
            tabList: "w-full",
            tab: "flex-1",
          }}
        >
          <Tab
            key="encodage"
            title={
              <div className="flex items-center gap-2 justify-center">
                <Wallet className="h-4 w-4" />
                <span>Encodage</span>
              </div>
            }
          />
          <Tab
            key="historique"
            title={
              <div className="flex items-center gap-2 justify-center">
                <History className="h-4 w-4" />
                <span>Historique</span>
              </div>
            }
          />
        </Tabs>
      </div>

      {/* Contenu avec effet de coulissement */}
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
        >
          {selectedTab === "encodage" ? (
            <CaisseInterface coffres={coffres} userId={userId} />
          ) : (
            <HistoriqueList data={historiqueData} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
