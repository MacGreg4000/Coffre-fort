"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { UserPlus, Wallet, Trash2, Edit, Save, Loader2, Plus } from "lucide-react"
import { useRouter } from "next/navigation"

interface AdminPanelProps {
  data: {
    users: any[]
    coffres: any[]
  }
}

export function AdminPanel({ data }: AdminPanelProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  const handleCreateUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading("create-user")
    const formData = new FormData(e.currentTarget)
    
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.get("email"),
          password: formData.get("password"),
          name: formData.get("name"),
          role: formData.get("role"),
        }),
      })

      if (response.ok) {
        router.refresh()
        e.currentTarget.reset()
        alert("Utilisateur créé avec succès!")
      } else {
        const error = await response.json()
        alert(`Erreur: ${error.message}`)
      }
    } catch (error) {
      alert("Erreur lors de la création")
    } finally {
      setLoading(null)
    }
  }

  const handleCreateCoffre = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading("create-coffre")
    const formData = new FormData(e.currentTarget)
    
    try {
      const response = await fetch("/api/admin/coffres", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          description: formData.get("description"),
        }),
      })

      if (response.ok) {
        router.refresh()
        e.currentTarget.reset()
        alert("Coffre créé avec succès!")
      } else {
        const error = await response.json()
        alert(`Erreur: ${error.message}`)
      }
    } catch (error) {
      alert("Erreur lors de la création")
    } finally {
      setLoading(null)
    }
  }

  const handleAddMember = async (coffreId: string, userId: string, role: string) => {
    setLoading(`add-member-${coffreId}`)
    try {
      const response = await fetch("/api/admin/coffres/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coffreId, userId, role }),
      })

      if (response.ok) {
        router.refresh()
        alert("Membre ajouté avec succès!")
      } else {
        const error = await response.json()
        alert(`Erreur: ${error.message}`)
      }
    } catch (error) {
      alert("Erreur lors de l'ajout")
    } finally {
      setLoading(null)
    }
  }

  return (
    <Tabs defaultValue="users" className="space-y-4">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="users">Utilisateurs</TabsTrigger>
        <TabsTrigger value="coffres">Coffres</TabsTrigger>
      </TabsList>

      <TabsContent value="users">
        <div className="space-y-6">
          <Card className="cyber-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Créer un utilisateur
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nom</Label>
                    <Input id="name" name="name" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" name="email" type="email" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Mot de passe</Label>
                    <Input id="password" name="password" type="password" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Rôle</Label>
                    <Select
                      id="role"
                      name="role"
                      required
                    >
                      <option value="USER">Utilisateur</option>
                      <option value="MANAGER">Gestionnaire</option>
                      <option value="ADMIN">Administrateur</option>
                    </Select>
                  </div>
                </div>
                <Button type="submit" disabled={loading === "create-user"}>
                  {loading === "create-user" ? "Création..." : "Créer"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="cyber-card">
            <CardHeader>
              <CardTitle>Liste des utilisateurs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.users.map((user) => (
                  <motion.div
                    key={user.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-4 rounded-lg bg-cyber-dark border border-blue-500/10 hover:border-blue-500/20 transition-all hover:scale-[1.02]"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-blue-400">{user.name}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Rôle: {user.role} | Coffres: {user.coffreMembers.length}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            user.isActive
                              ? "bg-green-400/20 text-green-400"
                              : "bg-red-400/20 text-red-400"
                          }`}
                        >
                          {user.isActive ? "Actif" : "Inactif"}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="coffres">
        <div className="space-y-6">
          <Card className="cyber-card border-2 border-blue-500/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-400">
                <Wallet className="h-5 w-5" />
                Créer un nouveau coffre
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                Ajoutez un nouveau coffre pour organiser vos fonds de caisse
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateCoffre} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="coffre-name" className="text-foreground font-semibold">
                    Nom du coffre *
                  </Label>
                  <Input 
                    id="coffre-name" 
                    name="name" 
                    required 
                    placeholder="Ex: Caisse principale, Caisse secondaire..."
                    className="text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="coffre-description" className="text-foreground font-semibold">
                    Description (optionnel)
                  </Label>
                  <textarea
                    id="coffre-description"
                    name="description"
                    className="w-full p-3 rounded-lg bg-cyber-dark border border-blue-500/15 text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none transition-all"
                    rows={3}
                    placeholder="Ajoutez une description pour ce coffre..."
                  />
                </div>
                <Button 
                  type="submit" 
                  disabled={loading === "create-coffre"}
                  className="w-full sm:w-auto"
                >
                  {loading === "create-coffre" ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Création en cours...
                    </>
                  ) : (
                    <>
                      <Wallet className="h-4 w-4 mr-2" />
                      Créer le coffre
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div>
            <h2 className="text-xl font-bold text-blue-400 mb-4">
              Coffres existants ({data.coffres.length})
            </h2>
            {data.coffres.length === 0 ? (
              <Card className="cyber-card">
                <CardContent className="py-8 text-center">
                  <Wallet className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground">
                    Aucun coffre créé pour le moment. Créez-en un ci-dessus.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {data.coffres.map((coffre) => (
              <Card key={coffre.id} className="cyber-card">
                <CardHeader>
                  <CardTitle>{coffre.name}</CardTitle>
                  {coffre.description && (
                    <p className="text-sm text-muted-foreground">
                      {coffre.description}
                    </p>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    <p>Mouvements: {coffre._count.movements}</p>
                    <p>Inventaires: {coffre._count.inventories}</p>
                    <p>Membres: {coffre.members.length}</p>
                  </div>

                  <div className="space-y-2">
                    <Label>Ajouter un membre</Label>
                    <div className="flex gap-2">
                      <Select
                        className="flex-1"
                        id={`user-select-${coffre.id}`}
                      >
                        <option value="">Sélectionner un utilisateur</option>
                        {data.users
                          .filter(
                            (u) =>
                              !coffre.members.some((m: any) => m.userId === u.id)
                          )
                          .map((user) => (
                            <option key={user.id} value={user.id}>
                              {user.name} ({user.email})
                            </option>
                          ))}
                      </Select>
                      <Select
                        id={`role-select-${coffre.id}`}
                      >
                        <option value="MEMBER">Membre</option>
                        <option value="MANAGER">Gestionnaire</option>
                        <option value="OWNER">Propriétaire</option>
                      </Select>
                      <Button
                        size="sm"
                        onClick={() => {
                          const userId = (
                            document.getElementById(
                              `user-select-${coffre.id}`
                            ) as HTMLSelectElement
                          ).value
                          const role = (
                            document.getElementById(
                              `role-select-${coffre.id}`
                            ) as HTMLSelectElement
                          ).value
                          if (userId) {
                            handleAddMember(coffre.id, userId, role)
                          }
                        }}
                        disabled={loading?.startsWith("add-member")}
                      >
                        <Save className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Membres actuels</Label>
                    <div className="space-y-1">
                      {coffre.members.map((member: any) => (
                        <div
                          key={member.id}
                          className="flex items-center justify-between p-2 rounded bg-cyber-dark border border-blue-500/10 hover:border-blue-500/20 transition-all"
                        >
                          <span className="text-sm">{member.user.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {member.role}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
              </div>
            )}
          </div>
        </div>
      </TabsContent>
    </Tabs>
  )
}

