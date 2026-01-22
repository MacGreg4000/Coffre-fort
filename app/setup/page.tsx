"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Button, Input, Card, CardHeader, CardBody, CardFooter } from "@heroui/react"
import { Wallet, Loader2 } from "lucide-react"

export default function SetupPage() {
  console.log("SetupPage component rendered")

  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [needsSetup, setNeedsSetup] = useState(false)
  const [creating, setCreating] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  })
  const [error, setError] = useState("")

  const checkSetup = useCallback(async () => {
    console.log("Vérification du setup...")
    try {
      console.log("Fetch vers /api/setup/check")
      const response = await fetch("/api/setup/check", {
        cache: "no-store",
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      })
      console.log("Réponse reçue:", response.status, response.statusText)

      const data = await response.json()
      console.log("Données reçues:", data)

      if (data.needsSetup) {
        console.log("Setup nécessaire")
        setNeedsSetup(true)
      } else {
        console.log("Setup déjà fait, redirection vers login")
        // La base n'est pas vide, rediriger vers login
        router.replace("/login")
      }
    } catch (error) {
      console.error("Erreur vérification setup:", error)
      // En cas d'erreur, permettre quand même l'accès au setup
      setNeedsSetup(true)
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    checkSetup()
  }, [checkSetup])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    // Validation
    if (!formData.name || !formData.email || !formData.password) {
      setError("Tous les champs sont requis")
      return
    }

    // Mot de passe fort (aligné avec la création d'utilisateurs)
    if (formData.password.length < 12) {
      setError("Le mot de passe doit contenir au moins 12 caractères")
      return
    }
    if (!/[A-Z]/.test(formData.password)) {
      setError("Le mot de passe doit contenir au moins une majuscule")
      return
    }
    if (!/[a-z]/.test(formData.password)) {
      setError("Le mot de passe doit contenir au moins une minuscule")
      return
    }
    if (!/[0-9]/.test(formData.password)) {
      setError("Le mot de passe doit contenir au moins un chiffre")
      return
    }
    if (!/[^A-Za-z0-9]/.test(formData.password)) {
      setError("Le mot de passe doit contenir au moins un caractère spécial")
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Les mots de passe ne correspondent pas")
      return
    }

    setCreating(true)

    try {
      const response = await fetch("/api/setup/create-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        // Admin créé avec succès, rediriger vers login
        router.push("/login?setup=success")
      } else {
        setError(data.error || "Erreur lors de la création de l&apos;administrateur")
      }
    } catch (error) {
      setError("Erreur lors de la création de l&apos;administrateur")
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-foreground/60">Vérification...</p>
          <p className="text-xs text-foreground/40 mt-2">Tentative de connexion à l'API...</p>
        </div>
      </div>
    )
  }

  if (!needsSetup) {
    return null // Sera redirigé
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-10 -top-10 h-64 w-64 rounded-full bg-primary/15 blur-[120px]" />
        <div className="absolute right-0 top-20 h-64 w-64 rounded-full bg-primary/10 blur-[120px]" />
      </div>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <Card className="bg-card/70 backdrop-blur-xl border border-border/60 shadow-[var(--shadow-2)]">
          <CardHeader className="text-center space-y-2">
            <motion.div
              initial={{ rotate: -10 }}
              animate={{ rotate: 0 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="flex justify-center mb-4"
            >
              <Wallet className="h-14 w-14 text-primary" />
            </motion.div>
            <h1 className="text-3xl font-semibold text-foreground">Configuration initiale</h1>
            <p className="text-foreground/70">Créez le premier administrateur pour SafeGuard</p>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                type="text"
                label="Nom complet"
                placeholder="Jean Dupont"
                value={formData.name}
                onValueChange={(v) => setFormData({ ...formData, name: v })}
                isRequired
                isDisabled={creating}
              />

              <Input
                type="email"
                label="Email"
                placeholder="admin@example.com"
                value={formData.email}
                onValueChange={(v) => setFormData({ ...formData, email: v })}
                isRequired
                isDisabled={creating}
              />

              <Input
                type="password"
                label="Mot de passe"
                placeholder="••••••••••••"
                description="Minimum 12 caractères, avec majuscule, minuscule, chiffre et caractère spécial"
                value={formData.password}
                onValueChange={(v) => setFormData({ ...formData, password: v })}
                isRequired
                isDisabled={creating}
              />

              <Input
                type="password"
                label="Confirmer le mot de passe"
                placeholder="••••••••••••"
                value={formData.confirmPassword}
                onValueChange={(v) => setFormData({ ...formData, confirmPassword: v })}
                isRequired
                isDisabled={creating}
              />

              {error && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-sm text-danger text-center p-3 rounded-lg bg-danger/10 border border-danger/20"
                >
                  {error}
                </motion.p>
              )}

              <Button
                type="submit"
                color="primary"
                className="w-full"
                isLoading={creating}
                size="lg"
              >
                {creating ? "Création en cours..." : "Créer l’administrateur"}
              </Button>
            </form>
          </CardBody>
          <CardFooter className="pt-0">
            <div className="w-full rounded-lg bg-primary/5 border border-primary/15 p-3 text-xs text-foreground/70">
              Ce compte aura tous les droits d’administration. Choisis un mot de passe fort.
            </div>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  )
}

