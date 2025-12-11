"use client"

import { useState, useEffect, Suspense } from "react"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { Button } from "@heroui/react"
import { Input } from "@heroui/react"
import { Card, CardHeader, CardBody } from "@heroui/react"
import { Wallet, CheckCircle2 } from "lucide-react"

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [setupSuccess, setSetupSuccess] = useState(false)

  useEffect(() => {
    if (searchParams.get("setup") === "success") {
      setSetupSuccess(true)
      router.replace("/login", { scroll: false })
    }
  }, [searchParams, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError("Email ou mot de passe incorrect")
      } else {
        router.push("/dashboard")
        router.refresh()
      }
    } catch (err) {
      setError("Une erreur est survenue")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-10 -top-10 h-64 w-64 rounded-full bg-primary/15 blur-[120px]" />
        <div className="absolute right-0 top-20 h-64 w-64 rounded-full bg-accent/15 blur-[120px]" />
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
              className="flex justify-center mb-2"
            >
              <Wallet className="h-14 w-14 text-primary" />
            </motion.div>
            <h1 className="text-3xl font-semibold text-foreground">SafeGuard</h1>
            <p className="text-foreground/70 mt-1">
              Connectez-vous pour accéder à votre espace
            </p>
          </CardHeader>
          <CardBody className="space-y-4">
            {setupSuccess && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 p-3 rounded-lg bg-success/10 border border-success/30 flex items-center gap-2"
              >
                <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0" />
                <p className="text-sm text-success">
                  Administrateur créé avec succès ! Vous pouvez maintenant vous connecter.
                </p>
              </motion.div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                type="email"
                label="Email"
                placeholder="votre@email.com"
                value={email}
                onValueChange={setEmail}
                isRequired
              />
              <Input
                type="password"
                label="Mot de passe"
                placeholder="••••••••"
                value={password}
                onValueChange={setPassword}
                isRequired
              />
              {error && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-sm text-danger text-center"
                >
                  {error}
                </motion.p>
              )}
              <Button
                type="submit"
                color="primary"
                className="w-full"
                isLoading={loading}
                size="lg"
              >
                {loading ? "Connexion..." : "Se connecter"}
              </Button>
            </form>
          </CardBody>
        </Card>
      </motion.div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-primary">Chargement...</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
