"use client"

import { useState, useMemo, useEffect } from "react"
import { Card, CardBody, Button, Input } from "@heroui/react"
import { useToast } from "@/components/ui/toast"
import { Search, Eye, EyeOff, Copy, Check } from "lucide-react"
import { PremiumCard } from "@/components/ui/premium-card"

type PasswordEntry = {
  Title: string
  URL: string
  Username: string
  Password: string
  Notes: string
  OTPAuth: string
}

interface PasswordCsvViewerProps {
  fileId: string
  filename: string
}

export function PasswordCsvViewer({ fileId, filename }: PasswordCsvViewerProps) {
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [entries, setEntries] = useState<PasswordEntry[]>([])
  const [search, setSearch] = useState("")
  const [visiblePasswords, setVisiblePasswords] = useState<Set<number>>(new Set())
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({
    Title: "",
    URL: "",
    Username: "",
    Password: "",
    Notes: "",
    OTPAuth: "",
  })

  // Charger et parser le CSV
  useEffect(() => {
    const loadCsv = async () => {
      setLoading(true)
      try {
        const response = await fetch(`/api/password-files/${fileId}`)
        if (!response.ok) throw new Error("Erreur lors du chargement du fichier")
        
        const text = await response.text()
        const parsed = parseCsv(text)
        setEntries(parsed)
      } catch (error: any) {
        showToast(error.message || "Erreur lors du chargement du CSV", "error")
      } finally {
        setLoading(false)
      }
    }

    loadCsv()
  }, [fileId, showToast])

  // Parser le CSV
  const parseCsv = (csvText: string): PasswordEntry[] => {
    const lines = csvText.split("\n").filter((line) => line.trim())
    if (lines.length === 0) return []

    // Détecter le séparateur (virgule ou point-virgule)
    const firstLine = lines[0]
    const separator = firstLine.includes(";") ? ";" : ","

    // Parser la première ligne pour les en-têtes
    const headers = parseCsvLine(firstLine, separator).map((h) => h.trim())

    // Trouver les indices des colonnes attendues
    const titleIdx = headers.findIndex((h) => h.toLowerCase() === "title")
    const urlIdx = headers.findIndex((h) => h.toLowerCase() === "url")
    const usernameIdx = headers.findIndex((h) => h.toLowerCase() === "username")
    const passwordIdx = headers.findIndex((h) => h.toLowerCase() === "password")
    const notesIdx = headers.findIndex((h) => h.toLowerCase() === "notes")
    const otpAuthIdx = headers.findIndex((h) => h.toLowerCase() === "otpauth")

    // Parser les lignes de données
    const parsed: PasswordEntry[] = []
    for (let i = 1; i < lines.length; i++) {
      const values = parseCsvLine(lines[i], separator)
      if (values.length === 0) continue

      parsed.push({
        Title: values[titleIdx]?.trim() || "",
        URL: values[urlIdx]?.trim() || "",
        Username: values[usernameIdx]?.trim() || "",
        Password: values[passwordIdx]?.trim() || "",
        Notes: values[notesIdx]?.trim() || "",
        OTPAuth: values[otpAuthIdx]?.trim() || "",
      })
    }

    return parsed
  }

  // Parser une ligne CSV en gérant les guillemets
  const parseCsvLine = (line: string, separator: string): string[] => {
    const result: string[] = []
    let current = ""
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      const nextChar = line[i + 1]

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"'
          i++ // Skip next quote
        } else {
          inQuotes = !inQuotes
        }
      } else if (char === separator && !inQuotes) {
        result.push(current)
        current = ""
      } else {
        current += char
      }
    }
    result.push(current)

    return result
  }

  // Filtrer les entrées
  const filteredEntries = useMemo(() => {
    return entries.filter((entry, index) => {
      // Recherche globale
      if (search) {
        const searchLower = search.toLowerCase()
        const matchesSearch =
          entry.Title.toLowerCase().includes(searchLower) ||
          entry.URL.toLowerCase().includes(searchLower) ||
          entry.Username.toLowerCase().includes(searchLower) ||
          entry.Password.toLowerCase().includes(searchLower) ||
          entry.Notes.toLowerCase().includes(searchLower) ||
          entry.OTPAuth.toLowerCase().includes(searchLower)

        if (!matchesSearch) return false
      }

      // Filtres par colonne
      for (const [column, filterValue] of Object.entries(columnFilters)) {
        if (filterValue) {
          const entryValue = entry[column as keyof PasswordEntry] || ""
          if (!entryValue.toLowerCase().includes(filterValue.toLowerCase())) {
            return false
          }
        }
      }

      return true
    })
  }, [entries, search, columnFilters])

  // Copier le mot de passe (index est l'index dans filteredEntries)
  const handleCopyPassword = async (password: string, filteredIndex: number) => {
    try {
      await navigator.clipboard.writeText(password)
      setCopiedIndex(filteredIndex)
      setVisiblePasswords((prev) => new Set([...prev, filteredIndex]))
      showToast("Mot de passe copié !", "success")
      
      // Masquer après 5 secondes
      setTimeout(() => {
        setVisiblePasswords((prev) => {
          const newSet = new Set(prev)
          newSet.delete(filteredIndex)
          return newSet
        })
        setCopiedIndex(null)
      }, 5000)
    } catch (error) {
      showToast("Erreur lors de la copie", "error")
    }
  }

  // Toggle visibilité du mot de passe (index est l'index dans filteredEntries)
  const togglePasswordVisibility = (filteredIndex: number) => {
    setVisiblePasswords((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(filteredIndex)) {
        newSet.delete(filteredIndex)
      } else {
        newSet.add(filteredIndex)
      }
      return newSet
    })
  }

  if (loading) {
    return (
      <Card className="bg-card/70 backdrop-blur border border-border/60">
        <CardBody className="p-6 text-foreground/70">Chargement du CSV...</CardBody>
      </Card>
    )
  }

  if (entries.length === 0) {
    return (
      <Card className="bg-card/70 backdrop-blur border border-border/60">
        <CardBody className="p-6 text-foreground/70">Aucune donnée trouvée dans le CSV.</CardBody>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <PremiumCard variant="glass" hover3D glow className="overflow-visible">
        <div className="p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h3 className="text-lg font-semibold text-foreground">{filename}</h3>
              <p className="text-sm text-foreground/60 mt-1">
                {filteredEntries.length} entrée{filteredEntries.length > 1 ? "s" : ""} sur {entries.length}
              </p>
            </div>
          </div>

          {/* Recherche globale */}
          <Input
            placeholder="Rechercher dans toutes les colonnes..."
            value={search}
            onValueChange={setSearch}
            startContent={<Search className="h-4 w-4 text-foreground/40" />}
            className="w-full"
          />

          {/* Filtres par colonne */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input
              placeholder="Filtrer par Titre..."
              value={columnFilters.Title}
              onValueChange={(value) => setColumnFilters({ ...columnFilters, Title: value })}
              size="sm"
            />
            <Input
              placeholder="Filtrer par URL..."
              value={columnFilters.URL}
              onValueChange={(value) => setColumnFilters({ ...columnFilters, URL: value })}
              size="sm"
            />
            <Input
              placeholder="Filtrer par Username..."
              value={columnFilters.Username}
              onValueChange={(value) => setColumnFilters({ ...columnFilters, Username: value })}
              size="sm"
            />
          </div>
        </div>
      </PremiumCard>

      {/* Tableau */}
      <PremiumCard variant="glass" hover3D glow className="overflow-visible">
        <div className="p-5 sm:p-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/60">
                  <th className="text-left p-3 text-xs font-semibold text-foreground/70">Titre</th>
                  <th className="text-left p-3 text-xs font-semibold text-foreground/70">URL</th>
                  <th className="text-left p-3 text-xs font-semibold text-foreground/70">Username</th>
                  <th className="text-left p-3 text-xs font-semibold text-foreground/70">Mot de passe</th>
                  <th className="text-left p-3 text-xs font-semibold text-foreground/70">Notes</th>
                  <th className="text-left p-3 text-xs font-semibold text-foreground/70">OTPAuth</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((entry, index) => {
                  const isPasswordVisible = visiblePasswords.has(index)
                  const isCopied = copiedIndex === index

                  return (
                    <tr
                      key={index}
                      className="border-b border-border/30 hover:bg-muted/20 transition-colors"
                    >
                      <td className="p-3">
                        <div className="max-w-[200px] truncate" title={entry.Title}>
                          {entry.Title || "—"}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="max-w-[200px] truncate" title={entry.URL}>
                          {entry.URL ? (
                            <a
                              href={entry.URL}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              {entry.URL}
                            </a>
                          ) : (
                            "—"
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="max-w-[150px] truncate" title={entry.Username}>
                          {entry.Username || "—"}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm max-w-[150px] truncate">
                            {isPasswordVisible ? entry.Password || "—" : "••••••••"}
                          </span>
                          <div className="flex gap-1">
                            <Button
                              isIconOnly
                              size="sm"
                              variant="light"
                              onPress={() => togglePasswordVisibility(index)}
                              aria-label={isPasswordVisible ? "Masquer" : "Afficher"}
                            >
                              {isPasswordVisible ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              isIconOnly
                              size="sm"
                              variant="light"
                              color={isCopied ? "success" : "default"}
                              onPress={() => handleCopyPassword(entry.Password, index)}
                              aria-label="Copier"
                            >
                              {isCopied ? (
                                <Check className="h-4 w-4" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="max-w-[200px] truncate" title={entry.Notes}>
                          {entry.Notes || "—"}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="max-w-[200px] truncate font-mono text-xs" title={entry.OTPAuth}>
                          {entry.OTPAuth || "—"}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </PremiumCard>
    </div>
  )
}
