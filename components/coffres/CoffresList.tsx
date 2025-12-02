"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { formatCurrency, formatDate } from "@/lib/utils"
import { Wallet, TrendingUp, FileText, Users, Plus, ArrowRight } from "lucide-react"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface CoffresListProps {
  coffres: any[]
  userId: string
  isAdmin: boolean
}

export function CoffresList({ coffres, userId, isAdmin }: CoffresListProps) {
  const router = useRouter()

  if (coffres.length === 0) {
    return (
      <Card className="cyber-card">
        <CardContent className="py-12 text-center">
          <Wallet className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-semibold text-cyber-gold mb-2">
            Aucun coffre disponible
          </h3>
          <p className="text-muted-foreground mb-6">
            {isAdmin
              ? "Créez votre premier coffre depuis la page d'administration"
              : "Contactez un administrateur pour être ajouté à un coffre"}
          </p>
          {isAdmin && (
            <Link href="/admin">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Aller à l'administration
              </Button>
            </Link>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
      {coffres.map((coffre) => (
        <motion.div
          key={coffre.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ scale: 1.02 }}
          className="h-full"
        >
          <Card className="cyber-card h-full flex flex-col hover:glow-gold transition-all cursor-pointer"
                onClick={() => router.push(`/caisse?coffre=${coffre.id}`)}>
            <CardHeader>
              <div className="flex items-start justify-between mb-2">
                <CardTitle className="text-cyber-gold flex items-center gap-2">
                  <Wallet className="h-5 w-5" />
                  {coffre.name}
                </CardTitle>
                <span
                  className={`px-2 py-1 rounded text-xs font-semibold ${
                    coffre.role === "OWNER"
                      ? "bg-cyber-gold/20 text-cyber-gold"
                      : coffre.role === "MANAGER"
                      ? "bg-blue-400/20 text-blue-400"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {coffre.role === "OWNER"
                    ? "Propriétaire"
                    : coffre.role === "MANAGER"
                    ? "Gestionnaire"
                    : "Membre"}
                </span>
              </div>
              {coffre.description && (
                <p className="text-sm text-muted-foreground mt-2">
                  {coffre.description}
                </p>
              )}
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              {/* Solde actuel */}
              <div className="mb-4 p-4 rounded-lg bg-cyber-dark border border-cyber-gold/30">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Solde actuel</span>
                  <span className="text-xl font-bold text-cyber-gold">
                    {coffre.lastInventory
                      ? formatCurrency(Number(coffre.lastInventory.totalAmount))
                      : "N/A"}
                  </span>
                </div>
                {coffre.lastInventory && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Dernier inventaire: {formatDate(coffre.lastInventory.createdAt)}
                  </p>
                )}
              </div>

              {/* Statistiques */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-3 rounded-lg bg-cyber-dark/50 border border-cyber-gold/10">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="h-4 w-4 text-green-400" />
                    <span className="text-xs text-muted-foreground">Mouvements</span>
                  </div>
                  <p className="text-lg font-bold text-foreground">
                    {coffre._count.movements}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-cyber-dark/50 border border-cyber-gold/10">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="h-4 w-4 text-blue-400" />
                    <span className="text-xs text-muted-foreground">Inventaires</span>
                  </div>
                  <p className="text-lg font-bold text-foreground">
                    {coffre._count.inventories}
                  </p>
                </div>
              </div>

              {/* Membres */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-semibold text-foreground">
                    Membres ({coffre.members.length})
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {coffre.members.slice(0, 3).map((member: any) => (
                    <span
                      key={member.id}
                      className="text-xs px-2 py-1 rounded bg-cyber-dark border border-cyber-gold/20"
                    >
                      {member.user.name}
                    </span>
                  ))}
                  {coffre.members.length > 3 && (
                    <span className="text-xs px-2 py-1 rounded bg-cyber-dark border border-cyber-gold/20 text-muted-foreground">
                      +{coffre.members.length - 3}
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="mt-auto pt-4 border-t border-cyber-gold/20">
                <Link href={`/caisse?coffre=${coffre.id}`}>
                  <Button variant="outline" className="w-full">
                    Accéder au coffre
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  )
}

