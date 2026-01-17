import { TOTP, generateSecret, generateURI, verifySync } from "otplib"
import QRCode from "qrcode"
import crypto from "crypto"
import { encrypt, decrypt, decryptString, isEncryptionEnabled } from "./encryption"
import bcrypt from "bcryptjs"

// ============================================
// AUTHENTIFICATION À DEUX FACTEURS (2FA)
// ============================================
// Utilise TOTP (Time-based One-Time Password)
// Compatible avec Google Authenticator, Microsoft Authenticator, Authy, etc.

const TOTP_ISSUER = "SafeGuard"
const TOTP_PERIOD = 30 // Secondes
const BACKUP_CODE_LENGTH = 8
const BACKUP_CODE_COUNT = 10

// Configurer TOTP
const totp = new TOTP({
  issuer: TOTP_ISSUER,
  period: TOTP_PERIOD,
})

/**
 * Générer un secret TOTP pour un utilisateur
 */
export function generateTotpSecret(): string {
  return generateSecret()
}

/**
 * Générer l'URL TOTP pour le QR code
 */
export function generateTotpUrl(email: string, secret: string, name?: string): string {
  return generateURI({
    strategy: "totp",
    issuer: TOTP_ISSUER,
    label: name || email,
    secret,
  })
}

/**
 * Générer un QR code en base64 pour l'affichage
 */
export async function generateQRCode(dataUrl: string): Promise<string> {
  try {
    return await QRCode.toDataURL(dataUrl, {
      errorCorrectionLevel: "M",
      type: "image/png",
      width: 300,
      margin: 1,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    })
  } catch (error) {
    throw new Error(`Erreur lors de la génération du QR code: ${error instanceof Error ? error.message : "Erreur inconnue"}`)
  }
}

/**
 * Vérifier un code TOTP
 */
export function verifyTotpCode(token: string, secret: string): boolean {
  try {
    const result = verifySync({
      token,
      secret,
    })
    return result.valid === true
  } catch (error) {
    return false
  }
}

/**
 * Générer des codes de récupération (backup codes)
 */
export function generateBackupCodes(): string[] {
  const codes: string[] = []
  for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
    // Générer un code aléatoire de 8 caractères (chiffres et lettres majuscules)
    const code = crypto.randomBytes(4).toString("hex").toUpperCase()
    codes.push(code)
  }
  return codes
}

/**
 * Hasher un code de récupération pour le stockage
 */
export async function hashBackupCode(code: string): Promise<string> {
  return bcrypt.hash(code, 10)
}

/**
 * Vérifier un code de récupération
 */
export async function verifyBackupCode(
  code: string,
  hashedCodes: string[]
): Promise<boolean> {
  for (const hashedCode of hashedCodes) {
    try {
      const isValid = await bcrypt.compare(code, hashedCode)
      if (isValid) {
        return true
      }
    } catch {
      // Continuer avec le prochain code
    }
  }
  return false
}

/**
 * Chiffrer le secret TOTP pour le stockage
 */
export function encryptTotpSecret(secret: string): string {
  if (isEncryptionEnabled()) {
    return encrypt(secret)
  }
  // Si le chiffrement n'est pas activé, retourner tel quel (non recommandé)
  return secret
}

/**
 * Déchiffrer le secret TOTP
 */
export function decryptTotpSecret(encryptedSecret: string): string {
  if (isEncryptionEnabled()) {
    try {
      return decryptString(encryptedSecret)
    } catch {
      // Si le déchiffrement échoue, peut-être que c'est un ancien secret non chiffré
      return encryptedSecret
    }
  }
  return encryptedSecret
}

/**
 * Générer un identifiant d'appareil de confiance
 */
export function generateDeviceId(): string {
  return crypto.randomBytes(16).toString("hex")
}

/**
 * Créer un enregistrement d'appareil de confiance
 */
export function createTrustedDevice(name: string, daysValid: number = 30): {
  deviceId: string
  name: string
  expiresAt: number
} {
  return {
    deviceId: generateDeviceId(),
    name,
    expiresAt: Date.now() + daysValid * 24 * 60 * 60 * 1000,
  }
}

/**
 * Vérifier si un appareil est de confiance
 */
export function isDeviceTrusted(
  deviceId: string,
  trustedDevices: Array<{ deviceId: string; expiresAt: number }>
): boolean {
  const device = trustedDevices.find(d => d.deviceId === deviceId)
  if (!device) return false
  
  // Vérifier si l'appareil n'a pas expiré
  return device.expiresAt > Date.now()
}
