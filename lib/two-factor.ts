// Two-factor authentication utilities
import QRCode from "qrcode"

export interface TwoFactorSecret {
  secret: string
  otpauth_url: string
}

export const generateTwoFactorSecret = (): TwoFactorSecret => {
  // Generate a random base32 secret
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  let secret = ''
  for (let i = 0; i < 32; i++) {
    secret += chars.charAt(Math.floor(Math.random() * chars.length))
  }

  return {
    secret,
    otpauth_url: `otpauth://totp/SafeVault?secret=${secret}&issuer=SafeVault`
  }
}

export const generateTotpSecret = (): TwoFactorSecret => {
  return generateTwoFactorSecret()
}

export const generateTotpUrl = (secret: string, accountName: string = 'SafeVault User', issuer: string = 'SafeVault'): string => {
  return `otpauth://totp/${issuer}:${encodeURIComponent(accountName)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}`
}

export const generateQRCode = async (url: string): Promise<string> => {
  try {
    // Générer un QR code en format data URL (PNG)
    const dataUrl = await QRCode.toDataURL(url, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    })
    return dataUrl
  } catch (error) {
    console.error("Erreur lors de la génération du QR code:", error)
    // En cas d'erreur, retourner un placeholder
    return `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==`
  }
}

export const verifyTwoFactorToken = (token: string, secret: string): boolean => {
  // Simplified TOTP verification (placeholder)
  // In a real implementation, use a proper TOTP library
  return token.length === 6 && /^\d{6}$/.test(token)
}

export const verifyTotpCode = (code: string, secret: string): boolean => {
  return verifyTwoFactorToken(code, secret)
}

export const encryptTotpSecret = (secret: string): string => {
  // In a real implementation, encrypt the secret
  return secret // Placeholder
}

export const decryptTotpSecret = (encryptedSecret: string): string => {
  // In a real implementation, decrypt the secret
  return encryptedSecret // Placeholder
}

export const generateBackupCodes = (): string[] => {
  const codes = []
  for (let i = 0; i < 10; i++) {
    codes.push(Math.random().toString(36).substring(2, 10).toUpperCase())
  }
  return codes
}

export const hashBackupCode = (code: string): string => {
  // In a real implementation, hash the backup code
  return code // Placeholder
}

export const verifyBackupCode = (inputCode: string, hashedCode: string): boolean => {
  // In a real implementation, compare the hashed codes
  return inputCode === hashedCode // Placeholder
}

export const isDeviceTrusted = (deviceId: string): boolean => {
  // Placeholder - in a real implementation, check if device is trusted
  return false
}

export const createTrustedDevice = (deviceName: string, validityDays: number = 30) => {
  return {
    deviceId: Math.random().toString(36).substring(2, 15),
    deviceName,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000),
    lastUsed: new Date(),
  }
}