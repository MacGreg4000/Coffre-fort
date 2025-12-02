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
  }
}

const COLORS = ["#FFD700", "#FFA500", "#00FFFF", "#FF6B6B", "#4ECDC4", "#95E1D3"]

export function DashboardCharts({ data }: DashboardChartsProps) {
  // Préparer les données pour le graphique linéaire (évolution dans le temps)
  const dailyData = data.movements.reduce((acc: any, movement: any) => {
    const date = new Date(movement.createdAt).toLocaleDateString("fr-FR")
    if (!acc[date]) {
      acc[date] = { date, entries: 0, exits: 0 }
    }
    if (movement.type === "ENTRY") {
      acc[date].entries += Number(movement.amount)
    } else if (movement.type === "EXIT") {
      acc[date].exits += Number(movement.amount)
    }
    return acc
  }, {})

  const lineData = Object.values(dailyData).sort((a: any, b: any) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  // Préparer les données pour le graphique en camembert (par coffre)
  const pieData = data.statsByCoffre.reduce((acc: any, stat: any) => {
    const existing = acc.find((item: any) => item.name === stat.coffreName)
    if (existing) {
      existing.value += stat.amount
    } else {
      acc.push({ name: stat.coffreName, value: stat.amount })
    }
    return acc
  }, [])

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-cyber-dark-lighter border border-blue-500/15 rounded-lg p-3 shadow-sm">
          <p className="text-blue-400 font-semibold">{payload[0].payload.date || payload[0].name}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-foreground" style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
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

