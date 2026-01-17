"use client"

import { useEffect, useState } from "react"
import { Card, CardBody, Button } from "@heroui/react"
import { useToast } from "@/components/ui/toast"
import { useConfirmModal } from "@/components/ui/confirm-modal"
import { Download, FileUp, Trash2 } from "lucide-react"
import { getCsrfToken } from "@/lib/csrf-helper"

type PasswordFile = {
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

export function PasswordFilesClient() {
  const { showToast } = useToast()
  const { confirm, ConfirmModal } = useConfirmModal()
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [files, setFiles] = useState<PasswordFile[]>([])

  const fetchFiles = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/password-files")
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Erreur API")
      setFiles(data.files || [])
    } catch (e: any) {
      showToast(e.message || "Erreur lors du chargement", "error")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFiles()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleUpload = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return
    setUploading(true)
    try {
      const csrfToken = await getCsrfToken()
      if (!csrfToken) {
        showToast("Erreur: impossible de récupérer le token de sécurité", "error")
        setUploading(false)
        return
      }

      for (const file of Array.from(fileList)) {
        const form = new FormData()
        form.append("file", file)

        const res = await fetch("/api/password-files", {
          method: "POST",
          headers: {
            "X-CSRF-Token": csrfToken,
          },
          body: form,
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data?.error || `Erreur upload: ${file.name}`)
      }
      showToast("Fichier(s) ajouté(s)", "success")
      await fetchFiles()
    } catch (e: any) {
      showToast(e.message || "Erreur upload", "error")
    } finally {
      setUploading(false)
    }
  }

  const handleDownload = async (id: string) => {
    window.location.href = `/api/password-files/${id}`
  }

  const handleDelete = async (f: PasswordFile) => {
    confirm(`Supprimer définitivement "${f.filename}" ?`, {
      title: "Supprimer le fichier",
      confirmLabel: "Supprimer",
      cancelLabel: "Annuler",
      confirmColor: "danger",
      onConfirm: async () => {
        try {
          const csrfToken = await getCsrfToken()
          if (!csrfToken) {
            showToast("Erreur: impossible de récupérer le token de sécurité", "error")
            return
          }

          const res = await fetch(`/api/password-files/${f.id}`, { 
            method: "DELETE",
            headers: {
              "X-CSRF-Token": csrfToken,
            },
          })
          const data = await res.json().catch(() => ({}))
          if (!res.ok) throw new Error(data?.error || "Erreur suppression")
          showToast("Fichier supprimé", "success")
          await fetchFiles()
        } catch (e: any) {
          showToast(e.message || "Erreur suppression", "error")
        }
      },
    })
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-foreground">Fichiers (exports gestionnaire de mots de passe)</h2>
        <p className="text-muted-foreground">
          Stockage brut de fichiers (CSV/JSON/ZIP…). Vous pouvez en ajouter plusieurs versions.
        </p>
      </div>

      <Card className="bg-card/70 backdrop-blur border border-border/60">
        <CardBody className="p-5 space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="text-sm font-semibold text-primary flex items-center gap-2">
              <FileUp className="h-4 w-4" />
              Importer des fichiers
            </div>
            <label className="inline-flex">
              <input
                type="file"
                multiple
                className="hidden"
                onChange={(e) => handleUpload(e.target.files)}
                disabled={uploading}
              />
              <Button color="primary" isLoading={uploading} as="span">
                Sélectionner fichier(s)
              </Button>
            </label>
          </div>
          <p className="text-xs text-foreground/60">
            Conseil: privilégiez des exports chiffrés côté gestionnaire, et/ou on ajoutera un export héritier chiffré.
          </p>
        </CardBody>
      </Card>

      <div className="space-y-3">
        {loading ? (
          <div className="text-foreground/60">Chargement…</div>
        ) : files.length === 0 ? (
          <Card className="bg-card/70 backdrop-blur border border-border/60">
            <CardBody className="p-6 text-foreground/70">Aucun fichier importé.</CardBody>
          </Card>
        ) : (
          files.map((f) => (
            <Card key={f.id} className="bg-card/70 backdrop-blur border border-border/60">
              <CardBody className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-primary truncate">{f.filename}</p>
                    <p className="text-xs text-foreground/60 mt-1">
                      {formatBytes(f.sizeBytes)} · {f.mimeType}
                    </p>
                    <p className="text-xs text-foreground/50 mt-1 truncate">SHA-256: {f.sha256}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button isIconOnly variant="light" onPress={() => handleDownload(f.id)} aria-label="Télécharger">
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button isIconOnly color="danger" variant="light" onPress={() => handleDelete(f)} aria-label="Supprimer">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardBody>
            </Card>
          ))
        )}
      </div>

      {ConfirmModal}
    </div>
  )
}

