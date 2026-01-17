"use client"

import { useState } from "react"
import { Card, CardBody } from "@heroui/react"
import { Button } from "@heroui/react"
import { Input } from "@heroui/react"
import { Select, SelectItem } from "@/components/ui/select-heroui"
import { Tabs, Tab } from "@heroui/react"
import { UserPlus, Wallet, Save, Users, Shield, Mail, User, Pencil, Trash2, X, Download, KeyRound } from "lucide-react"
import { TwoFactorSettings } from "@/components/settings/TwoFactorSettings"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/toast"
import { Textarea } from "@heroui/react"
import { motion, AnimatePresence } from "framer-motion"
import { useConfirmModal } from "@/components/ui/confirm-modal"
import { formatCurrency } from "@/lib/utils"

interface AdminPanelProps {
  data: {
    users: any[]
    coffres: any[]
  }
}

export function AdminPanel({ data }: AdminPanelProps) {
  const router = useRouter()
  const { showToast } = useToast()
  const { confirm, ConfirmModal } = useConfirmModal()
  const [loading, setLoading] = useState<string | null>(null)
  const [selectedTab, setSelectedTab] = useState<string>("users")
  const [selectedUsers, setSelectedUsers] = useState<Record<string, string>>({})
  const [selectedRoles, setSelectedRoles] = useState<Record<string, string>>({})
  const [editingCoffreId, setEditingCoffreId] = useState<string | null>(null)
  const [editingCoffreName, setEditingCoffreName] = useState<string>("")

  const handleExportOffline = async () => {
    setLoading("export-offline")
    try {
      const response = await fetch("/api/export/offline")
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData?.error || "Erreur lors de l'export")
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url

      const dispo = response.headers.get("Content-Disposition") || ""
      const match = dispo.match(/filename="([^"]+)"/)
      a.download = match?.[1] || `safevault-offline-${new Date().toISOString().slice(0, 10)}.zip`

      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      showToast("Export offline téléchargé", "success")
    } catch (e: any) {
      showToast(e.message || "Erreur export offline", "error")
    } finally {
      setLoading(null)
    }
  }

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
        showToast(`Erreur: ${error.error || error.message || "Une erreur est survenue"}`, "error")
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

  const handleStartEditCoffre = (coffre: any) => {
    setEditingCoffreId(coffre.id)
    setEditingCoffreName(coffre.name || "")
  }

  const handleCancelEditCoffre = () => {
    setEditingCoffreId(null)
    setEditingCoffreName("")
  }

  const handleUpdateCoffreName = async (coffreId: string) => {
    if (!editingCoffreName.trim()) {
      showToast("Le nom du coffre ne peut pas être vide", "error")
      return
    }

    setLoading(`update-coffre-${coffreId}`)
    try {
      const response = await fetch("/api/admin/coffres", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: coffreId,
          data: { name: editingCoffreName.trim() },
        }),
      })

      const result = await response.json().catch(() => ({}))
      if (response.ok) {
        showToast("Coffre mis à jour avec succès!", "success")
        handleCancelEditCoffre()
        router.refresh()
      } else {
        showToast(`Erreur: ${result.error || result.message || "Une erreur est survenue"}`, "error")
      }
    } catch (error) {
      showToast("Erreur lors de la mise à jour du coffre", "error")
    } finally {
      setLoading(null)
    }
  }

  const handleDeleteCoffre = async (coffre: any) => {
    confirm(
      `Supprimer définitivement le coffre "${coffre.name}" ?\n\nCette action est irréversible et supprimera aussi tout l'historique (mouvements, inventaires, logs).`,
      {
        title: "Suppression définitive du coffre",
        confirmLabel: "Supprimer",
        cancelLabel: "Annuler",
        confirmColor: "danger",
        onConfirm: async () => {
          setLoading(`delete-coffre-${coffre.id}`)
          try {
            const response = await fetch("/api/admin/coffres", {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id: coffre.id }),
            })

            const result = await response.json().catch(() => ({}))
            if (response.ok) {
              showToast("Coffre supprimé définitivement", "success")
              router.refresh()
            } else {
              showToast(`Erreur: ${result.error || result.message || "Une erreur est survenue"}`, "error")
            }
          } catch (error) {
            showToast("Erreur lors de la suppression du coffre", "error")
          } finally {
            setLoading(null)
          }
        },
      }
    )
  }

  const handleAddMember = async (coffreId: string) => {
    const userId = selectedUsers[coffreId]
    const role = selectedRoles[coffreId] || "MEMBER"
    
    if (!userId) {
      showToast("Veuillez sélectionner un utilisateur", "error")
      return
    }

    setLoading(`add-member-${coffreId}`)
    try {
      const response = await fetch("/api/admin/coffres/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coffreId, userId, role }),
      })

      if (response.ok) {
        router.refresh()
        setSelectedUsers((prev) => ({ ...prev, [coffreId]: "" }))
        setSelectedRoles((prev) => ({ ...prev, [coffreId]: "MEMBER" }))
        showToast("Membre ajouté avec succès!", "success")
      } else {
        const error = await response.json()
        showToast(`Erreur: ${error.error || error.message || "Une erreur est survenue"}`, "error")
      }
    } catch (error) {
      showToast("Erreur lors de l'ajout", "error")
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          <Shield className="h-4 w-4" />
          Administration
        </div>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <h1 className="text-2xl sm:text-3xl font-semibold text-foreground">Gestion des accès et coffres</h1>
          <Button
            color="primary"
            variant="flat"
            startContent={<Download className="h-4 w-4" />}
            onPress={handleExportOffline}
            isLoading={loading === "export-offline"}
          >
            Export offline (ZIP)
          </Button>
        </div>
        <p className="text-foreground/70">
          Créez des utilisateurs, affectez des rôles et gérez les coffres et membres avec une interface modernisée.
        </p>
      </div>

      {/* Onglets centrés avec effet de coulissement */}
      <div className="flex justify-center">
        <Tabs
          selectedKey={selectedTab}
          onSelectionChange={(key) => setSelectedTab(key as string)}
          aria-label="Admin tabs"
          classNames={{
            base: "w-full max-w-md",
            tabList: "w-full",
            tab: "flex-1",
          }}
        >
          <Tab
            key="users"
            title={
              <div className="flex items-center gap-2 justify-center">
                <Users className="h-4 w-4" />
                <span>Utilisateurs</span>
              </div>
            }
          />
          <Tab
            key="coffres"
            title={
              <div className="flex items-center gap-2 justify-center">
                <Wallet className="h-4 w-4" />
                <span>Coffres</span>
              </div>
            }
          />
          <Tab
            key="2fa"
            title={
              <div className="flex items-center gap-2 justify-center">
                <KeyRound className="h-4 w-4" />
                <span>2FA</span>
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
          {selectedTab === "users" ? (
            <div className="space-y-6">
              {/* Formulaire de création d'utilisateur */}
              <motion.div
                whileHover={{ scale: 1.01 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="relative group"
              >
                <div className="absolute -inset-0.5 bg-primary/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10" />
                
                <Card className="bg-card/70 backdrop-blur border border-border/60 shadow-[var(--shadow-1)]">
                  <CardBody className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <UserPlus className="h-5 w-5 text-primary" />
                      </div>
                      <h3 className="text-lg font-semibold text-primary">Créer un utilisateur</h3>
                    </div>
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
                          placeholder="Sélectionnez un rôle"
                          defaultSelectedKeys={["USER"]}
                        >
                          <SelectItem key="USER">Utilisateur</SelectItem>
                          <SelectItem key="MANAGER">Gestionnaire</SelectItem>
                          <SelectItem key="ADMIN">Administrateur</SelectItem>
                        </Select>
                      </div>
                      <Button
                        type="submit"
                        color="primary"
                        isLoading={loading === "create-user"}
                        className="w-full sm:w-auto"
                      >
                        Créer
                      </Button>
                    </form>
                  </CardBody>
                </Card>
              </motion.div>

              {/* Liste des utilisateurs */}
              <div className="space-y-4">
                {data.users.length === 0 ? (
                  <Card className="bg-card/70 backdrop-blur border border-border/60 shadow-[var(--shadow-1)]">
                    <CardBody className="p-8">
                      <p className="text-foreground/60 text-center">
                        Aucun utilisateur enregistré
                      </p>
                    </CardBody>
                  </Card>
                ) : (
                  data.users.map((user) => (
                    <motion.div
                      key={user.id}
                      whileHover={{ scale: 1.01 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      className="relative group"
                    >
                      <div className="absolute -inset-0.5 bg-primary/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10" />
                      
                      <Card className="bg-gradient-to-br from-default-100 to-default-50 border-divider border">
                        <CardBody className="p-5">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3 mb-3">
                                <div className={`p-2 rounded-lg ${
                                  user.role === "ADMIN" 
                                    ? "bg-danger/10" 
                                    : user.role === "MANAGER"
                                    ? "bg-warning/10"
                                    : "bg-primary/10"
                                }`}>
                                  {user.role === "ADMIN" ? (
                                    <Shield className="h-5 w-5 text-danger" />
                                  ) : (
                                    <User className="h-5 w-5 text-primary" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-primary text-lg">{user.name}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Mail className="h-3 w-3 text-foreground/50" />
                                    <p className="text-sm text-foreground/70">{user.email}</p>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-3 flex-wrap">
                                <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                                  user.role === "ADMIN"
                                    ? "bg-danger/20 text-danger"
                                    : user.role === "MANAGER"
                                    ? "bg-warning/20 text-warning"
                                    : "bg-primary/20 text-primary"
                                }`}>
                                  {user.role}
                                </span>
                                <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                                  user.isActive
                                    ? "bg-success/20 text-success"
                                    : "bg-default-200 text-foreground/60"
                                }`}>
                                  {user.isActive ? "Actif" : "Inactif"}
                                </span>
                                <span className="text-xs text-foreground/50">
                                  {user.coffreMembers.length} coffre{user.coffreMembers.length > 1 ? "s" : ""}
                                </span>
                              </div>
                            </div>
                          </div>
                        </CardBody>
                      </Card>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          ) : selectedTab === "coffres" ? (
            <div className="space-y-6">
              {/* Formulaire de création de coffre */}
              <motion.div
                whileHover={{ scale: 1.01 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="relative group"
              >
                <div className="absolute -inset-0.5 bg-primary/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10" />
                
                <Card className="bg-card/70 backdrop-blur border border-border/60 shadow-[var(--shadow-1)]">
                  <CardBody className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Wallet className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-primary">Créer un nouveau coffre</h3>
                        <p className="text-sm text-foreground/60 mt-1">
                          Ajoutez un nouveau coffre pour organiser vos fonds de caisse
                        </p>
                      </div>
                    </div>
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
                        className="w-full sm:w-auto"
                      >
                        Créer le coffre
                      </Button>
                    </form>
                  </CardBody>
                </Card>
              </motion.div>

              {/* Liste des coffres */}
              {data.coffres.length === 0 ? (
                <Card className="bg-card/70 backdrop-blur border border-border/60 shadow-[var(--shadow-1)]">
                  <CardBody className="p-8 text-center">
                    <Wallet className="h-12 w-12 text-foreground/30 mx-auto mb-4" />
                    <p className="text-foreground/60">
                      Aucun coffre créé pour le moment. Créez-en un ci-dessus.
                    </p>
                  </CardBody>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {data.coffres.map((coffre) => (
                    <motion.div
                      key={coffre.id}
                      whileHover={{ scale: 1.02 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      className="relative group"
                    >
                      <div className="absolute -inset-0.5 bg-primary/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10" />
                      
                      <Card className="bg-card/70 backdrop-blur border border-border/60 shadow-[var(--shadow-1)] h-full">
                        <CardBody className="p-5 space-y-4">
                          {/* En-tête du coffre */}
                          <div>
                            <div className="flex items-center gap-3 mb-2">
                              <div className="p-2 rounded-lg bg-primary/10">
                                <Wallet className="h-5 w-5 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                {editingCoffreId === coffre.id ? (
                                  <Input
                                    size="sm"
                                    label="Nom"
                                    value={editingCoffreName}
                                    onValueChange={setEditingCoffreName}
                                  />
                                ) : (
                                  <h4 className="font-semibold text-primary text-lg truncate">{coffre.name}</h4>
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                {editingCoffreId === coffre.id ? (
                                  <>
                                    <Button
                                      size="sm"
                                      isIconOnly
                                      color="primary"
                                      onPress={() => handleUpdateCoffreName(coffre.id)}
                                      isLoading={loading === `update-coffre-${coffre.id}`}
                                      aria-label="Enregistrer"
                                    >
                                      <Save className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      isIconOnly
                                      variant="light"
                                      onPress={handleCancelEditCoffre}
                                      aria-label="Annuler"
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </>
                                ) : (
                                  <>
                                    <Button
                                      size="sm"
                                      isIconOnly
                                      variant="light"
                                      onPress={() => handleStartEditCoffre(coffre)}
                                      aria-label="Renommer"
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      isIconOnly
                                      color="danger"
                                      variant="light"
                                      onPress={() => handleDeleteCoffre(coffre)}
                                      isDisabled={Number(coffre.balance || 0) !== 0}
                                      isLoading={loading === `delete-coffre-${coffre.id}`}
                                      aria-label="Supprimer"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>
                            {coffre.description && (
                              <p className="text-sm text-foreground/70 ml-11">
                                {coffre.description}
                              </p>
                            )}
                          </div>

                          {/* Statistiques */}
                          <div className="grid grid-cols-4 gap-2">
                            <div className="text-center p-2 rounded-lg bg-default-200">
                              <p className="text-xs text-foreground/60 mb-1">Mouvements</p>
                              <p className="text-sm font-bold text-primary">{coffre._count.movements}</p>
                            </div>
                            <div className="text-center p-2 rounded-lg bg-default-200">
                              <p className="text-xs text-foreground/60 mb-1">Inventaires</p>
                              <p className="text-sm font-bold text-primary">{coffre._count.inventories}</p>
                            </div>
                            <div className="text-center p-2 rounded-lg bg-default-200">
                              <p className="text-xs text-foreground/60 mb-1">Membres</p>
                              <p className="text-sm font-bold text-primary">{coffre.members.length}</p>
                            </div>
                            <div className="text-center p-2 rounded-lg bg-default-200">
                              <p className="text-xs text-foreground/60 mb-1">Solde</p>
                              <p className={`text-sm font-bold ${Number(coffre.balance || 0) === 0 ? "text-success" : "text-warning"}`}>
                                {formatCurrency(Number(coffre.balance || 0))}
                              </p>
                            </div>
                          </div>
                          <p className="text-xs text-foreground/55">
                            Suppression définitive possible uniquement si le solde est à <b>0,00 €</b>.
                          </p>

                          {/* Ajouter un membre */}
                          <div className="space-y-2">
                            <p className="text-sm font-medium text-foreground/80">Ajouter un membre</p>
                            <div className="flex gap-2">
                              <Select
                                label="Utilisateur"
                                placeholder="Sélectionner un utilisateur"
                                className="flex-1"
                                selectedKeys={selectedUsers[coffre.id] ? [selectedUsers[coffre.id]] : []}
                                onSelectionChange={(keys) => {
                                  const selected = Array.from(keys)[0] as string
                                  setSelectedUsers((prev) => ({ ...prev, [coffre.id]: selected || "" }))
                                }}
                              >
                                {data.users
                                  .filter(
                                    (u) =>
                                      !coffre.members.some((m: any) => m.userId === u.id)
                                  )
                                  .map((user) => (
                                    <SelectItem key={user.id}>
                                      {user.name} ({user.email})
                                    </SelectItem>
                                  ))}
                              </Select>
                              <Select
                                label="Rôle"
                                placeholder="Rôle"
                                selectedKeys={selectedRoles[coffre.id] ? [selectedRoles[coffre.id]] : ["MEMBER"]}
                                onSelectionChange={(keys) => {
                                  const selected = Array.from(keys)[0] as string
                                  setSelectedRoles((prev) => ({ ...prev, [coffre.id]: selected || "MEMBER" }))
                                }}
                                className="w-40"
                              >
                                <SelectItem key="MEMBER">Membre</SelectItem>
                                <SelectItem key="MANAGER">Gestionnaire</SelectItem>
                                <SelectItem key="OWNER">Propriétaire</SelectItem>
                              </Select>
                              <Button
                                size="sm"
                                color="primary"
                                isIconOnly
                                onPress={() => handleAddMember(coffre.id)}
                                isLoading={loading === `add-member-${coffre.id}`}
                              >
                                <Save className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          {/* Membres actuels */}
                          {coffre.members.length > 0 && (
                            <motion.div
                              layout
                              className="space-y-2"
                              transition={{ layout: { duration: 0.25, ease: "easeInOut" } }}
                            >
                              <p className="text-sm font-medium text-foreground/80">Membres actuels</p>
                              <div className="space-y-1">
                                {coffre.members.map((member: any) => (
                                  <motion.div
                                    key={member.id}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex items-center justify-between p-2.5 rounded-lg bg-default-200 border border-divider shadow-sm"
                                    whileHover={{ scale: 1.01 }}
                                  >
                                    <span className="text-sm text-foreground/90">{member.user.name}</span>
                                    <span className={`text-xs px-2 py-0.5 rounded ${
                                      member.role === "OWNER"
                                        ? "bg-danger/20 text-danger"
                                        : member.role === "MANAGER"
                                        ? "bg-warning/20 text-warning"
                                        : "bg-primary/20 text-primary"
                                    }`}>
                                      {member.role}
                                    </span>
                                  </motion.div>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </CardBody>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <TwoFactorSettings />
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {ConfirmModal}
    </div>
  )
}
