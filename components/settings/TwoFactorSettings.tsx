"use client"

import { useState, useEffect } from "react"
import { Card, CardHeader, CardBody, Button, Input } from "@heroui/react"
import { Shield, CheckCircle2, XCircle, RefreshCw, Download, Copy } from "lucide-react"
import { motion } from "framer-motion"
import { useToast } from "@/components/ui/toast"

interface TwoFactorStatus {
  enabled: boolean
}

export function TwoFactorSettings() {
  const [status, setStatus] = useState<TwoFactorStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [setupLoading, setSetupLoading] = useState(false)
  const [disableLoading, setDisableLoading] = useState(false)
  const [regenerateLoading, setRegenerateLoading] = useState(false)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [secret, setSecret] = useState<string | null>(null)
  const [url, setUrl] = useState<string | null>(null)
  const [verificationCode, setVerificationCode] = useState("")
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null)
  const [showBackupCodes, setShowBackupCodes] = useState(false)
  const { showToast } = useToast()

  useEffect(() => {
    fetchStatus()
  }, [])

  const fetchStatus = async () => {
    try {
      const response = await fetch("/api/two-factor/status")
      const data = await response.json()
      if (response.ok) {
        setStatus(data)
      } else {
        console.error("Erreur lors de la récupération du statut 2FA:", data)
      }
    } catch (error) {
      console.error("Erreur lors de la récupération du statut 2FA:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSetup = async () => {
    setSetupLoading(true)
    try {
      // Étape 1: Générer le secret et QR code
      const setupResponse = await fetch("/api/two-factor/setup")
      const setupData = await setupResponse.json()
      
      if (!setupResponse.ok) {
        const errorMessage = setupData.error || setupData.message || "Erreur lors de la génération du QR code"
        console.error("Erreur API 2FA setup:", errorMessage, setupData)
        showToast(errorMessage, "error")
        return
      }

      setQrCode(setupData.qrCode)
      setSecret(setupData.secret)
      setUrl(setupData.url)
    } catch (error: any) {
      console.error("Erreur lors de la configuration de la 2FA:", error)
      showToast(error?.message || "Erreur lors de la configuration de la 2FA", "error")
    } finally {
      setSetupLoading(false)
    }
  }

  const handleActivate = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      showToast("Veuillez entrer un code à 6 chiffres", "error")
      return
    }

    setSetupLoading(true)
    try {
      // Générer les codes de récupération
      const codes = generateBackupCodes()

      const activateResponse = await fetch("/api/two-factor/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret,
          code: verificationCode,
          backupCodes: codes,
        }),
      })

      if (!activateResponse.ok) {
        const error = await activateResponse.json()
        throw new Error(error.error || "Erreur lors de l'activation")
      }

      const activateData = await activateResponse.json()
      setBackupCodes(activateData.backupCodes)
      setShowBackupCodes(true)
      setStatus({ enabled: true })
      setQrCode(null)
      setSecret(null)
      setUrl(null)
      setVerificationCode("")
      showToast("2FA activée avec succès", "success")
    } catch (error: any) {
      showToast(error.message || "Erreur lors de l'activation", "error")
    } finally {
      setSetupLoading(false)
    }
  }

  const handleDisable = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      showToast("Veuillez entrer un code de vérification", "error")
      return
    }

    setDisableLoading(true)
    try {
      const disableResponse = await fetch("/api/two-factor/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: verificationCode }),
      })

      if (!disableResponse.ok) {
        const error = await disableResponse.json()
        throw new Error(error.error || "Erreur lors de la désactivation")
      }

      setStatus({ enabled: false })
      setVerificationCode("")
      showToast("2FA désactivée avec succès", "success")
    } catch (error: any) {
      showToast(error.message || "Erreur lors de la désactivation", "error")
    } finally {
      setDisableLoading(false)
    }
  }

  const handleRegenerateBackupCodes = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      showToast("Veuillez entrer un code de vérification", "error")
      return
    }

    setRegenerateLoading(true)
    try {
      const regenerateResponse = await fetch("/api/two-factor/backup-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: verificationCode }),
      })

      if (!regenerateResponse.ok) {
        const error = await regenerateResponse.json()
        throw new Error(error.error || "Erreur lors de la régénération")
      }

      const regenerateData = await regenerateResponse.json()
      setBackupCodes(regenerateData.backupCodes)
      setShowBackupCodes(true)
      setVerificationCode("")
      showToast("Codes de récupération régénérés", "success")
    } catch (error: any) {
      showToast(error.message || "Erreur lors de la régénération", "error")
    } finally {
      setRegenerateLoading(false)
    }
  }

  const generateBackupCodes = (): string[] => {
    // Générer 10 codes de 8 caractères
    const codes: string[] = []
    for (let i = 0; i < 10; i++) {
      const code = Math.random().toString(36).substring(2, 10).toUpperCase()
      codes.push(code)
    }
    return codes
  }

  const copyBackupCodes = () => {
    if (backupCodes) {
      const text = backupCodes.join("\n")
      navigator.clipboard.writeText(text)
      showToast("Codes copiés dans le presse-papiers", "success")
    }
  }

  const downloadBackupCodes = () => {
    if (backupCodes) {
      const text = backupCodes.join("\n")
      const blob = new Blob([text], { type: "text/plain" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "safeguard-backup-codes.txt"
      a.click()
      URL.revokeObjectURL(url)
      showToast("Codes téléchargés", "success")
    }
  }

  if (loading) {
    return (
      <Card className="glass-effect">
        <CardBody>
          <div className="text-center py-8">Chargement...</div>
        </CardBody>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="glass-effect">
        <CardHeader className="flex items-center gap-3">
          <Shield className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-xl font-semibold">Authentification à deux facteurs</h2>
            <p className="text-sm text-foreground/70">
              Ajoutez une couche de sécurité supplémentaire à votre compte
            </p>
          </div>
        </CardHeader>
        <CardBody className="space-y-6">
          {/* Statut actuel */}
          <div className="flex items-center justify-between p-4 rounded-lg border border-border/60">
            <div className="flex items-center gap-3">
              {status?.enabled ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-success" />
                  <div>
                    <p className="font-medium">2FA activée</p>
                    <p className="text-sm text-foreground/70">
                      Votre compte est protégé par l&apos;authentification à deux facteurs
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">2FA désactivée</p>
                    <p className="text-sm text-foreground/70">
                      Activez la 2FA pour renforcer la sécurité de votre compte
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Configuration */}
          {!status?.enabled ? (
            <div className="space-y-4">
              {!qrCode ? (
                <Button
                  color="primary"
                  onClick={handleSetup}
                  isLoading={setupLoading}
                  startContent={<Shield className="h-4 w-4" />}
                >
                  Activer la 2FA
                </Button>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <div className="text-center">
                    <p className="text-sm text-foreground/70 mb-4">
                      Scannez ce QR code avec votre application d&apos;authentification
                      (Google Authenticator, Microsoft Authenticator, Authy, etc.)
                    </p>
                    <div className="flex justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={qrCode} alt="QR Code 2FA" className="border border-border/60 rounded-lg" />
                    </div>
                    {url && (
                      <p className="text-xs text-foreground/50 mt-2 break-all">
                        Ou entrez cette clé manuellement: {secret}
                      </p>
                    )}
                  </div>
                  <Input
                    type="text"
                    label="Code de vérification"
                    placeholder="000000"
                    value={verificationCode}
                    onValueChange={(value) => {
                      const digits = value.replace(/\D/g, "").slice(0, 6)
                      setVerificationCode(digits)
                    }}
                    maxLength={6}
                    description="Entrez le code à 6 chiffres depuis votre application"
                  />
                  <div className="flex gap-2">
                    <Button
                      color="primary"
                      onClick={handleActivate}
                      isLoading={setupLoading}
                      className="flex-1"
                    >
                      Activer
                    </Button>
                    <Button
                      variant="light"
                      onClick={() => {
                        setQrCode(null)
                        setSecret(null)
                        setUrl(null)
                        setVerificationCode("")
                      }}
                    >
                      Annuler
                    </Button>
                  </div>
                </motion.div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-warning/10 border border-warning/30">
                <p className="text-sm text-foreground">
                  <strong>Important:</strong> Pour désactiver la 2FA ou régénérer les codes de récupération,
                  vous devez fournir un code de vérification valide.
                </p>
              </div>
              <Input
                type="text"
                label="Code de vérification"
                placeholder="000000"
                value={verificationCode}
                onValueChange={(value) => {
                  const digits = value.replace(/\D/g, "").slice(0, 6)
                  setVerificationCode(digits)
                }}
                maxLength={6}
                description="Entrez un code depuis votre application d'authentification"
              />
              <div className="flex gap-2">
                <Button
                  color="danger"
                  variant="light"
                  onClick={handleDisable}
                  isLoading={disableLoading}
                  startContent={<XCircle className="h-4 w-4" />}
                >
                  Désactiver la 2FA
                </Button>
                <Button
                  color="primary"
                  variant="light"
                  onClick={handleRegenerateBackupCodes}
                  isLoading={regenerateLoading}
                  startContent={<RefreshCw className="h-4 w-4" />}
                >
                  Régénérer les codes de récupération
                </Button>
              </div>
            </div>
          )}

          {/* Codes de récupération */}
          {showBackupCodes && backupCodes && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-lg bg-primary/10 border border-primary/30"
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-medium">Codes de récupération</p>
                  <p className="text-sm text-foreground/70">
                    Sauvegardez ces codes en lieu sûr. Ils ne seront affichés qu&apos;une seule fois.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="light"
                    onClick={copyBackupCodes}
                    startContent={<Copy className="h-4 w-4" />}
                  >
                    Copier
                  </Button>
                  <Button
                    size="sm"
                    variant="light"
                    onClick={downloadBackupCodes}
                    startContent={<Download className="h-4 w-4" />}
                  >
                    Télécharger
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                {backupCodes.map((code, index) => (
                  <div key={index} className="p-2 bg-background/50 rounded border border-border/30">
                    {code}
                  </div>
                ))}
              </div>
              <Button
                size="sm"
                variant="light"
                className="w-full mt-3"
                onClick={() => setShowBackupCodes(false)}
              >
                J&apos;ai sauvegardé les codes
              </Button>
            </motion.div>
          )}
        </CardBody>
      </Card>
    </div>
  )
}
