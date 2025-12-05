"use client"

import { useState } from "react"
import { Card, CardHeader, CardBody } from "@heroui/react"
import { Button } from "@heroui/react"
import { Input } from "@heroui/react"
import { Select, SelectItem } from "@heroui/react"
import { Tabs, Tab } from "@heroui/react"
import { UserPlus, Wallet, Save } from "lucide-react"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/toast"
import { Textarea } from "@heroui/react"

interface AdminPanelProps {
  data: {
    users: any[]
    coffres: any[]
  }
}

export function AdminPanel({ data }: AdminPanelProps) {
  const router = useRouter()
  const { showToast } = useToast()
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
        showToast("Utilisateur créé avec succès!", "success")
      } else {
        const error = await response.json()
        showToast(`Erreur: ${error.message || "Une erreur est survenue"}`, "error")
      }
    } catch (error) {
      showToast("Erreur lors de la création", "error")
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

      const result = await response.json()
      
      if (response.ok) {
        router.refresh()
        e.currentTarget.reset()
        showToast("Coffre créé avec succès!", "success")
      } else {
        showToast(`Erreur: ${result.error || result.message || "Une erreur est survenue"}`, "error")
      }
    } catch (error: any) {
      console.error("Erreur création coffre:", error)
      showToast("Erreur lors de la création du coffre", "error")
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
        showToast("Membre ajouté avec succès!", "success")
      } else {
        const error = await response.json()
        showToast(`Erreur: ${error.message || "Une erreur est survenue"}`, "error")
      }
    } catch (error) {
      showToast("Erreur lors de l'ajout", "error")
    } finally {
      setLoading(null)
    }
  }

  return (
    <Tabs aria-label="Admin tabs" defaultSelectedKey="users">
      <Tab
        key="users"
        title="Utilisateurs"
      >
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                <h3 className="text-lg font-semibold">Créer un utilisateur</h3>
              </div>
            </CardHeader>
            <CardBody>
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    name="name"
                    label="Nom"
                    isRequired
                  />
                  <Input
                    name="email"
                    type="email"
                    label="Email"
                    isRequired
                  />
                  <Input
                    name="password"
                    type="password"
                    label="Mot de passe"
                    isRequired
                  />
                  <Select
                    name="role"
                    label="Rôle"
                    isRequired
                    defaultSelectedKeys={["USER"]}
                  >
                    <SelectItem key="USER" value="USER">Utilisateur</SelectItem>
                    <SelectItem key="MANAGER" value="MANAGER">Gestionnaire</SelectItem>
                    <SelectItem key="ADMIN" value="ADMIN">Administrateur</SelectItem>
                  </Select>
                </div>
                <Button
                  type="submit"
                  color="primary"
                  isLoading={loading === "create-user"}
                >
                  Créer
                </Button>
              </form>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">Liste des utilisateurs</h3>
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                {data.users.map((user) => (
                  <Card key={user.id} className="bg-default-100">
                    <CardBody>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-foreground">{user.name}</p>
                          <p className="text-sm text-foreground/60">{user.email}</p>
                          <p className="text-xs text-foreground/50 mt-1">
                            Rôle: {user.role} | Coffres: {user.coffreMembers.length}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-1 rounded text-xs ${
                              user.isActive
                                ? "bg-success/20 text-success"
                                : "bg-danger/20 text-danger"
                            }`}
                          >
                            {user.isActive ? "Actif" : "Inactif"}
                          </span>
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>
      </Tab>

      <Tab
        key="coffres"
        title="Coffres"
      >
        <div className="space-y-6">
          <Card className="border-primary/30">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold text-primary">Créer un nouveau coffre</h3>
              </div>
              <p className="text-sm text-foreground/60 mt-2">
                Ajoutez un nouveau coffre pour organiser vos fonds de caisse
              </p>
            </CardHeader>
            <CardBody>
              <form onSubmit={handleCreateCoffre} className="space-y-4">
                <Input
                  name="name"
                  label="Nom du coffre"
                  placeholder="Ex: Caisse principale, Caisse secondaire..."
                  isRequired
                />
                <Textarea
                  name="description"
                  label="Description (optionnel)"
                  placeholder="Ajoutez une description pour ce coffre..."
                  minRows={3}
                />
                <Button
                  type="submit"
                  color="primary"
                  isLoading={loading === "create-coffre"}
                  startContent={<Wallet className="h-4 w-4" />}
                >
                  Créer le coffre
                </Button>
              </form>
            </CardBody>
          </Card>

          <div>
            <h2 className="text-xl font-bold text-primary mb-4">
              Coffres existants ({data.coffres.length})
            </h2>
            {data.coffres.length === 0 ? (
              <Card>
                <CardBody className="py-8 text-center">
                  <Wallet className="h-12 w-12 text-foreground/30 mx-auto mb-4" />
                  <p className="text-foreground/60">
                    Aucun coffre créé pour le moment. Créez-en un ci-dessus.
                  </p>
                </CardBody>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.coffres.map((coffre) => (
                  <Card key={coffre.id}>
                    <CardHeader>
                      <h4 className="font-semibold">{coffre.name}</h4>
                      {coffre.description && (
                        <p className="text-sm text-foreground/60">
                          {coffre.description}
                        </p>
                      )}
                    </CardHeader>
                    <CardBody className="space-y-4">
                      <div className="text-sm text-foreground/60">
                        <p>Mouvements: {coffre._count.movements}</p>
                        <p>Inventaires: {coffre._count.inventories}</p>
                        <p>Membres: {coffre.members.length}</p>
                      </div>

                      <div className="space-y-2">
                        <p className="text-sm font-medium">Ajouter un membre</p>
                        <div className="flex gap-2">
                          <Select
                            placeholder="Sélectionner un utilisateur"
                            className="flex-1"
                            id={`user-select-${coffre.id}`}
                          >
                            {data.users
                              .filter(
                                (u) =>
                                  !coffre.members.some((m: any) => m.userId === u.id)
                              )
                              .map((user) => (
                                <SelectItem key={user.id} value={user.id}>
                                  {user.name} ({user.email})
                                </SelectItem>
                              ))}
                          </Select>
                          <Select
                            defaultSelectedKeys={["MEMBER"]}
                            id={`role-select-${coffre.id}`}
                            className="w-32"
                          >
                            <SelectItem key="MEMBER" value="MEMBER">Membre</SelectItem>
                            <SelectItem key="MANAGER" value="MANAGER">Gestionnaire</SelectItem>
                            <SelectItem key="OWNER" value="OWNER">Propriétaire</SelectItem>
                          </Select>
                          <Button
                            size="sm"
                            color="primary"
                            isIconOnly
                            onPress={() => {
                              const userIdSelect = document.getElementById(
                                `user-select-${coffre.id}`
                              ) as any
                              const roleSelect = document.getElementById(
                                `role-select-${coffre.id}`
                              ) as any
                              const userId = userIdSelect?.value || userIdSelect?.selectedKeys?.values().next().value
                              const role = roleSelect?.value || roleSelect?.selectedKeys?.values().next().value
                              if (userId) {
                                handleAddMember(coffre.id, userId, role || "MEMBER")
                              }
                            }}
                            isLoading={loading?.startsWith("add-member")}
                          >
                            <Save className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-sm font-medium">Membres actuels</p>
                        <div className="space-y-1">
                          {coffre.members.map((member: any) => (
                            <div
                              key={member.id}
                              className="flex items-center justify-between p-2 rounded-lg bg-default-100 border border-divider"
                            >
                              <span className="text-sm">{member.user.name}</span>
                              <span className="text-xs text-foreground/60">
                                {member.role}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </Tab>
    </Tabs>
  )
}
