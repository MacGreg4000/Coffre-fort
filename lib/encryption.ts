// Encryption utilities
export const encrypt = (data: string, key: string): string => {
  // Placeholder implementation
  return btoa(data)
}

export const decrypt = (data: string, key: string): string => {
  // Placeholder implementation
  try {
    return atob(data)
  } catch {
    return data
  }
}

export const isEncryptionEnabled = (): boolean => {
  // Check if encryption is enabled in environment
  return process.env.ENCRYPTION_ENABLED === 'true'
}