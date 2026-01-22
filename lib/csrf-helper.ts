export const getCsrfToken = async (): Promise<string | null> => {
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