"use client"

import { useEffect, useState } from "react"
import { Card, CardBody, CardHeader } from "@heroui/react"
import { KeyRound, FileUp, HardDrive, Clock } from "lucide-react"
import { motion } from "framer-motion"
import { PremiumCard } from "@/components/ui/premium-card"
import Link from "next/link"
import { Button } from "@heroui/react"
import { formatDistanceToNow } from "date-fns"
import { fr } from "date-fns/locale"

interface PasswordFile {
  id: string
  filename: string
  mimeType: string
  sizeBytes: number
  sha256: string
  createdAt: string
}

function formatBytes(bytes: number) {
  if (!bytes) return "0 B"
  const units = ["B", "KB", "MB", "GB"]
  let i = 0
  let v = bytes
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024
    i++
  }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

export function PasswordFilesStats() {
  const [loading, setLoading] = useState(true)
  const [files, setFiles] = useState<PasswordFile[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchFiles()
  }, [])

  const fetchFiles = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/password-files")
      if (!res.ok) throw new Error("Erreur API")
      const data = await res.json()
      setFiles(data.files || [])
    } catch (e: any) {
      setError(e.message || "Erreur")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-32 bg-card/50 rounded-xl animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-card/50 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="bg-card/70">
        <CardBody>
          <p className="text-foreground/60">Erreur: {error}</p>
        </CardBody>
      </Card>
    )
  }

  // Calculer les stats
  const totalFiles = files.length
  const totalSize = files.reduce((sum, f) => sum + f.sizeBytes, 0)
  const lastUpload = files.length > 0
    ? new Date(files[0].createdAt)
    : null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            Fichiers gestionnaire de mots de passe
          </h2>
          <p className="text-muted-foreground mt-2">
            Vue d&apos;ensemble de vos exports de gestionnaires de mots de passe
          </p>
        </div>
        <Link href="/password-files">
          <Button color="primary" variant="flat" size="sm">
            Gérer les fichiers
          </Button>
        </Link>
      </div>

      {/* Carte principale */}
      <PremiumCard variant="gradient" hover3D glow shimmer>
        <div className="p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <motion.div
              className="p-3 rounded-xl bg-primary/20 border border-primary/30 backdrop-blur"
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
            >
              <FileUp className="h-5 w-5 text-primary" />
            </motion.div>
            <div>
              <p className="text-xs text-foreground/60 mb-1 font-medium">Fichiers sauvegardés</p>
              <motion.p
                className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
              >
                {totalFiles}
              </motion.p>
              <p className="text-xs text-foreground/50 flex items-center gap-1.5 mt-0.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                {formatBytes(totalSize)} au total
              </p>
            </div>
          </div>
        </div>
      </PremiumCard>

      {/* Stats détaillées */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card/70 backdrop-blur border border-border/60">
          <CardBody>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <HardDrive className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-foreground/60">Taille totale</p>
                <p className="text-lg font-semibold">{formatBytes(totalSize)}</p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className="bg-card/70 backdrop-blur border border-border/60">
          <CardBody>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <FileUp className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-foreground/60">Nombre de fichiers</p>
                <p className="text-lg font-semibold">{totalFiles}</p>
              </div>
            </div>
          </CardBody>
        </Card>

        {lastUpload && (
          <Card className="bg-card/70 backdrop-blur border border-border/60">
            <CardBody>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/20">
                  <Clock className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-foreground/60">Dernier upload</p>
                  <p className="text-lg font-semibold">
                    {formatDistanceToNow(lastUpload, { addSuffix: true, locale: fr })}
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>
        )}
      </div>

      {totalFiles === 0 && (
        <Card className="bg-card/70">
          <CardBody className="text-center py-8">
            <KeyRound className="h-12 w-12 text-foreground/30 mx-auto mb-4" />
            <p className="text-foreground/60 mb-4">Aucun fichier importé</p>
            <Link href="/password-files">
              <Button color="primary" size="sm">
                Importer un fichier
              </Button>
            </Link>
          </CardBody>
        </Card>
      )}
    </div>
  )
}
