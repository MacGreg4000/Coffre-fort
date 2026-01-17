/**
 * Helper pour récupérer le token CSRF côté client
 * Compatible avec les composants React (client components)
 */
export async function getCsrfToken(): Promise<string | null> {
  try {
    const response = await fetch("/api/csrf/token", {
      credentials: "include",
    })
    if (!response.ok) return null
    const data = await response.json()
    return data.token || null
  } catch {
    return null
  }
}
