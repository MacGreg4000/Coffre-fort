import crypto from "crypto"
import { ApiError } from "./api-utils"

// ============================================
// VALIDATION ET SÉCURITÉ DES FICHIERS
// ============================================

// Types MIME autorisés
const ALLOWED_MIME_TYPES = {
  // Documents
  "application/pdf": [".pdf"],
  "application/msword": [".doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "application/vnd.ms-excel": [".xls"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
  // Images
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/gif": [".gif"],
  "image/webp": [".webp"],
  // Textes
  "text/plain": [".txt"],
  "text/csv": [".csv"],
  // Archives (pour exports)
  "application/zip": [".zip"],
  "application/x-zip-compressed": [".zip"],
}

// Taille maximale par type (en bytes)
const MAX_FILE_SIZES = {
  default: 10 * 1024 * 1024, // 10 MB par défaut
  image: 5 * 1024 * 1024, // 5 MB pour les images
  document: 10 * 1024 * 1024, // 10 MB pour les documents
  archive: 50 * 1024 * 1024, // 50 MB pour les archives
}

// Extensions de fichiers dangereuses à bloquer
const DANGEROUS_EXTENSIONS = [
  ".exe", ".bat", ".cmd", ".com", ".pif", ".scr", ".vbs", ".js", ".jar",
  ".app", ".deb", ".pkg", ".rpm", ".msi", ".dmg", ".sh", ".ps1", ".php",
  ".asp", ".aspx", ".jsp", ".py", ".rb", ".pl", ".cgi",
]

export interface FileValidationResult {
  valid: boolean
  error?: string
  sanitizedFilename?: string
}

/**
 * Valider un fichier uploadé
 */
export function validateFile(
  file: {
    name: string
    type: string
    size: number
  },
  options: {
    maxSize?: number
    allowedTypes?: string[]
    requireType?: boolean
  } = {}
): FileValidationResult {
  const { name, type, size } = file
  const { maxSize, allowedTypes, requireType = true } = options

  // 1. Vérifier le nom du fichier
  if (!name || name.trim().length === 0) {
    return { valid: false, error: "Nom de fichier invalide" }
  }

  // 2. Sanitizer le nom du fichier
  const sanitizedFilename = sanitizeFilename(name)
  if (sanitizedFilename !== name) {
    return { valid: false, error: "Nom de fichier contient des caractères non autorisés" }
  }

  // 3. Vérifier l'extension
  const extension = getFileExtension(name).toLowerCase()
  if (DANGEROUS_EXTENSIONS.includes(extension)) {
    return { valid: false, error: "Type de fichier non autorisé pour des raisons de sécurité" }
  }

  // 4. Vérifier le type MIME
  if (requireType && type) {
    const allowedMimeTypes = allowedTypes || Object.keys(ALLOWED_MIME_TYPES)
    
    if (!allowedMimeTypes.includes(type)) {
      return { valid: false, error: `Type de fichier non autorisé: ${type}` }
    }

    // Vérifier que l'extension correspond au type MIME
    const expectedExtensions = ALLOWED_MIME_TYPES[type as keyof typeof ALLOWED_MIME_TYPES]
    if (expectedExtensions && !expectedExtensions.includes(extension)) {
      return { valid: false, error: "L'extension du fichier ne correspond pas au type MIME" }
    }
  }

  // 5. Vérifier la taille
  const maxFileSize = maxSize || getMaxSizeForType(type)
  if (size > maxFileSize) {
    const maxSizeMB = (maxFileSize / (1024 * 1024)).toFixed(1)
    return { valid: false, error: `Fichier trop volumineux. Taille maximale: ${maxSizeMB} MB` }
  }

  if (size === 0) {
    return { valid: false, error: "Le fichier est vide" }
  }

  return { valid: true, sanitizedFilename }
}

/**
 * Obtenir la taille maximale pour un type de fichier
 */
function getMaxSizeForType(mimeType: string): number {
  if (mimeType.startsWith("image/")) {
    return MAX_FILE_SIZES.image
  }
  if (mimeType.includes("document") || mimeType.includes("pdf") || mimeType.includes("text")) {
    return MAX_FILE_SIZES.document
  }
  if (mimeType.includes("zip") || mimeType.includes("archive")) {
    return MAX_FILE_SIZES.archive
  }
  return MAX_FILE_SIZES.default
}

/**
 * Obtenir l'extension d'un fichier
 */
function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf(".")
  if (lastDot === -1) return ""
  return filename.substring(lastDot)
}

/**
 * Sanitizer un nom de fichier (supprimer les caractères dangereux)
 */
export function sanitizeFilename(filename: string): string {
  // Supprimer les chemins relatifs
  let sanitized = filename.replace(/\.\./g, "").replace(/\//g, "").replace(/\\/g, "")
  
  // Supprimer les caractères de contrôle et spéciaux
  sanitized = sanitized.replace(/[<>:"|?*\x00-\x1F]/g, "")
  
  // Limiter la longueur
  const maxLength = 255
  if (sanitized.length > maxLength) {
    const ext = getFileExtension(sanitized)
    const nameWithoutExt = sanitized.substring(0, maxLength - ext.length)
    sanitized = nameWithoutExt + ext
  }

  return sanitized.trim()
}

/**
 * Calculer le hash SHA-256 d'un fichier
 */
export async function calculateFileHash(fileBuffer: Buffer): Promise<string> {
  return crypto.createHash("sha256").update(fileBuffer).digest("hex")
}

/**
 * Valider et traiter un fichier uploadé (avec hash)
 */
export async function processUploadedFile(
  file: File | { name: string; type: string; size: number; arrayBuffer: () => Promise<ArrayBuffer> },
  options: {
    maxSize?: number
    allowedTypes?: string[]
    requireType?: boolean
  } = {}
): Promise<{
  filename: string
  mimeType: string
  sizeBytes: number
  sha256: string
  data: Buffer
}> {
  // Validation
  const validation = validateFile(file, options)
  if (!validation.valid) {
    throw new ApiError(400, validation.error || "Fichier invalide")
  }

  // Lire le contenu
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  // Calculer le hash
  const sha256 = await calculateFileHash(buffer)

  return {
    filename: validation.sanitizedFilename || file.name,
    mimeType: file.type,
    sizeBytes: file.size,
    sha256,
    data: buffer,
  }
}
