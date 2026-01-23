// File validation utilities
import { createHash } from "crypto"

export const validateFileType = (file: File, allowedTypes: string[]): boolean => {
  return allowedTypes.includes(file.type)
}

export const validateFileSize = (file: File, maxSizeInMB: number): boolean => {
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024
  return file.size <= maxSizeInBytes
}

export const getFileExtension = (filename: string): string => {
  return filename.split('.').pop()?.toLowerCase() || ''
}

interface ValidateFileOptions {
  maxSize?: number
  requireType?: boolean
}

export const validateFile = (file: File, options?: ValidateFileOptions): { valid: boolean; error?: string } => {
  const maxSize = options?.maxSize || 10 * 1024 * 1024 // 10 MB par défaut
  const requireType = options?.requireType ?? true

  // Check file size
  if (file.size > maxSize) {
    const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(0)
    return { valid: false, error: `Le fichier est trop volumineux (maximum ${maxSizeMB}MB)` }
  }

  // Check file type if required
  if (requireType) {
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
      'application/pdf',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv', 'text/plain'
    ]

    if (!validateFileType(file, allowedTypes)) {
      return { valid: false, error: "Type de fichier non autorisé" }
    }
  }

  return { valid: true }
}

interface ProcessUploadedFileOptions {
  maxSize?: number
  requireType?: boolean
}

export const processUploadedFile = async (
  file: File,
  options?: ProcessUploadedFileOptions
): Promise<{
  data: Buffer
  mimeType: string
  filename: string
  sizeBytes: number
  sha256: string
}> => {
  // Validation
  const validation = validateFile(file, options)
  if (!validation.valid) {
    throw new Error(validation.error || "Fichier invalide")
  }

  // Convertir le fichier en buffer
  const arrayBuffer = await file.arrayBuffer()
  const data = Buffer.from(arrayBuffer)

  // Calculer le hash SHA-256
  const sha256 = createHash('sha256').update(data).digest('hex')

  // Sanitizer le nom de fichier (supprimer les caractères dangereux)
  const sanitizedFilename = file.name
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .substring(0, 255)

  return {
    data,
    mimeType: file.type || 'application/octet-stream',
    filename: sanitizedFilename || 'unnamed',
    sizeBytes: file.size,
    sha256,
  }
}