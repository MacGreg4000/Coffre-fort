"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { DashboardStats } from "./DashboardStats"
import { Skeleton, SkeletonStats } from "@/components/ui/skeleton"
import { PremiumCard } from "@/components/ui/premium-card"
import { formatCurrency } from "@/lib/utils"
import { Wallet, LayoutDashboard, Calculator, KeyRound, Boxes } from "lucide-react"
import { motion } from "framer-motion"
import { ReservesSummary } from "@/components/reserves/ReservesSummary"
import { AssetsStats } from "@/components/dashboard/AssetsStats"
import { PasswordFilesStats } from "@/components/dashboard/PasswordFilesStats"
import { Select, SelectItem } from "@/components/ui/select-heroui"

interface DashboardClientProps {
  initialCoffres: any[]
}

interface DashboardData {
  movements: any[]
  totalEntries: number
  totalExits: number
  inventories: any[]
  recentInventories: any[]
  statsByCoffre: any[]
  coffres: any[]
  monthlyActivity?: any[]
  billDistribution?: any[]
}

interface CoffreBalance {
  coffreId: string
  coffreName: string
  balance: number
}

export function DashboardClient({ initialCoffres }: DashboardClientProps) {
  const [selectedTab, setSelectedTab] = useState<string>("overview")
  const [selectedCoffreId, setSelectedCoffreId] = useState<string>("") // "" = tous
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [coffresBalances, setCoffresBalances] = useState<CoffreBalance[]>([])

  useEffect(() => {
    if (selectedTab === "overview") {
      fetchDashboardData(selectedCoffreId)
    }
  }, [selectedTab, selectedCoffreId])

  // Charger les balances de tous les coffres
  useEffect(() => {
    if (initialCoffres.length > 0) {
      Promise.all(
        initialCoffres.map(async (coffre) => {
          try {
            const res = await fetch(`/api/coffres/balance?coffreId=${coffre.id}`)
            if (res.ok) {
              const data = await res.json()
              const balance = data.balance || 0
              return {
                coffreId: coffre.id,
                coffreName: coffre.name,
                balance: balance,
              }
            } else {
              const errorData = await res.json().catch(() => ({}))
              console.error(`Erreur API pour ${coffre.name} (${res.status}):`, errorData)
              return {
                coffreId: coffre.id,
                coffreName: coffre.name,
                balance: 0,
              }
            }
          } catch (error) {
            console.error(`Erreur fetch pour ${coffre.name}:`, error)
            return {
              coffreId: coffre.id,
              coffreName: coffre.name,
              balance: 0,
            }
          }
        })
      ).then(setCoffresBalances)
    }
  }, [initialCoffres])

  const fetchDashboardData = async (coffreId: string) => {
    setLoading(true)
    try {
      const url = coffreId
        ? `/api/dashboard?coffreId=${coffreId}`
        : "/api/dashboard"
      const response = await fetch(url)
      if (response.ok) {
        const dashboardData = await response.json()
        setData(dashboardData)
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error("Erreur récupération dashboard:", response.status, errorData)
        setData(null)
      }
    } catch (error) {
      console.error("Erreur récupération dashboard:", error)
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  const totalBalance = coffresBalances.reduce((sum, cb) => sum + cb.balance, 0)

  if (loading && !data && selectedTab === "overview") {
    return (
      <div className="space-y-8">
        <div className="space-y-3">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-6 w-96 max-w-full" />
        </div>
        <SkeletonStats />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Hero header */}
      <div className="space-y-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          <LayoutDashboard className="h-4 w-4" />
          Vue d&apos;ensemble
        </div>
        <h1 className="text-2xl sm:text-3xl font-semibold text-foreground">
          Dashboard financier
        </h1>
        <p className="text-foreground/70">
          Visualisez vos coffres, balances et réserves avec une interface fluide et responsive.
        </p>
      </div>

      {/* Onglets - Centrés et mis en valeur */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex justify-center w-full mb-6"
        >
          <div className="glass-effect rounded-3xl p-2 sm:p-4 border-2 border-primary/40 shadow-lg backdrop-blur-md bg-card/80 w-full overflow-hidden">
            <div className="overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <div className="flex justify-center min-w-max mx-auto px-2 sm:px-4">
                <TabsList className="inline-flex justify-center gap-1">
              <TabsTrigger value="overview" className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold flex-shrink-0">
                <LayoutDashboard className="h-4 w-4" />
                Cash
              </TabsTrigger>
              <TabsTrigger value="reserves" className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold flex-shrink-0">
                <Calculator className="h-4 w-4" />
                Réserves
              </TabsTrigger>
              <TabsTrigger value="assets" className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold flex-shrink-0">
                <Boxes className="h-4 w-4" />
                Actifs
              </TabsTrigger>
              <TabsTrigger value="passwords" className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold flex-shrink-0">
                <KeyRound className="h-4 w-4" />
                Fichiers MDP
              </TabsTrigger>
                </TabsList>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Contenu : Vue */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          {/* Sélecteur coffre */}
          {initialCoffres.length > 0 && (
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <Select
                label="Filtrer par coffre"
                placeholder="Tous les coffres"
                selectedKeys={selectedCoffreId ? [selectedCoffreId] : []}
                onSelectionChange={(keys) => {
                  const selected = Array.from(keys)[0] as string
                  setSelectedCoffreId(selected || "")
                }}
                className="w-full sm:w-80"
                items={[{ id: "", name: "Tous les coffres" }, ...initialCoffres]}
              >
                {(item: any) => (
                  <SelectItem key={item.id}>{item.name}</SelectItem>
                )}
              </Select>
              <p className="text-xs text-foreground/60">
                Astuce: passe en &quot;Tous les coffres&quot; pour une vue globale, ou sélectionne un coffre pour analyser un seul flux.
              </p>
            </div>
          )}

          {coffresBalances.length > 0 && (
            <PremiumCard
              variant="gradient"
              hover3D
              glow
              shimmer
              className="overflow-visible"
            >
              <div className="p-5 sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <motion.div 
                      className="p-3 rounded-xl bg-primary/20 border border-primary/30 backdrop-blur"
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      transition={{ type: "spring", stiffness: 400, damping: 15 }}
                    >
                      <Wallet className="h-5 w-5 text-primary" />
                    </motion.div>
                    <div>
                      <p className="text-xs text-foreground/60 mb-1 font-medium">Montant total</p>
                      <motion.p 
                        className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 200, damping: 15 }}
                      >
                        {formatCurrency(totalBalance)}
                      </motion.p>
                      <p className="text-xs text-foreground/50 flex items-center gap-1.5 mt-0.5">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                        {coffresBalances.length} coffre{coffresBalances.length > 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  {coffresBalances.length > 1 && (
                    <div className="text-right text-xs text-foreground/60 space-y-1.5">
                      {coffresBalances.map((cb, index) => (
                        <motion.div 
                          key={cb.coffreId} 
                          className="flex items-center gap-2 justify-end"
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                        >
                          <span className="text-foreground/70">{cb.coffreName}:</span>
                          <span className="font-bold text-primary">{formatCurrency(cb.balance)}</span>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </PremiumCard>
          )}
          {!loading && data && <DashboardStats data={data} />}
        </TabsContent>

        {/* Contenu : Réserves de liquidation */}
        <TabsContent value="reserves" className="space-y-6 mt-6">
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                <Calculator className="h-5 w-5 text-primary" />
                Réserves de Liquidation
              </h2>
              <p className="text-muted-foreground mt-2">
                Vue d&apos;ensemble des réserves que vous pouvez vous libérer depuis votre société
              </p>
            </div>
            <ReservesSummary />
          </div>
        </TabsContent>

        {/* Contenu : Actifs */}
        <TabsContent value="assets" className="space-y-6 mt-6">
          <AssetsStats />
        </TabsContent>

        {/* Contenu : Fichiers gestionnaire de mots de passe */}
        <TabsContent value="passwords" className="space-y-6 mt-6">
          <PasswordFilesStats />
        </TabsContent>
      </Tabs>
    </div>
  )
}
