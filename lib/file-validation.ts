// File validation utilities
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

export const validateFile = (file: File): { isValid: boolean; error?: string } => {
  // Check file size (max 10MB)
  if (!validateFileSize(file, 10)) {
    return { isValid: false, error: "Le fichier est trop volumineux (maximum 10MB)" }
  }

  // Check file type
  const allowedTypes = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
    'application/pdf',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]

  if (!validateFileType(file, allowedTypes)) {
    return { isValid: false, error: "Type de fichier non autorisé" }
  }

  return { isValid: true }
}

export const processUploadedFile = async (file: File): Promise<{ buffer: Buffer; mimeType: string; filename: string }> => {
  const buffer = Buffer.from(await file.arrayBuffer())
  return {
    buffer,
    mimeType: file.type,
    filename: file.name
  }
}