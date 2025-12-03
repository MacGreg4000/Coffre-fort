"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { formatCurrency } from "@/lib/utils"

interface DashboardChartsProps {
  data: {
    movements: any[]
    statsByCoffre: any[]
    recentInventories?: any[]
  }
}

const COLORS = ["#FFD700", "#FFA500", "#00FFFF", "#FF6B6B", "#4ECDC4", "#95E1D3"]

export function DashboardCharts({ data }: DashboardChartsProps) {
  // Préparer les données pour le graphique linéaire (évolution dans le temps)
  // Combiner les mouvements et les inventaires
  const dailyData: any = {}
  const recentInventories = data.recentInventories || []

  // Ajouter les mouvements
  data.movements.forEach((movement: any) => {
    const date = new Date(movement.createdAt).toLocaleDateString("fr-FR")
    if (!dailyData[date]) {
      dailyData[date] = { date, entries: 0, exits: 0, inventory: null }
    }
    if (movement.type === "ENTRY") {
      dailyData[date].entries += Number(movement.amount)
    } else if (movement.type === "EXIT") {
      dailyData[date].exits += Number(movement.amount)
    }
  })

  // Ajouter les inventaires récents
  if (recentInventories.length > 0) {
    recentInventories.forEach((inventory: any) => {
      const date = new Date(inventory.createdAt).toLocaleDateString("fr-FR")
      if (!dailyData[date]) {
        dailyData[date] = { date, entries: 0, exits: 0, inventory: null }
      }
      // Stocker le montant de l'inventaire pour cette date
      dailyData[date].inventory = Number(inventory.totalAmount)
    })
  }

  const lineData = Object.values(dailyData).sort((a: any, b: any) => {
    // Trier par date
    const dateA = new Date(a.date.split("/").reverse().join("-"))
    const dateB = new Date(b.date.split("/").reverse().join("-"))
    return dateA.getTime() - dateB.getTime()
  })

  // Préparer les données pour le graphique en camembert (par coffre)
  // Combiner les mouvements et les inventaires
  const pieDataMap = new Map<string, number>()

  // Ajouter les mouvements
  data.statsByCoffre.forEach((stat: any) => {
    const existing = pieDataMap.get(stat.coffreName) || 0
    pieDataMap.set(stat.coffreName, existing + stat.amount)
  })

  // Ajouter les inventaires récents si disponibles
  if (recentInventories.length > 0) {
    recentInventories.forEach((inventory: any) => {
      const coffreName = inventory.coffre?.name || "Inconnu"
      const existing = pieDataMap.get(coffreName) || 0
      // Ajouter le montant de l'inventaire (on prend le dernier inventaire par coffre)
      const lastInventory = recentInventories
        .filter((inv: any) => inv.coffre?.name === coffreName)
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
      if (lastInventory) {
        pieDataMap.set(coffreName, Math.max(existing, Number(lastInventory.totalAmount)))
      }
    })
  }

  const pieData = Array.from(pieDataMap.entries()).map(([name, value]) => ({
    name,
    value,
  }))

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-cyber-dark-lighter border border-blue-500/15 rounded-lg p-3 shadow-sm">
          <p className="text-blue-400 font-semibold mb-2">
            {data.date || payload[0].name}
          </p>
          {payload.map((entry: any, index: number) => {
            // Ne pas afficher les valeurs null/undefined
            if (entry.value == null) return null
            return (
              <p key={index} className="text-foreground" style={{ color: entry.color }}>
                {entry.name}: {formatCurrency(entry.value)}
              </p>
            )
          })}
        </div>
      )
    }
    return null
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
      {/* Graphique linéaire - Évolution */}
      <Card className="cyber-card">
        <CardHeader>
          <CardTitle>Évolution mensuelle</CardTitle>
        </CardHeader>
        <CardContent>
          {lineData.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Aucune donnée disponible
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis
                  dataKey="date"
                  stroke="#3B82F6"
                  style={{ fontSize: "12px" }}
                />
                <YAxis stroke="#3B82F6" style={{ fontSize: "12px" }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="entries"
                  stroke="#4ECDC4"
                  strokeWidth={2}
                  name="Entrées"
                  dot={{ fill: "#4ECDC4", r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="exits"
                  stroke="#FF6B6B"
                  strokeWidth={2}
                  name="Sorties"
                  dot={{ fill: "#FF6B6B", r: 4 }}
                />
                {lineData.some((d: any) => d.inventory !== null) && (
                  <Line
                    type="monotone"
                    dataKey="inventory"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    name="Inventaire"
                    dot={{ fill: "#3B82F6", r: 5 }}
                    strokeDasharray="5 5"
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Graphique en camembert - Répartition par coffre */}
      <Card className="cyber-card">
        <CardHeader>
          <CardTitle>Répartition par coffre</CardTitle>
        </CardHeader>
        <CardContent>
          {pieData.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Aucune donnée disponible
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name}: ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry: any, index: number) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: "#1a1a1a",
                    border: "1px solid rgba(59, 130, 246, 0.3)",
                    borderRadius: "8px",
                    color: "#3B82F6",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

