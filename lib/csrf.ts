// CSRF protection utilities
export const generateCsrfToken = (): string => {
  return Math.random().toString(36).substring(2, 15)
}

export const validateCsrfToken = (token: string): boolean => {
  return token.length > 0
}

export const createCsrfToken = (): string => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

export async function verifyCsrfMiddleware(req: Request): Promise<boolean> {
  // Implémentation basique - à améliorer
  const csrfToken = req.headers.get('x-csrf-token')
  return validateCsrfToken(csrfToken || '')
}