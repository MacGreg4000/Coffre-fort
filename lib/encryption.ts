import crypto from "crypto"

// ============================================
// CHIFFREMENT DES DONNÉES SENSIBLES
// ============================================
// Utilise AES-256-GCM pour le chiffrement symétrique
// GCM fournit à la fois confidentialité et authentification

const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 16 // 128 bits pour GCM
const SALT_LENGTH = 32 // 256 bits
const TAG_LENGTH = 16 // 128 bits pour l'authentification
const KEY_LENGTH = 32 // 256 bits pour AES-256
const ITERATIONS = 100000 // PBKDF2 iterations

/**
 * Dériver une clé de chiffrement à partir d'un secret
 */
function deriveKey(secret: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(secret, salt, ITERATIONS, KEY_LENGTH, "sha256")
}

/**
 * Chiffrer des données sensibles
 * @param data Données à chiffrer (Buffer ou string)
 * @param secret Secret de chiffrement (doit être dans ENCRYPTION_KEY)
 * @returns String base64 contenant: salt:iv:tag:encryptedData
 */
export function encrypt(data: Buffer | string, secret?: string): string {
  const encryptionKey = secret || process.env.ENCRYPTION_KEY
  
  if (!encryptionKey) {
    throw new Error("ENCRYPTION_KEY non configurée. Impossible de chiffrer les données.")
  }

  if (encryptionKey.length < 32) {
    throw new Error("ENCRYPTION_KEY doit contenir au moins 32 caractères")
  }

  const dataBuffer = typeof data === "string" ? Buffer.from(data, "utf-8") : data
  const salt = crypto.randomBytes(SALT_LENGTH)
  const iv = crypto.randomBytes(IV_LENGTH)
  const key = deriveKey(encryptionKey, salt)

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  
  let encrypted = cipher.update(dataBuffer)
  encrypted = Buffer.concat([encrypted, cipher.final()])
  
  const tag = cipher.getAuthTag()

  // Format: salt:iv:tag:encryptedData (tous en base64)
  return [
    salt.toString("base64"),
    iv.toString("base64"),
    tag.toString("base64"),
    encrypted.toString("base64"),
  ].join(":")
}

/**
 * Déchiffrer des données sensibles
 * @param encryptedData String au format: salt:iv:tag:encryptedData
 * @param secret Secret de chiffrement (doit être dans ENCRYPTION_KEY)
 * @returns Buffer des données déchiffrées
 */
export function decrypt(encryptedData: string, secret?: string): Buffer {
  const encryptionKey = secret || process.env.ENCRYPTION_KEY
  
  if (!encryptionKey) {
    throw new Error("ENCRYPTION_KEY non configurée. Impossible de déchiffrer les données.")
  }

  try {
    const parts = encryptedData.split(":")
    if (parts.length !== 4) {
      throw new Error("Format de données chiffrées invalide")
    }

    const [saltBase64, ivBase64, tagBase64, encryptedBase64] = parts
    
    const salt = Buffer.from(saltBase64, "base64")
    const iv = Buffer.from(ivBase64, "base64")
    const tag = Buffer.from(tagBase64, "base64")
    const encrypted = Buffer.from(encryptedBase64, "base64")

    const key = deriveKey(encryptionKey, salt)

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(tag)

    let decrypted = decipher.update(encrypted)
    decrypted = Buffer.concat([decrypted, decipher.final()])

    return decrypted
  } catch (error) {
    throw new Error(`Échec du déchiffrement: ${error instanceof Error ? error.message : "Erreur inconnue"}`)
  }
}

/**
 * Chiffrer une string et retourner une string base64
 */
export function encryptString(data: string, secret?: string): string {
  return encrypt(data, secret)
}

/**
 * Déchiffrer et retourner une string
 */
export function decryptString(encryptedData: string, secret?: string): string {
  return decrypt(encryptedData, secret).toString("utf-8")
}

/**
 * Vérifier si une clé de chiffrement est configurée
 */
export function isEncryptionEnabled(): boolean {
  return !!process.env.ENCRYPTION_KEY && process.env.ENCRYPTION_KEY.length >= 32
}
