"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Wallet, Loader2 } from "lucide-react"

export default function SetupPage() {
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

  useEffect(() => {
    checkSetup()
  }, [])

  const checkSetup = async () => {
    try {
      const response = await fetch("/api/setup/check", {
        cache: "no-store",
      })
      const data = await response.json()
      
      if (data.needsSetup) {
        setNeedsSetup(true)
      } else {
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
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    // Validation
    if (!formData.name || !formData.email || !formData.password) {
      setError("Tous les champs sont requis")
      return
    }

    if (formData.password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères")
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
        setError(data.error || "Erreur lors de la création de l'administrateur")
      }
    } catch (error) {
      setError("Erreur lors de la création de l'administrateur")
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-cyber-dark to-cyber-dark-lighter">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-cyber-gold mx-auto mb-4" />
          <p className="text-muted-foreground">Vérification...</p>
        </div>
      </div>
    )
  }

  if (!needsSetup) {
    return null // Sera redirigé
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-cyber-dark to-cyber-dark-lighter p-4 sm:p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="cyber-card glow-gold">
          <CardHeader className="text-center">
            <motion.div
              initial={{ rotate: -10 }}
              animate={{ rotate: 0 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="flex justify-center mb-4"
            >
              <Wallet className="h-16 w-16 text-cyber-gold" />
            </motion.div>
            <CardTitle className="text-3xl">Configuration Initiale</CardTitle>
            <CardDescription className="text-foreground/70">
              Créez le premier administrateur pour SafeGuard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nom complet</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Jean Dupont"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                  disabled={creating}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@example.com"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  required
                  disabled={creating}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  required
                  disabled={creating}
                  minLength={6}
                />
                <p className="text-xs text-muted-foreground">
                  Minimum 6 caractères
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    setFormData({ ...formData, confirmPassword: e.target.value })
                  }
                  required
                  disabled={creating}
                />
              </div>

              {error && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-sm text-destructive text-center p-3 rounded-lg bg-destructive/10 border border-destructive/20"
                >
                  {error}
                </motion.p>
              )}

              <div className="bg-cyber-dark/50 border border-cyber-gold/20 rounded-lg p-3">
                <p className="text-xs text-muted-foreground text-center">
                  ⚠️ Ce compte aura tous les droits d'administration. 
                  Assurez-vous de choisir un mot de passe fort.
                </p>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={creating}
              >
                {creating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Création en cours...
                  </>
                ) : (
                  "Créer l'administrateur"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

